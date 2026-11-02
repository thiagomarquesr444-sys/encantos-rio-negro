// ERN_ARCO_FLECHA_V1
// Ícone de reação da Encantos da Amazônia: um arco que puxa a corda e
// dispara a flecha quando fica ativo. Usa currentColor para combinar com o
// botão onde estiver.
export default function ArcoFlechaERN({ ativo = false, tamanho = 22 }: { ativo?: boolean; tamanho?: number }) {
  return (
    <svg className={`ern-arco${ativo ? ' ern-arco-ativo' : ''}`} width={tamanho} height={tamanho} viewBox="0 0 40 40" aria-hidden="true" fill="none" stroke="currentColor">
      <path d="M14 4 C 30 12, 30 28, 14 36" strokeWidth="3.2" strokeLinecap="round" />
      <g className="ern-arco-corda">
        <polyline points="14,4 10,20 14,36" strokeWidth="1.5" />
        <g className="ern-arco-flecha">
          <line x1="10" y1="20" x2="33" y2="20" strokeWidth="2.2" strokeLinecap="round" />
          <path d="M33 15.5 L39.5 20 L33 24.5 Z" fill="currentColor" stroke="none" />
          <path d="M10 20 l-4 -4 M10 20 l-4 4" strokeWidth="1.8" strokeLinecap="round" />
        </g>
      </g>
    </svg>
  );
}
