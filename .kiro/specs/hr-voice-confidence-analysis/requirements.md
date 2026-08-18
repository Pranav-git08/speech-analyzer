# Requirements Document

## Introduction

This document specifies requirements for enhancing the HR Round interview with voice interaction and AI-powered confidence analysis. The HR Round will be transformed into a fully voice-based interview using Text-to-Speech (TTS) for questions, Speech-to-Text (STT) for candidate answers, and real-time video analysis for confidence evaluation based on facial expressions, emotions, and filler word detection.

The system currently has a basic interview infrastructure with video/audio capture, STT transcription, and confidence analysis services. This feature extends the HR Round to leverage these capabilities for a fully oral, AI-monitored interview experience.

## Glossary

- **TTS_Engine**: Text-to-Speech service that converts written questions into spoken audio
- **STT_Engine**: Speech-to-Text service that transcribes candidate spoken answers into text
- **HR_Interview_Module**: The interview interface specifically for HR Round questions
- **Confidence_Analyzer**: AI service that processes video frames to detect facial expressions and emotions
- **Composure_Classifier**: Component of Confidence_Analyzer that maps facial expressions to composure states (composed, slightly_positive, neutral, distressed)
- **Filler_Word_Detector**: Component that identifies and counts filler words in transcribed speech
- **Video_Feed**: Real-time camera stream capturing candidate's face during the interview
- **Admin_Dashboard**: Interface where administrators review candidate performance and confidence analytics
- **Question_Audio_Player**: UI component that plays TTS-generated question audio
- **Transcription_Display**: UI component showing real-time STT output as the candidate speaks
- **Confidence_Score**: Numerical metric (0-100) combining composure analysis and filler word penalty
- **Emotion_Timeline**: Visualization showing composure state changes throughout an answer
- **Recording_Session**: Complete video/audio recording of the interview session
- **OpenAI_Whisper**: OpenAI's speech-to-text API service
- **Google_STT**: Google Cloud Speech-to-Text API service
- **Web_Speech_API**: Browser-based speech synthesis and recognition API

## Requirements

### Requirement 1: Text-to-Speech for HR Questions

**User Story:** As a candidate taking an HR Round interview, I want the system to read each question aloud, so that I can hear the question clearly in my preferred language.

#### Acceptance Criteria

1. WHEN an HR question is loaded, THE TTS_Engine SHALL synthesize the question text into audio
2. WHEN question audio is synthesized, THE Question_Audio_Player SHALL automatically play the audio
3. THE Question_Audio_Player SHALL provide a replay button to repeat the question audio
4. THE Question_Audio_Player SHALL provide volume controls (mute, low, medium, high)
5. THE Question_Audio_Player SHALL provide speech rate controls (0.75x, 1x, 1.25x, 1.5x)
6. WHERE the candidate selected a language (English, Hindi, Tamil, Telugu), THE TTS_Engine SHALL synthesize audio in that language
7. IF TTS synthesis fails, THEN THE HR_Interview_Module SHALL display the question text and continue without audio
8. THE TTS_Engine SHALL use Web_Speech_API as the default provider for browser compatibility
9. WHEN synthesis completes, THE Question_Audio_Player SHALL display a visual indicator (checkmark icon)
10. THE Question_Audio_Player SHALL display audio duration and current playback position

### Requirement 2: Voice-Only Answer Input

**User Story:** As a candidate taking an HR Round interview, I want to answer questions using my voice without typing, so that the interview feels natural and conversational.

#### Acceptance Criteria

1. THE HR_Interview_Module SHALL remove text input controls for answer submission
2. WHEN a question is presented, THE HR_Interview_Module SHALL display a microphone button to start recording
3. WHEN the candidate clicks the microphone button, THE HR_Interview_Module SHALL request microphone access
4. IF microphone access is denied, THEN THE HR_Interview_Module SHALL display an error message and provide contact information for support
5. WHEN recording starts, THE HR_Interview_Module SHALL display a visual indicator (red recording icon)
6. WHEN recording starts, THE HR_Interview_Module SHALL display a timer showing elapsed recording time
7. THE HR_Interview_Module SHALL provide a stop button to end recording
8. WHEN recording stops, THE HR_Interview_Module SHALL save the audio blob for transcription
9. THE HR_Interview_Module SHALL provide a re-record button to discard and restart the answer
10. WHEN the candidate stops recording, THE HR_Interview_Module SHALL enable the submit button

### Requirement 3: Speech-to-Text Transcription

