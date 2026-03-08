// Pre-built report templates based on SQL Accounting template categories
// Reference: https://www.sql.com.my/webstore/templates/

export type TemplateCategory =
  | 'sales_invoice'
  | 'sales_quotation'
  | 'sales_delivery_order'
  | 'sales_order'
  | 'sales_credit_note'
  | 'sales_debit_note'
  | 'purchase_invoice'
  | 'purchase_order'
  | 'purchase_debit_note'
  | 'customer_statement'
  | 'customer_aging'
  | 'customer_payment'
  | 'payment_voucher'
  | 'official_receipt'
  | 'cash_sales'
  | 'einvoice'
  | 'cheque_format'
  | 'goods_received'
  | 'payslip'
  | 'stock_barcode'
  | 'general_ledger';

export interface ReportTemplate {
  id: string;
  name: string;
  category: TemplateCategory;
  thumbnail: string;
  description: string;
  features: string[];
  primaryColor: string;
  fontFamily: string;
  paperSize: string;
  showLogo: boolean;
  showPaymentInfo: boolean;
  showNotes: boolean;
  hasQrCode: boolean;
  hasSst: boolean;
  hasEInvoice: boolean;
}

export const templateCategories: { value: TemplateCategory; label: string }[] = [
  { value: 'sales_invoice', label: 'Sales Invoice' },
  { value: 'einvoice', label: 'E-Invoice' },
  { value: 'sales_quotation', label: 'Sales Quotation' },
  { value: 'sales_delivery_order', label: 'Sales Delivery Order' },
  { value: 'sales_order', label: 'Sales Order' },
  { value: 'sales_credit_note', label: 'Sales Credit Note' },
  { value: 'sales_debit_note', label: 'Sales Debit Note' },
  { value: 'purchase_invoice', label: 'Purchase Invoice' },
  { value: 'purchase_order', label: 'Purchase Order' },
  { value: 'purchase_debit_note', label: 'Purchase Debit Note' },
  { value: 'customer_statement', label: 'Customer Statement' },
  { value: 'customer_aging', label: 'Customer Aging' },
  { value: 'customer_payment', label: 'Customer Payment' },
  { value: 'payment_voucher', label: 'Payment Voucher' },
  { value: 'official_receipt', label: 'Official Receipt' },
  { value: 'cash_sales', label: 'Cash Sales' },
  { value: 'cheque_format', label: 'Cheque Format' },
  { value: 'goods_received', label: 'Goods Received' },
  { value: 'payslip', label: 'Payslip' },
  { value: 'stock_barcode', label: 'Stock Barcode' },
  { value: 'general_ledger', label: 'General Ledger' },
];

