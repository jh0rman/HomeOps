/**
 * WhatsApp Report Bot
 * Sends utility report when triggered by keyword in group
 */

import { whatsapp } from "../services/whatsapp";
import { sedapal } from "../services/sedapal";
import { luzdelsur } from "../services/luzdelsur";
import { calidda } from "../services/calidda";
import {
  parseMeterReadingsFromEnv,
  configToMeterReadings,
} from "../utils/meter-readings";

// Configuration
const GROUP_JID = process.env.GROUP_JID || "";
const TRIGGER_KEYWORD = process.env.TRIGGER_KEYWORD || "!reporte";
const TRIGGER_PAYMENTS = "!pagos";
const SCHEDULE_DAY = parseInt(process.env.SCHEDULE_DAY || "26", 10);
const SCHEDULE_HOUR = parseInt(process.env.SCHEDULE_HOUR || "9", 10);

// Format currency
const currency = (amount: number) => `S/ ${amount.toFixed(2)}`;

// Fetch all utility data with detailed invoice info
async function fetchAllData() {
  console.log("\n📊 Fetching utility data...");

  // Water
  console.log("   🚰 SEDAPAL...");
  await sedapal.login(
    process.env.SEDAPAL_EMAIL!,
    process.env.SEDAPAL_PASSWORD!
  );
  
  let waterRequests: { supply: number; amount: number; expiry: string }[] = [];
  let waterTotal = 0;
  let waterDebt = 0; // Debt for payments report
  
  // Always try to get supply number from session
  const sedapalSupplyNum = sedapal.getSupplyNumber() || 0;

  if (sedapal.isAuthenticated()) {
    const waterInvoices = (await sedapal.getInvoices()).bRESP || [];
    waterTotal = waterInvoices.reduce((acc, inv) => acc + inv.total_fact, 0);
    
    // Only pending invoices count as debt (assuming API returns unpaid)
    waterDebt = waterTotal;

    // Map to a cleaner structure
    waterRequests = waterInvoices.map(inv => ({
      supply: sedapalSupplyNum, 
      amount: inv.total_fact, 
      expiry: inv.vencimiento || ""
    }));
  }

  // Electricity
  console.log("   💡 Luz del Sur...");
  await luzdelsur.login(
    process.env.LUZDELSUR_EMAIL!,
    process.env.LUZDELSUR_PASSWORD!
  );
  
  let elecDebt = 0;
  let elecRequests: { supply: number; amount: number; expiry: string; status: string }[] = [];
  let elecData = {
    consumoEnergia: 0,
    igv: 0,
    otrosConceptos: 0,
    noAfectoIGV: 0,
    ultimaFacturacion: "",
    totalPagar: 0,
    fechaVencimiento: "",
    saldoPendiente: 0,
    ultimoPago: 0
  };

  if (luzdelsur.isAuthenticated()) {
    const supplies = (await luzdelsur.getSupplies()).datos?.suministros || [];
    if (supplies.length > 0) {
      const supplyNum = supplies[0]!.suministro;
      const invoice = await luzdelsur.getLatestInvoice(String(supplyNum));
      elecData = invoice.datos as any; 
      
      const actualDebt = elecData.saldoPendiente;
      const status = actualDebt > 0.5 ? "PENDIENTE" : "PAGADO";
      
      if (status === "PENDIENTE") {
          elecDebt = actualDebt;
      }
      
      elecRequests.push({
        supply: supplyNum,
        amount: Math.max(0, actualDebt), // Show 0 if negative
        expiry: elecData.fechaVencimiento || "N/A",
        status
      });
    }
  }
  
  // For the regular report electricity total components
  const totalElec =
    elecData.consumoEnergia +
    elecData.igv +
    elecData.otrosConceptos +
    (elecData.noAfectoIGV || 0);

  // Gas
  console.log("   🔥 Cálidda...");
  await calidda.login(
    process.env.CALIDDA_EMAIL!,
    process.env.CALIDDA_PASSWORD!
  );
  
  let gasRequests: { code: string; amount: number; expiry: string; status: string }[] = [];
  const gasData: { floor: string; amount: number }[] = [];
  let totalGas = 0;
  let gasDebt = 0;
  
  if (calidda.isAuthenticated()) {
    const accounts = (await calidda.getAccounts()).data || [];
    for (const acc of accounts) {
      const [basic, statement] = await Promise.all([
        calidda.getBasicData(acc.clientCode),
        calidda.getAccountStatement(acc.clientCode),
      ]);
      const floor = basic.data?.supplyAddress?.houseFloorNumber || "?";
      const amount = statement.data?.totalDebt || 0;
      const expiry = statement.data?.lastBillDueDate || "";
      
      gasData.push({ floor, amount });
      totalGas += amount;
      
      // Clean client code (remove leading zeros)
      const cleanCode = String(parseInt(acc.clientCode, 10));

      if (amount > 0) {
          gasDebt += amount;
      }
      
      gasRequests.push({
        code: cleanCode,
        amount,
        expiry: (expiry.split("T")[0] || ""),
        status: amount > 0 ? "PENDIENTE" : "PAGADO"
      });
    }
  }

  // Meter readings for electricity distribution
  const meterConfig = parseMeterReadingsFromEnv();
  let floorBreakdown: { floor: number; kwh: number; total: number }[] = [];

  if (meterConfig) {
    const readings = configToMeterReadings(meterConfig);
    const totalKwh = readings.reduce(
      (acc, r) => acc + (r.endReading - r.startReading),
      0
    );
    const billOthers = elecData.otrosConceptos + (elecData.noAfectoIGV || 0);

    floorBreakdown = readings.map((r) => {
      const kwh = r.endReading - r.startReading;
      const share = totalKwh > 0 ? kwh / totalKwh : 0;
      const elecEnergy = elecData.consumoEnergia * share;
      const elecIgv = elecData.igv * share;
      const elecOthers = billOthers / 3;
      const elecTotal = elecEnergy + elecIgv + elecOthers;
      const waterShare = waterTotal / 3;
      const gasFloor = gasData.find((g) => g.floor === r.floor.toString());
      const gasAmount = gasFloor?.amount || 0;

      return {
        floor: r.floor,
        kwh,
        total: elecTotal + waterShare + gasAmount,
      };
    });
  }

  const grandTotal = waterTotal + totalElec + totalGas; // Invoice totals
  const totalDebt = waterDebt + elecDebt + gasDebt;   // Actual debt to pay

  return {
    water: { total: waterTotal, invoices: waterRequests, supplyNum: sedapalSupplyNum }, // Pass supplyNum
    electricity: {
      total: totalElec,
      period: elecData.ultimaFacturacion,
      invoices: elecRequests,
      breakdown: {
        energia: elecData.consumoEnergia,
        igv: elecData.igv,
        otros: elecData.otrosConceptos + (elecData.noAfectoIGV || 0),
      },
    },
    gas: { total: totalGas, floors: gasData, invoices: gasRequests },
    floors: floorBreakdown,
    grandTotal,
    totalDebt
  };
}

