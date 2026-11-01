/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import { SearchResultSource, SearchSynthesis } from '../types.ts';
import { cleanHtmlText, decodeHtmlEntities, synthesizeSearchResults } from './nlpEngine.ts';

interface GoogleNewsItem {
  title: string;
  link: string;
  pubDate: string;
  source: string;
  sourceUrl: string;
  description: string;
  snippet?: string;
}

// Extract domain from URL
function extractDomain(urlString: string): string {
  try {
    const parsed = new URL(urlString);
    return parsed.hostname.replace(/^www\./, '');
  } catch {
    return 'web';
  }
}

// Check basic math calculations for instant accuracy
function checkMathCalculation(query: string): string | null {
  const q = query.trim().toLowerCase()
    .replace(/^(what is|calculate|evaluate|how much is|solve|what is the value of)\s+/i, '')
    .replace(/[?!=]/g, '')
    .trim();

  // Basic arithmetic: e.g. "25 * 4", "100 / 5", "25 + 75"
  const opMatch = q.match(/^(\d+(?:\.\d+)?)\s*([\+\-\*\/]|plus|minus|times|multiplied by|divided by)\s*(\d+(?:\.\d+)?)$/i);
  if (opMatch) {
    const a = parseFloat(opMatch[1]);
    const op = opMatch[2].toLowerCase();
    const b = parseFloat(opMatch[3]);
    let res = 0;
    if (op === '+' || op === 'plus') res = a + b;
    else if (op === '-' || op === 'minus') res = a - b;
    else if (op === '*' || op === 'times' || op === 'multiplied by') res = a * b;
    else if (op === '/' || op === 'divided by') res = b !== 0 ? a / b : NaN;
    if (!isNaN(res)) {
      return `${a} ${op} ${b} = ${res}.`;
    }
  }

  // Square root: "square root of 144"
  const sqrtMatch = q.match(/^square root of\s*(\d+(?:\.\d+)?)$/i);
  if (sqrtMatch) {
    const n = parseFloat(sqrtMatch[1]);
    return `The square root of ${n} is ${Math.sqrt(n)}.`;
  }

  return null;
}

// Extract clean query terms and target entity
export function extractCleanQueryAndEntities(query: string) {
  const trimmed = query.trim();
  const cleanedQuery = trimmed
    .replace(/^(who is|who was|who are|what is|what are|what was|tell me about|explain|how to|can you tell me|can you explain|i want to know about|where is|when was|why is|why does|how does|how do|how can)\s+/i, '')
    .replace(/\b(the|current|present|latest|best|official)\b/gi, ' ')
    .replace(/[?!.,]/g, '')
    .replace(/\s+/g, ' ')
    .trim();

  const extraTargets: string[] = [];

  // Check for comparison: A vs B
  const vsMatch = cleanedQuery.match(/^(?:difference between|compare)?\s*([a-zA-Z0-9\s]+?)\s+(?:vs|versus|and)\s+([a-zA-Z0-9\s]+)$/i);
  if (vsMatch) {
    extraTargets.push(vsMatch[1].trim(), vsMatch[2].trim());
  }

  // Check for [Role/Property] of [Entity] (e.g. capital of France, CEO of Google)
  const ofMatch = cleanedQuery.match(/\b(?:capital|ceo|president|founder|population|currency|author|director|history|speed|height|distance|creator|inventor|origin)\s+of\s+([A-Za-z0-9\s]+)$/i);
  if (ofMatch && ofMatch[1].trim()) {
    extraTargets.push(ofMatch[1].trim());
  }

  return {
    rawQuery: trimmed,
    cleanedQuery: cleanedQuery || trimmed,
    entityTarget: extraTargets[0] || '',
    extraTargets,
  };
}

