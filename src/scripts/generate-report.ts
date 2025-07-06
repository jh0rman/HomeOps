/**
 * CLI Report Generator
 * Generates and prints the HomeOps report to console
 *
 * Usage:
 *   bun report              (Show full report)
 *   bun report --payments   (Show payments summary)
 */

import { fetchAllData } from "../services/homeops/aggregator";
import { formatReport, formatPayments } from "../services/homeops/formatter";

const args = process.argv.slice(2);
const showPayments = args.includes("--payments");

async function main() {
  console.log("📊 Generando reporte...\n");

  try {
    const data = await fetchAllData();
    console.log("\n" + "=".repeat(30) + "\n");

    if (showPayments) {
      console.log(formatPayments(data));
    } else {
      console.log(formatReport(data));
    }

    console.log("\n" + "=".repeat(30) + "\n");
    console.log("✅ Reporte generado exitosamente");
  } catch (error) {
    console.error("❌ Error generando reporte:", error);
    process.exit(1);
  }
}

main();
