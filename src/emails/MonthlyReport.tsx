/**
 * Monthly Report Email Template
 * Floor-based expense distribution with meter readings
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
  Row,
  Column,
} from "@react-email/components";

// --- Interfaces ---
interface WaterInvoice {
  total_fact: number;
  vencimiento: string;
  volumen: number;
  recibo: string;
  nis_rad: number; // Supply number
}

interface SubMeterReading {
  floor: number;
  startReading: number;
  endReading: number;
}

interface ElectricityInvoice {
  supply: {
    suministro: number;
  };
  invoice: {
    totalPagar: number;
    consumoEnergia: number;
    igv: number;
    otrosConceptos: number;
    noAfectoIGV: number; // Added for correct total
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
    water: {
      invoices: WaterInvoice[];
      supplyNumber: number; // NIS from SEDAPAL session
    };
    electricity: {
      invoices: ElectricityInvoice[];
      subMeters: SubMeterReading[];
    };
    gas: { data: GasData[] };
  };
}

// --- Helpers ---
const currency = (amount: number) =>
  new Intl.NumberFormat("es-PE", {
    style: "currency",
    currency: "PEN",
    minimumFractionDigits: 2,
  }).format(amount);

// --- Styles ---
const main = {
  backgroundColor: "#f8fafc",
  fontFamily: '-apple-system,BlinkMacSystemFont,"Segoe UI",Roboto,sans-serif',
  padding: "40px 8px",
};

const container = {
  margin: "0 auto",
  maxWidth: "500px",
};

const header = {
  textAlign: "center" as const,
  marginBottom: "32px",
};

const title = {
  fontSize: "24px",
  fontWeight: "bold",
  color: "#1e293b",
  margin: "0",
};

const subtitle = {
  fontSize: "10px",
  color: "#94a3b8",
  textTransform: "uppercase" as const,
  letterSpacing: "0.1em",
  marginTop: "4px",
};

const totalCard = {
  backgroundColor: "#1e293b",
  borderRadius: "16px",
  padding: "24px",
  textAlign: "center" as const,
  marginBottom: "32px",
};

const totalLabel = {
  color: "#94a3b8",
  fontSize: "10px",
  fontWeight: "bold",
  textTransform: "uppercase" as const,
  letterSpacing: "0.1em",
  margin: "0 0 4px 0",
};

const totalAmount = {
  color: "#ffffff",
  fontSize: "42px",
  fontWeight: "800",
  margin: "0 0 8px 0",
};

const totalBadge = {
  backgroundColor: "rgba(71, 85, 105, 0.5)",
  color: "#cbd5e1",
  fontSize: "11px",
  padding: "4px 12px",
  borderRadius: "999px",
};

const sectionTitle = {
  fontSize: "16px",
  fontWeight: "bold",
  color: "#334155",
  margin: "0 0 16px 0",
};

const floorCard = {
  backgroundColor: "#ffffff",
  border: "1px solid #e2e8f0",
  borderRadius: "12px",
  marginBottom: "16px",
  overflow: "hidden",
};

const floorHeader = {
  backgroundColor: "#f8fafc",
  padding: "16px",
  borderBottom: "1px solid #e2e8f0",
};

const floorNumber = {
  backgroundColor: "#e0e7ff",
  color: "#4338ca",
  width: "28px",
  height: "28px",
  borderRadius: "50%",
  textAlign: "center" as const,
  lineHeight: "28px",
  fontWeight: "bold",
  fontSize: "12px",
};

const floorBody = {
  padding: "16px",
};

const elecLabel = {
  fontSize: "11px",
  fontWeight: "bold",
  color: "#64748b",
  margin: "0 0 8px 0",
};

const kwhLabel = {
  fontSize: "11px",
  color: "#94a3b8",
  margin: "0",
  textAlign: "right" as const,
};

const progressBarOuter = {
  backgroundColor: "#f1f5f9",
  height: "8px",
  borderRadius: "4px",
  marginBottom: "12px",
};

const progressBarInner = (percent: number) => ({
  backgroundColor: "#facc15",
  height: "8px",
  borderRadius: "4px",
  width: `${Math.max(percent, 8)}%`,
});

const breakdownBox = {
  backgroundColor: "#f8fafc",
  border: "1px solid #e2e8f0",
  borderRadius: "8px",
  padding: "12px",
  marginBottom: "12px",
};

const breakdownLabel = {
  fontSize: "10px",
  color: "#94a3b8",
  margin: "0 0 2px 0",
};

const breakdownValue = {
  fontSize: "12px",
  fontWeight: "600",
  color: "#334155",
  margin: "0",
};

const serviceBox = (bgColor: string, borderColor: string) => ({
  backgroundColor: bgColor,
  border: `1px solid ${borderColor}`,
  borderRadius: "8px",
  padding: "10px 12px",
});

const serviceLabel = {
  fontSize: "11px",
  fontWeight: "600",
  color: "#475569",
  margin: "0",
};

const serviceAmount = {
  fontSize: "12px",
  fontWeight: "bold",
  color: "#1e293b",
  margin: "0",
};

const noteBox = {
  backgroundColor: "#eff6ff",
  border: "1px solid #dbeafe",
  borderRadius: "8px",
  padding: "12px",
  marginTop: "8px",
};

const noteText = {
  fontSize: "10px",
  color: "#1e40af",
  margin: "0",
  lineHeight: "1.5",
};

const receiptSection = {
  marginTop: "40px",
};

const receiptTitle = {
  fontSize: "10px",
  fontWeight: "bold",
  color: "#94a3b8",
  textTransform: "uppercase" as const,
  letterSpacing: "0.1em",
  margin: "0 0 16px 0",
};

const receiptCard = {
  backgroundColor: "#ffffff",
  border: "1px solid #e2e8f0",
  borderRadius: "12px",
  overflow: "hidden",
};

const receiptRow = {
  padding: "14px 16px",
  borderBottom: "1px solid #f1f5f9",
};

const receiptIcon = (bgColor: string) => ({
  backgroundColor: bgColor,
  width: "36px",
  height: "36px",
  borderRadius: "50%",
  textAlign: "center" as const,
  lineHeight: "36px",
  fontSize: "14px",
});

const receiptName = {
  fontSize: "13px",
  fontWeight: "bold",
  color: "#334155",
  margin: "0",
};

const receiptDetail = {
  fontSize: "10px",
  color: "#94a3b8",
  margin: "0",
};

const receiptAmount = {
  fontSize: "13px",
  fontWeight: "bold",
  color: "#334155",
  margin: "0",
};

const footer = {
  textAlign: "center" as const,
  marginTop: "32px",
};

const footerText = {
  fontSize: "10px",
  color: "#94a3b8",
  margin: "0",
};

export const MonthlyReportEmail = ({ data }: MonthlyReportProps) => {
  // Totals
  const totalWater = data.water.invoices.reduce(
    (acc, curr) => acc + curr.total_fact,
    0
  );
  const totalGas = data.gas.data.reduce(
    (acc, curr) => acc + curr.statement.totalDebt,
    0
  );

  // Electricity breakdown
  const elecInvoice = data.electricity.invoices[0];
  const billEnergyCost = elecInvoice?.invoice?.consumoEnergia || 0;
  const billIgv = elecInvoice?.invoice?.igv || 0;
  // Otros = otrosConceptos + noAfectoIGV (both are fixed costs divided equally)
  const billOthers =
    (elecInvoice?.invoice?.otrosConceptos || 0) +
    (elecInvoice?.invoice?.noAfectoIGV || 0);

  // Total electricity = energy + igv + others (matches bill total)
  const totalElec = billEnergyCost + billIgv + billOthers;
  const grandTotal = totalWater + totalElec + totalGas;

  // Meter readings
  const floorReadings = data.electricity.subMeters.map((m) => ({
    floor: m.floor,
    kwh: m.endReading - m.startReading,
  }));
  const totalKwh = floorReadings.reduce((acc, curr) => acc + curr.kwh, 0);

  // Floor breakdown
  const floorBreakdown = [1, 2, 3].map((floorNum) => {
    const reading = floorReadings.find((r) => r.floor === floorNum);
    const kwh = reading?.kwh || 0;
    const share = totalKwh > 0 ? kwh / totalKwh : 0;

    const elecEnergy = billEnergyCost * share;
    const elecIgv = billIgv * share;
    const elecOthers = billOthers / 3;
    const elecTotal = elecEnergy + elecIgv + elecOthers;

    const waterTotal = totalWater / 3;

    const gasBill = data.gas.data.find(
      (g) =>
        g.basicData?.supplyAddress?.houseFloorNumber === floorNum.toString()
    );
    const gasTotal = gasBill?.statement.totalDebt || 0;

    return {
      floor: floorNum,
      kwh,
      share,
      elecEnergy,
      elecIgv,
      elecOthers,
      elecTotal,
      water: waterTotal,
      gas: gasTotal,
      total: elecTotal + waterTotal + gasTotal,
    };
  });

  const waterInvoice = data.water.invoices[0];

  return (
    <Html>
      <Head />
      <Preview>HomeOps - Total a pagar: {currency(grandTotal)}</Preview>
      <Body style={main}>
        <Container style={container}>
          {/* Header */}
          <Section style={header}>
            <Heading style={title}>
              <span style={{ color: "#4f46e5" }}>Home</span>Ops
            </Heading>
            <Text style={subtitle}>Reporte Mensual</Text>
          </Section>

          {/* Total Card */}
          <Section style={totalCard}>
            <Text style={totalLabel}>Total a Pagar</Text>
            <Text style={totalAmount}>{currency(grandTotal)}</Text>
            <span style={totalBadge}>Vence a finales de mes</span>
          </Section>

          {/* Distribution Section */}
          <Text style={sectionTitle}>📊 Distribución de Gastos</Text>

          {floorBreakdown.map((floor) => (
            <Section key={floor.floor} style={floorCard}>
              {/* Floor Header */}
              <Row style={floorHeader}>
                <Column style={{ width: "36px" }}>
                  <div style={floorNumber}>{floor.floor}</div>
                </Column>
                <Column>
                  <Text
                    style={{
                      fontWeight: "bold",
                      color: "#334155",
                      margin: "0",
                      fontSize: "14px",
                    }}
                  >
                    Piso {floor.floor}
                  </Text>
                </Column>
                <Column style={{ textAlign: "right" }}>
                  <Text
                    style={{
                      fontSize: "18px",
                      fontWeight: "800",
                      color: "#1e293b",
                      margin: "0",
                    }}
                  >
                    {currency(floor.total)}
                  </Text>
                </Column>
              </Row>

              {/* Floor Body */}
              <Section style={floorBody}>
                {/* Electricity Label Row */}
                <Row>
                  <Column>
                    <Text style={elecLabel}>⚡ Electricidad</Text>
                  </Column>
                  <Column style={{ textAlign: "right" }}>
                    <Text style={kwhLabel}>{floor.kwh.toFixed(1)} kWh</Text>
                  </Column>
                </Row>

                {/* Progress Bar */}
                <div style={progressBarOuter}>
                  <div style={progressBarInner(floor.share * 100)} />
                </div>

                {/* Electricity Breakdown */}
                <Section style={breakdownBox}>
                  <Row>
                    <Column style={{ width: "25%" }}>
                      <Text style={breakdownLabel}>Energía</Text>
                      <Text style={breakdownValue}>
                        {currency(floor.elecEnergy)}
                      </Text>
                    </Column>
                    <Column style={{ width: "25%" }}>
                      <Text style={breakdownLabel}>IGV (18%)</Text>
                      <Text style={breakdownValue}>
                        {currency(floor.elecIgv)}
                      </Text>
                    </Column>
                    <Column style={{ width: "25%" }}>
                      <Text style={breakdownLabel}>Fijos</Text>
                      <Text style={breakdownValue}>
                        {currency(floor.elecOthers)}
                      </Text>
                    </Column>
                    <Column style={{ width: "25%", textAlign: "right" }}>
                      <Text style={breakdownLabel}>Total Luz</Text>
                      <Text style={{ ...breakdownValue, fontWeight: "bold" }}>
                        {currency(floor.elecTotal)}
                      </Text>
                    </Column>
                  </Row>
                </Section>

                {/* Water & Gas Row */}
                <Row>
                  <Column style={{ width: "48%", paddingRight: "6px" }}>
                    <Section style={serviceBox("#eff6ff", "#dbeafe")}>
                      <Row>
                        <Column style={{ width: "20px" }}>💧</Column>
                        <Column>
                          <Text style={serviceLabel}>Agua</Text>
                        </Column>
                        <Column style={{ textAlign: "right" }}>
                          <Text style={serviceAmount}>
                            {currency(floor.water)}
                          </Text>
                        </Column>
                      </Row>
                    </Section>
                  </Column>
                  <Column style={{ width: "48%", paddingLeft: "6px" }}>
                    <Section style={serviceBox("#fff7ed", "#fed7aa")}>
                      <Row>
                        <Column style={{ width: "20px" }}>🔥</Column>
                        <Column>
                          <Text style={serviceLabel}>Gas</Text>
                        </Column>
                        <Column style={{ textAlign: "right" }}>
                          <Text style={serviceAmount}>
                            {currency(floor.gas)}
                          </Text>
                        </Column>
                      </Row>
                    </Section>
                  </Column>
                </Row>
              </Section>
            </Section>
          ))}

          {/* Note */}
          <Section style={noteBox}>
            <Text style={noteText}>
              ℹ️ <strong>Nota:</strong> Electricidad calculada por consumo de
              medidor interno + proporcional del IGV. Conceptos fijos divididos
              entre 3. Agua dividida equitativamente.
            </Text>
          </Section>

          {/* Receipts Section */}
          <Section style={receiptSection}>
            <Text style={receiptTitle}>Recibos Originales</Text>

            <Section style={receiptCard}>
              {/* Electricity */}
              <Row style={receiptRow}>
                <Column style={{ width: "44px" }}>
                  <div style={receiptIcon("#fef9c3")}>⚡</div>
                </Column>
                <Column>
                  <Text style={receiptName}>Electricidad</Text>
                  <Text style={receiptDetail}>
                    Sum: {elecInvoice?.supply.suministro}
                  </Text>
                </Column>
                <Column style={{ textAlign: "right" }}>
                  <Text style={receiptAmount}>{currency(totalElec)}</Text>
                </Column>
              </Row>

              {/* Water */}
              <Row style={receiptRow}>
                <Column style={{ width: "44px" }}>
                  <div style={receiptIcon("#dbeafe")}>💧</div>
                </Column>
                <Column>
                  <Text style={receiptName}>Agua Potable</Text>
                  <Text style={receiptDetail}>
                    NIS: {data.water.supplyNumber}
                  </Text>
                </Column>
                <Column style={{ textAlign: "right" }}>
                  <Text style={receiptAmount}>{currency(totalWater)}</Text>
                  <Text style={receiptDetail}>{waterInvoice?.volumen} m³</Text>
                </Column>
              </Row>

              {/* Gas */}
              <Row style={{ ...receiptRow, borderBottom: "none" }}>
                <Column style={{ width: "44px" }}>
                  <div style={receiptIcon("#fed7aa")}>🔥</div>
                </Column>
                <Column>
                  <Text style={receiptName}>Gas Natural</Text>
                  <Text style={receiptDetail}>
                    {data.gas.data
                      .map((g) => parseInt(g.account.clientCode, 10))
                      .join(", ")}
                  </Text>
                </Column>
                <Column style={{ textAlign: "right" }}>
                  <Text style={receiptAmount}>{currency(totalGas)}</Text>
                  <Text style={receiptDetail}>3 suministros</Text>
                </Column>
              </Row>
            </Section>
          </Section>

          {/* Footer */}
          <Section style={footer}>
            <Text style={footerText}>
              Generado por <strong>HomeOps</strong> •{" "}
              {new Date().toLocaleDateString("es-PE", {
                month: "long",
                year: "numeric",
              })}
            </Text>
          </Section>
        </Container>
      </Body>
    </Html>
  );
};

export default MonthlyReportEmail;
