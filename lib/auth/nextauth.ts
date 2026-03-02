import axios from 'axios';
import type { NextAuthOptions } from 'next-auth';
import KeycloakProvider from 'next-auth/providers/keycloak';
import fs from 'node:fs';

type KeycloakTokenClaims = {
  sub?: string;
  tenant_id?: string;
  realm_access?: { roles?: string[] };
  resource_access?: Record<string, { roles?: string[] }>;
};

function mustGetEnv(name: string): string {
  const v = process.env[name];
  if (!v) throw new Error(`Missing env var: ${name}`);
  return v;
}

function isDockerRuntime(): boolean {
  try {
    return fs.existsSync('/.dockerenv');
  } catch {
    return false;
  }
}

function getKeycloakIssuer(): string {
  const issuer = process.env.KEYCLOAK_ISSUER;
  const issuerInternal = process.env.KEYCLOAK_ISSUER_INTERNAL;

  const picked = isDockerRuntime() ? issuerInternal ?? issuer : issuer ?? issuerInternal;
  if (!picked) {
    throw new Error(
      'Missing env var: KEYCLOAK_ISSUER (and/or KEYCLOAK_ISSUER_INTERNAL). ' +
        'Example: http://localhost:8081/realms/<realm>'
    );
  }

  return picked;
}

function base64UrlToString(input: string) {
  const pad = '='.repeat((4 - (input.length % 4)) % 4);
  const base64 = (input + pad).replace(/-/g, '+').replace(/_/g, '/');
  return Buffer.from(base64, 'base64').toString('utf8');
}

function decodeJwtClaims(token?: string | null): KeycloakTokenClaims {
  if (!token) return {};
  const parts = token.split('.');
  if (parts.length < 2) return {};

  try {
    const json = base64UrlToString(parts[1]!);
    const parsed = JSON.parse(json);
    if (!parsed || typeof parsed !== 'object') return {};
    return parsed as KeycloakTokenClaims;
  } catch {
    return {};
  }
}

function uniqueStrings(items: Array<string | undefined | null>): string[] {
  return Array.from(
    new Set(
      items
        .filter(Boolean)
        .map((s) => String(s).trim())
        .filter(Boolean)
    )
  );
}

async function refreshKeycloakAccessToken(token: {
  accessToken?: string;
  refreshToken?: string;
  accessTokenExpires?: number;
  idToken?: string;
}) {
  if (!token.refreshToken) {
    return { ...token, error: 'NoRefreshToken' as const };
  }

  const issuer = (() => {
    try {
      return getKeycloakIssuer();
    } catch {
      return undefined;
    }
  })();
  const clientId = process.env.KEYCLOAK_CLIENT_ID;
  const clientSecret = process.env.KEYCLOAK_CLIENT_SECRET;

  if (!issuer || !clientId || !clientSecret) {
    return { ...token, error: 'MissingEnv' as const };
  }

  const url = `${issuer.replace(/\/$/, '')}/protocol/openid-connect/token`;

  const body = new URLSearchParams({
    client_id: clientId,
    client_secret: clientSecret,
    grant_type: 'refresh_token',
    refresh_token: token.refreshToken,
  });

  const res = await axios.post(url, body, {
    headers: {
      'Content-Type': 'application/x-www-form-urlencoded',
    },
  });

  if (res.status !== 200) {
    return { ...token, error: 'RefreshAccessTokenError' as const };
  }

  const refreshed = res.data as {
    access_token: string;
    id_token?: string;
    refresh_token?: string;
    expires_in: number;
  };

  const now = Date.now();
  const accessTokenExpires = now + refreshed.expires_in * 1000;

  return {
    ...token,
    accessToken: refreshed.access_token,
    idToken: refreshed.id_token ?? token.idToken,
    refreshToken: refreshed.refresh_token ?? token.refreshToken,
    accessTokenExpires,
    error: undefined,
  };
}

