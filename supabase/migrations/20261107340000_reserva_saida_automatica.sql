-- EDA_RESERVA_COESA_V1
-- Fecha a brecha da "data avulsa": reserva de um passeio numa data em que existe
-- saída cadastrada é ligada automaticamente a essa saída, e o controle de vagas
-- vale (antes, sem saida_id, o banco não conferia lotação).
create or replace function public.eda_validar_saida_reserva()
 returns trigger
 language plpgsql
 security definer
 set search_path to 'public'
as $function$
declare v_saida public.passeio_saidas%rowtype; v_ocupadas integer; v_pessoas integer;
begin
  if new.saida_id is null and new.passeio_id is not null and new.data_reserva is not null
     and lower(coalesce(new.status, '')) <> 'cancelada'
     and (tg_op = 'INSERT' or new.data_reserva is distinct from old.data_reserva or new.passeio_id is distinct from old.passeio_id) then
    select s.id into new.saida_id from public.passeio_saidas s
     where s.passeio_id = new.passeio_id and s.empresa_id = new.empresa_id
       and s.data_inicio = new.data_reserva and s.status <> 'cancelada'
     order by s.horario nulls last limit 1;
  end if;
  if new.saida_id is null then return new; end if;
  if tg_op = 'UPDATE' and new.saida_id is not distinct from old.saida_id and new.quantidade_pessoas is not distinct from old.quantidade_pessoas
     and lower(coalesce(new.status, '')) is not distinct from lower(coalesce(old.status, '')) then return new; end if;
  select * into v_saida from public.passeio_saidas where id = new.saida_id for update;
  if not found or v_saida.empresa_id is distinct from new.empresa_id then raise exception 'A saída selecionada não pertence a esta empresa.'; end if;
  if new.passeio_id is null then new.passeio_id := v_saida.passeio_id;
  elsif new.passeio_id <> v_saida.passeio_id then raise exception 'A saída selecionada é de outro passeio.'; end if;
  if new.data_reserva is null or new.data_reserva <> v_saida.data_inicio then new.data_reserva := v_saida.data_inicio; end if;
  if new.horario is null then new.horario := v_saida.horario; end if;
  if new.data_fim_prevista is null and v_saida.data_fim is not null then new.data_fim_prevista := v_saida.data_fim; end if;
  if lower(coalesce(new.status, '')) = 'cancelada' then return new; end if;
  if v_saida.status <> 'aberta' and (tg_op = 'INSERT' or new.saida_id is distinct from old.saida_id) then raise exception 'Esta saída não está aberta para novas reservas.'; end if;
  v_pessoas := greatest(coalesce(new.quantidade_pessoas, 1), 1);
  v_ocupadas := public.eda_vagas_ocupadas_saida(new.saida_id, new.id);
  if v_ocupadas + v_pessoas > v_saida.vagas_total then raise exception 'EDA_SAIDA_LOTADA: restam % vaga(s) nesta saída.', greatest(v_saida.vagas_total - v_ocupadas, 0); end if;
  return new;
end; $function$;
