/**
 * Monthly Report Email Template
 */

import {
  Body,
  Container,
  Head,
  Heading,
  Hr,
  Html,
  Preview,
  Section,
  Text,
} from "@react-email/components";

// --- Interfaces ---
interface WaterInvoice {
  total_fact: number;
  vencimiento: string;
  volumen: number;
  recibo: string;
}

interface ElectricityInvoice {
  supply: {
    suministro: number;
  };
  invoice: {
    totalPagar: number;
    consumoEnergia: number;
    ultimaFacturacion: string;
  };
}

interface GasData {
  account: {
    clientCode: string;
  };
  basicData: {
    supplyAddress: {
      houseFloorNumber: string;
    };
  } | null;
  statement: {
    totalDebt: number;
    lastBillDueDate: string;
  };
}

export interface MonthlyReportProps {
  data: {
    water: { invoices: WaterInvoice[] };
    electricity: { invoices: ElectricityInvoice[] };
    gas: { data: GasData[] };
  };
}

// --- Helpers ---
const currency = (amount: number) =>
  new Intl.NumberFormat("es-PE", {
    style: "currency",
    currency: "PEN",
  }).format(amount);

const formatDate = (dateString: string) => {
  if (!dateString) return "-";
  const date = new Date(dateString);
  return isNaN(date.getTime()) ? dateString : date.toLocaleDateString("es-PE");
};

// --- Styles ---
const main = {
  backgroundColor: "#f6f9fc",
  fontFamily: '-apple-system,BlinkMacSystemFont,"Segoe UI",Roboto,sans-serif',
};

const container = {
  backgroundColor: "#ffffff",
  margin: "0 auto",
  padding: "20px",
  maxWidth: "465px",
  borderRadius: "8px",
  border: "1px solid #eaeaea",
};

const heading = {
  color: "#1f2937",
  fontSize: "24px",
  fontWeight: "bold",
  textAlign: "center" as const,
  margin: "30px 0",
};

const totalCard = {
  backgroundColor: "#f8fafc",
  border: "1px solid #e2e8f0",
  borderRadius: "8px",
  padding: "24px",
  textAlign: "center" as const,
  margin: "24px 0",
};

const totalLabel = {
  color: "#6b7280",
  fontSize: "12px",
  fontWeight: "bold",
  textTransform: "uppercase" as const,
  letterSpacing: "0.05em",
  margin: "0",
};

const totalAmount = {
  color: "#1e293b",
  fontSize: "36px",
  fontWeight: "800",
  margin: "8px 0 0 0",
};

const sectionTitle = {
  display: "flex",
  alignItems: "center",
  marginBottom: "16px",
};

const iconCircle = (color: string) => ({
  backgroundColor: color,
  borderRadius: "50%",
  width: "40px",
  height: "40px",
  display: "inline-block",
  textAlign: "center" as const,
  lineHeight: "40px",
  marginRight: "12px",
  fontSize: "20px",
});

const sectionHeading = {
  color: "#1f2937",
  fontSize: "18px",
  fontWeight: "bold",
  margin: "0",
  display: "inline-block",
};

const sectionAmount = {
  color: "#1f2937",
  fontSize: "18px",
  fontWeight: "bold",
  textAlign: "right" as const,
};

const itemCard = (borderColor: string) => ({
  borderLeft: `4px solid ${borderColor}`,
  paddingLeft: "16px",
  paddingTop: "4px",
  paddingBottom: "4px",
  marginTop: "16px",
});

const itemLabel = {
  color: "#6b7280",
  fontSize: "12px",
  fontWeight: "600",
  textTransform: "uppercase" as const,
  margin: "0",
};

const itemValue = {
  color: "#1f2937",
  fontSize: "14px",
  margin: "0",
};

const itemSubtext = {
  color: "#6b7280",
  fontSize: "14px",
  margin: "0",
};

const footer = {
  color: "#9ca3af",
  fontSize: "12px",
  textAlign: "center" as const,
  margin: "0",
};

const hr = {
  borderColor: "#e5e7eb",
  margin: "26px 0",
};

