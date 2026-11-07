-- EDA_FEEDBACKS_PAINEL_V1
-- Leitura dos feedbacks (antes só no banco) para administradores da plataforma
-- (administradores_editoriais_ern). A tabela segue fechada; acesso só por RPC.

create or replace function public.feedbacks_plataforma_eda(p_estado text default null, p_dias int default 90)
returns jsonb language plpgsql stable security definer set search_path = public as $$
declare v_desde timestamptz := now() - make_interval(days => least(greatest(coalesce(p_dias, 90), 1), 730));
begin
  if not public.tem_acesso_editorial_ern() then raise exception 'ERN_SEM_PERMISSAO'; end if;
  return (
    with f as (
      select fb.*, coalesce(e.nome, '') as empresa_nome, coalesce(pf.nome, '') as autor_nome,
        nullif(substring(fb.mensagem from '\[resposta\] (\d)/4'), '')::int as nota
      from public.ern_feedbacks_v1 fb
      left join public.perfis pf on pf.id = fb.usuario_id
      left join public.empresa e on e.id = pf.empresa_id
      where fb.criado_em >= v_desde
    )
    select jsonb_build_object(
      'resumo', jsonb_build_object(
        'total', (select count(*) from f),
        'novos', (select count(*) from f where estado = 'novo'),
        'nota_media', (select round(avg(nota)::numeric, 1) from f where nota is not null),
        'por_categoria', coalesce((select jsonb_object_agg(categoria, n) from (select categoria, count(*) n from f group by categoria) x), '{}'::jsonb)),
      'por_pagina', coalesce((select jsonb_agg(jsonb_build_object('caminho', caminho, 'n', n, 'nota_media', media) order by n desc)
        from (select caminho, count(*) n, round(avg(nota)::numeric, 1) media from f group by caminho) x), '[]'::jsonb),
      'itens', coalesce((select jsonb_agg(jsonb_build_object(
          'id', id, 'criado_em', criado_em, 'estado', estado, 'origem', origem, 'categoria', categoria,
          'caminho', caminho, 'mensagem', mensagem, 'contato_email', contato_email, 'nota', nota,
          'empresa', empresa_nome, 'autor', autor_nome) order by criado_em desc)
        from (select * from f where p_estado is null or estado = p_estado order by criado_em desc limit 300) y), '[]'::jsonb)
    )
  );
end $$;
revoke all on function public.feedbacks_plataforma_eda(text, int) from public, anon;
grant execute on function public.feedbacks_plataforma_eda(text, int) to authenticated;

create or replace function public.atualizar_feedback_eda(p_id uuid, p_estado text)
returns void language plpgsql security definer set search_path = public as $$
begin
  if not public.tem_acesso_editorial_ern() then raise exception 'ERN_SEM_PERMISSAO'; end if;
  if p_estado not in ('novo','em_analise','resolvido','arquivado') then raise exception 'Estado inválido.'; end if;
  update public.ern_feedbacks_v1 set estado = p_estado where id = p_id;
  if not found then raise exception 'Feedback não encontrado.'; end if;
end $$;
revoke all on function public.atualizar_feedback_eda(uuid, text) from public, anon;
grant execute on function public.atualizar_feedback_eda(uuid, text) to authenticated;
