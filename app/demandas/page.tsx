'use client';
import './demandas-premium.css';
import './demandas-eda.css';

import {
  useEffect,
  useRef,
  useState,
  type FormEvent,
} from 'react';
import Link from 'next/link';
import CartaoMagneticoEDA from '@/app/components/CartaoMagneticoEDA';
import DemandasInsightsPremium from '@/app/components/DemandasInsightsPremium';
import { SeletorPeriodoMensalERN, SeloExpiracaoERN } from '@/app/components/PeriodoMensalERN';
import { HISTORICO_ERN, limitesMesERN, mesAtualERN, mesValidoERN, type PeriodoMensalERN } from '@/lib/periodoMensalERN';
import { Suspense } from 'react';
import { useSearchParams } from 'next/navigation';

import { supabase } from '@/lib/supabase';
import {
  BuscaEDA,
  CabecalhoEDA,
  ChipsEDA,
  DadoEDA,
  PaginaEDA,
  PainelLateralEDA,
  PillEDA,
  VazioEDA,
  type TomEDA,
} from '@/app/components/PadraoPaginaEDA';

import {
  CATEGORIAS_DEMANDA,
  PUBLICOS_ALVO,
  STATUS_DEMANDA,
  TIPOS_COMBUSTIVEL,
  ehCategoriaDemanda,
  ehStatusDemanda,
  listarDemandas,
  mensagemErroDemandas,
  obterContextoDemandas,
  type CategoriaDemanda,
  type ContextoDemandas,
  type Demanda,
  type PaginaDemandas,
  type StatusDemanda,
} from '@/lib/demandas';

type Consulta = {
  data_inicio_de?: string;
  data_inicio_ate?: string;
  busca: string;
  categoria: CategoriaDemanda | '';
  status: StatusDemanda | '';
  pagina: number;
};

type Estado =
  | { tipo: 'carregando' }
  | {
      tipo: 'erro';
      mensagem: string;
    }
  | {
      tipo: 'pronto';
      contexto: ContextoDemandas;
      resultado: PaginaDemandas;
    };

const CONSULTA_INICIAL: Consulta = {
  busca: '',
  categoria: '',
  status: '',
  pagina: 0,
};

// EDA_DEMANDA_PASSEIO_V2: cada demanda mostra o passeio que prepara e como está a saúde do grupo.
type VinculoDemandaEDA = { passeio: string | null; data_inicio: string | null; data_fim: string | null; horario: string | null; saude: 'sem_saida' | 'preparada' | 'pendente' | 'ok'; alertas: number };

function PasseioDaDemanda({ v }: { v?: VinculoDemandaEDA }) {
  if (!v) return null;
  if (v.saude === 'sem_saida') return <span className="eda-dem-passeio"><PillEDA tom="er">Sem passeio vinculado</PillEDA></span>;
  const dia = (d: string | null) => (d ? d.split('-').reverse().slice(0, 2).join('/') : '');
  const periodo = v.data_inicio ? `${dia(v.data_inicio)}${v.data_fim && v.data_fim !== v.data_inicio ? ` a ${dia(v.data_fim)}` : ''}` : '';
  return (
    <span className="eda-dem-passeio">
      <b>{v.passeio ?? 'Passeio'}</b>
      <small>{periodo}{v.horario ? ` · ${v.horario.slice(0, 5)}` : ''}</small>
      {v.saude === 'preparada' && <PillEDA tom="ok">Saúde preparada</PillEDA>}
      {v.saude === 'pendente' && <PillEDA tom="at">{v.alertas} alerta(s) de saúde para preparar</PillEDA>}
    </span>
  );
}

const TOM_STATUS: Record<StatusDemanda, TomEDA> = {
  rascunho: 'nt',
  aberta: 'at',
  encerrada: 'ok',
  cancelada: 'er',
};

const formatadorQuantidade =
  new Intl.NumberFormat('pt-BR', {
    maximumFractionDigits: 2,
  });

function formatarData(
  data: string | null,
): string {
  if (!data) {
    return 'Não informado';
  }

  const partes = data.split('-');

  if (partes.length !== 3) {
    return 'Data indisponível';
  }

  return `${partes[2]}/${partes[1]}/${partes[0]}`;
}

