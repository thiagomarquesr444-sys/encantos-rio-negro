'use client';

/*
  EDA_PEDIDOS_ABERTOS_V1 — leads da Iara sem passeio definido.
  Todas as operadoras do município veem o resumo (sem contato).
  Só Pro/Plus atendem; a primeira que atender fica com o pedido e recebe o contato.
*/
import { useCallback, useEffect, useState } from 'react';
import Link from 'next/link';
import { supabase } from '@/lib/supabase';
import CartaoMagneticoEDA from '@/app/components/CartaoMagneticoEDA';

type Aberto = {
  id: string;
  criado_em: string;
  municipio: string | null;
  idioma: string;
  periodo: string | null;
  adultos: number;
  criancas: number;
  mensagem: string | null;
  resumo_iara: string | null;
  pode_atender: boolean;
};

const IDIOMA: Record<string, string> = { PT: 'Português', EN: 'Inglês', ES: 'Espanhol' };

export default function PedidosAbertosEDA({ aoAtender }: { aoAtender: () => void }) {
  const [lista, setLista] = useState<Aberto[] | null>(null);
  const [ocupado, setOcupado] = useState<string | null>(null);
  const [aviso, setAviso] = useState('');

  const carregar = useCallback(async () => {
    const { data } = await supabase.rpc('pedidos_abertos_eda');
    setLista((data ?? []) as Aberto[]);
  }, []);

  useEffect(() => {
    void carregar();
  }, [carregar]);

  async function atender(id: string) {
    setOcupado(id);
    setAviso('');
    const { data, error } = await supabase.rpc('atender_pedido_aberto_eda', { p_pedido: id });
    setOcupado(null);
    if (error || data?.ok !== true) {
      setAviso(
        data?.codigo === 'ERN_PLANO_NECESSARIO'
          ? 'Atender pedidos abertos é um recurso dos planos Pro e Plus.'
          : data?.codigo === 'ERN_PEDIDO_JA_ATENDIDO'
            ? 'Outra operadora já atendeu este pedido.'
            : 'Não foi possível atender agora. Tente de novo.'
      );
      await carregar();
      return;
    }
    setAviso('Pedido é seu! O contato do visitante já aparece na lista abaixo.');
    await carregar();
    aoAtender();
  }

  if (!lista || !lista.length) return null;

  return (
    <section className="mt-5" aria-labelledby="pedidos-abertos">
      <p className="text-xs font-semibold uppercase tracking-widest text-[var(--ern-destaque)]">Iara · oportunidades</p>
      <h2 id="pedidos-abertos" className="mt-1 text-xl text-[var(--ern-texto)]">Pedidos abertos na sua região</h2>
      <p className="mt-1 text-sm text-[var(--ern-secundario)]">
        Visitantes que pediram um passeio que ainda não está no catálogo. A primeira operadora que atender fica com o
        pedido e recebe o contato.
      </p>
      {aviso && <p role="status" className="mt-3 text-sm text-[var(--ern-destaque)]">{aviso}</p>}
      <ul className="mt-4 grid grid-cols-2 gap-2.5 lg:grid-cols-3">
        {lista.map((p) => (
          <CartaoMagneticoEDA key={p.id} as="li" forca={3} className="flex flex-col gap-1.5 rounded-2xl border border-[var(--ern-borda)] bg-[var(--ern-painel)] p-3 md:p-4">
            <p className="text-[10px] font-semibold uppercase tracking-[0.12em] text-[var(--ern-destaque)]">
              {[p.municipio ?? 'Amazonas', IDIOMA[p.idioma] ?? p.idioma].join(' · ')}
            </p>
            <p className="text-sm font-semibold text-[var(--ern-texto)]">
              {p.adultos} adulto(s){p.criancas ? ` + ${p.criancas} criança(s)` : ''}
              {p.periodo ? ` · ${p.periodo}` : ''}
            </p>
            {(p.resumo_iara || p.mensagem) && (
              <p className="line-clamp-3 text-xs leading-5 text-[var(--ern-secundario)]">{p.resumo_iara || p.mensagem}</p>
            )}
            <p className="text-[10px] text-[var(--ern-secundario)]">
              {new Date(p.criado_em).toLocaleDateString('pt-BR', { timeZone: 'America/Manaus' })}
            </p>
            {p.pode_atender ? (
              <button
                type="button"
                disabled={ocupado === p.id}
                onClick={() => void atender(p.id)}
                className="eda-pg-bt eda-pg-bt-ouro mt-auto min-h-10 justify-center"
              >
                {ocupado === p.id ? 'Reservando…' : 'Atender'}
              </button>
            ) : (
              <Link href="/planos" className="eda-pg-bt mt-auto min-h-10 justify-center text-center text-xs">
                Atender com Pro ou Plus
              </Link>
            )}
          </CartaoMagneticoEDA>
        ))}
      </ul>
    </section>
  );
}
