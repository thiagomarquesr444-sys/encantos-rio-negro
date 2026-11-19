-- EDA_VITRINE_18_V1: aviso +18 só para fornecedores de bebidas (artesanato e alimentos nunca).
create or replace function public.eda_vitrine_maior18_so_bebidas()
returns trigger language plpgsql security definer set search_path = '' as $$
begin
  if new.maior_18 and not exists (
    select 1 from public.perfis_profissionais p
     where p.usuario_id = new.usuario_id and p.tipo = 'fornecedor' and coalesce(p.categoria, '') ilike '%bebida%'
  ) then
    new.maior_18 := false;
  end if;
  return new;
end $$;
revoke all on function public.eda_vitrine_maior18_so_bebidas() from public, anon, authenticated;
drop trigger if exists trg_eda_vitrine_maior18 on public.vitrine_itens;
create trigger trg_eda_vitrine_maior18 before insert or update on public.vitrine_itens
  for each row execute function public.eda_vitrine_maior18_so_bebidas();
