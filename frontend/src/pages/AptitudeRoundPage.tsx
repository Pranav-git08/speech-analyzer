import React, { useState, useEffect, useRef, useCallback } from 'react';
import { useNavigate } from 'react-router-dom';
import GlassCanvas3D from '../components/GlassCanvas3D';
import { APTITUDE_QUESTIONS } from '../data/aptitudeQuestions';
import { getCurrentUser } from '../utils/userStore';

type TestState = 'instructions' | 'in_progress' | 'terminated' | 'completed';

export const AptitudeRoundPage: React.FC = () => {
  const navigate = useNavigate();
  const currentUser = getCurrentUser();

  const [testState, setTestState] = useState<TestState>('instructions');
  const [currentIdx, setCurrentIdx] = useState<number>(0);
  const [selectedAnswers, setSelectedAnswers] = useState<Record<number, number>>({});
  const [markedForReview, setMarkedForReview] = useState<Record<number, boolean>>({});
  const [activeSectionFilter, setActiveSectionFilter] = useState<string>('All');

  // 30 Minutes Timer = 1800 Seconds
  const [timeLeft, setTimeLeft] = useState<number>(30 * 60);
  const [terminationReason, setTerminationReason] = useState<string>('');

  // Results calculation
  const [finalScore, setFinalScore] = useState<{
    total: number;
    score: number;
    percentage: number;
    isPassed: boolean;
    sectionBreakdown: Record<string, { total: number; correct: number }>;
  } | null>(null);

  const testStateRef = useRef<TestState>('instructions');
  testStateRef.current = testState;

  // ── 1. Calculate Results ───────────────────────────────────────────────────
  const computeFinalScore = useCallback(() => {
    let correctCount = 0;
    const breakdown: Record<string, { total: number; correct: number }> = {
      'Mathematical Reasoning': { total: 0, correct: 0 },
      'Time, Money & Relationships': { total: 0, correct: 0 },
      'English Vocabulary & Verbal': { total: 0, correct: 0 },
    };

    APTITUDE_QUESTIONS.forEach((q) => {
      if (!breakdown[q.section]) {
        breakdown[q.section] = { total: 0, correct: 0 };
      }
      breakdown[q.section].total += 1;

      if (selectedAnswers[q.id] === q.correctAnswer) {
        correctCount += 1;
        breakdown[q.section].correct += 1;
      }
    });

    const isPassed = correctCount >= 7; // Required: 7 out of 15 to pass

    const scoreData = {
      total: APTITUDE_QUESTIONS.length,
      score: correctCount,
      percentage: Math.round((correctCount / APTITUDE_QUESTIONS.length) * 100),
      isPassed,
      sectionBreakdown: breakdown,
    };

    setFinalScore(scoreData);
    return scoreData;
  }, [selectedAnswers]);

  // ── 2. Handle Violations (Tab Switch / Window Blur) ───────────────────────
  const handleViolation = useCallback(
    (reason: string) => {
      if (testStateRef.current !== 'in_progress') return;

      console.warn('[AntiCheat] Violation detected:', reason);
      setTerminationReason(reason);
      computeFinalScore();
      setTestState('terminated');

      // Record violation in storage
      try {
        localStorage.setItem(
          'SPEECH_ANALYZER_APTITUDE_VIOLATION',
          JSON.stringify({
            reason,
            timestamp: new Date().toISOString(),
            candidate: currentUser?.email || 'Unknown',
          })
        );
      } catch (err) {
        console.error(err);
      }
    },
    [computeFinalScore, currentUser]
  );

  // ── 3. Anti-Cheating & Proctoring Event Listeners ──────────────────────────
  useEffect(() => {
    if (testState !== 'in_progress') return;

    // 1. Tab visibility change detection (Tab Switch)
    const handleVisibilityChange = () => {
      if (document.hidden && testStateRef.current === 'in_progress') {
        handleViolation('Tab Switch Violation: You switched to another browser tab or application.');
      }
    };

    // 2. Window Blur detection (Clicking outside / minimizing)
    const handleWindowBlur = () => {
      if (testStateRef.current === 'in_progress') {
        handleViolation('Window Focus Lost: You switched away from the active examination screen.');
      }
    };

    // 3. Prevent Copy, Cut, Paste, Right-Click, and Context Menu
    const preventCopy = (e: ClipboardEvent) => {
      e.preventDefault();
    };

    const preventContextMenu = (e: MouseEvent) => {
      e.preventDefault();
    };

    // 4. Block Developer Tools & Shortcuts
    const handleKeyDown = (e: KeyboardEvent) => {
      if (
        e.key === 'F12' ||
        (e.ctrlKey && e.shiftKey && (e.key === 'I' || e.key === 'J' || e.key === 'C')) ||
        (e.ctrlKey && (e.key === 'c' || e.key === 'C' || e.key === 'v' || e.key === 'V' || e.key === 'u' || e.key === 'U')) ||
        (e.metaKey && (e.key === 'c' || e.key === 'C' || e.key === 'v' || e.key === 'V'))
      ) {
        e.preventDefault();
        e.stopPropagation();
      }
    };

    document.addEventListener('visibilitychange', handleVisibilityChange);
    window.addEventListener('blur', handleWindowBlur);
    document.addEventListener('copy', preventCopy);
    document.addEventListener('cut', preventCopy);
    document.addEventListener('paste', preventCopy);
    document.addEventListener('contextmenu', preventContextMenu);
    window.addEventListener('keydown', handleKeyDown);

    return () => {
      document.removeEventListener('visibilitychange', handleVisibilityChange);
      window.removeEventListener('blur', handleWindowBlur);
      document.removeEventListener('copy', preventCopy);
      document.removeEventListener('cut', preventCopy);
      document.removeEventListener('paste', preventCopy);
      document.removeEventListener('contextmenu', preventContextMenu);
      window.removeEventListener('keydown', handleKeyDown);
    };
  }, [testState, handleViolation]);

  // ── 4. Live 30-Minute Countdown Timer ─────────────────────────────────────
  useEffect(() => {
    if (testState !== 'in_progress') return;

    const timer = setInterval(() => {
      setTimeLeft((prev) => {
        if (prev <= 1) {
          clearInterval(timer);
          computeFinalScore();
          setTestState('completed');
          return 0;
        }
        return prev - 1;
      });
    }, 1000);

    return () => clearInterval(timer);
  }, [testState, computeFinalScore]);

  // Format seconds to MM:SS
  const formatTime = (seconds: number) => {
    const mins = Math.floor(seconds / 60);
    const secs = seconds % 60;
    return `${mins.toString().padStart(2, '0')}:${secs.toString().padStart(2, '0')}`;
  };

  // Start test
  const handleStartTest = () => {
    setTestState('in_progress');
    setTimeLeft(30 * 60);
    setCurrentIdx(0);
  };

  // Manual Submission
  const handleSubmitTest = () => {
    if (window.confirm('Are you sure you want to submit your Aptitude Assessment now?')) {
      computeFinalScore();
      setTestState('completed');
    }
  };

  // Filter questions by section
  const filteredQuestions = APTITUDE_QUESTIONS.filter((q) => {
    if (activeSectionFilter === 'All') return true;
    return q.section === activeSectionFilter;
  });

  const currentQuestion = APTITUDE_QUESTIONS[currentIdx];

  // Select Option
  const handleSelectOption = (optionIdx: number) => {
    setSelectedAnswers((prev) => ({
      ...prev,
      [currentQuestion.id]: optionIdx,
    }));
  };

  // Toggle Mark for Review
  const toggleMarkForReview = () => {
    setMarkedForReview((prev) => ({
      ...prev,
      [currentQuestion.id]: !prev[currentQuestion.id],
    }));
  };

  // Clear Selection
  const clearSelection = () => {
    setSelectedAnswers((prev) => {
      const copy = { ...prev };
      delete copy[currentQuestion.id];
      return copy;
    });
  };

  // Navigation
  const handleNext = () => {
    if (currentIdx < APTITUDE_QUESTIONS.length - 1) {
      setCurrentIdx(currentIdx + 1);
    }
  };

  const handlePrev = () => {
    if (currentIdx > 0) {
      setCurrentIdx(currentIdx - 1);
    }
  };

  // Summary counts
  const answeredCount = Object.keys(selectedAnswers).length;
  const reviewCount = Object.values(markedForReview).filter(Boolean).length;
  const unansweredCount = APTITUDE_QUESTIONS.length - answeredCount;

  // ── RENDER VIEW ───────────────────────────────────────────────────────────
  return (
    <div style={styles.pageContainer} className="no-select">
      <GlassCanvas3D mode="mixed" intensity={1.15} />

      {/* ── 1. PRE-TEST INSTRUCTIONS SCREEN ── */}
      {testState === 'instructions' && (
        <div style={styles.centerWrapper}>
          <div style={styles.instructionsCard}>
            <div style={styles.headerIcon}>🧠</div>
            <h1 style={styles.mainTitle}>Candidate Aptitude & Reasoning Assessment</h1>
            <p style={styles.subtitle}>
              Standardized Screening Round for all Technical & Non-Technical Roles
            </p>

            <div style={styles.infoGrid}>
              <div style={styles.infoItem}>
                <span style={styles.infoLabel}>⏱️ Duration</span>
                <strong style={styles.infoVal}>30 Minutes</strong>
              </div>
              <div style={styles.infoItem}>
                <span style={styles.infoLabel}>📝 Total Questions</span>
                <strong style={styles.infoVal}>15 Questions</strong>
              </div>
              <div style={styles.infoItem}>
                <span style={styles.infoLabel}>🎯 Qualification Cutoff</span>
                <strong style={{ ...styles.infoVal, color: '#60a5fa' }}>Min 7 / 15 Correct</strong>
              </div>
            </div>

            {/* Section Summary */}
            <div style={styles.sectionSummaryBox}>
              <h3 style={styles.sectionSummaryTitle}>Assessment Structure:</h3>
              <ul style={styles.sectionList}>
                <li>
                  <strong>1. Mathematical Reasoning (5 Qs):</strong> Numerical series, geometry, probability, matrices, combinatorics.
                </li>
                <li>
                  <strong>2. Time, Money & Logical Relationships (5 Qs):</strong> Speed/distance, family blood relations, interest models, work algorithms, clock cycles.
                </li>
                <li>
                  <strong>3. English Vocabulary & Verbal Reasoning (5 Qs):</strong> Antonyms, contextual completions, analogies, double-blank nuances, philosophical syntax.
                </li>
              </ul>
            </div>

            {/* Strict Anti-Cheating Warning */}
            <div style={styles.warningBox}>
              <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', marginBottom: '0.4rem' }}>
                <span style={{ fontSize: '1.25rem' }}>🚨</span>
                <strong style={{ color: '#fca5a5', fontSize: '0.95rem' }}>
                  STRICT PROCTORING & TAB SWITCH POLICY:
                </strong>
              </div>
              <p style={{ margin: 0, fontSize: '0.86rem', color: '#cbd5e1', lineHeight: 1.5 }}>
                • <strong>Tab Switching is strictly prohibited</strong>. Switching to another browser tab, opening search engines, or minimizing the window will <strong>AUTOMATICALLY TERMINATE</strong> your assessment immediately.
                <br />• Text copying, right-clicking, and inspect shortcuts are completely disabled.
              </p>
            </div>

            <button onClick={handleStartTest} style={styles.startBtn}>
              I Understand – Begin 30-Minute Assessment ➔
            </button>
          </div>
        </div>
      )}

      {/* ── 2. TERMINATED SCREEN (TAB SWITCH VIOLATION) ── */}
      {testState === 'terminated' && (
        <div style={styles.centerWrapper}>
          <div style={styles.terminatedCard}>
            <div style={{ fontSize: '4rem', marginBottom: '1rem' }}>🚨</div>
            <h1 style={styles.terminatedTitle}>Assessment Terminated</h1>
            <div style={styles.violationTag}>SECURITY VIOLATION DETECTED</div>

            <p style={styles.terminatedDesc}>
              <strong>Reason:</strong> {terminationReason || 'You switched tabs or lost focus during the examination.'}
            </p>

            <div style={styles.terminatedInfoBox}>
              <p style={{ margin: '0 0 0.5rem 0', color: '#cbd5e1', fontSize: '0.9rem' }}>
                In accordance with examination policy, your session was auto-submitted and flagged for administrative review.
              </p>
              <div style={{ display: 'flex', justifyContent: 'center', gap: '1.5rem', marginTop: '1rem' }}>
                <div>
                  <span style={{ fontSize: '0.8rem', color: '#94a3b8' }}>Questions Answered</span>
                  <div style={{ fontSize: '1.4rem', fontWeight: 800, color: '#f87171' }}>
                    {answeredCount} / {APTITUDE_QUESTIONS.length}
                  </div>
                </div>
                <div>
                  <span style={{ fontSize: '0.8rem', color: '#94a3b8' }}>Status</span>
                  <div style={{ fontSize: '1.4rem', fontWeight: 800, color: '#f87171' }}>
                    DISQUALIFIED
                  </div>
                </div>
              </div>
            </div>

            <button onClick={() => navigate('/')} style={styles.returnBtn}>
              Return to Portal Home
            </button>
          </div>
        </div>
      )}

      {/* ── 3. COMPLETED RESULTS SCREEN (PASS >= 7 vs REJECT < 7) ── */}
      {testState === 'completed' && finalScore && (
        <div style={styles.centerWrapper}>
          {finalScore.isPassed ? (
            /* ── PASSED (Score >= 7) ── */
            <div style={styles.completedCard}>
              <div style={{ fontSize: '3.5rem', marginBottom: '0.75rem' }}>🎉</div>
              <h1 style={styles.mainTitle}>Congratulations! Aptitude Cleared</h1>
              <p style={styles.subtitle}>
                You have successfully met the qualification benchmark for VOXIS.AI assessment rounds.
              </p>

              <div style={styles.scoreCircle}>
                <div style={{ fontSize: '2.5rem', fontWeight: 900, color: '#60a5fa' }}>
                  {finalScore.score} <span style={{ fontSize: '1.25rem', color: '#94a3b8' }}>/ {finalScore.total}</span>
                </div>
                <div style={{ fontSize: '0.88rem', fontWeight: 800, color: '#4ade80' }}>
                  ✓ {finalScore.percentage}% Score (Cutoff: 7 / 15)
                </div>
              </div>

              {/* Section Breakdown */}
              <div style={styles.breakdownContainer}>
                {Object.entries(finalScore.sectionBreakdown).map(([secName, secScore]) => (
                  <div key={secName} style={styles.breakdownRow}>
                    <span style={{ color: '#cbd5e1', fontSize: '0.88rem', fontWeight: 600 }}>{secName}</span>
                    <strong style={{ color: '#ffffff', fontSize: '0.92rem' }}>
                      {secScore.correct} / {secScore.total}
                    </strong>
                  </div>
                ))}
              </div>

              <button onClick={() => navigate('/roles')} style={styles.startBtn}>
                Proceed to Role Selection & Technical Interview ➔
              </button>
            </div>
          ) : (
            /* ── REJECTED (Score < 7) WITH POLITE & MOTIVATIONAL MESSAGE ── */
            <div style={styles.rejectedCard}>
              <div style={{ fontSize: '3.5rem', marginBottom: '0.75rem' }}>💙</div>
              <h1 style={styles.rejectedTitle}>Assessment Result & Feedback</h1>
              <p style={styles.rejectedSubtitle}>
                Thank you for your sincere participation in the VOXIS.AI Candidate Evaluation.
              </p>

              {/* Score Display */}
              <div style={styles.rejectedScoreBox}>
                <div style={{ fontSize: '2.3rem', fontWeight: 900, color: '#f87171' }}>
                  {finalScore.score} <span style={{ fontSize: '1.2rem', color: '#94a3b8' }}>/ {finalScore.total}</span>
                </div>
                <div style={{ fontSize: '0.86rem', fontWeight: 700, color: '#fca5a5', marginTop: '0.25rem' }}>
                  Qualification Cutoff: 7 / 15 correct answers
                </div>
              </div>

              {/* Section Breakdown */}
              <div style={styles.breakdownContainer}>
                {Object.entries(finalScore.sectionBreakdown).map(([secName, secScore]) => (
                  <div key={secName} style={styles.breakdownRow}>
                    <span style={{ color: '#cbd5e1', fontSize: '0.88rem', fontWeight: 600 }}>{secName}</span>
                    <strong style={{ color: '#ffffff', fontSize: '0.92rem' }}>
                      {secScore.correct} / {secScore.total}
                    </strong>
                  </div>
                ))}
              </div>

              {/* Polite & Motivational Message Box */}
              <div style={styles.motivationalBox}>
                <h3 style={{ margin: '0 0 0.6rem 0', color: '#93c5fd', fontSize: '1.05rem', fontWeight: 800 }}>
                  🌱 Every Step is an Opportunity to Grow
                </h3>
                <p style={{ margin: '0 0 0.85rem 0', color: '#e2e8f0', fontSize: '0.92rem', lineHeight: 1.6 }}>
                  While your current score did not meet the qualification threshold for this cycle, please remember that assessments capture a single moment in time—not your ultimate potential.
                </p>
                <blockquote style={styles.quoteBox}>
                  <em>"Success is not final, failure is not fatal: it is the courage to continue that counts."</em>
                  <span style={{ display: 'block', fontSize: '0.78rem', color: '#94a3b8', marginTop: '0.35rem' }}>— Winston Churchill</span>
                </blockquote>
                <p style={{ margin: '0.85rem 0 0 0', color: '#cbd5e1', fontSize: '0.88rem', lineHeight: 1.5 }}>
                  We strongly encourage you to continue honing your mathematical reasoning, problem-solving, and verbal analytical skills. We look forward to welcoming your application in upcoming hiring cycles!
                </p>
              </div>

              <button onClick={() => navigate('/')} style={styles.returnHomeBtn}>
                Return to Candidate Home
              </button>
            </div>
          )}
        </div>
      )}

      {/* ── 4. LIVE PROCTORED TEST VIEW ── */}
      {testState === 'in_progress' && (
        <div style={styles.examContainer}>
          {/* Top Bar */}
          <header style={styles.examHeader}>
            <div style={{ display: 'flex', alignItems: 'center', gap: '0.85rem' }}>
              <div style={styles.logoBadge}>VOXIS PROCTOR</div>
              <div style={styles.candidateBadge}>
                👤 {currentUser?.fullName || 'Candidate'}
              </div>
            </div>

            {/* Live Timer */}
            <div
              style={{
                ...styles.timerBadge,
                background:
                  timeLeft < 180
                    ? 'rgba(239, 68, 68, 0.25)'
                    : timeLeft < 600
                    ? 'rgba(245, 158, 11, 0.2)'
                    : 'rgba(37, 99, 235, 0.2)',
                borderColor:
                  timeLeft < 180 ? '#f87171' : timeLeft < 600 ? '#fbbf24' : '#60a5fa',
                color: timeLeft < 180 ? '#f87171' : timeLeft < 600 ? '#fef08a' : '#93c5fd',
              }}
            >
              <span>⏱️ Time Remaining:</span>
              <strong style={{ fontSize: '1.25rem', letterSpacing: '0.05em' }}>{formatTime(timeLeft)}</strong>
            </div>

            <button onClick={handleSubmitTest} style={styles.finishTopBtn}>
              Submit Assessment ➔
            </button>
          </header>

          {/* Main Exam Grid */}
          <div style={styles.examMainGrid}>
            {/* Left / Center: Question Panel */}
            <div style={styles.questionPanel}>
              {/* Question Header: Section & Progress (Difficulty Level Hidden) */}
              <div style={styles.questionMetaRow}>
                <span style={styles.sectionBadge}>
                  {currentQuestion.section}
                </span>

                <span style={{ fontSize: '0.88rem', color: '#cbd5e1', marginLeft: 'auto', fontWeight: 700 }}>
                  Question {currentIdx + 1} of {APTITUDE_QUESTIONS.length}
                </span>
              </div>

              {/* Question Text */}
              <div style={styles.questionTextBox}>
                <p style={styles.questionText}>
                  <strong style={{ color: '#60a5fa' }}>Q{currentIdx + 1}.</strong> {currentQuestion.question}
                </p>
              </div>

              {/* Options */}
              <div style={styles.optionsContainer}>
                {currentQuestion.options.map((opt, optIdx) => {
                  const isSelected = selectedAnswers[currentQuestion.id] === optIdx;
                  return (
                    <div
                      key={optIdx}
                      onClick={() => handleSelectOption(optIdx)}
                      style={{
                        ...styles.optionCard,
                        background: isSelected
                          ? 'linear-gradient(135deg, rgba(37, 99, 235, 0.3) 0%, rgba(124, 58, 237, 0.35) 100%)'
                          : 'rgba(255, 255, 255, 0.04)',
                        borderColor: isSelected ? '#60a5fa' : 'rgba(255, 255, 255, 0.12)',
                      }}
                    >
                      <div
                        style={{
                          ...styles.optionRadio,
                          background: isSelected ? '#3b82f6' : 'transparent',
                          borderColor: isSelected ? '#60a5fa' : 'rgba(255, 255, 255, 0.4)',
                        }}
                      >
                        {String.fromCharCode(65 + optIdx)}
                      </div>
                      <span style={{ fontSize: '0.94rem', color: '#f1f5f9', lineHeight: 1.5 }}>
                        {opt}
                      </span>
                    </div>
                  );
                })}
              </div>

              {/* Bottom Actions Row */}
              <div style={styles.questionFooter}>
                <div style={{ display: 'flex', gap: '0.5rem' }}>
                  <button
                    type="button"
                    onClick={toggleMarkForReview}
                    style={{
                      ...styles.actionBtn,
                      background: markedForReview[currentQuestion.id]
                        ? 'rgba(168, 85, 247, 0.25)'
                        : 'rgba(255, 255, 255, 0.06)',
                      borderColor: markedForReview[currentQuestion.id] ? '#c084fc' : 'rgba(255, 255, 255, 0.15)',
                      color: markedForReview[currentQuestion.id] ? '#c084fc' : '#cbd5e1',
                    }}
                  >
                    {markedForReview[currentQuestion.id] ? '🟣 Marked for Review' : 'Mark for Review'}
                  </button>

                  <button
                    type="button"
                    onClick={clearSelection}
                    style={{ ...styles.actionBtn, color: '#94a3b8' }}
                  >
                    Clear Response
                  </button>
                </div>

                <div style={{ display: 'flex', gap: '0.6rem' }}>
                  <button
                    type="button"
                    onClick={handlePrev}
                    disabled={currentIdx === 0}
                    style={{
                      ...styles.navBtn,
                      opacity: currentIdx === 0 ? 0.4 : 1,
                    }}
                  >
                    ❮ Previous
                  </button>

                  <button
                    type="button"
                    onClick={handleNext}
                    disabled={currentIdx === APTITUDE_QUESTIONS.length - 1}
                    style={{
                      ...styles.navBtn,
                      background: 'linear-gradient(135deg, #2563eb 0%, #7c3aed 100%)',
                      borderColor: 'rgba(255, 255, 255, 0.3)',
                      color: '#ffffff',
                      opacity: currentIdx === APTITUDE_QUESTIONS.length - 1 ? 0.4 : 1,
                    }}
                  >
                    Next ❯
                  </button>
                </div>
              </div>
            </div>

            {/* Right: Question Palette & Section Navigation */}
            <div style={styles.palettePanel}>
              <h3 style={styles.paletteTitle}>Question Palette</h3>

              {/* Section Filters */}
              <div style={styles.sectionFilterTabs}>
                {['All', 'Mathematical Reasoning', 'Time, Money & Relationships', 'English Vocabulary & Verbal'].map(
                  (sec) => (
                    <button
                      key={sec}
                      onClick={() => setActiveSectionFilter(sec)}
                      style={{
                        ...styles.sectionFilterBtn,
                        background: activeSectionFilter === sec ? 'rgba(59, 130, 246, 0.3)' : 'transparent',
                        borderColor: activeSectionFilter === sec ? '#60a5fa' : 'rgba(255, 255, 255, 0.1)',
                        color: activeSectionFilter === sec ? '#ffffff' : '#94a3b8',
                      }}
                    >
                      {sec === 'All' ? 'All (15)' : sec.split(' ')[0]}
                    </button>
                  )
                )}
              </div>

              {/* 15 Question Matrix Grid */}
              <div style={styles.matrixGrid}>
                {filteredQuestions.map((q) => {
                  const actualIdx = APTITUDE_QUESTIONS.findIndex((item) => item.id === q.id);
                  const isCurrent = currentIdx === actualIdx;
                  const isAnswered = selectedAnswers[q.id] !== undefined;
                  const isMarked = !!markedForReview[q.id];

                  let btnBg = 'rgba(255, 255, 255, 0.05)';
                  let btnBorder = 'rgba(255, 255, 255, 0.15)';
                  let btnColor = '#94a3b8';

                  if (isCurrent) {
                    btnBg = '#2563eb';
                    btnBorder = '#93c5fd';
                    btnColor = '#ffffff';
                  } else if (isMarked) {
                    btnBg = 'rgba(168, 85, 247, 0.3)';
                    btnBorder = '#c084fc';
                    btnColor = '#e9d5ff';
                  } else if (isAnswered) {
                    btnBg = 'rgba(34, 197, 94, 0.25)';
                    btnBorder = '#4ade80';
                    btnColor = '#86efac';
                  }

                  return (
                    <button
                      key={q.id}
                      onClick={() => setCurrentIdx(actualIdx)}
                      style={{
                        ...styles.matrixNode,
                        background: btnBg,
                        borderColor: btnBorder,
                        color: btnColor,
                      }}
                    >
                      {actualIdx + 1}
                    </button>
                  );
                })}
              </div>

              {/* Status Legend */}
              <div style={styles.legendBox}>
                <div style={styles.legendItem}>
                  <div style={{ ...styles.legendDot, background: 'rgba(34, 197, 94, 0.4)', borderColor: '#4ade80' }} />
                  <span>Answered ({answeredCount})</span>
                </div>
                <div style={styles.legendItem}>
                  <div style={{ ...styles.legendDot, background: 'rgba(255, 255, 255, 0.1)', borderColor: 'rgba(255,255,255,0.2)' }} />
                  <span>Unanswered ({unansweredCount})</span>
                </div>
                <div style={styles.legendItem}>
                  <div style={{ ...styles.legendDot, background: 'rgba(168, 85, 247, 0.4)', borderColor: '#c084fc' }} />
                  <span>Marked ({reviewCount})</span>
                </div>
                <div style={styles.legendItem}>
                  <div style={{ ...styles.legendDot, background: '#2563eb', borderColor: '#93c5fd' }} />
                  <span>Current</span>
                </div>
              </div>

              {/* Final Submit Button */}
              <button onClick={handleSubmitTest} style={styles.submitTestBtn}>
                End & Submit Assessment ➔
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

const styles: Record<string, React.CSSProperties> = {
  pageContainer: {
    minHeight: '100vh',
    position: 'relative',
    zIndex: 1,
    paddingBottom: '2.5rem',
    userSelect: 'none',
    WebkitUserSelect: 'none',
  },
  centerWrapper: {
    maxWidth: '780px',
    margin: '3rem auto 0 auto',
    padding: '0 1.25rem',
  },
  instructionsCard: {
    background: 'rgba(15, 23, 42, 0.8)',
    backdropFilter: 'blur(30px)',
    border: '1px solid rgba(255, 255, 255, 0.16)',
    borderRadius: '24px',
    padding: '2.5rem 2.5rem',
    boxShadow: '0 25px 60px rgba(0, 0, 0, 0.7), 0 0 35px rgba(37, 99, 235, 0.2)',
    textAlign: 'center',
  },
  headerIcon: {
    fontSize: '3.5rem',
    marginBottom: '0.75rem',
  },
  mainTitle: {
    fontSize: '2rem',
    fontWeight: 900,
    color: '#ffffff',
    margin: '0 0 0.5rem 0',
    letterSpacing: '-0.02em',
  },
  subtitle: {
    fontSize: '0.95rem',
    color: '#cbd5e1',
    margin: '0 0 2rem 0',
  },
  infoGrid: {
    display: 'grid',
    gridTemplateColumns: 'repeat(auto-fit, minmax(180px, 1fr))',
    gap: '1rem',
    marginBottom: '1.75rem',
  },
  infoItem: {
    background: 'rgba(255, 255, 255, 0.05)',
    border: '1px solid rgba(255, 255, 255, 0.1)',
    padding: '1rem',
    borderRadius: '14px',
    display: 'flex',
    flexDirection: 'column',
    gap: '0.35rem',
  },
  infoLabel: {
    fontSize: '0.78rem',
    color: '#94a3b8',
    fontWeight: 600,
  },
  infoVal: {
    fontSize: '1.1rem',
    color: '#ffffff',
  },
  sectionSummaryBox: {
    background: 'rgba(255, 255, 255, 0.03)',
    border: '1px solid rgba(255, 255, 255, 0.1)',
    borderRadius: '14px',
    padding: '1.25rem 1.5rem',
    textAlign: 'left',
    marginBottom: '1.75rem',
  },
  sectionSummaryTitle: {
    margin: '0 0 0.75rem 0',
    fontSize: '0.95rem',
    color: '#93c5fd',
    fontWeight: 800,
  },
  sectionList: {
    margin: 0,
    paddingLeft: '1.25rem',
    color: '#cbd5e1',
    fontSize: '0.88rem',
    lineHeight: 1.6,
  },
  warningBox: {
    background: 'rgba(239, 68, 68, 0.15)',
    border: '1.5px solid rgba(239, 68, 68, 0.45)',
    borderRadius: '14px',
    padding: '1.2rem 1.4rem',
    textAlign: 'left',
    marginBottom: '2rem',
  },
  startBtn: {
    width: '100%',
    padding: '1rem 2rem',
    borderRadius: '16px',
    background: 'linear-gradient(135deg, #2563eb 0%, #7c3aed 100%)',
    color: '#ffffff',
    border: '1px solid rgba(255, 255, 255, 0.3)',
    fontWeight: 900,
    fontSize: '1.05rem',
    boxShadow: '0 10px 30px rgba(37, 99, 235, 0.4), inset 0 1px 1px rgba(255, 255, 255, 0.4)',
    cursor: 'pointer',
    transition: 'all 0.2s ease',
  },
  terminatedCard: {
    background: 'rgba(20, 10, 15, 0.9)',
    backdropFilter: 'blur(30px)',
    border: '2px solid rgba(239, 68, 68, 0.6)',
    borderRadius: '24px',
    padding: '3rem 2.5rem',
    boxShadow: '0 25px 60px rgba(0, 0, 0, 0.8), 0 0 45px rgba(239, 68, 68, 0.3)',
    textAlign: 'center',
  },
  terminatedTitle: {
    fontSize: '2.2rem',
    fontWeight: 900,
    color: '#fca5a5',
    margin: '0 0 0.5rem 0',
  },
  violationTag: {
    display: 'inline-block',
    padding: '0.35rem 1rem',
    borderRadius: '999px',
    background: 'rgba(239, 68, 68, 0.25)',
    color: '#f87171',
    border: '1px solid rgba(239, 68, 68, 0.5)',
    fontSize: '0.82rem',
    fontWeight: 900,
    letterSpacing: '0.06em',
    marginBottom: '1.25rem',
  },
  terminatedDesc: {
    fontSize: '1rem',
    color: '#fca5a5',
    lineHeight: 1.5,
    margin: '0 0 1.5rem 0',
  },
  terminatedInfoBox: {
    background: 'rgba(0, 0, 0, 0.4)',
    border: '1px solid rgba(239, 68, 68, 0.3)',
    padding: '1.25rem',
    borderRadius: '14px',
    marginBottom: '2rem',
  },
  returnBtn: {
    background: 'rgba(255, 255, 255, 0.08)',
    border: '1px solid rgba(255, 255, 255, 0.2)',
    color: '#ffffff',
    padding: '0.85rem 1.75rem',
    borderRadius: '14px',
    fontWeight: 800,
    cursor: 'pointer',
  },
  completedCard: {
    background: 'rgba(15, 23, 42, 0.85)',
    backdropFilter: 'blur(30px)',
    border: '1px solid rgba(74, 222, 128, 0.4)',
    borderRadius: '24px',
    padding: '3rem 2.5rem',
    textAlign: 'center',
    boxShadow: '0 25px 60px rgba(0, 0, 0, 0.7), 0 0 35px rgba(74, 222, 128, 0.25)',
  },
  rejectedCard: {
    background: 'rgba(15, 23, 42, 0.9)',
    backdropFilter: 'blur(30px)',
    border: '1px solid rgba(96, 165, 250, 0.3)',
    borderRadius: '24px',
    padding: '3rem 2.25rem',
    textAlign: 'center',
    boxShadow: '0 25px 60px rgba(0, 0, 0, 0.7), 0 0 35px rgba(96, 165, 250, 0.15)',
  },
  rejectedTitle: {
    fontSize: '2rem',
    fontWeight: 900,
    color: '#ffffff',
    margin: '0 0 0.5rem 0',
  },
  rejectedSubtitle: {
    fontSize: '0.94rem',
    color: '#cbd5e1',
    margin: '0 0 1.75rem 0',
  },
  rejectedScoreBox: {
    background: 'rgba(239, 68, 68, 0.12)',
    border: '1px solid rgba(239, 68, 68, 0.3)',
    borderRadius: '20px',
    padding: '1.25rem',
    maxWidth: '280px',
    margin: '0 auto 1.75rem auto',
  },
  motivationalBox: {
    background: 'linear-gradient(135deg, rgba(37, 99, 235, 0.12) 0%, rgba(124, 58, 237, 0.12) 100%)',
    border: '1px solid rgba(96, 165, 250, 0.3)',
    borderRadius: '16px',
    padding: '1.5rem',
    textAlign: 'left',
    marginBottom: '2rem',
  },
  quoteBox: {
    margin: '0.75rem 0',
    padding: '0.75rem 1.25rem',
    background: 'rgba(0, 0, 0, 0.25)',
    borderLeft: '4px solid #60a5fa',
    borderRadius: '0 10px 10px 0',
    color: '#fef08a',
    fontSize: '0.92rem',
  },
  returnHomeBtn: {
    background: 'rgba(255, 255, 255, 0.1)',
    border: '1px solid rgba(255, 255, 255, 0.25)',
    color: '#ffffff',
    padding: '0.9rem 2.25rem',
    borderRadius: '14px',
    fontWeight: 800,
    fontSize: '0.96rem',
    cursor: 'pointer',
    transition: 'all 0.2s ease',
  },
  scoreCircle: {
    background: 'rgba(255, 255, 255, 0.05)',
    border: '1px solid rgba(255, 255, 255, 0.12)',
    borderRadius: '20px',
    padding: '1.5rem',
    maxWidth: '260px',
    margin: '0 auto 1.75rem auto',
  },
  breakdownContainer: {
    background: 'rgba(255, 255, 255, 0.03)',
    border: '1px solid rgba(255, 255, 255, 0.08)',
    borderRadius: '14px',
    padding: '1rem 1.5rem',
    marginBottom: '2rem',
    textAlign: 'left',
  },
  breakdownRow: {
    display: 'flex',
    justifyContent: 'space-between',
    padding: '0.5rem 0',
    borderBottom: '1px solid rgba(255, 255, 255, 0.06)',
  },
  examContainer: {
    maxWidth: '1280px',
    margin: '1rem auto 0 auto',
    padding: '0 1.25rem',
  },
  examHeader: {
    display: 'flex',
    justifyContent: 'space-between',
    alignItems: 'center',
    background: 'rgba(15, 23, 42, 0.75)',
    backdropFilter: 'blur(20px)',
    borderRadius: '18px',
    border: '1px solid rgba(255, 255, 255, 0.14)',
    padding: '0.75rem 1.5rem',
    marginBottom: '1.25rem',
    boxShadow: '0 10px 30px rgba(0, 0, 0, 0.5)',
  },
  logoBadge: {
    fontSize: '0.78rem',
    fontWeight: 900,
    background: 'linear-gradient(135deg, #2563eb 0%, #7c3aed 100%)',
    color: '#ffffff',
    padding: '0.3rem 0.75rem',
    borderRadius: '8px',
    letterSpacing: '0.04em',
  },
  candidateBadge: {
    fontSize: '0.88rem',
    fontWeight: 700,
    color: '#e2e8f0',
  },
  timerBadge: {
    display: 'flex',
    alignItems: 'center',
    gap: '0.65rem',
    border: '1.5px solid',
    borderRadius: '12px',
    padding: '0.45rem 1.1rem',
    fontSize: '0.88rem',
  },
  finishTopBtn: {
    background: 'linear-gradient(135deg, #2563eb 0%, #7c3aed 100%)',
    color: '#ffffff',
    border: '1px solid rgba(255, 255, 255, 0.3)',
    borderRadius: '12px',
    padding: '0.55rem 1.2rem',
    fontWeight: 800,
    fontSize: '0.88rem',
    cursor: 'pointer',
  },
  examMainGrid: {
    display: 'grid',
    gridTemplateColumns: '1fr 340px',
    gap: '1.25rem',
  },
  questionPanel: {
    background: 'rgba(15, 23, 42, 0.75)',
    backdropFilter: 'blur(28px)',
    border: '1px solid rgba(255, 255, 255, 0.14)',
    borderRadius: '22px',
    padding: '2rem 2.25rem',
    display: 'flex',
    flexDirection: 'column',
    justifyContent: 'space-between',
    minHeight: '520px',
  },
  questionMetaRow: {
    display: 'flex',
    alignItems: 'center',
    gap: '0.75rem',
    marginBottom: '1.25rem',
    flexWrap: 'wrap',
  },
  sectionBadge: {
    background: 'rgba(96, 165, 250, 0.15)',
    color: '#93c5fd',
    border: '1px solid rgba(96, 165, 250, 0.4)',
    padding: '0.35rem 0.85rem',
    borderRadius: '10px',
    fontSize: '0.82rem',
    fontWeight: 800,
  },
  questionTextBox: {
    background: 'rgba(255, 255, 255, 0.04)',
    border: '1px solid rgba(255, 255, 255, 0.08)',
    borderRadius: '16px',
    padding: '1.4rem 1.6rem',
    marginBottom: '1.5rem',
  },
  questionText: {
    fontSize: '1.08rem',
    lineHeight: 1.65,
    color: '#ffffff',
    margin: 0,
    fontWeight: 500,
  },
  optionsContainer: {
    display: 'flex',
    flexDirection: 'column',
    gap: '0.85rem',
    marginBottom: '2rem',
  },
  optionCard: {
    display: 'flex',
    alignItems: 'center',
    gap: '1rem',
    padding: '1rem 1.25rem',
    borderRadius: '14px',
    border: '1.5px solid',
    cursor: 'pointer',
    transition: 'all 0.2s ease',
  },
  optionRadio: {
    width: '28px',
    height: '28px',
    borderRadius: '50%',
    border: '2px solid',
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
    fontSize: '0.82rem',
    fontWeight: 900,
    color: '#ffffff',
    flexShrink: 0,
  },
  questionFooter: {
    display: 'flex',
    justifyContent: 'space-between',
    alignItems: 'center',
    borderTop: '1px solid rgba(255, 255, 255, 0.1)',
    paddingTop: '1.25rem',
    flexWrap: 'wrap',
    gap: '0.75rem',
  },
  actionBtn: {
    background: 'transparent',
    border: '1px solid rgba(255, 255, 255, 0.15)',
    padding: '0.5rem 0.9rem',
    borderRadius: '10px',
    fontSize: '0.82rem',
    fontWeight: 700,
    cursor: 'pointer',
  },
  navBtn: {
    background: 'rgba(255, 255, 255, 0.08)',
    border: '1px solid rgba(255, 255, 255, 0.2)',
    color: '#cbd5e1',
    padding: '0.6rem 1.25rem',
    borderRadius: '12px',
    fontSize: '0.88rem',
    fontWeight: 800,
    cursor: 'pointer',
  },
  palettePanel: {
    background: 'rgba(15, 23, 42, 0.75)',
    backdropFilter: 'blur(28px)',
    border: '1px solid rgba(255, 255, 255, 0.14)',
    borderRadius: '22px',
    padding: '1.5rem',
    display: 'flex',
    flexDirection: 'column',
    justifyContent: 'space-between',
  },
  paletteTitle: {
    margin: '0 0 1rem 0',
    fontSize: '1.05rem',
    fontWeight: 800,
    color: '#ffffff',
  },
  sectionFilterTabs: {
    display: 'flex',
    flexDirection: 'column',
    gap: '0.35rem',
    marginBottom: '1.25rem',
  },
  sectionFilterBtn: {
    textAlign: 'left',
    padding: '0.45rem 0.75rem',
    borderRadius: '8px',
    border: '1px solid',
    fontSize: '0.78rem',
    fontWeight: 700,
    cursor: 'pointer',
  },
  matrixGrid: {
    display: 'grid',
    gridTemplateColumns: 'repeat(5, 1fr)',
    gap: '0.5rem',
    marginBottom: '1.5rem',
  },
  matrixNode: {
    aspectRatio: '1',
    borderRadius: '10px',
    border: '1px solid',
    fontSize: '0.88rem',
    fontWeight: 800,
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
    cursor: 'pointer',
    transition: 'all 0.15s ease',
  },
  legendBox: {
    background: 'rgba(255, 255, 255, 0.03)',
    border: '1px solid rgba(255, 255, 255, 0.08)',
    borderRadius: '12px',
    padding: '0.85rem',
    display: 'grid',
    gridTemplateColumns: '1fr 1fr',
    gap: '0.5rem',
    fontSize: '0.75rem',
    color: '#cbd5e1',
    marginBottom: '1.25rem',
  },
  legendItem: {
    display: 'flex',
    alignItems: 'center',
    gap: '0.4rem',
  },
  legendDot: {
    width: '10px',
    height: '10px',
    borderRadius: '50%',
    border: '1px solid',
  },
  submitTestBtn: {
    width: '100%',
    padding: '0.85rem',
    borderRadius: '14px',
    background: 'linear-gradient(135deg, #2563eb 0%, #7c3aed 100%)',
    color: '#ffffff',
    border: '1px solid rgba(255, 255, 255, 0.3)',
    fontWeight: 900,
    fontSize: '0.95rem',
    cursor: 'pointer',
  },
};

export default AptitudeRoundPage;
