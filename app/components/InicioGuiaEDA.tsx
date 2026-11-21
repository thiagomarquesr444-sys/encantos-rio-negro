'use client';

/*
  EDA_GUIA_INICIO_V1 — início do guia independente da Rede EDA
  (não é o cadastro de "Guias" da operadora). Capa, EDA guiando e cards.
  EDA_GUIA_FOTOS_V1: fotos de pesca/peixes do segmento guia na capa, no card da EDA e nos cards.
*/
import './inicio-fornecedor-eda.css';
import '@/app/fablepremium.css';
import { useEffect, useState } from 'react';
import Link from 'next/link';
import { supabase } from '@/lib/supabase';
import MinhasViagensGuiaEDA from '@/app/components/MinhasViagensGuiaEDA';
import { copiarEDA } from '@/lib/copiarEDA';
import { ehGuiaTurismo, ehPratico } from '@/lib/opcoesEDA';

type Situacao = { nome: string; temContato: boolean; temCidade: boolean; idiomas: boolean; cadastur: boolean; descricao: boolean; atuacao: string; habilitacao: boolean };

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

const fotoGuia = (arquivo: string, posicao = 'center') => ({
  backgroundImage: `url('/images/guia/${arquivo}.webp')`,
  backgroundSize: 'cover',
  backgroundPosition: posicao,
});

