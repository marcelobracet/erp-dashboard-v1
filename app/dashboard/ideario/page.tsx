'use client';

import React, { useCallback, useEffect, useMemo, useState } from 'react';
import ProtectedRoute from '@/components/auth/ProtectedRoute';
import DashboardLayout from '@/components/layout/DashboardLayout';
import Button from '@/components/ui/Button';
import {
  roadmapService,
  type RoadmapItem,
  type RoadmapItemStatus,
} from '@/lib/api/services';
import { usePermissions } from '@/hooks/usePermissions';

const COLUMNS: {
  status: RoadmapItemStatus;
  title: string;
  icon: React.ReactNode;
}[] = [
  {
    status: 'backlog',
    title: 'Melhorias futuras',
    icon: (
      <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
        <path
          strokeLinecap="round"
          strokeLinejoin="round"
          strokeWidth={2}
          d="M9.663 17h4.673M12 3v1m6.364 1.636l-.707.707M21 12h-1M4 12H3m3.343-5.657l-.707-.707m2.828 9.9a5 5 0 117.072 0l-.548.547A3.374 3.374 0 0014 18.469V19a2 2 0 11-4 0v-.531c0-.895-.356-1.754-.988-2.386l-.548-.547z"
        />
      </svg>
    ),
  },
  {
    status: 'in_progress',
    title: 'Em andamento',
    icon: (
      <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
        <path
          strokeLinecap="round"
          strokeLinejoin="round"
          strokeWidth={2}
          d="M13 10V3L4 14h7v7l9-11h-7z"
        />
      </svg>
    ),
  },
  {
    status: 'done',
    title: 'Finalizadas',
    icon: (
      <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
      </svg>
    ),
  },
];

function RoadmapCard({
  item,
  isAdmin,
  onStatusChange,
  onEdit,
  onDelete,
  busy,
}: {
  item: RoadmapItem;
  isAdmin: boolean;
  onStatusChange: (id: string, status: RoadmapItemStatus) => void;
  onEdit: (item: RoadmapItem) => void;
  onDelete: (id: string) => void;
  busy: boolean;
}) {
  return (
    <article className="rounded-2xl border border-glass-10 bg-glass-5/80 backdrop-blur-sm shadow-sm p-4 flex flex-col gap-3 transition-shadow hover:shadow-md">
      <div className="flex items-start justify-between gap-3">
        <h3 className="text-sm font-semibold text-foreground uppercase tracking-wide leading-snug flex-1">
          {item.title}
        </h3>
      </div>
      {item.description ? (
        <p className="text-sm text-text-60 line-clamp-4 whitespace-pre-wrap">{item.description}</p>
      ) : null}
      {isAdmin ? (
        <div className="pt-2 border-t border-glass-10 space-y-2">
          <label className="sr-only" htmlFor={`status-${item.id}`}>
            Coluna
          </label>
          <select
            id={`status-${item.id}`}
            value={item.status}
            disabled={busy}
            onChange={(e) => onStatusChange(item.id, e.target.value as RoadmapItemStatus)}
            className="w-full text-xs rounded-xl border border-glass-10 bg-glass-5 text-text-80 px-3 py-2 focus:outline-none focus:ring-2 focus:ring-accent-20"
          >
            <option value="backlog">Melhorias futuras</option>
            <option value="in_progress">Em andamento</option>
            <option value="done">Finalizadas</option>
          </select>
          <div className="flex gap-2">
            <button
              type="button"
              disabled={busy}
              onClick={() => onEdit(item)}
              className="text-xs font-medium text-accent-muted hover:text-accent-detail px-2 py-1 rounded-lg hover:bg-accent-15"
            >
              Editar
            </button>
            <button
              type="button"
              disabled={busy}
              onClick={() => onDelete(item.id)}
              className="text-xs font-medium text-red-500 hover:text-red-400 px-2 py-1 rounded-lg hover:bg-red-500/10"
            >
              Excluir
            </button>
          </div>
        </div>
      ) : null}
    </article>
  );
}

