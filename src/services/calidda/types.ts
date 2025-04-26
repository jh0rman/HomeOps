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

// ============ Accounts ============
export interface CaliddaAccountsResponse {
  valid: boolean;
  message: string | null;
  detail: string | null;
  data: CaliddaAccount[] | null;
  warning: boolean;
  intercept: boolean;
  codeError: number;
}

export interface CaliddaAccount {
  clientCode: string;
  interlocutorId: string;
  installationNumber: string;
  isMain: boolean;
  operationNumber: string | null;
}

// ============ Account Statement ============
export interface CaliddaAccountStatementResponse {
  valid: boolean;
  message: string | null;
  detail: string | null;
  data: CaliddaAccountStatement | null;
  warning: boolean;
  intercept: boolean;
  codeError: number;
}

export interface CaliddaAccountStatement {
  lastBilledAmount: number; // Last invoice amount
  lastBillDueDate: string; // ISO datetime (e.g., "2025-12-26T00:00:00")
  expiredBillCount: number; // Number of expired bills
  lastPaymentAmount: number; // Last payment amount
  lastPaymentDate: string; // ISO datetime
  totalDebt: number; // Total outstanding debt
  expiredDebt: number; // Expired debt amount
  cancelDate: string; // Cut-off date (DD/MM/YYYY)
  currencySymbol: string; // e.g., "S/"
  serviceState: string; // e.g., "ACTIVO"
  suspensionDate: string; // YYYYMMDD format
  suspensionReason: string;
  debtMessage: string | null; // Warning message about debt
  summaryInfo: unknown | null;
}
