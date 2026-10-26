import type { ReactNode } from "react";

// Поверхня розділу: рамка 1px на card, без тіні; заголовок розділу — h2 (необов'язковий).
export function Card({ title, children }: { title?: string; children: ReactNode }) {
  return (
    <section className="flex flex-col gap-4 rounded-md border border-border bg-card p-6 text-card-foreground">
      {title && <h2 className="text-lg font-semibold">{title}</h2>}
      {children}
    </section>
  );
}
