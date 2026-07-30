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

type ReadUrlCacheEntry = { url: string; expiresAt: number };
const readUrlCache = new Map<string, ReadUrlCacheEntry>();

function validateImageFile(file: File): void {
  if (!ALLOWED_TYPES.has(file.type)) {
    throw new Error("Use JPEG, PNG ou WebP (máx. 2 MB).");
  }
  if (file.size > MAX_BYTES) {
    throw new Error("Arquivo muito grande (máx. 2 MB).");
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
  const cached = readUrlCache.get(objectKey);
  if (cached && cached.expiresAt > Date.now() + 60_000) {
    return cached.url;
  }

  const res = await apiClient.get<ReadUrlResponse>(
    API_CONFIG.endpoints.uploads.readUrl,
    { params: { object_key: objectKey } },
  );

  readUrlCache.set(objectKey, {
    url: res.read_url,
    expiresAt: Date.now() + res.expires_in * 1000,
  });

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

  const putRes = await fetch(signed.upload_url, {
    method: "PUT",
    headers: { "Content-Type": signed.content_type },
    body: file,
  });

  if (!putRes.ok) {
    throw new Error("Falha ao enviar arquivo para o armazenamento.");
  }

  readUrlCache.set(signed.object_key, {
    url: signed.read_url,
    expiresAt: Date.now() + signed.expires_in * 1000,
  });

  return {
    objectKey: signed.object_key,
    readUrl: signed.read_url,
  };
}
