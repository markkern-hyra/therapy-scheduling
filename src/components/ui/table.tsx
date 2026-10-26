import type { ComponentProps } from "react";

// Таблиця даних: поверхня card з тінню, заголовки колонок на muted, роздільники й підсвічення рядка.
// <Table aria-labelledby="…"><TableHeader><tr><TableHead>…</TableHead></tr></TableHeader>
// <TableBody><tr><TableCell>…</TableCell></tr></TableBody></Table>
export function Table(props: Omit<ComponentProps<"table">, "className">) {
  return (
    <div className="overflow-x-auto rounded-md border border-border bg-card text-card-foreground shadow-card">
      <table {...props} className="w-full text-left text-sm" />
    </div>
  );
}

export function TableHeader(props: Omit<ComponentProps<"thead">, "className">) {
  return <thead {...props} className="border-b border-border bg-muted text-xs text-muted-foreground" />;
}

export function TableBody(props: Omit<ComponentProps<"tbody">, "className">) {
  return <tbody {...props} className="divide-y divide-border [&>tr:hover]:bg-muted" />;
}

export function TableHead(props: Omit<ComponentProps<"th">, "className">) {
  return <th {...props} className="px-3 py-2 font-semibold" />;
}

export function TableCell(props: Omit<ComponentProps<"td">, "className">) {
  return <td {...props} className="px-3 py-2" />;
}
