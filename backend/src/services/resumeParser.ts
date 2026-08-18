import mammoth from 'mammoth';
import { ResumeData, Experience, Project } from '../types';

// eslint-disable-next-line @typescript-eslint/no-var-requires
const pdfParse = require('pdf-parse') as (buf: Buffer) => Promise<{ text: string }>;

// ─── Supported MIME / extension types ────────────────────────────────────────

const SUPPORTED_MIME_TYPES = new Set([
  'application/pdf',
  'application/vnd.openxmlformats-officedocument.wordprocessingml.document',
  'application/msword',
]);

const SUPPORTED_EXTENSIONS = new Set(['.pdf', '.docx', '.doc']);

// ─── Regex helpers ────────────────────────────────────────────────────────────

const EMAIL_RE = /[a-zA-Z0-9._%+\-]+@[a-zA-Z0-9.\-]+\.[a-zA-Z]{2,}/;
const PHONE_RE =
  /(?:\+?\d{1,3}[\s\-.]?)?\(?\d{3}\)?[\s\-.]?\d{3}[\s\-.]?\d{4}/;

// Common section header keywords
const SKILLS_HEADERS = /^(skills|technical skills|core competencies|technologies)/i;
const EXPERIENCE_HEADERS = /^(experience|work experience|employment|professional experience)/i;
const PROJECTS_HEADERS = /^(projects|personal projects|academic projects|key projects)/i;

// ─── Text extraction ──────────────────────────────────────────────────────────

/**
 * Extract raw text from a PDF buffer.
 */
async function extractTextFromPDF(buffer: Buffer): Promise<string> {
  const data = await pdfParse(buffer);
  return data.text;
}

/**
 * Extract raw text from a DOCX buffer.
 */
async function extractTextFromDOCX(buffer: Buffer): Promise<string> {
  const result = await mammoth.extractRawText({ buffer });
  return result.value;
}

// ─── Field parsers ────────────────────────────────────────────────────────────

function extractEmail(text: string): string {
  const match = text.match(EMAIL_RE);
  return match ? match[0] : '';
}

function extractPhone(text: string): string {
  const match = text.match(PHONE_RE);
  return match ? match[0].trim() : '';
}

const COMMON_TECH_SKILLS = [
  'JavaScript', 'TypeScript', 'React', 'Node.js', 'Express', 'Python', 'Java', 'C++', 'C#',
  'SQL', 'PostgreSQL', 'MySQL', 'MongoDB', 'Redis', 'Docker', 'Kubernetes', 'AWS', 'Azure',
  'GCP', 'Git', 'GitHub', 'CI/CD', 'REST API', 'GraphQL', 'HTML', 'CSS', 'Tailwind',
  'Linux', 'System Design', 'Microservices', 'Machine Learning', 'Data Structures', 'Algorithms',
  'Next.js', 'Vue.js', 'Angular', 'Django', 'Flask', 'Spring Boot', 'Kafka', 'Terraform',
  'Communication', 'Problem Solving', 'Leadership', 'Project Management', 'Agile', 'Scrum'
];

/**
 * Robust Candidate Name Extraction:
 * Scans top lines, filtering out metadata headers, URLs, emails, and numbers.
 */
