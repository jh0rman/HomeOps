/**
 * SQLite Database Setup
 * Uses Bun's built-in SQLite support
 */

import { Database } from "bun:sqlite";
import { join } from "path";

// Database file location (in project root)
const DB_PATH = join(import.meta.dir, "../../data/homeops.db");

// Ensure data directory exists
import { mkdirSync } from "fs";
mkdirSync(join(import.meta.dir, "../../data"), { recursive: true });

// Create database connection
export const db = new Database(DB_PATH);

// Initialize schema
db.run(`
  CREATE TABLE IF NOT EXISTS meter_readings (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    month TEXT NOT NULL,
    floor INTEGER NOT NULL,
    start_reading REAL NOT NULL,
    end_reading REAL NOT NULL,
    created_at TEXT DEFAULT CURRENT_TIMESTAMP,
    UNIQUE(month, floor)
  )
`);

console.log("📦 Database initialized:", DB_PATH);
