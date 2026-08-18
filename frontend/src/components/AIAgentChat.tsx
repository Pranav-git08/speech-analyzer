import React, { useState, useRef, useEffect, useCallback } from 'react';
import api from '../api/client';

// ─── Types ─────────────────────────────────────────────────────────────────────

interface ChatMessage {
  role: 'user' | 'assistant';
  content: string;
}

interface AIAgentChatProps {
  candidateId?: string;
}

// ─── Quick-start prompt chips ──────────────────────────────────────────────────

const GLOBAL_PROMPTS = [
  'List all candidates with their grades',
  'Who are the top performers?',
  'Which candidates are pending HR review?',
  'Give a summary of all interview results',
  'How many candidates passed?',
];

const CANDIDATE_PROMPTS = [
  'Summarize this candidate\'s performance',
  'Should I hire this candidate?',
  'What are their strengths and weaknesses?',
  'Explain their interview scores',
  'What was their confidence level?',
];

// ─── Simple markdown renderer ──────────────────────────────────────────────────

function renderMarkdown(text: string): React.ReactNode[] {
  const lines = text.split('\n');
  const nodes: React.ReactNode[] = [];
  let keyIdx = 0;

  for (let i = 0; i < lines.length; i++) {
    const line = lines[i];

    // Bold + inline formatting
    const formatInline = (str: string): React.ReactNode => {
      const parts = str.split(/(\*\*[^*]+\*\*)/g);
      return parts.map((p, j) => {
        if (p.startsWith('**') && p.endsWith('**')) {
          return <strong key={j}>{p.slice(2, -2)}</strong>;
        }
        return p;
      });
    };

    if (line.trim() === '') {
      nodes.push(<br key={keyIdx++} />);
    } else if (line.startsWith('### ')) {
      nodes.push(<h4 key={keyIdx++} style={mdStyles.h4}>{formatInline(line.slice(4))}</h4>);
    } else if (line.startsWith('## ')) {
      nodes.push(<h3 key={keyIdx++} style={mdStyles.h3}>{formatInline(line.slice(3))}</h3>);
    } else if (line.startsWith('# ')) {
      nodes.push(<h2 key={keyIdx++} style={mdStyles.h2}>{formatInline(line.slice(2))}</h2>);
    } else if (line.startsWith('- ') || line.startsWith('• ')) {
      nodes.push(
        <div key={keyIdx++} style={mdStyles.bullet}>
          <span style={mdStyles.bulletDot}>•</span>
          <span>{formatInline(line.slice(2))}</span>
        </div>
      );
    } else if (/^\d+\.\s/.test(line)) {
      const match = line.match(/^(\d+)\.\s(.*)/);
      if (match) {
        nodes.push(
          <div key={keyIdx++} style={mdStyles.bullet}>
            <span style={mdStyles.bulletNum}>{match[1]}.</span>
            <span>{formatInline(match[2])}</span>
          </div>
        );
      }
    } else {
      nodes.push(<p key={keyIdx++} style={mdStyles.para}>{formatInline(line)}</p>);
    }
  }

  return nodes;
}

const mdStyles = {
  h2: { fontSize: '1rem', fontWeight: 700, margin: '0.5rem 0 0.2rem', color: '#1a202c' },
  h3: { fontSize: '0.95rem', fontWeight: 700, margin: '0.4rem 0 0.2rem', color: '#2d3748' },
  h4: { fontSize: '0.9rem', fontWeight: 600, margin: '0.3rem 0 0.1rem', color: '#4a5568' },
  para: { margin: '0.1rem 0', lineHeight: 1.5 },
  bullet: { display: 'flex', gap: '0.4rem', margin: '0.15rem 0', lineHeight: 1.5 },
  bulletDot: { color: '#6366f1', fontWeight: 700, flexShrink: 0 },
  bulletNum: { color: '#6366f1', fontWeight: 700, flexShrink: 0, minWidth: '1.4rem' },
};

// ─── Typing Indicator ──────────────────────────────────────────────────────────

