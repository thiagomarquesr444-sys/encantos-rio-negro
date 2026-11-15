-- EDA_CALENDARIO_V1: Calendário Amazônico da operadora.
-- Bloqueios de agenda (manutenção de barco, folga/férias de guia, hospedagem
-- fechada ou dia sem operação da empresa). O restante do calendário só LÊ o que
-- já existe (saídas, reservas, demandas, financeiro) com as RLS de cada tabela.

create table if not exists public.calendario_bloqueios (
  id uuid primary key default gen_random_uuid(),
  empresa_id uuid not null references public.empresa(id) on delete cascade,
  recurso_tipo text not null,
  recurso_id uuid,
  inicio date not null,
  fim date not null,
  motivo text not null default 'outro',
  observacao text,
  criado_por uuid default auth.uid(),
  criado_em timestamptz not null default now(),
  atualizado_em timestamptz not null default now(),
  constraint cal_bloq_tipo_check check (recurso_tipo in ('embarcacao', 'guia', 'hospedagem', 'empresa')),
  constraint cal_bloq_recurso_check check ((recurso_tipo = 'empresa') = (recurso_id is null)),
  constraint cal_bloq_motivo_check check (motivo in ('manutencao', 'folga', 'ferias', 'fechado', 'evento', 'outro')),
  constraint cal_bloq_datas_check check (fim >= inicio and fim - inicio <= 366),
  constraint cal_bloq_obs_check check (observacao is null or char_length(observacao) <= 300)
);

create index if not exists cal_bloq_empresa_periodo_idx on public.calendario_bloqueios (empresa_id, inicio, fim);

-- A empresa vem sempre do perfil de quem grava (nunca do navegador) e o recurso
-- precisa ser da mesma empresa.
create or replace function public.eda_preparar_bloqueio()
returns trigger language plpgsql security definer set search_path = public as $$
declare v_empresa uuid := public.eda_empresa_equipe(); v_ok boolean := true;
begin
  if v_empresa is null then raise exception 'Sem acesso.' using errcode = '42501'; end if;
  if tg_op = 'UPDATE' and old.empresa_id <> v_empresa then raise exception 'Sem acesso.' using errcode = '42501'; end if;
  new.empresa_id := v_empresa;
  if new.recurso_tipo = 'embarcacao' then
    select exists (select 1 from public.embarcacoes e where e.id = new.recurso_id and e.empresa_id = v_empresa) into v_ok;
  elsif new.recurso_tipo = 'guia' then
    select exists (select 1 from public.guias g where g.id = new.recurso_id and g.empresa_id = v_empresa) into v_ok;
  elsif new.recurso_tipo = 'hospedagem' then
    select exists (select 1 from public.hospedagens h where h.id = new.recurso_id and h.empresa_id = v_empresa) into v_ok;
  end if;
  if not v_ok then raise exception 'EDA_BLOQUEIO_RECURSO: recurso não pertence à empresa.'; end if;
  if tg_op = 'INSERT' then new.criado_por := auth.uid(); new.criado_em := now(); end if;
  new.atualizado_em := now();
  return new;
end; $$;
revoke all on function public.eda_preparar_bloqueio() from public, anon, authenticated;

drop trigger if exists trg_eda_preparar_bloqueio on public.calendario_bloqueios;
create trigger trg_eda_preparar_bloqueio before insert or update on public.calendario_bloqueios
  for each row execute function public.eda_preparar_bloqueio();

-- Atualiza as telas abertas da empresa (useAoVivoEDA).
drop trigger if exists zz_eda_sinal on public.calendario_bloqueios;
create trigger zz_eda_sinal after insert or update or delete on public.calendario_bloqueios
  for each row execute function public.eda_sinalizar();

alter table public.calendario_bloqueios enable row level security;
revoke all on public.calendario_bloqueios from anon;
grant select, insert, update, delete on public.calendario_bloqueios to authenticated;

drop policy if exists cal_bloq_select on public.calendario_bloqueios;
drop policy if exists cal_bloq_insert on public.calendario_bloqueios;
drop policy if exists cal_bloq_update on public.calendario_bloqueios;
drop policy if exists cal_bloq_delete on public.calendario_bloqueios;
drop policy if exists cal_bloq_equipe on public.calendario_bloqueios;
drop policy if exists cal_bloq_modulo on public.calendario_bloqueios;
drop policy if exists cal_bloq_mfa on public.calendario_bloqueios;

create policy cal_bloq_select on public.calendario_bloqueios for select to authenticated
  using (empresa_id = (select p.empresa_id from public.perfis p where p.id = (select auth.uid())));
create policy cal_bloq_insert on public.calendario_bloqueios for insert to authenticated
  with check (empresa_id = (select p.empresa_id from public.perfis p where p.id = (select auth.uid())));
create policy cal_bloq_update on public.calendario_bloqueios for update to authenticated
  using (empresa_id = (select p.empresa_id from public.perfis p where p.id = (select auth.uid())))
  with check (empresa_id = (select p.empresa_id from public.perfis p where p.id = (select auth.uid())));
create policy cal_bloq_delete on public.calendario_bloqueios for delete to authenticated
  using (empresa_id = (select p.empresa_id from public.perfis p where p.id = (select auth.uid())));

create policy cal_bloq_equipe on public.calendario_bloqueios as restrictive for all to authenticated
  using (exists (select 1 from public.perfis p where p.id = (select auth.uid()) and p.empresa_id is not null
    and p.role = any (array['admin_empresa','operador_empresa','financeiro','admin_plataforma'])))
  with check (exists (select 1 from public.perfis p where p.id = (select auth.uid()) and p.empresa_id is not null
    and p.role = any (array['admin_empresa','operador_empresa','financeiro','admin_plataforma'])));
create policy cal_bloq_modulo on public.calendario_bloqueios as restrictive for all to authenticated
  using ((select public.ern_pode_acessar_modulo('reservas')))
  with check ((select public.ern_pode_acessar_modulo('reservas')));
create policy cal_bloq_mfa on public.calendario_bloqueios as restrictive for all to authenticated
  using ((select public.eda_aal_ok())) with check ((select public.eda_aal_ok()));
