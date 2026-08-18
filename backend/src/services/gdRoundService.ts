import { v4 as uuidv4 } from 'uuid';
import { pool } from '../db/connection';

export interface GDAgent {
  id: string;
  name: string;
  role: string;
  avatar: string;
  color: string;
  bgLight: string;
  borderLight: string;
  accent: string;
  voiceGender: 'female' | 'male';
  focusArea: string;
}

export const GD_AGENTS: GDAgent[] = [
  {
    id: 'agent-elena',
    name: 'Dr. Elena Vance',
    role: 'Global Trends & Tech Ethics Lead',
    avatar: '👩‍🏫',
    color: '#2563eb',
    bgLight: '#eff6ff',
    borderLight: '#bfdbfe',
    accent: '#3b82f6',
    voiceGender: 'female',
    focusArea: 'Global awareness, AI ethics & societal impact',
  },
  {
    id: 'agent-marcus',
    name: 'Marcus Thorne',
    role: 'Organizational Strategy & Crisis Director',
    avatar: '👨‍💼',
    color: '#7c3aed',
    bgLight: '#faf5ff',
    borderLight: '#e9d5ff',
    accent: '#8b5cf6',
    voiceGender: 'male',
    focusArea: 'Leadership dilemmas, conflict resolution & decision-making',
  },
  {
    id: 'agent-aria',
    name: 'Aria Sterling',
    role: 'Communication Dynamics & Team Innovation',
    avatar: '👩‍💻',
    color: '#db2777',
    bgLight: '#fdf2f8',
    borderLight: '#fbcfe8',
    accent: '#ec4899',
    voiceGender: 'female',
    focusArea: 'Articulation, persuasion & collaborative synthesis',
  },
  {
    id: 'agent-devon',
    name: 'Devon Ray',
    role: 'Behavioral Science & Composure Analyst',
    avatar: '👨‍🔬',
    color: '#059669',
    bgLight: '#f0fdf4',
    borderLight: '#bbf7d0',
    accent: '#10b981',
    voiceGender: 'male',
    focusArea: 'Confidence under pressure, active listening & conviction',
  },
];

export interface GDQuestion {
  id: string;
  agentId: string;
  agentName: string;
  category: 'global_issue' | 'workplace_dilemma' | 'candidate_depth' | 'ethics_innovation';
  questionText: string;
  followUpContext: string;
}

export interface GDEvaluation {
  confidenceScore: number;
  communicationScore: number;
  behavioralScore: number;
  criticalThinkingScore: number;
  overallScore: number;
  turnFeedback: string;
  keyObservation: string;
}

export interface GDSession {
  sessionId: string;
  candidateId: string;
  candidateName: string;
  track: string;
  jobRoleId: string;
  status: 'in_progress' | 'completed';
  currentAgentIndex: number;
  questions: GDQuestion[];
  turns: Array<{
    question: GDQuestion;
    candidateAnswer: string;
    evaluation: GDEvaluation;
    timestamp: string;
  }>;
  finalReport?: {
    overallConfidence: number;
    overallCommunication: number;
    overallBehavioral: number;
    overallCriticalThinking: number;
    compositeGDScore: number;
    passed: boolean;
    requiresAdminApproval?: boolean;
    hrRoundAccessCode?: string;
    executiveSummary: string;
  };

}

const activeGDSessions = new Map<string, GDSession>();

const GD_QUESTION_POOL: Omit<GDQuestion, 'id'>[] = [
  {
    agentId: 'agent-elena',
    agentName: 'Dr. Elena Vance',
    category: 'global_issue',
    questionText:
      'With Generative AI transforming global industries at an unprecedented pace, some fear automation will displace human intuition while others see endless amplification. From your perspective, how should modern professionals position themselves to remain indispensable in the global economy?',
    followUpContext: 'Evaluating global awareness, strategic foresight, and technological adaptability.',
  },
  {
    agentId: 'agent-marcus',
    agentName: 'Marcus Thorne',
    category: 'workplace_dilemma',
    questionText:
      'Imagine your cross-functional team is 48 hours away from a mission-critical release, and a major dispute arises between engineering and product on a compromise in quality versus deadline. As a team member, how do you steer this conversation to maintain harmony and protect customer trust?',
    followUpContext: 'Assessing conflict resolution, diplomatic composure, and stakeholder alignment.',
  },
  {
    agentId: 'agent-aria',
    agentName: 'Aria Sterling',
    category: 'ethics_innovation',
    questionText:
      'In a high-velocity environment, rapid execution often collides with thorough validation. Can you share an example of how you balance bold creative risks with calculated responsibility when pitching an idea to skeptical peers?',
    followUpContext: 'Testing persuasive articulation, emotional intelligence, and team dynamics.',
  },
  {
    agentId: 'agent-devon',
    agentName: 'Devon Ray',
    category: 'candidate_depth',
    questionText:
      'When you receive critical feedback in front of a group that you initially disagree with, what is your instinctive mental process, and how do you calibrate your vocal tone and body language to foster constructive growth?',
    followUpContext: 'Analyzing self-awareness, emotional poise, and resilience under scrutiny.',
  },
];

