import { apiClient } from "./client";
import { API_CONFIG } from "./config";
import {
  isStorageObjectRef,
  normalizeObjectKey,
} from "@/lib/storage/gcsObjectKey";

export type UploadPurpose = "logo" | "avatar" | "product";

export interface SignUploadResponse {
  upload_url: string;
  object_key: string;
  read_url: string;
  expires_in: number;
  content_type: string;
  /** @deprecated Private buckets — persist object_key instead. */
  public_url?: string;
}

export interface ReadUrlResponse {
  read_url: string;
  object_key: string;
  expires_in: number;
}

export interface UploadImageResult {
  objectKey: string;
  readUrl: string;
}

const MAX_BYTES = 2 * 1024 * 1024;
const ALLOWED_TYPES = new Set(["image/jpeg", "image/png", "image/webp"]);

const CACHE_STORAGE_KEY = "erp.gcs-read-url-cache";
const CACHE_SAFETY_MS = 60_000;

type ReadUrlCacheEntry = { url: string; expiresAt: number };
const readUrlCache = new Map<string, ReadUrlCacheEntry>();

function loadPersistedCache(): void {
  if (typeof window === "undefined") return;
  try {
    const raw = sessionStorage.getItem(CACHE_STORAGE_KEY);
    if (!raw) return;
    const parsed = JSON.parse(raw) as Record<string, ReadUrlCacheEntry>;
    const now = Date.now();
    for (const [key, entry] of Object.entries(parsed)) {
      if (entry.expiresAt > now + CACHE_SAFETY_MS) {
        readUrlCache.set(key, entry);
      }
    }
  } catch {
    // ignore corrupt cache
  }
}

function persistCacheEntry(objectKey: string, entry: ReadUrlCacheEntry): void {
  if (typeof window === "undefined") return;
  try {
    const raw = sessionStorage.getItem(CACHE_STORAGE_KEY);
    const parsed = raw
      ? (JSON.parse(raw) as Record<string, ReadUrlCacheEntry>)
      : {};
    parsed[objectKey] = entry;
    const now = Date.now();
    for (const [key, value] of Object.entries(parsed)) {
      if (value.expiresAt <= now + CACHE_SAFETY_MS) {
        delete parsed[key];
      }
    }
    sessionStorage.setItem(CACHE_STORAGE_KEY, JSON.stringify(parsed));
  } catch {
    // ignore quota errors
  }
}

function setCacheEntry(objectKey: string, url: string, expiresInSec: number): void {
  const entry: ReadUrlCacheEntry = {
    url,
    expiresAt: Date.now() + expiresInSec * 1000,
  };
  readUrlCache.set(objectKey, entry);
  persistCacheEntry(objectKey, entry);
}

function getCacheEntry(objectKey: string): string | null {
  const cached = readUrlCache.get(objectKey);
  if (cached && cached.expiresAt > Date.now() + CACHE_SAFETY_MS) {
    return cached.url;
  }
  return null;
}

if (typeof window !== "undefined") {
  loadPersistedCache();
}

function validateImageFile(file: File): void {
  if (!ALLOWED_TYPES.has(file.type)) {
    throw new Error("Use JPEG, PNG ou WebP (máx. 2 MB).");
  }
  if (file.size > MAX_BYTES) {
    throw new Error("Arquivo muito grande (máx. 2 MB).");
  }
}

/** Drop cached signed URL (e.g. after avatar overwrite at same object key). */
export function invalidateStorageReadUrl(stored: string): void {
  const objectKey = normalizeObjectKey(stored.trim());
  if (!objectKey) return;
  readUrlCache.delete(objectKey);
  if (typeof window === "undefined") return;
  try {
    const raw = sessionStorage.getItem(CACHE_STORAGE_KEY);
    if (!raw) return;
    const parsed = JSON.parse(raw) as Record<string, ReadUrlCacheEntry>;
    delete parsed[objectKey];
    sessionStorage.setItem(CACHE_STORAGE_KEY, JSON.stringify(parsed));
  } catch {
    // ignore
  }
}

/** Resolve a stored object key (or legacy GCS URL) to a temporary signed GET URL. */
export async function getStorageReadUrl(stored: string): Promise<string> {
  const trimmed = stored.trim();
  if (!trimmed) return "";
  if (!isStorageObjectRef(trimmed)) {
    return trimmed;
  }

  const objectKey = normalizeObjectKey(trimmed);
  const cached = getCacheEntry(objectKey);
  if (cached) return cached;

  const res = await apiClient.get<ReadUrlResponse>(
    API_CONFIG.endpoints.uploads.readUrl,
    { params: { object_key: objectKey } },
  );

  setCacheEntry(objectKey, res.read_url, res.expires_in);
  return res.read_url;
}

/** Request signed URL, PUT file to GCS, return object key + preview read URL. */
export async function uploadImage(
  purpose: UploadPurpose,
  file: File,
): Promise<UploadImageResult> {
  validateImageFile(file);

  const signed = await apiClient.post<SignUploadResponse>(
    API_CONFIG.endpoints.uploads.sign,
    {
      purpose,
      content_type: file.type,
      filename: file.name,
    },
  );

  invalidateStorageReadUrl(signed.object_key);

  const putRes = await fetch(signed.upload_url, {
    method: "PUT",
    headers: { "Content-Type": signed.content_type },
    body: file,
  });

  if (!putRes.ok) {
    throw new Error("Falha ao enviar arquivo para o armazenamento.");
  }

  setCacheEntry(signed.object_key, signed.read_url, signed.expires_in);

  return {
    objectKey: signed.object_key,
    readUrl: signed.read_url,
  };
}
