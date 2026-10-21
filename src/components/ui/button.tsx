import type { ComponentProps } from "react";

const VARIANTS = {
  primary: "bg-brand text-on-brand hover:bg-brand-strong",
  secondary: "border border-line-strong bg-surface text-ink hover:bg-surface-muted",
};

// Одна головна дія на екран — primary; решта — secondary.
export function Button({
  variant = "primary",
  ...props
}: ComponentProps<"button"> & { variant?: keyof typeof VARIANTS }) {
  return (
    <button
      {...props}
      className={`rounded-sm px-3 py-2 text-sm font-medium ${VARIANTS[variant]}`}
    />
  );
}
