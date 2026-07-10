"use client";

import React, { useState } from "react";
import Input from "@/components/ui/Input";
import StorageImage from "@/components/ui/StorageImage";
import { Avatar } from "@/components/ui/Avatar";
import { uploadImage, type UploadPurpose } from "@/lib/api/uploads";

export type ImageUploadPreview = "logo" | "avatar" | "product" | "none";

export interface ImageUploadFieldProps {
  purpose: UploadPurpose;
  value: string;
  onChange: (objectKey: string) => void;
  readOnly?: boolean;
  /** logo = retangular; avatar = circular com iniciais */
  preview?: ImageUploadPreview;
  /** Nome para iniciais quando preview=avatar */
  name?: string;
  uploadLabel?: string;
  /** Campo opcional para colar URL/chave manual (settings) */
  showUrlInput?: boolean;
  urlPlaceholder?: string;
}

export default function ImageUploadField({
  purpose,
  value,
  onChange,
  readOnly = false,
  preview = "logo",
  name = "",
  uploadLabel,
  showUrlInput = false,
  urlPlaceholder = "Chave do objeto ou URL externa",
}: ImageUploadFieldProps) {
  const [uploading, setUploading] = useState(false);

  const defaultLabel =
    purpose === "logo"
      ? "Enviar logo"
      : purpose === "product"
        ? "Enviar foto"
        : "Alterar foto";

  const handleUpload = async (file: File) => {
    try {
      setUploading(true);
      const { objectKey } = await uploadImage(purpose, file);
      onChange(objectKey);
    } catch (err) {
      const message =
        err instanceof Error ? err.message : "Falha ao enviar imagem.";
      alert(message);
    } finally {
      setUploading(false);
    }
  };

  if (readOnly) {
    if (!value) {
      return <p className="text-text-60 py-2">-</p>;
    }
    if (preview === "avatar") {
      return <Avatar size="lg" name={name || "Usuário"} url={value} />;
    }
    if (preview === "logo" || preview === "product") {
      return (
        <StorageImage
          src={value}
          alt={preview === "product" ? "Produto" : "Logo"}
          className={
            preview === "product"
              ? "h-24 w-24 rounded-xl object-cover border border-glass-10"
              : "h-16 max-w-[200px] object-contain"
          }
        />
      );
    }
    return null;
  }

  return (
    <div className="space-y-3">
      {preview === "avatar" ? (
        <div className="flex flex-col items-center gap-3">
          <Avatar size="lg" name={name || "Usuário"} url={value} />
          <label className="inline-flex">
            <input
              type="file"
              accept="image/jpeg,image/png,image/webp"
              className="hidden"
              disabled={uploading}
              onChange={(e) => {
                const file = e.target.files?.[0];
                if (file) void handleUpload(file);
                e.target.value = "";
              }}
            />
            <span
              className={`text-xs text-accent hover:text-accent-detail cursor-pointer underline ${
                uploading ? "opacity-50 pointer-events-none" : ""
              }`}
            >
              {uploading ? "Enviando…" : uploadLabel ?? defaultLabel}
            </span>
          </label>
          <span className="text-xs text-text-60">
            JPEG, PNG ou WebP — máx. 2 MB
          </span>
        </div>
      ) : (
        <>
          <div className="flex flex-wrap items-center gap-3">
            <label className="inline-flex">
              <input
                type="file"
                accept="image/jpeg,image/png,image/webp"
                className="hidden"
                disabled={uploading}
                onChange={(e) => {
                  const file = e.target.files?.[0];
                  if (file) void handleUpload(file);
                  e.target.value = "";
                }}
              />
              <span
                className={`inline-flex items-center px-4 py-2 rounded-lg text-sm font-medium border border-glass-10 bg-glass-5 hover:bg-glass-10 cursor-pointer transition-colors ${
                  uploading ? "opacity-50 pointer-events-none" : ""
                }`}
              >
                {uploading ? "Enviando…" : uploadLabel ?? defaultLabel}
              </span>
            </label>
            <span className="text-xs text-text-60">
              JPEG, PNG ou WebP — máx. 2 MB
            </span>
          </div>
          {showUrlInput ? (
            <Input
              value={value}
              onChange={(e) => onChange(e.target.value)}
              placeholder={urlPlaceholder}
            />
          ) : null}
          {value && (preview === "logo" || preview === "product") ? (
            <StorageImage
              src={value}
              alt="Prévia"
              className={
                preview === "product"
                  ? "h-24 w-24 rounded-xl object-cover border border-glass-10"
                  : "h-16 max-w-[200px] object-contain"
              }
            />
          ) : null}
        </>
      )}
    </div>
  );
}
