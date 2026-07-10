'use client';

import React, { useState, useEffect, useCallback, useMemo } from 'react';
import ProtectedRoute from '@/components/auth/ProtectedRoute';
import DashboardLayout from '@/components/layout/DashboardLayout';
import CreateButton from '@/components/ui/CreateButton';
import Input from '@/components/ui/Input';
import { quoteService, Quote } from '@/lib/api/services';
import { usePermissions } from '@/hooks/usePermissions';
import { ProtectedComponent } from '@/components/auth/ProtectedComponent';
import { formatDate, formatCurrency } from '@/lib/utils/format';
import { quoteStatusLabelPt, workStatusLabelPt } from '@/lib/utils/quoteLabels';
import { recordApprovalCelebrationMeta } from '@/lib/gamification/quoteApprovalStats';
import {
  QuoteApprovalCelebration,
  type QuoteApprovalCelebrationPayload,
} from '@/components/quotes/QuoteApprovalCelebration';
import { useRouter } from 'next/navigation';
import {
  QUOTE_LIST_TABS,
  type QuoteListTab,
} from '@/lib/utils/quoteListTab';

const quoteStatusBadgeClass: Record<string, string> = {
  pending: 'bg-accent-15 text-accent-muted',
  draft: 'bg-slate-500/15 text-slate-300',
  sent: 'bg-sky-500/15 text-sky-300',
  approved: 'bg-green-100 text-green-800 dark:bg-green-900/30 dark:text-green-400',
  rejected: 'bg-red-100 text-red-800 dark:bg-red-900/30 dark:text-red-400',
  cancelled: 'bg-zinc-500/20 text-zinc-400',
};

const workStatusBadgeClass: Record<string, string> = {
  not_started: 'bg-zinc-500/15 text-zinc-400',
  pending: 'bg-amber-500/15 text-amber-300',
  scheduled: 'bg-indigo-500/15 text-indigo-300',
  in_progress: 'bg-emerald-500/15 text-emerald-300',
  executing: 'bg-emerald-500/15 text-emerald-300',
  completed: 'bg-green-600/20 text-green-400',
  done: 'bg-green-600/20 text-green-400',
  on_hold: 'bg-orange-500/15 text-orange-300',
  paused: 'bg-orange-500/15 text-orange-300',
  cancelled: 'bg-red-500/15 text-red-400',
};

function displayClientName(q: Quote): string {
  const n =
    q.client_name?.trim() ||
    q.client_snapshot?.name?.trim() ||
    q.client?.name?.trim();
  return n || '—';
}

