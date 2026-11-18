import type { ComponentProps } from "react";

// Багаторядкове поле (текст звернення, зріз 4): той самий вигляд, що Input — рамка input, тло card, rounded-sm.
export function Textarea(props: Omit<ComponentProps<"textarea">, "className">) {
  return (
    <textarea
      {...props}
      className="w-full min-w-0 rounded-sm border border-input bg-card px-3 py-2 text-base text-card-foreground"
    />
  );
}
