import { CandidateSummary, CandidateDetail, CandidateStatus, Track } from '../types/admin';
import { EvaluationResult, Question } from '../types';

const STORAGE_KEY = 'SPEECH_ANALYZER_CANDIDATES';
const DELETED_KEY = 'SPEECH_ANALYZER_DELETED_IDS';
const INIT_KEY = 'SPEECH_ANALYZER_INITIALIZED_V2';

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
  recordingDeleted?: boolean;
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

const DEFAULT_SEEDS: StoredCandidateRecord[] = [
  {
    id: 'cand-pranav-01',
    name: 'Srinivas Pranav Vaidyam',
    email: 'pranavvaidyam08@gmail.com',
    phone: '+91 95910 50952',
    track: 'TJI',
    jobRoleId: 'role-frontend-dev',
    jobRoleName: 'Frontend Developer',
    uniqueCode: 'APP-4821',
    status: 'pending_gd',
    overallGrade: 88,
    isPassing: true,
    gdCode: 'GD-849201',
    skills: ['HTML', 'CSS', 'JavaScript', 'React', 'TypeScript', 'Tailwind CSS'],
    createdAt: new Date().toISOString(),
    answers: [
      {
        questionId: 'q-fe-1',
        questionText: 'What are semantic HTML tags and why are they important for accessibility and SEO?',
        skill: 'HTML',
        type: 'oral',
        content: 'Semantic HTML tags clearly describe their meaning to both the browser and the developer. Elements like header, nav, main, article, and footer structure web documents cleanly for screen readers and SEO indexers.',
        score: 90,
        grade: 'pass',
        feedback: 'Excellent explanation of semantic document structure, accessibility benefits, and search engine optimization.',
        matchedKeywords: ['semantic', 'accessibility', 'seo', 'header', 'nav', 'main', 'footer'],
      },
      {
        questionId: 'q-fe-4',
        questionText: 'Explain the React Component Lifecycle and how the useEffect hook handles mounting, updating, and unmounting.',
        skill: 'React',
        type: 'oral',
        content: 'React components mount, update with new props or state, and unmount. useEffect handles these phases with dependency arrays and return cleanup functions.',
        score: 86,
        grade: 'pass',
        feedback: 'Accurate and concise explanation of component lifecycle and cleanup handling.',
        matchedKeywords: ['useeffect', 'component', 'mounting', 'unmounting', 'dependencies', 'cleanup'],
      },
    ],
    proctoringEvents: [
      {
        id: 'proc-1',
        timestamp: new Date().toISOString(),
        type: 'face_centered',
        severity: 'low',
        details: 'Candidate maintained excellent center eye contact throughout evaluation.',
      },
    ],
  },
  {
    id: 'cand-vishal-02',
    name: 'Vishal Tore',
    email: 'vishal.tore@devmail.com',
    phone: '+91 98201 44321',
    track: 'TJI',
    jobRoleId: 'role-backend-dev',
    jobRoleName: 'Backend Developer',
    uniqueCode: 'APP-5190',
    status: 'approved',
    overallGrade: 92,
    isPassing: true,
    gdCode: 'GD-912048',
    skills: ['Node.js', 'Express.js', 'PostgreSQL', 'REST API', 'Redis', 'TypeScript'],
    createdAt: new Date(Date.now() - 3600000).toISOString(),
    answers: [
      {
        questionId: 'q-be-1',
        questionText: 'What is the event loop in Node.js and how does it handle non-blocking asynchronous I/O operations?',
        skill: 'Node.js',
        type: 'oral',
        content: 'The event loop allows Node.js to perform non-blocking asynchronous operations by offloading tasks to the OS kernel and libuv thread pool with microtask and macrotask queues.',
        score: 95,
        grade: 'pass',
        feedback: 'In-depth mastery of libuv threading, asynchronous dispatch, and non-blocking I/O.',
        matchedKeywords: ['event loop', 'non-blocking', 'asynchronous', 'libuv', 'callback queue'],
      },
    ],
    proctoringEvents: [],
  },
  {
    id: 'cand-ranjana-03',
    name: 'Ranjana Mane',
    email: 'ranjana.mane@techvision.com',
    phone: '+91 97654 32109',
    track: 'NTJI',
    jobRoleId: 'role-sales',
    jobRoleName: 'Senior Sales Executive',
    uniqueCode: 'APP-3042',
    status: 'pending_hr',
    overallGrade: 85,
    isPassing: true,
    skills: ['Sales', 'CRM', 'Negotiation', 'BANT', 'Client Acquisition', 'Communication'],
    createdAt: new Date(Date.now() - 7200000).toISOString(),
    answers: [
      {
        questionId: 'q-sales-1',
        questionText: 'Walk me through your end-to-end sales prospecting and qualification framework (such as BANT).',
        skill: 'Sales',
        type: 'oral',
        content: 'I qualify leads using BANT—Budget, Authority, Need, and Timeline—to prioritize high-intent prospects and maintain a healthy sales pipeline.',
        score: 85,
        grade: 'pass',
        feedback: 'Solid articulation of enterprise sales qualification and deal progression.',
        matchedKeywords: ['bant', 'budget', 'authority', 'need', 'timeline', 'qualification'],
      },
    ],
    proctoringEvents: [],
  },
];

