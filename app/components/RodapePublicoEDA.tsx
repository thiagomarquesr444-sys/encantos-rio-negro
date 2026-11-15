'use client';

import Link from 'next/link';

import LogoERN from '@/app/components/LogoERN';
import ModoEconomicoEDA from '@/app/components/ModoEconomicoEDA';
import { useLanguage } from '@/app/components/LanguageProvider';
import { EMPRESA_EDA } from '@/lib/empresaEDA';

// EDA_RODAPE_PUBLICO_V1
// Rodapé único das páginas públicas (Descubra, Experiências, Destinos, Rede
// e central de atendimento), no padrão verde-noite da página de Atendimento.

const FOCO =
  'focus-visible:outline-2 focus-visible:outline-offset-4 ' +
  'focus-visible:outline-[#E3A144]';

type Coluna = { titulo: string; links: readonly (readonly [string, string])[] };
type Texto = {
  lema: string; sobre: string; feedback: string; aria: string;
  chamada: string; chamadaSub: string; falar: string;
  colunas: readonly Coluna[]; atendimento: string; feito: string;
};

const textos: Record<'PT' | 'EN' | 'ES', Texto> = {
  PT: {
    lema: 'Nascida em Barcelos, no Rio Negro.',
    sobre: 'Turismo receptivo da Amazônia com atendimento 24 horas: quem visita encontra o passeio certo, quem opera organiza a viagem inteira.',
    feedback: 'Enviar feedback',
    aria: 'Informações e atendimento',
    chamada: 'A Amazônia começa com uma conversa.',
    chamadaSub: 'A Iara responde na hora: destinos, passeios, preços e datas.',
    falar: 'Falar com a Iara',
    colunas: [
      { titulo: 'Descubra', links: [['/', 'Portal'], ['/experiencias', 'Experiências'], ['/destinos', 'Destinos no mapa'], ['/rede', 'Rede EDA'], ['/pesca-esportiva', 'Pesca esportiva']] },
      { titulo: 'Para quem faz o turismo', links: [['/operadores', 'Encantos Gestão'], ['/precos', 'Planos e preços'], ['/login', 'Entrar na plataforma']] },
    ],
    atendimento: 'Atendimento',
    feito: 'Feito na Amazônia, para a Amazônia.',
  },
  EN: {
    lema: 'Born in Barcelos, on the Rio Negro.',
    sobre: 'Amazon inbound tourism with 24-hour service: visitors find the right experience, operators run the whole trip.',
    feedback: 'Send feedback',
    aria: 'Information and support',
    chamada: 'The Amazon starts with a conversation.',
    chamadaSub: 'Iara answers right away: destinations, tours, prices and dates.',
    falar: 'Talk to Iara',
    colunas: [
      { titulo: 'Discover', links: [['/', 'Portal'], ['/experiencias', 'Experiences'], ['/destinos', 'Destinations on the map'], ['/rede', 'EDA Network'], ['/pesca-esportiva', 'Sport fishing']] },
      { titulo: 'For tourism professionals', links: [['/operadores', 'Encantos Gestão'], ['/precos', 'Plans and prices'], ['/login', 'Sign in']] },
    ],
    atendimento: 'Support',
    feito: 'Made in the Amazon, for the Amazon.',
  },
  ES: {
    lema: 'Nacida en Barcelos, en el Río Negro.',
    sobre: 'Turismo receptivo de la Amazonía con atención las 24 horas: quien visita encuentra el paseo ideal, quien opera organiza todo el viaje.',
    feedback: 'Enviar comentarios',
    aria: 'Información y atención',
    chamada: 'La Amazonía empieza con una conversación.',
    chamadaSub: 'Iara responde al instante: destinos, paseos, precios y fechas.',
    falar: 'Hablar con Iara',
    colunas: [
      { titulo: 'Descubre', links: [['/', 'Portal'], ['/experiencias', 'Experiencias'], ['/destinos', 'Destinos en el mapa'], ['/rede', 'Red EDA'], ['/pesca-esportiva', 'Pesca deportiva']] },
      { titulo: 'Para quien hace el turismo', links: [['/operadores', 'Encantos Gestão'], ['/precos', 'Planes y precios'], ['/login', 'Entrar']] },
    ],
    atendimento: 'Atención',
    feito: 'Hecho en la Amazonía, para la Amazonía.',
  },
};

const LEGAIS: Record<'PT' | 'EN' | 'ES', readonly (readonly [string, string])[]> = {
  PT: [['/contato', 'Central de atendimento'], ['/privacidade', 'Privacidade'], ['/termos', 'Termos de Serviço'], ['/reembolso', 'Cancelamento e reembolso']],
  EN: [['/contato', 'Help center'], ['/privacidade', 'Privacy'], ['/termos', 'Terms of Service'], ['/reembolso', 'Cancellation and refund']],
  ES: [['/contato', 'Centro de atención'], ['/privacidade', 'Privacidad'], ['/termos', 'Términos de Servicio'], ['/reembolso', 'Cancelación y reembolso']],
};

