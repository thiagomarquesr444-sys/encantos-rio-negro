-- ERN_FISCAL_EMITENTE_V1
-- O emitente (prestador) da NFS-e é sempre a operadora dona da reserva.
-- A simulação passa a usar o cadastro fiscal privado (empresa_fiscal_ern)
-- e marca se o emitente está apto a uma futura emissão real (CNPJ válido).
-- Segurança inalterada: SECURITY DEFINER, search_path vazio, revalidação
-- de perfil/empresa/reserva/cliente, execução apenas pelo servidor.

CREATE OR REPLACE FUNCTION public.ern_fiscal_cnpj_valido_v1(p_cnpj text)
 RETURNS boolean
 LANGUAGE plpgsql
 IMMUTABLE
 SET search_path TO ''
AS $function$
DECLARE
  v text := regexp_replace(coalesce(p_cnpj, ''), '\D', '', 'g');
  pesos1 int[] := ARRAY[5,4,3,2,9,8,7,6,5,4,3,2];
  pesos2 int[] := ARRAY[6,5,4,3,2,9,8,7,6,5,4,3,2];
  soma int;
  dig int;
  i int;
BEGIN
  IF length(v) <> 14 OR v ~ '^(\d)\1{13}$' THEN
    RETURN false;
  END IF;
  soma := 0;
  FOR i IN 1..12 LOOP
    soma := soma + substr(v, i, 1)::int * pesos1[i];
  END LOOP;
  dig := CASE WHEN soma % 11 < 2 THEN 0 ELSE 11 - soma % 11 END;
  IF dig <> substr(v, 13, 1)::int THEN RETURN false; END IF;
  soma := 0;
  FOR i IN 1..13 LOOP
    soma := soma + substr(v, i, 1)::int * pesos2[i];
  END LOOP;
  dig := CASE WHEN soma % 11 < 2 THEN 0 ELSE 11 - soma % 11 END;
  RETURN dig = substr(v, 14, 1)::int;
END;
$function$;

REVOKE ALL ON FUNCTION public.ern_fiscal_cnpj_valido_v1(text) FROM PUBLIC, anon;
REVOKE ALL ON FUNCTION public.ern_fiscal_cnpj_valido_v1(text) FROM authenticated;
GRANT EXECUTE ON FUNCTION public.ern_fiscal_cnpj_valido_v1(text) TO service_role;

CREATE OR REPLACE FUNCTION public.ern_fiscal_simular_reserva_v1(p_usuario_id uuid, p_reserva_id uuid)
 RETURNS jsonb
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO ''
AS $function$
DECLARE
  v_empresa_id uuid;
  v_empresa public.empresa%ROWTYPE;
  v_fiscal public.empresa_fiscal_ern%ROWTYPE;
  v_reserva public.reservas%ROWTYPE;
  v_cliente public.clientes%ROWTYPE;
  v_existente public.nfse_solicitacoes%ROWTYPE;
  v_nova_id uuid;
  v_valor numeric(15,2);
  v_chave text;
  v_prestador jsonb;
  v_tomador jsonb;
  v_servico jsonb;
  v_cnpj text;
  v_razao text;
  v_pendencias text[] := ARRAY[]::text[];
