-- EDA_CLIENTES_RELACIONAMENTO_V1
-- Cliente = aliança duradoura: reservas sempre ligadas ao cadastro, histórico,
-- preferências, idioma e consentimento; duplicidade evitada.

-- Empresa imutável na edição (mesmo defeito corrigido nas outras páginas).
create or replace function public.definir_empresa_cliente()
returns trigger language plpgsql security definer set search_path to 'public' as $function$
declare v_empresa_id uuid;
begin
  if tg_op = 'UPDATE' then new.empresa_id := old.empresa_id; return new; end if;
  if auth.uid() is not null then
    select empresa_id into v_empresa_id from public.perfis where id = auth.uid();
    if v_empresa_id is null then raise exception 'Usuário autenticado não possui empresa vinculada.'; end if;
    new.empresa_id := v_empresa_id;
  elsif new.empresa_id is null then
    raise exception 'Cliente precisa possuir empresa vinculada.';
  end if;
  return new;
end; $function$;

alter table public.clientes
  add column if not exists idioma_preferido text,
  add column if not exists data_nascimento date,
  add column if not exists origem text,
  add column if not exists preferencias text[] not null default '{}',
  add column if not exists aceita_novidades boolean not null default false,
  add column if not exists aceite_novidades_em timestamptz,
  add column if not exists atualizado_em timestamptz not null default now();

-- Normaliza contato (base da busca de duplicados).
create or replace function public.eda_normalizar_cliente()
returns trigger language plpgsql set search_path = public as $$
begin
  new.nome := btrim(new.nome);
  new.email := nullif(lower(btrim(new.email)), '');
  new.documento := nullif(btrim(new.documento), '');
  new.telefone := nullif(btrim(new.telefone), '');
  if new.aceita_novidades and (tg_op = 'INSERT' or not old.aceita_novidades) then
    new.aceite_novidades_em := now();
  elsif not new.aceita_novidades then
    new.aceite_novidades_em := null;
  end if;
  new.atualizado_em := now();
  return new;
end; $$;
revoke all on function public.eda_normalizar_cliente() from public, anon, authenticated;
drop trigger if exists trg_eda_normalizar_cliente on public.clientes;
create trigger trg_eda_normalizar_cliente before insert or update on public.clientes
  for each row execute function public.eda_normalizar_cliente();

alter table public.clientes
  drop constraint if exists clientes_origem_check,
  drop constraint if exists clientes_preferencias_check,
  drop constraint if exists clientes_nascimento_check;
alter table public.clientes
  add constraint clientes_origem_check check (origem is null or char_length(origem) <= 60),
  add constraint clientes_preferencias_check check (cardinality(preferencias) <= 20),
  add constraint clientes_nascimento_check check (data_nascimento is null or data_nascimento between date '1900-01-01' and current_date);

-- Sem duplicidade de e-mail/documento dentro da mesma operadora.
create unique index if not exists clientes_email_empresa_key on public.clientes (empresa_id, email) where email is not null;
create unique index if not exists clientes_documento_empresa_key on public.clientes (empresa_id, regexp_replace(documento, '\D', '', 'g'))
  where documento is not null and length(regexp_replace(documento, '\D', '', 'g')) >= 5;

-- ---------------------------------------------------------------------------
-- Reserva sempre ligada ao cadastro (mesmo padrão do guia)
-- ---------------------------------------------------------------------------
create or replace function public.eda_sincronizar_cliente_reserva()
returns trigger language plpgsql security definer set search_path = public as $$
declare v_nome text; v_empresa uuid;
begin
  if new.cliente_id is not null and (tg_op = 'INSERT' or new.cliente_id is distinct from old.cliente_id) then
    select nome, empresa_id into v_nome, v_empresa from public.clientes where id = new.cliente_id;
    if v_empresa is distinct from new.empresa_id then
      raise exception 'O cliente selecionado não pertence a esta empresa.';
    end if;
    new.cliente := v_nome;
  elsif new.cliente_id is null and nullif(btrim(new.cliente), '') is not null
        and (tg_op = 'INSERT' or new.cliente is distinct from old.cliente) then
    select id into new.cliente_id from public.clientes
    where empresa_id = new.empresa_id and lower(nome) = lower(btrim(new.cliente))
    order by created_at limit 1;
  end if;
  return new;
end; $$;
revoke all on function public.eda_sincronizar_cliente_reserva() from public, anon, authenticated;
drop trigger if exists zx_eda_sincronizar_cliente_reserva on public.reservas;
create trigger zx_eda_sincronizar_cliente_reserva before insert or update on public.reservas
  for each row execute function public.eda_sincronizar_cliente_reserva();

update public.reservas r set cliente_id = c.id
from public.clientes c
where r.cliente_id is null and c.empresa_id = r.empresa_id and lower(c.nome) = lower(btrim(r.cliente));

-- ---------------------------------------------------------------------------
-- Consultas
-- ---------------------------------------------------------------------------

