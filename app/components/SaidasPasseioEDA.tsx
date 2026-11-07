'use client';

// EDA_PASSEIOS_PREMIUM_V2: agenda de saídas do passeio (gestão da operadora).
// Cada saída é uma data real com vagas. O portal e o Concierge leem daqui, e o
// banco bloqueia reservas acima do limite (EDA_SAIDA_LOTADA).

import { useCallback, useEffect, useState, type FormEvent } from 'react';
import { supabase } from '@/lib/supabase';
import { dataCurtaEDA } from '@/lib/passeiosPublicosEDA';
import { mensagemFichaEDA, resumoSegurancaEDA, type LinhaResumoEDA } from '@/lib/fichaSaudeEDA';
import { hojeManausEDA, listarSaidasGestaoEDA, type SaidaGestaoEDA } from '@/lib/saidasGestaoEDA';

type Saida = SaidaGestaoEDA;

// EDA_FICHA_SAUDE_V1: o que a equipe precisa saber antes de embarcar.
function ResumoSeguranca({ saidaId }: { saidaId: string }) {
  const [linhas, setLinhas] = useState<LinhaResumoEDA[] | null>(null);
  const [erro, setErro] = useState('');
  useEffect(() => {
    resumoSegurancaEDA({ saidaId }).then(setLinhas).catch((e) => { setErro(mensagemFichaEDA(e)); setLinhas([]); });
  }, [saidaId]);
  if (erro) return <p className="rs-nota">{erro}</p>;
  if (!linhas) return <p className="rs-nota">Analisando fichas…</p>;
  if (!linhas.length) return <p className="rs-nota">Nenhuma reserva nesta saída.</p>;
  const graves = linhas.filter((l) => l.nivel === 'grave').length;
  const pend = linhas.filter((l) => l.nivel === 'pendente').length;
  const atencao = linhas.filter((l) => l.nivel === 'atencao');
  return (
    <div className="rs">
      <p className="rs-cab">
        {graves > 0 && <b data-n="grave">{graves} alerta{graves > 1 ? 's' : ''} grave{graves > 1 ? 's' : ''}</b>}
        {atencao.length > 0 && <b data-n="atencao">{atencao.length} com atenção</b>}
        {pend > 0 && <b data-n="pendente">{pend} pendência{pend > 1 ? 's' : ''}</b>}
        {!graves && !atencao.length && !pend && <b data-n="ok">Todas as fichas sem alertas</b>}
      </p>
      <ul>
        {linhas.filter((l) => l.nivel !== 'ok').map((l, i) => (
          <li key={`${l.reserva_id}-${l.participante_id ?? i}`} data-n={l.nivel}>
            <strong>{l.participante_nome ?? `Reserva de ${l.reserva_cliente ?? 'cliente'}`}</strong>
            <span>{l.alertas.join(' · ')}</span>
          </li>
        ))}
      </ul>
    </div>
  );
}
const hojeManaus = hojeManausEDA;

