/**
 * SEDAPAL API Types - Lima Water Service
 */

// ============ System Login ============
export interface SedapalSystemLoginResponse {
  nRESP_SP: number; // 1 = success
  cRESP_SP: string; // "Ejecución Correcta"
  bRESP: {
    token: string;
  };
}

// ============ User Authentication ============
export interface SedapalUserLoginRequest {
  correo: string; // email
  clave: string; // password
  flagChannel: string; // "1" = web
}

export interface SedapalUserLoginResponse {
  nRESP_SP: number; // 0 = error, 1 = success
  cRESP_SP: string; // Response message
  cRESP_SP2: string | null;
  bRESP: {
    id_cliente: number; // Customer ID
    nis_rad: number; // Main supply number
    admin_com: number;
    admin_etic: number;
    flag_respuesta: string; // "B" = error?, "A" = success?
  };
}

// ============ Invoices/Receipts ============
export interface SedapalInvoicesRequest {
  nis_rad: number; // Supply number
  page_num: number; // Page number (1-indexed)
  page_size: number; // Items per page
}

export interface SedapalInvoicesResponse {
  nRESP_SP: number; // 0 = error, 1 = success
  cRESP_SP: string; // Response message
  cRESP_SP2: string | null;
  bRESP: SedapalInvoice[] | null;
  total: number; // Total number of invoices
}

export interface SedapalInvoice {
  nis_rad: number; // Supply number (sometimes 0 in response)
  sec_nis: number; // Supply sequence
  cod_cli: number; // Customer code
  sec_rec: number; // Receipt sequence
  f_fact: string; // Invoice date (YYYY-MM-DD)
  mes: string; // Billing month (YYYY-MM-DD)
  vencimiento: string; // Due date (YYYY-MM-DD)
  tipo_recibo: string; // Receipt type (e.g., "Consumo de agua")
  recibo: string; // Receipt number
  nro_factura: string; // Invoice number
  est_act: string | null; // Current status
  total_fact: number; // Total invoice amount
  imp_cta: number; // Account tax
  tip_rec: string | null; // Receipt type code
  deuda: number; // Outstanding debt amount
  volumen: number; // Water consumption volume (m³)
  select: boolean; // Selection flag (for UI)
}

export interface SedapalSupply {
  nis_rad: number;
  address?: string;
  district?: string;
}
