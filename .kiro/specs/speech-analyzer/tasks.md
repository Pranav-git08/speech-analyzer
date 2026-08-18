# Implementation Plan

- [x] 1. Project setup and core type definitions





  - Initialise Node.js/TypeScript project with Express.js backend and React frontend
  - Set up PostgreSQL schema (candidates, job_roles, interview_sessions, questions, recordings tables)
  - Define all shared TypeScript interfaces: `ResumeData`, `Experience`, `Project`, `JobRole`, `Question`, `Answer`, `EvaluationResult`, `InterviewSession`, `ConfidenceAnalysis`, `RecordingMetadata`
  - Configure `fast-check` as the property-based testing library and Jest as the test runner
  - Set up environment configuration for external services (Twilio, SendGrid, STT, storage)
  - _Requirements: 1.1, 2.1, 3.1, 11.1_

- [x] 2. Resume Parser Service




- [x] 2.1 Implement resume parser for PDF and DOCX formats


  - Write `parseResume(file)` using pdfplumber (PDF) and python-docx (DOCX) or equivalent JS libraries
  - Extract name, phone, email, skills, experience entries, and projects into a `ResumeData` object
  - Return HTTP 400 for unsupported formats and HTTP 422 for parse failures
  - _Requirements: 11.1, 11.4_

- [x] 2.2 Implement resume serialisation and deserialisation


  - Write `serialiseResumeData(data: ResumeData): string` using JSON serialisation
  - Write `deserialiseResumeData(serialised: string): ResumeData` with schema validation
  - _Requirements: 11.2, 11.3_

- [x] 2.3 Write property test for resume serialisation round-trip (Property 19)


  - **Property 19: Resume serialisation round-trip** 
  - **Validates: Requirements 11.2, 11.3**

- [x] 2.4 Write property test for resume parser completeness (Property 20)


  - **Property 20: Resume parser completeness**
  - **Validates: Requirements 11.1**

- [x] 3. Skill Matcher





- [x] 3.1 Implement skill matching function


  - Write `matchSkills(candidateSkills, requiredSkills)` returning `{ matched, isEligible }`
  - Normalise skill strings (lowercase, trim) before comparison
  - Return `isEligible: true` when intersection is non-empty, `false` otherwise
  - _Requirements: 2.2, 2.3, 2.4_

- [x] 3.2 Write property test for skill eligibility correctness (Property 1)


  - **Property 1: Skill eligibility correctness**
  - **Validates: Requirements 2.3, 2.4**

- [-] 4. Question Generator


- [x] 4.1 Implement question bank data seeding


  - Create seed data for at least 3 TJI job roles and 3 NTJI job roles with associated question banks
  - Each TJI question bank must include both `oral` and `code_snippet` type questions per skill
  - _Requirements: 3.1, 3.2, 5.1, 10.1_

- [x] 4.2 Implement `generateQuestionSet` function


  - Query question bank by job role ID and filter by matched skills
  - For `technical` round type, ensure the returned set contains both `oral` and `code_snippet` questions
  - For `qualifying` and `hr` round types, return oral questions only
  - For HR round, include questions derived from resume experience and project data
  - _Requirements: 3.1, 3.2, 5.1, 6.1, 10.1_

- [x] 4.3 Write property test for question generation relevance (Property 3)







  - **Property 3: Question generation relevance**
  - **Validates: Requirements 3.1, 5.1, 10.1**

- [-] 4.4 Write property test for question set composition (Property 4)

  - **Property 4: Question set composition**
  - **Validates: Requirements 3.2**

- [x] 4.5 Write property test for HR question personalisation (Property 10)


  - **Property 10: HR question personalisation**
  - **Validates: Requirements 6.1**

- [x] 5. Evaluation Engine




- [x] 5.1 Implement keyword matching evaluator


  - Write `evaluateOralAnswer(answer, expectedKeywords)` returning `EvaluationResult`
  - Compute score as `(matchedKeywords.length / expectedKeywords.length) * 100`
  - Assign `pass` when score >= 50, `poor` when score < 50
  - _Requirements: 3.3, 5.3, 10.2, 10.4, 10.5_

- [x] 5.2 Write property test for keyword matching grading (Property 5)


  - **Property 5: Keyword matching grading**
  - **Validates: Requirements 3.3, 5.3, 10.2, 10.4, 10.5**

- [x] 5.3 Implement three-strike termination logic


  - Write `shouldTerminateRound(evaluations)` that returns `true` when the last 3 consecutive evaluations all have grade `poor`
  - _Requirements: 3.5, 5.4_

