-- IARA_PASSEIO_RUAS_V1: pontos turísticos com Vista da rua para a Iara levar o
-- visitante "pelas ruas" até o lugar pedido. Leitura pública só do que está
-- publicado; escrita só pelo acesso editorial (Comando EDA), via RPC.
create table if not exists public.iara_pontos_rua (
  id uuid primary key default gen_random_uuid(),
  municipio_ibge text not null,
  municipio text not null,
  nome text not null check (char_length(nome) between 2 and 120),
  apelidos text[] not null default '{}',
  lat double precision not null check (lat between -10 and 3),
  lng double precision not null check (lng between -74 and -56),
  heading integer not null default 0 check (heading between 0 and 359),
  fala text not null default '' check (char_length(fala) <= 400),
  paradas jsonb not null default '[]'::jsonb check (jsonb_typeof(paradas) = 'array' and jsonb_array_length(paradas) <= 8),
  status text not null default 'rascunho' check (status in ('rascunho', 'publicado')),
  atualizado_em timestamptz not null default now()
);
create index if not exists iara_pontos_rua_municipio on public.iara_pontos_rua (municipio_ibge);
alter table public.iara_pontos_rua enable row level security;
drop policy if exists iara_pontos_rua_ler on public.iara_pontos_rua;
create policy iara_pontos_rua_ler on public.iara_pontos_rua for select to anon
  using (status = 'publicado');
drop policy if exists iara_pontos_rua_ler_editorial on public.iara_pontos_rua;
create policy iara_pontos_rua_ler_editorial on public.iara_pontos_rua for select to authenticated
  using (status = 'publicado' or public.tem_acesso_editorial_ern());
revoke insert, update, delete on public.iara_pontos_rua from anon, authenticated;
grant select on public.iara_pontos_rua to anon, authenticated;

create or replace function public.salvar_ponto_rua_eda(p_id uuid, p_dados jsonb)
returns uuid language plpgsql security definer set search_path = public as $$
declare v_id uuid; v_paradas jsonb := coalesce(p_dados->'paradas', '[]'::jsonb); p jsonb;
begin
  if not public.tem_acesso_editorial_ern() then raise exception 'ERN_SEM_PERMISSAO'; end if;
  if not exists (select 1 from public.municipios_conhecimento m where m.ibge = p_dados->>'municipio_ibge') then raise exception 'Município inválido.'; end if;
  if char_length(btrim(coalesce(p_dados->>'nome', ''))) < 2 then raise exception 'Informe o nome do ponto.'; end if;
  if jsonb_typeof(v_paradas) <> 'array' or jsonb_array_length(v_paradas) > 8 then raise exception 'Paradas inválidas (máximo 8).'; end if;
  for p in select * from jsonb_array_elements(v_paradas) loop
    if (p->>'lat')::double precision not between -10 and 3 or (p->>'lng')::double precision not between -74 and -56
       or char_length(coalesce(p->>'nome', '')) not between 2 and 120 or char_length(coalesce(p->>'fala', '')) > 400 then
      raise exception 'Parada inválida: confira nome, coordenadas e fala.';
    end if;
  end loop;
  if p_id is null then
    insert into public.iara_pontos_rua (municipio_ibge, municipio, nome, apelidos, lat, lng, heading, fala, paradas, status)
    values (p_dados->>'municipio_ibge', p_dados->>'municipio', btrim(p_dados->>'nome'),
      array(select lower(btrim(x)) from jsonb_array_elements_text(coalesce(p_dados->'apelidos', '[]'::jsonb)) x where btrim(x) <> '' limit 12),
      (p_dados->>'lat')::double precision, (p_dados->>'lng')::double precision, coalesce((p_dados->>'heading')::int, 0),
      left(coalesce(p_dados->>'fala', ''), 400), v_paradas, coalesce(p_dados->>'status', 'rascunho'))
    returning id into v_id;
  else
    update public.iara_pontos_rua set
      municipio_ibge = p_dados->>'municipio_ibge', municipio = p_dados->>'municipio', nome = btrim(p_dados->>'nome'),
      apelidos = array(select lower(btrim(x)) from jsonb_array_elements_text(coalesce(p_dados->'apelidos', '[]'::jsonb)) x where btrim(x) <> '' limit 12),
      lat = (p_dados->>'lat')::double precision, lng = (p_dados->>'lng')::double precision,
      heading = coalesce((p_dados->>'heading')::int, 0), fala = left(coalesce(p_dados->>'fala', ''), 400),
      paradas = v_paradas, status = coalesce(p_dados->>'status', 'rascunho'), atualizado_em = now()
    where id = p_id returning id into v_id;
    if v_id is null then raise exception 'Ponto não encontrado.'; end if;
  end if;
  return v_id;
end; $$;
revoke all on function public.salvar_ponto_rua_eda(uuid, jsonb) from public, anon;
grant execute on function public.salvar_ponto_rua_eda(uuid, jsonb) to authenticated;

create or replace function public.excluir_ponto_rua_eda(p_id uuid)
returns void language plpgsql security definer set search_path = public as $$
begin
  if not public.tem_acesso_editorial_ern() then raise exception 'ERN_SEM_PERMISSAO'; end if;
  delete from public.iara_pontos_rua where id = p_id;
end; $$;
revoke all on function public.excluir_ponto_rua_eda(uuid) from public, anon;
grant execute on function public.excluir_ponto_rua_eda(uuid) to authenticated;

-- Rascunhos iniciais: coordenadas aproximadas, conferir na prévia do Comando antes de publicar.
insert into public.iara_pontos_rua (municipio_ibge, municipio, nome, apelidos, lat, lng, heading, fala, paradas)
select '1302603', 'Manaus', 'Teatro Amazonas', array['teatro amazonas', 'teatro de manaus', 'opera de manaus'],
  -3.1302, -60.0234, 180, 'Chegamos ao Teatro Amazonas, de 1896, com a cúpula coberta de telhas nas cores da bandeira do Brasil.',
  '[{"nome":"Orla do Centro","lat":-3.1386,"lng":-60.0255,"heading":20,"fala":"Saímos da beira do Rio Negro, no Centro histórico de Manaus."},
    {"nome":"Avenida Eduardo Ribeiro","lat":-3.1335,"lng":-60.0230,"heading":0,"fala":"Subindo a Eduardo Ribeiro, rua dos casarões do ciclo da borracha."}]'::jsonb
where not exists (select 1 from public.iara_pontos_rua where nome = 'Teatro Amazonas');
insert into public.iara_pontos_rua (municipio_ibge, municipio, nome, apelidos, lat, lng, heading, fala, paradas)
select '1303403', 'Parintins', 'Bumbódromo de Parintins', array['bumbodromo', 'bumbódromo', 'centro cultural amazonino mendes'],
  -2.6340, -56.7380, 0, 'Este é o Bumbódromo, arena onde Garantido e Caprichoso se enfrentam no último fim de semana de junho.',
  '[{"nome":"Orla de Parintins","lat":-2.6270,"lng":-56.7360,"heading":180,"fala":"Saímos da orla, onde chegam os barcos vindos de Manaus."}]'::jsonb
where not exists (select 1 from public.iara_pontos_rua where nome = 'Bumbódromo de Parintins');
