/**
 * Test WhatsApp - Send Hello World to yourself
 */

import { whatsapp } from "../services/whatsapp";

async function main() {
  console.log("📱 WhatsApp Hello World Test\n");
  console.log("=".repeat(50));

  try {
    // Connect to WhatsApp
    console.log("🔄 Connecting to WhatsApp...");
    const sock = await whatsapp.connect();

    // Wait for connection
    await whatsapp.waitForConnection(sock);

    // Get own JID
    const ownJid = whatsapp.getOwnJid();
    if (!ownJid) {
      console.error("❌ Could not get own JID");
      process.exit(1);
    }

    console.log(`📞 Your JID: ${ownJid}`);

    // Send message to yourself
    console.log("\n📤 Sending Hello World...");
    await whatsapp.sendMessage(ownJid, "👋 ¡Hola Mundo desde HomeOps!");

    console.log("\n✅ Message sent successfully!");

    // Keep connection alive for a bit to ensure delivery
    await new Promise((resolve) => setTimeout(resolve, 60000));

    // Disconnect
    await whatsapp.disconnect();
    console.log("👋 Disconnected");

    process.exit(0);
  } catch (error) {
    console.error("❌ Error:", error);
    process.exit(1);
  }
}

main();
