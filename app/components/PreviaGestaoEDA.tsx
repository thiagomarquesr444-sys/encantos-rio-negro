'use client';

import { useLanguage } from '@/app/components/LanguageProvider';

// EDA_PREVIA_GESTAO_V1
// Prévia ilustrativa da gestão EDA desenhada em código (sem capturas de tela),
// para não ficar desatualizada quando o painel evoluir. Dados fictícios.

const textos = {
  PT: {
    rotulo: 'Prévia ilustrativa da gestão EDA com dados fictícios',
    janela: 'Gestão EDA',
    ola: 'Bom dia, operadora',
    sub: 'Resumo da semana',
    kpis: [['Reservas', '18', '+12%'], ['Receita', 'R$ 42,6 mil', '+8%'], ['Ocupação', '76%', '+5%']],
    grafico: 'Reservas por mês',
    meses: ['Jun', 'Jul', 'Ago', 'Set', 'Out', 'Nov'],
    proximas: 'Próximas operações',
    ops: [['Pesca esportiva · Rio Aracá', 'Sáb, 08:00', 'Confirmada'], ['Arquipélago de Mariuá', 'Dom, 07:30', 'Guia a confirmar'], ['Comunidade de Piloto', 'Seg, 09:00', 'Confirmada']],
    ia: 'Comando EDA: 2 reservas aguardam pagamento.',
  },
  EN: {
    rotulo: 'Illustrative preview of EDA management with sample data',
    janela: 'EDA Management',
    ola: 'Good morning, operator',
    sub: 'Weekly summary',
    kpis: [['Bookings', '18', '+12%'], ['Revenue', 'R$ 42.6k', '+8%'], ['Occupancy', '76%', '+5%']],
    grafico: 'Bookings per month',
    meses: ['Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov'],
    proximas: 'Upcoming operations',
    ops: [['Sport fishing · Aracá River', 'Sat, 08:00', 'Confirmed'], ['Mariuá Archipelago', 'Sun, 07:30', 'Guide pending'], ['Piloto Community', 'Mon, 09:00', 'Confirmed']],
    ia: 'EDA Command: 2 bookings awaiting payment.',
  },
  ES: {
    rotulo: 'Vista ilustrativa de la gestión EDA con datos ficticios',
    janela: 'Gestión EDA',
    ola: 'Buenos días, operador',
    sub: 'Resumen semanal',
    kpis: [['Reservas', '18', '+12%'], ['Ingresos', 'R$ 42,6 mil', '+8%'], ['Ocupación', '76%', '+5%']],
    grafico: 'Reservas por mes',
    meses: ['Jun', 'Jul', 'Ago', 'Sep', 'Oct', 'Nov'],
    proximas: 'Próximas operaciones',
    ops: [['Pesca deportiva · Río Aracá', 'Sáb, 08:00', 'Confirmada'], ['Archipiélago de Mariuá', 'Dom, 07:30', 'Guía por confirmar'], ['Comunidad de Piloto', 'Lun, 09:00', 'Confirmada']],
    ia: 'Comando EDA: 2 reservas esperan pago.',
  },
} as const;

const barras = [38, 52, 46, 64, 78, 92];

