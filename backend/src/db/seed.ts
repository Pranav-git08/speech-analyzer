/**
 * Seed the SQLite database with job roles and question banks.
 * Safe to run multiple times — uses INSERT OR IGNORE.
 */
import { query } from './connection';
import { v4 as uuidv4 } from 'uuid';

// ─── Question bank IDs ────────────────────────────────────────────────────────

const QB_BACKEND   = 'qb-backend-dev';
const QB_FRONTEND  = 'qb-frontend-dev';
const QB_FULLSTACK = 'qb-fullstack-dev';
const QB_HR_EXEC   = 'qb-hr-executive';
const QB_MARKETING = 'qb-marketing';
const QB_SALES     = 'qb-sales';

// ─── Job Roles ────────────────────────────────────────────────────────────────

const JOB_ROLES = [
  // TJI
  {
    id: 'role-backend-dev',
    name: 'Backend Developer',
    track: 'TJI',
    required_skills: JSON.stringify(['Node.js', 'Express', 'PostgreSQL', 'REST API', 'TypeScript']),
    question_bank_id: QB_BACKEND,
  },
  {
    id: 'role-frontend-dev',
    name: 'Frontend Developer',
    track: 'TJI',
    required_skills: JSON.stringify(['React', 'TypeScript', 'CSS', 'HTML', 'JavaScript']),
    question_bank_id: QB_FRONTEND,
  },
  {
    id: 'role-fullstack-dev',
    name: 'Full Stack Developer',
    track: 'TJI',
    required_skills: JSON.stringify(['React', 'Node.js', 'PostgreSQL', 'TypeScript', 'REST API']),
    question_bank_id: QB_FULLSTACK,
  },
  // NTJI
  {
    id: 'role-hr-executive',
    name: 'HR Executive',
    track: 'NTJI',
    required_skills: JSON.stringify(['Recruitment', 'Communication', 'HR Policies', 'Onboarding']),
    question_bank_id: QB_HR_EXEC,
  },
  {
    id: 'role-marketing',
    name: 'Marketing Executive',
    track: 'NTJI',
    required_skills: JSON.stringify(['Digital Marketing', 'SEO', 'Content Writing', 'Social Media']),
    question_bank_id: QB_MARKETING,
  },
  {
    id: 'role-sales',
    name: 'Sales Executive',
    track: 'NTJI',
    required_skills: JSON.stringify(['Sales', 'Communication', 'Negotiation', 'CRM']),
    question_bank_id: QB_SALES,
  },
];

// ─── Questions ────────────────────────────────────────────────────────────────

