import type { ComponentProps } from "react";

const SIZES = { md: "h-10 px-3 text-base", sm: "h-8 px-2 text-sm" };

// Випадний список з тим самим виглядом, що й Input; sm — у рядку таблиці поруч із Button sm.
export function Select({
  size = "md",
  ...props
}: Omit<ComponentProps<"select">, "className" | "size"> & { size?: keyof typeof SIZES }) {
  return (
    <select
      {...props}
      className={`w-full min-w-0 rounded-sm border border-input bg-card text-card-foreground ${SIZES[size]}`}
    />
  );
}
