export function isAuthDisabled(): boolean {
  if (typeof window !== 'undefined') {
    const raw = window.localStorage.getItem('auth_disabled');
    if (raw != null) {
      const v = raw.trim().toLowerCase();
      return v === '1' || v === 'true' || v === 'yes' || v === 'on';
    }
  }

  const env = process.env.NEXT_PUBLIC_AUTH_DISABLED;
  if (!env) return false;
  const v = env.trim().toLowerCase();
  return v === '1' || v === 'true' || v === 'yes' || v === 'on';
}

export function isLocalProductsEnabled(): boolean {
  if (typeof window !== 'undefined') {
    const raw = window.localStorage.getItem('products_local');
    if (raw != null) {
      const v = raw.trim().toLowerCase();
      return v === '1' || v === 'true' || v === 'yes' || v === 'on';
    }
  }

  const env = process.env.NEXT_PUBLIC_PRODUCTS_LOCAL;
  if (!env) return false;
  const v = env.trim().toLowerCase();
  return v === '1' || v === 'true' || v === 'yes' || v === 'on';
}

export function isLocalQuotesEnabled(): boolean {
  if (typeof window !== 'undefined') {
    const raw = window.localStorage.getItem('quotes_local');
    if (raw != null) {
      const v = raw.trim().toLowerCase();
      return v === '1' || v === 'true' || v === 'yes' || v === 'on';
    }
  }

  const env = process.env.NEXT_PUBLIC_QUOTES_LOCAL;
  if (!env) return false;
  const v = env.trim().toLowerCase();
  return v === '1' || v === 'true' || v === 'yes' || v === 'on';
}


