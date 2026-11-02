'use client';

import { useEffect, useMemo, useState } from 'react';
import Link from 'next/link';
import PublicHeader from '@/app/components/PublicHeader';
import { useLanguage } from '@/app/components/LanguageProvider';
import { supabase } from '@/lib/supabase';

// ERN_PRECOS_PUBLICOS_V1
// Página pública de planos e preços. Lê o catálogo pela função
// get_catalogo_planos (executável por visitantes), sem exigir login.

type Ciclo = 'mensal' | 'trimestral' | 'anual';

type LinhaCatalogo = {
  plano_id: string;
  codigo: string;
  nome: string;
  descricao: string | null;
  limite_usuarios: number | null;
  limite_clientes: number | null;
  limite_reservas_mes: number | null;
  limite_passeios: number | null;
  recursos: Record<string, boolean> | null;
  ciclo_cobranca: string | null;
  valor: number | string | null;
  moeda: string | null;
};

type Plano = {
  codigo: string;
  nome: string;
  descricao: string | null;
  limites: { usuarios: number | null; clientes: number | null; reservas: number | null; passeios: number | null };
  recursos: Record<string, boolean>;
  precos: Partial<Record<Ciclo, number>>;
};

const ORDEM = ['free', 'pro', 'premium'];
const EM_IMPLANTACAO = new Set(['concierge_ia', 'whatsapp']);

const textos = {
  PT: {
    eyebrow: 'Planos e preços',
    titulo: 'Comece grátis. Cresça quando a operação pedir.',
    descricao: 'Gestão de reservas, vouchers e financeiro feita para operadoras, pousadas, guias e barqueiros do Rio Negro.',
    ciclos: { mensal: 'Mensal', trimestral: 'Trimestral', anual: 'Anual' },
    periodo: { mensal: '/mês', trimestral: '/trimestre', anual: '/ano' },
    meses: { mensal: 1, trimestral: 3, anual: 12 },
    equivale: 'equivale a',
    porMes: 'por mês',
    gratis: 'para sempre',
    recomendado: 'Recomendado',
    usuarios: 'usuários da equipe', clientes: 'clientes', reservas: 'reservas por mês', passeios: 'passeios no catálogo', ilimitado: 'Sem limite de',
    recursos: { rede_basica: 'Perfil na Rede ERN', vouchers: 'Vouchers em PDF', financeiro: 'Financeiro', relatorios: 'Relatórios', destaque_rede: 'Destaque na Rede', concierge_ia: 'Concierge com IA', whatsapp: 'Atendimento por WhatsApp' } as Record<string, string>,
    implantacao: 'em implantação',
    comecar: 'Criar conta grátis',
    assinar: 'Começar com este plano',
    carregando: 'Carregando planos...',
    erro: 'Não foi possível carregar os planos agora.',
    tentar: 'Tentar novamente',
    pagamento: 'Os planos pagos são cobrados pelo Asaas. Você cancela pelo painel e continua usando até o fim do período pago.',
    conhecer: 'Conhecer a ERN para operadores',
  },
  EN: {
    eyebrow: 'Plans and pricing',
    titulo: 'Start free. Grow when your operation needs it.',
    descricao: 'Booking, voucher and finance management built for Rio Negro tour operators, lodges, guides and boat operators.',
    ciclos: { mensal: 'Monthly', trimestral: 'Quarterly', anual: 'Yearly' },
    periodo: { mensal: '/month', trimestral: '/quarter', anual: '/year' },
    meses: { mensal: 1, trimestral: 3, anual: 12 },
    equivale: 'equals',
    porMes: 'per month',
    gratis: 'forever',
    recomendado: 'Recommended',
    usuarios: 'team users', clientes: 'clients', reservas: 'bookings per month', passeios: 'tours in catalog', ilimitado: 'Unlimited',
    recursos: { rede_basica: 'ERN Network profile', vouchers: 'PDF vouchers', financeiro: 'Finance', relatorios: 'Reports', destaque_rede: 'Featured on the Network', concierge_ia: 'AI Concierge', whatsapp: 'WhatsApp support' } as Record<string, string>,
    implantacao: 'coming soon',
    comecar: 'Create free account',
    assinar: 'Start with this plan',
    carregando: 'Loading plans...',
    erro: 'Plans could not be loaded right now.',
    tentar: 'Try again',
    pagamento: 'Paid plans are billed through Asaas. Cancel from your dashboard and keep using it until the paid period ends.',
    conhecer: 'ERN for operators',
  },
  ES: {
    eyebrow: 'Planes y precios',
    titulo: 'Empieza gratis. Crece cuando tu operación lo pida.',
    descricao: 'Gestión de reservas, vouchers y finanzas para operadoras, posadas, guías y barqueros del Río Negro.',
    ciclos: { mensal: 'Mensual', trimestral: 'Trimestral', anual: 'Anual' },
    periodo: { mensal: '/mes', trimestral: '/trimestre', anual: '/año' },
    meses: { mensal: 1, trimestral: 3, anual: 12 },
    equivale: 'equivale a',
    porMes: 'por mes',
    gratis: 'para siempre',
    recomendado: 'Recomendado',
    usuarios: 'usuarios del equipo', clientes: 'clientes', reservas: 'reservas por mes', passeios: 'paseos en el catálogo', ilimitado: 'Sin límite de',
    recursos: { rede_basica: 'Perfil en la Red ERN', vouchers: 'Vouchers en PDF', financeiro: 'Finanzas', relatorios: 'Informes', destaque_rede: 'Destacado en la Red', concierge_ia: 'Concierge con IA', whatsapp: 'Atención por WhatsApp' } as Record<string, string>,
    implantacao: 'en implementación',
    comecar: 'Crear cuenta gratis',
    assinar: 'Empezar con este plan',
    carregando: 'Cargando planes...',
    erro: 'No se pudieron cargar los planes ahora.',
    tentar: 'Intentar de nuevo',
    pagamento: 'Los planes pagos se cobran por Asaas. Cancelas desde el panel y sigues usando hasta el fin del período pagado.',
    conhecer: 'ERN para operadores',
  },
};

