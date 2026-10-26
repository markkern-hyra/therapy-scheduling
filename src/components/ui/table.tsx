import type { ComponentProps } from "react";

// Таблиця даних: рамка border на card, заголовки колонок на muted, роздільники між рядками.
// <Table aria-labelledby="…"><TableHeader><tr><TableHead>…</TableHead></tr></TableHeader>
// <TableBody><tr><TableCell>…</TableCell></tr></TableBody></Table>
export function Table(props: Omit<ComponentProps<"table">, "className">) {
  return (
    <div className="overflow-x-auto rounded-md border border-border bg-card text-card-foreground">
      <table {...props} className="w-full text-left text-sm" />
    </div>
  );
}

export function TableHeader(props: Omit<ComponentProps<"thead">, "className">) {
  return <thead {...props} className="border-b border-border bg-muted text-xs text-muted-foreground" />;
}

export function TableBody(props: Omit<ComponentProps<"tbody">, "className">) {
  return <tbody {...props} className="divide-y divide-border" />;
}

// hideOnMobile — другорядна колонка: на вузькому екрані її немає (і заголовка, і клітинок), щоб таблиця вмістилась.
type Cell = { hideOnMobile?: boolean };
const cell = ({ hideOnMobile }: Cell) => `px-3 py-2 ${hideOnMobile ? "hidden sm:table-cell" : ""}`;

export function TableHead({ hideOnMobile, ...props }: Omit<ComponentProps<"th">, "className"> & Cell) {
  return <th {...props} className={`${cell({ hideOnMobile })} font-medium`} />;
}

export function TableCell({ hideOnMobile, ...props }: Omit<ComponentProps<"td">, "className"> & Cell) {
  return <td {...props} className={cell({ hideOnMobile })} />;
}
