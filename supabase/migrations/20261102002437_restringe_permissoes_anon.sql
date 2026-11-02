-- ERN | Auditoria 2026-11 | Passo 2: higiene de permissões (defesa em profundidade)
-- Não altera dados. Leitura pública (SELECT) e RLS permanecem como estão.
--
-- Aplicada em produção em 01/11/2026 20:24 (America/Manaus)
-- versão registrada no Supabase: 20261102002437 (UTC)
-- Estado anterior: supabase/baseline/20261101_baseline_producao_ern.sql (seções 12 e 14)

-- 1) Funções de gatilho: sem acesso pela API (os gatilhos continuam disparando).
revoke execute on function
  public.criar_assinatura_free_empresa(),
  public.definir_empresa_cliente(),
  public.definir_empresa_embarcacao(),
  public.definir_empresa_hospedagem(),
  public.definir_empresa_passeio(),
  public.definir_empresa_registro(),
  public.definir_empresa_reserva(),
  public.validar_limite_clientes(),
  public.validar_limite_passeios(),
  public.validar_limite_reservas_mes(),
  public.validar_limite_usuarios_empresa()
from public, anon, authenticated;

-- 2) Visitante anônimo: retira tudo que não é leitura.
revoke insert, update, delete, truncate, references, trigger, maintain
  on all tables in schema public from anon;

-- Reversão (somente se necessário): reaplicar as linhas correspondentes
-- das seções 12 e 14 do baseline de 01/11/2026.