- [x] 5.4 Write property test for three-strike termination (Property 6)


  - **Property 6: Three-strike termination**
  - **Validates: Requirements 3.5, 5.4**

- [x] 5.5 Implement code snippet evaluator


  - Write `evaluateCodeAnswer(code, expectedSolution, language)` using static analysis or sandboxed execution
  - Compare output or AST structure against expected solution
  - _Requirements: 3.4, 10.3_
-

- [x] 6. Notification Service and Unique Code





- [x] 6.1 Implement unique code generator

  - Write `generateUniqueCode()` producing a cryptographically random alphanumeric string
  - Ensure uniqueness by checking against existing codes in the database before returning
  - _Requirements: 4.1_

- [x] 6.2 Write property test for unique code uniqueness (Property 8)


  - **Property 8: Unique code uniqueness**
  - **Validates: Requirements 4.1**


- [x] 6.3 Implement unique code verification

  - Write `verifyUniqueCode(code)` that returns `true` for valid approved-candidate codes and `false` otherwise
  - Return HTTP 401 for invalid codes and HTTP 409 for already-used codes
  - _Requirements: 4.3, 4.4_


- [x] 6.4 Write property test for unique code verification (Property 9)

  - **Property 9: Unique code verification**
  - **Validates: Requirements 4.3, 4.4**



- [x] 6.5 Implement SMS and email notification functions

  - Integrate Twilio SDK for `sendSMS(phoneNumber, message)`
  - Integrate SendGrid SDK for `sendEmail(email, subject, body, attachments?)`
  - Implement retry logic (3 attempts, exponential backoff) for both
  - _Requirements: 4.2, 9.3, 9.4, 9.5, 9.6_

- [x] 7. Checkpoint — Ensure all tests pass, ask the user if questions arise.






- [x] 8. AI Analysis Service





- [x] 8.1 Implement filler word detector


  - Write `detectFillerWords(transcribedText)` with a configurable filler word list (umm, ah, like, you know, etc.)
  - Return `{ count, words }` with exact occurrence count
  - _Requirements: 7.2_

- [x] 8.2 Write property test for filler word detection accuracy (Property 13)


  - **Property 13: Filler word detection accuracy**
  - **Validates: Requirements 7.2**

- [x] 8.3 Implement confidence score computation

  - Write `computeConfidenceScore(composureScore, fillerWordCount)` combining both signals
  - Composure mapping: composed=100, slightly_positive=80, neutral=60, distressed=20
  - Filler word penalty: subtract points proportional to filler word count (capped at 0)
  - _Requirements: 7.3, 7.4_

- [x] 8.4 Write property test for confidence score monotonicity (Property 14)

  - **Property 14: Confidence score monotonicity**
  - **Validates: Requirements 7.3, 7.4**

- [x] 8.5 Integrate Speech-to-Text API

  - Implement `transcribeAudio(audioBlob)` using OpenAI Whisper or Google STT
  - Handle STT failure by falling back to text input mode
  - _Requirements: 3.3, 5.3_

- [x] 8.6 Integrate facial expression analysis

  - Implement `analyseFacialExpression(videoFrame)` using a pre-trained FER model
  - Return one of: `composed`, `slightly_positive`, `neutral`, `distressed`
  - Handle analysis failure gracefully (skip frame, do not terminate session)
  - _Requirements: 7.1_

- [x] 8.7 Write property test for composure classification validity (Property 12)

  - **Property 12: Composure classification validity**
  - **Validates: Requirements 7.1**
-

- [x] 9. Grade Computation and Confidence Integration




- [x] 9.1 Implement round grade compiler

  - Write function to compute a round's overall grade from individual answer scores
  - For rounds with confidence analysis, include confidence score with a defined weight (e.g., 20% confidence, 80% answer scores)
  - _Requirements: 7.5_

- [x] 9.2 Write property test for confidence score inclusion in grade (Property 15)


  - **Property 15: Confidence score inclusion in grade**
  - **Validates: Requirements 7.5**

- [x] 9.3 Implement final grade computation


  - Write `computeFinalGrade(initialRoundGrade, hrRoundGrade)` combining both rounds
  - Ensure output is always in [0, 100] and is deterministic
  - _Requirements: 6.4_


- [x] 9.4 Write property test for final grade computation bounds (Property 11)


  - **Property 11: Final grade computation bounds**
  - **Validates: Requirements 6.4**

- [x] 10. Interview Service (Orchestrator)




- [x] 10.1 Implement interview session management


  - Write `startInterview`, `getNextQuestion`, `submitAnswer`, and `completeInterview` functions
  - Manage session state: current question index, consecutive poor grade counter, status transitions
  - Wire together Question Generator, Evaluation Engine, AI Analysis Service, and Recording Service
  - _Requirements: 3.1–3.7, 5.1–5.6, 6.1–6.4_