**User Story:** As a candidate taking an HR Round interview, I want to see my spoken answer transcribed in real-time, so that I can verify the system captured my response correctly.

#### Acceptance Criteria

1. WHEN the candidate stops recording, THE STT_Engine SHALL transcribe the audio blob to text
2. THE STT_Engine SHALL use OpenAI_Whisper as the primary transcription provider
3. IF OpenAI_Whisper is unavailable, THEN THE STT_Engine SHALL fall back to Google_STT
4. WHEN transcription starts, THE Transcription_Display SHALL show a loading indicator ("Transcribing...")
5. WHEN transcription completes, THE Transcription_Display SHALL display the full transcribed text
6. THE Transcription_Display SHALL display transcribed text in a read-only text area
7. IF transcription fails, THEN THE HR_Interview_Module SHALL display an error and offer re-record option
8. IF transcription returns empty text, THEN THE HR_Interview_Module SHALL prompt the candidate to re-record
9. WHEN transcription completes successfully, THE HR_Interview_Module SHALL enable the submit button
10. WHERE the candidate selected a non-English language, THE STT_Engine SHALL transcribe in that language code (hi-IN, ta-IN, te-IN)

### Requirement 4: Real-Time Facial Expression Analysis

**User Story:** As an administrator reviewing HR Round performance, I want to see the candidate's composure analysis throughout their answer, so that I can assess their confidence and emotional state.

#### Acceptance Criteria

1. WHEN the candidate starts recording an answer, THE Confidence_Analyzer SHALL begin capturing video frames from Video_Feed
2. THE Confidence_Analyzer SHALL sample video frames at 1-second intervals during recording
3. FOR EACH captured frame, THE Composure_Classifier SHALL detect facial expressions
4. FOR EACH detected expression, THE Composure_Classifier SHALL classify composure as one of: composed, slightly_positive, neutral, distressed
5. IF facial detection fails for a frame, THEN THE Confidence_Analyzer SHALL skip that frame and continue without error
6. THE Confidence_Analyzer SHALL store the sequence of composure states with timestamps
7. WHEN recording stops, THE Confidence_Analyzer SHALL compute the average composure score across all valid frames
8. THE Confidence_Analyzer SHALL use the composure-to-score mapping: composed=100, slightly_positive=80, neutral=60, distressed=20
9. IF no valid frames were captured, THEN THE Confidence_Analyzer SHALL assign a default composure score of 60 (neutral)
10. THE Confidence_Analyzer SHALL gracefully continue if the camera is unavailable (no video feed)

### Requirement 5: Filler Word Detection and Counting

**User Story:** As an administrator reviewing HR Round performance, I want to see how many filler words the candidate used, so that I can assess their verbal communication clarity.

#### Acceptance Criteria

1. WHEN transcription completes, THE Filler_Word_Detector SHALL analyze the transcribed text
2. THE Filler_Word_Detector SHALL detect occurrences of filler words: "umm", "um", "uh", "ah", "er", "like", "you know", "I mean", "basically", "literally", "actually", "so", "right", "okay", "well"
3. THE Filler_Word_Detector SHALL perform case-insensitive matching for all filler words
4. THE Filler_Word_Detector SHALL match multi-word fillers ("you know", "I mean") before single-word fillers to avoid double-counting
5. THE Filler_Word_Detector SHALL use whole-word boundary matching to avoid false positives (e.g., "sum" should not match "um")
6. THE Filler_Word_Detector SHALL return the total count of filler words detected
7. THE Filler_Word_Detector SHALL return a list of each detected filler word instance
8. IF the transcribed text is empty, THEN THE Filler_Word_Detector SHALL return a count of 0
9. THE Filler_Word_Detector SHALL store filler word data in the ConfidenceAnalysis record
10. THE Filler_Word_Detector SHALL support language-specific filler word lists for Hindi, Tamil, and Telugu

### Requirement 6: Confidence Score Computation

**User Story:** As an administrator reviewing HR Round performance, I want to see a single confidence score for each answer, so that I can quickly assess the candidate's performance.

#### Acceptance Criteria