function extractName(lines: string[], fallbackFilename?: string): string {
  const ignorePatterns = [
    /^(resume|curriculum vitae|cv|bio-data|biodata|profile|contact|summary|objective)/i,
    /^(phone|email|e-mail|mobile|tel|address|location|github|linkedin|portfolio)/i,
    /^(page \d+|confidential|applicant)/i,
  ];

  for (let i = 0; i < Math.min(lines.length, 12); i++) {
    const trimmed = lines[i].trim().replace(/^[-•*#_~]\s*/, '').trim();
    if (!trimmed || trimmed.length < 2 || trimmed.length > 50) continue;
    if (EMAIL_RE.test(trimmed)) continue;
    if (PHONE_RE.test(trimmed)) continue;
    if (/^https?:\/\//i.test(trimmed) || /www\./i.test(trimmed)) continue;
    if (ignorePatterns.some((pat) => pat.test(trimmed))) continue;

    // Check if looks like a personal name (2-4 words, letters only)
    const words = trimmed.split(/\s+/);
    if (words.length >= 1 && words.length <= 4 && /^[A-Za-z\s.\-']+$/.test(trimmed)) {
      // Capitalize nicely
      return words
        .map((w) => w.charAt(0).toUpperCase() + w.slice(1).toLowerCase())
        .join(' ');
    }
  }

  // Fallback from filename if provided (e.g. John_Doe_Resume.pdf -> John Doe)
  if (fallbackFilename) {
    const clean = fallbackFilename
      .replace(/\.(pdf|docx|doc|txt)$/i, '')
      .replace(/[-_]/g, ' ')
      .replace(/\b(resume|cv|biodata|updated|final|latest|profile)\b/gi, '')
      .trim();
    if (clean.length > 2) {
      return clean
        .split(/\s+/)
        .map((w) => w.charAt(0).toUpperCase() + w.slice(1).toLowerCase())
        .join(' ');
    }
  }

  return 'Candidate';
}

/**
 * Extract skills from skills section + full text discovery
 */
function extractSkills(lines: string[], fullText: string): string[] {
  const skills: string[] = [];
  let inSection = false;

  for (const line of lines) {
    const trimmed = line.trim();
    if (!trimmed) {
      if (inSection) inSection = false;
      continue;
    }

    if (SKILLS_HEADERS.test(trimmed)) {
      inSection = true;
      continue;
    }

    if (
      inSection &&
      (EXPERIENCE_HEADERS.test(trimmed) ||
        PROJECTS_HEADERS.test(trimmed) ||
        /^(education|certifications|awards|summary|objective)/i.test(trimmed))
    ) {
      break;
    }

    if (inSection) {
      const parts = trimmed
        .replace(/^[-•*]\s*/, '')
        .split(/[,|•·/]/)
        .map((s) => s.trim())
        .filter((s) => s.length > 1 && s.length < 40);
      skills.push(...parts);
    }
  }

  // Also auto-discover common tech skills in the text
  const lowerText = fullText.toLowerCase();
  for (const skill of COMMON_TECH_SKILLS) {
    const regex = new RegExp(`\\b${skill.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')}\\b`, 'i');
    if (regex.test(lowerText) && !skills.some((s) => s.toLowerCase() === skill.toLowerCase())) {
      skills.push(skill);
    }
  }

  return [...new Set(skills)].slice(0, 15);
}


/**
 * Extract experience entries from the experience section.
 */
function extractExperience(lines: string[]): Experience[] {
  const experiences: Experience[] = [];
  let inSection = false;
  let current: Partial<Experience> | null = null;
  const descLines: string[] = [];

  const flush = () => {
    if (current) {
      experiences.push({
        company: current.company ?? '',
        role: current.role ?? '',
        duration: current.duration ?? '',
        description: descLines.join(' ').trim(),
      });
      descLines.length = 0;
      current = null;
    }
  };

  // Duration pattern: "Jan 2020 – Dec 2022" or "2019 - Present"
  const DURATION_RE =
    /(?:jan|feb|mar|apr|may|jun|jul|aug|sep|oct|nov|dec|\d{4})[a-z\s,]*[-–—to]+[a-z\s,\d]*/i;

  for (const line of lines) {
    const trimmed = line.trim();

    if (EXPERIENCE_HEADERS.test(trimmed)) {
      inSection = true;
      continue;
    }

    if (
      inSection &&
      (PROJECTS_HEADERS.test(trimmed) ||
        SKILLS_HEADERS.test(trimmed) ||
        /^(education|certifications|awards|summary|objective)/i.test(trimmed))
    ) {
      flush();
      break;
    }

    if (!inSection) continue;
    if (!trimmed) continue;

    const durationMatch = trimmed.match(DURATION_RE);
    if (durationMatch) {
      // This line likely contains role/company + duration
      flush();
      const duration = durationMatch[0].trim();
      const rest = trimmed.replace(durationMatch[0], '').trim();
      // Heuristic: split on " at " or " | " or " - " to separate role from company
      const parts = rest.split(/\s+(?:at|@|\|)\s+/i);
      current = {
        role: parts[0]?.trim() ?? rest,
        company: parts[1]?.trim() ?? '',
        duration,
      };
    } else if (current) {
      descLines.push(trimmed.replace(/^[-•*]\s*/, ''));
    } else {
      // Could be a standalone company/role line before duration
      current = { role: trimmed, company: '', duration: '' };
    }
  }

  flush();
  return experiences;
}

/**
 * Extract project entries from the projects section.
 */
function extractProjects(lines: string[]): Project[] {
  const projects: Project[] = [];
  let inSection = false;
  let current: Partial<Project> | null = null;
  const descLines: string[] = [];

  const flush = () => {
    if (current) {
      projects.push({
        title: current.title ?? '',
        description: descLines.join(' ').trim(),
        technologies: current.technologies ?? [],
      });
      descLines.length = 0;
      current = null;
    }
  };

  const TECH_RE = /(?:tech(?:nologies|nology|stack)?|built with|tools?|stack)\s*[:\-]?\s*(.+)/i;

  for (const line of lines) {
    const trimmed = line.trim();

    if (PROJECTS_HEADERS.test(trimmed)) {
      inSection = true;
      continue;
    }

    if (
      inSection &&
      (EXPERIENCE_HEADERS.test(trimmed) ||
        SKILLS_HEADERS.test(trimmed) ||
        /^(education|certifications|awards|summary|objective)/i.test(trimmed))
    ) {
      flush();
      break;
    }

    if (!inSection) continue;
    if (!trimmed) continue;

    const techMatch = trimmed.match(TECH_RE);
    if (techMatch && current) {
      current.technologies = techMatch[1]
        .split(/[,|]/)
        .map((t) => t.trim())
        .filter(Boolean);
    } else if (/^[-•*]/.test(trimmed) && current) {
      descLines.push(trimmed.replace(/^[-•*]\s*/, ''));
    } else {
      // New project title
      flush();
      current = { title: trimmed, technologies: [] };
    }
  }

  flush();
  return projects;
}

// ─── Public API ───────────────────────────────────────────────────────────────

export class ResumeParseError extends Error {
  constructor(message: string) {
    super(message);
    this.name = 'ResumeParseError';
  }
}

export class UnsupportedFormatError extends Error {
  constructor(extension: string) {
    super(
      `Unsupported file format: "${extension}". Supported formats are: PDF, DOCX.`
    );
    this.name = 'UnsupportedFormatError';
  }
}

/**
 * Parse a resume buffer and return structured ResumeData.
 *
 * @param buffer   - Raw file buffer
 * @param filename - Original filename (used to detect format)
 * @param mimeType - Optional MIME type for additional format detection
 */
export async function parseResume(
  buffer: Buffer,
  filename: string,
  mimeType?: string
): Promise<ResumeData> {
  const ext = filename.slice(filename.lastIndexOf('.')).toLowerCase();

  const isSupportedExt = SUPPORTED_EXTENSIONS.has(ext);
  const isSupportedMime = mimeType ? SUPPORTED_MIME_TYPES.has(mimeType) : true;

  if (!isSupportedExt || !isSupportedMime) {
    throw new UnsupportedFormatError(ext || mimeType || 'unknown');
  }

  let rawText: string;
  try {
    if (ext === '.pdf') {
      rawText = await extractTextFromPDF(buffer);
    } else {
      // .docx or .doc
      rawText = await extractTextFromDOCX(buffer);
    }
  } catch (err) {
    throw new ResumeParseError(
      `Failed to parse resume: ${err instanceof Error ? err.message : String(err)}`
    );
  }

  const lines = rawText.split(/\r?\n/);

  const name = extractName(lines, filename);
  const email = extractEmail(rawText);
  const phone = extractPhone(rawText);
  const skills = extractSkills(lines, rawText);
  const experience = extractExperience(lines);
  const projects = extractProjects(lines);

  return { name, phone, email, skills, experience, projects };
}

