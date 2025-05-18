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

// ============ Account Basic Data ============
export interface CaliddaBasicDataResponse {
  valid: boolean;
  message: string | null;
  detail: string | null;
  data: CaliddaBasicData | null;
  warning: boolean;
  intercept: boolean;
  codeError: number;
}

export interface CaliddaAddress {
  tipoEdificio: string | null;
  tipoVivienda: string | null;
  tipoInterior: string | null;
  tipoComite: string | null;
  tipoConjuntoVivienda: string | null;
  direccion_Departamento: string | null;
  direccion_Provincia: string | null;
  direccion_Distrito: string | null;
  summary: string | null;
  streetType: string;
  streetDescription: string;
  streetNumber: string;
  buildingType: string;
  buildingDescription: string;
  houseType: string;
  houseDescription: string;
  houseFloorNumber: string;
  interiorType: string;
  interiorDescription: string;
  physicalGroupingType: string;
  physicalGroupingDescription: string;
  virtualGroupingType: string;
  virtualGroupingDescription: string;
  block: string;
  lot: string;
  districtCode: string;
  districtDescription: string;
  provinceCode: string;
  provinceDescription: string;
  departmentCode: string;
  departmentDescription: string;
  countryCode: string;
  region: string | null;
  postalCode: string | null;
}

export interface CaliddaClientType {
  code: string;
  description: string;
  group: string;
  esNoCliente: boolean;
}

export interface CaliddaCreditLineFNB {
  amount: number;
  amountFormat: string;
  firstName: string;
  firstNameMask: string;
  isCreditLineFNB: boolean;
  orderPopupFNB: number;
  orderPopupHome: number;
  statusPopupFNB: boolean;
  statusPopupHome: boolean;
}

export interface CaliddaBasicData {
  name: string;
  lastName: string;
  supplyAddress: CaliddaAddress;
  postalAddress: CaliddaAddress;
  emailAddress: string;
  homePhoneNumber: string;
  cellPhoneNumber: string;
  clientTypeCode: string;
  documentType: string;
  documentNumber: string;
  clientCode: string;
  interlocutorId: string;
  businessField: string;
  installationNumber: string;
  installationType: string;
  installationCount: string;
  availableCreditLineAmount: number;
  clientType: CaliddaClientType;
  creditLineFNB: CaliddaCreditLineFNB;
  dirsum: string | null;
  tieneDirSuministro: boolean;
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
  lastBilledAmount: number;
  lastBillDueDate: string; // ISO datetime
  expiredBillCount: number;
  lastPaymentAmount: number;
  lastPaymentDate: string; // ISO datetime
  totalDebt: number;
  expiredDebt: number;
  cancelDate: string; // DD/MM/YYYY
  currencySymbol: string;
  serviceState: string;
  suspensionDate: string; // YYYYMMDD
  suspensionReason: string;
  debtMessage: string | null;
  summaryInfo: unknown | null;
}
