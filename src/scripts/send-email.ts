/**
 * Fetch all utility invoices and send email report
 */

import { Resend } from "resend";
import { sedapal } from "../services/sedapal";
import { luzdelsur } from "../services/luzdelsur";
import { calidda } from "../services/calidda";

const resend = new Resend(process.env.RESEND_API_KEY);

interface InvoiceReport {
  water: {
    invoices: unknown[];
  };
  electricity: {
    supplies: unknown[];
    invoices: unknown[];
  };
  gas: {
    accounts: unknown[];
    data: unknown[];
  };
}

async function fetchWaterData(): Promise<InvoiceReport["water"]> {
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
    invoices: invoicesResponse.bRESP || [],
  };
}

async function fetchElectricityData(): Promise<InvoiceReport["electricity"]> {
  console.log("\n💡 Fetching Luz del Sur data...");

  const email = process.env.LUZDELSUR_EMAIL!;
  const password = process.env.LUZDELSUR_PASSWORD!;

  await luzdelsur.login(email, password);

  if (!luzdelsur.isAuthenticated()) {
    console.log("   ⚠️ Luz del Sur login failed");
    return { supplies: [], invoices: [] };
  }

  const suppliesResponse = await luzdelsur.getSupplies();
  const supplies = suppliesResponse.datos?.suministros || [];

  // Fetch latest invoice for each supply
  const invoices: unknown[] = [];
  for (const supply of supplies) {
    const invoiceResponse = await luzdelsur.getLatestInvoice(
      String(supply.suministro)
    );
    invoices.push({
      supply,
      invoice: invoiceResponse.datos,
    });
  }

  console.log("   ✅ Luz del Sur data fetched");

  return {
    supplies,
    invoices,
  };
}

async function fetchGasData(): Promise<InvoiceReport["gas"]> {
  console.log("\n🔥 Fetching Cálidda data...");

  const email = process.env.CALIDDA_EMAIL!;
  const password = process.env.CALIDDA_PASSWORD!;

  await calidda.login(email, password);

  if (!calidda.isAuthenticated()) {
    console.log("   ⚠️ Cálidda login failed");
    return { accounts: [], data: [] };
  }

  const accountsResponse = await calidda.getAccounts();
  const accounts = accountsResponse.data || [];

  // Fetch basic data and statement for each account
  const data: unknown[] = [];
  for (const account of accounts) {
    const [basicDataResponse, statementResponse] = await Promise.all([
      calidda.getBasicData(account.clientCode),
      calidda.getAccountStatement(account.clientCode),
    ]);

    data.push({
      account,
      basicData: basicDataResponse.data,
      statement: statementResponse.data,
    });
  }

  console.log("   ✅ Cálidda data fetched");

  return {
    accounts,
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

  try {
    // Fetch all data
    const water = await fetchWaterData();
    const electricity = await fetchElectricityData();
    const gas = await fetchGasData();

    const report: InvoiceReport = { water, electricity, gas };

    // Send email
    console.log("\n📧 Sending email report...");

    const to = process.env.EMAIL_TO!;
    const from = process.env.EMAIL_FROM || "HomeOps <onboarding@resend.dev>";

    const { data, error } = await resend.emails.send({
      from,
      to: [to],
      subject: "HomeOps - Invoice Report",
      html: `
        <h1>HomeOps Invoice Report</h1>
        <p>This is your utility bills summary.</p>
        <pre>${JSON.stringify(report, null, 2)}</pre>
      `,
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
