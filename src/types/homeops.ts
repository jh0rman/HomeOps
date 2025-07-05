/**
 * Shared types for HomeOps utility aggregation
 */

export interface Invoice {
  supply: number | string;
  amount: number;
  expiry: string;
  status?: string; // "PENDIENTE" | "PAGADO"
  code?: string; // For Calidda
}

export interface ServiceData {
  total: number;
  invoices: Invoice[];
  [key: string]: any;
}

export interface ElectricityData extends ServiceData {
  period: string;
  breakdown: {
    energia: number;
    igv: number;
    otros: number;
  };
}

export interface WaterData extends ServiceData {
  supplyNum: number;
}

export interface GasData extends ServiceData {
  floors: { floor: string; amount: number }[];
}

export interface FloorBreakdown {
  floor: number;
  kwh: number;
  elecTotal: number;
  total: number;
}

export interface AggregatedData {
  water: WaterData;
  electricity: ElectricityData;
  gas: GasData;
  floors: FloorBreakdown[];
  grandTotal: number;
  totalDebt: number;
}
