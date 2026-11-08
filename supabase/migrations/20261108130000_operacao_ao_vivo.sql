-- EDA_OPERACAO_AO_VIVO_V1
-- Controle da operação a distância: quem está a bordo (guia ou equipe) envia
-- posição e registros (embarque, partida, ocorrências, suprimentos, emergência);
-- o administrador/operador com acesso a Reservas acompanha tudo em tempo real.
-- Tabelas sem políticas de leitura/escrita direta: todo acesso passa pelas RPCs
-- (security definer) que conferem empresa, papel e vínculo com a viagem.
-- Posição só é aceita perto das datas da viagem (privacidade do guia).

create table if not exists public.operacao_posicoes (
  id bigint generated always as identity primary key,
  empresa_id uuid not null references public.empresa(id) on delete cascade,
  reserva_id uuid not null references public.reservas(id) on delete cascade,
  saida_id uuid references public.passeio_saidas(id) on delete set null,
  autor_id uuid not null,
  latitude double precision not null check (latitude between -90 and 90),
  longitude double precision not null check (longitude between -180 and 180),
  precisao real check (precisao is null or precisao between 0 and 100000),
  velocidade real check (velocidade is null or velocidade between 0 and 200),
  rumo real check (rumo is null or rumo between 0 and 360),
  bateria smallint check (bateria is null or bateria between 0 and 100),
  registrado_em timestamptz not null,
  criado_em timestamptz not null default now()
);
create index if not exists operacao_posicoes_reserva_idx on public.operacao_posicoes (reserva_id, registrado_em desc);
create index if not exists operacao_posicoes_saida_idx on public.operacao_posicoes (saida_id, registrado_em desc) where saida_id is not null;
create index if not exists operacao_posicoes_empresa_idx on public.operacao_posicoes (empresa_id, registrado_em desc);

create table if not exists public.operacao_eventos (
  id uuid primary key default gen_random_uuid(),
  empresa_id uuid not null references public.empresa(id) on delete cascade,
  reserva_id uuid not null references public.reservas(id) on delete cascade,
  saida_id uuid references public.passeio_saidas(id) on delete set null,
  autor_id uuid not null,
  autor_nome text,
  tipo text not null check (tipo in ('embarque','partida','parada','chegada','retorno','ocorrencia','suprimento','emergencia','nota','resolvido')),
  gravidade text not null default 'info' check (gravidade in ('info','atencao','grave')),
  texto text check (texto is null or char_length(texto) <= 500),
  latitude double precision check (latitude is null or latitude between -90 and 90),
  longitude double precision check (longitude is null or longitude between -180 and 180),
  registrado_em timestamptz not null,
  criado_em timestamptz not null default now()
);
create index if not exists operacao_eventos_reserva_idx on public.operacao_eventos (reserva_id, registrado_em desc);
create index if not exists operacao_eventos_saida_idx on public.operacao_eventos (saida_id, registrado_em desc) where saida_id is not null;
create index if not exists operacao_eventos_empresa_idx on public.operacao_eventos (empresa_id, registrado_em desc);

alter table public.operacao_posicoes enable row level security;
alter table public.operacao_eventos enable row level security;
revoke all on public.operacao_posicoes from public, anon, authenticated;
revoke all on public.operacao_eventos from public, anon, authenticated;

