import { Badge } from '@/components/ui/badge';

const statusConfig: Record<string, { variant: 'default' | 'secondary' | 'destructive' | 'outline'; label: string }> = {
  draft: { variant: 'secondary', label: 'Draft' },
  posted: { variant: 'default', label: 'Posted' },
  applied: { variant: 'outline', label: 'Applied' },
  partially_applied: { variant: 'outline', label: 'Partially Applied' },
  refunded: { variant: 'destructive', label: 'Refunded' },
  converted: { variant: 'default', label: 'Converted' },
  void: { variant: 'destructive', label: 'Void' },
};

const NoteStatusBadge = ({ status }: { status: string }) => {
  const cfg = statusConfig[status] || { variant: 'secondary' as const, label: status };
  return <Badge variant={cfg.variant}>{cfg.label}</Badge>;
};

export default NoteStatusBadge;
