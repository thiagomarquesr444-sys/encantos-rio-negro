-- ERN_RESERVA_CHEGADAS_V1
-- Chegadas e transfers: como o viajante chega (voo regular, fretado, barco,
-- carro) e quem o busca (carro, van, caminhonete, ônibus, barco).
-- Tabela nova e isolada; nenhuma tabela existente é alterada.
-- Volta atrás: drop table public.reserva_chegadas; drop function public.ern_definir_empresa_chegada();

create table if not exists public.reserva_chegadas (
  id uuid primary key default gen_random_uuid(),
  empresa_id uuid not null references public.empresa (id) on delete cascade,
  reserva_id uuid not null unique references public.reservas (id) on delete cascade,

  modo text not null default 'voo_regular'
    check (modo in ('voo_regular', 'fretado', 'barco', 'carro', 'outro')),
  companhia text check (char_length(companhia) <= 80),
  numero text check (char_length(numero) <= 30),
  origem text check (char_length(origem) <= 80),
  destino text check (char_length(destino) <= 80),
  chegada_em timestamptz,
  situacao_horario text not null default 'a_confirmar'
    check (situacao_horario in ('a_confirmar', 'confirmado_cliente', 'confirmado_companhia')),
  passageiros integer check (passageiros between 1 and 999),

  transfer_veiculo text
    check (transfer_veiculo in ('carro', 'van', 'caminhonete', 'onibus', 'barco', 'outro')),
  transfer_responsavel text check (char_length(transfer_responsavel) <= 120),
  transfer_contato text check (char_length(transfer_contato) <= 40),
  transfer_detalhe text check (char_length(transfer_detalhe) <= 120),
  transfer_encontro text check (char_length(transfer_encontro) <= 160),
  transfer_destino text check (char_length(transfer_destino) <= 160),
  observacoes text check (char_length(observacoes) <= 1000),

  criado_por uuid default auth.uid(),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create index if not exists reserva_chegadas_empresa_chegada_idx
  on public.reserva_chegadas (empresa_id, chegada_em);

-- A empresa da chegada é sempre a empresa da reserva (não vem do navegador).
create or replace function public.ern_definir_empresa_chegada()
returns trigger
language plpgsql
security invoker
set search_path = ''
as $$
declare
  v_empresa uuid;
begin
  select r.empresa_id into v_empresa
  from public.reservas r
  where r.id = new.reserva_id;

  if v_empresa is null then
    raise exception 'Reserva não encontrada ou sem permissão de acesso.';
  end if;

  new.empresa_id := v_empresa;
  new.updated_at := now();
  if tg_op = 'INSERT' then
    new.criado_por := (select auth.uid());
    new.created_at := now();
  else
    new.criado_por := old.criado_por;
    new.created_at := old.created_at;
  end if;
  return new;
end;
$$;

drop trigger if exists trg_ern_definir_empresa_chegada on public.reserva_chegadas;
create trigger trg_ern_definir_empresa_chegada
  before insert or update on public.reserva_chegadas
  for each row execute function public.ern_definir_empresa_chegada();

alter table public.reserva_chegadas enable row level security;

-- Cada empresa só lê e grava as próprias chegadas, e só quem acessa Reservas.
create policy reserva_chegadas_select on public.reserva_chegadas
  for select to authenticated
  using (
    empresa_id = (select p.empresa_id from public.perfis p where p.id = (select auth.uid()))
    and (select public.ern_pode_acessar_modulo('reservas'))
  );

create policy reserva_chegadas_insert on public.reserva_chegadas
  for insert to authenticated
  with check (
    empresa_id = (select p.empresa_id from public.perfis p where p.id = (select auth.uid()))
    and (select public.ern_pode_acessar_modulo('reservas'))
  );

create policy reserva_chegadas_update on public.reserva_chegadas
  for update to authenticated
  using (
    empresa_id = (select p.empresa_id from public.perfis p where p.id = (select auth.uid()))
    and (select public.ern_pode_acessar_modulo('reservas'))
  )
  with check (
    empresa_id = (select p.empresa_id from public.perfis p where p.id = (select auth.uid()))
    and (select public.ern_pode_acessar_modulo('reservas'))
  );

create policy reserva_chegadas_delete on public.reserva_chegadas
  for delete to authenticated
  using (
    empresa_id = (select p.empresa_id from public.perfis p where p.id = (select auth.uid()))
    and (select public.ern_pode_acessar_modulo('reservas'))
  );

revoke all on public.reserva_chegadas from anon;
grant select, insert, update, delete on public.reserva_chegadas to authenticated;
