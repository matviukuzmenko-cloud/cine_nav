create table if not exists public.site_daily_visitors (
  visit_date date not null,
  visitor_id uuid not null,
  primary key (visit_date, visitor_id)
);

alter table public.site_daily_visitors enable row level security;
revoke all on public.site_daily_visitors from anon, authenticated;

create or replace function public.record_site_visit(p_visitor_id uuid)
returns bigint
language plpgsql
security definer
set search_path = pg_catalog, public
as $$
declare
  today date := (now() at time zone 'Europe/Moscow')::date;
  yesterday_count bigint;
begin
  if p_visitor_id is null then
    raise exception 'visitor id is required';
  end if;

  insert into public.site_daily_visitors (visit_date, visitor_id)
  values (today, p_visitor_id)
  on conflict (visit_date, visitor_id) do nothing;

  select count(*)
    into yesterday_count
    from public.site_daily_visitors
   where visit_date = today - 1;

  delete from public.site_daily_visitors
   where visit_date < today - 1;

  return yesterday_count;
end;
$$;

revoke all on function public.record_site_visit(uuid) from public;
grant execute on function public.record_site_visit(uuid) to anon, authenticated;