export function startGDSession(params: {
  candidateId: string;
  candidateName?: string;
  track?: string;
  jobRoleId?: string;
}): GDSession {
  const sessionId = `gd-${uuidv4().substring(0, 8)}`;
  const questions: GDQuestion[] = GD_QUESTION_POOL.map((q, idx) => ({
    ...q,
    id: `gd-q-${idx + 1}`,
  }));

  const session: GDSession = {
    sessionId,
    candidateId: params.candidateId,
    candidateName: params.candidateName || 'Candidate',
    track: params.track || 'TJI',
    jobRoleId: params.jobRoleId || 'role-backend-dev',
    status: 'in_progress',
    currentAgentIndex: 0,
    questions,
    turns: [],
  };

  activeGDSessions.set(sessionId, session);
  return session;
}

export function getGDSession(sessionId: string): GDSession | undefined {
  return activeGDSessions.get(sessionId);
}

export function evaluateGDTurn(params: {
  sessionId: string;
  candidateAnswer: string;
}): {
  evaluation: GDEvaluation;
  nextAgent?: GDAgent;
  nextQuestion?: GDQuestion;
  isComplete: boolean;
  finalReport?: GDSession['finalReport'];
} {
  const session = activeGDSessions.get(params.sessionId);
  if (!session) throw new Error(`GD Session not found: ${params.sessionId}`);

  const currentQ = session.questions[session.currentAgentIndex];
  const words = params.candidateAnswer.trim().split(/\s+/).filter(Boolean);
  const wordCount = words.length;

  // Behavioral & Communication heuristics
  const hasStructure = /first|second|moreover|on the other hand|in my view|specifically|ultimately/i.test(params.candidateAnswer);
  const hasEmpathy = /team|collaborate|understand|perspective|listen|respect|customer/i.test(params.candidateAnswer);
  const hasConviction = /believe|propose|ensure|drive|focus|deliver|strategy/i.test(params.candidateAnswer);

  let confidenceScore = Math.min(95, Math.max(55, 65 + (wordCount > 30 ? 15 : wordCount > 15 ? 8 : 0) + (hasConviction ? 10 : 0)));
  let communicationScore = Math.min(96, Math.max(50, 60 + (wordCount > 25 ? 12 : 5) + (hasStructure ? 14 : 0)));
  let behavioralScore = Math.min(98, Math.max(60, 70 + (hasEmpathy ? 16 : 0)));
  let criticalThinkingScore = Math.min(94, Math.max(55, 62 + (hasStructure ? 12 : 4) + (wordCount > 40 ? 10 : 0)));

  const overallScore = Math.round((confidenceScore + communicationScore + behavioralScore + criticalThinkingScore) / 4);

  const evaluation: GDEvaluation = {
    confidenceScore,
    communicationScore,
    behavioralScore,
    criticalThinkingScore,
    overallScore,
    turnFeedback:
      wordCount < 15
        ? 'Good direct point, though expanding with real-world examples and structured framing will amplify your executive presence.'
        : 'Articulate delivery with balanced reasoning and proactive consideration for multiple viewpoints.',
    keyObservation: hasEmpathy
      ? 'Demonstrated strong collaborative empathy and team-first orientation.'
      : 'Solid logical rationale with confident vocal stance.',
  };

  session.turns.push({
    question: currentQ,
    candidateAnswer: params.candidateAnswer,
    evaluation,
    timestamp: new Date().toISOString(),
  });

  session.currentAgentIndex += 1;

  if (session.currentAgentIndex >= session.questions.length) {
    session.status = 'completed';

    // Compute composite report
    const avgConf = Math.round(session.turns.reduce((a, t) => a + t.evaluation.confidenceScore, 0) / session.turns.length);
    const avgComm = Math.round(session.turns.reduce((a, t) => a + t.evaluation.communicationScore, 0) / session.turns.length);
    const avgBehav = Math.round(session.turns.reduce((a, t) => a + t.evaluation.behavioralScore, 0) / session.turns.length);
    const avgCrit = Math.round(session.turns.reduce((a, t) => a + t.evaluation.criticalThinkingScore, 0) / session.turns.length);
    const compositeScore = Math.round((avgConf + avgComm + avgBehav + avgCrit) / 4);
    const passed = compositeScore >= 60;
    const hrRoundAccessCode = passed ? `HR-${Math.floor(1000 + Math.random() * 9000)}` : undefined;

    session.finalReport = {
      overallConfidence: avgConf,
      overallCommunication: avgComm,
      overallBehavioral: avgBehav,
      overallCriticalThinking: avgCrit,
      compositeGDScore: compositeScore,
      passed,
      requiresAdminApproval: true,
      executiveSummary: passed
        ? `Candidate demonstrated robust communication clarity (${avgComm}%), high composure under multi-agent questioning (${avgConf}%), and constructive group dynamics. Recommended for Admin HR Round approval.`
        : `Candidate showed foundational communication skills (${avgComm}%), but requires further refinement in articulation depth and situational composure.`,
    };

    // Store unique code in DB for admin to approve and send to candidate
    if (hrRoundAccessCode) {
      pool.query(
        `UPDATE candidates SET unique_code = $1, status = 'pending_initial' WHERE id = $2`,
        [hrRoundAccessCode, session.candidateId]
      ).catch(() => {});
    }

    return {
      evaluation,
      isComplete: true,
      finalReport: session.finalReport,
    };

  }

  const nextQuestion = session.questions[session.currentAgentIndex];
  const nextAgent = GD_AGENTS.find((a) => a.id === nextQuestion.agentId) || GD_AGENTS[session.currentAgentIndex % GD_AGENTS.length];

  return {
    evaluation,
    nextAgent,
    nextQuestion,
    isComplete: false,
  };
}
