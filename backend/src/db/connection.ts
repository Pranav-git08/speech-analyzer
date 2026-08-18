/**
 * SQLite database connection using sql.js (pure JS, no native build required).
 * The database is stored at backend/data/speech_analyzer.sqlite
 *
 * Provides a pg-compatible query() wrapper so the rest of the codebase
 * needs minimal changes.
 */
import initSqlJs, { Database } from 'sql.js';
import fs from 'fs';
import path from 'path';

const DB_DIR = path.join(__dirname, '../../data');
const DB_PATH = path.join(DB_DIR, 'speech_analyzer.sqlite');

let _db: Database | null = null;

export async function getDb(): Promise<Database> {
  if (_db) return _db;

  const SQL = await initSqlJs();

  // Ensure data directory exists
  if (!fs.existsSync(DB_DIR)) {
    fs.mkdirSync(DB_DIR, { recursive: true });
  }

  // Load existing DB file or create a new one
  if (fs.existsSync(DB_PATH)) {
    const fileBuffer = fs.readFileSync(DB_PATH);
    _db = new SQL.Database(fileBuffer);
  } else {
    _db = new SQL.Database();
  }

  // Enable WAL mode and foreign keys
  _db.run('PRAGMA journal_mode=WAL;');
  _db.run('PRAGMA foreign_keys=ON;');

  // Run schema on first boot
  await runSchema(_db);

  // Persist to disk after every write
  persistDb(_db);

  return _db;
}

/** Save the in-memory SQLite DB to disk. */
export function persistDb(db: Database): void {
  const data = db.export();
  fs.writeFileSync(DB_PATH, Buffer.from(data));
}

/** Run the schema SQL to create tables if they don't exist. */
async function runSchema(db: Database): Promise<void> {
  const schemaPath = path.join(__dirname, 'schema.sqlite.sql');
  if (fs.existsSync(schemaPath)) {
    const schema = fs.readFileSync(schemaPath, 'utf-8');
    db.run(schema);
  }

  // Safe migrations for multi-stage codes
  try { db.run('ALTER TABLE candidates ADD COLUMN gd_code TEXT;'); } catch {}
  try { db.run('ALTER TABLE candidates ADD COLUMN hr_code TEXT;'); } catch {}
  try { db.run('ALTER TABLE candidates ADD COLUMN gd_score REAL;'); } catch {}

  persistDb(db);
}


// ─── pg-compatible query wrapper ─────────────────────────────────────────────

/**
 * Convert $1, $2, ... placeholders to ? for SQLite and expand params accordingly.
 */
function convertPlaceholdersAndParams(
  sql: string,
  params: unknown[] = []
): { sql: string; params: (string | number | null | Uint8Array)[] } {
  const expandedParams: (string | number | null | Uint8Array)[] = [];
  const convertedSql = sql.replace(/\$(\d+)/g, (_, numStr) => {
    const idx = parseInt(numStr, 10) - 1;
    expandedParams.push((params[idx] ?? null) as string | number | null | Uint8Array);
    return '?';
  });
  return { sql: convertedSql, params: expandedParams };
}

export interface QueryResult<T = Record<string, unknown>> {
  rows: T[];
  rowCount: number;
}

/**
 * Execute a SQL query and return a pg-compatible result object.
 * Automatically persists the DB to disk after write operations.
 */
export async function query<T = Record<string, unknown>>(
  sql: string,
  rawParams: unknown[] = []
): Promise<QueryResult<T>> {
  const db = await getDb();
  const { sql: converted, params } = convertPlaceholdersAndParams(sql, rawParams);

  const isWrite = /^\s*(INSERT|UPDATE|DELETE|CREATE|DROP|ALTER)/i.test(sql.trim());

  try {
    if (isWrite) {
      db.run(converted, params);
      const rowCount = db.getRowsModified();
      persistDb(db);
      return { rows: [], rowCount };
    } else {
      const stmt = db.prepare(converted);
      stmt.bind(params);
      const rows: T[] = [];
      while (stmt.step()) {
        rows.push(stmt.getAsObject() as T);
      }
      stmt.free();
      return { rows, rowCount: rows.length };
    }
  } catch (err) {
    throw new Error(`SQLite query error: ${String(err)}\nSQL: ${converted}`);
  }
}


/**
 * Execute multiple statements in a transaction.
 */
export async function withTransaction<T>(
  fn: (q: typeof query) => Promise<T>
): Promise<T> {
  const db = await getDb();
  db.run('BEGIN');
  try {
    const result = await fn(query);
    db.run('COMMIT');
    persistDb(db);
    return result;
  } catch (err) {
    db.run('ROLLBACK');
    throw err;
  }
}

/**
 * Legacy pool export — routes/services import { pool } from '../db/connection'.
 * This shim makes pool.query() work with the same signature.
 */
export const pool = {
  query: query as <T = Record<string, unknown>>(
    sql: string,
    params?: unknown[]
  ) => Promise<QueryResult<T>>,
};
