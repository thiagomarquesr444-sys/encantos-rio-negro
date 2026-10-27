-- ENCANTOS RIO NEGRO
-- Registro da funcao aplicada ao Supabase em 26/10/2026.
-- Ja aplicada no banco principal; nao reaplicar sem auditoria.
-- O historico anterior do banco ainda nao foi versionado.

CREATE OR REPLACE FUNCTION public.ern_preparar_voucher_reserva()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO ''
AS $function$
DECLARE
  v_empresa uuid;
  v_reserva public.reservas%rowtype;
  v_emitir boolean := false;
  v_status_reserva text;
  v_status_anterior text;
  v_status_novo text;
  v_reserva_operacional boolean;
BEGIN
  SELECT p.empresa_id
  INTO v_empresa
  FROM public.perfis p
  WHERE p.id = auth.uid();

  IF v_empresa IS NULL THEN
    RAISE EXCEPTION 'ERN_USUARIO_SEM_EMPRESA';
  END IF;

  IF new.empresa_id IS DISTINCT FROM v_empresa THEN
    RAISE EXCEPTION
      'O voucher precisa pertencer à empresa autenticada.';
  END IF;

  IF tg_op = 'INSERT' THEN
    v_emitir := new.reserva_id IS NOT NULL;
  ELSE
    IF old.empresa_id IS DISTINCT FROM new.empresa_id THEN
      RAISE EXCEPTION
        'Não é permitido transferir vouchers entre empresas.';
    END IF;

    IF old.reserva_id IS NOT NULL THEN
      IF new.reserva_id IS DISTINCT FROM old.reserva_id THEN
        RAISE EXCEPTION
          'O vínculo de um voucher emitido não pode ser removido ou trocado. Cancele o voucher e emita outro se necessário.';
      END IF;

      IF new.cliente_id IS DISTINCT FROM old.cliente_id
         OR new.passeio_id IS DISTINCT FROM old.passeio_id
         OR new.cliente_nome IS DISTINCT FROM old.cliente_nome
         OR new.passeio_nome IS DISTINCT FROM old.passeio_nome
         OR new.quantidade_pessoas IS DISTINCT FROM old.quantidade_pessoas
         OR new.data_passeio IS DISTINCT FROM old.data_passeio
         OR new.horario_passeio IS DISTINCT FROM old.horario_passeio
      THEN
        RAISE EXCEPTION
          'Os dados da emissão do voucher vinculado à reserva devem ser preservados. Cancele e emita outro para corrigir esses dados.';
      END IF;
    ELSE
      v_emitir := new.reserva_id IS NOT NULL;
    END IF;
  END IF;

  IF new.reserva_id IS NOT NULL THEN
    -- Bloqueia alteracoes concorrentes da reserva
    -- ate o encerramento da transacao.
    SELECT r.*
    INTO v_reserva
    FROM public.reservas r
    WHERE r.id = new.reserva_id
      AND r.empresa_id = v_empresa
    FOR SHARE;

    IF NOT FOUND THEN
      RAISE EXCEPTION
        'A reserva selecionada não está disponível para esta empresa.';
    END IF;

    v_status_reserva := translate(
      lower(btrim(coalesce(v_reserva.status, ''))),
      'áàâãéêíóôõúüç',
      'aaaaeeiooouuc'
    );

    v_reserva_operacional := v_status_reserva
      IN ('pendente', 'confirmada');

    IF v_emitir THEN
      IF NOT v_reserva_operacional THEN
        RAISE EXCEPTION
          'ERN_VOUCHER_RESERVA_NAO_OPERACIONAL: Somente reservas pendentes ou confirmadas permitem nova emissão.'
          USING ERRCODE = '23514';
      END IF;

      IF nullif(btrim(v_reserva.cliente), '') IS NULL
         OR nullif(btrim(v_reserva.pacote), '') IS NULL
         OR v_reserva.quantidade_pessoas IS NULL
         OR v_reserva.quantidade_pessoas < 1
      THEN
        RAISE EXCEPTION
          'Complete cliente, passeio e quantidade de pessoas na reserva antes de emitir o voucher.';
      END IF;

      IF new.cliente_id IS NOT NULL
         AND new.cliente_id IS DISTINCT FROM v_reserva.cliente_id
      THEN
        RAISE EXCEPTION
          'O cliente do voucher não corresponde ao vínculo da reserva.';
      END IF;

      IF new.passeio_id IS NOT NULL
         AND new.passeio_id IS DISTINCT FROM v_reserva.passeio_id
      THEN
        RAISE EXCEPTION
          'O passeio do voucher não corresponde ao vínculo da reserva.';
      END IF;

      new.cliente_id := v_reserva.cliente_id;
      new.passeio_id := v_reserva.passeio_id;
      new.cliente_nome := btrim(v_reserva.cliente);
      new.passeio_nome := btrim(v_reserva.pacote);
      new.quantidade_pessoas := v_reserva.quantidade_pessoas;
      new.data_passeio := v_reserva.data_reserva;
      new.horario_passeio := v_reserva.horario;

    ELSIF tg_op = 'UPDATE' THEN
      v_status_anterior := translate(
        lower(btrim(coalesce(old.status, ''))),
        'áàâãéêíóôõúüç',
        'aaaaeeiooouuc'
      );

      v_status_novo := translate(
        lower(btrim(coalesce(new.status, ''))),
        'áàâãéêíóôõúüç',
        'aaaaeeiooouuc'
      );

      -- Nao permite reativacao de voucher se reserva nao operacional.
      -- Preserva os registros historicos sem reativa-los.
      IF v_status_novo IN ('ativo', 'valido')
         AND v_status_anterior NOT IN ('ativo', 'valido')
         AND NOT v_reserva_operacional
      THEN
        RAISE EXCEPTION
          'ERN_VOUCHER_REATIVACAO_BLOQUEADA: A reserva não está operacional.'
          USING ERRCODE = '23514';
      END IF;
    END IF;
  END IF;

  -- Valida novos vinculos cadastrais, mantendo o historico emitido.
  IF tg_op = 'INSERT' THEN
    v_emitir := true;
  ELSE
    v_emitir := v_emitir
      OR new.cliente_id IS DISTINCT FROM old.cliente_id
      OR new.passeio_id IS DISTINCT FROM old.passeio_id;
  END IF;

  IF v_emitir THEN
    IF new.cliente_id IS NOT NULL THEN
      PERFORM c.id
      FROM public.clientes c
      WHERE c.id = new.cliente_id
        AND c.empresa_id = v_empresa
      FOR SHARE;

      IF NOT FOUND THEN
        RAISE EXCEPTION
          'O cliente selecionado não está disponível para esta empresa.';
      END IF;
    END IF;

    IF new.passeio_id IS NOT NULL THEN
      PERFORM p.id
      FROM public.passeios p
      WHERE p.id = new.passeio_id
        AND p.empresa_id = v_empresa
      FOR SHARE;

      IF NOT FOUND THEN
        RAISE EXCEPTION
          'O passeio selecionado não está disponível para esta empresa.';
      END IF;
    END IF;
  END IF;

  RETURN new;
END;
$function$;