BEGIN
  IF p_usuario_id IS NULL OR p_reserva_id IS NULL THEN
    RAISE EXCEPTION 'Parametros fiscais invalidos.';
  END IF;

  -- 1. Identidade empresarial (revalidada aqui).
  SELECT p.empresa_id
    INTO v_empresa_id
  FROM public.perfis p
  WHERE p.id = p_usuario_id
    AND p.role = 'admin_empresa'
    AND p.empresa_id IS NOT NULL;

  IF v_empresa_id IS NULL THEN
    RAISE EXCEPTION 'Operacao fiscal nao autorizada.';
  END IF;

  -- 2. Empresa e cadastro fiscal privado (snapshot estavel).
  SELECT e.*
    INTO v_empresa
  FROM public.empresa e
  WHERE e.id = v_empresa_id
  FOR SHARE;

  IF NOT FOUND THEN
    RAISE EXCEPTION 'Empresa nao encontrada.';
  END IF;

  SELECT f.*
    INTO v_fiscal
  FROM public.empresa_fiscal_ern f
  WHERE f.empresa_id = v_empresa_id
  FOR SHARE;

  -- 3. Bloquear a reserva durante a validacao.
  SELECT r.*
    INTO v_reserva
  FROM public.reservas r
  WHERE r.id = p_reserva_id
    AND r.empresa_id = v_empresa_id
  FOR UPDATE;

  IF NOT FOUND THEN
    RAISE EXCEPTION 'Reserva nao encontrada para a empresa.';
  END IF;

  IF lower(coalesce(v_reserva.status, '')) LIKE '%cancelad%' THEN
    RAISE EXCEPTION 'Reserva cancelada.';
  END IF;

  IF v_reserva.cliente_id IS NULL THEN
    RAISE EXCEPTION 'Reserva sem cliente formalmente vinculado.';
  END IF;

  IF v_reserva.valor_total IS NULL
     OR v_reserva.valor_total <= 0
     OR v_reserva.valor_total <> round(v_reserva.valor_total, 2)
  THEN
    RAISE EXCEPTION 'Valor da reserva invalido para simulacao.';
  END IF;

  v_valor := v_reserva.valor_total;

  -- 4. Validar e bloquear o cliente da mesma empresa.
  SELECT c.*
    INTO v_cliente
  FROM public.clientes c
  WHERE c.id = v_reserva.cliente_id
    AND c.empresa_id = v_empresa_id
  FOR SHARE;

  IF NOT FOUND THEN
    RAISE EXCEPTION 'Cliente nao pertence a empresa da reserva.';
  END IF;

  -- 5. Snapshots. Estes documentos NAO possuem validade fiscal.
  -- Emitente = operadora (cadastro fiscal); nunca a plataforma EDA.
  v_razao := coalesce(nullif(btrim(v_fiscal.razao_social), ''), v_empresa.nome);
  v_cnpj := regexp_replace(
    coalesce(nullif(btrim(v_fiscal.cnpj), ''), v_empresa.cnpj, ''),
    '\D', '', 'g'
  );

  IF v_fiscal.empresa_id IS NULL THEN
    v_pendencias := v_pendencias || 'cadastro_fiscal_ausente';
  END IF;
  IF nullif(btrim(coalesce(v_fiscal.razao_social, '')), '') IS NULL THEN
    v_pendencias := v_pendencias || 'razao_social';
  END IF;
  IF NOT public.ern_fiscal_cnpj_valido_v1(v_cnpj) THEN
    v_pendencias := v_pendencias || 'cnpj';
  END IF;
  IF nullif(btrim(coalesce(v_fiscal.inscricao_municipal, '')), '') IS NULL THEN
    v_pendencias := v_pendencias || 'inscricao_municipal';
  END IF;
  IF length(regexp_replace(coalesce(v_fiscal.codigo_municipio_ibge, ''), '\D', '', 'g')) <> 7 THEN
    v_pendencias := v_pendencias || 'codigo_municipio_ibge';
  END IF;

  v_prestador := jsonb_build_object(
    'nome', v_razao,
    'cnpj', v_cnpj,
    'origem', CASE WHEN v_fiscal.empresa_id IS NULL THEN 'empresa' ELSE 'cadastro_fiscal' END,
    'apto_emissao_real', cardinality(v_pendencias) = 0,
    'pendencias', to_jsonb(v_pendencias)
  );

  v_tomador := jsonb_build_object('nome', v_cliente.nome);

  v_servico := jsonb_build_object(
    'descricao', coalesce(v_reserva.pacote, 'Servico da reserva'),
    'data_reserva', v_reserva.data_reserva
  );

  v_chave := 'simulacao:reserva:' || p_reserva_id::text;

  -- 6. Conferir solicitacao anterior (lock na reserva serializa).
  SELECT n.*
    INTO v_existente
  FROM public.nfse_solicitacoes n
  WHERE n.empresa_id = v_empresa_id
    AND n.chave_idempotencia = v_chave
  FOR UPDATE;

  IF FOUND THEN
    IF v_existente.ambiente <> 'simulacao'
       OR v_existente.status <> 'simulada'
       OR v_existente.reserva_id IS DISTINCT FROM p_reserva_id
       OR v_existente.cliente_id IS DISTINCT FROM v_cliente.id
       OR v_existente.valor_servico IS DISTINCT FROM v_valor
       OR v_existente.dados_prestador IS DISTINCT FROM v_prestador
       OR v_existente.dados_tomador IS DISTINCT FROM v_tomador
       OR v_existente.dados_servico IS DISTINCT FROM v_servico
    THEN
      RAISE EXCEPTION 'Simulacao desatualizada. Revisao necessaria.';
    END IF;

    RETURN jsonb_build_object(
      'ok', true, 'simulacao', true, 'valor_fiscal', false,
      'reutilizada', true, 'id', v_existente.id,
      'status', v_existente.status, 'ambiente', v_existente.ambiente
    );
  END IF;

  -- 7. Nova solicitacao exclusivamente simulada.
  INSERT INTO public.nfse_solicitacoes (
    empresa_id, reserva_id, cliente_id, criado_por, chave_idempotencia,
    ambiente, status, valor_servico, dados_prestador, dados_tomador, dados_servico
  )
  VALUES (
    v_empresa_id, p_reserva_id, v_cliente.id, p_usuario_id, v_chave,
    'simulacao', 'simulada', v_valor, v_prestador, v_tomador, v_servico
  )
  RETURNING id INTO v_nova_id;

  -- 8. Evento na mesma transacao.
  INSERT INTO public.nfse_eventos (
    empresa_id, solicitacao_id, ambiente, tipo_evento, identificador_evento, dados_evento
  )
  VALUES (
    v_empresa_id, v_nova_id, 'simulacao', 'SIMULACAO_CRIADA',
    'simulada:' || p_reserva_id::text,
    jsonb_build_object('simulacao', true, 'valor_fiscal', false,
                       'apto_emissao_real', cardinality(v_pendencias) = 0)
  );

  RETURN jsonb_build_object(
    'ok', true, 'simulacao', true, 'valor_fiscal', false,
    'reutilizada', false, 'id', v_nova_id,
    'status', 'simulada', 'ambiente', 'simulacao'
  );
END;
$function$;

-- Mantém a função de simulação restrita ao servidor.
REVOKE ALL ON FUNCTION public.ern_fiscal_simular_reserva_v1(uuid, uuid) FROM PUBLIC, anon, authenticated;
GRANT EXECUTE ON FUNCTION public.ern_fiscal_simular_reserva_v1(uuid, uuid) TO service_role;
