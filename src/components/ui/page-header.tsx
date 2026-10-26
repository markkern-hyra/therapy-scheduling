import Link from "next/link";
import type { ReactNode } from "react";

// Верх сторінки: шлях назад (необов'язковий), h1, підпис і дії праворуч; роздільник знизу. titleId — для
// aria-labelledby таблиці, яку цей заголовок називає.
export function PageHeader({
  title,
  titleId,
  description,
  back,
  actions,
}: {
  title: string;
  titleId?: string;
  description?: ReactNode;
  back?: { href: string; label: string };
  actions?: ReactNode;
}) {
  return (
    <header className="flex flex-wrap items-end justify-between gap-4 border-b border-border pb-4">
      <div className="flex min-w-0 flex-col gap-1">
        {back && (
          <Link href={back.href} className="text-sm text-muted-foreground hover:text-foreground hover:underline">
            {back.label}
          </Link>
        )}
        <h1 id={titleId} className="text-2xl font-semibold">
          {title}
        </h1>
        {description && <p className="text-sm text-muted-foreground">{description}</p>}
      </div>
      {actions && <div className="flex items-center gap-2">{actions}</div>}
    </header>
  );
}
