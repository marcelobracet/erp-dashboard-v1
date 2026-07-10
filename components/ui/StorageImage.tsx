"use client";

import React, { useEffect, useState } from "react";
import { getStorageReadUrl } from "@/lib/api/uploads";
import { isStorageObjectRef } from "@/lib/storage/gcsObjectKey";

interface StorageImageProps {
  src?: string;
  alt: string;
  className?: string;
}

function GcsStorageImage({
  objectKey,
  alt,
  className,
}: {
  objectKey: string;
  alt: string;
  className?: string;
}) {
  const [resolvedSrc, setResolvedSrc] = useState("");

  useEffect(() => {
    let cancelled = false;
    void getStorageReadUrl(objectKey)
      .then((url) => {
        if (!cancelled) setResolvedSrc(url);
      })
      .catch(() => {
        if (!cancelled) setResolvedSrc("");
      });

    return () => {
      cancelled = true;
    };
  }, [objectKey]);

  if (!resolvedSrc) return null;

  // eslint-disable-next-line @next/next/no-img-element
  return <img src={resolvedSrc} alt={alt} className={className} />;
}

export default function StorageImage({
  src,
  alt,
  className,
}: StorageImageProps) {
  const value = src?.trim() ?? "";
  if (!value) return null;

  if (!isStorageObjectRef(value)) {
    // eslint-disable-next-line @next/next/no-img-element
    return <img src={value} alt={alt} className={className} />;
  }

  return <GcsStorageImage objectKey={value} alt={alt} className={className} />;
}