export default function InicioGuiaEDA() {
  const [s, setS] = useState<Situacao | null>(null);
  const [codigo, setCodigo] = useState<string | null>(null);

  useEffect(() => {
    let vivo = true;
    void (async () => {
      const { data: auth } = await supabase.auth.getUser();
      if (!auth.user) return;
      const { data: p } = await supabase
        .from('perfis_profissionais')
        .select('nome,telefone,cidade,idiomas,cadastur,descricao,categoria,habilitacao')
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
        atuacao: p?.categoria ?? '',
        habilitacao: Boolean(p?.habilitacao),
      });
      // EDA_GUIA_PRATICO_V1: código que a operadora usa para vincular a conta.
      if (p) {
        const { data: cod } = await supabase.rpc('meu_codigo_vinculo_eda');
        if (vivo && typeof cod === 'string') setCodigo(cod);
      }
    })();
    return () => {
      vivo = false;
    };
  }, []);

  const pratico = ehPratico(s?.atuacao);
  const guiaTur = Boolean(s?.atuacao) && ehGuiaTurismo(s?.atuacao);
  const papel = !s?.atuacao ? 'guia ou prático' : pratico && guiaTur ? 'guia e prático' : pratico ? 'prático' : 'guia';
  const passos = s
    ? [
        { feito: Boolean(s.nome), texto: 'Diga seu nome profissional' },
        { feito: Boolean(s.atuacao), texto: 'Diga se você é guia, prático ou os dois' },
        { feito: s.temContato && s.temCidade, texto: 'Coloque seu WhatsApp com DDD e sua cidade' },
        ...(pratico ? [{ feito: s.habilitacao, texto: 'Informe sua habilitação náutica (Arrais, Mestre…)' }] : []),
        ...(guiaTur ? [
          { feito: s.idiomas, texto: 'Informe os idiomas em que você atende' },
          { feito: s.cadastur, texto: 'Informe seu Cadastur de guia (passa confiança)' },
        ] : []),
        { feito: s.descricao, texto: pratico && !guiaTur ? 'Conte os rios e canais que você conhece' : 'Conte sua experiência e seus roteiros' },
      ]
    : [];
  const proximo = passos.find((p) => !p.feito);
  const nome = (s?.nome ?? '').split(' ')[0];
  const fala = !s
    ? 'Estou preparando o seu espaço…'
    : !proximo
      ? `${saudacao()}${nome ? `, ${nome}` : ''}! Seu perfil de ${papel} está completo. Visitantes e operadoras falam direto com você.`
      : `${saudacao()}${nome ? `, ${nome}` : ''}! Eu sou a EDA e vou te guiar. Próximo passo: ${proximo.texto.toLowerCase()}.`;

  return (
    <div data-fable="portal" className="fi-eda">
      <header className="fi-capa" style={fotoGuia('guia-capa-cardume', 'center 40%')}>
        <div className="fi-capa-veu" />
        <div className="fi-capa-txt">
          <p className="fi-eb">Encantos da Amazônia · Espaço do guia e do prático</p>
          <h1 className="fi-letreiro">{pratico && !guiaTur ? 'Quem conhece o canal, conduz o barco' : 'Quem conhece o rio, guia a viagem'}</h1>
          <p className="fi-sub">
            Seu perfil profissional na Rede EDA, independente das operadoras. Nas viagens em que a operadora
            te escala, você manda a localização do barco ou do bote e registra cada etapa com os turistas.
          </p>
        </div>
      </header>

      <section className="fi-eda-guia fi-eda-guia-pirarucu" aria-live="polite">
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

      {codigo && (
        <section className="fi-codigo" aria-label="Seu código EDA">
          <div>
            <small>Seu código EDA</small>
            <b>{codigo}</b>
            <em>Passe este código para a operadora. Ela vincula você ao cadastro de guia ou à embarcação (prático), e as viagens aparecem aqui embaixo.</em>
          </div>
          <button type="button" onClick={() => void copiarEDA(codigo, 'Código copiado')}>Copiar código</button>
        </section>
      )}

      <div id="viagens"><MinhasViagensGuiaEDA /></div>

      <div className="fi-cards">
        <Link href="/guia/perfil" className="fi-card" style={fotoGuia('guia-card-tucunare', '30% center')}>
          <span className="fi-card-veu" />
          <span className="fi-card-txt">
            <small>Quem eu sou</small>
            <b className="fi-letreiro">Meu perfil</b>
            <em>Guia ou prático, registros, região e o WhatsApp que recebe os contatos.</em>
          </span>
        </Link>
        <Link href="/destinos" target="_blank" className="fi-card" style={fotoGuia('guia-card-tucunare-lago', 'center 35%')}>
          <span className="fi-card-veu" />
          <span className="fi-card-txt">
            <small>Portal público ↗</small>
            <b className="fi-letreiro">Destinos</b>
            <em>Os 62 municípios que os visitantes exploram no mapa.</em>
          </span>
        </Link>
        <Link href="/rede" target="_blank" className="fi-card" style={fotoGuia('guia-card-filhote', 'center 45%')}>
          <span className="fi-card-veu" />
          <span className="fi-card-txt">
            <small>Portal público ↗</small>
            <b className="fi-letreiro">Rede EDA</b>
            <em>O que operadoras e guias publicam no território.</em>
          </span>
        </Link>
      </div>

      <style jsx>{`
        .fi-eda-guia-pirarucu { background: linear-gradient(90deg, rgb(7 17 14 / 94%) 0%, rgb(7 17 14 / 82%) 55%, rgb(7 17 14 / 50%) 100%), url('/images/guia/guia-eda-pirarucu.webp') center / cover no-repeat; }
        .fi-codigo { margin-top: 18px; display: flex; flex-wrap: wrap; gap: 14px; align-items: center; justify-content: space-between; padding: 18px 20px; border-radius: 22px; border: 1px solid rgb(227 161 68 / 45%); background: linear-gradient(135deg, rgb(227 161 68 / 14%), rgb(7 17 14 / 0%)); }
        .fi-codigo div { display: grid; gap: 4px; min-width: 0; flex: 1 1 260px; }
        .fi-codigo small { font-size: 11px; font-weight: 700; letter-spacing: .14em; text-transform: uppercase; color: #e3a144; }
        .fi-codigo b { font-size: 28px; letter-spacing: .12em; color: #f4ead6; font-variant-numeric: tabular-nums; }
        .fi-codigo em { font-style: normal; font-size: 13px; line-height: 1.5; color: rgb(237 237 227 / 75%); }
        .fi-codigo button { min-height: 44px; padding: 0 20px; border-radius: 999px; border: 0; background: #e3a144; color: #07110e; font-weight: 700; cursor: pointer; }
        @media (max-width: 639px) {
          .fi-codigo { margin-top: 12px; padding: 12px 14px; gap: 10px; border-radius: 14px; flex-wrap: nowrap; }
          .fi-codigo div { flex: 1 1 auto; gap: 2px; }
          .fi-codigo small { font-size: 9px; }
          .fi-codigo b { font-size: 19px; letter-spacing: .08em; }
          .fi-codigo em { font-size: 11px; line-height: 1.35; display: -webkit-box; -webkit-line-clamp: 2; -webkit-box-orient: vertical; overflow: hidden; }
          .fi-codigo button { min-height: 38px; padding: 0 14px; font-size: 12px; flex-shrink: 0; }
        }
      `}</style>

      <p className="fi-rodape">
        A Encantos da Amazônia não intermedia pagamentos nem cobra comissão: a contratação é direta entre você e
        o visitante ou a operadora.
      </p>
    </div>
  );
}
