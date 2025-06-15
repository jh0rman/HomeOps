import { sedapal } from "../sedapal";
import { luzdelsur } from "../luzdelsur";
import { calidda } from "../calidda";
import {
  parseMeterReadingsFromEnv,
  configToMeterReadings,
} from "../../utils/meter-readings";
import type { AggregatedData } from "../../types/homeops";

export async function fetchAllData(): Promise<AggregatedData> {
  console.log("\n📊 Fetching utility data...");

  // Water
  console.log("   🚰 SEDAPAL...");
  await sedapal.login(
    process.env.SEDAPAL_EMAIL!,
    process.env.SEDAPAL_PASSWORD!
  );

  let waterRequests: any[] = [];
  let waterTotal = 0;
  let waterDebt = 0;
  
  const sedapalSupplyNum = sedapal.getSupplyNumber() || 0;

  if (sedapal.isAuthenticated()) {
    const waterInvoices = (await sedapal.getInvoices()).bRESP || [];
    waterTotal = waterInvoices.reduce((acc, inv) => acc + inv.total_fact, 0);
    waterDebt = waterTotal;

    waterRequests = waterInvoices.map((inv) => ({
      supply: sedapalSupplyNum,
      amount: inv.total_fact,
      expiry: inv.vencimiento || "",
    }));
  }

  // Electricity
  console.log("   💡 Luz del Sur...");
  await luzdelsur.login(
    process.env.LUZDELSUR_EMAIL!,
    process.env.LUZDELSUR_PASSWORD!
  );

  let elecDebt = 0;
  let elecRequests: any[] = [];
  let elecData = {
    consumoEnergia: 0,
    igv: 0,
    otrosConceptos: 0,
    noAfectoIGV: 0,
    ultimaFacturacion: "",
    totalPagar: 0,
    fechaVencimiento: "",
    saldoPendiente: 0,
    ultimoPago: 0,
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
        amount: Math.max(0, actualDebt),
        expiry: elecData.fechaVencimiento || "N/A",
        status,
      });
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

  let gasRequests: any[] = [];
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

      const cleanCode = String(parseInt(acc.clientCode, 10));

      if (amount > 0) {
        gasDebt += amount;
      }

      gasRequests.push({
        code: cleanCode,
        amount,
        expiry: expiry.split("T")[0] || "",
        status: amount > 0 ? "PENDIENTE" : "PAGADO",
      });
    }
  }

  // Meter readings
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

  const grandTotal = waterTotal + totalElec + totalGas;
  const totalDebt = waterDebt + elecDebt + gasDebt;

  return {
    water: {
      total: waterTotal,
      invoices: waterRequests,
      supplyNum: sedapalSupplyNum,
    },
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
    totalDebt,
  };
}
