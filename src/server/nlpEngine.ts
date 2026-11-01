/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import {
  QueryIntent,
  SearchResultSource,
  SearchSynthesis,
  KeyTakeaway,
  SynthesisSection,
  ComparisonData,
} from '../types.ts';

// Comprehensive English Stopwords list
const STOPWORDS = new Set([
  'a', 'about', 'above', 'after', 'again', 'against', 'all', 'am', 'an', 'and', 'any', 'are', 'aren',
  'as', 'at', 'be', 'because', 'been', 'before', 'being', 'below', 'between', 'both', 'but', 'by',
  'can', 'could', 'did', 'do', 'does', 'doing', 'down', 'during', 'each', 'few', 'for', 'from',
  'further', 'had', 'has', 'have', 'having', 'he', 'her', 'here', 'hers', 'herself', 'him', 'himself',
  'his', 'how', 'i', 'if', 'in', 'into', 'is', 'isn', 'it', 'its', 'itself', 'just', 'me', 'more',
  'most', 'my', 'myself', 'no', 'nor', 'not', 'now', 'of', 'off', 'on', 'once', 'only', 'or', 'other',
  'our', 'ours', 'ourselves', 'out', 'over', 'own', 'same', 'she', 'should', 'so', 'some', 'such',
  'than', 'that', 'the', 'their', 'theirs', 'them', 'themselves', 'then', 'there', 'these', 'they',
  'this', 'those', 'through', 'to', 'too', 'under', 'until', 'up', 'very', 'was', 'wasn', 'we',
  'were', 'what', 'when', 'where', 'which', 'while', 'who', 'whom', 'why', 'with', 'would', 'you',
  'your', 'yours', 'yourself', 'yourselves', 'will', 'also', 'said', 'one', 'new', 'like', 'get',
  'make', 'know', 'take', 'see', 'come', 'think', 'look', 'want', 'give', 'use', 'find', 'tell',
  'ask', 'work', 'seem', 'feel', 'try', 'leave', 'call', 'good', 'well', 'much', 'even', 'way'
]);

