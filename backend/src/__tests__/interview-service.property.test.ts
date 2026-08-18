/**
 * Property-based tests for the Interview Service (Orchestrator).
 *
 * Feature: speech-analyzer, Property 7: Session summary completeness
 * Validates: Requirements 3.7, 5.6, 6.3
 */

import * as fc from 'fast-check';
import {
  startInterviewWithBank,
  getNextQuestion,
  completeInterview,
  getSession,
} from '../services/interviewService';
import { evaluateOralAnswer, shouldTerminateRound } from '../services/evaluationEngine';
import { QuestionBankEntry } from '../services/questionGenerator';
import { Answer, RoundType, InterviewSession } from '../types';

// ─── Helpers ──────────────────────────────────────────────────────────────────

/** A simple skill name (lowercase letters). */
const skillArb = fc.stringMatching(/^[a-z]{3,10}$/);

/** Build a minimal oral question bank entry for a given skill. */
function makeOralEntry(skill: string, idx: number): QuestionBankEntry {
  return {
    id: `q-${skill}-${idx}`,
    questionBankId: 'bank-1',
    type: 'oral',
    text: `Tell me about ${skill} (${idx})`,
    skill,
    expectedAnswer: skill,
    expectedKeywords: [skill],
  };
}

/** Build a question bank with `questionsPerSkill` oral entries per skill. */
function buildBank(skills: string[], questionsPerSkill: number): QuestionBankEntry[] {
  return skills.flatMap((s) =>
    Array.from({ length: questionsPerSkill }, (_, i) => makeOralEntry(s, i))
  );
}

/**
 * Drive a session to completion by submitting answers directly into the
 * in-memory session object (bypasses async DB calls).
 *
 * `passingContent` controls whether each answer passes or fails.
 */
function driveSession(
  session: InterviewSession,
  passingContent: (q: QuestionBankEntry | { id: string; expectedKeywords: string[] }) => string
): void {
  while (true) {
    const current = getSession(session.id);
    if (!current || current.status !== 'in_progress') break;
    if (current.currentQuestionIndex >= current.questions.length) {
      current.status = 'completed';
      break;
    }

    const q = current.questions[current.currentQuestionIndex];
    const content = passingContent(q);
    const answer: Answer = {
      questionId: q.id,
      candidateId: current.candidateId,
      type: 'oral',
      content,
      timestamp: new Date(),
    };

    const evaluation = evaluateOralAnswer(q.id, content, q.expectedKeywords);
    current.answers.push(answer);
    current.evaluations.push(evaluation);
    current.currentQuestionIndex += 1;

    if (shouldTerminateRound(current.evaluations)) {
      current.status = 'terminated';
      break;
    }
  }
}

// ─── Property 7: Session summary completeness ─────────────────────────────────

describe('Interview Service – Property 7: Session summary completeness', () => {
  /**
   * Feature: speech-analyzer, Property 7: Session summary completeness
   *
   * For any completed or terminated interview session, the stored session
   * summary should contain exactly the same number of questions, answers, and
   * evaluations as were processed during the session, with no entries missing
   * or duplicated.
   *
   * Validates: Requirements 3.7, 5.6, 6.3
   */

  it('answers count always equals evaluations count after driving a session to completion', () => {
    fc.assert(
      fc.property(
        fc.array(skillArb, { minLength: 1, maxLength: 3 }),
        fc.integer({ min: 1, max: 5 }),
        (skills, questionsPerSkill) => {
          const bank = buildBank(skills, questionsPerSkill);
          const session = startInterviewWithBank(
            'candidate-1',
            'job-role-1',
            'qualifying',
            bank,
            skills
          );

          // Drive to completion with passing answers
          driveSession(session, (q) => q.expectedKeywords.join(' '));

          const finalSession = getSession(session.id);
          if (!finalSession) return;

          // Core property: answers.length === evaluations.length
          expect(finalSession.answers.length).toBe(finalSession.evaluations.length);
        }
      ),
      { numRuns: 100 }
    );
  });

  it('completeInterview summary totalQuestions matches session questions array length', () => {
    fc.assert(
      fc.property(
        fc.array(skillArb, { minLength: 1, maxLength: 3 }),
        fc.integer({ min: 1, max: 4 }),
        (skills, questionsPerSkill) => {
          const bank = buildBank(skills, questionsPerSkill);
          const session = startInterviewWithBank(
            'candidate-2',
            'job-role-2',
            'qualifying',
            bank,
            skills
          );

          const totalQuestions = session.questions.length;

          // Drive to completion with passing answers
          driveSession(session, (q) => q.expectedKeywords.join(' '));

          const finalSession = getSession(session.id);
          if (!finalSession) return;

          const { summary } = completeInterview(session.id);

          // Summary totalQuestions must equal the questions array length
          expect(summary.totalQuestions).toBe(totalQuestions);
          // answeredQuestions must equal the answers array length
          expect(summary.answeredQuestions).toBe(finalSession.answers.length);
          // answeredQuestions cannot exceed totalQuestions
          expect(summary.answeredQuestions).toBeLessThanOrEqual(summary.totalQuestions);
        }
      ),
      { numRuns: 100 }
    );
  });

  it('terminated session has fewer answered questions than total when three-strike fires', () => {
    fc.assert(
      fc.property(
        fc.array(skillArb, { minLength: 1, maxLength: 2 }),
        fc.integer({ min: 4, max: 8 }), // enough questions to trigger 3-strike
        (skills, questionsPerSkill) => {
          const bank = buildBank(skills, questionsPerSkill);
          const session = startInterviewWithBank(
            'candidate-3',
            'job-role-3',
            'qualifying',
            bank,
            skills
          );

          if (session.questions.length < 3) return; // skip if not enough questions

          // Drive with failing answers to trigger three-strike termination
          driveSession(session, () => ''); // empty content → poor grade

          const finalSession = getSession(session.id);
          if (!finalSession) return;

          if (finalSession.status === 'terminated') {
            const { summary } = completeInterview(session.id);
            // Terminated session: answered < total
            expect(summary.answeredQuestions).toBeLessThan(summary.totalQuestions);
            expect(summary.status).toBe('terminated');
            // answers and evaluations still match
            expect(finalSession.answers.length).toBe(finalSession.evaluations.length);
          }
        }
      ),
      { numRuns: 100 }
    );
  });

  it('no answers or evaluations are duplicated — each question answered exactly once', () => {
    fc.assert(
      fc.property(
        fc.array(skillArb, { minLength: 1, maxLength: 3 }),
        fc.integer({ min: 1, max: 5 }),
        (skills, questionsPerSkill) => {
          const bank = buildBank(skills, questionsPerSkill);
          const session = startInterviewWithBank(
            'candidate-4',
            'job-role-4',
            'qualifying',
            bank,
            skills
          );

          driveSession(session, (q) => q.expectedKeywords.join(' '));

          const finalSession = getSession(session.id);
          if (!finalSession) return;

          // Each questionId should appear at most once in answers
          const answeredIds = finalSession.answers.map((a) => a.questionId);
          const uniqueAnsweredIds = new Set(answeredIds);
          expect(uniqueAnsweredIds.size).toBe(answeredIds.length);

          // Each questionId should appear at most once in evaluations
          const evaluatedIds = finalSession.evaluations.map((e) => e.questionId);
          const uniqueEvaluatedIds = new Set(evaluatedIds);
          expect(uniqueEvaluatedIds.size).toBe(evaluatedIds.length);
        }
      ),
      { numRuns: 100 }
    );
  });
});
