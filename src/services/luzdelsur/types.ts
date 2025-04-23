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

// ============ Supplies ============
export interface LuzDelSurSuppliesRequest {
  request: {
    Token: string;
    Correo: string; // email
  };
}

export interface LuzDelSurSuppliesResponse {
  success: boolean;
  datos: {
    codeHTTP: number;
    codigo: string;
    suministros: LuzDelSurSupply[];
    mensajeUsuario: string | null;
  } | null;
}

export interface LuzDelSurSupply {
  direccion: string; // Address
  propietario: string; // "N" or "S" (owner flag)
  suministro: number; // Supply number
  muestraAfiliacionRecibo: boolean;
  muestraDesafiliacionRecibo: boolean;
}

// ============ Latest Invoice ============
export interface LuzDelSurLatestInvoiceRequest {
  request: {
    Token: string;
    Correo: string; // email
    Suministro: string; // supply number
  };
}

export interface LuzDelSurLatestInvoiceResponse {
  success: boolean;
  datos: {
    codeHTTP: number;
    codigo: string;
    consumoEnergia: number; // Energy consumption (kWh)
    consumoPotencia: number; // Power consumption
    deudaVencida: number; // Overdue debt
    igv: number; // Tax (IGV)
    mensaje: string | null;
    noAfectoIGV: number; // Non-taxable amount
    ordinario: boolean; // Regular invoice flag
    otros: number; // Other charges
    otrosConceptos: number; // Other concepts
    puedePagar: boolean; // Can pay flag
    subTotal: number; // Subtotal
    totalMes: number; // Monthly total
    totalPagar: number; // Total to pay
    ultimaFacturacion: string; // Last billing period (e.g., "Diciembre 2025")
    saldoPendiente: number; // Outstanding balance
    ultimoPago: number; // Last payment amount
    fechaUltimoPago: string; // Last payment date (DD/MM/YYYY)
  } | null;
}
