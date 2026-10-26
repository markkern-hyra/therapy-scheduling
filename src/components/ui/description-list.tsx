import type { ReactNode } from "react";

export type Description = {
  term: string;
  detail: ReactNode;
  // Дата й час — Geist Mono (DESIGN.md, розділ 3); відсутнє значення («Not provided») — приглушене.
  mono?: boolean;
  muted?: boolean;
};

// Пари «підпис — значення» (<dl>): підпис ліворуч на широкому екрані, над значенням — на вузькому.
export function DescriptionList({ items }: { items: Description[] }) {
  return (
    <dl className="divide-y divide-border text-sm">
      {items.map((item) => (
        <div key={item.term} className="grid gap-1 py-3 first:pt-0 last:pb-0 sm:grid-cols-[12rem_1fr] sm:gap-4">
          <dt className="text-muted-foreground">{item.term}</dt>
          <dd className={item.muted ? "text-muted-foreground" : item.mono ? "font-mono" : undefined}>{item.detail}</dd>
        </div>
      ))}
    </dl>
  );
}
