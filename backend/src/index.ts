import express from 'express';
import cors from 'cors';
import http from 'http';
import { Server as SocketIOServer } from 'socket.io';
import { config } from './config/env';
import { getDb, pool } from './db/connection';
import { seedDatabase } from './db/seed';
import { setupLiveTranscription } from './services/liveTranscriptionService';

import resumeRouter from './routes/resume';
import tracksRouter from './routes/tracks';
import interviewRouter from './routes/interview';
import hrRoundRouter from './routes/hrRound';
import gdRoundRouter from './routes/gdRound';
import adminRouter from './routes/admin';

import agentRouter from './routes/agent';
import emailRouter from './routes/email';

import path from 'path';
import fs from 'fs';

const app = express();
const httpServer = http.createServer(app);
const io = new SocketIOServer(httpServer, {
  cors: {
    origin: '*',
    methods: ['GET', 'POST'],
  },
  maxHttpBufferSize: 1e7, // 10MB
});

setupLiveTranscription(io);

const recordingsDir = path.join(__dirname, '../data/recordings');
if (!fs.existsSync(recordingsDir)) {
  fs.mkdirSync(recordingsDir, { recursive: true });
}


app.use(cors({
  origin: true,
  credentials: true,
  methods: ['GET', 'POST', 'PUT', 'DELETE', 'OPTIONS', 'HEAD'],
  allowedHeaders: ['Content-Type', 'Authorization', 'Range'],
  exposedHeaders: ['Content-Range', 'Accept-Ranges', 'Content-Length'],
}));

// Directory listing for /uploads and /recordings
app.get(['/uploads', '/uploads/', '/recordings', '/recordings/'], (_req, res) => {
  try {
    const files = fs.readdirSync(recordingsDir).filter((f) => f.endsWith('.webm') || f.endsWith('.mp4'));
    const fileListHtml = files.length === 0
      ? '<p><em>No video recordings found yet.</em></p>'
      : `<ul>${files.map((file) => {
          const stats = fs.statSync(path.join(recordingsDir, file));
          const sizeMB = (stats.size / 1024 / 1024).toFixed(2);
          const date = new Date(stats.mtime).toLocaleString();
          return `<li><a href="/uploads/${encodeURIComponent(file)}" target="_blank">🎥 ${file}</a> &mdash; <strong>${sizeMB} MB</strong> <span style="color:#718096;font-size:0.85em">(${date})</span></li>`;
        }).join('')}</ul>`;

    res.send(`
      <!DOCTYPE html>
      <html>
        <head>
          <title>Interview Recordings Index</title>
          <style>
            body { font-family: -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, sans-serif; padding: 2.5rem; max-width: 800px; margin: 0 auto; color: #2d3748; }
            h1 { color: #2b6cb0; margin-bottom: 0.5rem; }
            .card { background: #f7fafc; border: 1px solid #e2e8f0; border-radius: 8px; padding: 1.5rem; margin-top: 1rem; }
            a { color: #3182ce; text-decoration: none; font-weight: 600; }
            a:hover { text-decoration: underline; }
            ul { padding-left: 1.25rem; line-height: 2; }
          </style>
        </head>
        <body>
          <h1>🎥 Saved Interview Recordings</h1>
          <p><a href="/">← Back to Backend Home</a> | <a href="http://localhost:3000/admin">Open Admin Dashboard</a></p>
          <div class="card">
            <h3>Files in <code>backend/data/recordings</code>:</h3>
            ${fileListHtml}
          </div>
        </body>
      </html>
    `);
  } catch (err) {
    res.status(500).send('Failed to list recordings directory.');
  }
});

// Static video file delivery for /uploads and /recordings
app.use('/uploads', express.static(recordingsDir, {
  setHeaders: (res) => {
    res.set({
      'Access-Control-Allow-Origin': '*',
      'Access-Control-Allow-Methods': 'GET, HEAD, OPTIONS',
      'Access-Control-Allow-Headers': 'Range',
      'Access-Control-Expose-Headers': 'Content-Range, Accept-Ranges, Content-Length',
      'Accept-Ranges': 'bytes',
    });
  }
}));
app.use('/recordings', express.static(recordingsDir, {
  setHeaders: (res) => {
    res.set({
      'Access-Control-Allow-Origin': '*',
      'Access-Control-Allow-Methods': 'GET, HEAD, OPTIONS',
      'Access-Control-Allow-Headers': 'Range',
      'Access-Control-Expose-Headers': 'Content-Range, Accept-Ranges, Content-Length',
      'Accept-Ranges': 'bytes',
    });
  }
}));


