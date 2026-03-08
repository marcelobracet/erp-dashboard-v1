'use client';

import React, { useState, useEffect, useCallback } from 'react';
import ProtectedRoute from '@/components/auth/ProtectedRoute';
import DashboardLayout from '@/components/layout/DashboardLayout';
import { Table } from '@/components/ui/Table';
import { Modal } from '@/components/ui/Modal';
import Button from '@/components/ui/Button';
import Input from '@/components/ui/Input';
import { userService, User } from '@/lib/api/services';
import { authService } from '@/lib/api/auth';
import { usePermissions } from '@/hooks/usePermissions';
import { formatDate } from '@/lib/utils/format';
import type { ApiError } from '@/lib/api/client';

// ─── Role options aligned with the API enum ───────────────────────────────────
const ROLES = [
  { value: 'admin',    label: 'Administrador' },
  { value: 'manager',  label: 'Gerente' },
  { value: 'employee', label: 'Funcionário' },
];

type FormMode = 'create' | 'edit';

interface UserFormState {
  name: string;
  email: string;
  password: string;
  role: string;
}

const EMPTY_FORM: UserFormState = { name: '', email: '', password: '', role: 'employee' };

function validateForm(form: UserFormState, mode: FormMode): Partial<Record<keyof UserFormState, string>> {
  const errors: Partial<Record<keyof UserFormState, string>> = {};

  if (!form.name.trim() || form.name.trim().length < 2)
    errors.name = 'Nome deve ter ao menos 2 caracteres.';

  if (!form.email.trim() || !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(form.email))
    errors.email = 'Informe um e-mail válido.';

  if (mode === 'create') {
    if (!form.password || form.password.length < 8)
      errors.password = 'Senha deve ter ao menos 8 caracteres.';
  }

  if (!form.role)
    errors.role = 'Selecione um perfil.';

  return errors;
}

// ─── Role badge ───────────────────────────────────────────────────────────────
function RoleBadge({ role }: { role: string }) {
  const colors: Record<string, string> = {
    admin:    'bg-red-500/15 text-red-400 border-red-500/20',
    manager:  'bg-blue-500/15 text-blue-400 border-blue-500/20',
    employee: 'bg-emerald-500/15 text-emerald-400 border-emerald-500/20',
  };
  const labels: Record<string, string> = {
    admin: 'Administrador', manager: 'Gerente', employee: 'Funcionário',
  };
  const cls = colors[role] ?? 'bg-accent-15 text-accent-muted border-accent-20';
  return (
    <span className={`px-2 py-0.5 rounded-full text-xs font-medium border ${cls} capitalize`}>
      {labels[role] ?? role}
    </span>
  );
}

