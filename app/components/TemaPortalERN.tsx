'use client';

import { useEffect, useState, type ReactNode } from 'react';
import { useLanguage } from '@/app/components/LanguageProvider';

const CHAVE = 'ern.portal.tema.v1';
const textos = {
  PT: { escuro: 'Modo noturno', claro: 'Modo claro' },
  EN: { escuro: 'Dark mode', claro: 'Light mode' },
  ES: { escuro: 'Modo nocturno', claro: 'Modo claro' },
};

export default function TemaPortalERN({ children }: { children: ReactNode }) {
  const { idioma } = useLanguage();
  const t = textos[idioma];
  const [noturno, setNoturno] = useState(false);
  const [pronto, setPronto] = useState(false);

  useEffect(() => {
    try {
      setNoturno(localStorage.getItem(CHAVE) === 'escuro');
    } catch {
      // A preferência funciona mesmo com armazenamento indisponível.
    }
    setPronto(true);

    function sincronizar(event: StorageEvent) {
      if (event.key === CHAVE) {
        setNoturno(event.newValue === 'escuro');
      }
    }
    window.addEventListener('storage', sincronizar);
    return () => window.removeEventListener('storage', sincronizar);
  }, []);

  function alternar() {
    const proximo = !noturno;
    setNoturno(proximo);
    try {
      localStorage.setItem(CHAVE, proximo ? 'escuro' : 'claro');
    } catch {
      // Preserva a escolha no estado da página.
    }
  }

  return (
    <div className="ern-tema-portal"
      data-portal-tema={noturno ? 'escuro' : 'claro'}>
      {children}
      <button type="button" className="ern-tema-portal-controle"
        onClick={alternar} disabled={!pronto}
        aria-label={t.escuro} aria-pressed={noturno}
        title={noturno ? t.claro : t.escuro}>
        <span aria-hidden="true">{noturno ? '☀' : '☾'}</span>
        <span>{noturno ? t.claro : t.escuro}</span>
      </button>

      <style jsx global>{`
        .ern-tema-portal {
          --ern-fundo:#fff7db; --ern-texto:#30260d;
          --ern-painel:#fffcf0; --ern-elevado:#f5e8b8;
          --ern-secundario:#695727; --ern-borda:#d8c895;
          --ern-destaque:#805600; --ern-botao:#805600;
          --ern-sobre-botao:#fff; --ern-hover:#eadbb2;
          --ern-suave:#f5e8b8;
          min-height:100vh;
          background:var(--ern-fundo);color:var(--ern-texto);
          color-scheme:light;
        }
        .ern-tema-portal[data-portal-tema="escuro"] {
          --ern-fundo:#081614; --ern-texto:#fff3d8;
          --ern-painel:#102622; --ern-elevado:#1b3730;
          --ern-secundario:#c6d2c8; --ern-borda:#466052;
          --ern-destaque:#f4c77e; --ern-botao:#f4c77e;
          --ern-sobre-botao:#231b0c; --ern-hover:#24483d;
          --ern-suave:#1b3730;
          color-scheme:dark;
        }
        .ern-tema-portal .ern-tema-portal-controle {
          position:fixed;
          left:max(14px,env(safe-area-inset-left));
          bottom:max(18px,env(safe-area-inset-bottom));
          z-index:90;display:inline-flex;align-items:center;
          justify-content:center;gap:8px;min-height:44px;
          padding:10px 14px;border:1px solid var(--ern-borda);
          border-radius:100px;background:var(--ern-painel);
          color:var(--ern-texto);box-shadow:0 5px 22px #0003;
          font:600 12px var(--font-work-sans),sans-serif;
          cursor:pointer;
        }
        .ern-tema-portal-controle>span:first-child {
          font-size:20px;line-height:1;
        }
        .ern-tema-portal .ern-tema-portal-controle:focus-visible {
          outline:3px solid var(--ern-destaque);outline-offset:4px;
        }
        .ern-tema-portal[data-portal-tema="escuro"] .ern-v-root {
          --v-cream:var(--ern-fundo);--v-paper:var(--ern-painel);
          --v-ink:var(--ern-texto);--v-muted:var(--ern-secundario);
          --v-gold:var(--ern-destaque);--v-line:var(--ern-borda);
          color-scheme:dark;
        }
        .ern-tema-portal[data-portal-tema="escuro"] .ern-r-root {
          --r-bg:var(--ern-fundo);--r-paper:var(--ern-painel);
          --r-ink:var(--ern-texto);--r-muted:var(--ern-secundario);
          --r-gold:var(--ern-destaque);--r-line:var(--ern-borda);
          --r-soft:var(--ern-suave);color-scheme:dark;
        }
        .ern-tema-portal[data-portal-tema="escuro"] :is(
          .ern-v-intro,.ern-v-search,.ern-v-share-field input,
          .ern-v-photo-tag,.ern-v-image-fallback,
          .ern-r-share-field input,.ern-r-filter-panel select,
          .ern-r-gallery,.ern-r-media-frame>img,
          .ern-r-media-frame>video
        ) {
          background:var(--ern-painel);color:var(--ern-texto);
          border-color:var(--ern-borda);
        }
        .ern-tema-portal[data-portal-tema="escuro"] :is(
          .ern-v-button-soft,.ern-v-regional-links>a,
          .ern-v-regional-links>button,
          .ern-v-map-caption nav button[aria-pressed="true"]
        ) {
          background:var(--ern-suave);color:var(--ern-destaque);
          border-color:var(--ern-borda);
        }
        .ern-tema-portal[data-portal-tema="escuro"] :is(
          .ern-v-button,.ern-v-heart[aria-pressed="true"],
          .ern-v-interests button[aria-pressed="true"],
          .ern-v-tools button:last-child,.ern-r-button,
          .ern-r-category-strip button[aria-pressed="true"],
          .ern-r-brand-mark,.ern-r-verified,.ern-r-skip
        ) {
          background:var(--ern-destaque);color:#231b0c!important;
          border-color:var(--ern-destaque);
        }
        .ern-tema-portal[data-portal-tema="escuro"] :is(
          .ern-v-button:hover,.ern-r-button:hover
        ) { background:#ffdda3; }
        .ern-tema-portal[data-portal-tema="escuro"]
          .ern-v-search input::placeholder {
          color:var(--ern-secundario);
        }
        .ern-tema-portal[data-portal-tema="escuro"]
          .ern-v-card-copy>p {
          color:var(--ern-destaque)!important;
        }
        .ern-tema-portal[data-portal-tema="escuro"]
          .ern-r-post-actions { border-color:var(--ern-borda); }
        .ern-tema-portal[data-portal-tema="escuro"]
          .ern-v-map .leaflet-tile-pane {
          filter:brightness(.65) saturate(.75);
        }
        .ern-tema-portal[data-portal-tema="escuro"]
          .ern-v-root .leaflet-control-attribution {
          background:var(--ern-painel);color:var(--ern-secundario);
        }
        .ern-tema-portal[data-portal-tema="escuro"]
          .ern-v-root .leaflet-control-attribution a { color:#a9d9ff; }
        .ern-tema-portal[data-portal-tema="escuro"]
          :is(button,a,input,select):focus-visible {
          outline-color:var(--ern-destaque);
        }
        /* ERN_NOTURNO_GRAFITE_V2 */
        .ern-tema-portal[data-portal-tema="escuro"] {
          --ern-fundo:#101214;
          --ern-texto:#f0f1f2;
          --ern-painel:#1a1d21;
          --ern-elevado:#25292e;
          --ern-secundario:#bfc5cb;
          --ern-borda:#454b53;
          --ern-destaque:#c5b595;
          --ern-botao:#30363e;
          --ern-sobre-botao:#f0f1f2;
          --ern-hover:#343b44;
          --ern-suave:#25292e;
        }

        .ern-tema-portal[data-portal-tema="escuro"] :is(
          .ern-v-button,
          .ern-v-heart[aria-pressed="true"],
          .ern-v-interests button[aria-pressed="true"],
          .ern-v-tools button:last-child,
          .ern-r-root .ern-r-button,
          .ern-r-category-strip button[aria-pressed="true"],
          .ern-r-brand-mark,
          .ern-r-verified,
          .ern-r-skip
        ) {
          background:#30363e!important;
          color:#f0f1f2!important;
          border-color:#66717e;
        }

        .ern-tema-portal[data-portal-tema="escuro"]
          .ern-r-root .ern-r-button[aria-pressed="false"] {
          background:transparent!important;
          color:#cbd1d7!important;
          border-color:#454b53;
        }

        .ern-tema-portal[data-portal-tema="escuro"] :is(
          .ern-v-button:hover,
          .ern-r-root .ern-r-button:hover
        ) {
          background:#424b56!important;
          color:#fff!important;
        }

        .ern-tema-portal[data-portal-tema="escuro"] :is(
          .ern-v-root .ern-v-kicker,
          .ern-v-card-link,
          .ern-v-film-title>a,
          .ern-r-kicker,
          .ern-r-intro>p
        ) {
          color:#c5b595;
        }

        .ern-tema-portal[data-portal-tema="escuro"]
          .ern-v-card-copy>p {
          color:#bfc5cb!important;
        }

        .ern-tema-portal[data-portal-tema="escuro"] :is(
          .ern-r-nav [aria-current="page"],
          .ern-r-follow[aria-pressed="true"],
          .ern-r-post-actions button[aria-pressed="true"]
        ) {
          background:#25292e;
          color:#f0f1f2;
          border-color:#66717e;
        }

        .ern-tema-portal[data-portal-tema="escuro"] :is(
          .ern-r-nav a:hover,
          .ern-r-nav button:hover,
          .ern-r-post-actions button:hover
        ) {
          background:#25292e;
          color:#f0f1f2;
        }

        .ern-tema-portal[data-portal-tema="escuro"]
          .ern-v-film-scroll {
          scrollbar-color:#69717b #1a1d21;
        }

        .ern-tema-portal[data-portal-tema="escuro"] .ern-v-map {
          background:#171a20;
        }

        .ern-tema-portal[data-portal-tema="escuro"]
          .ern-v-map .leaflet-tile-pane {
          filter:invert(1) hue-rotate(180deg)
            saturate(.35) brightness(.88) contrast(1.12);
        }

        .ern-tema-portal[data-portal-tema="escuro"]
          .ern-v-root .leaflet-tooltip {
          background:#1a1d21;
          color:#f0f1f2;
          border-color:#66717e;
        }

        .ern-tema-portal[data-portal-tema="escuro"]
          .ern-v-root .leaflet-control-zoom a {
          background:#1a1d21;
          color:#f0f1f2;
          border-color:#454b53;
        }

        .ern-tema-portal[data-portal-tema="escuro"]
          .ern-navegacao-ilustrada {
          --ern-botao:#30363e;
          --ern-sobre-botao:#f0f1f2;
        }
      `}</style>
    </div>
  );
}