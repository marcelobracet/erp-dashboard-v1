'use client';

import React, { useState, useEffect } from 'react';
import Image from 'next/image';
import ProtectedRoute from '@/components/auth/ProtectedRoute';
import DashboardLayout from '@/components/layout/DashboardLayout';
import { Table } from '@/components/ui/Table';
import { Modal } from '@/components/ui/Modal';
import Button from '@/components/ui/Button';
import Input from '@/components/ui/Input';
import { productService, Product } from '@/lib/api/services';
import { usePermissions } from '@/hooks/usePermissions';
import { ProtectedComponent } from '@/components/auth/ProtectedComponent';
import { formatDate, formatCurrency } from '@/lib/utils/format';
import ProductForm from '@/components/products/ProductForm';

function ProductsContent() {
  const [products, setProducts] = useState<Product[]>([]);
  const [loading, setLoading] = useState(true);
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [selectedProduct, setSelectedProduct] = useState<Product | null>(null);
  const [searchTerm, setSearchTerm] = useState('');
  const { hasPermission } = usePermissions();

  const fetchProducts = async () => {
    try {
      setLoading(true);
      const data = await productService.list();
      setProducts(data);
    } catch (error) {
      console.error('Failed to fetch products:', error);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchProducts();
  }, []);

  const filteredProducts = products.filter((product) =>
    product.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
    product.sku?.toLowerCase().includes(searchTerm.toLowerCase())
  );

  const columns = [
    {
      key: 'name' as keyof Product,
      header: 'Nome',
      render: (value: string, row: Product) => (
        <div className="flex items-center gap-3">
          {row.image_url ? (
            <Image
              src={row.image_url}
              alt={row.name}
              width={40}
              height={40}
              className="w-10 h-10 rounded-lg object-cover border border-glass-10"
            />
          ) : (
            <div className="w-10 h-10 rounded-lg bg-glass-10 border border-glass-10" />
          )}
          <div>
            <div className="font-medium text-foreground">{value}</div>
            {row.sku && <div className="text-sm text-text-60">SKU: {row.sku}</div>}
          </div>
        </div>
      ),
    },
    {
      key: 'price' as keyof Product,
      header: 'Preço',
      render: (value: number) => formatCurrency(value),
    },
    {
      key: 'stock' as keyof Product,
      header: 'Estoque',
      render: (value: number) => (
        <span className={value && value < 10 ? 'text-red-600 dark:text-red-400 font-medium' : ''}>
          {value ?? '-'}
        </span>
      ),
    },
    {
      key: 'created_at' as keyof Product,
      header: 'Criado em',
      render: (value: string) => formatDate(value),
    },
  ];

  const handleEdit = (product: Product) => {
    setSelectedProduct(product);
    setIsModalOpen(true);
  };

  const handleDelete = async (id: string) => {
    if (!confirm('Tem certeza que deseja excluir este produto?')) return;
    try {
      await productService.delete(id);
      fetchProducts();
    } catch (error) {
      console.error('Failed to delete product:', error);
      alert('Erro ao excluir produto');
    }
  };

  const handleExport = async () => {
    try {
      const blob = await productService.export();
      const url = window.URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = `produtos-${new Date().toISOString().split('T')[0]}.xlsx`;
      document.body.appendChild(a);
      a.click();
      window.URL.revokeObjectURL(url);
      document.body.removeChild(a);
    } catch (error) {
      console.error('Failed to export products:', error);
      alert('Erro ao exportar produtos');
    }
  };

  return (
    <DashboardLayout>
      <div className="space-y-6">
        <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
          <div>
            <h1 className="text-3xl font-bold text-foreground">Produtos</h1>
            <p className="text-text-80 mt-1">Gerencie seu catálogo de produtos</p>
          </div>
          <div className="flex gap-3">
            {hasPermission('products', 'export') && (
              <Button variant="outline" onClick={handleExport}>
                Exportar
              </Button>
            )}
            <ProtectedComponent resource="products" action="create">
              <Button onClick={() => {
                setSelectedProduct(null);
                setIsModalOpen(true);
              }}>
                Novo Produto
              </Button>
            </ProtectedComponent>
          </div>
        </div>

        <div className="app-card p-4">
          <Input
            placeholder="Buscar por nome ou SKU..."
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            icon={
              <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" />
              </svg>
            }
          />
        </div>

        <Table
          data={filteredProducts}
          columns={columns}
          loading={loading}
          actions={(product) => (
            <div className="flex items-center gap-2 justify-end">
              {hasPermission('products', 'update') && (
                <button
                  onClick={(e) => {
                    e.stopPropagation();
                    handleEdit(product);
                  }}
                  className="text-accent-detail hover:text-accent-muted"
                >
                  <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M11 5H6a2 2 0 00-2 2v11a2 2 0 002 2h11a2 2 0 002-2v-5m-1.414-9.414a2 2 0 112.828 2.828L11.828 15H9v-2.828l8.586-8.586z" />
                  </svg>
                </button>
              )}
              {hasPermission('products', 'delete') && (
                <button
                  onClick={(e) => {
                    e.stopPropagation();
                    handleDelete(product.id);
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

        <Modal
          isOpen={isModalOpen}
          onClose={() => {
            setIsModalOpen(false);
            setSelectedProduct(null);
          }}
          title={selectedProduct ? 'Editar Produto' : 'Novo Produto'}
          size="md"
        >
          <ProductForm
            product={selectedProduct}
            onCancel={() => {
              setIsModalOpen(false);
              setSelectedProduct(null);
            }}
            onSaved={() => {
              setIsModalOpen(false);
              setSelectedProduct(null);
              fetchProducts();
            }}
          />
        </Modal>
      </div>
    </DashboardLayout>
  );
}

export default function ProductsPage() {
  return (
    <ProtectedRoute>
      <ProductsContent />
    </ProtectedRoute>
  );
}
