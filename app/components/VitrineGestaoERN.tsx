'use client';

import Image from 'next/image';
import Link from 'next/link';
import { useId, useRef, useState } from 'react';
import { useLanguage } from '@/app/components/LanguageProvider';

type Captura = {
  arquivo: string;
  largura: number;
  altura: number;
};

const desktop: Captura[] = [
  { arquivo: 'dashboard-desktop..png', largura: 1870, altura: 1012 },
  { arquivo: 'dashboard-desktop2..png', largura: 1870, altura: 1022 },
  { arquivo: 'dashboard-desktop3..png', largura: 1862, altura: 1025 },
  { arquivo: 'dashboard-desktop4..png', largura: 1873, altura: 1015 },
  { arquivo: 'dashboard-desktop5..png', largura: 1870, altura: 1021 },
  { arquivo: 'dashboard-desktop6..png', largura: 1873, altura: 988 },
];

const grupos: Captura[][] = [
  desktop,
  [
    { arquivo: 'agenda-desktop..png', largura: 1872, altura: 1022 },
    { arquivo: 'agenda-desktop1..png', largura: 1867, altura: 1027 },
  ],
  [{ arquivo: 'financeiro-desktop..png', largura: 1871, altura: 1018 }],
  [
    { arquivo: 'publicar-desktop..png', largura: 1871, altura: 1032 },
    { arquivo: 'publica\u00e7\u00e3o-desktop..png', largura: 1862, altura: 1020 },
  ],
  [
    { arquivo: 'temas-desktop..png', largura: 1862, altura: 1021 },
    { arquivo: 'menu-mobile.png.jpeg', largura: 720, altura: 1343 },
  ],
  [
    { arquivo: 'dashboard-mobile.png.jpeg', largura: 720, altura: 1230 },
    { arquivo: 'dashboard-mobile1.png.jpeg', largura: 720, altura: 1334 },
    { arquivo: 'menu-mobile.png.jpeg', largura: 720, altura: 1343 },
  ],
];

const textos = {
  pt: {
    chamada: 'ERN Gestão · para operadoras',
    titulo: 'O Rio Negro inspira. Sua operação ganha estrutura.',
    descricao: 'Conheça as telas da plataforma e veja como organizar a rotina da sua operadora, do planejamento das viagens ao acompanhamento financeiro.',
    abas: ['Dashboard', 'Demandas', 'Financeiro', 'Publicações', 'Personalização', 'No celular'],
    beneficios: [
      'Uma visão dos indicadores, das próximas operações e das demandas da empresa.',
      'Organize as demandas e prepare o que cada operação precisa.',
      'Consulte entradas, despesas e pendências com apoio de gráficos.',
      'Apresente sua operadora e publique suas experiências na Rede ERN.',
      'Escolha a aparência que combina com a sua empresa.',
      'Acesse os recursos da plataforma também pelo celular.',
    ],
    ampliar: 'Ampliar captura',
    anterior: 'Captura anterior',
    proxima: 'Próxima captura',
    fechar: 'Fechar ampliação',
    imagem: 'Tela demonstrativa',
    aviso: 'Capturas da plataforma com dados de demonstração. A disponibilidade dos recursos depende do plano contratado.',
    botao: 'Conhecer a ERN Gestão',
    legenda: 'Explore as telas reais da plataforma',
  },
  en: {
    chamada: 'ERN Management · for tour operators',
    titulo: 'Inspired by the Rio Negro. Built for your operation.',
    descricao: 'Explore the platform screens and see how to organize your business, from trip planning to financial monitoring.',
    abas: ['Dashboard', 'Needs', 'Finance', 'Publications', 'Appearance', 'On mobile'],
    beneficios: [
      'An overview of indicators, upcoming operations and company needs.',
      'Organize company needs and prepare what each operation requires.',
      'Review income, expenses and outstanding amounts with charts.',
      'Present your business and publish your experiences on Rede ERN.',
      'Choose the appearance that suits your company.',
      'Access platform features on your phone too.',
    ],
    ampliar: 'Enlarge screenshot',
    anterior: 'Previous screenshot',
    proxima: 'Next screenshot',
    fechar: 'Close enlarged view',
    imagem: 'Demonstration screen',
    aviso: 'Platform screenshots with demonstration data. Feature availability depends on the selected plan. Screen content is in Portuguese.',
    botao: 'Explore ERN Management',
    legenda: 'Explore real platform screens',
  },
  es: {
    chamada: 'ERN Gestión · para operadores turísticos',
    titulo: 'El Río Negro inspira. Su operación gana estructura.',
    descricao: 'Explore las pantallas de la plataforma y descubra cómo organizar su empresa, desde la planificación de viajes hasta el seguimiento financiero.',
    abas: ['Panel', 'Necesidades', 'Finanzas', 'Publicaciones', 'Personalización', 'En el móvil'],
    beneficios: [
      'Una visión de los indicadores, próximas operaciones y necesidades de la empresa.',
      'Organice las necesidades de la empresa y prepare cada operación.',
      'Revise ingresos, gastos e importes pendientes con gráficos.',
      'Presente su empresa y publique sus experiencias en Rede ERN.',
      'Elija la apariencia que combine con su empresa.',
      'Acceda a las funciones de la plataforma también desde el móvil.',
    ],
    ampliar: 'Ampliar captura',
    anterior: 'Captura anterior',
    proxima: 'Siguiente captura',
    fechar: 'Cerrar ampliación',
    imagem: 'Pantalla de demostración',
    aviso: 'Capturas de la plataforma con datos de demostración. Las funciones disponibles dependen del plan contratado. Las pantallas están en portugués.',
    botao: 'Conocer ERN Gestión',
    legenda: 'Explore pantallas reales de la plataforma',
  },
};

