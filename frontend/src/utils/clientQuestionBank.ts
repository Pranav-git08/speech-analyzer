import { Question, EvaluationResult, RoundType } from '../types';

export interface LocalQuestionBankEntry {
  id: string;
  roleId: string;
  type: 'oral' | 'code_snippet';
  text: string;
  skill: string;
  expectedAnswer: string;
  expectedKeywords: string[];
  codeTemplate?: string;
  language?: string;
}

export const LOCAL_QUESTION_BANK: LocalQuestionBankEntry[] = [
  // ── Frontend Developer ───────────────────────────────────────────────────
  {
    id: 'q-fe-1',
    roleId: 'role-frontend-dev',
    type: 'oral',
    skill: 'HTML',
    text: 'What are semantic HTML tags and why are they important for accessibility and SEO?',
    expectedAnswer: 'Semantic HTML tags like header, nav, main, article, and footer clearly describe their meaning to both the browser and the developer, improving accessibility and SEO ranking.',
    expectedKeywords: ['semantic', 'accessibility', 'seo', 'header', 'nav', 'main', 'footer', 'screen reader'],
  },
  {
    id: 'q-fe-2',
    roleId: 'role-frontend-dev',
    type: 'oral',
    skill: 'CSS',
    text: 'Explain the difference between CSS Flexbox and CSS Grid layout models and when to use each.',
    expectedAnswer: 'Flexbox is one-dimensional (row or column) suited for linear components like navbars, while Grid is two-dimensional (rows and columns) suited for page-level layouts.',
    expectedKeywords: ['flexbox', 'grid', 'one-dimensional', 'two-dimensional', 'layout', 'rows', 'columns'],
  },
  {
    id: 'q-fe-3',
    roleId: 'role-frontend-dev',
    type: 'oral',
    skill: 'JavaScript',
    text: 'What is the difference between synchronous and asynchronous execution in JavaScript? How do Promises work?',
    expectedAnswer: 'Synchronous execution blocks subsequent code execution until the current task finishes. Asynchronous execution allows tasks to execute in the background. Promises represent the eventual completion or failure of an asynchronous operation.',
    expectedKeywords: ['synchronous', 'asynchronous', 'promises', 'event loop', 'async/await', 'non-blocking'],
  },
  {
    id: 'q-fe-4',
    roleId: 'role-frontend-dev',
    type: 'oral',
    skill: 'React',
    text: 'Explain the React Component Lifecycle and how the useEffect hook handles mounting, updating, and unmounting.',
    expectedAnswer: 'React components mount, update, and unmount. useEffect handles these phases with dependency arrays and return cleanup functions.',
    expectedKeywords: ['useeffect', 'component', 'mounting', 'unmounting', 'dependencies', 'cleanup', 'state'],
  },
  {
    id: 'q-fe-5',
    roleId: 'role-frontend-dev',
    type: 'oral',
    skill: 'TypeScript',
    text: 'What are the main benefits of using TypeScript over JavaScript in modern frontend development?',
    expectedAnswer: 'TypeScript provides static type checking, early error detection at compile-time, improved IDE autocomplete, and maintainable self-documenting codebases.',
    expectedKeywords: ['static typing', 'type safety', 'compile-time', 'interfaces', 'types', 'refactoring'],
  },

  // ── Backend Developer ────────────────────────────────────────────────────
  {
    id: 'q-be-1',
    roleId: 'role-backend-dev',
    type: 'oral',
    skill: 'Node.js',
    text: 'What is the event loop in Node.js and how does it handle non-blocking asynchronous I/O operations?',
    expectedAnswer: 'The event loop allows Node.js to perform non-blocking asynchronous operations by offloading tasks to the OS kernel and using libuv thread pool with phase queues.',
    expectedKeywords: ['event loop', 'non-blocking', 'asynchronous', 'single-threaded', 'libuv', 'callback queue'],
  },
  {
    id: 'q-be-2',
    roleId: 'role-backend-dev',
    type: 'oral',
    skill: 'Express',
    text: 'What is middleware in Express.js and how does error-handling middleware work?',
    expectedAnswer: 'Middleware functions have access to req, res, and next. Error-handling middleware takes four arguments (err, req, res, next) and catches unhandled exceptions in the request pipeline.',
    expectedKeywords: ['middleware', 'request', 'response', 'next', 'error handling', 'pipeline'],
  },
  {
    id: 'q-be-3',
    roleId: 'role-backend-dev',
    type: 'oral',
    skill: 'REST API',
    text: 'What are idempotent HTTP methods in RESTful API design and why is idempotency critical for payment or order endpoints?',
    expectedAnswer: 'Idempotent methods like GET, PUT, and DELETE produce the same server state regardless of how many times they are executed, preventing duplicate charges or state corruption.',
    expectedKeywords: ['idempotent', 'get', 'put', 'delete', 'post', 'api design', 'duplicate requests'],
  },
  {
    id: 'q-be-4',
    roleId: 'role-backend-dev',
    type: 'oral',
    skill: 'PostgreSQL',
    text: 'What is database indexing and how do B-Tree indexes improve query performance in PostgreSQL and MySQL?',
    expectedAnswer: 'Indexes create balanced tree data structures on columns allowing logarithmic O(log n) lookups instead of sequential full table scans.',
    expectedKeywords: ['indexing', 'b-tree', 'query performance', 'table scan', 'lookup', 'execution plan'],
  },
  {
    id: 'q-be-5',
    roleId: 'role-backend-dev',
    type: 'oral',
    skill: 'TypeScript',
    text: 'How do you structure database models and DTO validation types using TypeScript generics and interfaces?',
    expectedAnswer: 'Using TypeScript interfaces and generics allows strong typing across controller inputs, service business logic, and database schemas with compile-time verification.',
    expectedKeywords: ['generics', 'interfaces', 'dto', 'validation', 'type safety', 'models'],
  },

  // ── Full Stack Developer ─────────────────────────────────────────────────
  {
    id: 'q-fs-1',
    roleId: 'role-fullstack-dev',
    type: 'oral',
    skill: 'React',
    text: 'How do you manage client-side state in React and synchronize it with backend REST API responses?',
    expectedAnswer: 'Using tools like React Query, Context API, or Redux with asynchronous thunks and optimistic UI updates.',
    expectedKeywords: ['state management', 'rest api', 'react query', 'context', 'redux', 'async'],
  },
  {
    id: 'q-fs-2',
    roleId: 'role-fullstack-dev',
    type: 'oral',
    skill: 'Node.js',
    text: 'How do you secure user authentication and authorization across full-stack applications using JWT or session cookies?',
    expectedAnswer: 'Using signed HTTP-only cookies with JWT tokens, password hashing with bcrypt, CORS configuration, and role-based middleware.',
    expectedKeywords: ['jwt', 'authentication', 'http-only', 'bcrypt', 'cors', 'authorization'],
  },

  // ── Sales Executive (NTJI) ───────────────────────────────────────────────
  {
    id: 'q-sales-1',
    roleId: 'role-sales',
    type: 'oral',
    skill: 'Sales',
    text: 'Walk me through your end-to-end sales prospecting and qualification framework (such as BANT).',
    expectedAnswer: 'I qualify leads using BANT (Budget, Authority, Need, Timeline) to identify high-intent prospects, tailor personalized value propositions, and progress them through the sales pipeline.',
    expectedKeywords: ['bant', 'budget', 'authority', 'need', 'timeline', 'qualification', 'prospecting', 'pipeline'],
  },
  {
    id: 'q-sales-2',
    roleId: 'role-sales',
    type: 'oral',
    skill: 'Negotiation',
    text: 'How do you handle severe price objections from high-value enterprise clients without immediately discounting your product?',
    expectedAnswer: 'I refocus the conversation on ROI, business impact, and risk reduction, exploring flexible contract terms or multi-year value rather than sacrificing margin through discounting.',
    expectedKeywords: ['objection handling', 'roi', 'value proposition', 'margin', 'pricing', 'contracts', 'negotiation'],
  },
  {
    id: 'q-sales-3',
    roleId: 'role-sales',
    type: 'oral',
    skill: 'CRM',
    text: 'How do you leverage CRM systems like Salesforce or HubSpot to track lead stages and forecast quarterly revenue?',
    expectedAnswer: 'I maintain accurate pipeline deal stages, log touchpoints, monitor conversion velocities, and use CRM reporting dashboards for precise quota forecasting.',
    expectedKeywords: ['crm', 'salesforce', 'hubspot', 'pipeline', 'stages', 'forecasting', 'conversion', 'leads'],
  },
  {
    id: 'q-sales-4',
    roleId: 'role-sales',
    type: 'oral',
    skill: 'Communication',
    text: 'Describe a situation where you had to present a complex technical proposal to non-technical C-suite stakeholders.',
    expectedAnswer: 'I translated technical specifications into clear business outcomes, financial ROI, and competitive advantages, keeping the presentation concise and engaging.',
    expectedKeywords: ['stakeholders', 'c-suite', 'presentation', 'business outcomes', 'roi', 'communication'],
  },

  // ── HR Executive (NTJI) ──────────────────────────────────────────────────
  {
    id: 'q-hr-1',
    roleId: 'role-hr-executive',
    type: 'oral',
    skill: 'Recruitment',
    text: 'What sourcing strategies and candidate assessment pipelines do you use to fill niche technical roles?',
    expectedAnswer: 'I use direct LinkedIn sourcing, talent communities, structured competency-based interviewing, and candidate scorecards to ensure quality hires.',
    expectedKeywords: ['sourcing', 'talent acquisition', 'linkedin', 'competency', 'interviewing', 'pipeline'],
  },
  {
    id: 'q-hr-2',
    roleId: 'role-hr-executive',
    type: 'oral',
    skill: 'HR Policies',
    text: 'How do you handle workplace conflict resolution between employees while maintaining statutory compliance and employee trust?',
    expectedAnswer: 'I conduct neutral private discovery sessions, refer to company policy and labor standards, establish clear behavioral milestones, and follow up periodically.',
    expectedKeywords: ['conflict resolution', 'compliance', 'investigation', 'policy', 'employee relations', 'neutral'],
  },
];

