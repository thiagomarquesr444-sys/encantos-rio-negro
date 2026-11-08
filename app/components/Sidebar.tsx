'use client';

// ERN_MENU_LATERAL_V1: menu lateral fixo da Encantos Gestão (computador),
// barra superior + barra inferior de atalhos (celular). Mesma lógica de
// acessos por função, acesso editorial e saída da conta.

import { useEffect, useRef, useState } from 'react';
import Link from 'next/link';
import { usePathname } from 'next/navigation';

import { useAppConfig } from '@/app/context/AppContext';
import { supabase } from '@/lib/supabase';
import LogoERN from '@/app/components/LogoERN';
import IconeERN, { type NomeIconeERN } from '@/app/components/IconeERN';
import TemaRapidoOperadoraERN from '@/app/components/TemaRapidoOperadoraERN';
import EstiloPainelSeletorERN from '@/app/components/EstiloPainelERN';
import {
  useModulosEquipeERN,
  permiteLinkEquipeERN,
} from '@/app/components/ModulosEquipeERN';

type NavItem = {
  label: string;
  href: string;
  descricao?: string;
  icone: NomeIconeERN;
};

type NavGroup = {
  id: string;
  label: string;
  itens: NavItem[];
};

const PRINCIPAIS: NavItem[] = [
  { label: 'Painel', href: '/dashboard', descricao: 'Visão geral da sua empresa', icone: 'casa' },
  { label: 'Reservas', href: '/reservas', descricao: 'Solicitações, confirmações e operação', icone: 'calendario' },
  { label: 'Operação ao vivo', href: '/reservas/ao-vivo', descricao: 'Embarcação em tempo real, ocorrências e suprimentos', icone: 'satelite' },
  { label: 'Demandas', href: '/demandas', descricao: 'Serviços que sua empresa precisa contratar', icone: 'lista' },
];

const GRUPOS: NavGroup[] = [
  {
    id: 'operacao',
    label: 'Operação',
    itens: [
      { label: 'Clientes', href: '/clientes', descricao: 'Cadastro e relacionamento com viajantes', icone: 'equipe' },
      { label: 'Passeios', href: '/passeios', descricao: 'Roteiros, experiências e catálogo', icone: 'rio' },
      { label: 'Vouchers', href: '/vouchers', descricao: 'Documentos vinculados às reservas', icone: 'voucher' },
      { label: 'Central de Documentos', href: '/documentos', descricao: 'PDFs, vouchers e demonstrativos da operadora', icone: 'documento' },
      { label: 'Mapa operacional', href: '/dashboard/mapa', descricao: 'Território, localidades e referências', icone: 'mapa' },
    ],
  },
  {
    id: 'estrutura',
    label: 'Estrutura',
    itens: [
      { label: 'Hospedagens', href: '/hospedagens', descricao: 'Hotéis, pousadas e unidades', icone: 'cama' },
      { label: 'Embarcações', href: '/embarcacoes', descricao: 'Barcos e capacidade operacional', icone: 'fornecedor' },
      { label: 'Guias', href: '/guias', descricao: 'Profissionais e disponibilidade', icone: 'guia' },
      { label: 'Parceiros', href: '/parceiros', descricao: 'Rede operacional e fornecedores', icone: 'parceria' },
    ],
  },
  {
    id: 'financeiro',
    label: 'Financeiro',
    itens: [
      { label: 'Visão geral', href: '/financeiro', descricao: 'Saldo, recebimentos e pagamentos', icone: 'financeiro' },
      { label: 'Nova receita', href: '/financeiro/receita/novo', descricao: 'Registrar uma entrada financeira', icone: 'mais' },
      { label: 'Nova despesa', href: '/financeiro/despesa/novo', descricao: 'Registrar uma saída financeira', icone: 'menos' },
      { label: 'Relatórios', href: '/relatorios', descricao: 'Informações consolidadas', icone: 'grafico' },
      { label: 'Exportar relatório', href: '/financeiro/exportar', descricao: 'Gerar relatório financeiro em CSV', icone: 'exportar' },
      { label: 'Painel Fiscal', href: '/fiscal', descricao: 'Acompanhamento de simulações fiscais', icone: 'documento' },
    ],
  },
];

