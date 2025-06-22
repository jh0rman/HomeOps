/**
 * Floor Assignments CLI
 * Manage floor-to-user assignments via command line
 *
 * Usage:
 *   bun run floors list                    List all assignments
 *   bun run floors assign 1 51933844567    Assign phone to floor 1
 *   bun run floors remove 1                Remove floor 1 assignment
 */

import { floorAssignments } from "../services/floor-assignments";

const [command, ...args] = process.argv.slice(2);

function printHelp() {
  console.log(`
📍 Floor Assignments CLI

Commands:
  list                        List all floor assignments
  assign <floor> <phone>      Assign phone to floor
  remove <floor>              Remove floor assignment

Examples:
  bun run floors list
  bun run floors assign 1 51933844567
  bun run floors remove 1
`);
}

switch (command) {
  case "list": {
    const assignments = floorAssignments.getAllAssignments();

    if (assignments.length === 0) {
      console.log("📭 No floor assignments found");
      break;
    }

    console.log("\n📍 Floor Assignments\n");
    for (const a of assignments) {
      const name = a.name ? ` (${a.name})` : "";
      console.log(`   Piso ${a.floor}: ${a.phone}${name}`);
    }
    console.log("");
    break;
  }

  case "assign": {
    const [floorStr, phone, ...nameParts] = args;
    const name = nameParts.join(" ") || undefined;

    if (!floorStr || !phone) {
      console.error("❌ Usage: assign <floor> <phone> [name]");
      console.error("   Example: assign 1 51933844567 Juan");
      process.exit(1);
    }

    const floor = parseInt(floorStr);
    if (isNaN(floor) || floor < 1 || floor > 3) {
      console.error("❌ Floor must be 1, 2, or 3");
      process.exit(1);
    }

    floorAssignments.assignFloor(floor, phone, name);
    console.log(`✅ Assigned ${phone} to floor ${floor}`);
    break;
  }

  case "remove": {
    const [floorStr] = args;

    if (!floorStr) {
      console.error("❌ Usage: remove <floor>");
      process.exit(1);
    }

    const floor = parseInt(floorStr);
    const removed = floorAssignments.unassignFloor(floor);

    if (removed) {
      console.log(`🗑️ Removed assignment for floor ${floor}`);
    } else {
      console.log(`⚠️ No assignment found for floor ${floor}`);
    }
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
