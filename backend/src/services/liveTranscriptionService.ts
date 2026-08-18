import { Server as SocketIOServer, Socket } from 'socket.io';
import { transcribeAudio } from './aiAnalysisService';

interface SessionState {
  chunks: Buffer[];
  language: string;
  isProcessing: boolean;
  lastTranscript: string;
  throttleTimer: NodeJS.Timeout | null;
}

export function setupLiveTranscription(io: SocketIOServer) {
  io.on('connection', (socket: Socket) => {
    console.log(`[Socket.io] Client connected: ${socket.id}`);

    const state: SessionState = {
      chunks: [],
      language: 'en',
      isProcessing: false,
      lastTranscript: '',
      throttleTimer: null,
    };

    // Client begins recording an answer
    socket.on('start-transcription', (data?: { language?: string }) => {
      console.log(`[Socket.io] start-transcription on ${socket.id} (lang: ${data?.language || 'en'})`);
      state.chunks = [];
      state.language = data?.language || 'en';
      state.lastTranscript = '';
      state.isProcessing = false;
      if (state.throttleTimer) {
        clearTimeout(state.throttleTimer);
        state.throttleTimer = null;
      }
      socket.emit('transcript-result', { text: '', isFinal: false });
    });

    // Client streams audio chunk (ArrayBuffer or Buffer) every 500ms
    socket.on('audio-chunk', async (chunk: ArrayBuffer | Buffer) => {
      try {
        const buf = Buffer.isBuffer(chunk) ? chunk : Buffer.from(chunk);
        if (buf.length === 0) return;
        state.chunks.push(buf);

        // Throttle interim live transcriptions so we don't spam the API simultaneously
        if (!state.isProcessing && !state.throttleTimer && state.chunks.length >= 2) {
          state.throttleTimer = setTimeout(async () => {
            state.throttleTimer = null;
            if (state.chunks.length === 0 || state.isProcessing) return;

            state.isProcessing = true;
            try {
              const combinedBuffer = Buffer.concat(state.chunks);
              const audioBlob = new Blob([combinedBuffer], { type: 'audio/webm' });
              const transcript = await transcribeAudio(audioBlob, state.language);
              if (transcript && transcript.trim()) {
                state.lastTranscript = transcript.trim();
                console.log(`[Socket.io] Live Interim Transcript for ${socket.id}: "${state.lastTranscript.substring(0, 60)}..."`);
                socket.emit('transcript-result', { text: state.lastTranscript, isFinal: false });
              }
            } catch (err) {
              console.warn('[Socket.io] Interim transcription note:', err);
            } finally {
              state.isProcessing = false;
            }
          }, 1200); // 1.2 second interim throttle
        }
      } catch (err) {
        console.error('[Socket.io] Error handling audio chunk:', err);
      }
    });

    // Client stops recording — perform final high-accuracy transcription
    socket.on('stop-transcription', async () => {
      console.log(`[Socket.io] stop-transcription on ${socket.id}, total chunks: ${state.chunks.length}`);
      if (state.throttleTimer) {
        clearTimeout(state.throttleTimer);
        state.throttleTimer = null;
      }

      if (state.chunks.length === 0) {
        socket.emit('transcript-result', { text: state.lastTranscript || '', isFinal: true });
        return;
      }

      try {
        const combinedBuffer = Buffer.concat(state.chunks);
        const audioBlob = new Blob([combinedBuffer], { type: 'audio/webm' });
        const finalTranscript = await transcribeAudio(audioBlob, state.language);
        const text = (finalTranscript && finalTranscript.trim()) || state.lastTranscript || '';
        console.log(`[Socket.io] Final Transcript for ${socket.id}: "${text.substring(0, 100)}..."`);
        socket.emit('transcript-result', { text, isFinal: true });
      } catch (err) {
        console.error('[Socket.io] Final transcription error:', err);
        socket.emit('transcript-result', { text: state.lastTranscript || '', isFinal: true });
      } finally {
        state.chunks = [];
        state.isProcessing = false;
      }
    });

    socket.on('disconnect', () => {
      console.log(`[Socket.io] Client disconnected: ${socket.id}`);
      if (state.throttleTimer) {
        clearTimeout(state.throttleTimer);
      }
      state.chunks = [];
    });
  });
}
