import type { ComponentProps } from "react";

// h-10 — та сама висота, що й Button md і Select, тож поля й кнопка стоять в один ряд.
export function Input(props: Omit<ComponentProps<"input">, "className">) {
  return (
    <input
      {...props}
      className="h-10 w-full min-w-0 rounded-sm border border-input bg-card px-3 text-base text-card-foreground"
    />
  );
}
