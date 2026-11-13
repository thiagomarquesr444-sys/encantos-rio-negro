'use client';

// EDA_TREINO_NA_PLATAFORMA_V1: prova da EDA rodando dentro da plataforma, com a sessão de quem
// está logado (sem token, sem captcha). Só PREPARA ações — nada é gravado sem "Autorizar".
// Consome perguntas da cota diária da EDA (1 por cenário).
import '@/app/components/padrao-paginas-eda.css';
import { useRef, useState } from 'react';
import { supabase } from '@/lib/supabase';
import { CabecalhoEDA, PaginaEDA } from '@/app/components/PadraoPaginaEDA';
import cenarios from '@/lib/treinoEDACenarios.json';

type Espera = { acao?: string; tabela?: string; navegar?: string; semAcao?: boolean; naoPergunta?: boolean };
type Cenario = { pedido: string; pagina?: string; espera: Espera };
type Resultado = { pedido: string; ok: boolean; resposta: string; acoes: string[]; motivo: string };

const LISTA = cenarios as Cenario[];

function avaliar(e: Espera, j: { resposta?: string; acoes?: { tipo?: string; tabela?: string }[]; navegar?: { href?: string } | null }): string {
  const acoes = Array.isArray(j.acoes) ? j.acoes : [];
  if (e.acao && !acoes.some(a => a.tipo === e.acao && (!e.tabela || a.tabela === e.tabela))) return `esperava ${e.acao}${e.tabela ? ` em ${e.tabela}` : ''}`;
  if (e.navegar && !j.navegar?.href?.startsWith(e.navegar)) return `esperava abrir ${e.navegar}`;
  if (e.semAcao && acoes.length) return 'não devia preparar ação';
  if (e.naoPergunta && /\b(qual (a )?data|que dia|qual o hor[aá]rio|qual o pre[cç]o)\b/i.test(j.resposta ?? '')) return 'perguntou o que está no sistema';
  return '';
}

export default function TreinoEDAPage() {
  const [rodando, setRodando] = useState(false);
  const [resultados, setResultados] = useState<Resultado[]>([]);
  const [erro, setErro] = useState('');
  const parar = useRef(false);

  async function rodar() {
    setErro(''); setResultados([]); setRodando(true); parar.current = false;
    const { data } = await supabase.auth.getSession();
    const token = data.session?.access_token;
    if (!token) { setErro('Sessão expirada. Entre novamente.'); setRodando(false); return; }
    for (const c of LISTA) {
      if (parar.current) break;
      let res: Resultado;
      try {
        const r = await fetch('/api/eda-ia', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${token}` },
          body: JSON.stringify({ modo: 'operadora', pagina: c.pagina ?? 'painel', mensagens: [{ papel: 'usuario', texto: c.pedido }] }),
        });
        const j = await r.json().catch(() => ({}));
        if (r.status === 429) { setErro(j.erro ?? 'Cota de perguntas de hoje acabou.'); break; }
        const motivo = r.ok ? avaliar(c.espera, j) : (j.erro ?? `erro ${r.status}`);
        res = { pedido: c.pedido, ok: !motivo, motivo, resposta: String(j.resposta ?? j.erro ?? '').slice(0, 220), acoes: (Array.isArray(j.acoes) ? j.acoes : []).map((a: { resumo?: string }) => String(a.resumo ?? '')) };
      } catch {
        res = { pedido: c.pedido, ok: false, motivo: 'sem conexão', resposta: '', acoes: [] };
      }
      setResultados(x => [...x, res]);
      await new Promise(ok => setTimeout(ok, 1500)); // respeita a cota grátis da IA
    }
    setRodando(false);
  }

  const acertos = resultados.filter(r => r.ok).length;
  const nota = resultados.length ? Math.round((acertos / resultados.length) * 100) : 0;
  const relatorio = () => [
    `NOTA DA EDA: ${acertos}/${resultados.length} (${nota}%)`,
    ...resultados.filter(r => !r.ok).map(r => `✘ ${r.pedido}\n   motivo: ${r.motivo}\n   resposta: ${r.resposta}${r.acoes.length ? `\n   ações: ${r.acoes.join(' | ')}` : ''}`),
  ].join('\n');

  return (
    <PaginaEDA>
      <CabecalhoEDA
        etiqueta="Comando EDA · Treino"
        titulo="Treino da EDA"
        resumo={`${LISTA.length} pedidos reais de operador. A EDA só prepara as ações — nada é gravado. Usa ${LISTA.length} perguntas da cota de hoje.`}
        acoes={
          <div className="eda-pg-acoes">
            {rodando
              ? <button type="button" className="eda-pg-bt" onClick={() => { parar.current = true; }}>Parar</button>
              : <button type="button" className="eda-pg-bt eda-pg-bt-ouro" onClick={() => void rodar()}>Rodar treino</button>}
            {!rodando && resultados.length > 0 && (
              <button type="button" className="eda-pg-bt" onClick={() => void navigator.clipboard.writeText(relatorio())}>Copiar relatório</button>
            )}
          </div>
        }
      />
      {erro && <p className="eda-pg-aviso eda-pg-aviso-er" role="alert">{erro}</p>}
      {resultados.length > 0 && (
        <section className="eda-pg-tabela-caixa" style={{ padding: 14 }}>
          <h2 className="eda-pg-bloco-titulo" style={{ margin: '0 0 10px' }}>
            Nota: {acertos}/{resultados.length} ({nota}%){rodando ? ` · rodando ${resultados.length}/${LISTA.length}…` : nota >= 80 ? ' · aprovada ✔' : ' · precisa treinar'}
          </h2>
          <ul style={{ listStyle: 'none', margin: 0, padding: 0, display: 'grid', gap: 8 }}>
            {resultados.map((r, i) => (
              <li key={i} className="eda-pg-cartao" style={{ display: 'grid', gap: 4 }}>
                <strong>{r.ok ? '✔' : '✘'} {r.pedido}</strong>
                {!r.ok && <span className="eda-pg-texto-mut" style={{ fontSize: 12.5 }}>Motivo: {r.motivo}</span>}
                {r.resposta && <span className="eda-pg-texto-mut" style={{ fontSize: 12.5 }}>EDA: {r.resposta}</span>}
                {r.acoes.map((a, k) => <span key={k} style={{ fontSize: 12.5 }}>→ {a}</span>)}
              </li>
            ))}
          </ul>
        </section>
      )}
    </PaginaEDA>
  );
}
