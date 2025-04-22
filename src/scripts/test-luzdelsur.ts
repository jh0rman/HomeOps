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

    console.log("\n📋 Login response:");
    console.log(JSON.stringify(loginResponse, null, 2));

    if (luzdelsur.isAuthenticated()) {
      console.log("\n✅ Authenticated!");
    } else {
      console.log("\n⚠️ Login may have failed");
    }
  } catch (error) {
    console.error("❌ Error:", error);
  }
}

main();
