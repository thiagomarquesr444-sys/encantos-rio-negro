'use client';

import FaunaCabecalhoERN from '@/app/components/FaunaCabecalhoERN';

import { useEffect, useRef, useState } from 'react';
import Link from 'next/link';
import { usePathname } from 'next/navigation';

import { useAppConfig } from '@/app/context/AppContext';
import { supabase } from '@/lib/supabase';
import LogoERN from '@/app/components/LogoERN';
import {
  useModulosEquipeERN,
  permiteLinkEquipeERN,
} from '@/app/components/ModulosEquipeERN';

type NavItem = {
  label: string;
  href: string;
  descricao?: string;
};

type NavGroup = {
  id: string;
  label: string;
  itens: NavItem[];
};

const PRINCIPAIS: NavItem[] = [
  {
    label: 'Painel',
    href: '/dashboard',
    descricao: 'Visão geral da sua empresa',
  },
  {
    label: 'Mapa ERN',
    href: '/dashboard/mapa',
    descricao: 'Território, localidades e referências do Rio Negro',
  },
  {
    label: 'Demandas',
    href: '/demandas',
    descricao: 'Serviços que sua empresa precisa contratar',
  },
];

const GRUPOS: NavGroup[] = [
  {
    id: 'operacao',
    label: 'Operação',
    itens: [
      {
        label: 'Clientes',
        href: '/clientes',
        descricao: 'Cadastro e relacionamento com viajantes',
      },
      {
        label: 'Reservas',
        href: '/reservas',
        descricao: 'Solicitações, confirmações e operação',
      },
      {
        label: 'Passeios',
        href: '/passeios',
        descricao: 'Roteiros, experiências e catálogo',
      },
      {
        label: 'Vouchers',
        href: '/vouchers',
        descricao: 'Documentos vinculados às reservas',
      },
      {
        label: 'Central de Documentos',
        href: '/documentos',
        descricao: 'PDFs, vouchers e demonstrativos da operadora',
      },
    ],
  },
  {
    id: 'estrutura',
    label: 'Estrutura',
    itens: [
      {
        label: 'Hospedagens',
        href: '/hospedagens',
        descricao: 'Hotéis, pousadas e unidades',
      },
      {
        label: 'Embarcações',
        href: '/embarcacoes',
        descricao: 'Barcos e capacidade operacional',
      },
      {
        label: 'Guias',
        href: '/guias',
        descricao: 'Profissionais e disponibilidade',
      },
    ],
  },
  {
    id: 'financeiro',
    label: 'Financeiro',
    itens: [
      {
        label: 'Visão geral',
        href: '/financeiro',
        descricao: 'Saldo, recebimentos e pagamentos',
      },
      {
        label: 'Nova receita',
        href: '/financeiro/receita/novo',
        descricao: 'Registrar uma entrada financeira',
      },
      {
        label: 'Nova despesa',
        href: '/financeiro/despesa/novo',
        descricao: 'Registrar uma saída financeira',
      },
      {
        label: 'Exportar relatório',
        href: '/financeiro/exportar',
        descricao: 'Gerar relatório financeiro em CSV',
      },
    ],
  },
  {
    id: 'relacionamento',
    label: 'Relacionamento',
    itens: [
      {
        label: 'Parceiros',
        href: '/parceiros',
        descricao: 'Rede operacional e fornecedores',
      },
      {
        label: 'Relatórios',
        href: '/relatorios',
        descricao: 'Informações consolidadas',
      },
    ],
  },
];

const CONTA: NavItem[] = [
  {
    label: 'Publica\u00e7\u00f5es na Rede',
    href: '/configuracoes/publicacoes',
    descricao: 'Criar, revisar e publicar experi\u00eancias da operadora',
  },
  { label: 'Perfil p\u00fablico', href: '/configuracoes/perfil-publico', descricao: 'Apresenta\u00e7\u00e3o, imagens e contatos na Rede ERN' },
  { label: 'Configurações', href: '/configuracoes' },
  { label: 'Planos', href: '/planos' },
  { label: 'Ver portal público', href: '/' },
];