const TypingIndicator: React.FC = () => (
  <div style={chatStyles.typingRow}>
    <div style={chatStyles.aiBubble}>
      <div style={chatStyles.typingDots}>
        <span style={{ ...chatStyles.dot, animationDelay: '0ms' }} />
        <span style={{ ...chatStyles.dot, animationDelay: '180ms' }} />
        <span style={{ ...chatStyles.dot, animationDelay: '360ms' }} />
      </div>
    </div>
  </div>
);

// ─── Component ─────────────────────────────────────────────────────────────────

const AIAgentChat: React.FC<AIAgentChatProps> = ({ candidateId }) => {
  const [open, setOpen] = useState(false);
  const [messages, setMessages] = useState<ChatMessage[]>([]);
  const [input, setInput] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const messagesEndRef = useRef<HTMLDivElement>(null);
  const inputRef = useRef<HTMLTextAreaElement>(null);

  const prompts = candidateId ? CANDIDATE_PROMPTS : GLOBAL_PROMPTS;

  // Auto-scroll to latest message
  useEffect(() => {
    if (open) {
      messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
    }
  }, [messages, loading, open]);

  // Focus input when opened
  useEffect(() => {
    if (open) setTimeout(() => inputRef.current?.focus(), 100);
  }, [open]);

  const sendMessage = useCallback(async (text: string) => {
    const trimmed = text.trim();
    if (!trimmed || loading) return;

    const userMsg: ChatMessage = { role: 'user', content: trimmed };
    const newMessages = [...messages, userMsg];
    setMessages(newMessages);
    setInput('');
    setLoading(true);
    setError('');

    try {
      const res = await api.post<{ reply: string }>(
        '/admin/agent/chat',
        {
          messages: newMessages,
          candidateId: candidateId ?? undefined,
        },
        { timeout: 60000 }
      );
      const assistantMsg: ChatMessage = { role: 'assistant', content: res.data.reply };
      setMessages((prev) => [...prev, assistantMsg]);
    } catch (err: unknown) {
      const msg =
        (err as { response?: { data?: { error?: string } } })?.response?.data?.error ??
        'Failed to reach the AI agent. Please make sure the backend is running.';
      setError(msg);
    } finally {
      setLoading(false);
    }
  }, [messages, loading, candidateId]);

  const handleKeyDown = (e: React.KeyboardEvent<HTMLTextAreaElement>) => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault();
      sendMessage(input);
    }
  };

  const clearChat = () => {
    setMessages([]);
    setError('');
  };

  return (
    <>
      {/* Keyframe animations injected once */}
      <style>{`
        @keyframes ai-fade-in {
          from { opacity: 0; transform: translateY(12px) scale(0.97); }
          to   { opacity: 1; transform: translateY(0) scale(1); }
        }
        @keyframes ai-dot-bounce {
          0%, 80%, 100% { transform: translateY(0); opacity: 0.4; }
          40%            { transform: translateY(-5px); opacity: 1; }
        }
        @keyframes ai-pulse-ring {
          0%   { transform: scale(1); opacity: 0.6; }
          70%  { transform: scale(1.35); opacity: 0; }
          100% { transform: scale(1.35); opacity: 0; }
        }
        @keyframes ai-gradient-shift {
          0%   { background-position: 0% 50%; }
          50%  { background-position: 100% 50%; }
          100% { background-position: 0% 50%; }
        }
      `}</style>

      {/* ── Chat Panel ─────────────────────────────────────────────────────── */}
      {open && (
        <div style={chatStyles.panel} role="dialog" aria-label="AI Interview Agent">
          {/* Header */}
          <div style={chatStyles.header}>
            <div style={chatStyles.headerLeft}>
              <div style={chatStyles.avatarSmall}>🤖</div>
              <div>
                <div style={chatStyles.headerTitle}>AI Interview Agent</div>
                <div style={chatStyles.headerSub}>
                  {candidateId ? 'Candidate-focused mode' : 'All candidates'}
                </div>
              </div>
            </div>
            <div style={chatStyles.headerActions}>
              <button
                style={chatStyles.iconBtn}
                onClick={clearChat}
                title="Clear conversation"
                aria-label="Clear conversation"
              >
                🗑
              </button>
              <button
                style={chatStyles.iconBtn}
                onClick={() => setOpen(false)}
                title="Close"
                aria-label="Close AI agent"
              >
                ✕
              </button>
            </div>
          </div>

          {/* Messages */}
          <div style={chatStyles.messages} role="log" aria-live="polite">
            {messages.length === 0 && (
              <div style={chatStyles.welcome}>
                <div style={chatStyles.welcomeIcon}>✨</div>
                <p style={chatStyles.welcomeTitle}>
                  {candidateId
                    ? 'Ask me anything about this candidate'
                    : 'Ask me anything about your candidates'}
                </p>
                <p style={chatStyles.welcomeSub}>I have live access to all interview data, grades, and evaluations.</p>
                <div style={chatStyles.chipGrid}>
                  {prompts.map((p) => (
                    <button
                      key={p}
                      style={chatStyles.chip}
                      onClick={() => sendMessage(p)}
                    >
                      {p}
                    </button>
                  ))}
                </div>
              </div>
            )}

            {messages.map((msg, i) => (
              <div
                key={i}
                style={msg.role === 'user' ? chatStyles.userRow : chatStyles.aiRow}
              >
                {msg.role === 'assistant' && (
                  <div style={chatStyles.aiAvatar}>🤖</div>
                )}
                <div style={msg.role === 'user' ? chatStyles.userBubble : chatStyles.aiBubble}>
                  {msg.role === 'assistant'
                    ? renderMarkdown(msg.content)
                    : msg.content}
                </div>
              </div>
            ))}

            {loading && <TypingIndicator />}

            {error && (
              <div style={chatStyles.errorBubble}>
                ⚠️ {error}
              </div>
            )}

            <div ref={messagesEndRef} />
          </div>

          {/* Quick chips after first message */}
          {messages.length > 0 && !loading && (
            <div style={chatStyles.chipsRow}>
              {prompts.slice(0, 3).map((p) => (
                <button key={p} style={chatStyles.chipSmall} onClick={() => sendMessage(p)}>
                  {p}
                </button>
              ))}
            </div>
          )}

          {/* Input */}
          <div style={chatStyles.inputArea}>
            <textarea
              ref={inputRef}
              id="ai-agent-input"
              style={chatStyles.textarea}
              value={input}
              onChange={(e) => setInput(e.target.value)}
              onKeyDown={handleKeyDown}
              placeholder="Ask a question… (Enter to send, Shift+Enter for new line)"
              rows={2}
              disabled={loading}
              aria-label="Chat input"
            />
            <button
              style={{
                ...chatStyles.sendBtn,
                ...(loading || !input.trim() ? chatStyles.sendBtnDisabled : {}),
              }}
              onClick={() => sendMessage(input)}
              disabled={loading || !input.trim()}
              aria-label="Send message"
            >
              {loading ? '⏳' : '➤'}
            </button>
          </div>
        </div>
      )}

      {/* ── Floating Trigger Button ─────────────────────────────────────────── */}
      <button
        id="ai-agent-trigger"
        style={chatStyles.fab}
        onClick={() => setOpen((prev) => !prev)}
        aria-label={open ? 'Close AI Agent' : 'Open AI Agent'}
        title="AI Interview Agent"
      >
        {/* Pulse ring */}
        {!open && messages.length === 0 && (
          <span style={chatStyles.pulseRing} aria-hidden="true" />
        )}
        <span style={chatStyles.fabIcon}>{open ? '✕' : '🤖'}</span>
        {!open && <span style={chatStyles.fabLabel}>AI Agent</span>}
      </button>
    </>
  );
};

