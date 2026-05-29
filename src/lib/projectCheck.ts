import type { AppView, ComparisonItem, Project, Task } from '@/types/project';
import { additiveTotals } from '@/lib/additiveImport';
import {
  analyzeItem,
  getPurchasedQuantity,
  linkKeyOf,
  resolveMaterialCostClass,
} from '@/lib/materialComparisons';
import { buildRealCostAnalysis } from '@/lib/realCost';
import { balanceFor, ensureWarehouse } from '@/lib/warehouse';

export type ProjectCheckSeverity = 'critical' | 'warning' | 'info' | 'ok';

export type ProjectCheckArea =
  | 'Contrato'
  | 'Aditivo'
  | 'Medição'
  | 'Custo Real'
  | 'Lista de Material'
  | 'Almoxarifado'
  | 'Cronograma';

export interface ProjectCheckIssue {
  id: string;
  area: ProjectCheckArea;
  severity: Exclude<ProjectCheckSeverity, 'ok'>;
  title: string;
  description: string;
  action: string;
  targetView: AppView;
  count?: number;
  value?: string;
}

export interface ProjectCheckCard {
  area: ProjectCheckArea;
  title: string;
  value: string;
  helper: string;
  severity: ProjectCheckSeverity;
  targetView: AppView;
}

export interface ProjectCheckTotals {
  additiveFinal: number | null;
  measurementContracted: number | null;
  realCostContracted: number;
  realCostQuoted: number;
  purchasedTotal: number;
  receivedTotal: number;
}

export interface ProjectCheckReport {
  generatedAt: string;
  cards: ProjectCheckCard[];
  issues: ProjectCheckIssue[];
  totals: ProjectCheckTotals;
  counts: Record<Exclude<ProjectCheckSeverity, 'ok'>, number>;
}

const TOLERANCE = 0.05;

const AREA_VIEW: Record<ProjectCheckArea, AppView> = {
  Contrato: 'measurement',
  Aditivo: 'additive',
  Medição: 'measurement',
  'Custo Real': 'realCost',
  'Lista de Material': 'materials',
  Almoxarifado: 'warehouse',
  Cronograma: 'gantt',
};

const SEVERITY_RANK: Record<ProjectCheckSeverity, number> = {
  ok: 0,
  info: 1,
  warning: 2,
  critical: 3,
};

function round2(value: number) {
  return Math.round((value + Number.EPSILON) * 100) / 100;
}

function diff(a: number | null | undefined, b: number | null | undefined) {
  if (a == null || b == null) return 0;
  return Math.abs(round2(a) - round2(b));
}

function formatBRL(value: number | null | undefined) {
  if (value == null || Number.isNaN(value)) return 'sem dado';
  return value.toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' });
}

function formatNumber(value: number) {
  return value.toLocaleString('pt-BR');
}

function latestAdditive(project: Project) {
  const additives = project.additives ?? [];
  const contracted = additives.filter(add => add.isContracted || add.status === 'aditivo_contratado');
  const source = contracted.length > 0 ? contracted : additives;
  return [...source].sort((a, b) => {
    const da = a.contractedAt ?? a.approvedAt ?? a.importedAt ?? '';
    const db = b.contractedAt ?? b.approvedAt ?? b.importedAt ?? '';
    return db.localeCompare(da);
  })[0];
}

function latestMeasurement(project: Project) {
  return [...(project.measurements ?? [])].sort((a, b) => {
    const byNumber = (b.number ?? 0) - (a.number ?? 0);
    if (byNumber !== 0) return byNumber;
    return (b.issueDate ?? '').localeCompare(a.issueDate ?? '');
  })[0];
}

function measurementContractedTotal(project: Project) {
  const measurement = latestMeasurement(project);
  if (!measurement) return null;
  return round2(
    (measurement.items ?? []).reduce(
      (sum, item) => sum + (item.qtyContracted || 0) * (item.unitPriceWithBDI || 0),
      0,
    ),
  );
}