export function getLocalQuestionsForRole(
  roleId: string,
  matchedSkills: string[],
  _roundType: RoundType = 'technical',
  count: number = 5
): Question[] {
  const normSkills = new Set((matchedSkills || []).map((s) => s.toLowerCase().trim()));

  // 1. Filter by role and matched skills
  let eligible = LOCAL_QUESTION_BANK.filter(
    (q) => (q.roleId === roleId || roleId.includes(q.roleId)) && (normSkills.size === 0 || normSkills.has(q.skill.toLowerCase().trim()))
  );

  // 2. If skill filter is empty, fallback to all role questions
  if (eligible.length === 0) {
    eligible = LOCAL_QUESTION_BANK.filter((q) => q.roleId === roleId || roleId.includes(q.roleId));
  }

  // 3. Global fallback
  if (eligible.length === 0) {
    eligible = LOCAL_QUESTION_BANK.slice(0, 5);
  }

  const selected = eligible.slice(0, count);

  return selected.map((q) => ({
    id: q.id,
    type: q.type,
    text: q.text,
    skill: q.skill,
    codeTemplate: q.codeTemplate,
    language: q.language,
  }));
}

export function evaluateLocalAnswer(
  question: Question,
  candidateAnswer: string,
  _durationSec: number = 30
): EvaluationResult {
  const text = (candidateAnswer || '').toLowerCase();
  
  // Look up expected keywords from bank entry
  const bankEntry = LOCAL_QUESTION_BANK.find((q) => q.id === question.id);
  const keywords: string[] = bankEntry ? bankEntry.expectedKeywords : [question.skill];

  const matchedKeywords = keywords.filter((kw: string) => text.includes(kw.toLowerCase().trim()));
  const keywordRatio = keywords.length > 0 ? matchedKeywords.length / keywords.length : 0.7;

  const words = text.trim().split(/\s+/).filter(Boolean).length;

  // Extremely strict gate: If they didn't even say 5 words, or they missed almost all keywords, fail them hard.
  if (words < 5 || keywordRatio < 0.2) {
    const penaltyScore = Math.max(10, Math.round(keywordRatio * 50)); 
    return {
      questionId: question.id,
      grade: 'poor',
      score: penaltyScore,
      matchedKeywords: matchedKeywords.length > 0 ? matchedKeywords : [],
      feedback: `Answer is irrelevant, nonsensical, or too short. Did not cover key concepts.`,
    };
  }

  const lengthScore = Math.min(100, Math.round((words / 35) * 100));

  const technicalAccuracy = Math.min(100, Math.round(keywordRatio * 75 + (lengthScore > 40 ? 25 : 10)));
  const communicationClarity = Math.min(100, Math.round(60 + (words > 15 ? 30 : 10) + Math.random() * 10));
  const relevance = Math.min(100, Math.round(keywordRatio * 60 + 40));

  // ✅ STRICT: No minimum floor — candidate must actually match keywords to score well
  const rawScore = Math.round(technicalAccuracy * 0.6 + communicationClarity * 0.2 + relevance * 0.2);
  const score = matchedKeywords.length === 0 ? Math.min(20, rawScore) : Math.max(10, Math.min(100, rawScore));

  return {
    questionId: question.id,
    grade: score >= 60 ? 'pass' : 'poor',
    score,
    matchedKeywords: matchedKeywords.length > 0 ? matchedKeywords : [question.skill],
    feedback: matchedKeywords.length >= 3
      ? `Strong answer. Matched ${matchedKeywords.length}/${keywords.length} key concepts: ${matchedKeywords.join(', ')}. Word depth: ${words} words.`
      : matchedKeywords.length > 0
      ? `Partial coverage. Only matched ${matchedKeywords.length}/${keywords.length} keywords (${matchedKeywords.join(', ')}). Missing: ${keywords.filter(k => !matchedKeywords.includes(k)).slice(0, 3).join(', ')}.`
      : `Answer does not cover required concepts. Expected: ${keywords.slice(0, 4).join(', ')}. Word count: ${words}.`,
  };
}
