import type { Quote } from '@/lib/api/services';

/** Alinhado ao filtro `view` da erp-api (`NormalizeListView`). */
export type QuoteListTab =
  | 'pendentes'
  | 'aprovados'
  | 'em_producao'
  | 'finalizados'
  | 'cancelados'
  | 'todos';

export const QUOTE_LIST_TABS: { id: QuoteListTab; label: string }[] = [
  { id: 'pendentes', label: 'Pendentes' },
  { id: 'aprovados', label: 'Aprovados' },
  { id: 'em_producao', label: 'Em produção' },
  { id: 'finalizados', label: 'Finalizados' },
  { id: 'cancelados', label: 'Cancelados' },
  { id: 'todos', label: 'Todos' },
];

/** Filtro local (orçamentos em localStorage) — mesma lógica do backend. */
export function quoteMatchesListTab(q: Quote, tab: QuoteListTab): boolean {
  const st = (q.status ?? '').toLowerCase();
  const ws = (q.work_status ?? '').toLowerCase().trim();
  if (tab === 'todos') return true;

  const isCancelledRow =
    st === 'cancelled' || st === 'rejected' || ws === 'cancelled';
  if (tab === 'cancelados') return isCancelledRow;
  if (isCancelledRow) return false;

  const isFinished = ws === 'completed' || ws === 'done';
  if (tab === 'finalizados') return isFinished;
  if (isFinished) return false;

  if (tab === 'pendentes') {
    return ['draft', 'pending', 'sent'].includes(st);
  }
  if (tab === 'aprovados') {
    return st === 'approved' && (ws === '' || ws === 'not_started');
  }
  if (tab === 'em_producao') {
    return (
      st === 'approved' &&
      ['scheduled', 'in_progress', 'executing', 'pending', 'on_hold', 'paused'].includes(
        ws,
      )
    );
  }
  return true;
}
