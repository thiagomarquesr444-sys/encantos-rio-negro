'use client';

import { useEffect, useId, useRef, useState, type FormEvent } from 'react';
import type { CSSProperties } from 'react';
import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { supabase } from '@/lib/supabase';
import { useLanguage } from '@/app/components/LanguageProvider';

const textos = {
  PT: {
    abrir: 'Feedback', titulo: 'Ajude a melhorar a ERN',
    introducao: 'Conte o que funcionou e o que podemos melhorar.',
    tipo: 'Tipo de feedback', problema: 'Relatar problema',
    sugestao: 'Sugerir melhoria', experiencia: 'Minha experiência',
    mensagem: 'Sua mensagem', email: 'E-mail para retorno (opcional)',
    privacidade: 'Não envie senhas, documentos ou dados bancários.',
    politica: 'Política de privacidade', enviar: 'Enviar feedback',
    enviando: 'Enviando…', fechar: 'Fechar', sucesso: 'Feedback recebido. Obrigado!',
    protocolo: 'Protocolo', erro: 'Não foi possível confirmar o envio. Tente mais tarde.',
    tamanho: 'Escreva entre 10 e 3.000 caracteres.',
    limite: 'Limite de envios atingido. Tente novamente em até uma hora.',
    sessao: 'Sua sessão expirou. Entre novamente para enviar.',
  },
  EN: {
    abrir: 'Feedback', titulo: 'Help improve ERN',
    introducao: 'Tell us what worked and what we can improve.',
    tipo: 'Feedback type', problema: 'Report a problem',
    sugestao: 'Suggest an improvement', experiencia: 'My experience',
    mensagem: 'Your message', email: 'Reply email (optional)',
    privacidade: 'Do not send passwords, documents or banking details.',
    politica: 'Privacy policy', enviar: 'Send feedback',
    enviando: 'Sending…', fechar: 'Close', sucesso: 'Feedback received. Thank you!',
    protocolo: 'Reference', erro: 'We could not confirm your submission. Try again later.',
    tamanho: 'Write between 10 and 3,000 characters.',
    limite: 'Submission limit reached. Try again within an hour.',
    sessao: 'Your session expired. Sign in again to submit.',
  },
  ES: {
    abrir: 'Comentarios', titulo: 'Ayuda a mejorar ERN',
    introducao: 'Cuéntanos qué funcionó y qué podemos mejorar.',
    tipo: 'Tipo de comentario', problema: 'Informar un problema',
    sugestao: 'Sugerir una mejora', experiencia: 'Mi experiencia',
    mensagem: 'Tu mensaje', email: 'Correo para respuesta (opcional)',
    privacidade: 'No envíes contraseñas, documentos ni datos bancarios.',
    politica: 'Política de privacidad', enviar: 'Enviar comentario',
    enviando: 'Enviando…', fechar: 'Cerrar', sucesso: 'Comentario recibido. ¡Gracias!',
    protocolo: 'Referencia', erro: 'No pudimos confirmar el envío. Inténtalo más tarde.',
    tamanho: 'Escribe entre 10 y 3.000 caracteres.',
    limite: 'Límite de envíos alcanzado. Inténtalo de nuevo en una hora.',
    sessao: 'Tu sesión ha caducado. Inicia sesión de nuevo.',
  },
};

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
  const [categoria, setCategoria] = useState('sugestao');
  const [mensagem, setMensagem] = useState('');
  const [email, setEmail] = useState('');
  const [enviando, setEnviando] = useState(false);
  const [erro, setErro] = useState('');
  const [protocolo, setProtocolo] = useState('');
  const [paleta, setPaleta] = useState<CSSProperties>({});

  const mostrar = pathname === '/' ||
    ROTAS.some(rota => pathname === rota || pathname.startsWith(rota + '/'));

  useEffect(() => {
    dialogo.current?.close();
    setErro('');
    setProtocolo('');
    setMensagem('');
    setEmail('');
  }, [pathname]);

  function abrir() {
    const escopo = document.querySelector(
      '.ern-tema-portal, .ern-gestao, .ern-publico'
    );

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
    botao.current?.focus();

    if (protocolo) {
      setMensagem('');
      setEmail('');
      setProtocolo('');
    }
  }

  async function enviar(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (trava.current) return;

    const conteudo = mensagem.trim();
    if (conteudo.length < 10 || conteudo.length > 3000) {
      setErro(t.tamanho);
      return;
    }

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

  if (!mostrar) return null;

  return (
    <>
      <button ref={botao} type="button" className="ern-feedback-acesso"
        onClick={abrir} aria-haspopup="dialog">
        <span aria-hidden="true">✎</span> {t.abrir}
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
              <label htmlFor={`${id}-tipo`}>{t.tipo}</label>
              <select id={`${id}-tipo`} value={categoria}
                onChange={event => setCategoria(event.target.value)}>
                <option value="problema">{t.problema}</option>
                <option value="sugestao">{t.sugestao}</option>
                <option value="experiencia">{t.experiencia}</option>
              </select>

              <label htmlFor={`${id}-mensagem`}>{t.mensagem}</label>
              <textarea id={`${id}-mensagem`} required minLength={10}
                maxLength={3000} rows={5} value={mensagem}
                aria-describedby={`${id}-aviso ${id}-contador`}
                onChange={event => setMensagem(event.target.value)} />
              <small id={`${id}-contador`}>{mensagem.length}/3000</small>

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
          position:fixed;left:max(14px,env(safe-area-inset-left));
          bottom:calc(76px + env(safe-area-inset-bottom,0px));
          z-index:90;display:flex;align-items:center;gap:8px;
          min-height:44px;padding:10px 15px;border-radius:24px;
          border:1px solid #626b77;background:#20252b;color:#f0f1f2;
          box-shadow:0 4px 18px #0003;font:600 12px sans-serif;
          cursor:pointer;
        }
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
        .ern-feedback-acesso:focus-visible,
        .ern-feedback-dialogo :is(button,input,textarea,select,a):focus-visible {
          outline:3px solid var(--ern-destaque,#c5b595);outline-offset:3px;
        }
        @media(max-width:480px) {
          .ern-feedback-dialogo { padding:18px; }
          .ern-feedback-dialogo :is(input,textarea,select) { font-size:16px; }
        }
      `}</style>
    </>
  );
}