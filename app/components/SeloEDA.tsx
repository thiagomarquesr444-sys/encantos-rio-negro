// EDA_SELO_JANELAS_V1: selo de autenticidade (monograma E + Encantos da
// Amazônia) no topo das janelas do portal público — mesmo padrão do aviso
// de copiar/colar e das caixas de confirmação da operadora.

export default function SeloEDA({ rotulo = 'Encantos da Amazônia', claro = false }: { rotulo?: string; claro?: boolean }) {
  return (
    <span className={`eda-selo ${claro ? 'eda-selo-claro' : ''}`}>
      <span className="eda-selo-e" aria-hidden="true">E</span>
      <span className="eda-selo-t">{rotulo}</span>
      <style>{`
        .eda-selo{display:inline-flex;align-items:center;gap:9px}
        .eda-selo-e{display:grid;place-items:center;width:28px;height:28px;border-radius:50%;flex:none;
          background:linear-gradient(135deg,#f7d595,#e3a144 55%,#b5762a);color:#07110e;font-weight:800;
          font-family:var(--font-fraunces),Georgia,serif;font-size:15px;box-shadow:0 4px 14px rgba(227,161,68,.35),inset 0 1px 0 rgba(255,255,255,.5)}
        .eda-selo-t{font-size:10.5px;letter-spacing:.14em;text-transform:uppercase;color:#e3a144;font-weight:700}
        .eda-selo-claro .eda-selo-t{color:#8a4b12}
      `}</style>
    </span>
  );
}
