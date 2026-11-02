import type { ReactNode } from "react";

// Помилка одного поля форми: під полем, текст AC дослівно. Без тексту нічого не показує. Загальні відмови — Alert.
export function FieldError({ children }: { children: ReactNode }) {
  return children ? (
    <p role="alert" className="text-sm text-destructive">
      {children}
    </p>
  ) : null;
}
