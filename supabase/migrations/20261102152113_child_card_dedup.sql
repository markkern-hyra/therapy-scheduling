-- Задача 2.1 impl-client-cards-2: дублікат картки дитини. AC: AC-CARD-13. Рішення — design.md impl-client-cards-2, рішення 4.
-- btrim із табуляцією й переносами: як trim форми, щоб прямий запит не обійшов дублікат.
-- Індекс, а не перевірка в коді: два одночасні збереження інакше створять дублікат. Дорослого стереже clients_email_key.
create unique index clients_child_dedup_key
  on public.clients (lower(btrim(full_name, E' \t\n\r')), birth_date, guardian_email)
  where kind = 'child';
