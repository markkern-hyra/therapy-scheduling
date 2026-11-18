import Anthropic from "@anthropic-ai/sdk";
import { INTAKE_MODEL } from "@/lib/ai/intake-draft";

// Справжній клієнт SDK, якому «відповідає» функція замість мережі: класи помилок (429, таймаут, 5xx) ті самі, що на
// проді, а тест бачить кожен надісланий запит. Ключ — підставний рядок, справжнього тести не читають.
export type Sent = { url: string; headers: Headers; body: Record<string, unknown> };

export function fakeClaude(respond: (sent: Sent, signal?: AbortSignal | null) => Promise<Response>) {
  const sent: Sent[] = [];
  const fetch = async (url: string | URL | Request, init?: RequestInit) => {
    const request = { url: String(url), headers: new Headers(init?.headers), body: JSON.parse(String(init?.body)) };
    sent.push(request);
    return respond(request, init?.signal);
  };
  // fetch — щоб підставити його й тоді, коли клієнт створює код застосунку (vi.stubGlobal).
  return { client: new Anthropic({ apiKey: "test-key", fetch: fetch as typeof globalThis.fetch }), sent, fetch };
}

// Відповідь Messages API з одним текстовим блоком.
export const claudeMessage = (text: string, stop_reason = "end_turn") =>
  new Response(
    JSON.stringify({
      id: "msg_test",
      type: "message",
      role: "assistant",
      model: INTAKE_MODEL,
      content: [{ type: "text", text }],
      stop_reason,
      stop_sequence: null,
      usage: { input_tokens: 10, output_tokens: 5 },
    }),
    { status: 200, headers: { "content-type": "application/json" } },
  );

export const claudeError = (status: number, type: string) =>
  new Response(JSON.stringify({ type: "error", error: { type, message: type } }), {
    status,
    headers: { "content-type": "application/json" },
  });

// Факти дорослого клієнта з AC-INTAKE-01 у схемі відповіді моделі.
export const CLIENT_TEN = {
  status: "draft",
  client_name: "Client Ten",
  birth_date: "1990-05-14",
  session_language: "English",
  client_email: "client10@example.test",
  written_by_parent: false,
  guardian_name: null,
  guardian_email: null,
};
