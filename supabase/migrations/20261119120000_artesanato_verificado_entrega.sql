-- EDA_ARTESANATO_V2 (19/11/2026)
-- Vitrine de artesanato com selo "Artesão verificado", titular do Pix visível
-- (o turista confere antes de pagar) e entrega da peça durante o passeio,
-- pela operadora. A Encantos não vende nem recebe pagamento: venda e Pix são
-- direto entre turista e artesão.

-- 1) Verificação e titular do Pix no perfil do fornecedor/artesão
alter table public.perfis_profissionais
  add column if not exists pix_titular text,
  add column if not exists verificado_em timestamptz,
  add column if not exists verificado_por uuid;

do $$ begin
  alter table public.perfis_profissionais
    add constraint perfis_profissionais_pix_titular_tam check (pix_titular is null or char_length(pix_titular) between 3 and 120);
exception when duplicate_object then null; end $$;

-- Só a administração da plataforma marca o selo. Se o artesão trocar nome,
-- WhatsApp ou titular do Pix depois de verificado, o selo cai (anti-golpe).
create or replace function public.eda_proteger_verificacao_artesao()
returns trigger language plpgsql security definer set search_path = '' as $$
begin
  if tg_op = 'INSERT' then
    if not public.tem_acesso_editorial_ern() then
      new.verificado_em := null; new.verificado_por := null;
    end if;
    return new;
  end if;
  if (new.verificado_em is distinct from old.verificado_em or new.verificado_por is distinct from old.verificado_por)
     and not public.tem_acesso_editorial_ern() then
    new.verificado_em := old.verificado_em; new.verificado_por := old.verificado_por;
  end if;
  if old.verificado_em is not null and new.verificado_em is not null
     and (new.nome is distinct from old.nome or new.telefone is distinct from old.telefone or new.pix_titular is distinct from old.pix_titular) then
    new.verificado_em := null; new.verificado_por := null;
  end if;
  return new;
end $$;

drop trigger if exists trg_eda_proteger_verificacao_artesao on public.perfis_profissionais;
create trigger trg_eda_proteger_verificacao_artesao
  before insert or update on public.perfis_profissionais
  for each row execute function public.eda_proteger_verificacao_artesao();

-- 2) Peça pode ser entregue durante o passeio, por uma operadora
alter table public.vitrine_itens
  add column if not exists entrega_passeio boolean not null default false;

-- 3) Vitrine pública com selo, titular do Pix e formas de entrega
drop function if exists public.vitrine_publica_eda(text, integer);
create function public.vitrine_publica_eda(p_atividade text default null, p_limite integer default 60)
returns table(id uuid, titulo text, descricao text, preco numeric, foto_url text, maior_18 boolean,
              envia_correios boolean, entrega_passeio boolean, fornecedor text, cidade text, atividade text,
              whatsapp text, verificado boolean, pix_titular text)
language sql stable security definer set search_path = '' as $$
  select v.id, v.titulo, v.descricao, v.preco, v.foto_url, v.maior_18, v.envia_correios, v.entrega_passeio,
         p.nome, p.cidade, p.categoria, regexp_replace(coalesce(p.telefone, ''), '\D', '', 'g'),
         p.verificado_em is not null, p.pix_titular
    from public.vitrine_itens v
    join public.perfis_profissionais p on p.usuario_id = v.usuario_id and p.tipo = 'fornecedor'
   where v.publicado
     and (p_atividade is null or p.categoria = p_atividade)
   order by (p.verificado_em is not null) desc, v.criado_em desc
   limit least(greatest(coalesce(p_limite, 60), 1), 120);
$$;
revoke all on function public.vitrine_publica_eda(text, integer) from public;
grant execute on function public.vitrine_publica_eda(text, integer) to anon, authenticated;

-- 4) Comando EDA: lista e verificação de artesãos (exclusivo da administração)
create or replace function public.artesaos_verificacao_eda()
returns table(usuario_id uuid, nome text, cidade text, categoria text, whatsapp text, pix_titular text,
              verificado_em timestamptz, pecas bigint, criado_em timestamptz)