const FOCO = 'focus-visible:outline-2 focus-visible:outline-offset-4 focus-visible:outline-[#F4C77E]';

function moeda(valor: number, idioma: string) {
  return new Intl.NumberFormat(idioma === 'EN' ? 'en-US' : idioma === 'ES' ? 'es-ES' : 'pt-BR', {
    style: 'currency',
    currency: 'BRL',
    maximumFractionDigits: valor % 1 === 0 ? 0 : 2,
  }).format(valor);
}

function agrupar(linhas: LinhaCatalogo[]): Plano[] {
  const mapa = new Map<string, Plano>();
  for (const l of linhas) {
    const plano = mapa.get(l.codigo) ?? {
      codigo: l.codigo,
      nome: l.nome,
      descricao: l.descricao,
      limites: { usuarios: l.limite_usuarios, clientes: l.limite_clientes, reservas: l.limite_reservas_mes, passeios: l.limite_passeios },
      recursos: l.recursos ?? {},
      precos: {},
    };
    const ciclo = l.ciclo_cobranca as Ciclo | null;
    if (ciclo && l.valor !== null) plano.precos[ciclo] = Number(l.valor);
    mapa.set(l.codigo, plano);
  }
  return [...mapa.values()].sort((a, b) => ORDEM.indexOf(a.codigo) - ORDEM.indexOf(b.codigo));
}

