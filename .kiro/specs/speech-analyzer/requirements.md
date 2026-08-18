# Requirements Document

## Introduction

SPEECH ANALYZER - AI ASSISTANT FOR EVALUATION OF INTERVIEW is an AI-powered automated interview platform that conducts structured job interviews on behalf of companies and organisations. The system supports two interview tracks: Technical Job Interview (TJI) and Non-Technical Job Interview (NTJI). Each track consists of two sequential rounds where candidates must clear the initial round before advancing to the HR round. The system evaluates candidates using resume parsing, question-answer grading, facial expression analysis, speech analysis (filler word detection), and compiles results into an admin dashboard. Shortlisted candidates receive SMS notifications with a unique code to attend the HR round, and final selections are communicated via SMS and email.

---

## Glossary

- **SPEECH ANALYZER**: The AI-powered interview evaluation platform described in this document.
- **TJI (Technical Job Interview)**: The interview track for technical job roles, consisting of a Technical Round followed by an HR Round.
- **NTJI (Non-Technical Job Interview)**: The interview track for non-technical job roles, consisting of a Qualifying Round followed by an HR Round.
- **Technical Round**: The initial interview round in TJI that evaluates technical skills through coding and oral questions.
- **Qualifying Round**: The initial interview round in NTJI that evaluates role-relevant knowledge through oral questions.
- **HR Round**: The second interview round in both TJI and NTJI, focused on soft skills, experience, and composure.
- **Candidate**: A job applicant who uses the system to attend an interview.
- **Admin**: An authorised company or organisation representative who reviews results and approves decisions in the dashboard.
- **Resume**: A PDF or document uploaded by the candidate containing personal details, skills, experience, and projects.
- **Unique Code**: A system-generated alphanumeric identifier assigned to each candidate upon clearing the initial round.
- **Job Role**: A predefined position (e.g., Backend Developer, HR Executive) with associated required skills and question banks.
- **Skill Match**: The process of comparing skills listed in the candidate's resume against the required skills for the selected job role.
- **Filler Words**: Non-lexical speech sounds or words (e.g., "umm", "ah", "like", "you know") detected during spoken answers.
- **Confidence Score**: A composite score derived from facial expression analysis and filler word frequency during spoken responses.
- **Grade**: A numerical or letter-based score assigned to a candidate's answer or overall performance.
- **Poor Grade**: A grade below the defined passing threshold for a given answer or round.
- **Admin Dashboard**: A web interface where the admin reviews candidate evaluations, interview recordings, grades, and approves or rejects candidates.
- **Preferred Language**: The programming language selected by a NTJI candidate from a provided list of 2–4 options for answering questions.
- **Oral Answer**: A spoken response captured via microphone and transcribed for evaluation.
- **Code Snippet Question**: A question that presents broken or incomplete code for the candidate to correct or complete.
- **Keyword Matching**: The evaluation method that compares candidate answers against expected answers by counting matched keywords.
- **Composure**: A behavioural quality assessed through facial expression analysis indicating calmness and professionalism.
- **Soft Skills**: Interpersonal and communication abilities relevant to a job role, evaluated during the HR Round.
- **Job Offer Letter**: A document provided by the admin and sent via email to selected candidates after final approval.
- **SMS Notification**: A text message sent to the candidate's phone number extracted from the resume.

---

## Requirements

### Requirement 1: Interview Track Selection

**User Story:** As a candidate, I want to choose between a Technical Job Interview and a Non-Technical Job Interview at the start, so that I am directed to the appropriate interview process for my target role.

#### Acceptance Criteria

1. WHEN a candidate accesses the SPEECH ANALYZER platform, THE system SHALL display two clearly labelled options: "Technical Job Interview (TJI)" and "Non-Technical Job Interview (NTJI)".
2. WHEN a candidate selects an interview track, THE system SHALL navigate the candidate to the job role selection screen for that track.
3. WHEN a candidate selects a job role, THE system SHALL display the required skills and a resume upload prompt for that role.

---

### Requirement 2: Resume Upload and Skill Match

**User Story:** As a candidate, I want to upload my resume so that the system can verify whether my skills match the requirements of the selected job role before allowing me to proceed.

#### Acceptance Criteria