// Fetch Google News RSS for real-time live web index
export async function searchGoogleNews(query: string): Promise<GoogleNewsItem[]> {
  try {
    const url = `https://news.google.com/rss/search?q=${encodeURIComponent(query)}&hl=en-US&gl=US&ceid=US:en`;
    const res = await fetch(url, {
      headers: {
        'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36',
        'Accept': 'application/rss+xml, application/xml, text/xml',
      },
      signal: AbortSignal.timeout(4500),
    });

    if (!res.ok) return [];

    const xmlText = await res.text();
    const items: GoogleNewsItem[] = [];
    const itemRegex = /<item>([\s\S]*?)<\/item>/g;

    let match;
    while ((match = itemRegex.exec(xmlText)) !== null && items.length < 8) {
      const itemContent = match[1];

      // Extract title
      const titleMatch = itemContent.match(/<title>([\s\S]*?)<\/title>/);
      let rawTitle = titleMatch ? decodeHtmlEntities(titleMatch[1].trim()) : '';

      // Extract source name (often in title suffix: "Headline - BBC")
      let sourceName = 'Online Publication';
      let sourceUrl = '';
      const sourceTagMatch = itemContent.match(/<source url="([^"]+)">([\s\S]*?)<\/source>/);
      if (sourceTagMatch) {
        sourceUrl = sourceTagMatch[1];
        sourceName = decodeHtmlEntities(sourceTagMatch[2].trim());
      } else {
        const hyphenIdx = rawTitle.lastIndexOf(' - ');
        if (hyphenIdx > 0) {
          sourceName = rawTitle.slice(hyphenIdx + 3).trim();
          rawTitle = rawTitle.slice(0, hyphenIdx).trim();
        }
      }

      // Extract link
      const linkMatch = itemContent.match(/<link>([\s\S]*?)<\/link>/);
      const link = linkMatch ? linkMatch[1].trim() : '';

      // Extract pubDate
      const pubDateMatch = itemContent.match(/<pubDate>([\s\S]*?)<\/pubDate>/);
      const pubDate = pubDateMatch ? pubDateMatch[1].trim() : '';

      // Extract description
      const descMatch = itemContent.match(/<description>([\s\S]*?)<\/description>/);
      const rawDesc = descMatch ? descMatch[1].trim() : '';
      let cleanDesc = cleanHtmlText(rawDesc);

      // Strip redundant repeated title or source name prefix from snippet
      if (rawTitle && cleanDesc.toLowerCase().startsWith(rawTitle.toLowerCase())) {
        cleanDesc = cleanDesc.slice(rawTitle.length).trim();
      }
      if (sourceName && cleanDesc.toLowerCase().startsWith(sourceName.toLowerCase())) {
        cleanDesc = cleanDesc.slice(sourceName.length).trim();
      }

      if (rawTitle && link) {
        items.push({
          title: rawTitle,
          link: sourceUrl || link,
          pubDate,
          source: sourceName,
          sourceUrl: sourceUrl || link,
          snippet: cleanDesc || rawTitle,
          description: cleanDesc || rawTitle,
        });
      }
    }

    return items;
  } catch (err) {
    console.warn('News search error:', err);
    return [];
  }
}

// Fetch DuckDuckGo Instant Answer API
export async function searchDuckDuckGo(query: string) {
  try {
    const url = `https://api.duckduckgo.com/?q=${encodeURIComponent(query)}&format=json&no_html=1&skip_disambig=1`;
    const res = await fetch(url, {
      headers: {
        'User-Agent': 'SearchBot/1.0',
      },
      signal: AbortSignal.timeout(3500),
    });

    if (!res.ok) return null;

    const data = await res.json();
    return {
      heading: data.Heading || '',
      abstractText: data.AbstractText || '',
      abstractSource: data.AbstractSource || 'Reference Archive',
      abstractUrl: data.AbstractURL || '',
      relatedTopics: Array.isArray(data.RelatedTopics)
        ? data.RelatedTopics.slice(0, 5).map((t: any) => ({
            text: t.Text || (t.Topics && t.Topics[0]?.Text) || '',
            url: t.FirstURL || (t.Topics && t.Topics[0]?.FirstURL) || '',
          })).filter((t: any) => t.text && t.url)
        : [],
    };
  } catch (err) {
    console.warn('DuckDuckGo fetch error:', err);
    return null;
  }
}

