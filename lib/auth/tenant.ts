export function getTenantIdSync(): string | null {
  if (typeof window === 'undefined') return null;
  try {
    const raw = window.localStorage.getItem('tenant_id');
    const v = raw?.trim();
    return v ? v : null;
  } catch {
    return null;
  }
}

export function setTenantIdSync(tenantId: string | undefined | null) {
  if (typeof window === 'undefined') return;
  try {
    if (!tenantId) {
      window.localStorage.removeItem('tenant_id');
      return;
    }
    window.localStorage.setItem('tenant_id', String(tenantId));
  } catch {
    // ignore
  }
}
