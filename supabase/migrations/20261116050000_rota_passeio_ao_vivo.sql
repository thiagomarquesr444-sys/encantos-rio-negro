-- EDA_ROTA_PASSEIO_V1: percurso planejado do passeio (traçado pelo rio, com paradas previstas)
-- e posições recentes com horário, para a Operação ao vivo mostrar a rota completa e a EDA
-- avisar quando a embarcação está parada fora do previsto, fora do percurso ou atrasada.
-- Formato de passeios.rota:
--   {"pontos": [[lat,lng], ...], "paradas": [{"lat":..,"lng":..,"nome":"..","minutos":30}], "velocidade_kmh": 20}

alter table public.passeios add column if not exists rota jsonb;

create or replace function public.eda_rota_valida(p jsonb)
returns boolean language plpgsql immutable set search_path = public as $$
declare x jsonb;
begin
  if p is null then return true; end if;
  if jsonb_typeof(p) <> 'object' or jsonb_typeof(p->'pontos') <> 'array' then return false; end if;
  if jsonb_array_length(p->'pontos') > 600 then return false; end if;
  for x in select * from jsonb_array_elements(p->'pontos') loop
    if jsonb_typeof(x) <> 'array' or jsonb_array_length(x) <> 2
       or jsonb_typeof(x->0) <> 'number' or jsonb_typeof(x->1) <> 'number'
       or abs((x->>0)::numeric) > 90 or abs((x->>1)::numeric) > 180 then return false; end if;
  end loop;
  if p ? 'paradas' then
    if jsonb_typeof(p->'paradas') <> 'array' or jsonb_array_length(p->'paradas') > 40 then return false; end if;
    for x in select * from jsonb_array_elements(p->'paradas') loop
      if jsonb_typeof(x) <> 'object' or jsonb_typeof(x->'lat') <> 'number' or jsonb_typeof(x->'lng') <> 'number'
         or abs((x->>'lat')::numeric) > 90 or abs((x->>'lng')::numeric) > 180
         or length(coalesce(x->>'nome', '')) > 80 then return false; end if;
    end loop;
  end if;
  if p ? 'velocidade_kmh' and (jsonb_typeof(p->'velocidade_kmh') <> 'number'
     or (p->>'velocidade_kmh')::numeric not between 3 and 120) then return false; end if;
  return true;
end; $$;

alter table public.passeios drop constraint if exists passeios_rota_valida;
alter table public.passeios add constraint passeios_rota_valida check (public.eda_rota_valida(rota));

-- Operação ao vivo: + passeio_id, rota planejada, destino do passeio e posições recentes com horário.
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
      select g.*, ps.id as passeio_id, ps.rota, ps.latitude as dest_lat, ps.longitude as dest_lng, ps.nome as dest_nome, ps.ponto_embarque
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
      'recentes', coalesce((select jsonb_agg(jsonb_build_array(t.latitude, t.longitude, t.registrado_em) order by t.registrado_em)
                    from (select latitude, longitude, registrado_em from public.operacao_posicoes p
                          where p.empresa_id = v_empresa and p.reserva_id = any (g.reservas)
                            and p.registrado_em > now() - interval '6 hours'
                          order by p.registrado_em desc limit 150) t), '[]'::jsonb),
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
