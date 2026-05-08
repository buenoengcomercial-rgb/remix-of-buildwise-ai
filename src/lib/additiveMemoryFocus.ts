/**
 * Pequeno barramento para coordenar abertura da Memória de Cálculo
 * a partir das colunas Qtd Suprimida / Qtd Acrescida.
 *
 * - `pending` guarda o tipo preferido enquanto a Memória ainda não montou.
 * - Listeners recebem a notificação quando a Memória já está aberta.
 */
export type AdditiveMemoryQtyType = 'acrescida' | 'suprimida';

type Listener = (compositionId: string, type: AdditiveMemoryQtyType) => void;

const listeners = new Set<Listener>();
const pending = new Map<string, AdditiveMemoryQtyType>();

export function consumeMemoryPreferredType(
  compositionId: string,
): AdditiveMemoryQtyType | undefined {
  const t = pending.get(compositionId);
  pending.delete(compositionId);
  return t;
}

export function requestMemoryFocus(
  compositionId: string,
  type: AdditiveMemoryQtyType,
) {
  pending.set(compositionId, type);
  listeners.forEach(fn => {
    try { fn(compositionId, type); } catch { /* noop */ }
  });
}

export function onMemoryFocus(fn: Listener): () => void {
  listeners.add(fn);
  return () => { listeners.delete(fn); };
}