function walkTasks(project: Project) {
  const tasks: Task[] = [];
  const walk = (task: Task) => {
    tasks.push(task);
    task.children?.forEach(walk);
  };
  project.phases.forEach(phase => phase.tasks.forEach(walk));
  return tasks;
}

function severityForArea(issues: ProjectCheckIssue[], area: ProjectCheckArea): ProjectCheckSeverity {
  const areaIssues = issues.filter(issue => issue.area === area);
  if (areaIssues.length === 0) return 'ok';
  return areaIssues.reduce<ProjectCheckSeverity>((worst, issue) => (
    SEVERITY_RANK[issue.severity] > SEVERITY_RANK[worst] ? issue.severity : worst
  ), 'ok');
}

function makeIssue(
  issues: ProjectCheckIssue[],
  area: ProjectCheckArea,
  severity: Exclude<ProjectCheckSeverity, 'ok'>,
  id: string,
  title: string,
  description: string,
  action: string,
  extras: Partial<Pick<ProjectCheckIssue, 'count' | 'value' | 'targetView'>> = {},
) {
  issues.push({
    id,
    area,
    severity,
    title,
    description,
    action,
    targetView: extras.targetView ?? AREA_VIEW[area],
    count: extras.count,
    value: extras.value,
  });
}

function allComparisonItems(project: Project): ComparisonItem[] {
  return (project.materialComparisons ?? []).flatMap(comp => comp.items ?? []);
}

function purchasedAndReceived(project: Project) {
  const purchasedByKey = new Map<string, number>();
  let purchasedTotal = 0;
  for (const item of allComparisonItems(project)) {
    if (resolveMaterialCostClass(project, item) !== 'material') continue;
    const qty = getPurchasedQuantity(item);
    if (qty <= 0) continue;
    const analysis = analyzeItem(item);
    const price = analysis.chosenPrice ?? 0;
    const key = linkKeyOf(item);
    purchasedByKey.set(key, round2((purchasedByKey.get(key) ?? 0) + qty));
    purchasedTotal = round2(purchasedTotal + qty * price);
  }

  const warehouseProject = ensureWarehouse(project);
  const warehouse = warehouseProject.warehouse!;
  const receivedByKey = new Map<string, number>();
  let receivedTotal = 0;
  for (const movement of warehouse.movements) {
    if (movement.reversedById) continue;
    if (movement.type !== 'entrada' && movement.type !== 'devolucao') continue;
    receivedByKey.set(movement.itemKey, round2((receivedByKey.get(movement.itemKey) ?? 0) + movement.quantity));
    receivedTotal = round2(receivedTotal + movement.quantity * (movement.unitPrice ?? 0));
  }
  return { purchasedByKey, receivedByKey, purchasedTotal, receivedTotal };
}

