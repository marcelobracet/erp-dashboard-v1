"use client";

import React, { useState, useEffect } from "react";
import ProtectedRoute from "@/components/auth/ProtectedRoute";
import DashboardLayout from "@/components/layout/DashboardLayout";
import Button from "@/components/ui/Button";
import Input from "@/components/ui/Input";
import { settingsService, TenantSettingsResponse } from "@/lib/api/services";
import { usePermissions } from "@/hooks/usePermissions";
import { useAuth } from "@/contexts/AuthContext";

type TenantSettings = TenantSettingsResponse;

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

function writeLocalSettings(tenantId: string | undefined, settings: Record<string, string>) {
  try {
    const payload: TenantSettings = {
      tenant_id: tenantId ?? "default",
      settings,
    } as TenantSettings;
    window.localStorage.setItem(localSettingsKey(tenantId), JSON.stringify(payload));

    // Convenience keys (used by QuotePreview fallback)
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

function SettingsContent() {
  const [tenantSettings, setTenantSettings] = useState<TenantSettings | null>(
    null
  );
  const [loading, setLoading] = useState(true);
  const [isEditing, setIsEditing] = useState(false);
  const [editedSettings, setEditedSettings] = useState<Record<string, string>>(
    {}
  );
  const { hasPermission } = usePermissions();
  const { user } = useAuth();

  const fetchSettings = async () => {
    try {
      setLoading(true);
      const data = await settingsService.get(user?.tenant_id);

      console.log("🔍 API Response received:", data);
      console.log("🔍 Data type:", typeof data);
      console.log("🔍 Has tenant_id?", "tenant_id" in (data || {}));
      console.log("🔍 Has settings?", "settings" in (data || {}));

      // The API returns: { tenant_id, settings: { ... } }
      if (
        data &&
        typeof data === "object" &&
        "tenant_id" in data &&
        "settings" in data
      ) {
        const settingsData = data as TenantSettings;
        console.log("✅ Setting tenantSettings:", settingsData);
        setTenantSettings(settingsData);
        if (settingsData.settings) {
          setEditedSettings(settingsData.settings as Record<string, string>);
          writeLocalSettings(user?.tenant_id, settingsData.settings as Record<string, string>);
        }
      } else {
        console.warn("❌ Unexpected API response format:", data);
        setTenantSettings(null);
      }
    } catch (error) {
      console.error("❌ Failed to fetch settings:", error);
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
    // Only fetch if user is available
    if (user?.tenant_id) {
      fetchSettings();
    } else if (user === null) {
      // User is loaded but no tenant_id
      setLoading(false);
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [user?.tenant_id]);

  const handleSave = async () => {
    try {
      await settingsService.update(editedSettings);
      setIsEditing(false);
      fetchSettings();
      writeLocalSettings(user?.tenant_id, editedSettings);
      alert("Configurações salvas com sucesso!");
    } catch (error) {
      console.error("Failed to save settings:", error);
      writeLocalSettings(user?.tenant_id, editedSettings);
      setTenantSettings({ tenant_id: user?.tenant_id ?? "default", settings: editedSettings } as TenantSettings);
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

  console.log("🎨 Render - tenantSettings:", tenantSettings);
  console.log("🎨 Render - settings:", settings);
  console.log("🎨 Render - loading:", loading);
  console.log(
    "🎨 Render - Should show empty?",
    !tenantSettings || !tenantSettings.settings
  );

  return (
    <DashboardLayout>
      <div className="space-y-6">
        <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
          <div>
            <h1 className="text-3xl font-bold text-foreground">
              Configurações
            </h1>
            <p className="text-text-80 mt-1">
              Gerencie as configurações da empresa
            </p>
          </div>
          {hasPermission("settings", "update") && (
            <div className="flex gap-3">
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

        {!tenantSettings || !tenantSettings.settings ? (
          <div className="app-card p-12 text-center">
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
              {loading
                ? "Carregando..."
                : "Não há configurações disponíveis no momento."}
            </p>
            {!loading && (
              <Button className="mt-4" onClick={fetchSettings}>
                Tentar novamente
              </Button>
            )}
          </div>
        ) : (
          <div className="space-y-6">
            <div className="app-card p-6">
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
                    <p className="text-gray-900 dark:text-white py-2">
                      {settings.company_name || "-"}
                    </p>
                  )}
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
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
                    <p className="text-gray-900 dark:text-white py-2">
                      {settings.company_email || "-"}
                    </p>
                  )}
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
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
                    <p className="text-gray-900 dark:text-white py-2">
                      {settings.company_phone || "-"}
                    </p>
                  )}
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
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
                        <img
                          src={settings.logo_url}
                          alt="Logo"
                          className="h-16 object-contain"
                        />
                      ) : (
                        <p className="text-gray-500 dark:text-gray-400">-</p>
                      )}
                    </div>
                  )}
                </div>
              </div>
            </div>

            <div className="app-card p-6">
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
                    <p className="text-gray-900 dark:text-white py-2">
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
                    <p className="text-gray-900 dark:text-white py-2">
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
                    <p className="text-gray-900 dark:text-white py-2">
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
                    <p className="text-gray-900 dark:text-white py-2">
                      {settings.company_zip || "-"}
                    </p>
                  )}
                </div>
              </div>
            </div>
            </div>
        )}
      </div>
    </DashboardLayout>
  );
}

export default function SettingsPage() {
  return (
    <ProtectedRoute>
      <SettingsContent />
    </ProtectedRoute>
  );
}
