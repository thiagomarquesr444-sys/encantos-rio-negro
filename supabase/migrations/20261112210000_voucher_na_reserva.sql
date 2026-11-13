-- EDA_VOUCHER_NA_RESERVA_V1: pagamento recebido também conta com status 'Pago'.
create or replace function public.emitir_voucher_reserva_eda(p_reserva_id uuid, p_substituir boolean default false)
returns jsonb language plpgsql security definer set search_path = public, extensions as $$
declare
  v_empresa uuid := public.eda_voucher_operador();
  r public.reservas; v_ant public.vouchers; v_novo public.vouchers;
  v_total numeric; v_pago numeric; v_validade date; v_codigo text; v_snapshot jsonb;
  v_status text;
begin
  select * into r from public.reservas where id = p_reserva_id and empresa_id = v_empresa for update;
  if r.id is null then raise exception 'EDA_VOUCHER_RESERVA_NAO_ENCONTRADA'; end if;

  v_status := translate(lower(btrim(coalesce(r.status, ''))), 'áàâãéêíóôõúüç', 'aaaaeeiooouuc');
  if v_status <> 'confirmada' then raise exception 'EDA_VOUCHER_RESERVA_NAO_CONFIRMADA'; end if;

  v_total := coalesce(nullif(r.valor_total, 0), r.valor);
  if v_total is null or v_total <= 0 then raise exception 'EDA_VOUCHER_SEM_VALOR'; end if;

  select coalesce(sum(f.valor), 0) into v_pago from public.financeiro f
  where f.empresa_id = v_empresa and f.reserva_id = r.id
    and lower(btrim(coalesce(f.tipo, ''))) = 'receita'
    and lower(btrim(coalesce(f.status, ''))) in ('recebido', 'pago') and f.valor > 0;
  if v_pago <= 0 then raise exception 'EDA_VOUCHER_SEM_PAGAMENTO'; end if;

  select * into v_ant from public.vouchers
  where reserva_id = r.id and empresa_id = v_empresa and lower(coalesce(status, '')) in ('ativo', 'valido')
  for update;
  if v_ant.id is not null and not p_substituir then raise exception 'EDA_VOUCHER_JA_EMITIDO'; end if;

  select coalesce(s.data_fim, r.data_fim_prevista, s.data_inicio, r.data_reserva)
  into v_validade from (select 1) x left join public.passeio_saidas s on s.id = r.saida_id;

  v_snapshot := (
    select jsonb_build_object(
      'operadora', jsonb_build_object('nome', e.nome, 'cnpj', e.cnpj, 'telefone', e.telefone, 'email', e.email,
        'cidade', e.cidade, 'endereco', e.endereco,
        'whatsapp', (select pp.whatsapp from public.perfis_publicos pp
          where pp.empresa_id = v_empresa and pp.origem_tipo = 'empresa' order by pp.publicado desc limit 1)),
      'titular', jsonb_build_object('nome', coalesce(c.nome, r.cliente), 'telefone', c.telefone),
      'passageiros', coalesce((select jsonb_agg(jsonb_build_object('nome', rp.nome, 'relacao', rp.relacao,
          'titular', rp.titular, 'nascimento', rp.data_nascimento) order by rp.titular desc, rp.criado_em)
        from public.reserva_participantes rp where rp.reserva_id = r.id), '[]'::jsonb),
      'quantidades', jsonb_build_object('total', r.quantidade_pessoas, 'criancas', coalesce(r.qtd_criancas, 0), 'colo', coalesce(r.qtd_colo, 0)),
      'passeio', jsonb_build_object('nome', coalesce(p.nome, r.pacote), 'inicio', coalesce(s.data_inicio, r.data_reserva),
        'horario', r.horario, 'fim', coalesce(s.data_fim, r.data_fim_prevista), 'horario_fim', r.horario_fim_previsto,
        'ponto_embarque', p.ponto_embarque, 'inclui', p.inclui, 'nao_inclui', p.nao_inclui, 'duracao', p.duracao,
        'guia', r.guia, 'embarcacao', em.nome),
      'financeiro', jsonb_build_object('total', v_total, 'pago', v_pago, 'saldo', greatest(v_total - v_pago, 0)),
      'fichas', jsonb_build_object(
        'participantes', (select count(*) from public.reserva_participantes rp where rp.reserva_id = r.id),
        'preenchidas', (select count(*) from public.reserva_participantes rp
          join public.participante_fichas pf on pf.participante_id = rp.id where rp.reserva_id = r.id)),
      'emitido_por', auth.uid(), 'emitido_em', now())
    from (select 1) x
    join public.empresa e on e.id = v_empresa
    left join public.clientes c on c.id = r.cliente_id
    left join public.passeios p on p.id = r.passeio_id
    left join public.passeio_saidas s on s.id = r.saida_id
    left join public.embarcacoes em on em.id = r.embarcacao_id
  );

  perform set_config('eda.voucher_interno', '1', true);
  if v_ant.id is not null then
    update public.vouchers set status = 'Substituído' where id = v_ant.id;
  end if;

  loop
    v_codigo := 'EDA-' || upper(substr(encode(gen_random_bytes(6), 'hex'), 1, 8));
    exit when not exists (select 1 from public.vouchers where codigo = v_codigo);
  end loop;

  insert into public.vouchers (codigo, reserva_id, status, cliente_id, passeio_id, valor, validade, empresa_id,
    versao, substitui_id, snapshot, valor_pago, saldo)
  values (v_codigo, r.id, 'Ativo', r.cliente_id, r.passeio_id, v_total, v_validade, v_empresa,
    coalesce(v_ant.versao, 0) + 1, v_ant.id, v_snapshot, v_pago, greatest(v_total - v_pago, 0))
  returning * into v_novo;
  perform set_config('eda.voucher_interno', '', true);

  return jsonb_build_object('id', v_novo.id, 'codigo', v_novo.codigo, 'token', v_novo.token_verificacao, 'versao', v_novo.versao);
end; $$;
revoke all on function public.emitir_voucher_reserva_eda(uuid, boolean) from public, anon;
grant execute on function public.emitir_voucher_reserva_eda(uuid, boolean) to authenticated;
