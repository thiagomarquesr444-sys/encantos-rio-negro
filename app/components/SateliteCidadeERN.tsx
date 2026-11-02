'use client';

// ERN_SATELITE_CIDADE_V1
// Vista de satélite da cidade com o Google Maps Embed (mesma chave do mapa
// operacional do painel da operadora). O visitante navega pela cidade
// inteira, alterna para pontos turísticos ou vista da rua, e volta ao mapa
// do Amazonas.

import { useState } from 'react';

export type VisaoSatelite = 'satelite' | 'pontos' | 'rua';

type Idioma = 'PT' | 'EN' | 'ES';

const textos: Record<Idioma, {
  voltar: string; satelite: string; pontos: string; rua: string;
  titulo: (nome: string) => string; abrir: string; consulta: (nome: string) => string;
}> = {
  PT: {
    voltar: 'Mapa do Amazonas', satelite: 'Satélite', pontos: 'Pontos turísticos', rua: 'Vista da rua',
    titulo: nome => `${nome} vista por satélite`, abrir: 'Abrir no Google Maps',
    consulta: nome => `pontos turísticos em ${nome}, Amazonas`,
  },
  EN: {
    voltar: 'Amazonas map', satelite: 'Satellite', pontos: 'Sights', rua: 'Street view',
    titulo: nome => `${nome} seen by satellite`, abrir: 'Open in Google Maps',
    consulta: nome => `tourist attractions in ${nome}, Amazonas`,
  },
  ES: {
    voltar: 'Mapa de Amazonas', satelite: 'Satélite', pontos: 'Puntos turísticos', rua: 'Vista de la calle',
    titulo: nome => `${nome} vista por satélite`, abrir: 'Abrir en Google Maps',
    consulta: nome => `puntos turísticos en ${nome}, Amazonas`,
  },
};

export function chaveEmbedGoogle(): string {
  return process.env.NEXT_PUBLIC_GOOGLE_MAPS_EMBED_KEY?.trim() || '';
}

export default function SateliteCidadeERN({
  nome, coords, zoom = 15, idioma, aoVoltar,
}: {
  nome: string;
  coords: [number, number];
  zoom?: number;
  idioma: Idioma;
  aoVoltar: () => void;
}) {
  const t = textos[idioma];
  const [visao, setVisao] = useState<VisaoSatelite>('satelite');
  const chave = chaveEmbedGoogle();
  const centro = `${coords[0]},${coords[1]}`;
  const parametros = new URLSearchParams({
    key: chave,
    language: idioma === 'EN' ? 'en' : idioma === 'ES' ? 'es' : 'pt-BR',
    region: 'BR',
  });
  let modo = 'view';
  if (visao === 'satelite') {
    parametros.set('center', centro);
    parametros.set('zoom', String(zoom));
    parametros.set('maptype', 'satellite');
  } else if (visao === 'pontos') {
    modo = 'search';
    parametros.set('q', t.consulta(nome));
    parametros.set('center', centro);
    parametros.set('zoom', String(Math.max(zoom, 14)));
  } else {
    modo = 'streetview';
    parametros.set('location', centro);
    parametros.set('radius', '1000');
  }
  const origem = `https://www.google.com/maps/embed/v1/${modo}?${parametros.toString()}`;
  const externo = `https://www.google.com/maps/search/?api=1&query=${encodeURIComponent(`${nome}, Amazonas, Brasil`)}`;

  return (
    <section className="ern-v-satelite" aria-label={t.titulo(nome)}>
      <iframe
        key={origem}
        title={t.titulo(nome)}
        src={origem}
        loading="lazy"
        allowFullScreen
        referrerPolicy="no-referrer-when-downgrade"
      />
      <div className="ern-v-satelite-barra">
        <button type="button" className="ern-v-satelite-voltar" onClick={aoVoltar}>← {t.voltar}</button>
        <div className="ern-v-satelite-visoes" role="group" aria-label={t.titulo(nome)}>
          {(['satelite', 'pontos', 'rua'] as VisaoSatelite[]).map(valor => (
            <button type="button" key={valor} aria-pressed={visao === valor} onClick={() => setVisao(valor)}>
              {valor === 'satelite' ? `🛰 ${t.satelite}` : valor === 'pontos' ? `📍 ${t.pontos}` : `🚶 ${t.rua}`}
            </button>
          ))}
        </div>
        <a className="ern-v-satelite-externo" href={externo} target="_blank" rel="noopener noreferrer">{t.abrir} ↗</a>
      </div>
    </section>
  );
}
