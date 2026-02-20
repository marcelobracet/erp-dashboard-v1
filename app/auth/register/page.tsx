"use client";

import React from "react";
import RegisterForm from "@/components/auth/RegisterForm";

export default function RegisterPage() {
  return (
    <div className="min-h-screen flex items-center justify-center bg-background p-4">
      <div className="fixed inset-0 overflow-hidden pointer-events-none">
        <div className="absolute -top-40 -right-40 w-80 h-80 bg-brand-cyan rounded-full mix-blend-multiply filter blur-xl opacity-15 animate-blob" />
        <div className="absolute -bottom-40 -left-40 w-80 h-80 bg-brand-blue rounded-full mix-blend-multiply filter blur-xl opacity-10 animate-blob animation-delay-2000" />
        <div className="absolute top-1/2 left-1/2 transform -translate-x-1/2 -translate-y-1/2 w-80 h-80 bg-brand-sky rounded-full mix-blend-multiply filter blur-xl opacity-10 animate-blob animation-delay-4000" />
      </div>

      <div className="relative z-10 w-full max-w-md">
        {/* Card Container */}
        <div className="bg-glass-5 backdrop-blur-xl rounded-2xl shadow-2xl border border-glass-10 p-8 md:p-10">
          {/* Header */}
          <div className="text-center mb-8">
            <div className="inline-flex items-center justify-center w-16 h-16 mb-4 rounded-2xl bg-gradient-to-br from-accent to-accent-hover shadow-lg">
              <svg
                className="w-8 h-8 text-white"
                fill="none"
                stroke="currentColor"
                viewBox="0 0 24 24"
              >
                <path
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  strokeWidth={2}
                  d="M12 4v16m8-8H4"
                />
              </svg>
            </div>

            <h1 className="text-3xl font-bold text-foreground mb-2">
              Criar conta
            </h1>
            <p className="text-text-80">
              Cadastre-se para acessar a plataforma
            </p>
          </div>

          {/* Register Form */}
          <RegisterForm />

          {/* Footer */}
          <div className="mt-6 text-center">
            <p className="text-sm text-text-60">
              Já tem uma conta?{" "}
              <a
                href="/auth/login"
                className="font-medium text-accent-detail hover:text-accent-muted transition-colors"
              >
                Fazer login
              </a>
            </p>
          </div>
        </div>

        <p className="mt-6 text-center text-xs text-text-60">
          OnMarmoraria • Gestão empresarial otimizada
        </p>
      </div>
    </div>
  );
}
