'use client';

// EDA_IA_CONVERSA_V1
// "Pergunte à EDA": conversa com IA real (texto livre) dentro da gestão,
// nas páginas Painel, Passeios, Reservas, Demandas e Financeiro.
// Botão discreto flutuante + painel compacto; não altera o layout das páginas.

import { useEffect, useRef, useState, type ReactNode } from 'react';
import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { supabase } from '@/lib/supabase';
import TextoDigitadoIA from './TextoDigitadoIA';
import './conversa-eda.css';

type LinkEDA = { href: string; rotulo: string };
type Msg = { papel: 'usuario' | 'eda'; texto: string; links?: LinkEDA[]; sugestoes?: string[] };

// Só caminhos internos da plataforma.
const linkSeguro = (l: LinkEDA) => typeof l?.href === 'string' && /^\/[a-z]/.test(l.href) && !l.href.startsWith('//') && typeof l.rotulo === 'string';

const PAGINAS: [string, string][] = [
  ['/dashboard', 'painel'], ['/passeios', 'passeios'], ['/reservas', 'reservas'],
  ['/demandas', 'demandas'], ['/financeiro', 'financeiro'], ['/clientes', 'clientes'],
  ['/hospedagens', 'hospedagens'], ['/configuracoes', 'configuracoes'], ['/embarcacoes', 'embarcacoes'],
  ['/guias', 'guias'], ['/parceiros', 'parceiros'], ['/relatorios', 'relatorios'],
  ['/vouchers', 'vouchers'], ['/documentos', 'documentos'], ['/fiscal', 'fiscal'], ['/planos', 'planos'],
];

const SUGESTOES: Record<string, string[]> = {
  painel: ['Como está meu dia?', 'O que precisa da minha atenção?', 'Resumo da semana'],
  passeios: ['Quais passeios não estão no portal?', 'Qual meu passeio mais caro?', 'Como cadastro um passeio?'],
  reservas: ['Quais saídas estão sem guia?', 'Quantas pessoas nesta semana?', 'Tem reserva sem horário?'],
  demandas: ['Quais demandas estão pendentes?', 'O que vence primeiro?', 'Como ligo uma demanda a uma saída?'],
  financeiro: ['Quanto tenho a receber?', 'Tem conta atrasada?', 'Onde mais gastei este mês?'],
  clientes: ['Quantos clientes novos no mês?', 'De onde vêm meus clientes?', 'Como cadastro um cliente?'],
  hospedagens: ['Quais hospedagens tenho?', 'Qual a diária de cada uma?', 'Como cadastro uma hospedagem?'],
  embarcacoes: ['Qual a capacidade dos meus barcos?', 'Tem saída sem embarcação?', 'Como cadastro uma embarcação?'],
  guias: ['Quais guias falam inglês?', 'Tem saída sem guia?', 'Como cadastro um guia?'],
  parceiros: ['Quantos parceiros tenho?', 'Como funciona a comissão?', 'Como cadastro um parceiro?'],
  vouchers: ['Tem voucher vencendo?', 'Como emito um voucher?', 'Como valido um voucher?'],
  relatorios: ['Que relatórios posso gerar?', 'Resumo do mês', 'Como exporto em PDF?'],
  documentos: ['Onde ficam meus documentos?', 'O que está pendente?', 'Resumo do mês'],
  fiscal: ['Como emito nota fiscal?', 'O que preciso para o fiscal?', 'Resumo do mês'],
  planos: ['Qual meu plano?', 'O que o plano pago libera?', 'Resumo da semana'],
  configuracoes: ['Como mudo o tema?', 'Como adiciono alguém da equipe?', 'Como apareço no portal?'],
};

export function periodoManaus(): 'madrugada' | 'manha' | 'tarde' | 'noite' {
  const h = Number(new Intl.DateTimeFormat('en-US', { hour: 'numeric', hour12: false, timeZone: 'America/Manaus' }).format(new Date())) % 24;
  return h < 5 ? 'madrugada' : h < 12 ? 'manha' : h < 18 ? 'tarde' : 'noite';
}

