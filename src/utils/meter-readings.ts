/**
 * Meter readings parser and validator
 * Reads from a single JSON environment variable
 */

import type { MeterReading } from "./electricity-calculator";

/**
 * Expected JSON format for METER_READINGS variable:
 * {
 *   "month": "12/2025",
 *   "floor1": { "start": 1304.3, "end": 1400 },
 *   "floor2": { "start": 1927.2, "end": 2050 },
 *   "floor3": { "start": 495.3, "end": 540 }
 * }
 */
export interface MeterReadingsConfig {
  month: string; // MM/YYYY format (e.g., "12/2025")
  floor1: { start: number; end: number };
  floor2: { start: number; end: number };
  floor3: { start: number; end: number };
}

/**
 * Parse meter readings from METER_READINGS environment variable
 */
export function parseMeterReadingsFromEnv(): MeterReadingsConfig | null {
  const jsonString = process.env.METER_READINGS;

  if (!jsonString) {
    return null;
  }

  try {
    const config = JSON.parse(jsonString) as MeterReadingsConfig;

    // Validate required fields
    if (
      !config.month ||
      !config.floor1?.start ||
      !config.floor1?.end ||
      !config.floor2?.start ||
      !config.floor2?.end ||
      !config.floor3?.start ||
      !config.floor3?.end
    ) {
      return null;
    }

    return config;
  } catch {
    return null;
  }
}

/**
 * Convert config to MeterReading array
 */
export function configToMeterReadings(
  config: MeterReadingsConfig
): MeterReading[] {
  return [
    {
      floor: 1,
      startReading: config.floor1.start,
      endReading: config.floor1.end,
    },
    {
      floor: 2,
      startReading: config.floor2.start,
      endReading: config.floor2.end,
    },
    {
      floor: 3,
      startReading: config.floor3.start,
      endReading: config.floor3.end,
    },
  ];
}

/**
 * Check if meter readings are fresh for the current billing period
 * The billing period from Luz del Sur is like "Diciembre 2025"
 * The month should be "12/2025" for December 2025
 */
export function validateMeterReadingsFreshness(
  month: string,
  billingPeriod: string
): { isValid: boolean; message: string } {
  // Parse billing period (e.g., "Diciembre 2025")
  const monthMap: Record<string, string> = {
    enero: "01",
    febrero: "02",
    marzo: "03",
    abril: "04",
    mayo: "05",
    junio: "06",
    julio: "07",
    agosto: "08",
    septiembre: "09",
    octubre: "10",
    noviembre: "11",
    diciembre: "12",
  };

  const parts = billingPeriod.toLowerCase().split(" ");
  if (parts.length !== 2) {
    return {
      isValid: false,
      message: `Invalid billing period format: ${billingPeriod}`,
    };
  }

  const monthName = parts[0] ?? "";
  const year = parts[1] ?? "";
  const monthNum = monthMap[monthName];

  if (!monthNum || !year) {
    return {
      isValid: false,
      message: `Could not parse billing period: ${billingPeriod}`,
    };
  }

  const expectedMonth = `${monthNum}/${year}`;

  if (month === expectedMonth) {
    return {
      isValid: true,
      message: `Meter readings are up to date for ${billingPeriod}`,
    };
  }

  return {
    isValid: false,
    message: `Meter readings outdated. Expected: ${expectedMonth}, Got: ${month}. Please update METER_READINGS variable.`,
  };
}
