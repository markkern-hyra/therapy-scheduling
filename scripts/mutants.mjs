// Мутанти для scripts/mutation-check.mjs (npm run mutation:sql). Мутант = одне правило з AC, навмисно зламане.
// Джерело формату — демо-репо курсу, scripts/mutants.mjs (тег ws8-02-tests); там 11 SQL- і 2 TS-мутанти.
// Поля:
//   id, kind ("sql" | "ts"), ac (який AC це правило доводить), what (що зламано — людською мовою);
//   file — що мутуємо; tests — файли тестів, які мають довести правило (саме їх і запускаємо);
//   find — рядок або RegExp, що трапляється у файлі РІВНО один раз (надійніше за номери рядків, які зсуваються);
//   replace — заміна (вставляється буквально: «$$» у plpgsql лишається «$$»);
//   expect: "survive" + reason — лише для еквівалентного мутанта (поведінка не змінюється) з посиланням на те,
//   що робить його еквівалентним (рядок міграції, інший тест). Без reason скрипт мутант не приймає.
// Новий AC з відмовою, правило якого живе в SQL (політика, grant, функція, тригер), — новий мутант тут.
//
// Мутанти на SQL-правила за AC WS8 (docs/qa/proof-pack.md). У AC-CARD-16 SQL-мутанта немає: рядка неіснуючої картки база
// не поверне за будь-якої політики. C6 і C7 — сусідній AC-CARD-05: чужа картка, для терапевта той самий текст.
const ROLES_CLIENTS = "supabase/migrations/20261021155328_roles_and_clients.sql";
const CLIENT_CARDS = "supabase/migrations/20261026104702_client_cards.sql";
const OWN_CLIENTS = "supabase/migrations/20261026110054_own_clients.sql";
const OWN_CLIENT_RULE = "supabase/migrations/20261102151752_own_client_rule.sql";
const INSURANCE = "supabase/migrations/20261109194052_insurance_status.sql";
const CARDS_DB = "tests/db/client-cards.test.ts";
const INSURANCE_DB = "tests/db/insurance.test.ts";
const OWN_DB = "tests/db/own-clients.test.ts";

