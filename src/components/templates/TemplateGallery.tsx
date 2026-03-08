import { useState } from 'react';
import { Card, CardContent } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Input } from '@/components/ui/input';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Check, Eye, Search, QrCode, FileCheck, Receipt, Filter } from 'lucide-react';
import { prebuiltTemplates, templateCategories, type ReportTemplate } from '@/lib/report-templates';

interface TemplateGalleryProps {
  onSelectTemplate: (template: ReportTemplate) => void;
  selectedTemplateId?: string | null;
}

const TemplateGallery = ({ onSelectTemplate, selectedTemplateId }: TemplateGalleryProps) => {
  const [categoryFilter, setCategoryFilter] = useState<string>('all');
  const [search, setSearch] = useState('');
  const [previewTemplate, setPreviewTemplate] = useState<ReportTemplate | null>(null);

  const filtered = prebuiltTemplates.filter(t => {
    if (categoryFilter !== 'all' && t.category !== categoryFilter) return false;
    if (search && !t.name.toLowerCase().includes(search.toLowerCase()) && !t.description.toLowerCase().includes(search.toLowerCase())) return false;
    return true;
  });

  // Group by category for display
  const grouped = filtered.reduce((acc, t) => {
    const cat = templateCategories.find(c => c.value === t.category);
    const label = cat?.label || t.category;
    if (!acc[label]) acc[label] = [];
    acc[label].push(t);
    return acc;
  }, {} as Record<string, ReportTemplate[]>);

  return (
    <div className="space-y-4">
      {/* Filters */}
      <div className="flex flex-col sm:flex-row gap-3">
        <div className="relative flex-1">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
          <Input
            placeholder="Search templates..."
            value={search}
            onChange={e => setSearch(e.target.value)}
            className="pl-9"
          />
        </div>
        <Select value={categoryFilter} onValueChange={setCategoryFilter}>
          <SelectTrigger className="w-full sm:w-[220px]">
            <Filter className="h-4 w-4 mr-2" />
            <SelectValue placeholder="All Categories" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="all">All Categories</SelectItem>
            {templateCategories.map(c => (
              <SelectItem key={c.value} value={c.value}>{c.label}</SelectItem>
            ))}
          </SelectContent>
        </Select>
      </div>

      {/* Stats bar */}
      <div className="flex items-center gap-2 text-sm text-muted-foreground">
        <span>{filtered.length} template{filtered.length !== 1 ? 's' : ''}</span>
        <span>·</span>
        <span>{Object.keys(grouped).length} categor{Object.keys(grouped).length !== 1 ? 'ies' : 'y'}</span>
      </div>

      {/* Gallery */}
      <ScrollArea className="h-[600px] pr-2">
        {Object.entries(grouped).map(([catLabel, templates]) => (
          <div key={catLabel} className="mb-6">
            <h3 className="font-display font-semibold text-foreground mb-3 flex items-center gap-2">
              <Receipt className="h-4 w-4 text-primary" />
              {catLabel}
              <Badge variant="secondary" className="text-xs">{templates.length}</Badge>
            </h3>
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-4">
              {templates.map(t => (
                <TemplateCard
                  key={t.id}
                  template={t}
                  isSelected={selectedTemplateId === t.id}
                  onSelect={() => onSelectTemplate(t)}
                  onPreview={() => setPreviewTemplate(t)}
                />
              ))}
            </div>
          </div>
        ))}
        {filtered.length === 0 && (
          <div className="text-center py-12 text-muted-foreground">
            No templates match your search.
          </div>
        )}
      </ScrollArea>

      {/* Preview Dialog */}
      {previewTemplate && (
        <TemplatePreviewDialog
          template={previewTemplate}
          open={!!previewTemplate}
          onClose={() => setPreviewTemplate(null)}
          onSelect={() => {
            onSelectTemplate(previewTemplate);
            setPreviewTemplate(null);
          }}
          isSelected={selectedTemplateId === previewTemplate.id}
        />
      )}
    </div>
  );
};

