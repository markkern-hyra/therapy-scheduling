import type { ComponentProps } from "react";

// Підпис обгортає поле: <Label>Email<Input … /></Label> — зв'язок без id і htmlFor.
export function Label(props: Omit<ComponentProps<"label">, "className">) {
  return <label {...props} className="flex flex-col gap-1 text-sm font-medium" />;
}
