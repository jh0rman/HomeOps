/**
 * Test script for Luz del Sur API with electricity calculator
 */

import { luzdelsur } from "../services/luzdelsur";
import {
  calculateElectricityDistribution,
  extractBillFromApiResponse,
  formatCurrency,
  formatPercentage,
  type MeterReading,
} from "../utils/electricity-calculator";

async function main() {
  console.log("💡 Testing Luz del Sur with Electricity Calculator...\n");

  const email = process.env.LUZDELSUR_EMAIL;
  const password = process.env.LUZDELSUR_PASSWORD;

  if (!email || !password) {
    console.error(
      "❌ Please set LUZDELSUR_EMAIL and LUZDELSUR_PASSWORD environment variables"
    );
    process.exit(1);
  }

  try {
    // User login
    console.log("1. Attempting user login...");
    const loginResponse = await luzdelsur.login(email, password);

    if (!luzdelsur.isAuthenticated()) {
      console.error("❌ Login failed:", loginResponse);
      process.exit(1);
    }
    console.log("   ✅ Authenticated!\n");

    // Get supplies
    console.log("2. Fetching supplies...");
    const suppliesResponse = await luzdelsur.getSupplies();

    const supplies = suppliesResponse.datos?.suministros;
    if (!suppliesResponse.success || !supplies?.length) {
      console.error("❌ No supplies found");
      process.exit(1);
    }

    const firstSupply = supplies[0];
    const supplyNumber = String(firstSupply?.suministro);
    console.log(`   ✅ Found supply: ${supplyNumber}\n`);

    // Get latest invoice
    console.log("3. Fetching latest invoice...");
    const invoiceResponse = await luzdelsur.getLatestInvoice(supplyNumber);

    if (!invoiceResponse.success || !invoiceResponse.datos) {
      console.error("❌ Failed to get invoice");
      process.exit(1);
    }

    const invoice = invoiceResponse.datos;
    console.log("   ✅ Invoice fetched!\n");

    // Print raw invoice data
    console.log("═".repeat(60));
    console.log("📋 RAW INVOICE DATA FROM API");
    console.log("═".repeat(60));
    console.log(JSON.stringify(invoice, null, 2));

    // Extract bill data
    console.log("\n" + "═".repeat(60));
    console.log("📊 EXTRACTED BILL DATA");
    console.log("═".repeat(60));

    const billData = extractBillFromApiResponse(invoice);
    console.log(`Billing Period:      ${billData.billingPeriod}`);
    console.log(`Energy Cost:         ${formatCurrency(billData.energyCost)}`);
    console.log(
      `Other Concepts:      ${formatCurrency(billData.otherConcepts)}`
    );
    console.log(`IGV:                 ${formatCurrency(billData.igv)}`);
    console.log(`Total Bill:          ${formatCurrency(billData.totalBill)}`);

    // Test with mock meter readings (these would come from user input)
    console.log("\n" + "═".repeat(60));
    console.log("🔌 TEST CALCULATION WITH MOCK METER READINGS");
    console.log("═".repeat(60));

    // Mock readings - these need to be provided by the user
    const mockReadings: MeterReading[] = [
      { floor: 1, startReading: 1304.3, endReading: 1400.0 },
      { floor: 2, startReading: 1927.2, endReading: 2050.0 },
      { floor: 3, startReading: 495.3, endReading: 540.0 },
    ];

    console.log("\nMock meter readings:");
    mockReadings.forEach((r) => {
      console.log(
        `  Piso ${r.floor}: ${r.startReading} → ${r.endReading} kWh (${r.endReading - r.startReading} kWh)`
      );
    });

    const report = calculateElectricityDistribution(billData, mockReadings);

    console.log("\n📊 DISTRIBUTION REPORT");
    console.log("─".repeat(60));
    console.log(`Total from meters: ${report.meterTotal.toFixed(1)} kWh\n`);

    console.log("Piso\tkWh\t%\tEnergía\t\tIGV\t\tOtros\t\tTotal");
    console.log("─".repeat(60));
    report.floors.forEach((floor) => {
      console.log(
        `${floor.floor}\t${floor.consumption.toFixed(1)}\t${formatPercentage(floor.percentage)}\t${formatCurrency(floor.energyCost)}\t\t${formatCurrency(floor.igv)}\t\t${formatCurrency(floor.otherConcepts)}\t\t${formatCurrency(floor.total)}`
      );
    });
    console.log("─".repeat(60));
    console.log(
      `TOTAL\t\t\t${formatCurrency(billData.energyCost)}\t\t${formatCurrency(billData.igv)}\t\t${formatCurrency(billData.otherConcepts)}\t\t${formatCurrency(report.grandTotal)}`
    );

    console.log("\n" + "═".repeat(60));
    console.log("⚠️  WHAT'S MISSING:");
    console.log("═".repeat(60));
    console.log("• Meter readings per floor (startReading, endReading)");
    console.log("  → Need to be provided by user or stored somewhere");
  } catch (error) {
    console.error("❌ Error:", error);
  }
}

main();
