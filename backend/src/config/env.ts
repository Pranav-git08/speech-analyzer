import dotenv from 'dotenv';

dotenv.config();

function required(key: string): string {
  const value = process.env[key];
  if (!value) {
    throw new Error(`Missing required environment variable: ${key}`);
  }
  return value;
}

function optional(key: string, defaultValue: string): string {
  return process.env[key] ?? defaultValue;
}

export const config = {
  // Server
  port: parseInt(optional('PORT', '3001'), 10),
  nodeEnv: optional('NODE_ENV', 'development'),

  // PostgreSQL
  db: {
    host: optional('DB_HOST', 'localhost'),
    port: parseInt(optional('DB_PORT', '5432'), 10),
    name: optional('DB_NAME', 'speech_analyzer'),
    user: optional('DB_USER', 'postgres'),
    password: optional('DB_PASSWORD', 'postgres'),
  },

  // Redis
  redis: {
    url: optional('REDIS_URL', 'redis://localhost:6379'),
  },

  // Object Storage (MinIO / S3)
  storage: {
    endpoint: optional('STORAGE_ENDPOINT', 'http://localhost:9000'),
    accessKey: optional('STORAGE_ACCESS_KEY', 'minioadmin'),
    secretKey: optional('STORAGE_SECRET_KEY', 'minioadmin'),
    bucket: optional('STORAGE_BUCKET', 'recordings'),
  },

  // Twilio (SMS)
  twilio: {
    accountSid: optional('TWILIO_ACCOUNT_SID', ''),
    authToken: optional('TWILIO_AUTH_TOKEN', ''),
    fromNumber: optional('TWILIO_FROM_NUMBER', ''),
  },

  // SendGrid (Email)
  sendgrid: {
    apiKey: optional('SENDGRID_API_KEY', ''),
    fromEmail: optional('SENDGRID_FROM_EMAIL', 'noreply@speechanalyzer.com'),
  },

  // Speech-to-Text & Linguistic Analysis
  stt: {
    provider: optional('STT_PROVIDER', 'local'), // 'local' | 'openai' | 'assemblyai' | 'google'
    apiKey: optional('OPENAI_API_KEY', '') || optional('GOOGLE_STT_API_KEY', ''),
  },

  // AssemblyAI (Linguistic Speech Analysis: Disfluencies/Filler Words, Summarization, Sentiment)
  assemblyai: {
    apiKey: optional('ASSEMBLYAI_API_KEY', ''),
  },


  // OpenAI (Chat Agent — uses Groq if GROQ_API_KEY is set, else falls back to OpenAI)
  openai: {
    apiKey: optional('OPENAI_API_KEY', ''),
    chatModel: optional('OPENAI_CHAT_MODEL', 'gpt-4o-mini'),
  },

  // Groq (fast, free LLM API — preferred for AI Agent)
  groq: {
    apiKey: optional('GROQ_API_KEY', ''),
  },

  // JWT
  jwt: {
    secret: optional('JWT_SECRET', 'dev-secret-change-in-production'),
    expiresIn: optional('JWT_EXPIRES_IN', '24h'),
  },
};
