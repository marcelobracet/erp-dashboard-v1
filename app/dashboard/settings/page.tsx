"use client";

import React, { Suspense, useState, useEffect, useCallback } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import ProtectedRoute from "@/components/auth/ProtectedRoute";
import DashboardLayout from "@/components/layout/DashboardLayout";
import Button from "@/components/ui/Button";
import Input from "@/components/ui/Input";
import { settingsService, TenantSettingsResponse } from "@/lib/api/services";
import { usePermissions } from "@/hooks/usePermissions";
import { useAuth } from "@/contexts/AuthContext";
import UsersManagement from "@/components/settings/UsersManagement";
import BillingSettings from "@/components/settings/BillingSettings";
import ImageUploadField from "@/components/ui/ImageUploadField";

type TenantSettings = TenantSettingsResponse;

type SettingsTab = "empresa" | "equipe" | "plano";

function localSettingsKey(tenantId?: string) {
  return `erp-dashboard.settings.${tenantId ?? "default"}`;
}

function readLocalSettings(tenantId?: string): TenantSettings | null {
  try {
    const raw = window.localStorage.getItem(localSettingsKey(tenantId));
    if (!raw) return null;
    const parsed = JSON.parse(raw) as TenantSettings;
    if (!parsed || typeof parsed !== "object") return null;
    if (!("settings" in parsed)) return null;
    return parsed;
  } catch {
    return null;
  }
}

function writeLocalSettings(
  tenantId: string | undefined,
  settings: Record<string, string>,
) {
  try {
    const payload: TenantSettings = {
      tenant_id: tenantId ?? "default",
      settings,
    } as TenantSettings;
    window.localStorage.setItem(
      localSettingsKey(tenantId),
      JSON.stringify(payload),
    );

    if (typeof settings.company_name === "string") {
      window.localStorage.setItem("company_name", settings.company_name);
    }
    if (typeof settings.logo_url === "string") {
      window.localStorage.setItem("logo_url", settings.logo_url);
    }
  } catch {
    // ignore
  }
}

const settingsLabels: Record<string, string> = {
  company_name: "Nome da Empresa",
  company_email: "Email",
  company_phone: "Telefone",
  company_address: "Endereço",
  company_city: "Cidade",
  company_state: "Estado",
  company_zip: "CEP",
  logo_url: "Logo da empresa",
  primary_color: "Cor Primária",
  secondary_color: "Cor Secundária",
};

const TAB_ITEMS: { id: SettingsTab; label: string; icon: React.ReactNode }[] = [
  {
    id: "empresa",
    label: "Dados da empresa",
    icon: (
      <svg
        className="w-4 h-4"
        fill="none"
        stroke="currentColor"
        viewBox="0 0 24 24"
      >
        <path
          strokeLinecap="round"
          strokeLinejoin="round"
          strokeWidth={2}
          d="M3 12l2-2m0 0l7-7 7 7M5 10v10a1 1 0 001 1h3m10-11l2 2m-2-2v10a1 1 0 01-1 1h-3m-6 0a1 1 0 001-1v-4a1 1 0 011-1h2a1 1 0 011 1v4a1 1 0 001 1m-6 0h6"
        />
      </svg>
    ),
  },
  {
    id: "equipe",
    label: "Equipe / usuários",
    icon: (
      <svg
        className="w-4 h-4"
        fill="none"
        stroke="currentColor"
        viewBox="0 0 24 24"
      >
        <path
          strokeLinecap="round"
          strokeLinejoin="round"
          strokeWidth={2}
          d="M12 4.354a4 4 0 110 5.292M15 21H3v-1a6 6 0 0112 0v1zm0 0h6v-1a6 6 0 00-9-5.197M13 7a4 4 0 11-8 0 4 4 0 018 0z"
        />
      </svg>
    ),
  },
  {
    id: "plano",
    label: "Plano e faturamento",
    icon: (
      <svg
        className="w-4 h-4"
        fill="none"
        stroke="currentColor"
        viewBox="0 0 24 24"
      >
        <path
          strokeLinecap="round"
          strokeLinejoin="round"
          strokeWidth={2}
          d="M3 10h18M7 15h1m4 0h1m-7 4h12a3 3 0 003-3V8a3 3 0 00-3-3H6a3 3 0 00-3 3v8a3 3 0 003 3z"
        />
      </svg>
    ),
  },
];

const EMPTY_SETTINGS: Record<string, string> = {
  company_name: "",
  company_email: "",
  company_phone: "",
  company_address: "",
  company_city: "",
  company_state: "",
  company_zip: "",
  logo_url: "",
};

