/**
 * Fetch all utility invoices and send email report
 */

import { Resend } from "resend";
import { render } from "@react-email/components";
import { sedapal } from "../services/sedapal";
import { luzdelsur } from "../services/luzdelsur";
import { calidda } from "../services/calidda";
import {
  MonthlyReportEmail,
  type MonthlyReportProps,
} from "../emails/MonthlyReport";
import {
  parseMeterReadingsFromEnv,
  configToMeterReadings,
  validateMeterReadingsFreshness,
} from "../utils/meter-readings";
import {
  calculateElectricityDistribution,
  extractBillFromApiResponse,
} from "../utils/electricity-calculator";

const resend = new Resend(process.env.RESEND_API_KEY);

async function fetchWaterData(): Promise<MonthlyReportProps["data"]["water"]> {
  console.log("\n🚰 Fetching SEDAPAL data...");

  const email = process.env.SEDAPAL_EMAIL!;
  const password = process.env.SEDAPAL_PASSWORD!;

  await sedapal.login(email, password);

  if (!sedapal.isAuthenticated()) {
    console.log("   ⚠️ SEDAPAL login failed");
    return { invoices: [] };
  }

  const invoicesResponse = await sedapal.getInvoices();
  console.log("   ✅ SEDAPAL data fetched");

  return {
    invoices: (invoicesResponse.bRESP ||
      []) as MonthlyReportProps["data"]["water"]["invoices"],
  };
}

async function fetchElectricityData(): Promise<{
  invoices: MonthlyReportProps["data"]["electricity"]["invoices"];
  fullApiInvoices: Array<{
    consumoEnergia: number;
    otrosConceptos: number;
    igv: number;
    totalPagar: number;
    ultimaFacturacion: string;
  }>;
}> {
  console.log("\n💡 Fetching Luz del Sur data...");

  const email = process.env.LUZDELSUR_EMAIL!;
  const password = process.env.LUZDELSUR_PASSWORD!;

  await luzdelsur.login(email, password);

  if (!luzdelsur.isAuthenticated()) {
    console.log("   ⚠️ Luz del Sur login failed");
    return { invoices: [], fullApiInvoices: [] };
  }

  const suppliesResponse = await luzdelsur.getSupplies();
  const supplies = suppliesResponse.datos?.suministros || [];

  // Fetch latest invoice for each supply
  const invoices: MonthlyReportProps["data"]["electricity"]["invoices"] = [];
  const fullApiInvoices: Array<{
    consumoEnergia: number;
    otrosConceptos: number;
    igv: number;
    totalPagar: number;
    ultimaFacturacion: string;
  }> = [];

  for (const supply of supplies) {
    const invoiceResponse = await luzdelsur.getLatestInvoice(
      String(supply.suministro)
    );

    if (invoiceResponse.datos) {
      fullApiInvoices.push(
        invoiceResponse.datos as (typeof fullApiInvoices)[0]
      );
    }

    invoices.push({
      supply: {
        suministro: supply.suministro,
      },
      invoice:
        invoiceResponse.datos as MonthlyReportProps["data"]["electricity"]["invoices"][0]["invoice"],
    });
  }

  console.log("   ✅ Luz del Sur data fetched");

  return {
    invoices,
    fullApiInvoices,
  };
}

async function fetchGasData(): Promise<MonthlyReportProps["data"]["gas"]> {
  console.log("\n🔥 Fetching Cálidda data...");

  const email = process.env.CALIDDA_EMAIL!;
  const password = process.env.CALIDDA_PASSWORD!;

  await calidda.login(email, password);

  if (!calidda.isAuthenticated()) {
    console.log("   ⚠️ Cálidda login failed");
    return { data: [] };
  }

  const accountsResponse = await calidda.getAccounts();
  const accounts = accountsResponse.data || [];

  // Fetch basic data and statement for each account
  const data: MonthlyReportProps["data"]["gas"]["data"] = [];
  for (const account of accounts) {
    const [basicDataResponse, statementResponse] = await Promise.all([
      calidda.getBasicData(account.clientCode),
      calidda.getAccountStatement(account.clientCode),
    ]);

    data.push({
      account: {
        clientCode: account.clientCode,
      },
      basicData: basicDataResponse.data
        ? {
            supplyAddress: {
              houseFloorNumber:
                basicDataResponse.data.supplyAddress?.houseFloorNumber || "-",
            },
          }
        : null,
      statement:
        statementResponse.data as MonthlyReportProps["data"]["gas"]["data"][0]["statement"],
    });
  }

  console.log("   ✅ Cálidda data fetched");

  return {
    data,
  };
}

