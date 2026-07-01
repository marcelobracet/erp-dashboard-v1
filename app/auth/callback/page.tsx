"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";

/**
 * Receives tokens from the landing (URL fragment) after POST /auth/provision.
 * Fragment is not sent to the server, reducing exposure in Referer logs.
 */
export default function AuthCallbackPage() {
  const router = useRouter();
  const [message, setMessage] = useState("Entrando…");

  useEffect(() => {
    const raw = window.location.hash.replace(/^#/, "");
    const params = new URLSearchParams(raw);
    const access = params.get("access_token");
    const refresh = params.get("refresh_token");

    if (!access) {
      setMessage("Link inválido ou expirado. Faça login.");
      const t = setTimeout(() => router.replace("/auth/login"), 2500);
      return () => clearTimeout(t);
    }

    try {
      localStorage.setItem("access_token", access);
      if (refresh) {
        localStorage.setItem("refresh_token", refresh);
      }
    } catch {
      setMessage("Não foi possível salvar a sessão.");
      setTimeout(() => router.replace("/auth/login"), 2500);
      return;
    }

    window.location.replace("/dashboard");
  }, [router]);

  return (
    <div className="min-h-screen flex items-center justify-center bg-background text-foreground p-6">
      <p className="text-sm text-text-60">{message}</p>
    </div>
  );
}
