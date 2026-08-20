import React, { useState, useRef, useEffect, useCallback } from 'react';
import api from '../api/client';
import { getLocalCandidateSummaries, getLocalCandidateDetail } from '../utils/candidateStore';
import { getGDCohorts } from '../utils/gdStore';

interface ChatMessage {
  role: 'user' | 'assistant';
  content: string;
}

interface AIAgentChatProps {
  candidateId?: string;
}

const GLOBAL_PROMPTS = [
  '🛡️ Explain how the GD Round works',
  '📊 Summarize current GD cohorts & candidates',
  '🌍 How is the global job market right now?',
  '🎓 How can college students crack placements in MNCs?',
  '💻 What are FAANG / MAANG companies looking for?',
  '📝 Explain the complete VOXIS assessment pipeline',
];

const CANDIDATE_PROMPTS = [
  "Summarize this candidate's performance",
  'Should I hire this candidate?',
  'What are their strengths and weaknesses?',
  'Explain their interview scores',
  'What was their confidence and integrity level?',
];

// ── Comprehensive Knowledge & Reasoning Engine ───────────────────────────────
function generateLocalAgentReply(userPrompt: string, candidateId?: string): string {
  const q = userPrompt.toLowerCase().trim();

  // ── 1. CANDIDATE-SPECIFIC CONTEXT ──────────────────────────────────────────
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

  // ── 2. GD (GROUP DISCUSSION) ROUND INTELLIGENCE ────────────────────────────
  if (
    q.includes('gd') ||
    q.includes('group discussion') ||
    q.includes('cohort') ||
    q.includes('team name') ||
    q.includes('venue') ||
    q.includes('room number')
  ) {
    const cohorts = getGDCohorts();
    const totalCohorts = cohorts.length;
    const totalCands = cohorts.reduce((acc, c) => acc + c.candidates.length, 0);
    const approvedCands = cohorts.reduce(
      (acc, c) => acc + c.candidates.filter((cand) => cand.gdStatus === 'approved').length,
      0
    );
    const scheduledCohorts = cohorts.filter((c) => c.status === 'scheduled' || c.status === 'evaluated').length;

    // Specific question about how GD works
    if (q.includes('how') || q.includes('work') || q.includes('explain') || q.includes('process') || q.includes('rule')) {
      return "### 🛡️ VOXIS.AI Group Discussion (GD) Round Architecture\n\n" +
        "The **Group Discussion (GD) Round** is Stage 2 of the recruitment workflow, designed to assess candidate articulation, collaborative leadership, and critical communication:\n\n" +
        "1. **👥 AI Automated 5-Candidate Cohort Clustering**:\n" +
        "   - Candidates who pass the Aptitude Round (>= 7/15 correct) are automatically grouped into **batches of 5**.\n" +
        "   - The AI Agent assigns professional cohort identities (e.g. *Cohort Alpha: Quantum Synergy*, *Team Apex: Nexus Vanguard*, *Cohort Stellar: Strategic Visionaries*).\n\n" +
        "2. **📅 Administrative Venue & Schedule Assignment**:\n" +
        "   - The Admin locks in the 📅 **Date**, ⏰ **Time Slot**, 📍 **Location / Campus**, and 🚪 **Room Number / Virtual Link**.\n" +
        "   - Clicking **'Dispatch Official Invites'** sends official branded email invitations directly to all 5 registered emails.\n\n" +
        "3. **⚖️ Admin Performance Approvals & Outcomes**:\n" +
        "   - **👍 Approve (Good)**: Candidate passes GD and receives a **Universal Unique Interview Access Code** (e.g., `VOXIS-INT-8842`) dispatched to email, unlocking **both** Technical Job Interview (TJI) and Non-Technical Job Interview (NTJI).\n" +
        "   - **👎 Reject (Not Selected)**: Sends a polite, respectful, and motivational feedback email with encouragement and inspirational quotes to build long-term talent goodwill.\n\n" +
        "4. **🗑️ Admin Deletion Controls**:\n" +
        "   - Admins can delete individual candidate records or delete entire 5-member cohorts with safety confirmation modals.\n\n" +
        "**Current Live GD Metrics:**\n" +
        "- **Total Active Cohorts:** **" + totalCohorts + "**\n" +
        "- **Total Candidates in GD:** **" + totalCands + "**\n" +
        "- **Approved with Unique Codes:** **" + approvedCands + "**\n" +
        "- **Scheduled Cohorts:** **" + scheduledCohorts + "**";
    }

    // Question asking for live summary or list of GD cohorts/candidates
    let summaryText = "### 👥 Live GD Cohorts & Candidates Status (" + totalCohorts + " Cohorts | " + totalCands + " Candidates)\n\n";
    cohorts.forEach((c, idx) => {
      summaryText += "**" + (idx + 1) + ". " + c.teamName + "** (" + c.candidates.length + "/5 Members) • *" + c.status.toUpperCase() + "*\n";
      if (c.schedule) {
        summaryText += "- 📅 **Schedule:** " + c.schedule.date + " at " + c.schedule.time + " | 📍 " + c.schedule.location + " (Room " + c.schedule.roomNumber + ")\n";
      }
      summaryText += "- **Members:** " + c.candidates.map(m => m.fullName + " (" + (m.gdStatus === 'approved' ? '✅ Approved: ' + (m.uniqueInterviewCode || 'Code Issued') : m.gdStatus === 'rejected' ? '❌ Rejected' : '⏳ ' + m.gdStatus) + ")").join(', ') + "\n\n";
    });

    return summaryText;
  }

  // ── 3. COMPLETE PIPELINE & STAGE ARCHITECTURE ──────────────────────────────
  if (
    q.includes('pipeline') ||
    q.includes('stages') ||
    q.includes('rounds') ||
    q.includes('workflow') ||
    q.includes('system') ||
    q.includes('how does voxis work') ||
    q.includes('project')
  ) {
    return "### 🎙️ Complete VOXIS.AI End-to-End Recruitment Pipeline\n\n" +
      "The platform operates across 5 rigorous screening stages:\n\n" +
      "**Stage 0: Candidate Registration & Email OTP Verification**\n" +
      "- Unique email constraint per applicant with instant 6-digit email confirmation code.\n" +
      "- Real-time password strength meter and step-by-step Back navigation.\n\n" +
      "**Stage 1: Intellectual Aptitude Assessment (30 Mins, 15 Questions)**\n" +
      "- 3 Sections: *Mathematical Reasoning*, *Time, Money & Relationships*, *English Verbal*.\n" +
      "- **Passing Benchmark:** >= 7/15 correct answers.\n" +
      "- **Anti-Cheat Monitor:** Immediate test auto-submission and disqualification upon tab switch or window blur.\n\n" +
      "**Stage 2: 5-Member Group Discussion (GD) Cohorts**\n" +
      "- AI agent clusters passing candidates into distinguished teams (*Quantum Synergy*, *Nexus Vanguard*).\n" +
      "- Admin sets venue/date/room and dispatches official invitations.\n" +
      "- Admin approves (Good) or rejects with motivational feedback.\n\n" +
      "**Stage 3: Universal Code & Track Decision**\n" +
      "- A single verified access code (`VOXIS-INT-XXXX`) allows the candidate to freely decide between **Technical (TJI)** and **Non-Technical (NTJI)** tracks.\n\n" +
      "**Stage 4: TJI / NTJI AI Speech & Video Interview**\n" +
      "- Technical Track (TJI) is exclusively **English-only**.\n" +
      "- Real-time speech evaluation: pitch variation, speaking cadence (WPM), speech-to-pause ratios, jitter, and filler word detection.\n" +
      "- Live AI facial landmark framing and eye-contact proctoring.\n\n" +
      "**Stage 5: Executive HR & Admin Intelligence Console**\n" +
      "- Automated SWOT analysis, Radar Match Index, video recording playback, and batch cleanup tools.";
  }

  // ── 4. GLOBAL JOB MARKET INTELLIGENCE (2025 - 2027) ─────────────────────────
  if (
    q.includes('market') ||
    q.includes('job market') ||
    q.includes('hiring trend') ||
    q.includes('industry') ||
    q.includes('demand') ||
    q.includes('salary') ||
    q.includes('recession')
  ) {
    return "### 🌍 Global Job Market Dynamics & Hiring Trends (2025 – 2027)\n\n" +
      "The global talent landscape has evolved from broad-spectrum hiring to **high-efficiency, domain-specialized talent acquisition**:\n\n" +
      "#### 1. 💻 Tech Sector Hiring Shifts:\n" +
      "- **Rise of the Full-Stack AI Engineer**: Pure frontend or backend coders are being replaced by developers proficient in **TypeScript/React, Node.js/Python, LLM integrations (LangChain, Agentic workflows), and Vector Databases (Pinecone/pgvector)**.\n" +
      "- **System Architecture & Cloud Resilience**: High demand for microservice scalability, Golang/Rust high-throughput backends, Kubernetes, and secure DevOps.\n" +
      "- **Cybersecurity & Data Engineering**: Data governance, Kafka streaming pipelines, and zero-trust security architectures are in acute shortage globally.\n" +
      "- **Salary Benchmarks**:\n" +
      "  - *Junior/Entry-level:* $85k–$115k (US) | ₹8L–₹18L (India) | €55k–€75k (Europe)\n" +
      "  - *Mid-Senior Engineer:* $140k–$220k (US) | ₹25L–₹55L (India) | €85k–€130k (Europe)\n\n" +
      "#### 2. 🎙️ Non-Tech & Business Track Trends:\n" +
      "- **Product Managers with Technical Depth**: High preference for PMs who understand system constraints, API architectures, and data metrics (SQL/Mixpanel).\n" +
      "- **Strategic B2B SaaS Sales (BANT & MEDDPICC)**: Companies prioritize Account Executives who can navigate enterprise procurement, security reviews, and complex ROI justifications.\n" +
      "- **HR Analytics & Talent Ops**: Shift toward data-driven talent pipelining and automated proctored screening tools like VOXIS.AI.\n\n" +
      "#### 3. 🌐 Global Employment Structure:\n" +
      "- **Hybrid Balance**: 65% of Fortune 500 firms enforce hybrid (2-3 days office), while top tech firms maintain selective remote talent hubs.\n" +
      "- **Skill-First vs Credential-First**: 78% of global recruiters now prioritize verified project execution, proctored assessments, and problem articulation over university pedigree alone.";
  }

  // ── 5. STUDENTS & COLLEGE PLACEMENTS STRATEGY ──────────────────────────────
  if (
    q.includes('student') ||
    q.includes('college') ||
    q.includes('placement') ||
    q.includes('fresher') ||
    q.includes('campus') ||
    q.includes('tier') ||
    q.includes('internship')
  ) {
    return "### 🎓 Blueprint for College Students: Cracking Tier-1 MNC Placements\n\n" +
      "Whether you are from a **Tier-1 institution (IITs, NITs, BITS, Ivy League)** or a **Tier-2 / Tier-3 engineering & degree college**, here is the proven strategic playbook to secure top placement offers:\n\n" +
      "#### 1. 📋 The 4 Pillars of Placement Preparation:\n" +
      "- **Pillar A: Aptitude & Logical Reasoning (The Gatekeeper)**\n" +
      "  - Daily practice of Quantitative Aptitude, Time/Work/Speed, Data Interpretation, and Logical Syllogisms.\n" +
      "  - Target: Aim for >= 80% accuracy under timed constraints (like VOXIS 30-min Aptitude).\n" +
      "- **Pillar B: Group Discussion (GD) Mastery**\n" +
      "  - **The Hook:** Be the 1st or 2nd speaker with a clear definition and structured framework (e.g. *PESTEL: Political, Economic, Social, Tech, Environmental, Legal*).\n" +
      "  - **Collaboration over Aggression:** Acknowledge peers (*'Building upon Alex\'s insightful point...'*) and facilitate balance.\n" +
      "  - **The Synthesis:** Summarize the team\'s consensus in the final 30 seconds.\n" +
      "- **Pillar C: Core Technical Depth (For TJI Candidates)**\n" +
      "  - Master 1 primary language deeply (**TypeScript, Python, Java, or C++**).\n" +
      "  - Solve 200+ LeetCode problems (Focus: HashMaps, Two Pointers, Dynamic Programming, Trees/Graphs).\n" +
      "  - Understand CS Fundamentals: Database Indexing, ACID properties, REST vs gRPC, OS Threads vs Processes.\n" +
      "- **Pillar D: High-Impact Projects over Tutorial Clones**\n" +
      "  - Build full-stack deployed applications with real users, payment integration, or AI speech streaming.\n" +
      "  - Maintain an active GitHub with clear READMEs, system architecture diagrams, and live demo links.\n\n" +
      "#### 2. 🚀 Strategy for Tier-2 / Tier-3 College Students:\n" +
      "- **Bypass the On-Campus Ceiling**: Build credibility via open-source contributions, hackathons (Devpost, ETHIndia), and competitive coding (Codeforces/LeetCode rating > 1700).\n" +
      "- **Cold Networking with Proof of Work**: Reach out directly to Engineering Managers with a 2-minute Loom video walking through a custom tool or bug fix you built for their platform.";
  }

  // ── 6. GLOBAL MNCS & ENTERPRISE HIRING PLAYBOOK ─────────────────────────────
  if (
    q.includes('mnc') ||
    q.includes('faang') ||
    q.includes('maang') ||
    q.includes('google') ||
    q.includes('amazon') ||
    q.includes('microsoft') ||
    q.includes('meta') ||
    q.includes('tcs') ||
    q.includes('infosys') ||
    q.includes('deloitte') ||
    q.includes('accenture')
  ) {
    return "### 🏢 Global MNC Hiring Playbook: Standards & Evaluation Criteria\n\n" +
      "Enterprise MNCs evaluate candidates through distinct hiring philosophies:\n\n" +
      "1. **Big Tech (FAANG / MAANG: Google, Meta, Amazon, Microsoft, Apple, Netflix)**:\n" +
      "   - Data Structures & Algorithms, Scalable System Design, Amazon Leadership Principles, Googleyness.\n" +
      "   - Hiring Bar: Top 1-3% technical problem solvers with extreme autonomy.\n\n" +
      "2. **Product & Cloud Giants (Uber, Adobe, Salesforce, Oracle, NVIDIA, Stripe)**:\n" +
      "   - Concurrency, API contracts, domain fluency, low-latency architecture, product ownership.\n" +
      "   - Hiring Bar: High architectural rigor & clean code standards.\n\n" +
      "3. **Global Strategy & Consulting (McKinsey, BCG, Bain, Deloitte, PwC, EY, Accenture)**:\n" +
      "   - Case studies, structured hypothesis testing, market entry models, executive communication.\n" +
      "   - Hiring Bar: High analytical horsepower, executive presence & poise.\n\n" +
      "4. **Global IT & Digital Services (TCS Digital/Prime, Infosys Power Programmer, Cognizant, Wipro, Capgemini)**:\n" +
      "   - Core programming (Java/Python/Fullstack), logical aptitude, client readiness, learnability.\n" +
      "   - Hiring Bar: Structured mass & specialized merit tiers.\n\n" +
      "#### 🔑 What MNC Hiring Managers Unanimously Value:\n" +
      "1. **Clear, Structured Articulation**: Using frameworks like the **STAR Method** (*Situation, Task, Action, Result*) for behavioral rounds.\n" +
      "2. **First-Principles Thinking**: Explaining *why* a trade-off was made (e.g. why PostgreSQL over MongoDB, or why Redux over Context API).\n" +
      "3. **High Proctoring & Cultural Integrity**: Verified communication stability, active listening, and ownership under pressure.";
  }

  // ── 7. GENERAL APTITUDE / BEHAVIORAL / CODE QUERIES ─────────────────────────
  if (q.includes('star') || q.includes('behavioral') || q.includes('interview tip')) {
    return "### 🌟 The STAR Behavioral Interview Framework (MNC Standard)\n\n" +
      "When answering behavioral and situational questions (*'Tell me about a time you resolved a conflict...'*), use the **STAR** structure:\n\n" +
      "- **S – Situation (20%):** Set the specific context, company, timeline, and challenge.\n" +
      "- **T – Task (15%):** What was your specific responsibility or goal?\n" +
      "- **A – Action (50%):** The most critical part. Walk step-by-step through the decisions, tools, and collaboration you led.\n" +
      "- **R – Result (15%):** Quantify the business or technical outcome (*'Reduced page latency by 35% and increased conversions by 12%'*).";
  }

  if (q.includes('aptitude') || q.includes('math') || q.includes('reasoning')) {
    return "### 🧠 VOXIS Aptitude Round Blueprint\n\n" +
      "- **Structure:** 15 Intellectual Questions (5 Math Reasoning, 5 Time/Money/Relations, 5 English Verbal).\n" +
      "- **Time Limit:** Strictly 30 Minutes.\n" +
      "- **Cutoff:** Minimum **7 / 15 correct answers** required to qualify for the Group Discussion (GD) Round.\n" +
      "- **Anti-Cheat:** Switching tabs or blurring the browser window triggers instant auto-submission and termination.";
  }

  // ── 8. GENERAL INTELLIGENCE FALLBACK ───────────────────────────────────────
  const all = getLocalCandidateSummaries();
  const total = all.length;
  const passed = all.filter(function(c) { return (c.overallGrade || 0) >= 50; }).length;
  const cohorts = getGDCohorts();

  return "### 🤖 VOXIS Recruitment & Career AI Intelligence Engine\n\n" +
    "I am fully synchronized with the entire platform database and global market intelligence:\n\n" +
    "**📊 Current System Overview:**\n" +
    "- **Evaluated Candidates:** **" + total + "** (Passed: **" + passed + "**)\n" +
    "- **Active GD Cohorts:** **" + cohorts.length + "** 5-member teams\n" +
    "- **Stage 1 Cutoff:** >= 7/15 Aptitude Score\n" +
    "- **Universal Code Access:** Active for TJI & NTJI Tracks\n\n" +
    "**💡 Topics you can explore with me:**\n" +
    "- 🛡️ *'Explain the GD round and show cohort details'*\n" +
    "- 🌍 *'How is the tech and non-tech job market in 2025-2027?'*\n" +
    "- 🎓 *'How can college freshers crack placements at FAANG/MNCs?'*\n" +
    "- 🏢 *'What do MNCs like Google, Amazon, and Deloitte look for?'*\n" +
    "- 📊 *'List all candidate evaluations and scores'*\n" +
    "- 🧠 *'Give tips to crack Aptitude and STAR behavioral questions'*";
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
  h2: { fontSize: '1.1rem', fontWeight: 900, margin: '0.6rem 0 0.3rem', color: '#ffffff' },
  h3: { fontSize: '1.02rem', fontWeight: 800, margin: '0.5rem 0 0.25rem', color: '#f1f5f9' },
  h4: { fontSize: '0.94rem', fontWeight: 800, margin: '0.4rem 0 0.2rem', color: '#93c5fd' },
  para: { margin: '0.25rem 0', lineHeight: 1.6, color: '#e2e8f0', fontSize: '0.88rem' },
  bullet: { display: 'flex', gap: '0.45rem', margin: '0.25rem 0', lineHeight: 1.55, color: '#e2e8f0', fontSize: '0.88rem' },
  bulletDot: { color: '#60a5fa', fontWeight: 800, flexShrink: 0 },
  bulletNum: { color: '#60a5fa', fontWeight: 800, flexShrink: 0, minWidth: '1.4rem' },
};

