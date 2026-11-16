'use client';

/*
  EDA_FORNECEDOR_MENU_V1 — menu lateral do fornecedor/artesão no mesmo
  padrão da gestão da operadora: lateral no computador, barra + gaveta no celular.
  Só aponta para páginas que existem (sem links quebrados).
*/
import { useEffect, useRef, useState } from 'react';
import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { supabase } from '@/lib/supabase';
import LogoERN from '@/app/components/LogoERN';
import IconeERN, { type NomeIconeERN } from '@/app/components/IconeERN';

type Item = { href: string; label: string; icone: NomeIconeERN; externo?: boolean };

const PRINCIPAL: Item[] = [
  { href: '/fornecedor', label: 'Início', icone: 'casa' },
  { href: '/fornecedor/vitrine', label: 'Minha vitrine', icone: 'diamante' },
  { href: '/fornecedor/perfil', label: 'Meu perfil', icone: 'perfil' },
];

const PORTAL: Item[] = [
  { href: '/artesanato', label: 'Ver no Portal', icone: 'estrela', externo: true },
  { href: '/rede', label: 'Rede EDA', icone: 'rio', externo: true },
];

function ativo(pathname: string, href: string) {
  return href === '/fornecedor' ? pathname === href : pathname === href || pathname.startsWith(href + '/');
}

export default function MenuLateralFornecedorEDA() {
  const pathname = usePathname() ?? '';
  const [aberto, setAberto] = useState(false);
  const [nome, setNome] = useState('');
  const [saindo, setSaindo] = useState(false);
  const saida = useRef(false);

  useEffect(() => {
    let vivo = true;
    void (async () => {
      const { data } = await supabase.auth.getUser();
      if (!data.user || !vivo) return;
      const { data: perfil } = await supabase
        .from('perfis_profissionais')
        .select('nome')
        .eq('usuario_id', data.user.id)
        .eq('tipo', 'fornecedor')
        .maybeSingle();
      if (vivo) setNome(perfil?.nome ?? '');
    })();
    return () => {
      vivo = false;
    };
  }, []);

  useEffect(() => setAberto(false), [pathname]);

  async function sair() {
    if (saida.current) return;
    saida.current = true;
    setSaindo(true);
    try {
      await supabase.auth.signOut();
      window.location.assign('/login?acesso=fornecedor');
    } finally {
      saida.current = false;
      setSaindo(false);
    }
  }

  const iniciais = (nome || 'F').trim().split(/\s+/).slice(0, 2).map((p) => p[0]).join('').toUpperCase();

  const link = (item: Item) => (
    <Link
      key={item.href}
      href={item.href}
      target={item.externo ? '_blank' : undefined}
      aria-current={ativo(pathname, item.href) ? 'page' : undefined}
      className={`flex min-h-11 items-center gap-3 rounded-xl px-3 text-[13.5px] font-medium transition ${
        ativo(pathname, item.href)
          ? 'bg-[#E3A144]/12 text-[#F4C77E] shadow-[inset_2px_0_0_#E3A144]'
          : 'text-[#B4C8BB] hover:bg-white/[0.04] hover:text-[#F0F0E8]'
      }`}
    >
      <IconeERN nome={item.icone} tamanho={18} className="shrink-0" />
      <span className="truncate">{item.label}</span>
      {item.externo && <span aria-hidden="true" className="ml-auto text-xs opacity-60">↗</span>}
    </Link>
  );

  const conteudo = (
    <div className="flex h-full flex-col">
      <Link href="/fornecedor" className="flex items-center gap-3 px-2 py-1">
        <LogoERN tamanho={40} />
        <span className="min-w-0">
          <span className="block truncate text-base font-semibold text-[#F0F0E8]">Encantos da Amazônia AI</span>
          <span className="block text-[8.5px] font-semibold uppercase tracking-[0.13em] text-[#F4C77E]">Espaço do fornecedor</span>
        </span>
      </Link>

      <nav aria-label="Navegação do fornecedor" className="mt-6 grid gap-0.5">
        {PRINCIPAL.map(link)}
      </nav>
      <p className="mt-6 px-3 text-[10.5px] font-semibold uppercase tracking-[0.16em] text-[#7F968B]">Portal público</p>
      <nav aria-label="Portal público" className="mt-1 grid gap-0.5">
        {PORTAL.map(link)}
      </nav>

      <div className="mt-auto grid gap-2 pt-6">
        <div className="flex items-center gap-3 rounded-2xl border border-white/[0.07] bg-white/[0.03] p-2.5">
          <span aria-hidden="true" className="grid size-9 shrink-0 place-items-center rounded-full bg-gradient-to-b from-[#F7D595] to-[#E3A144] text-xs font-extrabold text-[#07110E]">
            {iniciais}
          </span>
          <span className="min-w-0 flex-1">
            <span className="block truncate text-[13px] font-semibold text-[#F5F3EA]">{nome || 'Minha conta'}</span>
            <span className="block text-[11px] text-[#8FA39A]">Fornecedor independente</span>
          </span>
        </div>
        <button
          type="button"
          onClick={() => void sair()}
          disabled={saindo}
          className="flex min-h-11 items-center gap-3 rounded-xl px-3 text-[13.5px] text-[#B4C8BB] hover:bg-white/[0.04] hover:text-[#F0F0E8] disabled:opacity-50"
        >
          <IconeERN nome="sair" tamanho={18} />
          {saindo ? 'Saindo…' : 'Sair da conta'}
        </button>
      </div>
    </div>
  );

  return (
    <>
      {/* Computador: lateral fixa */}
      <aside className="fixed inset-y-0 left-0 z-40 hidden w-[264px] border-r border-white/[0.07] bg-[#08130F] p-4 xl:block">
        {conteudo}
      </aside>

      {/* Celular/tablet: barra no topo + gaveta */}
      <header className="fixed inset-x-0 top-0 z-40 flex h-16 items-center justify-between border-b border-white/[0.07] bg-[#08130F]/95 px-4 backdrop-blur xl:hidden">
        <Link href="/fornecedor" className="flex items-center gap-2">
          <LogoERN tamanho={34} />
          <span className="text-sm font-semibold text-[#F0F0E8]">Espaço do fornecedor</span>
        </Link>
        <button
          type="button"
          aria-label={aberto ? 'Fechar menu' : 'Abrir menu'}
          aria-expanded={aberto}
          onClick={() => setAberto((v) => !v)}
          className="grid size-11 place-items-center rounded-xl border border-white/10 text-[#F0F0E8]"
        >
          <IconeERN nome={aberto ? 'fechar' : 'menu'} tamanho={20} />
        </button>
      </header>
      {aberto && (
        <div className="fixed inset-0 z-50 xl:hidden" role="dialog" aria-modal="true" aria-label="Menu do fornecedor">
          <button type="button" aria-label="Fechar menu" className="absolute inset-0 bg-black/60" onClick={() => setAberto(false)} />
          <div className="absolute inset-y-0 left-0 w-[280px] max-w-[85vw] bg-[#08130F] p-4 shadow-2xl">{conteudo}</div>
        </div>
      )}
    </>
  );
}