// ─── Main component ───────────────────────────────────────────────────────────
function UsersContent() {
  const [users, setUsers] = useState<User[]>([]);
  const [loading, setLoading] = useState(true);
  const [mounted, setMounted] = useState(false);
  const [searchTerm, setSearchTerm] = useState('');

  // Modal state
  const [modalOpen, setModalOpen] = useState(false);
  const [modalMode, setModalMode] = useState<FormMode>('create');
  const [selectedUser, setSelectedUser] = useState<User | null>(null);

  // Form state
  const [form, setForm] = useState<UserFormState>(EMPTY_FORM);
  const [formErrors, setFormErrors] = useState<Partial<Record<keyof UserFormState, string>>>({});
  const [generalError, setGeneralError] = useState('');
  const [saving, setSaving] = useState(false);
  const [showPassword, setShowPassword] = useState(false);

  const { hasPermission, hasRole } = usePermissions();

  useEffect(() => { setMounted(true); }, []);

  const fetchUsers = useCallback(async () => {
    try {
      setLoading(true);
      const data = await userService.list();
      setUsers(data);
    } catch {
      // silently ignore
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    if (mounted) fetchUsers();
  }, [mounted, fetchUsers]);

  // ── Modal helpers ──────────────────────────────────────────────────────────

  const openCreate = () => {
    setSelectedUser(null);
    setForm(EMPTY_FORM);
    setFormErrors({});
    setGeneralError('');
    setShowPassword(false);
    setModalMode('create');
    setModalOpen(true);
  };

  const openEdit = (user: User) => {
    setSelectedUser(user);
    setForm({ name: user.name, email: user.email, password: '', role: user.role });
    setFormErrors({});
    setGeneralError('');
    setShowPassword(false);
    setModalMode('edit');
    setModalOpen(true);
  };

  const closeModal = () => {
    setModalOpen(false);
    setSelectedUser(null);
  };

  const setField = (key: keyof UserFormState) =>
    (e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement>) => {
      setForm((prev) => ({ ...prev, [key]: e.target.value }));
      setFormErrors((prev) => ({ ...prev, [key]: undefined }));
      setGeneralError('');
    };

  // ── Submit ─────────────────────────────────────────────────────────────────

  const handleSave = async () => {
    const errors = validateForm(form, modalMode);
    if (Object.keys(errors).length > 0) {
      setFormErrors(errors);
      return;
    }

    setSaving(true);
    setGeneralError('');

    try {
      if (modalMode === 'create') {
        await authService.register({
          name: form.name.trim(),
          email: form.email.trim(),
          password: form.password,
          role: form.role as 'admin' | 'manager' | 'employee',
        });
      } else if (selectedUser) {
        const payload: Partial<User> = {
          name: form.name.trim(),
          email: form.email.trim(),
          role: form.role,
        };
        await userService.update(selectedUser.id, payload);
      }

      closeModal();
      fetchUsers();
    } catch (err) {
      const e = err as ApiError;
      setGeneralError(e.message ?? 'Ocorreu um erro. Tente novamente.');
    } finally {
      setSaving(false);
    }
  };

  // ── Delete ─────────────────────────────────────────────────────────────────

  const handleDelete = async (id: string) => {
    if (!confirm('Tem certeza que deseja excluir este usuário?')) return;
    try {
      await userService.delete(id);
      fetchUsers();
    } catch {
      alert('Erro ao excluir usuário.');
    }
  };

  // ── Guard: not mounted ─────────────────────────────────────────────────────

  if (!mounted) {
    return (
      <DashboardLayout>
        <div className="min-h-screen flex items-center justify-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-accent" />
        </div>
      </DashboardLayout>
    );
  }

  // ── Guard: not admin ───────────────────────────────────────────────────────

  if (!hasRole('admin')) {
    return (
      <DashboardLayout>
        <div className="app-card p-12 text-center">
          <svg className="mx-auto h-12 w-12 text-red-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z" />
          </svg>
          <h3 className="mt-2 text-sm font-medium text-foreground">Acesso Negado</h3>
          <p className="mt-1 text-sm text-text-80">Você não tem permissão para acessar esta página.</p>
        </div>
      </DashboardLayout>
    );
  }

  const filteredUsers = users.filter(
    (u) =>
      u.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
      u.email.toLowerCase().includes(searchTerm.toLowerCase()),
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
      header: 'Perfil',
      render: (value: string) => <RoleBadge role={value} />,
    },
    {
      key: 'created_at' as keyof User,
      header: 'Criado em',
      render: (value: string) => formatDate(value),
    },
  ];

  return (
    <DashboardLayout>
      <div className="space-y-6">
        {/* Header */}
        <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
          <div>
            <h1 className="text-3xl font-bold text-foreground">Usuários</h1>
            <p className="text-text-80 mt-1">Gerencie os usuários do tenant</p>
          </div>
          {hasPermission('users', 'create') && (
            <Button onClick={openCreate} size="md">
              <svg className="w-4 h-4 mr-2" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4v16m8-8H4" />
              </svg>
              Novo Usuário
            </Button>
          )}
        </div>

        {/* Search */}
        <div className="app-card p-4">
          <Input
            placeholder="Buscar por nome ou email…"
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
                  onClick={(e) => { e.stopPropagation(); openEdit(user); }}
                  className="text-accent-detail hover:text-accent-muted transition-colors"
                  title="Editar"
                >
                  <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M11 5H6a2 2 0 00-2 2v11a2 2 0 002 2h11a2 2 0 002-2v-5m-1.414-9.414a2 2 0 112.828 2.828L11.828 15H9v-2.828l8.586-8.586z" />
                  </svg>
                </button>
              )}
              {hasPermission('users', 'delete') && (
                <button
                  onClick={(e) => { e.stopPropagation(); handleDelete(user.id); }}
                  className="text-red-500 hover:text-red-400 transition-colors"
                  title="Excluir"
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

      {/* ── Create / Edit Modal ─────────────────────────────────────────────── */}
      <Modal
        isOpen={modalOpen}
        onClose={closeModal}
        title={modalMode === 'create' ? 'Novo Usuário' : 'Editar Usuário'}
        size="md"
        footer={
          <div className="flex justify-end gap-3">
            <Button variant="outline" onClick={closeModal} disabled={saving}>
              Cancelar
            </Button>
            <Button onClick={handleSave} isLoading={saving} disabled={saving}>
              {modalMode === 'create' ? 'Criar usuário' : 'Salvar alterações'}
            </Button>
          </div>
        }
      >
        <div className="space-y-4">
          {/* General error */}
          {generalError && (
            <div className="flex items-start gap-2 p-3 rounded-lg bg-red-500/10 border border-red-500/20">
              <svg className="w-4 h-4 text-red-400 mt-0.5 shrink-0" fill="currentColor" viewBox="0 0 20 20">
                <path fillRule="evenodd" d="M18 10a8 8 0 11-16 0 8 8 0 0116 0zm-7 4a1 1 0 11-2 0 1 1 0 012 0zm-1-9a1 1 0 00-1 1v4a1 1 0 102 0V6a1 1 0 00-1-1z" clipRule="evenodd" />
              </svg>
              <p className="text-sm text-red-400">{generalError}</p>
            </div>
          )}

          {/* Name */}
          <Input
            label="Nome completo"
            placeholder="Nome Sobrenome"
            value={form.name}
            onChange={setField('name')}
            error={formErrors.name}
            autoComplete="off"
          />

          {/* Email */}
          <Input
            label="E-mail"
            type="email"
            placeholder="usuario@empresa.com"
            value={form.email}
            onChange={setField('email')}
            error={formErrors.email}
            autoComplete="off"
            disabled={modalMode === 'edit'} // email is the identity key
          />

          {/* Password – only on create */}
          {modalMode === 'create' && (
            <div className="space-y-1">
              <label className="block text-sm font-medium text-text-80">Senha</label>
              <div className="relative">
                <input
                  type={showPassword ? 'text' : 'password'}
                  placeholder="Mínimo 8 caracteres"
                  value={form.password}
                  onChange={setField('password')}
                  autoComplete="new-password"
                  className={`w-full px-4 py-3 pr-11 rounded-xl border transition-all bg-glass-5 text-foreground placeholder:text-text-60 focus:outline-none focus:ring-2 focus:ring-opacity-20 ${
                    formErrors.password
                      ? 'border-red-500 focus:border-red-500 focus:ring-red-500'
                      : 'border-glass-10 focus:border-accent-hover focus:ring-accent-20'
                  }`}
                />
                <button
                  type="button"
                  tabIndex={-1}
                  onClick={() => setShowPassword((v) => !v)}
                  className="absolute right-3 top-1/2 -translate-y-1/2 text-text-60 hover:text-foreground transition-colors"
                >
                  {showPassword ? (
                    <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13.875 18.825A10.05 10.05 0 0112 19c-4.478 0-8.268-2.943-9.543-7a9.97 9.97 0 011.563-3.029m5.858.908a3 3 0 114.243 4.243M9.878 9.878l4.242 4.242M9.88 9.88l-3.29-3.29m7.532 7.532l3.29 3.29M3 3l3.59 3.59m0 0A9.953 9.953 0 0112 5c4.478 0 8.268 2.943 9.543 7a10.025 10.025 0 01-4.132 5.411m0 0L21 21" />
                    </svg>
                  ) : (
                    <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 12a3 3 0 11-6 0 3 3 0 016 0z" />
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M2.458 12C3.732 7.943 7.523 5 12 5c4.478 0 8.268 2.943 9.542 7-1.274 4.057-5.064 7-9.542 7-4.477 0-8.268-2.943-9.542-7z" />
                    </svg>
                  )}
                </button>
              </div>
              {formErrors.password && (
                <p className="text-sm text-red-400">{formErrors.password}</p>
              )}
            </div>
          )}

          {/* Role */}
          <div className="space-y-1">
            <label className="block text-sm font-medium text-text-80">Perfil de acesso</label>
            <select
              value={form.role}
              onChange={setField('role')}
              className={`w-full px-4 py-3 rounded-xl border transition-all bg-glass-5 text-foreground focus:outline-none focus:ring-2 focus:ring-opacity-20 ${
                formErrors.role
                  ? 'border-red-500 focus:border-red-500 focus:ring-red-500'
                  : 'border-glass-10 focus:border-accent-hover focus:ring-accent-20'
              }`}
            >
              {ROLES.map((r) => (
                <option key={r.value} value={r.value}>{r.label}</option>
              ))}
            </select>
            {formErrors.role && (
              <p className="text-sm text-red-400">{formErrors.role}</p>
            )}
          </div>
        </div>
      </Modal>
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
