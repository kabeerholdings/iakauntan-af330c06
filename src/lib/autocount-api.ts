/**
 * AutoCount Cloud Accounting API Client
 * Based on: https://accounting-api.autocountcloud.com/documentation/
 * 
 * API Categories:
 * - Account, Area, Company Profile, Credit Note, Creditor, Debtor
 * - Department, DocNo Format, Invoice, Journal Entry, Knock Off Entry
 * - Location, Payment (Cash Book), Product, Purchase Invoice
 * - Purchase Order, Purchase Return, Quotation, Sales Agent
 * - Stock Adjustment, Stock Transfer
 */

import { supabase } from '@/integrations/supabase/client';

interface AutoCountResponse<T = any> {
  success: boolean;
  status: number;
  data: T;
}

async function callAutoCount<T = any>(
  companyId: string,
  endpoint: string,
  method: 'GET' | 'POST' | 'PUT' | 'DELETE' = 'GET',
  payload?: any,
): Promise<AutoCountResponse<T>> {
  const { data, error } = await supabase.functions.invoke('autocount-proxy', {
    body: { companyId, endpoint, method, payload },
  });
  if (error) throw new Error(error.message);
  return data as AutoCountResponse<T>;
}

// ─── Listing helper with pagination ──────────────────────
interface ListingFilter {
  page?: number;
  filter?: Record<string, any>;
}

// ─── ACCOUNT ─────────────────────────────────────────────
export const accountApi = {
  getAccounts: (companyId: string) =>
    callAutoCount(companyId, 'account/listing', 'GET'),
};

// ─── AREA ────────────────────────────────────────────────
export const areaApi = {
  getAreas: (companyId: string) =>
    callAutoCount(companyId, 'area/listing', 'GET'),
};

// ─── COMPANY PROFILE ─────────────────────────────────────
export const companyProfileApi = {
  getProfile: (companyId: string) =>
    callAutoCount(companyId, 'companyProfile', 'GET'),
};

// ─── CREDIT NOTE ─────────────────────────────────────────
export const creditNoteApi = {
  list: (companyId: string, filter?: ListingFilter) =>
    callAutoCount(companyId, 'creditNote/listing', filter ? 'POST' : 'GET', filter),
  get: (companyId: string, docNo: string) =>
    callAutoCount(companyId, `creditNote?docNo=${encodeURIComponent(docNo)}`, 'GET'),
  create: (companyId: string, data: any) =>
    callAutoCount(companyId, 'creditNote', 'POST', data),
  update: (companyId: string, docNo: string, data: any) =>
    callAutoCount(companyId, `creditNote?docNo=${encodeURIComponent(docNo)}`, 'PUT', data),
  delete: (companyId: string, docNo: string) =>
    callAutoCount(companyId, `creditNote?docNo=${encodeURIComponent(docNo)}`, 'DELETE'),
  void: (companyId: string, docNo: string) =>
    callAutoCount(companyId, `creditNote/void?docNo=${encodeURIComponent(docNo)}`, 'PUT'),
  getKnockOff: (companyId: string, docNo: string) =>
    callAutoCount(companyId, `creditNote/knockOffDetails?docNo=${encodeURIComponent(docNo)}`, 'GET'),
};

// ─── CREDITOR (SUPPLIER) ────────────────────────────────
export const creditorApi = {
  list: (companyId: string, filter?: ListingFilter) =>
    callAutoCount(companyId, 'creditor/listing', filter ? 'POST' : 'GET', filter),
  get: (companyId: string, creditorCode: string) =>
    callAutoCount(companyId, `creditor?creditorCode=${encodeURIComponent(creditorCode)}`, 'GET'),
  create: (companyId: string, data: any) =>
    callAutoCount(companyId, 'creditor', 'POST', data),
  update: (companyId: string, creditorCode: string, data: any) =>
    callAutoCount(companyId, `creditor?creditorCode=${encodeURIComponent(creditorCode)}`, 'PUT', data),
  delete: (companyId: string, creditorCode: string) =>
    callAutoCount(companyId, `creditor?creditorCode=${encodeURIComponent(creditorCode)}`, 'DELETE'),
};