function detalheEstimativa(
  demanda: Demanda,
): string | null {
  if (
    demanda.metodo_estimativa ===
      'pessoa_dia' &&
    demanda.pessoas_estimadas !==
      null &&
    demanda.dias_estimados !==
      null &&
    demanda.consumo_pessoa_dia !==
      null
  ) {
    const publico =
      demanda.publico_alvo
        ? PUBLICOS_ALVO[
            demanda.publico_alvo
          ]
        : 'Público não informado';

    return `${publico} • ${demanda.pessoas_estimadas} pessoas × ${demanda.dias_estimados} dias × ${formatadorQuantidade.format(
      demanda.consumo_pessoa_dia,
    )} ${demanda.unidade}/pessoa/dia`;
  }

  if (
    demanda.metodo_estimativa ===
      'combustivel_hora' &&
    demanda.tipo_combustivel &&
    demanda.dias_estimados !==
      null &&
    demanda.horas_motor_dia !==
      null &&
    demanda.consumo_litros_hora !==
      null
  ) {
    return `${
      TIPOS_COMBUSTIVEL[
        demanda.tipo_combustivel
      ]
    } • ${demanda.dias_estimados} dias × ${formatadorQuantidade.format(
      demanda.horas_motor_dia,
    )} h/dia × ${formatadorQuantidade.format(
      demanda.consumo_litros_hora,
    )} L/h + ${formatadorQuantidade.format(
      demanda.margem_percentual,
    )}% de margem`;
  }

  return null;
}

// ERN_DEMANDAS_ACOLHEDOR_V1: ícone por categoria, descrição legível e linha do tempo.
const ICONES_CATEGORIA: Record<CategoriaDemanda, string> = {
  alimentacao: 'M7 3v8a2 2 0 0 0 2 2v8M5 3v5M9 3v5M17 3c-1.7 1.2-2.5 3.3-2.5 6s1 3.5 2.5 4v8',
  bebidas: 'M7 3h10l-1 7a4 4 0 0 1-8 0L7 3zM12 14v7M8.5 21h7',
  combustivel: 'M4 21V5a2 2 0 0 1 2-2h6a2 2 0 0 1 2 2v16M3 21h12M6.5 8h5M14 10h2a2 2 0 0 1 2 2v4a1.5 1.5 0 0 0 3 0V8l-3-3',
  hospedagem: 'M3 20v-9l9-6 9 6v9M9 20v-6h6v6',
  transporte_fluvial: 'M3 16l2 4h14l2-4H3zM6 16V9h9l3 7M10 9V5h3',
  guiamento: 'M12 21s-6-5.4-6-11a6 6 0 0 1 12 0c0 5.6-6 11-6 11zM12 12.5a2.5 2.5 0 1 0 0-5 2.5 2.5 0 0 0 0 5z',
  passeios: 'M3 19l5-8 4 5 3-4 6 7H3zM16 7.5a2 2 0 1 0 0-4 2 2 0 0 0 0 4z',
  outros: 'M4 7l8-4 8 4-8 4-8-4zM4 12l8 4 8-4M4 17l8 4 8-4',
};

function IconeCategoria({ categoria, grande = false }: { categoria: CategoriaDemanda; grande?: boolean }) {
  return (
    <span className={`eda-dem-icone eda-dem-cat-${categoria}${grande ? ' eda-dem-icone-g' : ''}`} aria-hidden="true">
      <svg width={grande ? 22 : 19} height={grande ? 22 : 19} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.7" strokeLinecap="round" strokeLinejoin="round">
        <path d={ICONES_CATEGORIA[categoria] ?? ICONES_CATEGORIA.outros} />
      </svg>
    </span>
  );
}

function IconeLocal() {
  return (
    <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" aria-hidden="true">
      <path d="M12 21s-6-5.4-6-11a6 6 0 0 1 12 0c0 5.6-6 11-6 11z" /><circle cx="12" cy="10" r="2" />
    </svg>
  );
}

// Descrição em parágrafos (respeita as quebras de linha digitadas).
function DescricaoDemanda({ texto }: { texto: string | null }) {
  const paragrafos = (texto ?? '')
    .split(/\n\s*\n|\n/)
    .map((p) => p.replace(/\s+/g, ' ').trim())
    .filter(Boolean);
  if (paragrafos.length === 0) {
    return <p className="eda-dem-descricao-vazia">Sem descrição adicional.</p>;
  }
  return (
    <div className="eda-dem-descricao">
      {paragrafos.map((p, i) => <p key={i}>{p}</p>)}
    </div>
  );
}


