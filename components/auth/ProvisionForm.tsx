'use client';
import React, { useState } from 'react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import Button from '@/components/ui/Button';
import Input from '@/components/ui/Input';
import { authService } from '@/lib/api/auth';
import { apiClient } from '@/lib/api/client';
import { setTenantIdSync } from '@/lib/auth/tenant';
import { isValidCNPJ, onlyDigits } from '@/lib/validation/cpfCnpj';

function formatCnpjInput(value: string): string {
  const digits = onlyDigits(value).slice(0, 14);
  if (digits.length <= 2) return digits;
  if (digits.length <= 5) return `${digits.slice(0, 2)}.${digits.slice(2)}`;
  if (digits.length <= 8) return `${digits.slice(0, 2)}.${digits.slice(2, 5)}.${digits.slice(5)}`;
  if (digits.length <= 12) return `${digits.slice(0, 2)}.${digits.slice(2, 5)}.${digits.slice(5, 8)}/${digits.slice(8)}`;
  return `${digits.slice(0, 2)}.${digits.slice(2, 5)}.${digits.slice(5, 8)}/${digits.slice(8, 12)}-${digits.slice(12)}`;
}

export default function ProvisionForm() {
  const router = useRouter();
  const [companyName, setCompanyName] = useState('');
  const [cnpj, setCnpj] = useState('');
  const [adminName, setAdminName] = useState('');
  const [email, setEmail] = useState('');
  const [secret, setSecret] = useState('');
  const [errors, setErrors] = useState<Record<string, string>>({});
  const [loading, setLoading] = useState(false);
  const [done, setDone] = useState(false);

  async function onSubmit(e: React.FormEvent) {
    e.preventDefault();
    const next: Record<string, string> = {};
    if (!companyName.trim()) next.company_name = 'Nome da empresa é obrigatório.';
    const digits = onlyDigits(cnpj);
    if (digits && !isValidCNPJ(digits)) next.cnpj = 'Informe um CNPJ válido.';
    if (!adminName.trim()) next.admin_name = 'Nome do administrador é obrigatório.';
    if (!email.trim()) next.email = 'E-mail é obrigatório.';
    else if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) next.email = 'Informe um e-mail válido.';
    if (!secret) next.secret = 'Senha é obrigatória.';
    else if (secret.length < 8) next.secret = 'A senha deve ter no mínimo 8 caracteres.';
    setErrors(next);
    if (Object.keys(next).length) return;
    setLoading(true);
    try {
      const res = await authService.provision({
        company_name: companyName.trim(),
        ...(digits ? { cnpj: digits } : {}),
        admin_name: adminName.trim(),
        admin_email: email.trim(),
        admin_password: secret,
      });
      if (res.verification_required) { setDone(true); return; }
      if (res.auth?.access_token && res.auth.refresh_token) {
        apiClient.setToken(res.auth.access_token);
        apiClient.setRefreshToken(res.auth.refresh_token);
        setTenantIdSync(res.tenant.id ?? res.auth.user.tenant_id);
        router.push('/dashboard');
        return;
      }
      setErrors({ general: res.message ?? 'Resposta inesperada do servidor.' });
    } catch (err) {
      setErrors({ general: (err as { message?: string })?.message ?? 'Erro ao criar a empresa.' });
    } finally {
      setLoading(false);
    }
  }

  if (done) {
    return (
      <div className="space-y-4 text-center">
        <div className="inline-flex items-center justify-center w-16 h-16 rounded-full bg-green-100 dark:bg-green-900/30 mx-auto">
          <svg className="w-8 h-8 text-green-600 dark:text-green-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
          </svg>
        </div>
        <h3 className="text-lg font-semibold text-foreground">Empresa criada!</h3>
        <p className="text-sm text-text-60">
          Enviamos um e-mail de verificação para <strong>{email}</strong>.
          Confirme seu endereço antes de fazer login.
        </p>
        <Link href="/auth/login" className="inline-block text-sm font-medium text-accent-detail hover:text-accent-muted transition-colors">
          Ir para o login
        </Link>
      </div>
    );
  }

  return (
    <form onSubmit={onSubmit} className="space-y-4" noValidate>
      {errors.general && (
        <div className="p-3 rounded-lg bg-red-50 dark:bg-red-900/20 border border-red-200 dark:border-red-800">
          <p className="text-sm text-red-700 dark:text-red-300">{errors.general}</p>
        </div>
      )}
      <Input label="Nome da empresa" value={companyName} onChange={(e) => setCompanyName(e.target.value)} error={errors.company_name} />
      <Input label="CNPJ (opcional)" value={cnpj} onChange={(e) => setCnpj(formatCnpjInput(e.target.value))} error={errors.cnpj} />
      <Input label="Nome do administrador" value={adminName} onChange={(e) => setAdminName(e.target.value)} error={errors.admin_name} />
      <Input label="E-mail" type="email" value={email} onChange={(e) => setEmail(e.target.value)} error={errors.email} />
      <Input label="Senha" type="password" value={secret} onChange={(e) => setSecret(e.target.value)} error={errors.secret} />
      <Button type="submit" variant="primary" size="lg" fullWidth isLoading={loading} disabled={loading}>
        {loading ? 'Criando empresa…' : 'Criar empresa'}
      </Button>
    </form>
  );
}
