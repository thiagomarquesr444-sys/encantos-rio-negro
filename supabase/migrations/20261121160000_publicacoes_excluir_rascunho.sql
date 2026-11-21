-- EDA_GALERIA_PUBLICACOES_V1: autor pode excluir os próprios rascunhos (limpeza de rascunhos esquecidos > 30 dias).
drop policy if exists publicacoes_autor_delete_rascunho on public.publicacoes;
create policy publicacoes_autor_delete_rascunho on public.publicacoes
  for delete to authenticated
  using (status = 'rascunho' and public.ern_administra_perfil_publico(autor_perfil_id));
