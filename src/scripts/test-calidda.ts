/**
 * Test script for Cálidda API
 * Usage: bun run src/scripts/test-calidda.ts
 */

import { calidda } from "../services/calidda";

async function main() {
  console.log("🔥 Testing Cálidda connection...\n");

  const email = process.env.CALIDDA_EMAIL;
  const password = process.env.CALIDDA_PASSWORD;

  if (!email || !password) {
    console.error(
      "❌ Please set CALIDDA_EMAIL and CALIDDA_PASSWORD environment variables"
    );
    process.exit(1);
  }

  try {
    // Login
    console.log("1. Attempting login...");
    await calidda.login(email, password);

    if (!calidda.isAuthenticated()) {
      console.error("❌ Login failed");
      process.exit(1);
    }
    console.log("   ✅ Authenticated!\n");

    // Get accounts
    console.log("2. Fetching accounts...");
    const accountsResponse = await calidda.getAccounts();
    console.log("\n📋 Accounts response:");
    console.log(JSON.stringify(accountsResponse, null, 2));

    // Get account statement for first account (if available)
    const accounts = accountsResponse.data;
    if (accountsResponse.valid && accounts?.length) {
      const firstAccount = accounts[0];

      console.log(
        `\n3. Fetching account statement for: ${firstAccount?.clientCode}...`
      );
      const statementResponse = await calidda.getAccountStatement(
        firstAccount?.clientCode ?? ""
      );
      console.log("\n📋 Account statement response:");
      console.log(JSON.stringify(statementResponse, null, 2));
    }
  } catch (error) {
    console.error("❌ Error:", error);
  }
}

main();