// Fetch Comprehensive Wikipedia Articles with Full Introductory Extracts and Descriptions
export async function searchWikipediaComprehensive(cleanedQuery: string, extraTargets: string[] = []) {
  try {
    // 1. Search Wikipedia for cleanedQuery
    const searchUrl = `https://en.wikipedia.org/w/api.php?action=query&list=search&srsearch=${encodeURIComponent(cleanedQuery)}&utf8=1&format=json`;
    const res = await fetch(searchUrl, {
      headers: { 'User-Agent': 'WebMindKnowledgeBot/1.0 (info@example.com)' },
      signal: AbortSignal.timeout(3500),
    });

    if (!res.ok) return [];

    const data = await res.json();
    const searchHits = data.query?.search || [];
    const titles: string[] = [];

    // Prepend all extra detected entity targets (e.g. "France", "Google", "Python", "Rust")
    for (const t of extraTargets) {
      if (t && t.length > 1 && !titles.includes(t)) {
        titles.push(t);
      }
    }

    for (const hit of searchHits.slice(0, 4)) {
      if (!titles.includes(hit.title)) {
        titles.push(hit.title);
      }
    }

    if (titles.length === 0) return [];

    // 2. Batch fetch full clean intro extracts and Wikidata descriptions with redirects enabled
    const extractUrl = `https://en.wikipedia.org/w/api.php?action=query&prop=extracts|description&exintro=1&explaintext=1&redirects=1&titles=${encodeURIComponent(titles.join('|'))}&format=json`;
    const extRes = await fetch(extractUrl, {
      headers: { 'User-Agent': 'WebMindKnowledgeBot/1.0' },
      signal: AbortSignal.timeout(3500),
    });

    if (!extRes.ok) return [];

    const extData = await extRes.json();
    const pages = Object.values(extData.query?.pages || {}) as any[];

    const results: { title: string; snippet: string; url: string; extract: string }[] = [];

    for (const page of pages) {
      if (!page || page.missing !== undefined || !page.extract) continue;

      const title = page.title;
      let extract = cleanHtmlText(page.extract);

      // Prepend Wikidata description if available
      if (page.description && page.description.length > 3) {
        const descSentence = `${title} is ${page.description}.`;
        if (!extract.toLowerCase().includes(page.description.toLowerCase())) {
          extract = `${descSentence} ${extract}`;
        }
      }

      const articleUrl = `https://en.wikipedia.org/wiki/${encodeURIComponent(title.replace(/\s+/g, '_'))}`;

      if (extract.length > 25) {
        results.push({
          title,
          snippet: extract,
          url: articleUrl,
          extract,
        });
      }
    }

    return results;
  } catch (err) {
    console.warn('Wikipedia comprehensive fetch error:', err);
    return [];
  }
}

// Fetch Google Autocomplete Suggestions
export async function fetchGoogleSuggestions(query: string): Promise<string[]> {
  try {
    const url = `https://suggestqueries.google.com/complete/search?client=firefox&q=${encodeURIComponent(query)}`;
    const res = await fetch(url, {
      headers: { 'User-Agent': 'Mozilla/5.0' },
      signal: AbortSignal.timeout(2500),
    });

    if (!res.ok) return [];

    const data = await res.json();
    if (Array.isArray(data) && Array.isArray(data[1])) {
      return data[1].filter((item: string) => item.toLowerCase() !== query.toLowerCase()).slice(0, 8);
    }
    return [];
  } catch {
    return [];
  }
}

// Deep scrape a sample page to get actual paragraph text
async function fetchPageParagraphs(url: string): Promise<string> {
  try {
    if (url.includes('news.google.com/rss/articles')) return '';

    const res = await fetch(url, {
      headers: {
        'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36',
        'Accept': 'text/html,application/xhtml+xml',
      },
      signal: AbortSignal.timeout(3000),
    });

    if (!res.ok) return '';

    const html = await res.text();
    const pMatches = html.match(/<p[^>]*>([\s\S]*?)<\/p>/gi) || [];
    const paragraphs: string[] = [];

    for (const p of pMatches.slice(0, 10)) {
      const clean = cleanHtmlText(p);
      if (clean.length > 60 && !clean.includes('cookies') && !clean.includes('JavaScript')) {
        paragraphs.push(clean);
        if (paragraphs.length >= 4) break;
      }
    }

    return paragraphs.join(' ');
  } catch {
    return '';
  }
}

