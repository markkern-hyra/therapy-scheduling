import type { ReactNode } from "react";

const VARIANTS = {
  held: "bg-status-held text-status-held-foreground",
  confirmed: "bg-status-confirmed text-status-confirmed-foreground",
  muted: "bg-muted text-muted-foreground",
};

// Бейдж статусу — завжди зі словом, колір лише підсилює (DESIGN.md, розділ 5).
export function Badge({ variant, children }: { variant: keyof typeof VARIANTS; children: ReactNode }) {
  return (
    <span className={`inline-flex rounded-full px-2 py-0.5 text-xs font-medium ${VARIANTS[variant]}`}>{children}</span>
  );
}
