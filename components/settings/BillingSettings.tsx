"use client";

import React, { useCallback, useEffect, useState } from "react";
import Button from "@/components/ui/Button";
import {
  createBillingCheckout,
  getBillingStatus,
  syncBillingStatus,
  type BillingStatus,
} from "@/lib/api/billing";
import { isApiError } from "@/lib/api/client";
import { usePermissions } from "@/hooks/usePermissions";
import { formatDate } from "@/lib/utils/format";

type StatusLabel = "Ativo" | "Pendente" | "Inativo";

function isTrialActive(trialEndsAt?: string | null): boolean {
  if (!trialEndsAt) return false;
  const end = new Date(trialEndsAt);
  return !Number.isNaN(end.getTime()) && end.getTime() > Date.now();
}

function resolveStatusLabel(status: BillingStatus): StatusLabel {
  if (status.entitled && (status.billing_active || isTrialActive(status.trial_ends_at))) {
    return "Ativo";
  }
  if (status.needs_payment) {
    return "Pendente";
  }
  if (status.entitled) {
    return "Ativo";
  }
  return "Inativo";
}

function StatusBadge({ label }: { label: StatusLabel }) {
  const styles: Record<StatusLabel, string> = {
    Ativo: "bg-emerald-500/15 text-emerald-400 border-emerald-500/20",
    Pendente: "bg-amber-500/15 text-amber-400 border-amber-500/20",
    Inativo: "bg-red-500/15 text-red-400 border-red-500/20",
  };
  return (
    <span
      className={`inline-flex px-3 py-1 rounded-full text-xs font-semibold border uppercase tracking-wide ${styles[label]}`}
    >
      {label}
    </span>
  );
}

function planDisplayName(plan: string): string {
  if (!plan || plan.trim() === "") return "—";
  return plan.replace(/_/g, " ");
}

