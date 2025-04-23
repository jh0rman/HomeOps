/**
 * Test script for Luz del Sur API
 * Usage: bun run src/scripts/test-luzdelsur.ts
 */

import { luzdelsur } from "../services/luzdelsur";

async function main() {
  console.log("💡 Testing Luz del Sur connection...\n");

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
    console.log("\n📋 Supplies response:");
    console.log(JSON.stringify(suppliesResponse, null, 2));

    // Get latest invoice for first supply (if available)
    const supplies = suppliesResponse.datos?.suministros;
    if (suppliesResponse.success && supplies?.length) {
      const firstSupply = supplies[0];
      const supplyNumber = String(firstSupply?.suministro);

      console.log(
        `\n3. Fetching latest invoice for supply: ${supplyNumber}...`
      );
      const invoiceResponse = await luzdelsur.getLatestInvoice(supplyNumber);
      console.log("\n📋 Latest invoice response:");
      console.log(JSON.stringify(invoiceResponse, null, 2));
    }
  } catch (error) {
    console.error("❌ Error:", error);
  }
}

main();