language plpgsql stable security definer set search_path = '' as $$
begin
  if not public.tem_acesso_editorial_ern() then raise exception 'EDA_SEM_PERMISSAO'; end if;
  return query
    select p.usuario_id, p.nome, p.cidade, p.categoria, regexp_replace(coalesce(p.telefone, ''), '\D', '', 'g'),
           p.pix_titular, p.verificado_em,
           (select count(*) from public.vitrine_itens v where v.usuario_id = p.usuario_id), p.criado_em
      from public.perfis_profissionais p
     where p.tipo = 'fornecedor'
     order by (p.verificado_em is null) desc, p.criado_em desc
     limit 500;
end $$;
revoke all on function public.artesaos_verificacao_eda() from public, anon;
grant execute on function public.artesaos_verificacao_eda() to authenticated;

create or replace function public.verificar_artesao_eda(p_usuario uuid, p_verificar boolean)
returns void language plpgsql security definer set search_path = '' as $$
begin
  if not public.tem_acesso_editorial_ern() then raise exception 'EDA_SEM_PERMISSAO'; end if;
  if p_verificar and not exists (
    select 1 from public.perfis_profissionais p
     where p.usuario_id = p_usuario and p.tipo = 'fornecedor'
       and p.pix_titular is not null and length(regexp_replace(coalesce(p.telefone, ''), '\D', '', 'g')) >= 10
  ) then raise exception 'EDA_VERIFICACAO_INCOMPLETA'; end if;
  update public.perfis_profissionais
     set verificado_em = case when p_verificar then now() else null end,
         verificado_por = case when p_verificar then auth.uid() else null end
   where usuario_id = p_usuario and tipo = 'fornecedor';
  if not found then raise exception 'Artesão não encontrado.'; end if;
end $$;
revoke all on function public.verificar_artesao_eda(uuid, boolean) from public, anon;
grant execute on function public.verificar_artesao_eda(uuid, boolean) to authenticated;

-- 5) Entrega da peça durante o passeio (artesão registra, operadora confirma)
create table if not exists public.entregas_artesanato (
  id uuid primary key default gen_random_uuid(),
  fornecedor_id uuid not null references auth.users(id) on delete cascade,
  empresa_id uuid not null references public.empresa(id) on delete cascade,
  item_id uuid references public.vitrine_itens(id) on delete set null,
  peca text not null check (char_length(peca) between 2 and 90),
  comprador text not null check (char_length(comprador) between 2 and 60),
  data_passeio date not null,
  observacao text check (observacao is null or char_length(observacao) <= 300),
  status text not null default 'aguardando'
    check (status in ('aguardando', 'aceita', 'recebida', 'entregue', 'recusada', 'cancelada')),
  criado_em timestamptz not null default now(),
  atualizado_em timestamptz not null default now()
);
create index if not exists entregas_artesanato_empresa_idx on public.entregas_artesanato (empresa_id, data_passeio);
create index if not exists entregas_artesanato_fornecedor_idx on public.entregas_artesanato (fornecedor_id, data_passeio);

alter table public.entregas_artesanato enable row level security;
-- Leitura: o artesão vê as suas; a operadora vê as que foram destinadas a ela.
-- Escrita: só pelas funções abaixo (sem policy de insert/update/delete).
drop policy if exists entregas_artesanato_leitura on public.entregas_artesanato;
create policy entregas_artesanato_leitura on public.entregas_artesanato for select to authenticated
  using (
    fornecedor_id = (select auth.uid())
    or empresa_id = (select p.empresa_id from public.perfis p where p.id = (select auth.uid()))
  );
revoke insert, update, delete on public.entregas_artesanato from anon, authenticated;
revoke all on public.entregas_artesanato from anon;
grant select on public.entregas_artesanato to authenticated;

-- Operadoras que o artesão pode escolher (perfis públicos publicados)
create or replace function public.operadoras_entrega_artesanato_eda()
returns table(empresa_id uuid, nome text, cidade text)
language sql stable security definer set search_path = '' as $$
  select distinct on (pp.empresa_id) pp.empresa_id, pp.nome_publico, pp.cidade
    from public.perfis_publicos pp
   where pp.origem_tipo = 'empresa' and pp.publicado and pp.empresa_id is not null
   order by pp.empresa_id, pp.updated_at desc nulls last
   limit 300;
$$;
revoke all on function public.operadoras_entrega_artesanato_eda() from public, anon;
grant execute on function public.operadoras_entrega_artesanato_eda() to authenticated;

