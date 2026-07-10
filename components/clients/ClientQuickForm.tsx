"use client";

import React, { useState } from "react";
import Button from "@/components/ui/Button";
import Input from "@/components/ui/Input";
import { Modal } from "@/components/ui/Modal";
import { clientService, type Client } from "@/lib/api/services";

type ClientQuickFormProps = {
  isOpen: boolean;
  onClose: () => void;
  onCreated: (client: Client) => void;
};

const EMPTY = {
  name: "",
  email: "",
  phone: "",
  document: "",
  document_type: "CPF",
  address: "",
  city: "",
  state: "",
  zip_code: "",
};

export default function ClientQuickForm({
  isOpen,
  onClose,
  onCreated,
}: ClientQuickFormProps) {
  const [form, setForm] = useState(EMPTY);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const reset = () => {
    setForm(EMPTY);
    setError(null);
  };

  const handleClose = () => {
    reset();
    onClose();
  };

  const handleSave = async () => {
    setError(null);
    if (!form.name.trim()) {
      setError("Informe o nome do cliente.");
      return;
    }
    if (!form.document.trim()) {
      setError("Informe o documento (CPF/CNPJ).");
      return;
    }

    setSaving(true);
    try {
      const created = await clientService.create({
        name: form.name.trim(),
        email: form.email.trim() || undefined,
        phone: form.phone.trim() || undefined,
        document: form.document.trim(),
        document_type: form.document_type.toUpperCase() as "cpf" | "cnpj",
        address: form.address.trim() || undefined,
        city: form.city.trim() || undefined,
        state: form.state.trim() || undefined,
        zip_code: form.zip_code.trim() || undefined,
      });
      onCreated(created);
      reset();
      onClose();
    } catch (err) {
      setError(
        err instanceof Error ? err.message : "Erro ao cadastrar cliente.",
      );
    } finally {
      setSaving(false);
    }
  };

  return (
    <Modal
      isOpen={isOpen}
      onClose={handleClose}
      title="Cadastrar cliente"
      size="md"
      footer={
        <div className="flex justify-end gap-3">
          <Button variant="outline" onClick={handleClose} disabled={saving}>
            Cancelar
          </Button>
          <Button onClick={() => void handleSave()} isLoading={saving}>
            Salvar e usar no orçamento
          </Button>
        </div>
      }
    >
      <div className="space-y-4">
        {error ? (
          <div className="rounded-lg border border-red-500/30 bg-red-500/10 px-3 py-2 text-sm text-red-400">
            {error}
          </div>
        ) : null}
        <Input
          label="Nome *"
          value={form.name}
          onChange={(e) => setForm((p) => ({ ...p, name: e.target.value }))}
        />
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
          <Input
            label="Telefone"
            value={form.phone}
            onChange={(e) => setForm((p) => ({ ...p, phone: e.target.value }))}
          />
          <Input
            label="E-mail"
            type="email"
            value={form.email}
            onChange={(e) => setForm((p) => ({ ...p, email: e.target.value }))}
          />
        </div>
        <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
          <div className="sm:col-span-2">
            <Input
              label="Documento *"
              value={form.document}
              onChange={(e) =>
                setForm((p) => ({ ...p, document: e.target.value }))
              }
            />
          </div>
          <div>
            <label className="block text-sm font-medium text-text-80 mb-2">
              Tipo
            </label>
            <select
              value={form.document_type}
              onChange={(e) =>
                setForm((p) => ({ ...p, document_type: e.target.value }))
              }
              className="w-full px-4 py-3 rounded-xl border border-glass-10 bg-glass-5 text-foreground"
            >
              <option value="cpf">CPF</option>
              <option value="cnpj">CNPJ</option>
            </select>
          </div>
        </div>
        <Input
          label="Endereço"
          value={form.address}
          onChange={(e) => setForm((p) => ({ ...p, address: e.target.value }))}
        />
        <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
          <Input
            label="Cidade"
            value={form.city}
            onChange={(e) => setForm((p) => ({ ...p, city: e.target.value }))}
          />
          <Input
            label="UF"
            maxLength={2}
            value={form.state}
            onChange={(e) => setForm((p) => ({ ...p, state: e.target.value }))}
          />
          <Input
            label="CEP"
            value={form.zip_code}
            onChange={(e) =>
              setForm((p) => ({ ...p, zip_code: e.target.value }))
            }
          />
        </div>
      </div>
    </Modal>
  );
}
