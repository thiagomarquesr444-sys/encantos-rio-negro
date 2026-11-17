-- EDA_GUIA_PRATICO_V1 + EDA_BARCO_BOTE_V1
-- 1) Guia/Prático: o acesso profissional "guia" atende guia de turismo e prático de embarcação.
--    A operadora vincula a conta do profissional por um código (EDA-XXXXXX) ao cadastro do guia
--    ou à embarcação (prático). guias.usuario_id continua sendo quem cadastrou (RLS);
--    a conta do profissional fica em guias.conta_id / embarcacoes.pratico_conta_id.
-- 2) Barco e bote: posições marcadas por unidade; etapas "bote saiu" / "bote voltou".

alter table public.perfis_profissionais add column if not exists codigo_vinculo text;
alter table public.perfis_profissionais add column if not exists habilitacao text;
create unique index if not exists perfis_profissionais_codigo_uk on public.perfis_profissionais (codigo_vinculo) where codigo_vinculo is not null;
alter table public.perfis_profissionais drop constraint if exists perfis_profissionais_habilitacao_tam;
alter table public.perfis_profissionais add constraint perfis_profissionais_habilitacao_tam check (habilitacao is null or length(habilitacao) <= 80);

alter table public.guias add column if not exists conta_id uuid references auth.users(id) on delete set null;
alter table public.embarcacoes add column if not exists pratico_conta_id uuid references auth.users(id) on delete set null;
create index if not exists guias_conta_idx on public.guias (conta_id) where conta_id is not null;
create index if not exists embarcacoes_pratico_idx on public.embarcacoes (pratico_conta_id) where pratico_conta_id is not null;

-- Vínculo só pela função (a operadora não grava conta_id direto).
create or replace function public.eda_trava_vinculo_conta()
returns trigger language plpgsql set search_path = public as $$
begin
  if coalesce(current_setting('eda.vinculo', true), '') = '1' then return new; end if;
  if tg_table_name = 'guias' then
    if (tg_op = 'INSERT' and new.conta_id is not null) or (tg_op = 'UPDATE' and new.conta_id is distinct from old.conta_id) then
      raise exception 'EDA_VINCULO_SO_POR_CODIGO';
    end if;
  else
    if (tg_op = 'INSERT' and new.pratico_conta_id is not null) or (tg_op = 'UPDATE' and new.pratico_conta_id is distinct from old.pratico_conta_id) then
      raise exception 'EDA_VINCULO_SO_POR_CODIGO';
    end if;
  end if;
  return new;
end; $$;
drop trigger if exists eda_trava_vinculo on public.guias;
create trigger eda_trava_vinculo before insert or update on public.guias for each row execute function public.eda_trava_vinculo_conta();
drop trigger if exists eda_trava_vinculo on public.embarcacoes;
create trigger eda_trava_vinculo before insert or update on public.embarcacoes for each row execute function public.eda_trava_vinculo_conta();

-- Código do profissional (gera na primeira vez).
create or replace function public.meu_codigo_vinculo_eda()
returns text language plpgsql security definer set search_path = public as $$
declare v_uid uuid := auth.uid(); v_cod text; abc constant text := 'ABCDEFGHJKMNPQRSTUVWXYZ23456789'; i int;
begin
  if v_uid is null or not exists (select 1 from public.acessos_profissionais a where a.usuario_id = v_uid and a.tipo = 'guia') then
    raise exception 'EDA_SEM_PERMISSAO';
  end if;
  select codigo_vinculo into v_cod from public.perfis_profissionais where usuario_id = v_uid and tipo = 'guia';
  if not found then raise exception 'EDA_PERFIL_INCOMPLETO'; end if;
  if v_cod is not null then return v_cod; end if;
  loop
    v_cod := 'EDA-';
    for i in 1..6 loop v_cod := v_cod || substr(abc, 1 + floor(random() * length(abc))::int, 1); end loop;
    exit when not exists (select 1 from public.perfis_profissionais where codigo_vinculo = v_cod);
  end loop;
  update public.perfis_profissionais set codigo_vinculo = v_cod where usuario_id = v_uid and tipo = 'guia';
  return v_cod;
end; $$;

