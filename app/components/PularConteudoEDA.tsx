'use client';

// Atalho de acessibilidade: aparece ao usar Tab e leva direto ao conteúdo
// principal (<main>) da página, pulando menu e cabeçalho.
export default function PularConteudoEDA() {
  return (
    <a
      href="#conteudo"
      onClick={(evento) => {
        const principal = document.querySelector<HTMLElement>('main');
        if (!principal) return;
        evento.preventDefault();
        if (!principal.hasAttribute('tabindex')) principal.setAttribute('tabindex', '-1');
        principal.focus();
        principal.scrollIntoView({ block: 'start' });
      }}
      className="sr-only focus:not-sr-only focus:fixed focus:left-4 focus:top-4 focus:z-[9999] focus:rounded-lg focus:bg-[#E3A144] focus:px-4 focus:py-3 focus:text-sm focus:font-semibold focus:text-[#07110E] focus:shadow-lg focus:outline-2 focus:outline-offset-2 focus:outline-white"
    >
      Pular para o conteúdo
    </a>
  );
}
