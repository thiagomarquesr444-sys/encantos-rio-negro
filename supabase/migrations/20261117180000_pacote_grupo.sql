-- EDA_PACOTE_GRUPO_V1: grupos de turistas (de outros estados, via agência ou direto) fecham pacote
-- com a operadora. Uma reserva só para o grupo inteiro: nome do grupo, origem, responsável e valor fechado;
-- a lista de turistas entra como participantes (relação "grupo") e segue para fichas, voucher e saída.
alter table public.reservas add column if not exists modalidade text not null default 'individual';
alter table public.reservas add column if not exists grupo_nome text;
alter table public.reservas add column if not exists grupo_origem text;
alter table public.reservas add column if not exists grupo_responsavel text;
alter table public.reservas add column if not exists grupo_contato text;
alter table public.reservas drop constraint if exists reservas_pacote_grupo_check;
alter table public.reservas add constraint reservas_pacote_grupo_check check (
  modalidade in ('individual', 'pacote_grupo')
  and (grupo_nome is null or char_length(grupo_nome) <= 120)
  and (grupo_origem is null or char_length(grupo_origem) <= 80)
  and (grupo_responsavel is null or char_length(grupo_responsavel) <= 120)
  and (grupo_contato is null or char_length(grupo_contato) <= 40)
  and (modalidade <> 'pacote_grupo' or char_length(btrim(coalesce(grupo_nome, ''))) >= 2)
);

alter table public.reserva_participantes drop constraint if exists reserva_participantes_relacao_check;
alter table public.reserva_participantes add constraint reserva_participantes_relacao_check check (
  relacao is null or relacao in ('titular','conjuge','filho','pai_mae','irmao','parente','amigo','colega','grupo','outro'));
