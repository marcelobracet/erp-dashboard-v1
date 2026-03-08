import type { DefaultSession } from 'next-auth';

declare module 'next-auth' {
  interface Session {
    accessToken?: string;
    roles: string[];
    user: DefaultSession['user'] & {
      id?: string;
    };
  }
}

declare module 'next-auth/jwt' {
  interface JWT {
    accessToken?: string;
    refreshToken?: string;
    userId?: string;
    roles?: string[];
    error?: string;
  }
}
