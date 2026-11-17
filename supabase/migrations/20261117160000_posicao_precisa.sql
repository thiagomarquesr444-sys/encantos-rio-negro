-- EDA_POSICAO_PRECISA_V1: posição aproximada (sem GPS: computador, Wi-Fi/Starlink, ±500 m)
-- não move o barco nem entra na trilha. Ela vem separada em "aproximada" para a base
-- saber que o aparelho a bordo está sem GPS.
do $$
declare d text := pg_get_functiondef('public.operacao_ao_vivo_eda()'::regprocedure); n text;
begin
  if position('''aproximada''' in d) > 0 then return; end if;
  n := regexp_replace(d,
    'p\.reserva_id = any \(g\.reservas\)\s+order by p\.registrado_em desc limit 1\),',
    'p.reserva_id = any (g.reservas) and coalesce(p.precisao, 0) <= 300
                    order by p.registrado_em desc limit 1),
      ''aproximada'', (select jsonb_build_object(''lat'', p.latitude, ''lng'', p.longitude, ''em'', p.registrado_em, ''precisao'', p.precisao)
                    from public.operacao_posicoes p where p.empresa_id = v_empresa and p.reserva_id = any (g.reservas) and p.precisao > 300
                      and p.registrado_em > coalesce((select max(q.registrado_em) from public.operacao_posicoes q
                            where q.empresa_id = v_empresa and q.reserva_id = any (g.reservas) and coalesce(q.precisao, 0) <= 300), ''-infinity''::timestamptz)
                    order by p.registrado_em desc limit 1),');
  n := regexp_replace(n,
    'p\.reserva_id = any \(g\.reservas\)(\s+)and p\.registrado_em > now\(\)',
    'p.reserva_id = any (g.reservas) and coalesce(p.precisao, 0) <= 300\1and p.registrado_em > now()', 'g');
  if n = d or position('''aproximada''' in n) = 0 then raise exception 'operacao_ao_vivo_eda mudou: revisar migração'; end if;
  execute n;
end $$;
