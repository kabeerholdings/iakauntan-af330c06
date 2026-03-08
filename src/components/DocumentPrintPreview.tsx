import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Button } from '@/components/ui/button';
import { Palette, Printer, Plus } from 'lucide-react';
import { useNavigate } from 'react-router-dom';

interface DocumentLine {
  id?: string;
  description: string;
  quantity: number;
  unit_price: number;
  tax_rate?: number;
  line_total: number;
}

interface PrintPreviewProps {
  open: boolean;
  onClose: () => void;
  documentType: 'INVOICE' | 'QUOTATION' | 'CREDIT NOTE' | 'DEBIT NOTE';
  documentNumber: string;
  documentDate: string;
  dueDate?: string;
  contactName?: string;
  lines: DocumentLine[];
  subtotal: number;
  taxAmount: number;
  totalAmount: number;
  notes?: string;
  currency?: string;
  template: any;
  templates: any[];
  company: any;
  onChangeTemplate: (tpl: any) => void;
  extraFields?: { label: string; value: string }[];
}

const DocumentPrintPreview = ({
  open, onClose, documentType, documentNumber, documentDate, dueDate,
  contactName, lines, subtotal, taxAmount, totalAmount, notes, currency = 'RM',
  template, templates, company, onChangeTemplate, extraFields,
}: PrintPreviewProps) => {
  const navigate = useNavigate();
  const c = template?.primary_color || '#1a56db';
  const font = template?.font_family || 'Inter';

  return (
    <Dialog open={open} onOpenChange={onClose}>
      <DialogContent className="max-w-3xl max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle className="font-display">
            {documentType} Preview — {documentNumber}
          </DialogTitle>
        </DialogHeader>

        <div className="flex items-center gap-3 p-3 bg-muted rounded-lg">
          <Palette className="h-4 w-4 text-muted-foreground" />
          <span className="text-sm text-muted-foreground">Template:</span>
          {templates.length > 0 ? (
            <Select
              value={template?.id || ''}
              onValueChange={v => {
                const tpl = templates.find(t => t.id === v);
                if (tpl) onChangeTemplate(tpl);
              }}
            >
              <SelectTrigger className="w-[220px] h-8"><SelectValue placeholder="Select template" /></SelectTrigger>
              <SelectContent>
                {templates.map(t => (
                  <SelectItem key={t.id} value={t.id}>
                    <div className="flex items-center gap-2">
                      <div className="w-3 h-3 rounded" style={{ backgroundColor: t.primary_color }} />
                      {t.template_name}
                    </div>
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          ) : (
            <Button variant="outline" size="sm" onClick={() => navigate('/dashboard/document-templates')}>
              <Plus className="h-3 w-3 mr-1" />Add Templates
            </Button>
          )}
          <Button variant="outline" size="sm" className="ml-auto" onClick={() => window.print()}>
            <Printer className="h-4 w-4 mr-1" />Print
          </Button>
        </div>

        <div className="border rounded-lg p-8 bg-background print:border-0 print:p-0" style={{ fontFamily: font }}>
          {/* Header */}
          <div className="flex justify-between items-start pb-4 mb-4" style={{ borderBottom: `3px solid ${c}` }}>
            <div>
              {template?.show_logo && (
                <div className="w-14 h-7 rounded mb-1.5 flex items-center justify-center text-xs font-bold text-primary-foreground" style={{ backgroundColor: c }}>
                  {company?.logo_url ? <img src={company.logo_url} alt="Logo" className="h-full" /> : 'LOGO'}
                </div>
              )}
              <h2 className="text-lg font-bold" style={{ color: c }}>{company?.name || 'Company Name'}</h2>
              <p className="text-xs text-muted-foreground">
                {[company?.address_line1, company?.address_line2, company?.city, company?.state, company?.postcode].filter(Boolean).join(', ')}
              </p>
              {company?.phone && <p className="text-xs text-muted-foreground">Tel: {company.phone}</p>}
              {company?.registration_no && <p className="text-xs text-muted-foreground">Reg No: {company.registration_no}</p>}
              {company?.tax_id && <p className="text-xs text-muted-foreground">Tax ID: {company.tax_id}</p>}
              {template?.header_html && <div className="mt-1 text-xs" dangerouslySetInnerHTML={{ __html: template.header_html }} />}
            </div>
            <div className="text-right">
              <h3 className="text-xl font-bold" style={{ color: c }}>{documentType}</h3>
              <div className="text-sm mt-2 space-y-0.5">
                <div><span className="text-muted-foreground">No:</span> <strong>{documentNumber}</strong></div>
                <div><span className="text-muted-foreground">Date:</span> {documentDate}</div>
                {dueDate && <div><span className="text-muted-foreground">Due:</span> {dueDate}</div>}
                {extraFields?.map((f, i) => (
                  <div key={i}><span className="text-muted-foreground">{f.label}:</span> {f.value}</div>
                ))}
              </div>
            </div>
          </div>

          {contactName && (
            <div className="mb-4">
              <p className="text-xs font-semibold text-muted-foreground mb-0.5">BILL TO:</p>
              <p className="text-sm font-medium">{contactName}</p>
            </div>
          )}

          <table className="w-full text-sm mb-4">
            <thead>
              <tr style={{ backgroundColor: c + '12' }}>
                <th className="text-left p-2 font-semibold" style={{ color: c }}>#</th>
                <th className="text-left p-2 font-semibold" style={{ color: c }}>Description</th>
                <th className="text-right p-2 font-semibold" style={{ color: c }}>Qty</th>
                <th className="text-right p-2 font-semibold" style={{ color: c }}>Unit Price</th>
                <th className="text-right p-2 font-semibold" style={{ color: c }}>Tax</th>
                <th className="text-right p-2 font-semibold" style={{ color: c }}>Amount ({currency})</th>
              </tr>
            </thead>
            <tbody>
              {lines.length === 0 ? (
                <tr><td colSpan={6} className="text-center p-4 text-muted-foreground text-xs">No line items</td></tr>
              ) : lines.map((line, i) => (
                <tr key={line.id || i} className="border-b border-muted">
                  <td className="p-2 text-muted-foreground">{i + 1}</td>
                  <td className="p-2">{line.description}</td>
                  <td className="text-right p-2">{line.quantity}</td>
                  <td className="text-right p-2">{Number(line.unit_price).toFixed(2)}</td>
                  <td className="text-right p-2 text-muted-foreground">{line.tax_rate ? `${line.tax_rate}%` : '—'}</td>
                  <td className="text-right p-2 font-medium">{Number(line.line_total).toFixed(2)}</td>
                </tr>
              ))}
            </tbody>
          </table>

          <div className="flex justify-end">
            <div className="space-y-0.5 min-w-[220px]">
              <div className="flex justify-between text-sm"><span className="text-muted-foreground">Subtotal:</span> <span>{currency} {Number(subtotal).toFixed(2)}</span></div>
              {Number(taxAmount) > 0 && (
                <div className="flex justify-between text-sm"><span className="text-muted-foreground">Tax:</span> <span>{currency} {Number(taxAmount).toFixed(2)}</span></div>
              )}
              <div className="flex justify-between text-sm font-bold pt-1 border-t" style={{ color: c, borderColor: c }}>
                <span>Total:</span> <span>{currency} {Number(totalAmount).toFixed(2)}</span>
              </div>
            </div>
          </div>

          {template?.show_payment_info && (
            <div className="mt-4 pt-3 border-t border-muted text-xs text-muted-foreground">
              <p className="font-semibold text-foreground">Payment Details:</p>
              <p>Please make payment to the account details provided by the company.</p>
            </div>
          )}

          {template?.show_notes && notes && (
            <div className="mt-3 text-xs text-muted-foreground">
              <p className="font-semibold text-foreground">Notes:</p>
              <p>{notes}</p>
            </div>
          )}

          {template?.footer_html && (
            <div className="mt-3 pt-2 border-t border-muted text-xs text-muted-foreground" dangerouslySetInnerHTML={{ __html: template.footer_html }} />
          )}
        </div>
      </DialogContent>
    </Dialog>
  );
};

export default DocumentPrintPreview;
