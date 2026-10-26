import type { ReactNode } from "react";

// Статус — з крапкою кольору статусу; neutral — ознака без статусу (тип клієнта, мова).
const DOT = "before:size-1.5 before:rounded-full before:bg-current before:content-['']";
const VARIANTS = {
  held: `bg-status-held text-status-held-foreground ${DOT}`,
  confirmed: `bg-status-confirmed text-status-confirmed-foreground ${DOT}`,
  muted: `bg-muted text-muted-foreground ${DOT}`,
  neutral: "bg-muted text-foreground",
};

// Бейдж — завжди зі словом, колір лише підсилює (DESIGN.md, розділ 5).
export function Badge({ variant, children }: { variant: keyof typeof VARIANTS; children: ReactNode }) {
  return (
    <span
      className={`inline-flex items-center gap-1.5 whitespace-nowrap rounded-full px-2.5 py-0.5 text-xs font-semibold ${VARIANTS[variant]}`}
    >
      {children}
    </span>
  );
}