1. WHEN an HR answer is submitted, THE Confidence_Analyzer SHALL compute an overall confidence score
2. THE Confidence_Analyzer SHALL start with the average composure score as the base score
3. THE Confidence_Analyzer SHALL apply a penalty of 5 points per filler word detected
4. THE Confidence_Analyzer SHALL compute the confidence score as: max(0, composure_score - (filler_count * 5))
5. THE Confidence_Analyzer SHALL ensure the confidence score is never negative (minimum 0)
6. THE Confidence_Analyzer SHALL store the confidence score in the ConfidenceAnalysis record
7. THE Confidence_Analyzer SHALL associate the ConfidenceAnalysis with the interview session
8. WHEN the interview session completes, THE HR_Interview_Module SHALL persist the ConfidenceAnalysis to the database
9. THE ConfidenceAnalysis record SHALL include: composureScore, fillerWordCount, fillerWords array, overallConfidenceScore
10. THE Confidence_Analyzer SHALL contribute the overall confidence score to the final round grade calculation

### Requirement 7: Visual Feedback During Recording

**User Story:** As a candidate taking an HR Round interview, I want to see visual cues about my performance while recording, so that I can adjust my composure in real-time.

#### Acceptance Criteria

1. WHILE recording is in progress, THE HR_Interview_Module SHALL display a live Video_Feed preview
2. WHEN composure is detected as "composed" or "slightly_positive", THE HR_Interview_Module SHALL display a green border around the video preview
3. WHEN composure is detected as "neutral", THE HR_Interview_Module SHALL display a yellow border around the video preview
4. WHEN composure is detected as "distressed", THE HR_Interview_Module SHALL display an orange border around the video preview
5. WHILE recording is in progress, THE HR_Interview_Module SHALL display helpful text hints based on detected composure
6. WHEN composure is "composed", THE HR_Interview_Module SHALL display "Great composure!" hint
7. WHEN composure is "neutral" or "distressed", THE HR_Interview_Module SHALL display "Take a breath and relax" hint
8. THE HR_Interview_Module SHALL update composure feedback every 2 seconds during recording
9. THE HR_Interview_Module SHALL display recording duration prominently (MM:SS format)
10. IF camera is unavailable, THEN THE HR_Interview_Module SHALL hide visual feedback elements and continue voice-only

### Requirement 8: Admin Dashboard Confidence Analytics

**User Story:** As an administrator reviewing candidate performance, I want to see detailed confidence analytics for HR Round answers, so that I can make informed hiring decisions.

#### Acceptance Criteria

1. WHEN an administrator views a candidate's HR Round results, THE Admin_Dashboard SHALL display the overall confidence score
2. THE Admin_Dashboard SHALL display the composure score and its breakdown
3. THE Admin_Dashboard SHALL display the total filler word count
4. THE Admin_Dashboard SHALL display the list of detected filler word instances
5. THE Admin_Dashboard SHALL display an Emotion_Timeline graph showing composure state changes over time
6. THE Emotion_Timeline SHALL use color coding: green=composed, light-blue=slightly_positive, yellow=neutral, red=distressed
7. THE Admin_Dashboard SHALL display the confidence score formula with actual values (composure - filler_penalty)
8. THE Admin_Dashboard SHALL display confidence score as a progress bar (0-100 scale)
9. THE Admin_Dashboard SHALL highlight scores below 40 as "Needs Improvement" in red
10. THE Admin_Dashboard SHALL highlight scores 40-70 as "Moderate" in yellow
11. THE Admin_Dashboard SHALL highlight scores above 70 as "Strong" in green

### Requirement 9: Graceful Degradation for Media Access

**User Story:** As a candidate with limited hardware, I want the system to work even if my camera or microphone has issues, so that I can still complete the interview.

#### Acceptance Criteria

1. IF microphone access is denied, THEN THE HR_Interview_Module SHALL display an error message with support contact information
2. IF camera access is denied, THEN THE HR_Interview_Module SHALL continue with audio-only recording
3. IF camera access is denied, THEN THE Confidence_Analyzer SHALL assign a default composure score of 60 (neutral)
4. IF STT transcription fails, THEN THE HR_Interview_Module SHALL offer a re-record option
5. IF STT transcription fails twice, THEN THE HR_Interview_Module SHALL display a support contact message
6. IF TTS synthesis fails, THEN THE HR_Interview_Module SHALL display the question text and continue
7. WHEN camera is unavailable, THE HR_Interview_Module SHALL hide video preview and composure feedback
8. WHEN microphone is unavailable, THE HR_Interview_Module SHALL disable voice recording and display error guidance
9. THE HR_Interview_Module SHALL test microphone and camera access when the HR Round starts
10. IF hardware test fails, THEN THE HR_Interview_Module SHALL display clear instructions for granting browser permissions

### Requirement 10: Multi-Language TTS and STT Support

