"use client";

import React, { useState } from "react";
import Input from "@/components/ui/Input";
import StorageImage from "@/components/ui/StorageImage";
import { uploadImage } from "@/lib/api/uploads";

interface LogoUploadFieldProps {
  value: string;
  onChange: (url: string) => void;
  readOnly?: boolean;
}

export default function LogoUploadField({
  value,
  onChange,
  readOnly = false,
}: LogoUploadFieldProps) {
  const [uploading, setUploading] = useState(false);

  const handleUpload = async (file: File) => {
    try {
      setUploading(true);
      const { objectKey } = await uploadImage("logo", file);
      onChange(objectKey);
    } catch (err) {
      const message =
        err instanceof Error ? err.message : "Falha ao enviar logo.";
      alert(message);
    } finally {
      setUploading(false);
    }
  };

  if (readOnly) {
    return (
      <div className="py-2">
        {value ? (
          <StorageImage
            src={value}
            alt="Logo"
            className="h-16 max-w-[200px] object-contain"
          />
        ) : (
          <p className="text-text-60">-</p>
        )}
      </div>
    );
  }

  return (
    <div className="space-y-3">
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
            {uploading ? "Enviando…" : "Enviar imagem"}
          </span>
        </label>
        <span className="text-xs text-text-60">
          JPEG, PNG ou WebP — máx. 2 MB
        </span>
      </div>
      <Input
        value={value}
        onChange={(e) => onChange(e.target.value)}
        placeholder="Chave do objeto (ex.: tenants/.../logo.png) ou URL externa"
      />
      {value ? (
        <StorageImage
          src={value}
          alt="Prévia do logo"
          className="h-16 max-w-[200px] object-contain"
        />
      ) : null}
    </div>
  );
}
