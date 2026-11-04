-- ERN_SEGURANCA: URLs do perfil público só aceitam https:// (bloqueia javascript:, data:, http:)
-- Aplicada em produção em 2026-11-03 via MCP.
alter table public.perfis_publicos
  add constraint perfis_publicos_urls_https_check check (
    (site is null or site = '' or site ~* '^https://[^\s<>"'']+$') and
    (instagram is null or instagram = '' or instagram ~* '^https://[^\s<>"'']+$') and
    (logo_url is null or logo_url = '' or logo_url ~* '^https://[^\s<>"'']+$') and
    (capa_url is null or capa_url = '' or capa_url ~* '^https://[^\s<>"'']+$')
  );