async function main() {
  console.log("📊 HomeOps Invoice Report\n");
  console.log("=".repeat(50));

  // Validate required env vars
  const requiredEnvVars = [
    "RESEND_API_KEY",
    "EMAIL_TO",
    "SEDAPAL_EMAIL",
    "SEDAPAL_PASSWORD",
    "LUZDELSUR_EMAIL",
    "LUZDELSUR_PASSWORD",
    "CALIDDA_EMAIL",
    "CALIDDA_PASSWORD",
  ];

  for (const envVar of requiredEnvVars) {
    if (!process.env[envVar]) {
      console.error(`❌ Missing required environment variable: ${envVar}`);
      process.exit(1);
    }
  }

  // Parse meter readings from environment
  const meterConfig = parseMeterReadingsFromEnv();
  if (!meterConfig) {
    console.error("❌ Missing or invalid METER_READINGS variable");
    console.error(
      '   Format: {"month":"12/2025","floor1":{"start":1304.3,"end":1400},...}'
    );
    process.exit(1);
  }

  try {
    // Fetch all data
    const water = await fetchWaterData();
    const electricity = await fetchElectricityData();
    const gas = await fetchGasData();

    // Validate meter readings freshness against billing period
    const billingPeriod = electricity.invoices[0]?.invoice?.ultimaFacturacion;
    if (billingPeriod) {
      const freshnessCheck = validateMeterReadingsFreshness(
        meterConfig.month,
        billingPeriod
      );

      if (!freshnessCheck.isValid) {
        console.error(`❌ ${freshnessCheck.message}`);
        process.exit(1);
      }
      console.log(`\n✅ ${freshnessCheck.message}`);
    }

    // Calculate electricity distribution per floor
    if (electricity.fullApiInvoices.length > 0) {
      const apiInvoice = electricity.fullApiInvoices[0]!;
      const billData = extractBillFromApiResponse(apiInvoice);
      const meterReadings = configToMeterReadings(meterConfig);
      const distribution = calculateElectricityDistribution(
        billData,
        meterReadings
      );

      console.log("\n⚡ Electricity distribution calculated");
      console.log(
        `   Total from meters: ${distribution.meterTotal.toFixed(1)} kWh`
      );
      distribution.floors.forEach((floor) => {
        console.log(
          `   Floor ${floor.floor}: ${floor.consumption.toFixed(1)} kWh (${(floor.percentage * 100).toFixed(1)}%)`
        );
      });
    }

    const reportData: MonthlyReportProps["data"] = { water, electricity, gas };

    // Render email HTML
    const emailHtml = await render(MonthlyReportEmail({ data: reportData }));

    // Send email
    console.log("\n📧 Sending email report...");

    const to = process.env.EMAIL_TO!;
    const from = process.env.EMAIL_FROM || "HomeOps <onboarding@resend.dev>";

    const { data, error } = await resend.emails.send({
      from,
      to: [to],
      subject: "HomeOps - Resumen de Facturación",
      html: emailHtml,
    });

    if (error) {
      console.error("❌ Error sending email:", error);
      process.exit(1);
    }

    console.log("✅ Email sent successfully!");
    console.log("📋 Email ID:", data?.id);
  } catch (error) {
    console.error("❌ Error:", error);
    process.exit(1);
  }
}

main();
