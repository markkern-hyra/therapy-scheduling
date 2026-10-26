import type { ReactNode } from "react";
import { Card } from "@/components/ui/card";

// Сторінки поза застосунком (вхід, «доступу ще немає»): назва продукту й картка по центру, без навігації.
export function AuthShell({ children }: { children: ReactNode }) {
  return (
    <main className="mx-auto flex w-full max-w-sm flex-1 flex-col justify-center gap-4 px-6 py-6">
      <p className="text-sm font-semibold text-muted-foreground">Therapy Scheduling</p>
      <Card>{children}</Card>
    </main>
  );
}