1. WHEN a candidate uploads a resume, THE system SHALL parse the resume and extract skills, experience, projects, and contact information including phone number.
2. WHEN the system extracts skills from the resume, THE system SHALL compare the extracted skills against the required skills defined for the selected job role.
3. WHEN at least one required skill for the selected job role is found in the candidate's resume, THE system SHALL grant the candidate access to the initial interview round.
4. IF no required skills for the selected job role are found in the candidate's resume, THEN THE system SHALL display a rejection message and prevent the candidate from proceeding to the interview.
5. THE system SHALL store the parsed resume data, including extracted skills, experience, and projects, for use in generating interview questions and HR round evaluation.

---

### Requirement 3: TJI – Technical Round

**User Story:** As a candidate applying for a technical role, I want to take a Technical Round interview so that my technical knowledge and coding ability can be evaluated.

#### Acceptance Criteria

1. WHEN a candidate begins the Technical Round, THE system SHALL generate a set of questions based on the skills found in the candidate's resume that overlap with the required skills for the selected job role.
2. WHEN generating Technical Round questions, THE system SHALL include a mixture of oral answer questions and code snippet questions (broken or incomplete code to be corrected or completed).
3. WHEN a candidate submits an oral answer, THE system SHALL transcribe the spoken response and evaluate it using keyword matching against the expected answer for that question.
4. WHEN a candidate submits a code snippet answer, THE system SHALL evaluate the correctness of the submitted code against the expected solution.
5. WHEN a candidate receives a poor grade on three consecutive answers, THE system SHALL terminate the Technical Round and display the message: "You have done well, we will notify you of the further decision later."
6. WHEN a candidate completes all Technical Round questions, THE system SHALL display the message: "You have done well, we will notify you of the further decision later."
7. WHEN the Technical Round is completed or terminated, THE system SHALL compile all questions, answers, and grades into a Technical Round summary and store it.

---

### Requirement 4: TJI – HR Round Access via Unique Code

**User Story:** As a candidate who has cleared the Technical Round, I want to receive a unique code via SMS so that I can access the HR Round.

#### Acceptance Criteria

1. WHEN the admin approves a candidate's Technical Round evaluation in the dashboard, THE system SHALL generate a unique alphanumeric code for that candidate.
2. WHEN a unique code is generated, THE system SHALL send the unique code via SMS to the phone number extracted from the candidate's resume.
3. WHEN a candidate enters a valid unique code on the HR Round entry screen, THE system SHALL grant the candidate access to the TJI HR Round.
4. IF a candidate enters an invalid or expired unique code, THEN THE system SHALL display an error message and deny access to the HR Round.

---

### Requirement 5: NTJI – Qualifying Round

**User Story:** As a candidate applying for a non-technical role, I want to take a Qualifying Round interview so that my role-relevant knowledge can be evaluated.

#### Acceptance Criteria

1. WHEN a candidate begins the Qualifying Round, THE system SHALL generate a set of oral answer questions based on the skills and knowledge areas required for the selected non-technical job role.
2. WHEN generating Qualifying Round questions, THE system SHALL present questions in the candidate's preferred language selected from a list of 2 to 4 available languages for that role.
3. WHEN a candidate submits an oral answer in the Qualifying Round, THE system SHALL transcribe the spoken response and evaluate it using keyword matching against the expected answer.
4. WHEN a candidate receives a poor grade on three consecutive answers in the Qualifying Round, THE system SHALL terminate the round and display the message: "You have done well, we will notify you of the further decision later."
5. WHEN a candidate completes all Qualifying Round questions, THE system SHALL display the message: "You have done well, we will notify you of the further decision later."
6. WHEN the Qualifying Round is completed or terminated, THE system SHALL compile all questions, answers, and grades into a Qualifying Round summary and store it.

---

### Requirement 6: HR Round (Both TJI and NTJI)

**User Story:** As a candidate who has been approved for the HR Round, I want to attend an HR interview so that my soft skills, composure, and experience can be evaluated.

#### Acceptance Criteria

1. WHEN a candidate accesses the HR Round, THE system SHALL ask a set of standard HR questions along with questions derived from the experience and projects listed in the candidate's resume.
2. WHEN a candidate responds during the HR Round, THE system SHALL evaluate the response for soft skills relevant to the selected job role using keyword matching and semantic relevance scoring.
3. WHEN the HR Round is completed, THE system SHALL compile all HR Round questions, answers, and grades into an HR Round summary and store it alongside the initial round summary.
4. WHEN the HR Round is completed, THE system SHALL compute a final grade for the candidate by combining the initial round grade and the HR Round grade.

---