const REDE: NavItem[] = [
  { label: 'Publicações na Rede', href: '/configuracoes/publicacoes', descricao: 'Criar, revisar e publicar experiências da operadora', icone: 'estrela' },
  { label: 'Perfil público', href: '/configuracoes/perfil-publico', descricao: 'Apresentação, imagens e contatos na Rede EDA', icone: 'perfil' },
];

const CONTA: NavItem[] = [
  { label: 'Configurações', href: '/configuracoes', icone: 'engrenagem' },
  { label: 'Planos', href: '/planos', icone: 'diamante' },
  { label: 'Ver portal público', href: '/', icone: 'idiomas' },
];

const normalizar = (texto: string) => texto.normalize('NFD').replace(/[\u0300-\u036f]/g, '').toLowerCase().trim();

const FOCO =
  'focus-visible:outline focus-visible:outline-2 ' +
  'focus-visible:outline-offset-2 focus-visible:outline-[#E3A144]';

function rotaAtiva(pathname: string, href: string): boolean {
  if (href === '/' || href === '/dashboard' || href === '/financeiro') {
    return pathname === href;
  }
  if (href === '/reservas' && pathname.startsWith('/reservas/ao-vivo')) return false;
  return pathname === href || pathname.startsWith(`${href}/`);
}

function LinkLateral({ item, pathname, aoNavegar, compacto = false }: { item: NavItem; pathname: string; aoNavegar: () => void; compacto?: boolean }) {
  const ativo = rotaAtiva(pathname, item.href);
  return (
    <Link
      href={item.href}
      onClick={aoNavegar}
      aria-current={ativo ? 'page' : undefined}
      title={compacto ? item.label : item.descricao}
      aria-label={compacto ? item.label : undefined}
      className={`flex min-h-10 items-center gap-3 rounded-xl text-[13.5px] ${compacto ? 'justify-center px-0' : 'px-3'} font-semibold transition-colors motion-reduce:transition-none ${FOCO} ${
        ativo
          ? 'bg-gradient-to-b from-[#F7D595] to-[#E3A144] text-[#07110E] shadow-[inset_0_1px_0_rgb(255_255_255/55%)]'
          : 'text-[#CDD8D2] hover:bg-white/[0.06] hover:text-white'
      }`}
    >
      <IconeERN nome={item.icone} tamanho={18} className="shrink-0" />
      {!compacto && <span className="truncate">{item.label}</span>}
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
  const [saindo, setSaindo] = useState(false);
  const [erroSaida, setErroSaida] = useState<string | null>(null);

  const dialogRef = useRef<HTMLDialogElement>(null);
  const saidaEmAndamento = useRef(false);

  // A marca do painel é sempre Encantos Gestão (o nome antigo salvo no banco não se sobrepõe).
  const nomeSistema = 'Encantos Gestão';
  void config;



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

  const itensRede: NavItem[] = acessoEditorial
    ? [
        ...REDE,
        { label: 'Comando EDA', href: '/comando', descricao: 'Perfil oficial e publicações editoriais da plataforma', icone: 'estrela' },
      ]
    : REDE;
  const itensConta = CONTA;
  const [busca, setBusca] = useState('');
  const [gruposAbertos, setGruposAbertos] = useState<string[]>(() =>
    GRUPOS.filter(grupo => grupo.itens.some(item => rotaAtiva(pathname, item.href))).map(grupo => grupo.id));
  const buscaRef = useRef<HTMLInputElement>(null);
  // ERN_MENU_HOVER_V2: menu fica estreito (só ícones) e se amplia sobre o conteúdo
  // ao passar o mouse ou ao navegar pelo teclado; recolhe sozinho ao sair.
  const [recolhido, setRecolhido] = useState(true);
  const temporizadorMenu = useRef<ReturnType<typeof setTimeout> | undefined>(undefined);
  useEffect(() => {
    document.documentElement.style.setProperty('--ern-menu-largura', '76px');
    return () => clearTimeout(temporizadorMenu.current);
  }, []);
  function ampliarMenu(): void {
    clearTimeout(temporizadorMenu.current);
    temporizadorMenu.current = setTimeout(() => setRecolhido(false), 80);
  }
  function recolherMenu(): void {
    clearTimeout(temporizadorMenu.current);
    temporizadorMenu.current = setTimeout(() => {
      // Não recolhe enquanto o usuário digita na busca do menu.
      if (document.activeElement !== buscaRef.current) setRecolhido(true);
    }, 160);
  }
  function fecharMenus(): void {
    setMobileAberto(false);
    setBusca('');
  }

  useEffect(() => {
    setMobileAberto(false);
    setBusca('');
    // Abre automaticamente o grupo da página atual.
    const atual = GRUPOS.find(grupo => grupo.itens.some(item => rotaAtiva(pathname, item.href)));
    if (atual) setGruposAbertos(abertos => abertos.includes(atual.id) ? abertos : [...abertos, atual.id]);
  }, [pathname]);

  // Ctrl+K (ou Cmd+K) leva à busca do menu.
  useEffect(() => {
    function aoPressionar(evento: KeyboardEvent): void {
      if ((evento.ctrlKey || evento.metaKey) && evento.key.toLowerCase() === 'k') {
        evento.preventDefault();
        if (window.matchMedia('(min-width: 1280px)').matches) {
          clearTimeout(temporizadorMenu.current);
          setRecolhido(false);
          setTimeout(() => buscaRef.current?.focus(), 60);
        }
        else setMobileAberto(true);
      }
    }
    document.addEventListener('keydown', aoPressionar);
    return () => document.removeEventListener('keydown', aoPressionar);
  }, []);

  useEffect(() => {
    const media = window.matchMedia('(min-width: 1280px)');
    function ajustarMenus(): void {
      if (media.matches) setMobileAberto(false);
    }
    media.addEventListener('change', ajustarMenus);
    return () => media.removeEventListener('change', ajustarMenus);
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
    if (!dialog.open) dialog.showModal();
    return () => {
      document.body.style.overflow = overflowAnterior;
      if (dialog.open) dialog.close();
    };
  }, [mobileAberto]);

  async function sair(): Promise<void> {
    if (saidaEmAndamento.current) return;
    saidaEmAndamento.current = true;
    setSaindo(true);
    setErroSaida(null);
    try {
      const { error } = await supabase.auth.signOut();
      if (error) throw error;
      window.location.assign('/acesso');
    } catch {
      setErroSaida('Não foi possível sair da conta. Verifique sua conexão e tente novamente.');
    } finally {
      saidaEmAndamento.current = false;
      setSaindo(false);
    }
  }

  const termo = normalizar(busca);
  const combina = (item: NavItem) => !termo || normalizar(`${item.label} ${item.descricao ?? ''}`).includes(termo);
  const iniciais = (nomeContaERN || 'EDA').split(/\s+/).filter(Boolean).slice(0, 2).map(parte => parte[0]?.toUpperCase()).join('');

  function menuCompacto() {
    const todos = [
      ...principaisVisiveisERN,
      ...gruposVisiveisERN.flatMap(grupo => grupo.itens),
      ...itensRede.filter(linkPermitidoERN),
      ...itensConta.filter(linkPermitidoERN),
    ];
    return (
      <nav aria-label="Navegação principal" className="mt-3 grid gap-1">
        <button type="button" onClick={() => { clearTimeout(temporizadorMenu.current); setRecolhido(false); setTimeout(() => buscaRef.current?.focus(), 60); }} title="Buscar no menu (Ctrl K)" aria-label="Buscar no menu" className={`grid min-h-10 place-items-center rounded-xl border border-white/10 bg-white/[0.04] text-[#8FA39A] hover:text-white ${FOCO}`}>
          <IconeERN nome="busca" tamanho={17} />
        </button>
        {avisoModulosERN}
        {todos.map((item, i) => (
          <div key={item.href} className={i === principaisVisiveisERN.length ? 'mt-1 border-t border-white/[0.07] pt-1' : undefined}>
            <LinkLateral item={item} pathname={pathname} aoNavegar={fecharMenus} compacto />
          </div>
        ))}
      </nav>
    );
  }

  function conteudoMenu(contexto: 'lateral' | 'movel') {
    const principais = principaisVisiveisERN.filter(combina);
    const grupos = gruposVisiveisERN.map(grupo => ({ ...grupo, itens: grupo.itens.filter(combina) })).filter(grupo => grupo.itens.length > 0);
    const rede = itensRede.filter(linkPermitidoERN).filter(combina);
    const conta = itensConta.filter(linkPermitidoERN).filter(combina);
    const nada = !principais.length && !grupos.length && !rede.length && !conta.length;
    return (
      <>
        <label className="mt-3 flex min-h-10 items-center gap-2 rounded-xl border border-white/10 bg-white/[0.04] px-3 text-[#8FA39A] focus-within:border-[#E3A144]/60">
          <IconeERN nome="busca" tamanho={16} />
          <input
            ref={contexto === 'lateral' ? buscaRef : undefined}
            type="search"
            value={busca}
            onChange={evento => setBusca(evento.target.value)}
            placeholder="Buscar no menu…"
            aria-label="Buscar no menu"
            className="min-w-0 flex-1 bg-transparent text-[13px] text-[#F0F0E8] outline-none placeholder:text-[#8FA39A]"
          />
          {contexto === 'lateral' && <kbd className="rounded-md border border-white/15 px-1.5 text-[10.5px] text-[#8FA39A]">Ctrl K</kbd>}
        </label>

        <nav aria-label={contexto === 'lateral' ? 'Navegação principal' : 'Navegação mobile'} className="mt-3 grid gap-0.5">
          {avisoModulosERN}
          {principais.map(item => <LinkLateral key={item.href} item={item} pathname={pathname} aoNavegar={fecharMenus} />)}

          {grupos.map(grupo => {
            const aberto = Boolean(termo) || gruposAbertos.includes(grupo.id);
            return (
              <div key={grupo.id} className="mt-2">
                <button
                  type="button"
                  aria-expanded={aberto}
                  onClick={() => setGruposAbertos(abertos => abertos.includes(grupo.id) ? abertos.filter(id => id !== grupo.id) : [...abertos, grupo.id])}
                  className={`flex min-h-8 w-full items-center justify-between rounded-lg px-3 text-[10.5px] font-semibold uppercase tracking-[0.16em] text-[#7F968B] hover:text-[#CDD8D2] ${FOCO}`}
                >
                  {grupo.label}
                  <IconeERN nome="seta" tamanho={14} className={`transition-transform motion-reduce:transition-none ${aberto ? 'rotate-180' : ''}`} />
                </button>
                {aberto && <div className="grid gap-0.5">{grupo.itens.map(item => <LinkLateral key={item.href} item={item} pathname={pathname} aoNavegar={fecharMenus} />)}</div>}
              </div>
            );
          })}

          {rede.length > 0 && (
            <div className="mt-2">
              <p className="flex min-h-8 items-center px-3 text-[10.5px] font-semibold uppercase tracking-[0.16em] text-[#7F968B]">Rede EDA</p>
              <div className="grid gap-0.5">{rede.map(item => <LinkLateral key={item.href} item={item} pathname={pathname} aoNavegar={fecharMenus} />)}</div>
            </div>
          )}

          {conta.length > 0 && (
            <div className="mt-2 border-t border-white/[0.07] pt-2">
              {conta.map(item => <LinkLateral key={item.href} item={item} pathname={pathname} aoNavegar={fecharMenus} />)}
            </div>
          )}

          {nada && <p role="status" className="px-3 py-4 text-xs text-[#8FA39A]">Nada encontrado para “{busca}”.</p>}
        </nav>
      </>
    );
  }

  function rodapeConta() {
    return (
      <div className="grid gap-2">
        <TemaRapidoOperadoraERN />
        <EstiloPainelSeletorERN />
        <div className="flex items-center gap-3 rounded-2xl border border-white/[0.07] bg-white/[0.03] p-2.5">
          <span aria-hidden="true" className="grid size-9 shrink-0 place-items-center rounded-full bg-gradient-to-b from-[#F7D595] to-[#E3A144] text-xs font-extrabold text-[#07110E]">{iniciais}</span>
          <span className="min-w-0 flex-1">
            <span className="ern-conta-nome block truncate text-[13px] font-semibold text-[#F5F3EA]" title={nomeContaERN || undefined}>{nomeContaERN || 'Minha conta'}</span>
            <span className="block text-[11px] text-[#8FA39A]">Encantos Gestão</span>
          </span>
          <button
            type="button"
            disabled={saindo}
            onClick={() => void sair()}
            aria-label={saindo ? 'Saindo…' : 'Sair da conta'}
            title="Sair da conta"
            className={`grid size-9 shrink-0 place-items-center rounded-xl text-[#F2A9A9] hover:bg-rose-400/10 disabled:cursor-wait disabled:opacity-50 ${FOCO}`}
          >
            <IconeERN nome="sair" tamanho={18} />
          </button>
        </div>
        {erroSaida && <p role="alert" className="px-2 text-xs leading-5 text-rose-300">{erroSaida}</p>}
      </div>
    );
  }

  const atalhos: { label: string; href: string; icone: NomeIconeERN; destaque?: boolean }[] = [
    { label: 'Painel', href: '/dashboard', icone: 'casa' },
    { label: 'Reservas', href: '/reservas', icone: 'calendario' },
    { label: 'Nova', href: '/reservas/nova', icone: 'mais', destaque: true },
    { label: 'Financeiro', href: '/financeiro', icone: 'financeiro' },
  ];

  return (
    <>
      {/* Computador: menu lateral fixo */}
      <aside
        aria-label="Menu da Encantos Gestão"
        data-recolhido={recolhido || undefined}
        onMouseEnter={ampliarMenu}
        onMouseLeave={recolherMenu}
        onFocus={() => { clearTimeout(temporizadorMenu.current); setRecolhido(false); }}
        onBlur={evento => { if (!evento.currentTarget.contains(evento.relatedTarget as Node | null)) recolherMenu(); }}
        onKeyDown={evento => { if (evento.key === 'Escape') { setBusca(''); (document.activeElement as HTMLElement | null)?.blur(); setRecolhido(true); } }}
        className={`ern-menu-lateral ern-menu-fixo fixed inset-y-0 left-0 z-[60] hidden flex-col overflow-hidden border-r border-white/[0.07] bg-[#08130F] pb-3.5 pt-4 text-[#EDEDE3] transition-[width,box-shadow] duration-200 ease-out motion-reduce:transition-none xl:flex ${recolhido ? 'w-[76px] px-2.5' : 'w-[264px] px-3.5 shadow-[24px_0_60px_rgb(0_0_0/0.35)]'}`}
      >
        <div className={`flex items-center ${recolhido ? 'flex-col gap-2' : 'gap-2'}`}>
          <Link href="/dashboard" onClick={fecharMenus} aria-label={recolhido ? nomeSistema : undefined} className={`flex min-w-0 flex-1 items-center gap-2.5 rounded-xl ${recolhido ? 'justify-center' : 'px-1.5'} ${FOCO}`}>
            <LogoERN tamanho={38} prioridade />
            {!recolhido && <span className="min-w-0">
              <span className="block truncate font-[family-name:var(--font-inter)] text-base font-semibold text-[#F0F0E8]">{nomeSistema}</span>
              <span className="block whitespace-nowrap text-[8.5px] font-semibold uppercase tracking-[0.13em] text-[#F4C77E]">Gestão da operadora</span>
            </span>}
          </Link>
        </div>
        <div className="ern-menu-rolagem -mx-1 min-h-0 flex-1 overflow-y-auto px-1 pb-3">
          {recolhido ? menuCompacto() : conteudoMenu('lateral')}
        </div>
        {recolhido ? (
          <div className="grid justify-items-center gap-2">
            <span aria-hidden="true" title={nomeContaERN || 'Minha conta'} className="grid size-9 place-items-center rounded-full bg-gradient-to-b from-[#F7D595] to-[#E3A144] text-xs font-extrabold text-[#07110E]">{iniciais}</span>
            <button type="button" disabled={saindo} onClick={() => void sair()} aria-label="Sair da conta" title="Sair da conta" className={`grid size-9 place-items-center rounded-xl text-[#F2A9A9] hover:bg-rose-400/10 disabled:opacity-50 ${FOCO}`}>
              <IconeERN nome="sair" tamanho={18} />
            </button>
          </div>
        ) : rodapeConta()}
      </aside>

      {/* Celular e tablet: barra superior */}
      <header className="ern-menu-fixo fixed inset-x-0 top-0 z-50 flex h-16 items-center justify-between gap-3 border-b border-white/[0.08] bg-[#08130F]/95 px-4 text-[#EDEDE3] backdrop-blur xl:hidden">
        <Link href="/dashboard" onClick={fecharMenus} className={`flex min-w-0 items-center gap-2.5 rounded-xl ${FOCO}`}>
          <LogoERN tamanho={36} prioridade />
          <span className="min-w-0">
            <span className="block truncate font-[family-name:var(--font-inter)] text-[15px] font-semibold text-[#F0F0E8]">{nomeSistema}</span>
            <span className="block whitespace-nowrap text-[8.5px] font-semibold uppercase tracking-[0.13em] text-[#F4C77E]">Gestão da operadora</span>
          </span>
        </Link>
        <button
          type="button"
          aria-label="Abrir menu de navegação"
          aria-expanded={mobileAberto}
          aria-controls="menu-mobile-ern"
          aria-haspopup="dialog"
          onClick={() => setMobileAberto(true)}
          className={`grid size-11 shrink-0 place-items-center rounded-xl border border-white/15 bg-white/5 ${FOCO}`}
        >
          <IconeERN nome="menu" tamanho={22} />
        </button>
      </header>

      {/* Celular: atalhos na barra inferior */}
      <nav aria-label="Atalhos" className="ern-menu-fixo fixed inset-x-0 bottom-0 z-50 grid grid-cols-5 border-t border-white/[0.08] bg-[#08130F]/95 px-2 pt-1.5 text-[#CDD8D2] backdrop-blur md:hidden" style={{ paddingBottom: 'max(6px, env(safe-area-inset-bottom))' }}>
        {atalhos.filter(atalho => permiteLinkEquipeERN(atalho.href, modulosEquipeERN)).map(atalho => {
          const ativo = rotaAtiva(pathname, atalho.href);
          return (
            <Link key={atalho.href} href={atalho.href} aria-current={ativo ? 'page' : undefined} className={`flex flex-col items-center gap-0.5 rounded-xl py-1 text-[10.5px] font-semibold ${FOCO} ${ativo ? 'text-[#F7D595]' : ''}`}>
              <span className={`grid place-items-center ${atalho.destaque ? 'size-9 rounded-full bg-gradient-to-b from-[#F7D595] to-[#E3A144] text-[#07110E]' : 'size-7'}`}><IconeERN nome={atalho.icone} tamanho={atalho.destaque ? 20 : 21} /></span>
              {atalho.label}
            </Link>
          );
        })}
        <button type="button" onClick={() => setMobileAberto(true)} className={`flex flex-col items-center gap-0.5 rounded-xl py-1 text-[10.5px] font-semibold ${FOCO}`}>
          <span className="grid size-7 place-items-center"><IconeERN nome="menu" tamanho={21} /></span>
          Menu
        </button>
      </nav>

      <dialog
        ref={dialogRef}
        id="menu-mobile-ern"
        aria-labelledby="titulo-menu-mobile"
        className="menu-mobile ern-menu-fixo"
        onCancel={(evento) => {
          evento.preventDefault();
          setMobileAberto(false);
        }}
        onClick={(evento) => {
          if (evento.target !== evento.currentTarget) return;
          const limites = evento.currentTarget.getBoundingClientRect();
          if (evento.clientX < limites.left || evento.clientX > limites.right || evento.clientY < limites.top || evento.clientY > limites.bottom) {
            setMobileAberto(false);
          }
        }}
      >
        <div className="flex h-full flex-col px-4 pt-4" style={{ paddingBottom: 'max(16px, env(safe-area-inset-bottom))' }}>
          <div className="flex shrink-0 items-center justify-between gap-3">
            <div className="flex items-center gap-2.5">
              <LogoERN tamanho={34} />
              <h2 id="titulo-menu-mobile" className="font-[family-name:var(--font-inter)] text-base font-semibold text-[#F0F0E8]">{nomeSistema}</h2>
            </div>
            <button type="button" aria-label="Fechar menu de navegação" onClick={() => setMobileAberto(false)} className={`grid size-11 place-items-center rounded-xl border border-white/15 ${FOCO}`}>
              <IconeERN nome="fechar" tamanho={20} />
            </button>
          </div>
          <div className="min-h-0 flex-1 overflow-y-auto overscroll-contain pb-4">{conteudoMenu('movel')}</div>
          {rodapeConta()}
        </div>
      </dialog>

      <style jsx>{`
        .ern-menu-rolagem { scrollbar-width: thin; scrollbar-color: #2b4038 transparent; }
        .menu-mobile {
          position: fixed;
          inset: 0 auto 0 0;
          box-sizing: border-box;
          width: min(88vw, 360px);
          max-width: none;
          height: 100dvh;
          max-height: none;
          margin: 0;
          padding: 0;
          overflow: hidden;
          border: 0;
          border-right: 1px solid rgb(227 161 68 / 20%);
          border-radius: 0 22px 22px 0;
          background: #08130f;
          color: #edede3;
          box-shadow: 20px 0 80px rgb(0 0 0 / 35%);
          opacity: 0;
          transform: translateX(-100%);
          transition: opacity 200ms ease, transform 240ms cubic-bezier(.2,.8,.2,1), display 180ms allow-discrete, overlay 180ms allow-discrete;
        }
        .menu-mobile[open] { opacity: 1; transform: translateX(0); }
        .menu-mobile::backdrop {
          background: rgb(0 0 0 / 0%);
          backdrop-filter: blur(3px);
          transition: background 180ms ease, display 180ms allow-discrete, overlay 180ms allow-discrete;
        }
        .menu-mobile[open]::backdrop { background: rgb(0 0 0 / 65%); }
        @starting-style {
          .menu-mobile[open] { opacity: 0; transform: translateX(-100%); }
          .menu-mobile[open]::backdrop { background: rgb(0 0 0 / 0%); }
        }
        @media (prefers-reduced-motion: reduce) {
          .menu-mobile, .menu-mobile::backdrop { transition: none; }
          .menu-mobile { transform: none; }
        }
      `}</style>
    </>
  );
}
