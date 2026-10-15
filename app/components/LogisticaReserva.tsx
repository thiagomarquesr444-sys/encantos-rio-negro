'use client';

import { useEffect, useState } from 'react';
import { supabase } from '@/lib/supabase';

type Embarcacao = {
  id: string;
  nome: string;
  capacidade: number | null;
};

type Props = {
  horario: string;
  embarcacaoId: string;
  bloqueado: boolean;
  onChange: (campos: {
    horario?: string;
    embarcacao_id?: string;
  }) => void;
};

export default function LogisticaReserva({
  horario,
  embarcacaoId,
  bloqueado,
  onChange,
}: Props) {
  const [embarcacoes, setEmbarcacoes] = useState<Embarcacao[]>([]);
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
          throw new Error('Entre novamente para consultar as embarcações.');
        }

        const { data: perfil, error: erroPerfil } = await supabase
          .from('perfis')
          .select('empresa_id')
          .eq('id', auth.user.id)
          .single();

        if (erroPerfil || !perfil?.empresa_id) {
          throw new Error('Não foi possível identificar sua empresa.');
        }

        const lista: Embarcacao[] = [];
        let esperado: number | null = null;

        for (let inicio = 0; inicio < 10000; inicio += 200) {
          const { data, count, error } = await supabase
            .from('embarcacoes')
            .select('id,nome,capacidade', { count: 'exact' })
            .eq('empresa_id', perfil.empresa_id)
            .order('id')
            .range(inicio, inicio + 199);

          if (error) {
            throw new Error('Não foi possível consultar as embarcações.');
          }

          if (count === null || count > 10000) {
            throw new Error('O catálogo exige uma busca no servidor.');
          }

          if (esperado !== null && esperado !== count) {
            throw new Error('O catálogo mudou. Atualize as opções.');
          }

          esperado = count;
          lista.push(...((data ?? []) as Embarcacao[]));

          if (lista.length >= count) break;
          if (!data?.length) {
            throw new Error('A consulta das embarcações ficou incompleta.');
          }
        }

        if (
          lista.length !== esperado ||
          new Set(lista.map((item) => item.id)).size !== lista.length
        ) {
          throw new Error('Não foi possível obter opções consistentes.');
        }

        if (ativo) {
          setEmbarcacoes(
            lista.sort((a, b) => a.nome.localeCompare(b.nome, 'pt-BR')),
          );
          setCarregando(false);
        }
      } catch (falha) {
        if (ativo) {
          setErro(
            falha instanceof Error
              ? falha.message
              : 'Não foi possível carregar as embarcações.',
          );
          setCarregando(false);
        }
      }
    }

    void carregar();

    return () => { ativo = false; };
  }, [tentativa]);

  const campo =
    'mt-2 min-h-12 w-full min-w-0 rounded-xl border border-white/15 bg-[#07110E] px-3 text-sm text-[#EDEDE3] disabled:opacity-50 [color-scheme:dark]';

  return (
    <section
      aria-label="Logística da reserva"
      className="mt-4 rounded-2xl border border-white/10 bg-white/[0.02] p-4"
    >
      <h3 className="text-sm font-semibold text-[#F4C77E]">
        Horário e embarcação
      </h3>
      <p className="mt-2 text-xs leading-6 text-[#EDEDE3]/70">
        Dados opcionais para organizar a operação.
        O horário utiliza a referência local de Manaus.
      </p>

      <div className="mt-4 grid min-w-0 gap-4 sm:grid-cols-2">
        <label className="min-w-0 text-xs text-[#EDEDE3]/80">
          Horário de saída
          <input
            type="time"
            step={60}
            value={horario}
            disabled={bloqueado}
            onChange={(event) => onChange({ horario: event.target.value })}
            className={campo}
          />
        </label>

        <label className="min-w-0 text-xs text-[#EDEDE3]/80">
          Embarcação da empresa
          <select
            value={embarcacaoId}
            disabled={bloqueado || carregando || Boolean(erro)}
            className={campo}
            onChange={(event) =>
              onChange({ embarcacao_id: event.target.value })
            }
          >
            <option value="">
              {carregando ? 'Carregando…' : 'Sem embarcação vinculada'}
            </option>

            {embarcacaoId &&
              !embarcacoes.some((item) => item.id === embarcacaoId) && (
                <option value={embarcacaoId}>
                  Vínculo atual — embarcação indisponível na lista
                </option>
              )}

            {embarcacoes.map((item) => (
              <option key={item.id} value={item.id}>
                {item.nome}
                {item.capacidade != null
                  ? ` · capacidade cadastrada: ${item.capacidade}`
                  : ''}
                {` · ${item.id.slice(0, 8)}`}
              </option>
            ))}
          </select>
        </label>
      </div>

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
            Atualizar embarcações
          </button>
        </div>
      )}

      <p className="mt-3 text-xs leading-6 text-[#EDEDE3]/65">
        A seleção vincula a embarcação. Ainda não verifica conflitos de
        agenda, lotação ou disponibilidade operacional.
      </p>
    </section>
  );
}