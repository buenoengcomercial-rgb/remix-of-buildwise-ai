import { useMemo, useState } from 'react';
import type { AppView, Project } from '@/types/project';
import {
  AlertTriangle,
  ArrowRight,
  CheckCircle2,
  CircleDollarSign,
  ClipboardCheck,
  FileWarning,
  Info,
  Package,
  ShieldCheck,
  Warehouse,
} from 'lucide-react';
import { Card } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { buildProjectCheckReport, formatProjectCheckBRL, type ProjectCheckSeverity } from '@/lib/projectCheck';

interface Props {
  project: Project;
  onNavigate: (view: AppView) => void;
}

type Filter = 'all' | Exclude<ProjectCheckSeverity, 'ok'>;

const SEVERITY_META: Record<ProjectCheckSeverity, { label: string; cls: string; icon: React.ElementType }> = {
  ok: {
    label: 'OK',
    cls: 'border-success/30 bg-success/10 text-success',
    icon: CheckCircle2,
  },
  info: {
    label: 'Acompanhar',
    cls: 'border-primary/25 bg-primary/10 text-primary',
    icon: Info,
  },
  warning: {
    label: 'Atenção',
    cls: 'border-warning/35 bg-warning/10 text-warning',
    icon: AlertTriangle,
  },
  critical: {
    label: 'Crítico',
    cls: 'border-destructive/35 bg-destructive/10 text-destructive',
    icon: FileWarning,
  },
};

const AREA_ICON: Record<string, React.ElementType> = {
  Contrato: ClipboardCheck,
  Aditivo: FileWarning,
  Medição: ClipboardCheck,
  'Custo Real': CircleDollarSign,
  'Lista de Material': Package,
  Almoxarifado: Warehouse,
  Cronograma: ShieldCheck,
};

function SeverityBadge({ severity }: { severity: ProjectCheckSeverity }) {
  const meta = SEVERITY_META[severity];
  const Icon = meta.icon;
  return (
    <span className={`inline-flex items-center gap-1.5 rounded-full border px-2 py-0.5 text-[11px] font-semibold ${meta.cls}`}>
      <Icon className="h-3 w-3" />
      {meta.label}
    </span>
  );
}