// ─── DEBTOR (CUSTOMER) ──────────────────────────────────
export const debtorApi = {
  list: (companyId: string, filter?: ListingFilter) =>
    callAutoCount(companyId, 'debtor/listing', filter ? 'POST' : 'GET', filter),
  get: (companyId: string, debtorCode: string) =>
    callAutoCount(companyId, `debtor?debtorCode=${encodeURIComponent(debtorCode)}`, 'GET'),
  create: (companyId: string, data: any) =>
    callAutoCount(companyId, 'debtor', 'POST', data),
  update: (companyId: string, debtorCode: string, data: any) =>
    callAutoCount(companyId, `debtor?debtorCode=${encodeURIComponent(debtorCode)}`, 'PUT', data),
  delete: (companyId: string, debtorCode: string) =>
    callAutoCount(companyId, `debtor?debtorCode=${encodeURIComponent(debtorCode)}`, 'DELETE'),
};

// ─── DEPARTMENT ──────────────────────────────────────────
export const departmentApi = {
  list: (companyId: string) =>
    callAutoCount(companyId, 'department/listing', 'GET'),
};

// ─── DOCNO FORMAT ────────────────────────────────────────
export const docNoFormatApi = {
  list: (companyId: string) =>
    callAutoCount(companyId, 'docNoFormat/listing', 'GET'),
};

// ─── INVOICE ─────────────────────────────────────────────
export const invoiceApi = {
  list: (companyId: string, filter?: ListingFilter) =>
    callAutoCount(companyId, 'invoice/listing', filter ? 'POST' : 'GET', filter),
  get: (companyId: string, docNo: string) =>
    callAutoCount(companyId, `invoice?docNo=${encodeURIComponent(docNo)}`, 'GET'),
  create: (companyId: string, data: any) =>
    callAutoCount(companyId, 'invoice', 'POST', data),
  update: (companyId: string, docNo: string, data: any) =>
    callAutoCount(companyId, `invoice?docNo=${encodeURIComponent(docNo)}`, 'PUT', data),
  delete: (companyId: string, docNo: string) =>
    callAutoCount(companyId, `invoice?docNo=${encodeURIComponent(docNo)}`, 'DELETE'),
  void: (companyId: string, docNo: string) =>
    callAutoCount(companyId, `invoice/void?docNo=${encodeURIComponent(docNo)}`, 'PUT'),
  getKnockOff: (companyId: string, docNo: string) =>
    callAutoCount(companyId, `invoice/knockOffDetails?docNo=${encodeURIComponent(docNo)}`, 'GET'),
};

// ─── JOURNAL ENTRY ───────────────────────────────────────
export const journalEntryApi = {
  list: (companyId: string, filter?: ListingFilter) =>
    callAutoCount(companyId, 'journalEntry/listing', filter ? 'POST' : 'GET', filter),
  get: (companyId: string, docNo: string) =>
    callAutoCount(companyId, `journalEntry?docNo=${encodeURIComponent(docNo)}`, 'GET'),
  create: (companyId: string, data: any) =>
    callAutoCount(companyId, 'journalEntry', 'POST', data),
  update: (companyId: string, docNo: string, data: any) =>
    callAutoCount(companyId, `journalEntry?docNo=${encodeURIComponent(docNo)}`, 'PUT', data),
  delete: (companyId: string, docNo: string) =>
    callAutoCount(companyId, `journalEntry?docNo=${encodeURIComponent(docNo)}`, 'DELETE'),
  void: (companyId: string, docNo: string) =>
    callAutoCount(companyId, `journalEntry/void?docNo=${encodeURIComponent(docNo)}`, 'PUT'),
  getKnockOff: (companyId: string, docNo: string) =>
    callAutoCount(companyId, `journalEntry/knockOffDetails?docNo=${encodeURIComponent(docNo)}`, 'GET'),
};

