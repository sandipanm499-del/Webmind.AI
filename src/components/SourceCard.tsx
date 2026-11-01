/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React, { useState } from 'react';
import { ExternalLink, Globe, BookOpen, Newspaper, Copy, Check } from 'lucide-react';
import { SearchResultSource } from '../types.ts';

interface SourceCardProps {
  source: SearchResultSource;
  onInspect?: (source: SearchResultSource) => void;
}

export const SourceCard: React.FC<SourceCardProps> = ({ source, onInspect }) => {
  const [copiedUrl, setCopiedUrl] = useState(false);

  const handleCopyUrl = (e: React.MouseEvent) => {
    e.preventDefault();
    e.stopPropagation();
    navigator.clipboard.writeText(source.url);
    setCopiedUrl(true);
    setTimeout(() => setCopiedUrl(false), 2000);
  };

  const getSourceIcon = () => {
    switch (source.sourceType) {
      case 'google_news':
        return <Newspaper className="w-3.5 h-3.5 text-blue-400" />;
      case 'wikipedia':
        return <BookOpen className="w-3.5 h-3.5 text-indigo-400" />;
      case 'duckduckgo':
      case 'web_page':
      default:
        return <Globe className="w-3.5 h-3.5 text-cyan-400" />;
    }
  };

  const getSourceTypeLabel = () => {
    switch (source.sourceType) {
      case 'google_news':
        return 'Publication';
      case 'wikipedia':
        return 'Reference Profile';
      case 'duckduckgo':
        return 'Knowledge Overview';
      default:
        return 'Web Article';
    }
  };

  return (
    <div className="group relative flex flex-col justify-between p-3.5 bg-slate-800/80 hover:bg-slate-800 rounded-xl border border-slate-700/80 hover:border-cyan-500/40 transition-all duration-150">
      <div>
        {/* Source metadata header */}
        <div className="flex items-center justify-between gap-2 mb-1.5 text-xs">
          <div className="flex items-center gap-1.5 min-w-0">
            <span className="flex items-center justify-center w-5 h-5 rounded bg-slate-900 border border-slate-700 text-cyan-300 text-[10px] font-mono font-bold shrink-0">
              [{source.id}]
            </span>
            <div className="flex items-center gap-1.5 text-slate-300 truncate">
              {getSourceIcon()}
              <span className="font-semibold text-slate-200 truncate">
                {source.authorOrPublisher || source.domain}
              </span>
              <span className="text-slate-600">·</span>
              <span className="text-[11px] text-slate-400">{getSourceTypeLabel()}</span>
            </div>
          </div>
          {source.publishedAt && (
            <span className="text-[11px] text-slate-500 whitespace-nowrap shrink-0">
              {source.publishedAt.split(' ').slice(1, 4).join(' ')}
            </span>
          )}
        </div>

        {/* Title */}
        <a
          href={source.url}
          target="_blank"
          rel="noopener noreferrer"
          className="block group/link mb-1.5"
        >
          <h4 className="text-sm font-semibold text-slate-100 group-hover/link:text-cyan-300 line-clamp-2 transition-colors">
            {source.title}
          </h4>
        </a>

        {/* Snippet extract */}
        <p className="text-xs text-slate-400 line-clamp-3 leading-relaxed mb-3">
          {source.snippet}
        </p>
      </div>

      {/* URL Link and Actions footer */}
      <div className="flex items-center justify-between pt-2 border-t border-slate-700/50 mt-auto">
        <a
          href={source.url}
          target="_blank"
          rel="noopener noreferrer"
          title={source.url}
          className="text-[11px] font-mono text-cyan-400/80 hover:text-cyan-300 truncate max-w-[200px]"
        >
          {source.url.replace(/^https?:\/\//, '')}
        </a>

        <div className="flex items-center gap-1.5">
          <button
            onClick={handleCopyUrl}
            title={copiedUrl ? 'Copied link!' : 'Copy URL to clipboard'}
            className="p-1 text-slate-400 hover:text-slate-200 hover:bg-slate-700/60 rounded transition-colors"
          >
            {copiedUrl ? (
              <Check className="w-3.5 h-3.5 text-emerald-400" />
            ) : (
              <Copy className="w-3.5 h-3.5" />
            )}
          </button>
          {onInspect && (
            <button
              onClick={() => onInspect(source)}
              className="text-xs text-slate-400 hover:text-slate-200 px-1.5 py-0.5 rounded hover:bg-slate-700/50 transition-colors"
            >
              Inspect
            </button>
          )}
          <a
            href={source.url}
            target="_blank"
            rel="noopener noreferrer"
            title="Open original webpage"
            className="flex items-center gap-1 px-2 py-0.5 text-xs text-white bg-cyan-600/80 hover:bg-cyan-600 rounded font-medium transition-colors"
          >
            <span>Open URL</span>
            <ExternalLink className="w-3 h-3" />
          </a>
        </div>
      </div>
    </div>
  );
};
