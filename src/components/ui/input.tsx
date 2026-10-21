import type { ComponentProps } from "react";

export function Input(props: ComponentProps<"input">) {
  return (
    <input
      {...props}
      className="rounded-sm border border-line-strong bg-surface px-3 py-2 text-base text-ink"
    />
  );
}