function SuggestModal({
  open,
  onClose,
  onSubmit,
  submitting,
}: {
  open: boolean;
  onClose: () => void;
  onSubmit: (title: string, description: string) => void;
  submitting: boolean;
}) {
  const [title, setTitle] = useState('');
  const [description, setDescription] = useState('');

  if (!open) return null;

  const close = () => {
    setTitle('');
    setDescription('');
    onClose();
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    const t = title.trim();
    const d = description.trim();
    if (!t || d.length < 4) return;
    onSubmit(t, d);
  };

  const canSubmit = title.trim().length >= 2 && description.trim().length >= 4;

  return (
    <div className="fixed inset-0 z-50 overflow-y-auto">
      <div className="fixed inset-0 bg-overlay-40" onClick={close} aria-hidden />
      <div className="flex min-h-full items-center justify-center p-4">
        <div
          role="dialog"
          aria-modal="true"
          aria-labelledby="ideario-suggest-title"
          className="relative w-full max-w-md rounded-3xl bg-glass-5 border border-glass-10 backdrop-blur-xl shadow-xl px-6 py-8 sm:px-8"
          onClick={(e) => e.stopPropagation()}
        >
          <div className="flex flex-col items-center text-center mb-6">
            <div className="w-12 h-12 rounded-2xl bg-amber-400/20 text-amber-600 dark:text-amber-400 flex items-center justify-center mb-4">
              <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  strokeWidth={2}
                  d="M3 8l7.89 5.26a2 2 0 002.22 0L21 8M5 19h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v10a2 2 0 002 2z"
                />
              </svg>
            </div>
            <h2 id="ideario-suggest-title" className="text-xl font-semibold text-foreground">
              Enviar sugestão
            </h2>
            <p className="mt-2 text-sm text-text-60 max-w-sm">
              Sua mensagem é registrada e enviada ao time de desenvolvimento por e-mail (quando a API
              estiver configurada).
            </p>
          </div>

          <form onSubmit={handleSubmit} className="space-y-5">
            <div>
              <label className="block text-xs font-medium text-text-60 uppercase tracking-wider mb-2 text-left">
                Título
              </label>
              <input
                value={title}
                onChange={(e) => setTitle(e.target.value)}
                placeholder="Ex.: Integração com máquinas CNC"
                className="w-full px-4 py-3 rounded-xl border border-glass-10 bg-glass-5 text-foreground placeholder:text-text-60 focus:outline-none focus:ring-2 focus:ring-accent-20"
              />
            </div>
            <div>
              <label className="block text-xs font-medium text-text-60 uppercase tracking-wider mb-2 text-left">
                Descrição
              </label>
              <textarea
                value={description}
                onChange={(e) => setDescription(e.target.value)}
                placeholder="Conte como isso ajudaria na operação (mínimo 4 caracteres)…"
                rows={4}
                className="w-full px-4 py-3 rounded-xl border border-glass-10 bg-glass-5 text-foreground placeholder:text-text-60 focus:outline-none focus:ring-2 focus:ring-accent-20 resize-y min-h-[100px]"
              />
            </div>
            <div className="flex flex-col-reverse sm:flex-row gap-3 pt-2">
              <Button type="button" variant="secondary" className="flex-1" onClick={close} disabled={submitting}>
                Cancelar
              </Button>
              <Button type="submit" variant="primary" className="flex-1" disabled={!canSubmit || submitting} isLoading={submitting}>
                Enviar
              </Button>
            </div>
          </form>
        </div>
      </div>
    </div>
  );
}

function AdminItemModal({
  open,
  mode,
  initial,
  onClose,
  onSave,
  saving,
}: {
  open: boolean;
  mode: 'create' | 'edit';
  initial: RoadmapItem | null;
  onClose: () => void;
  onSave: (data: { title: string; description: string; status: RoadmapItemStatus }) => void;
  saving: boolean;
}) {
  const [title, setTitle] = useState('');
  const [description, setDescription] = useState('');
  const [status, setStatus] = useState<RoadmapItemStatus>('backlog');

  useEffect(() => {
    if (!open) return;
    if (mode === 'edit' && initial) {
      setTitle(initial.title);
      setDescription(initial.description ?? '');
      setStatus(initial.status);
    } else {
      setTitle('');
      setDescription('');
      setStatus('backlog');
    }
  }, [open, mode, initial]);

  if (!open) return null;

  const close = () => {
    onClose();
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    const t = title.trim();
    if (t.length < 2) return;
    onSave({ title: t, description: description.trim(), status });
  };

  return (
    <div className="fixed inset-0 z-50 overflow-y-auto">
      <div className="fixed inset-0 bg-overlay-40" onClick={close} aria-hidden />
      <div className="flex min-h-full items-center justify-center p-4">
        <div
          role="dialog"
          className="relative w-full max-w-md rounded-3xl bg-glass-5 border border-glass-10 backdrop-blur-xl shadow-xl px-6 py-8 sm:px-8"
          onClick={(e) => e.stopPropagation()}
        >
          <h2 className="text-lg font-semibold text-foreground mb-1">
            {mode === 'create' ? 'Novo card no roteiro' : 'Editar card'}
          </h2>
          <p className="text-sm text-text-60 mb-6">
            Apenas administradores podem alterar o que aparece no Ideário.
          </p>
          <form onSubmit={handleSubmit} className="space-y-4">
            <div>
              <label className="block text-xs font-medium text-text-60 uppercase tracking-wider mb-2">
                Título
              </label>
              <input
                value={title}
                onChange={(e) => setTitle(e.target.value)}
                className="w-full px-4 py-3 rounded-xl border border-glass-10 bg-glass-5 text-foreground focus:outline-none focus:ring-2 focus:ring-accent-20"
              />
            </div>
            <div>
              <label className="block text-xs font-medium text-text-60 uppercase tracking-wider mb-2">
                Descrição
              </label>
              <textarea
                value={description}
                onChange={(e) => setDescription(e.target.value)}
                rows={3}
                className="w-full px-4 py-3 rounded-xl border border-glass-10 bg-glass-5 text-foreground focus:outline-none focus:ring-2 focus:ring-accent-20 resize-y min-h-[80px]"
              />
            </div>
            <div>
              <label className="block text-xs font-medium text-text-60 uppercase tracking-wider mb-2">
                Coluna
              </label>
              <select
                value={status}
                onChange={(e) => setStatus(e.target.value as RoadmapItemStatus)}
                className="w-full px-4 py-3 rounded-xl border border-glass-10 bg-glass-5 text-foreground focus:outline-none focus:ring-2 focus:ring-accent-20"
              >
                <option value="backlog">Melhorias futuras</option>
                <option value="in_progress">Em andamento</option>
                <option value="done">Finalizadas</option>
              </select>
            </div>
            <div className="flex flex-col-reverse sm:flex-row gap-3 pt-2">
              <Button type="button" variant="secondary" className="flex-1" onClick={close} disabled={saving}>
                Cancelar
              </Button>
              <Button type="submit" variant="primary" className="flex-1" disabled={saving || title.trim().length < 2} isLoading={saving}>
                Salvar
              </Button>
            </div>
          </form>
        </div>
      </div>
    </div>
  );
}

