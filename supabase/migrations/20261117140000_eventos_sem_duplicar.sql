-- EDA_OPERACAO_AO_VIVO_V2: a mesma etapa (embarque, partida, parada, chegada, retorno, resolvido)
-- registrada de novo na mesma viagem em até 3 minutos não duplica a linha do tempo
-- (toque repetido, dois aparelhos a bordo ou reenvio da fila sem sinal).
create or replace function public.registrar_evento_operacao_eda(
  p_reserva_id uuid, p_tipo text, p_texto text default null, p_gravidade text default null,
  p_lat double precision default null, p_lng double precision default null, p_em timestamptz default null)
returns uuid language plpgsql security definer set search_path = public as $$
declare b record; v_id uuid; v_nome text; v_grav text; v_em timestamptz := least(coalesce(p_em, now()), now());
begin
  select * into b from public.eda_bordo_reserva(p_reserva_id);
  if (now() at time zone 'America/Manaus')::date not between b.inicio - 1 and b.fim + 2 then
    raise exception 'EDA_FORA_DA_VIAGEM';
  end if;
  if p_tipo in ('embarque', 'partida', 'parada', 'chegada', 'retorno', 'resolvido') then
    select ev.id into v_id from public.operacao_eventos ev
     where ev.empresa_id = b.empresa_id and ev.tipo = p_tipo
       and (ev.reserva_id = b.reserva_id or (b.saida_id is not null and ev.saida_id = b.saida_id))
       and ev.registrado_em between v_em - interval '3 minutes' and v_em + interval '3 minutes'
     order by ev.registrado_em desc limit 1;
    if v_id is not null then return v_id; end if;
  end if;
  v_grav := coalesce(p_gravidade, case p_tipo when 'emergencia' then 'grave' when 'ocorrencia' then 'atencao' when 'suprimento' then 'atencao' else 'info' end);
  select coalesce(nullif(btrim(p.nome), ''), (select g.nome from public.guias g where g.usuario_id = auth.uid() limit 1), 'Equipe')
    into v_nome from public.perfis p where p.id = auth.uid();
  insert into public.operacao_eventos (empresa_id, reserva_id, saida_id, autor_id, autor_nome, tipo, gravidade, texto, latitude, longitude, registrado_em)
  values (b.empresa_id, b.reserva_id, b.saida_id, auth.uid(), coalesce(v_nome, 'Equipe'), p_tipo, v_grav,
          nullif(left(btrim(coalesce(p_texto, '')), 500), ''),
          case when p_lat between -90 and 90 then p_lat end, case when p_lng between -180 and 180 then p_lng end,
          v_em)
  returning id into v_id;
  return v_id;
end; $$;

revoke all on function public.registrar_evento_operacao_eda(uuid, text, text, text, double precision, double precision, timestamptz) from public, anon;
grant execute on function public.registrar_evento_operacao_eda(uuid, text, text, text, double precision, double precision, timestamptz) to authenticated;
