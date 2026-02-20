type PublicEnvName =
  | 'NEXT_PUBLIC_KEYCLOAK_URL'
  | 'NEXT_PUBLIC_KEYCLOAK_REALM'
  | 'NEXT_PUBLIC_KEYCLOAK_CLIENT_ID';

function readEnv(name: PublicEnvName): string | null {
  const raw =
    name === 'NEXT_PUBLIC_KEYCLOAK_URL'
      ? process.env.NEXT_PUBLIC_KEYCLOAK_URL
      : name === 'NEXT_PUBLIC_KEYCLOAK_REALM'
        ? process.env.NEXT_PUBLIC_KEYCLOAK_REALM
        : name === 'NEXT_PUBLIC_KEYCLOAK_CLIENT_ID'
          ? process.env.NEXT_PUBLIC_KEYCLOAK_CLIENT_ID
          : undefined;

  if (!raw) return null;
  const trimmed = raw.trim();
  return trimmed ? trimmed : null;
}

/**
 * Whether SSO (Keycloak) is configured for the frontend.
 * This does NOT use keycloak-js; it only gates UI for NextAuth sign-in.
 */
export function isSsoEnabled(): boolean {
  return !!(
    readEnv('NEXT_PUBLIC_KEYCLOAK_URL') &&
    readEnv('NEXT_PUBLIC_KEYCLOAK_REALM') &&
    readEnv('NEXT_PUBLIC_KEYCLOAK_CLIENT_ID')
  );
}
