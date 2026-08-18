import { CandidateSWOTAnalysis, ResumeData } from '../types';

export const ROLE_REQUIRED_SKILLS_MAP: Record<string, string[]> = {
  // Sales & Business Development
  'sales executive': [
    'Sales & Prospecting',
    'Client Relationship Management',
    'Negotiation & Objection Handling',
    'CRM & Pipeline Management',
    'Lead Qualification',
    'Deal Closing',
    'Customer Communication',
  ],
  'sales': [
    'Sales',
    'Client Communication',
    'Negotiation',
    'CRM Management',
    'Lead Generation',
    'Closing Deals',
  ],
  'business development executive': [
    'Lead Generation',
    'B2B Sales',
    'Client Engagement',
    'Strategic Partnerships',
    'Cold Outreach',
    'Contract Negotiation',
  ],
  'account executive': [
    'Enterprise Sales',
    'Account Management',
    'Pipeline Forecasting',
    'Solution Selling',
    'Client Retention',
  ],

  // Marketing & Growth
  'marketing executive': [
    'Digital Marketing',
    'SEO / SEM',
    'Content Strategy',
    'Social Media Management',
    'Campaign Analytics',
    'Lead Generation',
    'Brand Strategy',
  ],
  'digital marketing': [
    'Search Engine Optimization',
    'Google Ads / Paid Search',
    'Social Media Marketing',
    'Email Marketing',
    'Content Creation',
    'Web Analytics',
  ],

  // Human Resources & Talent
  'hr executive': [
    'Talent Acquisition',
    'Stakeholder Communication',
    'HR Policies & Compliance',
    'Employee Onboarding',
    'Conflict Resolution',
    'Performance Management',
  ],
  'human resources': [
    'Recruitment',
    'Employee Relations',
    'HR Operations',
    'Compensation & Benefits',
    'Talent Management',
  ],

  // Technical - Engineering & Development
  'frontend developer': [
    'React',
    'TypeScript',
    'JavaScript',
    'HTML5 & CSS3',
    'REST API Integration',
    'Responsive UI Design',
    'Web Performance',
  ],
  'backend developer': [
    'Node.js',
    'Express',
    'PostgreSQL / SQL',
    'REST API Architecture',
    'TypeScript',
    'Database Optimization',
    'System Design',
  ],
  'full stack developer': [
    'React',
    'Node.js',
    'PostgreSQL / MongoDB',
    'TypeScript',
    'REST APIs',
    'System Design',
    'CI/CD & Git',
  ],
  'software engineer': [
    'Data Structures & Algorithms',
    'System Design',
    'Object-Oriented Programming',
    'REST APIs',
    'Database Management',
    'Code Quality & Testing',
  ],
  'devops engineer': [
    'Docker & Containers',
    'Kubernetes',
    'CI/CD Pipelines',
    'AWS / Cloud Infrastructure',
    'Linux Administration',
    'Monitoring & Logging',
  ],
  'data analyst': [
    'SQL',
    'Python / R',
    'Data Visualization (Tableau/PowerBI)',
    'Statistical Analysis',
    'Excel & Spreadsheets',
    'Business Intelligence',
  ],
};

/**
 * Dynamically resolves the required skill set for a specific job role and track.
 */
export function resolveRoleSkills(jobRoleName?: string, track?: string): string[] {
  const normRole = (jobRoleName || '').toLowerCase().trim();

  for (const [key, skills] of Object.entries(ROLE_REQUIRED_SKILLS_MAP)) {
    if (normRole.includes(key) || key.includes(normRole)) {
      return skills;
    }
  }

  // Fallback by track
  if (track === 'NTJI' || /sales|market|hr|business|non-tech/i.test(normRole)) {
    if (/sales/i.test(normRole)) return ROLE_REQUIRED_SKILLS_MAP['sales executive'];
    if (/market/i.test(normRole)) return ROLE_REQUIRED_SKILLS_MAP['marketing executive'];
    if (/hr|human|talent/i.test(normRole)) return ROLE_REQUIRED_SKILLS_MAP['hr executive'];
    return [
      'Client Communication',
      'Stakeholder Management',
      'Strategic Negotiation',
      'Problem Solving',
      'Team Collaboration',
    ];
  }

  return [
    'Software Architecture',
    'System Design',
    'Problem Solving',
    'Data Structures',
    'REST APIs',
  ];
}