// ─── Styles ────────────────────────────────────────────────────────────────────

const chatStyles: Record<string, React.CSSProperties> = {
  // Floating action button
  fab: {
    position: 'fixed',
    bottom: '1.5rem',
    right: '1.5rem',
    zIndex: 9999,
    display: 'flex',
    alignItems: 'center',
    gap: '0.5rem',
    padding: '0.75rem 1.25rem',
    background: 'linear-gradient(135deg, #6366f1 0%, #8b5cf6 50%, #a855f7 100%)',
    backgroundSize: '200% 200%',
    animation: 'ai-gradient-shift 4s ease infinite',
    border: 'none',
    borderRadius: '50px',
    cursor: 'pointer',
    color: '#fff',
    fontWeight: 700,
    fontSize: '0.95rem',
    boxShadow: '0 8px 32px rgba(99,102,241,0.45)',
    transition: 'transform 0.18s ease, box-shadow 0.18s ease',
  },
  fabIcon: { fontSize: '1.25rem', lineHeight: 1 },
  fabLabel: { letterSpacing: '0.02em' },
  pulseRing: {
    position: 'absolute',
    top: 0, left: 0, right: 0, bottom: 0,
    borderRadius: '50px',
    border: '2px solid rgba(139,92,246,0.7)',
    animation: 'ai-pulse-ring 2s cubic-bezier(0.455, 0.03, 0.515, 0.955) infinite',
    pointerEvents: 'none',
  },

  // Chat panel
  panel: {
    position: 'fixed',
    bottom: '5.5rem',
    right: '1.5rem',
    zIndex: 9998,
    width: '420px',
    maxWidth: 'calc(100vw - 2rem)',
    maxHeight: '600px',
    display: 'flex',
    flexDirection: 'column',
    background: '#fff',
    borderRadius: '20px',
    boxShadow: '0 24px 64px rgba(0,0,0,0.18), 0 4px 16px rgba(99,102,241,0.12)',
    border: '1px solid rgba(99,102,241,0.15)',
    overflow: 'hidden',
    animation: 'ai-fade-in 0.22s ease',
  },

  // Header
  header: {
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'space-between',
    padding: '0.85rem 1rem',
    background: 'linear-gradient(135deg, #6366f1 0%, #8b5cf6 100%)',
    color: '#fff',
    flexShrink: 0,
  },
  headerLeft: { display: 'flex', alignItems: 'center', gap: '0.65rem' },
  avatarSmall: {
    width: '2rem', height: '2rem', borderRadius: '50%',
    background: 'rgba(255,255,255,0.2)',
    display: 'flex', alignItems: 'center', justifyContent: 'center',
    fontSize: '1rem',
  },
  headerTitle: { fontWeight: 700, fontSize: '0.95rem', letterSpacing: '0.01em' },
  headerSub: { fontSize: '0.73rem', opacity: 0.8, marginTop: '0.05rem' },
  headerActions: { display: 'flex', gap: '0.35rem' },
  iconBtn: {
    background: 'rgba(255,255,255,0.15)',
    border: 'none',
    borderRadius: '8px',
    color: '#fff',
    cursor: 'pointer',
    padding: '0.3rem 0.5rem',
    fontSize: '0.85rem',
    transition: 'background 0.15s',
  },

  // Messages
  messages: {
    flex: 1,
    overflowY: 'auto',
    padding: '1rem',
    display: 'flex',
    flexDirection: 'column',
    gap: '0.6rem',
    background: '#f8f7ff',
    minHeight: 0,
  },

  // Welcome state
  welcome: {
    display: 'flex',
    flexDirection: 'column',
    alignItems: 'center',
    textAlign: 'center',
    padding: '1rem 0.5rem',
    gap: '0.5rem',
  },
  welcomeIcon: { fontSize: '2.5rem' },
  welcomeTitle: { fontWeight: 700, color: '#3730a3', fontSize: '0.95rem', margin: 0 },
  welcomeSub: { color: '#6b7280', fontSize: '0.82rem', margin: 0, lineHeight: 1.4 },
  chipGrid: {
    display: 'flex', flexWrap: 'wrap' as const, gap: '0.4rem',
    justifyContent: 'center', marginTop: '0.5rem',
  },

  // Message rows
  userRow: { display: 'flex', justifyContent: 'flex-end' },
  aiRow: { display: 'flex', alignItems: 'flex-start', gap: '0.5rem' },
  typingRow: { display: 'flex', alignItems: 'flex-start', gap: '0.5rem' },
  aiAvatar: {
    width: '1.75rem', height: '1.75rem', borderRadius: '50%',
    background: 'linear-gradient(135deg, #6366f1, #8b5cf6)',
    display: 'flex', alignItems: 'center', justifyContent: 'center',
    fontSize: '0.9rem', flexShrink: 0, marginTop: '2px',
    boxShadow: '0 2px 8px rgba(99,102,241,0.3)',
  },

  // Bubbles
  userBubble: {
    maxWidth: '78%',
    background: 'linear-gradient(135deg, #6366f1, #8b5cf6)',
    color: '#fff',
    borderRadius: '16px 16px 4px 16px',
    padding: '0.6rem 0.9rem',
    fontSize: '0.88rem',
    lineHeight: 1.5,
    boxShadow: '0 2px 10px rgba(99,102,241,0.25)',
    wordBreak: 'break-word' as const,
  },
  aiBubble: {
    maxWidth: '85%',
    background: '#fff',
    color: '#1a202c',
    borderRadius: '4px 16px 16px 16px',
    padding: '0.65rem 0.9rem',
    fontSize: '0.87rem',
    lineHeight: 1.55,
    boxShadow: '0 2px 8px rgba(0,0,0,0.07)',
    border: '1px solid rgba(99,102,241,0.1)',
    wordBreak: 'break-word' as const,
  },

  // Typing dots
  typingDots: { display: 'flex', gap: '4px', alignItems: 'center', padding: '0.1rem 0' },
  dot: {
    width: '7px', height: '7px', borderRadius: '50%',
    background: '#8b5cf6',
    display: 'inline-block',
    animation: 'ai-dot-bounce 1.2s infinite ease-in-out',
  },

  // Error
  errorBubble: {
    background: '#fff5f5',
    border: '1px solid #fca5a5',
    borderRadius: '10px',
    padding: '0.6rem 0.9rem',
    color: '#b91c1c',
    fontSize: '0.84rem',
    lineHeight: 1.4,
  },

  // Quick chips
  chipsRow: {
    display: 'flex',
    flexWrap: 'wrap' as const,
    gap: '0.35rem',
    padding: '0.5rem 0.75rem',
    borderTop: '1px solid #ede9fe',
    background: '#faf9ff',
    flexShrink: 0,
  },
  chip: {
    background: '#ede9fe',
    border: '1px solid #c4b5fd',
    borderRadius: '20px',
    color: '#5b21b6',
    cursor: 'pointer',
    fontSize: '0.77rem',
    fontWeight: 500,
    padding: '0.3rem 0.7rem',
    whiteSpace: 'nowrap' as const,
    transition: 'background 0.15s, transform 0.12s',
  },
  chipSmall: {
    background: '#ede9fe',
    border: '1px solid #c4b5fd',
    borderRadius: '20px',
    color: '#5b21b6',
    cursor: 'pointer',
    fontSize: '0.73rem',
    fontWeight: 500,
    padding: '0.22rem 0.6rem',
    whiteSpace: 'nowrap' as const,
    transition: 'background 0.15s',
  },

  // Input area
  inputArea: {
    display: 'flex',
    alignItems: 'flex-end',
    gap: '0.5rem',
    padding: '0.7rem 0.8rem',
    borderTop: '1px solid #ede9fe',
    background: '#fff',
    flexShrink: 0,
  },
  textarea: {
    flex: 1,
    border: '1.5px solid #c4b5fd',
    borderRadius: '12px',
    padding: '0.55rem 0.75rem',
    fontSize: '0.87rem',
    resize: 'none' as const,
    outline: 'none',
    fontFamily: 'inherit',
    lineHeight: 1.5,
    color: '#1a202c',
    background: '#faf9ff',
    transition: 'border-color 0.15s',
  },
  sendBtn: {
    background: 'linear-gradient(135deg, #6366f1, #8b5cf6)',
    border: 'none',
    borderRadius: '10px',
    color: '#fff',
    cursor: 'pointer',
    fontSize: '1.1rem',
    padding: '0.55rem 0.7rem',
    lineHeight: 1,
    transition: 'opacity 0.15s, transform 0.12s',
    flexShrink: 0,
  },
  sendBtnDisabled: { opacity: 0.45, cursor: 'not-allowed' },
};

export default AIAgentChat;
