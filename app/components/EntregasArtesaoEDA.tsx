'use client';

/*
  EDA_ARTESANATO_V2 — o artesão combinou com o turista que a peça será entregue
  durante o passeio. Ele registra aqui e a operadora recebe o aviso (e o Jurupari
  lembra na véspera). Só o primeiro nome do comprador; apagado 120 dias após o passeio.
*/
import { useCallback, useEffect, useState } from 'react';
import { supabase } from '@/lib/supabase';
import { confirmarEDA } from '@/lib/dialogoEDA';

type Operadora = { empresa_id: string; nome: string; cidade: string | null };
type Peca = { id: string; titulo: string };
type Entrega = {
  id: string; empresa_id: string; peca: string; comprador: string; data_passeio: string; status: string; observacao: string | null;
};

const SITUACAO: Record<string, string> = {
  aguardando: 'Aguardando a operadora',
  aceita: 'Operadora aceitou: leve a peça até ela',
  recebida: 'Peça com a operadora',
  entregue: 'Entregue ao turista',
  recusada: 'Operadora não pode levar',
  cancelada: 'Cancelada',
};

const ERROS: Record<string, string> = {
  EDA_DATA_INVALIDA: 'Escolha a data do passeio (de hoje em diante).',
  EDA_OPERADORA_INVALIDA: 'Escolha uma operadora da lista.',
  EDA_PECA_INVALIDA: 'Peça não encontrada na sua vitrine.',
  EDA_ENTREGAS_LIMITE: 'Você já tem 30 entregas em andamento.',
};

const INPUT =
  'mt-2 min-h-12 w-full rounded-xl border border-white/10 bg-[#07110E] px-3 text-base text-[#EDEDE3] outline-none focus-visible:ring-2 focus-visible:ring-[#F4C77E]';

function hojeManaus() {
  return new Date().toLocaleDateString('en-CA', { timeZone: 'America/Manaus' });
}

