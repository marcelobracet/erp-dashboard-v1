"use client";

import React, { useCallback, useEffect, useState } from "react";
import { useAuth } from "@/contexts/AuthContext";
import {
  SUBSCRIPTION_REQUIRED_EVENT,
  type SubscriptionRequiredDetail,
} from "@/lib/billing/events";
import {
  createBillingCheckout,
  getBillingStatus,
  syncBillingStatus,
  type BillingStatus,
} from "@/lib/api/billing";
import { isApiError } from "@/lib/api/client";

/**
 * Modal + toast when the API returns subscription_required or billing status needs payment.
 */
export function SubscriptionGate() {
  const { logout } = useAuth();
  const [open, setOpen] = useState(false);
  const [toastVisible, setToastVisible] = useState(false);
  const [status, setStatus] = useState<BillingStatus | null>(null);
  const [checkoutLoading, setCheckoutLoading] = useState(false);
  const [checkoutError, setCheckoutError] = useState<string | null>(null);

  const showGate = useCallback((withToast: boolean) => {
    setOpen(true);
    if (withToast) {
      setToastVisible(true);
      window.setTimeout(() => setToastVisible(false), 4200);
    }
  }, []);

  useEffect(() => {
    const handler = (ev: Event) => {
      const ce = ev as CustomEvent<SubscriptionRequiredDetail>;
      void ce.detail;
      showGate(true);
    };
    window.addEventListener(SUBSCRIPTION_REQUIRED_EVENT, handler);
    return () => window.removeEventListener(SUBSCRIPTION_REQUIRED_EVENT, handler);
  }, [showGate]);

  useEffect(() => {
    let cancelled = false;

    const refreshBilling = async () => {
      const token =
        typeof window !== "undefined"
          ? localStorage.getItem("access_token")
          : null;
      if (!token) return;

      try {
        const st = await syncBillingStatus().catch(() => getBillingStatus());
        if (cancelled) return;
        setStatus(st);
        if (st.entitled) {
          setOpen(false);
          setToastVisible(false);
          return;
        }
        if (st.needs_payment && !st.entitled) {
          showGate(false);
        }
      } catch {
        // ignore (e.g. offline)
      }
    };

    void refreshBilling();

    const onFocus = () => {
      void refreshBilling();
    };
    window.addEventListener("focus", onFocus);
    document.addEventListener("visibilitychange", () => {
      if (document.visibilityState === "visible") {
        void refreshBilling();
      }
    });

    return () => {
      cancelled = true;
      window.removeEventListener("focus", onFocus);
    };
  }, [showGate]);

  const onSubscribe = async () => {
    setCheckoutError(null);
    setCheckoutLoading(true);
    try {
      const { url } = await createBillingCheckout();
      window.location.href = url;
    } catch (e) {
      let msg =
        isApiError(e) && e.message.trim() !== ""
          ? e.message
          : "Não foi possível abrir o checkout. Verifique a configuração da API.";
      if (isApiError(e)) {
        if (e.status === 403) {
          msg =
            "Apenas administradores podem iniciar a assinatura. Peça a um admin da loja ou entre com uma conta admin.";
        } else if (e.status === 401) {
          msg = "Sessão expirada ou inválida. Saia e entre novamente.";
        } else if (e.status === 503 || e.status === 502) {
          msg =
            "Serviço de pagamento indisponível no momento. Tente de novo em alguns minutos.";
        }
      }
      setCheckoutError(msg);
    } finally {
      setCheckoutLoading(false);
    }
  };

  if (!open) {
    return toastVisible ? (
      <div
        className="fixed top-4 left-1/2 z-[100] -translate-x-1/2 px-4 py-2.5 rounded-xl border border-amber-500/40 bg-amber-500/15 text-sm text-amber-950 dark:text-amber-100 shadow-lg backdrop-blur-md max-w-md text-center"
        role="status"
      >
        Acesso suspenso: ative sua assinatura para continuar usando o sistema.
      </div>
    ) : null;
  }

  const checkoutOk = status?.checkout_available !== false;

  return (
    <>
      {toastVisible ? (
        <div
          className="fixed top-4 left-1/2 z-[100] -translate-x-1/2 px-4 py-2.5 rounded-xl border border-amber-500/40 bg-amber-500/15 text-sm text-amber-950 dark:text-amber-100 shadow-lg backdrop-blur-md max-w-md text-center"
          role="status"
        >
          Acesso suspenso: ative sua assinatura para continuar.
        </div>
      ) : null}

      <div
        className="fixed inset-0 z-[90] flex items-center justify-center p-4 bg-overlay-40 backdrop-blur-sm"
        role="dialog"
        aria-modal="true"
        aria-labelledby="subscription-gate-title"
      >
        <div className="w-full max-w-md rounded-2xl border border-glass-10 bg-background shadow-2xl p-8 space-y-5">
          <div className="space-y-2 text-center">
            <div className="mx-auto flex h-12 w-12 items-center justify-center rounded-full bg-accent/15 text-accent-muted">
              <svg
                className="h-6 w-6"
                fill="none"
                stroke="currentColor"
                viewBox="0 0 24 24"
                aria-hidden
              >
                <path
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  strokeWidth={2}
                  d="M12 15v2m-6 4h12a2 2 0 002-2v-6a2 2 0 00-2-2H6a2 2 0 00-2 2v6a2 2 0 002 2zm10-10V7a4 4 0 00-8 0v4h8z"
                />
              </svg>
            </div>
            <h2
              id="subscription-gate-title"
              className="text-lg font-semibold text-foreground tracking-tight"
            >
              Assinatura necessária
            </h2>
            <p className="text-sm text-text-60 leading-relaxed">
              Seu período de teste terminou ou a assinatura está inativa. Assine
              para voltar a usar orçamentos, clientes e demais recursos.
            </p>
            {status?.plan ? (
              <p className="text-xs text-text-60 text-center">
                Plano:{" "}
                <span className="text-foreground font-medium capitalize">
                  {status.plan}
                </span>
              </p>
            ) : null}
          </div>

          {checkoutError ? (
            <p className="text-sm text-red-500 text-center">{checkoutError}</p>
          ) : null}

          <div className="flex flex-col gap-2">
            {checkoutOk ? (
              <button
                type="button"
                onClick={() => void onSubscribe()}
                disabled={checkoutLoading}
                className="w-full rounded-xl bg-accent text-zinc-950 font-medium py-3 text-sm hover:opacity-95 disabled:opacity-60 transition-opacity"
              >
                {checkoutLoading ? "Abrindo checkout…" : "Assinar agora"}
              </button>
            ) : (
              <p className="text-xs text-text-60 text-center">
                Checkout indisponível: na API, configure{" "}
                <code className="text-foreground/80">ABACATEPAY_API_KEY</code>,{" "}
                <code className="text-foreground/80">
                  ABACATEPAY_SUBSCRIPTION_PRODUCT_ID_ESSENCIAL
                </code>{" "}
                /{" "}
                <code className="text-foreground/80">
                  ABACATEPAY_SUBSCRIPTION_PRODUCT_ID_PROFISSIONAL
                </code>{" "}
                (produtos de assinatura na AbacatePay) e, se precisar,{" "}
                <code className="text-foreground/80">
                  ABACATEPAY_API_BASE_URL
                </code>{" "}
                como{" "}
                <code className="text-foreground/80">
                  https://api.abacatepay.com/v2
                </code>
                .
              </p>
            )}
            <p className="text-xs text-text-60 text-center">
              Dúvidas? Use o canal de suporte no menu.
            </p>
            <button
              type="button"
              onClick={() => void logout()}
              className="w-full text-xs text-text-60 hover:text-foreground py-2 transition-colors"
            >
              Sair da conta
            </button>
          </div>
        </div>
      </div>
    </>
  );
}
