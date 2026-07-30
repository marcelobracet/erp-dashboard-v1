'use client';

import Image from 'next/image';
import LoginForm from '@/components/auth/LoginForm';

export default function LoginPage() {
  return (
    <div className="min-h-screen flex">
      {/* ── Left panel – visual / branding ────────────────────────────── */}
      <div className="hidden lg:flex lg:w-1/2 relative overflow-hidden bg-slate-900">
        {/* Marble-style background */}
        <div
          className="absolute inset-0 bg-cover bg-center"
          style={{
            backgroundImage:
              "url('https://images.unsplash.com/photo-1618221195710-dd6b41faaea6?w=1400&q=80')",
          }}
        />
        {/* Dark gradient overlay */}
        <div className="absolute inset-0 bg-gradient-to-br from-slate-900/85 via-slate-800/70 to-slate-900/80" />

        {/* Decorative orbs */}
        <div className="absolute top-1/4 left-1/4 w-64 h-64 rounded-full bg-cyan-400/10 blur-3xl" />
        <div className="absolute bottom-1/4 right-1/4 w-80 h-80 rounded-full bg-blue-500/10 blur-3xl" />

        {/* Content */}
        <div className="relative z-10 flex flex-col justify-between h-full p-12 text-white">
          {/* Logo */}
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-xl bg-white/10 backdrop-blur-sm flex items-center justify-center border border-white/20">
              <Image
                src="/logo.svg"
                alt="OnMarmoraria"
                width={24}
                height={24}
                className="w-6 h-6"
              />
            </div>
            <span className="font-semibold text-lg tracking-tight">OnMarmoraria</span>
          </div>

          {/* Center hero */}
          <div className="space-y-6">
            <div className="inline-flex items-center gap-2 px-3 py-1.5 rounded-full bg-white/10 border border-white/20 backdrop-blur-sm">
              <span className="w-2 h-2 rounded-full bg-emerald-400 animate-pulse" />
              <span className="text-xs font-medium text-white/80">Sistema ERP ativo</span>
            </div>

            <h1 className="text-4xl xl:text-5xl font-bold leading-tight">
              Gestão inteligente
              <br />
              <span className="text-transparent bg-clip-text bg-gradient-to-r from-cyan-300 to-blue-300">
                para marmorarias
              </span>
            </h1>

            <p className="text-white/60 text-base leading-relaxed max-w-sm">
              Orçamentos, clientes, produtos e relatórios em um só lugar.
              Simplifique sua operação e aumente sua produtividade.
            </p>

            {/* Feature pills */}
            <div className="flex flex-wrap gap-2 pt-2">
              {['Orçamentos', 'Clientes', 'Estoque', 'Relatórios'].map((feat) => (
                <span
                  key={feat}
                  className="px-3 py-1 rounded-full text-xs font-medium bg-white/10 border border-white/15 text-white/70 backdrop-blur-sm"
                >
                  {feat}
                </span>
              ))}
            </div>
          </div>

          {/* Footer */}
          <p className="text-xs text-white/30">
            © {new Date().getFullYear()} OnMarmoraria — Todos os direitos reservados
          </p>
        </div>
      </div>

      {/* ── Right panel – login form ───────────────────────────────────── */}
      <div className="w-full lg:w-1/2 flex flex-col items-center justify-center bg-background min-h-screen p-6 sm:p-10">
        {/* Mobile logo */}
        <div className="lg:hidden flex items-center gap-2 mb-8">
          <Image src="/logo.svg" alt="OnMarmoraria" width={32} height={32} className="w-8 h-8" />
          <span className="font-bold text-xl text-foreground">OnMarmoraria</span>
        </div>

        <div className="w-full max-w-sm">
          {/* Header */}
          <div className="mb-8 space-y-1.5">
            <h2 className="text-2xl font-bold text-foreground tracking-tight">
              Bem-vindo de volta
            </h2>
            <p className="text-sm text-text-60">
              Informe suas credenciais para acessar o painel.
            </p>
          </div>

          {/* Form */}
          <LoginForm />

          {/* Divider + register link */}
          <div className="mt-6 flex items-center gap-3">
            <div className="flex-1 h-px bg-glass-10" />
            <span className="text-xs text-text-40">ou</span>
            <div className="flex-1 h-px bg-glass-10" />
          </div>

          <p className="mt-4 text-center text-sm text-text-60">
            Primeira vez aqui?{' '}
            <a
              href="/auth/onboarding"
              className="font-medium text-accent-detail hover:text-accent-muted transition-colors underline-offset-2 hover:underline"
            >
              Abrir minha marmoraria
            </a>
          </p>
          <p className="mt-2 text-center text-xs text-text-40">
            Funcionários entram pelo login — o administrador convida a equipe em Configurações.
          </p>
        </div>

        {/* Footer */}
        <p className="mt-12 text-xs text-text-40">
          OnMarmoraria • Gestão empresarial otimizada
        </p>
      </div>
    </div>
  );
}


