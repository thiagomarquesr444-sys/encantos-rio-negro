-- EDA_GUIA_HABILITACAO_GRANT_V1 (20/11/2026)
-- A coluna habilitacao (prático) foi criada sem permissão de gravação para
-- contas logadas; o perfil envia esse campo e o banco recusava tudo
-- ("permission denied for table perfis_profissionais"). RLS continua
-- limitando cada conta à própria linha.
grant insert (habilitacao), update (habilitacao) on public.perfis_profissionais to authenticated;