export const prebuiltTemplates: ReportTemplate[] = [
  // ── E-Invoice Templates (with QR Code) ──
  {
    id: 'einv-jompay2',
    name: 'Sales Invoice 7 — JomPAY 2',
    category: 'einvoice',
    thumbnail: 'https://cdn.sql.com.my/wp-content/uploads/2025/01/Sales-Invoice7-JomPay2.jpg',
    description: 'E-Invoice with JomPAY payment integration, QR code for LHDN validation, and dual payment options.',
    features: ['JomPAY', 'QR Code', 'E-Invoice', 'LHDN'],
    primaryColor: '#0d6efd', fontFamily: 'Inter', paperSize: 'A4',
    showLogo: true, showPaymentInfo: true, showNotes: true,
    hasQrCode: true, hasSst: false, hasEInvoice: true,
  },
  {
    id: 'einv-jompay1',
    name: 'Sales Invoice 7 — JomPAY 1',
    category: 'einvoice',
    thumbnail: 'https://cdn.sql.com.my/wp-content/uploads/2025/01/Sales-Invoice7-JomPay1.jpg',
    description: 'E-Invoice with JomPAY biller code and Ref-1 fields for bank payment.',
    features: ['JomPAY', 'QR Code', 'E-Invoice'],
    primaryColor: '#0d6efd', fontFamily: 'Inter', paperSize: 'A4',
    showLogo: true, showPaymentInfo: true, showNotes: true,
    hasQrCode: true, hasSst: false, hasEInvoice: true,
  },
  {
    id: 'einv-46-inv9-qr',
    name: '46 Sales Invoice 9 (QR Code)',
    category: 'einvoice',
    thumbnail: 'https://cdn.sql.com.my/wp-content/uploads/2025/01/46-Sales-Invoice-9-QR-Code.jpg',
    description: 'Full-featured e-invoice format with QR code, itemised lines and SST breakdown.',
    features: ['QR Code', 'E-Invoice', 'Itemised'],
    primaryColor: '#1a56db', fontFamily: 'Inter', paperSize: 'A4',
    showLogo: true, showPaymentInfo: true, showNotes: true,
    hasQrCode: true, hasSst: false, hasEInvoice: true,
  },
  {
    id: 'einv-46-inv8-sst-qr',
    name: '46 Sales Invoice 8 — SST SubTotal (QR)',
    category: 'einvoice',
    thumbnail: 'https://cdn.sql.com.my/wp-content/uploads/2025/01/46-Sales-Invoice-8-SST-1-SubTotal-QR-Code.jpg',
    description: 'SST invoice with subtotal breakdown and QR code for LHDN e-Invoice validation.',
    features: ['SST', 'QR Code', 'SubTotal', 'E-Invoice'],
    primaryColor: '#1a56db', fontFamily: 'Inter', paperSize: 'A4',
    showLogo: true, showPaymentInfo: true, showNotes: true,
    hasQrCode: true, hasSst: true, hasEInvoice: true,
  },
  {
    id: 'einv-46-inv4-simple-qr',
    name: '46 Sales Invoice 4 — Simple (QR)',
    category: 'einvoice',
    thumbnail: 'https://cdn.sql.com.my/wp-content/uploads/2025/01/46-Sales-Invoice-4-Simple-QR-Code.jpg',
    description: 'Clean, simple e-invoice layout with QR code. Minimal fields for straightforward billing.',
    features: ['Simple', 'QR Code', 'E-Invoice'],
    primaryColor: '#333333', fontFamily: 'Inter', paperSize: 'A4',
    showLogo: true, showPaymentInfo: false, showNotes: true,
    hasQrCode: true, hasSst: false, hasEInvoice: true,
  },
  {
    id: 'einv-46-inv2-qr',
    name: '46 Sales Invoice 2 (QR Code)',
    category: 'einvoice',
    thumbnail: 'https://cdn.sql.com.my/wp-content/uploads/2025/01/46-Sales-Invoice-2-QR-Code.jpg',
    description: 'Standard e-invoice with QR code, company header, and full line item details.',
    features: ['QR Code', 'E-Invoice', 'Standard'],
    primaryColor: '#1a56db', fontFamily: 'Inter', paperSize: 'A4',
    showLogo: true, showPaymentInfo: true, showNotes: true,
    hasQrCode: true, hasSst: false, hasEInvoice: true,
  },
  {
    id: 'einv-45-inv8-sst-sve-qr',
    name: '45 Sales Invoice 8 — SST SVE (QR)',
    category: 'einvoice',
    thumbnail: 'https://cdn.sql.com.my/wp-content/uploads/2025/01/45-Sales-Invoice-8-SST-1-SVE-QR-Code.jpg',
    description: 'SST Service Tax invoice variant with SVE classification and QR code.',
    features: ['SST', 'SVE', 'QR Code', 'E-Invoice'],
    primaryColor: '#1a56db', fontFamily: 'Inter', paperSize: 'A4',
    showLogo: true, showPaymentInfo: true, showNotes: true,
    hasQrCode: true, hasSst: true, hasEInvoice: true,
  },
  {
    id: 'einv-44-tax-summary-sst-qr',
    name: '44 Tax Invoice with Summary — SST (QR)',
    category: 'einvoice',
    thumbnail: 'https://cdn.sql.com.my/wp-content/uploads/2025/01/44-Tax-Invoice-with-Summary-SST-QR-Code.jpg',
    description: 'Tax invoice with summary section showing SST breakdown and QR code.',
    features: ['Tax Invoice', 'Summary', 'SST', 'QR Code'],
    primaryColor: '#1a56db', fontFamily: 'Inter', paperSize: 'A4',
    showLogo: true, showPaymentInfo: true, showNotes: true,
    hasQrCode: true, hasSst: true, hasEInvoice: true,
  },
  {
    id: 'einv-44-tax-summary-qr',
    name: '44 Tax Invoice with Summary (QR)',
    category: 'einvoice',
    thumbnail: 'https://cdn.sql.com.my/wp-content/uploads/2025/01/44-Tax-Invoice-with-Summary-QR-Code.jpg',
    description: 'Tax invoice with summary totals and LHDN QR code validation.',
    features: ['Tax Invoice', 'Summary', 'QR Code'],
    primaryColor: '#1a56db', fontFamily: 'Inter', paperSize: 'A4',
    showLogo: true, showPaymentInfo: true, showNotes: true,
    hasQrCode: true, hasSst: false, hasEInvoice: true,
  },
  {
    id: 'einv-43-tax-summary-sst-qr',
    name: '43 Tax Invoice with Summary — SST (QR)',
    category: 'einvoice',
    thumbnail: 'https://cdn.sql.com.my/wp-content/uploads/2025/01/43-Tax-Invoice-with-Summary-SST-QR-Code.jpg',
    description: 'Alternate tax invoice layout with SST summary and LHDN QR.',
    features: ['Tax Invoice', 'Summary', 'SST', 'QR Code'],
    primaryColor: '#0d47a1', fontFamily: 'Inter', paperSize: 'A4',
    showLogo: true, showPaymentInfo: true, showNotes: true,
    hasQrCode: true, hasSst: true, hasEInvoice: true,
  },
  {
    id: 'einv-43-tax-summary-qr',
    name: '43 Tax Invoice with Summary (QR)',
    category: 'einvoice',
    thumbnail: 'https://cdn.sql.com.my/wp-content/uploads/2025/01/43-Tax-Invoice-with-Summary-QR-Code.jpg',
    description: 'Clean tax invoice with summary section and QR code.',
    features: ['Tax Invoice', 'Summary', 'QR Code'],
    primaryColor: '#0d47a1', fontFamily: 'Inter', paperSize: 'A4',
    showLogo: true, showPaymentInfo: true, showNotes: true,
    hasQrCode: true, hasSst: false, hasEInvoice: true,
  },
  {
    id: 'einv-39-margin-scheme-qr',
    name: '39 Invoice Format 3 — Margin Scheme (QR)',
    category: 'einvoice',
    thumbnail: 'https://cdn.sql.com.my/wp-content/uploads/2025/01/39-Invoice-Format3-MarginScheme-QR-Code.jpg',
    description: 'Margin scheme invoice format with QR code for second-hand goods dealers.',
    features: ['Margin Scheme', 'QR Code', 'E-Invoice'],
    primaryColor: '#333333', fontFamily: 'Inter', paperSize: 'A4',
    showLogo: true, showPaymentInfo: false, showNotes: true,
    hasQrCode: true, hasSst: false, hasEInvoice: true,
  },

  // ── Sales Invoice Templates ──
  {
    id: 'sinv-classic-blue',
    name: 'Classic Blue Invoice',
    category: 'sales_invoice',
    thumbnail: '',
    description: 'Traditional professional invoice with blue header, company logo, and clean table layout.',
    features: ['Logo', 'Payment Terms', 'Tax Column'],
    primaryColor: '#1a56db', fontFamily: 'Inter', paperSize: 'A4',
    showLogo: true, showPaymentInfo: true, showNotes: true,
    hasQrCode: false, hasSst: false, hasEInvoice: false,
  },
  {
    id: 'sinv-modern-dark',
    name: 'Modern Dark Sidebar',
    category: 'sales_invoice',
    thumbnail: '',
    description: 'Contemporary design with dark sidebar for company info and orange accent totals.',
    features: ['Sidebar', 'Modern', 'Accent Totals'],
    primaryColor: '#1e293b', fontFamily: 'Inter', paperSize: 'A4',
    showLogo: true, showPaymentInfo: true, showNotes: true,
    hasQrCode: false, hasSst: false, hasEInvoice: false,
  },
  {
    id: 'sinv-sst-green',
    name: 'SST Tax Invoice — Green',
    category: 'sales_invoice',
    thumbnail: '',
    description: 'SST-compliant tax invoice with green accent, TIN, SST registration, and tax breakdown.',
    features: ['SST', 'TIN', 'Tax Breakdown'],
    primaryColor: '#16a34a', fontFamily: 'Inter', paperSize: 'A4',
    showLogo: true, showPaymentInfo: true, showNotes: true,
    hasQrCode: false, hasSst: true, hasEInvoice: false,
  },
  {
    id: 'sinv-simple-minimal',
    name: 'Simple Minimal',
    category: 'sales_invoice',
    thumbnail: '',
    description: 'Clean minimalist invoice with thin red accent line. Maximum whitespace, elegant typography.',
    features: ['Minimal', 'Elegant', 'Clean'],
    primaryColor: '#dc2626', fontFamily: 'Lato', paperSize: 'A4',
    showLogo: false, showPaymentInfo: false, showNotes: true,
    hasQrCode: false, hasSst: false, hasEInvoice: false,
  },
  {
    id: 'sinv-jompay-teal',
    name: 'Invoice with JomPAY — Teal',
    category: 'sales_invoice',
    thumbnail: '',
    description: 'Teal-themed invoice with JomPAY payment section showing biller code and reference fields.',
    features: ['JomPAY', 'Payment QR', 'Bank Details'],
    primaryColor: '#0d9488', fontFamily: 'Inter', paperSize: 'A4',
    showLogo: true, showPaymentInfo: true, showNotes: true,
    hasQrCode: true, hasSst: false, hasEInvoice: false,
  },
  {
    id: 'sinv-detailed-multi',
    name: 'Detailed Multi-Currency',
    category: 'sales_invoice',
    thumbnail: '',
    description: 'Invoice supporting multiple currencies with exchange rate display and dual-amount columns.',
    features: ['Multi-Currency', 'Exchange Rate', 'Dual Amount'],
    primaryColor: '#7c3aed', fontFamily: 'Inter', paperSize: 'A4',
    showLogo: true, showPaymentInfo: true, showNotes: true,
    hasQrCode: false, hasSst: false, hasEInvoice: false,
  },

  // ── Sales Quotation Templates ──
  {
    id: 'squot-professional',
    name: 'Professional Quotation',
    category: 'sales_quotation',
    thumbnail: '',
    description: 'Professional quotation with validity period, terms & conditions section, and signature line.',
    features: ['Validity Period', 'T&C Section', 'Signature'],
    primaryColor: '#1a56db', fontFamily: 'Inter', paperSize: 'A4',
    showLogo: true, showPaymentInfo: false, showNotes: true,
    hasQrCode: false, hasSst: false, hasEInvoice: false,
  },
  {
    id: 'squot-compact',
    name: 'Compact Quotation',
    category: 'sales_quotation',
    thumbnail: '',
    description: 'Space-efficient quotation fitting more items per page with condensed line spacing.',
    features: ['Compact', 'High Density', 'Clean'],
    primaryColor: '#333333', fontFamily: 'Inter', paperSize: 'A4',
    showLogo: true, showPaymentInfo: false, showNotes: true,
    hasQrCode: false, hasSst: false, hasEInvoice: false,
  },

  // ── Delivery Order Templates ──
  {
    id: 'sdo-standard',
    name: 'Standard Delivery Order',
    category: 'sales_delivery_order',
    thumbnail: '',
    description: 'Standard DO with delivery address, item list, received-by signature, and driver details.',
    features: ['Delivery Address', 'Signature', 'Driver Info'],
    primaryColor: '#1a56db', fontFamily: 'Inter', paperSize: 'A4',
    showLogo: true, showPaymentInfo: false, showNotes: true,
    hasQrCode: false, hasSst: false, hasEInvoice: false,
  },
  {
    id: 'sdo-with-photo',
    name: 'DO with Photo Placeholder',
    category: 'sales_delivery_order',
    thumbnail: '',
    description: 'Delivery order with item photo column for visual verification of delivered goods.',
    features: ['Photo Column', 'Visual', 'Verification'],
    primaryColor: '#0d9488', fontFamily: 'Inter', paperSize: 'A4',
    showLogo: true, showPaymentInfo: false, showNotes: true,
    hasQrCode: false, hasSst: false, hasEInvoice: false,
  },

  // ── Purchase Order Templates ──
  {
    id: 'po-standard',
    name: 'Standard Purchase Order',
    category: 'purchase_order',
    thumbnail: '',
    description: 'Standard PO with supplier details, delivery instructions, and approval section.',
    features: ['Supplier Info', 'Delivery Inst.', 'Approval'],
    primaryColor: '#1a56db', fontFamily: 'Inter', paperSize: 'A4',
    showLogo: true, showPaymentInfo: false, showNotes: true,
    hasQrCode: false, hasSst: false, hasEInvoice: false,
  },

  // ── Credit Note / Debit Note ──
  {
    id: 'scn-standard',
    name: 'Credit Note — Standard',
    category: 'sales_credit_note',
    thumbnail: '',
    description: 'Standard credit note referencing original invoice with reason for credit.',
    features: ['Invoice Ref', 'Reason', 'Standard'],
    primaryColor: '#dc2626', fontFamily: 'Inter', paperSize: 'A4',
    showLogo: true, showPaymentInfo: false, showNotes: true,
    hasQrCode: false, hasSst: false, hasEInvoice: false,
  },
  {
    id: 'sdn-standard',
    name: 'Debit Note — Standard',
    category: 'sales_debit_note',
    thumbnail: '',
    description: 'Standard debit note for additional charges with invoice reference.',
    features: ['Invoice Ref', 'Additional Charges'],
    primaryColor: '#ea580c', fontFamily: 'Inter', paperSize: 'A4',
    showLogo: true, showPaymentInfo: false, showNotes: true,
    hasQrCode: false, hasSst: false, hasEInvoice: false,
  },

  // ── Customer Statement ──
  {
    id: 'cstmt-standard',
    name: 'Customer Statement',
    category: 'customer_statement',
    thumbnail: '',
    description: 'Monthly statement showing all transactions, payments, and outstanding balance.',
    features: ['Aging Summary', 'Running Balance', 'Period Filter'],
    primaryColor: '#1a56db', fontFamily: 'Inter', paperSize: 'A4',
    showLogo: true, showPaymentInfo: true, showNotes: true,
    hasQrCode: false, hasSst: false, hasEInvoice: false,
  },

  // ── Payment Voucher ──
  {
    id: 'pv-standard',
    name: 'Payment Voucher',
    category: 'payment_voucher',
    thumbnail: '',
    description: 'Payment voucher with cheque details, approval signatures, and account allocation.',
    features: ['Cheque Details', 'Signatures', 'Account Code'],
    primaryColor: '#1a56db', fontFamily: 'Inter', paperSize: 'A4',
    showLogo: true, showPaymentInfo: true, showNotes: true,
    hasQrCode: false, hasSst: false, hasEInvoice: false,
  },

  // ── Official Receipt ──
  {
    id: 'or-standard',
    name: 'Official Receipt',
    category: 'official_receipt',
    thumbnail: '',
    description: 'Official receipt acknowledging payment received with payment method details.',
    features: ['Payment Method', 'Receipt No', 'Standard'],
    primaryColor: '#16a34a', fontFamily: 'Inter', paperSize: 'A4',
    showLogo: true, showPaymentInfo: true, showNotes: true,
    hasQrCode: false, hasSst: false, hasEInvoice: false,
  },

  // ── Payslip ──
  {
    id: 'payslip-standard',
    name: 'Employee Payslip — Standard',
    category: 'payslip',
    thumbnail: '',
    description: 'Standard payslip with earnings, deductions (EPF, SOCSO, EIS, PCB), and net pay.',
    features: ['EPF', 'SOCSO', 'EIS', 'PCB', 'Net Pay'],
    primaryColor: '#1a56db', fontFamily: 'Inter', paperSize: 'A4',
    showLogo: true, showPaymentInfo: false, showNotes: false,
    hasQrCode: false, hasSst: false, hasEInvoice: false,
  },
  {
    id: 'payslip-detailed',
    name: 'Employee Payslip — Detailed',
    category: 'payslip',
    thumbnail: '',
    description: 'Detailed payslip with YTD figures, leave balance, loan deductions, and overtime breakdown.',
    features: ['YTD', 'Leave Balance', 'Overtime', 'Loans'],
    primaryColor: '#0d47a1', fontFamily: 'Inter', paperSize: 'A4',
    showLogo: true, showPaymentInfo: false, showNotes: false,
    hasQrCode: false, hasSst: false, hasEInvoice: false,
  },

  // ── Cash Sales ──
  {
    id: 'csales-receipt',
    name: 'Cash Sales Receipt',
    category: 'cash_sales',
    thumbnail: '',
    description: 'Point-of-sale style cash sales receipt with payment method and change amount.',
    features: ['Cash', 'Change', 'Receipt Style'],
    primaryColor: '#333333', fontFamily: 'Inter', paperSize: 'A4',
    showLogo: true, showPaymentInfo: true, showNotes: false,
    hasQrCode: false, hasSst: false, hasEInvoice: false,
  },

  // ── Goods Received ──
  {
    id: 'grn-standard',
    name: 'Goods Received Note',
    category: 'goods_received',
    thumbnail: '',
    description: 'GRN with PO reference, received quantities, inspection notes, and warehouse allocation.',
    features: ['PO Reference', 'Inspection', 'Warehouse'],
    primaryColor: '#1a56db', fontFamily: 'Inter', paperSize: 'A4',
    showLogo: true, showPaymentInfo: false, showNotes: true,
    hasQrCode: false, hasSst: false, hasEInvoice: false,
  },
];