app.use(express.json({ limit: '50mb' }));
app.use(express.urlencoded({ extended: true, limit: '50mb' }));

app.get('/', (_req, res) => {
  res.send(`
    <!DOCTYPE html>
    <html>
      <head>
        <title>Speech Analyzer Backend API</title>
        <style>
          body { font-family: -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, sans-serif; padding: 3rem; max-width: 600px; margin: 0 auto; color: #2d3748; }
          h1 { color: #2b6cb0; margin-bottom: 0.5rem; }
          .badge { display: inline-block; background: #c6f6d5; color: #22543d; padding: 0.25rem 0.6rem; border-radius: 999px; font-weight: bold; font-size: 0.85rem; }
          .card { background: #f7fafc; border: 1px solid #e2e8f0; border-radius: 8px; padding: 1.5rem; margin-top: 1.5rem; }
          a { color: #3182ce; text-decoration: none; font-weight: 600; }
          a:hover { text-decoration: underline; }
          ul { padding-left: 1.25rem; line-height: 1.8; }
        </style>
      </head>
      <body>
        <h1>SPEECH ANALYZER Backend API</h1>
        <span class="badge">● Server Active on Port 3001</span>
        <div class="card">
          <p>This is the <strong>Backend REST & Video Streaming Server</strong>.</p>
          <p>To use the web application or view the admin dashboard, open the frontend links below:</p>
          <ul>
            <li>🌐 <a href="http://localhost:3000/">Open Candidate Interview Web App (Port 3000)</a></li>
            <li>📊 <a href="http://localhost:3000/admin">Open Admin Review Dashboard (Port 3000)</a></li>
            <li>🩺 <a href="/health">Backend Health Check Status</a></li>
            <li>🎥 <a href="/uploads">Video Uploads Directory</a></li>
          </ul>
        </div>
      </body>
    </html>
  `);
});

app.get('/health', (_req, res) => {
  res.json({ status: 'ok', service: 'speech-analyzer-backend' });
});


// Candidate-facing routes
app.use('/api/resume', resumeRouter);
app.use('/api/resumes', resumeRouter);
app.use('/api/candidates', resumeRouter);
app.use('/api/tracks', tracksRouter);
app.use('/api/roles', tracksRouter);   // /api/roles?track=... alias
app.use('/api/interview', interviewRouter);
app.use('/api/hr-round', hrRoundRouter);
app.use('/api/gd-round', gdRoundRouter);



// Admin routes
app.use('/api/admin', adminRouter);
app.use('/api/admin/agent', agentRouter);
app.use('/api/email', emailRouter);

async function reconcileCandidateHRCodes() {
  try {
    const { rows } = await pool.query<{ id: string; hr_code: string | null; unique_code: string | null }>(
      'SELECT id, hr_code, unique_code FROM candidates'
    );
    for (const r of rows) {
      if (!r.hr_code || !r.unique_code) {
        const hex = Math.random().toString(36).substring(2, 8).toUpperCase();
        const code = r.hr_code || r.unique_code || `HR-${hex}`;
        await pool.query(
          'UPDATE candidates SET hr_code = $1, unique_code = $1 WHERE id = $2',
          [code, r.id]
        );
      }
    }
  } catch (err) {
    console.error('reconcileCandidateHRCodes error:', err);
  }
}

// Initialise DB and seed before accepting requests
getDb()
  .then(() => seedDatabase())
  .then(() => reconcileCandidateHRCodes())
  .then(() => {
    httpServer.listen(config.port, () => {
      console.log(`SPEECH ANALYZER backend & WebSocket running on port ${config.port}`);
    });
  })
  .catch((err) => {
    console.error('Failed to initialise database:', err);
    process.exit(1);
  });

export default app;

