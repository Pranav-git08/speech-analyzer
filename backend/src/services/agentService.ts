import { pool } from '../db/connection';
import { config } from '../config/env';
import https from 'https';

// ─── Types ─────────────────────────────────────────────────────────────────────

export interface ChatMessage {
  role: 'user' | 'assistant' | 'system';
  content: string;
}

interface CandidateRow {
  id: string;
  name: string;
  email: string;
  phone: string;
  job_role_name: string | null;
  track: string;
  unique_code: string | null;
  status: string;
  created_at: string;
  overall_grade: number | null;
}

interface SessionRow {
  id: string;
  candidate_id: string;
  round_type: string;
  status: string;
  final_grade: number | null;
  started_at: string;
  completed_at: string | null;
  questions: unknown;
  answers: unknown;
  evaluations: unknown;
  confidence_analysis: unknown;
}

// ─── Helpers ───────────────────────────────────────────────────────────────────

function safeJsonParse<T>(val: unknown, fallback: T): T {
  if (val === null || val === undefined) return fallback;
  if (typeof val !== 'string') return val as T;
  try { return JSON.parse(val) as T; } catch { return fallback; }
}

function truncate(str: string, maxLen = 400): string {
  if (!str) return '';
  return str.length > maxLen ? str.slice(0, maxLen) + '...' : str;
}

// ─── Build Agent Context from DB ──────────────────────────────────────────────

/**
 * Build a rich plaintext context block describing candidates for the agent.
 * If `candidateId` is provided, scope context to that one candidate.
 * Otherwise, summarize all candidates (capped at 50 to stay within token limits).
 */
export async function buildAgentContext(candidateId?: string): Promise<string> {
  const lines: string[] = [];

  if (candidateId) {
    // Single-candidate context (full detail)
    const { rows: cRows } = await pool.query<CandidateRow>(
      `SELECT c.id, c.name, c.email, c.phone,
              COALESCE(jr.name, 'Unknown Role') AS job_role_name,
              c.track, c.unique_code, c.status, c.created_at,
              (SELECT AVG(s.final_grade) FROM interview_sessions s
               WHERE s.candidate_id = c.id AND s.final_grade IS NOT NULL) AS overall_grade
       FROM candidates c
       LEFT JOIN job_roles jr ON jr.id = c.job_role_id
       WHERE c.id = $1`,
      [candidateId]
    );
    if (cRows.length === 0) return 'No candidate found with the given ID.';
    const c = cRows[0];

    lines.push(`=== CANDIDATE: ${c.name} ===`);
    lines.push(`ID: ${c.id}`);
    lines.push(`Email: ${c.email} | Phone: ${c.phone}`);
    lines.push(`Job Role: ${c.job_role_name} | Track: ${c.track}`);
    lines.push(`Status: ${c.status}`);
    lines.push(`Overall Grade: ${c.overall_grade !== null ? Number(c.overall_grade).toFixed(1) + '/100' : 'Not graded yet'}`);
    lines.push(`Applied: ${c.created_at}`);
    lines.push('');

    // Sessions
    const { rows: sessions } = await pool.query<SessionRow>(
      `SELECT id, candidate_id, round_type, status, final_grade, started_at, completed_at,
              questions, answers, evaluations, confidence_analysis
       FROM interview_sessions WHERE candidate_id = $1 ORDER BY started_at ASC`,
      [candidateId]
    );

    if (sessions.length === 0) {
      lines.push('No interview sessions recorded yet.');
    } else {
      lines.push(`--- Interview Sessions (${sessions.length}) ---`);
      for (const s of sessions) {
        lines.push(`\nRound: ${s.round_type.toUpperCase()} | Status: ${s.status}`);
        lines.push(`Grade: ${s.final_grade !== null ? Number(s.final_grade).toFixed(1) + '/100' : 'N/A'}`);
        lines.push(`Date: ${s.started_at}`);

        const questions: Array<{ id: string; text: string; skill?: string }> = safeJsonParse(s.questions, []);
        const answers: Array<{ questionId: string; content: string }> = safeJsonParse(s.answers, []);
        const evaluations: Array<{ questionId: string; score: number; grade: string; feedback: string; matchedKeywords?: string[] }> = safeJsonParse(s.evaluations, []);
        type ConfidenceData = { overallConfidenceScore?: number; fillerWordCount?: number; fillerWords?: string[] };
        const conf = safeJsonParse<ConfidenceData | null>(s.confidence_analysis, null);

        if (conf) {
          lines.push(`Confidence Score: ${conf.overallConfidenceScore?.toFixed(1) ?? 'N/A'}/100`);
          if (conf.fillerWordCount) lines.push(`Filler Words: ${conf.fillerWordCount} (${(conf.fillerWords ?? []).slice(0, 5).join(', ')})`);
        }

        for (const q of questions.slice(0, 8)) {
          const ans = answers.find((a) => a.questionId === q.id);
          const ev = evaluations.find((e) => e.questionId === q.id);
          lines.push(`  Q: ${truncate(q.text, 200)}`);
          if (ans) lines.push(`  A: ${truncate(ans.content, 300)}`);
          if (ev) lines.push(`  Score: ${ev.score}/100 (${ev.grade}) | ${truncate(ev.feedback, 150)}`);
        }
        if (questions.length > 8) lines.push(`  ... and ${questions.length - 8} more questions`);
      }
    }
  } else {
    // All-candidates context (summary only)
    const { rows } = await pool.query<CandidateRow>(
      `SELECT c.id, c.name, c.email, c.phone,
              COALESCE(jr.name, 'Unknown Role') AS job_role_name,
              c.track, c.unique_code, c.status, c.created_at,
              (SELECT AVG(s.final_grade) FROM interview_sessions s
               WHERE s.candidate_id = c.id AND s.final_grade IS NOT NULL) AS overall_grade
       FROM candidates c
       LEFT JOIN job_roles jr ON jr.id = c.job_role_id
       ORDER BY c.created_at DESC
       LIMIT 50`,
      []
    );

    lines.push(`=== CANDIDATE DATABASE (${rows.length} most recent candidates) ===`);
    lines.push('');
    for (const c of rows) {
      const grade = c.overall_grade !== null ? `${Number(c.overall_grade).toFixed(1)}/100` : 'Not graded';
      lines.push(`• ${c.name} | Role: ${c.job_role_name} | Track: ${c.track} | Status: ${c.status} | Grade: ${grade}`);
    }

    // Quick stats
    const statuses = rows.reduce((acc, c) => { acc[c.status] = (acc[c.status] ?? 0) + 1; return acc; }, {} as Record<string, number>);
    lines.push('');
    lines.push('--- Summary Statistics ---');
    for (const [status, count] of Object.entries(statuses)) {
      lines.push(`${status}: ${count}`);
    }
    const graded = rows.filter((r) => r.overall_grade !== null);
    if (graded.length > 0) {
      const avg = graded.reduce((s, r) => s + Number(r.overall_grade), 0) / graded.length;
      lines.push(`Average Grade (graded candidates): ${avg.toFixed(1)}/100`);
      lines.push(`Passing (≥50): ${graded.filter((r) => Number(r.overall_grade) >= 50).length}/${graded.length}`);
    }
  }

  return lines.join('\n');
}