function boasVindas(): string {
  const p = periodoManaus();
  if (p === 'madrugada') {
    const op = [
      'Boa noite! O rio está quieto a esta hora, mas eu sigo de vigia por aqui. 🌙 Quer que eu confira o que fica pronto para amanhã?',
      'Madrugada de trabalho, hein? Fico com você. Me pergunte qualquer coisa da operação que eu busco rapidinho.',
      'Boa noite! Enquanto Barcelos dorme, posso adiantar o essencial: saídas de amanhã, pendências ou o caixa. Por onde começamos?',
    ];
    return op[new Date().getDate() % op.length];
  }
  const s = p === 'manha' ? 'Bom dia' : p === 'tarde' ? 'Boa tarde' : 'Boa noite';
  const op = [
    `${s}! Aqui é a EDA, sua parceira na operação. Pode perguntar do seu jeito — eu olho os dados da sua operadora e te respondo rapidinho.`,
    `${s}! EDA na área. Quer saber como está o dia, o caixa ou alguma reserva? É só me chamar.`,
    `${s}! Que bom te ver por aqui. Me diz o que você precisa que eu procuro na plataforma para você.`,
  ];
  return op[new Date().getMinutes() % op.length];
}

// Negrito simples (**texto**) sem HTML: o React escapa todo o conteúdo.
function formatar(texto: string): ReactNode[] {
  return texto.split('\n').map((linha, i) => (
    <span key={i} className="cv-eda-linha">
      {linha.split(/(\*\*[^*]+\*\*)/g).map((parte, j) =>
        parte.startsWith('**') && parte.endsWith('**') ? <b key={j}>{parte.slice(2, -2)}</b> : parte.replace(/^\s*[*-]\s+/, '• '),
      )}
    </span>
  ));
}