// ─── KNOCK OFF ENTRY ─────────────────────────────────────
export const knockOffApi = {
  list: (companyId: string, filter?: ListingFilter) =>
    callAutoCount(companyId, 'knockOffEntry/listing', filter ? 'POST' : 'GET', filter),
  get: (companyId: string, docNo: string) =>
    callAutoCount(companyId, `knockOffEntry?docNo=${encodeURIComponent(docNo)}`, 'GET'),
  create: (companyId: string, data: any) =>
    callAutoCount(companyId, 'knockOffEntry', 'POST', data),
  update: (companyId: string, docNo: string, data: any) =>
    callAutoCount(companyId, `knockOffEntry?docNo=${encodeURIComponent(docNo)}`, 'PUT', data),
  delete: (companyId: string, docNo: string) =>
    callAutoCount(companyId, `knockOffEntry?docNo=${encodeURIComponent(docNo)}`, 'DELETE'),
  void: (companyId: string, docNo: string) =>
    callAutoCount(companyId, `knockOffEntry/void?docNo=${encodeURIComponent(docNo)}`, 'PUT'),
};

// ─── LOCATION ────────────────────────────────────────────
export const locationApi = {
  list: (companyId: string) =>
    callAutoCount(companyId, 'location/listing', 'GET'),
};

// ─── PAYMENT (CASH BOOK ENTRY) ──────────────────────────
export const paymentApi = {
  list: (companyId: string, filter?: ListingFilter) =>
    callAutoCount(companyId, 'payment/listing', filter ? 'POST' : 'GET', filter),
  get: (companyId: string, docNo: string) =>
    callAutoCount(companyId, `payment?docNo=${encodeURIComponent(docNo)}`, 'GET'),
  create: (companyId: string, data: any) =>
    callAutoCount(companyId, 'payment', 'POST', data),
  update: (companyId: string, docNo: string, data: any) =>
    callAutoCount(companyId, `payment?docNo=${encodeURIComponent(docNo)}`, 'PUT', data),
  delete: (companyId: string, docNo: string) =>
    callAutoCount(companyId, `payment?docNo=${encodeURIComponent(docNo)}`, 'DELETE'),
  void: (companyId: string, docNo: string) =>
    callAutoCount(companyId, `payment/void?docNo=${encodeURIComponent(docNo)}`, 'PUT'),
  getKnockOff: (companyId: string, docNo: string) =>
    callAutoCount(companyId, `payment/knockOffDetails?docNo=${encodeURIComponent(docNo)}`, 'GET'),
};

// ─── PRODUCT ─────────────────────────────────────────────
export const productApi = {
  list: (companyId: string, filter?: ListingFilter) =>
    callAutoCount(companyId, 'product/listing', filter ? 'POST' : 'GET', filter),
  get: (companyId: string, itemCode: string) =>
    callAutoCount(companyId, `product?itemCode=${encodeURIComponent(itemCode)}`, 'GET'),
  create: (companyId: string, data: any) =>
    callAutoCount(companyId, 'product', 'POST', data),
  update: (companyId: string, itemCode: string, data: any) =>
    callAutoCount(companyId, `product?itemCode=${encodeURIComponent(itemCode)}`, 'PUT', data),
  delete: (companyId: string, itemCode: string) =>
    callAutoCount(companyId, `product?itemCode=${encodeURIComponent(itemCode)}`, 'DELETE'),
};

