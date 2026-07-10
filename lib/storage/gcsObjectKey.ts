/** Matches backend gcs.NormalizeObjectKey for private bucket object refs. */
export function normalizeObjectKey(stored: string): string {
  const value = stored.trim();
  if (!value) return "";
  if (!value.startsWith("http://") && !value.startsWith("https://")) {
    return value.replace(/^\/+/, "");
  }

  try {
    const parsed = new URL(value);
    if (parsed.hostname !== "storage.googleapis.com") {
      return "";
    }
    const path = parsed.pathname.replace(/^\/+/, "");
    const slash = path.indexOf("/");
    if (slash <= 0) return "";
    return path.slice(slash + 1);
  } catch {
    return "";
  }
}

/** True when value is a GCS object key or legacy storage.googleapis.com URL. */
export function isStorageObjectRef(stored: string): boolean {
  const value = stored.trim();
  if (!value) return false;
  if (!value.startsWith("http://") && !value.startsWith("https://")) {
    return true;
  }
  return normalizeObjectKey(value) !== "";
}
