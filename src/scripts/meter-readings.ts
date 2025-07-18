/**
 * Meter Readings CLI
 * Manage electricity meter readings via command line
 *
 * Usage:
 *   bun meter add <floor> <reading>       Register current month reading
 *   bun meter list                        List all readings
 *   bun meter list <month>                List readings for a specific month
 *   bun meter delete <month>              Delete all readings for a month
 */

import { meterReadings } from "../services/meter-readings";

const [command, ...args] = process.argv.slice(2);

function printHelp() {
  console.log(`
📊 Meter Readings CLI

Commands:
  add <floor> <reading>          Register reading (current month, auto start)
  add <month> <floor> <reading>  Register reading for a specific month
  list [month]                   List readings (all or by month)
  delete <month>                 Delete readings for a month

Examples:
  bun meter add 1 1587.3               → Piso 1, current month, auto start
  bun meter add 02/2026 2 2172.3       → Piso 2, Feb 2026, auto start
  bun meter list
  bun meter list 01/2026
  bun meter delete 12/2025
`);
}

function formatKwh(start: number, end: number) {
  return (end - start).toFixed(1);
}

switch (command) {
  case "add": {
    let month: string;
    let floor: number;
    let endReading: number;

    if (args.length === 2) {
      // Short form: add <floor> <reading> (current month)
      month = meterReadings.getCurrentMonth();
      floor = parseInt(args[0]!);
      endReading = parseFloat(args[1]!);
    } else if (args.length === 3) {
      // Full form: add <month> <floor> <reading>
      month = args[0]!;
      floor = parseInt(args[1]!);
      endReading = parseFloat(args[2]!);
    } else {
      console.error("❌ Usage: add <floor> <reading>");
      console.error("   Example: add 1 1587.3");
      process.exit(1);
    }

    if (isNaN(floor) || floor < 1 || floor > 3) {
      console.error("❌ Floor must be 1, 2, or 3");
      process.exit(1);
    }

    if (isNaN(endReading)) {
      console.error("❌ Invalid reading number");
      process.exit(1);
    }

    // Auto-detect start reading from previous data
    const previous = meterReadings.getLatestFloorReading(floor);
    const startReading = previous?.endReading ?? endReading;

    meterReadings.upsertReading(month, floor, startReading, endReading);
    const kwh = Math.max(0, endReading - startReading);
    console.log(
      `✅ ${month} Piso ${floor}: ${startReading} → ${endReading} (${kwh.toFixed(1)} kWh)`,
    );
    break;
  }

  case "list": {
    const [month] = args;
    const readings = month
      ? meterReadings.getReadings(month)
      : meterReadings.getAllReadings();

    if (readings.length === 0) {
      console.log("📭 No readings found");
      break;
    }

    console.log("\n📊 Meter Readings\n");

    let currentMonth = "";
    for (const r of readings) {
      if (r.month !== currentMonth) {
        currentMonth = r.month;
        console.log(`📅 ${r.month}`);
      }
      console.log(
        `   Piso ${r.floor}: ${r.startReading} → ${r.endReading} (${formatKwh(r.startReading, r.endReading)} kWh)`,
      );
    }
    console.log("");
    break;
  }

  case "delete": {
    const [month] = args;
    if (!month) {
      console.error("❌ Usage: delete <month>");
      process.exit(1);
    }

    const count = meterReadings.deleteMonth(month);
    console.log(`🗑️ Deleted ${count} readings for ${month}`);
    break;
  }

  case "help":
  case "--help":
  case "-h":
    printHelp();
    break;

  default:
    if (command) {
      console.error(`❌ Unknown command: ${command}`);
    }
    printHelp();
    break;
}
