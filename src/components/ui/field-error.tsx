import type { ReactNode } from "react";

// Помилка одного поля форми: під полем, текст AC дослівно. Без тексту нічого не показує. Загальні відмови — Alert.
// id зв'язує повідомлення з полем через aria-describedby.
export function FieldError({ id, children }: { id: string; children: ReactNode }) {
  return children ? (
    <p id={id} role="alert" className="text-sm text-destructive">
      {children}
    </p>
  ) : null;
}