export default function ConversaEDA() {
  const pathname = usePathname() ?? '';
  const pagina = PAGINAS.find(([r]) => pathname === r || pathname.startsWith(`${r}/`))?.[1];
  const [aberto, setAberto] = useState(false);
  const [msgs, setMsgs] = useState<Msg[]>([]);
  const [entrada, setEntrada] = useState('');
  const [enviando, setEnviando] = useState(false);
  const [animando, setAnimando] = useState<number | null>(null);
  const [estilo, setEstilo] = useState<'regional' | 'formal'>('regional');
  useEffect(() => { try { if (localStorage.getItem('eda.estilo') === 'formal') setEstilo('formal'); } catch {} }, []);
  const fimRef = useRef<HTMLDivElement>(null);
  const campoRef = useRef<HTMLTextAreaElement>(null);

  useEffect(() => { if (aberto && !msgs.length) setMsgs([{ papel: 'eda', texto: boasVindas() }]); }, [aberto, msgs.length]);
  useEffect(() => { fimRef.current?.scrollIntoView({ block: 'end' }); }, [msgs, enviando]);
  useEffect(() => {
    if (!aberto) return;
    campoRef.current?.focus();
    const esc = (e: KeyboardEvent) => { if (e.key === 'Escape') setAberto(false); };
    window.addEventListener('keydown', esc);
    return () => window.removeEventListener('keydown', esc);
  }, [aberto]);

  if (!pagina) return null;

  async function enviar(valor: string) {
    const texto = valor.trim().slice(0, 1000);
    if (!texto || enviando) return;
    const historico: Msg[] = [...msgs, { papel: 'usuario', texto }];
    setMsgs(historico);
    setEntrada('');
    setEnviando(true);
    try {
      const { data } = await supabase.auth.getSession();
      const token = data.session?.access_token;
      if (!token) throw new Error('Sua sessão expirou. Entre novamente.');
      const r = await fetch('/api/eda-ia', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${token}` },
        body: JSON.stringify({ modo: 'operadora', pagina, estilo, mensagens: historico.slice(-12).map(({ papel, texto }) => ({ papel, texto })) }),
      });
      const j = await r.json().catch(() => ({})) as { resposta?: string; erro?: string; links?: LinkEDA[]; sugestoes?: string[] };
      const links = Array.isArray(j.links) ? j.links.filter(linkSeguro).slice(0, 3) : [];
      const sugestoes = Array.isArray(j.sugestoes) ? j.sugestoes.filter((x): x is string => typeof x === 'string').map(x => x.slice(0, 80)).slice(0, 3) : [];
      setAnimando(historico.length);
      setMsgs(m => [...m, { papel: 'eda', texto: j.resposta || j.erro || 'Não consegui responder agora. Tente de novo em instantes.', links, sugestoes }]);
    } catch (e) {
      setMsgs(m => [...m, { papel: 'eda', texto: e instanceof Error && e.message.includes('sessão') ? e.message : 'Sem conexão com a EDA agora. Confira a internet e tente de novo.' }]);
    } finally {
      setEnviando(false);
    }
  }

  const sugestoes = SUGESTOES[pagina] ?? [];
  const soBoasVindas = msgs.length <= 1;

  return (
    <div className="cv-eda" data-aberto={aberto || undefined}>
      {aberto && (
        <section className="cv-eda-painel" role="dialog" aria-label="Conversa com a EDA">
          <header className="cv-eda-topo">
            <span className="cv-eda-avatar" aria-hidden="true">✦</span>
            <div>
              <p className="cv-eda-nome">EDA</p>
              <p className="cv-eda-status">{periodoManaus() === 'madrugada' ? 'De vigia na madrugada' : 'Lendo os dados da sua operadora'}</p>
            </div>
            <button
              type="button"
              className="cv-eda-estilo"
              aria-pressed={estilo === 'formal'}
              title="Alternar entre jeito regional e linguagem formal"
              onClick={() => setEstilo(e => { const n = e === 'regional' ? 'formal' : 'regional'; try { localStorage.setItem('eda.estilo', n); } catch {} return n; })}
            >{estilo === 'regional' ? 'Jeito regional' : 'Formal'}</button>
            <button type="button" className="cv-eda-x" onClick={() => setAberto(false)} aria-label="Fechar conversa">×</button>
          </header>

          <div className="cv-eda-lista" aria-live="polite">
            {msgs.map((m, i) => (
              <div key={i} className={`cv-eda-bloco cv-eda-bloco-${m.papel}`}>
                <p className={`cv-eda-msg cv-eda-${m.papel}`}>
                  {m.papel === 'eda'
                    ? <TextoDigitadoIA texto={m.texto} animar={animando === i} render={formatar} aoTerminar={() => setAnimando(a => (a === i ? null : a))} />
                    : formatar(m.texto)}
                </p>
                {animando !== i && !!m.links?.length && (
                  <div className="cv-eda-links">
                    {m.links.map(l => <Link key={l.href} href={l.href} onClick={() => setAberto(false)}>{l.rotulo} →</Link>)}
                  </div>
                )}
              </div>
            ))}
            {enviando && <p className="cv-eda-msg cv-eda-eda cv-eda-pensando" aria-label="EDA pensando"><i /><i /><i /></p>}
            {!enviando && animando === null && (() => {
              const ultima = msgs[msgs.length - 1];
              const lista = soBoasVindas ? sugestoes : (ultima?.papel === 'eda' ? ultima.sugestoes ?? [] : []);
              return lista.length ? (
                <div className="cv-eda-sugestoes">
                  {lista.map(s => <button key={s} type="button" onClick={() => enviar(s)}>{s}</button>)}
                </div>
              ) : null;
            })()}
            <div ref={fimRef} />
          </div>

          <form className="cv-eda-form" onSubmit={e => { e.preventDefault(); void enviar(entrada); }}>
            <textarea
              ref={campoRef}
              rows={1}
              value={entrada}
              maxLength={1000}
              placeholder="Pergunte à EDA…"
              onChange={e => setEntrada(e.target.value)}
              onKeyDown={e => { if (e.key === 'Enter' && !e.shiftKey) { e.preventDefault(); void enviar(entrada); } }}
            />
            <button type="submit" disabled={enviando || !entrada.trim()} aria-label="Enviar">➤</button>
          </form>
          <p className="cv-eda-nota">A EDA lê só dados da sua operadora. Dados pessoais de clientes (nome, CPF, contato, saúde) não saem da plataforma — LGPD.</p>
        </section>
      )}

      <button type="button" className="cv-eda-botao" onClick={() => setAberto(v => !v)} aria-expanded={aberto}>
        <span aria-hidden="true">✦</span> {aberto ? 'Fechar' : 'Pergunte à EDA'}
      </button>
    </div>
  );
}
