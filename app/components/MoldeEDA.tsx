// EDA_MOLDE_MARCA_V1: moldura padrão da Encantos da Amazônia para toda foto/vídeo
// publicado pelo Comando. Moldura em preto (Rio Negro) predominante, com veios
// marrons (Solimões) e verdes (floresta), e a marca no canto da imagem.
import type { ReactNode } from 'react';
import LogoERN from './LogoERN';
import './molde-eda.css';

export default function MoldeEDA({ children }: { children: ReactNode }) {
  return (
    <div className="eda-molde">
      <div className="eda-molde-midia">{children}</div>
      <div className="eda-molde-marca" aria-hidden="true">
        <LogoERN tamanho={26} />
        <span>Encantos da Amazônia</span>
      </div>
      <div className="eda-molde-faixa" aria-hidden="true" />
    </div>
  );
}