-- Operadora vincula (ou desvincula, com código nulo) a conta ao guia ou à embarcação (prático).
create or replace function public.vincular_conta_profissional_eda(p_alvo text, p_id uuid, p_codigo text)
returns jsonb language plpgsql security definer set search_path = public as $$
declare v_uid uuid := auth.uid(); v_emp uuid; v_conta uuid; v_nome text; v_cat text;
begin
  select p.empresa_id into v_emp from public.perfis p
   where p.id = v_uid and p.empresa_id is not null and p.role = any (array['admin_empresa', 'operador_empresa']);
  if v_emp is null then raise exception 'EDA_SEM_PERMISSAO'; end if;
  if p_alvo not in ('guia', 'embarcacao') then raise exception 'EDA_ALVO_INVALIDO'; end if;
  if p_alvo = 'guia' and not exists (select 1 from public.guias where id = p_id and empresa_id = v_emp) then raise exception 'EDA_SEM_PERMISSAO'; end if;
  if p_alvo = 'embarcacao' and not exists (select 1 from public.embarcacoes where id = p_id and empresa_id = v_emp) then raise exception 'EDA_SEM_PERMISSAO'; end if;
  if p_codigo is not null and btrim(p_codigo) <> '' then
    select pp.usuario_id, pp.nome, pp.categoria into v_conta, v_nome, v_cat from public.perfis_profissionais pp
     where pp.tipo = 'guia' and pp.codigo_vinculo = upper(btrim(p_codigo));
    if v_conta is null then raise exception 'EDA_CODIGO_INVALIDO'; end if;
  end if;
  perform set_config('eda.vinculo', '1', true);
  if p_alvo = 'guia' then update public.guias set conta_id = v_conta where id = p_id;
  else update public.embarcacoes set pratico_conta_id = v_conta where id = p_id; end if;
  perform set_config('eda.vinculo', '', true);
  return jsonb_build_object('nome', v_nome, 'atuacao', v_cat);
end; $$;

-- Nome do profissional vinculado (para a operadora ver quem está ligado).
create or replace function public.contas_vinculadas_eda()
returns table (alvo text, id uuid, nome text, atuacao text)
language sql stable security definer set search_path = public as $$
  with emp as (select p.empresa_id from public.perfis p where p.id = auth.uid() and p.empresa_id is not null)
  select 'guia', g.id, pp.nome, pp.categoria from public.guias g join emp on emp.empresa_id = g.empresa_id
    join public.perfis_profissionais pp on pp.usuario_id = g.conta_id and pp.tipo = 'guia'
  union all
  select 'embarcacao', e.id, pp.nome, pp.categoria from public.embarcacoes e join emp on emp.empresa_id = e.empresa_id
    join public.perfis_profissionais pp on pp.usuario_id = e.pratico_conta_id and pp.tipo = 'guia';
$$;

-- Quem pode registrar a bordo: equipe com Reservas, guia vinculado ou prático da embarcação.
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
      or exists (select 1 from public.guias g where g.id = r.guia_id and g.conta_id = v_uid)
      or exists (select 1 from public.embarcacoes e where e.id = r.embarcacao_id and e.pratico_conta_id = v_uid)
    );
  if not found then raise exception 'EDA_SEM_PERMISSAO_OPERACAO'; end if;
end; $$;

drop function if exists public.minhas_viagens_guia_eda(integer);
create function public.minhas_viagens_guia_eda(p_dias integer default 60)
returns table (reserva_id uuid, operadora text, passeio text, inicio date, fim date, horario time without time zone, pessoas integer,
  ponto_embarque text, embarcacao text, alertas_graves integer, fichas_pendentes integer, papel text)
language plpgsql stable security definer set search_path = public as $$
declare v_hoje date := (now() at time zone 'America/Manaus')::date; v_uid uuid := auth.uid();
begin
  if v_uid is null then raise exception 'Sem acesso.'; end if;
  return query
  select r.id,
    coalesce((select pp.nome_publico from public.perfis_publicos pp where pp.empresa_id = r.empresa_id and pp.origem_tipo = 'empresa' limit 1),
             (select e.nome from public.empresa e where e.id = r.empresa_id)),
    r.passeio, r.inicio, r.fim, r.horario, r.pessoas, p.ponto_embarque, em.nome,
    (select count(*) from public.reserva_participantes rp join public.participante_fichas f on f.participante_id = rp.id
      where rp.reserva_id = r.id and (f.alergia_gravidade = 'grave' or f.sabe_nadar is false or f.condicoes && array['cardiaca','epilepsia','gestante']))::integer,
    greatest(r.pessoas - (select count(*) from public.reserva_participantes rp join public.participante_fichas f on f.participante_id = rp.id where rp.reserva_id = r.id), 0)::integer,
    case when g.conta_id = v_uid and em.pratico_conta_id = v_uid then 'guia e prático'
         when em.pratico_conta_id = v_uid then 'prático' else 'guia' end
  from public.eda_reservas_periodo r
  left join public.guias g on g.id = r.guia_id
  left join public.embarcacoes em on em.id = r.embarcacao_id
  left join public.reservas rr on rr.id = r.id
  left join public.passeios p on p.id = rr.passeio_id
  where (g.conta_id = v_uid or em.pratico_conta_id = v_uid)
    and r.fim >= v_hoje and r.inicio <= v_hoje + least(greatest(p_dias, 1), 180)
  order by r.inicio, r.horario nulls first;
