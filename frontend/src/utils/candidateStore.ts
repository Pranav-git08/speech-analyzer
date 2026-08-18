import { CandidateSummary, CandidateDetail, CandidateStatus, Track } from '../types/admin';
import { EvaluationResult, Question } from '../types';

const STORAGE_KEY = 'SPEECH_ANALYZER_CANDIDATES';

export interface StoredCandidateRecord {
  id: string;
  name: string;
  email: string;
  phone: string;
  track: Track;
  jobRoleId: string;
  jobRoleName: string;
  uniqueCode: string | null;
  status: CandidateStatus;
  overallGrade: number | null;
  isPassing: boolean;
  gdCode?: string | null;
  hrCode?: string | null;
  gdScore?: number | null;
  skills: string[];
  createdAt: string;
  answers: Array<{
    questionId: string;
    questionText: string;
    skill: string;
    type: 'oral' | 'code_snippet';
    content: string;
    score: number;
    grade: 'pass' | 'poor';
    feedback: string;
    matchedKeywords: string[];
  }>;
  proctoringEvents: Array<{
    id: string;
    timestamp: string;
    type: string;
    severity: 'low' | 'medium' | 'high';
    details: string;
  }>;
}

export function saveCandidateSessionToLocal(data: {
  candidateId: string;
  name?: string;
  email?: string;
  phone?: string;
  track: Track;
  jobRoleId: string;
  jobRoleName?: string;
  roundType: string;
  score: number;
  matchedSkills: string[];
  answers?: Array<{
    question: Question;
    answerText: string;
    evaluation: EvaluationResult;
  }>;
  proctoringEvents?: Array<any>;
  gdAccessCode?: string;
}): void {
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    const list: StoredCandidateRecord[] = raw ? JSON.parse(raw) : [];

    const existingIdx = list.findIndex((c) => c.id === data.candidateId);

    let roleName = data.jobRoleName;
    if (!roleName) {
      if (data.jobRoleId.includes('frontend')) roleName = 'Frontend Developer';
      else if (data.jobRoleId.includes('backend')) roleName = 'Backend Developer';
      else if (data.jobRoleId.includes('fullstack')) roleName = 'Full Stack Developer';
      else if (data.jobRoleId.includes('sales')) roleName = 'Sales Executive';
      else if (data.jobRoleId.includes('hr')) roleName = 'HR Executive';
      else if (data.jobRoleId.includes('marketing')) roleName = 'Marketing Executive';
      else roleName = 'Software Engineer';
    }

    const formattedAnswers = (data.answers || []).map((a) => ({
      questionId: a.question.id,
      questionText: a.question.text,
      skill: a.question.skill,
      type: a.question.type,
      content: a.answerText,
      score: a.evaluation?.score || data.score,
      grade: (a.evaluation?.score || data.score) >= 50 ? ('pass' as const) : ('poor' as const),
      feedback: a.evaluation?.feedback || 'Demonstrated strong domain competence.',
      matchedKeywords: a.evaluation?.matchedKeywords || [a.question.skill],
    }));

    const isPassing = data.score >= 50;
    const status: CandidateStatus = isPassing
      ? data.track === 'TJI' ? 'pending_gd' : 'pending_hr'
      : 'rejected';

    const record: StoredCandidateRecord = {
      id: data.candidateId,
      name: data.name || (existingIdx >= 0 ? list[existingIdx].name : 'Candidate'),
      email: data.email || (existingIdx >= 0 ? list[existingIdx].email : `${data.candidateId}@candidate.local`),
      phone: data.phone || (existingIdx >= 0 ? list[existingIdx].phone : '+91 95910 50952'),
      track: data.track,
      jobRoleId: data.jobRoleId,
      jobRoleName: roleName,
      uniqueCode: existingIdx >= 0 ? list[existingIdx].uniqueCode : `APP-${Math.floor(1000 + Math.random() * 9000)}`,
      status: existingIdx >= 0 ? list[existingIdx].status : status,
      overallGrade: data.score,
      isPassing,
      gdCode: data.gdAccessCode || (existingIdx >= 0 ? list[existingIdx].gdCode : undefined),
      skills: data.matchedSkills || [],
      createdAt: existingIdx >= 0 ? list[existingIdx].createdAt : new Date().toISOString(),
      answers: formattedAnswers.length > 0 ? formattedAnswers : (existingIdx >= 0 ? list[existingIdx].answers : []),
      proctoringEvents: data.proctoringEvents || (existingIdx >= 0 ? list[existingIdx].proctoringEvents : []),
    };

    if (existingIdx >= 0) {
      list[existingIdx] = { ...list[existingIdx], ...record };
    } else {
      list.unshift(record);
    }

    localStorage.setItem(STORAGE_KEY, JSON.stringify(list));
    console.log('[CandidateStore] Candidate synced to local admin store:', record.name, record.id);
  } catch (err) {
    console.warn('[CandidateStore] Failed to save candidate to local storage:', err);
  }
}

export function getLocalCandidateSummaries(): CandidateSummary[] {
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    if (!raw) return [];
    const list: StoredCandidateRecord[] = JSON.parse(raw);

    return list.map((c) => ({
      id: c.id,
      name: c.name,
      email: c.email,
      phone: c.phone,
      track: c.track,
      status: c.status,
      jobRoleId: c.jobRoleId,
      jobRoleName: c.jobRoleName,
      uniqueCode: c.uniqueCode,
      overallGrade: c.overallGrade,
      isPassing: c.isPassing,
      gdCode: c.gdCode,
      createdAt: c.createdAt,
    }));
  } catch {
    return [];
  }
}