// ─── PURCHASE INVOICE ────────────────────────────────────
export const purchaseInvoiceApi = {
  list: (companyId: string, filter?: ListingFilter) =>
    callAutoCount(companyId, 'purchaseInvoice/listing', filter ? 'POST' : 'GET', filter),
  get: (companyId: string, docNo: string) =>
    callAutoCount(companyId, `purchaseInvoice?docNo=${encodeURIComponent(docNo)}`, 'GET'),
  create: (companyId: string, data: any) =>
    callAutoCount(companyId, 'purchaseInvoice', 'POST', data),
  update: (companyId: string, docNo: string, data: any) =>
    callAutoCount(companyId, `purchaseInvoice?docNo=${encodeURIComponent(docNo)}`, 'PUT', data),
  delete: (companyId: string, docNo: string) =>
    callAutoCount(companyId, `purchaseInvoice?docNo=${encodeURIComponent(docNo)}`, 'DELETE'),
  void: (companyId: string, docNo: string) =>
    callAutoCount(companyId, `purchaseInvoice/void?docNo=${encodeURIComponent(docNo)}`, 'PUT'),
  getKnockOff: (companyId: string, docNo: string) =>
    callAutoCount(companyId, `purchaseInvoice/knockOffDetails?docNo=${encodeURIComponent(docNo)}`, 'GET'),
};

// ─── PURCHASE ORDER ──────────────────────────────────────
export const purchaseOrderApi = {
  list: (companyId: string, filter?: ListingFilter) =>
    callAutoCount(companyId, 'purchaseOrder/listing', filter ? 'POST' : 'GET', filter),
  get: (companyId: string, docNo: string) =>
    callAutoCount(companyId, `purchaseOrder?docNo=${encodeURIComponent(docNo)}`, 'GET'),
  create: (companyId: string, data: any) =>
    callAutoCount(companyId, 'purchaseOrder', 'POST', data),
  update: (companyId: string, docNo: string, data: any) =>
    callAutoCount(companyId, `purchaseOrder?docNo=${encodeURIComponent(docNo)}`, 'PUT', data),
  delete: (companyId: string, docNo: string) =>
    callAutoCount(companyId, `purchaseOrder?docNo=${encodeURIComponent(docNo)}`, 'DELETE'),
  void: (companyId: string, docNo: string) =>
    callAutoCount(companyId, `purchaseOrder/void?docNo=${encodeURIComponent(docNo)}`, 'PUT'),
  getKnockOff: (companyId: string, docNo: string) =>
    callAutoCount(companyId, `purchaseOrder/knockOffDetails?docNo=${encodeURIComponent(docNo)}`, 'GET'),
};

// ─── PURCHASE RETURN ─────────────────────────────────────
export const purchaseReturnApi = {
  list: (companyId: string, filter?: ListingFilter) =>
    callAutoCount(companyId, 'purchaseReturn/listing', filter ? 'POST' : 'GET', filter),
  get: (companyId: string, docNo: string) =>
    callAutoCount(companyId, `purchaseReturn?docNo=${encodeURIComponent(docNo)}`, 'GET'),
  create: (companyId: string, data: any) =>
    callAutoCount(companyId, 'purchaseReturn', 'POST', data),
  update: (companyId: string, docNo: string, data: any) =>
    callAutoCount(companyId, `purchaseReturn?docNo=${encodeURIComponent(docNo)}`, 'PUT', data),
  delete: (companyId: string, docNo: string) =>
    callAutoCount(companyId, `purchaseReturn?docNo=${encodeURIComponent(docNo)}`, 'DELETE'),
  void: (companyId: string, docNo: string) =>
    callAutoCount(companyId, `purchaseReturn/void?docNo=${encodeURIComponent(docNo)}`, 'PUT'),
  getKnockOff: (companyId: string, docNo: string) =>
    callAutoCount(companyId, `purchaseReturn/knockOffDetails?docNo=${encodeURIComponent(docNo)}`, 'GET'),
};