// Comprehensive Search & Synthesis Orchestrator
export async function executeSearchAndSummarize(query: string): Promise<SearchSynthesis> {
  const startTimeMs = performance.now();
  const trimmed = query.trim();

  // 1. Check for immediate math calculation accuracy
  const mathAnswer = checkMathCalculation(trimmed);
  if (mathAnswer) {
    return {
      query: trimmed,
      queryIntent: 'definition',
      directAnswer: mathAnswer,
      executiveSummary: mathAnswer,
      keyTakeaways: [{ text: mathAnswer, sourceIds: [] }],
      sections: [],
      sources: [],
      relatedQueries: [],
      topKeywords: [],
      metrics: {
        searchDurationMs: 1,
        sourcesAnalyzed: 0,
        sentencesEvaluated: 1,
        engineType: 'Exact Calculation Engine',
      },
    };
  }

  const { rawQuery, cleanedQuery, extraTargets } = extractCleanQueryAndEntities(query);

  console.log(`[WebMind Search] Query: "${rawQuery}" | Cleaned: "${cleanedQuery}" | Targets:`, extraTargets);

  // Execute external searches concurrently with both raw and cleaned query
  const [wikiItems, googleNewsItems, ddgData, suggestions] = await Promise.all([
    searchWikipediaComprehensive(cleanedQuery, extraTargets),
    searchGoogleNews(cleanedQuery || rawQuery),
    searchDuckDuckGo(cleanedQuery || rawQuery),
    fetchGoogleSuggestions(cleanedQuery || rawQuery),
  ]);

  const sources: SearchResultSource[] = [];
  let sourceCounter = 1;

  // 1. Authoritative Wikipedia Knowledge Articles (Primary factual ground)
  for (const w of wikiItems) {
    if (sources.length >= 8) break;
    sources.push({
      id: sourceCounter++,
      title: `${w.title} - Reference Article`,
      url: w.url,
      domain: 'en.wikipedia.org',
      sourceType: 'wikipedia',
      snippet: w.extract || w.snippet,
      authorOrPublisher: 'Encyclopedia Archive',
    });
  }

  // 2. DuckDuckGo Instant Answer / Abstract
  let instantAnswerPayload: { heading?: string; text?: string; source?: string; url?: string } | undefined;
  if (ddgData?.abstractText) {
    instantAnswerPayload = {
      heading: ddgData.heading,
      text: ddgData.abstractText,
      source: ddgData.abstractSource,
      url: ddgData.abstractUrl,
    };

    // If not already in sources
    const isDup = sources.some(s => s.url === ddgData.abstractUrl);
    if (!isDup && ddgData.abstractUrl) {
      sources.push({
        id: sourceCounter++,
        title: ddgData.heading ? `${ddgData.heading} Overview` : 'Topic Overview & Reference',
        url: ddgData.abstractUrl,
        domain: extractDomain(ddgData.abstractUrl),
        sourceType: 'duckduckgo',
        snippet: ddgData.abstractText,
        authorOrPublisher: ddgData.abstractSource || 'Curated Reference',
      });
    }
  }

  // 3. Current Publications & Reports from Live Web
  for (const g of googleNewsItems) {
    if (sources.length >= 8) break;
    const isDup = sources.some(s => s.title.toLowerCase() === g.title.toLowerCase());
    if (!isDup) {
      sources.push({
        id: sourceCounter++,
        title: g.title,
        url: g.link,
        domain: extractDomain(g.sourceUrl || g.link),
        sourceType: 'google_news',
        snippet: g.snippet || g.description,
        publishedAt: g.pubDate,
        authorOrPublisher: g.source || extractDomain(g.sourceUrl || g.link),
      });
    }
  }

  // 4. DuckDuckGo Related Topics if available
  if (ddgData?.relatedTopics && ddgData.relatedTopics.length > 0) {
    for (const topic of ddgData.relatedTopics) {
      if (sources.length >= 8) break;
      const isDup = sources.some(s => s.url === topic.url);
      if (!isDup) {
        sources.push({
          id: sourceCounter++,
          title: topic.text.slice(0, 70),
          url: topic.url,
          domain: extractDomain(topic.url),
          sourceType: 'duckduckgo',
          snippet: topic.text,
          authorOrPublisher: 'Subject Archive',
        });
      }
    }
  }

  // Deep reading for top external source if applicable
  const topExternalSource = sources.find(s => s.domain !== 'en.wikipedia.org' && !s.url.includes('google.com'));
  if (topExternalSource) {
    const deepText = await fetchPageParagraphs(topExternalSource.url);
    if (deepText) {
      topExternalSource.snippet = `${topExternalSource.snippet} ${deepText}`.slice(0, 900);
    }
  }

  // Perform purely algorithmic Natural Language Processing summarization
  const synthesis = synthesizeSearchResults({
    query: rawQuery,
    sources,
    relatedQueries: suggestions,
    instantAnswer: instantAnswerPayload,
    startTimeMs,
  });

  return synthesis;
}
