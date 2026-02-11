export function isAuthDisabled(): boolean {
  // Allow runtime override in the browser (no rebuild needed)
  if (typeof window !== 'undefined') {
    const raw = window.localStorage.getItem('auth_disabled');
    if (raw != null) {
      const v = raw.trim().toLowerCase();
      return v === '1' || v === 'true' || v === 'yes' || v === 'on';
    }
  }

  // Build-time env for Next.js client bundles
  const env = process.env.NEXT_PUBLIC_AUTH_DISABLED;
  if (!env) return false;
  const v = env.trim().toLowerCase();
  return v === '1' || v === 'true' || v === 'yes' || v === 'on';
}


