'use client';

import Image from 'next/image';
import ProvisionForm from '@/components/auth/ProvisionForm';

export default function OnboardingPage() {
  return (
    <div className="min-h-screen flex">
      <div className="hidden lg:flex lg:w-2/5 relative overflow-hidden bg-slate-900">
        <div
          className="absolute inset-0 bg-cover bg-center"
          style={{
            backgroundImage:
              "url('https://images.unsplash.com/photo-1618221195710-dd6b41faaea6?w=1400&q=80')",
          }}
        />
        <div className="absolute inset-0 bg-gradient-to-br from-slate-900/90 via-slate-800/75 to-slate-900/85" />

        <div className="relative z-10 flex flex-col justify-between h-full p-10 text-white">
          <div className="flex items-center gap-3">
            <Image src="/logo.svg" alt="OnMarmoraria" width={28} height={28} className="w-7 h-7" />
            <span className="font-semibold text-lg">OnMarmoraria</span>
          </div>

          <div className="space-y-4">
            <h1 className="text-3xl font-bold leading-tight">
              Comece em minutos
            </h1>
            <p className="text-white/65 text-sm leading-relaxed">
              Cadastre sua marmoraria e crie a conta de administrador. Depois do login,
              adicione gerentes e funcionários em Configurações → Equipe.
            </p>
            <ol className="space-y-2 text-sm text-white/75 list-decimal list-inside">
              <li>Criar empresa (esta página)</li>
              <li>Entrar no painel como administrador</li>
              <li>Convidar a equipe</li>
            </ol>
          </div>

          <p className="text-xs text-white/30">© {new Date().getFullYear()} OnMarmoraria</p>
        </div>
      </div>

      <div className="w-full lg:w-3/5 flex flex-col items-center justify-center bg-background min-h-screen p-6 sm:p-10">
        <div className="lg:hidden flex items-center gap-2 mb-8">
          <Image src="/logo.svg" alt="OnMarmoraria" width={32} height={32} className="w-8 h-8" />
          <span className="font-bold text-xl text-foreground">OnMarmoraria</span>
        </div>

        <div className="w-full max-w-lg">
          <div className="mb-8 space-y-1.5">
            <h2 className="text-2xl font-bold text-foreground tracking-tight">
              Abrir minha marmoraria
            </h2>
            <p className="text-sm text-text-60">
              Onboarding para uma nova empresa. Já faz parte de uma equipe?{' '}
              <a
                href="/auth/login"
                className="font-medium text-accent-detail hover:text-accent-muted transition-colors"
              >
                Faça login
              </a>
            </p>
          </div>

          <ProvisionForm />
        </div>
      </div>
    </div>
  );
}
