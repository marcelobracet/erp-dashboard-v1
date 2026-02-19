import type Keycloak from 'keycloak-js';
import type {
  KeycloakInitOptions,
  KeycloakLoginOptions,
  KeycloakLogoutOptions,
  KeycloakTokenParsed,
} from 'keycloak-js';

export type KeycloakOnLoad = NonNullable<KeycloakInitOptions['onLoad']>;

export type ErpTokenParsed = KeycloakTokenParsed & {
  tenant_id?: string;
};

let keycloakInstance: Keycloak | null = null;
let initPromise: Promise<boolean> | null = null;
let initResult: boolean | null = null;

type PublicEnvName =
  | 'NEXT_PUBLIC_KEYCLOAK_URL'
  | 'NEXT_PUBLIC_KEYCLOAK_REALM'
  | 'NEXT_PUBLIC_KEYCLOAK_CLIENT_ID'
  | 'NEXT_PUBLIC_KEYCLOAK_ONLOAD';

function readEnv(name: PublicEnvName): string | null {
  // IMPORTANT (Next.js): dynamic access like process.env[name] is NOT reliably
  // replaced in client bundles. Use static references so NEXT_PUBLIC_* is inlined.
  const raw =
    name === 'NEXT_PUBLIC_KEYCLOAK_URL'
      ? process.env.NEXT_PUBLIC_KEYCLOAK_URL
      : name === 'NEXT_PUBLIC_KEYCLOAK_REALM'
        ? process.env.NEXT_PUBLIC_KEYCLOAK_REALM
        : name === 'NEXT_PUBLIC_KEYCLOAK_CLIENT_ID'
          ? process.env.NEXT_PUBLIC_KEYCLOAK_CLIENT_ID
          : name === 'NEXT_PUBLIC_KEYCLOAK_ONLOAD'
            ? process.env.NEXT_PUBLIC_KEYCLOAK_ONLOAD
            : undefined;

  if (!raw) return null;
  const trimmed = raw.trim();
  return trimmed ? trimmed : null;
}

export function isKeycloakEnabled(): boolean {
  return !!(
    readEnv('NEXT_PUBLIC_KEYCLOAK_URL') &&
    readEnv('NEXT_PUBLIC_KEYCLOAK_REALM') &&
    readEnv('NEXT_PUBLIC_KEYCLOAK_CLIENT_ID')
  );
}

function assertBrowser(): void {
  if (typeof window === 'undefined') {
    throw new Error('Keycloak is only available in the browser');
  }
}

function getConfig() {
  const url = readEnv('NEXT_PUBLIC_KEYCLOAK_URL');
  const realm = readEnv('NEXT_PUBLIC_KEYCLOAK_REALM');
  const clientId = readEnv('NEXT_PUBLIC_KEYCLOAK_CLIENT_ID');

  if (!url || !realm || !clientId) {
    throw new Error(
      'Missing Keycloak config. Set NEXT_PUBLIC_KEYCLOAK_URL, NEXT_PUBLIC_KEYCLOAK_REALM, NEXT_PUBLIC_KEYCLOAK_CLIENT_ID.'
    );
  }

  return { url, realm, clientId };
}

async function createKeycloak(): Promise<Keycloak> {
  assertBrowser();
  const { default: KeycloakCtor } = await import('keycloak-js');
  const { url, realm, clientId } = getConfig();
  return new KeycloakCtor({ url, realm, clientId });
}

export async function getKeycloak(): Promise<Keycloak> {
  assertBrowser();
  if (!isKeycloakEnabled()) {
    throw new Error('Keycloak is not enabled (missing NEXT_PUBLIC_KEYCLOAK_* envs)');
  }

  if (!keycloakInstance) {
    keycloakInstance = await createKeycloak();
  }
  return keycloakInstance;
}

