'use client';

import React, { useEffect, useState } from 'react';
import { IoIosArrowBack } from "react-icons/io";
import { BiSolidFilePdf } from "react-icons/bi";
import ProtectedRoute from '@/components/auth/ProtectedRoute';
import DashboardLayout from '@/components/layout/DashboardLayout';
import QuotePreview from '@/components/quotes/QuotePreview';
import { quoteService, Quote } from '@/lib/api/services';
import { useRouter, useParams } from 'next/navigation';

export default function QuoteDetailsPage() {
  const router = useRouter();
  const params = useParams<{ id: string }>();
  const id = params?.id;

  const [quote, setQuote] = useState<Quote | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    let mounted = true;
    (async () => {
      try {
        setLoading(true);
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

  return (
    <ProtectedRoute>
      <DashboardLayout>
        <div className="space-y-6">
          <div className="flex items-center justify-between gap-4 no-print">
            <div>

            <div className="flex items-center gap-4">
                <button
                type="button"
                className='hover:cursor-pointer' onClick={() => router.push('/dashboard/quotes')}>
                <IoIosArrowBack />
              </button>
              <h1 className="text-3xl font-bold text-foreground">Orçamento</h1>
            </div>
              <p className="text-text-80 mt-1">Visualize e imprima a proposta.</p>
            </div>
            <div className="flex items-center gap-1">
              
              {quote && (
                <button
                  type="button"
                  onClick={() => router.push(`/dashboard/quotes/print/${quote.id}`)}
                  className="inline-flex w-12 h-12 items-center gap-2 px-3 py-2 text-sm text-text-80 transition-colors hover:cursor-pointer hover:text-text-100"
                  title="Baixar PDF"
                >
                  <BiSolidFilePdf size={"50px"} />
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