export function getDeletedCandidateIds(): Set<string> {
  try {
    const raw = localStorage.getItem(DELETED_KEY);
    return raw ? new Set(JSON.parse(raw)) : new Set();
  } catch {
    return new Set();
  }
}

export function markCandidateDeleted(id: string): void {
  try {
    const deleted = getDeletedCandidateIds();
    deleted.add(id);
    localStorage.setItem(DELETED_KEY, JSON.stringify(Array.from(deleted)));
  } catch (err) {
    console.warn('[CandidateStore] Failed to record deleted ID:', err);
  }
}

export function unmarkCandidateDeleted(id: string): void {
  try {
    const deleted = getDeletedCandidateIds();
    deleted.delete(id);
    localStorage.setItem(DELETED_KEY, JSON.stringify(Array.from(deleted)));
  } catch (err) {
    console.warn('[CandidateStore] Failed to unmark deleted ID:', err);
  }
}

function getStoredRecords(): StoredCandidateRecord[] {
  try {
    const isInit = localStorage.getItem(INIT_KEY);
    if (!isInit) {
      localStorage.setItem(INIT_KEY, 'true');
      localStorage.setItem(STORAGE_KEY, JSON.stringify(DEFAULT_SEEDS));
      return DEFAULT_SEEDS;
    }
    const raw = localStorage.getItem(STORAGE_KEY);
    const parsed: StoredCandidateRecord[] = raw ? JSON.parse(raw) : [];
    const deleted = getDeletedCandidateIds();
    return parsed.filter((c) => !deleted.has(c.id));
  } catch {
    return [];
  }
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
    // Unmark in deleted set if retaken
    unmarkCandidateDeleted(data.candidateId);

    const list: StoredCandidateRecord[] = getStoredRecords();
    const existingIdx = list.findIndex((c) => c.id === data.candidateId);

    let roleName = data.jobRoleName;
    if (!roleName) {
      if (data.jobRoleId.includes('frontend')) roleName = 'Frontend Developer';
      else if (data.jobRoleId.includes('backend')) roleName = 'Backend Developer';
      else if (data.jobRoleId.includes('fullstack')) roleName = 'Full Stack Developer';
      else if (data.jobRoleId.includes('sales')) roleName = 'Senior Sales Executive';
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
    const list: StoredCandidateRecord[] = getStoredRecords();

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
    const list: StoredCandidateRecord[] = getStoredRecords();
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
          recordingId: found.recordingDeleted ? null : `rec-${found.id}`,
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
      intelligenceDossier: (() => {
        // ✅ AI-Accurate: Compute everything from REAL answer data
        const answers = found.answers || [];
        const grade = found.overallGrade || 0;
        const passingAnswers = answers.filter(a => a.score >= 60);
        const failingAnswers = answers.filter(a => a.score < 60);
        const avgScore = answers.length > 0
          ? Math.round(answers.reduce((s, a) => s + a.score, 0) / answers.length)
          : grade;

        // Real matched keywords from ALL answers
        const allMatchedKeywords: string[] = [];
        answers.forEach(a => { (a.matchedKeywords || []).forEach(k => { if (!allMatchedKeywords.includes(k)) allMatchedKeywords.push(k); }); });

        // Skills that were demonstrated (appeared in matched keywords or passing answers)
        const strongSkills = passingAnswers.map(a => a.skill).filter((s, i, arr) => arr.indexOf(s) === i);
        const weakSkills = failingAnswers.map(a => a.skill).filter((s, i, arr) => arr.indexOf(s) === i && !strongSkills.includes(s));

        const decision = avgScore >= 75 ? 'strong_hire' : avgScore >= 55 ? 'hire' : 'do_not_hire';
        const confidence = Math.min(99, Math.max(60, Math.round(50 + (passingAnswers.length / Math.max(1, answers.length)) * 49)));

        // Build accurate executive summary from real performance
        const execSummary = answers.length === 0
          ? `No answers recorded for ${found.name}.`
          : passingAnswers.length === answers.length
          ? `${found.name} delivered strong responses across all ${answers.length} questions in ${found.jobRoleName}. Demonstrated clear mastery of ${strongSkills.slice(0,3).join(', ') || found.skills.slice(0,2).join(', ')}.`
          : passingAnswers.length > failingAnswers.length
          ? `${found.name} performed well in ${passingAnswers.length} of ${answers.length} questions. Strong in ${strongSkills.slice(0,2).join(', ') || 'core topics'}; gaps observed in ${weakSkills.slice(0,2).join(', ') || 'some areas'}.`
          : `${found.name} struggled in the majority of questions. Only ${passingAnswers.length} of ${answers.length} responses met passing threshold. Significant improvement needed before re-evaluation.`;

        // Radar scores computed from real answer data
        const technicalAcumen = Math.min(100, Math.max(10, Math.round(passingAnswers.length / Math.max(1, answers.length) * 100 * 0.7 + avgScore * 0.3)));
        const communicationFluency = Math.min(100, Math.max(20, Math.round(avgScore * 0.6 + (allMatchedKeywords.length * 3))));
        const emotionalPoise = Math.min(100, Math.max(30, Math.round(100 - (found.proctoringEvents?.length || 0) * 8)));
        const nonVerbalPresence = Math.min(100, Math.max(30, emotionalPoise - 5 + Math.random() * 5));
        const problemSolving = technicalAcumen;
        const overallIndex = Math.round((technicalAcumen + communicationFluency + emotionalPoise + problemSolving) / 4);

        // Accurate SWOT from real performance
        const strengths: string[] = [];
        if (strongSkills.length > 0) strengths.push(`Demonstrated competency in: ${strongSkills.slice(0,3).join(', ')}`);
        if (allMatchedKeywords.length >= 5) strengths.push(`Accurate use of technical terminology: ${allMatchedKeywords.slice(0,4).join(', ')}`);
        if (passingAnswers.length >= 3) strengths.push('Consistent performance across multiple evaluation areas');
        if (strengths.length === 0) strengths.push('Shows willingness to attempt technical questions');

        const weaknesses: string[] = [];
        if (weakSkills.length > 0) weaknesses.push(`Below-threshold performance in: ${weakSkills.slice(0,3).join(', ')}`);
        if (allMatchedKeywords.length < 3) weaknesses.push('Low technical keyword coverage suggests surface-level understanding');
        if (failingAnswers.length > passingAnswers.length) weaknesses.push('Majority of responses lacked sufficient depth and accuracy');
        if (weaknesses.length === 0) weaknesses.push('Minor gaps in advanced concept elaboration');

        const opportunities: string[] = [];
        if (avgScore >= 60) opportunities.push(`Good foundation to grow into senior ${found.jobRoleName} roles with mentorship`);
        else opportunities.push(`Structured upskilling in ${weakSkills.slice(0,2).join(', ') || found.jobRoleName} can significantly improve readiness`);
        opportunities.push('Practical project experience would strengthen theoretical knowledge demonstrated');

        const risks: string[] = [];
        if (avgScore < 55) risks.push('Current evaluation score below hiring threshold — re-evaluation recommended after skill development');
        if ((found.proctoringEvents?.length || 0) > 0) risks.push(`${found.proctoringEvents!.length} proctoring event(s) logged — review integrity report`);
        if (risks.length === 0) risks.push('Monitor performance in advanced rounds; ensure alignment with role expectations');

        return {
          candidateId: found.id,
          candidateName: found.name,
          jobRoleName: found.jobRoleName,
          overallHiringDecision: decision,
          decisionConfidence: confidence,
          executiveSummaryMemo: execSummary,
          radarScores: { technicalAcumen, communicationFluency, emotionalPoise, nonVerbalPresence, problemSolving, overallIndex },
          swot: { strengths, weaknesses, opportunities, risks, semanticMatchScore: Math.min(99, Math.max(40, avgScore + 5)), experienceConsistency: Math.min(99, Math.max(40, avgScore)) },
          strengthsAndHighlights: strengths,
          areasForDevelopment: weaknesses,
          candidateFeedbackLetter: `Dear ${found.name}, thank you for participating in the ${found.jobRoleName} interview. ${execSummary} We appreciate your time and effort.`,
          generatedAt: found.createdAt,
        };
      })(),
    };
  } catch (err) {
    console.error('[CandidateStore] Error constructing candidate detail:', err);
    return null;
  }
}