**User Story:** As a non-English candidate, I want to hear questions and provide answers in my native language, so that I can communicate effectively during the HR Round.

#### Acceptance Criteria

1. WHERE the candidate is in NTJI track, THE HR_Interview_Module SHALL prompt for language selection before starting
2. THE HR_Interview_Module SHALL offer language options: English, Hindi, Tamil, Telugu
3. WHEN the candidate selects Hindi, THE TTS_Engine SHALL use "hi-IN" locale for synthesis
4. WHEN the candidate selects Tamil, THE TTS_Engine SHALL use "ta-IN" locale for synthesis
5. WHEN the candidate selects Telugu, THE TTS_Engine SHALL use "te-IN" locale for synthesis
6. WHEN the candidate selects English, THE TTS_Engine SHALL use "en-US" locale for synthesis
7. WHEN transcribing Hindi audio, THE STT_Engine SHALL use "hi-IN" language code
8. WHEN transcribing Tamil audio, THE STT_Engine SHALL use "ta-IN" language code
9. WHEN transcribing Telugu audio, THE STT_Engine SHALL use "te-IN" language code
10. WHEN transcribing English audio, THE STT_Engine SHALL use "en-US" language code
11. THE Filler_Word_Detector SHALL use language-specific filler word lists based on selected language
12. IF TTS does not support the selected language, THEN THE HR_Interview_Module SHALL display the question text and continue

### Requirement 11: Session Recording with Confidence Data

**User Story:** As an administrator, I want the complete interview session with confidence analysis to be stored, so that I can review it later for quality assurance.

#### Acceptance Criteria

1. WHEN an HR Round interview starts, THE Recording_Session SHALL capture audio and video streams
2. THE Recording_Session SHALL record continuously throughout all HR questions
3. WHEN the interview completes, THE Recording_Session SHALL save the video file with session metadata
4. THE Recording_Session SHALL include session ID, candidate ID, job role ID, and round type in metadata
5. WHEN the interview completes, THE HR_Interview_Module SHALL persist the ConfidenceAnalysis to the interview_sessions table
6. THE ConfidenceAnalysis SHALL be stored as JSON in the confidence_analysis column
7. THE Recording_Session SHALL associate the recording ID with the interview session record
8. THE Recording_Session SHALL store the recording file path in the recording_id field
9. IF video recording fails, THEN THE Recording_Session SHALL save audio-only and log the error
10. THE Recording_Session SHALL save recordings to the configured storage location (backend/data/recordings/)

### Requirement 12: TTS Audio Caching

**User Story:** As a system operator, I want frequently asked HR questions to be pre-synthesized, so that TTS latency is minimized for candidates.

#### Acceptance Criteria

1. WHEN an HR question is synthesized, THE TTS_Engine SHALL cache the audio file with a key based on question ID and language
2. WHEN the same question is requested again in the same language, THE TTS_Engine SHALL serve the cached audio
3. THE TTS_Engine SHALL store cached audio files in memory with a maximum size of 50 MB
4. WHEN cache size exceeds 50 MB, THE TTS_Engine SHALL evict the least recently used audio files
5. THE TTS_Engine SHALL use a cache key format: "tts_cache_{questionId}_{language}"
6. IF cached audio is found, THEN THE TTS_Engine SHALL return it within 50ms
7. IF cached audio is not found, THEN THE TTS_Engine SHALL synthesize and cache it for future use
8. THE TTS_Engine SHALL clear the cache when the application restarts
9. THE TTS_Engine SHALL support manual cache clearing via an admin API endpoint
10. THE TTS_Engine SHALL log cache hit/miss statistics for monitoring

### Requirement 13: Transcription Quality Validation

**User Story:** As a candidate, I want to be alerted if my transcription seems incorrect, so that I can re-record my answer before submitting.

#### Acceptance Criteria

1. WHEN transcription completes, THE HR_Interview_Module SHALL validate the transcribed text length
2. IF transcribed text is less than 10 characters, THEN THE HR_Interview_Module SHALL display a warning: "Transcription seems too short. Would you like to re-record?"
3. IF transcribed text contains only filler words, THEN THE HR_Interview_Module SHALL display a warning: "No meaningful content detected. Please re-record."
4. THE HR_Interview_Module SHALL display the transcribed text to the candidate for review
5. THE HR_Interview_Module SHALL provide a "Re-record" button alongside the "Submit" button
6. WHEN the candidate clicks "Re-record", THE HR_Interview_Module SHALL discard the current audio and transcription
7. WHEN the candidate clicks "Re-record", THE HR_Interview_Module SHALL reset the recording interface
8. THE HR_Interview_Module SHALL allow unlimited re-recordings before submission
9. WHEN the candidate reviews transcription, THE HR_Interview_Module SHALL highlight detected filler words in yellow
10. THE HR_Interview_Module SHALL display a character count for the transcription

