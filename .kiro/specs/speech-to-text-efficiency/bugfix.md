# Bugfix Requirements Document

## Introduction

After a candidate stops voice recording, the system always sends the audio blob to the OpenAI Whisper API even when the browser's real-time `SpeechRecognition` has already produced a valid transcription. This happens because the guard condition in `recorder.onstop` reads the `transcribedText` React state, which is still empty at the time the callback fires due to React's asynchronous state batching. As a result, every answer submission incurs an unnecessary Whisper API call, adding latency and consuming API credits on every oral-question response when browser STT was already successful.

## Bug Analysis

### Current Behavior (Defect)

1.1 WHEN the browser's `SpeechRecognition` has produced a non-empty transcript during recording THEN the system still sends the audio blob to the backend Whisper API after recording stops, because the `transcribedText` state variable is `''` at the moment `recorder.onstop` executes

1.2 WHEN `recorder.onstop` fires and `transcribedText` is empty due to asynchronous state updates THEN the system calls the Whisper API endpoint (`/interview/transcribe`) unconditionally, even though a valid browser STT result is pending

1.3 WHEN both the browser `SpeechRecognition` result and the Whisper API response arrive THEN the system has two competing transcription results, and the order of arrival determines which one is shown, leading to non-deterministic transcription output

### Expected Behavior (Correct)

2.1 WHEN the browser's `SpeechRecognition` has already produced a non-empty transcript during recording THEN the system SHALL skip the Whisper API call after recording stops and use the existing browser STT result directly

2.2 WHEN the `SpeechRecognition` result is not yet available at the moment `recorder.onstop` fires THEN the system SHALL use a ref (not React state) to track the live transcript so the availability check is synchronous and reliable

2.3 WHEN the browser's `SpeechRecognition` is unavailable or produced an empty result THEN the system SHALL fall back to the Whisper API call as before

### Unchanged Behavior (Regression Prevention)

3.1 WHEN the browser does not support the `SpeechRecognition` API THEN the system SHALL CONTINUE TO send the audio blob to the Whisper API and use that transcription

3.2 WHEN the browser's `SpeechRecognition` returns an empty or whitespace-only result THEN the system SHALL CONTINUE TO fall back to the Whisper API for transcription

3.3 WHEN a code-snippet question is submitted THEN the system SHALL CONTINUE TO use the text-area answer and SHALL NOT attempt any audio transcription

3.4 WHEN the Whisper API is called as a fallback THEN the system SHALL CONTINUE TO set the transcribed text and build behavioral metrics (HR round) upon receiving the response

3.5 WHEN the candidate re-records after clearing a previous transcription THEN the system SHALL CONTINUE TO correctly transcribe the new recording using the browser STT result or Whisper fallback
