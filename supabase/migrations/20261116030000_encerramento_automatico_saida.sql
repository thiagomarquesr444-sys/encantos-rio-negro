-- EDA_ENCERRAMENTO_AUTO_V1: quando a embarcação volta (data de volta passou),
-- as reservas confirmadas daquela saída são encerradas pela plataforma:
--  * com check-in feito  -> Concluída
--  * saída sem nenhum check-in registrado (operadora não usou o check-in) -> Concluída
--  * saída COM check-ins, mas esta reserva sem check-in -> fica Confirmada e a
--    EDA pede ao operador para decidir (Concluída ou Não compareceu). Nunca
--    marcamos "Não compareceu" sozinhos.
-- Não cria, altera nem apaga lançamentos financeiros: só muda a situação da
-- reserva pelas mesmas regras do encerramento manual (ern_validar_encerramento_reserva).

create or replace function public.eda_encerrar_saidas_auto()
returns integer language plpgsql security definer set search_path = public as $$
declare v_total integer := 0; v_n integer;
begin
  with alvo as (
    select r.id
    from public.reservas r
    join public.passeio_saidas s on s.id = r.saida_id
    where lower(btrim(coalesce(r.status, ''))) = 'confirmada'
      and public.eda_fase_saida(s) = 'concluida'
      and r.data_reserva <= (now() at time zone 'America/Manaus')::date
      and (
        exists (select 1 from public.vouchers v where v.reserva_id = r.id and v.utilizado_em is not null)
        or not exists (select 1 from public.reservas r2 join public.vouchers v2 on v2.reserva_id = r2.id
                       where r2.saida_id = s.id and v2.utilizado_em is not null)
      )
    for update of r skip locked
  )
  update public.reservas r set status = 'Concluída' from alvo where r.id = alvo.id;
  get diagnostics v_n = row_count;
  v_total := v_total + v_n;
  return v_total;
end; $$;
revoke all on function public.eda_encerrar_saidas_auto() from public, anon, authenticated;

-- Reservas que a EDA precisa levar ao operador (empresa de quem pergunta).
create or replace function public.eda_reservas_aguardando_encerramento()
returns table (reserva_id uuid, cliente text, passeio text, data_reserva date, situacao text, motivo text)
language sql stable security definer set search_path = public as $$
  select r.id, r.cliente, ps.nome, r.data_reserva, r.status,
    case when lower(btrim(coalesce(r.status, ''))) = 'pendente'
         then 'pendente quando a embarcação saiu'
         else 'sem check-in numa saída que teve check-in' end
  from public.reservas r
  join public.passeio_saidas s on s.id = r.saida_id
  left join public.passeios ps on ps.id = r.passeio_id
  where r.empresa_id = (select p.empresa_id from public.perfis p where p.id = auth.uid())
    and lower(btrim(coalesce(r.status, ''))) in ('confirmada', 'pendente')
    and public.eda_fase_saida(s) = 'concluida'
  order by r.data_reserva desc
  limit 50;
$$;
revoke all on function public.eda_reservas_aguardando_encerramento() from public, anon;
grant execute on function public.eda_reservas_aguardando_encerramento() to authenticated;

select cron.unschedule('eda_encerrar_saidas_auto') where exists (select 1 from cron.job where jobname = 'eda_encerrar_saidas_auto');
select cron.schedule('eda_encerrar_saidas_auto', '*/15 * * * *', 'select public.eda_encerrar_saidas_auto()');
