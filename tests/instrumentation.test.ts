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

const boom = () => Object.assign(new Error(`Cannot save ${USER_TEXT}\nsecond line ${USER_TEXT}`), { digest: "1234567" });

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

  it("та сама помилка на тому самому маршруті — не частіше разу на хвилину", async () => {
    const { onRequestError } = await import("@/instrumentation");
    await onRequestError(boom(), request, context);
    await onRequestError(boom(), request, context);
    expect(sent).toHaveLength(1);
  });

  it("без TELEGRAM_BOT_TOKEN чи TELEGRAM_CHAT_ID нічого не надсилає", async () => {
    vi.stubEnv("TELEGRAM_CHAT_ID", "");
    const { onRequestError } = await import("@/instrumentation");
    await onRequestError(boom(), request, context);
    expect(sent).toHaveLength(0);
  });
});