// ─── Call LLM API (Groq preferred, OpenAI fallback) ──────────────────────────

function callLLM(messages: ChatMessage[], apiKey: string, model: string, hostname: string, path: string): Promise<string> {
  return new Promise((resolve, reject) => {
    const body = JSON.stringify({
      model,
      messages,
      max_tokens: 1024,
      temperature: 0.4,
    });

    const req = https.request(
      {
        hostname,
        path,
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${apiKey}`,
          'Content-Length': Buffer.byteLength(body),
        },
      },
      (res) => {
        let data = '';
        res.on('data', (chunk) => { data += chunk; });
        res.on('end', () => {
          try {
            const parsed = JSON.parse(data) as {
              choices?: Array<{ message?: { content?: string } }>;
              error?: { message: string };
            };
            if (res.statusCode && res.statusCode >= 400) {
              reject(new Error(parsed.error?.message ?? `LLM API returned HTTP ${res.statusCode}`));
              return;
            }
            if (parsed.error) {
              reject(new Error(parsed.error.message));
            } else {
              resolve(parsed.choices?.[0]?.message?.content?.trim() ?? 'No response generated.');
            }
          } catch {
            reject(new Error('Failed to parse LLM response'));
          }
        });
      }
    );

    req.on('error', reject);
    req.write(body);
    req.end();
  });
}

// ─── Main Agent Entry Point ────────────────────────────────────────────────────

const SYSTEM_PROMPT = `You are an AI interview analyst assistant embedded inside an admin dashboard for a speech-based AI interview platform called "Speech Analyser".

Your job is to help HR administrators and hiring managers:
- Summarize and explain candidate interview performance
- Compare candidates and their scores
- Give hiring recommendations based on grades, confidence, and behavior
- Answer questions about the candidate database
- Highlight strengths, weaknesses, and areas of concern

Always be professional, clear, and concise. When giving a hiring recommendation, be direct but balanced — mention both positives and concerns.
Format your answers with bullet points and bold text where helpful. Keep responses under 400 words unless asked for more detail.

The following is live data from the database. Use it to answer the user's question accurately:

--- LIVE DATA ---
{{CONTEXT}}
--- END DATA ---`;

export async function runAgentChat(
  messages: ChatMessage[],
  candidateId?: string
): Promise<string> {
  const groqKey = config.groq.apiKey;
  const openaiKey = config.openai.apiKey;

  // Prefer Groq (free & fast), fallback to OpenAI
  if (!groqKey && !openaiKey) {
    return '⚠️ **No AI API key configured.** Please set `GROQ_API_KEY` or `OPENAI_API_KEY` in your backend `.env` file to enable the AI agent.';
  }

  const context = await buildAgentContext(candidateId);
  const systemMessage: ChatMessage = {
    role: 'system',
    content: SYSTEM_PROMPT.replace('{{CONTEXT}}', context),
  };

  const fullMessages: ChatMessage[] = [systemMessage, ...messages];

  if (groqKey) {
    // Groq uses OpenAI-compatible API at api.groq.com/openai/v1
    return callLLM(
      fullMessages,
      groqKey,
      config.openai.chatModel,
      'api.groq.com',
      '/openai/v1/chat/completions'
    );
  } else {
    // OpenAI fallback
    return callLLM(
      fullMessages,
      openaiKey,
      config.openai.chatModel,
      'api.openai.com',
      '/v1/chat/completions'
    );
  }
}