-- Quem pode registrar a bordo desta reserva? Equipe da empresa (admin/operador
-- com Reservas) ou o guia escalado (conta própria vinculada ao cadastro do guia).
-- Devolve a reserva com a janela da viagem; lança erro se não puder.
create or replace function public.eda_bordo_reserva(p_reserva_id uuid)
returns table (empresa_id uuid, reserva_id uuid, saida_id uuid, inicio date, fim date)
language plpgsql stable security definer set search_path = public as $$
declare v_uid uuid := auth.uid();
begin
  if v_uid is null then raise exception 'EDA_SEM_PERMISSAO_OPERACAO'; end if;
  return query
  select r.empresa_id, r.id, r.saida_id, r.inicio, r.fim
  from public.eda_reservas_periodo r
  where r.id = p_reserva_id
    and (
      exists (select 1 from public.perfis p where p.id = v_uid and p.empresa_id = r.empresa_id
               and p.role = any (array['admin_empresa','operador_empresa'])
               and public.ern_pode_acessar_modulo('reservas'))
      or exists (select 1 from public.guias g where g.id = r.guia_id and g.usuario_id = v_uid)
    );
  if not found then raise exception 'EDA_SEM_PERMISSAO_OPERACAO'; end if;
end; $$;

-- Lote de posições (o aparelho guarda sem sinal e envia quando volta a conexão).
create or replace function public.registrar_posicoes_operacao_eda(p_reserva_id uuid, p_pontos jsonb)
returns integer language plpgsql security definer set search_path = public as $$
declare b record; v_hoje date := (now() at time zone 'America/Manaus')::date; n integer;
begin
  select * into b from public.eda_bordo_reserva(p_reserva_id);
  if v_hoje not between b.inicio - 1 and b.fim + 1 then
    raise exception 'EDA_FORA_DA_VIAGEM';
  end if;
  if jsonb_typeof(p_pontos) <> 'array' or jsonb_array_length(p_pontos) > 300 then
    raise exception 'EDA_LOTE_INVALIDO';
  end if;
  insert into public.operacao_posicoes (empresa_id, reserva_id, saida_id, autor_id, latitude, longitude, precisao, velocidade, rumo, bateria, registrado_em)
  select b.empresa_id, b.reserva_id, b.saida_id, auth.uid(),
    (x->>'lat')::double precision, (x->>'lng')::double precision,
    nullif(x->>'precisao', '')::real, least(greatest(nullif(x->>'velocidade', '')::real, 0), 200),
    nullif(x->>'rumo', '')::real, nullif(x->>'bateria', '')::smallint,
    least(coalesce((x->>'em')::timestamptz, now()), now())
  from jsonb_array_elements(p_pontos) x
  where case when (x->>'lat') ~ '^-?[0-9]{1,3}(\.[0-9]{1,12})?$' and (x->>'lng') ~ '^-?[0-9]{1,3}(\.[0-9]{1,12})?$'
             then (x->>'lat')::double precision between -90 and 90 and (x->>'lng')::double precision between -180 and 180
             else false end
    and coalesce((x->>'em')::timestamptz, now()) > now() - interval '4 days';
  get diagnostics n = row_count;
  return n;
end; $$;

create or replace function public.registrar_evento_operacao_eda(
  p_reserva_id uuid, p_tipo text, p_texto text default null, p_gravidade text default null,
  p_lat double precision default null, p_lng double precision default null, p_em timestamptz default null)
returns uuid language plpgsql security definer set search_path = public as $$
declare b record; v_id uuid; v_nome text; v_grav text;
begin
  select * into b from public.eda_bordo_reserva(p_reserva_id);
  if (now() at time zone 'America/Manaus')::date not between b.inicio - 1 and b.fim + 2 then
    raise exception 'EDA_FORA_DA_VIAGEM';
  end if;
  v_grav := coalesce(p_gravidade, case p_tipo when 'emergencia' then 'grave' when 'ocorrencia' then 'atencao' when 'suprimento' then 'atencao' else 'info' end);
  select coalesce(nullif(btrim(p.nome), ''), (select g.nome from public.guias g where g.usuario_id = auth.uid() limit 1), 'Equipe')
    into v_nome from public.perfis p where p.id = auth.uid();
  insert into public.operacao_eventos (empresa_id, reserva_id, saida_id, autor_id, autor_nome, tipo, gravidade, texto, latitude, longitude, registrado_em)
  values (b.empresa_id, b.reserva_id, b.saida_id, auth.uid(), coalesce(v_nome, 'Equipe'), p_tipo, v_grav,
          nullif(left(btrim(coalesce(p_texto, '')), 500), ''),
          case when p_lat between -90 and 90 then p_lat end, case when p_lng between -180 and 180 then p_lng end,
          least(coalesce(p_em, now()), now()))
  returning id into v_id;
  return v_id;
