'use client';

/*
  EDA_GUIA_INICIO_V1 — início do guia independente da Rede EDA
  (não é o cadastro de "Guias" da operadora). Capa, EDA guiando e cards.
  Fundo em degradê de rio até chegarem as fotos do segmento guia.
*/
import './inicio-fornecedor-eda.css';
import '@/app/fablepremium.css';
import { useEffect, useState } from 'react';
import Link from 'next/link';
import { supabase } from '@/lib/supabase';

type Situacao = { nome: string; temContato: boolean; temCidade: boolean; idiomas: boolean; cadastur: boolean; descricao: boolean };

function saudacao() {
  const h = Number(new Intl.DateTimeFormat('pt-BR', { hour: 'numeric', hour12: false, timeZone: 'America/Manaus' }).format(new Date()));
  return h < 5 ? 'Boa madrugada' : h < 12 ? 'Bom dia' : h < 18 ? 'Boa tarde' : 'Boa noite';
}

function Digitando({ texto }: { texto: string }) {
  const [n, setN] = useState(0);
  useEffect(() => {
    setN(0);
    if (window.matchMedia('(prefers-reduced-motion: reduce)').matches) return setN(texto.length);
    const id = window.setInterval(() => setN((v) => (v >= texto.length ? v : v + 1)), 22);
    return () => window.clearInterval(id);
  }, [texto]);
  return <span aria-label={texto}>{texto.slice(0, n)}</span>;
}

export default function InicioGuiaEDA() {
  const [s, setS] = useState<Situacao | null>(null);

  useEffect(() => {
    let vivo = true;
    void (async () => {
      const { data: auth } = await supabase.auth.getUser();
      if (!auth.user) return;
      const { data: p } = await supabase
        .from('perfis_profissionais')
        .select('nome,telefone,cidade,idiomas,cadastur,descricao')
        .eq('usuario_id', auth.user.id)
        .eq('tipo', 'guia')
        .maybeSingle();
      if (!vivo) return;
      setS({
        nome: p?.nome ?? '',
        temContato: String(p?.telefone ?? '').replace(/\D/g, '').length >= 10,
        temCidade: Boolean(p?.cidade),
        idiomas: Boolean(p?.idiomas),
        cadastur: Boolean(p?.cadastur),
        descricao: Boolean(p?.descricao),
      });
    })();
    return () => {
      vivo = false;
    };
  }, []);

  const passos = s
    ? [
        { feito: Boolean(s.nome), texto: 'Diga seu nome profissional' },
        { feito: s.temContato && s.temCidade, texto: 'Coloque seu WhatsApp com DDD e sua cidade' },
        { feito: s.idiomas, texto: 'Informe os idiomas em que você atende' },
        { feito: s.cadastur, texto: 'Informe seu Cadastur de guia (passa confiança)' },
        { feito: s.descricao, texto: 'Conte sua experiência e seus roteiros' },
      ]
    : [];
  const proximo = passos.find((p) => !p.feito);
  const nome = (s?.nome ?? '').split(' ')[0];
  const fala = !s
    ? 'Estou preparando o seu espaço…'
    : !proximo
      ? `${saudacao()}${nome ? `, ${nome}` : ''}! Seu perfil de guia está completo. Visitantes e operadoras falam direto com você.`
      : `${saudacao()}${nome ? `, ${nome}` : ''}! Eu sou a EDA e vou te guiar. Próximo passo: ${proximo.texto.toLowerCase()}.`;

  return (
    <div data-fable="portal" className="fi-eda">
      <header className="fi-capa fi-card-rio">
        <div className="fi-capa-veu" />
        <div className="fi-capa-txt">
          <p className="fi-eb">Encantos da Amazônia · Espaço do guia</p>
          <h1 className="fi-letreiro">Quem conhece o rio, guia a viagem</h1>
          <p className="fi-sub">
            Seu perfil profissional na Rede EDA, independente das operadoras: idiomas, região, Cadastur e
            contato direto com quem planeja conhecer a Amazônia.
          </p>
        </div>
      </header>

      <section className="fi-eda-guia" aria-live="polite">
        <span className="fi-eda-selo" aria-hidden="true">EDA</span>
        <div className="min-w-0 flex-1">
          <p className="fi-eda-fala"><Digitando texto={fala} /></p>
          {s && (
            <ol className="fi-passos">
              {passos.map((p, i) => (
                <li key={i} data-feito={p.feito || undefined}>
                  <span aria-hidden="true">{p.feito ? '✓' : i + 1}</span>
                  {p.feito ? p.texto : <Link href="/guia/perfil">{p.texto} →</Link>}
                </li>
              ))}
            </ol>
          )}
        </div>
      </section>

      <div className="fi-cards">
        <Link href="/guia/perfil" className="fi-card fi-card-rio">
          <span className="fi-card-veu" />
          <span className="fi-card-txt">
            <small>Quem eu sou</small>
            <b className="fi-letreiro">Meu perfil</b>
            <em>Idiomas, Cadastur, região e o WhatsApp que recebe os contatos.</em>
          </span>
        </Link>
        <Link href="/destinos" target="_blank" className="fi-card fi-card-rio">
          <span className="fi-card-veu" />
          <span className="fi-card-txt">
            <small>Portal público ↗</small>
            <b className="fi-letreiro">Destinos</b>
            <em>Os 62 municípios que os visitantes exploram no mapa.</em>
          </span>
        </Link>
        <Link href="/rede" target="_blank" className="fi-card fi-card-rio">
          <span className="fi-card-veu" />
          <span className="fi-card-txt">
            <small>Portal público ↗</small>
            <b className="fi-letreiro">Rede EDA</b>
            <em>O que operadoras e guias publicam no território.</em>
          </span>
        </Link>
      </div>

      <p className="fi-rodape">
        A Encantos da Amazônia não intermedia pagamentos nem cobra comissão: a contratação é direta entre você e
        o visitante ou a operadora.
      </p>
    </div>
  );
}
