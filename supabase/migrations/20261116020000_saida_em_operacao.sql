-- EDA_SAIDA_EM_OPERACAO_V1: depois que a embarcação sai, a plataforma inteira
-- trata a saída como "em operação" (até a data de volta) e depois "concluída".
-- O banco trava qualquer mudança de data, vagas, status ou exclusão dessa saída
-- e qualquer nova reserva nela — vale para a tela, para a EDA e para a API.

create or replace function public.eda_fase_saida(p_saida public.passeio_saidas)
returns text language sql stable security definer set search_path = public as $$
  select case
    when p_saida.status = 'cancelada' then 'cancelada'
    when not public.eda_saida_partiu(p_saida) then 'programada'
    when coalesce(p_saida.data_fim, p_saida.data_inicio) >= (now() at time zone 'America/Manaus')::date then 'em_operacao'
    else 'concluida' end;
$$;
revoke all on function public.eda_fase_saida(public.passeio_saidas) from public, anon, authenticated;

create or replace function public.eda_travar_saida_partiu()
returns trigger language plpgsql security definer set search_path = public as $$
begin
  if old.status = 'cancelada' or not public.eda_saida_partiu(old) then
    return case when tg_op = 'DELETE' then old else new end;
  end if;
  if tg_op = 'DELETE' then raise exception 'EDA_SAIDA_EM_OPERACAO: esta saída já partiu e não pode ser excluída.'; end if;
  if new.status is distinct from old.status or new.data_inicio is distinct from old.data_inicio
     or new.data_fim is distinct from old.data_fim or new.horario is distinct from old.horario
     or new.vagas_total is distinct from old.vagas_total then
    raise exception 'EDA_SAIDA_EM_OPERACAO: esta saída já partiu; data, vagas e situação ficam travadas.';
  end if;
  return new;
end; $$;
drop trigger if exists a_eda_travar_saida_partiu on public.passeio_saidas;
create trigger a_eda_travar_saida_partiu before update or delete on public.passeio_saidas
  for each row execute function public.eda_travar_saida_partiu();

create or replace function public.eda_reserva_saida_partiu()
returns trigger language plpgsql security definer set search_path = public as $$
declare v public.passeio_saidas;
begin
  if new.saida_id is null or lower(coalesce(new.status, '')) = 'cancelada' then return new; end if;
  if tg_op = 'UPDATE' and new.saida_id is not distinct from old.saida_id then return new; end if;
  select * into v from public.passeio_saidas where id = new.saida_id;
  if found and v.status <> 'cancelada' and public.eda_saida_partiu(v) then
    raise exception 'EDA_SAIDA_EM_OPERACAO: esta saída já partiu; escolha outra data.';
  end if;
  return new;
end; $$;
drop trigger if exists zz_eda_vz_reserva_saida_partiu on public.reservas;
create trigger zz_eda_vz_reserva_saida_partiu before insert or update on public.reservas
  for each row execute function public.eda_reserva_saida_partiu();

-- Fase + pessoas a bordo (check-in feito) das saídas da empresa de quem pergunta.
create or replace function public.eda_saidas_operacao(p_ids uuid[])
returns table (saida_id uuid, fase text, a_bordo integer)
language sql stable security definer set search_path = public as $$
  select s.id, public.eda_fase_saida(s),
    coalesce((select sum(greatest(coalesce(r.quantidade_pessoas, 1), 1))::integer
              from public.reservas r
              where r.saida_id = s.id and lower(coalesce(r.status, '')) <> 'cancelada'
                and exists (select 1 from public.vouchers v where v.reserva_id = r.id and v.utilizado_em is not null)), 0)
  from public.passeio_saidas s
  where s.id = any(p_ids)
    and s.empresa_id = (select p.empresa_id from public.perfis p where p.id = auth.uid());
$$;
revoke all on function public.eda_saidas_operacao(uuid[]) from public, anon;
grant execute on function public.eda_saidas_operacao(uuid[]) to authenticated;
