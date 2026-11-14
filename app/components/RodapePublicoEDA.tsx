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

const textos = {
  PT: {
    lema: 'Nascida em Barcelos, no Rio Negro.',
    feedback: 'Enviar feedback',
    aria: 'Informações e atendimento',
    links: [
      ['/', 'Voltar ao portal'],
      ['/contato', 'Atendimento'],
      ['/privacidade', 'Privacidade'],
      ['/termos', 'Termos de Serviço'],
      ['/reembolso', 'Cancelamento e reembolso'],
    ],
  },
  EN: {
    lema: 'Born in Barcelos, on the Rio Negro.',
    feedback: 'Send feedback',
    aria: 'Information and support',
    links: [
      ['/', 'Back to portal'],
      ['/contato', 'Support'],
      ['/privacidade', 'Privacy'],
      ['/termos', 'Terms of Service'],
      ['/reembolso', 'Cancellation and refund'],
    ],
  },
  ES: {
    lema: 'Nacida en Barcelos, en el Río Negro.',
    feedback: 'Enviar comentarios',
    aria: 'Información y atención',
    links: [
      ['/', 'Volver al portal'],
      ['/contato', 'Atención'],
      ['/privacidade', 'Privacidad'],
      ['/termos', 'Términos de Servicio'],
      ['/reembolso', 'Cancelación y reembolso'],
    ],
  },
} as const;

export default function RodapePublicoEDA() {
  const { idioma } = useLanguage();
  const t = textos[idioma as keyof typeof textos] ?? textos.PT;

  return (
    <footer className="ern-publico-hero border-t border-white/10 bg-[#07110E] text-[#B8C9BF]">
      <div className="mx-auto flex max-w-[1180px] flex-col gap-6 px-5 py-10 sm:px-8 md:flex-row md:items-center md:justify-between">
        <div className="flex items-center gap-3">
          <LogoERN tamanho={40} />
          <span className="leading-tight">
            <span className="block text-lg font-semibold text-[#F0F0E8]">Encantos da Amazônia</span>
            <span className="block text-xs">{t.lema}</span>
          </span>
        </div>
        <nav aria-label={t.aria} className="flex flex-wrap gap-x-5 gap-y-1">
          {t.links.map(([href, nome]) => (
            <Link
              key={href}
              href={href}
              className={`inline-flex min-h-11 items-center text-sm font-semibold text-[#EDEDE3] hover:text-[#F4C77E] ${FOCO}`}
            >
              {nome}
            </Link>
          ))}
          {/* EDA_FLUTUANTES_V1: Feedback no rodapé, na mesma linha e estilo dos links */}
          <button
            type="button"
            aria-haspopup="dialog"
            onClick={() => window.dispatchEvent(new Event('eda:abrir-feedback'))}
            className={`eda-rodape-feedback inline-flex min-h-11 items-center text-sm font-semibold text-[#EDEDE3] hover:text-[#F4C77E] ${FOCO}`}
          >
            {t.feedback}
          </button>
          {/* EDA_MODO_LEVE_V1 */}
          <ModoEconomicoEDA />
        </nav>
      </div>
      <div className="border-t border-white/10">
        <p className="mx-auto max-w-[1180px] px-5 py-4 text-xs text-[#8FA79A] sm:px-8">
          © {new Date().getFullYear()} {EMPRESA_EDA.nomeFantasia} · CNPJ {EMPRESA_EDA.cnpj}
        </p>
      </div>
    </footer>
  );
}
