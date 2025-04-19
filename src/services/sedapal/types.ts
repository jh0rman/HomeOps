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

// ============ Invoices (to be discovered) ============
export interface SedapalInvoice {
  invoiceNumber?: string;
  issueDate?: string;
  dueDate?: string;
  totalAmount?: number;
  status?: string;
  period?: string;
  supplyNumber?: string;
}

export interface SedapalSupply {
  nis_rad: number;
  address?: string;
  district?: string;
}
