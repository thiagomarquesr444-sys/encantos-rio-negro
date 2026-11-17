-- EDA_PACOTE_GRUPO_V1: o visitante pode pedir pela Iara um pacote para grupo fechado.
alter table public.pedidos_visitante add column if not exists tipo text not null default 'individual';
alter table public.pedidos_visitante add column if not exists grupo_origem text;
alter table public.pedidos_visitante drop constraint if exists pedidos_visitante_tipo_check;
alter table public.pedidos_visitante add constraint pedidos_visitante_tipo_check check (tipo in ('individual', 'pacote_grupo') and (grupo_origem is null or char_length(grupo_origem) <= 80));
