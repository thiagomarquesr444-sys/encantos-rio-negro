-- EDA_FILA_OFFLINE_V1: check-in feito sem internet no porto e enviado depois.
-- Mesmas regras e permissões do check-in normal (marcar_voucher_utilizado_eda),
-- mas registra o horário real em que o operador conferiu o turista.
-- Segurança: o horário informado é limitado entre 48 h atrás e agora
-- (ninguém consegue registrar embarque no futuro ou com data antiga demais).
create or replace function public.marcar_voucher_utilizado_offline_eda(p_voucher_id uuid, p_utilizado_em timestamptz)
returns void language plpgsql security definer set search_path = public as $$
declare
  v_empresa uuid := public.eda_voucher_operador();
  v public.vouchers;
  v_quando timestamptz := greatest(now() - interval '48 hours', least(now(), coalesce(p_utilizado_em, now())));
begin
  select * into v from public.vouchers where id = p_voucher_id and empresa_id = v_empresa for update;
  if v.id is null then raise exception 'Voucher não encontrado.'; end if;
  if lower(coalesce(v.status, '')) = 'cancelado' then raise exception 'EDA_VOUCHER_CANCELADO'; end if;
  if lower(coalesce(v.status, '')) in ('substituído', 'substituido') then raise exception 'EDA_VOUCHER_SUBSTITUIDO'; end if;
  if v.utilizado_em is not null then raise exception 'EDA_VOUCHER_JA_UTILIZADO'; end if;
  perform set_config('eda.voucher_interno', '1', true);
  update public.vouchers set status = 'Utilizado', utilizado_em = v_quando, utilizado_por = auth.uid() where id = v.id;
  perform set_config('eda.voucher_interno', '', true);
end; $$;
revoke all on function public.marcar_voucher_utilizado_offline_eda(uuid, timestamptz) from public, anon;
grant execute on function public.marcar_voucher_utilizado_offline_eda(uuid, timestamptz) to authenticated;
