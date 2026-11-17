-- EDA_LOGISTICA_PASSEIO_V1: embarque (coordenadas) e nome do destino ficam no cadastro do passeio.
-- A Operação ao vivo passa a ler embarque, destino e percurso direto do passeio.
alter table public.passeios add column if not exists embarque_lat double precision;
alter table public.passeios add column if not exists embarque_lng double precision;
alter table public.passeios add column if not exists destino_nome text;

alter table public.passeios drop constraint if exists passeios_logistica_valida;
alter table public.passeios add constraint passeios_logistica_valida check (
  (embarque_lat is null or embarque_lat between -90 and 90)
  and (embarque_lng is null or embarque_lng between -180 and 180)
  and (latitude is null or latitude between -90 and 90)
  and (longitude is null or longitude between -180 and 180)
  and (destino_nome is null or length(destino_nome) <= 120)
  and (ponto_embarque is null or length(ponto_embarque) <= 200)
) not valid;

-- Atualiza a Operação ao vivo sem reescrever o resto da função.
do $$
declare d text := pg_get_functiondef('public.operacao_ao_vivo_eda()'::regprocedure);
begin
  if position('embarque_pos' in d) > 0 then return; end if;
  if position('ps.nome as dest_nome, ps.ponto_embarque' in d) = 0 or position('''embarque'', g.ponto_embarque,' in d) = 0 then
    raise exception 'operacao_ao_vivo_eda mudou: revisar migração';
  end if;
  d := replace(d, 'ps.nome as dest_nome, ps.ponto_embarque',
    'coalesce(nullif(btrim(ps.destino_nome), ''''), ps.nome) as dest_nome, ps.ponto_embarque, ps.embarque_lat, ps.embarque_lng');
  d := replace(d, '''embarque'', g.ponto_embarque,',
    '''embarque'', g.ponto_embarque, ''embarque_pos'', case when g.embarque_lat is not null and g.embarque_lng is not null then jsonb_build_object(''lat'', g.embarque_lat, ''lng'', g.embarque_lng) end,');
  execute d;
end $$;