function QuotesContent() {
  const router = useRouter();
  const [quotes, setQuotes] = useState<Quote[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState('');
  const [tab, setTab] = useState<QuoteListTab>('pendentes');
  const [celebrationOpen, setCelebrationOpen] = useState(false);
  const [celebrationPayload, setCelebrationPayload] =
    useState<QuoteApprovalCelebrationPayload | null>(null);
  const { hasPermission, canChangeQuoteStatus } = usePermissions();

  const fetchQuotes = useCallback(async () => {
    try {
      setLoading(true);
      const data = await quoteService.list({ view: tab, limit: 500 });
      setQuotes(data);
    } catch (error) {
      console.error('Failed to fetch quotes:', error);
    } finally {
      setLoading(false);
    }
  }, [tab]);

  useEffect(() => {
    fetchQuotes();
  }, [fetchQuotes]);

  const filteredQuotes = useMemo(
    () =>
      quotes.filter(
        (quote) =>
          displayClientName(quote).toLowerCase().includes(searchTerm.toLowerCase()) ||
          quote.id.toLowerCase().includes(searchTerm.toLowerCase()),
      ),
    [quotes, searchTerm],
  );

  const handleStatusChange = async (id: string, status: string) => {
    const prev = (quotes.find((q) => q.id === id)?.status ?? '').toLowerCase();
    const next = status.toLowerCase();
    try {
      await quoteService.updateStatus(id, status);
      if (next === 'approved' && prev !== 'approved') {
        const row = quotes.find((q) => q.id === id);
        const meta = recordApprovalCelebrationMeta();
        setCelebrationPayload({
          stats: meta.stats,
          headline: meta.headline,
          subline: meta.subline,
          clientName: displayClientName(row ?? ({} as Quote)) || undefined,
          totalValueFormatted:
            typeof row?.total === 'number' ? formatCurrency(row.total) : undefined,
        });
        setCelebrationOpen(true);
      }
      fetchQuotes();
    } catch (error) {
      console.error('Failed to update status:', error);
      alert('Erro ao atualizar status');
    }
  };

  const handleDelete = async (id: string) => {
    if (!confirm('Tem certeza que deseja excluir este orçamento?')) return;
    try {
      await quoteService.delete(id);
      fetchQuotes();
    } catch (error) {
      console.error('Failed to delete quote:', error);
      alert('Erro ao excluir orçamento');
    }
  };

  return (
    <DashboardLayout>
      <div className="space-y-10 pb-12">
        <div className="flex flex-col gap-6 lg:flex-row lg:items-start lg:justify-between">
          <div className="space-y-2 max-w-2xl">
            <h1 className="text-2xl sm:text-3xl font-bold tracking-tight text-foreground uppercase">
              Gerenciamento de orçamentos
            </h1>
            <p className="text-sm text-text-60 uppercase tracking-wide">
              Acompanhe e processe as solicitações comerciais.
            </p>
          </div>
          <div className="flex flex-col sm:flex-row gap-3 w-full lg:w-auto lg:min-w-[320px]">
            <Input
              placeholder="Buscar orçamentos..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              className="bg-background/80"
              icon={
                <svg className="w-5 h-5 text-text-60" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path
                    strokeLinecap="round"
                    strokeLinejoin="round"
                    strokeWidth={2}
                    d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z"
                  />
                </svg>
              }
            />
            <ProtectedComponent resource="quotes" action="create">
              <CreateButton
                className="shrink-0 whitespace-nowrap"
                onClick={() => router.push('/dashboard/quotes/new')}
              >
                Novo orçamento
              </CreateButton>
            </ProtectedComponent>
          </div>
        </div>

        <div className="border-b border-glass-10">
          <nav className="-mb-px flex flex-wrap gap-x-8 gap-y-2" aria-label="Filtros de orçamento">
            {QUOTE_LIST_TABS.map((t) => {
              const active = tab === t.id;
              return (
                <button
                  key={t.id}
                  type="button"
                  onClick={() => setTab(t.id)}
                  className={`pb-3 text-xs sm:text-sm font-bold uppercase tracking-wide transition-colors border-b-2 -mb-px ${
                    active
                      ? 'border-accent text-accent'
                      : 'border-transparent text-text-60 hover:text-text-80'
                  }`}
                >
                  {t.label}
                </button>
              );
            })}
          </nav>
        </div>

        <div className="rounded-2xl border border-glass-10 bg-background shadow-sm overflow-hidden">
          <div className="grid grid-cols-[minmax(0,1.2fr)_minmax(0,1.4fr)_0.5fr_0.7fr_auto] gap-4 px-6 py-4 text-[11px] font-semibold uppercase tracking-wider text-text-60 border-b border-glass-10 bg-glass-5/50">
            <div>ID / Data</div>
            <div>Cliente / Status</div>
            <div className="text-center">Itens</div>
            <div className="text-right">Valor total</div>
            <div className="text-right">Ações</div>
          </div>

          {loading ? (
            <div className="px-6 py-20 text-center text-sm text-text-60 animate-pulse">
              Carregando…
            </div>
          ) : filteredQuotes.length === 0 ? (
            <div className="px-6 py-20 text-center text-sm text-text-60 uppercase tracking-wide">
              Nenhum orçamento encontrado
            </div>
          ) : (
            <ul className="divide-y divide-glass-10">
              {filteredQuotes.map((quote) => {
                const st = String(quote.status ?? '').toLowerCase();
                const qCls =
                  quoteStatusBadgeClass[st] ||
                  'bg-gray-100 text-gray-800 dark:bg-gray-700 dark:text-gray-300';
                const rawWs = quote.work_status;
                const wsKey = rawWs?.trim().toLowerCase().replace(/\s+/g, '_') ?? '';
                const wsCls =
                  workStatusBadgeClass[wsKey] ||
                  'bg-glass-10 text-text-80 border border-glass-10';

                return (
                  <li key={quote.id}>
                    <div
                      role="button"
                      tabIndex={0}
                      onClick={() => router.push(`/dashboard/quotes/${quote.id}`)}
                      onKeyDown={(e) => {
                        if (e.key === 'Enter' || e.key === ' ') {
                          e.preventDefault();
                          router.push(`/dashboard/quotes/${quote.id}`);
                        }
                      }}
                      className="grid grid-cols-1 md:grid-cols-[minmax(0,1.2fr)_minmax(0,1.4fr)_0.5fr_0.7fr_auto] gap-4 px-6 py-6 items-center text-left hover:bg-glass-5/40 transition-colors cursor-pointer"
                    >
                      <div className="space-y-1">
                        <div className="font-mono text-sm text-foreground">
                          {quote.id.slice(0, 8)}…
                        </div>
                        <div className="text-xs text-text-60">{formatDate(quote.created_at)}</div>
                      </div>
                      <div className="space-y-2 min-w-0">
                        <div className="font-medium text-foreground truncate">
                          {displayClientName(quote)}
                        </div>
                        <div className="flex flex-wrap gap-2">
                          <span
                            className={`inline-flex px-2.5 py-0.5 rounded-full text-xs font-medium ${qCls}`}
                          >
                            {quoteStatusLabelPt(quote.status)}
                          </span>
                          {rawWs?.trim() ? (
                            <span
                              className={`inline-flex px-2.5 py-0.5 rounded-full text-xs font-medium ${wsCls}`}
                            >
                              {workStatusLabelPt(rawWs)}
                            </span>
                          ) : null}
                        </div>
                      </div>
                      <div className="text-center text-sm font-medium text-foreground tabular-nums">
                        {quote.items_count != null ? quote.items_count : '—'}
                      </div>
                      <div className="text-right text-sm font-semibold text-foreground tabular-nums">
                        {formatCurrency(quote.total)}
                      </div>
                      <div
                        className="flex items-center gap-2 justify-end flex-wrap"
                        onClick={(e) => e.stopPropagation()}
                      >
                        <button
                          type="button"
                          onClick={() => router.push(`/dashboard/quotes/${quote.id}`)}
                          className="text-accent-detail hover:text-accent-muted p-1"
                          title="Ver"
                        >
                          <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                            <path
                              strokeLinecap="round"
                              strokeLinejoin="round"
                              strokeWidth={2}
                              d="M15 12a3 3 0 11-6 0 3 3 0 016 0z"
                            />
                            <path
                              strokeLinecap="round"
                              strokeLinejoin="round"
                              strokeWidth={2}
                              d="M2.458 12C3.732 7.943 7.523 5 12 5c4.477 0 8.268 2.943 9.542 7-1.274 4.057-5.065 7-9.542 7-4.477 0-8.268-2.943-9.542-7z"
                            />
                          </svg>
                        </button>
                        {String(quote.status).toLowerCase() === 'draft' &&
                          (hasPermission('quotes', 'update') || hasPermission('quotes', 'create')) && (
                            <button
                              type="button"
                              onClick={() => router.push(`/dashboard/quotes/${quote.id}/edit`)}
                              className="text-xs font-medium px-2 py-1 rounded-lg border border-amber-500/40 bg-amber-500/10 text-amber-800 dark:text-amber-200 hover:bg-amber-500/20"
                            >
                              Continuar
                            </button>
                          )}
                        {canChangeQuoteStatus() && (
                          <select
                            value={quote.status}
                            onChange={(e) => handleStatusChange(quote.id, e.target.value)}
                            className="text-xs px-2 py-1.5 rounded-lg border border-glass-10 bg-background text-foreground max-w-[9rem]"
                          >
                            <option value="draft">Rascunho</option>
                            <option value="pending">Pendente</option>
                            <option value="sent">Enviado</option>
                            <option value="approved">Aprovado</option>
                            <option value="rejected">Rejeitado</option>
                          </select>
                        )}
                        {hasPermission('quotes', 'delete') && (
                          <button
                            type="button"
                            onClick={() => handleDelete(quote.id)}
                            className="text-red-600 hover:text-red-800 dark:text-red-400 p-1"
                          >
                            <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                              <path
                                strokeLinecap="round"
                                strokeLinejoin="round"
                                strokeWidth={2}
                                d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16"
                              />
                            </svg>
                          </button>
                        )}
                      </div>
                    </div>
                  </li>
                );
              })}
            </ul>
          )}
        </div>

        <QuoteApprovalCelebration
          open={celebrationOpen}
          payload={celebrationPayload}
          onClose={() => {
            setCelebrationOpen(false);
            setCelebrationPayload(null);
          }}
        />
      </div>
    </DashboardLayout>
  );
}

export default function QuotesPage() {
  return (
    <ProtectedRoute>
      <QuotesContent />
    </ProtectedRoute>
  );
}
