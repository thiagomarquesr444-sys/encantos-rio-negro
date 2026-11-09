-- EDA_IARA_FUNIL_V1: métricas do funil da Iara, sem dados pessoais nem texto
-- das conversas. Cada visita tem um identificador aleatório (HMAC no servidor).
-- Gravação só pelo servidor; leitura agregada por RPC:
--   * administração (tem_acesso_editorial_ern): visão geral de toda a plataforma;
--   * operadora: somente o funil dos próprios passeios.

create table if not exists public.iara_eventos (
  sessao text not null check (char_length(sessao) between 16 and 128),
  etapa text not null check (etapa in ('conversa','inspiracao','qualificacao','proposta','fechamento','pedido')),
  empresa_id uuid references public.empresa(id) on delete set null,
  passeio_id uuid references public.passeios(id) on delete set null,
  idioma text not null default 'PT',
  criado_em timestamptz not null default now(),
  primary key (sessao, etapa)
);
create index if not exists iara_eventos_tempo_idx on public.iara_eventos (criado_em desc);
create index if not exists iara_eventos_empresa_idx on public.iara_eventos (empresa_id, criado_em desc);
alter table public.iara_eventos enable row level security;
revoke all on table public.iara_eventos from public, anon, authenticated;

create or replace function public.funil_iara_eda(p_dias integer default 30, p_geral boolean default false)
returns table (etapa text, total integer, passeio text, idioma text)
language plpgsql stable security definer set search_path = public as $$
declare
  v_empresa uuid := (select p.empresa_id from public.perfis p where p.id = auth.uid());
  v_geral boolean := coalesce(p_geral, false) and public.tem_acesso_editorial_ern();
  v_desde timestamptz := now() - make_interval(days => least(greatest(coalesce(p_dias, 30), 1), 365));
begin
  if auth.uid() is null or (not v_geral and v_empresa is null) then
    raise exception 'Sem acesso.';
  end if;
  return query
    select e.etapa, count(*)::int, coalesce(ps.nome, '—'), e.idioma
    from public.iara_eventos e
    left join public.passeios ps on ps.id = e.passeio_id
    where e.criado_em >= v_desde and (v_geral or e.empresa_id = v_empresa)
    group by 1, 3, 4;
end $$;
revoke all on function public.funil_iara_eda(integer, boolean) from public, anon;
grant execute on function public.funil_iara_eda(integer, boolean) to authenticated;

-- Limpeza: eventos com mais de 13 meses.
create or replace function public.limpar_iara_eventos()
returns void language sql security definer set search_path = public as $$
  delete from public.iara_eventos where criado_em < now() - interval '13 months';
$$;
revoke all on function public.limpar_iara_eventos() from public, anon, authenticated;
grant execute on function public.limpar_iara_eventos() to service_role;
