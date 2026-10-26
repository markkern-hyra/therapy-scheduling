import { isStaff } from "@/lib/auth/roles";

// Рядок clients із форми картки «New client». Лише нормалізація: правила (обов'язкові поля, формат і унікальність
// email, дані опікуна, дата народження й мова) перевіряє база — check і unique у міграціях roles_and_clients і
// client_cards, ADR 0003. Порожнє поле лишається порожнім рядком чи null, щоб відмовив саме check.
export function cardFromForm(form: FormData) {
  const text = (name: string) => String(form.get(name) ?? "").trim();
  const email = (name: string) => text(name).toLowerCase();
  const kind = form.get("kind") === "child" ? "child" : "adult";
  return {
    kind,
    full_name: text("full_name"),
    // Для дитини власний email не вносять: контакт — email опікуна (Припущення PM).
    email: kind === "adult" ? email("email") : null,
    birth_date: text("birth_date") || null,
    language: text("language") || null,
    guardian_name: kind === "child" ? text("guardian_name") : null,
    guardian_email: kind === "child" ? email("guardian_email") : null,
  } as const;
}

const CARD_FIELDS = ["kind", "full_name", "email", "birth_date", "language", "guardian_name", "guardian_email"] as const;

// Введене у форму картки як є — дія повертає його після відмови, щоб воно лишилось у формі (AC-CARD-03). Лише поля
// картки: службові поля React форми сюди не потрапляють.
export const cardValues = (form: FormData) =>
  Object.fromEntries(CARD_FIELDS.map((name) => [name, String(form.get(name) ?? "")]));

// Хто створює картки клієнтів — admin і scheduler (матриця прав PM; AC-CARD-06). Дія перевіряє це до запису, RLS —
// ще раз у базі.
export const canCreateCards = isStaff;

type CardData = {
  kind: string;
  email: string | null;
  birth_date: string | null;
  language: string | null;
  guardian_name: string | null;
  guardian_email: string | null;
};

const NOT_PROVIDED = "Not provided";

// Контакт клієнта: дорослий — власний email, дитина — email опікуна (AC-CARD-02; картка й вибір під час утримання).
export const contactEmail = (c: Pick<CardData, "kind" | "email" | "guardian_email">) =>
  c.kind === "child" ? c.guardian_email : c.email;

// Поля картки для показу (список і картка). Картки зрізу 1 — «Adult», відсутні поля — «Not provided» (Припущення PM);
// контакт дитини — опікун (AC-CARD-02).
export function cardFields(card: CardData) {
  return {
    type: card.kind === "child" ? "Child" : "Adult",
    birthDate: card.birth_date ?? NOT_PROVIDED,
    language: card.language ?? NOT_PROVIDED,
    contact: card.kind === "child" ? `${card.guardian_name} — ${contactEmail(card)}` : (contactEmail(card) ?? NOT_PROVIDED),
  };
}
