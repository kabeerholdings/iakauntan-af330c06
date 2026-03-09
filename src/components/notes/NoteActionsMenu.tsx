import { Button } from '@/components/ui/button';
import {
  DropdownMenu, DropdownMenuContent, DropdownMenuItem,
  DropdownMenuSeparator, DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';
import { MoreHorizontal, Eye, Printer, Download, Mail, Link2, ArrowRightLeft, CreditCard, RotateCcw, CheckCircle, XCircle } from 'lucide-react';

interface NoteActionsMenuProps {
  note: any;
  noteKind: 'credit' | 'debit';
  onPreview: () => void;
  onDownloadPDF: () => void;
  onExportCSV: () => void;
  onEmail: () => void;
  onShareLink: () => void;
  onConvert: () => void;
  onApplyAsPayment: () => void;
  onRefund: () => void;
  onChangeStatus: (status: string) => void;
}

const NoteActionsMenu = ({
  note, noteKind, onPreview, onDownloadPDF, onExportCSV,
  onEmail, onShareLink, onConvert, onApplyAsPayment, onRefund, onChangeStatus,
}: NoteActionsMenuProps) => {
  const isVoid = note.status === 'void';

  return (
    <DropdownMenu>
      <DropdownMenuTrigger asChild>
        <Button variant="ghost" size="icon" className="h-8 w-8"><MoreHorizontal className="h-4 w-4" /></Button>
      </DropdownMenuTrigger>
      <DropdownMenuContent align="end" className="w-52">
        <DropdownMenuItem onClick={onPreview}><Eye className="h-4 w-4 mr-2" />Preview</DropdownMenuItem>
        <DropdownMenuItem onClick={onDownloadPDF}><Printer className="h-4 w-4 mr-2" />Print / Download PDF</DropdownMenuItem>
        <DropdownMenuItem onClick={onExportCSV}><Download className="h-4 w-4 mr-2" />Export CSV</DropdownMenuItem>
        <DropdownMenuSeparator />
        <DropdownMenuItem onClick={onEmail}><Mail className="h-4 w-4 mr-2" />Email to {noteKind === 'credit' ? 'Customer' : 'Vendor'}</DropdownMenuItem>
        <DropdownMenuItem onClick={onShareLink}><Link2 className="h-4 w-4 mr-2" />Copy Public Link</DropdownMenuItem>
        <DropdownMenuSeparator />
        {noteKind === 'credit' && !isVoid && (
          <>
            <DropdownMenuItem onClick={onApplyAsPayment}><CreditCard className="h-4 w-4 mr-2" />Apply as Invoice Payment</DropdownMenuItem>
            <DropdownMenuItem onClick={onRefund}><RotateCcw className="h-4 w-4 mr-2" />Make Refund</DropdownMenuItem>
            <DropdownMenuItem onClick={onConvert}><ArrowRightLeft className="h-4 w-4 mr-2" />Convert to Invoice</DropdownMenuItem>
          </>
        )}
        {noteKind === 'debit' && !isVoid && (
          <DropdownMenuItem onClick={onConvert}><ArrowRightLeft className="h-4 w-4 mr-2" />Convert to Bill</DropdownMenuItem>
        )}
        <DropdownMenuSeparator />
        {note.status === 'draft' && (
          <DropdownMenuItem onClick={() => onChangeStatus('posted')}><CheckCircle className="h-4 w-4 mr-2" />Post Note</DropdownMenuItem>
        )}
        {!isVoid && (
          <DropdownMenuItem onClick={() => onChangeStatus('void')} className="text-destructive"><XCircle className="h-4 w-4 mr-2" />Void Note</DropdownMenuItem>
        )}
      </DropdownMenuContent>
    </DropdownMenu>
  );
};

export default NoteActionsMenu;
