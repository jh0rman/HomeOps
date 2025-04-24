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
    // Login (request access + get token)
    console.log("1. Attempting login...");
    const { accessResponse, tokenResponse } = await calidda.login(
      email,
      password
    );

    console.log("\n📋 Access response:");
    console.log(JSON.stringify(accessResponse, null, 2));

    if (tokenResponse) {
      console.log("\n📋 Token response:");
      console.log(JSON.stringify(tokenResponse, null, 2));
    }

    if (calidda.isAuthenticated()) {
      console.log("\n✅ Authenticated!");
    } else {
      console.log("\n⚠️ Authentication may have failed");
    }
  } catch (error) {
    console.error("❌ Error:", error);
  }
}

main();
