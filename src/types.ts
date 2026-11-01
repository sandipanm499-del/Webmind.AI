/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

export type SourceType = 'google_news' | 'duckduckgo' | 'wikipedia' | 'web_page';

export type QueryIntent =
  | 'comparison'
  | 'explanation'
  | 'definition'
  | 'timeline'
  | 'pros_cons'
  | 'general';

export interface SearchResultSource {
  id: number;
  title: string;
  url: string;
  domain: string;
  sourceType: SourceType;
  snippet: string;
  publishedAt?: string;
  authorOrPublisher?: string;
}

export interface KeyTakeaway {
  text: string;
  sourceIds: number[];
  category?: string;
}

export interface SynthesisSection {
  title: string;
  content: string;
  sourceIds: number[];
}

export interface ComparisonPoint {
  aspect: string;
  entityAValue: string;
  entityBValue: string;
}

export interface ComparisonData {
  entityA: string;
  entityB: string;
  aspects: ComparisonPoint[];
}

export interface SynthesisMetrics {
  searchDurationMs: number;
  sourcesAnalyzed: number;
  sentencesEvaluated: number;
  engineType: string;
}

export interface SearchSynthesis {
  query: string;
  queryIntent: QueryIntent;
  personaIntro?: string;
  personaOutro?: string;
  directAnswer?: string;
  executiveSummary: string;
  keyTakeaways: KeyTakeaway[];
  sections: SynthesisSection[];
  comparisonData?: ComparisonData;
  sources: SearchResultSource[];
  relatedQueries: string[];
  topKeywords: string[];
  metrics: SynthesisMetrics;
}

export interface ChatMessage {
  id: string;
  role: 'user' | 'assistant';
  content: string;
  synthesis?: SearchSynthesis;
  timestamp: number;
  status?: 'searching' | 'extracting' | 'synthesizing' | 'complete' | 'error';
  errorMessage?: string;
}

export type SummaryLength = 'concise' | 'balanced' | 'comprehensive';
