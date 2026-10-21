'use client';

import Image from 'next/image';
import { useEffect, useId, useRef, useState } from 'react';
import { useLanguage } from '@/app/components/LanguageProvider';

const capturas = [
  { arquivo: 'dashboard-desktop..png', largura: 1870, altura: 1012 },
  { arquivo: 'dashboard-desktop2..png', largura: 1870, altura: 1022 },
  { arquivo: 'agenda-desktop..png', largura: 1872, altura: 1022 },
];

const textos = {
  PT: {
    titulo: 'Conheça a ERN em funcionamento',
    nomes: ['Dashboard amarelo', 'Dashboard azul', 'Materiais e orçamento'],
    descricoes: [
      'Dashboard da ERN com navegação e apresentação no tema amarelo',
      'Dashboard da ERN no tema azul, com atalhos para reservas e demandas',
      'Tela de materiais da operação com estimativa de custos e gráfico por categoria',
    ],
    selecionar: 'Mostrar',
    pausar: 'Pausar troca',
    continuar: 'Iniciar troca',
    ampliar: 'Ampliar tela',
    fechar: 'Fechar ampliação',
    aviso: 'Telas da plataforma. Recursos conforme o plano e o tipo de acesso.',
  },
  EN: {
    titulo: 'Explore ERN in action',
    nomes: ['Yellow dashboard', 'Blue dashboard', 'Materials and budget'],
    descricoes: [
      'ERN dashboard with navigation and a yellow theme',
      'ERN dashboard in a blue theme, with shortcuts to reservations and company needs',
      'Operation materials screen with cost estimates and a chart by category',
    ],
    selecionar: 'Show',
    pausar: 'Pause rotation',
    continuar: 'Start rotation',
    ampliar: 'Enlarge screen',
    fechar: 'Close enlarged view',
    aviso: 'Platform screens. Features depend on the plan and access type.',
  },
  ES: {
    titulo: 'Conozca ERN en funcionamiento',
    nomes: ['Panel amarillo', 'Panel azul', 'Materiales y presupuesto'],
    descricoes: [
      'Panel de ERN con navegación y presentación en el tema amarillo',
      'Panel de ERN en el tema azul, con accesos a reservas y necesidades',
      'Pantalla de materiales de la operación con estimación de costes y gráfico por categoría',
    ],
    selecionar: 'Mostrar',
    pausar: 'Pausar cambio',
    continuar: 'Iniciar cambio',
    ampliar: 'Ampliar pantalla',
    fechar: 'Cerrar ampliación',
    aviso: 'Pantallas de la plataforma. Funciones según el plan y el tipo de acceso.',
  },
};

function endereco(arquivo: string) {
  return `/images/vitrine/${encodeURIComponent(arquivo)}`;
}

