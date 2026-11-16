// EDA_SELO_AI_V1: selo "AI" que acompanha a marca em toda a plataforma.
// Bebas Neue em degradê dourado → laranja Solimões, com borda fina dourada.
// Puro CSS/texto: não pesa na conexão e escala com o tamanho da fonte do nome.
export default function SeloAIEDA({ className = '' }: { className?: string }) {
  return (
    <span
      className={`inline-flex shrink-0 items-center rounded-[6px] border border-[#F4C77E]/50 bg-gradient-to-b from-[#F4C77E]/[0.16] to-[#D2873F]/[0.06] px-[0.38em] pb-[0.06em] pt-[0.14em] align-middle font-[family-name:var(--font-bebas)] text-[0.82em] font-normal leading-none tracking-[0.12em] shadow-[0_0_14px_rgb(244_199_126/0.18),inset_0_1px_0_rgb(255_255_255/0.12)] ${className}`}
    >
      <span className="bg-gradient-to-b from-[#FFF1CF] via-[#F4C77E] to-[#D2873F] bg-clip-text text-transparent">AI</span>
    </span>
  );
}
