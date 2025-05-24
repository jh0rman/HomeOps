/**
 * Electricity cost distribution calculator
 * Distributes energy costs proportionally based on meter readings
 * and splits "otros conceptos" equally between floors
 */

// --- Types ---
export interface MeterReading {
  floor: number; // 1, 2, 3
  startReading: number; // kWh at start of month
  endReading: number; // kWh at end of month
}

export interface ElectricityBillData {
  totalConsumption: number; // kWh from the bill
  pricePerKwh: number; // S/ per kWh
  energyCost: number; // Consumo de energía
  otherConcepts: number; // Otros conceptos
  igv: number; // IGV 18%
  totalBill: number; // Total factura
  billingPeriod: string; // e.g., "Diciembre 2025"
}

export interface FloorConsumption {
  floor: number;
  consumption: number; // kWh consumed this month
  percentage: number; // Share of total consumption (0-1)
  energyCost: number; // Proportional energy cost
  igv: number; // Proportional IGV
  otherConcepts: number; // Equal share of otros conceptos
  total: number; // Total to pay
}

export interface ElectricityReport {
  bill: ElectricityBillData;
  meterTotal: number; // Sum of all meter readings
  floors: FloorConsumption[];
  grandTotal: number; // Should match bill.totalBill
}

// --- Calculator ---
export function calculateElectricityDistribution(
  bill: ElectricityBillData,
  meterReadings: MeterReading[]
): ElectricityReport {
  // Calculate consumption per floor
  const floorConsumptions = meterReadings.map((reading) => ({
    floor: reading.floor,
    consumption: reading.endReading - reading.startReading,
  }));

  // Total consumption from meters
  const meterTotal = floorConsumptions.reduce(
    (acc, floor) => acc + floor.consumption,
    0
  );

  // Number of floors for equal distribution
  const numFloors = meterReadings.length;
  const otherConceptsPerFloor = bill.otherConcepts / numFloors;

  // Calculate proportional distribution
  const floors: FloorConsumption[] = floorConsumptions.map((floor) => {
    const percentage = meterTotal > 0 ? floor.consumption / meterTotal : 0;
    const energyCost = roundTo2Decimals(bill.energyCost * percentage);
    const igv = roundTo2Decimals(bill.igv * percentage);
    const otherConcepts = roundTo2Decimals(otherConceptsPerFloor);
    const total = roundTo2Decimals(energyCost + igv + otherConcepts);

    return {
      floor: floor.floor,
      consumption: floor.consumption,
      percentage,
      energyCost,
      igv,
      otherConcepts,
      total,
    };
  });

  // Adjust for rounding errors on the last floor
  const totalEnergy = floors.reduce((acc, f) => acc + f.energyCost, 0);
  const totalIgv = floors.reduce((acc, f) => acc + f.igv, 0);
  const totalOther = floors.reduce((acc, f) => acc + f.otherConcepts, 0);

  // Apply rounding adjustments to last floor
  if (floors.length > 0) {
    const lastFloor = floors[floors.length - 1]!;
    lastFloor.energyCost = roundTo2Decimals(
      lastFloor.energyCost + (bill.energyCost - totalEnergy)
    );
    lastFloor.igv = roundTo2Decimals(lastFloor.igv + (bill.igv - totalIgv));
    lastFloor.otherConcepts = roundTo2Decimals(
      lastFloor.otherConcepts + (bill.otherConcepts - totalOther)
    );
    lastFloor.total = roundTo2Decimals(
      lastFloor.energyCost + lastFloor.igv + lastFloor.otherConcepts
    );
  }

  const grandTotal = floors.reduce((acc, f) => acc + f.total, 0);

  return {
    bill,
    meterTotal,
    floors,
    grandTotal: roundTo2Decimals(grandTotal),
  };
}

// --- Helpers ---
function roundTo2Decimals(num: number): number {
  return Math.round(num * 100) / 100;
}

export function formatCurrency(amount: number): string {
  return new Intl.NumberFormat("es-PE", {
    style: "currency",
    currency: "PEN",
  }).format(amount);
}

export function formatPercentage(value: number): string {
  return `${(value * 100).toFixed(2)}%`;
}

// --- Extract bill data from API response ---
export function extractBillFromApiResponse(apiResponse: {
  consumoEnergia: number;
  otrosConceptos: number;
  igv: number;
  totalPagar: number;
  ultimaFacturacion: string;
}): ElectricityBillData {
  const energyCost = apiResponse.consumoEnergia;
  const otherConcepts = apiResponse.otrosConceptos;
  const igv = apiResponse.igv;
  const totalBill = apiResponse.totalPagar;

  // Calculate price per kWh (approximate from energy cost / consumption)
  // Note: The actual consumption is in the bill, but we'll use meter readings
  const pricePerKwh = 0.605; // Default price, can be adjusted

  return {
    totalConsumption: energyCost / pricePerKwh, // Approximate
    pricePerKwh,
    energyCost,
    otherConcepts,
    igv,
    totalBill,
    billingPeriod: apiResponse.ultimaFacturacion,
  };
}