- [x] 10.2 Implement session summary persistence


  - On session completion or termination, write all questions, answers, and evaluations to the `interview_sessions` table
  - Associate recording ID with the session record
  - _Requirements: 3.7, 5.6, 6.3, 8.2_

- [x] 10.3 Write property test for session summary completeness (Property 7)


  - **Property 7: Session summary completeness**
  - **Validates: Requirements 3.7, 5.6, 6.3**
-

- [x] 11. Recording Service






- [x] 11.1 Implement recording start/stop and storage upload


  - Write `startRecording(sessionId)` and `stopRecording(recordingId)` functions
  - Upload completed recording to MinIO/S3 and store metadata in the `recordings` table
  - Associate recording with `candidateId` and `jobRoleId`
  - _Requirements: 8.1, 8.2_

- [x] 11.2 Write property test for recording association correctness (Property 16)


  - **Property 16: Recording association correctness**
  - **Validates: Requirements 8.2, 8.3**
-

- [x] 12. Resume Data Persistence







- [x] 12.1 Implement resume data storage and retrieval

  - Write functions to store parsed `ResumeData` as JSONB in the candidates table
  - Write retrieval function that returns the original `ResumeData` structure
  - _Requirements: 2.5_

- [x] 12.2 Write property test for resume data persistence round-trip (Property 2)

  - **Property 2: Resume data persistence round-trip**
  - **Validates: Requirements 2.5**

- [x] 13. Checkpoint — Ensure all tests pass, ask the user if questions arise.





- [x] 14. REST API Layer





- [x] 14.1 Implement candidate-facing API endpoints

  - `GET /api/tracks`, `GET /api/roles`, `POST /api/resume/upload`
  - `POST /api/interview/start`, `GET /api/interview/question`, `POST /api/interview/answer`, `POST /api/interview/complete`
  - `POST /api/hr-round/verify-code`
  - _Requirements: 1.1–1.3, 2.1–2.4, 3.1–3.7, 4.3, 4.4, 5.1–5.6, 6.1–6.4_


- [x] 14.2 Implement admin API endpoints


  - `GET /api/admin/candidates`, `GET /api/admin/candidate/:id`
  - `POST /api/admin/candidate/:id/approve-initial`, `POST /api/admin/candidate/:id/approve-final`, `POST /api/admin/candidate/:id/reject`
  - `GET /api/admin/recording/:id`
  - Wire approval actions to Notification Service (SMS/email dispatch)
  - _Requirements: 9.1–9.6_



- [x] 14.3 Write property test for candidate record availability (Property 17)

  - **Property 17: Candidate record availability**
  - **Validates: Requirements 9.1**



- [x] 14.4 Write property test for passing candidate classification (Property 18)

  - **Property 18: Passing candidate classification**
  - **Validates: Requirements 9.2**

- [x] 15. Candidate Frontend






- [x] 15.1 Implement landing page with track selection

  - Build React component showing TJI and NTJI options
  - Navigate to job role selection on track click
  - _Requirements: 1.1, 1.2_


- [x] 15.2 Implement job role selection and resume upload screen

  - Display required skills for selected job role
  - File upload component accepting PDF and DOCX only
  - Show skill match result and eligibility message
  - _Requirements: 1.3, 2.1–2.4_


- [x] 15.3 Implement interview UI

  - Question display with answer input modes: text area (oral), code editor (code snippet), voice recorder
  - WebRTC video/audio capture for recording and confidence analysis
  - Progress indicator and termination/completion message display
  - Language selection dropdown for NTJI Qualifying Round
  - _Requirements: 3.1–3.6, 5.1–5.5, 7.1, 7.2, 8.1_


- [x] 15.4 Implement HR Round entry screen

  - Unique code input field with validation
  - Display error message for invalid/expired codes
  - _Requirements: 4.3, 4.4_


- [x] 16. Admin Dashboard Frontend




- [x] 16.1 Implement candidate list view

  - Table of all candidates with job role, track, status, grade, and passing/failing highlight
  - Filter controls by track, job role, and status
  - _Requirements: 9.1, 9.2_


- [x] 16.2 Implement candidate detail view






  - Show round summaries, grades, confidence scores, and embedded video player for recording
  - Approve/reject buttons for initial round and final round decisions
  - Job offer letter upload for final approval
  - _Requirements: 8.3, 9.3–9.6_
-

- [x] 17. Final Checkpoint — Ensure all tests pass, ask the user if questions arise.




