/**
 * Luz del Sur API Types - Lima Electricity Service
 */

// ============ User Authentication ============
export interface LuzDelSurLoginRequest {
  request: {
    password: string;
    Correo: string; // email
    Plataforma: string; // "WEB"
  };
}

export interface LuzDelSurLoginResponse {
  success: boolean;
  datos: {
    codeHTTP: number; // HTTP status code (e.g., 200)
    codigo: string; // Response code ("0" = success)
    aceptadoTerminoCondiciones: boolean; // Terms accepted
    token: string; // Auth token for subsequent requests
    mensajeUsuario: string | null; // User message
    urlEliminacionCuenta: string | null; // Account deletion URL
  } | null;
}

// ============ Invoices (to be discovered) ============
export interface LuzDelSurInvoicesResponse {
  success?: boolean;
  datos?: LuzDelSurInvoice[] | null;
  [key: string]: unknown;
}

export interface LuzDelSurInvoice {
  invoiceNumber?: string;
  issueDate?: string;
  dueDate?: string;
  totalAmount?: number;
  status?: string;
  period?: string;
  supplyNumber?: string;
  consumption?: number; // kWh
  [key: string]: unknown;
}

export interface LuzDelSurSupply {
  supplyNumber?: string;
  address?: string;
  district?: string;
}
