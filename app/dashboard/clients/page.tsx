"use client";

import React, { useEffect, useState } from "react";
import ProtectedRoute from "@/components/auth/ProtectedRoute";
import DashboardLayout from "@/components/layout/DashboardLayout";
import { Table } from "@/components/ui/Table";
import { Modal } from "@/components/ui/Modal";
import Button from "@/components/ui/Button";
import Input from "@/components/ui/Input";
import { Switch } from "@/components/ui/Switch";
import { clientService, Client } from "@/lib/api/services";
import { useAuth } from "@/contexts/AuthContext";
import { getTenantIdSync } from "@/lib/auth/tenant";
import { usePermissions } from "@/hooks/usePermissions";
import { ProtectedComponent } from "@/components/auth/ProtectedComponent";
import { formatDate } from "@/lib/utils/format";

type DocumentType = "CPF" | "CNPJ";

type ClientFormState = {
  name: string;
  email: string;
  phone: string;
  document: string;
  document_type: DocumentType;
  address: string;
  city: string;
  state: string;
  zip_code: string;
  is_active: boolean;
};

function emptyForm(): ClientFormState {
  return {
    name: "",
    email: "",
    phone: "",
    document: "",
    document_type: "CPF",
    address: "",
    city: "",
    state: "",
    zip_code: "",
    is_active: true,
  };
}

function clientToForm(c: Client): ClientFormState {
  const dt = c.document_type?.toUpperCase() === "CNPJ" ? "CNPJ" : "CPF";
  return {
    name: c.name ?? "",
    email: c.email ?? "",
    phone: c.phone ?? "",
    document: c.document ?? "",
    document_type: dt,
    address: c.address ?? "",
    city: c.city ?? "",
    state: c.state ?? "",
    zip_code: c.zip_code ?? "",
    is_active: c.is_active !== false,
  };
}

function errMessage(err: unknown): string {
  if (err && typeof err === "object" && "message" in err) {
    const m = (err as { message: unknown }).message;
    if (typeof m === "string" && m.trim()) return m;
  }
  return "Ocorreu um erro inesperado.";
}

