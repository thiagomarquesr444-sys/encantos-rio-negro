-- EDA_SAIDA_HISTORICO_V1: saída que partiu (horário passou ou houve check-in)
-- sai da venda; passeio sem nova saída vai para o Histórico da operadora e
-- some do portal público. Passeio com outra data futura continua no catálogo.

create or replace function public.eda_saida_partiu(p_saida public.passeio_saidas)
returns boolean language sql stable security definer set search_path = public as $$
  select ((p_saida.data_inicio + coalesce(p_saida.horario, time '08:00')) at time zone 'America/Manaus') <= now()
    or exists (
      select 1 from public.vouchers v
      join public.reservas r on r.id = v.reserva_id
      where r.saida_id = p_saida.id and v.utilizado_em is not null
    );
$$;
revoke all on function public.eda_saida_partiu(public.passeio_saidas) from public, anon, authenticated;

create or replace function public.eda_saida_vendavel(p_saida public.passeio_saidas)
returns boolean language sql stable security definer set search_path = public as $$
  select p_saida.status = 'aberta'
    and ((p_saida.data_inicio + coalesce(p_saida.horario, time '08:00')) at time zone 'America/Manaus')
        > now() + make_interval(hours => coalesce(c.antecedencia_minima_horas, 0))
    and (coalesce(c.permitir_reservas_mesmo_dia, true)
         or p_saida.data_inicio > (now() at time zone 'America/Manaus')::date)
    and not public.eda_saida_partiu(p_saida)
  from (select 1) x
  left join public.configuracoes c on c.empresa_id = p_saida.empresa_id;
$$;

-- Encerrado = já teve saída que partiu e não tem nenhuma saída ativa por vir.
create or replace function public.eda_passeio_encerrado(p_passeio uuid)
returns boolean language sql stable security definer set search_path = public as $$
  select exists (select 1 from public.passeio_saidas s
                 where s.passeio_id = p_passeio and s.status <> 'cancelada' and public.eda_saida_partiu(s))
     and not exists (select 1 from public.passeio_saidas s
                 where s.passeio_id = p_passeio and s.status <> 'cancelada' and not public.eda_saida_partiu(s));
$$;
revoke all on function public.eda_passeio_encerrado(uuid) from public, anon, authenticated;

-- Gestão: passeios encerrados da empresa de quem pergunta (nunca de outra empresa).
create or replace function public.eda_passeios_encerrados()
returns table (passeio_id uuid, ultima_saida date)
language sql stable security definer set search_path = public as $$
  select ps.id, (select max(s.data_inicio) from public.passeio_saidas s where s.passeio_id = ps.id and s.status <> 'cancelada')
  from public.passeios ps
  where ps.empresa_id = (select p.empresa_id from public.perfis p where p.id = auth.uid())
    and public.eda_passeio_encerrado(ps.id);
$$;
revoke all on function public.eda_passeios_encerrados() from public, anon;
grant execute on function public.eda_passeios_encerrados() to authenticated;

create or replace function public.passeios_publicos_eda(p_slug text default null)
returns table(id uuid, nome text, categoria text, cidade text, duracao text, preco numeric, vagas integer, descricao text, fotos text[], destaque boolean, situacao text, criado_em timestamptz, operadora_slug text, operadora_nome text, operadora_logo text, operadora_whatsapp text, operadora_verificada boolean, slug text, preco_modalidade text, capacidade_minima integer, duracao_dias integer, duracao_horas numeric, idiomas text[], inclui text[], nao_inclui text[], ponto_embarque text, proxima_saida date, proxima_saida_vagas integer, saidas_abertas integer)
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
    and not public.eda_passeio_encerrado(ps.id)
  order by coalesce(ps.destaque, false) desc, (r.proxima is null), r.proxima, ps.created_at desc limit 200;
$$;