export const mutants = [
  {
    id: "C1", kind: "sql", ac: "AC-CARD-06", file: ROLES_CLIENTS, tests: [CARDS_DB],
    what: "clients_insert_staff: картку створює будь-хто з входом",
    find: "with check ((select private.has_role('admin', 'scheduler')));",
    replace: "with check (true);",
  },
  {
    id: "C2", kind: "sql", ac: "AC-CARD-06", file: ROLES_CLIENTS, tests: [CARDS_DB],
    what: "clients_insert_staff: до дозволених ролей додано therapist",
    find: "with check ((select private.has_role('admin', 'scheduler')));",
    replace: "with check ((select private.has_role('admin', 'scheduler', 'therapist')));",
  },
  {
    id: "C3", kind: "sql", ac: "AC-CARD-12", file: CLIENT_CARDS, tests: [CARDS_DB],
    what: "clients_intake_check: дата народження в майбутньому дозволена",
    find: "  and birth_date <= (now() at time zone 'America/Los_Angeles')::date\n",
    replace: "",
  },
  {
    id: "C8", kind: "sql", ac: "AC-CARD-12", file: CLIENT_CARDS, tests: [CARDS_DB],
    what: "clients_intake_check: межа зсунута, завтрашня дата народження дозволена",
    find: "  and birth_date <= (now() at time zone 'America/Los_Angeles')::date\n",
    replace: "  and birth_date <= (now() at time zone 'America/Los_Angeles')::date + 1\n",
  },
  {
    id: "C4", kind: "sql", ac: "AC-CARD-12", file: CLIENT_CARDS, tests: [CARDS_DB],
    what: "clients_intake_check: мова сеансів може бути будь-якою",
    find: "  and language in ('English', 'Spanish')\n",
    replace: "",
  },
  {
    id: "C5", kind: "sql", ac: "AC-CARD-12", file: ROLES_CLIENTS, tests: [CARDS_DB, "tests/db/clients.test.ts"],
    what: "clients_full_name_check: порожнє ім'я дозволене",
    find: "check (full_name ~ '[^[:space:]]')",
    replace: "check (true)",
  },
  {
    id: "C6", kind: "sql", ac: "AC-CARD-05", file: OWN_CLIENTS, tests: [OWN_DB],
    what: "clients_select_own_for_therapist: терапевт бачить усі картки, а не лише своїх клієнтів",
    find: "    and private.is_own_client(id)\n",
    replace: "",
  },
  {
    id: "C7", kind: "sql", ac: "AC-CARD-05", file: OWN_CLIENT_RULE, tests: [OWN_DB],
    what: "is_own_client: клієнт із чужим утриманням теж вважається своїм",
    find: "where h.client_id = p_client\n      and s.therapist_id = (select auth.uid())\n",
    replace: "where h.client_id = p_client\n",
  },
  // Зріз 3 (impl-insurance-status): правила статусу страхування живуть у SQL — відмова терапевту (AC-INS-05),
  // анонімові (AC-INS-06) і видимість лише своїх клієнтів (AC-INS-04).
  {
    id: "I1", kind: "sql", ac: "AC-INS-05", file: INSURANCE, tests: [INSURANCE_DB],
    what: "client_insurance_insert_staff: статус позначає будь-хто з входом",
    find: "  for insert\n  to authenticated\n  with check ((select private.has_role('admin', 'scheduler')));",
    replace: "  for insert\n  to authenticated\n  with check (true);",
  },
  {
    id: "I2", kind: "sql", ac: "AC-INS-05", file: INSURANCE, tests: [INSURANCE_DB],
    what: "client_insurance_insert_staff: до дозволених ролей додано therapist",
    find: "  for insert\n  to authenticated\n  with check ((select private.has_role('admin', 'scheduler')));",
    replace: "  for insert\n  to authenticated\n  with check ((select private.has_role('admin', 'scheduler', 'therapist')));",
  },
  {
    id: "I3", kind: "sql", ac: "AC-INS-05", file: INSURANCE, tests: [INSURANCE_DB],
    what: "client_insurance_update_staff: статус змінює будь-хто з входом",
    find: "  using ((select private.has_role('admin', 'scheduler')))\n  with check ((select private.has_role('admin', 'scheduler')));",
    replace: "  using (true)\n  with check (true);",
  },
  {
    id: "I4", kind: "sql", ac: "AC-INS-06", file: INSURANCE, tests: [INSURANCE_DB],
    what: "set_insurance_status: функцію може викликати й відвідувач без входу",
    find: "revoke execute on function public.set_insurance_status(uuid, text) from public, anon;",
    replace: "grant execute on function public.set_insurance_status(uuid, text) to anon;",
  },
  {
    id: "I5", kind: "sql", ac: "AC-INS-06", file: INSURANCE, tests: [INSURANCE_DB],
    what: "client_insurance: відвідувач без входу читає статуси",
    find: "grant select on table public.client_insurance to authenticated;",
    replace: "grant select on table public.client_insurance to authenticated, anon;",
  },
  {
    id: "I6", kind: "sql", ac: "AC-INS-04", file: INSURANCE, tests: [INSURANCE_DB],
    what: "client_insurance_select_visible: терапевт бачить статус будь-якого клієнта, а не лише своїх",
    find: "    or ((select private.has_role('therapist')) and private.is_own_client(client_id))\n",
    replace: "    or (select private.has_role('therapist'))\n",
  },
  {
    id: "I7", kind: "sql", ac: "Припущення PM (AC-INS-02)", file: INSURANCE, tests: [INSURANCE_DB],
    what: "client_insurance_status_check: «Not set» можна позначити значенням not_set",
    find: "check (status in ('verified', 'not_accepted', 'private_pay'))",
    replace: "check (status in ('not_set', 'verified', 'not_accepted', 'private_pay'))",
  },
];

// Приклади з демо (інша схема — у вашому репо цих файлів немає, тож не розкоментовуйте як є):
//
// SQL, межа з AC — діапазон напіввідкритий, останній день заявки не рахується:
//   { id: "L2", kind: "sql", ac: "AC-LEAVE-11", file: RULES, tests: [LEAVE_DB],
//     what: "перетин: діапазон НОВОЇ заявки напіввідкритий [початок, кінець)",
//     find: "pg_catalog.daterange(p_start_date, p_end_date, '[]')",
//     replace: "pg_catalog.daterange(p_start_date, p_end_date, '[)')" },
//
// SQL, політика послаблена до true (а не видалена: без політики RLS забороняє все, і тест відмови лишився б зеленим):
//   { id: "L5", kind: "sql", ac: "передумова AC-LEAVE-04/10", file: LEAVE, tests: [LEAVE_DB],
//     what: "blocked_days: insert дозволено будь-кому з входом, а не лише адміністратору",
//     find: "on public.blocked_days for insert to authenticated\n  with check ((select private.current_app_role()) = 'admin');",
//     replace: "on public.blocked_days for insert to authenticated\n  with check (true);" },
//
// Еквівалентний мутант — лише з reason, що посилається на рядок, який робить його зайвим:
//   { id: "L6", kind: "sql", ac: "AC-LEAVE-06/07", file: RECORDS, tests: [LEAVE_DB],
//     what: "політика рішень: прибрано role = 'manager'", expect: "survive",
//     reason: "еквівалентний: з 20261018000000_manager_helpers_require_role.sql private.is_division_manager() сама " +
//       "перевіряє current_app_role() = 'manager'", find: "…", replace: "…" },
//
// TS, точковий мутант на межі з AC (повний перебір TS — npm run mutation:ts, Stryker):
//   { id: "T1", kind: "ts", ac: "AC-LEAVE-11", file: "src/lib/leave/calendar.ts", tests: ["tests/leave/calendar.test.ts"],
//     what: "rangesOverlap: <= → <", find: "b.startDate <= a.endDate", replace: "b.startDate < a.endDate" },