const QUESTIONS = [
  // ── Backend Developer ──────────────────────────────────────────────────────
  {
    id: uuidv4(), question_bank_id: QB_BACKEND, type: 'oral', skill: 'Node.js',
    text: 'What is the event loop in Node.js and how does it work?',
    expected_answer: 'The event loop is a mechanism that allows Node.js to perform non-blocking I/O operations by offloading operations to the system kernel whenever possible.',
    expected_keywords: JSON.stringify(['event loop', 'non-blocking', 'I/O', 'asynchronous', 'callback', 'single thread']),
  },
  {
    id: uuidv4(), question_bank_id: QB_BACKEND, type: 'oral', skill: 'Node.js',
    text: 'Explain the difference between process.nextTick() and setImmediate().',
    expected_answer: 'process.nextTick() fires before any I/O events, while setImmediate() fires in the check phase of the event loop after I/O events.',
    expected_keywords: JSON.stringify(['nextTick', 'setImmediate', 'event loop', 'I/O', 'phase', 'microtask']),
  },
  {
    id: uuidv4(), question_bank_id: QB_BACKEND, type: 'oral', skill: 'Express',
    text: 'What is middleware in Express.js and how do you use it?',
    expected_answer: 'Middleware are functions that have access to the request and response objects and the next middleware function. They can execute code, modify req/res, end the cycle, or call next().',
    expected_keywords: JSON.stringify(['middleware', 'request', 'response', 'next', 'function', 'pipeline']),
  },
  {
    id: uuidv4(), question_bank_id: QB_BACKEND, type: 'oral', skill: 'REST API',
    text: 'What are the HTTP methods used in REST APIs and when do you use each?',
    expected_answer: 'GET retrieves data, POST creates resources, PUT replaces resources, PATCH partially updates, DELETE removes resources.',
    expected_keywords: JSON.stringify(['GET', 'POST', 'PUT', 'PATCH', 'DELETE', 'idempotent', 'resource']),
  },
  {
    id: uuidv4(), question_bank_id: QB_BACKEND, type: 'oral', skill: 'PostgreSQL',
    text: 'What is the difference between INNER JOIN and LEFT JOIN in SQL?',
    expected_answer: 'INNER JOIN returns only matching rows from both tables. LEFT JOIN returns all rows from the left table and matching rows from the right, with NULLs for non-matches.',
    expected_keywords: JSON.stringify(['INNER JOIN', 'LEFT JOIN', 'matching', 'NULL', 'rows', 'tables']),
  },
  {
    id: uuidv4(), question_bank_id: QB_BACKEND, type: 'oral', skill: 'TypeScript',
    text: 'What are TypeScript generics and why are they useful?',
    expected_answer: 'Generics allow you to write reusable, type-safe code that works with multiple types without sacrificing type checking.',
    expected_keywords: JSON.stringify(['generics', 'type-safe', 'reusable', 'type parameter', 'constraint']),
  },
  {
    id: uuidv4(), question_bank_id: QB_BACKEND, type: 'code_snippet', skill: 'Node.js',
    text: 'Fix the following async function that should fetch user data but has a bug:\n\nasync function getUser(id) {\n  const user = fetchUser(id);\n  return user.name;\n}',
    expected_answer: 'async function getUser(id) {\n  const user = await fetchUser(id);\n  return user.name;\n}',
    expected_keywords: JSON.stringify(['await', 'async', 'Promise']),
    code_template: 'async function getUser(id) {\n  const user = fetchUser(id);\n  return user.name;\n}',
    language: 'javascript',
  },
  {
    id: uuidv4(), question_bank_id: QB_BACKEND, type: 'code_snippet', skill: 'TypeScript',
    text: 'Fix the TypeScript function below so it correctly types the return value:\n\nfunction add(a: number, b: number) {\n  return a + b;\n}\nconst result: string = add(1, 2);',
    expected_answer: 'const result: number = add(1, 2);',
    expected_keywords: JSON.stringify(['number', 'type', 'return type']),
    code_template: 'function add(a: number, b: number) {\n  return a + b;\n}\nconst result: string = add(1, 2);',
    language: 'typescript',
  },

  // ── Frontend Developer ─────────────────────────────────────────────────────
  {
    id: uuidv4(), question_bank_id: QB_FRONTEND, type: 'oral', skill: 'React',
    text: 'What is the difference between state and props in React?',
    expected_answer: 'Props are read-only inputs passed from parent to child. State is mutable data managed within a component that triggers re-renders when changed.',
    expected_keywords: JSON.stringify(['props', 'state', 'immutable', 'mutable', 'parent', 'child', 're-render']),
  },
  {
    id: uuidv4(), question_bank_id: QB_FRONTEND, type: 'oral', skill: 'React',
    text: 'Explain the useEffect hook and when you would use it.',
    expected_answer: 'useEffect runs side effects after render. It replaces componentDidMount, componentDidUpdate, and componentWillUnmount. The dependency array controls when it re-runs.',
    expected_keywords: JSON.stringify(['useEffect', 'side effect', 'dependency array', 'cleanup', 'render', 'lifecycle']),
  },
  {
    id: uuidv4(), question_bank_id: QB_FRONTEND, type: 'oral', skill: 'JavaScript',
    text: 'What is the difference between == and === in JavaScript?',
    expected_answer: '== performs type coercion before comparison. === checks both value and type without coercion.',
    expected_keywords: JSON.stringify(['type coercion', 'strict equality', 'loose equality', 'type', 'value']),
  },
  {
    id: uuidv4(), question_bank_id: QB_FRONTEND, type: 'oral', skill: 'CSS',
    text: 'What is the CSS box model?',
    expected_answer: 'The box model describes how elements are rendered: content, padding, border, and margin from inside out.',
    expected_keywords: JSON.stringify(['content', 'padding', 'border', 'margin', 'box model', 'width', 'height']),
  },
  {
    id: uuidv4(), question_bank_id: QB_FRONTEND, type: 'oral', skill: 'TypeScript',
    text: 'What is the difference between interface and type in TypeScript?',
    expected_answer: 'Both define shapes of objects. Interfaces are extendable and support declaration merging. Types are more flexible and can represent unions, intersections, and primitives.',
    expected_keywords: JSON.stringify(['interface', 'type', 'extends', 'union', 'intersection', 'declaration merging']),
  },
  {
    id: uuidv4(), question_bank_id: QB_FRONTEND, type: 'code_snippet', skill: 'React',
    text: 'Fix the React component below — it should display the count and increment it on button click:\n\nfunction Counter() {\n  const count = 0;\n  return <button onClick={() => count++}>{count}</button>;\n}',
    expected_answer: 'function Counter() {\n  const [count, setCount] = useState(0);\n  return <button onClick={() => setCount(count + 1)}>{count}</button>;\n}',
    expected_keywords: JSON.stringify(['useState', 'setCount', 'state', 'hook']),
    code_template: 'function Counter() {\n  const count = 0;\n  return <button onClick={() => count++}>{count}</button>;\n}',
    language: 'typescript',
  },

  // ── Full Stack Developer ───────────────────────────────────────────────────
  {
    id: uuidv4(), question_bank_id: QB_FULLSTACK, type: 'oral', skill: 'React',
    text: 'How do you manage global state in a React application?',
    expected_answer: 'Options include React Context API for simple cases, Redux or Zustand for complex state, and React Query for server state.',
    expected_keywords: JSON.stringify(['Context API', 'Redux', 'Zustand', 'global state', 'provider', 'store']),
  },
  {
    id: uuidv4(), question_bank_id: QB_FULLSTACK, type: 'oral', skill: 'Node.js',
    text: 'How do you handle errors in an Express.js application?',
    expected_answer: 'Use try/catch in async handlers, pass errors to next(err), and define a global error-handling middleware with four parameters (err, req, res, next).',
    expected_keywords: JSON.stringify(['try/catch', 'next', 'error middleware', 'async', 'status code']),
  },
  {
    id: uuidv4(), question_bank_id: QB_FULLSTACK, type: 'oral', skill: 'PostgreSQL',
    text: 'What is database indexing and why is it important?',
    expected_answer: 'An index is a data structure that speeds up data retrieval. It improves query performance but adds overhead to writes.',
    expected_keywords: JSON.stringify(['index', 'query performance', 'B-tree', 'read', 'write overhead', 'lookup']),
  },
  {
    id: uuidv4(), question_bank_id: QB_FULLSTACK, type: 'oral', skill: 'REST API',
    text: 'What is the difference between authentication and authorisation?',
    expected_answer: 'Authentication verifies who you are (identity). Authorisation determines what you are allowed to do (permissions).',
    expected_keywords: JSON.stringify(['authentication', 'authorisation', 'identity', 'permissions', 'JWT', 'token']),
  },
  {
    id: uuidv4(), question_bank_id: QB_FULLSTACK, type: 'code_snippet', skill: 'Node.js',
    text: 'Fix the Express route below — it should return a 404 when the user is not found:\n\napp.get("/user/:id", async (req, res) => {\n  const user = await findUser(req.params.id);\n  res.json(user);\n});',
    expected_answer: 'app.get("/user/:id", async (req, res) => {\n  const user = await findUser(req.params.id);\n  if (!user) return res.status(404).json({ error: "Not found" });\n  res.json(user);\n});',
    expected_keywords: JSON.stringify(['404', 'status', 'not found', 'if', 'null check']),
    code_template: 'app.get("/user/:id", async (req, res) => {\n  const user = await findUser(req.params.id);\n  res.json(user);\n});',
    language: 'javascript',
  },

  // ── HR Executive ───────────────────────────────────────────────────────────
  {
    id: uuidv4(), question_bank_id: QB_HR_EXEC, type: 'oral', skill: 'Recruitment',
    text: 'Describe your end-to-end recruitment process for a new position.',
    expected_answer: 'Define job requirements, post on job boards, screen resumes, conduct interviews, check references, make offer, onboard.',
    expected_keywords: JSON.stringify(['job description', 'screening', 'interview', 'offer', 'onboarding', 'pipeline']),
  },
  {
    id: uuidv4(), question_bank_id: QB_HR_EXEC, type: 'oral', skill: 'Communication',
    text: 'How do you handle a conflict between two employees?',
    expected_answer: 'Listen to both parties separately, identify the root cause, mediate a discussion, agree on a resolution, and follow up.',
    expected_keywords: JSON.stringify(['listen', 'mediate', 'conflict resolution', 'neutral', 'follow up', 'communication']),
  },
  {
    id: uuidv4(), question_bank_id: QB_HR_EXEC, type: 'oral', skill: 'HR Policies',
    text: 'What are the key components of an employee performance review?',
    expected_answer: 'Goal setting, self-assessment, manager feedback, competency evaluation, development plan, and rating.',
    expected_keywords: JSON.stringify(['goals', 'feedback', 'performance', 'competency', 'development', 'rating']),
  },
  {
    id: uuidv4(), question_bank_id: QB_HR_EXEC, type: 'oral', skill: 'Onboarding',
    text: 'What does an effective employee onboarding programme include?',
    expected_answer: 'Orientation, role-specific training, introduction to team and culture, access setup, 30/60/90 day goals, and a buddy system.',
    expected_keywords: JSON.stringify(['orientation', 'training', 'culture', 'goals', 'buddy', 'integration']),
  },

  // ── Marketing Executive ────────────────────────────────────────────────────
  {
    id: uuidv4(), question_bank_id: QB_MARKETING, type: 'oral', skill: 'Digital Marketing',
    text: 'What metrics do you track to measure the success of a digital marketing campaign?',
    expected_answer: 'CTR, conversion rate, CPA, ROAS, impressions, engagement rate, and ROI.',
    expected_keywords: JSON.stringify(['CTR', 'conversion rate', 'CPA', 'ROAS', 'ROI', 'engagement', 'impressions']),
  },
  {
    id: uuidv4(), question_bank_id: QB_MARKETING, type: 'oral', skill: 'SEO',
    text: 'What is the difference between on-page and off-page SEO?',
    expected_answer: 'On-page SEO involves optimising content, meta tags, and site structure. Off-page SEO involves backlinks, social signals, and external authority.',
    expected_keywords: JSON.stringify(['on-page', 'off-page', 'backlinks', 'meta tags', 'content', 'authority', 'keywords']),
  },
  {
    id: uuidv4(), question_bank_id: QB_MARKETING, type: 'oral', skill: 'Content Writing',
    text: 'How do you tailor content for different stages of the marketing funnel?',
    expected_answer: 'Top of funnel: awareness content (blogs, social). Middle: consideration content (case studies, webinars). Bottom: decision content (demos, testimonials).',
    expected_keywords: JSON.stringify(['funnel', 'awareness', 'consideration', 'decision', 'blog', 'case study', 'testimonial']),
  },
  {
    id: uuidv4(), question_bank_id: QB_MARKETING, type: 'oral', skill: 'Social Media',
    text: 'How do you develop a social media content calendar?',
    expected_answer: 'Define goals, identify target audience, choose platforms, plan content themes, schedule posts, and track performance.',
    expected_keywords: JSON.stringify(['content calendar', 'schedule', 'audience', 'platform', 'engagement', 'analytics']),
  },

  // ── Sales Executive ────────────────────────────────────────────────────────
  {
    id: uuidv4(), question_bank_id: QB_SALES, type: 'oral', skill: 'Sales',
    text: 'Walk me through your typical sales process from prospecting to close.',
    expected_answer: 'Prospecting, qualifying leads, needs analysis, presentation, handling objections, closing, and follow-up.',
    expected_keywords: JSON.stringify(['prospecting', 'qualifying', 'needs analysis', 'objection', 'closing', 'follow-up']),
  },
  {
    id: uuidv4(), question_bank_id: QB_SALES, type: 'oral', skill: 'Negotiation',
    text: 'How do you handle a customer who says your price is too high?',
    expected_answer: 'Understand their budget, emphasise value over price, offer flexible payment options, and find a mutually beneficial solution.',
    expected_keywords: JSON.stringify(['value', 'budget', 'objection handling', 'flexible', 'solution', 'benefit']),
  },
  {
    id: uuidv4(), question_bank_id: QB_SALES, type: 'oral', skill: 'Communication',
    text: 'How do you build rapport with a new prospect?',
    expected_answer: 'Research the prospect, listen actively, find common ground, be genuine, and focus on their needs rather than your product.',
    expected_keywords: JSON.stringify(['rapport', 'listen', 'research', 'genuine', 'needs', 'trust']),
  },
  {
    id: uuidv4(), question_bank_id: QB_SALES, type: 'oral', skill: 'CRM',
    text: 'How do you use a CRM system to manage your sales pipeline?',
    expected_answer: 'Log all interactions, track deal stages, set follow-up reminders, analyse pipeline health, and forecast revenue.',
    expected_keywords: JSON.stringify(['CRM', 'pipeline', 'deal stage', 'follow-up', 'forecast', 'activity log']),
  },
];

