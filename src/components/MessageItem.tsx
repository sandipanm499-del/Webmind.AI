/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React, { useState } from 'react';
import {
  Copy,
  Check,
  Volume2,
  VolumeX,
  ChevronDown,
  ChevronUp,
  Layers,
  ArrowRight,
  Bot,
  Sparkles,
  BookOpen,
  MessageSquare,
  CheckCircle2,
} from 'lucide-react';
import { ChatMessage, SearchResultSource } from '../types.ts';
import { SourceCard } from './SourceCard.tsx';
import { PersonaTone } from './Header.tsx';

interface MessageItemProps {
  message: ChatMessage;
  onSelectRelatedQuery: (query: string) => void;
  onInspectSource: (source: SearchResultSource) => void;
  personaTone?: PersonaTone;
}

export const MessageItem: React.FC<MessageItemProps> = ({
  message,
  onSelectRelatedQuery,
  onInspectSource,
  personaTone = 'conversational',
}) => {
  const [copied, setCopied] = useState(false);
  const [isPlayingSpeech, setIsPlayingSpeech] = useState(false);
  const [showAllSources, setShowAllSources] = useState(false);

  const isUser = message.role === 'user';
  const synthesis = message.synthesis;

  const handleCopyText = (text: string) => {
    navigator.clipboard.writeText(text);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  const handleToggleSpeech = (text: string) => {
    if (!('speechSynthesis' in window)) return;

    if (isPlayingSpeech) {
      window.speechSynthesis.cancel();
      setIsPlayingSpeech(false);
      return;
    }

    window.speechSynthesis.cancel();
    const utterance = new SpeechSynthesisUtterance(text);
    utterance.rate = 1.05;
    utterance.pitch = 1.0;
    utterance.onend = () => setIsPlayingSpeech(false);
    utterance.onerror = () => setIsPlayingSpeech(false);

    window.speechSynthesis.speak(utterance);
    setIsPlayingSpeech(true);
  };

  if (isUser) {
    return (
      <div className="flex justify-end mb-6">
        <div className="max-w-2xl px-5 py-3 rounded-2xl bg-cyan-600/25 border border-cyan-500/40 text-white shadow-sm">
          <p className="text-sm font-medium leading-relaxed">{message.content}</p>
          <div className="mt-1 text-right">
            <span className="text-[10px] text-cyan-300/60 font-mono">
              {new Date(message.timestamp).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
            </span>
          </div>
        </div>
      </div>
    );
  }

  // Assistant Loading State (Persona-driven, no mechanical Google mention)
  if (message.status && message.status !== 'complete' && message.status !== 'error') {
    return (
      <div className="flex gap-3.5 mb-6">
        <div className="relative flex items-center justify-center w-8 h-8 rounded-xl bg-gradient-to-tr from-cyan-600 to-indigo-600 text-white shadow-sm shrink-0 mt-0.5 ring-1 ring-cyan-400/20">
          <Bot className="w-4 h-4 animate-pulse" />
        </div>
        <div className="flex-1 max-w-2xl p-4 rounded-2xl bg-slate-800/60 border border-slate-700/60 shadow-sm">
          <div className="flex items-center gap-2 mb-2.5">
            <span className="text-xs font-semibold text-cyan-300">
              Nova is investigating your question
            </span>
            <span className="text-slate-500 text-xs">·</span>
            <span className="text-xs text-slate-400">Reviewing real-time records</span>
          </div>

          <div className="space-y-1.5">
            <div className="flex items-center gap-2 text-xs text-slate-300">
              <div className="w-2 h-2 rounded-full bg-cyan-400 animate-ping" />
              <span>Scanning verified publications and documentation...</span>
            </div>
            <div className="flex items-center gap-2 text-xs text-slate-400">
              <div className="w-2 h-2 rounded-full bg-slate-600" />
              <span>Extracting key facts and formulating your breakdown...</span>
            </div>
          </div>
        </div>
      </div>
    );
  }

  // Assistant Error State
  if (message.status === 'error' || !synthesis) {
    return (
      <div className="flex gap-3.5 mb-6">
        <div className="flex items-center justify-center w-8 h-8 rounded-xl bg-rose-950/80 border border-rose-800/80 text-rose-400 shrink-0">
          <Bot className="w-4 h-4" />
        </div>
        <div className="flex-1 max-w-2xl p-4 rounded-2xl bg-rose-950/20 border border-rose-900/40 text-rose-200">
          <h4 className="text-sm font-semibold mb-1">I ran into a temporary bump</h4>
          <p className="text-xs text-rose-300 leading-relaxed">
            {message.errorMessage || 'I was unable to retrieve verified information for that topic right now. Please try rephrasing or asking again!'}
          </p>
        </div>
      </div>
    );
  }

  // Assistant Complete Synthesized Message
  const isChitChat = synthesis.sources.length === 0;

  if (isChitChat) {
    return (
      <div className="flex gap-3.5 mb-8">
        <div className="relative flex items-center justify-center w-8 h-8 rounded-xl bg-gradient-to-tr from-cyan-600 to-indigo-600 text-white shadow-sm shrink-0 mt-0.5 ring-1 ring-cyan-400/20">
          <Bot className="w-4 h-4" />
          <span className="absolute -bottom-0.5 -right-0.5 w-2 h-2 rounded-full bg-emerald-400 border border-slate-900" />
        </div>

        <div className="flex-1 max-w-2xl space-y-3">
          <div className="p-4 rounded-2xl bg-slate-800/90 border border-slate-700/80 shadow-xs">
            <div className="text-sm text-slate-100 leading-relaxed whitespace-pre-line font-normal">
              {synthesis.executiveSummary}
            </div>
          </div>

          {synthesis.relatedQueries && synthesis.relatedQueries.length > 0 && (
            <div className="pt-1">
              <span className="text-xs text-slate-400 mb-2 block font-medium">
                Try asking me:
              </span>
              <div className="flex flex-wrap gap-1.5">
                {synthesis.relatedQueries.map((rq, rqIdx) => (
                  <button
                    key={rqIdx}
                    onClick={() => onSelectRelatedQuery(rq)}
                    className="px-3 py-1.5 text-xs text-slate-300 hover:text-cyan-300 bg-slate-800/80 hover:bg-slate-800 border border-slate-700 hover:border-cyan-500/40 rounded-xl transition-colors text-left flex items-center gap-1.5"
                  >
                    <span>{rq}</span>
                    <ArrowRight className="w-3 h-3 text-slate-500" />
                  </button>
                ))}
              </div>
            </div>
          )}
        </div>
      </div>
    );
  }

  const displayedSources = showAllSources
    ? synthesis.sources
    : synthesis.sources.slice(0, 4);

  // Persona intro tone variations
  let personaGreeting = synthesis.personaIntro || "Here is what I've gathered for you:";
  if (personaTone === 'analytical') {
    personaGreeting = "Here is an in-depth analytical breakdown based on current literature and reports:";
  } else if (personaTone === 'concise') {
    personaGreeting = "Here are the core takeaways in brief:";
  }

  return (
    <div className="flex gap-3.5 mb-8">
      {/* Bot Persona Avatar */}
      <div className="relative flex items-center justify-center w-8 h-8 rounded-xl bg-gradient-to-tr from-cyan-600 to-indigo-600 text-white shadow-sm shrink-0 mt-0.5 ring-1 ring-cyan-400/20">
        <Bot className="w-4 h-4" />
        <span className="absolute -bottom-0.5 -right-0.5 w-2 h-2 rounded-full bg-emerald-400 border border-slate-900" />
      </div>

      <div className="flex-1 max-w-4xl space-y-4">
        {/* Header / Meta bar */}
        <div className="flex flex-wrap items-center justify-between gap-2 pb-1 border-b border-slate-800">
          <div className="flex items-center gap-2">
            <span className="text-xs font-bold text-white">Nova</span>
            <span className="text-slate-600">·</span>
            <span className="text-xs text-slate-400 font-medium">{personaGreeting}</span>
          </div>

          <div className="flex items-center gap-1.5">
            <button
              onClick={() => handleToggleSpeech(synthesis.executiveSummary)}
              title={isPlayingSpeech ? 'Stop speech' : 'Listen to summary'}
              className="p-1.5 text-slate-400 hover:text-slate-200 hover:bg-slate-800 rounded-md transition-colors"
            >
              {isPlayingSpeech ? <VolumeX className="w-3.5 h-3.5 text-cyan-400" /> : <Volume2 className="w-3.5 h-3.5" />}
            </button>
            <button
              onClick={() => handleCopyText(`${synthesis.executiveSummary}\n\nKey Takeaways:\n` + synthesis.keyTakeaways.map(t => `- ${t.text}`).join('\n'))}
              title="Copy answer"
              className="p-1.5 text-slate-400 hover:text-slate-200 hover:bg-slate-800 rounded-md transition-colors"
            >
              {copied ? <Check className="w-3.5 h-3.5 text-emerald-400" /> : <Copy className="w-3.5 h-3.5" />}
            </button>
          </div>
        </div>

        {/* 1. Direct Answer & Core Synthesis */}
        <div className="p-4 rounded-xl bg-slate-800/80 border border-slate-700/80 shadow-xs space-y-2.5">
          {synthesis.directAnswer && (
            <div className="p-3 rounded-lg bg-cyan-950/60 border border-cyan-500/40 text-cyan-100 flex items-start gap-2.5 shadow-xs">
              <CheckCircle2 className="w-4 h-4 text-cyan-400 shrink-0 mt-0.5" />
              <div className="text-sm font-semibold leading-relaxed">
                {synthesis.directAnswer}
              </div>
            </div>
          )}
          {synthesis.executiveSummary && (
            <p className="text-sm text-slate-200 leading-relaxed font-normal">
              {synthesis.executiveSummary.startsWith(synthesis.directAnswer || '')
                ? synthesis.executiveSummary.slice(synthesis.directAnswer?.length || 0).trim()
                : synthesis.executiveSummary}
            </p>
          )}
        </div>

        {/* 2. Key Takeaways & Fact Points */}
        {synthesis.keyTakeaways && synthesis.keyTakeaways.length > 0 && (
          <div className="p-4 rounded-xl bg-slate-800/40 border border-slate-800">
            <h4 className="text-xs font-bold uppercase tracking-wider text-cyan-400/90 mb-3 flex items-center gap-1.5">
              <Sparkles className="w-3.5 h-3.5 text-cyan-400" />
              <span>Key Highlights & Points</span>
            </h4>
            <ul className="space-y-2.5">
              {synthesis.keyTakeaways.map((takeaway, idx) => (
                <li key={idx} className="flex items-start gap-2.5 text-sm text-slate-200 leading-relaxed">
                  <span className="flex items-center justify-center w-4 h-4 rounded bg-cyan-500/10 text-cyan-400 text-[10px] font-mono shrink-0 mt-0.5">
                    {idx + 1}
                  </span>
                  <div>
                    <span>{takeaway.text}</span>
                    {takeaway.sourceIds && takeaway.sourceIds.length > 0 && (
                      <span className="inline-flex gap-1 ml-1.5 align-middle">
                        {takeaway.sourceIds.map(srcId => (
                          <button
                            key={srcId}
                            onClick={() => {
                              const src = synthesis.sources.find(s => s.id === srcId);
                              if (src) onInspectSource(src);
                            }}
                            title={`Inspect Source [${srcId}]`}
                            className="px-1.5 py-0.2 rounded bg-slate-700/80 hover:bg-cyan-600/30 text-cyan-300 hover:text-cyan-200 text-[10px] font-mono transition-colors"
                          >
                            [{srcId}]
                          </button>
                        ))}
                      </span>
                    )}
                  </div>
                </li>
              ))}
            </ul>
          </div>
        )}

        {/* 3. Comparison Matrix if available */}
        {synthesis.comparisonData && (
          <div className="p-4 rounded-xl bg-slate-800/50 border border-slate-700 overflow-hidden">
            <h4 className="text-xs font-bold uppercase tracking-wider text-slate-200 mb-3 flex items-center gap-2">
              <Layers className="w-4 h-4 text-cyan-400" />
              <span>Comparison: {synthesis.comparisonData.entityA} vs {synthesis.comparisonData.entityB}</span>
            </h4>
            <div className="overflow-x-auto">
              <table className="w-full text-left text-xs border-collapse">
                <thead>
                  <tr className="border-b border-slate-700 bg-slate-900/60">
                    <th className="py-2.5 px-3 font-semibold text-slate-400">Dimension</th>
                    <th className="py-2.5 px-3 font-semibold text-cyan-300">{synthesis.comparisonData.entityA}</th>
                    <th className="py-2.5 px-3 font-semibold text-purple-300">{synthesis.comparisonData.entityB}</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-800">
                  {synthesis.comparisonData.aspects.map((aspect, aIdx) => (
                    <tr key={aIdx} className="hover:bg-slate-800/40 transition-colors">
                      <td className="py-2.5 px-3 font-medium text-slate-300 align-top">
                        {aspect.aspect}
                      </td>
                      <td className="py-2.5 px-3 text-slate-200 align-top leading-relaxed">
                        {aspect.entityAValue}
                      </td>
                      <td className="py-2.5 px-3 text-slate-200 align-top leading-relaxed">
                        {aspect.entityBValue}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        )}

        {/* 4. Thematic Sections Breakdown */}
        {synthesis.sections && synthesis.sections.length > 0 && (
          <div className="space-y-3">
            {synthesis.sections.map((sec, sIdx) => (
              <div key={sIdx} className="p-4 rounded-xl bg-slate-800/30 border border-slate-800">
                <h5 className="text-xs font-bold text-slate-200 uppercase tracking-wider mb-1.5">
                  {sec.title}
                </h5>
                <p className="text-sm text-slate-300 leading-relaxed">
                  {sec.content}
                </p>
                {sec.sourceIds.length > 0 && (
                  <div className="flex items-center gap-1.5 mt-2 pt-2 border-t border-slate-800/60 text-xs text-slate-500">
                    <span>Cited references:</span>
                    {sec.sourceIds.map(srcId => (
                      <button
                        key={srcId}
                        onClick={() => {
                          const src = synthesis.sources.find(s => s.id === srcId);
                          if (src) onInspectSource(src);
                        }}
                        className="px-1.5 py-0.2 rounded bg-slate-700/60 hover:bg-slate-700 text-slate-300 text-[10px] font-mono"
                      >
                        [{srcId}]
                      </button>
                    ))}
                  </div>
                )}
              </div>
            ))}
          </div>
        )}

        {/* 5. Suggested URLs for this Prompt */}
        {synthesis.sources.length > 0 && (
          <div className="pt-2">
            <div className="flex items-center justify-between mb-3">
              <h4 className="text-xs font-bold uppercase tracking-wider text-slate-300 flex items-center gap-2">
                <BookOpen className="w-3.5 h-3.5 text-cyan-400" />
                <span>Suggested URLs for this Prompt ({synthesis.sources.length})</span>
              </h4>
              {synthesis.sources.length > 4 && (
                <button
                  onClick={() => setShowAllSources(!showAllSources)}
                  className="flex items-center gap-1 text-xs text-cyan-400 hover:text-cyan-300 transition-colors"
                >
                  <span>{showAllSources ? 'Show fewer' : `View all ${synthesis.sources.length} URLs`}</span>
                  {showAllSources ? <ChevronUp className="w-3.5 h-3.5" /> : <ChevronDown className="w-3.5 h-3.5" />}
                </button>
              )}
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
              {displayedSources.map(source => (
                <SourceCard
                  key={source.id}
                  source={source}
                  onInspect={onInspectSource}
                />
              ))}
            </div>
          </div>
        )}

        {/* 6. Persona Outro & Suggested Follow-up Questions */}
        {synthesis.relatedQueries && synthesis.relatedQueries.length > 0 && (
          <div className="p-3.5 rounded-xl bg-slate-900/60 border border-slate-800">
            <div className="flex items-center gap-1.5 text-xs text-slate-300 mb-2 font-medium">
              <MessageSquare className="w-3.5 h-3.5 text-cyan-400" />
              <span>You might also want to ask me:</span>
            </div>
            <div className="flex flex-wrap gap-1.5">
              {synthesis.relatedQueries.map((rq, rqIdx) => (
                <button
                  key={rqIdx}
                  onClick={() => onSelectRelatedQuery(rq)}
                  className="px-2.5 py-1 text-xs text-slate-300 hover:text-cyan-300 bg-slate-800/80 hover:bg-slate-800 border border-slate-700 hover:border-cyan-500/40 rounded-lg transition-colors text-left flex items-center gap-1.5"
                >
                  <span>{rq}</span>
                  <ArrowRight className="w-3 h-3 text-slate-500" />
                </button>
              ))}
            </div>
          </div>
        )}

        {/* 7. Quiet Persona Closing */}
        <div className="text-xs text-slate-400 pt-1 italic">
          "{synthesis.personaOutro || "Feel free to ask me to delve deeper into any detail above!"}"
        </div>
      </div>
    </div>
  );
};
