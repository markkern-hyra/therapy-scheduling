// WS11, B: трекер помилок сервера без Sentry — onRequestError (src/instrumentation.ts) шле коротке повідомлення в
// Telegram-групу алертів. У повідомленні — маршрут-шаблон, тип маршруту, назва помилки, digest і рядки стеку «at …»;
// НІКОЛИ — текст помилки, заголовки (cookie), рядок запиту чи шлях з id. Мережі тест не потребує: fetch підмінено.
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";

const USER_TEXT = "Client Ten client10@example.test anxiety";
const request = {
  path: "/clients/0b7e?note=client10@example.test",
  method: "POST",
  headers: { cookie: "sb-access-token=secret-cookie", authorization: "Bearer secret" },
};
const context = {
  routerKind: "App Router",
  routePath: "/clients/[id]",
  routeType: "action",
  renderSource: "server-rendering",
  revalidateReason: undefined,
  renderType: "dynamic",
} as const;

let sent: { url: string; body: { chat_id: string; text: string } }[];

beforeEach(() => {
  vi.resetModules(); // свіжий модуль — свіжа пам'ять «вже надсилали»
  sent = [];
  vi.stubGlobal("fetch", async (url: string, init?: RequestInit) => {
    sent.push({ url: String(url), body: JSON.parse(String(init?.body)) });
    return new Response("{}");
  });
  vi.stubEnv("TELEGRAM_BOT_TOKEN", "123:test-token");
  vi.stubEnv("TELEGRAM_CHAT_ID", "-100123");
  vi.stubEnv("APP_ENV", "staging");
});
afterEach(() => {
  vi.unstubAllGlobals();
  vi.unstubAllEnvs();
});

// Стек, як на Vercel: кадри з коду застосунку (/var/task/src/…). Кадри з tests/ трекер відкидає (не код застосунку).
const withFrame = <E extends Error>(error: E, fn: string, file: string): E => {
  error.stack = `${error.name}: ${error.message}\n    at ${fn} (/var/task/src/${file}:12:7)`;
  return error;
};
const boom = () =>
  Object.assign(withFrame(new Error(`Cannot save ${USER_TEXT}\nsecond line ${USER_TEXT}`), "saveClient", "app/clients/actions.ts"), {
    digest: "1234567",
  });
const otherBoom = () => withFrame(new Error("Cannot load"), "loadClient", "app/clients/page.tsx");

