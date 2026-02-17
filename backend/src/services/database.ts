import Database, { Database as DatabaseType } from 'better-sqlite3';
import bcrypt from 'bcryptjs';
import path from 'path';
import fs from 'fs';
import { config } from '../config';
import { User } from '../types';

const dataDir = config.dataDir;
if (!fs.existsSync(dataDir)) {
  fs.mkdirSync(dataDir, { recursive: true });
}

const db = new Database(path.join(dataDir, 'musicbot.db'));

// Enable WAL mode for better performance
db.pragma('journal_mode = WAL');

// Initialize tables
db.exec(`
  CREATE TABLE IF NOT EXISTS users (
    id TEXT PRIMARY KEY,
    username TEXT UNIQUE NOT NULL,
    password_hash TEXT NOT NULL,
    role TEXT NOT NULL DEFAULT 'user'
  );

  CREATE TABLE IF NOT EXISTS settings (
    key TEXT PRIMARY KEY,
    value TEXT NOT NULL
  );
`);

export function getUser(username: string): User | null {
  const row = db.prepare('SELECT * FROM users WHERE username = ?').get(username) as
    | { id: string; username: string; password_hash: string; role: string }
    | undefined;
  if (!row) return null;
  return {
    id: row.id,
    username: row.username,
    passwordHash: row.password_hash,
    role: row.role as 'admin' | 'user',
  };
}

export function createUser(id: string, username: string, password: string, role: string): void {
  const hash = bcrypt.hashSync(password, 10);
  db.prepare('INSERT OR IGNORE INTO users (id, username, password_hash, role) VALUES (?, ?, ?, ?)').run(
    id,
    username,
    hash,
    role,
  );
}

export function getSetting(key: string): string | null {
  const row = db.prepare('SELECT value FROM settings WHERE key = ?').get(key) as
    | { value: string }
    | undefined;
  return row?.value ?? null;
}

export function setSetting(key: string, value: string): void {
  db.prepare('INSERT OR REPLACE INTO settings (key, value) VALUES (?, ?)').run(key, value);
}

// Create default admin user if none exists
const adminExists = db.prepare('SELECT COUNT(*) as count FROM users WHERE role = ?').get('admin') as { count: number };
if (adminExists.count === 0) {
  const { v4: uuid } = require('uuid');
  createUser(uuid(), config.defaultAdmin.username, config.defaultAdmin.password, 'admin');
  console.log(`Default admin user created: ${config.defaultAdmin.username}`);
}

const database: DatabaseType = db;
export { database as db };
