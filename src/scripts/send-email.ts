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

const resend = new Resend(process.env.RESEND_API_KEY);

async function fetchWaterData(): Promise<MonthlyReportProps["data"]["water"]> {
  console.log("\n🚰 Fetching SEDAPAL data...");

  const email = process.env.SEDAPAL_EMAIL!;
  const password = process.env.SEDAPAL_PASSWORD!;

  await sedapal.login(email, password);

  if (!sedapal.isAuthenticated()) {
    console.log("   ⚠️ SEDAPAL login failed");
    return { invoices: [], supplyNumber: 0 };
  }

  const supplyNumber = sedapal.getSupplyNumber() || 0;
  const invoicesResponse = await sedapal.getInvoices();
  console.log("   ✅ SEDAPAL data fetched");

  return {
    invoices: (invoicesResponse.bRESP ||
      []) as MonthlyReportProps["data"]["water"]["invoices"],
    supplyNumber,
  };
}

async function fetchElectricityData(
  subMeters: MonthlyReportProps["data"]["electricity"]["subMeters"]
): Promise<MonthlyReportProps["data"]["electricity"]> {
  console.log("\n💡 Fetching Luz del Sur data...");

  const email = process.env.LUZDELSUR_EMAIL!;
  const password = process.env.LUZDELSUR_PASSWORD!;

  await luzdelsur.login(email, password);

  if (!luzdelsur.isAuthenticated()) {
    console.log("   ⚠️ Luz del Sur login failed");
    return { invoices: [], subMeters };
  }

  const suppliesResponse = await luzdelsur.getSupplies();
  const supplies = suppliesResponse.datos?.suministros || [];

  const invoices: MonthlyReportProps["data"]["electricity"]["invoices"] = [];

  for (const supply of supplies) {
    const invoiceResponse = await luzdelsur.getLatestInvoice(
      String(supply.suministro)
    );

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
    subMeters,
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

  // Convert meter readings to subMeters format for email template
  const meterReadings = configToMeterReadings(meterConfig);
  const subMeters: MonthlyReportProps["data"]["electricity"]["subMeters"] =
    meterReadings.map((m) => ({
      floor: m.floor,
      startReading: m.startReading,
      endReading: m.endReading,
    }));

  try {
    // Fetch all data
    const water = await fetchWaterData();
    const electricity = await fetchElectricityData(subMeters);
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

    const reportData: MonthlyReportProps["data"] = { water, electricity, gas };

    // Render email HTML
    const emailHtml = await render(MonthlyReportEmail({ data: reportData }));

    // Send email
    console.log("\n📧 Sending email report...");

    // Support multiple recipients (comma-separated)
    const to = process.env.EMAIL_TO!.split(",").map((e) => e.trim());
    const from = process.env.EMAIL_FROM || "HomeOps <onboarding@resend.dev>";

    const { data, error } = await resend.emails.send({
      from,
      to,
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