end; $$;

create or replace function public.minhas_viagens_bordo_eda()
returns table (reserva_id uuid, passeio text, inicio date, fim date, pessoas integer, operadora text)
language plpgsql stable security definer set search_path = public as $$
declare v_hoje date := (now() at time zone 'America/Manaus')::date; v_uid uuid := auth.uid();
begin
  if v_uid is null then raise exception 'Sem acesso.'; end if;
  return query
  select r.id, r.passeio, r.inicio, r.fim, r.pessoas,
    coalesce((select pp.nome_publico from public.perfis_publicos pp where pp.empresa_id = r.empresa_id and pp.origem_tipo = 'empresa' limit 1),
             (select e.nome from public.empresa e where e.id = r.empresa_id))
  from public.eda_reservas_periodo r
  left join public.guias g on g.id = r.guia_id
  left join public.embarcacoes em on em.id = r.embarcacao_id
  where (g.conta_id = v_uid or em.pratico_conta_id = v_uid)
    and v_hoje between r.inicio - 1 and r.fim + 1
  order by r.inicio, r.horario nulls first;
end; $$;

-- ---------------------------------------------------------------------------
-- Barco e bote
-- ---------------------------------------------------------------------------
alter table public.operacao_posicoes add column if not exists unidade text not null default 'barco';
alter table public.operacao_posicoes drop constraint if exists operacao_posicoes_unidade_check;
alter table public.operacao_posicoes add constraint operacao_posicoes_unidade_check check (unidade in ('barco', 'bote'));
alter table public.operacao_eventos drop constraint if exists operacao_eventos_tipo_check;
alter table public.operacao_eventos add constraint operacao_eventos_tipo_check check (tipo in
  ('embarque','partida','parada','chegada','retorno','ocorrencia','suprimento','emergencia','nota','resolvido','bote_saida','bote_retorno'));

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
  insert into public.operacao_posicoes (empresa_id, reserva_id, saida_id, autor_id, latitude, longitude, precisao, velocidade, rumo, bateria, registrado_em, unidade)
  select b.empresa_id, b.reserva_id, b.saida_id, auth.uid(),
    (x->>'lat')::double precision, (x->>'lng')::double precision,
    nullif(x->>'precisao', '')::real, least(greatest(nullif(x->>'velocidade', '')::real, 0), 200),
    nullif(x->>'rumo', '')::real, nullif(x->>'bateria', '')::smallint,
    least(coalesce((x->>'em')::timestamptz, now()), now()),
    case when x->>'unidade' = 'bote' then 'bote' else 'barco' end
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
declare b record; v_id uuid; v_nome text; v_grav text; v_em timestamptz := least(coalesce(p_em, now()), now());
begin
  select * into b from public.eda_bordo_reserva(p_reserva_id);
  if (now() at time zone 'America/Manaus')::date not between b.inicio - 1 and b.fim + 2 then
    raise exception 'EDA_FORA_DA_VIAGEM';
  end if;
  if p_tipo in ('embarque', 'partida', 'parada', 'chegada', 'retorno', 'resolvido', 'bote_saida', 'bote_retorno') then
    select ev.id into v_id from public.operacao_eventos ev
     where ev.empresa_id = b.empresa_id and ev.tipo = p_tipo
       and (ev.reserva_id = b.reserva_id or (b.saida_id is not null and ev.saida_id = b.saida_id))
       and ev.registrado_em between v_em - interval '3 minutes' and v_em + interval '3 minutes'
     order by ev.registrado_em desc limit 1;
    if v_id is not null then return v_id; end if;
  end if;
  v_grav := coalesce(p_gravidade, case p_tipo when 'emergencia' then 'grave' when 'ocorrencia' then 'atencao' when 'suprimento' then 'atencao' else 'info' end);
  v_nome := coalesce(
    (select nullif(btrim(p.nome), '') from public.perfis p where p.id = auth.uid()),
    (select nullif(btrim(pp.nome), '') from public.perfis_profissionais pp where pp.usuario_id = auth.uid() and pp.tipo = 'guia'),
    (select g.nome from public.guias g where g.conta_id = auth.uid() limit 1),
    'Equipe');
  insert into public.operacao_eventos (empresa_id, reserva_id, saida_id, autor_id, autor_nome, tipo, gravidade, texto, latitude, longitude, registrado_em)
  values (b.empresa_id, b.reserva_id, b.saida_id, auth.uid(), v_nome, p_tipo, v_grav,
          nullif(left(btrim(coalesce(p_texto, '')), 500), ''),
          case when p_lat between -90 and 90 then p_lat end, case when p_lng between -180 and 180 then p_lng end,
          v_em)
  returning id into v_id;
  return v_id;
