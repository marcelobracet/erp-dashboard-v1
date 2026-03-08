import type { NextAuthOptions } from 'next-auth';
import CredentialsProvider from 'next-auth/providers/credentials';

type ApiTokenClaims = {
  sub?: string;
  email?: string;
  name?: string;
  role?: string;
};

function decodeJwtClaims(token?: string | null): ApiTokenClaims {
  if (!token) return {};
  const parts = token.split('.');
  if (parts.length < 2) return {};

  try {
    const part = parts[1]!;
    const pad = '='.repeat((4 - (part.length % 4)) % 4);
    const base64 = (part + pad).replace(/-/g, '+').replace(/_/g, '/');
    const json = Buffer.from(base64, 'base64').toString('utf8');
    const parsed = JSON.parse(json);
    if (!parsed || typeof parsed !== 'object') return {};
    return parsed as ApiTokenClaims;
  } catch {
    return {};
  }
}

type AuthorizeUser = {
  id: string;
  email: string;
  name: string;
  role: string;
  accessToken: string;
  refreshToken?: string;
};

export const authOptions: NextAuthOptions = {
  providers: [
    CredentialsProvider({
      name: 'credentials',
      credentials: {
        email: { label: 'Email', type: 'email' },
        password: { label: 'Senha', type: 'password' },
      },
      async authorize(credentials): Promise<AuthorizeUser | null> {
        if (!credentials?.email || !credentials?.password) return null;

        const apiUrl = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:8080';

        try {
          const response = await fetch(`${apiUrl}/api/v1/auth/login`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({
              email: credentials.email,
              password: credentials.password,
            }),
          });

          if (!response.ok) return null;

          const data = await response.json() as {
            access_token?: string;
            refresh_token?: string;
            user?: { id?: string; email?: string; name?: string; role?: string };
          };

          if (!data.access_token) return null;

          const claims = decodeJwtClaims(data.access_token);
          const user = data.user ?? {};

          return {
            id: user.id ?? claims.sub ?? credentials.email,
            email: user.email ?? claims.email ?? credentials.email,
            name: user.name ?? claims.name ?? credentials.email,
            role: user.role ?? claims.role ?? 'user',
            accessToken: data.access_token,
            refreshToken: data.refresh_token,
          };
        } catch {
          return null;
        }
      },
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
    async jwt({ token, user }) {
      if (user) {
        // Initial sign-in: persist API tokens and user data into the NextAuth JWT
        const u = user as AuthorizeUser;
        token.accessToken = u.accessToken;
        token.refreshToken = u.refreshToken;
        token.userId = u.id;
        token.roles = [u.role];
      }
      return token;
    },

    async session({ session, token }) {
      session.accessToken = token.accessToken;
      session.roles = (token.roles as string[] | undefined) ?? [];

      if (session.user) {
        session.user.id = (token.userId as string | undefined) ?? (token.sub as string | undefined);
      }

      return session;
    },
  },
  // Avoid __Secure- cookie prefix on plain http://localhost
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
          sameSite: 'lax' as const,
          path: '/',
          secure: useSecureCookies,
        },
      },
    };
  })(),
  debug: process.env.NODE_ENV !== 'production' && process.env.NEXTAUTH_DEBUG === 'true',
  logger: {
    error(code, metadata) {
      console.error('[NextAuth][error]', code, metadata ?? '');
    },
    warn(code) {
      console.warn('[NextAuth][warn]', code);
    },
  },
};
