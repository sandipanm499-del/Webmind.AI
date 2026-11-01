/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React from 'react';
import { X, ShieldCheck, Cpu, Database, Layers, CheckCircle2, Bot } from 'lucide-react';

interface MethodologyModalProps {
  isOpen: boolean;
  onClose: () => void;
}

export const MethodologyModal: React.FC<MethodologyModalProps> = ({ isOpen, onClose }) => {
  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/75 backdrop-blur-sm animate-in fade-in duration-150">
      <div className="relative w-full max-w-2xl bg-slate-800 border border-slate-700 rounded-2xl shadow-2xl overflow-hidden">
        {/* Header */}
        <div className="flex items-center justify-between px-6 py-4 border-b border-slate-700/80 bg-slate-900/50">
          <div className="flex items-center gap-2.5">
            <div className="flex items-center justify-center w-8 h-8 rounded-xl bg-gradient-to-tr from-cyan-600 to-indigo-600 text-white shadow-xs">
              <Bot className="w-4 h-4" />
            </div>
            <div>
              <h3 className="text-base font-bold text-white">
                About Nova: 100% AI-Free Architecture
              </h3>
              <p className="text-xs text-slate-400">
                Persona-driven computational linguistics without generative AI models
              </p>
            </div>
          </div>
          <button
            onClick={onClose}
            className="p-1.5 text-slate-400 hover:text-white rounded-lg hover:bg-slate-700 transition-colors"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Content */}
        <div className="p-6 space-y-5 max-h-[75vh] overflow-y-auto">
          {/* Direct Answer Banner to User's Question */}
          <div className="p-4 rounded-xl bg-cyan-950/40 border border-cyan-800/60 text-cyan-200">
            <div className="flex items-center gap-2 mb-1 text-white font-semibold text-sm">
              <ShieldCheck className="w-4 h-4 text-cyan-400" />
              <span>Does Nova use Artificial Intelligence (AI) or LLMs?</span>
            </div>
            <p className="text-xs leading-relaxed text-cyan-200">
              <strong>No. Absolutely not.</strong> Nova does not send prompts to OpenAI, Gemini, Claude, or any large language model. There are zero AI tokens, zero machine learning hallucination risks, and zero external AI API keys.
            </p>
          </div>

          {/* How Nova Generates Answers */}
          <div className="space-y-3">
            <h4 className="text-xs font-bold uppercase tracking-wider text-slate-300">
              How Nova Formulates Your Answers
            </h4>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
              <div className="p-3.5 rounded-xl bg-slate-900/50 border border-slate-700/60">
                <div className="flex items-center gap-2 mb-1.5 text-cyan-400 text-xs font-semibold">
                  <Database className="w-3.5 h-3.5" />
                  <span>1. Real-Time Fact Gathering</span>
                </div>
                <p className="text-xs text-slate-300 leading-relaxed">
                  Fetches live published articles, encyclopedic records, and verifiable public documents for the subject.
                </p>
              </div>

              <div className="p-3.5 rounded-xl bg-slate-900/50 border border-slate-700/60">
                <div className="flex items-center gap-2 mb-1.5 text-cyan-400 text-xs font-semibold">
                  <Cpu className="w-3.5 h-3.5" />
                  <span>2. Deterministic NLP Scoring</span>
                </div>
                <p className="text-xs text-slate-300 leading-relaxed">
                  Extracts sentences using TF-IDF term frequency weighting, keyword salience, and density heuristics.
                </p>
              </div>

              <div className="p-3.5 rounded-xl bg-slate-900/50 border border-slate-700/60">
                <div className="flex items-center gap-2 mb-1.5 text-cyan-400 text-xs font-semibold">
                  <Layers className="w-3.5 h-3.5" />
                  <span>3. Deduplication (MMR)</span>
                </div>
                <p className="text-xs text-slate-300 leading-relaxed">
                  Applies Maximal Marginal Relevance to eliminate redundant repetitions across overlapping publications.
                </p>
              </div>

              <div className="p-3.5 rounded-xl bg-slate-900/50 border border-slate-700/60">
                <div className="flex items-center gap-2 mb-1.5 text-cyan-400 text-xs font-semibold">
                  <Bot className="w-3.5 h-3.5" />
                  <span>4. Conversational Persona</span>
                </div>
                <p className="text-xs text-slate-300 leading-relaxed">
                  Structures the extracted facts into friendly, coherent answers with interactive source citations.
                </p>
              </div>
            </div>
          </div>

          {/* Guarantees */}
          <div className="p-4 rounded-xl bg-slate-900/40 border border-slate-800 space-y-2 text-xs text-slate-300">
            <div className="flex items-center gap-2">
              <CheckCircle2 className="w-4 h-4 text-emerald-400 shrink-0" />
              <span><strong>100% Verifiable:</strong> Every sentence is directly rooted in genuine published documentation.</span>
            </div>
            <div className="flex items-center gap-2">
              <CheckCircle2 className="w-4 h-4 text-emerald-400 shrink-0" />
              <span><strong>Completely Free & Private:</strong> Zero subscription tiers, zero tokens, and zero tracking.</span>
            </div>
          </div>
        </div>

        {/* Footer */}
        <div className="flex items-center justify-end px-6 py-3 border-t border-slate-700/80 bg-slate-900/40">
          <button
            onClick={onClose}
            className="px-5 py-2 text-xs font-medium text-white bg-cyan-600 hover:bg-cyan-500 rounded-lg transition-colors"
          >
            Understood
          </button>
        </div>
      </div>
    </div>
  );
};
