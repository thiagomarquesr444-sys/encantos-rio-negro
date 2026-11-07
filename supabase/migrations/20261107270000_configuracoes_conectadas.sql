-- EDA_CONFIGURACOES_CONECTADAS_V1
-- As configurações deixam de ser decorativas:
-- * antecedência mínima e "reservas no mesmo dia" filtram as saídas que o
--   portal e o Concierge oferecem;
-- * % de sinal alimenta o botão "Sinal" nos pagamentos da reserva.

create or replace function public.eda_saida_vendavel(p_saida public.passeio_saidas)
returns boolean language sql stable security definer set search_path = public as $$
  select p_saida.status = 'aberta'
    and ((p_saida.data_inicio + coalesce(p_saida.horario, time '08:00')) at time zone 'America/Manaus')
        > now() + make_interval(hours => coalesce(c.antecedencia_minima_horas, 0))
    and (coalesce(c.permitir_reservas_mesmo_dia, true)
         or p_saida.data_inicio > (now() at time zone 'America/Manaus')::date)
  from (select 1) x
  left join public.configuracoes c on c.empresa_id = p_saida.empresa_id;
$$;
revoke all on function public.eda_saida_vendavel(public.passeio_saidas) from public, anon, authenticated;

create or replace function public.disponibilidade_passeio_eda(p_passeio_id uuid, p_de date default null, p_ate date default null)
returns table (saida_id uuid, data_inicio date, data_fim date, horario time, vagas_total integer, vagas_restantes integer)
language sql stable security definer set search_path = public as $$
  with hoje as (select (now() at time zone 'America/Manaus')::date as d)
  select s.id, s.data_inicio, s.data_fim, s.horario, s.vagas_total, greatest(s.vagas_total - public.eda_vagas_ocupadas_saida(s.id), 0)
  from public.passeio_saidas s
  join public.passeios ps on ps.id = s.passeio_id
  join public.perfis_publicos pp on pp.empresa_id = ps.empresa_id and pp.origem_tipo = 'empresa' and pp.categoria = 'operadora' and pp.publicado
  , hoje
  where s.passeio_id = p_passeio_id and ps.publicado_portal and ps.situacao = 'Ativo' and public.eda_saida_vendavel(s)
    and s.data_inicio >= greatest(coalesce(p_de, hoje.d), hoje.d) and s.data_inicio <= least(coalesce(p_ate, hoje.d + 365), hoje.d + 365)
  order by s.data_inicio, s.horario nulls first limit 60;
$$;

create or replace function public.passeios_publicos_eda(p_slug text default null)
returns table (id uuid, nome text, categoria text, cidade text, duracao text, preco numeric, vagas integer, descricao text, fotos text[], destaque boolean, situacao text, criado_em timestamptz, operadora_slug text, operadora_nome text, operadora_logo text, operadora_whatsapp text, operadora_verificada boolean, slug text, preco_modalidade text, capacidade_minima integer, duracao_dias integer, duracao_horas numeric, idiomas text[], inclui text[], nao_inclui text[], ponto_embarque text, proxima_saida date, proxima_saida_vagas integer, saidas_abertas integer)
language sql stable security definer set search_path = public as $$
  with hoje as (select (now() at time zone 'America/Manaus')::date as d),
  saidas as (select s.passeio_id, s.data_inicio, greatest(s.vagas_total - public.eda_vagas_ocupadas_saida(s.id), 0) as restantes
    from public.passeio_saidas s, hoje where s.data_inicio >= hoje.d and public.eda_saida_vendavel(s)),
  resumo as (select passeio_id, min(data_inicio) filter (where restantes > 0) as proxima, count(*) filter (where restantes > 0)::integer as abertas from saidas group by passeio_id)
  select ps.id, ps.nome, ps.categoria, ps.cidade, ps.duracao,
    case when ps.preco_modalidade = 'sob_consulta' then null else ps.valor end,
    ps.vagas, ps.descricao, ps.fotos, coalesce(ps.destaque, false), ps.situacao, ps.created_at,
    pp.slug, pp.nome_publico, pp.logo_url, pp.whatsapp, pp.verificado,
    ps.slug, ps.preco_modalidade, ps.capacidade_minima, ps.duracao_dias, ps.duracao_horas, ps.idiomas, ps.inclui, ps.nao_inclui, ps.ponto_embarque,
    r.proxima, (select max(sa.restantes) from saidas sa where sa.passeio_id = ps.id and sa.data_inicio = r.proxima)::integer, coalesce(r.abertas, 0)
  from public.passeios ps
  join public.perfis_publicos pp on pp.empresa_id = ps.empresa_id and pp.origem_tipo = 'empresa' and pp.categoria = 'operadora' and pp.publicado
  left join resumo r on r.passeio_id = ps.id
  where ps.publicado_portal and ps.situacao in ('Ativo', 'Em Breve') and (p_slug is null or pp.slug = p_slug)
  order by coalesce(ps.destaque, false) desc, (r.proxima is null), r.proxima, ps.created_at desc limit 200;
$$;

-- Configurações que a equipe usa no dia a dia (sem expor dados sensíveis).
create or replace function public.config_operacao_eda()
returns jsonb language sql stable security definer set search_path = public as $$
  select jsonb_build_object(
    'porcentagem_sinal', coalesce(c.porcentagem_sinal, 0),
    'antecedencia_minima_horas', coalesce(c.antecedencia_minima_horas, 0),
    'permitir_reservas_mesmo_dia', coalesce(c.permitir_reservas_mesmo_dia, true))
  from (select public.eda_empresa_equipe() as e) x
  left join public.configuracoes c on c.empresa_id = x.e
  where x.e is not null;
$$;
revoke all on function public.config_operacao_eda() from public, anon;
grant execute on function public.config_operacao_eda() to authenticated;
