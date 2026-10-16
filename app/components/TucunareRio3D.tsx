'use client';
import { useEffect, useId, useRef, useState } from 'react';

function TucunareEstatico() {
  const id = useId().replace(/:/g, '');
  return <svg viewBox="0 0 640 300" className="h-full w-full" aria-hidden="true"><defs><linearGradient id={id} x1="0" y1="0" x2="0.3" y2="1"><stop stopColor="#55712d"/><stop offset=".48" stopColor="#d6bd47"/><stop offset="1" stopColor="#f0dca0"/></linearGradient></defs><ellipse cx="340" cy="244" rx="153" ry="10" fill="none" stroke="#9acaba" strokeOpacity=".5" strokeWidth="2"/><ellipse cx="340" cy="244" rx="119" ry="5" fill="none" stroke="#9acaba" strokeOpacity=".4"/><g transform="translate(320 151) rotate(-12)"><path d="M-116 -8L-181 -58Q-193 -5 -180 56L-116 14" fill="#bb8036" stroke="#ead080" strokeWidth="2"/><path d="M-87 -32L-71 -72L-48 -58L-25 -80L-4 -59L17 -70L49 -35M-74 30L-54 68L-8 59L15 37" fill="#9d9c3f" stroke="#d6c16c" strokeWidth="2"/><path d="M-132 0C-91 -53 45 -64 107 -25L136 -7L121 9L132 18C80 52 -80 51 -132 0Z" fill={`url(#${id})`} stroke="#e4ce77" strokeWidth="2"/><path d="M-77 -36L-66 32M-18 -43L-8 39M39 -40L49 34" stroke="#233a25" strokeWidth="17"/><ellipse cx="-112" cy="0" rx="11" ry="12" fill="#dfb944"/><ellipse cx="-112" cy="0" rx="7" ry="8" fill="#1a2d23"/><path d="M79 -28Q58 0 81 28" fill="none" stroke="#66703b" strokeWidth="3"/><circle cx="100" cy="-17" r="9" fill="#f5ae35"/><circle cx="102" cy="-17" r="5" fill="#10251a"/><circle cx="104" cy="-19" r="2" fill="#fff6dc"/><path d="M47 8L11 41L52 33Z" fill="#b59a3b"/><path d="M120 8L136 -7" stroke="#253c28" strokeWidth="3"/></g></svg>;
}
export default function TucunareRio3D() {
  const root = useRef<HTMLDivElement>(null), host = useRef<HTMLDivElement>(null);
  const [visivel, setVisivel] = useState(false), [paginaVisivel, setPaginaVisivel] = useState(true);
  const [reduzido, setReduzido] = useState(true), [pausado, setPausado] = useState(false);
  const [pronto, setPronto] = useState(false), [falhou, setFalhou] = useState(false);
  const tempo = useRef(0);
  useEffect(() => {
    const mq = window.matchMedia('(prefers-reduced-motion: reduce)'); const atualizar = () => setReduzido(mq.matches); atualizar(); mq.addEventListener('change', atualizar);
    const visibilidade = () => setPaginaVisivel(!document.hidden); visibilidade(); document.addEventListener('visibilitychange', visibilidade);
    const alvo = root.current; const observer = typeof IntersectionObserver === 'undefined' ? null : new IntersectionObserver(e => setVisivel(e.some(x => x.isIntersecting)), { threshold: 0.05 });
    if (alvo && observer) observer.observe(alvo); else setVisivel(true);
    return () => { mq.removeEventListener('change', atualizar); document.removeEventListener('visibilitychange', visibilidade); observer?.disconnect(); };
  }, []);
  useEffect(() => {
    if (!visivel || !paginaVisivel || reduzido || pausado || falhou || !host.current) return;
    let ativo = true, quadro = 0, ultimo = 0;
    let cena: ReturnType<typeof import('@/lib/tucunareERN')['criarTucunareERN']> | undefined;
    let tamanho: ResizeObserver | undefined;
    const contextoPerdido = (e: Event) => { e.preventDefault(); if (ativo) { setPronto(false); setFalhou(true); } };
    const redimensionar = () => cena?.resize();
    async function iniciar() {
      try {
        const { criarTucunareERN } = await import('@/lib/tucunareERN');
        if (!ativo || !host.current) return;
        cena = criarTucunareERN(host.current); cena.canvas.addEventListener('webglcontextlost', contextoPerdido);
        if (typeof ResizeObserver !== 'undefined') { tamanho = new ResizeObserver(redimensionar); tamanho.observe(host.current); }
        window.addEventListener('resize', redimensionar); setPronto(true);
        function animar(agora: number) {
          if (!ativo) return;
          if (!ultimo || agora - ultimo >= 1000 / 30) { tempo.current += ultimo ? Math.min((agora - ultimo) / 1000, 0.1) : 1 / 30; ultimo = agora; cena?.render(tempo.current); }
          quadro = requestAnimationFrame(animar);
        }
        quadro = requestAnimationFrame(animar);
      } catch { if (ativo) { setPronto(false); setFalhou(true); } }
    }
    void iniciar();
    return () => { ativo = false; cancelAnimationFrame(quadro); tamanho?.disconnect(); window.removeEventListener('resize', redimensionar); cena?.canvas.removeEventListener('webglcontextlost', contextoPerdido); cena?.dispose(); setPronto(false); };
  }, [visivel, paginaVisivel, reduzido, pausado, falhou]);
  return <div ref={root} className="pointer-events-none absolute inset-y-0 right-0 w-full lg:w-[46%]">
    <div role="img" aria-label={pronto ? "Tucunaré estilizado saltando e girando sobre as águas do Rio Negro" : "Tucunaré estilizado sobre as águas do Rio Negro"} className="absolute inset-0">
      <div ref={host} className="absolute inset-0" aria-hidden="true"/>
      {!pronto && <TucunareEstatico />}
    </div>
    {!reduzido && !falhou && <button type="button" aria-pressed={pausado} onClick={() => setPausado(p => !p)} className="pointer-events-auto absolute bottom-3 right-3 z-20 min-h-11 rounded-xl border border-white/20 bg-[#07110E]/85 px-3 text-[10px] font-semibold text-[#F4C77E] backdrop-blur focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[#F4C77E]">{pausado ? 'Retomar animação' : 'Pausar animação'}</button>}
  </div>;
}
