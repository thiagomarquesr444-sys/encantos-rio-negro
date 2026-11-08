-- EDA_IA_CONVERSA_V1
-- Cota diária da IA (Gemini/Groq, camada gratuita). Tabela fechada: só a rota
-- /api/eda-ia (service_role) consome a cota via RPC. Identificador = HMAC
-- (nunca IP ou e-mail em texto puro).

create table if not exists public.eda_ia_uso (
  identificador text not null check (char_length(identificador) between 8 and 128),
  dia date not null,
  total integer not null default 0 check (total >= 0),
  primary key (identificador, dia)
);

alter table public.eda_ia_uso enable row level security;
revoke all on table public.eda_ia_uso from public, anon, authenticated;

create or replace function public.eda_ia_consumir_v1(p_identificador text, p_limite integer)
returns boolean
language plpgsql
security definer
set search_path = public
as $$
declare
  v_dia date := (now() at time zone 'America/Manaus')::date;
  v_total integer;
begin
  if p_identificador is null or char_length(p_identificador) not between 8 and 128 then
    raise exception 'Identificador inválido.';
  end if;
  if p_limite is null or p_limite < 1 or p_limite > 100000 then
    raise exception 'Limite inválido.';
  end if;

  insert into public.eda_ia_uso as u (identificador, dia, total)
  values (p_identificador, v_dia, 1)
  on conflict (identificador, dia) do update
    set total = u.total + 1
    where u.total < p_limite
  returning total into v_total;

  -- Limpeza leve: registros com mais de 30 dias.
  delete from public.eda_ia_uso where dia < v_dia - 30;

  return v_total is not null;
end $$;

revoke all on function public.eda_ia_consumir_v1(text, integer) from public, anon, authenticated;
grant execute on function public.eda_ia_consumir_v1(text, integer) to service_role;
