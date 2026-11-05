-- ERN_FISCAL_REGIME_ISS_V1
-- Parâmetros tributários informados pela própria operadora para ESTIMAR
-- impostos nas simulações. Não emitem nota nem têm validade fiscal.
-- RLS existente de empresa_fiscal_ern (admin_empresa edita a própria linha)
-- cobre as novas colunas; os CHECKs barram valores fora do permitido.

ALTER TABLE public.empresa_fiscal_ern
  ADD COLUMN IF NOT EXISTS regime_tributario text NOT NULL DEFAULT '',
  ADD COLUMN IF NOT EXISTS codigo_servico text NOT NULL DEFAULT '',
  ADD COLUMN IF NOT EXISTS aliquota_iss numeric(5,2),
  ADD COLUMN IF NOT EXISTS aliquota_simples numeric(5,2);

ALTER TABLE public.empresa_fiscal_ern
  DROP CONSTRAINT IF EXISTS empresa_fiscal_ern_regime_chk,
  ADD CONSTRAINT empresa_fiscal_ern_regime_chk
    CHECK (regime_tributario IN ('', 'mei', 'simples_nacional', 'lucro_presumido', 'lucro_real')),
  DROP CONSTRAINT IF EXISTS empresa_fiscal_ern_codigo_servico_chk,
  ADD CONSTRAINT empresa_fiscal_ern_codigo_servico_chk
    CHECK (codigo_servico ~ '^[0-9.]{0,20}$'),
  -- LC 116/2003 (com LC 157/2016): ISS mínimo 2% e máximo 5%.
  DROP CONSTRAINT IF EXISTS empresa_fiscal_ern_aliquota_iss_chk,
  ADD CONSTRAINT empresa_fiscal_ern_aliquota_iss_chk
    CHECK (aliquota_iss IS NULL OR (aliquota_iss >= 2 AND aliquota_iss <= 5)),
  -- Alíquota efetiva do Simples (faixas vão até 33%).
  DROP CONSTRAINT IF EXISTS empresa_fiscal_ern_aliquota_simples_chk,
  ADD CONSTRAINT empresa_fiscal_ern_aliquota_simples_chk
    CHECK (aliquota_simples IS NULL OR (aliquota_simples > 0 AND aliquota_simples <= 33));

COMMENT ON COLUMN public.empresa_fiscal_ern.regime_tributario IS 'Informado pela operadora; usado só para estimativa nas simulações.';
COMMENT ON COLUMN public.empresa_fiscal_ern.codigo_servico IS 'Item da lista da LC 116 (ex.: 09.02 turismo). Conferir com o contador.';
COMMENT ON COLUMN public.empresa_fiscal_ern.aliquota_iss IS 'Alíquota de ISS do município (2% a 5%).';
COMMENT ON COLUMN public.empresa_fiscal_ern.aliquota_simples IS 'Alíquota efetiva do Simples Nacional informada pela operadora.';
