import type { DefaultSession } from 'next-auth';

declare module 'next-auth' {
  interface Session {
    accessToken?: string;
    idToken?: string;
    tenant_id?: string;
    roles: string[];
    user: DefaultSession['user'] & {
      id?: string;
    };
  }
}

declare module 'next-auth/jwt' {
  interface JWT {
    accessToken?: string;
    idToken?: string;
    refreshToken?: string;
    accessTokenExpires?: number;

    userId?: string;
    tenantId?: string;
    roles?: string[];

    error?: 'MissingTenantId' | 'NoRefreshToken' | 'MissingEnv' | 'RefreshAccessTokenError';
  }
}
