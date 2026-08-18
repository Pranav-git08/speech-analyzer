import { config } from '../config/env';
import { AdaptiveFollowUpPrompt } from '../types';
import https from 'https';

interface LLMMessage {
  role: 'system' | 'user' | 'assistant';
  content: string;
}

/**
 * Make an LLM call using configured OpenAI or Gemini API, or fallback to smart generator.
 */
async function callLLM(messages: LLMMessage[]): Promise<string> {
  const openaiKey = process.env.OPENAI_API_KEY || (config as Record<string, unknown>).OPENAI_API_KEY as string | undefined;

  if (openaiKey && openaiKey.trim()) {
    try {
      const payload = JSON.stringify({
        model: 'gpt-4o-mini',
        messages,
        temperature: 0.7,
        max_tokens: 300,
      });

      const resText = await new Promise<string>((resolve, reject) => {
        const req = https.request(
          'https://api.openai.com/v1/chat/completions',
          {
            method: 'POST',
            headers: {
              'Content-Type': 'application/json',
              Authorization: `Bearer ${openaiKey}`,
              'Content-Length': Buffer.byteLength(payload),
            },
          },
          (res) => {
            let data = '';
            res.on('data', (c) => (data += c));
            res.on('end', () => {
              if (res.statusCode && res.statusCode >= 200 && res.statusCode < 300) {
                try {
                  const parsed = JSON.parse(data);
                  resolve(parsed.choices?.[0]?.message?.content || '');
                } catch (e) {
                  reject(e);
                }
              } else {
                reject(new Error(`OpenAI error: ${res.statusCode} ${data}`));
              }
            });
          }
        );
        req.on('error', reject);
        req.write(payload);
        req.end();
      });

      if (resText.trim()) return resText.trim();
    } catch (llmErr) {
      console.warn('[generativeInterviewService] LLM call fallback:', llmErr);
    }
  }

  // Smart local heuristic generator fallback
  return '';
}

/**
 * Generate an intelligent, adaptive follow-up probing question based on candidate answer.
 */
export async function generateAdaptiveFollowUp(params: {
  questionText: string;
  candidateAnswer: string;
  jobRoleName?: string;
  skill?: string;
}): Promise<AdaptiveFollowUpPrompt> {
  const { questionText, candidateAnswer, jobRoleName = 'Software Engineer', skill = 'General' } = params;

  const promptSystem = `You are an expert technical interviewer at a top tech company for a ${jobRoleName} role.
Generate one crisp, targeted follow-up probing question that challenges the candidate on edge cases, architecture, scale, or trade-offs based on their previous answer.
Output JSON only in this schema:
{
  "followUpQuestion": "string",
  "probeType": "clarification" | "deep_dive" | "edge_case" | "architecture",
  "difficulty": "standard" | "advanced"
}`;

  const promptUser = `Original Question: "${questionText}"
Candidate Spoken Answer: "${candidateAnswer}"
Skill Area: ${skill}`;

  try {
    const raw = await callLLM([
      { role: 'system', content: promptSystem },
      { role: 'user', content: promptUser },
    ]);

    if (raw) {
      const clean = raw.replace(/^```json\s*|\s*```$/g, '').trim();
      const parsed = JSON.parse(clean);
      return {
        originalQuestion: questionText,
        candidateAnswer,
        followUpQuestion: parsed.followUpQuestion || `How would you optimize that solution if traffic scaled 100x?`,
        probeType: parsed.probeType || 'deep_dive',
        difficulty: parsed.difficulty || 'standard',
      };
    }
  } catch {
    // Continue to fallback below
  }

  // Fallback intelligent templates based on keywords detected in candidate answer
  const lowerAns = candidateAnswer.toLowerCase();
  let followUpQuestion = `How would you test and monitor this implementation in production?`;
  let probeType: 'clarification' | 'deep_dive' | 'edge_case' | 'architecture' = 'deep_dive';

  if (lowerAns.includes('database') || lowerAns.includes('sql') || lowerAns.includes('redis') || lowerAns.includes('cache')) {
    followUpQuestion = `How would your approach handle database cache invalidation and race conditions during high concurrent writes?`;
    probeType = 'architecture';
  } else if (lowerAns.includes('api') || lowerAns.includes('service') || lowerAns.includes('async') || lowerAns.includes('promise')) {
    followUpQuestion = `What error handling and circuit-breaking strategy would you implement if downstream services experience high latency?`;
    probeType = 'edge_case';
  } else if (lowerAns.includes('state') || lowerAns.includes('react') || lowerAns.includes('component') || lowerAns.includes('hook')) {
    followUpQuestion = `How do you prevent unnecessary component re-renders and memory leaks with that state management pattern?`;
    probeType = 'deep_dive';
  } else if (candidateAnswer.trim().length < 50) {
    followUpQuestion = `Could you walk me through a specific real-world scenario where you applied this principle and what trade-offs you made?`;
    probeType = 'clarification';
  } else {
    followUpQuestion = `What is the primary bottleneck of this approach, and how would you redesign it if scale increased by 10x?`;
    probeType = 'architecture';
  }

  return {
    originalQuestion: questionText,
    candidateAnswer,
    followUpQuestion,
    probeType,
    difficulty: candidateAnswer.length > 100 ? 'advanced' : 'standard',
  };
}

/**
 * Generate a smart practice hint for candidate practice mode.
 */
export function generatePracticeHint(questionText: string, skill: string): string {
  const q = questionText.toLowerCase();
  if (q.includes('react') || q.includes('hook') || q.includes('state')) {
    return '💡 Hint: Mention immutability, reconciliation, and the difference between useState and useReducer.';
  }
  if (q.includes('database') || q.includes('index') || q.includes('sql')) {
    return '💡 Hint: Discuss B-Tree indexes, query execution plans (EXPLAIN), and read vs write trade-offs.';
  }
  if (q.includes('conflict') || q.includes('disagree') || q.includes('team')) {
    return '💡 Hint: Use the STAR framework (Situation, Task, Action, Result) focusing on empathy and objective consensus.';
  }
  if (q.includes('async') || q.includes('promise') || q.includes('event loop')) {
    return '💡 Hint: Explain the microtask queue vs macrotask queue and how non-blocking I/O works.';
  }
  return `💡 Hint: Structure your response with a 1-sentence definition, a concrete real-world example, and key trade-offs in ${skill}.`;
}