// ─── HR questions (shared across all roles) ───────────────────────────────────

const HR_BANK_ID = 'qb-hr-common';

const HR_JOB_ROLES = [
  { id: 'role-backend-dev-hr',   name: 'Backend Developer (HR Round)',   track: 'TJI',  required_skills: JSON.stringify(['Node.js', 'Express', 'PostgreSQL', 'REST API', 'TypeScript']), question_bank_id: HR_BANK_ID },
  { id: 'role-frontend-dev-hr',  name: 'Frontend Developer (HR Round)',  track: 'TJI',  required_skills: JSON.stringify(['React', 'TypeScript', 'CSS', 'HTML', 'JavaScript']),           question_bank_id: HR_BANK_ID },
  { id: 'role-fullstack-dev-hr', name: 'Full Stack Developer (HR Round)', track: 'TJI', required_skills: JSON.stringify(['React', 'Node.js', 'PostgreSQL', 'TypeScript', 'REST API']),   question_bank_id: HR_BANK_ID },
];

const HR_QUESTIONS = [
  {
    id: uuidv4(), question_bank_id: HR_BANK_ID, type: 'oral', skill: 'soft skills',
    text: 'Tell me about yourself.',
    expected_answer: 'A concise summary of background, skills, and career goals.',
    expected_keywords: JSON.stringify(['background', 'experience', 'skills', 'goals', 'motivated']),
  },
  {
    id: uuidv4(), question_bank_id: HR_BANK_ID, type: 'oral', skill: 'soft skills',
    text: 'What are your greatest strengths?',
    expected_answer: 'Specific strengths with examples relevant to the role.',
    expected_keywords: JSON.stringify(['strength', 'example', 'problem solving', 'teamwork', 'communication']),
  },
  {
    id: uuidv4(), question_bank_id: HR_BANK_ID, type: 'oral', skill: 'soft skills',
    text: 'Describe a challenging situation at work and how you handled it.',
    expected_answer: 'Use the STAR method: Situation, Task, Action, Result.',
    expected_keywords: JSON.stringify(['challenge', 'solution', 'result', 'team', 'action', 'outcome']),
  },
  {
    id: uuidv4(), question_bank_id: HR_BANK_ID, type: 'oral', skill: 'soft skills',
    text: 'Where do you see yourself in five years?',
    expected_answer: 'Career growth aligned with the company, skill development, leadership aspirations.',
    expected_keywords: JSON.stringify(['growth', 'career', 'goals', 'leadership', 'development', 'contribute']),
  },
  {
    id: uuidv4(), question_bank_id: HR_BANK_ID, type: 'oral', skill: 'soft skills',
    text: 'Why do you want to work for this company?',
    expected_answer: 'Research-based answer showing alignment with company values and mission.',
    expected_keywords: JSON.stringify(['values', 'mission', 'culture', 'opportunity', 'growth', 'contribute']),
  },
];