### Requirement 7: Confidence and Composure Evaluation (HR Round and NTJI)

**User Story:** As the system, I want to evaluate a candidate's confidence and composure during spoken responses so that behavioural indicators are included in the final grade.

#### Acceptance Criteria

1. WHILE a candidate is responding during the HR Round or NTJI Qualifying Round, THE system SHALL use the live camera feed to analyse facial expressions and classify the candidate's composure as composed, slightly positive, neutral, or distressed.
2. WHILE a candidate is responding during the HR Round or NTJI Qualifying Round, THE system SHALL use the audio feed to detect and count filler words spoken by the candidate.
3. WHEN evaluating composure, THE system SHALL assign a higher confidence score to candidates who are composed or slightly positive, and a lower confidence score to candidates who are distressed.
4. WHEN evaluating filler word usage, THE system SHALL assign a higher confidence score to candidates with fewer filler words, with zero filler words receiving the highest score.
5. WHEN the round is completed, THE system SHALL include the confidence score derived from facial expression and filler word analysis in the candidate's overall grade for that round.

---

### Requirement 8: Interview Recording

**User Story:** As an admin, I want the entire interview session to be recorded as a video so that I can review the candidate's performance in full.

#### Acceptance Criteria

1. WHILE a candidate is attending any interview round, THE system SHALL record the candidate's video and audio feed for the duration of the session.
2. WHEN an interview round is completed or terminated, THE system SHALL store the recording and associate it with the candidate's unique identifier and selected job role.
3. WHEN an admin views a candidate's record in the dashboard, THE system SHALL provide access to the full interview recording for that candidate.

---

### Requirement 9: Admin Dashboard

**User Story:** As an admin, I want a dashboard that shows all candidate evaluations, grades, and recordings so that I can review and approve or reject candidates efficiently.

#### Acceptance Criteria

1. WHEN a candidate completes or is terminated from an initial round, THE system SHALL display the candidate's record in the admin dashboard including the unique code, job role, round summary, grades, and interview recording.
2. WHEN the admin views the dashboard, THE system SHALL highlight candidates whose overall grade meets or exceeds the passing threshold as "Passing Candidates".
3. WHEN an admin approves a candidate's evaluation, THE system SHALL trigger the unique code SMS to be sent to the approved candidate for HR Round access.
4. WHEN an admin approves a final HR Round evaluation, THE system SHALL send the job offer letter provided by the admin to the selected candidate's email address extracted from the resume.
5. WHEN an admin rejects a candidate after the final evaluation, THE system SHALL send an SMS to the candidate's phone number with the message: "We are sorry to inform you that you have not been selected."
6. WHEN an admin approves a candidate after the final evaluation, THE system SHALL send an SMS to the candidate's phone number with the message: "You have been selected for the job role. Please check your email for further details."

---

### Requirement 10: Question Generation and Evaluation Engine

**User Story:** As the system, I want to generate relevant interview questions and evaluate answers accurately so that the interview is fair and consistent across all candidates.

#### Acceptance Criteria

1. WHEN generating questions for a job role, THE system SHALL select questions from a predefined question bank associated with that job role and the skills matched from the candidate's resume.
2. WHEN evaluating an oral answer, THE system SHALL compare the transcribed response against the expected answer using keyword matching and assign a grade based on the proportion of matched keywords.
3. WHEN evaluating a code snippet answer in the Technical Round, THE system SHALL parse and execute or statically analyse the submitted code and compare the output or structure against the expected solution.
4. WHEN a candidate's answer matches the majority of expected keywords, THE system SHALL assign a passing grade for that answer.
5. IF a candidate's answer matches fewer keywords than the defined poor grade threshold, THEN THE system SHALL assign a poor grade for that answer.

---

### Requirement 11: Resume Parser

**User Story:** As the system, I want to accurately parse uploaded resumes so that candidate data is reliably extracted for skill matching and question personalisation.

#### Acceptance Criteria

1. WHEN a resume is uploaded in PDF or DOCX format, THE system SHALL parse the document and extract structured data including name, phone number, email, skills, work experience, and projects.
2. WHEN the resume parser produces structured output, THE system SHALL serialise the output to a defined internal data format for use by downstream components.
3. WHEN the serialised resume data is deserialised, THE system SHALL produce an equivalent structured object to the original parsed output.
4. IF the resume file is in an unsupported format, THEN THE system SHALL display an error message specifying the supported formats and prevent further processing.
