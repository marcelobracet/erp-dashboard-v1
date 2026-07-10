"use client";

import StorageImage from "@/components/ui/StorageImage";

type AvatarSize = "sm" | "lg";

const SIZE_CLASSES: Record<AvatarSize, string> = {
  sm: "w-10 h-10 text-sm border",
  lg: "w-24 h-24 text-3xl border-2",
};

export function Avatar({
  name,
  url,
  size = "lg",
  className = "",
}: {
  name: string;
  url?: string;
  size?: AvatarSize;
  className?: string;
}) {
  const initials = name
    .split(" ")
    .slice(0, 2)
    .map((w) => w[0])
    .join("")
    .toUpperCase();

  return (
    <div
      className={`relative rounded-full overflow-hidden shadow-lg border-glass-10 bg-gradient-to-br from-accent to-accent-detail flex items-center justify-center text-zinc-950 font-bold shrink-0 ${SIZE_CLASSES[size]} ${className}`}
    >
      <span className="absolute inset-0 flex items-center justify-center">
        {initials}
      </span>
      {url ? (
        <StorageImage
          src={url}
          alt={name}
          className="absolute inset-0 z-10 w-full h-full object-cover"
        />
      ) : null}
    </div>
  );
}