function IdearioContent() {
  const { hasRole } = usePermissions();
  const isAdmin = hasRole('admin');
  const [items, setItems] = useState<RoadmapItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);
  const [suggestOpen, setSuggestOpen] = useState(false);
  const [suggestSubmitting, setSuggestSubmitting] = useState(false);
  const [adminOpen, setAdminOpen] = useState(false);
  const [adminMode, setAdminMode] = useState<'create' | 'edit'>('create');
  const [editing, setEditing] = useState<RoadmapItem | null>(null);

  const load = useCallback(async () => {
    setError(null);
    setLoading(true);
    try {
      const data = await roadmapService.listItems();
      setItems(data);
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Não foi possível carregar o Ideário.');
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    void load();
  }, [load]);

  const byStatus = useMemo(() => {
    const map: Record<RoadmapItemStatus, RoadmapItem[]> = {
      backlog: [],
      in_progress: [],
      done: [],
    };
    for (const it of items) {
      const s = it.status in map ? it.status : 'backlog';
      map[s].push(it);
    }
    return map;
  }, [items]);

  const handleStatusChange = async (id: string, status: RoadmapItemStatus) => {
    setBusy(true);
    try {
      const updated = await roadmapService.updateItem(id, { status });
      setItems((prev) => prev.map((x) => (x.id === id ? updated : x)));
    } catch (e) {
      alert(e instanceof Error ? e.message : 'Erro ao atualizar.');
      void load();
    } finally {
      setBusy(false);
    }
  };

  const handleDelete = async (id: string) => {
    if (!confirm('Excluir este card do roteiro?')) return;
    setBusy(true);
    try {
      await roadmapService.deleteItem(id);
      setItems((prev) => prev.filter((x) => x.id !== id));
    } catch (e) {
      alert(e instanceof Error ? e.message : 'Erro ao excluir.');
    } finally {
      setBusy(false);
    }
  };

  const openCreate = () => {
    setAdminMode('create');
    setEditing(null);
    setAdminOpen(true);
  };

  const openEdit = (item: RoadmapItem) => {
    setAdminMode('edit');
    setEditing(item);
    setAdminOpen(true);
  };

  const handleAdminSave = async (data: {
    title: string;
    description: string;
    status: RoadmapItemStatus;
  }) => {
    setBusy(true);
    try {
      if (adminMode === 'create') {
        const created = await roadmapService.createItem({
          title: data.title,
          description: data.description,
          status: data.status,
        });
        setItems((prev) => [created, ...prev]);
      } else if (editing) {
        const updated = await roadmapService.updateItem(editing.id, {
          title: data.title,
          description: data.description,
          status: data.status,
        });
        setItems((prev) => prev.map((x) => (x.id === editing.id ? updated : x)));
      }
      setAdminOpen(false);
      setEditing(null);
    } catch (e) {
      alert(e instanceof Error ? e.message : 'Erro ao salvar.');
    } finally {
      setBusy(false);
    }
  };

  const handleSuggest = async (title: string, description: string) => {
    setSuggestSubmitting(true);
    try {
      const res = await roadmapService.submitSuggestion({ title, description });
      alert(res.message ?? 'Sugestão enviada com sucesso.');
      setSuggestOpen(false);
    } catch (e) {
      alert(e instanceof Error ? e.message : 'Erro ao enviar sugestão.');
    } finally {
      setSuggestSubmitting(false);
    }
  };

  return (
    <>
      <div className="max-w-7xl mx-auto">
        <div className="flex flex-col gap-4 sm:flex-row sm:items-start sm:justify-between mb-8">
          <div className="space-y-2">
            <h1 className="text-2xl sm:text-3xl font-bold text-foreground tracking-tight">
              Ideário
            </h1>
            <p className="text-text-60 text-sm sm:text-base max-w-xl">
              Acompanhe o que estamos desenvolvendo. Envie sugestões para o time — elas são registradas
              e encaminhadas por e-mail.
            </p>
          </div>
          <div className="flex flex-col sm:flex-row gap-2 shrink-0">
            {isAdmin ? (
              <Button
                type="button"
                size="md"
                variant="secondary"
                className="rounded-2xl"
                onClick={openCreate}
                disabled={busy}
              >
                Novo card
              </Button>
            ) : null}
            <Button
              type="button"
              size="md"
              className="rounded-2xl shadow-md"
              onClick={() => setSuggestOpen(true)}
              disabled={busy}
            >
              <span className="flex items-center gap-2">
                <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4v16m8-8H4" />
                </svg>
                Enviar sugestão
              </span>
            </Button>
          </div>
        </div>

        {error ? (
          <div className="mb-6 rounded-2xl border border-red-500/30 bg-red-500/10 px-4 py-3 text-sm text-red-700 dark:text-red-300 flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3">
            <span>{error}</span>
            <Button type="button" variant="outline" size="sm" onClick={() => void load()}>
              Tentar novamente
            </Button>
          </div>
        ) : null}

        {loading ? (
          <div className="grid grid-cols-1 md:grid-cols-3 gap-6 animate-pulse">
            {[1, 2, 3].map((k) => (
              <div key={k} className="h-64 rounded-2xl bg-glass-10" />
            ))}
          </div>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-3 gap-6 lg:gap-8">
            {COLUMNS.map((col) => {
              const list = byStatus[col.status];
              return (
                <section
                  key={col.status}
                  className="flex flex-col min-h-[280px] rounded-2xl border border-glass-10 bg-glass-5/50 backdrop-blur-sm p-4 sm:p-5"
                >
                  <header className="flex items-center gap-2 mb-4 pb-3 border-b border-glass-10">
                    <span className="text-accent-muted">{col.icon}</span>
                    <h2 className="text-sm font-semibold text-foreground uppercase tracking-wide flex-1">
                      {col.title}
                    </h2>
                    <span className="text-xs text-text-60 tabular-nums">
                      {list.length} {list.length === 1 ? 'item' : 'itens'}
                    </span>
                  </header>
                  <div className="flex flex-col gap-3 flex-1">
                    {list.length === 0 ? (
                      <div className="flex-1 flex items-center justify-center rounded-2xl border border-dashed border-glass-10 bg-background/30 py-12 px-4">
                        <p className="text-sm text-text-60 text-center">Nada por aqui ainda</p>
                      </div>
                    ) : (
                      list.map((item) => (
                        <RoadmapCard
                          key={item.id}
                          item={item}
                          isAdmin={isAdmin}
                          onStatusChange={handleStatusChange}
                          onEdit={openEdit}
                          onDelete={handleDelete}
                          busy={busy}
                        />
                      ))
                    )}
                  </div>
                </section>
              );
            })}
          </div>
        )}

        {!isAdmin ? (
          <p className="mt-8 text-xs text-text-60 text-center sm:text-left">
            O roteiro é mantido pelo time de desenvolvimento. Use &quot;Enviar sugestão&quot; para
            contribuir com ideias.
          </p>
        ) : (
          <p className="mt-8 text-xs text-text-60 text-center sm:text-left">
            Administradores podem criar, editar e posicionar os cards do produto.
          </p>
        )}
      </div>

      <SuggestModal
        open={suggestOpen}
        onClose={() => setSuggestOpen(false)}
        onSubmit={handleSuggest}
        submitting={suggestSubmitting}
      />

      <AdminItemModal
        open={adminOpen}
        mode={adminMode}
        initial={editing}
        onClose={() => {
          setAdminOpen(false);
          setEditing(null);
        }}
        onSave={handleAdminSave}
        saving={busy}
      />
    </>
  );
}

export default function IdearioPage() {
  return (
    <ProtectedRoute>
      <DashboardLayout>
        <IdearioContent />
      </DashboardLayout>
    </ProtectedRoute>
  );
}