// ─── Seed function ────────────────────────────────────────────────────────────

export async function seedDatabase(): Promise<void> {
  // Check if already seeded
  const { rows } = await query<{ count: number }>(
    'SELECT COUNT(*) as count FROM job_roles'
  );
  if (rows[0] && Number(rows[0].count) > 0) {
    return; // already seeded
  }

  console.log('[seed] Seeding job roles and questions...');

  // Insert job roles
  for (const role of [...JOB_ROLES, ...HR_JOB_ROLES]) {
    await query(
      `INSERT OR IGNORE INTO job_roles (id, name, track, required_skills, question_bank_id)
       VALUES ($1, $2, $3, $4, $5)`,
      [role.id, role.name, role.track, role.required_skills, role.question_bank_id]
    );
  }

  // Insert questions
  for (const q of [...QUESTIONS, ...HR_QUESTIONS]) {
    await query(
      `INSERT OR IGNORE INTO questions
         (id, question_bank_id, type, text, skill, expected_answer, expected_keywords, code_template, language)
       VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9)`,
      [
        q.id,
        q.question_bank_id,
        q.type,
        q.text,
        q.skill,
        q.expected_answer,
        q.expected_keywords,
        (q as { code_template?: string }).code_template ?? null,
        (q as { language?: string }).language ?? null,
      ]
    );
  }

  console.log(`[seed] Done — ${JOB_ROLES.length + HR_JOB_ROLES.length} roles, ${QUESTIONS.length + HR_QUESTIONS.length} questions inserted.`);
}
