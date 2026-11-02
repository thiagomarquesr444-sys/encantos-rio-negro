'use client';

import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { PAGINAS_INSTITUCIONAIS } from '@/lib/paginasInstitucionaisERN';

// ERN_INSTITUCIONAL_PREMIUM_V1: menu lateral entre as páginas de atendimento.


const FOCO =
  'focus-visible:outline-2 focus-visible:outline-offset-4 focus-visible:outline-[#E3A144]';

export default function MenuInstitucionalERN() {
  const pathname = usePathname();

  return (
    <nav aria-label="Páginas de atendimento" className="rounded-[22px] border border-[#e3dfd6] bg-white p-2 shadow-[0_12px_32px_rgb(15_28_23/5%)]">
      {PAGINAS_INSTITUCIONAIS.map((pagina) => {
        const ativa = pathname === pagina.href;
        return (
          <Link
            key={pagina.href}
            href={pagina.href}
            aria-current={ativa ? 'page' : undefined}
            className={`flex min-h-14 items-center gap-3 rounded-2xl px-3 py-2.5 transition ${FOCO} ${
              ativa ? 'ern-publico-hero bg-[#07110E] text-[#F5F3EA]' : 'text-[#0f1c17] hover:bg-[#f3f1ec]'
            }`}
          >
            <span className={`grid h-10 w-10 shrink-0 place-items-center rounded-xl ${ativa ? 'bg-gradient-to-b from-[#F7D595] to-[#E3A144] text-[#07110E]' : 'bg-[#f3f1ec] text-[#8a4b12]'}`}>
              <svg aria-hidden="true" width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.7" strokeLinecap="round" strokeLinejoin="round">
                <path d={pagina.icone} />
              </svg>
            </span>
            <span className="min-w-0">
              <span className="block text-sm font-semibold">{pagina.nome}</span>
              <span className={`block text-xs ${ativa ? 'text-[#B8C9BF]' : 'text-[#4b5a53]'}`}>{pagina.resumo}</span>
            </span>
          </Link>
        );
      })}
    </nav>
  );
}
