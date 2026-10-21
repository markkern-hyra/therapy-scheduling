import { ErrorMessage } from "@/app/_components/error-message";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { login } from "./actions";

export default async function LoginPage({ searchParams }: PageProps<"/login">) {
  const { error } = await searchParams;

  return (
    <main className="mx-auto flex w-full max-w-sm flex-1 flex-col justify-center gap-6 px-6 py-16">
      <h1 className="text-2xl font-semibold">Sign in</h1>
      <form action={login} className="flex flex-col gap-4">
        <Label>
          Email
          <Input name="email" type="email" autoComplete="email" required />
        </Label>
        <Label>
          Password
          <Input name="password" type="password" autoComplete="current-password" required />
        </Label>
        <ErrorMessage code={error} />
        <Button type="submit">Sign in</Button>
      </form>
    </main>
  );
}