export default function PreviaGestaoEDA() {
  const { idioma } = useLanguage();
  const t = textos[idioma as keyof typeof textos] ?? textos.PT;

  return (
    <figure
      role="img"
      aria-label={t.rotulo}
      className="relative m-0 select-none"
      style={{ fontFamily: 'var(--font-geist), var(--font-work-sans), sans-serif' }}
    >
      <div aria-hidden="true" className="pointer-events-none absolute -inset-6 rounded-[40px] bg-[radial-gradient(ellipse_at_70%_20%,rgb(227_161_68/22%),transparent_60%)] blur-2xl" />

      <div aria-hidden="true" className="relative overflow-hidden rounded-[22px] border border-white/10 bg-[#0B1A15] shadow-[0_30px_80px_rgb(0_0_0/45%),inset_0_1px_0_rgb(255_255_255/6%)]">
        <div className="flex items-center gap-2 border-b border-white/[0.07] px-4 py-3">
          <span className="h-2.5 w-2.5 rounded-full bg-[#E3A144]/80" />
          <span className="h-2.5 w-2.5 rounded-full bg-white/15" />
          <span className="h-2.5 w-2.5 rounded-full bg-white/15" />
          <span className="ml-3 text-xs font-medium text-[#B8C9BF]">{t.janela}</span>
        </div>

        <div className="space-y-4 p-4 sm:p-5">
          <div>
            <p className="text-sm font-semibold text-[#F5F3EA]">{t.ola}</p>
            <p className="text-[11px] text-[#8FA79A]">{t.sub}</p>
          </div>

          <div className="grid grid-cols-3 gap-2.5">
            {t.kpis.map(([nome, valor, variacao]) => (
              <div key={nome} className="rounded-xl border border-white/[0.07] bg-white/[0.03] p-3">
                <p className="text-[10px] uppercase tracking-[0.12em] text-[#8FA79A]">{nome}</p>
                <p className="mt-1 truncate text-base font-semibold text-[#F5F3EA] sm:text-lg">{valor}</p>
                <p className="text-[10px] font-semibold text-[#47B087]">{variacao}</p>
              </div>
            ))}
          </div>

          <div className="grid gap-2.5 sm:grid-cols-[1.1fr_1fr]">
            <div className="rounded-xl border border-white/[0.07] bg-white/[0.03] p-3">
              <p className="text-[11px] font-semibold text-[#EDEDE3]">{t.grafico}</p>
              <div className="mt-3 flex h-24 items-end gap-2">
                {barras.map((altura, i) => (
                  <div key={i} className="flex flex-1 flex-col items-center gap-1">
                    <div
                      className={`eda-barra w-full rounded-t-md ${i === barras.length - 1 ? 'bg-gradient-to-t from-[#E3A144] to-[#F7D595]' : 'bg-[#2C4A3D]'}`}
                      style={{ height: `${altura}%`, animationDelay: `${i * 70}ms` }}
                    />
                    <span className="text-[9px] text-[#8FA79A]">{t.meses[i]}</span>
                  </div>
                ))}
              </div>
            </div>

            <div className="rounded-xl border border-white/[0.07] bg-white/[0.03] p-3">
              <p className="text-[11px] font-semibold text-[#EDEDE3]">{t.proximas}</p>
              <ul className="mt-2 space-y-2">
                {t.ops.map(([nome, quando, status], i) => (
                  <li key={nome} className="flex items-center gap-2">
                    <span className={`h-1.5 w-1.5 shrink-0 rounded-full ${i === 1 ? 'bg-[#E3A144]' : 'bg-[#47B087]'}`} />
                    <span className="min-w-0 flex-1">
                      <span className="block truncate text-[11px] text-[#F5F3EA]">{nome}</span>
                      <span className="block text-[9px] text-[#8FA79A]">{quando} · {status}</span>
                    </span>
                  </li>
                ))}
              </ul>
            </div>
          </div>

          <div className="flex items-center gap-2 rounded-xl border border-[#E3A144]/25 bg-[#E3A144]/[0.08] px-3 py-2.5">
            <span className="grid h-6 w-6 shrink-0 place-items-center rounded-full bg-[#07110E] text-[11px] text-[#F4C77E]">✦</span>
            <p className="text-[11px] text-[#F4C77E]">{t.ia}</p>
          </div>
        </div>
      </div>

      <style jsx>{`
        .eda-barra { animation: edaBarra 700ms cubic-bezier(.2,.8,.2,1) both; transform-origin: bottom; }
        @keyframes edaBarra { from { transform: scaleY(0.15); opacity: .4; } to { transform: scaleY(1); opacity: 1; } }
        @media (prefers-reduced-motion: reduce) { .eda-barra { animation: none; } }
      `}</style>
    </figure>
  );
}
