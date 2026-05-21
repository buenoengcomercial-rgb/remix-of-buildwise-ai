import { useCallback, useMemo, useState, useEffect } from 'react';
import type { Project, MaterialComparison } from '@/types/project';
import * as MC from '@/lib/materialComparisons';

const LS_ACTIVE_KEY = (projectId: string) => `materials:activeComparison:${projectId}`;

export function useMaterialComparisons(project: Project, onProjectChange: (next: Project | ((prev: Project) => Project)) => void) {
  const comparisons = project.materialComparisons ?? [];

  const [activeId, setActiveId] = useState<string | null>(() => {
    try {
      const stored = localStorage.getItem(LS_ACTIVE_KEY(project.id));
      if (stored && comparisons.some(c => c.id === stored)) return stored;
    } catch { /* ignore */ }
    return comparisons[0]?.id ?? null;
  });

  useEffect(() => {
    // Garante que activeId sempre aponte para algo válido (se existir)
    if (activeId && !comparisons.some(c => c.id === activeId)) {
      setActiveId(comparisons[0]?.id ?? null);
    } else if (!activeId && comparisons.length > 0) {
      setActiveId(comparisons[0].id);
    }
  }, [activeId, comparisons]);

  useEffect(() => {
    try {
      if (activeId) localStorage.setItem(LS_ACTIVE_KEY(project.id), activeId);
    } catch { /* ignore */ }
  }, [activeId, project.id]);

  // Migração: garante fornecedores globais (a partir de comparativos antigos).
  useEffect(() => {
    if (project.materialSuppliers === undefined) {
      const migrated = MC.ensureGlobalSuppliers(project);
      if (migrated !== project) onProjectChange(migrated);
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [project.id]);

  const active = useMemo(
    () => comparisons.find(c => c.id === activeId) ?? null,
    [comparisons, activeId],
  );

  const apply = useCallback((next: MaterialComparison) => {
    onProjectChange(prev => MC.upsertComparison(prev, next));
  }, [onProjectChange]);

  const createNew = useCallback((name: string) => {
    const c = MC.createComparison(name);
    onProjectChange(prev => MC.upsertComparison(prev, c));
    setActiveId(c.id);
    return c;
  }, [onProjectChange]);

  const remove = useCallback((id: string) => {
    onProjectChange(prev => MC.deleteComparison(prev, id));
    if (activeId === id) setActiveId(comparisons.find(c => c.id !== id)?.id ?? null);
  }, [onProjectChange, activeId, comparisons]);

  const close = useCallback((id: string) => {
    onProjectChange(prev => {
      const c = (prev.materialComparisons ?? []).find(x => x.id === id);
      if (!c) return prev;
      const next = MC.setComparisonStatus(c, 'fechado');
      const updated = MC.upsertComparison(prev, next);
      return MC.appendPriceHistoryFromComparison(updated, next);
    });
  }, [onProjectChange]);

  return {
    comparisons,
    active,
    activeId,
    setActiveId,
    apply,
    createNew,
    remove,
    close,
  };
}
