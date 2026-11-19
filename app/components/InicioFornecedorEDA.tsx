'use client';

/*
  EDA_FORNECEDOR_INICIO_V1 — início do fornecedor/artesão no padrão Encantos:
  capa com paisagem e letreiro, cards com natureza ao fundo e a EDA guiando
  os primeiros passos (pensado para quem nunca usou um sistema).
*/
import './inicio-fornecedor-eda.css';
import '@/app/fablepremium.css';
import { useEffect, useState } from 'react';
import Link from 'next/link';
import { supabase } from '@/lib/supabase';

type Situacao = {
  nome: string;
  atividade: string;
  temContato: boolean;
  temCidade: boolean;
  pecas: number;
  publicadas: number;
};

function saudacao() {
  const h = Number(new Intl.DateTimeFormat('pt-BR', { hour: 'numeric', hour12: false, timeZone: 'America/Manaus' }).format(new Date()));
  if (h < 5) return 'Boa madrugada';
  if (h < 12) return 'Bom dia';
  if (h < 18) return 'Boa tarde';
  return 'Boa noite';
}

function Digitando({ texto }: { texto: string }) {
  const [n, setN] = useState(0);
  useEffect(() => {
    setN(0);
    if (window.matchMedia('(prefers-reduced-motion: reduce)').matches) {
      setN(texto.length);
      return;
    }
    const id = window.setInterval(() => setN((v) => (v >= texto.length ? v : v + 1)), 22);
    return () => window.clearInterval(id);
  }, [texto]);
  return <span aria-label={texto}>{texto.slice(0, n)}</span>;
}