function hojeISO(): string {
  const d = new Date();
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`;
}

function diasEntre(de: string, ate: string): number {
  const a = Date.parse(`${de}T00:00:00Z`);
  const b = Date.parse(`${ate}T00:00:00Z`);
  if (Number.isNaN(a) || Number.isNaN(b)) return NaN;
  return Math.round((b - a) / 86400000);
}

function expiraEmBreve(demanda: Demanda, hoje: string): boolean {
  if (demanda.status !== 'aberta' && demanda.status !== 'rascunho') return false;
  if (!demanda.data_fim) return false;
  const dias = diasEntre(hoje, demanda.data_fim);
  return dias >= 0 && dias <= 7;
}

function LinhaTempo({ demanda }: { demanda: Demanda }) {
  const { data_inicio: inicio, data_fim: fim } = demanda;
  if (!inicio && !fim) {
    return <p className="eda-pg-texto-mut">Período ainda não informado.</p>;
  }
  const hoje = hojeISO();
  let progresso = 0;
  let nota = '';
  if (inicio && fim) {
    const total = Math.max(diasEntre(inicio, fim), 0);
    const decorrido = diasEntre(inicio, hoje);
    const restante = diasEntre(hoje, fim);
    progresso = total === 0 ? (decorrido >= 0 ? 100 : 0) : Math.min(Math.max((decorrido / total) * 100, 0), 100);
    const duracao = total + 1;
    if (decorrido < 0) nota = `Começa em ${-decorrido} ${-decorrido === 1 ? 'dia' : 'dias'} · ${duracao} ${duracao === 1 ? 'dia' : 'dias'} de operação`;
    else if (restante >= 0) nota = restante === 0 ? 'Último dia da operação' : `Em andamento · faltam ${restante} ${restante === 1 ? 'dia' : 'dias'}`;
    else nota = `Período encerrado há ${-restante} ${-restante === 1 ? 'dia' : 'dias'}`;
  }
  return (
    <>
      <div className="eda-dem-tempo">
        <div><small>Início</small><b>{formatarData(inicio)}</b></div>
        <div className="eda-dem-trilho" role="presentation"><i style={{ width: `${progresso}%` }} /></div>
        <div><small>Fim</small><b>{formatarData(fim)}</b></div>
      </div>
      {nota && <p className="eda-dem-tempo-nota">{nota}</p>}
    </>
  );
}

// ERN_PERIODO_MENSAL_V1: demandas em andamento mostram a data de expiração (fim).
function expiracaoDemanda(demanda: Demanda) {
  if (demanda.status !== 'aberta' && demanda.status !== 'rascunho') return null;
  if (!demanda.data_fim) return null;
  return <SeloExpiracaoERN data={demanda.data_fim} rotulo="Expira" />;
}

// ERN_DEMANDAS_FILTRO_DASHBOARD
function consultaDaURL(parametros: string): Consulta {
  const url = new URLSearchParams(parametros);
  const status = url.get('status') ?? '';
  const inicio = url.get('inicio') || undefined;
  const fim = url.get('fim') || undefined;
  const mes = url.get('mes');

  // ERN_PERIODO_MENSAL_V1: sem período na URL, abre no mês atual. Atalhos do
  // painel (status/início/fim) mantêm o comportamento anterior.
  let periodo: { data_inicio_de?: string; data_inicio_ate?: string } = {
    data_inicio_de: inicio,
    data_inicio_ate: fim,
  };
  if (!inicio && !fim && mes !== HISTORICO_ERN && (mesValidoERN(mes) || !status)) {
    const { inicio: i, fim: f } = limitesMesERN(mesValidoERN(mes) ? mes : mesAtualERN());
    periodo = { data_inicio_de: i, data_inicio_ate: f };
  }

  return {
    ...CONSULTA_INICIAL,
    status: ehStatusDemanda(status) ? status : '',
    ...periodo,
  };
}

export default function DemandasPage() {
  return (
    <Suspense fallback={<p role="status" className="p-6">Carregando demandas…</p>}>
      <DemandasComParametros />
    </Suspense>
  );
}

function DemandasComParametros() {
  const parametros = useSearchParams().toString();

  return (
    <DemandasConteudo
      key={parametros}
      parametros={parametros}
    />
  );
}

function DemandasConteudo({ parametros }: { parametros: string }) {
  const [
    rascunhoBusca,
    setRascunhoBusca,
  ] = useState('');

  const [
    consulta,
    setConsulta,
  ] = useState<Consulta>(() => consultaDaURL(parametros));

  const [estado, setEstado] =
    useState<Estado>({
      tipo: 'carregando',
    });

  const [revisao, setRevisao] =
    useState(0);

  const requisicaoAtual =
    useRef<AbortController | null>(
      null,
    );

  useEffect(() => {
    const { data } =
      supabase.auth.onAuthStateChange(
        (evento) => {
          if (
            evento ===
              'SIGNED_OUT' ||
            evento ===
              'SIGNED_IN' ||
            evento ===
              'USER_UPDATED'
          ) {
            requisicaoAtual.current?.abort();

            setEstado({
              tipo: 'carregando',
            });

            setRevisao(
              (valor) => valor + 1,
            );
          }
        },
      );

    return () => {
      data.subscription.unsubscribe();
    };
  }, []);

  useEffect(() => {
    const controller =
      new AbortController();

    requisicaoAtual.current =
      controller;

    let ativo = true;

    setEstado({
      tipo: 'carregando',
    });

    const timeout =
      window.setTimeout(() => {
        if (
          !ativo ||
          controller.signal.aborted
        ) {
          return;
        }

        controller.abort();

        setEstado({
          tipo: 'erro',
          mensagem:
            'A consulta demorou mais que o esperado. Verifique sua conexão e tente novamente.',
        });
      }, 20000);

    async function carregar(): Promise<void> {
      try {
        const contexto =
          await obterContextoDemandas(
            controller.signal,
          );

        if (
          !ativo ||
          controller.signal.aborted
        ) {
          return;
        }

        const resultado =
          await listarDemandas(
            contexto,
            consulta,
            controller.signal,
          );

        if (
          !ativo ||
          controller.signal.aborted
        ) {
          return;
        }

        const ultimaPagina =
          Math.max(
            resultado.total_paginas -
              1,
            0,
          );

        if (
          consulta.pagina >
          ultimaPagina
        ) {
          setConsulta(
            (anterior) => ({
              ...anterior,
              pagina:
                ultimaPagina,
            }),
          );

          return;
        }

        setEstado({
          tipo: 'pronto',
          contexto,
          resultado,
        });
      } catch (erro: unknown) {
        if (
          !ativo ||
          controller.signal.aborted
        ) {
          return;
        }

        setEstado({
          tipo: 'erro',
          mensagem:
            mensagemErroDemandas(
              erro,
            ),
        });
      } finally {
        window.clearTimeout(
          timeout,
        );
      }
    }

    void carregar();

    return () => {
      ativo = false;

      controller.abort();

      window.clearTimeout(timeout);

      if (
        requisicaoAtual.current ===
        controller
      ) {
        requisicaoAtual.current =
          null;
      }
    };
  }, [consulta, revisao]);

  function alterarConsulta(
    proxima: Consulta,
  ): void {
    requisicaoAtual.current?.abort();

    setEstado({
      tipo: 'carregando',
    });

    setConsulta(proxima);
  }

  function atualizar(): void {
    requisicaoAtual.current?.abort();

    setEstado({
      tipo: 'carregando',
    });

    setRevisao(
      (valor) => valor + 1,
    );
  }

  function buscar(
    evento: FormEvent<HTMLFormElement>,
  ): void {
    evento.preventDefault();

    alterarConsulta({
      ...consulta,
      busca:
        rascunhoBusca.trim(),
      pagina: 0,
    });
  }

  function limparFiltros(): void {
    setRascunhoBusca('');

    alterarConsulta({
      ...CONSULTA_INICIAL,
    });
  }

  const carregando =
    estado.tipo ===
    'carregando';

  const resultado =
    estado.tipo === 'pronto'
      ? estado.resultado
      : null;

  const podeGerenciar =
    estado.tipo === 'pronto' &&
    estado.contexto
      .pode_gerenciar;

  // ERN_PERIODO_MENSAL_V1: período atual da consulta (mês, histórico ou do painel).
  const periodoAtual: PeriodoMensalERN = (() => {
    const de = consulta.data_inicio_de;
    const ate = consulta.data_inicio_ate;
    if (!de && !ate) return HISTORICO_ERN;
    const mes = de?.slice(0, 7) ?? '';
    if (mesValidoERN(mes)) {
      const limites = limitesMesERN(mes);
      if (de === limites.inicio && ate === limites.fim) return mes;
    }
    return 'personalizado';
  })();

  function mudarPeriodo(proximo: PeriodoMensalERN) {
    if (mesValidoERN(proximo)) {
      const { inicio, fim } = limitesMesERN(proximo);
      alterarConsulta({ ...consulta, data_inicio_de: inicio, data_inicio_ate: fim, pagina: 0 });
    } else {
      alterarConsulta({ ...consulta, data_inicio_de: undefined, data_inicio_ate: undefined, pagina: 0 });
    }
  }

  const temFiltros =
    consulta.busca !== '' ||
    consulta.categoria !== '' ||
    consulta.status !== '' ||
    Boolean(consulta.data_inicio_de || consulta.data_inicio_ate);

  // ERN_PADRAO_PAGINAS_EDA_V1: demanda aberta no painel lateral.
  const [aberta, setAberta] = useState<Demanda | null>(null);
  const [vinculos, setVinculos] = useState<Record<string, VinculoDemandaEDA>>({});
  useEffect(() => {
    if (estado.tipo !== 'pronto') return;
    const ids = estado.resultado.registros.map((d) => d.id);
    if (!ids.length) return;
    let ativo = true;
    void supabase.rpc('vinculos_demandas_eda', { p_ids: ids }).then(({ data }) => {
      if (!ativo || !Array.isArray(data)) return;
      const mapa: Record<string, VinculoDemandaEDA> = {};
      for (const v of data as (VinculoDemandaEDA & { demanda_id: string })[]) mapa[v.demanda_id] = v;
      setVinculos(mapa);
    });
    return () => { ativo = false; };
  }, [estado]);

  const opcoesStatus: { valor: StatusDemanda | ''; rotulo: string }[] = [
    { valor: '', rotulo: 'Todas' },
    ...(Object.entries(STATUS_DEMANDA) as [StatusDemanda, string][]).map(([valor, rotulo]) => ({ valor, rotulo })),
  ];

  const detalheAberta = aberta ? detalheEstimativa(aberta) : null;

  return (
    <PaginaEDA className="eda-dem">
      <div className="eda-pg-miolo">
        <CabecalhoEDA
          capa
          etiqueta="Oferta e demanda"
          titulo="Demandas"
          resumo={resultado
            ? <><b>{resultado.total}</b> {resultado.total === 1 ? 'demanda' : 'demandas'} nesta consulta · alimentação, combustível e recursos da operação</>
            : 'Planeje alimentação, bebidas, combustível e os demais recursos da operação.'}
          acoes={<>
            <button type="button" onClick={atualizar} disabled={carregando} className="eda-pg-bt">
              {carregando ? 'Carregando…' : 'Atualizar'}
            </button>
            {podeGerenciar && <Link href="/demandas/nova" className="eda-pg-bt eda-pg-bt-ouro">+ Nova demanda</Link>}
          </>}
        />

        {resultado && resultado.registros.length > 0 && (() => {
          const hoje = hojeISO();
          const regs = resultado.registros;
          const contar = (st: StatusDemanda) => regs.filter((d) => d.status === st).length;
          const expirando = regs.filter((d) => expiraEmBreve(d, hoje)).length;
          const escopo = resultado.total_paginas > 1 ? 'nesta página' : 'no período';
          const kpis: { st: StatusDemanda; classe: string; rotulo: string; texto: string }[] = [
            { st: 'aberta', classe: 'aberta', rotulo: 'Abertas', texto: `em preparação ${escopo}` },
            { st: 'rascunho', classe: 'rascunho', rotulo: 'Rascunhos', texto: 'aguardando revisão' },
            { st: 'encerrada', classe: 'encerrada', rotulo: 'Encerradas', texto: 'operações atendidas' },
          ];
          return (
            <div className="eda-dem-resumo" role="group" aria-label="Resumo das demandas">
              {kpis.slice(0, 2).map((k) => (
                <CartaoMagneticoEDA as="button" key={k.st} type="button" forca={6} className={`eda-dem-kpi eda-dem-kpi-${k.classe}`} aria-pressed={consulta.status === k.st}
                  onClick={() => alterarConsulta({ ...consulta, status: consulta.status === k.st ? '' : k.st, pagina: 0 })}>
                  <small>{k.rotulo}</small><b>{contar(k.st)}</b><span>{k.texto}</span>
                </CartaoMagneticoEDA>
              ))}
              <CartaoMagneticoEDA forca={6} className="eda-dem-kpi eda-dem-kpi-expira" style={{ cursor: 'default' }}>
                <small>Expiram em 7 dias</small><b>{expirando}</b><span>{expirando ? 'confira os recursos a tempo' : 'nada vencendo agora'}</span>
              </CartaoMagneticoEDA>
              {kpis.slice(2).map((k) => (
                <CartaoMagneticoEDA as="button" key={k.st} type="button" forca={6} className={`eda-dem-kpi eda-dem-kpi-${k.classe}`} aria-pressed={consulta.status === k.st}
                  onClick={() => alterarConsulta({ ...consulta, status: consulta.status === k.st ? '' : k.st, pagina: 0 })}>
                  <small>{k.rotulo}</small><b>{contar(k.st)}</b><span>{k.texto}</span>
                </CartaoMagneticoEDA>
              ))}
            </div>
          );
        })()}

        <SeletorPeriodoMensalERN valor={periodoAtual} aoMudar={mudarPeriodo} rotulo="Período de início das demandas" />

        {periodoAtual === 'personalizado' && (
          <div className="eda-pg-aviso eda-pg-aviso-ouro">
            <div>
              <b>Filtro do painel: início da demanda</b>
              <p>{formatarData(consulta.data_inicio_de ?? null)} até {formatarData(consulta.data_inicio_ate ?? null)}</p>
            </div>
            <button
              type="button"
              className="eda-pg-bt eda-pg-bt-p"
              onClick={() => alterarConsulta({ ...consulta, data_inicio_de: undefined, data_inicio_ate: undefined, pagina: 0 })}
            >
              Remover período
            </button>
          </div>
        )}

        <form onSubmit={buscar} aria-label="Filtrar demandas" className="eda-pg-filtros">
          <BuscaEDA id="busca-demanda" rotulo="Buscar por título" valor={rascunhoBusca} aoMudar={setRascunhoBusca} placeholder="Buscar por título e Enter" />
          <ChipsEDA
            rotulo="Filtrar por status"
            opcoes={opcoesStatus}
            valor={consulta.status}
            aoMudar={(valor) => alterarConsulta({ ...consulta, status: valor, pagina: 0 })}
          />
          <div className="eda-pg-filtros-dir">
            <label htmlFor="categoria-demanda" className="eda-pg-sr">Categoria</label>
            <select
              id="categoria-demanda"
              className="eda-pg-select"
              value={consulta.categoria}
              onChange={(evento) => {
                const valor = evento.target.value;
                if (valor === '' || ehCategoriaDemanda(valor)) {
                  alterarConsulta({ ...consulta, categoria: valor, pagina: 0 });
                }
              }}
            >
              <option value="">Todas as categorias</option>
              {Object.entries(CATEGORIAS_DEMANDA).map(([valor, nome]) => (
                <option key={valor} value={valor}>{nome}</option>
              ))}
            </select>
            <button type="submit" className="eda-pg-bt eda-pg-bt-p">Buscar</button>
            {temFiltros && <button type="button" onClick={limparFiltros} className="eda-pg-bt eda-pg-bt-p">Limpar</button>}
          </div>
        </form>

        <section aria-label="Resultados da consulta" aria-busy={carregando} className="eda-pg-tabela-caixa">
          <div className="eda-pg-tabela-topo">
            <span>
              {resultado
                ? <><b>{resultado.total}</b> {resultado.total === 1 ? 'demanda encontrada' : 'demandas encontradas'}{consulta.busca ? ` · busca “${consulta.busca}”` : ''}</>
                : '—'}
            </span>
            {estado.tipo === 'pronto' && !estado.contexto.pode_gerenciar
              ? <PillEDA tom="nt" ponto={false}>Seu perfil permite apenas consulta</PillEDA>
              : <span>Clique numa demanda para ver os detalhes</span>}
          </div>

          {carregando && <p role="status" className="eda-pg-estado">Carregando demandas…</p>}

          {estado.tipo === 'erro' && (
            <div role="alert" className="eda-pg-vazio">
              <b style={{ color: 'var(--p-verm)' }}>Não foi possível carregar as demandas</b>
              <p>{estado.mensagem}</p>
              <button type="button" onClick={atualizar} className="eda-pg-bt">Tentar novamente</button>
            </div>
          )}

          {estado.tipo === 'pronto' && resultado && (
            resultado.registros.length === 0 ? (
              <VazioEDA
                titulo={temFiltros ? 'Nenhuma demanda encontrada' : 'Nenhuma demanda ainda'}
                texto={temFiltros ? 'Ajuste a busca, o status ou a categoria.' : 'Registre as necessidades da próxima operação para reduzir imprevistos durante a viagem.'}
                acao={temFiltros
                  ? <button type="button" className="eda-pg-bt" onClick={limparFiltros}>Limpar filtros</button>
                  : podeGerenciar ? <Link href="/demandas/nova" className="eda-pg-bt eda-pg-bt-ouro">+ Nova demanda</Link> : undefined}
              />
            ) : (
              <>
                <div className="eda-pg-cartoes">
                  {resultado.registros.map((demanda) => (
                    <button key={demanda.id} type="button" className={`eda-pg-cartao eda-dem-cat-${demanda.categoria}`} onClick={() => setAberta(demanda)}>
                      <span className="eda-pg-cartao-topo">
                        <span className="eda-dem-item">
                          <IconeCategoria categoria={demanda.categoria} />
                          <span className="eda-dem-item-txt">
                            <b>{demanda.titulo}</b>
                            <small>{CATEGORIAS_DEMANDA[demanda.categoria]} · {demanda.localidade}</small>
                          </span>
                        </span>
                        <PillEDA tom={TOM_STATUS[demanda.status]}>{STATUS_DEMANDA[demanda.status]}</PillEDA>
                      </span>
                      <PasseioDaDemanda v={vinculos[demanda.id]} />
                      <span className="eda-pg-cartao-info">
                        <span>{formatadorQuantidade.format(demanda.quantidade)} {demanda.unidade}</span>
                        <span>{demanda.data_inicio && demanda.data_fim ? `${formatarData(demanda.data_inicio)} a ${formatarData(demanda.data_fim)}` : 'Período não informado'}</span>
                        {expiracaoDemanda(demanda)}
                      </span>
                    </button>
                  ))}
                </div>

                <div className="eda-pg-rolagem">
                  <table className="eda-pg-tabela">
                    <thead>
                      <tr>
                        {['Demanda', 'Categoria', 'Período', 'Quantidade', 'Status', ''].map((titulo, i) => (
                          <th key={titulo || i} scope="col">{titulo || <span className="eda-pg-sr">Ações</span>}</th>
                        ))}
                      </tr>
                    </thead>
                    <tbody>
                      {resultado.registros.map((demanda) => (
                        <tr key={demanda.id} aria-selected={aberta?.id === demanda.id}>
                          <td className="eda-dem-col-item">
                            <button type="button" className="eda-pg-linha-bt eda-dem-item" onClick={() => setAberta(demanda)}>
                              <IconeCategoria categoria={demanda.categoria} />
                              <span className="eda-dem-item-txt">
                                <b>{demanda.titulo}</b>
                                <span className="eda-dem-local"><IconeLocal />{demanda.localidade}</span>
                                <PasseioDaDemanda v={vinculos[demanda.id]} />
                              </span>
                            </button>
                          </td>
                          <td className="eda-pg-mut">{CATEGORIAS_DEMANDA[demanda.categoria]}</td>
                          <td style={{ whiteSpace: 'nowrap' }}>
                            {demanda.data_inicio ? formatarData(demanda.data_inicio) : '—'}
                            {demanda.data_fim && <small>até {formatarData(demanda.data_fim)}</small>}
                            {expiracaoDemanda(demanda) && <div style={{ marginTop: 4 }}>{expiracaoDemanda(demanda)}</div>}
                          </td>
                          <td className="eda-dem-qtd"><b>{formatadorQuantidade.format(demanda.quantidade)}</b><small>{demanda.unidade}</small></td>
                          <td><PillEDA tom={TOM_STATUS[demanda.status]}>{STATUS_DEMANDA[demanda.status]}</PillEDA></td>
                          <td>
                            <div className="eda-pg-acoes-linha">
                              <button type="button" className="eda-pg-bt eda-pg-bt-p" onClick={() => setAberta(demanda)}>Ver</button>
                              {podeGerenciar && <Link href={`/demandas/editar/${demanda.id}`} className="eda-pg-bt eda-pg-bt-p">Gerenciar</Link>}
                            </div>
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>

                {resultado.total_paginas > 1 && (
                  <nav aria-label="Páginas de demandas" className="eda-pg-tabela-topo" style={{ borderBottom: 0, borderTop: '1px solid var(--p-borda)' }}>
                    <span>Página <b>{resultado.pagina + 1}</b> de {resultado.total_paginas}</span>
                    <span style={{ display: 'flex', gap: 6 }}>
                      <button
                        type="button"
                        className="eda-pg-bt eda-pg-bt-p"
                        disabled={resultado.pagina === 0}
                        onClick={() => alterarConsulta({ ...consulta, pagina: Math.max(resultado.pagina - 1, 0) })}
                      >
                        Anterior
                      </button>
                      <button
                        type="button"
                        className="eda-pg-bt eda-pg-bt-p"
                        disabled={resultado.pagina + 1 >= resultado.total_paginas}
                        onClick={() => alterarConsulta({ ...consulta, pagina: resultado.pagina + 1 })}
                      >
                        Próxima
                      </button>
                    </span>
                  </nav>
                )}
              </>
            )
          )}
        </section>

        {estado.tipo === 'pronto' && resultado && resultado.registros.length > 0 && (
          <details className="eda-pg-analises">
            <summary>Análises das demandas</summary>
            <div>
              <DemandasInsightsPremium
                registros={resultado.registros}
                totalConsulta={resultado.total}
                pagina={resultado.pagina}
                totalPaginas={resultado.total_paginas}
              />
            </div>
          </details>
        )}
      </div>

      {aberta && (
        <PainelLateralEDA
          etiqueta={CATEGORIAS_DEMANDA[aberta.categoria]}
          titulo={aberta.titulo}
          subtitulo={aberta.localidade}
          aoFechar={() => setAberta(null)}
          rodape={podeGerenciar ? (
            <Link href={`/demandas/editar/${aberta.id}`} className="eda-pg-bt eda-pg-bt-ouro">Gerenciar demanda</Link>
          ) : (
            <button type="button" className="eda-pg-bt" onClick={() => setAberta(null)}>Fechar</button>
          )}
        >
          <div className={`eda-dem eda-dem-lateral eda-dem-cat-${aberta.categoria}`}>
            <div className="eda-dem-lateral-topo">
              <IconeCategoria categoria={aberta.categoria} grande />
              <PillEDA tom={TOM_STATUS[aberta.status]}>{STATUS_DEMANDA[aberta.status]}</PillEDA>
              {expiracaoDemanda(aberta)}
            </div>

            <div className="eda-dem-destaque">
              <small>Quantidade prevista</small>
              <strong>{formatadorQuantidade.format(aberta.quantidade)}<em>{aberta.unidade}</em></strong>
              {detalheAberta && <p className="eda-dem-calculo">{detalheAberta}</p>}
            </div>

            <div className="eda-pg-bloco">
              <p className="eda-pg-bloco-titulo">Passeio que esta demanda prepara</p>
              <PasseioDaDemanda v={vinculos[aberta.id]} />
            </div>

            <div className="eda-pg-bloco">
              <p className="eda-pg-bloco-titulo">Descrição</p>
              <DescricaoDemanda texto={aberta.descricao} />
            </div>

            <div className="eda-pg-bloco">
              <p className="eda-pg-bloco-titulo">Período da operação</p>
              <LinhaTempo demanda={aberta} />
            </div>

            <div className="eda-pg-bloco">
              <p className="eda-pg-bloco-titulo">Detalhes</p>
              <dl className="eda-pg-dados">
                <DadoEDA rotulo="Categoria">{CATEGORIAS_DEMANDA[aberta.categoria]}</DadoEDA>
                <DadoEDA rotulo="Localidade">{aberta.localidade}</DadoEDA>
              </dl>
            </div>
          </div>
        </PainelLateralEDA>
      )}
    </PaginaEDA>
  );
}
