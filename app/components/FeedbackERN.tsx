'use client';

import { useEffect, useId, useRef, useState, type FormEvent } from 'react';
import type { CSSProperties } from 'react';
import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { supabase } from '@/lib/supabase';
import { useLanguage } from '@/app/components/LanguageProvider';

// ERN_FEEDBACK_PERGUNTAS_V1: em vez de um campo livre, a EDA faz perguntas
// curtas e úteis para análise (nota de recomendação, objetivo, sucesso,
// dificuldade e sugestão). Tudo segue no mesmo formato da API atual.
const textos = {
  PT: {
    abrir: 'Feedback', titulo: 'A EDA quer ouvir você',
    introducao: 'São 5 perguntas rápidas. Leva menos de um minuto e ajuda a decidir o que melhorar primeiro.',
    nps: 'De 0 a 10, o quanto você recomendaria a EDA para alguém?',
    npsBaixo: 'Nada provável', npsAlto: 'Com certeza',
    objetivo: 'O que você veio fazer agora?',
    objetivosGestao: ['Reservas e agenda', 'Financeiro', 'Demandas', 'Clientes', 'Cadastros (passeios, barcos, guias)', 'Outra coisa'],
    objetivosPortal: ['Conhecer destinos', 'Ver experiências', 'Falar com uma operadora', 'Conhecer a plataforma', 'Outra coisa'],
    conseguiu: 'Conseguiu fazer o que queria?', sim: 'Sim', parte: 'Em parte', nao: 'Não',
    dificuldade: 'O que foi mais difícil, demorado ou confuso? (opcional)',
    dificuldadeDica: 'Ex.: não achei onde editar a reserva no celular',
    melhoria: 'Se você pudesse mudar ou criar uma coisa na EDA, o que seria?',
    melhoriaDica: 'Ex.: avisar no WhatsApp quando um cliente confirmar',
    email: 'E-mail para retorno (opcional)',
    privacidade: 'Não envie senhas, documentos ou dados bancários.',
    politica: 'Política de privacidade', enviar: 'Enviar respostas',
    enviando: 'Enviando…', fechar: 'Fechar', sucesso: 'Respostas recebidas. Obrigado por ajudar a EDA a crescer!',
    protocolo: 'Protocolo', erro: 'Não foi possível confirmar o envio. Tente mais tarde.',
    faltando: 'Responda a nota e se você conseguiu fazer o que queria.',
    limite: 'Limite de envios atingido. Tente novamente em até uma hora.',
    sessao: 'Sua sessão expirou. Entre novamente para enviar.',
  },
  EN: {
    abrir: 'Feedback', titulo: 'EDA wants to hear from you',
    introducao: '5 quick questions. It takes less than a minute and helps us decide what to improve first.',
    nps: 'From 0 to 10, how likely are you to recommend EDA?',
    npsBaixo: 'Not likely', npsAlto: 'Definitely',
    objetivo: 'What did you come here to do?',
    objetivosGestao: ['Bookings and schedule', 'Finance', 'Demands', 'Customers', 'Catalog (tours, boats, guides)', 'Something else'],
    objetivosPortal: ['Discover destinations', 'See experiences', 'Contact an operator', 'Learn about the platform', 'Something else'],
    conseguiu: 'Were you able to do it?', sim: 'Yes', parte: 'Partly', nao: 'No',
    dificuldade: 'What was hardest, slowest or most confusing? (optional)',
    dificuldadeDica: 'E.g.: I could not find how to edit a booking on mobile',
    melhoria: 'If you could change or add one thing in EDA, what would it be?',
    melhoriaDica: 'E.g.: a WhatsApp alert when a customer confirms',
    email: 'Reply email (optional)',
    privacidade: 'Do not send passwords, documents or banking details.',
    politica: 'Privacy policy', enviar: 'Send answers',
    enviando: 'Sending…', fechar: 'Close', sucesso: 'Answers received. Thank you for helping EDA grow!',
    protocolo: 'Reference', erro: 'We could not confirm your submission. Try again later.',
    faltando: 'Please answer the score and whether you could do it.',
    limite: 'Submission limit reached. Try again within an hour.',
    sessao: 'Your session expired. Sign in again to submit.',
  },
  ES: {
    abrir: 'Comentarios', titulo: 'EDA quiere escucharte',
    introducao: 'Son 5 preguntas rápidas. Toma menos de un minuto y nos ayuda a decidir qué mejorar primero.',
    nps: 'Del 0 al 10, ¿qué tan probable es que recomiendes EDA?',
    npsBaixo: 'Nada probable', npsAlto: 'Seguro',
    objetivo: '¿Qué viniste a hacer ahora?',
    objetivosGestao: ['Reservas y agenda', 'Finanzas', 'Demandas', 'Clientes', 'Catálogo (paseos, barcos, guías)', 'Otra cosa'],
    objetivosPortal: ['Conocer destinos', 'Ver experiencias', 'Hablar con un operador', 'Conocer la plataforma', 'Otra cosa'],
    conseguiu: '¿Lograste hacerlo?', sim: 'Sí', parte: 'En parte', nao: 'No',
    dificuldade: '¿Qué fue lo más difícil, lento o confuso? (opcional)',
    dificuldadeDica: 'Ej.: no encontré cómo editar una reserva en el celular',
    melhoria: 'Si pudieras cambiar o crear una cosa en EDA, ¿qué sería?',
    melhoriaDica: 'Ej.: aviso por WhatsApp cuando un cliente confirme',
    email: 'Correo para respuesta (opcional)',
    privacidade: 'No envíes contraseñas, documentos ni datos bancarios.',
    politica: 'Política de privacidad', enviar: 'Enviar respuestas',
    enviando: 'Enviando…', fechar: 'Cerrar', sucesso: 'Respuestas recibidas. ¡Gracias por ayudar a EDA a crecer!',
    protocolo: 'Referencia', erro: 'No pudimos confirmar el envío. Inténtalo más tarde.',
    faltando: 'Responde la nota y si lograste hacerlo.',
    limite: 'Límite de envíos alcanzado. Inténtalo de nuevo en una hora.',
    sessao: 'Tu sesión ha caducado. Inicia sesión de nuevo.',
  },
};

