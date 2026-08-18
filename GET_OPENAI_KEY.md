# How to Get OpenAI API Key for Speech Transcription

## Steps to Get FREE $5 Credit (Enough for ~800 minutes of transcription)

1. **Go to OpenAI Platform**
   - Visit: https://platform.openai.com/signup

2. **Sign Up / Log In**
   - Create a new account or log in with existing account
   - New accounts get **$5 in free credit** (no credit card required initially)

3. **Create API Key**
   - After login, go to: https://platform.openai.com/api-keys
   - Click "Create new secret key"
   - Give it a name like "Speech Analyzer STT"
   - Copy the key (starts with `sk-...`)
   - ⚠️ **IMPORTANT**: Save it immediately! You can't see it again

4. **Add to Your .env File**
   - Open `backend/.env` file
   - Find the line: `OPENAI_API_KEY=`
   - Paste your key: `OPENAI_API_KEY=sk-your-actual-key-here`
   - Save the file

5. **Restart Backend Server**
   - Stop the backend server (Ctrl+C in terminal)
   - Start it again: `npm run dev`

## Pricing (After Free Credit)

- **Cost**: $0.006 per minute of audio
- **Example**: 1000 minutes = $6
- **Your free $5 = ~833 minutes** of transcription

## Verify It's Working

After restarting the backend, check the console logs. You should see:
```
[aiAnalysisService] Using OpenAI Whisper API for transcription
[aiAnalysisService] Sending audio to OpenAI Whisper API...
[aiAnalysisService] Transcription successful: ...
```

If you see "Using mock transcription for testing", the API key is not configured correctly.

## Alternative: Free Local Whisper (No API Key Needed)

If you want 100% free transcription without any API:
- The code already supports local Whisper using Transformers.js
- Currently disabled due to ES Module import issues
- To enable: We need to fix the ES Module compatibility in the backend

Let me know if you need help with local Whisper instead!
