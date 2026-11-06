'use client';

// ERN_PERGUNTA_EDA_V1
// A EDA pergunta direto na tela, enquanto a pessoa opera. Uma pergunta por vez:
// - aparece depois de um tempo de uso (não atrapalha a entrada);
// - respondida: a próxima pergunta só vem depois de 30 dias;
// - fechada no X: volta em outro dia, no máximo 3 vezes; depois desiste.
// O controle fica por conta (id do usuário) neste aparelho. As respostas vão
// para a mesma API de feedback, com as mesmas validações e limites.

import { useEffect, useId, useRef, useState } from 'react';
import { usePathname } from 'next/navigation';
import { supabase } from '@/lib/supabase';

type Pergunta = {
  id: string;
  texto: string;
  opcoes: [string, string, string, string];
  seguimentoRuim: string;
  seguimentoBom: string;
};

const PERGUNTAS: Pergunta[] = [
  {
    id: 'geral',
    texto: 'Como a Encantos Gestão está se saindo para você?',
    opcoes: ['Ruim', 'Razoável', 'Bom', 'Ótimo'],
    seguimentoRuim: 'O que mais está atrapalhando o seu dia?',
    seguimentoBom: 'O que faria ficar ainda melhor?',
  },
  {
    id: 'tempo',
    texto: 'A EDA tem ajudado você a ganhar tempo na operação?',
    opcoes: ['Não', 'Um pouco', 'Sim', 'Muito'],
    seguimentoRuim: 'Onde você ainda perde mais tempo?',
    seguimentoBom: 'Qual parte mais economiza o seu tempo?',
  },
  {
    id: 'facilidade',
    texto: 'Foi fácil encontrar o que você precisava hoje?',
    opcoes: ['Difícil', 'Razoável', 'Fácil', 'Muito fácil'],
    seguimentoRuim: 'O que você procurou e não achou?',
    seguimentoBom: 'Tem algo que ainda poderia estar mais à mão?',
  },
  {
    id: 'indicacao',
    texto: 'Você indicaria a Encantos Gestão para outra operadora?',
    opcoes: ['Não', 'Talvez', 'Sim', 'Com certeza'],
    seguimentoRuim: 'O que precisaria mudar para você indicar?',
    seguimentoBom: 'O que você diria para convencer outra operadora?',
  },
];

const ESPERA_INICIAL_MS = 45_000;
const MAX_DISPENSAS = 3;
const UM_DIA = 24 * 3600 * 1000;
const INTERVALO_RESPOSTA = 30 * UM_DIA;

type Estado = {
  indice: number;          // pergunta atual
  dispensas: number;       // vezes que fechou a pergunta atual
  proximaEm: number;       // não mostrar antes deste instante (ms)
};

const chave = (uid: string) => `ern-pergunta-eda-v1:${uid}`;

function ler(uid: string): Estado {
  try {
    const v = JSON.parse(localStorage.getItem(chave(uid)) || 'null');
    if (v && Number.isInteger(v.indice) && Number.isInteger(v.dispensas) && typeof v.proximaEm === 'number') return v;
  } catch { /* começa do zero */ }
  return { indice: 0, dispensas: 0, proximaEm: 0 };
}

function gravar(uid: string, e: Estado) {
  try { localStorage.setItem(chave(uid), JSON.stringify(e)); } catch { /* sem armazenamento */ }
}

