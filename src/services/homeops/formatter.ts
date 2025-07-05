import type { AggregatedData } from "../../types/homeops";

// Format currency
export const currency = (amount: number) => `\`S/ ${amount.toFixed(2)}\``;

// Format report for WhatsApp
export function formatReport(data: AggregatedData): string {
  const lines: string[] = [];

  lines.push("📊 *HOMEOPS REPORTE*");
  lines.push("━━━━━━━━━━━━━━");
  lines.push("");
  lines.push(`💰 *TOTAL: ${currency(data.grandTotal)}*`);
  lines.push("");

  // Per floor breakdown
  if (data.floors.length > 0) {
    lines.push("🏠 *TOTAL POR PISO*");
    lines.push("");
    for (const floor of data.floors) {
      lines.push(`   *Piso ${floor.floor}* ➔ ${currency(floor.total)}`);
    }
    lines.push("");
  }

  // Services breakdown
  lines.push("📋 *DETALLE DE SERVICIOS*");
  lines.push("");

  lines.push(`⚡ *Luz:* ${currency(data.electricity.total)}`);
  if (data.floors.length > 0) {
    for (const f of data.floors) {
      lines.push(
        `   ╰ Piso ${f.floor}: ${f.kwh.toFixed(1)} kWh ➔ ${currency(f.elecTotal)}`,
      );
    }
  }

  lines.push("");

  lines.push(`💧 *Agua:* ${currency(data.water.total)}`);
  if (data.floors.length > 0) {
    for (const f of data.floors) {
      lines.push(`   ╰ Piso ${f.floor}: ${currency(data.water.total / 3)}`);
    }
  }

  lines.push("");

  lines.push(`🔥 *Gas:* ${currency(data.gas.total)}`);
  for (const g of data.gas.floors) {
    lines.push(`   ╰ Piso ${g.floor}: ${currency(g.amount)}`);
  }

  return lines.join("\n");
}

// Format payments summary for WhatsApp
export function formatPayments(data: AggregatedData): string {
  const lines: string[] = [];

  lines.push("💸 *RESUMEN DE PAGOS*");
  lines.push("━━━━━━━━━━━━━━");
  lines.push("");

  // Electricity
  if (data.electricity.invoices.length > 0) {
    lines.push("⚡ *Luz del Sur:*");
    for (const inv of data.electricity.invoices) {
      lines.push(`   Suministro: \`${inv.supply}\``);
      if (inv.status === "PAGADO") {
        lines.push(`   Estado: *✅ PAGADO*`);
      } else {
        lines.push(`   Monto: ${currency(inv.amount)}`);
        lines.push(`   Vence: ${inv.expiry}`);
      }
      lines.push("");
    }
  }

  // Water
  lines.push("💧 *SEDAPAL:*");
  if (data.water.invoices.length > 0) {
    for (const inv of data.water.invoices) {
      lines.push(`   Suministro: \`${inv.supply}\``);
      lines.push(`   Monto: ${currency(inv.amount)}`);
      lines.push(`   Vence: ${inv.expiry}`);
      lines.push("");
    }
  } else {
    lines.push(`   Suministro: \`${data.water.supplyNum}\``);
    lines.push(`   Estado: *✅ PAGADO*`);
    lines.push("");
  }

  // Gas
  if (data.gas.invoices.length > 0) {
    lines.push("🔥 *Cálidda:*");
    for (const inv of data.gas.invoices) {
      lines.push(`   Cliente: \`${inv.code}\``);
      if (inv.status === "PAGADO") {
        lines.push(`   Estado: *✅ PAGADO*`);
      } else {
        lines.push(`   Monto: ${currency(inv.amount)}`);
        lines.push(`   Vence: ${inv.expiry}`);
      }
      lines.push("");
    }
  }

  lines.push("━━━━━━━━━━━━━━");
  lines.push(`Total deuda: ${currency(data.totalDebt)}`);

  return lines.join("\n");
}
