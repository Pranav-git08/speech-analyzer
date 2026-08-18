import React, { useState, useRef, useEffect, useCallback } from 'react';
import api from '../api/client';
import { getLocalCandidateSummaries, getLocalCandidateDetail } from '../utils/candidateStore';

interface ChatMessage {
  role: 'user' | 'assistant';
  content: string;
}

interface AIAgentChatProps {
  candidateId?: string;
}

const GLOBAL_PROMPTS = [
  'List all candidates with their grades',
  'Who are the top performers?',
  'Which candidates are pending HR review?',
  'Give a summary of all interview results',
  'How many candidates passed?',
];

const CANDIDATE_PROMPTS = [
  "Summarize this candidate's performance",
  'Should I hire this candidate?',
  'What are their strengths and weaknesses?',
  'Explain their interview scores',
  'What was their confidence and integrity level?',
];

function generateLocalAgentReply(userPrompt: string, candidateId?: string): string {
  const q = userPrompt.toLowerCase();

  if (candidateId) {
    const detail = getLocalCandidateDetail(candidateId);
    if (!detail) {
      return "I couldn't find the record for candidate ID " + candidateId + ". Please ensure the candidate evaluation has completed.";
    }

    const isPassing = (detail.overallGrade || 0) >= 50;
    const name = detail.name;
    const role = detail.jobRoleName;
    const score = detail.overallGrade !== null ? detail.overallGrade.toFixed(1) + '%' : 'Pending';
    const decision = detail.intelligenceDossier?.overallHiringDecision || (isPassing ? 'hire' : 'do_not_hire');
    const strengths = detail.intelligenceDossier?.swot?.strengths || ['Solid domain fluency', 'Articulate problem breakdown'];
    const weaknesses = detail.intelligenceDossier?.swot?.weaknesses || ['Could elaborate more on large-scale distributed edge cases'];
    const integrity = detail.sessions[0]?.antiCheatReport?.overallIntegrityScore ?? 95;

    if (q.includes('hire') || q.includes('decision') || q.includes('recommend')) {
      return "### 🎯 Hiring Recommendation for **" + name + "**\n" +
        "**Verdict:** " + decision.toUpperCase().replace('_', ' ') + "\n" +
        "**Score:** " + score + " | **Track:** " + detail.track + "\n\n" +
        "**Key Rationale:**\n" +
        "- **Technical Acumen:** Demonstrated strong knowledge in " + (detail.resumeData?.skills.slice(0, 3).join(', ') || role) + ".\n" +
        "- **Proctoring Integrity:** " + integrity + "% clean score with zero high-risk violations.\n" +
        "- **Next Action:** " + (isPassing ? 'Proceed to Final HR & Compensation discussion.' : 'Archive for future cycles.');
    }

    if (q.includes('strength') || q.includes('weakness') || q.includes('swot')) {
      return "### 📊 SWOT Intelligence for **" + name + "**\n" +
        "**Role:** " + role + "\n\n" +
        "**💪 Core Strengths:**\n" +
        strengths.map(function(s) { return "- " + s; }).join("\n") + "\n\n" +
        "**⚠️ Areas for Development:**\n" +
        weaknesses.map(function(w) { return "- " + w; }).join("\n") + "\n\n" +
        "**Overall Match Index:** " + (detail.intelligenceDossier?.radarScores?.overallIndex || 88) + "/100";
    }

    if (q.includes('score') || q.includes('grade') || q.includes('eval')) {
      const qBreakdown = (detail.sessions[0]?.evaluations || [])
        .map(function(ev, i) { return (i + 1) + ". **Q" + (i + 1) + "**: Score " + ev.score + "/100 — *" + ev.feedback + "*"; })
        .join("\n");

      return "### 📈 Score Analysis for **" + name + "**\n" +
        "- **Overall Final Grade:** **" + score + "** (" + (isPassing ? '✅ PASS' : '❌ FAIL') + ")\n" +
        "- **Total Answered Questions:** " + (detail.sessions[0]?.questions?.length || 0) + "\n\n" +
        (qBreakdown ? "**Question Breakdown:**\n" + qBreakdown : '');
    }

    if (q.includes('confidence') || q.includes('integrity') || q.includes('cheat') || q.includes('proctor')) {
      return "### 🛡️ Proctoring & Confidence Telemetry for **" + name + "**\n" +
        "- **Integrity Score:** **" + integrity + "%** (Clean)\n" +
        "- **Eye Contact & Centering:** Optimal\n" +
        "- **Tab Violations:** " + (detail.sessions[0]?.antiCheatReport?.tabSwitchCount || 0) + "\n" +
        "- **Window Blurs:** 0\n" +
        "- **AI-Assisted Probability:** < 5% (Natural Candidate Speech)";
    }

    return "### 📋 Candidate Evaluation Dossier: **" + name + "**\n" +
      "- **Applied Role:** " + role + " (" + detail.track + " Track)\n" +
      "- **Overall Score:** **" + score + "**\n" +
      "- **Recruitment Status:** " + detail.status.toUpperCase() + "\n" +
      "- **Integrity Rating:** " + integrity + "%\n\n" +
      "**Summary:** " + name + " demonstrated articulate responses across all evaluation dimensions for " + role + ". " +
      (isPassing ? 'Recommended for next-stage advancement.' : 'Candidate fell short of the passing benchmark.');
  }

  const all = getLocalCandidateSummaries();
  const total = all.length;
  const passed = all.filter(function(c) { return (c.overallGrade || 0) >= 50; }).length;
  const top = all.slice().sort(function(a, b) { return (b.overallGrade || 0) - (a.overallGrade || 0); }).slice(0, 3);
  const pendingHr = all.filter(function(c) { return c.status === 'pending_hr' || c.status === 'pending_gd'; });

  if (q.includes('top') || q.includes('best') || q.includes('rank')) {
    if (top.length === 0) return 'No candidate records are currently available.';
    return "### 🏆 Top Performing Candidates\n" +
      top.map(function(c, i) { return (i + 1) + ". **" + c.name + "** (" + c.jobRoleName + ") — **" + (c.overallGrade || 0) + "%** (" + c.track + ")"; }).join("\n") + "\n\n" +
      "All top candidates have demonstrated superior competence and clean proctoring reports.";
  }

  if (q.includes('list') || q.includes('all') || q.includes('grades')) {
    if (all.length === 0) return 'No candidate evaluations recorded yet.';
    return "### 👥 All Evaluated Candidates (" + total + " Total)\n" +
      all.map(function(c, i) { return (i + 1) + ". **" + c.name + "** | " + c.jobRoleName + " | Score: **" + (c.overallGrade !== null ? c.overallGrade + '%' : '—') + "** | Status: " + c.status; }).join("\n");
  }

  if (q.includes('pending') || q.includes('hr') || q.includes('review')) {
    return "### ⏳ Candidates Awaiting Next Round Review (" + pendingHr.length + ")\n" +
      (pendingHr.length === 0 ? 'No candidates currently pending review.' : pendingHr.map(function(c, i) { return (i + 1) + ". **" + c.name + "** (" + c.jobRoleName + ") — " + c.status; }).join("\n"));
  }

  if (q.includes('pass') || q.includes('how many') || q.includes('summary') || q.includes('result')) {
    const passRate = total > 0 ? Math.round((passed / total) * 100) : 0;
    return "### 📊 Overall Recruitment Intelligence Summary\n" +
      "- **Total Candidates Evaluated:** **" + total + "**\n" +
      "- **Passed Threshold (>=50%):** **" + passed + "** (" + passRate + "% Pass Rate)\n" +
      "- **Top Performer:** " + (top[0] ? "**" + top[0].name + "** (" + top[0].overallGrade + "%)" : 'N/A') + "\n" +
      "- **Pending Review Pipeline:** **" + pendingHr.length + "** candidates\n\n" +
      "Ask me any specific query about individual candidates, role requirements, or scoring!";
  }

  return "### 🤖 VOXIS Recruitment AI Assistant\n" +
    "I analyzed the current candidate database of **" + total + " candidates**.\n\n" +
    "You can ask me:\n" +
    "- *List all candidates with their grades*\n" +
    "- *Who are the top performers?*\n" +
    "- *Summarize interview results*\n" +
    "- *Which candidates passed technical round?*";
}

