/**
 * Test WhatsApp - Listen to a specific group
 *
 * Usage: GROUP_JID="123456789@g.us" bun run src/scripts/listen-whatsapp.ts
 *
 * To find your group JID, first run without GROUP_JID to see all incoming messages
 */

import { whatsapp } from "../services/whatsapp";

async function main() {
  console.log("📱 WhatsApp Group Listener\n");
  console.log("=".repeat(50));

  const groupJid = process.env.GROUP_JID;

  if (!groupJid) {
    console.log(
      "⚠️  No GROUP_JID provided - will log ALL messages to help you find the group JID\n"
    );
  } else {
    console.log(`🎯 Will listen to group: ${groupJid}\n`);
  }

  try {
    // Connect to WhatsApp
    console.log("🔄 Connecting to WhatsApp...");
    const sock = await whatsapp.connect();
    await whatsapp.waitForConnection(sock);

    // Start listening
    whatsapp.listenToGroup(groupJid || "", (message) => {
      // Callback is optional, logs are already printed in the client
      // You can add custom processing here
    });

    console.log("\n⏳ Waiting for messages... (Ctrl+C to exit)\n");

    // Keep the process running
    await new Promise(() => {}); // Never resolves, keeps process alive
  } catch (error) {
    console.error("❌ Error:", error);
    process.exit(1);
  }
}

main();
