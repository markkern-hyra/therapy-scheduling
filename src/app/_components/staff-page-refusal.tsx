import { AppNav } from "@/app/_components/app-nav";
import { Alert } from "@/components/ui/alert";
import { PageHeader } from "@/components/ui/page-header";
import type { Role } from "@/lib/auth/roles";

// Сторінка планувальника для іншої ролі: лише заголовок і відмова, без запитів до даних (AC-HOLD-44).
export function StaffPageRefusal({ title, role, name, message }: { title: string; role: Role; name: string | null; message: string }) {
  return (
    <>
      <AppNav role={role} name={name} />
      <main className="mx-auto flex w-full max-w-5xl flex-1 flex-col gap-6 px-6 py-8">
        <PageHeader title={title} />
        <Alert>{message}</Alert>
      </main>
    </>
  );
}