end; $$;

-- Operação ao vivo: barco (posição/trilha), bote (quando sai com grupo), guia e prático vinculados.
create or replace function public.operacao_ao_vivo_eda()
 returns jsonb language plpgsql stable security definer set search_path to 'public'
as $function$
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
    ), comp as (
      select g.*, ps.id as passeio_id, ps.rota, ps.latitude as dest_lat, ps.longitude as dest_lng,
        coalesce(nullif(btrim(ps.destino_nome), ''), ps.nome) as dest_nome, ps.ponto_embarque, ps.embarque_lat, ps.embarque_lng,
        (select ev.tipo from public.operacao_eventos ev where ev.empresa_id = v_empresa and ev.reserva_id = any (g.reservas)
           and ev.tipo in ('bote_saida', 'bote_retorno') order by ev.registrado_em desc limit 1) as bote_tipo,
        (select ev.registrado_em from public.operacao_eventos ev where ev.empresa_id = v_empresa and ev.reserva_id = any (g.reservas)
           and ev.tipo in ('bote_saida', 'bote_retorno') order by ev.registrado_em desc limit 1) as bote_em,
        (select ev.texto from public.operacao_eventos ev where ev.empresa_id = v_empresa and ev.reserva_id = any (g.reservas)
           and ev.tipo = 'bote_saida' order by ev.registrado_em desc limit 1) as bote_texto
      from grupos g
      left join lateral (
        select p.* from public.passeios p
        where p.empresa_id = v_empresa
          and p.id = coalesce((select s.passeio_id from public.passeio_saidas s where s.id = g.saida_id),
                              (select r.passeio_id from public.reservas r where r.id = g.reservas[1]))
      ) ps on true
    )
    select jsonb_agg(jsonb_build_object(
      'chave', g.chave, 'saida_id', g.saida_id, 'reservas', to_jsonb(g.reservas),
      'passeio', g.passeio, 'inicio', g.inicio, 'fim', g.fim, 'horario', g.horario,
      'pessoas', g.pessoas, 'clientes', g.clientes, 'nao_confirmadas', g.nao_confirmadas,
      'dias', g.fim - g.inicio + 1,
      'passeio_id', g.passeio_id,
      'rota', g.rota,
      'destino', case when g.dest_lat is not null and g.dest_lng is not null
                      then jsonb_build_object('lat', g.dest_lat, 'lng', g.dest_lng, 'nome', g.dest_nome) end,
      'embarque', g.ponto_embarque,
      'embarque_pos', case when g.embarque_lat is not null and g.embarque_lng is not null then jsonb_build_object('lat', g.embarque_lat, 'lng', g.embarque_lng) end,
      'embarcacao', (select jsonb_build_object('nome', e.nome, 'capacidade', e.capacidade, 'marinheiro', e.marinheiro,
                       'pratico', (select pp.nome from public.perfis_profissionais pp where pp.usuario_id = e.pratico_conta_id and pp.tipo = 'guia'),
                       'tem_pratico', e.pratico_conta_id is not null)
                       from public.embarcacoes e where e.id = g.embarcacao_id),
      'guia', (select jsonb_build_object('nome', gu.nome, 'telefone', gu.telefone, 'tem_conta', gu.conta_id is not null)
                 from public.guias gu where gu.id = g.guia_id),
      'posicao', (select jsonb_build_object('lat', p.latitude, 'lng', p.longitude, 'em', p.registrado_em,
                    'precisao', p.precisao, 'velocidade', p.velocidade, 'bateria', p.bateria)
                    from public.operacao_posicoes p where p.empresa_id = v_empresa and p.reserva_id = any (g.reservas)
                      and p.unidade = 'barco' and coalesce(p.precisao, 0) <= 300
                    order by p.registrado_em desc limit 1),
      'aproximada', (select jsonb_build_object('lat', p.latitude, 'lng', p.longitude, 'em', p.registrado_em, 'precisao', p.precisao)
                    from public.operacao_posicoes p where p.empresa_id = v_empresa and p.reserva_id = any (g.reservas)
                      and p.unidade = 'barco' and p.precisao > 300
                      and p.registrado_em > coalesce((select max(q.registrado_em) from public.operacao_posicoes q
                            where q.empresa_id = v_empresa and q.reserva_id = any (g.reservas) and q.unidade = 'barco'
                              and coalesce(q.precisao, 0) <= 300), '-infinity'::timestamptz)
                    order by p.registrado_em desc limit 1),
      'trilha', coalesce((select jsonb_agg(jsonb_build_array(t.latitude, t.longitude) order by t.registrado_em)
                    from (select latitude, longitude, registrado_em from public.operacao_posicoes p
                          where p.empresa_id = v_empresa and p.reserva_id = any (g.reservas) and p.unidade = 'barco'
                            and coalesce(p.precisao, 0) <= 300 and p.registrado_em > now() - interval '3 days'
                          order by p.registrado_em desc limit 400) t), '[]'::jsonb),
      'recentes', coalesce((select jsonb_agg(jsonb_build_array(t.latitude, t.longitude, t.registrado_em) order by t.registrado_em)
                    from (select latitude, longitude, registrado_em from public.operacao_posicoes p
                          where p.empresa_id = v_empresa and p.reserva_id = any (g.reservas) and p.unidade = 'barco'
                            and coalesce(p.precisao, 0) <= 300 and p.registrado_em > now() - interval '6 hours'
                          order by p.registrado_em desc limit 150) t), '[]'::jsonb),
      'bote', case when g.bote_tipo = 'bote_saida' then jsonb_build_object(
                  'desde', g.bote_em, 'texto', g.bote_texto,
                  'posicao', (select jsonb_build_object('lat', p.latitude, 'lng', p.longitude, 'em', p.registrado_em,
                                'precisao', p.precisao, 'velocidade', p.velocidade, 'bateria', p.bateria)
                              from public.operacao_posicoes p where p.empresa_id = v_empresa and p.reserva_id = any (g.reservas)
                                and p.unidade = 'bote' and coalesce(p.precisao, 0) <= 300 and p.registrado_em >= g.bote_em - interval '5 minutes'
                              order by p.registrado_em desc limit 1),
                  'trilha', coalesce((select jsonb_agg(jsonb_build_array(t.latitude, t.longitude) order by t.registrado_em)
                              from (select latitude, longitude, registrado_em from public.operacao_posicoes p
                                    where p.empresa_id = v_empresa and p.reserva_id = any (g.reservas) and p.unidade = 'bote'
                                      and coalesce(p.precisao, 0) <= 300 and p.registrado_em >= g.bote_em - interval '5 minutes'
                                    order by p.registrado_em desc limit 300) t), '[]'::jsonb)) end,
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
    from comp g
  ), '[]'::jsonb);
