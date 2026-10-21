import { describe, expect, it } from "vitest";
import { runAction } from "@/lib/actions";
import { clientFromForm } from "@/lib/scheduling/clients";
import { messageFor } from "@/lib/scheduling/messages";

// Правила (непорожнє ім'я, формат email, унікальність) перевіряє база — тут помилки Postgres такі, як їх повертає
// PostgREST, а перевіряємо, що бачить планувальник: адресу після server action і текст PM.
const uniqueViolation = {
  code: "23505",
  message: 'duplicate key value violates unique constraint "clients_email_key"',
};
const checkViolation = (constraint: string) => ({
  code: "23514",
  message: `new row for relation "clients" violates check constraint "${constraint}"`,
});

function form(fullName: string, email: string) {
  const data = new FormData();
  data.set("full_name", fullName);
  data.set("email", email);
  return data;
}

// runAction завершується redirect — винятком Next із digest «NEXT_REDIRECT;<тип>;<адреса>;307;».
async function landing(error: { code: string; message: string }) {
  try {
    await runAction(Promise.resolve({ error }), "/clients");
  } catch (e) {
    const url = String((e as { digest?: string }).digest).split(";")[2];
    return { url, message: messageFor(new URL(url, "http://localhost").searchParams.get("error")) };
  }
  throw new Error("runAction did not redirect");
}

describe("створення картки клієнта", () => {
  it("AC-HOLD-10: ім'я та email з форми стають новим рядком клієнта", () => {
    expect(clientFromForm(form("Client Three", "client3@example.test"))).toEqual({
      full_name: "Client Three",
      email: "client3@example.test",
    });
  });

  it("AC-HOLD-11: порожнє ім'я — назад на /clients із «Enter the client's name and a valid email.»", async () => {
    expect(clientFromForm(form("   ", "client3@example.test")).full_name).toBe("");
    expect(await landing(checkViolation("clients_full_name_check"))).toEqual({
      url: "/clients?error=CLIENT_INVALID",
      message: "Enter the client's name and a valid email.",
    });
  });

  it("AC-HOLD-15: email без @ — назад на /clients із «Enter the client's name and a valid email.»", async () => {
    expect(clientFromForm(form("Client Three", "client3example.test")).email).toBe("client3example.test");
    expect(await landing(checkViolation("clients_email_check"))).toEqual({
      url: "/clients?error=CLIENT_INVALID",
      message: "Enter the client's name and a valid email.",
    });
  });

  it("AC-HOLD-16: той самий email — «A client with this email already exists.»", async () => {
    expect(await landing(uniqueViolation)).toEqual({
      url: "/clients?error=CLIENT_EXISTS",
      message: "A client with this email already exists.",
    });
  });

  it("AC-HOLD-34: « Client1@Example.TEST » — той самий email, що client1@example.test, отже дублікат", async () => {
    expect(clientFromForm(form("Client One", " Client1@Example.TEST ")).email).toBe("client1@example.test");
    expect((await landing(uniqueViolation)).message).toBe("A client with this email already exists.");
  });

  it("AC-HOLD-35: email зберігається малими літерами без пробілів на початку й у кінці", () => {
    expect(clientFromForm(form(" Client Three ", " Client3@Example.TEST "))).toEqual({
      full_name: "Client Three",
      email: "client3@example.test",
    });
  });

  it("невідома помилка бази — загальне повідомлення, а не текст Postgres", async () => {
    expect(await landing({ code: "42P01", message: 'relation "public.clients" does not exist' })).toEqual({
      url: "/clients?error=UNKNOWN",
      message: "Something went wrong. Try again.",
    });
  });

  it("невідомий код у ?error= не показує нічого", () => {
    expect(messageFor("<b>hi</b>")).toBeUndefined();
    expect(messageFor(null)).toBeUndefined();
  });
});
