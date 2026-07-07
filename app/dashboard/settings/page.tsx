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
  logo_url: "URL do Logo",
  primary_color: "Cor Primária",
  secondary_color: "Cor Secundária",
};

const TAB_ITEMS: { id: SettingsTab; label: string; icon: React.ReactNode }[] = [
  {
    id: "empresa",
    label: "Dados da empresa",
    icon: (
      <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
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
      <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
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
      <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
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
    try {
      await settingsService.update(editedSettings, user?.tenant_id);
      setIsEditing(false);
      fetchSettings();
      writeLocalSettings(user?.tenant_id, editedSettings);
      alert("Configurações salvas com sucesso!");
    } catch {
      writeLocalSettings(user?.tenant_id, editedSettings);
      setTenantSettings({
        tenant_id: user?.tenant_id ?? "default",
        settings: editedSettings,
      } as TenantSettings);
      setIsEditing(false);
      alert("Configurações salvas localmente (sem API)");
    }
  };

  const handleCancel = () => {
    if (tenantSettings?.settings) {
      setEditedSettings(tenantSettings.settings as Record<string, string>);
    }
    setIsEditing(false);
  };

  const handleChange = (key: string, value: string) => {
    setEditedSettings((prev) => ({
      ...prev,
      [key]: value,
    }));
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
            <h1 className="text-3xl font-bold text-foreground">Configurações</h1>
            <p className="text-text-80">Gerencie sua empresa e equipe.</p>
          </div>
          {activeTab === "empresa" && hasPermission("settings", "update") && (
            <div className="flex gap-3 shrink-0">
              {isEditing ? (
                <>
                  <Button variant="outline" onClick={handleCancel}>
                    Cancelar
                  </Button>
                  <Button onClick={handleSave}>Salvar</Button>
                </>
              ) : (
                <Button onClick={() => setIsEditing(true)}>Editar</Button>
              )}
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
                <span className={active ? "text-accent" : "text-text-60"}>{t.icon}</span>
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
            {!tenantSettings || !tenantSettings.settings ? (
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
                    d="M10.325 4.317c.426-1.756 2.924-1.756 3.35 0a1.724 1.724 0 002.573 1.066c1.543-.94 3.31.826 2.37 2.37a1.724 1.724 0 001.065 2.572c1.756.426 1.756 2.924 0 3.35a1.724 1.724 0 00-1.066 2.573c.94 1.543-.826 3.31-2.37 2.37a1.724 1.724 0 00-2.572 1.065c-.426 1.756-2.924 1.756-3.35 0a1.724 1.724 0 00-2.573-1.066c-1.543.94-3.31-.826-2.37-2.37a1.724 1.724 0 00-1.065-2.572c-1.756-.426-1.756-2.924 0-3.35a1.724 1.724 0 001.066-2.573c-.94-1.543.826-3.31 2.37-2.37.996.608 2.296.07 2.572-1.065z"
                  />
                  <path
                    strokeLinecap="round"
                    strokeLinejoin="round"
                    strokeWidth={2}
                    d="M15 12a3 3 0 11-6 0 3 3 0 016 0z"
                  />
                </svg>
                <h3 className="mt-2 text-sm font-medium text-foreground">
                  Nenhuma configuração encontrada
                </h3>
                <p className="mt-1 text-sm text-text-80">
                  Não há configurações disponíveis no momento.
                </p>
                <Button className="mt-4" onClick={fetchSettings}>
                  Tentar novamente
                </Button>
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
                        <Input
                          value={editedSettings.logo_url || ""}
                          onChange={(e) => handleChange("logo_url", e.target.value)}
                          placeholder="https://example.com/logo.png"
                        />
                      ) : (
                        <div className="py-2">
                          {settings.logo_url ? (
                            // eslint-disable-next-line @next/next/no-img-element
                            <img
                              src={settings.logo_url}
                              alt="Logo"
                              className="h-16 max-w-[200px] object-contain"
                            />
                          ) : (
                            <p className="text-text-60">-</p>
                          )}
                        </div>
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
