/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React, { useState, useEffect, useRef } from 'react';

interface SourceItem {
  id: number;
  title: string;
  url: string;
  domain: string;
}

interface ChatMessageItem {
  role: 'user' | 'assistant';
  content: string;
  sources?: SourceItem[];
  status?: string;
  promptReference?: string;
}

interface ChatThread {
  id: string;
  title: string;
  msgs: ChatMessageItem[];
}

export type VoiceAgeProfile = 'youthful' | 'natural' | 'mature';
type Theme = 'light' | 'dark';

const esc = (s: string) =>
  s.replace(/[&<>"']/g, c => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' })[c] || c);

const safeSources = (list: any): SourceItem[] =>
  (Array.isArray(list) ? list : []).filter(s => s && typeof s.url === 'string' && /^https?:\/\//i.test(s.url));

// Formulate a clean, short spoken briefing of the prompt & direct output
function getShortSpokenBrief(promptText: string, botContent: string): string {
  const cleaned = botContent
    .replace(/\[\d+\]/g, '')
    .replace(/\[([^\]]+)\]\([^)]+\)/g, '$1')
    .replace(/[*#`_~]/g, '')
    .replace(/###?\s+/g, '')
    .replace(/\s+/g, ' ')
    .trim();

  const sentences = cleaned.split(/(?<=[.!?])\s+/).filter(s => s.trim().length > 6);
  const coreAnswer = sentences.slice(0, 2).join(' ') || cleaned.slice(0, 200);

  if (promptText && promptText.trim()) {
    return `For prompt: ${promptText.trim()}. The answer is: ${coreAnswer}`;
  }
  return coreAnswer;
}

// Minimal, escape-first markdown parser
function renderMarkdown(text: string, sources: SourceItem[] = []): string {
  const cite = (n: string) => {
    const s = sources.find(x => x.id === +n);
    return s
      ? `<a class="cite" href="${esc(s.url)}" target="_blank" rel="noopener noreferrer" title="${esc(s.domain)}">${n}</a>`
      : `[${n}]`;
  };

  const inline = (t: string) =>
    esc(t)
      .replace(/\*\*(.+?)\*\*/g, '<strong>$1</strong>')
      .replace(/`(.+?)`/g, '<code>$1</code>')
      .replace(/\[([^\]]+)\]\((https?:\/\/[^\s)]+)\)/g, '<a href="$2" target="_blank" rel="noopener noreferrer">$1</a>')
      .replace(/\[(\d+)\]/g, (_, n) => cite(n));

  const out: string[] = [];
  let list = false;
  for (const line of text.split('\n')) {
    const li = line.match(/^\s*(?:[-*•]|\d+\.)\s+(.*)/);
    if (li) {
      if (!list) out.push('<ul>');
      list = true;
      out.push(`<li>${inline(li[1])}</li>`);
      continue;
    }
    if (list) {
      out.push('</ul>');
      list = false;
    }
    const h = line.match(/^#{1,4}\s+(.*)/);
    if (h) out.push(`<h4>${inline(h[1])}</h4>`);
    else if (line.trim()) out.push(`<p>${inline(line)}</p>`);
  }
  if (list) out.push('</ul>');
  return out.join('');
}

const STARTER_CHIPS = ['Latest SpaceX news', 'Top tech headlines today', 'Explain how vaccines work'];

const loadChats = (): ChatThread[] => {
  try {
    const saved = localStorage.getItem('webmind-chats');
    if (saved) {
      const parsed = JSON.parse(saved);
      if (Array.isArray(parsed)) return parsed;
    }
    // Migrate the old single-chat history if present
    const old = localStorage.getItem('webmind-history');
    if (old) {
      const msgs = JSON.parse(old);
      if (Array.isArray(msgs) && msgs.length) {
        const first = msgs.find((m: ChatMessageItem) => m.role === 'user')?.content || 'Previous chat';
        return [{ id: 'legacy', title: String(first).slice(0, 40), msgs }];
      }
    }
  } catch {
    // Ignore
  }
  return [];
};

const greeting = () => {
  const h = new Date().getHours();
  return h < 12 ? 'Good morning' : h < 18 ? 'Good afternoon' : 'Good evening';
};

export default function App() {
  const [chats, setChats] = useState<ChatThread[]>(loadChats);
  const [activeId, setActiveId] = useState<string | null>(() => chats[0]?.id ?? null);
  const activeRef = useRef<string | null>(activeId);

  const [history, setHistory] = useState<ChatMessageItem[]>(
    () => chats.find(c => c.id === activeId)?.msgs ?? []
  );

  const [inputVal, setInputVal] = useState('');
  const [busy, setBusy] = useState(false);
  const [copiedIndex, setCopiedIndex] = useState<number | null>(null);
  const [search, setSearch] = useState('');
  const [sideOpen, setSideOpen] = useState<boolean>(() => window.innerWidth > 760);

  const [theme, setTheme] = useState<Theme>(() => {
    try {
      const t = localStorage.getItem('webmind-theme');
      if (t === 'light' || t === 'dark') return t;
    } catch {
      // Ignore
    }
    return window.matchMedia && window.matchMedia('(prefers-color-scheme: dark)').matches ? 'dark' : 'light';
  });

  // Voice state
  const [speakingIndex, setSpeakingIndex] = useState<number | null>(null);
  const [autoVoice, setAutoVoice] = useState<boolean>(() => {
    try {
      return localStorage.getItem('webmind-auto-voice') === 'true';
    } catch {
      return false;
    }
  });

  const [voiceAge, setVoiceAge] = useState<VoiceAgeProfile>(() => {
    try {
      const v = localStorage.getItem('webmind-voice-age');
      if (v === 'youthful' || v === 'natural' || v === 'mature') return v;
    } catch {
      // Ignore
    }
    return 'youthful';
  });

  const feedRef = useRef<HTMLElement>(null);
  const textareaRef = useRef<HTMLTextAreaElement>(null);
  const abortCtrlRef = useRef<AbortController | null>(null);

  // Keep the active chat in the chat list in sync with the live conversation
  useEffect(() => {
    if (history.length === 0) return;
    if (activeRef.current === null) {
      const id = String(Date.now());
      const first = history.find(m => m.role === 'user')?.content || 'New chat';
      activeRef.current = id;
      setActiveId(id);
      setChats(prev => [{ id, title: first.slice(0, 40), msgs: history }, ...prev]);
    } else {
      const id = activeRef.current;
      setChats(prev => prev.map(c => (c.id === id ? { ...c, msgs: history } : c)));
    }
  }, [history]);

  // Persist chats
  useEffect(() => {
    try {
      const trimmed = chats.slice(0, 30).map(c => ({ ...c, msgs: c.msgs.slice(-40) }));
      localStorage.setItem('webmind-chats', JSON.stringify(trimmed));
    } catch {
      // Ignore
    }
  }, [chats]);

  // Theme
  useEffect(() => {
    document.documentElement.dataset.theme = theme;
    try {
      localStorage.setItem('webmind-theme', theme);
    } catch {
      // Ignore
    }
  }, [theme]);

  // Sync voice preferences
  useEffect(() => {
    try {
      localStorage.setItem('webmind-auto-voice', String(autoVoice));
    } catch {
      // Ignore
    }
  }, [autoVoice]);

  useEffect(() => {
    try {
      localStorage.setItem('webmind-voice-age', voiceAge);
    } catch {
      // Ignore
    }
  }, [voiceAge]);

  const scrollDown = () => {
    if (feedRef.current) {
      feedRef.current.scrollTo({ top: feedRef.current.scrollHeight, behavior: 'smooth' });
    }
  };

  useEffect(() => {
    scrollDown();
  }, [history, busy]);

  // Real-time Text-to-Speech Engine
  const stopSpeech = () => {
    if ('speechSynthesis' in window) {
      window.speechSynthesis.cancel();
    }
    setSpeakingIndex(null);
  };

  const speakShortBrief = (promptText: string, botContent: string, index: number) => {
    if (!('speechSynthesis' in window)) return;

    window.speechSynthesis.cancel();
    const spokenText = getShortSpokenBrief(promptText, botContent);
    if (!spokenText.trim()) return;

    const utterance = new SpeechSynthesisUtterance(spokenText);

    if (voiceAge === 'youthful') {
      utterance.pitch = 1.25;
      utterance.rate = 1.05;
    } else if (voiceAge === 'mature') {
      utterance.pitch = 0.82;
      utterance.rate = 0.95;
    } else {
      utterance.pitch = 1.0;
      utterance.rate = 1.0;
    }

    const voices = window.speechSynthesis.getVoices();
    const naturalVoice =
      voices.find(
        v =>
          (v.lang.startsWith('en') || v.lang.startsWith('en-US')) &&
          (v.name.includes('Natural') ||
            v.name.includes('Google') ||
            v.name.includes('Samantha') ||
            v.name.includes('Karen') ||
            v.name.includes('Zira') ||
            v.name.includes('Alex'))
      ) || voices.find(v => v.lang.startsWith('en'));

    if (naturalVoice) {
      utterance.voice = naturalVoice;
    }

    utterance.onstart = () => setSpeakingIndex(index);
    utterance.onend = () => setSpeakingIndex(null);
    utterance.onerror = () => setSpeakingIndex(null);

    window.speechSynthesis.speak(utterance);
  };

  const handleAsk = async (text: string) => {
    const trimmed = text.trim();
    if (!trimmed || busy) return;

    stopSpeech();

    const ctrl = new AbortController();
    abortCtrlRef.current = ctrl;
    setBusy(true);

    const userMsg: ChatMessageItem = { role: 'user', content: trimmed };
    const botPlaceholder: ChatMessageItem = {
      role: 'assistant',
      content: '',
      sources: [],
      status: 'Thinking…',
      promptReference: trimmed,
    };

    const newHistory = [...history, userMsg, botPlaceholder];
    setHistory(newHistory);
    setInputVal('');

    if (textareaRef.current) {
      textareaRef.current.style.height = 'auto';
    }

    let answer = '';
    let sources: SourceItem[] = [];
    const botMsgIndex = newHistory.length - 1;

    try {
      const res = await fetch('/api/chat', {
        method: 'POST',
        signal: ctrl.signal,
        headers: { 'content-type': 'application/json' },
        body: JSON.stringify({
          messages: [...history, userMsg].map(({ role, content }) => ({ role, content })),
        }),
      });

      if (!res.ok) {
        const errJson = await res.json().catch(() => ({}));
        throw new Error(errJson.error || 'Request failed.');
      }

      if (!res.body) throw new Error('ReadableStream not supported.');

      const reader = res.body.getReader();
      const dec = new TextDecoder();
      let buf = '';

      while (true) {
        const { done, value } = await reader.read();
        if (done) break;

        buf += dec.decode(value, { stream: true });
        const parts = buf.split('\n\n');
        buf = parts.pop() || '';

        for (const part of parts) {
          const ev = /^event: (.+)$/m.exec(part)?.[1];
          const dataMatch = /^data: (.+)$/m.exec(part)?.[1];
          let data: any = {};
          try {
            data = JSON.parse(dataMatch || '{}');
          } catch {
            // Ignore parse errors
          }

          if (ev === 'status') {
            const statusText = data.text || '';
            setHistory(prev => {
              const updated = [...prev];
              const last = updated[updated.length - 1];
              if (last && last.role === 'assistant') {
                updated[updated.length - 1] = { ...last, status: statusText };
              }
              return updated;
            });
          } else if (ev === 'sources') {
            sources = safeSources(data);
            setHistory(prev => {
              const updated = [...prev];
              const last = updated[updated.length - 1];
              if (last && last.role === 'assistant') {
                updated[updated.length - 1] = { ...last, sources };
              }
              return updated;
            });
          } else if (ev === 'token') {
            answer += data.text || '';
            setHistory(prev => {
              const updated = [...prev];
              const last = updated[updated.length - 1];
              if (last && last.role === 'assistant') {
                updated[updated.length - 1] = {
                  ...last,
                  content: answer,
                  status: '',
                };
              }
              return updated;
            });
            scrollDown();
          } else if (ev === 'error') {
            throw new Error(data.text || 'Processing error');
          }
        }
      }

      if (!answer) throw new Error('No answer came back. Try again.');

      setHistory(prev => {
        const updated = [...prev];
        const last = updated[updated.length - 1];
        if (last && last.role === 'assistant') {
          updated[updated.length - 1] = {
            role: 'assistant',
            content: answer,
            sources,
            status: '',
            promptReference: trimmed,
          };
        }
        return updated;
      });

      if (autoVoice && answer) {
        speakShortBrief(trimmed, answer, botMsgIndex);
      }
    } catch (err: any) {
      if (err.name === 'AbortError' && answer) {
        setHistory(prev => {
          const updated = [...prev];
          const last = updated[updated.length - 1];
          if (last && last.role === 'assistant') {
            updated[updated.length - 1] = {
              ...last,
              content: answer,
              sources,
              status: '',
              promptReference: trimmed,
            };
          }
          return updated;
        });
      } else {
        const errMsg = err.name === 'AbortError' ? 'Stopped.' : `⚠️ ${err.message || 'Something went wrong.'}`;
        setHistory(prev => {
          const updated = [...prev];
          const last = updated[updated.length - 1];
          if (last && last.role === 'assistant') {
            updated[updated.length - 1] = {
              role: 'assistant',
              content: errMsg,
              sources: [],
              status: '',
              promptReference: trimmed,
            };
          }
          return updated;
        });
      }
    } finally {
      setBusy(false);
      abortCtrlRef.current = null;
      textareaRef.current?.focus();
    }
  };

  const handleStop = () => {
    if (abortCtrlRef.current) {
      abortCtrlRef.current.abort();
    }
    stopSpeech();
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (busy) {
      handleStop();
      return;
    }
    handleAsk(inputVal);
  };

  const handleKeyDown = (e: React.KeyboardEvent<HTMLTextAreaElement>) => {
    if (e.key === 'Enter' && !e.shiftKey && !e.nativeEvent.isComposing) {
      e.preventDefault();
      if (!busy) {
        handleAsk(inputVal);
      }
    }
  };

  const handleInputChange = (e: React.ChangeEvent<HTMLTextAreaElement>) => {
    setInputVal(e.target.value);
    if (textareaRef.current) {
      textareaRef.current.style.height = 'auto';
      textareaRef.current.style.height = `${Math.min(textareaRef.current.scrollHeight, 200)}px`;
    }
  };

  const closeSideOnMobile = () => {
    if (window.innerWidth <= 760) setSideOpen(false);
  };

  const handleNewChat = () => {
    if (busy) return;
    stopSpeech();
    activeRef.current = null;
    setActiveId(null);
    setHistory([]);
    closeSideOnMobile();
    textareaRef.current?.focus();
  };

  const openChat = (id: string) => {
    if (busy) return;
    const c = chats.find(x => x.id === id);
    if (!c) return;
    stopSpeech();
    activeRef.current = id;
    setActiveId(id);
    setHistory(c.msgs);
    closeSideOnMobile();
  };

  const deleteChat = (id: string) => {
    if (busy && id === activeRef.current) return;
    setChats(prev => prev.filter(c => c.id !== id));
    if (activeRef.current === id) {
      stopSpeech();
      activeRef.current = null;
      setActiveId(null);
      setHistory([]);
    }
  };

  const handleCopy = async (text: string, index: number) => {
    try {
      await navigator.clipboard.writeText(text);
      setCopiedIndex(index);
      setTimeout(() => setCopiedIndex(null), 1500);
    } catch {
      // Ignore
    }
  };

  const activeTitle = chats.find(c => c.id === activeId)?.title || '';
  const shownChats = chats.filter(c => c.title.toLowerCase().includes(search.trim().toLowerCase()));

  return (
    <>
      {/* Sidebar */}
      <aside className={`side ${sideOpen ? 'open' : ''}`}>
        <div className="side-top">
          <span className="logo">✦</span>
          <span className="wm">
            WebMind <b>AI</b>
          </span>
          <button type="button" className="icon" onClick={() => setSideOpen(false)} aria-label="Close sidebar">
            <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round">
              <rect x="3" y="4" width="18" height="16" rx="3" />
              <path d="M9 4v16" />
            </svg>
          </button>
        </div>

        <button type="button" className="nav-new" onClick={handleNewChat}>
          <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.2" strokeLinecap="round">
            <path d="M12 5v14M5 12h14" />
          </svg>
          New chat
        </button>

        <label className="find">
          <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round">
            <circle cx="11" cy="11" r="7" />
            <path d="m20 20-4-4" />
          </svg>
          <input value={search} onChange={e => setSearch(e.target.value)} placeholder="Search chats" aria-label="Search chats" />
        </label>

        <div className="sec">Recents</div>
        <div className="chat-list">
          {shownChats.length === 0 && <div className="empty">No chats yet</div>}
          {shownChats.map(c => (
            <div
              key={c.id}
              className={`chat ${c.id === activeId ? 'on' : ''}`}
              role="button"
              tabIndex={0}
              onClick={() => openChat(c.id)}
              onKeyDown={e => {
                if (e.key === 'Enter') openChat(c.id);
              }}
            >
              <span>{c.title}</span>
              <button
                type="button"
                className="x"
                aria-label="Delete chat"
                onClick={e => {
                  e.stopPropagation();
                  deleteChat(c.id);
                }}
              >
                ✕
              </button>
            </div>
          ))}
        </div>
      </aside>
      {sideOpen && <div className="scrim" onClick={() => setSideOpen(false)} />}

      <div className="main">
        <header>
          <div className="hl">
            <button type="button" className="icon" onClick={() => setSideOpen(o => !o)} aria-label="Toggle sidebar">
              <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round">
                <rect x="3" y="4" width="18" height="16" rx="3" />
                <path d="M9 4v16" />
              </svg>
            </button>
            <span className="ttl">{activeTitle}</span>
          </div>

          <div className="hdr-controls">
            <select
              className="voice-select"
              value={voiceAge}
              onChange={e => {
                setVoiceAge(e.target.value as VoiceAgeProfile);
                stopSpeech();
              }}
              title="Voice Age & Tone Profile"
              aria-label="Voice Age & Tone Profile"
            >
              <option value="youthful">🌟 Youthful</option>
              <option value="natural">🎙️ Natural</option>
              <option value="mature">🏛️ Mature</option>
            </select>

            <button
              type="button"
              className={`voice-pill ${autoVoice ? 'on' : ''}`}
              onClick={() => {
                setAutoVoice(!autoVoice);
                if (autoVoice) stopSpeech();
              }}
              title={autoVoice ? 'Auto-Voice is ON (reads short answer automatically)' : 'Auto-Voice is OFF (click to enable)'}
            >
              <span>{autoVoice ? '🔊 ON' : '🔈 OFF'}</span>
            </button>

            <button
              type="button"
              className="icon"
              onClick={() => setTheme(t => (t === 'dark' ? 'light' : 'dark'))}
              aria-label="Switch theme"
            >
              <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round">
                <path d="M21 12.8A9 9 0 1 1 11.2 3 7 7 0 0 0 21 12.8z" />
              </svg>
            </button>
          </div>
        </header>

        {/* Feed Container */}
        <main id="feed" ref={feedRef} aria-live="polite">
          <div className="col">
            {history.length === 0 ? (
              <div className="hero" id="hero">
                <h1>
                  <span className="spark">✦</span>
                  {greeting()}
                </h1>
                <p>Ask anything. I answer from general knowledge and search the web when you need current information.</p>
                <div className="chips">
                  {STARTER_CHIPS.map(chipText => (
                    <button key={chipText} type="button" className="chip" onClick={() => handleAsk(chipText)}>
                      {chipText}
                    </button>
                  ))}
                </div>
              </div>
            ) : (
              history.map((msg, idx) => {
                if (msg.role === 'user') {
                  return (
                    <div key={idx} className="msg user">
                      <div className="bubble">{msg.content}</div>
                    </div>
                  );
                }

                const sources = msg.sources || [];
                const isLatest = idx === history.length - 1;
                const showStatus = isLatest && !!msg.status;
                const isSpeakingThis = speakingIndex === idx;

                let promptText = msg.promptReference || '';
                if (!promptText && idx > 0 && history[idx - 1].role === 'user') {
                  promptText = history[idx - 1].content;
                }

                return (
                  <div key={idx} className="msg bot">
                    <div className="avatar">✦</div>
                    <div className="card">
                      {showStatus && (
                        <div className="status">
                          <i className="spin" />
                          <span>{msg.status}</span>
                        </div>
                      )}

                      {msg.content && (
                        <div
                          className="body"
                          dangerouslySetInnerHTML={{ __html: renderMarkdown(msg.content, sources) }}
                        />
                      )}

                      {sources.length > 0 && (
                        <div className="srcs">
                          <div className="label">Sources</div>
                          {sources.map(s => (
                            <a key={s.id} className="src" href={s.url} target="_blank" rel="noopener noreferrer">
                              <div className="ico">{(s.domain || '?')[0].toUpperCase()}</div>
                              <div className="t">
                                <strong>{s.title || s.domain}</strong>
                                <small>{s.domain}</small>
                              </div>
                            </a>
                          ))}
                        </div>
                      )}

                      {msg.content && !showStatus && (
                        <div className="card-actions">
                          <button
                            type="button"
                            className={`voice-btn ${isSpeakingThis ? 'active' : ''}`}
                            onClick={() => {
                              if (isSpeakingThis) {
                                stopSpeech();
                              } else {
                                speakShortBrief(promptText, msg.content, idx);
                              }
                            }}
                            title="Read prompt and short answer aloud in real time"
                          >
                            {isSpeakingThis ? (
                              <>
                                <span className="wave-dot" />
                                <span>Stop Voice</span>
                              </>
                            ) : (
                              <>
                                <span>🔊</span>
                                <span>Read Brief</span>
                              </>
                            )}
                          </button>

                          <button type="button" className="copy" onClick={() => handleCopy(msg.content, idx)}>
                            {copiedIndex === idx ? 'Copied' : 'Copy'}
                          </button>
                        </div>
                      )}
                    </div>
                  </div>
                );
              })
            )}
          </div>
        </main>

        {/* Message Input Form */}
        <form id="form" onSubmit={handleSubmit}>
          <div className="box">
            <textarea
              ref={textareaRef}
              id="input"
              rows={1}
              value={inputVal}
              onChange={handleInputChange}
              onKeyDown={handleKeyDown}
              placeholder="Ask anything…"
              aria-label="Message"
            />
            <div className="row">
              <span className="hint">Enter to send · Shift+Enter for a new line</span>
              <button id="send" type="submit" disabled={!busy && !inputVal.trim()} aria-label={busy ? 'Stop' : 'Send'}>
                {busy ? '■' : '↑'}
              </button>
            </div>
          </div>
        </form>

        <p className="note">WebMind AI can make mistakes. Check the sources for anything important.</p>
      </div>
    </>
  );
}
