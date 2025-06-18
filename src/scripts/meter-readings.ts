/**
 * Meter Readings CLI
 * Manage electricity meter readings via command line
 * 
 * Usage:
 *   bun run meter:add 01/2025 1 1234.5 1328.8    Add reading for floor 1
 *   bun run meter:add 01/2025 2 2100 2216.8      Add reading for floor 2
 *   bun run meter:list                            List all readings
 *   bun run meter:list 01/2025                    List readings for month
 */

import { meterReadings } from "../services/meter-readings";

const [command, ...args] = process.argv.slice(2);

function printHelp() {
  console.log(`
📊 Meter Readings CLI

Commands:
  add <month> <floor> <start> <end>   Add/update a reading
  list [month]                        List readings
  delete <month>                      Delete readings for a month

Examples:
  bun run meter add 01/2025 1 1234.5 1328.8
  bun run meter list
  bun run meter list 01/2025
  bun run meter delete 01/2025
`);
}

function formatKwh(start: number, end: number) {
  return (end - start).toFixed(1);
}

switch (command) {
  case "add": {
    const [month, floorStr, startStr, endStr] = args;
    if (!month || !floorStr || !startStr || !endStr) {
      console.error("❌ Usage: add <month> <floor> <start> <end>");
      console.error("   Example: add 01/2025 1 1234.5 1328.8");
      process.exit(1);
    }
    
    const floor = parseInt(floorStr);
    const start = parseFloat(startStr);
    const end = parseFloat(endStr);
    
    if (isNaN(floor) || isNaN(start) || isNaN(end)) {
      console.error("❌ Invalid numbers");
      process.exit(1);
    }
    
    meterReadings.upsertReading(month, floor, start, end);
    console.log(`✅ Added: ${month} Piso ${floor}: ${start} → ${end} (${formatKwh(start, end)} kWh)`);
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
      console.log(`   Piso ${r.floor}: ${r.startReading} → ${r.endReading} (${formatKwh(r.startReading, r.endReading)} kWh)`);
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
