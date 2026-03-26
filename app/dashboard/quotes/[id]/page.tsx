'use client';

import React, { useEffect, useState } from 'react';
import { IoIosArrowBack } from 'react-icons/io';
import { BiSolidFilePdf } from 'react-icons/bi';
import ProtectedRoute from '@/components/auth/ProtectedRoute';
import DashboardLayout from '@/components/layout/DashboardLayout';
import QuotePreview from '@/components/quotes/QuotePreview';
import Button from '@/components/ui/Button';
import { quoteService, Quote } from '@/lib/api/services';
import { usePermissions } from '@/hooks/usePermissions';
import { useRouter, useParams } from 'next/navigation';

const statusLabel: Record<string, string> = {
  pending: 'Pendente',
  draft: 'Rascunho',
  sent: 'Enviado ao cliente',
  approved: 'Aprovado',
  rejected: 'Rejeitado',
};

export default function QuoteDetailsPage() {
  const router = useRouter();
  const params = useParams<{ id: string }>();
  const id = params?.id;
  const { canChangeQuoteStatus, hasPermission } = usePermissions();

  const [quote, setQuote] = useState<Quote | null>(null);
  const [loading, setLoading] = useState(true);
  const [markingSent, setMarkingSent] = useState(false);
  const [actionError, setActionError] = useState<string | null>(null);

  useEffect(() => {
    let mounted = true;
    (async () => {
      try {
        setLoading(true);
        setActionError(null);
        const q = await quoteService.getById(String(id));
        if (!mounted) return;
        setQuote(q);
      } finally {
        if (mounted) setLoading(false);
      }
    })();
    return () => {
      mounted = false;
    };
  }, [id]);

  async function handleMarkAsSent() {
    if (!quote) return;
    setActionError(null);
    setMarkingSent(true);
    try {
      await quoteService.updateStatus(quote.id, 'sent');
      const refreshed = await quoteService.getById(quote.id);
      setQuote(refreshed ?? { ...quote, status: 'sent' });
    } catch (err) {
      setActionError(err instanceof Error ? err.message : 'Não foi possível atualizar o status.');
    } finally {
      setMarkingSent(false);
    }
  }

  const statusKey = (quote?.status ?? 'pending').toLowerCase();
  const statusText = statusLabel[statusKey] ?? quote?.status ?? '—';
  const canMarkSent =
    canChangeQuoteStatus() &&
    quote &&
    statusKey !== 'draft' &&
    statusKey !== 'sent' &&
    statusKey !== 'approved' &&
    statusKey !== 'rejected';

  const canContinueDraft =
    statusKey === 'draft' &&
    (hasPermission('quotes', 'update') || hasPermission('quotes', 'create'));

  return (
    <ProtectedRoute>
      <DashboardLayout>
        <div className="space-y-6">
          <div className="flex flex-col gap-4 sm:flex-row sm:items-start sm:justify-between no-print">
            <div className="flex items-start gap-4 min-w-0">
              <button
                type="button"
                className="hover:cursor-pointer shrink-0 mt-1"
                onClick={() => router.push('/dashboard/quotes')}
                aria-label="Voltar"
              >
                <IoIosArrowBack className="text-xl" />
              </button>
              <div className="min-w-0">
                <h1 className="text-3xl font-bold text-foreground">Orçamento</h1>
                <p className="text-text-80 mt-1">Visualize, marque como enviado e imprima a proposta.</p>

                {quote && !loading && (
                  <div className="mt-4 flex flex-col gap-3 sm:flex-row sm:flex-wrap sm:items-center">
                    <div className="inline-flex items-center gap-2 rounded-lg border border-glass-10 bg-glass-5 px-3 py-2 text-sm">
                      <span className="text-text-60">Status</span>
                      <span className="font-medium capitalize text-foreground">{statusText}</span>
                    </div>

                    {statusKey === 'draft' && (
                      <p className="text-sm text-text-80 max-w-xl">
                        Este orçamento está salvo como rascunho. Quando tiver os dados do cliente e os itens,
                        abra a edição e use <strong className="text-foreground">Finalizar orçamento</strong> para
                        torná-lo pendente e seguir o fluxo normal.
                      </p>
                    )}

                    {statusKey === 'sent' && (
                      <p className="text-sm text-text-80 max-w-xl">
                        Use PDF ou WhatsApp/e-mail para enviar ao cliente. Quando houver retorno, altere o status
                        na lista de orçamentos para <strong className="text-foreground">Aprovado</strong> ou{' '}
                        <strong className="text-foreground">Rejeitado</strong>.
                      </p>
                    )}

                    {canContinueDraft && quote && (
                      <Button
                        type="button"
                        variant="secondary"
                        size="sm"
                        onClick={() => router.push(`/dashboard/quotes/${quote.id}/edit`)}
                      >
                        Continuar edição
                      </Button>
                    )}

                    {canMarkSent && (
                      <Button
                        type="button"
                        variant="primary"
                        size="sm"
                        isLoading={markingSent}
                        onClick={() => void handleMarkAsSent()}
                      >
                        Marcar como enviado
                      </Button>
                    )}

                    {quote &&
                      !canChangeQuoteStatus() &&
                      statusKey !== 'draft' &&
                      statusKey !== 'sent' &&
                      statusKey !== 'approved' &&
                      statusKey !== 'rejected' && (
                        <p className="text-xs text-text-60 max-w-md">
                          Sem permissão para alterar o status deste orçamento. Peça ao administrador a ação{' '}
                          <code className="text-[11px]">quotes:update</code> ou{' '}
                          <code className="text-[11px]">quotes:update_status</code>.
                        </p>
                      )}
                  </div>
                )}

                {actionError && (
                  <p className="mt-2 text-sm text-red-600 dark:text-red-400" role="alert">
                    {actionError}
                  </p>
                )}
              </div>
            </div>

            <div className="flex items-center gap-1 shrink-0">
              {quote && (
                <button
                  type="button"
                  onClick={() => router.push(`/dashboard/quotes/print/${quote.id}`)}
                  className="inline-flex w-12 h-12 items-center gap-2 px-3 py-2 text-sm text-text-80 transition-colors hover:cursor-pointer hover:text-text-100"
                  title="Baixar PDF"
                >
                  <BiSolidFilePdf size={50} />
                </button>
              )}
            </div>
          </div>

          {loading ? (
            <div className="app-card p-8">Carregando...</div>
          ) : !quote ? (
            <div className="app-card p-8">Orçamento não encontrado.</div>
          ) : (
            <QuotePreview quote={quote} />
          )}
        </div>
      </DashboardLayout>
    </ProtectedRoute>
  );
}
