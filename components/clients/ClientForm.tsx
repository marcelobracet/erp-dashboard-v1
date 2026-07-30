"use client";

import React, { useEffect, useState } from "react";
import Button from "@/components/ui/Button";
import Input from "@/components/ui/Input";
import { clientService, type Client } from "@/lib/api/services";
import {
  clientFormToPayload,
  clientToFormValues,
  parseClientForm,
  type ClientFormValues,
} from "@/lib/validation/clientSchema";

const EMPTY: ClientFormValues = {
  name: "",
  email: "",
  phone: "",
  document: "",
  document_type: "cpf",
  address: "",
  city: "",
  state: "",
  zip_code: "",
};

export default function ClientForm({
  client,
  onCancel,
  onSaved,
}: {
  client?: Client | null;
  onCancel: () => void;
  onSaved: () => void;
}) {
  const [form, setForm] = useState<ClientFormValues>(EMPTY);
  const [fieldErrors, setFieldErrors] = useState<
    Partial<Record<keyof ClientFormValues, string>>
  >({});
  const [formError, setFormError] = useState<string | null>(null);
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    setForm(client ? clientToFormValues(client) : EMPTY);
    setFieldErrors({});
    setFormError(null);
  }, [client]);

  function update<K extends keyof ClientFormValues>(
    key: K,
    value: ClientFormValues[K],
  ) {
    setForm((prev) => ({ ...prev, [key]: value }));
    setFieldErrors((prev) => ({ ...prev, [key]: undefined }));
  }

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setFormError(null);

    const parsed = parseClientForm(form);
    if (!parsed.success) {
      setFieldErrors(parsed.fieldErrors);
      setFormError(parsed.formError ?? "Verifique os campos do formulário.");
      return;
    }

    setSaving(true);
    try {
      const payload = clientFormToPayload(parsed.data);
      if (client?.id) {
        await clientService.update(client.id, payload);
      } else {
        await clientService.create(payload);
      }
      onSaved();
    } catch (err) {
      setFormError(
        err instanceof Error ? err.message : "Erro ao salvar cliente.",
      );
    } finally {
      setSaving(false);
    }
  }

  return (
    <form onSubmit={(e) => void handleSubmit(e)} className="space-y-4">
      {formError ? (
        <div className="rounded-lg border border-red-500/30 bg-red-500/10 px-3 py-2 text-sm text-red-400">
          {formError}
        </div>
      ) : null}

      <Input
        label="Nome *"
        value={form.name}
        onChange={(e) => update("name", e.target.value)}
        error={fieldErrors.name}
      />

      <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
        <Input
          label="Telefone *"
          value={form.phone}
          onChange={(e) => update("phone", e.target.value)}
          error={fieldErrors.phone}
        />
        <Input
          label="E-mail *"
          type="email"
          value={form.email}
          onChange={(e) => update("email", e.target.value)}
          error={fieldErrors.email}
        />
      </div>

      <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
        <div className="sm:col-span-2">
          <Input
            label="Documento *"
            value={form.document}
            onChange={(e) => update("document", e.target.value)}
            error={fieldErrors.document}
            placeholder={
              form.document_type === "cpf"
                ? "000.000.000-00"
                : "00.000.000/0000-00"
            }
          />
        </div>
        <div>
          <label className="block text-sm font-medium text-text-80 mb-2">
            Tipo *
          </label>
          <select
            value={form.document_type}
            onChange={(e) =>
              update(
                "document_type",
                e.target.value as ClientFormValues["document_type"],
              )
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
        value={form.address ?? ""}
        onChange={(e) => update("address", e.target.value)}
      />

      <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
        <Input
          label="Cidade"
          value={form.city ?? ""}
          onChange={(e) => update("city", e.target.value)}
        />
        <Input
          label="UF"
          maxLength={2}
          value={form.state ?? ""}
          onChange={(e) => update("state", e.target.value)}
        />
        <Input
          label="CEP"
          value={form.zip_code ?? ""}
          onChange={(e) => update("zip_code", e.target.value)}
        />
      </div>

      <div className="flex justify-end gap-3 pt-2">
        <Button variant="outline" type="button" onClick={onCancel} disabled={saving}>
          Cancelar
        </Button>
        <Button type="submit" isLoading={saving}>
          Salvar
        </Button>
      </div>
    </form>
  );
}