-- Histórico e indicadores do cliente.
create or replace function public.historico_cliente_eda(p_cliente_id uuid)
returns jsonb language plpgsql stable security definer set search_path = public as $$
declare v_empresa uuid := public.eda_empresa_equipe(); v_hoje date := (now() at time zone 'America/Manaus')::date;
begin
  if v_empresa is null then raise exception 'Sem acesso.'; end if;
  if not exists (select 1 from public.clientes where id = p_cliente_id and empresa_id = v_empresa) then
    raise exception 'Cliente não encontrado.';
  end if;
  return (
    with r as (
      select r.id, r.status, r.quantidade_pessoas,
        coalesce(nullif(r.valor_total, 0), r.valor, 0) as valor,
        coalesce(s.data_inicio, r.data_reserva) as inicio,
        coalesce(s.data_fim, r.data_fim_prevista, s.data_inicio, r.data_reserva) as fim,
        coalesce(p.nome, r.pacote) as passeio, p.categoria
      from public.reservas r
      left join public.passeio_saidas s on s.id = r.saida_id
      left join public.passeios p on p.id = r.passeio_id
      where r.cliente_id = p_cliente_id and r.empresa_id = v_empresa
    ), validas as (select * from r where lower(coalesce(status, '')) <> 'cancelada')
    select jsonb_build_object(
      'viagens', (select count(*) from validas where fim < v_hoje),
      'proximas', (select count(*) from validas where fim >= v_hoje),
      'canceladas', (select count(*) from r where lower(coalesce(status, '')) = 'cancelada'),
      'valor_total', (select coalesce(sum(valor), 0) from validas),
      'primeira', (select min(inicio) from validas),
      'ultima', (select max(inicio) from validas where inicio <= v_hoje),
      'proxima', (select min(inicio) from validas where inicio > v_hoje),
      'categoria_favorita', (select categoria from validas where categoria is not null group by categoria order by count(*) desc limit 1),
      'reservas', coalesce((select jsonb_agg(jsonb_build_object('id', id, 'passeio', passeio, 'inicio', inicio, 'fim', fim,
          'status', status, 'pessoas', quantidade_pessoas, 'valor', valor) order by inicio desc) from r), '[]'::jsonb)
    ));
end; $$;

-- Busca de cadastro parecido antes de criar (evita duplicar o cliente).
create or replace function public.cliente_semelhante_eda(p_nome text, p_email text, p_documento text, p_telefone text)
returns table (id uuid, nome text, motivo text)
language plpgsql stable security definer set search_path = public as $$
declare v_empresa uuid := public.eda_empresa_equipe();
  v_doc text := regexp_replace(coalesce(p_documento, ''), '\D', '', 'g');
  v_tel text := right(regexp_replace(coalesce(p_telefone, ''), '\D', '', 'g'), 9);
begin
  if v_empresa is null then raise exception 'Sem acesso.'; end if;
  return query
  select c.id, c.nome, case
      when c.email is not null and c.email = lower(btrim(p_email)) then 'mesmo e-mail'
      when length(v_doc) >= 5 and regexp_replace(coalesce(c.documento, ''), '\D', '', 'g') = v_doc then 'mesmo documento'
      when length(v_tel) >= 8 and right(regexp_replace(coalesce(c.telefone, ''), '\D', '', 'g'), 9) = v_tel then 'mesmo telefone'
      else 'mesmo nome' end
  from public.clientes c
  where c.empresa_id = v_empresa and (
    (c.email is not null and c.email = lower(btrim(p_email)))
    or (length(v_doc) >= 5 and regexp_replace(coalesce(c.documento, ''), '\D', '', 'g') = v_doc)
    or (length(v_tel) >= 8 and right(regexp_replace(coalesce(c.telefone, ''), '\D', '', 'g'), 9) = v_tel)
    or (length(btrim(coalesce(p_nome, ''))) >= 5 and lower(c.nome) = lower(btrim(p_nome))))
  limit 5;
end; $$;

-- Indicadores leves para a listagem (retorno, última e próxima viagem).
create or replace function public.resumo_clientes_eda()
returns table (cliente_id uuid, viagens integer, ultima date, proxima date)
language plpgsql stable security definer set search_path = public as $$
declare v_empresa uuid := public.eda_empresa_equipe(); v_hoje date := (now() at time zone 'America/Manaus')::date;
begin
  if v_empresa is null then raise exception 'Sem acesso.'; end if;
  return query
  select r.cliente_id,
    count(*) filter (where coalesce(s.data_fim, r.data_fim_prevista, r.data_reserva) < v_hoje)::integer,
    max(coalesce(s.data_inicio, r.data_reserva)) filter (where coalesce(s.data_inicio, r.data_reserva) <= v_hoje),
    min(coalesce(s.data_inicio, r.data_reserva)) filter (where coalesce(s.data_inicio, r.data_reserva) > v_hoje)
  from public.reservas r left join public.passeio_saidas s on s.id = r.saida_id
  where r.empresa_id = v_empresa and r.cliente_id is not null and lower(coalesce(r.status, '')) <> 'cancelada'
  group by r.cliente_id;
end; $$;

revoke all on function public.historico_cliente_eda(uuid) from public, anon;
revoke all on function public.cliente_semelhante_eda(text, text, text, text) from public, anon;
revoke all on function public.resumo_clientes_eda() from public, anon;
grant execute on function public.historico_cliente_eda(uuid) to authenticated;
grant execute on function public.cliente_semelhante_eda(text, text, text, text) to authenticated;
grant execute on function public.resumo_clientes_eda() to authenticated;
