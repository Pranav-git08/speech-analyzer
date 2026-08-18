/**
 * Property-based tests for the Resume Parser.
 *
 * Feature: speech-analyzer, Property 20: Resume parser completeness
 * Validates: Requirements 11.1
 *
 * Strategy:
 * The completeness property states: for any valid PDF or DOCX resume, the
 * parser returns a ResumeData object where all required fields (name, phone,
 * email, skills, experience, projects) are present and non-null.
 *
 * pdf-parse uses browser globals (DOMMatrix etc.) that are unavailable in the
 * Node.js Jest environment, so we mock the two parsing libraries and exercise
 * the parser's field-extraction and error-handling logic directly.
 */

import * as fc from 'fast-check';
import { ResumeData } from '../types';

// ─── Mock pdf-parse and mammoth before importing the parser ──────────────────

jest.mock('pdf-parse', () => {
  return jest.fn(async (buffer: Buffer) => {
    const text = buffer.toString('utf8');
    if (text === '__CORRUPT__') throw new Error('bad pdf');
    return { text };
  });
});

jest.mock('mammoth', () => ({
  extractRawText: jest.fn(async ({ buffer }: { buffer: Buffer }) => {
    const text = buffer.toString('utf8');
    if (text === '__CORRUPT__') throw new Error('bad docx');
    return { value: text };
  }),
}));

// Import AFTER mocks are set up
import { parseResume, UnsupportedFormatError, ResumeParseError } from '../services/resumeParser';

// ─── Helper ───────────────────────────────────────────────────────────────────

function hasAllRequiredFields(data: ResumeData): boolean {
  return (
    data.name !== null && data.name !== undefined &&
    data.phone !== null && data.phone !== undefined &&
    data.email !== null && data.email !== undefined &&
    data.skills !== null && data.skills !== undefined &&
    data.experience !== null && data.experience !== undefined &&
    data.projects !== null && data.projects !== undefined &&
    Array.isArray(data.skills) &&
    Array.isArray(data.experience) &&
    Array.isArray(data.projects)
  );
}

// ─── Resume text generator ────────────────────────────────────────────────────

/**
 * Generates a plausible plain-text resume string containing the sections the
 * parser looks for. The property test uses this to produce varied inputs.
 */
function buildResumeText(
  name: string,
  email: string,
  phone: string,
  skills: string[],
): string {
  return [
    name,
    email,
    phone,
    '',
    'Skills',
    skills.join(', '),
    '',
  ].join('\n');
}

// ─── Tests ────────────────────────────────────────────────────────────────────

describe('Resume Parser – Property 20: parser completeness', () => {
  /**
   * Feature: speech-analyzer, Property 20: Resume parser completeness
   * For any valid PDF or DOCX resume, the parser returns a ResumeData object
   * where all required fields are present and non-null.
   * Validates: Requirements 11.1
   */
  it('parsed ResumeData always has all required fields present and non-null (PDF)', async () => {
    await fc.assert(
      fc.asyncProperty(
        fc.constantFrom('Alice Smith', 'Bob Jones', 'Carol White'),
        fc.constantFrom('alice@example.com', 'bob@test.org'),
        fc.constantFrom('555-123-4567', '1234567890'),
        fc.array(fc.constantFrom('Python', 'Java', 'SQL', 'React'), { minLength: 1, maxLength: 3 }),
        async (name, email, phone, skills) => {
          const text = buildResumeText(name, email, phone, skills);
          const buffer = Buffer.from(text, 'utf8');
          const result = await parseResume(buffer, 'resume.pdf', 'application/pdf');
          expect(hasAllRequiredFields(result)).toBe(true);
        }
      ),
      { numRuns: 20 }
    );
  });

  it('parsed ResumeData always has all required fields present and non-null (DOCX)', async () => {
    await fc.assert(
      fc.asyncProperty(
        fc.constantFrom('Alice Smith', 'Bob Jones', 'Carol White'),
        fc.constantFrom('alice@example.com', 'bob@test.org'),
        fc.constantFrom('555-123-4567', '1234567890'),
        fc.array(fc.constantFrom('Python', 'Java', 'SQL', 'React'), { minLength: 1, maxLength: 3 }),
        async (name, email, phone, skills) => {
          const text = buildResumeText(name, email, phone, skills);
          const buffer = Buffer.from(text, 'utf8');
          const result = await parseResume(buffer, 'resume.docx');
          expect(hasAllRequiredFields(result)).toBe(true);
        }
      ),
      { numRuns: 20 }
    );
  });

  /**
   * Unsupported file formats must throw UnsupportedFormatError (→ HTTP 400).
   * Validates: Requirements 11.4
   */
  it('throws UnsupportedFormatError for unsupported file extensions', async () => {
    const unsupportedExtensions = ['.txt', '.png', '.jpg', '.xlsx', '.csv'];
    for (const ext of unsupportedExtensions) {
      await expect(
        parseResume(Buffer.from('dummy'), `resume${ext}`)
      ).rejects.toBeInstanceOf(UnsupportedFormatError);
    }
  });

  /**
   * Corrupt buffers for supported formats must throw ResumeParseError (→ HTTP 422).
   * Validates: Requirements 11.1
   */
  it('throws ResumeParseError for corrupt PDF buffer', async () => {
    await expect(
      parseResume(Buffer.from('__CORRUPT__'), 'resume.pdf', 'application/pdf')
    ).rejects.toBeInstanceOf(ResumeParseError);
  });

  it('throws ResumeParseError for corrupt DOCX buffer', async () => {
    await expect(
      parseResume(Buffer.from('__CORRUPT__'), 'resume.docx')
    ).rejects.toBeInstanceOf(ResumeParseError);
  });
});
