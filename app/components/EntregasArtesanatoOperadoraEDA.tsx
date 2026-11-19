'use client';

/*
  EDA_ARTESANATO_V2 — peças de artesãos que a operadora entrega ao turista
  durante o passeio. A venda e o Pix são entre turista e artesão; a operadora
  só aceita levar, recebe a peça e entrega. Aparece só quando há entregas.
*/
import { useCallback, useEffect, useState } from 'react';
import { supabase } from '@/lib/supabase';

type Entrega = {
  id: string; peca: string; comprador: string; data_passeio: string; status: string; observacao: string | null;
};

const SITUACAO: Record<string, string> = {
  aguardando: 'Novo pedido do artesão',
  aceita: 'Aceita: aguardando a peça',
  recebida: 'Peça com a equipe',
};
const PROXIMO: Record<string, { status: string; rotulo: string }[]> = {
  aguardando: [{ status: 'aceita', rotulo: 'Aceitar' }, { status: 'recusada', rotulo: 'Não posso levar' }],
  aceita: [{ status: 'recebida', rotulo: 'Peça recebida' }, { status: 'recusada', rotulo: 'Não posso levar' }],
  recebida: [{ status: 'entregue', rotulo: 'Entregue ao turista' }],
};

export default function EntregasArtesanatoOperadoraEDA() {
  const [itens, setItens] = useState<Entrega[]>([]);
  const [erro, setErro] = useState('');

  const carregar = useCallback(async () => {
    const hoje = new Date().toLocaleDateString('en-CA', { timeZone: 'America/Manaus' });
    const { data } = await supabase
      .from('entregas_artesanato')
      .select('id,peca,comprador,data_passeio,status,observacao')
      .in('status', ['aguardando', 'aceita', 'recebida'])
      .gte('data_passeio', hoje)
      .order('data_passeio')
      .limit(30);
    setItens((data ?? []) as Entrega[]);
  }, []);

  useEffect(() => {
    void carregar();
  }, [carregar]);

  async function mudar(id: string, status: string) {
    setErro('');
    const { error } = await supabase.rpc('atualizar_entrega_artesanato_eda', { p_id: id, p_status: status });
    if (error) setErro('Não foi possível atualizar agora.');
    await carregar();
  }

  if (!itens.length) return null;

  return (
    <section aria-labelledby="eda-artesanato" className="mb-10">
      <p className="eda-sec-eb">Feito na Amazônia</p>
      <h2 id="eda-artesanato" className="eda-sec-titulo">Peças de artesãos para entregar no passeio</h2>
      <p className="mt-1 text-sm text-[var(--ern-secundario,#B8C9BF)]">
        O turista já comprou e pagou direto ao artesão. Sua equipe só leva a peça e entrega no passeio.
      </p>
      {erro && <p className="mt-2 text-sm text-red-300">{erro}</p>}
      <ul className="mt-4 grid grid-cols-2 gap-2.5 sm:gap-4 lg:grid-cols-4">
        {itens.map((e) => (
          <li key={e.id} className="rounded-[18px] border border-white/10 bg-white/[0.03] p-3 text-xs sm:p-4">
            <p className="text-sm font-semibold">{e.peca}</p>
            <p className="mt-1 opacity-75">Para {e.comprador} · {e.data_passeio.split('-').reverse().join('/')}</p>
            {e.observacao && <p className="mt-1 opacity-60">{e.observacao}</p>}
            <p className="mt-2 font-semibold text-[var(--ern-destaque,#F4C77E)]">{SITUACAO[e.status]}</p>
            <div className="mt-2 flex flex-wrap gap-1.5">
              {(PROXIMO[e.status] ?? []).map((p) => (
                <button key={p.status} type="button" onClick={() => void mudar(e.id, p.status)}
                  className="min-h-9 rounded-full border border-current/40 bg-transparent px-3 text-xs font-semibold">
                  {p.rotulo}
                </button>
              ))}
            </div>
          </li>
        ))}
      </ul>
    </section>
  );
}
