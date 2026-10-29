'use client';
import type { ReactNode } from 'react';
import Link from 'next/link';
import LogoERN from './LogoERN';
import './acesso-premium-ern.css';
type Props = { children: ReactNode; etapa: 'login' | 'cadastro' | 'recuperacao' | 'acesso' | 'senha'; perfil?: 'operadora' | 'guia' | 'fornecedor' | null };
export default function AcessoPremiumERN({ children, etapa, perfil }: Props) {
  const cadastrar = etapa === 'cadastro';
  const recuperar = etapa === 'recuperacao' || etapa === 'senha';
  const nome = perfil === 'operadora' ? 'OPERADORA DE TURISMO' : perfil === 'guia' ? 'GUIA INDEPENDENTE' : perfil === 'fornecedor' ? 'FORNECEDOR DA REDE' : 'REDE DE TURISMO';
  return <main className="ern-acesso-premium" data-etapa={etapa}>
    <header className="ern-acesso-topo">
      <Link href="/" className="ern-acesso-marca" aria-label="Encantos Rio Negro — voltar ao portal">
        <LogoERN tamanho={48} prioridade />
        <span><strong>Encantos Rio Negro</strong><small>TERRITÓRIO DE POSSIBILIDADES</small></span>
      </Link>
      <Link href="/" className="ern-acesso-voltar">Explorar o portal <span aria-hidden="true">↗</span></Link>
    </header>
    <div className="ern-acesso-grade">
      <aside className="ern-acesso-manifesto" aria-label="Boas-vindas à ERN">
        <span className="ern-acesso-etiqueta"><i aria-hidden="true" />{nome}</span>
        <h2>{recuperar ? <>Retome sua conexão.<br /><em>Seu espaço espera.</em></> : cadastrar ? <>Sua jornada começa<br /><em>com uma conexão.</em></> : <>O Rio Negro conecta.<br /><em>Você faz acontecer.</em></>}</h2>
        <p>{recuperar ? 'Recupere o acesso para continuar sua jornada na Encantos Rio Negro.' : perfil === 'guia' ? 'Seu conhecimento do território encontra um espaço próprio na rede de turismo do Rio Negro.' : perfil === 'fornecedor' ? 'Produtos, serviços e relações que aproximam seu negócio de quem movimenta o turismo regional.' : 'Organize sua operação e construa novas conexões no Alto e Baixo Rio Negro.'}</p>
        <div className="ern-acesso-arte" aria-hidden="true">
          <svg viewBox="0 0 640 300" fill="none">
            <defs><linearGradient id="ern-rio-ouro" x1="50" y1="40" x2="600" y2="260" gradientUnits="userSpaceOnUse"><stop stopColor="#765d38"/><stop offset=".5" stopColor="#f1cd86"/><stop offset="1" stopColor="#84673e"/></linearGradient></defs>
            <g stroke="#c9d4bd" strokeOpacity=".08">{[35,70,105,140,175,210,245,280].map(y => <path key={y} d={`M0 ${y}H640`} />)}{[40,120,200,280,360,440,520,600].map(x => <path key={x} d={`M${x} 0V300`} />)}</g>
            <g stroke="url(#ern-rio-ouro)">
              <path d="M-30 235C80 270 65 115 175 145S270 280 350 165 440 40 525 85 575 190 680 120" strokeWidth="28" opacity=".05"/>
              <path d="M-30 235C80 270 65 115 175 145S270 280 350 165 440 40 525 85 575 190 680 120" strokeWidth="1.5"/>
              <path d="M8 261C110 280 97 143 174 167S282 299 372 176 457 68 524 107 604 212 660 161" opacity=".28"/>
              <path d="M175 145C178 100 133 69 180 15M350 165C310 137 317 66 281 25M525 85C554 40 592 55 610 0" opacity=".4"/>
            </g>
            {[[84,215],[175,145],[283,213],[350,165],[438,71],[525,85]].map(([x,y],i) => <g key={i}><circle cx={x} cy={y} r="14" fill="#e1b774" fillOpacity=".05"/><circle cx={x} cy={y} r="6" stroke="#edc586" strokeOpacity=".4"/><circle cx={x} cy={y} r="2" fill="#edc586"/></g>)}
          </svg>
          <div className="ern-acesso-arte-legenda"><span>ALTO RIO NEGRO</span><span>BAIXO RIO NEGRO</span></div>
        </div>
        <div className="ern-acesso-pilares"><span><b>01</b> Território</span><span><b>02</b> Conexões</span><span><b>03</b> Possibilidades</span></div>
        <p className="ern-acesso-assinatura">Uma plataforma com a identidade do nosso lugar.</p>
      </aside>
      <div className="ern-acesso-formulario">{children}</div>
    </div>
    <footer className="ern-acesso-base"><span>Encantos Rio Negro · Alto e Baixo Rio Negro</span><nav aria-label="Informações da plataforma"><Link href="/privacidade">Privacidade</Link><Link href="/termos">Termos</Link><Link href="/contato">Atendimento</Link></nav></footer>
  </main>;
}
