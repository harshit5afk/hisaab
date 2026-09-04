// ─── Enums ─────────────────────────────────────────────
export enum Role {
  OWNER = 'OWNER',
  STAFF = 'STAFF',
}

export enum InvoiceStatus {
  DRAFT = 'DRAFT',
  SENT = 'SENT',
  PAID = 'PAID',
  OVERDUE = 'OVERDUE',
}

export enum PaymentMode {
  CASH = 'CASH',
  UPI = 'UPI',
  BANK_TRANSFER = 'BANK_TRANSFER',
  CHEQUE = 'CHEQUE',
  OTHER = 'OTHER',
}

// ─── User ──────────────────────────────────────────────
export interface IUser {
  id: string;
  name: string;
  email: string;
  role: Role;
  createdAt: string;
}

// ─── Customer ──────────────────────────────────────────
export interface ICustomer {
  id: string;
  name: string;
  phone?: string;
  address?: string;
  gstin?: string;
  createdBy: string;
  createdAt: string;
}

export interface ICreateCustomer {
  name: string;
  phone?: string;
  address?: string;
  gstin?: string;
}

export interface IUpdateCustomer {
  name?: string;
  phone?: string;
  address?: string;
  gstin?: string;
}

// ─── Invoice / Sale ────────────────────────────────────
export interface IInvoice {
  id: string;
  invoiceNo: string;
  customerId: string;
  date: string;
  /** Amount in paise (integer). ₹1,500.50 = 150050 */
  amount: number;
  description?: string;
  status: InvoiceStatus;
  createdAt: string;
  customer?: ICustomer;
}

export interface ICreateInvoice {
  customerId: string;
  date: string;
  /** Amount in paise */
  amount: number;
  description?: string;
}

export interface IUpdateInvoice {
  date?: string;
  amount?: number;
  description?: string;
  status?: InvoiceStatus;
}

// ─── Purchase ──────────────────────────────────────────
export interface IPurchase {
  id: string;
  billNo?: string;
  vendor: string;
  date: string;
  /** Amount in paise */
  amount: number;
  description?: string;
  createdAt: string;
}

export interface ICreatePurchase {
  billNo?: string;
  vendor: string;
  date: string;
  amount: number;
  description?: string;
}

export interface IUpdatePurchase {
  billNo?: string;
  vendor?: string;
  date?: string;
  amount?: number;
  description?: string;
}

// ─── Payment ───────────────────────────────────────────
export interface IPayment {
  id: string;
  customerId: string;
  invoiceId?: string;
  date: string;
  /** Amount in paise */
  amount: number;
  mode: PaymentMode;
  note?: string;
  createdAt: string;
  customer?: ICustomer;
  invoice?: IInvoice;
}

export interface ICreatePayment {
  customerId: string;
  invoiceId?: string;
  date: string;
  amount: number;
  mode: PaymentMode;
  note?: string;
}

// ─── Receivables ───────────────────────────────────────
export interface ICustomerBalance {
  customerId: string;
  customerName: string;
  phone?: string;
  /** Total invoiced amount in paise */
  totalInvoiced: number;
  /** Total paid amount in paise */
  totalPaid: number;
  /** Outstanding balance in paise (invoiced - paid) */
  balance: number;
}

export interface ILedgerEntry {
  id: string;
  date: string;
  type: 'INVOICE' | 'PAYMENT';
  reference: string; // invoiceNo or payment mode
  description?: string;
  /** Debit (invoice) amount in paise */
  debit: number;
  /** Credit (payment) amount in paise */
  credit: number;
  /** Running balance in paise */
  runningBalance: number;
}

// ─── AI ────────────────────────────────────────────────
export interface IExtractedInvoice {
  vendor: string | null;
  billNo: string | null;
  date: string | null;
  /** Amount in rupees (decimal) — will be converted to paise by backend */
  amount: number | null;
  items: IExtractedItem[];
  confidence: 'high' | 'medium' | 'low';
}

export interface IExtractedItem {
  description: string;
  qty: number;
  rate: number;
  amount: number;
}

export interface IAiQueryRequest {
  question: string;
}

export interface IAiQueryResponse {
  answer: string;
  dataUsed?: string;
}

// ─── API Response Wrappers ─────────────────────────────
export interface IApiResponse<T> {
  success: boolean;
  data: T;
  message?: string;
}

export interface IPaginatedResponse<T> {
  success: boolean;
  data: T[];
  total: number;
  page: number;
  limit: number;
}

// ─── Auth ──────────────────────────────────────────────
export interface ILoginRequest {
  email: string;
  password: string;
}

export interface ITokenResponse {
  accessToken: string;
  user: IUser;
}

// ─── Dashboard ─────────────────────────────────────────
export interface IDashboardStats {
  totalReceivable: number;
  totalSales: number;
  totalPurchases: number;
  paymentsToday: number;
  customerCount: number;
}

export interface IMonthlySummary {
  month: string; // "2026-01"
  sales: number;
  purchases: number;
  payments: number;
}
