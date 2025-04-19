/**
 * Test script for SEDAPAL API
 * Usage: bun run src/scripts/test-sedapal.ts
 */

import { sedapal } from "../services/sedapal";

async function main() {
  console.log("🚰 Testing SEDAPAL connection...\n");

  // Test credentials (replace with real ones or use env vars)
  const email = process.env.SEDAPAL_EMAIL || "";
  const password = process.env.SEDAPAL_PASSWORD || "";

  try {
    // First attempt system login
    console.log("1. Attempting system login...");
    await sedapal.systemLogin();
    console.log("   ✅ System login successful\n");

    // User login
    console.log("2. Attempting user login...");
    const loginResponse = await sedapal.login(email, password);

    console.log("\n📋 Login response:");
    console.log(JSON.stringify(loginResponse, null, 2));

    if (sedapal.isAuthenticated()) {
      console.log(
        `\n✅ Authenticated! Supply number: ${sedapal.getSupplyNumber()}`
      );
    }
  } catch (error) {
    console.error("❌ Error:", error);
  }
}

main();