export default function PrecosPage() {
  const { idioma } = useLanguage();
  const t = textos[idioma];
  const [ciclo, setCiclo] = useState<Ciclo>('mensal');
  const [linhas, setLinhas] = useState<LinhaCatalogo[] | null>(null);
  const [erro, setErro] = useState(false);
  const [tentativa, setTentativa] = useState(0);

  useEffect(() => {
    let ativo = true;
    setErro(false);
    supabase
      .rpc('get_catalogo_planos')
      .then(({ data, error }) => {
        if (!ativo) return;
        if (error) setErro(true);
        else setLinhas((data ?? []) as LinhaCatalogo[]);
      });
    return () => { ativo = false; };
  }, [tentativa]);

  const planos = useMemo(() => (linhas ? agrupar(linhas) : []), [linhas]);

  function limite(valor: number | null, rotulo: string) {
    return valor === null ? `${t.ilimitado} ${rotulo}` : `${valor.toLocaleString('pt-BR')} ${rotulo}`;
  }

  return (
    <div className="min-h-screen bg-[#07110E] text-[#EDEDE3]" style={{ fontFamily: 'var(--font-work-sans), sans-serif' }}>
      <PublicHeader />
      <main className="mx-auto max-w-[1180px] px-5 pb-24 pt-32 md:px-8 md:pt-40">
        <div className="mx-auto max-w-[720px] text-center">
          <p className="text-xs font-semibold uppercase tracking-[0.2em] text-[#F4C77E]">{t.eyebrow}</p>
          <h1 className="mt-5 text-[clamp(2.25rem,5vw,3.75rem)] leading-[1.06] tracking-[-0.035em] text-[#F0F0E8]" style={{ fontFamily: 'var(--font-fraunces), serif' }}>
            {t.titulo}
          </h1>
          <p className="mt-6 text-base leading-7 text-[#B8C9BF] md:text-lg md:leading-8">{t.descricao}</p>
        </div>

        <div role="group" aria-label={t.eyebrow} className="mx-auto mt-10 flex w-fit gap-1 rounded-full border border-[#355043] bg-[#0A1713] p-1">
          {(['mensal', 'trimestral', 'anual'] as Ciclo[]).map((c) => (
            <button
              key={c}
              type="button"
              aria-pressed={c === ciclo}
              onClick={() => setCiclo(c)}
              className={`min-h-[44px] rounded-full px-5 text-sm font-semibold transition ${FOCO} ${c === ciclo ? 'bg-[#E3A144] text-[#07110E]' : 'text-[#EDEDE3] hover:text-[#F4C77E]'}`}
            >
              {t.ciclos[c]}
            </button>
          ))}
        </div>

        {erro && (
          <div role="alert" className="mt-12 text-center text-[#B8C9BF]">
            <p>{t.erro}</p>
            <button type="button" onClick={() => setTentativa((n) => n + 1)} className={`mt-4 min-h-[44px] font-semibold text-[#F4C77E] underline ${FOCO}`}>{t.tentar}</button>
          </div>
        )}

        {!erro && !linhas && <p role="status" className="mt-12 text-center text-[#B8C9BF]">{t.carregando}</p>}

        {planos.length > 0 && (
          <div className="mt-12 grid gap-6 lg:grid-cols-3">
            {planos.map((plano) => {
              const destaque = plano.codigo === 'pro';
              const preco = plano.precos[ciclo];
              const gratis = Object.keys(plano.precos).length === 0;
              return (
                <article
                  key={plano.codigo}
                  className={`flex flex-col gap-5 rounded-[18px] border p-7 ${destaque ? 'border-[#E3A144] bg-[#10231B]' : 'border-[#355043] bg-[#0A1713]'}`}
                >
                  <div className="flex items-center justify-between gap-3">
                    <h2 className="text-[27px] font-medium text-[#F0F0E8]" style={{ fontFamily: 'var(--font-fraunces), serif' }}>{plano.nome}</h2>
                    {destaque && <span className="rounded-full bg-[#F4C77E] px-3 py-1 text-xs font-semibold uppercase tracking-[0.08em] text-[#07110E]">{t.recomendado}</span>}
                  </div>
                  {plano.descricao && <p className="text-sm leading-6 text-[#B8C9BF]">{plano.descricao}</p>}
                  <div>
                    <p>
                      <span className="text-5xl text-[#F0F0E8]" style={{ fontFamily: 'var(--font-fraunces), serif' }}>
                        {gratis ? moeda(0, idioma) : preco !== undefined ? moeda(preco, idioma) : '—'}
                      </span>
                      {!gratis && preco !== undefined && <span className="text-sm text-[#B8C9BF]"> {t.periodo[ciclo]}</span>}
                    </p>
                    <p className="mt-1 min-h-[20px] text-sm text-[#B8C9BF]">
                      {gratis ? t.gratis : preco !== undefined && ciclo !== 'mensal' ? `${t.equivale} ${moeda(preco / t.meses[ciclo], idioma)} ${t.porMes}` : ''}
                    </p>
                  </div>
                  <ul className="flex flex-col gap-2.5 border-t border-[#355043] pt-5 text-sm leading-6 text-[#EDEDE3]">
                    <li>{limite(plano.limites.usuarios, t.usuarios)}</li>
                    <li>{limite(plano.limites.clientes, t.clientes)}</li>
                    <li>{limite(plano.limites.reservas, t.reservas)}</li>
                    <li>{limite(plano.limites.passeios, t.passeios)}</li>
                    {Object.entries(plano.recursos).filter(([, ativo]) => ativo).map(([chave]) => (
                      <li key={chave} className="flex gap-2">
                        <span aria-hidden="true" className="text-[#F4C77E]">✓</span>
                        <span>
                          {t.recursos[chave] ?? chave}
                          {EM_IMPLANTACAO.has(chave) && <span className="ml-2 rounded-full border border-[#355043] px-2 py-0.5 text-xs text-[#B8C9BF]">{t.implantacao}</span>}
                        </span>
                      </li>
                    ))}
                  </ul>
                  <Link
                    href="/login?acesso=operadora"
                    className={`mt-auto inline-flex min-h-[48px] items-center justify-center rounded-xl px-5 text-sm font-semibold transition ${FOCO} ${destaque ? 'bg-[#E3A144] text-[#07110E] hover:bg-[#F4C77E]' : 'border border-[#E3A144]/60 text-[#F4C77E] hover:bg-[#E3A144]/10'}`}
                  >
                    {gratis ? t.comecar : t.assinar}
                  </Link>
                </article>
              );
            })}
          </div>
        )}

        <p className="mx-auto mt-10 max-w-[640px] text-center text-sm leading-6 text-[#B8C9BF]">{t.pagamento}</p>
        <div className="mt-6 flex justify-center">
          <Link href="/operadores" className={`inline-flex min-h-[44px] items-center gap-2 text-sm font-semibold text-[#F4C77E] hover:underline ${FOCO}`}>
            {t.conhecer} <span aria-hidden="true">→</span>
          </Link>
        </div>
      </main>
    </div>
  );
}
