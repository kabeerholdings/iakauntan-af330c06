/**
 * Utility functions for Credit/Debit Notes export, PDF, sharing
 */

export const exportNoteToCSV = (note: any, lines: any[], companyName: string) => {
  const headers = ['Description', 'Quantity', 'Unit Price', 'Discount %', 'Tax Rate %', 'Tax Amount', 'Line Total'];
  const rows = lines.map((l: any) => [
    l.description, l.quantity, l.unit_price, l.discount_rate || 0,
    l.tax_rate || 0, l.tax_amount || 0, l.line_total || 0,
  ]);
  const meta = [
    [`${note.note_type === 'sales' ? 'Credit' : 'Debit'} Note: ${note.note_number}`],
    [`Date: ${note.note_date}`],
    [`Company: ${companyName}`],
    [`Contact: ${note.contacts?.name || 'N/A'}`],
    [`Reason: ${note.reason || 'N/A'}`],
    [],
    headers,
    ...rows,
    [],
    ['', '', '', '', '', 'Subtotal', note.subtotal || 0],
    ['', '', '', '', '', 'Tax', note.tax_amount || 0],
    ['', '', '', '', '', 'Total', note.total_amount || 0],
  ];
  const csv = meta.map(r => r.join(',')).join('\n');
  const blob = new Blob([csv], { type: 'text/csv' });
  const url = URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.href = url;
  a.download = `${note.note_number}.csv`;
  a.click();
  URL.revokeObjectURL(url);
};

export const printNote = () => {
  window.print();
};

export const generatePublicLink = (noteId: string, noteType: 'credit' | 'debit') => {
  const base = window.location.origin;
  return `${base}/public/${noteType}-note/${noteId}`;
};

export const generatePDFFromPreview = (noteNumber: string) => {
  // Trigger browser print dialog which allows saving as PDF
  const printWindow = window.open('', '_blank');
  if (!printWindow) return;
  
  const previewEl = document.querySelector('[data-print-preview]');
  if (!previewEl) {
    window.print();
    return;
  }

  printWindow.document.write(`
    <!DOCTYPE html>
    <html>
    <head><title>${noteNumber}</title>
    <style>
      body { font-family: Inter, sans-serif; margin: 0; padding: 20px; }
      table { width: 100%; border-collapse: collapse; }
      th, td { padding: 8px; text-align: left; }
      th { border-bottom: 2px solid #e5e7eb; }
      td { border-bottom: 1px solid #f3f4f6; }
      .text-right { text-align: right; }
      @media print { body { padding: 0; } }
    </style>
    </head>
    <body>${previewEl.innerHTML}</body>
    </html>
  `);
  printWindow.document.close();
  printWindow.print();
};