const FOCO =
  'focus-visible:outline focus-visible:outline-2 ' +
  'focus-visible:outline-offset-2 focus-visible:outline-[#E3A144]';

const BOTAO_TOPO =
  'inline-flex min-h-11 items-center justify-center gap-2 ' +
  'rounded-xl px-3 text-[13px] font-semibold transition-colors ' +
  'motion-reduce:transition-none ' +
  FOCO;

function rotaAtiva(pathname: string, href: string): boolean {
  if (
    href === '/' ||
    href === '/dashboard' ||
    href === '/financeiro'
  ) {
    return pathname === href;
  }

  return pathname === href || pathname.startsWith(`${href}/`);
}

function Seta({ aberta }: { aberta: boolean }) {
  return (
    <svg
      aria-hidden="true"
      className={`h-4 w-4 shrink-0 transition-transform motion-reduce:transition-none ${
        aberta ? 'rotate-180' : ''
      }`}
      fill="none"
      stroke="currentColor"
      strokeWidth={2}
      viewBox="0 0 24 24"
    >
      <path
        strokeLinecap="round"
        strokeLinejoin="round"
        d="m6 9 6 6 6-6"
      />
    </svg>
  );
}

type LinkNavegacaoProps = {
  item: NavItem;
  pathname: string;
  aoNavegar: () => void;
};

function LinkNavegacao({
  item,
  pathname,
  aoNavegar,
}: LinkNavegacaoProps) {
  const ativo = rotaAtiva(pathname, item.href);

  return (
    <Link
      href={item.href}
      onClick={aoNavegar}
      aria-current={ativo ? 'page' : undefined}
      className={`block min-h-12 rounded-xl px-4 py-3 transition-colors motion-reduce:transition-none ${FOCO} ${
        ativo
          ? 'bg-[#E3A144]/10 text-[#F4C77E]'
          : 'text-[#EDEDE3] hover:bg-white/5'
      }`}
    >
      <span className="block text-sm font-semibold">{item.label}</span>

      {item.descricao && (
        <span className="mt-1 block text-xs leading-5 text-[#A8BCAF]">
          {item.descricao}
        </span>
      )}
    </Link>
  );
}

// ERN_CONTA_IDENTIFICADA_V1
function textoIdentidadeERN(valor: unknown): string {
  return typeof valor === 'string'
    ? valor.replace(/\s+/g, ' ').trim().slice(0, 160)
    : '';
}

function nomeIdentidadeERN(valor: unknown): string {
  if (!valor || typeof valor !== 'object' || Array.isArray(valor)) return '';

  const registro = valor as Record<string, unknown>;

  for (const campo of ['nome_completo', 'nome', 'full_name', 'name']) {
    const nome = textoIdentidadeERN(registro[campo]);
    if (nome) return nome;
  }

  return '';
}