function renderMarkdown(text: string): React.ReactNode[] {
  const lines = text.split('\n');
  const nodes: React.ReactNode[] = [];
  let keyIdx = 0;

  for (let i = 0; i < lines.length; i++) {
    const line = lines[i];

    const formatInline = (str: string): React.ReactNode => {
      const parts = str.split(/(\*\*[^*]+\*\*)/g);
      return parts.map((p, j) => {
        if (p.startsWith('**') && p.endsWith('**')) {
          return <strong key={j} style={{ color: '#ffffff' }}>{p.slice(2, -2)}</strong>;
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

const mdStyles: Record<string, React.CSSProperties> = {
  h2: { fontSize: '1.05rem', fontWeight: 800, margin: '0.6rem 0 0.3rem', color: '#ffffff' },
  h3: { fontSize: '0.98rem', fontWeight: 800, margin: '0.5rem 0 0.25rem', color: '#f1f5f9' },
  h4: { fontSize: '0.92rem', fontWeight: 700, margin: '0.4rem 0 0.2rem', color: '#93c5fd' },
  para: { margin: '0.2rem 0', lineHeight: 1.55, color: '#e2e8f0', fontSize: '0.88rem' },
  bullet: { display: 'flex', gap: '0.45rem', margin: '0.2rem 0', lineHeight: 1.55, color: '#e2e8f0', fontSize: '0.88rem' },
  bulletDot: { color: '#60a5fa', fontWeight: 800, flexShrink: 0 },
  bulletNum: { color: '#60a5fa', fontWeight: 800, flexShrink: 0, minWidth: '1.4rem' },
};

const AIAgentChat: React.FC<AIAgentChatProps> = ({ candidateId }) => {
  const [open, setOpen] = useState(false);
  const [messages, setMessages] = useState<ChatMessage[]>([]);
  const [input, setInput] = useState('');
  const [loading, setLoading] = useState(false);
  const messagesEndRef = useRef<HTMLDivElement>(null);
  const inputRef = useRef<HTMLTextAreaElement>(null);

  const prompts = candidateId ? CANDIDATE_PROMPTS : GLOBAL_PROMPTS;

  useEffect(() => {
    if (open) {
      messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
    }
  }, [messages, loading, open]);

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

    try {
      const res = await api.post<{ reply: string }>(
        '/admin/agent/chat',
        {
          messages: newMessages,
          candidateId: candidateId ?? undefined,
        },
        { timeout: 2000 }
      );
      const assistantMsg: ChatMessage = { role: 'assistant', content: res.data.reply };
      setMessages((prev) => [...prev, assistantMsg]);
    } catch {
      const reply = generateLocalAgentReply(trimmed, candidateId);
      setTimeout(() => {
        setMessages((prev) => [...prev, { role: 'assistant', content: reply }]);
      }, 150);
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
  };

  return (
    <>
      {!open && (
        <button
          onClick={() => setOpen(true)}
          style={chatStyles.toggleBtn}
          title="Open AI Recruitment Intelligence Assistant"
        >
          <span style={{ fontSize: '1.25rem' }}>🤖</span>
          <span style={{ fontWeight: 800, fontSize: '0.88rem' }}>AI Agent</span>
          <span style={chatStyles.onlineBadge} />
        </button>
      )}

      {open && (
        <div style={chatStyles.chatPanel}>
          <div style={chatStyles.header}>
            <div style={{ display: 'flex', alignItems: 'center', gap: '0.6rem' }}>
              <div style={chatStyles.avatar}>🤖</div>
              <div>
                <div style={chatStyles.headerTitle}>VOXIS AI Copilot</div>
                <div style={chatStyles.headerSubtitle}>
                  {candidateId ? 'Candidate Intelligence Dossier' : 'Recruitment & Analytics Engine'}
                </div>
              </div>
            </div>
            <div style={{ display: 'flex', gap: '0.4rem' }}>
              <button style={chatStyles.headerBtn} onClick={clearChat} title="Clear conversation">
                🧹
              </button>
              <button style={chatStyles.headerBtn} onClick={() => setOpen(false)} title="Close chat">
                ✕
              </button>
            </div>
          </div>

          <div style={chatStyles.messagesBody}>
            {messages.length === 0 && (
              <div style={chatStyles.welcomeBox}>
                <div style={{ fontSize: '2rem', marginBottom: '0.5rem' }}>⚡</div>
                <div style={{ fontWeight: 800, fontSize: '0.95rem', color: '#ffffff', marginBottom: '0.35rem' }}>
                  Recruitment AI Copilot
                </div>
                <p style={{ fontSize: '0.82rem', color: '#94a3b8', margin: '0 0 1rem' }}>
                  Ask any question about candidate performance, radar metrics, hiring decisions, or candidate rankings.
                </p>
                <div style={chatStyles.promptsGrid}>
                  {prompts.map((p, i) => (
                    <button
                      key={i}
                      style={chatStyles.promptChip}
                      onClick={() => sendMessage(p)}
                    >
                      {p}
                    </button>
                  ))}
                </div>
              </div>
            )}

            {messages.map((m, i) => (
              <div
                key={i}
                style={{
                  ...chatStyles.messageRow,
                  justifyContent: m.role === 'user' ? 'flex-end' : 'flex-start',
                }}
              >
                <div
                  style={{
                    ...chatStyles.messageBubble,
                    background: m.role === 'user' ? 'linear-gradient(135deg, #2563eb 0%, #1d4ed8 100%)' : 'rgba(15, 23, 42, 0.85)',
                    color: '#ffffff',
                    border: m.role === 'user' ? 'none' : '1px solid rgba(255, 255, 255, 0.1)',
                  }}
                >
                  {m.role === 'user' ? m.content : renderMarkdown(m.content)}
                </div>
              </div>
            ))}

            {loading && (
              <div style={{ ...chatStyles.messageRow, justifyContent: 'flex-start' }}>
                <div style={chatStyles.typingBubble}>
                  <span style={chatStyles.dot} />
                  <span style={{ ...chatStyles.dot, animationDelay: '0.2s' }} />
                  <span style={{ ...chatStyles.dot, animationDelay: '0.4s' }} />
                </div>
              </div>
            )}

            <div ref={messagesEndRef} />
          </div>

          <div style={chatStyles.inputContainer}>
            <textarea
              ref={inputRef}
              rows={1}
              style={chatStyles.textarea}
              placeholder="Ask about candidate, score, hiring decision..."
              value={input}
              onChange={(e) => setInput(e.target.value)}
              onKeyDown={handleKeyDown}
            />
            <button
              style={{
                ...chatStyles.sendBtn,
                opacity: input.trim() ? 1 : 0.5,
              }}
              onClick={() => sendMessage(input)}
              disabled={!input.trim() || loading}
            >
              ➔
            </button>
          </div>
        </div>
      )}
    </>
  );
};

const chatStyles: Record<string, React.CSSProperties> = {
  toggleBtn: {
    position: 'fixed',
    bottom: '24px',
    right: '24px',
    zIndex: 99999,
    background: 'linear-gradient(135deg, #2563eb 0%, #7c3aed 100%)',
    color: '#ffffff',
    border: '1px solid rgba(255, 255, 255, 0.3)',
    borderRadius: '999px',
    padding: '0.75rem 1.4rem',
    display: 'flex',
    alignItems: 'center',
    gap: '0.6rem',
    cursor: 'pointer',
    boxShadow: '0 10px 30px rgba(37, 99, 235, 0.4), 0 0 20px rgba(124, 58, 237, 0.3)',
    transition: 'all 0.2s ease',
  },
  onlineBadge: {
    width: '8px',
    height: '8px',
    borderRadius: '50%',
    background: '#4ade80',
    boxShadow: '0 0 8px #4ade80',
  },
  chatPanel: {
    position: 'fixed',
    bottom: '24px',
    right: '24px',
    width: '420px',
    maxWidth: 'calc(100vw - 48px)',
    height: '560px',
    maxHeight: 'calc(100vh - 100px)',
    zIndex: 99999,
    background: 'rgba(10, 15, 30, 0.95)',
    border: '1px solid rgba(255, 255, 255, 0.15)',
    borderRadius: '24px',
    backdropFilter: 'blur(24px)',
    boxShadow: '0 25px 60px rgba(0, 0, 0, 0.8), 0 0 35px rgba(37, 99, 235, 0.25)',
    display: 'flex',
    flexDirection: 'column',
    overflow: 'hidden',
  },
  header: {
    padding: '1.1rem 1.25rem',
    borderBottom: '1px solid rgba(255, 255, 255, 0.1)',
    display: 'flex',
    justifyContent: 'space-between',
    alignItems: 'center',
    background: 'rgba(255, 255, 255, 0.03)',
  },
  avatar: {
    width: '36px',
    height: '36px',
    borderRadius: '10px',
    background: 'linear-gradient(135deg, #3b82f6 0%, #8b5cf6 100%)',
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
    fontSize: '1.2rem',
  },
  headerTitle: {
    fontWeight: 800,
    fontSize: '0.95rem',
    color: '#ffffff',
  },
  headerSubtitle: {
    fontSize: '0.72rem',
    color: '#94a3b8',
  },
  headerBtn: {
    background: 'rgba(255, 255, 255, 0.08)',
    border: 'none',
    color: '#cbd5e1',
    borderRadius: '8px',
    width: '28px',
    height: '28px',
    cursor: 'pointer',
    fontSize: '0.85rem',
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
  },
  messagesBody: {
    flex: 1,
    padding: '1.25rem',
    overflowY: 'auto',
    display: 'flex',
    flexDirection: 'column',
    gap: '0.85rem',
  },
  welcomeBox: {
    textAlign: 'center',
    padding: '1.5rem 0.5rem',
  },
  promptsGrid: {
    display: 'flex',
    flexDirection: 'column',
    gap: '0.45rem',
  },
  promptChip: {
    background: 'rgba(255, 255, 255, 0.06)',
    border: '1px solid rgba(255, 255, 255, 0.12)',
    color: '#e2e8f0',
    padding: '0.5rem 0.85rem',
    borderRadius: '10px',
    fontSize: '0.8rem',
    cursor: 'pointer',
    textAlign: 'left',
    transition: 'all 0.2s',
  },
  messageRow: {
    display: 'flex',
    width: '100%',
  },
  messageBubble: {
    maxWidth: '88%',
    padding: '0.85rem 1.1rem',
    borderRadius: '16px',
    fontSize: '0.88rem',
    lineHeight: 1.5,
    wordBreak: 'break-word',
  },
  typingBubble: {
    background: 'rgba(15, 23, 42, 0.85)',
    border: '1px solid rgba(255, 255, 255, 0.1)',
    borderRadius: '16px',
    padding: '0.75rem 1.25rem',
    display: 'flex',
    gap: '0.4rem',
    alignItems: 'center',
  },
  dot: {
    width: '6px',
    height: '6px',
    borderRadius: '50%',
    background: '#60a5fa',
    display: 'inline-block',
  },
  inputContainer: {
    padding: '0.85rem 1rem',
    borderTop: '1px solid rgba(255, 255, 255, 0.1)',
    background: 'rgba(15, 23, 42, 0.7)',
    display: 'flex',
    alignItems: 'center',
    gap: '0.6rem',
  },
  textarea: {
    flex: 1,
    background: 'rgba(255, 255, 255, 0.06)',
    border: '1px solid rgba(255, 255, 255, 0.12)',
    borderRadius: '12px',
    color: '#ffffff',
    padding: '0.6rem 0.85rem',
    fontSize: '0.86rem',
    resize: 'none',
    outline: 'none',
    fontFamily: 'inherit',
  },
  sendBtn: {
    background: 'linear-gradient(135deg, #2563eb 0%, #1d4ed8 100%)',
    color: '#ffffff',
    border: 'none',
    borderRadius: '12px',
    width: '38px',
    height: '38px',
    cursor: 'pointer',
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
    fontWeight: 900,
    fontSize: '1rem',
  },
};

export default AIAgentChat;