// Format report for WhatsApp
function formatReport(data: Awaited<ReturnType<typeof fetchAllData>>): string {
  const lines: string[] = [];

  lines.push("📊 *HOMEOPS REPORTE*");
  lines.push("━━━━━━━━━━━━━━━━━━━━");
  lines.push("");
  lines.push(`💰 *TOTAL: ${currency(data.grandTotal)}*`);
  lines.push("");

  // Per floor breakdown
  if (data.floors.length > 0) {
    lines.push("🏠 *DISTRIBUCIÓN POR PISO*");
    lines.push("");
    for (const floor of data.floors) {
      lines.push(`   *Piso ${floor.floor}:* ${currency(floor.total)}`);
      lines.push(`   └ ${floor.kwh.toFixed(1)} kWh consumo`);
    }
    lines.push("");
  }

  // Services breakdown
  lines.push("📋 *DETALLE DE SERVICIOS*");
  lines.push("");

  lines.push(`⚡ *Luz:* ${currency(data.electricity.total)}`);
  if (data.electricity.period) {
    lines.push(`   └ ${data.electricity.period}`);
  }

  lines.push(`💧 *Agua:* ${currency(data.water.total)}`);
  lines.push(`   └ ${currency(data.water.total / 3)} c/piso`);

  lines.push(`🔥 *Gas:* ${currency(data.gas.total)}`);
  for (const g of data.gas.floors) {
    lines.push(`   └ Piso ${g.floor}: ${currency(g.amount)}`);
  }

  lines.push("");
  lines.push("━━━━━━━━━━━━━━━━━━━━");
  lines.push(`_Generado: ${new Date().toLocaleString("es-PE")}_`);

  return lines.join("\n");
}

