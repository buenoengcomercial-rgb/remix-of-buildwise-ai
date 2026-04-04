export function addDays(date: Date, days: number) {
  const r = new Date(date);
  r.setDate(r.getDate() + days);
  return r;
}

export function diffDays(a: Date, b: Date) {
  return Math.ceil((b.getTime() - a.getTime()) / 86400000);
}

export function formatDateFull(d: string) {
  return new Date(d).toLocaleDateString('pt-BR', { day: '2-digit', month: '2-digit', year: 'numeric' });
}

export function formatDateShort(d: string) {
  return new Date(d).toLocaleDateString('pt-BR', { day: '2-digit', month: '2-digit' });
}

export function getEndDate(startDate: string, duration: number): string {
  const d = new Date(startDate);
  d.setDate(d.getDate() + duration);
  return d.toISOString().split('T')[0];
}

export function dateToISO(d: Date): string {
  return d.toISOString().split('T')[0];
}

export const MONTH_NAMES_PT: Record<number, string> = {
  0: 'Janeiro', 1: 'Fevereiro', 2: 'Março', 3: 'Abril',
  4: 'Maio', 5: 'Junho', 6: 'Julho', 7: 'Agosto',
  8: 'Setembro', 9: 'Outubro', 10: 'Novembro', 11: 'Dezembro',
};
