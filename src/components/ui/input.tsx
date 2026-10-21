import type { ComponentProps } from "react";

export function Input(props: Omit<ComponentProps<"input">, "className">) {
  return (
    <input
      {...props}
      className="rounded-sm border border-line-strong bg-surface px-3 py-2 text-base text-ink"
    />
  );
}
