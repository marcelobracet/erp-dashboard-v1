'use client';

import React, { useState, useEffect } from 'react';
import ProtectedRoute from '@/components/auth/ProtectedRoute';
import DashboardLayout from '@/components/layout/DashboardLayout';
import { Table } from '@/components/ui/Table';
import Button from '@/components/ui/Button';
import Input from '@/components/ui/Input';
import { quoteService, Quote, Client } from '@/lib/api/services';
import { usePermissions } from '@/hooks/usePermissions';
import { ProtectedComponent } from '@/components/auth/ProtectedComponent';
import { formatDate, formatCurrency } from '@/lib/utils/format';
import { useRouter } from 'next/navigation';

const statusColors: Record<string, string> = {
  pending: 'bg-accent-15 text-accent-muted',
  approved: 'bg-green-100 text-green-800 dark:bg-green-900/30 dark:text-green-400',
  rejected: 'bg-red-100 text-red-800 dark:bg-red-900/30 dark:text-red-400',
  sent: 'bg-accent-20 text-accent-muted',
};

function QuotesContent() {
  const router = useRouter();
  const [quotes, setQuotes] = useState<Quote[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState('');
  const { hasPermission } = usePermissions();

  const fetchQuotes = async () => {
    try {
      setLoading(true);
      const data = await quoteService.list();
      setQuotes(data);
    } catch (error) {
      console.error('Failed to fetch quotes:', error);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchQuotes();
  }, []);

  const filteredQuotes = quotes.filter((quote) =>
    quote.client?.name?.toLowerCase().includes(searchTerm.toLowerCase()) ||
    quote.id.toLowerCase().includes(searchTerm.toLowerCase())
  );

  const columns = [
    {
      key: 'id' as keyof Quote,
      header: 'ID',
      render: (value: string) => <span className="font-mono text-sm">{value.slice(0, 8)}...</span>,
    },
    {
      key: 'client' as keyof Quote,
      header: 'Cliente',
      render: (value: Client | undefined) => value?.name || '-',
    },
    {
      key: 'total' as keyof Quote,
      header: 'Total',
      render: (value: number) => formatCurrency(value),
    },
    {
      key: 'status' as keyof Quote,
      header: 'Status',
      render: (value: string) => (
        <span className={`px-2 py-1 rounded-full text-xs font-medium ${statusColors[value] || 'bg-gray-100 text-gray-800 dark:bg-gray-700 dark:text-gray-300'} capitalize`}>
          {value}
        </span>
      ),
    },
    {
      key: 'created_at' as keyof Quote,
      header: 'Criado em',
      render: (value: string) => formatDate(value),
    },
  ];

  const handleStatusChange = async (id: string, status: string) => {
    try {
      await quoteService.updateStatus(id, status);
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
      <div className="space-y-6">
        {/* Header */}
        <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
          <div>
            <h1 className="text-3xl font-bold text-foreground">Orçamentos</h1>
            <p className="text-text-80 mt-1">Gerencie seus orçamentos e propostas</p>
          </div>
          <ProtectedComponent resource="quotes" action="create">
            <Button onClick={() => router.push('/dashboard/quotes/new')}>Novo Orçamento</Button>
          </ProtectedComponent>
        </div>

        {/* Search */}
        <div className="app-card p-4">
          <Input
            placeholder="Buscar por cliente ou ID..."
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            icon={
              <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" />
              </svg>
            }
          />
        </div>

        {/* Table */}
        <Table
          data={filteredQuotes}
          columns={columns}
          loading={loading}
          onRowClick={(q) => router.push(`/dashboard/quotes/${q.id}`)}
          actions={(quote) => (
            <div className="flex items-center gap-2 justify-end">
              <button
                onClick={(e) => {
                  e.stopPropagation();
                  router.push(`/dashboard/quotes/${quote.id}`);
                }}
                className="text-accent-detail hover:text-accent-muted"
                title="Ver"
              >
                <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 12a3 3 0 11-6 0 3 3 0 016 0z" />
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M2.458 12C3.732 7.943 7.523 5 12 5c4.477 0 8.268 2.943 9.542 7-1.274 4.057-5.065 7-9.542 7-4.477 0-8.268-2.943-9.542-7z" />
                </svg>
              </button>
              {hasPermission('quotes', 'update_status') && (
                <select
                  value={quote.status}
                  onChange={(e) => handleStatusChange(quote.id, e.target.value)}
                  className="text-xs px-2 py-1 rounded border border-glass-10 bg-glass-5 text-foreground"
                  onClick={(e) => e.stopPropagation()}
                >
                  <option value="pending">Pendente</option>
                  <option value="sent">Enviado</option>
                  <option value="approved">Aprovado</option>
                  <option value="rejected">Rejeitado</option>
                </select>
              )}
              {hasPermission('quotes', 'delete') && (
                <button
                  onClick={(e) => {
                    e.stopPropagation();
                    handleDelete(quote.id);
                  }}
                  className="text-red-600 hover:text-red-800 dark:text-red-400 dark:hover:text-red-300"
                >
                  <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" />
                  </svg>
                </button>
              )}
            </div>
          )}
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
