import "server-only"; // помилка збірки, якщо цей файл колись імпортує Client Component
import Anthropic from "@anthropic-ai/sdk";

// Ключ ANTHROPIC_API_KEY — один ключ Claude API на команду (ADR 0010): локально — у .env.local, у проді — Vercel →
// Environment Variables (Production). НІКОЛИ з префіксом NEXT_PUBLIC_: такі значення потрапляють у браузер.
// Цей файл — єдине місце в src/, що читає ключ і створює клієнт (tests/ai-key.test.ts). Ключ передаємо явно: без
// apiKey SDK сам шукав би облікові дані в середовищі й на диску.
// Немає ключа (або лише пробіли) → null: помічник «недоступний» (AC-INTAKE-08), а ручна форма працює далі.
export function assistantClient(): Anthropic | null {
  const apiKey = process.env.ANTHROPIC_API_KEY?.trim();
  return apiKey ? new Anthropic({ apiKey }) : null;
}
