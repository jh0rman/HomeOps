/**
 * Test script for SEDAPAL API
 * Usage: bun run src/scripts/test-sedapal.ts
 */

import { sedapal } from "../services/sedapal";

async function main() {
  console.log("🚰 Testing SEDAPAL connection...\n");

  const email = process.env.SEDAPAL_EMAIL;
  const password = process.env.SEDAPAL_PASSWORD;

  try {
    // System login
    console.log("1. Attempting system login...");
    await sedapal.systemLogin();
    console.log("   ✅ System login successful\n");

    // User login
    if (email && password) {
      console.log("2. Attempting user login...");
      const loginResponse = await sedapal.login(email, password);

      if (sedapal.isAuthenticated()) {
        console.log(
          `   ✅ Authenticated! Supply number: ${sedapal.getSupplyNumber()}\n`
        );
      } else {
        console.log(`   ⚠️ Login failed: ${loginResponse.cRESP_SP}\n`);
      }
    }

    // Fetch invoices
    const nisToUse = sedapal.getSupplyNumber();
    if (nisToUse) {
      console.log(`3. Fetching invoices for NIS: ${nisToUse}...`);
      const invoicesResponse = await sedapal.getInvoices(nisToUse);

      console.log("\n📋 Invoices response:");
      console.log(JSON.stringify(invoicesResponse, null, 2));
    } else {
      console.log(
        "⚠️ No supply number available. Set SEDAPAL_NIS or login with email/password."
      );
    }
  } catch (error) {
    console.error("❌ Error:", error);
  }
}

main();
