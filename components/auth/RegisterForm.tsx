'use client';

import React, { useEffect, useState } from 'react';
import { useAuth } from '@/contexts/AuthContext';
import Button from '@/components/ui/Button';
import { isSsoEnabled } from '@/lib/auth/sso';

function mapNextAuthError(code: string): string {
  switch (code) {
    case 'OAuthSignin':
      return 'Não foi possível iniciar o cadastro via Keycloak. Verifique KEYCLOAK_ISSUER/redirect URI.';
    case 'OAuthCallback':
      return 'Falha no retorno do Keycloak (callback). Verifique redirect URI e client secret.';
    case 'Configuration':
      return 'Configuração do NextAuth/Keycloak incompleta. Verifique variáveis de ambiente.';
    case 'AccessDenied':
      return 'Acesso negado.';
    default:
      return `Erro de autenticação: ${code}`;
  }
}

export default function RegisterForm() {
  const [errors, setErrors] = useState<{
    general?: string;
  }>({});
  const [isLoading, setIsLoading] = useState(false);

  const { register } = useAuth();

  const ssoEnabled = isSsoEnabled();

  useEffect(() => {
    const params = new URLSearchParams(window.location.search);
    const err = params.get('error');
    if (err) {
      setErrors((prev) => ({ ...prev, general: mapNextAuthError(err) }));
    }
  }, []);

  const handleSsoRegister = async () => {
    setErrors({});
    setIsLoading(true);
    try {
      await register();
    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : 'Erro ao redirecionar para o cadastro.';
      setErrors({ general: errorMessage });
      setIsLoading(false);
    }
  };

  if (ssoEnabled) {
    return (
      <div className="space-y-6">
        {errors.general && (
          <div className="p-4 rounded-xl bg-red-50 dark:bg-red-900/20 border border-red-200 dark:border-red-800">
            <p className="text-sm text-red-800 dark:text-red-200">
              {errors.general}
            </p>
          </div>
        )}

        <div className="p-4 rounded-xl bg-glass-5 border border-glass-10">
          <p className="text-sm text-text-80">
            Cadastro gerenciado pelo Keycloak. Clique abaixo para criar sua conta.
          </p>
        </div>

        <Button
          type="button"
          variant="primary"
          size="lg"
          fullWidth
          isLoading={isLoading}
          disabled={isLoading}
          onClick={handleSsoRegister}
        >
          Criar conta
        </Button>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <div className="p-4 rounded-xl bg-glass-5 border border-glass-10">
        <p className="text-sm text-text-80">
          SSO não configurado. Configure o Keycloak para habilitar cadastro.
        </p>
      </div>
    </div>
  );
}


