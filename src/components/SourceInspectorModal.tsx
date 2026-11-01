/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React from 'react';
import { X, ExternalLink, Globe, BookOpen, Newspaper, Calendar, ShieldCheck } from 'lucide-react';
import { SearchResultSource } from '../types.ts';

interface SourceInspectorModalProps {
  source: SearchResultSource | null;
  onClose: () => void;
}

export const SourceInspectorModal: React.FC<SourceInspectorModalProps> = ({ source, onClose }) => {
  if (!source) return null;

  const getSourceIcon = () => {
    switch (source.sourceType) {
      case 'google_news':
        return <Newspaper className="w-4 h-4 text-blue-400" />;
      case 'wikipedia':
        return <BookOpen className="w-4 h-4 text-slate-300" />;
      default:
        return <Globe className="w-4 h-4 text-cyan-400" />;
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/70 backdrop-blur-sm animate-in fade-in duration-150">
      <div className="relative w-full max-w-2xl bg-slate-800 border border-slate-700 rounded-2xl shadow-2xl overflow-hidden">
        {/* Header */}
        <div className="flex items-center justify-between px-6 py-4 border-b border-slate-700/80 bg-slate-900/50">
          <div className="flex items-center gap-2">
            <span className="flex items-center justify-center w-6 h-6 rounded bg-cyan-950 border border-cyan-800 text-cyan-400 text-xs font-mono font-bold">
              [{source.id}]
            </span>
            <div className="flex items-center gap-1.5 text-xs text-slate-300">
              {getSourceIcon()}
              <span className="font-semibold text-white">{source.authorOrPublisher || source.domain}</span>
            </div>
          </div>
          <button
            onClick={onClose}
            className="p-1.5 text-slate-400 hover:text-white rounded-lg hover:bg-slate-700 transition-colors"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Body */}
        <div className="p-6 space-y-4 max-h-[70vh] overflow-y-auto">
          <div>
            <h3 className="text-base font-bold text-white mb-2 leading-snug">
              {source.title}
            </h3>
            {source.publishedAt && (
              <div className="flex items-center gap-1.5 text-xs text-slate-400 mb-3">
                <Calendar className="w-3.5 h-3.5 text-slate-500" />
                <span>Published: {source.publishedAt}</span>
              </div>
            )}
          </div>

          <div className="p-4 rounded-xl bg-slate-900/60 border border-slate-700/60">
            <h4 className="text-xs font-bold uppercase tracking-wider text-slate-400 mb-2">
              Extracted Snippet & Article Excerpt
            </h4>
            <p className="text-sm text-slate-200 leading-relaxed font-sans">
              {source.snippet}
            </p>
          </div>

          <div className="flex items-center justify-between p-3 rounded-lg bg-slate-900/30 border border-slate-700/40 text-xs text-slate-400">
            <div className="flex items-center gap-1.5">
              <ShieldCheck className="w-4 h-4 text-emerald-400" />
              <span>Verifiable Publication Record</span>
            </div>
            <span className="font-mono text-slate-500">{source.domain}</span>
          </div>
        </div>

        {/* Footer */}
        <div className="flex items-center justify-between px-6 py-3.5 border-t border-slate-700/80 bg-slate-900/40">
          <button
            onClick={onClose}
            className="px-4 py-2 text-xs font-medium text-slate-300 hover:text-white hover:bg-slate-700 rounded-lg transition-colors"
          >
            Close
          </button>
          <a
            href={source.url}
            target="_blank"
            rel="noopener noreferrer"
            className="flex items-center gap-1.5 px-4 py-2 text-xs font-medium text-white bg-cyan-600 hover:bg-cyan-500 rounded-lg transition-colors shadow-sm"
          >
            <span>Open Original Web Page</span>
            <ExternalLink className="w-3.5 h-3.5" />
          </a>
        </div>
      </div>
    </div>
  );
};
