import type { ReactNode } from "react";

// Поверхня розділу: card поверх теплого тла сторінки, рамка 1px і м'яка тінь shadow-card; заголовок — h2 (необов'язковий).
export function Card({ title, children }: { title?: string; children: ReactNode }) {
  return (
    <section className="flex flex-col gap-4 rounded-md border border-border bg-card p-6 text-card-foreground shadow-card">
      {title && <h2 className="text-lg font-semibold">{title}</h2>}
      {children}
    </section>
  );
}