describe("onRequestError", () => {
  it("надсилає маршрут-шаблон, тип, назву помилки, digest і рядки стеку — без тексту помилки, заголовків і query", async () => {
    const { onRequestError } = await import("@/instrumentation");
    await onRequestError(boom(), request, context);
    expect(sent).toHaveLength(1);
    const { text, chat_id } = sent[0].body;
    expect(chat_id).toBe("-100123");
    expect(text).toContain("ПОМИЛКА СЕРВЕРА");
    expect(text).toContain("Середовище: staging");
    expect(text).toContain("POST /clients/[id] (action, App Router)");
    expect(text).toContain("Помилка: Error, digest 1234567");
    expect(text).toMatch(/\nat .+:\d+:\d+\)?/);
    for (const leak of ["Client Ten", "client10", "anxiety", "second line", "secret-cookie", "Bearer", "0b7e", "note="]) {
      expect(text).not.toContain(leak);
    }
  });

  it("рядок тексту помилки, схожий на рядок стеку, не потрапляє в повідомлення — навіть коли стек переписано", async () => {
    const { onRequestError } = await import("@/instrumentation");
    const sneaky = new Error(`Cannot save\nat ${USER_TEXT} (client10@example.test:1:1)`);
    // Стек зняли з довшим текстом, а текст потім обрізали — заголовок стеку вже не збігається з error.message.
    const rewritten = new Error("Slot taken\nat 2026-11-03 14:30:00 Client Ten (x:1:1)");
    expect(rewritten.stack).toContain("Client Ten"); // V8 будує stack ліниво: читаємо до зміни тексту
    rewritten.message = "Slot taken";
    // Бібліотека загорнула помилку й підставила чужий стек: заголовок не збігається, а рядок тексту схожий на кадр.
    const wrapped = new Error(`at ClientTen (client10@example.test:1:1)`);
    wrapped.stack = new Error(`Wrapped:\nnote\nat ClientTen (client10@example.test:1:1)`).stack;
    // Те саме без пробілів: рядок схожий на кадр V8, а змінений текст його вже не містить (CodeRabbit, #57).
    const compact = new Error("Slot taken\nat ClientTen (client10@example.test:1:1)");
    expect(compact.stack).toContain("ClientTen");
    compact.message = "Slot taken";
    await onRequestError(sneaky, request, context);
    await onRequestError(rewritten, request, { ...context, routePath: "/slots" });
    await onRequestError(wrapped, request, { ...context, routePath: "/holds" });
    await onRequestError(compact, request, { ...context, routePath: "/schedule" });
    expect(sent).toHaveLength(4);
    for (const { body } of sent) {
      expect(body.text).toMatch(/\nat .+:\d+:\d+\)?/);
      for (const leak of ["Client Ten", "ClientTen", "client10", "2026-11-03"]) expect(body.text).not.toContain(leak);
    }
  });

  it("назва помилки — лише коротке ідентифікатор-подібне слово", async () => {
    const { onRequestError } = await import("@/instrumentation");
    const custom = boom();
    custom.name = `Error for ${USER_TEXT}`;
    await onRequestError(custom, request, context);
    expect(sent[0].body.text).toContain("Помилка: Error,");
    expect(sent[0].body.text).not.toContain("Client Ten");
  });

  it("та сама помилка на тому самому маршруті — не частіше разу на хвилину; інший маршрут і через хвилину — знову", async () => {
    vi.useFakeTimers({ toFake: ["Date"] });
    try {
      const { onRequestError } = await import("@/instrumentation");
      await onRequestError(boom(), request, context);
      // Digest Next.js рахує з тексту й стеку: інший digest тієї самої помилки — та сама помилка.
      await onRequestError(Object.assign(boom(), { digest: "7654321" }), request, context);
      expect(sent).toHaveLength(1);
      await onRequestError(boom(), request, { ...context, routePath: "/slots" });
      expect(sent).toHaveLength(2);
      // Інша помилка (інший верхній кадр) на тому самому маршруті — окреме повідомлення; перша й далі на паузі.
      await onRequestError(otherBoom(), request, context);
      await onRequestError(boom(), request, context);
      expect(sent).toHaveLength(3);
      vi.advanceTimersByTime(60_001);
      await onRequestError(boom(), request, context);
      expect(sent).toHaveLength(4);
    } finally {
      vi.useRealTimers();
    }
  });

  it("без TELEGRAM_BOT_TOKEN чи TELEGRAM_CHAT_ID нічого не надсилає", async () => {
    vi.stubEnv("TELEGRAM_CHAT_ID", "");
    const { onRequestError } = await import("@/instrumentation");
    await onRequestError(boom(), request, context);
    vi.stubEnv("TELEGRAM_CHAT_ID", "-100123");
    vi.stubEnv("TELEGRAM_BOT_TOKEN", "");
    await onRequestError(boom(), request, { ...context, routePath: "/slots" });
    expect(sent).toHaveLength(0);
  });

  it("Telegram недоступний — нічого не пише в журнал (адреса запиту містить токен)", async () => {
    vi.stubGlobal("fetch", async (url: string) => {
      throw new TypeError(`fetch failed ${url}`);
    });
    const spies = (["log", "info", "warn", "error"] as const).map((m) => vi.spyOn(console, m).mockImplementation(() => {}));
    const { onRequestError } = await import("@/instrumentation");
    await expect(onRequestError(boom(), request, context)).resolves.toBeUndefined();
    for (const spy of spies) expect(spy).not.toHaveBeenCalled();
  });

  it("абсолютні шляхи в стеку скорочено до .next/…, src/… чи node_modules/…", async () => {
    const { onRequestError } = await import("@/instrumentation");
    const error = boom();
    error.stack = [
      `Error: ${error.message}`,
      "    at save (/Users/someone/app/.next/server/chunks/a.js:1:2)",
      "    at load (file:///Users/someone/app/node_modules/x/index.js:3:4)",
      "    at C:\\Users\\someone\\app\\src\\lib\\b.ts:5:6",
      // Шлях поза .next, src і node_modules (локальний інструмент) — кадр відкидаємо цілим (CodeRabbit, #57).
      "    at helper (/Users/someone/tools/helper.js:7:8)",
      "    at node:internal/process/task_queues:105:5",
    ].join("\n");
    await onRequestError(error, request, context);
    const { text } = sent[0].body;
    expect(text).toContain("at save (.next/server/chunks/a.js:1:2)");
    expect(text).toContain("at load (node_modules/x/index.js:3:4)");
    expect(text).toContain("at src/lib/b.ts:5:6");
    expect(text).toContain("at node:internal/process/task_queues:105:5");
    expect(text).not.toContain("helper");
    expect(text).not.toContain("someone");
  });
});