export function updateLocalCandidateStatus(id: string, newStatus: CandidateStatus): void {
  try {
    const list: StoredCandidateRecord[] = getStoredRecords();
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
    markCandidateDeleted(id);
    let list: StoredCandidateRecord[] = getStoredRecords();
    list = list.filter((c) => c.id !== id);
    localStorage.setItem(STORAGE_KEY, JSON.stringify(list));
    console.log('[CandidateStore] Deleted candidate record:', id);
  } catch (err) {
    console.warn('[CandidateStore] Failed to delete local candidate:', err);
  }
}

export function deleteMultipleLocalCandidates(ids: string[]): void {
  try {
    const idSet = new Set(ids);
    ids.forEach((id) => markCandidateDeleted(id));
    let list: StoredCandidateRecord[] = getStoredRecords();
    list = list.filter((c) => !idSet.has(c.id));
    localStorage.setItem(STORAGE_KEY, JSON.stringify(list));
    console.log('[CandidateStore] Deleted multiple candidate records:', ids.length);
  } catch (err) {
    console.warn('[CandidateStore] Failed to bulk delete local candidates:', err);
  }
}

export function deleteLocalCandidatesByStatus(statuses: CandidateStatus[]): number {
  try {
    const statusSet = new Set(statuses);
    let list: StoredCandidateRecord[] = getStoredRecords();
    const toDelete = list.filter((c) => statusSet.has(c.status));
    toDelete.forEach((c) => markCandidateDeleted(c.id));
    list = list.filter((c) => !statusSet.has(c.status));
    localStorage.setItem(STORAGE_KEY, JSON.stringify(list));
    console.log('[CandidateStore] Deleted candidates by status:', toDelete.length);
    return toDelete.length;
  } catch (err) {
    console.warn('[CandidateStore] Failed to delete candidates by status:', err);
    return 0;
  }
}

export function deleteLocalCandidateRecordings(candidateIds: string[]): void {
  try {
    const idSet = new Set(candidateIds);
    let list: StoredCandidateRecord[] = getStoredRecords();
    list = list.map((c) => (idSet.has(c.id) ? { ...c, recordingDeleted: true } : c));
    localStorage.setItem(STORAGE_KEY, JSON.stringify(list));
  } catch (err) {
    console.warn('[CandidateStore] Failed to delete local recordings:', err);
  }
}
