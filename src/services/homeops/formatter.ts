import type { AggregatedData } from "../../types/homeops";

// Format currency
export const currency = (amount: number) => `S/ ${amount.toFixed(2)}`;

// Format report for WhatsApp
export function formatReport(data: AggregatedData): string {
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
export function formatPayments(data: AggregatedData): string {
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
