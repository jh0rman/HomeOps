/**
 * WhatsApp Report Bot
 * Sends utility report when triggered by keyword in group
 */

import { whatsapp } from "../services/whatsapp";
import { fetchAllData } from "../services/homeops/aggregator";
import { formatReport, formatPayments } from "../services/homeops/formatter";
import { floorAssignments } from "../services/floor-assignments";
import { gemini } from "../services/gemini";
import { meterReadings } from "../services/meter-readings";

// Configuration
const GROUP_JID = process.env.GROUP_JID || "";
const TRIGGER_KEYWORD = process.env.TRIGGER_KEYWORD || "!reporte";
const TRIGGER_PAYMENTS = "!pagos";
const TRIGGER_PISO = "!piso";
const TRIGGER_REMINDER = "!recordatorio";
const SCHEDULE_DAY = parseInt(process.env.SCHEDULE_DAY || "26", 10);
const SCHEDULE_HOUR = parseInt(process.env.SCHEDULE_HOUR || "9", 10);
const REMINDER_DAY = 20;

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

// Process meter reading image with Gemini OCR and save to DB
async function processMeterImage(
  imageBuffer: Buffer,
  mimeType: string,
  floor: number
) {
  console.log(`\n🔍 Processing meter image for floor ${floor}...`);

  try {
    const result = await gemini.extractMeterReading(imageBuffer, mimeType);

    if (!result.success || !result.text) {
      console.log(`   ⚠️ OCR failed: ${result.error}`);
      await whatsapp.sendMessage(
        GROUP_JID,
        `⚠️ No se pudo leer el medidor: ${result.error || "Error desconocido"}`
      );
      return;
    }

    // Parse the reading value
    const endReading = parseFloat(result.text.replace(/[^\d.]/g, ""));
    if (isNaN(endReading)) {
      console.log(`   ⚠️ Could not parse reading: ${result.text}`);
      await whatsapp.sendMessage(
        GROUP_JID,
        `⚠️ No se pudo interpretar la lectura: \`${result.text}\``
      );
      return;
    }

    console.log(`   📊 OCR Result: ${endReading}`);

    // Get current month and previous reading
    const currentMonth = meterReadings.getCurrentMonth();
    const previousReading = meterReadings.getLatestFloorReading(floor);

    // Use previous end_reading as start_reading (or same value if first reading)
    const startReading = previousReading?.endReading ?? endReading;

    // Calculate kWh used this month
    const kwhUsed = Math.max(0, endReading - startReading);

    // Save to database (upsert - will overwrite if same month)
    meterReadings.upsertReading(currentMonth, floor, startReading, endReading);
    console.log(
      `   💾 Saved: ${currentMonth} Piso ${floor}: ${startReading} → ${endReading}`
    );

    // Format month name
    const [monthNum, year] = currentMonth.split("/");
    const monthNames = [
      "Enero",
      "Febrero",
      "Marzo",
      "Abril",
      "Mayo",
      "Junio",
      "Julio",
      "Agosto",
      "Septiembre",
      "Octubre",
      "Noviembre",
      "Diciembre",
    ];
    const monthName = monthNames[parseInt(monthNum!, 10) - 1];

    // Send confirmation
    await whatsapp.sendMessage(
      GROUP_JID,
      `✅ *Lectura registrada ${monthName} ${year}*\n` +
        `   Piso ${floor}: \`${endReading}\`\n` +
        `   Consumo: *${kwhUsed.toFixed(1)} kWh*`
    );
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

// Send meter reading reminder mentioning all assigned users
async function sendMeterReminder() {
  console.log("\n📢 Sending meter reading reminder...");

  const assignments = floorAssignments.getAllAssignments();

  if (assignments.length === 0) {
    console.log("   ⚠️ No floor assignments found");
    return;
  }

  // Build mentions JIDs (format: phone@lid for group mentions)
  const mentionJids = assignments.map((a) => `${a.phone}@lid`);

  // Build floor list with @ mentions in text
  const floorList = assignments
    .map((a) => `   • Piso ${a.floor}: @${a.phone}`)
    .join("\n");

  await whatsapp.sendMessage(
    GROUP_JID,
    `📸 *¡Hora de registrar las lecturas del medidor!*\n\n` +
      `${floorList}\n\n` +
      `Por favor, envíen una foto de su medidor eléctrico.\n` +
      `El registro es automático 🤖`,
    mentionJids
  );

  console.log("✅ Reminder sent!");
}

// Track if we already sent reminder today
let lastReminderDate: string | null = null;

// Check if we should send scheduled report or reminder
function checkScheduledTasks() {
  const now = new Date();
  const today = now.toDateString();

  // Check for meter reminder (day 20 at 9:00)
  if (
    now.getDate() === REMINDER_DAY &&
    now.getHours() === SCHEDULE_HOUR &&
    lastReminderDate !== today
  ) {
    lastReminderDate = today;
    sendMeterReminder();
  }

  // Don't send report if already sent today
  if (lastSentDate === today) return;

  // Check if it's the right day and hour for report
  if (now.getDate() === SCHEDULE_DAY && now.getHours() === SCHEDULE_HOUR) {
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
    `🔑 Triggers: "${TRIGGER_KEYWORD}", "${TRIGGER_PAYMENTS}", "${TRIGGER_PISO}", "${TRIGGER_REMINDER}"`
  );
  console.log(`📅 Report: Day ${SCHEDULE_DAY} | Reminder: Day ${REMINDER_DAY}`);
  console.log(`📷 Images from assigned users → auto-register meter reading`);

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
    } else if (text === TRIGGER_REMINDER.toLowerCase()) {
      await sendMeterReminder();
    }

    // Handle image from assigned users (auto-register, no keyword needed)
    if (message.hasImage && message.imageBuffer) {
      const floor = floorAssignments.getFloorByPhone(message.sender);
      if (floor) {
        await processMeterImage(
          message.imageBuffer,
          message.imageMimeType || "image/jpeg",
          floor
        );
      }
      // If not assigned to a floor, silently ignore the image
    }
  });

  // Start scheduler (check every minute)
  setInterval(checkScheduledTasks, 60 * 1000);
  console.log("\n⏳ Bot running... (Ctrl+C to exit)");
  console.log(
    `   Report: Day ${SCHEDULE_DAY} | Reminder: Day ${REMINDER_DAY}\n`
  );

  // Keep alive
  await new Promise(() => {});
}

main();