function endereco(captura: Captura) {
  return `/images/vitrine/${encodeURIComponent(captura.arquivo)}`;
}

export default function VitrineGestaoERN() {
  const { idioma } = useLanguage();
  const idiomaBase = String(idioma).toLowerCase().split(/[-_]/)[0];
  const t = textos[idiomaBase === 'en' ? 'en' : idiomaBase === 'es' ? 'es' : 'pt'];
  const [grupo, setGrupo] = useState(0);
  const [indice, setIndice] = useState(0);
  const [ampliada, setAmpliada] = useState<Captura | null>(null);
  const dialogo = useRef<HTMLDialogElement>(null);
  const painelId = useId();
  const tituloDialogoId = useId();
  const lista = grupos[grupo];
  const atual = lista[indice];
  const vertical = atual.altura > atual.largura;

  function selecionar(valor: number) {
    setGrupo(valor);
    setIndice(0);
  }

  function mover(passo: number) {
    setIndice(anterior => (anterior + passo + lista.length) % lista.length);
  }

  function ampliar() {
    setAmpliada(atual);
    if (dialogo.current && !dialogo.current.open) {
      dialogo.current.showModal();
    }
  }

  return (
    <section id="vitrine-gestao" aria-labelledby="vitrine-gestao-titulo" className="vitrine-ern">
      <div className="vitrine-interior">
        <header className="vitrine-intro">
          <div>
            <p className="vitrine-chamada">{t.chamada}</p>
            <h2 id="vitrine-gestao-titulo">{t.titulo}</h2>
          </div>
          <div>
            <p className="vitrine-descricao">{t.descricao}</p>
            <Link href="/operadores" className="vitrine-link">
              {t.botao} <span aria-hidden="true">↗</span>
            </Link>
          </div>
        </header>

        <div className="vitrine-seletores" role="group" aria-label={t.legenda}>
          {t.abas.map((nome, posicao) => (
            <button
              key={posicao}
              type="button"
              aria-pressed={grupo === posicao}
              aria-controls={painelId}
              onClick={() => selecionar(posicao)}
            >
              {nome}
            </button>
          ))}
        </div>

        <div id={painelId}>
          <div className="vitrine-resumo">
            <p>{t.beneficios[grupo]}</p>
            <span>{String(indice + 1).padStart(2, '0')} / {String(lista.length).padStart(2, '0')}</span>
          </div>

          <figure className="vitrine-figura">
            <div className="vitrine-palco">
              <button
                key={atual.arquivo}
                type="button"
                className={`vitrine-captura ${vertical ? 'vertical' : ''}`}
                onClick={ampliar}
                aria-label={`${t.ampliar}: ${t.abas[grupo]}, ${indice + 1}`}
              >
                <Image
                  src={endereco(atual)}
                  alt={`${t.imagem}: ${t.abas[grupo]}, ${indice + 1}`}
                  width={atual.largura}
                  height={atual.altura}
                  sizes={vertical ? '(max-width: 640px) 76vw, 320px' : '(max-width: 1280px) 94vw, 1240px'}
                  quality={85}
                  className="vitrine-imagem"
                />
              </button>
            </div>

            <figcaption className="vitrine-controles">
              <button type="button" onClick={() => mover(-1)} disabled={lista.length < 2} aria-label={t.anterior}>←</button>
              <p>{t.abas[grupo]} <span>· {indice + 1} / {lista.length}</span></p>
              <button type="button" onClick={ampliar} className="vitrine-ampliar">{t.ampliar} ↗</button>
              <button type="button" onClick={() => mover(1)} disabled={lista.length < 2} aria-label={t.proxima}>→</button>
            </figcaption>
          </figure>
        </div>

        <p className="vitrine-aviso">{t.aviso}</p>
      </div>

      <dialog ref={dialogo} aria-labelledby={tituloDialogoId} className="vitrine-dialogo">
        <div className="vitrine-dialogo-topo">
          <h3 id={tituloDialogoId}>{t.imagem}</h3>
          <button type="button" autoFocus onClick={() => dialogo.current?.close()}>{t.fechar} ×</button>
        </div>
        <div className="vitrine-dialogo-imagem">
          {ampliada && (
            // eslint-disable-next-line @next/next/no-img-element
            <img
              src={endereco(ampliada)}
              alt={t.imagem}
              width={ampliada.largura}
              height={ampliada.altura}
            />
          )}
        </div>
      </dialog>

      <style jsx>{`
        .vitrine-ern{scroll-margin-top:100px;padding:100px 20px;background:#fff7db;color:#30260d;border-top:1px solid #cdba7a}
        .vitrine-interior{max-width:1240px;margin:auto}
        .vitrine-intro{display:grid;grid-template-columns:1.1fr 0.9fr;gap:64px;align-items:end}
        .vitrine-chamada{font-size:11px;letter-spacing:.18em;text-transform:uppercase;color:#805600;font-weight:700}
        h2{font-family:var(--font-fraunces),serif;font-size:clamp(34px,4.5vw,60px);line-height:1.08;letter-spacing:-.035em;margin:20px 0 0}
        .vitrine-descricao{color:#695727;font-size:16px;line-height:1.9}
        .vitrine-intro :global(.vitrine-link){display:inline-flex;align-items:center;gap:20px;min-height:48px;margin-top:20px;color:#805600;font-weight:700;border-bottom:1px solid #805600;text-decoration:none}
        .vitrine-seletores{display:flex;flex-wrap:wrap;gap:6px 24px;margin-top:48px;border-bottom:1px solid #cdba7a}
        .vitrine-seletores button{min-height:48px;padding:10px 0;border-bottom:3px solid transparent;color:#695727;font-size:14px;cursor:pointer}
        .vitrine-seletores button[aria-pressed=true]{border-bottom-color:#805600;color:#30260d;font-weight:700}
        .vitrine-resumo{display:flex;align-items:center;justify-content:space-between;gap:24px;padding:22px 0}
        .vitrine-resumo p{font-size:14px;line-height:1.7;color:#695727}
        .vitrine-resumo>span{font-size:12px;white-space:nowrap;color:#805600}
        .vitrine-figura{margin:0}
        .vitrine-palco{padding:14px;background:linear-gradient(130deg,#e8d6a0,#fffcf0 55%,#ecddb4);border-radius:20px}
        .vitrine-captura{display:block;width:100%;margin:auto;overflow:hidden;border-radius:10px;box-shadow:0 12px 32px #30260d24;cursor:zoom-in;animation:vitrine-entrada .4s ease-out both}
        .vitrine-captura.vertical{max-width:320px}
        .vitrine-captura :global(.vitrine-imagem){display:block;width:100%;height:auto}
        .vitrine-controles{display:flex;align-items:center;gap:14px;padding:18px 0;border-bottom:1px solid #cdba7a}
        .vitrine-controles button{min-width:48px;min-height:48px;border:1px solid #cdba7a;border-radius:999px;padding:0 16px;cursor:pointer;font-size:18px}
        .vitrine-controles button:disabled{opacity:.3;cursor:default}
        .vitrine-controles p{flex:1;font-weight:600;font-size:14px}
        .vitrine-controles p span{font-weight:400;color:#695727}
        .vitrine-controles .vitrine-ampliar{font-size:12px;border:0}
        .vitrine-aviso{max-width:800px;margin-top:18px;font-size:12px;line-height:1.8;color:#695727}
        .vitrine-dialogo{position:fixed;inset:0;margin:auto;width:calc(100vw - 24px);max-width:1500px;max-height:94dvh;overflow:auto;background:#fffcf0;color:#30260d;border:1px solid #cdba7a;border-radius:16px;padding:0}
        .vitrine-dialogo::backdrop{background:#07110edb}
        .vitrine-dialogo-topo{position:sticky;top:0;z-index:1;display:flex;align-items:center;justify-content:space-between;gap:16px;padding:12px 18px;background:#fffcf0;border-bottom:1px solid #cdba7a}
        .vitrine-dialogo-topo h3{font-size:14px;font-weight:600}
        .vitrine-dialogo-topo button{min-height:44px;padding:8px 12px;cursor:pointer}
        .vitrine-dialogo-imagem{overflow:auto;padding:12px}
        .vitrine-dialogo-imagem img{display:block;width:auto;max-width:none;height:auto;margin:auto}
        button:focus-visible,.vitrine-intro :global(.vitrine-link:focus-visible){outline:3px solid #805600;outline-offset:4px}
        @keyframes vitrine-entrada{from{opacity:.3;transform:translateY(12px)}to{opacity:1;transform:translateY(0)}}
        @media(max-width:767px){
          .vitrine-ern{padding:64px 16px}
          .vitrine-intro{grid-template-columns:1fr;gap:24px}
          .vitrine-seletores{margin-top:30px;gap:4px 20px}
          .vitrine-palco{padding:7px;border-radius:14px}
          .vitrine-controles{gap:6px;flex-wrap:wrap}
          .vitrine-controles .vitrine-ampliar{padding:0 8px}
          .vitrine-captura.vertical{max-width:280px}
        }
        @media(prefers-reduced-motion:reduce){.vitrine-captura{animation:none}}
      `}</style>
    </section>
  );
}