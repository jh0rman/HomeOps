/**
 * Email sending script using Resend
 */

import { Resend } from "resend";

const resend = new Resend(process.env.RESEND_API_KEY);

async function main() {
  console.log("📧 Sending email...\n");

  const to = process.env.EMAIL_TO;
  const from = process.env.EMAIL_FROM || "HomeOps <onboarding@resend.dev>";

  if (!to) {
    console.error("❌ Please set EMAIL_TO environment variable");
    process.exit(1);
  }

  if (!process.env.RESEND_API_KEY) {
    console.error("❌ Please set RESEND_API_KEY environment variable");
    process.exit(1);
  }

  try {
    const { data, error } = await resend.emails.send({
      from,
      to: [to],
      subject: "Hello from HomeOps!",
      html: "<h1>Hello World!</h1><p>This is a test email from HomeOps.</p>",
    });

    if (error) {
      console.error("❌ Error sending email:", error);
      process.exit(1);
    }

    console.log("✅ Email sent successfully!");
    console.log("📋 Response:", JSON.stringify(data, null, 2));
  } catch (error) {
    console.error("❌ Error:", error);
    process.exit(1);
  }
}

main();