/**
 * Compute semantic similarity score between candidate skills and job requirements.
 */
export function computeSemanticMatchScore(
  candidateSkills: string[],
  requiredSkills: string[],
  projects: { title: string; description: string; technologies: string[] }[] = []
): {
  matchScore: number;
  matchedCount: number;
  missingSkills: string[];
  strongestSkills: string[];
} {
  const normCandidate = new Set(candidateSkills.map((s) => s.toLowerCase().trim()));
  const projectTechs = new Set(
    projects.flatMap((p) => (p.technologies || []).map((t) => t.toLowerCase().trim()))
  );

  const missing: string[] = [];
  const matched: string[] = [];

  for (const req of requiredSkills) {
    const norm = req.toLowerCase().trim();
    if (normCandidate.has(norm) || projectTechs.has(norm)) {
      matched.push(req);
    } else {
      // Check partial substring match
      const hasSub = Array.from(normCandidate).some(
        (c) => c.includes(norm) || norm.includes(c)
      );
      if (hasSub) {
        matched.push(req);
      } else {
        missing.push(req);
      }
    }
  }

  const rawScore = requiredSkills.length > 0
    ? (matched.length / requiredSkills.length) * 100
    : 85;

  const matchScore = Math.min(100, Math.max(25, Math.round(rawScore)));

  return {
    matchScore,
    matchedCount: matched.length,
    missingSkills: missing,
    strongestSkills: matched,
  };
}

/**
 * Generate comprehensive AI SWOT analysis for candidate, 100% tailored to the candidate's exact job role.
 */