function SettingsContent() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const tabParam = searchParams.get("tab");
  const activeTab: SettingsTab =
    tabParam === "equipe" || tabParam === "plano" || tabParam === "empresa"
      ? tabParam
      : "empresa";

  const setTab = useCallback(
    (t: SettingsTab) => {
      router.replace(`/dashboard/settings?tab=${t}`, { scroll: false });
    },
    [router],
  );

  const [tenantSettings, setTenantSettings] = useState<TenantSettings | null>(
    null,
  );
  const [loading, setLoading] = useState(true);
  const [isEditing, setIsEditing] = useState(false);
  const [editedSettings, setEditedSettings] = useState<Record<string, string>>(
    {},
  );
  const [saveError, setSaveError] = useState<string | null>(null);
  const { hasPermission, hasRole } = usePermissions();
  const { user } = useAuth();

  const fetchSettings = async () => {
    try {
      setLoading(true);
      const data = await settingsService.get(user?.tenant_id);

      if (
        data &&
        typeof data === "object" &&
        "tenant_id" in data &&
        "settings" in data
      ) {
        const settingsData = data as TenantSettings;
        setTenantSettings(settingsData);
        if (settingsData.settings) {
          setEditedSettings(settingsData.settings as Record<string, string>);
          writeLocalSettings(
            user?.tenant_id,
            settingsData.settings as Record<string, string>,
          );
        }
      } else {
        setTenantSettings(null);
      }
    } catch {
      const local = readLocalSettings(user?.tenant_id);
      if (local?.settings) {
        setTenantSettings(local);
        setEditedSettings(local.settings as Record<string, string>);
      } else {
        setTenantSettings(null);
      }
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    if (user?.tenant_id) {
      fetchSettings();
    } else if (user === null) {
      setLoading(false);
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [user?.tenant_id]);

  const handleSave = async () => {
    setSaveError(null);
    try {
      await settingsService.update(editedSettings, user?.tenant_id);
      setIsEditing(false);
      fetchSettings();
      writeLocalSettings(user?.tenant_id, editedSettings);
      alert("Configurações salvas com sucesso!");
    } catch (err) {
      const message =
        err instanceof Error ? err.message : "Erro ao salvar";
      setSaveError(message);
      alert(message);
    }
  };

  const handleCancel = () => {
    if (tenantSettings?.settings) {
      setEditedSettings(tenantSettings.settings as Record<string, string>);
    }
    setSaveError(null);
    setIsEditing(false);
  };

  const handleChange = (key: string, value: string) => {
    setEditedSettings((prev) => ({
      ...prev,
      [key]: value,
    }));
  };

  const startEditing = () => {
    if (!tenantSettings?.settings) {
      setTenantSettings({
        tenant_id: user?.tenant_id ?? "default",
        settings: EMPTY_SETTINGS,
      } as TenantSettings);
      setEditedSettings({ ...EMPTY_SETTINGS });
    }
    setIsEditing(true);
  };

  if (loading) {
    return (
      <DashboardLayout>
        <div className="animate-pulse space-y-4">
          <div className="h-8 bg-gray-200 dark:bg-gray-700 rounded w-1/4"></div>
          <div className="h-32 bg-gray-200 dark:bg-gray-700 rounded"></div>
        </div>
      </DashboardLayout>
    );
  }

  const settings = tenantSettings?.settings || {};

  return (
    <DashboardLayout>
      <div className="space-y-8 pb-12">
        <div className="flex flex-col gap-4 sm:flex-row sm:items-start sm:justify-between">
          <div className="space-y-1">
            <h1 className="text-3xl font-bold text-foreground uppercase">
              Configurações
            </h1>
            <p className="uppercase text-text-80">
              Gerencie sua empresa e equipe.
            </p>
          </div>
          {activeTab === "empresa" && hasPermission("settings", "update") && (
            <div className="flex flex-col items-end gap-2 shrink-0">
              {saveError && (
                <p className="text-sm text-red-400">{saveError}</p>
              )}
              <div className="flex gap-3">
                {isEditing ? (
                  <>
                    <Button variant="outline" onClick={handleCancel}>
                      Cancelar
                    </Button>
                    <Button onClick={handleSave}>Salvar</Button>
                  </>
                ) : (
                  <Button onClick={startEditing}>Editar</Button>
                )}
              </div>
            </div>
          )}
        </div>

        <div className="rounded-2xl border border-glass-10 bg-glass-5/40 p-1.5 flex flex-wrap gap-1">
          {TAB_ITEMS.map((t) => {
            const active = activeTab === t.id;
            return (
              <button
                key={t.id}
                type="button"
                onClick={() => setTab(t.id)}
                className={`flex items-center gap-2 rounded-xl px-4 py-3 text-xs sm:text-sm font-semibold uppercase tracking-wide transition-colors ${
                  active
                    ? "bg-background text-accent shadow-sm border border-glass-10"
                    : "text-text-60 hover:text-foreground"
                }`}
              >
                <span className={active ? "text-accent" : "text-text-60"}>
                  {t.icon}
                </span>
                {t.label}
              </button>
            );
          })}
        </div>

        {activeTab === "equipe" && (
          <div className="space-y-6">
            {hasRole("admin") ? (
              <UsersManagement embedded />
            ) : (
              <div className="app-card p-12 text-center text-text-80 text-sm">
                Apenas administradores podem gerenciar usuários.
              </div>
            )}
          </div>
        )}

        {activeTab === "plano" && <BillingSettings />}

        {activeTab === "empresa" && (
          <>
            {(!tenantSettings || !tenantSettings.settings) && !isEditing ? (
              <div className="app-card p-12 text-center rounded-2xl border border-glass-10">
                <svg
                  className="mx-auto h-12 w-12 text-text-60"
                  fill="none"
                  stroke="currentColor"
                  viewBox="0 0 24 24"
                >
                  <path
                    strokeLinecap="round"
                    strokeLinejoin="round"
                    strokeWidth={2}
                    d="M19 21V5a2 2 0 00-2-2H7a2 2 0 00-2 2v16m14 0h2m-2 0h-5m-9 0H3m2 0h5M9 7h1m-1 4h1m4-4h1m-1 4h1m-5 10v-5a1 1 0 011-1h2a1 1 0 011 1v5m-4 0h4"
                  />
                </svg>
                <h3 className="mt-4 text-lg font-medium text-foreground">
                  Configure os dados da sua empresa
                </h3>
                <p className="mt-2 text-sm text-text-80">
                  Preencha as informações da empresa para personalizar o
                  sistema.
                </p>
                <div className="mt-6 flex flex-col sm:flex-row items-center justify-center gap-3">
                  <Button onClick={startEditing}>Começar configuração</Button>
                  <Button variant="outline" onClick={fetchSettings}>
                    Tentar novamente
                  </Button>
                </div>
              </div>
            ) : (
              <div className="space-y-6">
                <div className="app-card p-6 md:p-8 rounded-2xl border border-glass-10">
                  <h2 className="text-xl font-semibold text-foreground mb-6 flex items-center gap-2">
                    <svg
                      className="w-6 h-6"
                      fill="none"
                      stroke="currentColor"
                      viewBox="0 0 24 24"
                    >
                      <path
                        strokeLinecap="round"
                        strokeLinejoin="round"
                        strokeWidth={2}
                        d="M19 21V5a2 2 0 00-2-2H7a2 2 0 00-2 2v16m14 0h2m-2 0h-5m-9 0H3m2 0h5M9 7h1m-1 4h1m4-4h1m-1 4h1m-5 10v-5a1 1 0 011-1h2a1 1 0 011 1v5m-4 0h4"
                      />
                    </svg>
                    Informações da Empresa
                  </h2>
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                    <div>
                      <label className="block text-sm font-medium text-text-80 mb-2">
                        {settingsLabels.company_name}
                      </label>
                      {isEditing ? (
                        <Input
                          value={editedSettings.company_name || ""}
                          onChange={(e) =>
                            handleChange("company_name", e.target.value)
                          }
                          placeholder="Nome da empresa"
                        />
                      ) : (
                        <p className="text-foreground py-2">
                          {settings.company_name || "-"}
                        </p>
                      )}
                    </div>
                    <div>
                      <label className="block text-sm font-medium text-foreground mb-2">
                        {settingsLabels.company_email}
                      </label>
                      {isEditing ? (
                        <Input
                          type="email"
                          value={editedSettings.company_email || ""}
                          onChange={(e) =>
                            handleChange("company_email", e.target.value)
                          }
                          placeholder="email@empresa.com"
                        />
                      ) : (
                        <p className="text-foreground py-2">
                          {settings.company_email || "-"}
                        </p>
                      )}
                    </div>
                    <div>
                      <label className="block text-sm font-medium text-foreground mb-2">
                        {settingsLabels.company_phone}
                      </label>
                      {isEditing ? (
                        <Input
                          value={editedSettings.company_phone || ""}
                          onChange={(e) =>
                            handleChange("company_phone", e.target.value)
                          }
                          placeholder="(11) 99999-9999"
                        />
                      ) : (
                        <p className="text-foreground py-2">
                          {settings.company_phone || "-"}
                        </p>
                      )}
                    </div>
                    <div>
                      <label className="block text-sm font-medium text-foreground mb-2">
                        {settingsLabels.logo_url}
                      </label>
                      {isEditing ? (
                        <ImageUploadField
                          purpose="logo"
                          preview="logo"
                          showUrlInput
                          uploadLabel="Enviar logo"
                          value={editedSettings.logo_url || ""}
                          onChange={(url) => handleChange("logo_url", url)}
                        />
                      ) : (
                        <ImageUploadField
                          purpose="logo"
                          preview="logo"
                          value={settings.logo_url || ""}
                          onChange={() => {}}
                          readOnly
                        />
                      )}
                    </div>
                  </div>
                </div>

                <div className="app-card p-6 md:p-8 rounded-2xl border border-glass-10">
                  <h2 className="text-xl font-semibold text-foreground mb-6 flex items-center gap-2">
                    <svg
                      className="w-6 h-6"
                      fill="none"
                      stroke="currentColor"
                      viewBox="0 0 24 24"
                    >
                      <path
                        strokeLinecap="round"
                        strokeLinejoin="round"
                        strokeWidth={2}
                        d="M17.657 16.657L13.414 20.9a1.998 1.998 0 01-2.827 0l-4.244-4.243a8 8 0 1111.314 0z"
                      />
                      <path
                        strokeLinecap="round"
                        strokeLinejoin="round"
                        strokeWidth={2}
                        d="M15 11a3 3 0 11-6 0 3 3 0 016 0z"
                      />
                    </svg>
                    Endereço
                  </h2>
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                    <div className="md:col-span-2">
                      <label className="block text-sm font-medium text-text-80 mb-2">
                        {settingsLabels.company_address}
                      </label>
                      {isEditing ? (
                        <Input
                          value={editedSettings.company_address || ""}
                          onChange={(e) =>
                            handleChange("company_address", e.target.value)
                          }
                          placeholder="Rua, número"
                        />
                      ) : (
                        <p className="text-foreground py-2">
                          {settings.company_address || "-"}
                        </p>
                      )}
                    </div>
                    <div>
                      <label className="block text-sm font-medium text-text-80 mb-2">
                        {settingsLabels.company_city}
                      </label>
                      {isEditing ? (
                        <Input
                          value={editedSettings.company_city || ""}
                          onChange={(e) =>
                            handleChange("company_city", e.target.value)
                          }
                          placeholder="Cidade"
                        />
                      ) : (
                        <p className="text-foreground py-2">
                          {settings.company_city || "-"}
                        </p>
                      )}
                    </div>
                    <div>
                      <label className="block text-sm font-medium text-text-80 mb-2">
                        {settingsLabels.company_state}
                      </label>
                      {isEditing ? (
                        <Input
                          value={editedSettings.company_state || ""}
                          onChange={(e) =>
                            handleChange("company_state", e.target.value)
                          }
                          placeholder="Estado"
                          maxLength={2}
                        />
                      ) : (
                        <p className="text-foreground py-2">
                          {settings.company_state || "-"}
                        </p>
                      )}
                    </div>
                    <div>
                      <label className="block text-sm font-medium text-text-80 mb-2">
                        {settingsLabels.company_zip}
                      </label>
                      {isEditing ? (
                        <Input
                          value={editedSettings.company_zip || ""}
                          onChange={(e) =>
                            handleChange("company_zip", e.target.value)
                          }
                          placeholder="00000-000"
                        />
                      ) : (
                        <p className="text-foreground py-2">
                          {settings.company_zip || "-"}
                        </p>
                      )}
                    </div>
                  </div>
                </div>
              </div>
            )}
          </>
        )}
      </div>
    </DashboardLayout>
  );
}

function SettingsFallback() {
  return (
    <DashboardLayout>
      <div className="animate-pulse space-y-4 py-8">
        <div className="h-10 bg-glass-10 rounded w-1/3" />
        <div className="h-14 bg-glass-10 rounded w-full max-w-lg" />
      </div>
    </DashboardLayout>
  );
}

export default function SettingsPage() {
  return (
    <ProtectedRoute>
      <Suspense fallback={<SettingsFallback />}>
        <SettingsContent />
      </Suspense>
    </ProtectedRoute>
  );
}
