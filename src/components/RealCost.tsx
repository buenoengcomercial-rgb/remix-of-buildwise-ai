import { useMemo, useState } from 'react';
import type { Project } from '@/types/project';
import {
  AlertTriangle,
  BarChart3,
  CheckCircle2,
  CircleDollarSign,
  Layers3,
  Search,
  TrendingDown,
  TrendingUp,
} from 'lucide-react';
import { Card } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { buildRealCostAnalysis, type RealCostCompositionRow, type RealCostSignal } from '@/lib/realCost';
import { fmtBRL, fmtPct } from '@/components/measurement/measurementFormat';
import { loadObraConfig } from '@/components/ConfiguracaoObra';

interface Props {
  project: Project;
}

const SIGNAL_META: Record<RealCostSignal, { label: string; cls: string; dot: string }> = {
  healthy: {
    label: 'Saudavel',
    cls: 'border-success/35 bg-success/10 text-success',
    dot: 'bg-success',
  },
  attention: {
    label: 'Atencao',
    cls: 'border-warning/40 bg-warning/10 text-warning',
    dot: 'bg-warning',
  },
  danger: {
    label: 'Critico',
    cls: 'border-destructive/35 bg-destructive/10 text-destructive',
    dot: 'bg-destructive',
  },
  incomplete: {
    label: 'Incompleto',
    cls: 'border-border bg-muted text-muted-foreground',
    dot: 'bg-muted-foreground',
  },
};

function SignalBadge({ signal }: { signal: RealCostSignal }) {
  const meta = SIGNAL_META[signal];
  return (
    <span className={`inline-flex items-center gap-1.5 rounded-full border px-2 py-0.5 text-[10px] font-semibold ${meta.cls}`}>
      <span className={`h-2 w-2 rounded-full ${meta.dot}`} />
      {meta.label}
    </span>
  );
}

function StatCard({
  label,
  value,
  hint,
  tone = 'default',
  icon: Icon,
}: {
  label: string;
  value: string;
  hint?: string;
  tone?: 'default' | 'success' | 'warning' | 'danger';
  icon: React.ElementType;
}) {
  const toneClass =
    tone === 'success' ? 'text-success' :
    tone === 'warning' ? 'text-warning' :
    tone === 'danger' ? 'text-destructive' :
    'text-primary';
  return (
    <Card className="p-3">
      <div className="flex items-start justify-between gap-3">
        <div>
          <p className="text-[10px] font-semibold uppercase tracking-wide text-muted-foreground">{label}</p>
          <p className={`mt-1 text-lg font-bold ${toneClass}`}>{value}</p>
          {hint && <p className="mt-1 text-[11px] text-muted-foreground">{hint}</p>}
        </div>
        <Icon className={`mt-0.5 h-4 w-4 ${toneClass}`} />
      </div>
    </Card>
  );
}

function PendingPill({ label, value }: { label: string; value: number }) {
  const hasIssue = value > 0;
  return (
    <div className={`rounded-lg border px-3 py-2 ${hasIssue ? 'border-warning/35 bg-warning/10' : 'border-success/30 bg-success/10'}`}>
      <p className={`text-base font-bold ${hasIssue ? 'text-warning' : 'text-success'}`}>{value}</p>
      <p className="text-[10px] font-medium text-muted-foreground">{label}</p>
    </div>
  );
}

function marginTone(value: number) {
  if (value < 0) return 'text-destructive';
  if (value < 5) return 'text-destructive';
  if (value < 15) return 'text-warning';
  return 'text-success';
}