export async function initKeycloak(opts?: {
  onLoad?: KeycloakOnLoad;
}): Promise<boolean> {
  assertBrowser();

  if (!isKeycloakEnabled()) {
    return false;
  }

  if (initResult !== null) {
    return initResult;
  }

  if (initPromise) return initPromise;

  initPromise = (async () => {
    const onLoad: KeycloakOnLoad =
      opts?.onLoad ?? ((readEnv('NEXT_PUBLIC_KEYCLOAK_ONLOAD') as KeycloakOnLoad | null) ?? 'check-sso');

    const buildInitOptions = (enableSilentSso: boolean): KeycloakInitOptions => ({
      onLoad,
      pkceMethod: 'S256',
      checkLoginIframe: false,
      // Some Keycloak setups/browsers never answer the 3p-cookie-check iframe.
      // When that happens, we retry init without silent SSO.
      silentCheckSsoRedirectUri: enableSilentSso
        ? `${window.location.origin}/silent-check-sso.html`
        : undefined,
      silentCheckSsoFallback: true,
    });

    const finalize = (keycloak: Keycloak, authenticated: boolean) => {
      keycloak.onTokenExpired = () => {
        keycloak.updateToken(30).catch(() => {
          // Ignore; AuthProvider will react on next refresh cycle
        });
      };

      initResult = authenticated;
      return authenticated;
    };

    // First attempt: silent SSO enabled
    try {
      const keycloak = await getKeycloak();
      const authenticated = await keycloak.init(buildInitOptions(true));
      return finalize(keycloak, authenticated);
    } catch (err) {
      const message = err instanceof Error ? err.message : String(err);
      if (!message.includes('3rd party check iframe message')) {
        throw err;
      }

      // Retry: disable silent SSO to avoid 3p cookie iframe timeout.
      keycloakInstance = null;
      const keycloak = await getKeycloak();
      const authenticated = await keycloak.init(buildInitOptions(false));
      return finalize(keycloak, authenticated);
    }
  })();

  try {
    return await initPromise;
  } catch (err) {
    // If init() fails, keycloak-js may still mark the instance as initialized.
    // Retrying init() on the same instance will throw "can only be initialized once".
    // So we discard the instance and cached state to allow a clean retry.
    initPromise = null;
    initResult = null;
    keycloakInstance = null;
    throw err;
  }
}

async function ensureInitialized(): Promise<void> {
  if (!isKeycloakEnabled()) return;
  if (typeof window === 'undefined') return;
  if (!initPromise) {
    await initKeycloak({ onLoad: 'check-sso' });
    return;
  }
  await initPromise;
}

export async function login(options?: KeycloakLoginOptions): Promise<void> {
  const keycloak = await getKeycloak();
  await ensureInitialized();
  await keycloak.login(options);
}

export async function register(options?: KeycloakLoginOptions): Promise<void> {
  const keycloak = await getKeycloak();
  await ensureInitialized();
  await keycloak.login({ ...options, action: 'register' });
}

export async function logout(options?: KeycloakLogoutOptions): Promise<void> {
  const keycloak = await getKeycloak();
  await ensureInitialized();
  await keycloak.logout(options);
}

export async function updateToken(minValiditySeconds = 30): Promise<boolean> {
  if (!isKeycloakEnabled() || typeof window === 'undefined') return false;
  await ensureInitialized();
  const keycloak = await getKeycloak();

  if (!keycloak.authenticated) return false;

  try {
    return await keycloak.updateToken(minValiditySeconds);
  } catch (_err) {
    return false;
  }
}

export async function getAccessToken(): Promise<string | null> {
  if (!isKeycloakEnabled() || typeof window === 'undefined') return null;
  await ensureInitialized();
  const keycloak = await getKeycloak();
  return keycloak.token ?? null;
}

export function getTokenParsedSync(): ErpTokenParsed | null {
  if (!isKeycloakEnabled() || typeof window === 'undefined') return null;
  const parsed = (keycloakInstance?.tokenParsed ?? null) as ErpTokenParsed | null;
  return parsed;
}

export async function getTokenParsed(): Promise<ErpTokenParsed | null> {
  if (!isKeycloakEnabled() || typeof window === 'undefined') return null;
  await ensureInitialized();
  const keycloak = await getKeycloak();
  return (keycloak.tokenParsed ?? null) as ErpTokenParsed | null;
}

export async function getTenantId(): Promise<string | null> {
  const parsed = await getTokenParsed();
  return parsed?.tenant_id ?? null;
}

export function getTenantIdSync(): string | null {
  const parsed = getTokenParsedSync();
  return parsed?.tenant_id ?? null;
}

export async function getRoles(): Promise<string[]> {
  const parsed = await getTokenParsed();
  const roles = parsed?.realm_access?.roles ?? [];
  return Array.isArray(roles) ? roles : [];
}

export function getRolesSync(): string[] {
  const parsed = getTokenParsedSync();
  const roles = parsed?.realm_access?.roles ?? [];
  return Array.isArray(roles) ? roles : [];
}

export async function hasRealmRole(role: string): Promise<boolean> {
  const roles = await getRoles();
  return roles.includes(role);
}

export function hasRealmRoleSync(role: string): boolean {
  return getRolesSync().includes(role);
}
