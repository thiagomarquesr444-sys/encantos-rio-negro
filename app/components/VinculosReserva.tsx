'use client';

import { useEffect, useState } from 'react';
import { supabase } from '@/lib/supabase';

type Opcao = { id: string; nome: string };
type GuiaOpcao = Opcao & { status: string | null };

type Campos = {
  cliente_id?: string;
  passeio_id?: string;
  cliente?: string;
  pacote?: string;
  guia?: string;
};

type Props = {
  clienteId: string;
  passeioId: string;
  clienteNome: string;
  passeioNome: string;
  guiaNome: string;
  bloqueado: boolean;
  onChange: (campos: Campos) => void;
};

export default function VinculosReserva({
  clienteId,
  passeioId,
  clienteNome,
  passeioNome,
  guiaNome,
  bloqueado,
  onChange,
}: Props) {
  const [clientes, setClientes] = useState<Opcao[]>([]);
  const [passeios, setPasseios] = useState<Opcao[]>([]);
  const [guias, setGuias] = useState<GuiaOpcao[]>([]);
  const [carregando, setCarregando] = useState(true);
  const [erro, setErro] = useState('');
  const [tentativa, setTentativa] = useState(0);

  useEffect(() => {
    let ativo = true;

    async function carregar() {
      try {
        const { data: auth, error: erroAuth } =
          await supabase.auth.getUser();

        if (erroAuth || !auth.user) {
          throw new Error('Entre novamente para consultar os cadastros.');
        }

        const { data: perfil, error: erroPerfil } = await supabase
          .from('perfis')
          .select('empresa_id')
          .eq('id', auth.user.id)
          .single();

        if (erroPerfil || !perfil?.empresa_id) {
          throw new Error('Não foi possível identificar sua empresa.');
        }

        async function listar(tabela: 'clientes' | 'passeios') {
          const opcoes: Opcao[] = [];
          let esperado: number | null = null;

          for (let inicio = 0; inicio < 10000; inicio += 200) {
            const { data, count, error } = await supabase
              .from(tabela)
              .select('id,nome', { count: 'exact' })
              .eq('empresa_id', perfil!.empresa_id)
              .order('id')
              .range(inicio, inicio + 199);

            if (error) {
              throw new Error(`Não foi possível consultar ${tabela}.`);
            }

            if (count === null || count > 10000) {
              throw new Error(
                'O cadastro exige um seletor com busca no servidor.',
              );
            }

            if (esperado !== null && esperado !== count) {
              throw new Error('Os cadastros mudaram. Atualize as opções.');
            }

            esperado = count;
            opcoes.push(...((data ?? []) as Opcao[]));

            if (opcoes.length >= count) break;
            if (!data?.length) {
              throw new Error('A consulta dos cadastros ficou incompleta.');
            }
          }

          if (
            opcoes.length !== esperado ||
            new Set(opcoes.map((item) => item.id)).size !== opcoes.length
          ) {
            throw new Error('Não foi possível obter opções consistentes.');
          }

          return opcoes.sort((a, b) =>
            a.nome.localeCompare(b.nome, 'pt-BR'),
          );
        }

        async function listarGuias(): Promise<GuiaOpcao[]> {
          const lista: GuiaOpcao[] = [];
          let esperado: number | null = null;

          for (let inicio = 0; inicio < 10000; inicio += 200) {
            const { data, count, error } = await supabase
              .from('guias')
              .select('id,nome,status', { count: 'exact' })
              .eq('empresa_id', perfil!.empresa_id)
              .order('id')
              .range(inicio, inicio + 199);

            if (error || count === null || count > 10000) {
              throw new Error('Não foi possível consultar os guias da operadora.');
            }

            if (esperado !== null && esperado !== count) {
              throw new Error('O cadastro de guias mudou. Atualize as opções.');
            }

            esperado = count;
            lista.push(...((data ?? []) as GuiaOpcao[]));

            if (lista.length >= count) break;

            if (!data?.length) {
              throw new Error('Consulta de guias incompleta.');
            }
          }

          if (
            lista.length !== esperado ||
            lista.some(item => !item.id || !item.nome) ||
            new Set(lista.map(item => item.id)).size !== lista.length
          ) {
            throw new Error('Cadastro de guias inconsistente.');
          }

          return lista.sort((a, b) =>
            a.nome.localeCompare(b.nome, 'pt-BR')
          );
        }

        const [listaClientes, listaPasseios, listaGuias] =
          await Promise.all([
            listar('clientes'),
            listar('passeios'),
            listarGuias(),
          ]);

        if (ativo) {
          setClientes(listaClientes);
          setPasseios(listaPasseios);
          setGuias(listaGuias);
          setCarregando(false);
        }
      } catch (falha) {
        if (ativo) {
          setErro(
            falha instanceof Error
              ? falha.message
              : 'Não foi possível carregar os vínculos.',
          );
          setCarregando(false);
        }
      }
    }

    void carregar();
    return () => { ativo = false; };
  }, [tentativa]);

  const classe =
    'mt-2 min-h-12 w-full min-w-0 rounded-xl border border-white/15 bg-[#07110E] px-3 text-sm text-[#EDEDE3] disabled:opacity-50';

  return (
    <section
      aria-label="Vínculos com os cadastros"
      className="rounded-2xl border border-[#E3A144]/20 bg-[#E3A144]/5 p-4"
    >
      <h3 className="text-sm font-semibold text-[#F4C77E]">
        Selecionar dos cadastros da empresa
      </h3>
      <p className="mt-2 text-xs leading-6 text-[#EDEDE3]/70">
        Opcional. A seleção preenche o nome e salva o vínculo.
        Editar o nome manualmente remove esse vínculo.
        O passeio não altera o valor comercial informado.
      </p>

      {erro && (
        <div role="alert" className="mt-3 text-sm text-amber-200">
          <p>{erro}</p>
          <button
            type="button"
            disabled={bloqueado}
            className="mt-2 min-h-11 rounded-xl border border-white/20 px-3"
            onClick={() => {
              setErro('');
              setCarregando(true);
              setTentativa((atual) => atual + 1);
            }}
          >
            Tentar novamente
          </button>
        </div>
      )}

      <div className="mt-4 grid min-w-0 gap-4 md:grid-cols-3">
        <label className="min-w-0 text-xs text-[#EDEDE3]/80">
          Cliente cadastrado
          <select
            value={clienteId}
            disabled={bloqueado || carregando || Boolean(erro)}
            className={classe}
            onChange={(event) => {
              const opcao = clientes.find(
                (item) => item.id === event.target.value,
              );
              onChange({
                cliente_id: opcao?.id ?? '',
                ...(opcao ? { cliente: opcao.nome } : {}),
              });
            }}
          >
            <option value="">
              {carregando ? 'Carregando…' : 'Sem vínculo / digitação livre'}
            </option>
            {clienteId && !clientes.some((item) => item.id === clienteId) && (
              <option value={clienteId}>
                {clienteNome || 'Cliente vinculado'} — indisponível na lista
              </option>
            )}
            {clientes.map((item) => (
              <option key={item.id} value={item.id}>
                {item.nome} · {item.id.slice(0, 8)}
              </option>
            ))}
          </select>
        </label>

        <label className="min-w-0 text-xs text-[#EDEDE3]/80">
          Passeio cadastrado
          <select
            value={passeioId}
            disabled={bloqueado || carregando || Boolean(erro)}
            className={classe}
            onChange={(event) => {
              const opcao = passeios.find(
                (item) => item.id === event.target.value,
              );
              onChange({
                passeio_id: opcao?.id ?? '',
                ...(opcao ? { pacote: opcao.nome } : {}),
              });
            }}
          >
            <option value="">
              {carregando ? 'Carregando…' : 'Sem vínculo / digitação livre'}
            </option>
            {passeioId && !passeios.some((item) => item.id === passeioId) && (
              <option value={passeioId}>
                {passeioNome || 'Passeio vinculado'} — indisponível na lista
              </option>
            )}
            {passeios.map((item) => (
              <option key={item.id} value={item.id}>
                {item.nome} · {item.id.slice(0, 8)}
              </option>
            ))}
          </select>
        </label>

        <label className="min-w-0 text-xs text-[#EDEDE3]/80">
          Guia responsável
          <select
            aria-label="Selecionar guia da operadora"
            value={
              guias.some(item => item.nome === guiaNome)
                ? guiaNome
                : guiaNome ? '__anterior__' : ''
            }
            disabled={bloqueado || carregando || Boolean(erro)}
            className={classe}
            onChange={(event) => {
              const escolhido = guias.find(
                item => item.nome === event.target.value
              );
              onChange({ guia: escolhido?.nome ?? '' });
            }}
          >
            <option value="">
              {carregando ? 'Carregando…' : 'Ainda não definido'}
            </option>
            {guiaNome &&
              !guias.some(item => item.nome === guiaNome) && (
                <option value="__anterior__">
                  {guiaNome} — registro anterior
                </option>
              )}
            {guias
              .filter(item =>
                ['ativo', 'em tour'].includes(
                  (item.status || '').trim().toLowerCase()
                )
              )
              .map(item => (
                <option key={item.id} value={item.nome}>
                  {item.nome}
                  {item.status === 'Em Tour' ? ' · Em tour' : ''}
                </option>
              ))}
          </select>
          <span className="mt-2 block text-[11px] leading-5 text-[#B4C8BB]">
            Profissionais cadastrados nesta operadora.
          </span>
        </label>
      </div>
    </section>
  );
}