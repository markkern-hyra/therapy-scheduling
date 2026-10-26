import { AppNav } from "@/app/_components/app-nav";
import { ErrorMessage } from "@/app/_components/error-message";
import { requireRole } from "@/lib/auth/require-role";

// Хто увійшов і з якою роллю (з profiles); посилання на сторінки ролі — в AppNav.
// Сторінка читає cookies, тому рендериться динамічно (шаблон зібрано з --no-cache-components).
// Тут же — текст відмови дії, яку роль не може виконати й сторінки якої не відкриває (AC-HOLD-08).
export default async function Home({ searchParams }: PageProps<"/">) {
  const { role, email } = await requireRole();
  const { error } = await searchParams;

  return (
    <>
      <AppNav role={role} />
      <main className="mx-auto flex w-full max-w-3xl flex-1 flex-col gap-6 px-6 py-6">
        <h1 className="text-2xl font-semibold">Home</h1>
        <ErrorMessage code={error} />
        <dl className="grid grid-cols-[max-content_1fr] gap-x-4 gap-y-2 text-sm">
          <dt className="text-muted-foreground">Email</dt>
          <dd data-testid="user-email">{email ?? "—"}</dd>
          <dt className="text-muted-foreground">Role</dt>
          <dd data-testid="user-role">{role ?? "No profile found"}</dd>
        </dl>
      </main>
    </>
  );
}
