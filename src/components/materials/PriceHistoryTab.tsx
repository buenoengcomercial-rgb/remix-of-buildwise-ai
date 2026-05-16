import { useMemo, useState } from 'react';
import type { Project } from '@/types/project';
import { Input } from '@/components/ui/input';

interface Props { project: Project }

export default function PriceHistoryTab({ project }: Props) {
  const [q, setQ] = useState('');
  const history = project.materialPriceHistory ?? [];

  const filtered = useMemo(() => {
    const term = q.trim().toLowerCase();
    const list = [...history].sort((a, b) => b.date.localeCompare(a.date));
    if (!term) return list;
    return list.filter(h =>
      h.itemDescription.toLowerCase().includes(term) ||
      (h.itemCode ?? '').toLowerCase().includes(term) ||
      h.supplierName.toLowerCase().includes(term) ||
      h.comparisonName.toLowerCase().includes(term),
    );
  }, [history, q]);

  return (
    <div className="space-y-3">
      <div className="flex items-center justify-between gap-3">
        <Input value={q} onChange={e => setQ(e.target.value)} placeholder="Buscar por item, fornecedor ou comparativo..." className="max-w-md" />
        <span className="text-xs text-muted-foreground">{filtered.length} registro(s)</span>
      </div>
      <div className="bg-card border border-border rounded-xl overflow-hidden">
        {filtered.length === 0 ? (
          <div className="p-8 text-center text-sm text-muted-foreground">
            Sem histórico. Feche uma cotação para registrar preços aqui.
          </div>
        ) : (
          <table className="w-full text-xs">
            <thead className="bg-muted">
              <tr>
                <th className="p-2 text-left">Data</th>
                <th className="p-2 text-left">Item</th>
                <th className="p-2">Un.</th>
                <th className="p-2 text-left">Fornecedor</th>
                <th className="p-2 text-left">Comparativo</th>
                <th className="p-2 text-right">Preço</th>
              </tr>
            </thead>
            <tbody>
              {filtered.map(h => (
                <tr key={h.id} className="border-t border-border hover:bg-muted/20">
                  <td className="p-2">{new Date(h.date).toLocaleDateString('pt-BR')}</td>
                  <td className="p-2">
                    <div className="font-medium">{h.itemDescription}</div>
                    {h.itemCode && <div className="text-[10px] text-muted-foreground">{h.itemCode}</div>}
                  </td>
                  <td className="p-2 text-center">{h.unit}</td>
                  <td className="p-2">{h.supplierName}</td>
                  <td className="p-2 text-muted-foreground">{h.comparisonName}</td>
                  <td className="p-2 text-right font-medium">R$ {h.price.toLocaleString('pt-BR', { minimumFractionDigits: 2 })}</td>
                </tr>
              ))}
            </tbody>
          </table>
        )}
      </div>
    </div>
  );
}