const ROTAS_GESTAO_FEEDBACK = [
  '/dashboard', '/clientes', '/reservas', '/passeios', '/vouchers',
  '/hospedagens', '/embarcacoes', '/guias', '/parceiros', '/demandas',
  '/financeiro', '/relatorios', '/configuracoes', '/planos', '/comando',
];

const ROTAS = [
  '/destinos', '/rede', '/experiencias', '/contato', '/operadores',
  '/privacidade', '/termos', '/reembolso',
  '/dashboard', '/clientes', '/reservas', '/passeios', '/vouchers',
  '/hospedagens', '/embarcacoes', '/guias', '/parceiros', '/demandas',
  '/financeiro', '/relatorios', '/configuracoes', '/planos', '/comando',
];

export default function FeedbackERN() {
  const pathname = usePathname();
  const { idioma } = useLanguage();
  const t = textos[idioma];
  const id = useId();
  const dialogo = useRef<HTMLDialogElement>(null);
  const botao = useRef<HTMLButtonElement>(null);
  const trava = useRef(false);
  const origemFoco = useRef<HTMLElement | null>(null);
  const [nota, setNota] = useState<number | null>(null);
  const [objetivo, setObjetivo] = useState('');
  const [conseguiu, setConseguiu] = useState<'' | 'sim' | 'parte' | 'nao'>('');
  const [dificuldade, setDificuldade] = useState('');
  const [melhoria, setMelhoria] = useState('');
  const [email, setEmail] = useState('');
  const [enviando, setEnviando] = useState(false);
  const [erro, setErro] = useState('');
  const [protocolo, setProtocolo] = useState('');
  const [paleta, setPaleta] = useState<CSSProperties>({});

  const naGestao = ROTAS_GESTAO_FEEDBACK.some(rota => pathname === rota || pathname.startsWith(rota + '/'));
  const objetivos = naGestao ? t.objetivosGestao : t.objetivosPortal;

  function limparRespostas() {
    setNota(null); setObjetivo(''); setConseguiu(''); setDificuldade(''); setMelhoria(''); setEmail('');
  }

  // ERN_PERGUNTA_EDA_V1: na gestão não há botão; a própria EDA pergunta (PerguntaEDA).
  const mostrar = !naGestao && (pathname === '/' ||
    ROTAS.some(rota => pathname === rota || pathname.startsWith(rota + '/')));

  useEffect(() => {
    dialogo.current?.close();
    setErro('');
    setProtocolo('');
    limparRespostas();
  }, [pathname]);

  function abrir() {
    origemFoco.current = document.activeElement instanceof HTMLElement ? document.activeElement : null;
    const escopo =
      document.querySelector('.ern-tema-portal') ??
      document.querySelector('.ern-gestao') ??
      document.querySelector('.ern-publico');

    if (escopo) {
      const estilo = getComputedStyle(escopo);
      const variaveis: Record<string, string> = {};
      for (const nome of [
        '--ern-painel', '--ern-texto', '--ern-secundario',
        '--ern-borda', '--ern-botao', '--ern-sobre-botao',
        '--ern-fundo', '--ern-destaque',
      ]) {
        const valor = estilo.getPropertyValue(nome).trim();
        if (valor) variaveis[nome] = valor;
      }
      setPaleta(variaveis as CSSProperties);
    }

    setErro('');
    dialogo.current?.showModal();
  }

  function fechar() {
    if (trava.current) return;
    dialogo.current?.close();
    (origemFoco.current?.isConnected ? origemFoco.current : botao.current)?.focus();

    if (protocolo) {
      limparRespostas();
      setProtocolo('');
    }
  }

  async function enviar(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (trava.current) return;

    if (nota === null || !conseguiu) {
      setErro(t.faltando);
      return;
    }

    // Respostas em linhas marcadas, fáceis de analisar depois (sempre em PT).
    // Texto livre em uma linha só: impede que alguém forje linhas [nota] etc.
    const umaLinha = (v: string) => v.replace(/\s+/g, ' ').trim();
    const rotuloConseguiu = { sim: 'sim', parte: 'em parte', nao: 'não' }[conseguiu];
    const conteudo = [
      `[nota] ${nota}/10`,
      `[objetivo] ${objetivo || 'não informado'}`,
      `[conseguiu] ${rotuloConseguiu}`,
      `[dificuldade] ${umaLinha(dificuldade) || '-'}`,
      `[melhoria] ${umaLinha(melhoria) || '-'}`,
      `[idioma] ${idioma}`,
    ].join('\n').slice(0, 3000);
    const categoria = conseguiu === 'nao' ? 'problema' : melhoria.trim() ? 'sugestao' : 'experiencia';

    trava.current = true;
    setEnviando(true);
    setErro('');

    try {
      const { data, error } = await supabase.auth.getSession();
      if (error) throw new Error(t.sessao);

      const headers: Record<string, string> = {
        'Content-Type': 'application/json',
      };

      if (data.session?.access_token) {
        headers.Authorization = `Bearer ${data.session.access_token}`;
      }

      const resposta = await fetch('/api/feedback', {
        method: 'POST',
        headers,
        body: JSON.stringify({
          categoria,
          caminho: pathname,
          mensagem: conteudo,
          contato_email: email.trim() || null,
        }),
      });

      if (!resposta.ok) {
        throw new Error(
          resposta.status === 429 ? t.limite :
          resposta.status === 401 ? t.sessao : t.erro
        );
      }

      const resultado: unknown = await resposta.json();
      if (!resultado || typeof resultado !== 'object' ||
        !('ok' in resultado) || resultado.ok !== true ||
        !('protocolo' in resultado) ||
        typeof resultado.protocolo !== 'string') {
        throw new Error(t.erro);
      }

      setProtocolo(resultado.protocolo);
    } catch (falha) {
      setErro(falha instanceof Error ? falha.message : t.erro);
    } finally {
      trava.current = false;
      setEnviando(false);
    }
  }

  // EDA_FLUTUANTES_V1: o rodapé público abre este diálogo pelo evento 'eda:abrir-feedback'.
  useEffect(() => {
    if (!mostrar) return;
    const aoPedir = () => abrir();
    window.addEventListener('eda:abrir-feedback', aoPedir);
    return () => window.removeEventListener('eda:abrir-feedback', aoPedir);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [mostrar]);

  if (!mostrar) return null;

  return (
    <>
      <button ref={botao} type="button" className="ern-feedback-acesso"
        onClick={abrir} aria-haspopup="dialog" aria-label={t.abrir} title={t.abrir}>
        <span aria-hidden="true">✎</span> <span className="ern-feedback-rotulo">{t.abrir}</span>
      </button>

      <dialog ref={dialogo} className="ern-feedback-dialogo"
        style={paleta}
        aria-labelledby={`${id}-titulo`}
        aria-describedby={`${id}-intro`}
        onCancel={event => {
          event.preventDefault();
          fechar();
        }}>
        <div className="ern-feedback-cabecalho">
          <h2 id={`${id}-titulo`}>{t.titulo}</h2>
          <button type="button" onClick={fechar} disabled={enviando}
            aria-label={t.fechar}>×</button>
        </div>
        <p id={`${id}-intro`}>{t.introducao}</p>

        {protocolo ? (
          <div role="status" className="ern-feedback-sucesso">
            <p>{t.sucesso}</p>
            <p>{t.protocolo}: <code>{protocolo}</code></p>
            <button type="button" onClick={fechar}>{t.fechar}</button>
          </div>
        ) : (
          <form onSubmit={enviar} aria-busy={enviando}>
            <fieldset disabled={enviando}>
              <fieldset className="ern-fb-grupo">
                <legend>1. {t.nps}</legend>
                <div className="ern-fb-escala" role="radiogroup" aria-label={t.nps}>
                  {Array.from({ length: 11 }, (_, n) => (
                    <button key={n} type="button" role="radio" aria-checked={nota === n}
                      className={`ern-fb-nota ${n <= 6 ? 'baixa' : n <= 8 ? 'media' : 'alta'}`}
                      onClick={() => setNota(n)}>{n}</button>
                  ))}
                </div>
                <div className="ern-fb-extremos"><span>{t.npsBaixo}</span><span>{t.npsAlto}</span></div>
              </fieldset>

              <fieldset className="ern-fb-grupo">
                <legend>2. {t.objetivo}</legend>
                <div className="ern-fb-chips">
                  {objetivos.map(op => (
                    <button key={op} type="button" aria-pressed={objetivo === op}
                      className="ern-fb-chip" onClick={() => setObjetivo(objetivo === op ? '' : op)}>{op}</button>
                  ))}
                </div>
              </fieldset>

              <fieldset className="ern-fb-grupo">
                <legend>3. {t.conseguiu}</legend>
                <div className="ern-fb-chips" role="radiogroup" aria-label={t.conseguiu}>
                  {([['sim', t.sim], ['parte', t.parte], ['nao', t.nao]] as const).map(([v, r]) => (
                    <button key={v} type="button" role="radio" aria-checked={conseguiu === v}
                      className={`ern-fb-chip ern-fb-${v}`} onClick={() => setConseguiu(v)}>{r}</button>
                  ))}
                </div>
              </fieldset>

              <label htmlFor={`${id}-dif`}>4. {t.dificuldade}</label>
              <textarea id={`${id}-dif`} maxLength={1200} rows={2} value={dificuldade}
                placeholder={t.dificuldadeDica} onChange={event => setDificuldade(event.target.value)} />

              <label htmlFor={`${id}-mel`}>5. {t.melhoria}</label>
              <textarea id={`${id}-mel`} maxLength={1200} rows={2} value={melhoria}
                placeholder={t.melhoriaDica} onChange={event => setMelhoria(event.target.value)} />

              <label htmlFor={`${id}-email`}>{t.email}</label>
              <input id={`${id}-email`} type="email" maxLength={254}
                autoComplete="email" value={email}
                onChange={event => setEmail(event.target.value)} />

              <p id={`${id}-aviso`} className="ern-feedback-aviso">
                {t.privacidade}{' '}
                <Link href="/privacidade" onClick={fechar}>{t.politica}</Link>
              </p>

              {erro && <p role="alert">{erro}</p>}

              <button type="submit" className="ern-feedback-enviar">
                {enviando ? t.enviando : t.enviar}
              </button>
            </fieldset>
          </form>
        )}
      </dialog>

      <style jsx global>{`
        .ern-feedback-acesso {
          position:fixed;right:max(16px,env(safe-area-inset-right));
          bottom:calc(16px + env(safe-area-inset-bottom,0px));
          z-index:90;display:flex;align-items:center;gap:8px;
          min-height:44px;padding:10px 15px;border-radius:24px;
          border:1px solid #626b77;background:#20252b;color:#f0f1f2;
          box-shadow:0 4px 18px #0003;font:600 12px sans-serif;
          cursor:pointer;
        }
        /* EDA V44.8 - Feedback acima do convite de instalacao */
        body:has(.instalar-ern) .ern-feedback-acesso {
          bottom: calc(88px + env(safe-area-inset-bottom, 0px));
        }
        /* EDA_FLUTUANTES_V1: onde há rodapé público, o Feedback mora no rodapé */
        body:has(.eda-rodape-feedback) .ern-feedback-acesso { display:none; }
        .ern-feedback-dialogo {
          position:fixed;inset:0;margin:auto;
          width:min(520px,calc(100vw - 28px));
          max-height:calc(100dvh - 32px);
          overflow:auto;overscroll-behavior:contain;
          border:1px solid var(--ern-borda,#454b53);
          border-radius:22px;padding:24px;
          background:var(--ern-painel,#1a1d21);
          color:var(--ern-texto,#f0f1f2);
          box-shadow:0 20px 80px #0006;font:14px sans-serif;
        }
        .ern-feedback-dialogo::backdrop { background:#0009; }
        .ern-feedback-dialogo .ern-feedback-cabecalho {
          display:flex;align-items:center;justify-content:space-between;gap:15px;
        }
        .ern-feedback-cabecalho h2 {
          margin:0;font-size:22px;line-height:1.3;
        }
        .ern-feedback-cabecalho>button {
          min-width:44px;min-height:44px;border:0;background:transparent;
          color:inherit;font-size:28px;cursor:pointer;
        }
        .ern-feedback-dialogo>p {
          margin:12px 0 22px;line-height:1.7;
          color:var(--ern-secundario,#bfc5cb);
        }
        .ern-feedback-dialogo fieldset { border:0;padding:0;margin:0;min-width:0; }
        .ern-feedback-dialogo label { display:block;margin:16px 0 8px;font-weight:600; }
        .ern-feedback-dialogo :is(input,textarea,select) {
          box-sizing:border-box;width:100%;min-height:44px;
          padding:11px;border:1px solid var(--ern-borda,#454b53);
          border-radius:10px;background:var(--ern-fundo,#101214);
          color:var(--ern-texto,#f0f1f2);font:inherit;
        }
        .ern-feedback-dialogo textarea { resize:vertical;line-height:1.6; }
        .ern-feedback-dialogo small {
          display:block;text-align:right;margin-top:5px;
          color:var(--ern-secundario,#bfc5cb);
        }
        .ern-feedback-dialogo .ern-feedback-aviso {
          font-size:12px;line-height:1.7;
          color:var(--ern-secundario,#bfc5cb);
        }
        .ern-feedback-aviso a { color:inherit;text-decoration:underline; }
        .ern-feedback-dialogo :is(.ern-feedback-enviar,.ern-feedback-sucesso>button) {
          width:100%;min-height:46px;padding:12px;margin-top:14px;
          border:1px solid var(--ern-borda,#626b77);border-radius:12px;
          background:var(--ern-botao,#30363e);
          color:var(--ern-sobre-botao,#f0f1f2);
          font:600 14px sans-serif;cursor:pointer;
        }
        .ern-feedback-dialogo [role="alert"] {
          border-left:3px solid var(--ern-destaque,#c5b595);
          padding:10px;line-height:1.6;
        }
        .ern-feedback-sucesso p { line-height:1.7;overflow-wrap:anywhere; }
        .ern-feedback-dialogo :disabled { opacity:.6;cursor:wait; }
        /* ERN_FEEDBACK_PERGUNTAS_V1 */
        .ern-feedback-dialogo .ern-fb-grupo { margin:18px 0 0; }
        .ern-feedback-dialogo .ern-fb-grupo legend { font-weight:600;line-height:1.5;margin-bottom:10px;padding:0; }
        .ern-fb-escala { display:grid;grid-template-columns:repeat(11,minmax(0,1fr));gap:4px; }
        .ern-feedback-dialogo .ern-fb-nota {
          min-height:40px;padding:0;border-radius:10px;cursor:pointer;font:600 14px sans-serif;
          border:1px solid var(--ern-borda,#454b53);background:transparent;color:var(--ern-texto,#f0f1f2);
        }
        .ern-feedback-dialogo .ern-fb-nota[aria-checked="true"].baixa { background:#c2554f;border-color:#c2554f;color:#fff; }
        .ern-feedback-dialogo .ern-fb-nota[aria-checked="true"].media { background:#e3a144;border-color:#e3a144;color:#07110e; }
        .ern-feedback-dialogo .ern-fb-nota[aria-checked="true"].alta { background:#3d9b72;border-color:#3d9b72;color:#fff; }
        .ern-fb-extremos { display:flex;justify-content:space-between;margin-top:6px;font-size:12px;opacity:.7; }
        .ern-fb-chips { display:flex;flex-wrap:wrap;gap:6px; }
        .ern-feedback-dialogo .ern-fb-chip {
          min-height:38px;padding:0 14px;border-radius:999px;cursor:pointer;font:600 13px sans-serif;
          border:1px solid var(--ern-borda,#454b53);background:transparent;color:var(--ern-texto,#f0f1f2);
        }
        .ern-feedback-dialogo .ern-fb-chip:is([aria-pressed="true"],[aria-checked="true"]) {
          background:var(--ern-botao,#e3a144);border-color:var(--ern-botao,#e3a144);color:var(--ern-sobre-botao,#07110e);
        }
        @media (max-width:420px) { .ern-fb-escala { grid-template-columns:repeat(6,minmax(0,1fr)); } }
        .ern-feedback-acesso:focus-visible,
        .ern-feedback-dialogo :is(button,input,textarea,select,a):focus-visible {
          outline:3px solid var(--ern-destaque,#c5b595);outline-offset:3px;
        }
        @media(max-width:480px) {
          /* EDA V44.8 - Feedback acima do convite de instalacao */
        body:has(.instalar-ern) .ern-feedback-acesso {
          bottom: calc(88px + env(safe-area-inset-bottom, 0px));
        }
        .ern-feedback-dialogo { padding:18px; }
          .ern-feedback-dialogo :is(input,textarea,select) { font-size:16px; }
        }
      `}</style>
    </>
  );
}