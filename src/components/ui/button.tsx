import type { ComponentProps } from "react";

const VARIANTS = {
  primary: "bg-primary text-primary-foreground hover:bg-primary-hover",
  secondary: "border border-input bg-background text-foreground hover:bg-muted",
};

// Одна головна дія на екран — primary; решта — secondary.
export function Button({
  variant = "primary",
  ...props
}: Omit<ComponentProps<"button">, "className"> & { variant?: keyof typeof VARIANTS }) {
  return (
    <button
      {...props}
      className={`rounded-sm px-3 py-2 text-sm font-medium ${VARIANTS[variant]}`}
    />
  );
}