export default function BillingSettings() {
  const { hasRole } = usePermissions();
  const isAdmin = hasRole("admin");

  const [status, setStatus] = useState<BillingStatus | null>(null);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [syncing, setSyncing] = useState(false);
  const [checkoutLoading, setCheckoutLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [actionError, setActionError] = useState<string | null>(null);

  const loadStatus = useCallback(async () => {
    setError(null);
    try {
      const data = await getBillingStatus();
      setStatus(data);
    } catch (e) {
      const msg =
        isApiError(e) && e.message.trim() !== ""
          ? e.message
          : "Não foi possível carregar o status da assinatura.";
      setError(msg);
    }
  }, []);

  useEffect(() => {
    let cancelled = false;
    (async () => {
      setLoading(true);
      await loadStatus();
      if (!cancelled) setLoading(false);
    })();
    return () => {
      cancelled = true;
    };
  }, [loadStatus]);

  const onRefresh = async () => {
    setRefreshing(true);
    setActionError(null);
    try {
      await loadStatus();
    } finally {
      setRefreshing(false);
    }
  };

  const onSync = async () => {
    setSyncing(true);
    setActionError(null);
    try {
      const data = await syncBillingStatus();
      setStatus(data);
    } catch (e) {
      const msg =
        isApiError(e) && e.message.trim() !== ""
          ? e.message
          : "Não foi possível sincronizar o pagamento.";
      setActionError(msg);
    } finally {
      setSyncing(false);
    }
  };

  const onCheckout = async () => {
    setActionError(null);
    setCheckoutLoading(true);
    try {
      const { url } = await createBillingCheckout();
      window.location.href = url;
    } catch (e) {
      let msg =
        isApiError(e) && e.message.trim() !== ""
          ? e.message
          : "Não foi possível abrir o checkout.";
      if (isApiError(e)) {
        if (e.status === 403) {
          msg =
            "Apenas administradores podem iniciar a assinatura.";
        } else if (e.status === 401) {
          msg = "Sessão expirada. Entre novamente.";
        }
      }
      setActionError(msg);
    } finally {
      setCheckoutLoading(false);
    }
  };

  const showSubscribe =
    isAdmin && status !== null && !status.entitled && status.checkout_available !== false;

  if (loading) {
    return (
      <div className="app-card p-8 rounded-2xl border border-glass-10 animate-pulse space-y-4">
        <div className="h-6 bg-glass-10 rounded w-1/3" />
        <div className="h-4 bg-glass-10 rounded w-2/3" />
        <div className="h-10 bg-glass-10 rounded w-full max-w-xs" />
      </div>
    );
  }

  const statusLabel = status ? resolveStatusLabel(status) : "Inativo";

  return (
    <div className="space-y-6">
      <div className="app-card p-6 md:p-8 rounded-2xl border border-glass-10">
        <div className="flex flex-col gap-4 sm:flex-row sm:items-start sm:justify-between mb-6">
          <div className="space-y-1">
            <h2 className="text-xl font-semibold text-foreground flex items-center gap-2">
              <svg
                className="w-6 h-6 text-accent"
                fill="none"
                stroke="currentColor"
                viewBox="0 0 24 24"
                aria-hidden
              >
                <path
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  strokeWidth={2}
                  d="M3 10h18M7 15h1m4 0h1m-7 4h12a3 3 0 003-3V8a3 3 0 00-3-3H6a3 3 0 00-3 3v8a3 3 0 003 3z"
                />
              </svg>
              Plano e assinatura
            </h2>
            <p className="text-sm text-text-60">
              Acompanhe seu plano, período de teste e pagamentos.
            </p>
          </div>
          {status ? <StatusBadge label={statusLabel} /> : null}
        </div>

        {error ? (
          <p className="text-sm text-red-500 mb-4">{error}</p>
        ) : null}
        {actionError ? (
          <p className="text-sm text-red-500 mb-4">{actionError}</p>
        ) : null}

        {status ? (
          <dl className="grid grid-cols-1 sm:grid-cols-2 gap-6 mb-8">
            <div>
              <dt className="text-sm font-medium text-text-60 mb-1">Plano</dt>
              <dd className="text-foreground font-medium capitalize">
                {planDisplayName(status.plan)}
              </dd>
            </div>
            <div>
              <dt className="text-sm font-medium text-text-60 mb-1">Acesso liberado</dt>
              <dd className="text-foreground font-medium">
                {status.entitled ? "Sim" : "Não"}
              </dd>
            </div>
            <div>
              <dt className="text-sm font-medium text-text-60 mb-1">Fim do período de teste</dt>
              <dd className="text-foreground font-medium">
                {formatDate(status.trial_ends_at)}
              </dd>
            </div>
            <div>
              <dt className="text-sm font-medium text-text-60 mb-1">Assinatura ativa</dt>
              <dd className="text-foreground font-medium">
                {status.billing_active ? "Sim" : "Não"}
              </dd>
            </div>
          </dl>
        ) : (
          <p className="text-sm text-text-80 mb-6">
            Nenhum dado de faturamento disponível.
          </p>
        )}

        <div className="flex flex-wrap gap-3">
          <Button
            variant="outline"
            onClick={() => void onRefresh()}
            disabled={refreshing}
          >
            {refreshing ? "Atualizando…" : "Atualizar"}
          </Button>
          <Button
            variant="outline"
            onClick={() => void onSync()}
            disabled={syncing}
          >
            {syncing ? "Sincronizando…" : "Sincronizar pagamento"}
          </Button>
          {showSubscribe ? (
            <Button onClick={() => void onCheckout()} disabled={checkoutLoading}>
              {checkoutLoading ? "Abrindo checkout…" : "Assinar / renovar"}
            </Button>
          ) : null}
        </div>

        {status && !status.entitled && !isAdmin ? (
          <p className="text-xs text-text-60 mt-4">
            Apenas administradores podem iniciar ou renovar a assinatura.
          </p>
        ) : null}

        {status?.checkout_available === false && isAdmin && !status.entitled ? (
          <p className="text-xs text-text-60 mt-4">
            Checkout indisponível: verifique a configuração de pagamento na API.
          </p>
        ) : null}
      </div>
    </div>
  );
}
