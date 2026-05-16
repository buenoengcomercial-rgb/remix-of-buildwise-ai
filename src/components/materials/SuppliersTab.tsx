import { useState } from 'react';
import type { MaterialComparison } from '@/types/project';
import * as MC from '@/lib/materialComparisons';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Plus, Trash2, Star } from 'lucide-react';

interface Props {
  comparison: MaterialComparison;
  onApply: (next: MaterialComparison) => void;
}

export default function SuppliersTab({ comparison, onApply }: Props) {
  const [form, setForm] = useState({ name: '', contact: '', deliveryDays: '', rating: '' });

  const add = () => {
    if (!form.name.trim()) return;
    onApply(MC.addSupplier(comparison, {
      name: form.name.trim(),
      contact: form.contact || undefined,
      deliveryDays: form.deliveryDays ? Number(form.deliveryDays) : undefined,
      rating: form.rating ? Number(form.rating) : undefined,
    }));
    setForm({ name: '', contact: '', deliveryDays: '', rating: '' });
  };

  return (
    <div className="space-y-4">
      <div className="bg-card border border-border rounded-xl p-4 space-y-3">
        <h3 className="text-sm font-semibold">Adicionar fornecedor</h3>
        <div className="grid grid-cols-12 gap-2">
          <Input className="col-span-4" placeholder="Nome" value={form.name} onChange={e => setForm({ ...form, name: e.target.value })} />
          <Input className="col-span-4" placeholder="Contato (telefone/e-mail)" value={form.contact} onChange={e => setForm({ ...form, contact: e.target.value })} />
          <Input className="col-span-2" type="number" placeholder="Prazo (dias)" value={form.deliveryDays} onChange={e => setForm({ ...form, deliveryDays: e.target.value })} />
          <Input className="col-span-1" type="number" min={0} max={5} placeholder="0-5" value={form.rating} onChange={e => setForm({ ...form, rating: e.target.value })} />
          <Button className="col-span-1" onClick={add}><Plus className="w-4 h-4" /></Button>
        </div>
      </div>

      <div className="bg-card border border-border rounded-xl overflow-hidden">
        <div className="px-4 py-3 border-b border-border bg-muted/30 text-xs uppercase font-semibold tracking-wide">
          Fornecedores ({comparison.suppliers.length})
        </div>
        {comparison.suppliers.length === 0 ? (
          <div className="p-8 text-center text-sm text-muted-foreground">Nenhum fornecedor ainda.</div>
        ) : (
          <table className="w-full text-xs">
            <thead className="bg-muted">
              <tr>
                <th className="p-2 text-left">Nome</th>
                <th className="p-2 text-left">Contato</th>
                <th className="p-2 text-center">Prazo (dias)</th>
                <th className="p-2 text-center">Avaliação</th>
                <th className="p-2"></th>
              </tr>
            </thead>
            <tbody>
              {comparison.suppliers.map(s => (
                <tr key={s.id} className="border-t border-border hover:bg-muted/20">
                  <td className="p-2"><Input value={s.name} onChange={e => onApply(MC.updateSupplier(comparison, s.id, { name: e.target.value }))} className="h-7 text-xs" /></td>
                  <td className="p-2"><Input value={s.contact ?? ''} onChange={e => onApply(MC.updateSupplier(comparison, s.id, { contact: e.target.value }))} className="h-7 text-xs" /></td>
                  <td className="p-2 w-24"><Input type="number" value={s.deliveryDays ?? ''} onChange={e => onApply(MC.updateSupplier(comparison, s.id, { deliveryDays: e.target.value === '' ? undefined : Number(e.target.value) }))} className="h-7 text-xs text-center" /></td>
                  <td className="p-2 w-24 text-center">
                    <div className="inline-flex items-center gap-1">
                      <Star className="w-3 h-3 text-warning" />
                      <Input type="number" min={0} max={5} value={s.rating ?? ''} onChange={e => onApply(MC.updateSupplier(comparison, s.id, { rating: e.target.value === '' ? undefined : Number(e.target.value) }))} className="h-7 text-xs text-center w-16" />
                    </div>
                  </td>
                  <td className="p-2 text-right">
                    <Button size="sm" variant="ghost" className="text-destructive h-7" onClick={() => onApply(MC.removeSupplier(comparison, s.id))}>
                      <Trash2 className="w-3.5 h-3.5" />
                    </Button>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        )}
      </div>
    </div>
  );
}
