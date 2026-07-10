"use client";

import React, { useState, useEffect, useMemo } from "react";
import ProtectedRoute from "@/components/auth/ProtectedRoute";
import DashboardLayout from "@/components/layout/DashboardLayout";
import { Table } from "@/components/ui/Table";
import { Modal } from "@/components/ui/Modal";
import Button from "@/components/ui/Button";
import CreateButton from "@/components/ui/CreateButton";
import Input from "@/components/ui/Input";
import { clientService, Client } from "@/lib/api/services";
import { usePermissions } from "@/hooks/usePermissions";
import { ProtectedComponent } from "@/components/auth/ProtectedComponent";
import { formatDate } from "@/lib/utils/format";
import { useAuth } from "@/contexts/AuthContext";
import { filterClientsForManagement } from "@/lib/clients/filterManagedClients";

function ClientsContent() {
  const [clients, setClients] = useState<Client[]>([]);
  const [loading, setLoading] = useState(true);
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [selectedClient, setSelectedClient] = useState<Client | null>(null);
  const [searchTerm, setSearchTerm] = useState("");
  const { hasPermission } = usePermissions();
  const { user } = useAuth();

  const fetchClients = async () => {
    try {
      setLoading(true);
      const data = await clientService.list();
      setClients(filterClientsForManagement(data, user?.email));
    } catch (error) {
      console.error("Failed to fetch clients:", error);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchClients();
  }, [user?.email]);

  const filteredClients = useMemo(
    () =>
      clients.filter(
        (client) =>
          client.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
          client.email?.toLowerCase().includes(searchTerm.toLowerCase()),
      ),
    [clients, searchTerm],
  );

  const columns = [
    {
      key: "name" as keyof Client,
      header: "Nome",
      render: (value: string, row: Client) => (
        <div>
          <div className="font-medium text-gray-500 dark:text-foreground ">
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
      fetchClients();
    } catch (error) {
      console.error("Failed to delete client:", error);
      alert("Erro ao excluir cliente");
    }
  };

  return (
    <DashboardLayout>
      <div className="space-y-6">
        <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
          <div>
            <h1 className="text-3xl font-bold text-foreground uppercase">
              Clientes
            </h1>
            <p className="text-text-80 mt-1 uppercase">
              Gerencie seus clientes
            </p>
          </div>
          <ProtectedComponent resource="clients" action="create">
            <CreateButton
              onClick={() => {
                setSelectedClient(null);
                setIsModalOpen(true);
              }}
            >
              Novo Cliente
            </CreateButton>
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
                  onClick={(e) => {
                    e.stopPropagation();
                    handleEdit(client);
                  }}
                  className="text-accent-detail hover:text-accent-muted"
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
                  onClick={(e) => {
                    e.stopPropagation();
                    handleDelete(client.id);
                  }}
                  className="text-red-600 hover:text-red-800 dark:text-red-400 dark:hover:text-red-300"
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
          onClose={() => {
            setIsModalOpen(false);
            setSelectedClient(null);
          }}
          title={selectedClient ? "Editar Cliente" : "Novo Cliente"}
          size="md"
          footer={
            <div className="flex justify-end gap-3">
              <Button variant="outline" onClick={() => setIsModalOpen(false)}>
                Cancelar
              </Button>
              <Button
                onClick={async () => {
                  setIsModalOpen(false);
                  fetchClients();
                }}
              >
                Salvar
              </Button>
            </div>
          }
        >
          <div className="space-y-4">
            <Input label="Nome" defaultValue={selectedClient?.name || ""} />
            <Input
              label="Email"
              type="email"
              defaultValue={selectedClient?.email || ""}
            />
            <Input
              label="Telefone"
              defaultValue={selectedClient?.phone || ""}
            />
            <Input
              label="Documento"
              defaultValue={selectedClient?.document || ""}
            />
            <Input
              label="Endereço"
              defaultValue={selectedClient?.address || ""}
            />
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
