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
// Мутанти на SQL-правила за трьома AC WS8: AC-CARD-06, AC-CARD-12, AC-CARD-16 (docs/qa/proof-pack.md).
const ROLES_CLIENTS = "supabase/migrations/20261021155328_roles_and_clients.sql";
const CLIENT_CARDS = "supabase/migrations/20261026104702_client_cards.sql";
const OWN_CLIENTS = "supabase/migrations/20261026110054_own_clients.sql";
const OWN_CLIENT_RULE = "supabase/migrations/20261102151752_own_client_rule.sql";
const CARDS_DB = "tests/db/client-cards.test.ts";
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
    id: "C6", kind: "sql", ac: "AC-CARD-05, AC-CARD-16", file: OWN_CLIENTS, tests: [OWN_DB],
    what: "clients_select_own_for_therapist: терапевт бачить усі картки, а не лише своїх клієнтів",
    find: "    and private.is_own_client(id)\n",
    replace: "",
  },
  {
    id: "C7", kind: "sql", ac: "AC-CARD-05, AC-CARD-16", file: OWN_CLIENT_RULE, tests: [OWN_DB],
    what: "is_own_client: клієнт із чужим утриманням теж вважається своїм",
    find: "where h.client_id = p_client\n      and s.therapist_id = (select auth.uid())\n",
    replace: "where h.client_id = p_client\n",
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
