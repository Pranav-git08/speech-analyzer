-- SPEECH ANALYZER – PostgreSQL Schema
-- Run this file against your database to initialise all tables.

-- Enable UUID generation
CREATE EXTENSION IF NOT EXISTS "pgcrypto";

-- ─── Job Roles ────────────────────────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS job_roles (
  id               UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  name             VARCHAR(255) NOT NULL,
  track            VARCHAR(10)  NOT NULL CHECK (track IN ('TJI', 'NTJI')),
  required_skills  TEXT[]       NOT NULL,
  question_bank_id UUID         NOT NULL,
  created_at       TIMESTAMP    NOT NULL DEFAULT NOW()
);

-- ─── Candidates ───────────────────────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS candidates (
  id          UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  name        VARCHAR(255) NOT NULL,
  email       VARCHAR(255) NOT NULL,
  phone       VARCHAR(20)  NOT NULL,
  resume_data JSONB        NOT NULL,
  job_role_id UUID         NOT NULL REFERENCES job_roles(id),
  track       VARCHAR(10)  NOT NULL CHECK (track IN ('TJI', 'NTJI')),
  unique_code VARCHAR(20)  UNIQUE,
  status      VARCHAR(50)  NOT NULL DEFAULT 'pending_initial'
                CHECK (status IN ('pending_initial', 'pending_hr', 'approved', 'rejected')),
  created_at  TIMESTAMP    NOT NULL DEFAULT NOW()
);

-- ─── Questions ────────────────────────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS questions (
  id               UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  question_bank_id UUID         NOT NULL,
  type             VARCHAR(20)  NOT NULL CHECK (type IN ('oral', 'code_snippet')),
  text             TEXT         NOT NULL,
  skill            VARCHAR(100) NOT NULL,
  expected_answer  TEXT         NOT NULL,
  expected_keywords TEXT[]      NOT NULL,
  code_template    TEXT,
  language         VARCHAR(50),
  created_at       TIMESTAMP    NOT NULL DEFAULT NOW()
);

-- ─── Interview Sessions ───────────────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS interview_sessions (
  id                  UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  candidate_id        UUID         NOT NULL REFERENCES candidates(id),
  job_role_id         UUID         NOT NULL REFERENCES job_roles(id),
  round_type          VARCHAR(20)  NOT NULL CHECK (round_type IN ('technical', 'qualifying', 'hr')),
  status              VARCHAR(20)  NOT NULL DEFAULT 'in_progress'
                      CHECK (status IN ('in_progress', 'completed', 'terminated')),
  questions           JSONB        NOT NULL DEFAULT '[]',
  answers             JSONB        NOT NULL DEFAULT '[]',
  evaluations         JSONB        NOT NULL DEFAULT '[]',
  confidence_analysis JSONB,
  recording_id        UUID,
  final_grade         DECIMAL(5,2),
  started_at          TIMESTAMP    NOT NULL DEFAULT NOW(),
  completed_at        TIMESTAMP
);

-- ─── Recordings ───────────────────────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS recordings (
  id              UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  candidate_id    UUID         NOT NULL REFERENCES candidates(id),
  session_id      UUID         NOT NULL REFERENCES interview_sessions(id),
  job_role_id     UUID         NOT NULL REFERENCES job_roles(id),
  storage_url     TEXT         NOT NULL,
  duration_seconds INT,
  file_size_bytes  BIGINT,
  created_at      TIMESTAMP    NOT NULL DEFAULT NOW()
);

-- ─── Indexes ──────────────────────────────────────────────────────────────────
CREATE INDEX IF NOT EXISTS idx_candidates_job_role   ON candidates(job_role_id);
CREATE INDEX IF NOT EXISTS idx_candidates_status     ON candidates(status);
CREATE INDEX IF NOT EXISTS idx_candidates_unique_code ON candidates(unique_code);
CREATE INDEX IF NOT EXISTS idx_sessions_candidate    ON interview_sessions(candidate_id);
CREATE INDEX IF NOT EXISTS idx_sessions_status       ON interview_sessions(status);
CREATE INDEX IF NOT EXISTS idx_recordings_candidate  ON recordings(candidate_id);
CREATE INDEX IF NOT EXISTS idx_recordings_session    ON recordings(session_id);
CREATE INDEX IF NOT EXISTS idx_questions_bank        ON questions(question_bank_id);
CREATE INDEX IF NOT EXISTS idx_questions_skill       ON questions(skill);
