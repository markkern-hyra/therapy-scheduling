import { isStaff, type Role } from "@/lib/auth/roles";
import { MESSAGES, type MessageCode } from "./messages";

// Рядок clients із форми картки «New client». Лише нормалізація; форму перевіряє validateCard, а прямий запит — check і
// unique у міграціях (ADR 0003, 0009). Порожнє поле лишається порожнім рядком чи null, щоб відмовив саме check.
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

export type CardField = (typeof CARD_FIELDS)[number];
export type CardErrors = Partial<Record<CardField, MessageCode>>;

// Те саме правило формату, що й check clients_email_check (ADR 0003): рядок після нормалізації.
const VALID_EMAIL = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

// Усі помилки форми одразу, кожна біля свого поля (AC-CARD-12; ADR 0009): check бази зупиняється на першому порушенні.
// Спільне повідомлення пари полів — один раз, під першим полем із помилкою (припущення розробника clarify-client-cards).
export function validateCard(values: Record<string, string>, today: string): CardErrors {
  const text = (name: CardField) => (values[name] ?? "").trim();
  const pair = (nameField: CardField, emailField: CardField, code: MessageCode): CardErrors => {
    if (!text(nameField)) return { [nameField]: code };
    return VALID_EMAIL.test(text(emailField)) ? {} : { [emailField]: code };
  };
  const errors: CardErrors = {};
  const kind = values.kind;
  if (kind !== "adult" && kind !== "child") errors.kind = "CLIENT_TYPE_MISSING";
  if (kind === "adult") Object.assign(errors, pair("full_name", "email", "CLIENT_INVALID"));
  else if (!text("full_name")) errors.full_name = "NAME_MISSING";
  const birthDate = text("birth_date");
  // Рядкове порівняння дат коректне лише для РРРР-ММ-ДД; неможливу дату відсікає Date.parse.
  if (!/^\d{4}-\d{2}-\d{2}$/.test(birthDate) || Number.isNaN(Date.parse(birthDate)) || birthDate > today) {
    errors.birth_date = "BIRTH_DATE_INVALID";
  }
  if (text("language") !== "English" && text("language") !== "Spanish") errors.language = "LANGUAGE_MISSING";
  if (kind === "child") Object.assign(errors, pair("guardian_name", "guardian_email", "GUARDIAN_INVALID"));
  return errors;
}

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

// Порожній список: терапевт — без своїх клієнтів (AC-CARD-09); планувальник і адміністратор — карток ще немає
// (AC-CARD-15).
export function emptyClientsText(role: Role): string {
  return role === "therapist" ? MESSAGES.NO_OWN_CLIENTS : MESSAGES.NO_CLIENTS;
}

// Картки немає в результаті запиту. Планувальник і адміністратор бачать усі картки, тож це справді неіснуюча картка;
// терапевт бачить той самий текст, що й для чужої, щоб перебором посилань не дізнатися, які картки існують (AC-CARD-16).
export function missingCardText(role: Role): string {
  return role === "therapist" ? MESSAGES.CLIENT_NO_ACCESS : MESSAGES.CARD_NOT_FOUND;
}

// Пошук клієнта під час утримання: ім'я або контактний email, для дитини — email опікуна (AC-CARD-02). Порожній запит —
// усі клієнти.
export function matchesClient(
  client: { full_name: string } & Pick<CardData, "kind" | "email" | "guardian_email">,
  query: string,
): boolean {
  const q = query.trim().toLowerCase();
  return [client.full_name, contactEmail(client) ?? ""].some((field) => field.toLowerCase().includes(q));
}
