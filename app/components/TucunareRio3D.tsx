'use client';
import { useEffect, useId, useRef, useState } from 'react';

function TucunareEstatico() {
  const id = useId().replace(/:/g, '');
  return <svg viewBox="0 0 640 300" className="h-full w-full" aria-hidden="true"><defs>
    <linearGradient id={id} x1="0" y1="0" x2="0.15" y2="1"><stop stopColor="#40584d"/><stop offset=".30" stopColor="#9f9f3b"/><stop offset=".64" stopColor="#c3b83b"/><stop offset="1" stopColor="#b8642d"/></linearGradient>
    <linearGradient id={id + 'tail'} x1="0" y1="0" x2="0" y2="1"><stop stopColor="#55665e"/><stop offset=".42" stopColor="#5e6650"/><stop offset="1" stopColor="#9b3522"/></linearGradient>
  </defs><ellipse cx="330" cy="254" rx="163" ry="10" fill="none" stroke="#9acaba" strokeOpacity=".45" strokeWidth="2"/><ellipse cx="330" cy="254" rx="126" ry="5" fill="none" stroke="#9acaba" strokeOpacity=".3"/>
  <g transform="translate(335 153) rotate(-9)">
    <path d="M-118 -9Q-152 -23 -179 -44Q-209 -59 -210 -20Q-214 13 -205 38Q-197 58 -176 41Q-145 19 -117 10Z" fill={`url(#${id}tail)`} stroke="#52604b"/>
    <path d="M-97 -26Q-97 -77 -62 -67L-50 -85L-37 -63L-24 -91L-13 -62L3 -93L13 -59L28 -88L38 -54L53 -80L64 -42L78 -65L89 -33Z" fill="#566d67" stroke="#89968a"/>
    <path d="M-82 27Q-91 76 -59 65L-34 39M49 34L25 85Q62 70 72 39" fill="#a13b24" stroke="#b06536"/>
    <path d="M-127 -8C-105 -33 -71 -52 -21 -57C33 -62 74 -42 110 -12L135 3L115 14L132 23C93 46 53 55 -2 47C-62 43 -103 21 -127 -8Z" fill={`url(#${id})`} stroke="#a99b4a" strokeWidth="1.5"/>
    <path d="M-79 -37L-70 31M-17 -55L-8 46M47 -43L58 44" stroke="#354538" strokeWidth="17" opacity=".83"/>
    <path d="M83 -21Q60 -22 61 -2Q61 22 81 32" fill="none" stroke="#4e5b35" strokeWidth="2"/>
    <path d="M80 -18l-14 -5l-12 6l4 8l10 -2l-1 8l8 5l10 -8Z" fill="#243a2c"/>
    <g fill="#293c2a"><circle cx="68" cy="12" r="3"/><circle cx="78" cy="17" r="2.5"/><circle cx="58" cy="5" r="2"/><circle cx="85" cy="8" r="2.3"/></g>
    <path d="M63 10Q23 14 -2 42Q28 48 64 21Z" fill="#806440" stroke="#aa9761"/>
    <ellipse cx="-135" cy="-2" rx="8" ry="11" fill="#b6b449"/><ellipse cx="-135" cy="-2" rx="5" ry="8" fill="#182e24"/>
    <ellipse cx="99" cy="-12" rx="6" ry="5" fill="#c04d36"/><ellipse cx="100" cy="-12" rx="3" ry="3.5" fill="#0d2018"/><circle cx="101" cy="-14" r="1.3" fill="#e8e4c7"/>
    <path d="M135 3L112 10L98 9M114 16L132 23" fill="none" stroke="#56613a" strokeWidth="2"/>
    <path d="M-196 -31L-130 -3M-204 -12L-130 -3M-204 12L-130 -3M-195 32L-130 -3" stroke="#454e3b" opacity=".6"/>
  </g></svg>;
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
    <div role="img" aria-label={pronto ? "Tucunaré saltando sobre as águas do Rio Negro" : "Tucunaré sobre as águas do Rio Negro"} className="absolute inset-0">
      <div ref={host} className="absolute inset-0" aria-hidden="true"/>
      {!pronto && <TucunareEstatico />}
    </div>
    {!reduzido && !falhou && <button type="button" aria-pressed={pausado} onClick={() => setPausado(p => !p)} className="pointer-events-auto absolute bottom-3 right-3 z-20 min-h-11 rounded-xl border border-white/20 bg-[#07110E]/85 px-3 text-[10px] font-semibold text-[#F4C77E] backdrop-blur focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[#F4C77E]">{pausado ? 'Retomar animação' : 'Pausar animação'}</button>}
  </div>;
}
