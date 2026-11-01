/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React, { useState, useRef, useEffect } from 'react';
import { ArrowUp, Loader2 } from 'lucide-react';

interface ChatInputProps {
  onSendMessage: (query: string) => void;
  isLoading: boolean;
}

export const ChatInput: React.FC<ChatInputProps> = ({ onSendMessage, isLoading }) => {
  const [input, setInput] = useState('');
  const textareaRef = useRef<HTMLTextAreaElement>(null);

  // Auto-resize textarea based on content
  useEffect(() => {
    if (textareaRef.current) {
      textareaRef.current.style.height = 'auto';
      const scrollHeight = textareaRef.current.scrollHeight;
      // Cap at ~160px height
      textareaRef.current.style.height = `${Math.min(scrollHeight, 160)}px`;
    }
  }, [input]);

  const handleSubmit = () => {
    const trimmed = input.trim();
    if (!trimmed || isLoading) return;

    onSendMessage(trimmed);
    setInput('');

    if (textareaRef.current) {
      textareaRef.current.style.height = 'auto';
    }
  };

  const handleKeyDown = (e: React.KeyboardEvent<HTMLTextAreaElement>) => {
    // Send on Enter without Shift
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault();
      handleSubmit();
    }
  };

  return (
    <div className="w-full max-w-4xl mx-auto px-4 py-3">
      <div className="relative flex flex-col rounded-2xl bg-slate-800 border border-slate-700/80 focus-within:border-cyan-500/60 focus-within:ring-2 focus-within:ring-cyan-500/20 shadow-lg transition-all duration-150">
        {/* Multi-line Chat Textarea */}
        <textarea
          ref={textareaRef}
          value={input}
          onChange={e => setInput(e.target.value)}
          onKeyDown={handleKeyDown}
          disabled={isLoading}
          rows={1}
          placeholder="Message Nova... Ask a question or explore a topic"
          className="w-full px-4 pt-3.5 pb-2 bg-transparent text-sm text-slate-100 placeholder-slate-400 focus:outline-none resize-none leading-relaxed min-h-[46px] max-h-[160px]"
        />

        {/* Prompt Box Bottom Row */}
        <div className="flex items-center justify-between px-3.5 pb-2.5 pt-1">
          <div className="flex items-center gap-2 text-[11px] text-slate-500 font-sans">
            <span className="hidden sm:inline">Press</span>
            <kbd className="hidden sm:inline-block px-1.5 py-0.5 rounded bg-slate-900 border border-slate-700 text-[10px] text-slate-400 font-mono">
              Enter ↵
            </kbd>
            <span className="hidden sm:inline">to send,</span>
            <kbd className="hidden sm:inline-block px-1.5 py-0.5 rounded bg-slate-900 border border-slate-700 text-[10px] text-slate-400 font-mono">
              Shift + Enter
            </kbd>
            <span className="hidden sm:inline">for new line</span>
          </div>

          <div className="flex items-center gap-2 ml-auto">
            <button
              type="button"
              onClick={handleSubmit}
              disabled={!input.trim() || isLoading}
              title="Send message"
              className="flex items-center justify-center w-8 h-8 rounded-xl bg-cyan-600 hover:bg-cyan-500 disabled:opacity-30 disabled:hover:bg-cyan-600 text-white font-medium shadow-sm transition-all"
            >
              {isLoading ? (
                <Loader2 className="w-4 h-4 animate-spin" />
              ) : (
                <ArrowUp className="w-4 h-4" />
              )}
            </button>
          </div>
        </div>
      </div>
    </div>
  );
};
