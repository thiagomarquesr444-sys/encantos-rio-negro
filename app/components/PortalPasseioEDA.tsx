'use client';

// EDA_PASSEIOS_PORTAL_V1: cadastro do passeio conversando com o portal público.
// Fotos direto do aparelho (como foram postadas), prévia ao vivo do card que o
// visitante verá e a EDA orientando o que falta para o passeio brilhar.

import { useEffect, useMemo, useRef, useState } from 'react';
import { precoPasseioEDA } from '@/lib/passeiosPublicosEDA';

export type FotoLocalEDA = { id: string; arquivo: File; url: string };

type Dados = {
  nome: string;
  categoria: string;
  cidade: string;
  duracao: string;
  preco: number | null;
  vagas: string;
  descricao: string;
  destaque: boolean;
  situacao: string;
};

type Props = {
  dados: Dados;
  fotos: FotoLocalEDA[];
  onFotos: (fotos: FotoLocalEDA[]) => void;
  publicar: boolean;
  onPublicar: (valor: boolean) => void;
  nomeOperadora: string | null;
  perfilPublicado: boolean | null;
  disabled: boolean;
};

const MAX_FOTOS = 8;
const ACEITOS = ['image/jpeg', 'image/png', 'image/webp'];

export default function PortalPasseioEDA({
  dados, fotos, onFotos, publicar, onPublicar, nomeOperadora, perfilPublicado, disabled,
}: Props) {
  const entrada = useRef<HTMLInputElement>(null);
  const [ativa, setAtiva] = useState(0);
  const [arrastando, setArrastando] = useState(false);
  const [aviso, setAviso] = useState('');

  useEffect(() => {
    if (ativa > fotos.length - 1) setAtiva(Math.max(0, fotos.length - 1));
  }, [fotos.length, ativa]);

  function adicionar(lista: FileList | null) {
    if (!lista) return;
    setAviso('');
    const novas: FotoLocalEDA[] = [];
    for (const arquivo of Array.from(lista)) {
      if (fotos.length + novas.length >= MAX_FOTOS) {
        setAviso(`Até ${MAX_FOTOS} fotos por passeio.`);
        break;
      }
      if (!ACEITOS.includes(arquivo.type)) {
        setAviso('Use fotos JPG, PNG ou WebP.');
        continue;
      }
      novas.push({ id: crypto.randomUUID(), arquivo, url: URL.createObjectURL(arquivo) });
    }
    if (novas.length) onFotos([...fotos, ...novas]);
  }

  function remover(id: string) {
    const alvo = fotos.find((f) => f.id === id);
    if (alvo) URL.revokeObjectURL(alvo.url);
    onFotos(fotos.filter((f) => f.id !== id));
  }

  function tornarCapa(id: string) {
    const alvo = fotos.find((f) => f.id === id);
    if (!alvo) return;
    onFotos([alvo, ...fotos.filter((f) => f.id !== id)]);
    setAtiva(0);
  }

  const etapas = useMemo(() => [
    { ok: fotos.length > 0, texto: 'Foto real da experiência' },
    { ok: dados.nome.trim().length >= 4, texto: 'Nome do passeio' },
    { ok: dados.descricao.trim().length >= 80, texto: 'Descrição que convida (80+ letras)' },
    { ok: !!dados.duracao.trim(), texto: 'Duração' },
    { ok: (dados.preco ?? 0) > 0, texto: 'Preço' },
  ], [fotos.length, dados]);

  const prontas = etapas.filter((e) => e.ok).length;
  const percentual = Math.round((prontas / etapas.length) * 100);

  const fala = useMemo(() => {
    if (!publicar) return 'Este passeio ficará só na sua gestão. Ligue "Expor no portal" quando quiser que os visitantes o encontrem.';
    if (dados.situacao === 'Inativo') return 'Passeios inativos não aparecem no portal. Mude a situação para Ativo ou Em Breve.';
    if (perfilPublicado === false) return 'Seu perfil público ainda não está publicado. O passeio fica pronto e aparece assim que o perfil for ao ar.';
    if (!fotos.length) return 'Comece pela foto. É ela que faz o visitante parar de rolar a tela.';
    if (dados.nome.trim().length < 4) return 'Que nome o visitante vai lembrar? Ex.: "Pôr do sol no Rio Negro".';
    if (dados.descricao.trim().length < 80) return 'Conte o que a pessoa vai viver: paisagem, o que está incluso, o ponto alto do passeio.';
    if (!dados.duracao.trim()) return 'Informe a duração — ajuda o visitante a encaixar na viagem.';
    if (!((dados.preco ?? 0) > 0)) return 'Com preço visível, o visitante chega no seu WhatsApp já decidido.';
    if (fotos.length < 3) return 'Ótimo! Mais 1 ou 2 fotos mostram a experiência por inteiro.';
    return 'Perfeito. Seu passeio está pronto para encantar no portal. ✦';
  }, [publicar, dados, perfilPublicado, fotos.length]);

  const preco = precoPasseioEDA(dados.preco);
  const foto = fotos[ativa] ?? fotos[0];

  return (
    <div className="eda-pp">
      <div className="eda-pp-col">
        <div className="eda-pp-titulo">
          <span>Fotos do passeio</span>
          <small>{fotos.length}/{MAX_FOTOS} · a primeira é a capa</small>
        </div>

        <button
          type="button"
          className="eda-pp-drop"
          data-arrastando={arrastando || undefined}
          disabled={disabled || fotos.length >= MAX_FOTOS}
          onClick={() => entrada.current?.click()}
          onDragOver={(e) => { e.preventDefault(); setArrastando(true); }}
          onDragLeave={() => setArrastando(false)}
          onDrop={(e) => { e.preventDefault(); setArrastando(false); if (!disabled) adicionar(e.dataTransfer.files); }}
        >
          <span className="eda-pp-mais" aria-hidden="true">+</span>
          <strong>Adicionar fotos</strong>
          <small>Da galeria ou câmera · do jeito que você postou</small>
        </button>
        <input
          ref={entrada}
          type="file"
          accept={ACEITOS.join(',')}
          multiple
          hidden
          onChange={(e) => { adicionar(e.target.files); e.target.value = ''; }}
        />
        {aviso && <p role="alert" className="eda-pp-aviso">{aviso}</p>}

        {fotos.length > 0 && (
          <ul className="eda-pp-miniaturas">
            {fotos.map((f, i) => (
              <li key={f.id} data-ativa={i === ativa || undefined}>
                <button type="button" className="eda-pp-thumb" onClick={() => setAtiva(i)} aria-label={`Ver foto ${i + 1}`}>
                  {/* eslint-disable-next-line @next/next/no-img-element */}
                  <img src={f.url} alt="" />
                  {i === 0 && <span className="eda-pp-capa">Capa</span>}
                </button>
                <div className="eda-pp-acoes">
                  {i > 0 && <button type="button" disabled={disabled} onClick={() => tornarCapa(f.id)}>Capa</button>}
                  <button type="button" disabled={disabled} onClick={() => remover(f.id)} aria-label={`Remover foto ${i + 1}`}>×</button>
                </div>
              </li>
            ))}
          </ul>
        )}

        <label className="eda-pp-switch">
          <span>
            <strong>Expor no portal público</strong>
            <small>Aparece em Experiências, na Rede e no perfil da {nomeOperadora || 'sua operadora'}.</small>
          </span>
          <input type="checkbox" role="switch" checked={publicar} disabled={disabled} onChange={(e) => onPublicar(e.target.checked)} />
          <i aria-hidden="true" />
        </label>

        <div className="eda-pp-eda" aria-live="polite">
          <span className="eda-pp-orbe" aria-hidden="true">✦</span>
          <div>
            <strong>EDA</strong>
            <p key={fala}>{fala}</p>
          </div>
        </div>

        <div className="eda-pp-progresso">
          <div className="eda-pp-barra"><span style={{ width: `${percentual}%` }} /></div>
          <ul>
            {etapas.map((e) => (
              <li key={e.texto} data-ok={e.ok || undefined}><span aria-hidden="true">{e.ok ? '✓' : '○'}</span>{e.texto}</li>
            ))}
          </ul>
        </div>
      </div>

      <div className="eda-pp-col">
        <div className="eda-pp-titulo">
          <span>Como o visitante vai ver</span>
          <small>{publicar ? 'Prévia ao vivo' : 'Não será exposto'}</small>
        </div>

        <article className="eda-pp-card" data-oculto={!publicar || undefined}>
          <div className="eda-pp-foto">
            {foto ? (
              <>
                {/* eslint-disable-next-line @next/next/no-img-element */}
                <img className="eda-pp-fundo" src={foto.url} alt="" aria-hidden="true" />
                {/* eslint-disable-next-line @next/next/no-img-element */}
                <img className="eda-pp-img" src={foto.url} alt={dados.nome || 'Foto do passeio'} />
              </>
            ) : (
              <span className="eda-pp-vazio">Sua foto aparece aqui</span>
            )}
            <span className="eda-pp-selo">{dados.categoria}</span>
            {dados.destaque && <span className="eda-pp-destaque">✦ Destaque</span>}
            {fotos.length > 1 && (
              <span className="eda-pp-pontos">
                {fotos.map((f, i) => <i key={f.id} data-ativa={i === ativa || undefined} />)}
              </span>
            )}
          </div>
          <div className="eda-pp-corpo">
            <small>{[dados.cidade, dados.duracao].filter(Boolean).join(' · ') || 'Cidade · duração'}</small>
            <h3>{dados.nome || 'Nome do passeio'}</h3>
            <p>{dados.descricao || 'A descrição do passeio aparece aqui, como um convite para o visitante.'}</p>
            <div className="eda-pp-rodape">
              <span>
                {preco ? <><small>a partir de</small><strong>{preco}</strong></> : <strong>Consultar valor</strong>}
              </span>
              <span className="eda-pp-zap">WhatsApp</span>
            </div>
            <span className="eda-pp-oper">por {nomeOperadora || 'sua operadora'}{dados.situacao === 'Em Breve' ? ' · Em breve' : ''}</span>
          </div>
        </article>
      </div>

      <style jsx>{`
        .eda-pp { display: grid; gap: 22px; }
        @media (min-width: 900px) { .eda-pp { grid-template-columns: minmax(0, 1.1fr) minmax(0, 1fr); } }
        .eda-pp-col { min-width: 0; display: grid; gap: 14px; align-content: start; }
        .eda-pp-titulo { display: flex; justify-content: space-between; align-items: baseline; gap: 8px; }
        .eda-pp-titulo span { font-size: 10px; font-weight: 600; letter-spacing: .13em; text-transform: uppercase; color: var(--ern-secundario); }
        .eda-pp-titulo small { font-size: 10px; color: var(--ern-secundario); }
        .eda-pp-drop { display: grid; justify-items: center; gap: 4px; padding: 22px 16px; border: 1.5px dashed var(--ern-borda); border-radius: 18px; background: var(--ern-fundo); color: var(--ern-texto); cursor: pointer; transition: border-color .2s, background .2s, transform .2s; }
        .eda-pp-drop:hover:not(:disabled), .eda-pp-drop[data-arrastando] { border-color: var(--ern-destaque); background: var(--ern-suave); transform: translateY(-1px); }
        .eda-pp-drop:disabled { opacity: .45; cursor: not-allowed; }
        .eda-pp-drop strong { font-size: 14px; }
        .eda-pp-drop small { font-size: 11px; color: var(--ern-secundario); }
        .eda-pp-mais { display: grid; place-items: center; width: 44px; height: 44px; border-radius: 50%; border: 1px solid var(--ern-destaque); color: var(--ern-destaque); font-size: 26px; line-height: 1; margin-bottom: 4px; }
        .eda-pp-aviso { font-size: 12px; color: var(--ern-erro, #f08a7e); }
        .eda-pp-miniaturas { display: grid; grid-template-columns: repeat(4, minmax(0, 1fr)); gap: 8px; list-style: none; margin: 0; padding: 0; }
        .eda-pp-miniaturas li { position: relative; border-radius: 12px; overflow: hidden; border: 1px solid var(--ern-borda); }
        .eda-pp-miniaturas li[data-ativa] { border-color: var(--ern-destaque); box-shadow: 0 0 0 1px var(--ern-destaque); }
        .eda-pp-thumb { display: block; width: 100%; aspect-ratio: 1; padding: 0; border: 0; background: #000; cursor: pointer; }
        .eda-pp-thumb img { width: 100%; height: 100%; object-fit: cover; display: block; }
        .eda-pp-capa { position: absolute; left: 6px; top: 6px; padding: 2px 6px; border-radius: 999px; background: var(--ern-destaque); color: #10140f; font-size: 9px; font-weight: 700; }
        .eda-pp-acoes { position: absolute; right: 4px; bottom: 4px; display: flex; gap: 4px; }
        .eda-pp-acoes button { min-width: 24px; height: 24px; padding: 0 6px; border: 0; border-radius: 999px; background: rgb(0 0 0 / 65%); color: #fff; font-size: 10px; cursor: pointer; }
        .eda-pp-switch { position: relative; display: flex; align-items: center; justify-content: space-between; gap: 12px; padding: 12px 14px; border: 1px solid var(--ern-borda); border-radius: 14px; background: var(--ern-suave); cursor: pointer; }
        .eda-pp-switch strong { display: block; font-size: 13px; color: var(--ern-texto); }
        .eda-pp-switch small { display: block; margin-top: 2px; font-size: 10px; color: var(--ern-secundario); }
        .eda-pp-switch input { position: absolute; opacity: 0; width: 1px; height: 1px; }
        .eda-pp-switch i { flex: none; position: relative; width: 42px; height: 24px; border-radius: 999px; background: var(--ern-borda); transition: background .2s; }
        .eda-pp-switch i::after { content: ''; position: absolute; top: 3px; left: 3px; width: 18px; height: 18px; border-radius: 50%; background: #fff; transition: transform .2s; }
        .eda-pp-switch input:checked + i { background: var(--ern-destaque); }
        .eda-pp-switch input:checked + i::after { transform: translateX(18px); }
        .eda-pp-switch input:focus-visible + i { outline: 2px solid var(--ern-destaque); outline-offset: 2px; }
        .eda-pp-eda { display: flex; gap: 12px; align-items: flex-start; padding: 12px 14px; border-radius: 16px; border: 1px solid var(--ern-borda); background: linear-gradient(135deg, rgb(40 123 114 / 18%), transparent); }
        .eda-pp-orbe { flex: none; display: grid; place-items: center; width: 34px; height: 34px; border-radius: 50%; border: 2px solid #fff; background: radial-gradient(circle at 32% 28%, #2f8f84, #123c3f 70%); color: #fff; font-size: 16px; }
        .eda-pp-eda strong { font-size: 11px; color: var(--ern-destaque); }
        .eda-pp-eda p { margin: 2px 0 0; font-size: 13px; line-height: 1.5; color: var(--ern-texto); animation: eda-pp-entra .35s ease; }
        @keyframes eda-pp-entra { from { opacity: 0; transform: translateY(4px); } to { opacity: 1; transform: none; } }
        .eda-pp-barra { height: 6px; border-radius: 999px; background: var(--ern-borda); overflow: hidden; }
        .eda-pp-barra span { display: block; height: 100%; border-radius: inherit; background: linear-gradient(90deg, #2f8f84, var(--ern-destaque)); transition: width .4s ease; }
        .eda-pp-progresso ul { display: flex; flex-wrap: wrap; gap: 6px 14px; margin: 10px 0 0; padding: 0; list-style: none; }
        .eda-pp-progresso li { display: flex; gap: 6px; font-size: 11px; color: var(--ern-secundario); }
        .eda-pp-progresso li[data-ok] { color: var(--ern-texto); }
        .eda-pp-progresso li[data-ok] span { color: var(--ern-destaque); }
        .eda-pp-card { overflow: hidden; border-radius: 22px; border: 1px solid var(--ern-borda); background: var(--ern-painel); box-shadow: 0 18px 40px rgb(0 0 0 / 22%); transition: opacity .3s, filter .3s; }
        .eda-pp-card[data-oculto] { opacity: .45; filter: grayscale(.6); }
        .eda-pp-foto { position: relative; aspect-ratio: 4 / 3; background: #08110e; overflow: hidden; }
        .eda-pp-fundo { position: absolute; inset: -20px; width: calc(100% + 40px); height: calc(100% + 40px); object-fit: cover; filter: blur(22px) brightness(.55); }
        .eda-pp-img { position: relative; width: 100%; height: 100%; object-fit: contain; }
        .eda-pp-vazio { display: grid; place-items: center; height: 100%; font-size: 12px; color: var(--ern-secundario); }
        .eda-pp-selo, .eda-pp-destaque { position: absolute; top: 12px; padding: 4px 10px; border-radius: 999px; font-size: 10px; font-weight: 700; backdrop-filter: blur(6px); }
        .eda-pp-selo { left: 12px; background: rgb(0 0 0 / 55%); color: #fff; }
        .eda-pp-destaque { right: 12px; background: var(--ern-destaque); color: #10140f; }
        .eda-pp-pontos { position: absolute; bottom: 10px; left: 0; right: 0; display: flex; justify-content: center; gap: 5px; }
        .eda-pp-pontos i { width: 6px; height: 6px; border-radius: 50%; background: rgb(255 255 255 / 45%); }
        .eda-pp-pontos i[data-ativa] { background: #fff; }
        .eda-pp-corpo { padding: 16px 18px 18px; }
        .eda-pp-corpo > small { font-size: 11px; color: var(--ern-secundario); }
        .eda-pp-corpo h3 { margin: 4px 0 6px; font-size: 18px; font-weight: 700; color: var(--ern-texto); overflow-wrap: anywhere; }
        .eda-pp-corpo p { margin: 0; font-size: 13px; line-height: 1.55; color: var(--ern-secundario); display: -webkit-box; -webkit-line-clamp: 3; -webkit-box-orient: vertical; overflow: hidden; }
        .eda-pp-rodape { display: flex; align-items: flex-end; justify-content: space-between; gap: 10px; margin-top: 14px; }
        .eda-pp-rodape small { display: block; font-size: 10px; color: var(--ern-secundario); }
        .eda-pp-rodape strong { font-size: 18px; color: var(--ern-destaque); }
        .eda-pp-zap { padding: 8px 14px; border-radius: 999px; background: #1f9d55; color: #fff; font-size: 12px; font-weight: 700; }
        .eda-pp-oper { display: block; margin-top: 10px; font-size: 11px; color: var(--ern-secundario); }
        @media (prefers-reduced-motion: reduce) { .eda-pp-eda p { animation: none; } }
      `}</style>
    </div>
  );
}
