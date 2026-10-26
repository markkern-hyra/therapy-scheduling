import type { ComponentProps } from "react";

// Список рядків на поверхні (розклад дня, клієнти): картка з роздільниками; aria-labelledby — на заголовок, що його
// називає. Рядок переносить частини на вузькому екрані, тож горизонтальної прокрутки немає.
export function List(props: Omit<ComponentProps<"ul">, "className">) {
  return (
    <ul
      {...props}
      role="list"
      className="divide-y divide-border overflow-hidden rounded-md border border-border bg-card text-card-foreground shadow-card"
    />
  );
}

export function ListItem(props: Omit<ComponentProps<"li">, "className">) {
  return <li {...props} className="flex flex-wrap items-center gap-x-4 gap-y-2 px-4 py-3" />;
}