// ─── Template Card ───
function TemplateCard({ template, isSelected, onSelect, onPreview }: {
  template: ReportTemplate;
  isSelected: boolean;
  onSelect: () => void;
  onPreview: () => void;
}) {
  return (
    <Card
      className={`group relative cursor-pointer transition-all duration-200 hover:shadow-lg border-2 ${
        isSelected ? 'border-primary shadow-md' : 'border-transparent hover:border-primary/30'
      }`}
      onClick={onSelect}
    >
      {isSelected && (
        <div className="absolute top-2 right-2 z-10 h-6 w-6 rounded-full bg-primary flex items-center justify-center">
          <Check className="h-4 w-4 text-primary-foreground" />
        </div>
      )}

      {/* Thumbnail / Preview */}
      <div className="aspect-[3/4] overflow-hidden rounded-t-lg bg-muted relative">
        {template.thumbnail ? (
          <img
            src={template.thumbnail}
            alt={template.name}
            className="w-full h-full object-cover object-top"
            loading="lazy"
          />
        ) : (
          <TemplatePreviewMini template={template} />
        )}
        {/* Overlay on hover */}
        <div className="absolute inset-0 bg-background/80 opacity-0 group-hover:opacity-100 transition-opacity flex items-center justify-center gap-2">
          <Button
            size="sm"
            variant="outline"
            onClick={(e) => { e.stopPropagation(); onPreview(); }}
          >
            <Eye className="h-4 w-4 mr-1" /> Preview
          </Button>
          <Button size="sm" onClick={(e) => { e.stopPropagation(); onSelect(); }}>
            <Check className="h-4 w-4 mr-1" /> {isSelected ? 'Selected' : 'Select'}
          </Button>
        </div>
      </div>

      <CardContent className="p-3">
        <h4 className="font-medium text-sm text-foreground truncate">{template.name}</h4>
        <div className="flex flex-wrap gap-1 mt-1.5">
          {template.hasEInvoice && (
            <Badge variant="default" className="text-[10px] px-1.5 py-0">
              <FileCheck className="h-3 w-3 mr-0.5" />E-Invoice
            </Badge>
          )}
          {template.hasQrCode && (
            <Badge variant="secondary" className="text-[10px] px-1.5 py-0">
              <QrCode className="h-3 w-3 mr-0.5" />QR
            </Badge>
          )}
          {template.hasSst && (
            <Badge variant="outline" className="text-[10px] px-1.5 py-0">SST</Badge>
          )}
        </div>
      </CardContent>
    </Card>
  );
}

// ─── Mini preview for templates without thumbnail images ───
function TemplatePreviewMini({ template }: { template: ReportTemplate }) {
  const c = template.primaryColor;
  return (
    <div className="w-full h-full p-3 flex flex-col text-[6px] leading-[8px] bg-background" style={{ fontFamily: template.fontFamily }}>
      {/* Header */}
      <div className="flex justify-between items-start mb-2 pb-1.5" style={{ borderBottom: `1.5px solid ${c}` }}>
        <div>
          {template.showLogo && <div className="w-8 h-3 rounded-sm mb-0.5" style={{ backgroundColor: c + '30' }} />}
          <div className="font-bold" style={{ color: c, fontSize: '8px' }}>Company Name</div>
          <div className="text-muted-foreground">123 Street, City</div>
        </div>
        <div className="text-right">
          <div className="font-bold" style={{ color: c, fontSize: '9px' }}>
            {templateCategories.find(tc => tc.value === template.category)?.label?.toUpperCase() || 'INVOICE'}
          </div>
          <div className="text-muted-foreground">#INV-0001</div>
          <div className="text-muted-foreground">{new Date().toLocaleDateString('en-MY')}</div>
        </div>
      </div>
      {/* Table */}
      <div className="flex-1">
        <div className="flex gap-1 py-0.5 font-semibold" style={{ backgroundColor: c + '12', color: c }}>
          <span className="flex-1 px-0.5">Description</span>
          <span className="w-6 text-right px-0.5">Qty</span>
          <span className="w-8 text-right px-0.5">Price</span>
          <span className="w-10 text-right px-0.5">Amount</span>
        </div>
        {[1, 2, 3].map(i => (
          <div key={i} className="flex gap-1 py-0.5 border-b border-muted">
            <span className="flex-1 px-0.5">Item {i}</span>
            <span className="w-6 text-right px-0.5">{i}</span>
            <span className="w-8 text-right px-0.5">{(i * 50).toFixed(0)}</span>
            <span className="w-10 text-right px-0.5">{(i * 50 * i).toFixed(0)}</span>
          </div>
        ))}
      </div>
      {/* Footer */}
      <div className="mt-auto pt-1 flex justify-between items-end">
        {template.hasQrCode && <div className="w-6 h-6 border border-muted rounded-sm flex items-center justify-center"><QrCode className="h-3 w-3 text-muted-foreground" /></div>}
        <div className="text-right ml-auto">
          <div className="text-muted-foreground">Subtotal: RM 400.00</div>
          {template.hasSst && <div className="text-muted-foreground">SST 6%: RM 24.00</div>}
          <div className="font-bold" style={{ color: c, fontSize: '7px' }}>Total: RM {template.hasSst ? '424.00' : '400.00'}</div>
        </div>
      </div>
    </div>
  );
}

