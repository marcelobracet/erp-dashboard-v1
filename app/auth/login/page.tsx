'use client';

import React from 'react';
import Image from 'next/image';
import LoginForm from '@/components/auth/LoginForm';

export default function LoginPage() {
  return (
    <div className="min-h-screen flex items-center justify-center bg-background p-4">
      {/* Animated background elements */}
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
            <div className="inline-flex items-center justify-center w-16 h-16 mb-4 rounded-2xl shadow-lg">
              {/* use logo.svg here */}
              <Image
                src="/logo.svg"
                alt="OnMarmoraria Logo"
                className="w-full h-full"
                width={500}
                height={500}
              />
            </div>

            <h1 className="text-3xl font-bold text-foreground mb-2">
              Bem-vindo à OnMarmoraria
            </h1>
            <p className="text-text-80">
              Faça login para acessar sua conta
            </p>

            <div className="inline-flex items-center gap-2 mt-4 px-3 py-1 rounded-full bg-accent-15 border border-accent-20">
              <span className="text-xs font-medium text-accent-muted">
                Marmoraria • Orçamentos e gestão
              </span>
            </div>
          </div>

          {/* Login Form */}
          <LoginForm />

          {/* Footer */}
          <div className="mt-6 text-center">
            <p className="text-sm text-text-60">
              Não tem uma conta?{' '}
              <a
                href="/auth/register"
                className="font-medium text-accent-detail hover:text-accent-muted transition-colors"
              >
                Criar conta
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