// Format payments summary for WhatsApp
function formatPayments(data: Awaited<ReturnType<typeof fetchAllData>>): string {
  const lines: string[] = [];

  lines.push("💸 *RESUMEN DE PAGOS*");
  lines.push("━━━━━━━━━━━━━━━━━━━━");
  lines.push("");

  // Electricity
  if (data.electricity.invoices.length > 0) {
    lines.push("⚡ *Luz del Sur:*");
    for (const inv of data.electricity.invoices) {
      lines.push(`   Sum: ${inv.supply}`);
      if (inv.status === "PAGADO") {
          lines.push(`   Estado: *✅ PAGADO*`);
      } else {
          lines.push(`   Monto: *${currency(inv.amount)}*`);
          lines.push(`   Vence: ${inv.expiry}`);
      }
      lines.push("");
    }
  }

  // Water
  lines.push("💧 *SEDAPAL:*");
  if (data.water.invoices.length > 0) {
    for (const inv of data.water.invoices) {
      lines.push(`   NIS: ${inv.supply}`);
      lines.push(`   Monto: *${currency(inv.amount)}*`);
      lines.push(`   Vence: ${inv.expiry}`);
      lines.push("");
    }
  } else {
      lines.push(`   NIS: ${data.water.supplyNum}`);
      lines.push(`   Estado: *✅ PAGADO*`);
      lines.push(""); 
  }

  // Gas
  if (data.gas.invoices.length > 0) {
    lines.push("🔥 *Cálidda:*");
    for (const inv of data.gas.invoices) {
      lines.push(`   Cliente: ${inv.code}`);
      if (inv.status === "PAGADO") {
          lines.push(`   Estado: *✅ PAGADO*`);
      } else {
          lines.push(`   Monto: *${currency(inv.amount)}*`);
          lines.push(`   Vence: ${inv.expiry}`);
      }
      lines.push("");
    }
  }

  lines.push("━━━━━━━━━━━━━━━━━━━━");
  lines.push(`_Total deuda: ${currency(data.totalDebt)}_`);

  return lines.join("\n");
}

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

// Check if we should send scheduled report
function checkScheduledReport() {
  const now = new Date();
  const today = now.toDateString();

  // Don't send if already sent today
  if (lastSentDate === today) return;

  // Check if it's the right day and hour
  if (now.getDate() === SCHEDULE_DAY && now.getHours() === SCHEDULE_HOUR) {
    sendReport(`Scheduled report (day ${SCHEDULE_DAY} at ${SCHEDULE_HOUR}:00)`);
  }
}

async function main() {
  console.log("🤖 WhatsApp Report Bot\n");
  console.log("=".repeat(50));

  // Validate environment
  const required = [
    "SEDAPAL_EMAIL",
    "SEDAPAL_PASSWORD",
    "LUZDELSUR_EMAIL",
    "LUZDELSUR_PASSWORD",
    "CALIDDA_EMAIL",
    "CALIDDA_PASSWORD",
  ];
  for (const env of required) {
    if (!process.env[env]) {
      console.error(`❌ Missing: ${env}`);
      process.exit(1);
    }
  }

  if (!GROUP_JID) {
    console.error("❌ Missing GROUP_JID");
    process.exit(1);
  }

  console.log(`📌 Group: ${GROUP_JID}`);
  console.log(`🔑 Trigger 1: "${TRIGGER_KEYWORD}"`);
  console.log(`🔑 Trigger 2: "${TRIGGER_PAYMENTS}"`);
  console.log(`📅 Schedule: Day ${SCHEDULE_DAY} at ${SCHEDULE_HOUR}:00`);

  // Connect to WhatsApp
  console.log("\n🔄 Connecting to WhatsApp...");
  const sock = await whatsapp.connect();
  await whatsapp.waitForConnection(sock);

  // Listen for trigger keyword
  whatsapp.listenToGroup(GROUP_JID, async (message) => {
    const text = message.text.toLowerCase().trim();

    if (text === TRIGGER_KEYWORD.toLowerCase()) {
      await sendReport("Keyword trigger detected!");
    } else if (text === TRIGGER_PAYMENTS.toLowerCase()) {
      await sendPayments("Payments trigger detected!");
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
