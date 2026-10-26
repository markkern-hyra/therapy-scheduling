import type { ReactNode } from "react";

export type Description = {
  term: string;
  detail: ReactNode;
  // Дата й час — табличні цифри (DESIGN.md, розділ 3); відсутнє значення («Not provided») — приглушене.
  numeric?: boolean;
  muted?: boolean;
};

// Пари «підпис — значення» (<dl>) сіткою: підпис над значенням, 1–3 колонки за шириною.
export function DescriptionList({ items }: { items: Description[] }) {
  return (
    <dl className="grid gap-x-6 gap-y-4 sm:grid-cols-2 lg:grid-cols-3">
      {items.map((item) => (
        <div key={item.term} className="flex flex-col gap-1">
          <dt className="text-sm text-muted-foreground">{item.term}</dt>
          <dd className={`text-base ${item.muted ? "text-muted-foreground" : "font-medium"} ${item.numeric ? "tabular-nums" : ""}`}>
            {item.detail}
          </dd>
        </div>
      ))}
    </dl>
  );
}