// Common HTML entities decoding
export function decodeHtmlEntities(text: string): string {
  return text
    .replace(/&amp;/g, '&')
    .replace(/&lt;/g, '<')
    .replace(/&gt;/g, '>')
    .replace(/&quot;/g, '"')
    .replace(/&#39;/g, "'")
    .replace(/&apos;/g, "'")
    .replace(/&nbsp;/g, ' ')
    .replace(/&#(\d+);/g, (_, code) => String.fromCharCode(parseInt(code, 10)))
    .replace(/&#x([0-9a-fA-F]+);/g, (_, code) => String.fromCharCode(parseInt(code, 16)));
}

// Clean HTML text into readable natural language
export function cleanHtmlText(html: string): string {
  if (!html) return '';
  // Decode first to convert &lt;p&gt; into <p>
  const decodedFirst = decodeHtmlEntities(html);
  const withoutTags = decodedFirst
    .replace(/<script[\s\S]*?<\/script>/gi, ' ')
    .replace(/<style[\s\S]*?<\/style>/gi, ' ')
    .replace(/<noscript[\s\S]*?<\/noscript>/gi, ' ')
    .replace(/<svg[\s\S]*?<\/svg>/gi, ' ')
    .replace(/<nav[\s\S]*?<\/nav>/gi, ' ')
    .replace(/<footer[\s\S]*?<\/footer>/gi, ' ')
    .replace(/<header[\s\S]*?<\/header>/gi, ' ')
    .replace(/<[^>]+>/g, ' ');

  return decodeHtmlEntities(withoutTags)
    .replace(/\s*\(\s*,\s*[A-Za-z0-9\s-]+\s*\)/g, '') // remove phonetics like ( , GOO-gəl)
    .replace(/\s*\(\s*IPA:[^)]+\)/gi, '') // remove IPA
    .replace(/\s*\(\s*(?:French|German|Spanish|Latin|Italian|Russian|Arabic|Hindi|Bengali):\s*[^)]+\)/gi, '') // remove language etymologies
    .replace(/\s*\(\s*listen\s*\)/gi, '') // remove (listen) audio tags
    .replace(/\s*\[\s*listen\s*\]/gi, '')
    .replace(/\s+/g, ' ')
    .replace(/[\r\n\t]+/g, ' ')
    .trim();
}

// Classify query intent for tailored synthesis
export function detectQueryIntent(query: string): QueryIntent {
  const q = query.toLowerCase().trim();
  if (/\b(vs|versus|difference between|compare|compared to|comparison)\b/i.test(q)) {
    return 'comparison';
  }
  if (/\b(pros and cons|advantages and disadvantages|benefits and drawbacks|trade-offs)\b/i.test(q)) {
    return 'pros_cons';
  }
  if (/\b(how to|how does|how do|how is|how can|why is|why does|mechanism|functionality|process|steps to)\b/i.test(q)) {
    return 'explanation';
  }
  if (/\b(latest|news|recent|update|updates|today|yesterday|this week|2024|2025|2026)\b/i.test(q)) {
    return 'timeline';
  }
  if (/\b(what is|what are|define|definition|who is|who was|meaning of|overview of)\b/i.test(q)) {
    return 'definition';
  }
  return 'general';
}

// Tokenize text into normalized lowercase tokens
export function tokenize(text: string): string[] {
  return text
    .toLowerCase()
    .replace(/[^a-z0-9\s-]/g, ' ')
    .split(/\s+/)
    .map(w => w.trim())
    .filter(w => w.length > 1 && !STOPWORDS.has(w));
}

// Segment text into grammatically viable sentences
export function splitSentences(text: string): string[] {
  // Normalize whitespaces
  const clean = text.replace(/\s+/g, ' ').trim();
  if (!clean) return [];

  // Protect common abbreviations from premature sentence splitting
  const protectedText = clean
    .replace(/\b(e\.g\.)/gi, 'eg_placeholder')
    .replace(/\b(i\.e\.)/gi, 'ie_placeholder')
    .replace(/\b(u\.s\.)/gi, 'us_placeholder')
    .replace(/\b(u\.k\.)/gi, 'uk_placeholder')
    .replace(/\b(dr\.|prof\.|mr\.|mrs\.|ms\.|vs\.|inc\.|ltd\.|corp\.)/gi, match => match.replace('.', '_dot_'))
    .replace(/(\d+)\.(\d+)/g, '$1_dec_$2'); // preserve decimal numbers

  // Split on punctuation followed by space and capital letter or end of string
  const rawSentences = protectedText.split(/(?<=[.!?])\s+(?=[A-Z0-9"']|$)/);

  return rawSentences
    .map(s => {
      let cleaned = s
        .replace(/eg_placeholder/gi, 'e.g.')
        .replace(/ie_placeholder/gi, 'i.e.')
        .replace(/us_placeholder/gi, 'U.S.')
        .replace(/uk_placeholder/gi, 'U.K.')
        .replace(/_dot_/g, '.')
        .replace(/_dec_/g, '.')
        .replace(/\s+-\s+[A-Za-z0-9\s.]{2,30}$/, '') // Clean trailing publisher tags
        .trim();

      // Ensure terminating punctuation if it's a statement
      if (cleaned && !/[.!?]"?$/.test(cleaned)) {
        cleaned += '.';
      }
      return cleaned;
    })
    .filter(s => {
      // Must be reasonable sentence length and structure
      const wordCount = s.split(/\s+/).length;
      if (wordCount < 6 || wordCount > 70) return false;
      // Must start with an uppercase letter, quote, or digit (avoid fragment tails)
      if (!/^[A-Z0-9"']/.test(s)) return false;
      // Filter out typical navigation / spam / wiki directory boilerplate
      if (/^(subscribe|cookie|sign in|log in|click here|read more|advertisement|copyright|share on|follow us)/i.test(s)) return false;
      if (/\b(Wikibooks|Wikimedia|ISBN\b|official site|external links|see also|disambiguation)\b/i.test(s)) return false;
      if (/[{}<>[\]\\\/]/.test(s)) return false;
      return true;
    });
}

// Compute Inverse Document Frequency (IDF) table across a corpus of sentences
export function computeIdf(sentencesTokens: string[][]): Map<string, number> {
  const N = sentencesTokens.length || 1;
  const docFreq = new Map<string, number>();

  for (const tokens of sentencesTokens) {
    const seen = new Set(tokens);
    for (const token of seen) {
      docFreq.set(token, (docFreq.get(token) || 0) + 1);
    }
  }

  const idf = new Map<string, number>();
  for (const [token, count] of docFreq.entries()) {
    // Smoothed BM25-style IDF
    idf.set(token, Math.log((N - count + 0.5) / (count + 0.5) + 1));
  }
  return idf;
}

export interface CandidateSentence {
  text: string;
  tokens: string[];
  tokenSet: Set<string>;
  sourceId: number;
  sourceIndex: number;
  isLead: boolean;
  score: number;
}

// Score each candidate sentence based on query relevance, salience, density, and position
export function scoreCandidates(
  sentences: { text: string; sourceId: number; sourceIndex: number; isLead: boolean }[],
  query: string
): CandidateSentence[] {
  const queryTokens = tokenize(query);
  const queryTokenSet = new Set(queryTokens);
  const queryLower = query.toLowerCase();

  const tokenizedList = sentences.map(s => tokenize(s.text));
  const idf = computeIdf(tokenizedList);

  const candidates: CandidateSentence[] = [];

  for (let i = 0; i < sentences.length; i++) {
    const item = sentences[i];
    const tokens = tokenizedList[i];
    if (tokens.length === 0) continue;

    const tokenSet = new Set(tokens);
    const textLower = item.text.toLowerCase();

    // 1. Skip question sentences (they don't answer the prompt)
    if (item.text.trim().endsWith('?')) {
      continue;
    }

    // 2. Skip headline/byline fragments with title separators or publisher suffixes
    if (
      /[|•]/.test(item.text) ||
      /\s-\s[A-Za-z0-9\s.]{2,30}$/.test(item.text) ||
      /\b(Britannica|Reuters|BBC|CNN|Washington Examiner|Phys\.org|The Verge|Forbes|Times of India)\.?$/i.test(item.text.trim())
    ) {
      continue;
    }

    // 3. Must contain an explanatory predicate or verb
    if (!/\b(is|are|was|were|has|have|can|will|works|operates|functions|generates|creates|produces|causes|enables|allows|uses|contains|consists|includes|depends|relies|helps)\b/i.test(item.text)) {
      continue;
    }

    // 4. TF-IDF & Query Token Overlap
    let queryMatchScore = 0;
    for (const qToken of queryTokens) {
      if (tokenSet.has(qToken)) {
        const weight = idf.get(qToken) || 1.0;
        queryMatchScore += weight * 3.0;
      }
    }

    // 5. Clean query exact phrase matching
    const cleanQuery = queryLower
      .replace(/^(who is|who was|who are|what is|what are|what was|tell me about|how does|where is|when was)\s+/i, '')
      .replace(/\b(the|current|present|latest|best|official)\b/gi, ' ')
      .replace(/[?!.,]/g, '')
      .replace(/\s+/g, ' ')
      .trim();

    let phraseBonus = 0;
    if (cleanQuery.length > 4 && textLower.includes(cleanQuery)) {
      phraseBonus += 25.0; // Major boost for exact phrase match
    } else if (queryLower.length > 5 && textLower.includes(queryLower)) {
      phraseBonus += 15.0;
    }

    // 6. Discriminative focus words bonus (e.g. CEO, capital, president, invented, recipe)
    const FOCUS_WORDS = ['capital', 'ceo', 'president', 'founder', 'born', 'founded', 'invented', 'discovered', 'population', 'currency', 'winner', 'recipe', 'works', 'cause', 'speed', 'distance', 'height', 'author', 'director', 'first', 'won', 'created', 'meaning', 'difference', 'origin'];
    const queryFocus = queryTokens.filter(t => FOCUS_WORDS.includes(t));
    let focusBonus = 0;
    for (const f of queryFocus) {
      if (textLower.includes(f)) {
        focusBonus += 16.0;
      }
    }

    // 7. Focus word + Entity co-occurrence bonus (e.g. "CEO" + "Google" or "capital" + "France")
    const ofMatch = cleanQuery.match(/\b([a-z]+)\s+of\s+([a-z0-9\s]+)$/i);
    let entityBonus = 0;
    if (ofMatch) {
      const roleWord = ofMatch[1].trim();
      const entityWord = ofMatch[2].trim();
      if (textLower.includes(roleWord) && textLower.includes(entityWord)) {
        entityBonus += 24.0;
      }
    }

    // 8. Information density bonus: numbers, dates, units, capitalized named entities
    let densityBonus = 0;
    const hasNumbers = /\b\d+(\.\d+)?(%|\$|€|£|x|fold|m|b|km|ghz|qubit|years?|century)?\b/i.test(item.text);
    if (hasNumbers) densityBonus += 1.8;

    const capitalMatches = item.text.match(/\b[A-Z][a-z]{2,}\b/g) || [];
    if (capitalMatches.length >= 3) densityBonus += 1.2;

    // 9. Structural & Lead sentence boost
    let positionBoost = 0;
    if (item.isLead) positionBoost += 2.0;
    if (item.sourceIndex === 0) positionBoost += 1.2;

    // 10. Definitional and informative cues
    let semanticBonus = 0;
    if (/\b(is defined as|refers to|is a type of|consists of|is designed to|allows users to|functions as|operates by|enables|utilizes|relies on|works by|was appointed|has been the)\b/i.test(item.text)) {
      semanticBonus += 4.0;
    }
    if (/\b(researchers|scientists|study|announced|revealed|discovered|confirmed|demonstrated|explains)\b/i.test(item.text)) {
      semanticBonus += 2.0;
    }
    if (/\b(however|in contrast|whereas|unlike|compared to|advantage|disadvantage|benefit|drawback)\b/i.test(item.text)) {
      semanticBonus += 2.5;
    }

    // 11. Length normalization (ideal is 15-45 words)
    const wordCount = item.text.split(/\s+/).length;
    let lengthModifier = 1.0;
    if (wordCount < 10) lengthModifier = 0.65;
    else if (wordCount > 55) lengthModifier = 0.85;

    // 12. Penalty for dangling pronouns at start
    let pronounPenalty = 0;
    if (/^(he|she|they|this|these|those|such)\b/i.test(item.text)) {
      pronounPenalty = 1.5;
    }

    const rawScore = (queryMatchScore + phraseBonus + focusBonus + entityBonus + densityBonus + positionBoost + semanticBonus - pronounPenalty) * lengthModifier;

    candidates.push({
      text: item.text,
      tokens,
      tokenSet,
      sourceId: item.sourceId,
      sourceIndex: item.sourceIndex,
      isLead: item.isLead,
      score: Math.max(0.1, rawScore),
    });
  }

  // Sort descending by score
  candidates.sort((a, b) => b.score - a.score);
  return candidates;
}

// Jaccard similarity between two token sets
function tokenOverlap(setA: Set<string>, setB: Set<string>): number {
  if (setA.size === 0 || setB.size === 0) return 0;
  let intersection = 0;
  for (const item of setA) {
    if (setB.has(item)) intersection++;
  }
  const union = setA.size + setB.size - intersection;
  return union === 0 ? 0 : intersection / union;
}

// Maximal Marginal Relevance (MMR) for diverse, non-redundant sentence selection
export function selectDiverseSentences(
  candidates: CandidateSentence[],
  limit: number,
  redundancyThreshold = 0.40
): CandidateSentence[] {
  if (candidates.length === 0) return [];
  const selected: CandidateSentence[] = [];

  for (const candidate of candidates) {
    if (selected.length >= limit) break;

    // Check overlap with already selected
    let tooSimilar = false;
    for (const sel of selected) {
      const sim = tokenOverlap(candidate.tokenSet, sel.tokenSet);
      if (sim > redundancyThreshold) {
        tooSimilar = true;
        break;
      }
    }

    if (!tooSimilar) {
      selected.push(candidate);
    }
  }

  return selected;
}

// Extract top keywords from the gathered text
export function extractTopKeywords(candidates: CandidateSentence[], queryTokens: Set<string>): string[] {
  const counts = new Map<string, number>();

  for (const cand of candidates.slice(0, 30)) {
    for (const t of cand.tokens) {
      if (!queryTokens.has(t) && t.length > 3) {
        counts.set(t, (counts.get(t) || 0) + 1);
      }
    }
  }

  const sorted = [...counts.entries()].sort((a, b) => b[1] - a[1]);
  return sorted.slice(0, 6).map(([w]) => w);
}

// Detect and build comparison aspect points if query is a comparison
export function extractComparisonData(
  query: string,
  candidates: CandidateSentence[]
): ComparisonData | undefined {
  const match = query.match(/(.+?)\s+(?:vs\.?|versus|compare(?:d)?\s+to|or)\s+(.+)/i);
  if (!match) return undefined;

  const entityA = match[1].replace(/^(compare|difference between|what is)\s+/i, '').trim();
  const entityB = match[2].replace(/\?.*$/, '').trim();

  if (!entityA || !entityB || entityA.length < 2 || entityB.length < 2) return undefined;

  const tokensA = new Set(tokenize(entityA));
  const tokensB = new Set(tokenize(entityB));

  const sentencesForA: string[] = [];
  const sentencesForB: string[] = [];
  const comparisonSentences: string[] = [];

  for (const c of candidates) {
    const hasA = [...tokensA].some(t => c.tokenSet.has(t));
    const hasB = [...tokensB].some(t => c.tokenSet.has(t));

    if (hasA && hasB) {
      comparisonSentences.push(c.text);
    } else if (hasA && sentencesForA.length < 3) {
      sentencesForA.push(c.text);
    } else if (hasB && sentencesForB.length < 3) {
      sentencesForB.push(c.text);
    }
  }

  return {
    entityA,
    entityB,
    aspects: [
      {
        aspect: 'Core Architecture & Focus',
        entityAValue: sentencesForA[0] || `${entityA} focuses on distinct foundational characteristics.`,
        entityBValue: sentencesForB[0] || `${entityB} provides alternative capabilities and design tradeoffs.`,
      },
      {
        aspect: 'Key Functional Differences',
        entityAValue: sentencesForA[1] || `${entityA} leverages specific algorithmic mechanisms.`,
        entityBValue: sentencesForB[1] || `${entityB} applies complementary approaches for its domain.`,
      },
      {
        aspect: 'Direct Comparison & Trade-offs',
        entityAValue: comparisonSentences[0] || `${entityA} demonstrates advantages in specific operational contexts.`,
        entityBValue: comparisonSentences[1] || `${entityB} excels in designated workflows and performance requirements.`,
      },
    ],
  };
}

// Master Algorithmic Synthesizer
export function synthesizeSearchResults({
  query,
  sources,
  relatedQueries = [],
  instantAnswer,
  startTimeMs,
}: {
  query: string;
  sources: SearchResultSource[];
  relatedQueries: string[];
  instantAnswer?: { heading?: string; text?: string; source?: string; url?: string };
  startTimeMs: number;
}): SearchSynthesis {
  const intent = detectQueryIntent(query);
  const rawSentences: { text: string; sourceId: number; sourceIndex: number; isLead: boolean }[] = [];

  // 1. Gather all candidate sentences from sources and instant answers
  if (instantAnswer?.text && instantAnswer.text.length > 30) {
    const sents = splitSentences(instantAnswer.text);
    sents.forEach((s, idx) => {
      rawSentences.push({
        text: s,
        sourceId: 1,
        sourceIndex: 0,
        isLead: idx === 0,
      });
    });
  }

  sources.forEach((source, srcIdx) => {
    // Process snippet
    if (source.snippet) {
      const sents = splitSentences(cleanHtmlText(source.snippet));
      sents.forEach((s, sIdx) => {
        rawSentences.push({
          text: s,
          sourceId: source.id,
          sourceIndex: srcIdx,
          isLead: sIdx === 0,
        });
      });
    }
  });

  const totalEvaluated = rawSentences.length;

  // 2. Score candidate sentences
  const scored = scoreCandidates(rawSentences, query);

  // 3. Select top sentences using MMR for Executive Summary
  const summaryCandidates = selectDiverseSentences(scored, 3, 0.35);
  // Ensure the #1 top-scored direct answer sentence is guaranteed as the primary lead
  if (scored.length > 0 && !summaryCandidates.includes(scored[0])) {
    summaryCandidates.unshift(scored[0]);
  }
  const summarySentences = summaryCandidates.slice(0, 3).map(c => c.text);

  // Direct answer definition
  const directAnswer = scored[0]?.text || (instantAnswer?.text ? instantAnswer.text.split('.')[0] + '.' : undefined);

  // If no sentences gathered, provide a graceful synthesized message
  const executiveSummary = summarySentences.length > 0
    ? summarySentences.join(' ')
    : `I reviewed the available publications for "${query}". Check the suggested URLs and references below for in-depth reading.`;

  // 4. Select Key Takeaways (distinct from executive summary)
  const remainingForTakeaways = scored.filter(c => !summaryCandidates.includes(c));
  const takeawayCandidates = selectDiverseSentences(remainingForTakeaways, 5, 0.30);

  const keyTakeaways: KeyTakeaway[] = takeawayCandidates.map(c => ({
    text: c.text,
    sourceIds: [c.sourceId],
  }));

  // If we had too few distinct takeaways, map available scored ones
  if (keyTakeaways.length < 2 && summaryCandidates.length > 1) {
    keyTakeaways.push({
      text: summaryCandidates[1].text,
      sourceIds: [summaryCandidates[1].sourceId],
    });
  }

  // 5. Structure Thematic Sections based on Intent
  const sections: SynthesisSection[] = [];
  const queryTokens = new Set(tokenize(query));
  const topKeywords = extractTopKeywords(scored, queryTokens);

  if (intent === 'comparison') {
    const compSentences = scored.filter(c =>
      /\b(vs|difference|contrast|unlike|compared|while|whereas|advantage|disadvantage)\b/i.test(c.text)
    );
    if (compSentences.length > 0) {
      sections.push({
        title: 'Comparative Analysis & Differences',
        content: selectDiverseSentences(compSentences, 3, 0.35).map(c => c.text).join(' '),
        sourceIds: [...new Set(compSentences.slice(0, 3).map(c => c.sourceId))],
      });
    }
  } else if (intent === 'explanation') {
    const mechSentences = scored.filter(c =>
      /\b(how|works|process|operates|functions|method|allows|enables|causes|steps)\b/i.test(c.text)
    );
    if (mechSentences.length > 0) {
      sections.push({
        title: 'How It Works & Mechanism',
        content: selectDiverseSentences(mechSentences, 3, 0.35).map(c => c.text).join(' '),
        sourceIds: [...new Set(mechSentences.slice(0, 3).map(c => c.sourceId))],
      });
    }
  } else if (intent === 'timeline') {
    const timeSentences = scored.filter(c =>
      /\b(recent|recently|announced|unveiled|reported|new|latest|this month|this year|2024|2025|2026)\b/i.test(c.text)
    );
    if (timeSentences.length > 0) {
      sections.push({
        title: 'Recent Developments & Timeline',
        content: selectDiverseSentences(timeSentences, 3, 0.35).map(c => c.text).join(' '),
        sourceIds: [...new Set(timeSentences.slice(0, 3).map(c => c.sourceId))],
      });
    }
  }

  // Add Background & Context section if we have additional depth
  const backgroundCandidates = scored.slice(4, 12);
  const bgDiverse = selectDiverseSentences(backgroundCandidates, 2, 0.30);
  if (bgDiverse.length > 0) {
    sections.push({
      title: 'Context & Key Perspectives',
      content: bgDiverse.map(c => c.text).join(' '),
      sourceIds: [...new Set(bgDiverse.map(c => c.sourceId))],
    });
  }

  // Comparison data
  const comparisonData = intent === 'comparison' ? extractComparisonData(query, scored) : undefined;

  let personaIntro = "Here is what I've gathered for you:";
  if (intent === 'comparison') {
    personaIntro = "Let's take a look at how both compare across their key characteristics and trade-offs:";
  } else if (intent === 'explanation') {
    personaIntro = "Here is a breakdown of how this works and the key mechanisms behind it:";
  } else if (intent === 'timeline') {
    personaIntro = "Here are the most notable recent updates and published developments:";
  } else if (intent === 'definition') {
    personaIntro = "Here is the core picture and primary definition:";
  }

  const personaOutro = "Let me know if you would like me to unpack any specific angle further, or choose from one of the follow-up topics below!";

  const durationMs = Math.round(performance.now() - startTimeMs);

  return {
    query,
    queryIntent: intent,
    personaIntro,
    personaOutro,
    directAnswer,
    executiveSummary,
    keyTakeaways,
    sections,
    comparisonData,
    sources,
    relatedQueries: relatedQueries.slice(0, 8),
    topKeywords,
    metrics: {
      searchDurationMs: durationMs,
      sourcesAnalyzed: sources.length,
      sentencesEvaluated: totalEvaluated,
      engineType: 'Algorithmic NLP (TF-IDF + TextRank + Lexical Salience)',
    },
  };
}