export function buildProjectCheckReport(project: Project): ProjectCheckReport {
  const issues: ProjectCheckIssue[] = [];
  const additive = latestAdditive(project);
  const additiveFinal = additive ? additiveTotals(additive, project).valorFinal : null;
  const measurementContracted = measurementContractedTotal(project);
  const realCost = buildRealCostAnalysis(project);
  const realCostContracted = realCost.totals.contractedValue;
  const realCostQuoted = realCost.totals.realCost;
  const { purchasedByKey, receivedByKey, purchasedTotal, receivedTotal } = purchasedAndReceived(project);
  const warehouse = ensureWarehouse(project).warehouse!;

  if (additiveFinal == null) {
    makeIssue(
      issues,
      'Aditivo',
      'info',
      'additive-no-reference',
      'Sem aditivo de referência para conferir',
      'Ainda não encontrei um aditivo contratado ou importado para comparar com Medição e Custo Real.',
      'Quando houver aditivo contratado, esta conferência passa a validar o valor final da obra.',
    );
  }

  if (additiveFinal != null && diff(additiveFinal, realCostContracted) > TOLERANCE) {
    makeIssue(
      issues,
      'Custo Real',
      'critical',
      'real-cost-contract-total-mismatch',
      'Valor contratado do Custo Real difere do Aditivo',
      `Aditivo está em ${formatBRL(additiveFinal)} e Custo Real está em ${formatBRL(realCostContracted)}.`,
      'Revisar duplicidade, integração de itens aditivados e hierarquia contratual usada no Custo Real.',
      { value: formatBRL(diff(additiveFinal, realCostContracted)) },
    );
  }

  if (additiveFinal != null && measurementContracted != null && diff(additiveFinal, measurementContracted) > TOLERANCE) {
    makeIssue(
      issues,
      'Medição',
      'warning',
      'measurement-contract-total-mismatch',
      'Valor contratado da Medição difere do Aditivo',
      `Aditivo está em ${formatBRL(additiveFinal)} e a medição mais recente está em ${formatBRL(measurementContracted)}.`,
      'Sincronizar a medição ou conferir se a tela está usando snapshot antigo.',
      { value: formatBRL(diff(additiveFinal, measurementContracted)) },
    );
  }

  if (realCost.pending.inputsWithoutQuote > 0) {
    makeIssue(
      issues,
      'Lista de Material',
      'warning',
      'material-inputs-without-quote',
      'Insumos sem cotação no Custo Real',
      `${realCost.pending.inputsWithoutQuote} insumo(s) entram no custo real sem preço cotado.`,
      'Completar cotações na Lista de Material para a margem ficar confiável.',
      { count: realCost.pending.inputsWithoutQuote },
    );
  }

  if (realCost.pending.incompleteCompositions > 0) {
    makeIssue(
      issues,
      'Custo Real',
      'warning',
      'real-cost-incomplete-margin',
      'Composições com margem incompleta',
      `${realCost.pending.incompleteCompositions} composição(ões) não têm dados suficientes para margem final.`,
      'Abrir Custo Real e revisar composição sem contrato, sem analítica ou sem cotação.',
      { count: realCost.pending.incompleteCompositions },
    );
  }

  if (realCost.pending.itemsWithoutScheduleLink > 0) {
    makeIssue(
      issues,
      'Cronograma',
      'info',
      'schedule-links-missing',
      'Itens sem vínculo com Cronograma',
      `${realCost.pending.itemsWithoutScheduleLink} item(ns) ainda não foram relacionados ao Gantt.`,
      'Conferir se esses itens precisam entrar no planejamento executivo.',
      { count: realCost.pending.itemsWithoutScheduleLink },
    );
  }

  const materialItems = allComparisonItems(project).filter(item => resolveMaterialCostClass(project, item) === 'material');
  const materialWithoutGroup = materialItems.filter(item => !item.purchaseGroup).length;
  if (materialWithoutGroup > 0) {
    makeIssue(
      issues,
      'Lista de Material',
      'info',
      'material-without-purchase-group',
      'Materiais sem grupo de compra',
      `${materialWithoutGroup} material(is) ainda não estão vinculados a um grupo de compra.`,
      'Classificar grupos para organizar cotações, pedidos e almoxarifado.',
      { count: materialWithoutGroup },
    );
  }

  const quotedWithoutWinner = materialItems.filter(item => {
    const hasValidPrice = item.prices.some(price => price.available !== false && price.price > 0);
    return hasValidPrice && !item.chosenSupplierId;
  }).length;
  if (quotedWithoutWinner > 0) {
    makeIssue(
      issues,
      'Lista de Material',
      'info',
      'quoted-without-manual-winner',
      'Itens cotados usando vencedor automático',
      `${quotedWithoutWinner} item(ns) têm preço válido, mas sem fornecedor vencedor manual.`,
      'Se houver critério de logística/frete, marque manualmente o fornecedor vencedor.',
      { count: quotedWithoutWinner },
    );
  }

  const partialPurchases = materialItems.filter(item => item.status === 'pedido_parcial').length;
  if (partialPurchases > 0) {
    makeIssue(
      issues,
      'Lista de Material',
      'info',
      'partial-purchases',
      'Pedidos parciais em aberto',
      `${partialPurchases} item(ns) foram comprados parcialmente e ainda têm saldo a comprar.`,
      'Revisar Pedido para decidir se o saldo será comprado agora ou depois.',
      { count: partialPurchases },
    );
  }

  const negativeStock = warehouse.items.filter(item => balanceFor(warehouse, item.key) < 0);
  if (negativeStock.length > 0) {
    makeIssue(
      issues,
      'Almoxarifado',
      'critical',
      'negative-stock',
      'Saldo físico negativo',
      `${negativeStock.length} material(is) estão com saldo físico abaixo de zero.`,
      'Registrar entrada, estornar retirada indevida ou ajustar a movimentação antes de usar os relatórios.',
      { count: negativeStock.length },
    );
  }

  const withdrawalsWithoutChapter = warehouse.movements.filter(movement => (
    !movement.reversedById && movement.type === 'retirada' && !movement.chapterId
  )).length;
  if (withdrawalsWithoutChapter > 0) {
    makeIssue(
      issues,
      'Almoxarifado',
      'warning',
      'withdrawals-without-chapter',
      'Retiradas sem capítulo principal',
      `${withdrawalsWithoutChapter} retirada(s) ainda não alimentam o consumo por prédio/frente.`,
      'Vincular as retiradas ao capítulo principal para análise de consumo real por frente.',
      { count: withdrawalsWithoutChapter },
    );
  }

  let purchasedNotReceived = 0;
  for (const [key, qty] of purchasedByKey.entries()) {
    const received = receivedByKey.get(key) ?? 0;
    if (qty - received > TOLERANCE) purchasedNotReceived += 1;
  }
  if (purchasedNotReceived > 0) {
    makeIssue(
      issues,
      'Almoxarifado',
      'warning',
      'purchased-not-received',
      'Pedidos confirmados sem entrada completa',
      `${purchasedNotReceived} material(is) têm pedido confirmado maior que a quantidade recebida.`,
      'Registrar entrada parcial ou total no almoxarifado quando a nota fiscal chegar.',
      { count: purchasedNotReceived },
    );
  }

  const tasks = walkTasks(project);
  const tasksWithoutSchedule = tasks.filter(task => !task.startDate || !task.duration || task.duration <= 0).length;
  if (tasksWithoutSchedule > 0) {
    makeIssue(
      issues,
      'Cronograma',
      'warning',
      'tasks-without-schedule',
      'Atividades sem data ou duração',
      `${tasksWithoutSchedule} atividade(s) não têm base suficiente para previsão de produção/medição.`,
      'Preencher início e duração no Cronograma para melhorar previsões e dimensionamento de equipe.',
      { count: tasksWithoutSchedule },
    );
  }

  const areas: ProjectCheckArea[] = ['Contrato', 'Aditivo', 'Medição', 'Custo Real', 'Lista de Material', 'Almoxarifado', 'Cronograma'];
  const cards: ProjectCheckCard[] = areas.map(area => {
    const areaIssues = issues.filter(issue => issue.area === area);
    const severity = severityForArea(issues, area);
    const critical = areaIssues.filter(issue => issue.severity === 'critical').length;
    const warning = areaIssues.filter(issue => issue.severity === 'warning').length;
    return {
      area,
      title: area,
      value: areaIssues.length === 0 ? 'OK' : formatNumber(areaIssues.length),
      helper: areaIssues.length === 0 ? 'Sem pendências críticas nesta leitura' : `${critical} críticas, ${warning} avisos`,
      severity,
      targetView: AREA_VIEW[area],
    };
  });

  const counts = issues.reduce<Record<Exclude<ProjectCheckSeverity, 'ok'>, number>>((acc, issue) => {
    acc[issue.severity] += 1;
    return acc;
  }, { critical: 0, warning: 0, info: 0 });

  return {
    generatedAt: new Date().toISOString(),
    cards,
    issues,
    counts,
    totals: {
      additiveFinal,
      measurementContracted,
      realCostContracted,
      realCostQuoted,
      purchasedTotal,
      receivedTotal,
    },
  };
}

export { formatBRL as formatProjectCheckBRL };