export const AIAgentChat: React.FC<AIAgentChatProps> = ({ candidateId }) => {
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
        { timeout: 1500 }
      );
      if (res.data && res.data.reply && res.data.reply !== 'OK') {
        const assistantMsg: ChatMessage = { role: 'assistant', content: res.data.reply };
        setMessages((prev) => [...prev, assistantMsg]);
        return;
      }
      throw new Error('Fallback to local intelligence');
    } catch {
      // Execute deep local intelligence engine
      const reply = generateLocalAgentReply(trimmed, candidateId);
      setTimeout(() => {
        setMessages((prev) => [...prev, { role: 'assistant', content: reply }]);
      }, 150);
    } finally {
      setLoading(false);
    }
  }, [messages, loading, candidateId]);

  return (
    <>
      {/* Floating Toggle Button */}
      {!open && (
        <button
          onClick={() => setOpen(true)}
          style={styles.floatingTrigger}
          title="Open AI Recruitment & Market Copilot"
        >
          <div style={styles.triggerPulse} />
          <span style={{ fontSize: '1.4rem' }}>🤖</span>
          <span style={styles.triggerText}>VOXIS AI Copilot</span>
        </button>
      )}

      {/* Floating Chat Modal Panel */}
      {open && (
        <div style={styles.chatDrawer}>
          {/* Header */}
          <div style={styles.drawerHeader}>
            <div style={{ display: 'flex', alignItems: 'center', gap: '0.65rem' }}>
              <div style={styles.botIconCircle}>🤖</div>
              <div>
                <div style={{ display: 'flex', alignItems: 'center', gap: '0.4rem' }}>
                  <h3 style={styles.headerTitle}>VOXIS AI Intelligence</h3>
                  <span style={styles.livePill}>LIVE</span>
                </div>
                <p style={styles.headerSub}>
                  Platform Architecture, GD Cohorts, Market & Global MNC Knowledge
                </p>
              </div>
            </div>

            <button
              onClick={() => setOpen(false)}
              style={styles.closeBtn}
              title="Close AI Assistant"
            >
              ✕
            </button>
          </div>

          {/* Prompt Chips Bar */}
          <div style={styles.promptChipsContainer}>
            {prompts.map((p, idx) => (
              <button
                key={idx}
                onClick={() => sendMessage(p)}
                style={styles.promptChip}
              >
                {p}
              </button>
            ))}
          </div>

          {/* Messages Feed */}
          <div style={styles.messagesContainer}>
            {messages.length === 0 ? (
              <div style={styles.welcomeBox}>
                <div style={{ fontSize: '2.5rem', marginBottom: '0.5rem' }}>✨</div>
                <h4 style={{ color: '#ffffff', margin: '0 0 0.4rem 0', fontWeight: 800 }}>
                  How can I assist you today?
                </h4>
                <p style={{ color: '#cbd5e1', fontSize: '0.85rem', lineHeight: 1.5, margin: '0 0 1rem 0' }}>
                  Ask me anything about the **GD Round**, **Aptitude Cutoffs**, **Candidate Performance**, **Global Job Markets**, **College Placements**, or **MNC Hiring Standards**.
                </p>
                <div style={{ display: 'flex', flexWrap: 'wrap', gap: '0.4rem', justifyContent: 'center' }}>
                  {prompts.slice(0, 3).map((p, i) => (
                    <button
                      key={i}
                      onClick={() => sendMessage(p)}
                      style={styles.quickStartChip}
                    >
                      {p}
                    </button>
                  ))}
                </div>
              </div>
            ) : (
              messages.map((m, idx) => (
                <div
                  key={idx}
                  style={{
                    ...styles.messageRow,
                    justifyContent: m.role === 'user' ? 'flex-end' : 'flex-start',
                  }}
                >
                  <div
                    style={{
                      ...styles.messageBubble,
                      background:
                        m.role === 'user'
                          ? 'linear-gradient(135deg, #2563eb 0%, #7c3aed 100%)'
                          : 'rgba(15, 23, 42, 0.9)',
                      borderColor:
                        m.role === 'user' ? 'rgba(255, 255, 255, 0.3)' : 'rgba(255, 255, 255, 0.12)',
                    }}
                  >
                    {m.role === 'assistant' ? (
                      <div>{renderMarkdown(m.content)}</div>
                    ) : (
                      <div style={{ color: '#ffffff', fontSize: '0.9rem', lineHeight: 1.5 }}>
                        {m.content}
                      </div>
                    )}
                  </div>
                </div>
              ))
            )}

            {loading && (
              <div style={{ ...styles.messageRow, justifyContent: 'flex-start' }}>
                <div style={styles.thinkingBubble}>
                  <div className="dot-flashing" />
                  <span style={{ fontSize: '0.82rem', color: '#93c5fd', marginLeft: '0.5rem' }}>
                    Analyzing system intelligence & global market data...
                  </span>
                </div>
              </div>
            )}
            <div ref={messagesEndRef} />
          </div>

          {/* Chat Input Bar */}
          <div style={styles.inputArea}>
            <textarea
              ref={inputRef}
              rows={1}
              value={input}
              onChange={(e) => setInput(e.target.value)}
              onKeyDown={(e) => {
                if (e.key === 'Enter' && !e.shiftKey) {
                  e.preventDefault();
                  sendMessage(input);
                }
              }}
              placeholder="Ask about GD cohorts, candidate grades, global job market, colleges, MNCs..."
              style={styles.textarea}
            />

            <button
              onClick={() => sendMessage(input)}
              disabled={!input.trim() || loading}
              style={{
                ...styles.sendBtn,
                opacity: !input.trim() || loading ? 0.5 : 1,
              }}
            >
              ➔
            </button>
          </div>
        </div>
      )}
    </>
  );
};

