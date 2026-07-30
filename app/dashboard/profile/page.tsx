"use client";

import React, { useEffect, useState } from "react";
import ProtectedRoute from "@/components/auth/ProtectedRoute";
import DashboardLayout from "@/components/layout/DashboardLayout";
import { authService, type UserProfile } from "@/lib/api/auth";
import type { ApiError } from "@/lib/api/client";
import { uploadImage } from "@/lib/api/uploads";
import StorageImage from "@/components/ui/StorageImage";

function RoleBadge({ role }: { role: string }) {
  const map: Record<string, { bg: string; label: string }> = {
    admin: {
      bg: "bg-red-500/15 text-red-400 border-red-500/20",
      label: "Administrador",
    },
    manager: {
      bg: "bg-blue-500/15 text-blue-400 border-blue-500/20",
      label: "Gerente",
    },
    employee: {
      bg: "bg-emerald-500/15 text-emerald-400 border-emerald-500/20",
      label: "Funcionário",
    },
  };
  const { bg, label } = map[role] ?? {
    bg: "bg-accent-15 text-accent-muted border-accent-20",
    label: role,
  };
  return (
    <span
      className={`inline-flex items-center px-3 py-1 rounded-full text-sm font-medium border ${bg} capitalize`}
    >
      {label}
    </span>
  );
}

function InfoRow({
  label,
  value,
  mono = false,
}: {
  label: string;
  value?: string;
  mono?: boolean;
}) {
  if (!value) return null;
  return (
    <div className="flex flex-col sm:flex-row sm:items-center gap-1 py-4 border-b border-glass-10 last:border-0">
      <span className="text-sm text-text-60 sm:w-40 shrink-0">{label}</span>
      <span
        className={`text-sm text-foreground break-all ${mono ? "font-mono text-xs" : ""}`}
      >
        {value}
      </span>
    </div>
  );
}

function Avatar({ name, url }: { name: string; url?: string }) {
  const initials = name
    .split(" ")
    .slice(0, 2)
    .map((w) => w[0])
    .join("")
    .toUpperCase();

  return (
    <div className="relative w-24 h-24 rounded-full overflow-hidden shadow-lg border-2 border-glass-10 bg-gradient-to-br from-accent to-accent-detail flex items-center justify-center text-zinc-950 font-bold text-3xl">
      {initials}
      {url ? (
        <StorageImage
          src={url}
          alt={name}
          className="absolute inset-0 w-full h-full object-cover"
        />
      ) : null}
    </div>
  );
}

function ProfileContent() {
  const [profile, setProfile] = useState<UserProfile | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [avatarUploading, setAvatarUploading] = useState(false);

  useEffect(() => {
    authService
      .getProfile()
      .then(setProfile)
      .catch((err: ApiError) =>
        setError(err.message ?? "Erro ao carregar perfil."),
      )
      .finally(() => setLoading(false));
  }, []);

  const handleAvatarUpload = async (file: File) => {
    try {
      setAvatarUploading(true);
      setError(null);
      const { objectKey } = await uploadImage("avatar", file);
      const updated = await authService.updateProfile({
        avatar_url: objectKey,
      });
      setProfile(updated);
    } catch (err) {
      const message =
        err instanceof Error ? err.message : "Falha ao enviar avatar.";
      setError(message);
    } finally {
      setAvatarUploading(false);
    }
  };

  return (
    <DashboardLayout>
      <div className="max-w-2xl mx-auto space-y-6">
        <div>
          <h1 className="text-3xl font-bold text-foreground">Meu Perfil</h1>
          <p className="text-text-80 mt-1">Informações da sua conta</p>
        </div>

        {loading && (
          <div className="app-card p-12 flex items-center justify-center">
            <div className="animate-spin rounded-full h-10 w-10 border-b-2 border-accent" />
          </div>
        )}

        {!loading && error && (
          <div className="app-card p-6 border border-red-500/20 bg-red-500/5">
            <div className="flex items-center gap-3 text-red-400">
              <svg
                className="w-5 h-5 shrink-0"
                fill="none"
                stroke="currentColor"
                viewBox="0 0 24 24"
              >
                <path
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  strokeWidth={2}
                  d="M12 9v2m0 4h.01M10.29 3.86L1.82 18a2 2 0 001.71 3h16.94a2 2 0 001.71-3L13.71 3.86a2 2 0 00-3.42 0z"
                />
              </svg>
              <span className="text-sm">{error}</span>
            </div>
          </div>
        )}

        {!loading && profile && (
          <>
            <div className="app-card p-8 flex flex-col sm:flex-row items-center sm:items-start gap-6">
              <div className="flex flex-col items-center gap-3">
                <Avatar name={profile.name} url={profile.avatar_url} />
                <label className="inline-flex">
                  <input
                    type="file"
                    accept="image/jpeg,image/png,image/webp"
                    className="hidden"
                    disabled={avatarUploading}
                    onChange={(e) => {
                      const file = e.target.files?.[0];
                      if (file) void handleAvatarUpload(file);
                      e.target.value = "";
                    }}
                  />
                  <span
                    className={`text-xs text-accent hover:text-accent-detail cursor-pointer underline ${
                      avatarUploading ? "opacity-50 pointer-events-none" : ""
                    }`}
                  >
                    {avatarUploading ? "Enviando…" : "Alterar foto"}
                  </span>
                </label>
              </div>
              <div className="flex flex-col items-center sm:items-start gap-2 text-center sm:text-left">
                <h2 className="text-2xl font-semibold text-foreground">
                  {profile.name}
                </h2>
                <p className="text-text-60 text-sm">{profile.email}</p>
                <RoleBadge role={profile.role} />
              </div>
            </div>

            <div className="app-card p-6">
              <h3 className="text-sm font-semibold text-text-60 uppercase tracking-wider mb-2">
                Detalhes da conta
              </h3>
              <InfoRow label="Nome completo" value={profile.name} />
              <InfoRow label="E-mail" value={profile.email} />
              <InfoRow
                label="Perfil de acesso"
                value={
                  profile.role === "admin"
                    ? "Administrador"
                    : profile.role === "manager"
                      ? "Gerente"
                      : profile.role === "employee"
                        ? "Funcionário"
                        : profile.role
                }
              />
            </div>
          </>
        )}
      </div>
    </DashboardLayout>
  );
}

export default function ProfilePage() {
  return (
    <ProtectedRoute>
      <ProfileContent />
    </ProtectedRoute>
  );
}