export default function ProjectCheck({ project, onNavigate }: Props) {
  const report = useMemo(() => buildProjectCheckReport(project), [project]);
  const [filter, setFilter] = useState<Filter>('all');
  const filteredIssues = filter === 'all'
    ? report.issues
    : report.issues.filter(issue => issue.severity === filter);

  const statusLabel = report.counts.critical > 0
    ? 'Revisar antes de avançar'
    : report.counts.warning > 0
      ? 'Operável com pendências'
      : 'Conferência saudável';

  return (
    <div className="mx-auto w-full max-w-[1500px] space-y-4 p-4 lg:p-6">
      <Card className="p-4">
        <div className="flex flex-col gap-3 lg:flex-row lg:items-start lg:justify-between">
          <div className="flex gap-3">
            <div className="flex h-11 w-11 items-center justify-center rounded-xl bg-primary/10 text-primary">
              <ShieldCheck className="h-5 w-5" />
            </div>
            <div>
              <p className="text-xs font-semibold uppercase tracking-wide text-muted-foreground">Diagnóstico operacional</p>
              <h1 className="text-2xl font-bold text-foreground">Conferência da Obra</h1>
              <p className="mt-1 max-w-3xl text-sm text-muted-foreground">
                Valida os principais vínculos entre Aditivo, Medição, Custo Real, Lista de Material, Almoxarifado e Cronograma. Esta tela aponta riscos; ela não corrige dados automaticamente.
              </p>
            </div>
          </div>
          <div className="rounded-xl border border-border bg-muted/30 px-4 py-3 text-right">
            <p className="text-xs text-muted-foreground">Status da leitura</p>
            <p className="font-semibold text-foreground">{statusLabel}</p>
            <p className="mt-1 text-[11px] text-muted-foreground">
              {new Date(report.generatedAt).toLocaleString('pt-BR')}
            </p>
          </div>
        </div>
      </Card>

      <div className="grid grid-cols-1 gap-3 md:grid-cols-2 xl:grid-cols-4">
        <Card className="p-4">
          <p className="text-[11px] font-semibold uppercase tracking-wide text-muted-foreground">Valor de referência</p>
          <p className="mt-1 text-xl font-bold text-primary">{formatProjectCheckBRL(report.totals.additiveFinal)}</p>
          <p className="mt-1 text-xs text-muted-foreground">Aditivo contratado/importado mais recente</p>
        </Card>
        <Card className="p-4">
          <p className="text-[11px] font-semibold uppercase tracking-wide text-muted-foreground">Custo real cotado</p>
          <p className="mt-1 text-xl font-bold text-warning">{formatProjectCheckBRL(report.totals.realCostQuoted)}</p>
          <p className="mt-1 text-xs text-muted-foreground">Menor cotação ou fornecedor escolhido</p>
        </Card>
        <Card className="p-4">
          <p className="text-[11px] font-semibold uppercase tracking-wide text-muted-foreground">Pedido confirmado</p>
          <p className="mt-1 text-xl font-bold text-primary">{formatProjectCheckBRL(report.totals.purchasedTotal)}</p>
          <p className="mt-1 text-xs text-muted-foreground">Compras parciais e totais da Lista de Material</p>
        </Card>
        <Card className="p-4">
          <p className="text-[11px] font-semibold uppercase tracking-wide text-muted-foreground">Recebido no almoxarifado</p>
          <p className="mt-1 text-xl font-bold text-success">{formatProjectCheckBRL(report.totals.receivedTotal)}</p>
          <p className="mt-1 text-xs text-muted-foreground">Entradas e devoluções registradas</p>
        </Card>
      </div>

      <div className="grid grid-cols-1 gap-3 md:grid-cols-2 xl:grid-cols-7">
        {report.cards.map(card => {
          const Icon = AREA_ICON[card.area] ?? ShieldCheck;
          return (
            <button
              key={card.area}
              type="button"
              onClick={() => onNavigate(card.targetView)}
              className="rounded-xl text-left transition hover:-translate-y-0.5 hover:shadow-md"
            >
              <Card className="h-full p-3">
                <div className="flex items-start justify-between gap-2">
                  <Icon className="mt-1 h-4 w-4 text-primary" />
                  <SeverityBadge severity={card.severity} />
                </div>
                <p className="mt-3 text-xs font-semibold uppercase tracking-wide text-muted-foreground">{card.title}</p>
                <p className="mt-1 text-lg font-bold tabular-nums text-foreground">{card.value}</p>
                <p className="mt-1 text-[11px] leading-snug text-muted-foreground">{card.helper}</p>
              </Card>
            </button>
          );
        })}
      </div>

      <Card className="p-4">
        <div className="flex flex-col gap-3 border-b border-border pb-3 lg:flex-row lg:items-center lg:justify-between">
          <div>
            <h2 className="text-lg font-bold text-foreground">Pendências encontradas</h2>
            <p className="text-sm text-muted-foreground">Comece pelas críticas; depois resolvemos avisos e organização fina.</p>
          </div>
          <div className="flex flex-wrap gap-2">
            {([
              ['all', 'Todas'],
              ['critical', `Críticas (${report.counts.critical})`],
              ['warning', `Avisos (${report.counts.warning})`],
              ['info', `Acompanhar (${report.counts.info})`],
            ] as const).map(([key, label]) => (
              <Button
                key={key}
                type="button"
                size="sm"
                variant={filter === key ? 'default' : 'outline'}
                onClick={() => setFilter(key)}
              >
                {label}
              </Button>
            ))}
          </div>
        </div>

        {filteredIssues.length === 0 ? (
          <div className="flex flex-col items-center justify-center py-12 text-center">
            <CheckCircle2 className="h-10 w-10 text-success" />
            <p className="mt-3 font-semibold text-foreground">Nada neste filtro.</p>
            <p className="text-sm text-muted-foreground">A obra não apresentou pendência nessa categoria.</p>
          </div>
        ) : (
          <div className="divide-y divide-border">
            {filteredIssues.map(issue => (
              <div key={issue.id} className="grid gap-3 py-4 lg:grid-cols-[150px_1fr_auto] lg:items-start">
                <div>
                  <p className="text-xs font-semibold uppercase tracking-wide text-muted-foreground">{issue.area}</p>
                  <div className="mt-1">
                    <SeverityBadge severity={issue.severity} />
                  </div>
                </div>
                <div>
                  <div className="flex flex-wrap items-center gap-2">
                    <h3 className="font-semibold text-foreground">{issue.title}</h3>
                    {issue.count != null && (
                      <span className="rounded-full bg-muted px-2 py-0.5 text-xs font-semibold text-muted-foreground">
                        {issue.count.toLocaleString('pt-BR')} item(ns)
                      </span>
                    )}
                    {issue.value && (
                      <span className="rounded-full bg-muted px-2 py-0.5 text-xs font-semibold text-muted-foreground">
                        Diferença {issue.value}
                      </span>
                    )}
                  </div>
                  <p className="mt-1 text-sm text-muted-foreground">{issue.description}</p>
                  <p className="mt-2 text-sm font-medium text-foreground">{issue.action}</p>
                </div>
                <Button type="button" variant="outline" size="sm" onClick={() => onNavigate(issue.targetView)}>
                  Abrir origem
                  <ArrowRight className="ml-2 h-3.5 w-3.5" />
                </Button>
              </div>
            ))}
          </div>
        )}
      </Card>
    </div>
  );
}
