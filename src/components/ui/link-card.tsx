import Link from "next/link";

// Розділ застосунку як плитка-посилання: назва акцентом, під нею — для чого розділ. Наведення — межа поля (input).
export function LinkCard({ href, title, description }: { href: string; title: string; description: string }) {
  return (
    <Link
      href={href}
      className="flex flex-col gap-1 rounded-md border border-border bg-card p-4 text-card-foreground hover:border-input"
    >
      <span className="text-base font-semibold text-primary">{title}</span>
      <span className="text-sm text-muted-foreground">{description}</span>
    </Link>
  );
}
