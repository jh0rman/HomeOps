/**
 * Floor Assignments Service
 * Manages user-to-floor mappings
 */

import { db } from "../../db";

export interface FloorAssignment {
  floor: number;
  phone: string;
  name?: string;
  createdAt?: string;
}

// Normalize phone (remove device ID suffix if present)
function normalizePhone(phone: string): string {
  // WhatsApp IDs can be "51933844567:61@s.whatsapp.net" or "51933844567@s.whatsapp.net"
  // Extract just the phone number
  const withoutDevice = phone.split(":")[0] || phone;
  return withoutDevice.split("@")[0] || withoutDevice;
}

// Assign user to a floor (replaces existing assignment for that floor)
export function assignFloor(floor: number, phone: string, name?: string): void {
  const normalizedPhone = normalizePhone(phone);

  // First, remove any existing assignment for this phone (if they're on another floor)
  db.run(`DELETE FROM floor_assignments WHERE phone = ?`, [normalizedPhone]);

  // Then assign to new floor (replaces existing floor owner)
  const stmt = db.prepare(`
    INSERT INTO floor_assignments (floor, phone, name)
    VALUES (?, ?, ?)
    ON CONFLICT(floor) DO UPDATE SET
      phone = excluded.phone,
      name = excluded.name,
      created_at = CURRENT_TIMESTAMP
  `);
  stmt.run(floor, normalizedPhone, name || null);
}

// Get floor number for a phone
export function getFloorByPhone(phone: string): number | null {
  const normalizedPhone = normalizePhone(phone);
  const stmt = db.prepare(`
    SELECT floor FROM floor_assignments WHERE phone = ?
  `);
  const result = stmt.get(normalizedPhone) as { floor: number } | null;
  return result?.floor || null;
}

// Get all floor assignments
export function getAllAssignments(): FloorAssignment[] {
  const stmt = db.prepare(`
    SELECT floor, phone, name, created_at as createdAt
    FROM floor_assignments
    ORDER BY floor
  `);
  return stmt.all() as FloorAssignment[];
}

// Remove assignment for a floor
export function unassignFloor(floor: number): boolean {
  const stmt = db.prepare(`DELETE FROM floor_assignments WHERE floor = ?`);
  const result = stmt.run(floor);
  return result.changes > 0;
}

export const floorAssignments = {
  assignFloor,
  getFloorByPhone,
  getAllAssignments,
  unassignFloor,
};
