/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React from 'react';
import { Bot, Trash2, Download, HelpCircle, HeartHandshake } from 'lucide-react';

export type PersonaTone = 'conversational' | 'analytical' | 'concise';

interface HeaderProps {
  onClearChat: () => void;
  onOpenMethodology: () => void;
  onExportChat: () => void;
  hasMessages: boolean;
  personaTone: PersonaTone;
  onChangeTone: (tone: PersonaTone) => void;
}

export const Header: React.FC<HeaderProps> = ({
  onClearChat,
  onOpenMethodology,
  onExportChat,
  hasMessages,
  personaTone,
  onChangeTone,
}) => {
  return (
    <header className="sticky top-0 z-30 flex items-center justify-between gap-8 px-6 py-3 bg-slate-900/95 backdrop-blur-md border-b border-slate-800">
      {/* Zone 1: Persona Brand Lockup */}
      <div className="flex items-center gap-3 shrink-0">
        <div className="relative flex items-center justify-center w-9 h-9 rounded-xl bg-gradient-to-tr from-cyan-600 to-indigo-600 text-white shadow-sm ring-1 ring-cyan-400/20">
          <Bot className="w-5 h-5" />
          <span className="absolute -bottom-0.5 -right-0.5 w-2.5 h-2.5 rounded-full bg-emerald-400 border-2 border-slate-900" />
        </div>
        <div className="flex flex-col">
          <div className="flex items-center gap-2">
            <span className="text-base font-bold tracking-tight text-white whitespace-nowrap">
              Nova
            </span>
            <span className="text-[11px] font-medium text-cyan-300 bg-cyan-950/70 border border-cyan-800/60 px-1.5 py-0.2 rounded-md">
              Research Companion
            </span>
          </div>
          <span className="text-xs text-slate-400 whitespace-nowrap">
            Synthesizing factual insights for your questions
          </span>
        </div>
      </div>

      {/* Zone 2: Tone & Persona Mode selector */}
      <div className="hidden md:flex items-center gap-1.5 p-1 bg-slate-800/80 rounded-xl border border-slate-700/60 text-xs font-medium">
        <button
          onClick={() => onChangeTone('conversational')}
          className={`px-3 py-1 rounded-lg transition-colors whitespace-nowrap shrink-0 ${
            personaTone === 'conversational'
              ? 'bg-cyan-600 text-white shadow-xs'
              : 'text-slate-400 hover:text-slate-200'
          }`}
        >
          Friendly & Conversational
        </button>
        <button
          onClick={() => onChangeTone('analytical')}
          className={`px-3 py-1 rounded-lg transition-colors whitespace-nowrap shrink-0 ${
            personaTone === 'analytical'
              ? 'bg-cyan-600 text-white shadow-xs'
              : 'text-slate-400 hover:text-slate-200'
          }`}
        >
          Deep Analytical
        </button>
        <button
          onClick={() => onChangeTone('concise')}
          className={`px-3 py-1 rounded-lg transition-colors whitespace-nowrap shrink-0 ${
            personaTone === 'concise'
              ? 'bg-cyan-600 text-white shadow-xs'
              : 'text-slate-400 hover:text-slate-200'
          }`}
        >
          Quick & Concise
        </button>
      </div>

      {/* Zone 3: Actions */}
      <div className="flex items-center gap-2 shrink-0">
        <button
          onClick={onOpenMethodology}
          title="About Nova's Architecture (Zero AI, 100% Deterministic)"
          className="flex items-center gap-1.5 px-2.5 py-1.5 text-xs font-medium text-slate-400 hover:text-slate-200 hover:bg-slate-800 rounded-lg transition-colors whitespace-nowrap shrink-0"
        >
          <HelpCircle className="w-4 h-4 text-cyan-400" />
          <span className="hidden sm:inline">About Nova</span>
        </button>

        {hasMessages && (
          <>
            <button
              onClick={onExportChat}
              title="Export research report as Markdown"
              className="flex items-center gap-1.5 px-3 py-1.5 text-xs font-medium text-slate-300 hover:text-white bg-slate-800 hover:bg-slate-700 rounded-lg border border-slate-700 transition-colors whitespace-nowrap shrink-0"
            >
              <Download className="w-3.5 h-3.5 text-slate-400" />
              <span>Export</span>
            </button>
            <button
              onClick={onClearChat}
              title="Clear conversation"
              className="flex items-center gap-1.5 px-3 py-1.5 text-xs font-medium text-rose-400 hover:text-rose-300 bg-rose-950/30 hover:bg-rose-950/60 rounded-lg border border-rose-900/50 transition-colors whitespace-nowrap shrink-0"
            >
              <Trash2 className="w-3.5 h-3.5" />
              <span>Clear</span>
            </button>
          </>
        )}
      </div>
    </header>
  );
};
