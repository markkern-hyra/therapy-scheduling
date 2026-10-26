import type { ReactNode } from "react";
import { BrandMark } from "@/components/ui/brand-mark";
import { Card } from "@/components/ui/card";

// Сторінки поза застосунком (вхід, «доступу ще немає»): знак, назва й призначення продукту над карткою, без навігації.
export function AuthShell({ children }: { children: ReactNode }) {
  return (
    <main className="mx-auto flex w-full max-w-sm flex-1 flex-col justify-center gap-6 px-6 py-6">
      <div className="flex items-center gap-3">
        <BrandMark />
        <div className="flex flex-col">
          <span className="text-base font-semibold">Therapy Scheduling</span>
          <span className="text-sm text-muted-foreground">Hold therapist slots for clients and confirm sessions.</span>
        </div>
      </div>
      <Card>{children}</Card>
    </main>
  );
}
