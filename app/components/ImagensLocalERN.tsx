'use client';

import { useId, useState } from 'react';

type Props = {
  nome: string;
  municipio: string;
  coordenadas: [number, number];
  referencia: string;
  consultaInicial?: string;
  consultaPorCoordenadas?: boolean;
};

type Visao = 'satelite' | 'rua' | 'consulta';

const BOTAO =
  'inline-flex min-h-12 items-center justify-center rounded-xl ' +
  'border px-3 py-2 text-sm font-medium transition ' +
  'focus-visible:outline-2 focus-visible:outline-offset-4 ' +
  'focus-visible:outline-[#E3A144]';

const TEXTO =
  'text-sm leading-6 text-[color:var(--ern-secundario,#EDEDE3)]';

export default function ImagensLocalERN({
  nome,
  municipio,
  coordenadas,
  referencia,
  consultaInicial,
  consultaPorCoordenadas = false,
}: Props) {
  const identificador = useId();
  const tituloId = `${identificador}-titulo`;
  const conteudoId = `${identificador}-conteudo`;
  const avisoId = `${identificador}-aviso`;
  const buscaId = `${identificador}-busca`;

  const [visao, setVisao] = useState<Visao>(
    consultaInicial ? 'consulta' : 'satelite',
  );

  const [aberto, setAberto] = useState(Boolean(consultaInicial));
  const [termo, setTermo] = useState('');
  const [consulta, setConsulta] = useState('');
  const [consultaAutorizada, setConsultaAutorizada] =
    useState<string | null>(null);

  const chave =
    process.env.NEXT_PUBLIC_GOOGLE_MAPS_EMBED_KEY?.trim();

  const centro = coordenadas.join(',');

  const busca =
    consulta ||
    (consultaPorCoordenadas
      ? consultaInicial || 'serviços'
      : `${nome}, ${municipio}, Amazonas, Brasil`);

  const parametros = new URLSearchParams({
    language: 'pt-BR',
    region: 'BR',
  });

  let modo = 'view';

  if (visao === 'rua') {
    modo = 'streetview';
    parametros.set('location', centro);
    parametros.set('radius', '50');
  } else if (visao === 'consulta') {
    modo = 'search';
    parametros.set('q', busca);
    parametros.set('center', centro);
    parametros.set('zoom', '16');
  } else {
    parametros.set('center', centro);
    parametros.set('zoom', '18');
    parametros.set('maptype', 'satellite');
  }

  if (chave) {
    parametros.set('key', chave);
  }

  const origem =
    `https://www.google.com/maps/embed/v1/${modo}?` +
    parametros.toString();

  // A autorização vale somente para a URL exibida.
  // Mudanças no ponto, tipo de visão ou busca exigem nova ação.
  // Nenhuma escolha é persistida no navegador ou no banco.
  const podeCarregar =
    aberto &&
    Boolean(chave) &&
    consultaAutorizada === origem;

  const externos = new URLSearchParams({ api: '1' });
  let linkExterno: string;

  if (visao === 'rua') {
    externos.set('map_action', 'pano');
    externos.set('viewpoint', centro);

    linkExterno =
      `https://www.google.com/maps/@?${externos.toString()}`;
  } else if (visao === 'consulta') {
    externos.set(
      'query',
      consultaPorCoordenadas
        ? `${busca} perto de ${centro}`
        : busca,
    );

    linkExterno =
      `https://www.google.com/maps/search/?${externos.toString()}`;
  } else {
    externos.set('map_action', 'map');
    externos.set('center', centro);
    externos.set('zoom', '18');
    externos.set('basemap', 'satellite');

    linkExterno =
      `https://www.google.com/maps/@?${externos.toString()}`;
  }

  const nomeVisao =
    visao === 'satelite'
      ? 'imagens de satélite'
      : visao === 'rua'
        ? 'vista de rua'
        : 'consulta de endereços';

  function alternarPainel() {
    setConsultaAutorizada(null);
    setAberto((valor) => !valor);
  }

  function selecionarVisao(proxima: Visao) {
    if (proxima !== visao) {
      setConsultaAutorizada(null);
      setVisao(proxima);
    }
  }

  return (
    <section
      aria-labelledby={tituloId}
      className="border-t border-[#E3A144]/20 bg-[var(--ern-painel,#0C1C16)] p-4 sm:p-6"
    >
      <div className="flex flex-wrap items-start justify-between gap-3">
        <div>
          <p className={TEXTO}>
            Explore o local em imagens
          </p>

          <h3
            id={tituloId}
            className="mt-2 text-xl text-[color:var(--ern-destaque,#F4C77E)]"
          >
            {nome}
          </h3>

          <p className={`mt-1 ${TEXTO}`}>
            {consultaPorCoordenadas
              ? 'Consulta a partir das coordenadas selecionadas'
              : `${municipio} · Amazonas`}
          </p>
        </div>

        <button
          type="button"
          aria-expanded={aberto}
          aria-controls={conteudoId}
          onClick={alternarPainel}
          className={`${BOTAO} border-[#E3A144]/50 text-[color:var(--ern-destaque,#F4C77E)]`}
        >
          {aberto ? 'Fechar imagens' : 'Explorar imagens reais'}
        </button>
      </div>

      <p className={`mt-3 ${TEXTO}`}>{referencia}</p>

      <p className={`mt-2 ${TEXTO}`}>
        Ponto de referência: {coordenadas[0].toFixed(6)},{' '}
        {coordenadas[1].toFixed(6)}. Selecione um ponto no mapa
        operacional para mudar a referência.
      </p>

      {aberto && (
        <div id={conteudoId} className="mt-4">
          <div
            role="group"
            className="flex flex-wrap gap-2"
            aria-label="Tipo de consulta visual"
          >
            {(
              [
                ['satelite', 'Satélite'],
                ['rua', 'Vista da rua'],
                ['consulta', 'Endereços e estabelecimentos'],
              ] as const
            ).map(([id, label]) => (
              <button
                key={id}
                type="button"
                aria-pressed={visao === id}
                onClick={() => selecionarVisao(id)}
                className={`${BOTAO} ${
                  visao === id
                    ? 'border-[#E3A144] bg-[#E3A144]/10 text-[color:var(--ern-destaque,#F4C77E)]'
                    : 'border-white/20 text-[color:var(--ern-texto,#EDEDE3)]'
                }`}
              >
                {label}
              </button>
            ))}
          </div>

          {visao === 'consulta' && consultaPorCoordenadas && (
            <p className={`mt-3 ${TEXTO}`}>
              O Google define a relevância e o alcance dos
              resultados, que podem incluir locais mais distantes.
              Não há raio máximo garantido.
            </p>
          )}

          {visao === 'consulta' && (
            <form
              className="mt-3 flex flex-wrap items-end gap-2"
              onSubmit={(evento) => {
                evento.preventDefault();

                const informado = termo.trim();
                if (!informado) return;

                setConsultaAutorizada(null);

                setConsulta(
                  consultaPorCoordenadas
                    ? informado
                    : `${informado}, ${municipio}, Amazonas, Brasil`,
                );
              }}
            >
              <div className="min-w-0 flex-1">
                <label
                  htmlFor={buscaId}
                  className={`mb-2 block ${TEXTO}`}
                >
                  Estabelecimento ou endereço
                </label>

                <input
                  id={buscaId}
                  type="search"
                  value={termo}
                  maxLength={180}
                  onChange={(evento) =>
                    setTermo(evento.target.value)
                  }
                  placeholder="Pousada, comércio ou rua"
                  className="min-h-12 w-full rounded-xl border border-white/30 bg-[var(--ern-painel,#07110E)] px-3 text-base text-[color:var(--ern-texto,#EDEDE3)] focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[#E3A144]"
                />
              </div>

              <button
                type="submit"
                className={`${BOTAO} border-[#E3A144]/40 text-[color:var(--ern-destaque,#F4C77E)]`}
              >
                Preparar consulta
              </button>

              {consulta && (
                <button
                  type="button"
                  onClick={() => {
                    setConsultaAutorizada(null);
                    setConsulta('');
                    setTermo('');
                  }}
                  className={`${BOTAO} border-white/20 text-[color:var(--ern-texto,#EDEDE3)]`}
                >
                  Limpar consulta
                </button>
              )}
            </form>
          )}

          <p className={`mt-3 ${TEXTO}`}>
            {visao === 'satelite'
              ? 'Fotografias aéreas ou de satélite do provedor. A resolução e a data variam por local; ampliar não garante novos detalhes.'
              : visao === 'rua'
                ? 'A vista de rua depende de panoramas existentes perto deste ponto. A imagem pode ser de outra data ou de um ponto próximo, sem mostrar o imóvel selecionado.'
                : 'Os resultados são fornecidos pelo Google. A proximidade não confirma a identidade de uma casa ou estabelecimento, nem sua situação atual.'}
          </p>

          <div
            id={avisoId}
            className="mt-4 rounded-xl border border-[#E3A144]/40 bg-[var(--ern-painel,#07110E)] p-4"
          >
            <h4 className="text-base font-semibold text-[color:var(--ern-texto,#EDEDE3)]">
              Consulta externa ao Google
            </h4>

            <p className={`mt-2 ${TEXTO}`}>
              Carregar este painel ou abrir o link externo envia
              ao Google o ponto selecionado e, quando houver,
              o texto da consulta. O provedor também recebe
              dados técnicos da conexão, como o endereço IP.
            </p>

            <p className={`mt-2 ${TEXTO}`}>
              Se a referência selecionada vier do GPS, as
              coordenadas utilizadas nessa consulta também
              serão encaminhadas. Evite inserir informações
              pessoais no campo de busca.
            </p>

            <p className={`mt-2 ${TEXTO}`}>
              Você pode continuar utilizando os demais recursos
              da ERN sem carregar este painel do Google.
            </p>

            <div className="mt-3 flex flex-wrap gap-3">
              <a
                href="https://policies.google.com/privacy?hl=pt-BR"
                target="_blank"
                rel="noopener noreferrer"
                className={`${BOTAO} border-[#E3A144]/40 text-[color:var(--ern-destaque,#F4C77E)] underline underline-offset-4`}
              >
                Privacidade do Google
                <span className="sr-only">
                  {' '}(abre em nova aba)
                </span>
              </a>

              <a
                href="/privacidade"
                target="_blank"
                rel="noopener noreferrer"
                className={`${BOTAO} border-[#E3A144]/40 text-[color:var(--ern-destaque,#F4C77E)] underline underline-offset-4`}
              >
                Privacidade da ERN
                <span className="sr-only">
                  {' '}(abre em nova aba)
                </span>
              </a>
            </div>

            {chave && (
              <button
                type="button"
                aria-describedby={avisoId}
                onClick={() =>
                  setConsultaAutorizada(
                    podeCarregar ? null : origem,
                  )
                }
                className={`${BOTAO} mt-4 border-[#E3A144]/60 text-[color:var(--ern-destaque,#F4C77E)]`}
              >
                {podeCarregar
                  ? 'Interromper painel do Google'
                  : 'Carregar esta consulta no Google'}
              </button>
            )}

            {podeCarregar && (
              <p className={`mt-2 ${TEXTO}`}>
                Interromper remove o painel desta página.
                Isso não desfaz dados já enviados ao provedor.
              </p>
            )}
          </div>

          {podeCarregar && (
            <div className="mt-3 overflow-hidden rounded-xl border border-white/20 bg-[var(--ern-painel,#07110E)]">
              <iframe
                key={origem}
                title={`Google Maps · ${nomeVisao} · ${nome}`}
                src={origem}
                width="100%"
                height="460"
                loading="lazy"
                allowFullScreen
                referrerPolicy="strict-origin-when-cross-origin"
                className="h-[360px] min-w-[200px] w-full border-0 sm:h-[460px]"
              />
            </div>
          )}

          {!chave && (
            <p className={`mt-3 ${TEXTO}`}>
              A visualização incorporada não está configurada.
              Utilize o link externo abaixo, se desejar.
            </p>
          )}

          <a
            href={linkExterno}
            target="_blank"
            rel="noopener noreferrer"
            referrerPolicy="no-referrer"
            aria-describedby={avisoId}
            className={`${BOTAO} mt-3 border-[#E3A144]/40 text-[color:var(--ern-destaque,#F4C77E)]`}
          >
            Abrir {nomeVisao} no Google Maps
            <span className="sr-only">
              {' '}(abre em nova aba)
            </span>
          </a>
        </div>
      )}
    </section>
  );
}