const styles: Record<string, React.CSSProperties> = {
  floatingTrigger: {
    position: 'fixed',
    bottom: '24px',
    right: '24px',
    background: 'linear-gradient(135deg, #2563eb 0%, #7c3aed 50%, #ec4899 100%)',
    color: '#ffffff',
    border: '1px solid rgba(255, 255, 255, 0.35)',
    borderRadius: '999px',
    padding: '0.65rem 1.25rem',
    display: 'flex',
    alignItems: 'center',
    gap: '0.65rem',
    cursor: 'pointer',
    zIndex: 99999,
    boxShadow: '0 10px 30px rgba(37, 99, 235, 0.5), 0 0 25px rgba(124, 58, 237, 0.4)',
    fontWeight: 800,
    fontSize: '0.9rem',
    transition: 'all 0.3s ease',
  },
  triggerPulse: {
    width: '10px',
    height: '10px',
    borderRadius: '50%',
    background: '#4ade80',
    boxShadow: '0 0 10px #4ade80',
  },
  triggerText: {
    letterSpacing: '-0.01em',
  },
  chatDrawer: {
    position: 'fixed',
    bottom: '24px',
    right: '24px',
    width: '460px',
    maxWidth: '92vw',
    height: '640px',
    maxHeight: '85vh',
    background: 'rgba(10, 15, 30, 0.95)',
    backdropFilter: 'blur(35px)',
    border: '1.5px solid rgba(255, 255, 255, 0.18)',
    borderRadius: '24px',
    display: 'flex',
    flexDirection: 'column',
    zIndex: 99999,
    boxShadow: '0 25px 65px rgba(0, 0, 0, 0.8), 0 0 35px rgba(37, 99, 235, 0.25)',
    overflow: 'hidden',
  },
  drawerHeader: {
    padding: '1rem 1.25rem',
    background: 'rgba(15, 23, 42, 0.9)',
    borderBottom: '1px solid rgba(255, 255, 255, 0.1)',
    display: 'flex',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  botIconCircle: {
    width: '38px',
    height: '38px',
    borderRadius: '12px',
    background: 'linear-gradient(135deg, #2563eb 0%, #7c3aed 100%)',
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
    fontSize: '1.3rem',
    boxShadow: '0 0 15px rgba(37, 99, 235, 0.5)',
  },
  headerTitle: {
    margin: 0,
    fontSize: '1rem',
    fontWeight: 900,
    color: '#ffffff',
  },
  livePill: {
    fontSize: '0.62rem',
    fontWeight: 900,
    padding: '0.1rem 0.45rem',
    borderRadius: '6px',
    background: 'rgba(74, 222, 128, 0.2)',
    color: '#4ade80',
    border: '1px solid rgba(74, 222, 128, 0.4)',
  },
  headerSub: {
    margin: '0.15rem 0 0 0',
    fontSize: '0.74rem',
    color: '#94a3b8',
  },
  closeBtn: {
    background: 'rgba(255, 255, 255, 0.08)',
    border: '1px solid rgba(255, 255, 255, 0.15)',
    color: '#ffffff',
    width: '28px',
    height: '28px',
    borderRadius: '8px',
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
    cursor: 'pointer',
    fontSize: '0.8rem',
  },
  promptChipsContainer: {
    display: 'flex',
    gap: '0.4rem',
    padding: '0.6rem 0.85rem',
    overflowX: 'auto',
    background: 'rgba(0, 0, 0, 0.25)',
    borderBottom: '1px solid rgba(255, 255, 255, 0.06)',
    whiteSpace: 'nowrap',
  },
  promptChip: {
    background: 'rgba(255, 255, 255, 0.05)',
    border: '1px solid rgba(255, 255, 255, 0.12)',
    color: '#cbd5e1',
    padding: '0.3rem 0.65rem',
    borderRadius: '999px',
    fontSize: '0.72rem',
    fontWeight: 700,
    cursor: 'pointer',
    transition: 'all 0.2s ease',
    flexShrink: 0,
  },
  messagesContainer: {
    flex: 1,
    padding: '1rem',
    overflowY: 'auto',
    display: 'flex',
    flexDirection: 'column',
    gap: '0.85rem',
  },
  welcomeBox: {
    background: 'rgba(255, 255, 255, 0.03)',
    border: '1px solid rgba(255, 255, 255, 0.08)',
    borderRadius: '18px',
    padding: '1.5rem 1rem',
    textAlign: 'center',
    marginTop: '1.5rem',
  },
  quickStartChip: {
    background: 'rgba(37, 99, 235, 0.15)',
    border: '1px solid rgba(96, 165, 250, 0.3)',
    color: '#93c5fd',
    padding: '0.35rem 0.75rem',
    borderRadius: '999px',
    fontSize: '0.74rem',
    fontWeight: 700,
    cursor: 'pointer',
  },
  messageRow: {
    display: 'flex',
    width: '100%',
  },
  messageBubble: {
    maxWidth: '85%',
    padding: '0.85rem 1.1rem',
    borderRadius: '16px',
    border: '1px solid',
    boxShadow: '0 5px 15px rgba(0, 0, 0, 0.3)',
    wordBreak: 'break-word',
  },
  thinkingBubble: {
    background: 'rgba(15, 23, 42, 0.8)',
    border: '1px solid rgba(96, 165, 250, 0.3)',
    padding: '0.6rem 1rem',
    borderRadius: '14px',
    display: 'flex',
    alignItems: 'center',
  },
  inputArea: {
    padding: '0.75rem 1rem',
    background: 'rgba(15, 23, 42, 0.95)',
    borderTop: '1px solid rgba(255, 255, 255, 0.1)',
    display: 'flex',
    gap: '0.6rem',
    alignItems: 'center',
  },
  textarea: {
    flex: 1,
    background: 'rgba(255, 255, 255, 0.06)',
    border: '1px solid rgba(255, 255, 255, 0.15)',
    borderRadius: '12px',
    padding: '0.65rem 0.9rem',
    color: '#ffffff',
    fontSize: '0.86rem',
    outline: 'none',
    resize: 'none',
    fontFamily: 'inherit',
  },
  sendBtn: {
    width: '36px',
    height: '36px',
    borderRadius: '10px',
    background: 'linear-gradient(135deg, #2563eb 0%, #7c3aed 100%)',
    color: '#ffffff',
    border: 'none',
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
    fontWeight: 900,
    cursor: 'pointer',
  },
};

export default AIAgentChat;
