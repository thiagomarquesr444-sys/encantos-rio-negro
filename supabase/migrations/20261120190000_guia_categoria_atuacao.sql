-- EDA_GUIA_ATUACAO_V1 (20/11/2026)
-- O perfil Guia/Prático grava a atuação em "categoria" (Guia de turismo,
-- Prático de embarcação, Guia e prático), mas a regra antiga exigia
-- categoria nula para guia: todo salvamento do perfil de guia falhava e,
-- sem perfil salvo, o código de vínculo com a operadora nunca era gerado.
alter table public.perfis_profissionais
  drop constraint if exists perfis_profissionais_campos_tipo_check;
alter table public.perfis_profissionais
  add constraint perfis_profissionais_campos_tipo_check check (
    (tipo = 'guia' and (categoria is null or categoria in
      ('Guia de turismo', 'Prático de embarcação', 'Guia e prático')))
    or (tipo = 'fornecedor' and idiomas is null and cadastur is null)
  );
