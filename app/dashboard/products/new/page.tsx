'use client';

import React from 'react';
import ProtectedRoute from '@/components/auth/ProtectedRoute';
import DashboardLayout from '@/components/layout/DashboardLayout';
import { useRouter } from 'next/navigation';
import ProductForm from '@/components/products/ProductForm';

export default function NewProductPage() {
  const router = useRouter();

  return (
    <ProtectedRoute>
      <DashboardLayout>
        <div className="max-w-2xl space-y-6">
          <div>
            <h1 className="text-3xl font-bold text-foreground">Cadastrar produto</h1>
            <p className="text-text-80 mt-1">
              Cadastre materiais, serviços e acessórios para gerar orçamentos.
            </p>
          </div>

          <div className="app-card p-6">
            <ProductForm
              onCancel={() => router.push('/dashboard/products')}
              onSaved={() => router.push('/dashboard/products')}
            />
          </div>
        </div>
      </DashboardLayout>
    </ProtectedRoute>
  );
}