export default function SaidasPasseioEDA({ passeioId, vagasPadrao }: { passeioId: string; vagasPadrao?: number | null }) {
  const [saidas, setSaidas] = useState<Saida[] | null>(null);
  const [erro, setErro] = useState('');
  const [salvando, setSalvando] = useState(false);
  const [resumo, setResumo] = useState<string | null>(null);
  const [data, setData] = useState('');
  const [horario, setHorario] = useState('');
  const [vagas, setVagas] = useState(String(vagasPadrao && vagasPadrao > 0 ? vagasPadrao : 10));

  const carregar = useCallback(async () => {
    setErro('');
    try {
      setSaidas(await listarSaidasGestaoEDA(passeioId));
    } catch (e) {
      setErro((e as Error).message);
      setSaidas([]);
    }
  }, [passeioId]);

  useEffect(() => { void carregar(); }, [carregar]);

  async function adicionar(e: FormEvent) {
    e.preventDefault();
    const total = Number(vagas);
    if (!data || data < hojeManaus()) { setErro('Escolha uma data a partir de hoje.'); return; }
    if (!Number.isInteger(total) || total < 1 || total > 1000) { setErro('Vagas: número inteiro entre 1 e 1000.'); return; }
    setSalvando(true); setErro('');
    const { data: sessao } = await supabase.auth.getUser();
    if (!sessao.user) { setErro('Entre novamente.'); setSalvando(false); return; }
    // empresa_id é definido pelo banco a partir do passeio; enviado só para
    // satisfazer a política de inserção.
    const { data: dono } = await supabase.from('passeios').select('empresa_id').eq('id', passeioId).single();
    const { error } = await supabase.from('passeio_saidas').insert({
      passeio_id: passeioId,
      empresa_id: dono?.empresa_id,
      data_inicio: data,
      horario: horario || null,
      vagas_total: total,
    });
    setSalvando(false);
    if (error) { setErro('Não foi possível abrir a saída.'); return; }
    setData(''); setHorario('');
    void carregar();
  }

  async function alterarStatus(s: Saida, status: Saida['status']) {
    if (status === 'cancelada' && s.ocupadas > 0 &&
      !window.confirm(`Esta saída tem ${s.ocupadas} pessoa(s) reservada(s). Cancelar mesmo assim? As reservas continuam e precisam ser tratadas.`)) return;
    const { error } = await supabase.from('passeio_saidas').update({ status }).eq('id', s.id);
    if (error) { setErro('Não foi possível atualizar a saída.'); return; }
    void carregar();
  }

  return (
    <section className="eda-saidas" aria-label="Agenda de saídas">
      <header>
        <p>Agenda de saídas</p>
        <span>Datas reais com vagas. É isso que o portal e o Concierge mostram ao turista.</span>
      </header>

      {erro && <div role="alert" className="eda-saidas-erro">{erro}</div>}

      {saidas === null ? (
        <span className="eda-saidas-nota">Carregando…</span>
      ) : saidas.length === 0 ? (
        <span className="eda-saidas-nota">Nenhuma saída futura. Sem datas, o portal mostra “datas sob consulta”.</span>
      ) : (
        <ul>
          {saidas.map((s) => {
            const restantes = s.restantes;
            const pct = Math.min(100, Math.round((s.ocupadas / s.vagas_total) * 100));
            return (
              <li key={s.id} data-status={s.status}>
                <div>
                  <strong>{dataCurtaEDA(s.data_inicio)}{s.data_fim && s.data_fim !== s.data_inicio ? ` – ${dataCurtaEDA(s.data_fim)}` : ''}{s.horario ? ` · ${s.horario.slice(0, 5)}` : ''}</strong>
                  <small>
                    {s.status === 'aberta' ? `${s.ocupadas}/${s.vagas_total} ocupadas · ${restantes} livre${restantes === 1 ? '' : 's'}` : s.status === 'fechada' ? 'Fechada para novas reservas' : 'Cancelada'}
                  </small>
                  <i aria-hidden="true"><b style={{ width: `${pct}%` }} /></i>
                </div>
                <div className="eda-saidas-acoes">
                  {s.ocupadas > 0 && (
                    <button type="button" aria-expanded={resumo === s.id} onClick={() => setResumo(resumo === s.id ? null : s.id)}>
                      Segurança
                    </button>
                  )}
                  {s.status === 'aberta' && <button type="button" onClick={() => alterarStatus(s, 'fechada')}>Fechar</button>}
                  {s.status === 'fechada' && <button type="button" onClick={() => alterarStatus(s, 'aberta')}>Reabrir</button>}
                  {s.status !== 'cancelada' && <button type="button" data-perigo onClick={() => alterarStatus(s, 'cancelada')}>Cancelar</button>}
                </div>
                {resumo === s.id && <div className="eda-saidas-resumo"><ResumoSeguranca saidaId={s.id} /></div>}
              </li>
            );
          })}
        </ul>
      )}

      <form onSubmit={adicionar}>
        <label>Data<input type="date" required min={hojeManaus()} value={data} onChange={(e) => setData(e.target.value)} /></label>
        <label>Horário<input type="time" value={horario} onChange={(e) => setHorario(e.target.value)} /></label>
        <label>Vagas<input type="number" min={1} max={1000} required value={vagas} onChange={(e) => setVagas(e.target.value)} /></label>
        <button type="submit" disabled={salvando}>{salvando ? 'Abrindo…' : '+ Abrir saída'}</button>
      </form>

      <style jsx>{`
        .eda-saidas { margin: 16px 24px 0; padding: 16px; border-radius: 18px; border: 1px solid var(--ern-borda); background: var(--ern-suave); color: var(--ern-texto); }
        header p { margin: 0; font-size: 10px; font-weight: 700; letter-spacing: .16em; text-transform: uppercase; color: var(--ern-destaque); }
        header span, .eda-saidas-nota { display: block; margin-top: 4px; font-size: 12px; color: var(--ern-secundario); }
        .eda-saidas-erro { margin-top: 10px; font-size: 13px; color: var(--ern-erro); }
        ul { list-style: none; margin: 12px 0 0; padding: 0; display: grid; gap: 8px; }
        li { display: flex; flex-wrap: wrap; align-items: center; justify-content: space-between; gap: 12px; padding: 10px 12px; border-radius: 14px; border: 1px solid var(--ern-borda); background: var(--ern-painel); }
        li[data-status='cancelada'] { opacity: .5; }
        li strong { display: block; font-size: 14px; }
        li small { display: block; font-size: 12px; color: var(--ern-secundario); }
        li i { display: block; width: 160px; max-width: 100%; height: 4px; margin-top: 6px; border-radius: 4px; background: var(--ern-borda); overflow: hidden; }
        li i b { display: block; height: 100%; background: var(--ern-destaque); }
        .eda-saidas-acoes { display: flex; gap: 6px; }
        .eda-saidas-resumo { flex-basis: 100%; }
        :global(.rs-nota) { margin: 6px 0 0; font-size: 12px; color: var(--ern-secundario); }
        :global(.rs-cab) { display: flex; flex-wrap: wrap; gap: 6px; margin: 8px 0; }
        :global(.rs-cab b) { padding: 3px 10px; border-radius: 999px; font-size: 12px; border: 1px solid var(--ern-borda); }
        :global(.rs-cab b[data-n='grave']) { border-color: #ef4444; color: #f87171; }
        :global(.rs-cab b[data-n='atencao']) { border-color: var(--ern-destaque); color: var(--ern-destaque); }
        :global(.rs-cab b[data-n='ok']) { border-color: #22c55e; color: #4ade80; }
        :global(.rs ul) { list-style: none; margin: 0; padding: 0; display: grid; gap: 6px; }
        :global(.rs li) { display: grid !important; gap: 2px; padding: 8px 10px !important; border-left: 3px solid var(--ern-borda) !important; background: transparent !important; }
        :global(.rs li[data-n='grave']) { border-left-color: #ef4444 !important; }
        :global(.rs li[data-n='atencao']) { border-left-color: var(--ern-destaque) !important; }
        :global(.rs li span) { font-size: 12px; color: var(--ern-secundario); }
        button { min-height: 34px; padding: 0 12px; border-radius: 10px; border: 1px solid var(--ern-borda); background: transparent; color: var(--ern-texto); font-size: 12px; cursor: pointer; }
        button[data-perigo] { color: var(--ern-erro); }
        form { display: flex; flex-wrap: wrap; align-items: flex-end; gap: 8px; margin-top: 14px; }
        label { display: grid; gap: 4px; font-size: 11px; color: var(--ern-secundario); }
        input { min-height: 38px; padding: 0 10px; border-radius: 10px; border: 1px solid var(--ern-borda); background: var(--ern-painel); color: var(--ern-texto); font-size: 14px; }
        input[type='number'] { width: 84px; }
        form button[type='submit'] { min-height: 38px; background: var(--ern-destaque); border-color: var(--ern-destaque); color: #10140f; font-weight: 700; }
        form button:disabled { opacity: .6; }
      `}</style>
    </section>
  );
}
