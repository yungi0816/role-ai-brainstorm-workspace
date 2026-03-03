import Database from 'better-sqlite3';
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const backendRoot = path.resolve(__dirname, '..', '..');
const schemaPath = path.join(__dirname, 'schema.sql');

let db;

function resolveDatabasePath() {
  const configuredPath = process.env.DB_FILE || './data/app.db';
  return path.isAbsolute(configuredPath)
    ? configuredPath
    : path.resolve(backendRoot, configuredPath);
}

export function initDatabase() {
  if (db) {
    return db;
  }

  const dbPath = resolveDatabasePath();
  fs.mkdirSync(path.dirname(dbPath), { recursive: true });

  db = new Database(dbPath);
  db.pragma('foreign_keys = ON');

  const schema = fs.readFileSync(schemaPath, 'utf8');
  db.exec(schema);

  return db;
}

export function getDatabase() {
  if (!db) {
    return initDatabase();
  }

  return db;
}

export function closeDatabase() {
  if (db) {
    db.close();
    db = undefined;
  }
}
