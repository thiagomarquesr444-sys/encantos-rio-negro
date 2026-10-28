'use client';

import { useEffect, useState } from 'react';
import { usePathname } from 'next/navigation';
import { supabase } from '@/lib/supabase';

const ROTAS: ReadonlyArray<readonly [string, string]> = [
  ['/configuracoes/equipe', 'equipe'],
  ['/configuracoes/publicacoes', 'publicacoes'],
  ['/configuracoes/perfil-publico', 'perfil_publico'],
  ['/configuracoes', 'configuracoes'],
  ['/dashboard/mapa', 'mapa'],
    ['/dashboard/pesca-esportiva', 'passeios'],
  ['/financeiro', 'financeiro'],
  ['/clientes', 'clientes'],
  ['/reservas', 'reservas'],
  ['/passeios', 'passeios'],
  ['/vouchers', 'vouchers'],
  ['/hospedagens', 'hospedagens'],
  ['/embarcacoes', 'embarcacoes'],
  ['/guias', 'guias'],
  ['/parceiros', 'parceiros'],
  ['/demandas', 'demandas'],
  ['/relatorios', 'relatorios'],
  ['/planos', 'planos'],
];

export function permiteLinkEquipeERN(
  href: string,
  modulos: ReadonlySet<string>,
): boolean {
  const [caminhoBruto, fragmento] = href.split('#');
  const caminho = caminhoBruto.replace(/\/+$/, '') || '/';

  // O comando editorial mantém sua verificação específica na Sidebar
  // e sua autorização própria no servidor.
  if (
    caminho === '/' ||
    caminho === '/comando' ||
    caminho.startsWith('/comando/')
  ) {
    return true;
  }

  if (caminho === '/fiscal') {
    return modulos.has('__ern_fiscal_perfil_autorizado') &&
      ['financeiro', 'relatorios'].some(
        modulo => modulos.has(modulo)
      );
  }

  if (caminho === '/documentos') {
    return ['vouchers', 'relatorios', 'financeiro'].some(
      modulo => modulos.has(modulo)
    );
  }

  if (caminho === '/dashboard') {
    return modulos.has(fragmento === 'mapa-ern' ? 'mapa' : 'painel');
  }

  for (const [rota, modulo] of ROTAS) {
    if (caminho === rota || caminho.startsWith(`${rota}/`)) {
      return modulos.has(modulo);
    }
  }

  return false;
}

type Estado = {
  modulos: ReadonlySet<string>;
  carregando: boolean;
  erro: boolean;
};

export function useModulosEquipeERN(): Estado {
  const pathname = usePathname();

  const [estado, setEstado] = useState<Estado>({
    modulos: new Set<string>(),
    carregando: true,
    erro: false,
  });

  useEffect(() => {
    let ativo = true;
    let versao = 0;
    let tarefa: ReturnType<typeof setTimeout> | undefined;

    async function carregar(operacao: number) {
      try {
        const { data, error } = await supabase.rpc(
          'ern_listar_meus_modulos',
        );

        if (!ativo || operacao !== versao) return;

        const linhas: unknown = data;

        if (
          error ||
          !Array.isArray(linhas) ||
          !linhas.every(
            (linha: unknown) =>
              linha !== null &&
              typeof linha === 'object' &&
              'modulo' in linha &&
              typeof linha.modulo === 'string',
          )
        ) {
          throw new Error('Permissões indisponíveis.');
        }

        const modulos = new Set<string>();

        for (const linha of linhas) {
          if (
            linha !== null &&
            typeof linha === 'object' &&
            'modulo' in linha &&
            typeof linha.modulo === 'string'
          ) {
            modulos.add(linha.modulo);
          }
        }

        // Marcador local de visibilidade, nao e autorizacao do servidor.
        // Falha de consulta oculta somente o link fiscal.
        if (
          modulos.has('financeiro') ||
          modulos.has('relatorios')
        ) {
          try {
            const { data: autenticacao, error: erroAuth } =
              await supabase.auth.getUser();

            if (!erroAuth && autenticacao.user) {
              const { data: perfil, error: erroPerfil } =
                await supabase
                  .from('perfis')
                  .select('role,empresa_id')
                  .eq('id', autenticacao.user.id)
                  .maybeSingle();

              if (
                !erroPerfil &&
                perfil?.empresa_id &&
                (
                  perfil.role === 'admin_empresa' ||
                  perfil.role === 'financeiro' ||
                  perfil.role === 'admin_plataforma'
                )
              ) {
                modulos.add('__ern_fiscal_perfil_autorizado');
              }
            }
          } catch {
            // Nenhuma permissao fiscal e presumida.
          }
        }

        if (!ativo || operacao !== versao) return;

        setEstado({
          modulos,
          carregando: false,
          erro: false,
        });
      } catch {
        if (!ativo || operacao !== versao) return;

        setEstado({
          modulos: new Set<string>(),
          carregando: false,
          erro: true,
        });
      }
    }

    function atualizar() {
      const operacao = ++versao;
      clearTimeout(tarefa);

      setEstado({
        modulos: new Set<string>(),
        carregando: true,
        erro: false,
      });

      // Agenda fora do callback de autenticação do Supabase.
      tarefa = setTimeout(() => {
        if (ativo && operacao === versao) {
          void carregar(operacao);
        }
      }, 0);
    }

    function aoRetornar() {
      if (!document.hidden) atualizar();
    }

    const { data: assinatura } = supabase.auth.onAuthStateChange(
      () => atualizar(),
    );

    atualizar();
    document.addEventListener('visibilitychange', aoRetornar);

    return () => {
      ativo = false;
      versao += 1;
      clearTimeout(tarefa);
      assinatura.subscription.unsubscribe();
      document.removeEventListener('visibilitychange', aoRetornar);
    };
  }, [pathname]);

  return estado;
}