// ─── Full Preview Dialog ───
function TemplatePreviewDialog({ template, open, onClose, onSelect, isSelected }: {
  template: ReportTemplate;
  open: boolean;
  onClose: () => void;
  onSelect: () => void;
  isSelected: boolean;
}) {
  const c = template.primaryColor;
  return (
    <Dialog open={open} onOpenChange={onClose}>
      <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle className="font-display flex items-center gap-2">
            {template.name}
            {isSelected && <Badge>Selected</Badge>}
          </DialogTitle>
        </DialogHeader>

        <p className="text-sm text-muted-foreground">{template.description}</p>

        <div className="flex flex-wrap gap-1.5 mb-2">
          {template.features.map(f => (
            <Badge key={f} variant="secondary" className="text-xs">{f}</Badge>
          ))}
        </div>

        {/* Full preview */}
        {template.thumbnail ? (
          <div className="border rounded-lg overflow-hidden">
            <img src={template.thumbnail} alt={template.name} className="w-full" />
          </div>
        ) : (
          <div className="border rounded-lg p-8 bg-background" style={{ fontFamily: template.fontFamily }}>
            {/* Header */}
            <div className="flex justify-between items-start pb-4 mb-4" style={{ borderBottom: `3px solid ${c}` }}>
              <div>
                {template.showLogo && (
                  <div className="w-16 h-8 rounded mb-2 flex items-center justify-center text-xs font-bold text-primary-foreground" style={{ backgroundColor: c }}>LOGO</div>
                )}
                <h2 className="text-lg font-bold" style={{ color: c }}>Your Company Sdn Bhd</h2>
                <p className="text-xs text-muted-foreground">No. 123, Jalan Example 1/2<br/>47301 Petaling Jaya, Selangor</p>
                <p className="text-xs text-muted-foreground">Tel: 03-1234 5678 | Email: info@company.com</p>
                {template.hasSst && <p className="text-xs text-muted-foreground mt-1">SST Reg No: W10-1234-56789012</p>}
                {template.hasEInvoice && <p className="text-xs text-muted-foreground">TIN: C12345678000</p>}
              </div>
              <div className="text-right">
                <h3 className="text-xl font-bold" style={{ color: c }}>
                  {templateCategories.find(tc => tc.value === template.category)?.label?.toUpperCase() || 'INVOICE'}
                </h3>
                <div className="text-sm mt-2 space-y-0.5">
                  <div><span className="text-muted-foreground">Doc No:</span> <strong>INV-2026-0001</strong></div>
                  <div><span className="text-muted-foreground">Date:</span> 08/03/2026</div>
                  <div><span className="text-muted-foreground">Terms:</span> Net 30</div>
                  {template.hasEInvoice && <div><span className="text-muted-foreground">UUID:</span> <span className="text-xs font-mono">ABC123-DEF456</span></div>}
                </div>
              </div>
            </div>

            {/* Bill To */}
            <div className="mb-4">
              <p className="text-xs font-semibold text-muted-foreground mb-1">BILL TO:</p>
              <p className="text-sm font-medium">Customer Name Sdn Bhd</p>
              <p className="text-xs text-muted-foreground">No. 456, Jalan Customer, 50000 Kuala Lumpur</p>
            </div>

            {/* Table */}
            <table className="w-full text-sm mb-4">
              <thead>
                <tr style={{ backgroundColor: c + '15' }}>
                  <th className="text-left p-2 font-semibold" style={{ color: c }}>#</th>
                  <th className="text-left p-2 font-semibold" style={{ color: c }}>Description</th>
                  {template.hasEInvoice && <th className="text-center p-2 font-semibold" style={{ color: c }}>Class.</th>}
                  <th className="text-right p-2 font-semibold" style={{ color: c }}>Qty</th>
                  <th className="text-right p-2 font-semibold" style={{ color: c }}>Unit Price</th>
                  {template.hasSst && <th className="text-right p-2 font-semibold" style={{ color: c }}>Tax</th>}
                  <th className="text-right p-2 font-semibold" style={{ color: c }}>Amount (RM)</th>
                </tr>
              </thead>
              <tbody>
                {[
                  { desc: 'Web Development Service', qty: 1, price: 5000 },
                  { desc: 'UI/UX Design Package', qty: 1, price: 3000 },
                  { desc: 'Cloud Hosting (Annual)', qty: 12, price: 150 },
                ].map((item, i) => (
                  <tr key={i} className="border-b border-muted">
                    <td className="p-2 text-muted-foreground">{i + 1}</td>
                    <td className="p-2">{item.desc}</td>
                    {template.hasEInvoice && <td className="text-center p-2 text-xs text-muted-foreground">022</td>}
                    <td className="text-right p-2">{item.qty}</td>
                    <td className="text-right p-2">{item.price.toFixed(2)}</td>
                    {template.hasSst && <td className="text-right p-2 text-muted-foreground">6%</td>}
                    <td className="text-right p-2 font-medium">{(item.qty * item.price).toFixed(2)}</td>
                  </tr>
                ))}
              </tbody>
            </table>

            {/* Totals */}
            <div className="flex justify-between items-end">
              <div>
                {template.hasQrCode && (
                  <div className="flex items-center gap-2">
                    <div className="w-16 h-16 border-2 border-muted rounded flex items-center justify-center">
                      <QrCode className="h-8 w-8 text-muted-foreground" />
                    </div>
                    {template.hasEInvoice && (
                      <div className="text-xs text-muted-foreground">
                        <div>Scan to verify</div>
                        <div>e-Invoice on LHDN</div>
                      </div>
                    )}
                  </div>
                )}
              </div>
              <div className="text-right space-y-0.5 min-w-[200px]">
                <div className="flex justify-between text-sm"><span className="text-muted-foreground">Subtotal:</span> <span>9,800.00</span></div>
                {template.hasSst && <div className="flex justify-between text-sm"><span className="text-muted-foreground">SST (6%):</span> <span>588.00</span></div>}
                <div className="flex justify-between text-sm font-bold pt-1 border-t" style={{ color: c, borderColor: c }}>
                  <span>Total:</span> <span>{template.hasSst ? '10,388.00' : '9,800.00'}</span>
                </div>
              </div>
            </div>

            {/* Payment Info */}
            {template.showPaymentInfo && (
              <div className="mt-4 pt-3 border-t border-muted text-xs text-muted-foreground">
                <p className="font-semibold text-foreground">Payment Details:</p>
                <p>Bank: Maybank | Acc: 5123-4567-8901 | Your Company Sdn Bhd</p>
              </div>
            )}

            {/* Notes */}
            {template.showNotes && (
              <div className="mt-3 text-xs text-muted-foreground">
                <p className="font-semibold text-foreground">Notes:</p>
                <p>Thank you for your business. Payment is due within 30 days.</p>
              </div>
            )}
          </div>
        )}

        {/* Template Info */}
        <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 text-xs mt-2">
          <div className="bg-muted rounded-md p-2">
            <span className="text-muted-foreground">Color</span>
            <div className="flex items-center gap-1.5 mt-0.5">
              <div className="w-3 h-3 rounded" style={{ backgroundColor: c }} />
              <span className="font-mono">{c}</span>
            </div>
          </div>
          <div className="bg-muted rounded-md p-2">
            <span className="text-muted-foreground">Font</span>
            <div className="mt-0.5 font-medium">{template.fontFamily}</div>
          </div>
          <div className="bg-muted rounded-md p-2">
            <span className="text-muted-foreground">Paper</span>
            <div className="mt-0.5 font-medium">{template.paperSize}</div>
          </div>
          <div className="bg-muted rounded-md p-2">
            <span className="text-muted-foreground">Category</span>
            <div className="mt-0.5 font-medium">{templateCategories.find(tc => tc.value === template.category)?.label}</div>
          </div>
        </div>

        <Button onClick={onSelect} className="w-full mt-2">
          {isSelected ? (
            <><Check className="h-4 w-4 mr-2" />Currently Selected</>
          ) : (
            <><Check className="h-4 w-4 mr-2" />Use This Template</>
          )}
        </Button>
      </DialogContent>
    </Dialog>
  );
}

export default TemplateGallery;
