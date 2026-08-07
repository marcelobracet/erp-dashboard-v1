"use client";

import React, { useCallback, useEffect, useState } from "react";
import ProtectedRoute from "@/components/auth/ProtectedRoute";
import DashboardLayout from "@/components/layout/DashboardLayout";
import Button from "@/components/ui/Button";
import Input from "@/components/ui/Input";
import { Modal } from "@/components/ui/Modal";
import {
  roadmapService,
  RoadmapItem,
  RoadmapItemStatus,
} from "@/lib/api/services";
import { usePermissions } from "@/hooks/usePermissions";

const STATUS_LABEL: Record<RoadmapItemStatus, string> = {
  backlog: "Ideias",
  in_progress: "Em desenvolvimento",
  done: "Lançado",
};

const STATUS_ORDER: RoadmapItemStatus[] = ["in_progress", "backlog", "done"];

function StatusBadge({ status }: { status: RoadmapItemStatus }) {
  const styles: Record<RoadmapItemStatus, string> = {
    backlog: "bg-glass-15 text-text-60",
    in_progress: "bg-accent/15 text-accent",
    done: "bg-emerald-500/15 text-emerald-400",
  };
  return (
    <span
      className={`inline-flex items-center rounded-full px-2.5 py-1 text-xs font-medium ${styles[status]}`}
    >
      {STATUS_LABEL[status]}
    </span>
  );
}

