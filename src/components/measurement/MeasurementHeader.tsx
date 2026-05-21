import { Button } from '@/components/ui/button';
import { ClipboardList, FileSpreadsheet, Printer, History, RefreshCw } from 'lucide-react';

interface MeasurementHeaderProps {
  undoButton?: React.ReactNode;
  onExportXLSX: () => void;
  onPrint: () => void;
  showHistory: boolean;
  onOpenHistory: () => void;
  onSyncWithGantt?: () => void;
}

export default function MeasurementHeader({
  undoButton,
  onExportXLSX,
  onPrint,
  showHistory,
  onOpenHistory,
  onSyncWithGantt,
}: MeasurementHeaderProps) {
  return (
    <div className="flex items-center justify-between flex-wrap gap-2 rounded-xl border border-border bg-card px-3 py-2 shadow-sm print:hidden">
      <div className="flex items-center gap-2.5">
        <div className="w-8 h-8 rounded-lg bg-primary/10 flex items-center justify-center">
          <ClipboardList className="w-4 h-4 text-primary" />
        </div>
        <div>
          <h1 className="text-lg font-bold leading-tight text-foreground">Medição</h1>
          <p className="text-[11px] text-muted-foreground">Planilha de medição para pagamento</p>
        </div>
      </div>
      <div className="flex flex-wrap items-center justify-end gap-1.5">
        {undoButton}
        {onSyncWithGantt && (
          <Button className="h-8" variant="outline" size="sm" onClick={onSyncWithGantt} title="Recalcular as datas das medições a partir da data inicial do Cronograma/Gantt">
            <RefreshCw className="w-4 h-4 mr-1" /> Sincronizar com Gantt
          </Button>
        )}
        <Button className="h-8" variant="outline" size="sm" onClick={onExportXLSX}>
          <FileSpreadsheet className="w-4 h-4 mr-1" /> Excel
        </Button>
        <Button className="h-8" variant="default" size="sm" onClick={onPrint}>
          <Printer className="w-4 h-4 mr-1" /> Imprimir / PDF
        </Button>
        {showHistory && (
          <Button className="h-8" variant="outline" size="sm" onClick={onOpenHistory}>
            <History className="w-4 h-4 mr-1" /> Histórico
          </Button>
        )}
      </div>
    </div>
  );
}
