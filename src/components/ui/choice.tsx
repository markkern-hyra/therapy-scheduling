import type { ComponentProps, ReactNode } from "react";

// Один варіант із кількох (радіокнопка в рамці), для 2–3 варіантів замість Select. Обраний — рамка primary і тло
// primary-soft. Групу обгортає <fieldset> з <legend> — підписом групи.
export function Choice({
  children,
  ...props
}: Omit<ComponentProps<"input">, "className" | "type"> & { children: ReactNode }) {
  return (
    <label className="flex h-10 cursor-pointer items-center gap-2 rounded-sm border border-input bg-card px-3 text-sm font-medium text-card-foreground has-[:checked]:border-primary has-[:checked]:bg-primary-soft">
      <input {...props} type="radio" className="accent-primary" />
      {children}
    </label>
  );
}