export const authOptions: NextAuthOptions = {
  providers: [
    KeycloakProvider({
      clientId: mustGetEnv('KEYCLOAK_CLIENT_ID'),
      clientSecret: mustGetEnv('KEYCLOAK_CLIENT_SECRET'),
      issuer: getKeycloakIssuer(),
    }),
  ],
  pages: {
    signIn: '/auth/login',
    error: '/auth/login',
  },
  session: {
    strategy: 'jwt',
  },
  secret: process.env.NEXTAUTH_SECRET,
  callbacks: {
    async jwt({ token, account }) {
      if (account) {
        token.accessToken = account.access_token;
        token.idToken = account.id_token;
        token.refreshToken = account.refresh_token;

        // expires_at is seconds since epoch (provider dependent)
        if (typeof account.expires_at === 'number') {
          token.accessTokenExpires = account.expires_at * 1000;
        } else if (typeof account.expires_in === 'number') {
          token.accessTokenExpires = Date.now() + account.expires_in * 1000;
        }

        const claims = decodeJwtClaims(account.access_token ?? account.id_token);
        token.userId = claims.sub ?? token.sub;
        token.tenantId = claims.tenant_id;

        const realmRoles = claims.realm_access?.roles ?? [];
        const clientRoles = Object.values(claims.resource_access ?? {}).flatMap(
          (c) => c.roles ?? [],
        );
        token.roles = uniqueStrings([...realmRoles, ...clientRoles]);

        // Multi-tenant safety: if tenant claim is missing, mark error.
        if (!token.tenantId) {
          token.error = 'MissingTenantId';
        }

        return token;
      }

      // Subsequent runs: refresh access token if expired (with small buffer)
      const expires = typeof token.accessTokenExpires === 'number' ? token.accessTokenExpires : undefined;
      if (expires && Date.now() > expires - 30_000) {
        const refreshed = await refreshKeycloakAccessToken({
          accessToken: token.accessToken,
          refreshToken: token.refreshToken,
          accessTokenExpires: token.accessTokenExpires,
          idToken: token.idToken,
        });

        token.accessToken = refreshed.accessToken;
        token.idToken = refreshed.idToken;
        token.refreshToken = refreshed.refreshToken;
        token.accessTokenExpires = refreshed.accessTokenExpires;
        token.error = refreshed.error;

        const claims = decodeJwtClaims(token.accessToken ?? token.idToken);
        token.userId = claims.sub ?? token.userId ?? token.sub;
        token.tenantId = claims.tenant_id ?? token.tenantId;

        // Extrai roles do realm E de todos os clientes registrados no Keycloak
        const realmRoles = claims.realm_access?.roles ?? [];
        const clientRoles = Object.values(claims.resource_access ?? {}).flatMap(
          (c) => c.roles ?? [],
        );
        token.roles = uniqueStrings([...realmRoles, ...clientRoles]);

        if (!token.tenantId) token.error = 'MissingTenantId';
      }

      return token;
    },

    async session({ session, token }) {
      session.accessToken = token.accessToken;
      session.idToken = token.idToken;
      session.tenant_id = token.tenantId;
      session.roles = token.roles ?? [];

      if (session.user) {
        session.user.id = (token.userId as string | undefined) ?? (token.sub as string | undefined);
      }

      return session;
    },
  },
  // Avoid cookie-prefix issues on http://localhost.
  // __Secure- prefix requires Secure=true, which only works on HTTPS.
  cookies: (() => {
    const nextAuthUrl = process.env.NEXTAUTH_URL;
    const useSecureCookies =
      process.env.NODE_ENV === 'production' ||
      (typeof nextAuthUrl === 'string' && nextAuthUrl.startsWith('https://'));

    return {
      sessionToken: {
        name: useSecureCookies
          ? '__Secure-next-auth.session-token'
          : 'next-auth.session-token',
        options: {
          httpOnly: true,
          sameSite: 'lax',
          path: '/',
          secure: useSecureCookies,
        },
      },
    };
  })(),
  // Print useful server-side errors in dev; toggle verbose debug with NEXTAUTH_DEBUG=true.
  debug: process.env.NODE_ENV !== 'production' && process.env.NEXTAUTH_DEBUG === 'true',
  logger: {
    error(code, metadata) {
      // eslint-disable-next-line no-console
      console.error('[NextAuth][error]', code, metadata ?? '');
    },
    warn(code) {
      // eslint-disable-next-line no-console
      console.warn('[NextAuth][warn]', code);
    },
    debug(code, metadata) {
      if (process.env.NODE_ENV !== 'production' && process.env.NEXTAUTH_DEBUG === 'true') {
        // eslint-disable-next-line no-console
        console.debug('[NextAuth][debug]', code, metadata ?? '');
      }
    },
  },
};