function ClientsContent() {
  const [clients, setClients] = useState<Client[]>([]);
  const [loading, setLoading] = useState(true);
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [selectedClient, setSelectedClient] = useState<Client | null>(null);
  const [searchTerm, setSearchTerm] = useState("");
  const [form, setForm] = useState<ClientFormState>(emptyForm);
  const [saving, setSaving] = useState(false);
  const [formError, setFormError] = useState<string | null>(null);
  const { hasPermission } = usePermissions();
  const { user } = useAuth();

  const fetchClients = async () => {
    try {
      setLoading(true);
      const data = await clientService.list({ limit: 1000 });
      setClients(data);
    } catch (error) {
      console.error("Failed to fetch clients:", error);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchClients();
  }, []);

  useEffect(() => {
    if (!isModalOpen) return;
    if (selectedClient) {
      setForm(clientToForm(selectedClient));
    } else {
      setForm(emptyForm());
    }
    setFormError(null);
  }, [isModalOpen, selectedClient]);

  const filteredClients = clients?.filter(
    (client) =>
      client.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
      (client.email?.toLowerCase().includes(searchTerm.toLowerCase()) ?? false),
  );

  const columns = [
    {
      key: "name" as keyof Client,
      header: "Nome",
      render: (value: string, row: Client) => (
        <div>
          <div className="font-medium text-foreground dark:text-white">
            {value}
          </div>
          {row.email && (
            <div className="text-sm text-gray-500 dark:text-gray-400">
              {row.email}
            </div>
          )}
        </div>
      ),
    },
    {
      key: "phone" as keyof Client,
      header: "Telefone",
    },
    {
      key: "document" as keyof Client,
      header: "Documento",
      render: (value: string, row: Client) => (
        <div className="flex flex-col">
          <span className="text-sm text-foreground">{value || "-"}</span>
          {row.document_type && (
            <span className="text-xs text-text-60">{row.document_type}</span>
          )}
        </div>
      ),
    },
    {
      key: "city" as keyof Client,
      header: "Cidade/UF",
      render: (_: unknown, row: Client) => {
        const city = row.city?.trim();
        const state = row.state?.trim();
        if (!city && !state) return "-";
        return `${city ?? ""}${city && state ? "/" : ""}${state ?? ""}`;
      },
    },
    {
      key: "is_active" as keyof Client,
      header: "Status",
      className: "text-right",
      render: (value: boolean | undefined) => {
        const active = value !== false;
        return (
          <span
            className={`inline-flex items-center px-2.5 py-1 rounded-full text-xs font-medium border ${
              active
                ? "bg-emerald-500/10 text-emerald-400 border-emerald-500/20"
                : "bg-red-500/10 text-red-400 border-red-500/20"
            }`}
          >
            {active ? "Ativo" : "Inativo"}
          </span>
        );
      },
    },
    {
      key: "created_at" as keyof Client,
      header: "Criado em",
      render: (value: string) => formatDate(value),
    },
  ];

  const handleEdit = (client: Client) => {
    setSelectedClient(client);
    setIsModalOpen(true);
  };

  const handleDelete = async (id: string) => {
    if (!confirm("Tem certeza que deseja excluir este cliente?")) return;
    try {
      await clientService.delete(id);
      await fetchClients();
    } catch (error) {
      console.error("Failed to delete client:", error);
      alert(errMessage(error));
    }
  };

  async function handleSave() {
    setFormError(null);
    const name = form.name.trim();
    if (!name) {
      setFormError("Informe o nome do cliente.");
      return;
    }

    let tenantIdForCreate: string | undefined;
    if (!selectedClient) {
      const email = form.email.trim();
      const phone = form.phone.trim();
      const document = form.document.trim();
      if (!email) {
        setFormError("E-mail é obrigatório para cadastro.");
        return;
      }
      if (!phone) {
        setFormError("Telefone é obrigatório para cadastro.");
        return;
      }
      if (!document) {
        setFormError("Documento é obrigatório para cadastro.");
        return;
      }
      const tid = user?.tenant_id?.trim() || getTenantIdSync()?.trim();
      if (!tid) {
        setFormError(
          "Não foi possível identificar o tenant. Faça login novamente ou atualize a página.",
        );
        return;
      }
      tenantIdForCreate = tid;
    }

    setSaving(true);
    try {
      if (selectedClient) {
        const payload: Partial<Client> = {
          name,
          email: form.email.trim(),
          phone: form.phone.trim(),
          document: form.document.trim(),
          document_type: form.document_type,
          address: form.address.trim(),
          city: form.city.trim(),
          state: form.state.trim(),
          zip_code: form.zip_code.trim(),
          is_active: form.is_active,
        };
        await clientService.update(selectedClient.id, payload);
      } else {
        if (!tenantIdForCreate) {
          setFormError(
            "Não foi possível identificar o tenant. Faça login novamente ou atualize a página.",
          );
          return;
        }
        await clientService.create({
          tenant_id: tenantIdForCreate,
          name,
          email: form.email.trim(),
          phone: form.phone.trim(),
          document: form.document.trim(),
          document_type: form.document_type,
          address: form.address.trim() || undefined,
          city: form.city.trim() || undefined,
          state: form.state.trim() || undefined,
          zip_code: form.zip_code.trim() || undefined,
        });
      }
      setIsModalOpen(false);
      setSelectedClient(null);
      await fetchClients();
    } catch (e) {
      setFormError(errMessage(e));
    } finally {
      setSaving(false);
    }
  }

  function closeModal() {
    setIsModalOpen(false);
    setSelectedClient(null);
    setFormError(null);
  }

  return (
    <DashboardLayout>
      <div className="space-y-6">
        <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
          <div>
            <h1 className="text-3xl font-bold text-foreground">Clientes</h1>
            <p className="text-text-80 mt-1">Gerencie seus clientes</p>
          </div>
          <ProtectedComponent resource="clients" action="create">
            <Button
              variant="primary"
              onClick={() => {
                setSelectedClient(null);
                setIsModalOpen(true);
              }}
            >
              Novo Cliente
            </Button>
          </ProtectedComponent>
        </div>

        <div className="w-full">
          <Input
            placeholder="Buscar por nome ou email..."
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            icon={
              <svg
                className="w-5 h-5"
                fill="none"
                stroke="currentColor"
                viewBox="0 0 24 24"
              >
                <path
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  strokeWidth={2}
                  d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z"
                />
              </svg>
            }
          />
        </div>

        <Table
          data={filteredClients}
          columns={columns}
          loading={loading}
          actions={(client) => (
            <div className="flex items-center gap-2 justify-end">
              {hasPermission("clients", "update") && (
                <button
                  type="button"
                  onClick={(e) => {
                    e.stopPropagation();
                    handleEdit(client);
                  }}
                  className="text-accent-detail hover:text-accent-muted"
                  title="Editar"
                >
                  <svg
                    className="w-5 h-5"
                    fill="none"
                    stroke="currentColor"
                    viewBox="0 0 24 24"
                  >
                    <path
                      strokeLinecap="round"
                      strokeLinejoin="round"
                      strokeWidth={2}
                      d="M11 5H6a2 2 0 00-2 2v11a2 2 0 002 2h11a2 2 0 002-2v-5m-1.414-9.414a2 2 0 112.828 2.828L11.828 15H9v-2.828l8.586-8.586z"
                    />
                  </svg>
                </button>
              )}
              {hasPermission("clients", "delete") && (
                <button
                  type="button"
                  onClick={(e) => {
                    e.stopPropagation();
                    handleDelete(client.id);
                  }}
                  className="text-red-600 hover:text-red-800 dark:text-red-400 dark:hover:text-red-300"
                  title="Excluir"
                >
                  <svg
                    className="w-5 h-5"
                    fill="none"
                    stroke="currentColor"
                    viewBox="0 0 24 24"
                  >
                    <path
                      strokeLinecap="round"
                      strokeLinejoin="round"
                      strokeWidth={2}
                      d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16"
                    />
                  </svg>
                </button>
              )}
            </div>
          )}
        />

        <Modal
          isOpen={isModalOpen}
          onClose={closeModal}
          title={selectedClient ? "Editar Cliente" : "Novo Cliente"}
          size="md"
          footer={
            <div className="flex justify-end gap-3">
              <Button variant="outline" type="button" onClick={closeModal} disabled={saving}>
                Cancelar
              </Button>
              <Button type="button" isLoading={saving} onClick={() => void handleSave()}>
                Salvar
              </Button>
            </div>
          }
        >
          <div className="space-y-4">
            {formError && (
              <p className="text-sm text-red-600 dark:text-red-400" role="alert">
                {formError}
              </p>
            )}

            <Input
              label="Nome"
              value={form.name}
              onChange={(e) => setForm((f) => ({ ...f, name: e.target.value }))}
              required
            />
            <Input
              label="E-mail"
              type="email"
              value={form.email}
              onChange={(e) => setForm((f) => ({ ...f, email: e.target.value }))}
              required={!selectedClient}
            />
            <Input
              label="Telefone"
              value={form.phone}
              onChange={(e) => setForm((f) => ({ ...f, phone: e.target.value }))}
              required={!selectedClient}
            />

            <div>
              <label className="block text-sm font-medium text-text-80 mb-2">Tipo de documento</label>
              <select
                className="w-full px-4 py-3 rounded-xl border border-glass-10 bg-glass-5 text-foreground focus:outline-none focus:ring-2 focus:ring-accent/30"
                value={form.document_type}
                onChange={(e) =>
                  setForm((f) => ({
                    ...f,
                    document_type: e.target.value as DocumentType,
                  }))
                }
              >
                <option value="CPF">CPF</option>
                <option value="CNPJ">CNPJ</option>
              </select>
            </div>

            <Input
              label="Documento"
              value={form.document}
              onChange={(e) => setForm((f) => ({ ...f, document: e.target.value }))}
              required={!selectedClient}
            />

            <Input
              label="Endereço"
              value={form.address}
              onChange={(e) => setForm((f) => ({ ...f, address: e.target.value }))}
            />
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <Input
                label="Cidade"
                value={form.city}
                onChange={(e) => setForm((f) => ({ ...f, city: e.target.value }))}
              />
              <Input
                label="UF"
                value={form.state}
                onChange={(e) => setForm((f) => ({ ...f, state: e.target.value }))}
                maxLength={2}
              />
            </div>
            <Input
              label="CEP"
              value={form.zip_code}
              onChange={(e) => setForm((f) => ({ ...f, zip_code: e.target.value }))}
            />

            {selectedClient && (
              <div className="flex items-center justify-between gap-4 rounded-xl border border-glass-10 bg-glass-5 px-4 py-3">
                <div>
                  <div className="text-sm font-medium text-foreground">Cliente ativo</div>
                  <div className="text-xs text-text-60">Inativos não aparecem em alguns fluxos</div>
                </div>
                <Switch
                  checked={form.is_active}
                  onCheckedChange={(checked) => setForm((f) => ({ ...f, is_active: checked }))}
                  aria-label="Cliente ativo"
                />
              </div>
            )}

            {!selectedClient && (
              <p className="text-xs text-text-60">
                Cadastro: nome, e-mail, telefone e documento são obrigatórios na API (tipo CPF ou CNPJ).
              </p>
            )}
          </div>
        </Modal>
      </div>
    </DashboardLayout>
  );
}

export default function ClientsPage() {
  return (
    <ProtectedRoute>
      <ClientsContent />
    </ProtectedRoute>
  );
}
