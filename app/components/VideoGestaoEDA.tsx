'use client';

// EDA_VIDEO_GESTAO_V2: na seção "EDA para operadores" da Descubra, a mesma
// janela com o vídeo real da Encantos Gestão usada na página de operadores.
import { useLanguage } from '@/app/components/LanguageProvider';
import { TelaVideoGestaoEDA } from '@/app/components/VitrineGestaoAcessoEDA';

const textos = {
  PT: { janela: 'Encantos Gestão · Painel' },
  EN: { janela: 'Encantos Gestão · Dashboard' },
  ES: { janela: 'Encantos Gestão · Panel' },
} as const;

export default function VideoGestaoEDA() {
  const { idioma } = useLanguage();
  const t = textos[idioma === 'EN' || idioma === 'ES' ? idioma : 'PT'];

  return (
    <figure className="m-0 overflow-hidden rounded-[22px] border border-[#F4C77E]/30 bg-[#08130F] shadow-[0_40px_90px_rgb(0_0_0/55%)]">
      <figcaption className="flex items-center gap-2 border-b border-white/[0.08] px-4 py-3">
        <span aria-hidden="true" className="size-2.5 rounded-full bg-[#3A5047]" />
        <span aria-hidden="true" className="size-2.5 rounded-full bg-[#3A5047]" />
        <span aria-hidden="true" className="size-2.5 rounded-full bg-[#3A5047]" />
        <span className="ml-2 text-xs text-[#8FA39A]">{t.janela}</span>
      </figcaption>
      <TelaVideoGestaoEDA className="relative aspect-[16/9] bg-[#05100C]" />
    </figure>
  );
}