end; $$;

-- Central "Operação ao vivo": viagens em andamento e as que saem até amanhã,
-- agrupadas por saída (quem viaja junto), com posição, trilha, registros,
-- saúde (só contagens) e conferência de suprimentos.
create or replace function public.operacao_ao_vivo_eda()
returns jsonb language plpgsql stable security definer set search_path = public as $$
declare v_empresa uuid := public.eda_empresa_saude(); v_hoje date := (now() at time zone 'America/Manaus')::date;
begin
  return coalesce((
    with base as (
      select r.*, coalesce(r.saida_id::text, r.id::text) as chave
      from public.eda_reservas_periodo r
      where r.empresa_id = v_empresa
        and lower(coalesce(r.status, '')) not in ('concluída', 'concluida')
        and r.inicio <= v_hoje + 1 and r.fim >= v_hoje
    ), grupos as (
      select chave, min(saida_id::text)::uuid as saida_id, array_agg(id order by inicio) as reservas,
        min(passeio) as passeio, min(inicio) as inicio, max(fim) as fim, min(horario) as horario,
        sum(pessoas)::integer as pessoas, string_agg(distinct cliente, ', ') as clientes,
        (array_agg(embarcacao_id) filter (where embarcacao_id is not null))[1] as embarcacao_id,
        (array_agg(guia_id) filter (where guia_id is not null))[1] as guia_id,
        count(*) filter (where lower(coalesce(status, '')) not in ('confirmada', 'confirmado'))::integer as nao_confirmadas
      from base group by chave
    )
    select jsonb_agg(jsonb_build_object(
      'chave', g.chave, 'saida_id', g.saida_id, 'reservas', to_jsonb(g.reservas),
      'passeio', g.passeio, 'inicio', g.inicio, 'fim', g.fim, 'horario', g.horario,
      'pessoas', g.pessoas, 'clientes', g.clientes, 'nao_confirmadas', g.nao_confirmadas,
      'dias', g.fim - g.inicio + 1,
      'embarcacao', (select jsonb_build_object('nome', e.nome, 'capacidade', e.capacidade, 'marinheiro', e.marinheiro)
                       from public.embarcacoes e where e.id = g.embarcacao_id),
      'guia', (select jsonb_build_object('nome', gu.nome, 'telefone', gu.telefone, 'tem_conta', gu.usuario_id is not null)
                 from public.guias gu where gu.id = g.guia_id),
      'posicao', (select jsonb_build_object('lat', p.latitude, 'lng', p.longitude, 'em', p.registrado_em,
                    'precisao', p.precisao, 'velocidade', p.velocidade, 'bateria', p.bateria)
                    from public.operacao_posicoes p where p.empresa_id = v_empresa and p.reserva_id = any (g.reservas)
                    order by p.registrado_em desc limit 1),
      'trilha', coalesce((select jsonb_agg(jsonb_build_array(t.latitude, t.longitude) order by t.registrado_em)
                    from (select latitude, longitude, registrado_em from public.operacao_posicoes p
                          where p.empresa_id = v_empresa and p.reserva_id = any (g.reservas)
                            and p.registrado_em > now() - interval '3 days'
                          order by p.registrado_em desc limit 400) t), '[]'::jsonb),
      'eventos', coalesce((select jsonb_agg(jsonb_build_object('id', ev.id, 'tipo', ev.tipo, 'gravidade', ev.gravidade,
                    'texto', ev.texto, 'autor', ev.autor_nome, 'em', ev.registrado_em, 'lat', ev.latitude, 'lng', ev.longitude)
                    order by ev.registrado_em desc)
                    from (select * from public.operacao_eventos ev where ev.empresa_id = v_empresa and ev.reserva_id = any (g.reservas)
                          order by ev.registrado_em desc limit 30) ev), '[]'::jsonb),
      'saude', (select jsonb_build_object(
                  'graves', count(*) filter (where a.nivel = 'grave'),
                  'atencao', count(*) filter (where a.nivel = 'atencao'),
                  'fichas', count(distinct f.participante_id),
                  'nao_nadam', count(distinct rp.id) filter (where f.sabe_nadar is false))
                from public.reserva_participantes rp
                left join public.participante_fichas f on f.participante_id = rp.id
                left join lateral public.eda_alertas_ficha(f) a on f.participante_id is not null
                where rp.reserva_id = any (g.reservas)),
      'suprimentos', (select jsonb_build_object(
                  'demandas', count(distinct d.id),
                  'planejado_pessoas', max(d.pessoas_estimadas),
                  'planejado_dias', max(d.dias_estimados),
                  'itens', count(i.id),
                  'pendentes', count(i.id) filter (where i.situacao = 'pendente'),
                  'separacao', count(i.id) filter (where i.situacao = 'em_separacao'),
                  'atendidos', count(i.id) filter (where i.situacao = 'atendido'),
                  'combustivel', count(i.id) filter (where i.categoria = 'combustivel'),
                  'alimentacao', count(i.id) filter (where i.categoria in ('alimentacao', 'bebidas')),
                  'coletes', coalesce(sum(i.quantidade) filter (where i.descricao ilike '%colete%'), 0))
                from public.demandas d
                left join public.demanda_itens i on i.demanda_id = d.id
                where d.empresa_id = v_empresa and g.saida_id is not null and d.saida_id = g.saida_id
                  and lower(coalesce(d.status, '')) not in ('cancelada'))
    ) order by g.inicio, g.horario nulls last)
    from grupos g
  ), '[]'::jsonb);
