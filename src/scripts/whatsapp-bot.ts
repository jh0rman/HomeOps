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

// Format currency
const currency = (amount: number) => `S/ ${amount.toFixed(2)}`;

// Fetch all utility data
async function fetchAllData() {
  console.log("\n📊 Fetching utility data...");

  // Water
  console.log("   🚰 SEDAPAL...");
  await sedapal.login(
    process.env.SEDAPAL_EMAIL!,
    process.env.SEDAPAL_PASSWORD!
  );
  const waterInvoices = sedapal.isAuthenticated()
    ? (await sedapal.getInvoices()).bRESP || []
    : [];
  const totalWater = waterInvoices.reduce(
    (acc, inv) => acc + inv.total_fact,
    0
  );

  // Electricity
  console.log("   💡 Luz del Sur...");
  await luzdelsur.login(
    process.env.LUZDELSUR_EMAIL!,
    process.env.LUZDELSUR_PASSWORD!
  );
  let elecData = {
    consumoEnergia: 0,
    igv: 0,
    otrosConceptos: 0,
    noAfectoIGV: 0,
    ultimaFacturacion: "",
  };
  if (luzdelsur.isAuthenticated()) {
    const supplies = (await luzdelsur.getSupplies()).datos?.suministros || [];
    if (supplies.length > 0) {
      const invoice = await luzdelsur.getLatestInvoice(
        String(supplies[0]!.suministro)
      );
      elecData = invoice.datos as typeof elecData;
    }
  }
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
  const gasData: { floor: string; amount: number }[] = [];
  let totalGas = 0;
  if (calidda.isAuthenticated()) {
    const accounts = (await calidda.getAccounts()).data || [];
    for (const acc of accounts) {
      const [basic, statement] = await Promise.all([
        calidda.getBasicData(acc.clientCode),
        calidda.getAccountStatement(acc.clientCode),
      ]);
      const floor = basic.data?.supplyAddress?.houseFloorNumber || "?";
      const amount = statement.data?.totalDebt || 0;
      gasData.push({ floor, amount });
      totalGas += amount;
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
      const waterShare = totalWater / 3;
      const gasFloor = gasData.find((g) => g.floor === r.floor.toString());
      const gasAmount = gasFloor?.amount || 0;

      return {
        floor: r.floor,
        kwh,
        total: elecTotal + waterShare + gasAmount,
      };
    });
  }

  const grandTotal = totalWater + totalElec + totalGas;

  return {
    water: { total: totalWater },
    electricity: {
      total: totalElec,
      period: elecData.ultimaFacturacion,
      breakdown: {
        energia: elecData.consumoEnergia,
        igv: elecData.igv,
        otros: elecData.otrosConceptos + (elecData.noAfectoIGV || 0),
      },
    },
    gas: { total: totalGas, floors: gasData },
    floors: floorBreakdown,
    grandTotal,
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
  console.log(`🔑 Trigger: "${TRIGGER_KEYWORD}"`);

  // Connect to WhatsApp
  console.log("\n🔄 Connecting to WhatsApp...");
  const sock = await whatsapp.connect();
  await whatsapp.waitForConnection(sock);

  // Listen for trigger keyword
  whatsapp.listenToGroup(GROUP_JID, async (message) => {
    const text = message.text.toLowerCase().trim();

    if (text === TRIGGER_KEYWORD.toLowerCase()) {
      console.log("\n🚀 Trigger detected! Generating report...");

      try {
        const data = await fetchAllData();
        const report = formatReport(data);

        console.log("\n📤 Sending report to group...");
        await whatsapp.sendMessage(GROUP_JID, report);
        console.log("✅ Report sent!");
      } catch (error) {
        console.error("❌ Error generating report:", error);
        await whatsapp.sendMessage(
          GROUP_JID,
          "❌ Error al generar el reporte. Intenta de nuevo."
        );
      }
    }
  });

  console.log("\n⏳ Bot running... (Ctrl+C to exit)\n");

  // Keep alive
  await new Promise(() => {});
}

main();
