import Link from "next/link";
import type { ReactNode } from "react";

// Розділ застосунку плиткою: іконка в м'якому колі, назва акцентом і для чого розділ. Наведення — межа поля (input).
export function LinkCard({
  href,
  icon,
  title,
  description,
}: {
  href: string;
  icon: ReactNode;
  title: string;
  description: string;
}) {
  return (
    <Link
      href={href}
      className="flex items-start gap-4 rounded-md border border-border bg-card p-4 text-card-foreground shadow-card hover:border-input"
    >
      <span className="grid size-10 shrink-0 place-items-center rounded-full bg-primary-soft text-primary">{icon}</span>
      <span className="flex flex-col gap-1">
        <span className="text-base font-semibold text-primary">{title}</span>
        <span className="text-sm text-muted-foreground">{description}</span>
      </span>
    </Link>
  );
}
