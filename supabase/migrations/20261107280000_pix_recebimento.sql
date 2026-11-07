-- EDA_PIX_RECEBIMENTO_V1: chave Pix da operadora para receber dos turistas
-- (antiga "chave_api_pix", que nunca foi chave de API). Não é segredo.
alter table public.configuracoes rename column chave_api_pix to chave_pix;
alter table public.configuracoes
  add column if not exists pix_nome_recebedor text,
  add column if not exists pix_cidade text;
alter table public.configuracoes drop constraint if exists configuracoes_pix_check;
alter table public.configuracoes add constraint configuracoes_pix_check check (
  (chave_pix is null or chave_pix = '' or chave_pix ~ '^[^@\s]+@[^@\s]+\.[^@\s]+$' or chave_pix ~ '^\+55\d{10,11}$'
   or chave_pix ~ '^\d{11}$' or chave_pix ~ '^\d{14}$' or chave_pix ~* '^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$')
  and coalesce(char_length(pix_nome_recebedor), 0) <= 25 and coalesce(char_length(pix_cidade), 0) <= 15) not valid;

create or replace function public.config_operacao_eda()
returns jsonb language sql stable security definer set search_path = public as $$
  select jsonb_build_object(
    'porcentagem_sinal', coalesce(c.porcentagem_sinal, 0),
    'antecedencia_minima_horas', coalesce(c.antecedencia_minima_horas, 0),
    'permitir_reservas_mesmo_dia', coalesce(c.permitir_reservas_mesmo_dia, true),
    'chave_pix', nullif(c.chave_pix, ''),
    'pix_nome_recebedor', coalesce(nullif(c.pix_nome_recebedor, ''), (select e.nome from public.empresa e where e.id = x.e)),
    'pix_cidade', coalesce(nullif(c.pix_cidade, ''), 'BARCELOS'))
  from (select public.eda_empresa_equipe() as e) x
  left join public.configuracoes c on c.empresa_id = x.e
  where x.e is not null;
$$;
