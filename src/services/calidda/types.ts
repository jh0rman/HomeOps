/**
 * Cálidda API Types - Lima Gas Service
 */

// ============ User Authentication ============
export interface CaliddaLoginRequest {
  username: string; // email
  password: string;
  platform: number; // 2 = web
  ctaCto: string; // Account contract (empty for initial login)
}

export interface CaliddaLoginResponse {
  valid: boolean; // true = success
  message: string | null;
  detail: string | null;
  data: string | null; // temporaryAccessId (UUID)
  warning: boolean;
  messageCode: string | null;
  intercept: boolean;
}

export interface CaliddaTokenResponse {
  valid: boolean;
  message: string | null;
  detail: string | null;
  data: string | null; // JWT token
  warning: boolean;
  messageCode: string | null;
  intercept: boolean;
  createDate: string; // MM/DD/YYYY HH:mm:ss
  expireDate: string; // MM/DD/YYYY HH:mm:ss
}

// ============ Invoices (to be discovered) ============
export interface CaliddaInvoice {
  invoiceNumber?: string;
  issueDate?: string;
  dueDate?: string;
  totalAmount?: number;
  status?: string;
  period?: string;
  consumption?: number; // m³
  [key: string]: unknown;
}
