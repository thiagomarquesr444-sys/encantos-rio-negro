'use client';

// EDA_VOLTAR_V1: toda página da gestão tem "Voltar", e voltar sempre leva à página anterior.
// - Guarda o caminho percorrido nesta aba (só da gestão) para saber se há página anterior.
// - Os botões/links de voltar que já existem nas páginas passam a usar o mesmo comportamento.
// - Sem página anterior (aba aberta direto pelo link), volta para o nível de cima.
import { useCallback, useEffect, useState } from 'react';
import { usePathname, useRouter } from 'next/navigation';

const CHAVE = 'eda.trilha.v1';

function lerTrilha(): string[] {
  try { const v = JSON.parse(sessionStorage.getItem(CHAVE) ?? '[]'); return Array.isArray(v) ? v.filter((x) => typeof x === 'string') : []; } catch { return []; }
}
function gravarTrilha(t: string[]) { try { sessionStorage.setItem(CHAVE, JSON.stringify(t.slice(-30))); } catch { /* sem armazenamento */ } }

function nivelAcima(caminho: string) {
  const partes = caminho.split('?')[0].split('/').filter(Boolean);
  if (partes.length <= 1) return '/dashboard';
  // /demandas/editar/123 → /demandas ; /reservas/nova → /reservas
  if (partes.length >= 3 || ['novo', 'nova'].includes(partes[1])) return `/${partes[0]}`;
  return `/${partes.slice(0, -1).join('/')}`;
}

function ehVoltar(el: Element): boolean {
  if (el.closest('[data-eda-sem-voltar]')) return false;
  if (el.hasAttribute('data-eda-voltar')) return true;
  if (el instanceof HTMLButtonElement && el.type === 'submit') return false;
  const classe = typeof el.className === 'string' ? el.className : '';
  if (/(^|\s|-)voltar(\s|$)/.test(classe)) return true;
  const texto = (el.textContent ?? '').replace(/\s+/g, ' ').trim();
  // Links: "← Reservas", "Voltar às reservas"… Botões só quando marcados (classe "voltar" ou data-eda-voltar):
  // "Voltar" dentro de painéis e janelas fecha o painel, e setas de carrossel não são "voltar página".
  if (el.closest('[role="dialog"], dialog')) return false;
  return el instanceof HTMLAnchorElement && (/^←/.test(texto) || /^voltar\b/i.test(texto));
}

export default function VoltarEDA() {
  const pathname = usePathname() ?? '';
  const router = useRouter();
  const [mostrar, setMostrar] = useState(false);

  // Registra a navegação desta aba (sem repetir a mesma página).
  useEffect(() => {
    if (!pathname) return;
    const t = lerTrilha();
    if (t[t.length - 1] !== pathname) {
      if (t[t.length - 2] === pathname) t.pop(); // voltou pelo navegador
      else t.push(pathname);
      gravarTrilha(t);
    }
  }, [pathname]);

  const voltar = useCallback((reserva?: string) => {
    const t = lerTrilha();
    if (t.length > 1) {
      t.pop();
      gravarTrilha(t);
      router.back();
      return;
    }
    const destino = reserva && reserva.startsWith('/') && reserva !== pathname ? reserva : nivelAcima(pathname);
    gravarTrilha([destino]);
    router.push(destino);
  }, [pathname, router]);

  // Os "voltar" das próprias páginas passam a voltar para a página anterior.
  useEffect(() => {
    const aoClicar = (e: MouseEvent) => {
      if (e.defaultPrevented || e.button !== 0 || e.metaKey || e.ctrlKey || e.shiftKey || e.altKey) return;
      const alvo = (e.target as Element | null)?.closest('a, button');
      if (!alvo || !alvo.closest('.ern-gestao-conteudo') || !ehVoltar(alvo)) return;
      if (alvo instanceof HTMLButtonElement && alvo.disabled) return;
      e.preventDefault();
      e.stopPropagation();
      const href = alvo instanceof HTMLAnchorElement ? alvo.getAttribute('href') ?? undefined : undefined;
      voltar(href);
    };
    document.addEventListener('click', aoClicar, true);
    return () => document.removeEventListener('click', aoClicar, true);
  }, [voltar]);

  // Mostra o botão geral só onde a página ainda não tem o seu.
  useEffect(() => {
    setMostrar(false);
    if (pathname === '/dashboard') return;
    const conferir = () => {
      const conteudo = document.querySelector('.ern-gestao-conteudo');
      if (!conteudo) return;
      const proprio = Array.from(conteudo.querySelectorAll('a, button')).some((el) => !el.closest('.eda-voltar-geral') && ehVoltar(el));
      setMostrar(!proprio);
    };
    const t1 = window.setTimeout(conferir, 250);
    const t2 = window.setTimeout(conferir, 1500); // páginas que carregam dados antes de montar o cabeçalho
    return () => { window.clearTimeout(t1); window.clearTimeout(t2); };
  }, [pathname]);

  if (!mostrar) return null;
  return (
    <div className="eda-voltar-geral">
      <button type="button" data-eda-voltar="" onClick={(e) => { e.preventDefault(); voltar(); }} aria-label="Voltar para a página anterior">
        <span aria-hidden="true">←</span> Voltar
      </button>
      <style>{`
        .eda-voltar-geral{padding:14px 16px 0;max-width:80rem;margin:0 auto}
        .eda-voltar-geral button{display:inline-flex;align-items:center;gap:8px;min-height:40px;padding:0 14px;border-radius:999px;
          border:1px solid var(--ern-borda,rgba(237,237,227,.18));background:transparent;color:var(--ern-texto,#edede3);
          font-size:13px;font-weight:600;cursor:pointer;transition:border-color .15s,color .15s}
        .eda-voltar-geral button:hover{border-color:var(--ern-destaque,#e3a144);color:var(--ern-destaque,#e3a144)}
        .eda-voltar-geral button:focus-visible{outline:2px solid var(--ern-destaque,#e3a144);outline-offset:3px}
        @media (min-width:640px){.eda-voltar-geral{padding:18px 32px 0}}
      `}</style>
    </div>
  );
}
