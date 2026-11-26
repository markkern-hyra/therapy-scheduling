// Трекер помилок сервера без Sentry: Next.js викликає onRequestError на кожну необроблену помилку сервера
// (сторінка, маршрут API, Server Action, proxy), а ми надсилаємо КОРОТКЕ повідомлення в той самий Telegram-чат,
// що й алерт smoke: маршрут, метод, назва помилки, digest, до 5 верхніх рядків стеку, деплой, середовище.
// WS11, B: трекер помилок сервера без Sentry (власний onRequestError). Взято з набору ops-kit WS11
// (src/instrumentation.ts.example); за рецензією посилено фільтр кадрів стеку, назву помилки й ключ паузи.
// Тест: tests/instrumentation.test.ts.
// Секрети (лише назви): TELEGRAM_BOT_TOKEN, TELEGRAM_CHAT_ID — тут це змінні середовища VERCEL (Settings →
// Environment Variables, Production і Preview), без префікса NEXT_PUBLIC_; GitHub Secrets сюди не потрапляють.
// Нема змінних — функція мовчки нічого не робить.
// Джерело: Next.js docs «instrumentation.js» (onRequestError, з'явився у v15.0.0; типи з next 16.4.3) і Vercel docs
// «System environment variables» (VERCEL_DEPLOYMENT_ID, VERCEL_ENV, VERCEL_GIT_COMMIT_REF), станом на 09.11.2026.
//
// Що НЕ надсилаємо ніколи: заголовки запиту (там cookie сесії), тіло запиту, рядок запиту (?query) і error.message
// (може містити дані користувача). Зі стеку беремо лише рядки «at …» (функція, файл, рядок коду): перший рядок
// error.stack — це «Назва: текст помилки», його відкидаємо. Повний стек — у Runtime Logs Vercel (за digest чи часом
// і маршрутом); на Hobby вони живуть 1 годину, тож дивіться одразу після повідомлення.
// Як перевірити: GET /api/ops/error-test під адміністратором на staging (src/app/api/ops/error-test/route.ts) →
// повідомлення в чаті з маршрутом і рядками стеку; маршрут приберемо після перевірки.
import type { Instrumentation } from "next";

const TIMEOUT_MS = 2_500; // не тримаємо відповідь користувачу довше: Telegram недоступний — повідомлення пропадає
const SAME_ERROR_PAUSE_MS = 60_000; // та сама помилка на тому самому маршруті — не частіше разу на хвилину
const STACK_FRAMES = 5; // скільки верхніх рядків «at …» стеку надсилати
const lastSent = new Map<string, number>();
// Кадр стеку V8: «at [async |new ]функція (шлях:рядок:колонка)» або «at шлях:рядок:колонка» — без пробілів у назві й
// шляху, тож рядок тексту помилки на кшталт «at 2026-11-03 14:30 Client Ten (x:1:1)» кадром не вважається.
const FRAME = /^at (?:(?:async |new )?[^\s()]+ \()?[^\s()]+:\d+:\d+\)?$/;
const ERROR_NAME = /^[A-Za-z][A-Za-z0-9_]{0,59}$/;

/**
 * Лише рядки «at …» зі стеку. Заголовок «Назва: текст помилки» відрізаємо цілим (текст може бути багаторядковим і
 * містити дані користувача), беремо лише рядки виду «at … файл:рядок:колонка», а абсолютний шлях скорочуємо до
 * .next/…, src/… чи node_modules/… — щоб у чат не потрапило ім'я користувача ОС з локального шляху.
 */
function stackFrames(error: unknown): string[] {
  if (!(error instanceof Error) || typeof error.stack !== "string") return [];
  const header = error.message ? `${error.name}: ${error.message}` : error.name;
  const body = error.stack.startsWith(header)
    ? error.stack.slice(header.length)
    : error.stack.split("\n").slice(header.split("\n").length).join("\n"); // заголовок інший — пропускаємо стільки ж рядків
  return body
    .split("\n")
    .map((line) => line.trim())
    // Ще й не частина тексту помилки: заголовок стеку міг не збігтися з error.message (стек переписали, текст змінили).
    .filter((line) => FRAME.test(line) && !error.message.includes(line.slice(3)))
    .map((line) =>
      line
        .replace(/(?:file:\/\/)?(?:[A-Za-z]:)?[\\/][^\s()]*?[\\/](\.next|src|node_modules)[\\/]/g, "$1/")
        .replaceAll("\\", "/"),
    )
    .slice(0, STACK_FRAMES)
    .map((line) => line.slice(0, 160));
}

// Назва власного класу помилки може нести дані — лише коротке слово, інакше «Error».
function errorName(error: unknown): string {
  if (!(error instanceof Error)) return typeof error;
  return ERROR_NAME.test(error.name) ? error.name : "Error";
}

function errorDigest(error: unknown): string {
  const digest = (error as { digest?: unknown } | null)?.digest;
  return typeof digest === "string" ? digest.slice(0, 40) : "";
}

// Digest Next.js рахує з тексту й стеку, тож у тієї самої помилки зі змінними даними він щоразу інший: ключ — маршрут,
// назва й верхній кадр. Старі ключі прибираємо, щоб пам'ять не росла.
function firstInPause(key: string): boolean {
  const now = Date.now();
  if (now - (lastSent.get(key) ?? 0) < SAME_ERROR_PAUSE_MS) return false;
  for (const [k, at] of lastSent) if (now - at >= SAME_ERROR_PAUSE_MS) lastSent.delete(k);
  lastSent.set(key, now);
  return true;
}

function deployLines(): string[] {
  const env = process.env.APP_ENV ?? process.env.VERCEL_ENV ?? "local"; // APP_ENV=staging — змінна лише для гілки staging
  const branch = process.env.VERCEL_GIT_COMMIT_REF;
  return [
    `Середовище: ${env}${branch ? ` (гілка ${branch})` : ""}`,
    `Деплой: ${process.env.VERCEL_DEPLOYMENT_ID ?? "?"}, коміт ${(process.env.VERCEL_GIT_COMMIT_SHA ?? "local").slice(0, 7)}`,
  ];
}

export const onRequestError: Instrumentation.onRequestError = async (error, request, context) => {
  const token = process.env.TELEGRAM_BOT_TOKEN;
  const chatId = process.env.TELEGRAM_CHAT_ID;
  if (!token || !chatId) return;

  const name = errorName(error);
  const digest = errorDigest(error);
  // routePath — шаблон маршруту (/clients/[id]), без id і без ?query. request.path не беремо.
  const route = context.routePath;
  const frames = stackFrames(error);
  if (!firstInPause(`${route}|${name}|${frames[0] ?? ""}`)) return;

  const [envLine, deployLine] = deployLines();
  const text = [
    "ПОМИЛКА СЕРВЕРА",
    envLine,
    `Маршрут: ${request.method} ${route} (${context.routeType}, ${context.routerKind})`,
    `Помилка: ${name}${digest ? `, digest ${digest}` : ""}`,
    deployLine,
    ...(frames.length ? ["Стек (верхні рядки):", ...frames] : []),
  ].join("\n");

  try {
    await fetch(`https://api.telegram.org/bot${token}/sendMessage`, {
      method: "POST",
      headers: { "content-type": "application/json" },
      body: JSON.stringify({ chat_id: chatId, text }),
      signal: AbortSignal.timeout(TIMEOUT_MS),
    });
  } catch {
    // Навмисно нічого не пишемо: помилка fetch містить адресу запиту, а в ній — токен бота.
  }
};
