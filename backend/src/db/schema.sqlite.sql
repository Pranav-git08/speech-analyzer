-- SPEECH ANALYZER – SQLite Schema
-- Auto-applied on first boot via connection.ts

CREATE TABLE IF NOT EXISTS job_roles (
  id               TEXT PRIMARY KEY,
  name             TEXT NOT NULL,
  track            TEXT NOT NULL CHECK (track IN ('TJI', 'NTJI')),
  required_skills  TEXT NOT NULL,  -- JSON array stored as text
  question_bank_id TEXT NOT NULL,
  created_at       TEXT NOT NULL DEFAULT (datetime('now'))
);

CREATE TABLE IF NOT EXISTS candidates (
  id          TEXT PRIMARY KEY,
  name        TEXT NOT NULL,
  email       TEXT NOT NULL,
  phone       TEXT NOT NULL,
  resume_data TEXT NOT NULL,  -- JSON stored as text
  job_role_id TEXT NOT NULL REFERENCES job_roles(id),
  track       TEXT NOT NULL CHECK (track IN ('TJI', 'NTJI')),
  unique_code TEXT UNIQUE,
  status      TEXT NOT NULL DEFAULT 'pending_initial'
              CHECK (status IN ('pending_initial', 'pending_hr', 'approved', 'rejected')),
  created_at  TEXT NOT NULL DEFAULT (datetime('now'))
);

CREATE TABLE IF NOT EXISTS questions (
  id                TEXT PRIMARY KEY,
  question_bank_id  TEXT NOT NULL,
  type              TEXT NOT NULL CHECK (type IN ('oral', 'code_snippet')),
  text              TEXT NOT NULL,
  skill             TEXT NOT NULL,
  expected_answer   TEXT NOT NULL,
  expected_keywords TEXT NOT NULL,  -- JSON array stored as text
  code_template     TEXT,
  language          TEXT,
  created_at        TEXT NOT NULL DEFAULT (datetime('now'))
);

CREATE TABLE IF NOT EXISTS interview_sessions (
  id                  TEXT PRIMARY KEY,
  candidate_id        TEXT NOT NULL REFERENCES candidates(id),
  job_role_id         TEXT NOT NULL REFERENCES job_roles(id),
  round_type          TEXT NOT NULL CHECK (round_type IN ('technical', 'qualifying', 'hr')),
  status              TEXT NOT NULL DEFAULT 'in_progress'
                      CHECK (status IN ('in_progress', 'completed', 'terminated')),
  questions           TEXT NOT NULL DEFAULT '[]',  -- JSON
  answers             TEXT NOT NULL DEFAULT '[]',  -- JSON
  evaluations         TEXT NOT NULL DEFAULT '[]',  -- JSON
  confidence_analysis TEXT,                        -- JSON
  recording_id        TEXT,
  final_grade         REAL,
  started_at          TEXT NOT NULL DEFAULT (datetime('now')),
  completed_at        TEXT
);

CREATE TABLE IF NOT EXISTS recordings (
  id               TEXT PRIMARY KEY,
  candidate_id     TEXT NOT NULL REFERENCES candidates(id),
  session_id       TEXT NOT NULL REFERENCES interview_sessions(id),
  job_role_id      TEXT NOT NULL REFERENCES job_roles(id),
  storage_url      TEXT NOT NULL,
  duration_seconds INTEGER,
  file_size_bytes  INTEGER,
  created_at       TEXT NOT NULL DEFAULT (datetime('now'))
);

CREATE INDEX IF NOT EXISTS idx_candidates_job_role    ON candidates(job_role_id);
CREATE INDEX IF NOT EXISTS idx_candidates_status      ON candidates(status);
CREATE INDEX IF NOT EXISTS idx_candidates_unique_code ON candidates(unique_code);
CREATE INDEX IF NOT EXISTS idx_sessions_candidate     ON interview_sessions(candidate_id);
CREATE INDEX IF NOT EXISTS idx_sessions_status        ON interview_sessions(status);
CREATE INDEX IF NOT EXISTS idx_recordings_candidate   ON recordings(candidate_id);
CREATE INDEX IF NOT EXISTS idx_recordings_session     ON recordings(session_id);
CREATE INDEX IF NOT EXISTS idx_questions_bank         ON questions(question_bank_id);
CREATE INDEX IF NOT EXISTS idx_questions_skill        ON questions(skill);