export default function EntregasArtesaoEDA({ usuarioId }: { usuarioId: string }) {
  const [operadoras, setOperadoras] = useState<Operadora[]>([]);
  const [pecas, setPecas] = useState<Peca[]>([]);
  const [entregas, setEntregas] = useState<Entrega[]>([]);
  const [empresa, setEmpresa] = useState('');
  const [peca, setPeca] = useState('');
  const [pecaLivre, setPecaLivre] = useState('');
  const [comprador, setComprador] = useState('');
  const [data, setData] = useState('');
  const [obs, setObs] = useState('');
  const [ocupado, setOcupado] = useState(false);
  const [aviso, setAviso] = useState<{ tipo: 'ok' | 'erro'; texto: string } | null>(null);

  const carregar = useCallback(async () => {
    const [ops, itens, ent] = await Promise.all([
      supabase.rpc('operadoras_entrega_artesanato_eda'),
      supabase.from('vitrine_itens').select('id,titulo').eq('usuario_id', usuarioId).order('titulo'),
      supabase
        .from('entregas_artesanato')
        .select('id,empresa_id,peca,comprador,data_passeio,status,observacao')
        .eq('fornecedor_id', usuarioId)
        .order('data_passeio', { ascending: false })
        .limit(40),
    ]);
    setOperadoras((ops.data ?? []) as Operadora[]);
    setPecas((itens.data ?? []) as Peca[]);
    setEntregas((ent.data ?? []) as Entrega[]);
  }, [usuarioId]);

  useEffect(() => {
    void carregar();
  }, [carregar]);

  const nomeOperadora = (id: string) => operadoras.find((o) => o.empresa_id === id)?.nome ?? 'Operadora';

  async function registrar() {
    setAviso(null);
    const titulo = peca ? pecas.find((p) => p.id === peca)?.titulo ?? '' : pecaLivre.trim();
    if (!empresa) return setAviso({ tipo: 'erro', texto: 'Escolha a operadora do passeio.' });
    if (titulo.length < 2) return setAviso({ tipo: 'erro', texto: 'Diga qual é a peça.' });
    const primeiroNome = comprador.trim().split(/\s+/)[0] ?? '';
    if (primeiroNome.length < 2) return setAviso({ tipo: 'erro', texto: 'Coloque o primeiro nome do turista.' });
    if (!data) return setAviso({ tipo: 'erro', texto: 'Coloque a data do passeio.' });
    setOcupado(true);
    const { error } = await supabase.rpc('registrar_entrega_artesanato_eda', {
      p_empresa: empresa,
      p_item: peca || null,
      p_peca: titulo,
      p_comprador: primeiroNome,
      p_data: data,
      p_observacao: obs.trim() || null,
    });
    setOcupado(false);
    if (error) {
      const chave = Object.keys(ERROS).find((k) => error.message.includes(k));
      return setAviso({ tipo: 'erro', texto: chave ? ERROS[chave] : 'Não foi possível registrar agora.' });
    }
    setPeca(''); setPecaLivre(''); setComprador(''); setData(''); setObs('');
    setAviso({ tipo: 'ok', texto: 'Pronto. A operadora recebeu o aviso.' });
    await carregar();
  }

  async function cancelar(e: Entrega) {
    if (!(await confirmarEDA(`Cancelar a entrega de "${e.peca}"?`))) return;
    const { error } = await supabase.rpc('atualizar_entrega_artesanato_eda', { p_id: e.id, p_status: 'cancelada' });
    if (error) setAviso({ tipo: 'erro', texto: 'Não foi possível cancelar.' });
    await carregar();
  }

  return (
    <section className="mt-6 rounded-3xl border border-white/10 bg-[#0D1B16] p-6 sm:p-8">
      <p className="text-xs font-semibold uppercase tracking-[0.16em] text-[#F4C77E]">Entrega no passeio</p>
      <h2 className="mt-2 text-2xl font-semibold text-[#F0F0E8]">O turista vai receber durante o passeio?</h2>
      <p className="mt-2 text-sm leading-7 text-[#EDEDE3]/65">
        Depois de combinar e receber o Pix, avise aqui qual operadora leva o turista. Ela confirma, você entrega a
        peça a ela antes da saída e ela entrega ao turista.
      </p>

      <div className="mt-6 grid gap-4 sm:grid-cols-2">
        <label className="text-sm text-[#EDEDE3]">
          Operadora do passeio
          <select value={empresa} onChange={(e) => setEmpresa(e.target.value)} className={INPUT}>
            <option value="">Escolha…</option>
            {operadoras.map((o) => (
              <option key={o.empresa_id} value={o.empresa_id}>
                {o.nome}{o.cidade ? ` · ${o.cidade}` : ''}
              </option>
            ))}
          </select>
        </label>
        <label className="text-sm text-[#EDEDE3]">
          Peça
          <select value={peca} onChange={(e) => setPeca(e.target.value)} className={INPUT}>
            <option value="">Outra peça (escrever)</option>
            {pecas.map((p) => (
              <option key={p.id} value={p.id}>{p.titulo}</option>
            ))}
          </select>
        </label>
        {!peca && (
          <label className="text-sm text-[#EDEDE3]">
            Nome da peça
            <input value={pecaLivre} maxLength={90} onChange={(e) => setPecaLivre(e.target.value)} className={INPUT} placeholder="Ex.: Cesto de arumã" />
          </label>
        )}
        <label className="text-sm text-[#EDEDE3]">
          Primeiro nome do turista
          <input value={comprador} maxLength={40} onChange={(e) => setComprador(e.target.value)} className={INPUT} placeholder="Ex.: Ana" />
        </label>
        <label className="text-sm text-[#EDEDE3]">
          Data do passeio
          <input type="date" min={hojeManaus()} value={data} onChange={(e) => setData(e.target.value)} className={INPUT} />
        </label>
        <label className="text-sm text-[#EDEDE3] sm:col-span-2">
          Recado para a operadora (opcional)
          <input value={obs} maxLength={300} onChange={(e) => setObs(e.target.value)} className={INPUT} placeholder="Ex.: peça frágil, entrego na sexta à tarde" />
        </label>
      </div>

      <div className="mt-5 flex flex-wrap items-center gap-3">
        <button type="button" onClick={() => void registrar()} disabled={ocupado || !operadoras.length}
          className="inline-flex min-h-12 items-center rounded-full border border-white/35 px-5 text-sm font-semibold text-white disabled:opacity-40">
          {ocupado ? 'Enviando…' : 'Avisar a operadora'}
        </button>
        {!operadoras.length && <span className="text-xs text-[#EDEDE3]/60">Ainda não há operadoras publicadas no portal.</span>}
        {aviso && <span className={`text-sm ${aviso.tipo === 'ok' ? 'text-emerald-300' : 'text-red-300'}`}>{aviso.texto}</span>}
      </div>

      {entregas.length > 0 && (
        <ul className="mt-6 grid grid-cols-2 gap-3 sm:grid-cols-3">
          {entregas.map((e) => (
            <li key={e.id} className="rounded-2xl border border-white/10 bg-[#07110E] p-3 text-xs text-[#EDEDE3]/75">
              <p className="text-sm font-semibold text-[#F0F0E8]">{e.peca}</p>
              <p className="mt-1">{e.comprador} · {e.data_passeio.split('-').reverse().join('/')}</p>
              <p>{nomeOperadora(e.empresa_id)}</p>
              <p className="mt-1 font-semibold text-[#F4C77E]">{SITUACAO[e.status] ?? e.status}</p>
              {(e.status === 'aguardando' || e.status === 'aceita') && (
                <button type="button" onClick={() => void cancelar(e)} className="mt-2 rounded-full border border-red-400/30 px-3 py-1 text-red-300">
                  Cancelar
                </button>
              )}
            </li>
          ))}
        </ul>
      )}
    </section>
  );
}