const LINK = `inline-flex min-h-10 items-center text-sm text-[#C9D6CE] transition-colors hover:text-[#F4C77E] ${FOCO}`;
const TITULO = 'text-[11px] font-semibold uppercase tracking-[0.16em] text-[#F4C77E]';

// EDA_RODAPE_PUBLICO_V2 (Fablepremium): chamada para a Iara, colunas de navegação,
// atendimento e identificação da empresa. Um só rodapé para todas as páginas públicas.
export default function RodapePublicoEDA() {
  const { idioma } = useLanguage();
  const chave = (idioma in textos ? idioma : 'PT') as 'PT' | 'EN' | 'ES';
  const t = textos[chave];

  return (
    <footer className="ern-publico-hero relative overflow-hidden bg-[#050D0A] text-[#B8C9BF]">
      <div aria-hidden="true" className="h-px bg-gradient-to-r from-transparent via-[#E3A144]/70 to-transparent" />
      <div aria-hidden="true" className="pointer-events-none absolute inset-x-0 top-0 h-64 bg-[radial-gradient(60%_100%_at_50%_0%,rgb(227_161_68/0.10),transparent_70%)]" />

      <div className="relative mx-auto max-w-[1180px] px-5 sm:px-8">
        <div className="flex flex-col gap-5 border-b border-white/10 py-10 md:flex-row md:items-center md:justify-between">
          <div>
            <p className="text-2xl font-semibold tracking-[-0.02em] text-[#F5F3EA] sm:text-[28px]">{t.chamada}</p>
            <p className="mt-2 text-sm leading-6 text-[#B8C9BF]">{t.chamadaSub}</p>
          </div>
          <button
            type="button"
            aria-haspopup="dialog"
            onClick={() => window.dispatchEvent(new Event('iara:abrir'))}
            className={`inline-flex min-h-12 shrink-0 items-center justify-center gap-2 rounded-full bg-gradient-to-b from-[#F7D595] to-[#E3A144] px-6 text-sm font-semibold text-[#07110E] shadow-[0_12px_30px_-10px_rgb(227_161_68/0.7)] transition-transform hover:-translate-y-0.5 motion-reduce:transition-none ${FOCO}`}
          >
            {t.falar} <span aria-hidden="true">→</span>
          </button>
        </div>

        <div className="grid gap-10 py-12 sm:grid-cols-2 lg:grid-cols-[1.4fr_1fr_1fr_1fr]">
          <div className="sm:col-span-2 lg:col-span-1">
            <div className="flex items-center gap-3">
              <LogoERN tamanho={44} />
              <span className="leading-tight">
                <span className="block text-lg font-semibold text-[#F5F3EA]">Encantos da Amazônia</span>
                <span className="block text-xs text-[#F4C77E]">{t.lema}</span>
              </span>
            </div>
            <p className="mt-5 max-w-sm text-sm leading-6">{t.sobre}</p>
          </div>

          {t.colunas.map((coluna) => (
            <nav key={coluna.titulo} aria-label={coluna.titulo}>
              <p className={TITULO}>{coluna.titulo}</p>
              <ul className="mt-3 grid gap-0.5">
                {coluna.links.map(([href, nome]) => (
                  <li key={href}><Link href={href} className={LINK}>{nome}</Link></li>
                ))}
              </ul>
            </nav>
          ))}

          <nav aria-label={t.aria}>
            <p className={TITULO}>{t.atendimento}</p>
            <ul className="mt-3 grid gap-0.5">
              {LEGAIS[chave].map(([href, nome]) => (
                <li key={href}><Link href={href} className={LINK}>{nome}</Link></li>
              ))}
              <li>
                {/* EDA_FLUTUANTES_V1: o feedback fica no rodapé, junto dos links */}
                <button
                  type="button"
                  aria-haspopup="dialog"
                  onClick={() => window.dispatchEvent(new Event('eda:abrir-feedback'))}
                  className={`eda-rodape-feedback ${LINK}`}
                >
                  {t.feedback}
                </button>
              </li>
            </ul>
          </nav>
        </div>

        <div className="flex flex-col gap-3 border-t border-white/10 py-6 text-xs text-[#8FA79A] sm:flex-row sm:items-center sm:justify-between">
          <p>© {new Date().getFullYear()} {EMPRESA_EDA.nomeFantasia} · CNPJ {EMPRESA_EDA.cnpj}</p>
          <div className="flex flex-wrap items-center gap-x-5 gap-y-2">
            <span>{t.feito}</span>
            {/* EDA_MODO_LEVE_V1 */}
            <ModoEconomicoEDA />
          </div>
        </div>
      </div>
    </footer>
  );
}
