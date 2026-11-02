'use client';
import type { ReactNode } from 'react';
import Link from 'next/link';
import LogoERN from './LogoERN';
import './acesso-premium-ern.css';

// ERN_ACESSO_PREMIUM_V2
// Moldura das telas de login, cadastro e recuperação no padrão Encantos da
// Amazônia: foto do Encontro das Águas, promessa clara, escolha do perfil
// e o cartão do formulário. A lógica de autenticação fica nas páginas.

type Perfil = 'operadora' | 'guia' | 'fornecedor';
type Props = { children: ReactNode; etapa: 'login' | 'cadastro' | 'recuperacao' | 'acesso' | 'senha'; perfil?: Perfil | null };

const PERFIS: { id: Perfil; nome: string; icone: string }[] = [
  { id: 'operadora', nome: 'Operadora', icone: '🏢' },
  { id: 'guia', nome: 'Guia', icone: '🧭' },
  { id: 'fornecedor', nome: 'Fornecedor', icone: '🚤' },
];

const BENEFICIOS: Record<Perfil | 'geral', [string, string][]> = {
  geral: [
    ['📅', 'Reservas, clientes e financeiro em um só lugar'],
    ['🏹', 'Sua vitrine na Rede EDA e no mapa de Destinos'],
    ['💬', 'Visitantes chamando você direto no WhatsApp'],
  ],
  operadora: [
    ['📅', 'Reservas, clientes, vouchers e financeiro da empresa'],
    ['👥', 'Equipe com acessos por função'],
    ['🏹', 'Perfil verificado na Rede EDA e no mapa de Destinos'],
  ],
  guia: [
    ['🧭', 'Perfil profissional próprio, independente das operadoras'],
    ['📍', 'Suas experiências no mapa de cada cidade'],
    ['💬', 'Contato direto com visitantes pelo WhatsApp'],
  ],
  fornecedor: [
    ['🚤', 'Barcos, hospedagens, transporte e serviços em destaque'],
    ['🤝', 'Conexão com as operadoras da região'],
    ['🏹', 'Presença na Rede EDA para quem planeja a viagem'],
  ],
};

export default function AcessoPremiumERN({ children, etapa, perfil }: Props) {
  const cadastrar = etapa === 'cadastro';
  const recuperar = etapa === 'recuperacao' || etapa === 'senha';
  const mostrarPerfis = etapa === 'login' || etapa === 'cadastro';
  const nome = perfil === 'operadora' ? 'Operadora de turismo' : perfil === 'guia' ? 'Guia de turismo' : perfil === 'fornecedor' ? 'Fornecedor da Rede' : 'Acesso profissional';
  const beneficios = BENEFICIOS[perfil ?? 'geral'];

  return <main className="ern-acesso-premium ern-acesso-v2" data-etapa={etapa}>
    <header className="ern-acesso-topo">
      <Link href="/" className="ern-acesso-marca" aria-label="Encantos da Amazônia — voltar ao portal">
        <LogoERN tamanho={44} prioridade />
        <span><strong>Encantos Gestão</strong><small>PARA QUEM FAZ O TURISMO NO AMAZONAS</small></span>
      </Link>
      <Link href="/operadores" className="ern-acesso-voltar"><span aria-hidden="true">←</span> Conhecer a plataforma</Link>
    </header>
    <div className="ern-acesso-grade">
      {etapa !== 'acesso' && <aside className="ern-acesso-manifesto" aria-label="Boas-vindas à Encantos Gestão">
        <picture className="ern-acesso-foto" aria-hidden="true">
          <source media="(max-width: 767px)" srcSet="/images/fundo/encontro-das-aguas-celular.jpg" />
          {/* eslint-disable-next-line @next/next/no-img-element */}
          <img src="/images/fundo/encontro-das-aguas-1920.jpg" alt="" />
        </picture>
        <div className="ern-acesso-manifesto-texto">
          <span className="ern-acesso-etiqueta"><i aria-hidden="true" />{nome}</span>
          <h2>{recuperar
            ? <>Retome seu acesso.<br /><em>Sua operação espera.</em></>
            : cadastrar
              ? <>Sua vitrine na Amazônia<br /><em>começa aqui.</em></>
              : <>A Amazônia conecta.<br /><em>Você faz acontecer.</em></>}</h2>
          {!recuperar && <ul className="ern-acesso-beneficios">
            {beneficios.map(([icone, texto]) => <li key={texto}><span aria-hidden="true">{icone}</span>{texto}</li>)}
          </ul>}
          {recuperar && <p>Recupere o acesso para continuar sua jornada na Encantos da Amazônia.</p>}
        </div>
      </aside>}
      <div className="ern-acesso-formulario">
        {mostrarPerfis && <nav className="ern-acesso-perfis" aria-label="Eu sou">
          <span>Eu sou</span>
          <div>
            {PERFIS.map(item => <Link key={item.id} href={`/login?acesso=${item.id}`} replace scroll={false} aria-current={perfil === item.id ? 'true' : undefined}>
              <span aria-hidden="true">{item.icone}</span>{item.nome}
            </Link>)}
          </div>
        </nav>}
        {children}
      </div>
    </div>
    <footer className="ern-acesso-base"><span>Encantos Gestão · do Rio Negro a Parintins</span><nav aria-label="Informações da plataforma"><Link href="/privacidade">Privacidade</Link><Link href="/termos">Termos</Link><Link href="/contato">Atendimento</Link></nav></footer>
  </main>;
}