end; $$;

-- Viagens do guia com permissão de transmitir (hoje ± 1 dia).
create or replace function public.minhas_viagens_bordo_eda()
returns table (reserva_id uuid, passeio text, inicio date, fim date, pessoas integer, operadora text)
language plpgsql stable security definer set search_path = public as $$
declare v_hoje date := (now() at time zone 'America/Manaus')::date;
begin
  if auth.uid() is null then raise exception 'Sem acesso.'; end if;
  return query
  select r.id, r.passeio, r.inicio, r.fim, r.pessoas,
    coalesce((select pp.nome_publico from public.perfis_publicos pp where pp.empresa_id = r.empresa_id and pp.origem_tipo = 'empresa' limit 1),
             (select e.nome from public.empresa e where e.id = r.empresa_id))
  from public.eda_reservas_periodo r
  join public.guias g on g.id = r.guia_id and g.usuario_id = auth.uid()
  where v_hoje between r.inicio - 1 and r.fim + 1
  order by r.inicio, r.horario nulls first;
end; $$;

revoke all on function public.eda_bordo_reserva(uuid) from public, anon, authenticated;
revoke all on function public.registrar_posicoes_operacao_eda(uuid, jsonb) from public, anon;
revoke all on function public.registrar_evento_operacao_eda(uuid, text, text, text, double precision, double precision, timestamptz) from public, anon;
revoke all on function public.operacao_ao_vivo_eda() from public, anon;
revoke all on function public.minhas_viagens_bordo_eda() from public, anon;
grant execute on function public.registrar_posicoes_operacao_eda(uuid, jsonb) to authenticated;
grant execute on function public.registrar_evento_operacao_eda(uuid, text, text, text, double precision, double precision, timestamptz) to authenticated;
grant execute on function public.operacao_ao_vivo_eda() to authenticated;
grant execute on function public.minhas_viagens_bordo_eda() to authenticated;
