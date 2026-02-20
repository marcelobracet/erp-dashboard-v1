'use client';

import React, { useEffect, useState } from 'react';
import ProtectedRoute from '@/components/auth/ProtectedRoute';
import QuotePreview from '@/components/quotes/QuotePreview';
import { quoteService, Quote } from '@/lib/api/services';
import { useParams } from 'next/navigation';

export default function QuotePrintPage() {
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

  useEffect(() => {
    if (!loading && quote) {
      setTimeout(() => window.print(), 300);
    }
  }, [loading, quote]);

  return (
    <ProtectedRoute>
      <div className="min-h-screen bg-white p-6">
        {loading ? (
          <div>Carregando...</div>
        ) : !quote ? (
          <div>Orçamento não encontrado.</div>
        ) : (
          <QuotePreview quote={quote} />
        )}
      </div>
    </ProtectedRoute>
  );
}
