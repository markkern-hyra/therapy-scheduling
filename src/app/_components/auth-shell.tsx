import type { ReactNode } from "react";
import { BrandMark } from "@/components/ui/brand-mark";
import { Card } from "@/components/ui/card";
import { PRODUCT } from "@/lib/product";

// Сторінки поза застосунком (вхід, «доступу ще немає»): знак і назва продукту над карткою, без навігації; призначення
// продукту — лише на вході (на «доступу ще немає» — тільки повідомлення, AC-CARD-11).
export function AuthShell({ children, tagline = false }: { children: ReactNode; tagline?: boolean }) {
  return (
    <main className="mx-auto flex w-full max-w-sm flex-1 flex-col justify-center gap-6 px-6 py-6">
      <div className="flex items-center gap-3">
        <BrandMark />
        <div className="flex flex-col">
          <span className="text-base font-semibold">{PRODUCT.name}</span>
          {tagline && <span className="text-sm text-muted-foreground">{PRODUCT.tagline}</span>}
        </div>
      </div>
      <Card>{children}</Card>
    </main>
  );
}