export default function PerguntaEDA() {
  const pathname = usePathname();
  const id = useId();
  const [uid, setUid] = useState<string | null>(null);
  const [visivel, setVisivel] = useState(false);
  const [estado, setEstado] = useState<Estado | null>(null);
  const [escolha, setEscolha] = useState<number | null>(null);
  const [detalhe, setDetalhe] = useState('');
  const [fase, setFase] = useState<'pergunta' | 'detalhe' | 'obrigado'>('pergunta');
  const [enviando, setEnviando] = useState(false);
  const [erro, setErro] = useState('');
  const trava = useRef(false);

  // Conta logada.
  useEffect(() => {
    let ativo = true;
    supabase.auth.getUser().then(({ data }) => { if (ativo) setUid(data.user?.id ?? null); }).catch(() => {});
    const { data } = supabase.auth.onAuthStateChange((_e, sessao) => setUid(sessao?.user?.id ?? null));
    return () => { ativo = false; data.subscription.unsubscribe(); };
  }, []);

  // Decide se e quando aparecer.
  useEffect(() => {
    if (!uid) { setVisivel(false); return; }
    const e = ler(uid);
    setEstado(e);
    if (e.indice >= PERGUNTAS.length) return;
    const agora = Date.now();
    const espera = Math.max(ESPERA_INICIAL_MS, e.proximaEm - agora);
    if (espera > 7 * UM_DIA) return; // só volta numa próxima visita
    const t = window.setTimeout(() => setVisivel(true), espera);
    return () => window.clearTimeout(t);
  }, [uid]);

  // Não aparece no meio de um cadastro/edição: espera a pessoa sair do formulário.
  const emFormulario = /\/(novo|nova|editar)(\/|$)/.test(pathname ?? '');

  if (!uid || !estado || !visivel || emFormulario || estado.indice >= PERGUNTAS.length) return null;
  const pergunta = PERGUNTAS[estado.indice];

  function proximoEstado(respondeu: boolean): Estado {
    const e = estado!;
    if (respondeu) return { indice: e.indice + 1, dispensas: 0, proximaEm: Date.now() + INTERVALO_RESPOSTA };
    const dispensas = e.dispensas + 1;
    if (dispensas >= MAX_DISPENSAS) return { indice: PERGUNTAS.length, dispensas, proximaEm: Number.MAX_SAFE_INTEGER }; // desiste
    return { ...e, dispensas, proximaEm: Date.now() + UM_DIA * dispensas }; // volta em 1, depois 2 dias
  }

  function fechar() {
    if (trava.current) return;
    if (fase === 'obrigado') { setVisivel(false); return; }
    const novo = proximoEstado(false);
    gravar(uid!, novo);
    setEstado(novo);
    setVisivel(false);
  }

  async function enviar() {
    if (trava.current || escolha === null) return;
    trava.current = true;
    setEnviando(true);
    setErro('');
    try {
      const { data } = await supabase.auth.getSession();
      const token = data.session?.access_token;
      if (!token) throw new Error('Sua sessão expirou. Entre novamente.');
      const umaLinha = (v: string) => v.replace(/\s+/g, ' ').trim().slice(0, 1500);
      const mensagem = [
        `[pergunta] ${pergunta.id}: ${pergunta.texto}`,
        `[resposta] ${escolha + 1}/4 ${pergunta.opcoes[escolha]}`,
        `[detalhe] ${umaLinha(detalhe) || '-'}`,
        `[pagina] ${pathname}`,
      ].join('\n');
      const r = await fetch('/api/feedback', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${token}` },
        body: JSON.stringify({
          categoria: escolha <= 1 ? 'problema' : 'experiencia',
          caminho: pathname || '/dashboard',
          mensagem,
          contato_email: null,
        }),
      });
      if (!r.ok) throw new Error(r.status === 429 ? 'Muitas respostas agora. Tente mais tarde.' : 'Não foi possível enviar agora.');
      const novo = proximoEstado(true);
      gravar(uid!, novo);
      setEstado(novo);
      setFase('obrigado');
      window.setTimeout(() => setVisivel(false), 2600);
    } catch (falha) {
      setErro(falha instanceof Error ? falha.message : 'Não foi possível enviar agora.');
    } finally {
      trava.current = false;
      setEnviando(false);
    }
  }

  return (
    <section className="eda-perg" role="dialog" aria-modal="false" aria-labelledby={`${id}-t`}>
      <div className="eda-perg-topo">
        <span className="eda-perg-selo" aria-hidden="true">EDA</span>
        <p className="eda-perg-eb">A EDA quer saber</p>
        <button type="button" className="eda-perg-x" onClick={fechar} disabled={enviando} aria-label="Fechar pergunta">×</button>
      </div>

      {fase === 'obrigado' ? (
        <p id={`${id}-t`} className="eda-perg-titulo" role="status">Obrigado! Sua resposta já está ajudando a melhorar a EDA.</p>
      ) : (
        <>
          <p id={`${id}-t`} className="eda-perg-titulo">{pergunta.texto}</p>
          <div className="eda-perg-opcoes" role="radiogroup" aria-labelledby={`${id}-t`}>
            {pergunta.opcoes.map((op, i) => (
              <button key={op} type="button" role="radio" aria-checked={escolha === i} disabled={enviando}
                className={`eda-perg-op eda-perg-op-${i}`}
                onClick={() => { setEscolha(i); setFase('detalhe'); }}>{op}</button>
            ))}
          </div>

          {fase === 'detalhe' && escolha !== null && (
            <div className="eda-perg-detalhe">
              <label htmlFor={`${id}-d`}>{escolha <= 1 ? pergunta.seguimentoRuim : pergunta.seguimentoBom} <span>(opcional)</span></label>
              <textarea id={`${id}-d`} rows={2} maxLength={1500} value={detalhe} disabled={enviando}
                onChange={(ev) => setDetalhe(ev.target.value)} placeholder="Escreva em poucas palavras…" />
              {erro && <p role="alert" className="eda-perg-erro">{erro}</p>}
              <div className="eda-perg-acoes">
                <button type="button" className="eda-perg-enviar" disabled={enviando} onClick={() => void enviar()}>
                  {enviando ? 'Enviando…' : 'Enviar resposta'}
                </button>
              </div>
            </div>
          )}
        </>
      )}

      <style jsx>{`
        .eda-perg {
          position: fixed; z-index: 70; right: 20px; bottom: 20px;
          width: min(380px, calc(100vw - 24px)); padding: 16px 18px 18px;
          border-radius: 20px; color: #f2f0e6;
          background: radial-gradient(90% 120% at 100% 0%, rgb(227 161 68 / 22%), transparent 60%), linear-gradient(150deg, #0d211b, #07130f);
          border: 1px solid rgb(244 199 126 / 28%);
          box-shadow: 0 24px 60px -18px rgb(0 0 0 / 55%);
          font-family: var(--font-gestao, var(--font-geist)), system-ui, sans-serif;
          animation: eda-perg-entra .45s cubic-bezier(.2,.8,.2,1);
        }
        .eda-perg-topo { display: flex; align-items: center; gap: 10px; }
        .eda-perg-selo { display: grid; place-items: center; width: 32px; height: 32px; border-radius: 10px; font-size: 10px; font-weight: 800; letter-spacing: .06em; color: #07110e; background: linear-gradient(180deg, #f7d595, #e3a144); }
        .eda-perg-eb { flex: 1; margin: 0; font-size: 11px; font-weight: 700; letter-spacing: .16em; text-transform: uppercase; color: #f4c77e; }
        .eda-perg-x { display: grid; place-items: center; width: 32px; height: 32px; border-radius: 10px; border: 1px solid rgb(255 255 255 / 12%); background: transparent; color: inherit; font-size: 20px; cursor: pointer; }
        .eda-perg-titulo { margin: 12px 0 0; font-size: 16px; font-weight: 600; line-height: 1.45; }
        .eda-perg-opcoes { display: grid; grid-template-columns: repeat(4, minmax(0, 1fr)); gap: 6px; margin-top: 14px; }
        .eda-perg-op { min-height: 40px; padding: 0 6px; border-radius: 12px; border: 1px solid rgb(255 255 255 / 14%); background: rgb(255 255 255 / 5%); color: inherit; font: inherit; font-size: 13px; font-weight: 600; cursor: pointer; }
        .eda-perg-op:hover { border-color: rgb(244 199 126 / 50%); }
        .eda-perg-op[aria-checked="true"] { color: #07110e; border-color: transparent; background: linear-gradient(180deg, #f7d595, #e3a144); }
        .eda-perg-op-0[aria-checked="true"] { color: #fff; background: #c2554f; }
        .eda-perg-detalhe { margin-top: 14px; }
        .eda-perg-detalhe label { display: block; font-size: 13.5px; font-weight: 600; line-height: 1.5; }
        .eda-perg-detalhe label span { font-weight: 400; opacity: .65; }
        .eda-perg-detalhe textarea { width: 100%; margin-top: 8px; padding: 10px 12px; border-radius: 12px; border: 1px solid rgb(255 255 255 / 14%); background: rgb(0 0 0 / 25%); color: inherit; font: inherit; font-size: 14px; line-height: 1.55; resize: vertical; }
        .eda-perg-acoes { display: flex; justify-content: flex-end; margin-top: 10px; }
        .eda-perg-enviar { min-height: 40px; padding: 0 18px; border: 0; border-radius: 999px; color: #07110e; background: linear-gradient(180deg, #f7d595, #e3a144); font: inherit; font-size: 13.5px; font-weight: 700; cursor: pointer; }
        .eda-perg-erro { margin: 8px 0 0; font-size: 13px; color: #f08a8a; }
        .eda-perg :is(button, textarea):focus-visible { outline: 2px solid #e3a144; outline-offset: 2px; }
        .eda-perg :disabled { opacity: .6; cursor: wait; }
        :global(.ern-gestao:is([data-ern-tema="branco"], [data-ern-tema="amarelo"])) .eda-perg {
          color: #13241d; border-color: rgb(154 93 20 / 22%);
          background: radial-gradient(90% 120% at 100% 0%, rgb(227 161 68 / 22%), transparent 60%), linear-gradient(150deg, #fffdf8, #f6ead2);
          box-shadow: 0 24px 50px -20px rgb(120 80 20 / 35%);
        }
        :global(.ern-gestao:is([data-ern-tema="branco"], [data-ern-tema="amarelo"])) .eda-perg-eb { color: #9a5d14; }
        :global(.ern-gestao:is([data-ern-tema="branco"], [data-ern-tema="amarelo"])) :is(.eda-perg-x, .eda-perg-op, .eda-perg-detalhe textarea) { border-color: rgb(19 36 29 / 14%); background: rgb(255 255 255 / 70%); }
        :global(.ern-gestao:is([data-ern-tema="branco"], [data-ern-tema="amarelo"])) .eda-perg-op[aria-checked="true"] { background: linear-gradient(180deg, #f7d595, #e3a144); }
        @keyframes eda-perg-entra { from { opacity: 0; transform: translateY(16px); } to { opacity: 1; transform: none; } }
        @media (max-width: 767px) {
          .eda-perg { left: 12px; right: 12px; width: auto; bottom: calc(96px + env(safe-area-inset-bottom, 0px)); }
        }
        @media (prefers-reduced-motion: reduce) { .eda-perg { animation: none; } }
      `}</style>
    </section>
  );
}