export const MonthlyReportEmail = ({ data }: MonthlyReportProps) => {
  const totalWater = data.water.invoices.reduce(
    (acc, curr) => acc + curr.total_fact,
    0
  );
  const totalElec = data.electricity.invoices.reduce(
    (acc, curr) => acc + curr.invoice.totalPagar,
    0
  );
  const totalGas = data.gas.data.reduce(
    (acc, curr) => acc + curr.statement.totalDebt,
    0
  );
  const grandTotal = totalWater + totalElec + totalGas;

  return (
    <Html>
      <Head />
      <Preview>
        HomeOps - Resumen de facturación: {currency(grandTotal)}
      </Preview>
      <Body style={main}>
        <Container style={container}>
          {/* Header */}
          <Heading style={heading}>
            <span style={{ color: "#2563eb" }}>Home</span>Ops Reporte
          </Heading>

          <Text style={{ ...footer, marginBottom: "24px" }}>
            Resumen de facturación mensual.
          </Text>

          {/* Total Card */}
          <Section style={totalCard}>
            <Text style={totalLabel}>Total a Pagar</Text>
            <Text style={totalAmount}>{currency(grandTotal)}</Text>
            <Text style={{ ...footer, marginTop: "8px" }}>
              Vence a finales de mes
            </Text>
          </Section>

          {/* Electricity */}
          <Section style={{ margin: "24px 0" }}>
            <table width="100%">
              <tr>
                <td>
                  <span style={iconCircle("#fef3c7")}>⚡</span>
                  <span style={sectionHeading}>Electricidad</span>
                </td>
                <td style={sectionAmount}>{currency(totalElec)}</td>
              </tr>
            </table>

            {data.electricity.invoices.map((item, i) => (
              <div key={i} style={itemCard("#facc15")}>
                <Text style={itemSubtext}>
                  Suministro: {item.supply.suministro}
                </Text>
                <table width="100%" style={{ marginTop: "4px" }}>
                  <tr>
                    <td>
                      <Text style={itemLabel}>Consumo</Text>
                      <Text style={itemValue}>
                        {item.invoice.consumoEnergia} kWh
                      </Text>
                    </td>
                    <td style={{ textAlign: "right" }}>
                      <Text style={itemLabel}>Periodo</Text>
                      <Text style={itemValue}>
                        {item.invoice.ultimaFacturacion}
                      </Text>
                    </td>
                  </tr>
                </table>
              </div>
            ))}
          </Section>

          <Hr style={hr} />

          {/* Water */}
          <Section style={{ margin: "24px 0" }}>
            <table width="100%">
              <tr>
                <td>
                  <span style={iconCircle("#dbeafe")}>💧</span>
                  <span style={sectionHeading}>Agua</span>
                </td>
                <td style={sectionAmount}>{currency(totalWater)}</td>
              </tr>
            </table>

            {data.water.invoices.map((item, i) => (
              <div key={i} style={itemCard("#60a5fa")}>
                <Text style={itemSubtext}>Recibo: {item.recibo}</Text>
                <table width="100%" style={{ marginTop: "4px" }}>
                  <tr>
                    <td>
                      <Text style={itemLabel}>Volumen</Text>
                      <Text style={itemValue}>{item.volumen} m³</Text>
                    </td>
                    <td style={{ textAlign: "right" }}>
                      <Text style={itemLabel}>Vence</Text>
                      <Text style={itemValue}>
                        {formatDate(item.vencimiento)}
                      </Text>
                    </td>
                  </tr>
                </table>
              </div>
            ))}
          </Section>

          <Hr style={hr} />

          {/* Gas */}
          <Section style={{ margin: "24px 0" }}>
            <table width="100%">
              <tr>
                <td>
                  <span style={iconCircle("#ffedd5")}>🔥</span>
                  <span style={sectionHeading}>Gas Natural</span>
                </td>
                <td style={sectionAmount}>{currency(totalGas)}</td>
              </tr>
            </table>

            {data.gas.data.map((item, i) => (
              <div key={i} style={itemCard("#fb923c")}>
                <table width="100%">
                  <tr>
                    <td>
                      <Text style={{ ...itemValue, fontWeight: "500" }}>
                        Suministro: {parseInt(item.account.clientCode, 10)}
                      </Text>
                      <Text style={{ ...itemSubtext, fontSize: "12px" }}>
                        Piso:{" "}
                        {item.basicData?.supplyAddress?.houseFloorNumber || "-"}
                      </Text>
                    </td>
                    <td style={{ textAlign: "right" }}>
                      <Text style={{ ...itemValue, fontWeight: "bold" }}>
                        {currency(item.statement.totalDebt)}
                      </Text>
                      <Text style={{ ...itemSubtext, fontSize: "12px" }}>
                        Vence: {formatDate(item.statement.lastBillDueDate)}
                      </Text>
                    </td>
                  </tr>
                </table>
              </div>
            ))}
          </Section>

          <Hr style={hr} />

          {/* Footer */}
          <Text style={footer}>
            Generado automáticamente por <strong>HomeOps GitHub Action</strong>
          </Text>
          <Text style={{ ...footer, marginTop: "4px" }}>
            {new Date().toLocaleString("es-PE")}
          </Text>
        </Container>
      </Body>
    </Html>
  );
};

export default MonthlyReportEmail;