### Requirement 14: Real-Time Transcription Display (Optional Enhancement)

**User Story:** As a candidate, I want to see my words being transcribed as I speak, so that I have immediate feedback on transcription accuracy.

#### Acceptance Criteria

1. WHERE real-time STT is available, THE HR_Interview_Module SHALL display partial transcription as the candidate speaks
2. THE Transcription_Display SHALL update every 500ms with new transcribed text
3. THE Transcription_Display SHALL append new text to existing transcription
4. WHEN recording stops, THE Transcription_Display SHALL finalize the transcription
5. IF real-time STT is unavailable, THEN THE HR_Interview_Module SHALL fall back to post-recording transcription
6. THE HR_Interview_Module SHALL use Web_Speech_API for real-time transcription when available
7. IF Web_Speech_API fails, THEN THE HR_Interview_Module SHALL fall back to OpenAI_Whisper or Google_STT
8. THE Transcription_Display SHALL auto-scroll to show the most recent transcribed text
9. THE Transcription_Display SHALL display a "Listening..." indicator when actively transcribing
10. THE Transcription_Display SHALL indicate network latency if transcription lags behind speech by more than 2 seconds

### Requirement 15: Composure State Timeline Storage

**User Story:** As an administrator, I want to see how the candidate's composure changed throughout their answer, so that I can identify moments of stress or confidence.

#### Acceptance Criteria

1. WHEN recording an answer, THE Confidence_Analyzer SHALL store each composure detection with a timestamp
2. THE Confidence_Analyzer SHALL create a composure timeline array with entries: `{ timestamp: number, composureState: ComposureState, confidence: number }`
3. THE Confidence_Analyzer SHALL include the composure timeline in the ConfidenceAnalysis record
4. THE ConfidenceAnalysis SHALL store the timeline as a JSON array in the database
5. WHEN an administrator views the answer, THE Admin_Dashboard SHALL render the Emotion_Timeline from the stored data
6. THE Emotion_Timeline SHALL display time on the X-axis (0s to answer duration)
7. THE Emotion_Timeline SHALL display composure states on the Y-axis (distressed, neutral, slightly_positive, composed)
8. THE Emotion_Timeline SHALL use a line chart or step chart to visualize state changes
9. THE Emotion_Timeline SHALL allow hovering to see exact timestamp and confidence percentage
10. THE Emotion_Timeline SHALL highlight sections where composure dropped to "distressed" in red

## Parser and Serializer Requirements

This feature does not involve parsing or serializing custom configuration formats or domain-specific languages. All data serialization uses standard JSON for API communication and database storage, which is handled by existing framework libraries (Express.js JSON middleware, SQLite JSON functions).

## Integration Constraints

- The feature MUST integrate with the existing SQLite database schema (interview_sessions table, confidence_analysis JSON column)
- The feature MUST use the existing aiAnalysisService for STT, filler word detection, and composure scoring
- The feature MUST work with the existing InterviewPage and HRRoundPage components
- The feature MUST reuse existing MediaRecorder and WebRTC infrastructure for video/audio capture
- The feature MUST use the existing interview service for session management and persistence
- The feature MUST use the existing question generator for fetching HR questions from qb-hr-common
- The feature MUST support both TJI and NTJI tracks (with language selection for NTJI)
- The feature MUST work in modern browsers (Chrome, Firefox, Edge, Safari) with WebRTC and Web Speech API support
- The feature SHOULD gracefully degrade when hardware (camera/microphone) is unavailable
- The feature SHOULD fail gracefully when external APIs (OpenAI, Google) are unavailable

## Performance Targets

- TTS synthesis SHALL complete within 2 seconds for questions under 200 words
- STT transcription SHALL complete within 5 seconds for audio under 2 minutes
- Facial expression analysis SHALL process frames within 200ms each
- Real-time transcription (if available) SHALL lag behind speech by no more than 2 seconds
- The confidence score computation SHALL complete within 100ms after transcription
- The Emotion_Timeline rendering SHALL complete within 500ms for timelines up to 5 minutes