export default function RealCost({ project }: Props) {
  const trabalhaSabado = useMemo(() => loadObraConfig().trabalhaSabado, []);
  const analysis = useMemo(() => buildRealCostAnalysis(project, trabalhaSabado), [project, trabalhaSabado]);
  const [search, setSearch] = useState('');
  const [statusFilter, setStatusFilter] = useState<'all' | RealCostSignal>('all');
  const [chapterFilter, setChapterFilter] = useState('all');
  const [selectedId, setSelectedId] = useState<string | null>(null);

  const filteredCompositions = useMemo(() => {
    const q = search.trim().toLowerCase();
    return analysis.compositions.filter(row => {
      if (statusFilter !== 'all' && row.signal !== statusFilter) return false;
      if (chapterFilter !== 'all' && row.chapterId !== chapterFilter) return false;
      if (!q) return true;
      const blob = `${row.item} ${row.code ?? ''} ${row.description} ${row.chapter} ${row.sourceName}`.toLowerCase();
      return blob.includes(q);
    });
  }, [analysis.compositions, chapterFilter, search, statusFilter]);

  const selected = useMemo<RealCostCompositionRow | null>(
    () => analysis.compositions.find(row => row.id === selectedId) ?? null,
    [analysis.compositions, selectedId],
  );

  const maxMonthValue = Math.max(1, ...analysis.months.map(month => Math.max(month.contractedValue, month.realCost)));

  return (
    <div className="p-4 lg:p-6 space-y-4 max-w-[1700px] mx-auto">
      <header className="flex flex-wrap items-start justify-between gap-3">
        <div>
          <div className="flex items-center gap-2">
            <CircleDollarSign className="h-5 w-5 text-primary" />
            <h1 className="text-xl font-bold text-foreground">Custo real de obra</h1>
          </div>
          <p className="mt-1 max-w-3xl text-xs text-muted-foreground">
            Controle interno de margem: compara o valor contratado com BDI contra o custo real cotado na Lista de Material.
            Esta tela nao altera Medicao, Aditivo, Cronograma, Lista de Material ou Almoxarifado.
          </p>
        </div>
        <SignalBadge signal={analysis.totals.signal} />
      </header>

      <section className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-5 gap-3">
        <StatCard
          label="Valor contratado"
          value={fmtBRL(analysis.totals.contractedValue)}
          hint="Receita com BDI"
          icon={CircleDollarSign}
        />
        <StatCard
          label="Custo real cotado"
          value={fmtBRL(analysis.totals.realCost)}
          hint="Menor cotacao por insumo"
          icon={BarChart3}
          tone="warning"
        />
        <StatCard
          label="Lucro bruto estimado"
          value={fmtBRL(analysis.totals.grossProfit)}
          hint="Contrato - custo cotado"
          icon={analysis.totals.grossProfit >= 0 ? TrendingUp : TrendingDown}
          tone={analysis.totals.grossProfit >= 0 ? 'success' : 'danger'}
        />
        <StatCard
          label="Margem estimada"
          value={fmtPct(analysis.totals.marginPct)}
          hint="Semaforo por composicao"
          icon={analysis.totals.marginPct >= 15 ? CheckCircle2 : AlertTriangle}
          tone={analysis.totals.marginPct >= 15 ? 'success' : analysis.totals.marginPct >= 5 ? 'warning' : 'danger'}
        />
        <Card className="p-3">
          <p className="text-[10px] font-semibold uppercase tracking-wide text-muted-foreground">Pendencias</p>
          <div className="mt-2 grid grid-cols-2 gap-1.5">
            <PendingPill label="sem cotacao" value={analysis.pending.inputsWithoutQuote} />
            <PendingPill label="sem analitica" value={analysis.pending.compositionsWithoutAnalytic} />
          </div>
        </Card>
      </section>

      <section className="grid grid-cols-1 lg:grid-cols-5 gap-3">
        <Card className="lg:col-span-2 p-3">
          <div className="flex items-center justify-between gap-2">
            <div>
              <h2 className="text-sm font-semibold">Confiabilidade da leitura</h2>
              <p className="text-[11px] text-muted-foreground">Pendencias que podem deixar a margem incompleta.</p>
            </div>
            <AlertTriangle className="h-4 w-4 text-warning" />
          </div>
          <div className="mt-3 grid grid-cols-2 md:grid-cols-5 lg:grid-cols-2 xl:grid-cols-5 gap-2">
            <PendingPill label="insumos sem cotacao" value={analysis.pending.inputsWithoutQuote} />
            <PendingPill label="composicoes sem analitica" value={analysis.pending.compositionsWithoutAnalytic} />
            <PendingPill label="sem vinculo no Gantt" value={analysis.pending.itemsWithoutScheduleLink} />
            <PendingPill label="sem valor contratado" value={analysis.pending.itemsWithoutContractValue} />
            <PendingPill label="margem incompleta" value={analysis.pending.incompleteCompositions} />
          </div>
        </Card>

        <Card className="lg:col-span-3 p-3">
          <div className="flex items-center justify-between gap-2">
            <div>
              <h2 className="text-sm font-semibold">Visao mensal pelo Cronograma</h2>
              <p className="text-[11px] text-muted-foreground">Distribuicao estimada pelo periodo das tarefas no Gantt.</p>
            </div>
            <Layers3 className="h-4 w-4 text-primary" />
          </div>
          {analysis.months.length === 0 ? (
            <div className="mt-4 rounded-lg border border-dashed border-border p-5 text-center text-xs text-muted-foreground">
              Vincule composicoes ao cronograma para ver a distribuicao mensal.
            </div>
          ) : (
            <div className="mt-3 max-h-56 overflow-auto pr-1">
              <table className="w-full text-xs">
                <thead className="sticky top-0 bg-card">
                  <tr className="border-b border-border text-muted-foreground">
                    <th className="py-1.5 text-left">Mes</th>
                    <th className="py-1.5 text-right">Receita</th>
                    <th className="py-1.5 text-right">Custo</th>
                    <th className="py-1.5 text-right">Lucro</th>
                    <th className="py-1.5 text-right">Margem</th>
                    <th className="py-1.5 text-left">Leitura</th>
                  </tr>
                </thead>
                <tbody>
                  {analysis.months.map(month => (
                    <tr key={month.key} className="border-b border-border/60">
                      <td className="py-2 font-medium">{month.label}</td>
                      <td className="py-2 text-right tabular-nums">{fmtBRL(month.contractedValue)}</td>
                      <td className="py-2 text-right tabular-nums">{fmtBRL(month.realCost)}</td>
                      <td className={`py-2 text-right tabular-nums font-semibold ${month.grossProfit >= 0 ? 'text-success' : 'text-destructive'}`}>
                        {fmtBRL(month.grossProfit)}
                      </td>
                      <td className={`py-2 text-right tabular-nums font-semibold ${marginTone(month.marginPct)}`}>{fmtPct(month.marginPct)}</td>
                      <td className="py-2">
                        <div className="h-2 w-full rounded-full bg-muted overflow-hidden">
                          <div
                            className="h-2 rounded-full bg-primary/70"
                            style={{ width: `${Math.max(2, (month.contractedValue / maxMonthValue) * 100)}%` }}
                          />
                        </div>
                        <div className="mt-1 h-2 w-full rounded-full bg-muted overflow-hidden">
                          <div
                            className="h-2 rounded-full bg-warning/80"
                            style={{ width: `${Math.max(2, (month.realCost / maxMonthValue) * 100)}%` }}
                          />
                        </div>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </Card>
      </section>

      <section className="grid grid-cols-1 xl:grid-cols-[1fr_420px] gap-3">
        <div className="space-y-3">
          <Card className="p-3">
            <div className="flex flex-wrap items-center justify-between gap-2">
              <div>
                <h2 className="text-sm font-semibold">Resumo por capitulo</h2>
                <p className="text-[11px] text-muted-foreground">Margem consolidada por frente/capitulo da obra.</p>
              </div>
              <div className="flex flex-wrap gap-2">
                <div className="relative">
                  <Search className="absolute left-2 top-1/2 h-3.5 w-3.5 -translate-y-1/2 text-muted-foreground" />
                  <Input
                    value={search}
                    onChange={event => setSearch(event.target.value)}
                    placeholder="Buscar composicao..."
                    className="h-8 w-64 pl-7 text-xs"
                  />
                </div>
                <select
                  value={chapterFilter}
                  onChange={event => setChapterFilter(event.target.value)}
                  className="h-8 rounded-md border border-border bg-background px-2 text-xs"
                >
                  <option value="all">Todos os capitulos</option>
                  {analysis.chapters.map(chapter => (
                    <option key={chapter.id} value={chapter.id}>{chapter.chapter}</option>
                  ))}
                </select>
                <select
                  value={statusFilter}
                  onChange={event => setStatusFilter(event.target.value as typeof statusFilter)}
                  className="h-8 rounded-md border border-border bg-background px-2 text-xs"
                >
                  <option value="all">Todos os status</option>
                  <option value="healthy">Margem saudavel</option>
                  <option value="attention">Atencao</option>
                  <option value="danger">Critico</option>
                  <option value="incomplete">Incompleto</option>
                </select>
              </div>
            </div>

            <div className="mt-3 overflow-auto rounded-lg border border-border">
              <table className="w-full min-w-[900px] text-xs">
                <thead className="bg-muted text-muted-foreground">
                  <tr>
                    <th className="p-2 text-left">Capitulo</th>
                    <th className="p-2 text-right">Valor contratado</th>
                    <th className="p-2 text-right">Custo real cotado</th>
                    <th className="p-2 text-right">Lucro bruto</th>
                    <th className="p-2 text-right">Margem</th>
                    <th className="p-2 text-center">Pendencias</th>
                    <th className="p-2 text-left">Semaforo</th>
                  </tr>
                </thead>
                <tbody>
                  {analysis.chapters.map(chapter => (
                    <tr key={chapter.id} className="border-t border-border">
                      <td className="p-2 font-medium">{chapter.chapter}</td>
                      <td className="p-2 text-right tabular-nums">{fmtBRL(chapter.contractedValue)}</td>
                      <td className="p-2 text-right tabular-nums">{fmtBRL(chapter.realCost)}</td>
                      <td className={`p-2 text-right tabular-nums font-semibold ${chapter.grossProfit >= 0 ? 'text-success' : 'text-destructive'}`}>
                        {fmtBRL(chapter.grossProfit)}
                      </td>
                      <td className={`p-2 text-right tabular-nums font-semibold ${marginTone(chapter.marginPct)}`}>{fmtPct(chapter.marginPct)}</td>
                      <td className="p-2 text-center">{chapter.pendingCompositionCount}</td>
                      <td className="p-2"><SignalBadge signal={chapter.signal} /></td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </Card>

          <Card className="overflow-hidden">
            <div className="border-b border-border bg-muted/30 px-3 py-2">
              <h2 className="text-sm font-semibold">Composicoes</h2>
              <p className="text-[11px] text-muted-foreground">
                Clique em uma composicao para ver os insumos, fornecedores e pendencias.
              </p>
            </div>
            <div className="max-h-[560px] overflow-auto">
              <table className="w-full min-w-[1050px] text-xs">
                <thead className="sticky top-0 z-10 bg-muted text-muted-foreground">
                  <tr>
                    <th className="p-2 text-left w-24">Item</th>
                    <th className="p-2 text-left">Descricao</th>
                    <th className="p-2 text-right w-24">Qtd.</th>
                    <th className="p-2 text-right w-32">Contrato</th>
                    <th className="p-2 text-right w-32">Custo real</th>
                    <th className="p-2 text-right w-32">Lucro</th>
                    <th className="p-2 text-right w-24">Margem</th>
                    <th className="p-2 text-left w-28">Status</th>
                  </tr>
                </thead>
                <tbody>
                  {filteredCompositions.map(row => (
                    <tr
                      key={row.id}
                      className={`cursor-pointer border-t border-border hover:bg-muted/40 ${selected?.id === row.id ? 'bg-primary/10' : ''}`}
                      onClick={() => setSelectedId(row.id)}
                    >
                      <td className="p-2 align-top font-mono text-[11px]">{row.item || row.code || '-'}</td>
                      <td className="p-2 align-top">
                        <div className="font-medium">{row.description}</div>
                        <div className="mt-0.5 text-[10px] text-muted-foreground">{row.chapter} - {row.sourceName}</div>
                      </td>
                      <td className="p-2 align-top text-right tabular-nums">{row.quantity.toLocaleString('pt-BR', { maximumFractionDigits: 3 })} {row.unit}</td>
                      <td className="p-2 align-top text-right tabular-nums">{fmtBRL(row.contractedValue)}</td>
                      <td className="p-2 align-top text-right tabular-nums">{fmtBRL(row.realCost)}</td>
                      <td className={`p-2 align-top text-right tabular-nums font-semibold ${row.grossProfit >= 0 ? 'text-success' : 'text-destructive'}`}>
                        {fmtBRL(row.grossProfit)}
                      </td>
                      <td className={`p-2 align-top text-right tabular-nums font-semibold ${marginTone(row.marginPct)}`}>{fmtPct(row.marginPct)}</td>
                      <td className="p-2 align-top"><SignalBadge signal={row.signal} /></td>
                    </tr>
                  ))}
                  {filteredCompositions.length === 0 && (
                    <tr>
                      <td colSpan={8} className="p-8 text-center text-sm text-muted-foreground">
                        Nenhuma composicao encontrada com os filtros atuais.
                      </td>
                    </tr>
                  )}
                </tbody>
              </table>
            </div>
          </Card>
        </div>

        <Card className="h-fit overflow-hidden xl:sticky xl:top-4">
          <div className="border-b border-border bg-muted/30 px-3 py-2">
            <h2 className="text-sm font-semibold">Detalhe da composicao</h2>
            <p className="text-[11px] text-muted-foreground">Fonte do custo real e pendencias por insumo.</p>
          </div>
          {!selected ? (
            <div className="p-8 text-center text-sm text-muted-foreground">
              Selecione uma composicao para ver os insumos.
            </div>
          ) : (
            <div className="p-3 space-y-3">
              <div>
                <div className="flex items-start justify-between gap-2">
                  <div>
                    <p className="text-[11px] text-muted-foreground">{selected.item || selected.code}</p>
                    <h3 className="text-sm font-semibold leading-snug">{selected.description}</h3>
                  </div>
                  <SignalBadge signal={selected.signal} />
                </div>
                <div className="mt-2 grid grid-cols-2 gap-2 text-xs">
                  <div className="rounded border border-border p-2">
                    <p className="text-[10px] text-muted-foreground">Contrato</p>
                    <p className="font-semibold">{fmtBRL(selected.contractedValue)}</p>
                  </div>
                  <div className="rounded border border-border p-2">
                    <p className="text-[10px] text-muted-foreground">Custo real</p>
                    <p className="font-semibold">{fmtBRL(selected.realCost)}</p>
                  </div>
                </div>
              </div>

              <div className="rounded-lg border border-border overflow-hidden">
                <div className="grid grid-cols-[1fr_70px_90px] gap-2 bg-muted px-2 py-1.5 text-[10px] font-semibold text-muted-foreground">
                  <span>Insumo</span>
                  <span className="text-right">Qtd.</span>
                  <span className="text-right">Custo</span>
                </div>
                <div className="max-h-[520px] overflow-auto">
                  {selected.inputs.length === 0 && (
                    <div className="p-5 text-center text-xs text-muted-foreground">
                      Composicao sem analitica vinculada.
                    </div>
                  )}
                  {selected.inputs.map(input => (
                    <div key={input.id} className="border-t border-border px-2 py-2 text-xs">
                      <div className="grid grid-cols-[1fr_70px_90px] gap-2">
                        <div className="min-w-0">
                          <p className="font-medium leading-snug">{input.description}</p>
                          <p className="mt-0.5 text-[10px] text-muted-foreground">
                            {input.code || '-'} - coef. {input.coefficient.toLocaleString('pt-BR', { maximumFractionDigits: 5 })} {input.unit}
                          </p>
                        </div>
                        <div className="text-right tabular-nums">{input.totalQuantity.toLocaleString('pt-BR', { maximumFractionDigits: 3 })}</div>
                        <div className="text-right tabular-nums font-semibold">{input.priceSource ? fmtBRL(input.realTotal) : '-'}</div>
                      </div>
                      {input.priceSource ? (
                        <div className="mt-1 rounded bg-success/10 px-2 py-1 text-[10px] text-success">
                          Menor cotacao: {fmtBRL(input.priceSource.unitPrice)} - {input.priceSource.supplierName} - {input.priceSource.comparisonName}
                          {input.priceSource.date ? ` - ${input.priceSource.date.slice(0, 10)}` : ''}
                        </div>
                      ) : (
                        <div className="mt-1 rounded bg-warning/10 px-2 py-1 text-[10px] text-warning">
                          Sem cotacao na Lista de Material. Este insumo deixa a margem incompleta.
                        </div>
                      )}
                    </div>
                  ))}
                </div>
              </div>
            </div>
          )}
        </Card>
      </section>
    </div>
  );
}
