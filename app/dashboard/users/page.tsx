'use client';

import React, { useState, useEffect } from 'react';
import ProtectedRoute from '@/components/auth/ProtectedRoute';
import DashboardLayout from '@/components/layout/DashboardLayout';
import { Table } from '@/components/ui/Table';
import { Modal } from '@/components/ui/Modal';
import Button from '@/components/ui/Button';
import Input from '@/components/ui/Input';
import { userService, User } from '@/lib/api/services';
import { usePermissions } from '@/hooks/usePermissions';
import { formatDate } from '@/lib/utils/format';

function UsersContent() {
  const [users, setUsers] = useState<User[]>([]);
  const [loading, setLoading] = useState(true);
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [selectedUser, setSelectedUser] = useState<User | null>(null);
  const [searchTerm, setSearchTerm] = useState('');
  const [mounted, setMounted] = useState(false);
  const { hasPermission, hasRole } = usePermissions();

  useEffect(() => {
    setMounted(true);
  }, []);

  const fetchUsers = async () => {
    try {
      setLoading(true);
      const data = await userService.list();
      setUsers(data);
    } catch (error) {
      console.error('Failed to fetch users:', error);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    if (mounted) {
      fetchUsers();
    }
  }, [mounted]);

  // Only admins can access this page - but wait for mount to prevent hydration mismatch
  if (!mounted) {
    return (
      <DashboardLayout>
        <div className="min-h-screen flex items-center justify-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-accent"></div>
        </div>
      </DashboardLayout>
    );
  }

  if (!hasRole('admin')) {
    return (
      <DashboardLayout>
        <div className="app-card p-12 text-center">
          <svg
            className="mx-auto h-12 w-12 text-red-400"
            fill="none"
            stroke="currentColor"
            viewBox="0 0 24 24"
          >
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z" />
          </svg>
          <h3 className="mt-2 text-sm font-medium text-foreground">Acesso Negado</h3>
          <p className="mt-1 text-sm text-text-80">
            Você não tem permissão para acessar esta página.
          </p>
        </div>
      </DashboardLayout>
    );
  }

  const filteredUsers = users.filter((user) =>
    user.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
    user.email.toLowerCase().includes(searchTerm.toLowerCase())
  );

  const columns = [
    {
      key: 'name' as keyof User,
      header: 'Nome',
      render: (value: string, row: User) => (
        <div>
          <div className="font-medium text-foreground">{value}</div>
          <div className="text-sm text-text-60">{row.email}</div>
        </div>
      ),
    },
    {
      key: 'role' as keyof User,
      header: 'Função',
      render: (value: string) => (
        <span className="px-2 py-1 rounded-full text-xs font-medium bg-accent-15 text-accent-muted capitalize">
          {value}
        </span>
      ),
    },
    {
      key: 'created_at' as keyof User,
      header: 'Criado em',
      render: (value: string) => formatDate(value),
    },
  ];

  const handleEdit = (user: User) => {
    setSelectedUser(user);
    setIsModalOpen(true);
  };

  const handleDelete = async (id: string) => {
    if (!confirm('Tem certeza que deseja excluir este usuário?')) return;
    try {
      await userService.delete(id);
      fetchUsers();
    } catch (error) {
      console.error('Failed to delete user:', error);
      alert('Erro ao excluir usuário');
    }
  };

  return (
    <DashboardLayout>
      <div className="space-y-6">
        {/* Header */}
        <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
          <div>
            <h1 className="text-3xl font-bold text-foreground">Usuários</h1>
            <p className="text-text-80 mt-1">Gerencie os usuários do sistema</p>
          </div>
          {hasPermission('users', 'create') && (
            <Button onClick={() => {
              setSelectedUser(null);
              setIsModalOpen(true);
            }}>
              Novo Usuário
            </Button>
          )}
        </div>

        {/* Search */}
        <div className="app-card p-4">
          <Input
            placeholder="Buscar por nome ou email..."
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
          data={filteredUsers}
          columns={columns}
          loading={loading}
          actions={(user) => (
            <div className="flex items-center gap-2 justify-end">
              {hasPermission('users', 'update') && (
                <button
                  onClick={(e) => {
                    e.stopPropagation();
                    handleEdit(user);
                  }}
                  className="text-accent-detail hover:text-accent-muted"
                >
                  <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M11 5H6a2 2 0 00-2 2v11a2 2 0 002 2h11a2 2 0 002-2v-5m-1.414-9.414a2 2 0 112.828 2.828L11.828 15H9v-2.828l8.586-8.586z" />
                  </svg>
                </button>
              )}
              {hasPermission('users', 'delete') && (
                <button
                  onClick={(e) => {
                    e.stopPropagation();
                    handleDelete(user.id);
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

        {/* User Modal */}
        <Modal
          isOpen={isModalOpen}
          onClose={() => {
            setIsModalOpen(false);
            setSelectedUser(null);
          }}
          title={selectedUser ? 'Editar Usuário' : 'Novo Usuário'}
          size="md"
          footer={
            <div className="flex justify-end gap-3">
              <Button variant="outline" onClick={() => setIsModalOpen(false)}>
                Cancelar
              </Button>
              <Button
                onClick={async () => {
                  // Implementation would go here
                  setIsModalOpen(false);
                  fetchUsers();
                }}
              >
                Salvar
              </Button>
            </div>
          }
        >
          <div className="space-y-4">
            <Input label="Nome" defaultValue={selectedUser?.name || ''} />
            <Input label="Email" type="email" defaultValue={selectedUser?.email || ''} />
            <div>
              <label className="block text-sm font-medium text-text-80 mb-2">
                Função
              </label>
              <select
                defaultValue={selectedUser?.role || 'user'}
                className="w-full px-4 py-3 rounded-xl border border-glass-10 bg-glass-5 text-foreground focus:outline-none focus:ring-2 focus:ring-accent-20 focus:border-accent-hover"
              >
                <option value="user">Usuário</option>
                <option value="admin">Administrador</option>
              </select>
            </div>
          </div>
        </Modal>
      </div>
    </DashboardLayout>
  );
}

export default function UsersPage() {
  return (
    <ProtectedRoute>
      <UsersContent />
    </ProtectedRoute>
  );
}