export default function Sidebar() {
  const pathname = usePathname();
  const { config } = useAppConfig();
  const {
    modulos: modulosEquipeERN,
    carregando: carregandoModulosERN,
    erro: erroModulosERN,
  } = useModulosEquipeERN();

  const linkPermitidoERN = (item: NavItem) =>
    permiteLinkEquipeERN(item.href, modulosEquipeERN);

  const principaisVisiveisERN = PRINCIPAIS.filter(linkPermitidoERN);

  const gruposVisiveisERN = GRUPOS
    .map((grupo) => ({
      ...grupo,
      itens: grupo.itens.filter(linkPermitidoERN),
    }))
    .filter((grupo) => grupo.itens.length > 0);

  const avisoModulosERN = carregandoModulosERN ? (
    <span role="status" className="px-4 py-2 text-xs text-[#B4C8BB]">
      Consultando acessos…
    </span>
  ) : erroModulosERN ? (
    <div role="alert" className="px-4 py-2 text-xs text-[#F4C77E]">
      <p>Não foi possível carregar seus acessos.</p>
      <button
        type="button"
        onClick={() => window.location.reload()}
        className="mt-2 min-h-11 rounded-lg border border-current px-3 focus-visible:outline-2 focus-visible:outline-offset-4"
      >
        Tentar novamente
      </button>
    </div>
  ) : null;

  const [acessoEditorial, setAcessoEditorial] = useState(false);
  const [nomeContaERN, setNomeContaERN] = useState('');
  const [mobileAberto, setMobileAberto] = useState(false);
  const [dropdown, setDropdown] = useState<string | null>(null);
  const [saindo, setSaindo] = useState(false);
  const [erroSaida, setErroSaida] = useState<string | null>(null);

  const headerRef = useRef<HTMLElement>(null);
  const dialogRef = useRef<HTMLDialogElement>(null);
  const acionadorDropdownRef = useRef<HTMLButtonElement | null>(null);
  const saidaEmAndamento = useRef(false);

  const nomeSistema = config.nome_sistema || 'Encantos Rio Negro';

  useEffect(() => {
    const cabecalho = headerRef.current;
    if (!cabecalho) return;

    const marca = cabecalho.querySelector('a[href="/dashboard"]');
    const menu = cabecalho.querySelector('nav');
    if (!marca || !menu) return;

    let ativo = true;

    function posicionar() {
      if (!ativo || !cabecalho || !marca || !menu) return;

      const origem = cabecalho.getBoundingClientRect();
      const marcaRect = marca.getBoundingClientRect();
      const menuRect = menu.getBoundingClientRect();
      const intervalo = menuRect.left - marcaRect.right;
      const cabe = menuRect.width > 0 && intervalo >= 90;

      cabecalho.style.setProperty('--ern-arara-opacidade', cabe ? '1' : '0');

      if (cabe) {
        const centro = (marcaRect.right + menuRect.left) / 2;
        cabecalho.style.setProperty(
          '--ern-arara-x',
          (centro - origem.left - 35.34) + 'px',
        );
      }
    }

    const observador = new ResizeObserver(posicionar);
    observador.observe(cabecalho);
    observador.observe(marca);
    observador.observe(menu);
    posicionar();
    void document.fonts.ready.then(posicionar);

    return () => {
      ativo = false;
      observador.disconnect();
    };
  }, [nomeSistema]);

  useEffect(() => {
    let ativo = true;
    let versao = 0;
    let agendamento: ReturnType<typeof setTimeout> | undefined;

    async function verificar(operacao: number) {
      try {
        const { data, error } = await supabase.auth.getUser();

        if (!ativo || operacao !== versao) return;

        if (error || !data.user || data.user.is_anonymous) {
          setAcessoEditorial(false);
          setNomeContaERN('');
          return;
        }

        const usuarioERN = data.user;
        const alternativaERN =
          nomeIdentidadeERN(usuarioERN.user_metadata) ||
          textoIdentidadeERN(usuarioERN.email);

        setNomeContaERN(alternativaERN);

        try {
          const { data: perfilERN, error: erroPerfilERN } = await supabase
            .from('perfis')
            .select('*')
            .eq('id', usuarioERN.id)
            .maybeSingle();

          if (!ativo || operacao !== versao) return;

          if (!erroPerfilERN) {
            setNomeContaERN(nomeIdentidadeERN(perfilERN) || alternativaERN);
          }
        } catch {
          if (!ativo || operacao !== versao) return;
        }

        const { data: permitido, error: falha } =
          await supabase.rpc('tem_acesso_editorial_ern');

        if (ativo && operacao === versao) {
          setAcessoEditorial(!falha && permitido === true);
        }
      } catch {
        if (ativo && operacao === versao) {
          setAcessoEditorial(false);
        }
      }
    }

    function atualizar() {
      const operacao = ++versao;
      setAcessoEditorial(false);
      clearTimeout(agendamento);
      agendamento = setTimeout(() => {
        void verificar(operacao);
      }, 0);
    }

    function aoVoltar() {
      if (!document.hidden) atualizar();
    }

    const { data: assinatura } =
      supabase.auth.onAuthStateChange(() => {
        atualizar();
      });

    atualizar();
    document.addEventListener('visibilitychange', aoVoltar);

    return () => {
      ativo = false;
      versao += 1;
      clearTimeout(agendamento);
      assinatura.subscription.unsubscribe();
      document.removeEventListener('visibilitychange', aoVoltar);
    };
  }, [pathname]);

  const itensConta: NavItem[] = acessoEditorial
    ? [
        {
          label: 'Comando ERN',
          href: '/comando',
          descricao: 'Perfil oficial e publica\u00e7\u00f5es editoriais da plataforma',
        },
        ...CONTA,
      ]
    : CONTA;

  function fecharMenus(): void {
    setDropdown(null);
    setMobileAberto(false);
  }

  useEffect(() => {
    setDropdown(null);
    setMobileAberto(false);
  }, [pathname]);

  useEffect(() => {
    function aoPressionar(evento: KeyboardEvent): void {
      if (evento.key !== 'Escape') return;

      setDropdown(null);
      acionadorDropdownRef.current?.focus();
    }

    function aoTocarFora(evento: PointerEvent): void {
      if (
        evento.target instanceof Node &&
        !headerRef.current?.contains(evento.target)
      ) {
        setDropdown(null);
      }
    }

    document.addEventListener('keydown', aoPressionar);
    document.addEventListener('pointerdown', aoTocarFora);

    return () => {
      document.removeEventListener('keydown', aoPressionar);
      document.removeEventListener('pointerdown', aoTocarFora);
    };
  }, []);

  useEffect(() => {
    // Mesmo breakpoint usado pela navegação desktop.
    const media = window.matchMedia('(min-width: 1280px)');

    function ajustarMenus(): void {
      setDropdown(null);

      if (media.matches) {
        setMobileAberto(false);
      }
    }

    media.addEventListener('change', ajustarMenus);

    return () => {
      media.removeEventListener('change', ajustarMenus);
    };
  }, []);

  useEffect(() => {
    const dialog = dialogRef.current;

    if (!dialog) return;

    if (!mobileAberto) {
      if (dialog.open) dialog.close();
      return;
    }

    const overflowAnterior = document.body.style.overflow;

    document.body.style.overflow = 'hidden';

    if (!dialog.open) {
      dialog.showModal();
    }

    return () => {
      document.body.style.overflow = overflowAnterior;

      if (dialog.open) {
        dialog.close();
      }
    };
  }, [mobileAberto]);

  function alternarDropdown(
    id: string,
    acionador: HTMLButtonElement,
  ): void {
    acionadorDropdownRef.current = acionador;
    setDropdown((atual) => (atual === id ? null : id));
  }

  async function sair(): Promise<void> {
    if (saidaEmAndamento.current) return;

    saidaEmAndamento.current = true;
    setSaindo(true);
    setErroSaida(null);

    try {
      const { error } = await supabase.auth.signOut();

      if (error) throw error;

      window.location.assign('/login');
    } catch {
      setErroSaida(
        'Não foi possível sair da conta. Verifique sua conexão e tente novamente.',
      );
    } finally {
      saidaEmAndamento.current = false;
      setSaindo(false);
    }
  }

  function grupoAtivo(grupo: NavGroup): boolean {
    if (
      grupo.id === 'financeiro' &&
      (pathname === '/financeiro' ||
        pathname.startsWith('/financeiro/'))
    ) {
      return true;
    }

    return grupo.itens.some((item) => rotaAtiva(pathname, item.href));
  }

  function botaoSair() {
    return (
      <button
        type="button"
        disabled={saindo}
        onClick={() => void sair()}
        className={`mt-2 min-h-12 w-full rounded-xl px-4 py-3 text-left text-sm font-semibold text-rose-300 transition-colors hover:bg-rose-400/10 disabled:cursor-wait disabled:opacity-50 motion-reduce:transition-none ${FOCO}`}
      >
        {saindo ? 'Saindo...' : 'Sair da conta'}
      </button>
    );
  }

  return (
    <>
      <header
        style={{
          /* ERN_MENU_TEMA_DIRETO_V1 */
          backgroundColor: 'var(--ern-fundo, #101214)',
          color: 'var(--ern-texto, #f0f1f2)',
          borderColor: 'var(--ern-borda, #454b53)',
          transitionProperty: 'box-shadow',
        }}
        ref={headerRef}
        className="ern-navegacao-ilustrada fixed inset-x-0 top-0 z-50 border-b border-white/10 bg-[#07110E]/95 text-[#EDEDE3] backdrop-blur-xl"
        onBlur={(evento) => {
          const destino = evento.relatedTarget;

          if (
            !(destino instanceof Node) ||
            !evento.currentTarget.contains(destino)
          ) {
            setDropdown(null);
          }
        }}
      >
        <FaunaCabecalhoERN altura={76} oncaNaConta araraEntreMarcaEMenu />
        <div className="mx-auto flex h-[82px] max-w-[1600px] items-center justify-between gap-3 px-4 md:px-6">
          <Link
            href="/dashboard"
            onClick={fecharMenus}
            className={`flex min-w-0 items-center gap-3 rounded-xl xl:max-w-[240px] ${FOCO}`}
          >
            <LogoERN prioridade />

            <span className="min-w-0">
              <span
                className="block truncate text-sm font-semibold text-[#F0F0E8] sm:text-base"
                style={{
                  fontFamily: 'var(--font-fraunces), serif',
                }}
              >
                {nomeSistema}
              </span>

              <span className="mt-1 block text-[10px] uppercase tracking-widest text-[#B4C8BB]">
                Gestão integrada
              </span>
            </span>
          </Link>

          <nav
            aria-label="Navegação principal"
            className="hidden shrink-0 items-center gap-1 xl:flex"
          >
            {avisoModulosERN}
            {principaisVisiveisERN.map((item) => {
              const ativo = rotaAtiva(pathname, item.href);

              return (
                <Link
                  key={item.href}
                  href={item.href}
                  onClick={fecharMenus}
                  aria-current={ativo ? 'page' : undefined}
                  className={`${BOTAO_TOPO} ${
                    ativo
                      ? 'bg-[#E3A144]/10 text-[#F4C77E]'
                      : 'text-[#B4C8BB] hover:bg-white/5 hover:text-white'
                  }`}
                >
                  {item.label}
                </Link>
              );
            })}

            {gruposVisiveisERN.map((grupo) => {
              const aberto = dropdown === grupo.id;
              const ativo = grupoAtivo(grupo);
              const painelId = `nav-desktop-${grupo.id}`;

              return (
                <div key={grupo.id} className="relative">
                  <button
                    type="button"
                    aria-expanded={aberto}
                    aria-controls={painelId}
                    onClick={(evento) =>
                      alternarDropdown(grupo.id, evento.currentTarget)
                    }
                    className={`${BOTAO_TOPO} ${
                      aberto || ativo
                        ? 'bg-white/5 text-[#F4C77E]'
                        : 'text-[#B4C8BB] hover:bg-white/5 hover:text-white'
                    }`}
                  >
                    {grupo.label}
                    <Seta aberta={aberto} />
                  </button>

                  <div
                    id={painelId}
                    hidden={!aberto}
                    className="absolute right-0 top-[calc(100%+12px)] w-72 rounded-2xl border border-white/10 bg-[#0A1713] p-2 shadow-2xl"
                  >
                    {grupo.itens.map((item) => (
                      <LinkNavegacao
                        key={item.href}
                        item={item}
                        pathname={pathname}
                        aoNavegar={fecharMenus}
                      />
                    ))}
                  </div>
                </div>
              );
            })}
          </nav>

          <div className="hidden shrink-0 xl:block">
            <div className="relative">
              <button
                type="button"
                aria-expanded={dropdown === 'conta'}
                aria-controls="nav-conta"
                onClick={(evento) =>
                  alternarDropdown('conta', evento.currentTarget)
                }
                className={`${BOTAO_TOPO} border border-white/10 text-[#EDEDE3] hover:bg-white/5`}
              >
                <span className="ern-conta-nome" title={nomeContaERN || undefined}>{nomeContaERN || 'Minha conta'}</span>
                <Seta aberta={dropdown === 'conta'} />
              </button>

              <div
                id="nav-conta"
                hidden={dropdown !== 'conta'}
                className="absolute right-0 top-[calc(100%+12px)] w-72 rounded-2xl border border-white/10 bg-[#0A1713] p-2 shadow-2xl"
              >
                <p className="px-4 py-3 text-xs font-semibold uppercase tracking-widest text-[#E3A144]">
                  {nomeContaERN || 'Minha conta'}
                </p>

                {itensConta.filter(linkPermitidoERN).map((item) => (
                  <LinkNavegacao
                    key={item.href}
                    item={item}
                    pathname={pathname}
                    aoNavegar={fecharMenus}
                  />
                ))}

                {botaoSair()}

                {erroSaida && (
                  <p
                    role="alert"
                    className="px-4 py-3 text-sm leading-6 text-rose-300"
                  >
                    {erroSaida}
                  </p>
                )}
              </div>
            </div>
          </div>

          <button
            type="button"
            aria-label="Abrir menu de navegação"
            aria-expanded={mobileAberto}
            aria-controls="menu-mobile-ern"
            aria-haspopup="dialog"
            onClick={() => {
              setDropdown(null);
              acionadorDropdownRef.current = null;
              setMobileAberto(true);
            }}
            className={`flex h-12 w-12 shrink-0 items-center justify-center rounded-xl border border-white/15 bg-white/5 text-[#EDEDE3] xl:hidden ${FOCO}`}
          >
            <svg
              aria-hidden="true"
              className="h-6 w-6"
              fill="none"
              stroke="currentColor"
              strokeWidth={2}
              viewBox="0 0 24 24"
            >
              <path strokeLinecap="round" d="M4 6h16M4 12h16M4 18h16" />
            </svg>
          </button>
        </div>
      </header>

      <dialog
        ref={dialogRef}
        id="menu-mobile-ern"
        style={{
          backgroundColor: 'var(--ern-painel, #1a1d21)',
          color: 'var(--ern-texto, #f0f1f2)',
          borderColor: 'var(--ern-borda, #454b53)',
        }}
        aria-labelledby="titulo-menu-mobile"
        className="menu-mobile"
        onCancel={(evento) => {
          evento.preventDefault();
          setMobileAberto(false);
        }}
        onClick={(evento) => {
          if (evento.target !== evento.currentTarget) return;

          const limites = evento.currentTarget.getBoundingClientRect();

          if (
            evento.clientX < limites.left ||
            evento.clientX > limites.right ||
            evento.clientY < limites.top ||
            evento.clientY > limites.bottom
          ) {
            setMobileAberto(false);
          }
        }}
      >
        <div className="flex h-full flex-col">
          <div className="flex shrink-0 items-center justify-between gap-3 border-b border-white/10 px-5 py-4">
            <div>
              <h2
                id="titulo-menu-mobile"
                className="text-lg font-semibold text-[#F0F0E8]"
              >
                Navegação
              </h2>

              <p className="mt-1 text-xs text-[#B4C8BB]">
                Encantos Rio Negro
              </p>
            </div>

            <button
              type="button"
              aria-label="Fechar menu de navegação"
              onClick={() => setMobileAberto(false)}
              className={`flex h-12 w-12 shrink-0 items-center justify-center rounded-xl border border-white/15 text-[#EDEDE3] hover:bg-white/5 ${FOCO}`}
            >
              <svg
                aria-hidden="true"
                className="h-6 w-6"
                fill="none"
                stroke="currentColor"
                strokeWidth={2}
                viewBox="0 0 24 24"
              >
                <path
                  strokeLinecap="round"
                  d="m6 6 12 12M6 18 18 6"
                />
              </svg>
            </button>
          </div>

          <nav
            aria-label="Navegação mobile"
            className="min-h-0 flex-1 overflow-y-auto overscroll-contain p-4"
            style={{
              paddingBottom: 'max(24px, env(safe-area-inset-bottom))',
            }}
          >
            <div className="space-y-1">
              {avisoModulosERN}
            {principaisVisiveisERN.map((item) => (
                <LinkNavegacao
                  key={item.href}
                  item={item}
                  pathname={pathname}
                  aoNavegar={fecharMenus}
                />
              ))}
            </div>

            {gruposVisiveisERN.map((grupo) => (
              <section
                key={grupo.id}
                aria-labelledby={`titulo-mobile-${grupo.id}`}
                className="mt-4 border-t border-white/10 pt-4"
              >
                <h3
                  id={`titulo-mobile-${grupo.id}`}
                  className="px-4 pb-2 text-xs font-semibold uppercase tracking-widest text-[#E3A144]"
                >
                  {grupo.label}
                </h3>

                <div className="space-y-1">
                  {grupo.itens.map((item) => (
                    <LinkNavegacao
                      key={item.href}
                      item={item}
                      pathname={pathname}
                      aoNavegar={fecharMenus}
                    />
                  ))}
                </div>
              </section>
            ))}

            <section
              aria-labelledby="titulo-mobile-conta"
              className="mt-4 border-t border-white/10 pt-4"
            >
              <h3
                id="titulo-mobile-conta"
                className="px-4 pb-2 text-xs font-semibold uppercase tracking-widest text-[#E3A144]"
              >
                {nomeContaERN || 'Minha conta'}
              </h3>

              {itensConta.filter(linkPermitidoERN).map((item) => (
                <LinkNavegacao
                  key={item.href}
                  item={item}
                  pathname={pathname}
                  aoNavegar={fecharMenus}
                />
              ))}

              {botaoSair()}

              {erroSaida && (
                <p
                  role="alert"
                  className="px-4 py-3 text-sm leading-6 text-rose-300"
                >
                  {erroSaida}
                </p>
              )}
            </section>
          </nav>
        </div>
      </dialog>

      <style jsx>{`
        /* ERN: identidade amazonica */
        .ern-navegacao-ilustrada,
        .menu-mobile {
          isolation: isolate;
        }

        .ern-navegacao-ilustrada::before,
        .menu-mobile::before {
          content: '';
          position: absolute;
          inset: 0;
          z-index: -1;
          pointer-events: none;
          background-image: url('/images/regiao/ern-amazonia.jpg');
          background-repeat: no-repeat;
          opacity: 0.16;
        }

        .ern-navegacao-ilustrada::before {
          background-image: url('/images/regiao/ern-amazonia-paisagem.png');
          background-size: cover;
          background-position: center top;
          background-repeat: no-repeat;
        }

        .menu-mobile::before {
          background-size: contain;
          background-position: center;
          background-repeat: no-repeat;
        }


        .menu-mobile {
          position: fixed;
          inset: 0 0 0 auto;
          box-sizing: border-box;
          width: min(92vw, 400px);
          max-width: none;
          height: 100dvh;
          max-height: none;
          margin: 0;
          padding: 0;
          overflow: hidden;
          border: 0;
          border-left: 1px solid rgb(255 255 255 / 10%);
          background: #091510;
          color: #edede3;
          box-shadow: -20px 0 80px rgb(0 0 0 / 35%);
          opacity: 0;
          transform: translateX(28px);
          transition:
            opacity 180ms ease,
            transform 180ms ease,
            display 180ms allow-discrete,
            overlay 180ms allow-discrete;
        }

        .menu-mobile[open] {
          opacity: 1;
          transform: translateX(0);
        }

        .menu-mobile::backdrop {
          background: rgb(0 0 0 / 0%);
          backdrop-filter: blur(3px);
          transition:
            background 180ms ease,
            display 180ms allow-discrete,
            overlay 180ms allow-discrete;
        }

        .menu-mobile[open]::backdrop {
          background: rgb(0 0 0 / 65%);
        }

        @starting-style {
          .menu-mobile[open] {
            opacity: 0;
            transform: translateX(28px);
          }

          .menu-mobile[open]::backdrop {
            background: rgb(0 0 0 / 0%);
          }
        }

        @media (prefers-reduced-motion: reduce) {
          .menu-mobile,
          .menu-mobile::backdrop {
            transition: none;
          }

          .menu-mobile {
            transform: none;
          }
        }
      `}</style>
    </>
  );
}