// ─── QUOTATION ───────────────────────────────────────────
export const quotationApi = {
  list: (companyId: string, filter?: ListingFilter) =>
    callAutoCount(companyId, 'quotation/listing', filter ? 'POST' : 'GET', filter),
  get: (companyId: string, docNo: string) =>
    callAutoCount(companyId, `quotation?docNo=${encodeURIComponent(docNo)}`, 'GET'),
  create: (companyId: string, data: any) =>
    callAutoCount(companyId, 'quotation', 'POST', data),
  update: (companyId: string, docNo: string, data: any) =>
    callAutoCount(companyId, `quotation?docNo=${encodeURIComponent(docNo)}`, 'PUT', data),
  delete: (companyId: string, docNo: string) =>
    callAutoCount(companyId, `quotation?docNo=${encodeURIComponent(docNo)}`, 'DELETE'),
  void: (companyId: string, docNo: string) =>
    callAutoCount(companyId, `quotation/void?docNo=${encodeURIComponent(docNo)}`, 'PUT'),
  getKnockOff: (companyId: string, docNo: string) =>
    callAutoCount(companyId, `quotation/knockOffDetails?docNo=${encodeURIComponent(docNo)}`, 'GET'),
};

// ─── SALES AGENT ─────────────────────────────────────────
export const salesAgentApi = {
  list: (companyId: string) =>
    callAutoCount(companyId, 'salesAgent/listing', 'GET'),
};

// ─── STOCK ADJUSTMENT ────────────────────────────────────
export const stockAdjustmentApi = {
  list: (companyId: string, filter?: ListingFilter) =>
    callAutoCount(companyId, 'stockAdjustment/listing', filter ? 'POST' : 'GET', filter),
  get: (companyId: string, docNo: string) =>
    callAutoCount(companyId, `stockAdjustment?docNo=${encodeURIComponent(docNo)}`, 'GET'),
  create: (companyId: string, data: any) =>
    callAutoCount(companyId, 'stockAdjustment', 'POST', data),
  update: (companyId: string, docNo: string, data: any) =>
    callAutoCount(companyId, `stockAdjustment?docNo=${encodeURIComponent(docNo)}`, 'PUT', data),
  delete: (companyId: string, docNo: string) =>
    callAutoCount(companyId, `stockAdjustment?docNo=${encodeURIComponent(docNo)}`, 'DELETE'),
  void: (companyId: string, docNo: string) =>
    callAutoCount(companyId, `stockAdjustment/void?docNo=${encodeURIComponent(docNo)}`, 'PUT'),
};

// ─── STOCK TRANSFER ──────────────────────────────────────
export const stockTransferApi = {
  list: (companyId: string, filter?: ListingFilter) =>
    callAutoCount(companyId, 'stockTransfer/listing', filter ? 'POST' : 'GET', filter),
  get: (companyId: string, docNo: string) =>
    callAutoCount(companyId, `stockTransfer?docNo=${encodeURIComponent(docNo)}`, 'GET'),
  create: (companyId: string, data: any) =>
    callAutoCount(companyId, 'stockTransfer', 'POST', data),
  update: (companyId: string, docNo: string, data: any) =>
    callAutoCount(companyId, `stockTransfer?docNo=${encodeURIComponent(docNo)}`, 'PUT', data),
  delete: (companyId: string, docNo: string) =>
    callAutoCount(companyId, `stockTransfer?docNo=${encodeURIComponent(docNo)}`, 'DELETE'),
  void: (companyId: string, docNo: string) =>
    callAutoCount(companyId, `stockTransfer/void?docNo=${encodeURIComponent(docNo)}`, 'PUT'),
};

// ─── COMBINED EXPORT ─────────────────────────────────────
export const autoCountApi = {
  account: accountApi,
  area: areaApi,
  companyProfile: companyProfileApi,
  creditNote: creditNoteApi,
  creditor: creditorApi,
  debtor: debtorApi,
  department: departmentApi,
  docNoFormat: docNoFormatApi,
  invoice: invoiceApi,
  journalEntry: journalEntryApi,
  knockOff: knockOffApi,
  location: locationApi,
  payment: paymentApi,
  product: productApi,
  purchaseInvoice: purchaseInvoiceApi,
  purchaseOrder: purchaseOrderApi,
  purchaseReturn: purchaseReturnApi,
  quotation: quotationApi,
  salesAgent: salesAgentApi,
  stockAdjustment: stockAdjustmentApi,
  stockTransfer: stockTransferApi,
};
