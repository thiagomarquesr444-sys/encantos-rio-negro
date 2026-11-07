-- EDA_FAMILIA_RESERVA_V1
-- Elo cliente x reserva x passeio:
--  * o cliente da reserva entra automaticamente como participante titular;
--  * acompanhantes (esposa, filha...) não precisam virar clientes: só nome,
--    nascimento e relação com o titular;
--  * cada passeio define sua política de crianças (idade + % do valor) e de colo
--    (gratuito). Todos ocupam vaga: a lotação do barco conta pessoas, não pagantes.

alter table public.passeios
  add column if not exists crianca_idade_max smallint,
  add column if not exists crianca_percentual numeric(5,2),
  add column if not exists colo_idade_max smallint;
alter table public.passeios drop constraint if exists passeios_politica_criancas_check;
alter table public.passeios add constraint passeios_politica_criancas_check check (
  (crianca_idade_max is null or crianca_idade_max between 1 and 17)
  and (crianca_percentual is null or crianca_percentual between 0 and 100)
  and (colo_idade_max is null or colo_idade_max between 0 and 6)
  and (colo_idade_max is null or crianca_idade_max is null or colo_idade_max < crianca_idade_max)
  and ((crianca_idade_max is null) = (crianca_percentual is null))
);

alter table public.reservas
  add column if not exists qtd_criancas integer not null default 0,
  add column if not exists qtd_colo integer not null default 0;
alter table public.reservas drop constraint if exists reservas_faixas_check;
alter table public.reservas add constraint reservas_faixas_check check (
  qtd_criancas >= 0 and qtd_colo >= 0 and qtd_criancas + qtd_colo <= greatest(coalesce(quantidade_pessoas, 1), 1)
) not valid;

alter table public.reserva_participantes add column if not exists relacao text;
alter table public.reserva_participantes drop constraint if exists reserva_participantes_relacao_check;
alter table public.reserva_participantes add constraint reserva_participantes_relacao_check check (
  relacao is null or relacao in ('titular','conjuge','filho','pai_mae','irmao','parente','amigo','colega','outro')
);

-- Titular automático a partir do cliente da reserva.
-- Nunca bloqueia a reserva: se já estiver cheia de participantes, não insere.
create or replace function public.eda_titular_reserva()
returns trigger language plpgsql security definer set search_path = public as $$
declare c record; v_part uuid; v_total integer;
begin
  if new.cliente_id is null then return null; end if;
  if tg_op = 'UPDATE' and new.cliente_id is not distinct from old.cliente_id then return null; end if;
  select id, nome, data_nascimento, documento into c from public.clientes
   where id = new.cliente_id and empresa_id = new.empresa_id;
  if not found then return null; end if;

  select id into v_part from public.reserva_participantes where reserva_id = new.id and cliente_id = c.id limit 1;
  if v_part is null then
    select id into v_part from public.reserva_participantes where reserva_id = new.id and titular and cliente_id is null limit 1;
  end if;

  -- Libera o índice único de titular antes de marcar o novo.
  update public.reserva_participantes set titular = false,
    relacao = case when relacao = 'titular' then null else relacao end
   where reserva_id = new.id and titular and id is distinct from v_part;

  if v_part is not null then
    update public.reserva_participantes set cliente_id = c.id, titular = true, relacao = 'titular',
      nome = case when cliente_id is null then c.nome else nome end,
      data_nascimento = coalesce(data_nascimento, c.data_nascimento), documento = coalesce(documento, c.documento)
     where id = v_part;
  else
    select count(*) into v_total from public.reserva_participantes where reserva_id = new.id;
    if v_total < greatest(coalesce(new.quantidade_pessoas, 1), 1) then
      insert into public.reserva_participantes (empresa_id, reserva_id, cliente_id, nome, data_nascimento, documento, titular, relacao)
      values (new.empresa_id, new.id, c.id, c.nome, c.data_nascimento, c.documento, true, 'titular');
    end if;
  end if;
  return null;
end $$;
revoke all on function public.eda_titular_reserva() from public, anon, authenticated;
drop trigger if exists zzzz_eda_titular_reserva on public.reservas;
create trigger zzzz_eda_titular_reserva after insert or update of cliente_id on public.reservas
  for each row execute function public.eda_titular_reserva();

-- Backfill: dispara o mesmo fluxo nas reservas com cliente e sem titular ligado a ele.
create temporary table _eda_backfill on commit drop as
  select res.id, res.cliente_id from public.reservas res
   where res.cliente_id is not null
     and not exists (select 1 from public.reserva_participantes p where p.reserva_id = res.id and p.cliente_id = res.cliente_id);
alter table public.reservas disable trigger user;
update public.reservas r set cliente_id = null from _eda_backfill b where r.id = b.id;
alter table public.reservas enable trigger user;
alter table public.reservas disable trigger user;
alter table public.reservas enable trigger zzzz_eda_titular_reserva;
update public.reservas r set cliente_id = b.cliente_id from _eda_backfill b where r.id = b.id;
alter table public.reservas enable trigger user;
