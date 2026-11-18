-- Зріз 4, задача 1.2 impl-client-intake-draft: денний ліміт помічника, що складає чернетки картки.
-- AC: AC-INTAKE-08 (вичерпав ліміт запитів на сьогодні → «The assistant is unavailable…»), AC-INTAKE-09 (терапевт ліміту
-- не витрачає). Рішення — design.md impl-client-intake-draft, рішення 5 і «Дані й RLS»; ADR 0010 (один ключ Claude API
-- на команду, бюджет спільний). Текстів звернень і чернеток база не зберігає — лише кількість запитів за день.

-- ── Лічильник — у схемі private: PostgREST її не віддає, читає й пише лише функція ───────────────────────────────
create table private.assistant_usage (
  day      date primary key,
  requests integer not null constraint assistant_usage_requests_check check (requests >= 0)
);

comment on table private.assistant_usage is
  'Скільки запитів до помічника (чернетка картки з тексту звернення) взято за день практики (America/Los_Angeles).';

alter table private.assistant_usage enable row level security;
revoke all on table private.assistant_usage from public, anon, authenticated;
-- Політик немає: authenticated і anon до таблиці доступу не мають, пише лише функція нижче (власник таблиці). service_role
-- — як Dashboard: подивитись чи скинути лічильник.
grant usage on schema private to service_role;
grant select, insert, update, delete on table private.assistant_usage to service_role;

-- ── Узяти один запит дня — одна інструкція ───────────────────────────────────────────────────────────────────────
-- security definer лише в private, search_path = '': функція пише в таблицю, до якої в користувача доступу немає.
-- Не admin і не scheduler (терапевт, без ролі) — false без запису (AC-INTAKE-09). insert … on conflict do update … where
-- — одна атомарна інструкція: два одночасні запити не перевищать ліміт; 50 узято — рядка не повернуто → false. Число 50
-- живе лише тут (власне припущення розробника, proposal.md add-client-intake-draft).
create function private.take_assistant_request()
returns boolean
language plpgsql
volatile
security definer
set search_path = ''
as $$
declare
  taken integer;
begin
  if not private.has_role('admin', 'scheduler') then
    return false;
  end if;
  insert into private.assistant_usage as usage (day, requests)
  values ((now() at time zone 'America/Los_Angeles')::date, 1)
  on conflict (day) do update set requests = usage.requests + 1
    where usage.requests < 50
  returning usage.requests into taken;
  return taken is not null;
end;
$$;

revoke execute on function private.take_assistant_request() from public, anon;
grant execute on function private.take_assistant_request() to authenticated;

-- Публічна обгортка для supabase.rpc: security invoker, лише викликає приватну — нічого не дозволяє понад неї.
create function public.take_assistant_request()
returns boolean
language sql
volatile
security invoker
set search_path = ''
as $$
  select private.take_assistant_request();
$$;

-- Без входу — жодного доступу: функцію виконують лише authenticated.
revoke execute on function public.take_assistant_request() from public, anon;
grant execute on function public.take_assistant_request() to authenticated;
