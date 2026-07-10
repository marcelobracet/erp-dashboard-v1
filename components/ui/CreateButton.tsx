import React, { forwardRef } from "react";
import Button, { type ButtonProps } from "@/components/ui/Button";

const PlusIcon = () => (
  <svg
    className="w-4 h-4 shrink-0"
    fill="none"
    stroke="currentColor"
    viewBox="0 0 24 24"
    aria-hidden
  >
    <path
      strokeLinecap="round"
      strokeLinejoin="round"
      strokeWidth={2.5}
      d="M12 4v16m8-8H4"
    />
  </svg>
);

export type CreateButtonProps = Omit<ButtonProps, "variant"> & {
  variant?: ButtonProps["variant"];
};

const CreateButton = forwardRef<HTMLButtonElement, CreateButtonProps>(
  ({ children, className = "", variant = "primary", ...props }, ref) => (
    <Button
      ref={ref}
      variant={variant}
      className={`gap-1.5 font-semibold tracking-wide ${className}`}
      {...props}
    >
      <PlusIcon />
      {children}
    </Button>
  ),
);

CreateButton.displayName = "CreateButton";

export default CreateButton;