export function generateCandidateSWOT(params: {
  resumeData?: ResumeData | null;
  overallGrade?: number | null;
  roundScores?: { roundType: string; score: number }[];
  jobRoleName?: string;
  requiredSkills?: string[];
  track?: string;
}): CandidateSWOTAnalysis {
  const {
    resumeData,
    overallGrade = 80,
    roundScores = [],
    jobRoleName = 'Sales Executive',
    track,
  } = params;

  const resolvedSkills = params.requiredSkills && params.requiredSkills.length > 0
    ? params.requiredSkills
    : resolveRoleSkills(jobRoleName, track);

  const skills = resumeData?.skills || [];
  const projects = resumeData?.projects || [];
  const experience = resumeData?.experience || [];

  const semantic = computeSemanticMatchScore(skills, resolvedSkills, projects);
  const effectiveGrade = overallGrade ?? 75;

  const isSales = /sales|account|business development/i.test(jobRoleName) || (track === 'NTJI' && /sales/i.test(jobRoleName));
  const isMarketing = /market/i.test(jobRoleName);
  const isHR = /hr|human|talent/i.test(jobRoleName);
  const isNonTech = track === 'NTJI' || isSales || isMarketing || isHR;

  // ── 1. Strengths ────────────────────────────────────────────────────────────
  const strengths: string[] = [];
  if (effectiveGrade >= 70) {
    strengths.push(`Strong interview assessment benchmark score (${effectiveGrade.toFixed(1)}%).`);
  }
  if (semantic.strongestSkills.length > 0) {
    strengths.push(`Demonstrated proficiency in core ${jobRoleName} competencies: ${semantic.strongestSkills.slice(0, 4).join(', ')}.`);
  }
  if (isSales) {
    strengths.push('Articulate verbal delivery with active value proposition communication and persuasive articulation.');
    if (experience.length > 0) {
      strengths.push(`Documented track record of client engagement across ${experience.length} professional role(s).`);
    }
  } else if (isMarketing) {
    strengths.push('Strong strategic communication with foundational digital marketing and campaign execution insight.');
  } else if (isHR) {
    strengths.push('Empathetic stakeholder communication, active listening, and structured organizational mindset.');
  } else {
    // Technical / Engineering
    if (projects.length >= 2) {
      strengths.push(`Practical project execution history with ${projects.length} documented production systems.`);
    }
    if (experience.length >= 2) {
      strengths.push('Solid cross-company industry track record with progressive engineering responsibilities.');
    }
  }

  if (strengths.length === 0) {
    strengths.push(`Adaptable learning mindset with baseline competency aligned to ${jobRoleName} expectations.`);
  }

  // ── 2. Weaknesses / Development Areas ───────────────────────────────────────
  const weaknesses: string[] = [];
  if (semantic.missingSkills.length > 0) {
    weaknesses.push(`Identified skill gaps in required ${jobRoleName} competencies: ${semantic.missingSkills.slice(0, 3).join(', ')}.`);
  }
  if (effectiveGrade < 70) {
    if (isSales) {
      weaknesses.push('Could strengthen structured objection handling and fast-paced negotiation closing strategies.');
    } else if (isMarketing) {
      weaknesses.push('Opportunity to deepen quantitative ROI campaign analytics and multi-channel attribution.');
    } else if (isHR) {
      weaknesses.push('Could refine complex labor regulation compliance and executive compensation structuring.');
    } else {
      weaknesses.push('Performance in technical oral rounds indicated occasional conceptual hesitation on architectural trade-offs.');
    }
  }
  if (isSales && weaknesses.length < 2) {
    weaknesses.push('Refine high-ticket enterprise deal closing and complex multi-stakeholder contract navigation.');
  } else if (!isNonTech && projects.length === 0) {
    weaknesses.push('Limited portfolio artifacts showcasing large-scale distributed architectures.');
  }
  if (weaknesses.length === 0) {
    weaknesses.push(`Could further deepen specialized mastery in advanced ${jobRoleName} methodologies.`);
  }

  // ── 3. Opportunities ─────────────────────────────────────────────────────────
  const opportunities: string[] = [];
  opportunities.push(`Can accelerate velocity in ${jobRoleName} initiatives with structured domain onboarding.`);
  if (isSales) {
    opportunities.push('High potential to champion key enterprise account expansion and revenue pipeline growth.');
    opportunities.push('Opportunity to represent the company in strategic executive pitches and client negotiations.');
  } else if (isMarketing) {
    opportunities.push('Leverage digital channels to build automated inbound lead funnels and brand authority.');
    opportunities.push('High growth potential for campaign leadership and market research expansion.');
  } else if (isHR) {
    opportunities.push('Lead strategic talent acquisition initiatives and modernize employee onboarding workflows.');
    opportunities.push('High potential for culture building and cross-departmental HR business partnering.');
  } else {
    // Technical
    if (skills.some((s) => /cloud|aws|docker|kubernetes/i.test(s))) {
      opportunities.push('Leverage cloud and container experience to champion DevOps CI/CD best practices.');
    } else {
      opportunities.push('Opportunity to cross-train on automated cloud deployments and scalable microservices.');
    }
    opportunities.push('High growth potential for technical leadership and peer code review mentorship.');
  }

  // ── 4. Threats / Hiring Risks ────────────────────────────────────────────────
  const risks: string[] = [];
  if (semantic.matchScore < 50) {
    risks.push(`May require a 3-4 week ramp-up period to reach full autonomy on specialized ${jobRoleName} workflows.`);
  }
  const hrScore = roundScores.find((r) => r.roundType === 'hr')?.score;
  if (hrScore !== undefined && hrScore < 60) {
    risks.push('Behavioral round metrics suggest candidate may benefit from coaching on executive presentation.');
  }
  if (experience.length === 0 && projects.length < 2) {
    risks.push(`Early-career profile with limited prior exposure to high-pressure ${isNonTech ? 'quota-driven client targets' : 'production outages'}.`);
  }
  if (risks.length === 0) {
    risks.push('Low overall hiring risk; candidate competencies align well with current team expectations.');
  }

  const experienceConsistency = Math.min(
    100,
    Math.max(40, Math.round(50 + (experience.length * 15) + (projects.length * 10)))
  );

  return {
    strengths,
    weaknesses,
    opportunities,
    risks,
    semanticMatchScore: semantic.matchScore,
    experienceConsistency,
  };
}
