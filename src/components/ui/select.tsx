import type { ComponentProps } from "react";

// Випадний список з тим самим виглядом, що й Input.
export function Select(props: Omit<ComponentProps<"select">, "className">) {
  return (
    <select
      {...props}
      className="rounded-sm border border-input bg-card px-3 py-2 text-base text-card-foreground"
    />
  );
}