end; $function$;

revoke all on function public.eda_trava_vinculo_conta() from public, anon, authenticated;
revoke all on function public.meu_codigo_vinculo_eda() from public, anon;
revoke all on function public.vincular_conta_profissional_eda(text, uuid, text) from public, anon;
revoke all on function public.contas_vinculadas_eda() from public, anon;
revoke all on function public.eda_bordo_reserva(uuid) from public, anon, authenticated;
revoke all on function public.minhas_viagens_guia_eda(integer) from public, anon;
revoke all on function public.minhas_viagens_bordo_eda() from public, anon;
revoke all on function public.registrar_posicoes_operacao_eda(uuid, jsonb) from public, anon;
revoke all on function public.registrar_evento_operacao_eda(uuid, text, text, text, double precision, double precision, timestamptz) from public, anon;
revoke all on function public.operacao_ao_vivo_eda() from public, anon;
grant execute on function public.meu_codigo_vinculo_eda() to authenticated;
grant execute on function public.vincular_conta_profissional_eda(text, uuid, text) to authenticated;
grant execute on function public.contas_vinculadas_eda() to authenticated;
grant execute on function public.minhas_viagens_guia_eda(integer) to authenticated;
grant execute on function public.minhas_viagens_bordo_eda() to authenticated;
grant execute on function public.registrar_posicoes_operacao_eda(uuid, jsonb) to authenticated;
grant execute on function public.registrar_evento_operacao_eda(uuid, text, text, text, double precision, double precision, timestamptz) to authenticated;
grant execute on function public.operacao_ao_vivo_eda() to authenticated;
