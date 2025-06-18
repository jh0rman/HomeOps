/**
 * Meter Readings Service
 * CRUD operations for electricity meter readings
 */

import { db } from "../../db";

export interface MeterReading {
  id?: number;
  month: string; // Format: "MM/YYYY"
  floor: number;
  startReading: number;
  endReading: number;
  createdAt?: string;
}

// Get readings for a specific month
export function getReadings(month: string): MeterReading[] {
  const stmt = db.prepare(`
    SELECT id, month, floor, start_reading as startReading, end_reading as endReading, created_at as createdAt
    FROM meter_readings
    WHERE month = ?
    ORDER BY floor
  `);
  return stmt.all(month) as MeterReading[];
}

// Get the most recent month with readings
export function getLatestMonth(): string | null {
  const stmt = db.prepare(`
    SELECT month FROM meter_readings
    ORDER BY 
      CAST(SUBSTR(month, 4, 4) AS INTEGER) DESC,
      CAST(SUBSTR(month, 1, 2) AS INTEGER) DESC
    LIMIT 1
  `);
  const result = stmt.get() as { month: string } | null;
  return result?.month || null;
}

// Get latest readings (for the most recent month)
export function getLatestReadings(): MeterReading[] {
  const month = getLatestMonth();
  if (!month) return [];
  return getReadings(month);
}

// Insert or update a reading
export function upsertReading(
  month: string,
  floor: number,
  startReading: number,
  endReading: number
): void {
  const stmt = db.prepare(`
    INSERT INTO meter_readings (month, floor, start_reading, end_reading)
    VALUES (?, ?, ?, ?)
    ON CONFLICT(month, floor) DO UPDATE SET
      start_reading = excluded.start_reading,
      end_reading = excluded.end_reading,
      created_at = CURRENT_TIMESTAMP
  `);
  stmt.run(month, floor, startReading, endReading);
}

// Get all readings (for listing)
export function getAllReadings(): MeterReading[] {
  const stmt = db.prepare(`
    SELECT id, month, floor, start_reading as startReading, end_reading as endReading, created_at as createdAt
    FROM meter_readings
    ORDER BY 
      CAST(SUBSTR(month, 4, 4) AS INTEGER) DESC,
      CAST(SUBSTR(month, 1, 2) AS INTEGER) DESC,
      floor
  `);
  return stmt.all() as MeterReading[];
}

// Delete readings for a month
export function deleteMonth(month: string): number {
  const stmt = db.prepare(`DELETE FROM meter_readings WHERE month = ?`);
  const result = stmt.run(month);
  return result.changes;
}

export const meterReadings = {
  getReadings,
  getLatestMonth,
  getLatestReadings,
  upsertReading,
  getAllReadings,
  deleteMonth,
};
