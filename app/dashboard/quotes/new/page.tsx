'use client';

import React from 'react';
import ProtectedRoute from '@/components/auth/ProtectedRoute';
import DashboardLayout from '@/components/layout/DashboardLayout';
import { useRouter } from 'next/navigation';
import QuoteBuilder from '@/components/quotes/QuoteBuilder';
import QuotePreview from '@/components/quotes/QuotePreview';
import type { Quote } from '@/lib/api/services';

export default function NewQuotePage() {
  const router = useRouter();
  const [saved, setSaved] = React.useState<Quote | null>(null);

  return (
    <ProtectedRoute>
      <DashboardLayout>
        <div className="space-y-6">
          <div className="flex items-start justify-between gap-4">
            <div>
              <h1 className="text-3xl dark:text-foreground font-bold">Novo Orçamento</h1>
              <p className="text-text-80 mt-1">
                Selecione produtos cadastrados e informe as medidas para gerar a proposta.
              </p>
            </div>
          </div>

          <div className="grid grid-cols-1 xl:grid-cols-2 gap-6">
            <div>
              <QuoteBuilder
                onCancel={() => router.push('/dashboard/quotes')}
                onSaved={(q, kind) => {
                  if (kind === 'draft') {
                    router.replace(`/dashboard/quotes/${q.id}/edit`);
                    return;
                  }
                  setSaved(q);
                  router.push(`/dashboard/quotes/${q.id}`);
                }}
              />
            </div>

            <div className="hidden xl:block">
              <div className="sticky top-20">
                <div className="text-sm font-medium text-text-80 mb-3">Preview</div>
                {saved ? (
                  <QuotePreview quote={saved} />
                ) : (
                  <div className="app-card p-6 text-sm text-text-60">
                    Salve o orçamento para abrir a visualização completa.
                  </div>
                )}
              </div>
            </div>
          </div>
        </div>
      </DashboardLayout>
    </ProtectedRoute>
  );
}