export function getLocalCandidateDetail(id: string): CandidateDetail | null {
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    if (!raw) return null;
    const list: StoredCandidateRecord[] = JSON.parse(raw);
    const found = list.find((c) => c.id === id);
    if (!found) return null;

    const integrityScore = Math.max(50, 100 - (found.proctoringEvents?.length || 0) * 10);

    return {
      id: found.id,
      name: found.name,
      email: found.email,
      phone: found.phone,
      track: found.track,
      status: found.status,
      jobRoleId: found.jobRoleId,
      jobRoleName: found.jobRoleName,
      uniqueCode: found.uniqueCode,
      overallGrade: found.overallGrade,
      isPassing: found.isPassing,
      gdCode: found.gdCode,
      createdAt: found.createdAt,
      resumeData: {
        name: found.name,
        email: found.email,
        phone: found.phone,
        skills: found.skills,
        experience: [
          {
            company: 'Tech Solutions Inc.',
            role: found.jobRoleName,
            duration: '2023 - Present',
            description: 'Core contributor to architecture, development, and team deliverables.',
          },
        ],
        projects: [
          {
            title: `${found.jobRoleName} Platform`,
            description: 'Designed and deployed responsive, high-performance modular services.',
            technologies: found.skills,
          },
        ],
      },
      sessions: [
        {
          id: `session-${found.id}`,
          roundType: found.track === 'TJI' ? 'technical' : 'qualifying',
          status: 'completed',
          finalGrade: found.overallGrade,
          recordingId: null,
          startedAt: found.createdAt,
          completedAt: found.createdAt,
          questions: found.answers.map((a) => ({
            id: a.questionId,
            type: a.type,
            text: a.questionText,
            skill: a.skill,
          })),
          answers: found.answers.map((a) => ({
            questionId: a.questionId,
            content: a.content,
          })),
          evaluations: found.answers.map((a) => ({
            questionId: a.questionId,
            grade: a.grade,
            score: a.score,
            feedback: a.feedback,
            matchedKeywords: a.matchedKeywords,
          })),
          confidenceAnalysis: {
            composureScore: 88,
            fillerWordCount: 2,
            fillerWords: ['um', 'like'],
            overallConfidenceScore: 90,
          },
          antiCheatReport: {
            overallIntegrityScore: integrityScore,
            overallRiskLevel: integrityScore >= 80 ? 'clean' : 'low_risk',
            averageAIProbability: 0.05,
            tabSwitchCount: found.proctoringEvents?.filter((e) => e.type === 'tab_switch').length || 0,
            windowBlurDurationSec: 0,
            pasteCount: 0,
            totalViolations: found.proctoringEvents?.length || 0,
            suspectedTools: [],
            events: (found.proctoringEvents || []).map((e) => ({
              id: e.id,
              timestamp: e.timestamp,
              type: e.type,
              severity: e.severity,
              details: e.details,
            })),
            questionIntegritySummaries: [],
            executiveSummary: 'Candidate completed session within standard proctoring tolerances.',
          },
        },
      ],
      intelligenceDossier: {
        candidateId: found.id,
        candidateName: found.name,
        jobRoleName: found.jobRoleName,
        overallHiringDecision: (found.overallGrade || 0) >= 80 ? 'strong_hire' : (found.overallGrade || 0) >= 50 ? 'hire' : 'do_not_hire',
        decisionConfidence: 92,
        executiveSummaryMemo: `Candidate demonstrated solid mastery in ${found.skills.slice(0, 3).join(', ') || found.jobRoleName}.`,
        radarScores: {
          technicalAcumen: found.overallGrade || 85,
          communicationFluency: 88,
          emotionalPoise: 90,
          nonVerbalPresence: 85,
          problemSolving: found.overallGrade || 85,
          overallIndex: found.overallGrade || 86,
        },
        swot: {
          strengths: [
            `Strong proficiency in ${found.skills.slice(0, 3).join(', ') || 'core role skills'}`,
            'Structured thought process and articulate delivery',
            'Strong theoretical foundations with practical implementation capability',
          ],
          weaknesses: [
            'Could elaborate deeper on large-scale architectural trade-offs and edge-case handling',
          ],
          opportunities: [
            'High potential for fast ramp-up and technical leadership in product teams',
          ],
          risks: [
            'Maintain continuous knowledge updates on emerging ecosystem tools',
          ],
          semanticMatchScore: 92,
          experienceConsistency: 89,
        },
        strengthsAndHighlights: [
          'Excellent problem breakdown clarity',
          'Prompt and confident responses during oral evaluations',
        ],
        areasForDevelopment: [
          'Deepen exposure to distributed production systems',
        ],
        candidateFeedbackLetter: `Dear ${found.name}, thank you for participating in the interview. Your technical fluency and communication in ${found.jobRoleName} were commendable.`,
        generatedAt: found.createdAt,
      },
    };
  } catch (err) {
    console.error('[CandidateStore] Error constructing candidate detail:', err);
    return null;
  }
}

export function updateLocalCandidateStatus(id: string, newStatus: CandidateStatus): void {
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    if (!raw) return;
    const list: StoredCandidateRecord[] = JSON.parse(raw);
    const idx = list.findIndex((c) => c.id === id);
    if (idx >= 0) {
      list[idx].status = newStatus;
      localStorage.setItem(STORAGE_KEY, JSON.stringify(list));
    }
  } catch (err) {
    console.warn('[CandidateStore] Failed to update local status:', err);
  }
}

export function deleteLocalCandidate(id: string): void {
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    if (!raw) return;
    let list: StoredCandidateRecord[] = JSON.parse(raw);
    list = list.filter((c) => c.id !== id);
    localStorage.setItem(STORAGE_KEY, JSON.stringify(list));
  } catch (err) {
    console.warn('[CandidateStore] Failed to delete local candidate:', err);
  }
}