export default function InicioFornecedorEDA() {
  const [s, setS] = useState<Situacao | null>(null);

  useEffect(() => {
    let vivo = true;
    void (async () => {
      const { data: auth } = await supabase.auth.getUser();
      if (!auth.user) return;
      const [{ data: perfil }, { data: itens }] = await Promise.all([
        supabase.from('perfis_profissionais').select('nome,telefone,cidade,categoria')
          .eq('usuario_id', auth.user.id).eq('tipo', 'fornecedor').maybeSingle(),
        supabase.from('vitrine_itens').select('publicado').eq('usuario_id', auth.user.id),
      ]);
      if (!vivo) return;
      setS({
        nome: perfil?.nome ?? '',
        atividade: perfil?.categoria ?? '',
        temContato: String(perfil?.telefone ?? '').replace(/\D/g, '').length >= 10,
        temCidade: Boolean(perfil?.cidade),
        pecas: (itens ?? []).length,
        publicadas: (itens ?? []).filter((i) => i.publicado).length,
      });
    })();
    return () => {
      vivo = false;
    };
  }, []);

  const artesao = /artesanato/i.test(s?.atividade ?? '');
  const bebidas = /bebida/i.test(s?.atividade ?? '');
  // EDA_FORNECEDOR_FOTO_SEM_PISCAR_V1: a foto só entra depois de saber a atividade (evita mostrar a imagem antiga ao recarregar).
  const foto = (deArtesao: string, padrao: string) =>
    s ? { backgroundImage: `url('/images/fornecedor/${artesao ? deArtesao : padrao}.webp')` } : undefined;
  const primeiroNome = (s?.nome ?? '').split(' ')[0];

  const passos = s
    ? [
        { feito: Boolean(s.nome && s.atividade), texto: 'Diga quem você é e o que faz', href: '/fornecedor/perfil' },
        { feito: s.temContato && s.temCidade, texto: 'Coloque seu WhatsApp com DDD e sua cidade', href: '/fornecedor/perfil' },
        { feito: s.pecas > 0, texto: artesao ? 'Publique a foto da sua primeira peça' : 'Publique seu primeiro produto', href: '/fornecedor/vitrine' },
        { feito: s.publicadas > 0, texto: 'Veja como o visitante enxerga sua vitrine', href: '/artesanato' },
      ]
    : [];
  const proximo = passos.find((p) => !p.feito);

  const fala = !s
    ? 'Estou preparando o seu espaço…'
    : !proximo
      ? `${saudacao()}${primeiroNome ? `, ${primeiroNome}` : ''}! Sua vitrine está no ar. Quando chegar um contato pelo WhatsApp, a venda é toda sua.`
      : `${saudacao()}${primeiroNome ? `, ${primeiroNome}` : ''}! Eu sou a EDA e vou te guiar. Falta pouco: ${proximo.texto.toLowerCase()}.`;

  return (
    <div data-fable="portal" className="fi-eda">
      <header className={`fi-capa${s ? '' : ' fi-carregando'}`} style={foto('artesao-capa-madeira', 'eldorado')}>
        <div className="fi-capa-veu" />
        <div className="fi-capa-txt">
          <p className="fi-eb">Encantos da Amazônia · Espaço do fornecedor</p>
          <h1 className="fi-letreiro">{artesao ? 'Seu ofício, vitrine para o Brasil' : bebidas ? 'Sua distribuidora na rota do turismo' : 'Seu negócio na rede do turismo'}</h1>
          <p className="fi-sub">
            {artesao
              ? 'Mostre o que suas mãos criam. Quem visita a Amazônia pelo portal fala direto com você, e a renda é toda sua.'
              : bebidas
                ? 'As operadoras encontram você ao montar os suprimentos de cada saída. Venda de bebida alcoólica só para maiores de 18 anos.'
                : 'Apareça para turistas e operadoras de todo o Amazonas. O contato e a venda são direto com você.'}
          </p>
        </div>
      </header>

      <section className={`fi-eda-guia${artesao ? ' fi-eda-guia-foto' : ''}`} aria-live="polite">
        <span className="fi-eda-selo" aria-hidden="true">EDA</span>
        <div className="min-w-0 flex-1">
          <p className="fi-eda-fala"><Digitando texto={fala} /></p>
          {s && (
            <ol className="fi-passos">
              {passos.map((p, i) => (
                <li key={i} data-feito={p.feito || undefined}>
                  <span aria-hidden="true">{p.feito ? '✓' : i + 1}</span>
                  {p.feito ? p.texto : <Link href={p.href}>{p.texto} →</Link>}
                </li>
              ))}
            </ol>
          )}
        </div>
      </section>

      <div className="fi-cards">
        <Link href="/fornecedor/vitrine" className={`fi-card${s ? '' : ' fi-carregando'}`} style={foto('artesao-card-biojoias', 'serra-araca-hero')}>
          <span className="fi-card-veu" />
          <span className="fi-card-txt">
            <small>{s ? `${s.publicadas} no ar` : 'Vitrine'}</small>
            <b className="fi-letreiro">Minha vitrine</b>
            <em>{artesao ? 'Fotos das suas peças com preço e história.' : 'Seus produtos com foto e preço.'}</em>
          </span>
        </Link>
        <Link href="/fornecedor/perfil" className={`fi-card${s ? '' : ' fi-carregando'}`} style={foto('artesao-card-colar', 'experiencias')}>
          <span className="fi-card-veu" />
          <span className="fi-card-txt">
            <small>Quem eu sou</small>
            <b className="fi-letreiro">Meu perfil</b>
            <em>Nome, cidade, atividade e o WhatsApp que recebe os contatos.</em>
          </span>
        </Link>
        <Link
          href="/artesanato"
          target="_blank"
          className={!s ? 'fi-card fi-carregando' : artesao ? 'fi-card' : 'fi-card fi-card-rio'}
          style={artesao ? { backgroundImage: "url('/images/fornecedor/artesao-card-cestaria.webp')" } : undefined}
        >
          <span className="fi-card-veu" />
          <span className="fi-card-txt">
            <small>Portal público ↗</small>
            <b className="fi-letreiro">Feito na Amazônia</b>
            <em>Veja sua vitrine como o visitante vê.</em>
          </span>
        </Link>
      </div>

      <p className="fi-rodape">
        A Encantos da Amazônia não cobra comissão e não intermedia pagamentos: o contato, o preço e o envio são
        combinados direto entre você e o comprador.
      </p>
    </div>
  );
}
