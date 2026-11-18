// Стан поля звернення на сторінці нової картки — окремо від intake-draft.ts, щоб клієнтський компонент не тягнув SDK
// моделі в JavaScript браузера.

// Текст звернення — до 2000 символів (Припущення PM: поле більшого не приймає).
export const MAX_INTAKE_LENGTH = 2000;

// seq — версія чернетки: зростає лише з новою чернеткою (ok, needs_info), і форма картки перемальовується з її полями;
// відмова чи збій версії не змінюють — введене лишається у формі (AC-INTAKE-06, 08). text — щоб текст звернення
// лишився в полі після запиту; ніде не зберігається.
export type IntakeFormState = {
  seq: number;
  text: string;
  message: string | null;
  tone: "success" | "error";
  values: Record<string, string> | null;
};

export const INITIAL_INTAKE: IntakeFormState = { seq: 0, text: "", message: null, tone: "error", values: null };
