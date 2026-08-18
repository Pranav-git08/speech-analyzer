import { Router, Request, Response } from 'express';
import { runAgentChat, ChatMessage } from '../services/agentService';

const router = Router();

/**
 * POST /api/admin/agent/chat
 * Body: { messages: ChatMessage[], candidateId?: string }
 * Returns: { reply: string }
 *
 * Runs the AI interview insight agent with live DB context.
 */
router.post('/chat', async (req: Request, res: Response) => {
  const { messages, candidateId } = req.body as {
    messages: ChatMessage[];
    candidateId?: string;
  };

  if (!Array.isArray(messages) || messages.length === 0) {
    res.status(400).json({ error: 'messages array is required and must not be empty.' });
    return;
  }

  // Validate messages shape
  for (const msg of messages) {
    if (!msg.role || !msg.content) {
      res.status(400).json({ error: 'Each message must have role and content fields.' });
      return;
    }
    if (!['user', 'assistant', 'system'].includes(msg.role)) {
      res.status(400).json({ error: `Invalid role: ${msg.role}` });
      return;
    }
  }

  // Only keep user/assistant messages (strip any system messages from client)
  const cleanedMessages: ChatMessage[] = messages.filter(
    (m) => m.role === 'user' || m.role === 'assistant'
  );

  try {
    const reply = await runAgentChat(cleanedMessages, candidateId ?? undefined);
    res.json({ reply });
  } catch (err: unknown) {
    const msg = err instanceof Error ? err.message : 'Agent error';
    console.error('[Agent] Error:', msg);
    res.status(500).json({ error: `Agent failed: ${msg}` });
  }
});

export default router;
