import type { ComponentProps } from "react";

export function Input(props: Omit<ComponentProps<"input">, "className">) {
  return (
    <input
      {...props}
      className="rounded-sm border border-input bg-card px-3 py-2 text-base text-card-foreground"
    />
  );
}
