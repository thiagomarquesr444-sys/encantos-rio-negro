-- EDA_LOCAL_MAPA_V1: ponto no mapa escolhido na busca de localização.
alter table public.hospedagens add column if not exists latitude double precision, add column if not exists longitude double precision;
alter table public.parceiros   add column if not exists latitude double precision, add column if not exists longitude double precision;
alter table public.passeios    add column if not exists latitude double precision, add column if not exists longitude double precision;
alter table public.demandas    add column if not exists latitude double precision, add column if not exists longitude double precision;
do $$
declare t text;
begin
  foreach t in array array['hospedagens','parceiros','passeios','demandas'] loop
    execute format('alter table public.%I drop constraint if exists %I', t, t || '_coords_check');
    execute format('alter table public.%I add constraint %I check ((latitude is null and longitude is null) or (latitude between -90 and 90 and longitude between -180 and 180))', t, t || '_coords_check');
  end loop;
end $$;
