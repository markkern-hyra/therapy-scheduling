// Рядок clients із форми «New client». Лише нормалізація: правила (непорожнє ім'я, формат і унікальність email)
// перевіряє база — check і unique у міграції roles_and_clients, ADR 0003.
export function clientFromForm(form: FormData) {
  return {
    full_name: String(form.get("full_name") ?? "").trim(),
    email: String(form.get("email") ?? "").trim().toLowerCase(),
  };
}
