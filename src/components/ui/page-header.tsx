import Link from "next/link";
import type { ReactNode } from "react";
import { BackIcon } from "./icons";

// Верх сторінки: шлях назад (необов'язковий), ведучий елемент (аватар), h1, підпис і дії праворуч. titleId — для
// aria-labelledby списку, який цей заголовок називає.
export function PageHeader({
  title,
  titleId,
  description,
  back,
  leading,
  actions,
}: {
  title: string;
  titleId?: string;
  description?: ReactNode;
  back?: { href: string; label: string };
  leading?: ReactNode;
  actions?: ReactNode;
}) {
  return (
    <header className="flex flex-col gap-3">
      {back && (
        <Link
          href={back.href}
          className="inline-flex w-fit items-center gap-1 text-sm text-muted-foreground hover:text-foreground"
        >
          <BackIcon />
          {back.label}
        </Link>
      )}
      <div className="flex flex-wrap items-center justify-between gap-4">
        <div className="flex min-w-0 items-center gap-4">
          {leading}
          <div className="flex min-w-0 flex-col gap-1">
            <h1 id={titleId} className="text-3xl font-bold tracking-tight">
              {title}
            </h1>
            {description && <div className="text-sm text-muted-foreground">{description}</div>}
          </div>
        </div>
        {actions && <div className="flex items-center gap-2">{actions}</div>}
      </div>
    </header>
  );
}
