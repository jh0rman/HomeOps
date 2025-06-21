/**
 * WhatsApp Report Bot
 * Sends utility report when triggered by keyword in group
 */

import { whatsapp } from "../services/whatsapp";
import { fetchAllData } from "../services/homeops/aggregator";
import { formatReport, formatPayments } from "../services/homeops/formatter";
import { floorAssignments } from "../services/floor-assignments";
import { gemini } from "../services/gemini";

// Configuration
const GROUP_JID = process.env.GROUP_JID || "";
const TRIGGER_KEYWORD = process.env.TRIGGER_KEYWORD || "!reporte";
const TRIGGER_PAYMENTS = "!pagos";
const TRIGGER_MEDIDOR = "!medidor";
const TRIGGER_PISO = "!piso";
const SCHEDULE_DAY = parseInt(process.env.SCHEDULE_DAY || "26", 10);
const SCHEDULE_HOUR = parseInt(process.env.SCHEDULE_HOUR || "9", 10);

// Track if we already sent today (to avoid duplicate sends)
let lastSentDate: string | null = null;

// Send report function
async function sendReport(reason: string) {
  console.log(`\n🚀 ${reason}`);

  try {
    const data = await fetchAllData();
    const report = formatReport(data);

    console.log("\n📤 Sending report to group...");
    await whatsapp.sendMessage(GROUP_JID, report);
    console.log("✅ Report sent!");

    // Mark as sent today
    lastSentDate = new Date().toDateString();
  } catch (error) {
    console.error("❌ Error generating report:", error);
    await whatsapp.sendMessage(
      GROUP_JID,
      "❌ Error al generar el reporte. Intenta de nuevo."
    );
  }
}

// Send payments logic
async function sendPayments(reason: string) {
  console.log(`\n🚀 ${reason}`);

  try {
    const data = await fetchAllData();
    const report = formatPayments(data);

    console.log("\n📤 Sending payments summary to group...");
    await whatsapp.sendMessage(GROUP_JID, report);
    console.log("✅ Summary sent!");
  } catch (error) {
    console.error("❌ Error generating summary:", error);
    await whatsapp.sendMessage(
      GROUP_JID,
      "❌ Error al generar el resumen. Intenta de nuevo."
    );
  }
}

// Process meter reading image with Gemini OCR
async function processMeterImage(
  imageBuffer: Buffer,
  mimeType: string,
  floor?: number
) {
  console.log("\n🔍 Processing meter image with Gemini...");

  try {
    const result = await gemini.extractMeterReading(imageBuffer, mimeType);

    if (result.success && result.text) {
      console.log(`   📊 OCR Result: ${result.text}`);
      const floorInfo = floor ? ` (Piso ${floor})` : "";
      await whatsapp.sendMessage(
        GROUP_JID,
        `📊 *Lectura detectada${floorInfo}:* \`${result.text}\``
      );
    } else {
      console.log(`   ⚠️ OCR failed: ${result.error}`);
      await whatsapp.sendMessage(
        GROUP_JID,
        `⚠️ No se pudo leer el medidor: ${result.error || "Error desconocido"}`
      );
    }
  } catch (error) {
    console.error("❌ Error in Gemini OCR:", error);
    await whatsapp.sendMessage(GROUP_JID, "❌ Error al procesar la imagen.");
  }
}

// Handle floor assignment command
async function handlePisoCommand(sender: string, args: string) {
  const floorNum = parseInt(args, 10);

  if (isNaN(floorNum) || floorNum < 1 || floorNum > 3) {
    await whatsapp.sendMessage(
      GROUP_JID,
      "⚠️ Uso: `!piso <1|2|3>`\nEjemplo: `!piso 1`"
    );
    return;
  }

  floorAssignments.assignFloor(floorNum, sender);
  console.log(`   📍 Assigned ${sender} to floor ${floorNum}`);
  await whatsapp.sendMessage(GROUP_JID, `✅ Te asigné al *Piso ${floorNum}*`);
}

// Check if we should send scheduled report
function checkScheduledReport() {
  const now = new Date();
  const today = now.toDateString();

  // Don't send if already sent today
  if (lastSentDate === today) return;

  // Check if it's the right day and hour
  if (now.getDate() === SCHEDULE_DAY && now.getHours() === SCHEDULE_HOUR) {
    // Only send the report automatically, not the payment summary
    sendReport(`Scheduled report (day ${SCHEDULE_DAY} at ${SCHEDULE_HOUR}:00)`);
  }
}

async function main() {
  console.log("🤖 WhatsApp Report Bot\n");
  console.log("=".repeat(50));

  // Validate environment (simplified check, detailed check could be in aggregator or config utils)
  if (!process.env.SEDAPAL_EMAIL) {
    console.error("❌ Missing env vars (check .env)");
    process.exit(1);
  }

  if (!GROUP_JID) {
    console.error("❌ Missing GROUP_JID");
    process.exit(1);
  }

  console.log(`📌 Group: ${GROUP_JID}`);
  console.log(
    `🔑 Triggers: "${TRIGGER_KEYWORD}", "${TRIGGER_PAYMENTS}", "${TRIGGER_MEDIDOR}", "${TRIGGER_PISO}"`
  );
  console.log(`📅 Schedule: Day ${SCHEDULE_DAY} at ${SCHEDULE_HOUR}:00`);

  // Connect to WhatsApp
  console.log("\n🔄 Connecting to WhatsApp...");
  const sock = await whatsapp.connect();
  await whatsapp.waitForConnection(sock);

  // Listen for messages
  whatsapp.listenToGroup(GROUP_JID, async (message) => {
    const text = message.text.toLowerCase().trim();

    // Handle text commands
    if (text === TRIGGER_KEYWORD.toLowerCase()) {
      await sendReport("Keyword trigger detected!");
    } else if (text === TRIGGER_PAYMENTS.toLowerCase()) {
      await sendPayments("Payments trigger detected!");
    } else if (text.startsWith(TRIGGER_PISO)) {
      const args = text.replace(TRIGGER_PISO, "").trim();
      await handlePisoCommand(message.sender, args);
    }

    // Handle image with !medidor caption
    if (
      message.hasImage &&
      message.imageBuffer &&
      text.startsWith(TRIGGER_MEDIDOR)
    ) {
      // Auto-detect floor from sender
      const floor = floorAssignments.getFloorByPhone(message.sender);
      await processMeterImage(
        message.imageBuffer,
        message.imageMimeType || "image/jpeg",
        floor || undefined
      );
    }
  });

  // Start scheduler (check every minute)
  setInterval(checkScheduledReport, 60 * 1000);
  console.log("\n⏳ Bot running... (Ctrl+C to exit)");
  console.log(
    `   Next scheduled: Day ${SCHEDULE_DAY} at ${SCHEDULE_HOUR}:00\n`
  );

  // Keep alive
  await new Promise(() => {});
}

main();