export default function DemonstracaoOperadoresERN() {
  const { idioma } = useLanguage();
  const t = textos[idioma];
  const [indice, setIndice] = useState(0);
  const [automatico, setAutomatico] = useState(false);
  const [sobre, setSobre] = useState(false);
  const [focado, setFocado] = useState(false);
  const [visivel, setVisivel] = useState(false);
  const [paginaVisivel, setPaginaVisivel] = useState(true);
  const [ampliada, setAmpliada] = useState<number | null>(null);
  const raiz = useRef<HTMLElement>(null);
  const dialogo = useRef<HTMLDialogElement>(null);
  const painelId = useId();
  const tituloId = useId();
  const dialogoTituloId = useId();
  const atual = capturas[indice];

  useEffect(() => {
    const media = window.matchMedia('(prefers-reduced-motion: reduce)');

    setAutomatico(!media.matches);

    function atualizarMovimento() {
      if (media.matches) setAutomatico(false);
    }

    media.addEventListener('change', atualizarMovimento);
    return () => media.removeEventListener('change', atualizarMovimento);
  }, []);

  useEffect(() => {
    function atualizarPagina() {
      setPaginaVisivel(!document.hidden);
    }

    atualizarPagina();
    document.addEventListener('visibilitychange', atualizarPagina);

    const elemento = raiz.current;
    if (!elemento) {
      return () => document.removeEventListener('visibilitychange', atualizarPagina);
    }

    if (!('IntersectionObserver' in window)) {
      setVisivel(true);
      return () => document.removeEventListener('visibilitychange', atualizarPagina);
    }

    const observador = new IntersectionObserver(
      ([entrada]) => setVisivel(entrada.isIntersecting),
      { threshold: 0.25 },
    );

    observador.observe(elemento);

    return () => {
      observador.disconnect();
      document.removeEventListener('visibilitychange', atualizarPagina);
    };
  }, []);

  useEffect(() => {
    if (
      !automatico || sobre || focado || !visivel ||
      !paginaVisivel || ampliada !== null
    ) return;

    const temporizador = window.setInterval(() => {
      setIndice(atual => (atual + 1) % capturas.length);
    }, 8000);

    return () => window.clearInterval(temporizador);
  }, [automatico, sobre, focado, visivel, paginaVisivel, ampliada]);

  function selecionar(posicao: number) {
    setAutomatico(false);
    setIndice(posicao);
  }

  function ampliar() {
    setAutomatico(false);
    setAmpliada(indice);
    dialogo.current?.showModal();
  }

  return (
    <section
      ref={raiz}
      className="demonstracao"
      aria-labelledby={tituloId}
      onMouseEnter={() => setSobre(true)}
      onMouseLeave={() => setSobre(false)}
      onFocusCapture={() => setFocado(true)}
      onBlurCapture={event => {
        if (!event.currentTarget.contains(event.relatedTarget as Node | null)) {
          setFocado(false);
        }
      }}
    >
      <h2 id={tituloId} className="sr-only">{t.titulo}</h2>

      <div id={painelId} className="palco">
        <button
          type="button"
          className="abrir"
          onClick={ampliar}
          aria-label={`${t.ampliar}: ${t.nomes[indice]}`}
        >
          <Image
            src={endereco(atual.arquivo)}
            alt={t.descricoes[indice]}
            width={atual.largura}
            height={atual.altura}
            sizes="(max-width: 1023px) 92vw, (max-width: 1400px) 48vw, 650px"
            quality={75}
            priority={indice === 0}
            className="principal"
          />
        </button>
      </div>

      <div className="base">
        <p className="nome">{t.nomes[indice]}</p>
        <button
          type="button"
          className="rotacao"
          onClick={() => setAutomatico(valor => !valor)}
          aria-pressed={automatico}
        >
          {automatico ? t.pausar : t.continuar}
        </button>
      </div>

      <div className="miniaturas" role="group" aria-label={t.titulo}>
        {capturas.map((captura, posicao) => (
          <button
            key={captura.arquivo}
            type="button"
            aria-label={`${t.selecionar}: ${t.nomes[posicao]}`}
            aria-pressed={indice === posicao}
            aria-controls={painelId}
            onClick={() => selecionar(posicao)}
          >
            <Image
              src={endereco(captura.arquivo)}
              alt=""
              width={captura.largura}
              height={captura.altura}
              sizes="(max-width: 639px) 28vw, (max-width: 1023px) 29vw, 190px"
              quality={75}
              className="miniatura"
            />
            <span>{t.nomes[posicao]}</span>
          </button>
        ))}
      </div>

      <p className="aviso">{t.aviso}</p>

      <dialog
        ref={dialogo}
        aria-labelledby={dialogoTituloId}
        className="ampliacao"
        onClose={() => setAmpliada(null)}
      >
        <div className="topo">
          <h3 id={dialogoTituloId}>
            {t.nomes[ampliada ?? indice]}
          </h3>
          <button type="button" autoFocus onClick={() => dialogo.current?.close()}>
            {t.fechar} <span aria-hidden="true">×</span>
          </button>
        </div>
        {ampliada !== null && (
          <div className="imagem-ampliada">
            <Image
              src={endereco(capturas[ampliada].arquivo)}
              alt={t.descricoes[ampliada]}
              width={capturas[ampliada].largura}
              height={capturas[ampliada].altura}
              sizes="96vw"
              quality={75}
              className="imagem-dialogo"
            />
          </div>
        )}
      </dialog>

      <style jsx>{`
        .demonstracao{min-width:0;width:100%;padding:12px;background:#fffcf0;color:#30260d;border:1px solid #cdba7a;border-radius:18px;box-shadow:0 18px 45px #30260d12}
        .palco{aspect-ratio:1870/1022;background:#fff7db;border-radius:9px;overflow:hidden}
        .abrir{display:block;width:100%;height:100%;cursor:zoom-in}
        .abrir :global(.principal){display:block;width:100%;height:100%;object-fit:contain}
        .base{display:flex;flex-wrap:wrap;align-items:center;justify-content:space-between;gap:4px 12px;padding:8px 2px}
        .nome{font-size:13px;font-weight:700;line-height:1.6}
        .rotacao{min-height:44px;padding:6px 10px;font-size:12px;color:#805600;text-decoration:underline;text-underline-offset:4px;cursor:pointer}
        .miniaturas{display:grid;grid-template-columns:repeat(3,minmax(0,1fr));gap:8px}
        .miniaturas button{min-width:0;border:2px solid #cdba7a;border-radius:8px;overflow:hidden;background:#fff7db;text-align:left;cursor:pointer}
        .miniaturas button[aria-pressed=true]{border-color:#805600;background:#f0e4bb}
        .miniaturas :global(.miniatura){display:block;width:100%;height:auto;aspect-ratio:1870/1022;object-fit:contain}
        .miniaturas span{display:flex;align-items:center;min-height:44px;padding:6px 8px;font-size:11px;line-height:1.5;font-weight:600;overflow-wrap:anywhere}
        .aviso{margin:12px 2px 2px;color:#695727;font-size:12px;line-height:1.7}
        button:focus-visible{outline:3px solid #805600;outline-offset:3px}
        .abrir:focus-visible{outline-offset:-4px}
        .ampliacao{position:fixed;inset:0;margin:auto;width:calc(100vw - 24px);max-width:1500px;max-height:94dvh;overflow:auto;padding:0;border:1px solid #cdba7a;border-radius:14px;background:#fffcf0;color:#30260d}
        .ampliacao::backdrop{background:#07110edb}
        .topo{position:sticky;top:0;z-index:1;display:flex;flex-wrap:wrap;align-items:center;justify-content:space-between;gap:8px;padding:10px 16px;background:#fffcf0;border-bottom:1px solid #cdba7a}
        .topo h3{font-size:14px;font-weight:700}
        .topo button{min-height:44px;padding:8px;font-size:13px;cursor:pointer}
        .imagem-ampliada{padding:8px}
        .imagem-ampliada :global(.imagem-dialogo){display:block;width:100%;height:auto}
        @media(max-width:639px){
          .demonstracao{padding:7px;border-radius:12px}
          .miniaturas{gap:5px}
          .miniaturas span{padding:5px;font-size:10px}
        }
      `}</style>
    </section>
  );
}