export default function IdearioPage() {
  const { hasRole } = usePermissions();
  const isAdmin = hasRole("admin");

  const [items, setItems] = useState<RoadmapItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const [suggestionOpen, setSuggestionOpen] = useState(false);
  const [suggestionTitle, setSuggestionTitle] = useState("");
  const [suggestionDescription, setSuggestionDescription] = useState("");
  const [suggestionSubmitting, setSuggestionSubmitting] = useState(false);
  const [suggestionFeedback, setSuggestionFeedback] = useState<string | null>(
    null,
  );

  const [itemModalOpen, setItemModalOpen] = useState(false);
  const [editingItem, setEditingItem] = useState<RoadmapItem | null>(null);
  const [itemTitle, setItemTitle] = useState("");
  const [itemDescription, setItemDescription] = useState("");
  const [itemStatus, setItemStatus] =
    useState<RoadmapItemStatus>("backlog");
  const [itemSubmitting, setItemSubmitting] = useState(false);

  const loadItems = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const data = await roadmapService.listItems();
      setItems(data);
    } catch {
      setError("Não foi possível carregar o ideário agora.");
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    loadItems();
  }, [loadItems]);

  const openCreateModal = () => {
    setEditingItem(null);
    setItemTitle("");
    setItemDescription("");
    setItemStatus("backlog");
    setItemModalOpen(true);
  };

  const openEditModal = (item: RoadmapItem) => {
    setEditingItem(item);
    setItemTitle(item.title);
    setItemDescription(item.description);
    setItemStatus(item.status);
    setItemModalOpen(true);
  };

  const handleSaveItem = async () => {
    if (!itemTitle.trim()) return;
    setItemSubmitting(true);
    try {
      if (editingItem) {
        await roadmapService.updateItem(editingItem.id, {
          title: itemTitle,
          description: itemDescription,
          status: itemStatus,
        });
      } else {
        await roadmapService.createItem({
          title: itemTitle,
          description: itemDescription,
          status: itemStatus,
        });
      }
      setItemModalOpen(false);
      await loadItems();
    } catch {
      setError("Não foi possível salvar o item agora.");
    } finally {
      setItemSubmitting(false);
    }
  };

  const handleDeleteItem = async (item: RoadmapItem) => {
    if (!window.confirm(`Remover "${item.title}" do ideário?`)) return;
    try {
      await roadmapService.deleteItem(item.id);
      await loadItems();
    } catch {
      setError("Não foi possível remover o item agora.");
    }
  };

  const handleSubmitSuggestion = async () => {
    if (!suggestionTitle.trim()) return;
    setSuggestionSubmitting(true);
    setSuggestionFeedback(null);
    try {
      const res = await roadmapService.submitSuggestion({
        title: suggestionTitle,
        description: suggestionDescription,
      });
      setSuggestionFeedback(res?.message ?? "Sugestão enviada!");
      setSuggestionTitle("");
      setSuggestionDescription("");
      setTimeout(() => {
        setSuggestionOpen(false);
        setSuggestionFeedback(null);
      }, 1800);
    } catch {
      setSuggestionFeedback("Não foi possível enviar agora. Tente de novo.");
    } finally {
      setSuggestionSubmitting(false);
    }
  };

  return (
    <ProtectedRoute>
      <DashboardLayout>
        <div className="flex flex-col gap-6">
          <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
            <div>
              <h1 className="text-2xl font-bold text-foreground">Ideário</h1>
              <p className="mt-1 text-sm text-text-60">
                O que estamos construindo e o que vocês estão pedindo.
              </p>
            </div>
            <div className="flex gap-2">
              <Button variant="outline" onClick={() => setSuggestionOpen(true)}>
                Sugerir ideia
              </Button>
              {isAdmin && (
                <Button variant="primary" onClick={openCreateModal}>
                  Novo item
                </Button>
              )}
            </div>
          </div>

          {error && (
            <div className="rounded-lg border border-red-500/30 bg-red-500/10 px-4 py-3 text-sm text-red-400">
              {error}
            </div>
          )}

          {loading ? (
            <div className="text-sm text-text-60">Carregando ideário…</div>
          ) : items.length === 0 ? (
            <div className="rounded-xl border border-glass-10 bg-glass-5 p-8 text-center text-sm text-text-60">
              Nenhum item no ideário ainda.
            </div>
          ) : (
            <div className="grid gap-6 md:grid-cols-3">
              {STATUS_ORDER.map((status) => {
                const statusItems = items.filter((i) => i.status === status);
                return (
                  <div key={status} className="flex flex-col gap-3">
                    <div className="flex items-center gap-2">
                      <h2 className="text-sm font-semibold text-text-80">
                        {STATUS_LABEL[status]}
                      </h2>
                      <span className="text-xs text-text-60">
                        ({statusItems.length})
                      </span>
                    </div>
                    <div className="flex flex-col gap-3">
                      {statusItems.map((item) => (
                        <div
                          key={item.id}
                          className="rounded-xl border border-glass-10 bg-glass-5 p-4"
                        >
                          <div className="flex items-start justify-between gap-2">
                            <h3 className="font-medium text-foreground">
                              {item.title}
                            </h3>
                            <StatusBadge status={item.status} />
                          </div>
                          {item.description && (
                            <p className="mt-2 text-sm text-text-60">
                              {item.description}
                            </p>
                          )}
                          {isAdmin && (
                            <div className="mt-3 flex gap-3">
                              <button
                                onClick={() => openEditModal(item)}
                                className="text-xs font-medium text-accent hover:underline"
                              >
                                Editar
                              </button>
                              <button
                                onClick={() => handleDeleteItem(item)}
                                className="text-xs font-medium text-red-400 hover:underline"
                              >
                                Remover
                              </button>
                            </div>
                          )}
                        </div>
                      ))}
                      {statusItems.length === 0 && (
                        <div className="rounded-xl border border-dashed border-glass-10 p-4 text-center text-xs text-text-60">
                          Sem itens aqui
                        </div>
                      )}
                    </div>
                  </div>
                );
              })}
            </div>
          )}
        </div>

        {/* Sugerir ideia (qualquer usuário) */}
        <Modal
          isOpen={suggestionOpen}
          onClose={() => setSuggestionOpen(false)}
          title="Sugerir uma ideia"
          footer={
            <Button
              variant="primary"
              onClick={handleSubmitSuggestion}
              disabled={suggestionSubmitting || !suggestionTitle.trim()}
            >
              {suggestionSubmitting ? "Enviando…" : "Enviar sugestão"}
            </Button>
          }
        >
          <div className="flex flex-col gap-4">
            <Input
              label="Título"
              value={suggestionTitle}
              onChange={(e) => setSuggestionTitle(e.target.value)}
              placeholder="Ex.: Exportar orçamento em PDF"
            />
            <div>
              <label className="mb-2 block text-sm font-medium text-text-80">
                Descrição
              </label>
              <textarea
                value={suggestionDescription}
                onChange={(e) => setSuggestionDescription(e.target.value)}
                rows={4}
                className="w-full rounded-lg border border-glass-10 bg-glass-5 px-3 py-2 text-sm text-foreground outline-none focus:border-accent"
                placeholder="Conte um pouco mais sobre o que você precisa"
              />
            </div>
            {suggestionFeedback && (
              <p className="text-sm text-text-60">{suggestionFeedback}</p>
            )}
          </div>
        </Modal>

        {/* Criar/editar item (admin) */}
        <Modal
          isOpen={itemModalOpen}
          onClose={() => setItemModalOpen(false)}
          title={editingItem ? "Editar item" : "Novo item do ideário"}
          footer={
            <Button
              variant="primary"
              onClick={handleSaveItem}
              disabled={itemSubmitting || !itemTitle.trim()}
            >
              {itemSubmitting ? "Salvando…" : "Salvar"}
            </Button>
          }
        >
          <div className="flex flex-col gap-4">
            <Input
              label="Título"
              value={itemTitle}
              onChange={(e) => setItemTitle(e.target.value)}
            />
            <div>
              <label className="mb-2 block text-sm font-medium text-text-80">
                Descrição
              </label>
              <textarea
                value={itemDescription}
                onChange={(e) => setItemDescription(e.target.value)}
                rows={4}
                className="w-full rounded-lg border border-glass-10 bg-glass-5 px-3 py-2 text-sm text-foreground outline-none focus:border-accent"
              />
            </div>
            <div>
              <label className="mb-2 block text-sm font-medium text-text-80">
                Status
              </label>
              <select
                value={itemStatus}
                onChange={(e) =>
                  setItemStatus(e.target.value as RoadmapItemStatus)
                }
                className="w-full rounded-lg border border-glass-10 bg-glass-5 px-3 py-2 text-sm text-foreground outline-none focus:border-accent"
              >
                {STATUS_ORDER.map((status) => (
                  <option key={status} value={status}>
                    {STATUS_LABEL[status]}
                  </option>
                ))}
              </select>
            </div>
          </div>
        </Modal>
      </DashboardLayout>
    </ProtectedRoute>
  );
}