create or replace function public.registrar_entrega_artesanato_eda(
  p_empresa uuid, p_item uuid, p_peca text, p_comprador text, p_data date, p_observacao text default null)
returns uuid language plpgsql security definer set search_path = '' as $$
declare v_id uuid; v_uid uuid := auth.uid();
begin
  if v_uid is null or not public.eda_e_fornecedor(v_uid) then raise exception 'EDA_SEM_PERMISSAO'; end if;
  if p_data is null or p_data < (now() at time zone 'America/Manaus')::date or p_data > (now() at time zone 'America/Manaus')::date + 365 then
    raise exception 'EDA_DATA_INVALIDA';
  end if;
  if not exists (select 1 from public.perfis_publicos pp where pp.empresa_id = p_empresa and pp.origem_tipo = 'empresa' and pp.publicado) then
    raise exception 'EDA_OPERADORA_INVALIDA';
  end if;
  if p_item is not null and not exists (select 1 from public.vitrine_itens v where v.id = p_item and v.usuario_id = v_uid) then
    raise exception 'EDA_PECA_INVALIDA';
  end if;
  if (select count(*) from public.entregas_artesanato e where e.fornecedor_id = v_uid and e.status in ('aguardando', 'aceita', 'recebida')) >= 30 then
    raise exception 'EDA_ENTREGAS_LIMITE';
  end if;
  insert into public.entregas_artesanato (fornecedor_id, empresa_id, item_id, peca, comprador, data_passeio, observacao)
  values (v_uid, p_empresa, p_item, left(btrim(p_peca), 90), left(btrim(p_comprador), 60), p_data, nullif(left(btrim(coalesce(p_observacao, '')), 300), ''))
  returning id into v_id;
  return v_id;
end $$;
revoke all on function public.registrar_entrega_artesanato_eda(uuid, uuid, text, text, date, text) from public, anon;
grant execute on function public.registrar_entrega_artesanato_eda(uuid, uuid, text, text, date, text) to authenticated;

-- Mudança de situação: o artesão só cancela; a operadora aceita/recusa,
-- marca peça recebida e entregue ao turista. Transições fixas.
create or replace function public.atualizar_entrega_artesanato_eda(p_id uuid, p_status text)
returns void language plpgsql security definer set search_path = '' as $$
declare e public.entregas_artesanato; v_uid uuid := auth.uid(); v_empresa uuid;
begin
  select * into e from public.entregas_artesanato where id = p_id for update;
  if not found then raise exception 'EDA_ENTREGA_NAO_ENCONTRADA'; end if;
  select p.empresa_id into v_empresa from public.perfis p where p.id = v_uid;
  if e.fornecedor_id = v_uid then
    if not (p_status = 'cancelada' and e.status in ('aguardando', 'aceita')) then raise exception 'EDA_TRANSICAO_INVALIDA'; end if;
  elsif v_empresa is not null and v_empresa = e.empresa_id then
    if not ((e.status = 'aguardando' and p_status in ('aceita', 'recusada'))
         or (e.status = 'aceita' and p_status in ('recebida', 'recusada'))
         or (e.status = 'recebida' and p_status = 'entregue')) then
      raise exception 'EDA_TRANSICAO_INVALIDA';
    end if;
  else
    raise exception 'EDA_SEM_PERMISSAO';
  end if;
  update public.entregas_artesanato set status = p_status, atualizado_em = now() where id = p_id;
end $$;
revoke all on function public.atualizar_entrega_artesanato_eda(uuid, text) from public, anon;
grant execute on function public.atualizar_entrega_artesanato_eda(uuid, text) to authenticated;

-- LGPD: o nome do comprador some 120 dias depois do passeio.
create or replace function public.expurgar_entregas_artesanato_eda()
returns void language sql security definer set search_path = '' as $$
  delete from public.entregas_artesanato where data_passeio < (now() at time zone 'America/Manaus')::date - 120;
$$;
revoke all on function public.expurgar_entregas_artesanato_eda() from public, anon, authenticated;

do $$ begin
  perform cron.unschedule('eda_expurgar_entregas_artesanato');
exception when others then null; end $$;
select cron.schedule('eda_expurgar_entregas_artesanato', '50 7 * * *', 'select public.expurgar_entregas_artesanato_eda()');

-- Função de gatilho não é chamável pela API.
revoke all on function public.eda_proteger_verificacao_artesao() from public, anon, authenticated;
