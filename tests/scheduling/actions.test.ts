import { describe, expect, it, vi } from "vitest";
import { runAction } from "@/lib/actions";

// revalidatePath потребує контексту запиту Next; тут перевіряємо лише адресу повернення.
vi.mock("next/cache", () => ({ revalidatePath: vi.fn() }));

const raised = (code: string) => ({ code: "P0001", message: code });

describe("runAction: повернення на сторінку з параметрами", () => {
  async function landing(back: string, error: { code: string; message: string } | null) {
    try {
      await runAction(Promise.resolve({ error }), back);
    } catch (e) {
      return String((e as { digest?: string }).digest).split(";")[2];
    }
    throw new Error("runAction did not redirect");
  }

  it("помилка додається до наявних параметрів адреси", async () => {
    expect(await landing("/slots?therapist=t1&day=2026-11-03", raised("SLOT_TAKEN"))).toBe(
      "/slots?therapist=t1&day=2026-11-03&error=SLOT_TAKEN",
    );
  });

  it("«//інший-сайт» в адресі повернення — лише на свою головну", async () => {
    expect(await landing("/.//evil.example/x", null)).toBe("/");
  });

  it("після успіху — та сама адреса без помилки", async () => {
    expect(await landing("/slots?therapist=t1&day=2026-11-03&error=SLOT_TAKEN", null)).toBe(
      "/slots?therapist=t1&day=2026-11-03",
    );
  });
});
