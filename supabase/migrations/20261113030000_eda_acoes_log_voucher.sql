-- EDA_LOTE2_V1: registro também da emissão de voucher pela EDA (auditoria; não se desfaz pelo arco).
alter table public.eda_acoes_log drop constraint if exists eda_acoes_log_tipo_check;
alter table public.eda_acoes_log add constraint eda_acoes_log_tipo_check
  check (tipo in ('criar', 'alterar', 'lancar', 'baixar', 'demanda', 'voucher'));
