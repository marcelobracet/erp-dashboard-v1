'use client';

import React, { useEffect, useState } from 'react';
import Link from 'next/link';
import { useParams, useRouter } from 'next/navigation';
import ProtectedRoute from '@/components/auth/ProtectedRoute';
import DashboardLayout from '@/components/layout/DashboardLayout';
import QuoteBuilder from '@/components/quotes/QuoteBuilder';
import QuotePreview from '@/components/quotes/QuotePreview';
import { quoteService, type Quote } from '@/lib/api/services';

export default function EditDraftQuotePage() {
  const router = useRouter();
  const params = useParams<{ id: string }>();
  const id = params?.id ? String(params.id) : '';

  const [quote, setQuote] = useState<Quote | null>(null);
  const [previewQuote, setPreviewQuote] = useState<Quote | null>(null);
  const [loading, setLoading] = useState(true);
  const [loadError, setLoadError] = useState<string | null>(null);

  useEffect(() => {
    if (!id) return;
    let mounted = true;
    (async () => {
      try {
        setLoading(true);
        setLoadError(null);
        const q = await quoteService.getById(id);
        if (!mounted) return;
        setQuote(q);
      } catch (e) {
        if (!mounted) return;
        setLoadError(e instanceof Error ? e.message : 'Não foi possível carregar o orçamento.');
        setQuote(null);
      } finally {
        if (mounted) setLoading(false);
      }
    })();
    return () => {
      mounted = false;
    };
  }, [id]);

  const status = (quote?.status ?? '').toLowerCase();
  const isDraft = status === 'draft';

  return (
    <ProtectedRoute>
      <DashboardLayout>
        <div className="space-y-6">
          <div className="flex items-start justify-between gap-4">
            <div>
              <h1 className="text-3xl font-bold text-foreground">Continuar orçamento</h1>
              <p className="text-text-80 mt-1">
                Rascunhos ficam salvos na lista até você finalizar com cliente e itens completos.
              </p>
            </div>
            <Link
              href="/dashboard/quotes"
              className="text-sm text-accent-detail hover:text-accent-muted shrink-0"
            >
              Voltar à lista
            </Link>
          </div>

          {loading ? (
            <div className="app-card p-8 text-text-80">Carregando…</div>
          ) : loadError ? (
            <div className="app-card p-8 text-red-600 dark:text-red-400" role="alert">
              {loadError}
            </div>
          ) : !quote ? (
            <div className="app-card p-8 text-text-80">Orçamento não encontrado.</div>
          ) : !isDraft ? (
            <div className="app-card p-8 space-y-3 text-text-80">
              <p>Este orçamento não está em rascunho.</p>
              <Link
                href={`/dashboard/quotes/${quote.id}`}
                className="inline-flex text-accent-detail hover:text-accent-muted font-medium"
              >
                Abrir orçamento
              </Link>
            </div>
          ) : (
            <div className="grid grid-cols-1 xl:grid-cols-2 gap-6">
              <div>
                <QuoteBuilder
                  existingQuoteId={quote.id}
                  initialQuote={quote}
                  onCancel={() => router.push('/dashboard/quotes')}
                  onSaved={(q, kind) => {
                    if (kind === 'draft') {
                      setQuote(q);
                      setPreviewQuote(q);
                      return;
                    }
                    router.push(`/dashboard/quotes/${q.id}`);
                  }}
                />
              </div>
              <div className="hidden xl:block">
                <div className="sticky top-20">
                  <div className="text-sm font-medium text-text-80 mb-3">Preview</div>
                  {previewQuote ? (
                    <QuotePreview quote={previewQuote} />
                  ) : (
                    <div className="app-card p-6 text-sm text-text-60">Carregando prévia…</div>
                  )}
                </div>
              </div>
            </div>
          )}
        </div>
      </DashboardLayout>
    </ProtectedRoute>
  );
}
