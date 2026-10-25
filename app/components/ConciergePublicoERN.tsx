'use client';

import { useEffect, useRef, useState } from 'react';
import Link from 'next/link';
import { useLanguage } from '@/app/components/LanguageProvider';

const textos = {
  PT: {
    title: 'ERN Concierge',
    status: 'Assistente virtual · descoberta guiada',
    welcome: 'Vamos descobrir sua próxima viagem?',
    intro: 'A Encantos Rio Negro conecta você ao território e aos profissionais da região. Nossa rede está em formação.',
    notice: 'Preços, acesso, disponibilidade e reservas precisam de confirmação com cada prestador.',
    questions: [
      'O que você gostaria de viver?',
      'Qual destino desperta sua curiosidade?',
      'Quando pretende viajar?',
      'Como será sua viagem?',
      'Seu ponto de partida está pronto.',
    ],
    interests: ['Pesca esportiva', 'Natureza', 'Cultura e comunidades', 'Hospedagem', 'Explorar possibilidades'],
    destinations: ['Ainda não decidi', 'Manaus', 'Novo Airão', 'Barcelos', 'Santa Isabel do Rio Negro', 'São Gabriel da Cachoeira'],
    period: 'Mês pretendido — opcional',
    periodHelp: 'Se ainda não decidiu, continue sem preencher.',
    people: 'Pessoas — opcional',
    days: 'Dias — opcional',
    next: 'Continuar',
    back: 'Voltar',
    restart: 'Recomeçar',
    step: 'Etapa',
    of: 'de',
    labels: ['Interesse', 'Destino', 'Período', 'Pessoas', 'Dias'],
    unknown: 'A definir',
    summary: 'Este resumo organiza suas preferências. Não é orçamento nem reserva. A disponibilidade de profissionais ainda precisa ser verificada.',
    explore: 'Explorar destinos',
    network: 'Conhecer profissionais',
    email: 'Preparar pedido por e-mail',
    emailHelp: 'Abre seu aplicativo de e-mail com o resumo. Revise e envie por lá. Se ele não abrir, copie o resumo e escreva para:',
    copy: 'Copiar resumo',
    copied: 'Resumo copiado.',
    copyError: 'Não foi possível copiar. Selecione o resumo abaixo e copie manualmente.',
    privacy: 'As escolhas não são gravadas pela ERN e se perdem ao sair ou recarregar. O envio por e-mail acontece somente por sua iniciativa.',
    subject: 'ERN — interesse em viagem',
    greeting: 'Olá, equipe ERN! Gostaria de informações sobre estas possibilidades de viagem:',
    ending: 'Entendo que este pedido não confirma preço, disponibilidade ou reserva.',
    guidance: [
      'Converse sobre roteiro, equipamentos e regras aplicáveis antes de contratar a pesca.',
      'Verifique o ciclo das águas, as regras de visitação e a orientação local.',
      'Combine a visita com os responsáveis e respeite as regras de cada comunidade.',
      'Confirme localização, acesso, estrutura e condições da hospedagem.',
      'Comece pelo mapa e descubra os lugares que combinam com seus interesses.',
    ],
  },
  EN: {
    title: 'ERN Concierge',
    status: 'Virtual assistant · guided discovery',
    welcome: 'Where could your next trip take you?',
    intro: 'Encantos Rio Negro connects you with the region and local professionals. Our network is taking shape.',
    notice: 'Prices, access, availability and bookings require confirmation with each provider.',
    questions: [
      'What would you like to experience?',
      'Which destination interests you?',
      'When would you like to travel?',
      'Tell us about your trip.',
      'Your starting point is ready.',
    ],
    interests: ['Sport fishing', 'Nature', 'Culture and communities', 'Accommodation', 'Explore possibilities'],
    destinations: ['Not decided yet', 'Manaus', 'Novo Airão', 'Barcelos', 'Santa Isabel do Rio Negro', 'São Gabriel da Cachoeira'],
    period: 'Preferred month — optional',
    periodHelp: 'Not sure yet? Continue without filling this in.',
    people: 'People — optional',
    days: 'Days — optional',
    next: 'Continue',
    back: 'Back',
    restart: 'Start again',
    step: 'Step',
    of: 'of',
    labels: ['Interest', 'Destination', 'Period', 'People', 'Days'],
    unknown: 'To be decided',
    summary: 'This summary organizes your preferences. It is not a quote or booking. Professional availability still needs to be checked.',
    explore: 'Explore destinations',
    network: 'Discover professionals',
    email: 'Prepare an email request',
    emailHelp: 'Opens your email app with the summary. Review and send it there. If it does not open, copy the summary and write to:',
    copy: 'Copy summary',
    copied: 'Summary copied.',
    copyError: 'Could not copy. Select the summary below and copy it manually.',
    privacy: 'ERN does not save these choices. They reset when you leave or reload. Email is sent only when you choose to send it.',
    subject: 'ERN — travel enquiry',
    greeting: 'Hello, ERN team! I would like information about these travel possibilities:',
    ending: 'I understand this request does not confirm prices, availability or a booking.',
    guidance: [
      'Discuss routes, equipment and applicable fishing rules before booking.',
      'Check river conditions, visiting rules and local guidance.',
      'Arrange visits with the people responsible and respect community rules.',
      'Confirm location, access, facilities and accommodation conditions.',
      'Start with the map and discover places that match your interests.',
    ],
  },
  ES: {
    title: 'ERN Concierge',
    status: 'Asistente virtual · descubrimiento guiado',
    welcome: '¿Descubrimos su próximo viaje?',
    intro: 'Encantos Rio Negro le conecta con el territorio y los profesionales locales. Nuestra red está en formación.',
    notice: 'Precios, acceso, disponibilidad y reservas requieren confirmación con cada prestador.',
    questions: [
      '¿Qué le gustaría vivir?',
      '¿Qué destino le interesa?',
      '¿Cuándo desea viajar?',
      '¿Cómo será su viaje?',
      'Su punto de partida está listo.',
    ],
    interests: ['Pesca deportiva', 'Naturaleza', 'Cultura y comunidades', 'Alojamiento', 'Explorar posibilidades'],
    destinations: ['Todavía no he decidido', 'Manaus', 'Novo Airão', 'Barcelos', 'Santa Isabel do Rio Negro', 'São Gabriel da Cachoeira'],
    period: 'Mes deseado — opcional',
    periodHelp: 'Si todavía no sabe, continúe sin completar.',
    people: 'Personas — opcional',
    days: 'Días — opcional',
    next: 'Continuar',
    back: 'Volver',
    restart: 'Empezar de nuevo',
    step: 'Paso',
    of: 'de',
    labels: ['Interés', 'Destino', 'Período', 'Personas', 'Días'],
    unknown: 'Por definir',
    summary: 'Este resumen organiza sus preferencias. No es un presupuesto ni una reserva. La disponibilidad de profesionales debe verificarse.',
    explore: 'Explorar destinos',
    network: 'Conocer profesionales',
    email: 'Preparar solicitud por correo',
    emailHelp: 'Abre su aplicación de correo con el resumen. Revise y envíelo allí. Si no abre, copie el resumen y escriba a:',
    copy: 'Copiar resumen',
    copied: 'Resumen copiado.',
    copyError: 'No se pudo copiar. Seleccione el resumen y cópielo manualmente.',
    privacy: 'ERN no guarda estas elecciones. Se pierden al salir o recargar. El correo se envía solo por su iniciativa.',
    subject: 'ERN — consulta sobre viaje',
    greeting: '¡Hola, equipo ERN! Quisiera información sobre estas posibilidades de viaje:',
    ending: 'Entiendo que esta solicitud no confirma precios, disponibilidad ni reserva.',
    guidance: [
      'Converse sobre itinerarios, equipos y reglas de pesca antes de contratar.',
      'Confirme las condiciones del río, reglas de visita y orientación local.',
      'Acuerde la visita con los responsables y respete las reglas de cada comunidad.',
      'Confirme ubicación, acceso, instalaciones y condiciones del alojamiento.',
      'Empiece por el mapa y descubra lugares que coincidan con sus intereses.',
    ],
  },
};

// ERN_CHAT_COMPACTO_V1

type IdiomaERN = 'PT' | 'EN' | 'ES';
type MensagemERN = { autor: 'ern' | 'visitante'; texto: string };

const conversaTextos = {
  PT: {
    badge: 'Assistente virtual · respostas guiadas',
    open: 'Conversar',
    close: 'Fechar conversa',
    send: 'Enviar',
    input: 'Sua mensagem',
    placeholder: 'Escreva sua mensagem...',
    hello: 'Olá! Sou o assistente virtual da Encantos Rio Negro. Nossa rede está em formação. Vamos descobrir o que combina com sua viagem? Você procura pesca, natureza, cultura, hospedagem ou ainda está explorando?',
    destination: 'Qual lugar você gostaria de conhecer? Pode ser Manaus, Novo Airão, Barcelos, Santa Isabel, São Gabriel ou um destino ainda a definir.',
    period: 'Em qual mês ou período você pensa em viajar? Se ainda não sabe, pode dizer “a definir”.',
    group: 'Quantas pessoas vão e por quantos dias? Pode responder, por exemplo, “2 pessoas, 5 dias”, ou deixar a definir.',
    summary: 'Aqui está o que você compartilhou:',
    details: ['Interesse', 'Destino', 'Período', 'Grupo e duração'],
    finish: 'Podemos começar pelo mapa ou pelos perfis da Rede. Para verificar possibilidades de atendimento, você também pode preparar um e-mail para a ERN. Ainda não há preço, disponibilidade ou reserva confirmados.',
    fallback: 'Nesta versão, consigo organizar suas preferências e orientar sobre os próximos passos. Para uma pergunta específica, use o contato da ERN abaixo. Você também pode escrever “mapa”, “rede”, “preço” ou “resumo”.',
    map: 'O mapa de Destinos ajuda a descobrir lugares. Use “Explorar destinos” abaixo. Os marcadores podem representar bases regionais, e não pontos exatos de acesso.',
    network: 'Na Rede você encontra publicações e perfis. Confira os canais informados por cada profissional. A presença de um perfil não confirma disponibilidade.',
    price: 'Ainda não consulto preços nem disponibilidade. Esses dados dependem do prestador, do período e da operação. Posso organizar suas preferências para um pedido de informações.',
    contact: 'O contato da ERN é contato.encantosrionegro@gmail.com. O botão de e-mail prepara uma mensagem; ela só é enviada quando você envia no seu aplicativo.',
    pending: 'Vamos completar suas preferências primeiro.',
    privacy: 'A conversa fica apenas nesta página e se perde ao recarregar. Evite documentos, senhas e dados sensíveis.',
    emailHelp: 'O e-mail abre no seu aplicativo para revisão e envio.',
    restart: 'Nova conversa',
    visitor: 'Você',
    limit: 'Você chegou ao limite desta conversa. Inicie uma nova conversa ou utilize o contato da ERN.',
    limitButton: 'Nova conversa para continuar',
    clear: 'Apagar esta conversa e começar novamente?',
    language: 'Português',
  },
  EN: {
    badge: 'Virtual assistant · guided replies',
    open: 'Start a conversation',
    close: 'Close conversation',
    send: 'Send',
    input: 'Your message',
    placeholder: 'Write your message...',
    hello: 'Hello! I am the Encantos Rio Negro virtual assistant. Our network is taking shape. What would you like to explore: fishing, nature, culture, accommodation, or possibilities?',
    destination: 'Which place would you like to visit? Manaus, Novo Airão, Barcelos, Santa Isabel, São Gabriel, or a destination still to be decided?',
    period: 'Which month or period are you considering? You can also say “not decided”.',
    group: 'How many people and how many days? For example, “2 people, 5 days”, or leave it undecided.',
    summary: 'Here is what you shared:',
    details: ['Interest', 'Destination', 'Period', 'Group and duration'],
    finish: 'Start with the map or network profiles below. You can also prepare an email to ERN to ask about possible assistance. Prices, availability and bookings are not confirmed.',
    fallback: 'This version organizes preferences and explains next steps. For a specific enquiry, use the ERN contact below. You can also type “map”, “network”, “price” or “summary”.',
    map: 'The destination map helps you discover places. Use “Explore destinations” below. Markers may represent regional bases rather than exact access points.',
    network: 'The network contains posts and profiles. Check each professional’s contact channels. A profile does not confirm availability.',
    price: 'I do not check prices or availability yet. They depend on the provider, period and operation. I can organize preferences for an enquiry.',
    contact: 'Contact ERN at contato.encantosrionegro@gmail.com. The email button prepares a message; it is sent only when you send it in your email app.',
    pending: 'Let us complete your preferences first.',
    privacy: 'This conversation stays only on this page and resets on reload. Avoid documents, passwords and sensitive information.',
    emailHelp: 'Email opens in your app for review and sending.',
    restart: 'New conversation',
    visitor: 'You',
    limit: 'This conversation has reached its limit. Start a new one or contact ERN.',
    limitButton: 'Start a new conversation to continue',
    clear: 'Clear this conversation and start again?',
    language: 'English',
  },
  ES: {
    badge: 'Asistente virtual · respuestas guiadas',
    open: 'Conversar',
    close: 'Cerrar conversación',
    send: 'Enviar',
    input: 'Su mensaje',
    placeholder: 'Escriba su mensaje...',
    hello: '¡Hola! Soy el asistente virtual de Encantos Rio Negro. Nuestra red está en formación. ¿Busca pesca, naturaleza, cultura, alojamiento o desea explorar posibilidades?',
    destination: '¿Qué lugar le gustaría conocer? Manaus, Novo Airão, Barcelos, Santa Isabel, São Gabriel, o un destino por definir.',
    period: '¿En qué mes o período piensa viajar? Si todavía no sabe, puede decir “por definir”.',
    group: '¿Cuántas personas y cuántos días? Por ejemplo, “2 personas, 5 días”, o déjelo por definir.',
    summary: 'Esto es lo que compartió:',
    details: ['Interés', 'Destino', 'Período', 'Grupo y duración'],
    finish: 'Puede empezar por el mapa o los perfiles de la red. También puede preparar un correo a ERN para consultar posibilidades de atención. No hay precios, disponibilidad ni reservas confirmados.',
    fallback: 'Esta versión organiza preferencias y orienta sobre los próximos pasos. Para una consulta específica, utilice el contacto de ERN. También puede escribir “mapa”, “red”, “precio” o “resumen”.',
    map: 'El mapa de destinos ayuda a descubrir lugares. Use “Explorar destinos” abajo. Los marcadores pueden representar bases regionales, no puntos exactos de acceso.',
    network: 'La red contiene publicaciones y perfiles. Consulte los canales de cada profesional. Un perfil no confirma disponibilidad.',
    price: 'Todavía no consulto precios ni disponibilidad. Dependen del prestador, período y operación. Puedo organizar preferencias para una consulta.',
    contact: 'El contacto es contato.encantosrionegro@gmail.com. El botón prepara un correo; solo se envía cuando usted lo envía desde su aplicación.',
    pending: 'Primero completemos sus preferencias.',
    privacy: 'La conversación permanece solo en esta página y se pierde al recargar. Evite documentos, contraseñas y datos sensibles.',
    emailHelp: 'El correo abre en su aplicación para revisar y enviar.',
    restart: 'Nueva conversación',
    visitor: 'Usted',
    limit: 'Esta conversación llegó a su límite. Inicie otra o utilice el contacto de ERN.',
    limitButton: 'Inicie otra conversación para continuar',
    clear: '¿Borrar esta conversación y empezar de nuevo?',
    language: 'Español',
  },
};

export default function ConciergePublicoERN() {
  const { idioma } = useLanguage();
  return <ConversaERN key={idioma} idioma={idioma} />;
}

function ConversaERN({ idioma }: { idioma: IdiomaERN }) {
  const t = textos[idioma];
  const c = conversaTextos[idioma];
  const [aberto, setAberto] = useState(false);
  const [entrada, setEntrada] = useState('');
  const [etapa, setEtapa] = useState(0);
  const [preferencias, setPreferencias] = useState<string[]>([]);
  const [mensagens, setMensagens] = useState<MensagemERN[]>([
    { autor: 'ern', texto: c.hello },
  ]);
  const dialogRef = useRef<HTMLDialogElement>(null);
  const abrirRef = useRef<HTMLButtonElement>(null);
  const mobileRef = useRef<HTMLButtonElement>(null);

  function devolverFocoERN() {
    const botao = window.matchMedia('(max-width: 1023px)').matches
      ? mobileRef.current
      : abrirRef.current;
    botao?.focus({ preventScroll: true });
  }

  useEffect(() => {
    function abrirPeloLinkERN() {
      if (window.location.hash === '#concierge') setAberto(true);
    }

    function aoClicarERN(evento: MouseEvent) {
      if (
        evento.defaultPrevented ||
        evento.button !== 0 ||
        evento.ctrlKey ||
        evento.metaKey ||
        evento.shiftKey ||
        evento.altKey
      ) return;

      const alvo = evento.target;
      if (!(alvo instanceof Element)) return;

      const link = alvo.closest('a[href]');
      if (!(link instanceof HTMLAnchorElement)) return;
      if (link.target && link.target !== '_self') return;

      const destino = new URL(link.href, window.location.href);
      if (
        destino.origin === window.location.origin &&
        destino.pathname === window.location.pathname &&
        destino.hash === '#concierge'
      ) {
        evento.preventDefault();
        setAberto(true);
      }
    }

    abrirPeloLinkERN();
    window.addEventListener('hashchange', abrirPeloLinkERN);
    document.addEventListener('click', aoClicarERN);

    return () => {
      window.removeEventListener('hashchange', abrirPeloLinkERN);
      document.removeEventListener('click', aoClicarERN);
    };
  }, []);
  const listaRef = useRef<HTMLDivElement>(null);

  const [vidaPausadaERN, setVidaPausadaERN] = useState(false);
  const legendaVidaERN = idioma === 'EN'
    ? (vidaPausadaERN ? 'Resume visual effect' : 'Pause visual effect')
    : idioma === 'ES'
      ? (vidaPausadaERN ? 'Reanudar efecto visual' : 'Pausar efecto visual')
      : (vidaPausadaERN ? 'Retomar efeito visual' : 'Pausar efeito visual');

  const controleVidaERN = (
    <button
      type="button"
      className="ern-vida-pausa"
      onClick={() => setVidaPausadaERN(valor => !valor)}
      aria-label={legendaVidaERN}
      title={legendaVidaERN}
    >
      <span aria-hidden="true">{vidaPausadaERN ? '▷' : 'Ⅱ'}</span>
    </button>
  );

  const limite = mensagens.length >= 61;
  const resumo = preferencias
    .map((valor, indice) => `${c.details[indice]}: ${valor}`)
    .join('\n');

  const corpoEmail = `${t.greeting}\n\n${resumo}\n\n${t.ending}`;
  const emailHref = `mailto:contato.encantosrionegro@gmail.com?subject=${encodeURIComponent(t.subject)}&body=${encodeURIComponent(corpoEmail)}`;

  useEffect(() => {
    const dialogo = dialogRef.current;
    if (!dialogo || !aberto) return;

    const overflowAnterior = document.body.style.overflow;
    document.body.style.overflow = 'hidden';

    if (!dialogo.open) dialogo.showModal();

    return () => {
      if (dialogo.open) dialogo.close();
      document.body.style.overflow = overflowAnterior;
    };
  }, [aberto]);

  useEffect(() => {
    const lista = listaRef.current;
    if (lista && aberto) lista.scrollTop = lista.scrollHeight;
  }, [mensagens, aberto]);

  function fechar() {
    setAberto(false);
    devolverFocoERN();
  }

  function reiniciar() {
    if (!window.confirm(c.clear)) return;
    setEtapa(0);
    setPreferencias([]);
    setEntrada('');
    setMensagens([{ autor: 'ern', texto: c.hello }]);
  }

  function enviar(valor: string) {
    const texto = valor.trim().slice(0, 300);
    if (!texto || limite) return;

    const normalizado = texto.normalize('NFD')
      .replace(/[\u0300-\u036f]/g, '').toLowerCase();

    let resposta: string;
    const preco = /\b(preco|precos|price|prices|precio|precios|valor|custa|cost|disponibilidade|availability|disponibilidad)\b/.test(normalizado);
    const contato = /\b(contato|contact|contacto|email|e-mail|humano|human|atendente)\b/.test(normalizado);
    const mapa = /^(mapa|map|destinos|destinations)$/.test(normalizado);
    const rede = /^(rede|network|red)$/.test(normalizado);
    const querResumo = /^(resumo|summary|resumen)$/.test(normalizado);

    if (preco || contato || mapa || rede || querResumo) {
      resposta = preco ? c.price
        : contato ? c.contact
        : mapa ? c.map
        : rede ? c.network
        : preferencias.length === 4 ? `${c.summary}\n\n${resumo}`
        : c.pending;

      if (etapa < 4) {
        const perguntas = [c.hello, c.destination, c.period, c.group];
        resposta += `\n\n${perguntas[etapa]}`;
      }
    } else if (etapa < 4) {
      const proximas = [...preferencias, texto];
      setPreferencias(proximas);
      setEtapa(etapa + 1);

      resposta = etapa === 0 ? c.destination
        : etapa === 1 ? c.period
        : etapa === 2 ? c.group
        : `${c.summary}\n\n${proximas.map((item, indice) => `${c.details[indice]}: ${item}`).join('\n')}\n\n${c.finish}`;
    } else {
      resposta = c.fallback;
    }

    setMensagens((atuais) => [
      ...atuais,
      { autor: 'visitante', texto },
      { autor: 'ern', texto: resposta },
    ]);
    setEntrada('');
  }

  return (
    <section className="ern-chat-compacto" aria-label={t.title} data-ern-vida-pausada={vidaPausadaERN}>
      {/* ERN_CONCIERGE_VISUAL_V2 */}
      <button
        ref={mobileRef}
        type="button"
        className="ern-concierge-mobile"
        aria-label={`${t.title}: ${c.open}`}
        aria-haspopup="dialog"
        aria-controls="ern-conversa"
        aria-expanded={aberto}
        onClick={() => setAberto(true)}
      >
        <span className="ern-concierge-orbe" aria-hidden="true">✦</span>
        <span>{t.title}</span>
      </button>
      <header className="cartao-topo">
        <span className="avatar" aria-hidden="true">✦</span>
        <div>
          <p className="marca">{t.title}</p>
          <p className="legenda">{c.badge}</p>
        </div>
        {controleVidaERN}
      </header>

      <div className="cartao-corpo">
        <h2>{t.welcome}</h2>
        <p>{t.intro}</p>
        <button
          ref={abrirRef}
          type="button"
          className="principal"
          aria-haspopup="dialog"
          aria-controls="ern-conversa"
          onClick={() => setAberto(true)}
        >
          {c.open} <span aria-hidden="true">↗</span>
        </button>
      </div>

      <dialog
        id="ern-conversa"
        ref={dialogRef}
        aria-labelledby="ern-chat-titulo"
        aria-describedby="ern-chat-privacidade"
        onCancel={(evento) => {
          evento.preventDefault();
          fechar();
        }}
        onClose={() => {
          setAberto(false);
          devolverFocoERN();
        }}
      >
        <div className="janela">
          <header className="chat-topo">
            <span className="avatar" aria-hidden="true">✦</span>
            <div className="identidade">
              <h2 id="ern-chat-titulo">{t.title}</h2>
              <p>{c.badge}</p>
            </div>
            {controleVidaERN}
            <button
              type="button"
              className="fechar"
              aria-label={c.close}
              onClick={fechar}
              autoFocus
            >×</button>
          </header>

          <div className="informacoes">
            <p id="ern-chat-privacidade">{c.privacy}</p>
          </div>

          <div
            className="mensagens"
            ref={listaRef}
            role="log"
            aria-label={t.title}
            aria-live="polite"
            aria-relevant="additions"
            tabIndex={0}
          >
            {mensagens.map((mensagem, indice) => (
              <div
                key={indice}
                className={`linha ${mensagem.autor === 'visitante' ? 'visitante' : 'assistente'}`}
              >
                <div className="balao">
                  <span className="autor">
                    {mensagem.autor === 'visitante' ? c.visitor : t.title}
                  </span>
                  <p>{mensagem.texto}</p>
                </div>
              </div>
            ))}
            {limite && <p className="limite" role="status">{c.limit}</p>}
          </div>

          {etapa === 0 && !limite && (
            <div className="sugestoes" aria-label={t.questions[0]}>
              {t.interests.map((interesse) => (
                <button
                  key={interesse}
                  type="button"
                  onClick={() => enviar(interesse)}
                >{interesse}</button>
              ))}
            </div>
          )}

          {etapa === 4 && (
            <nav className="atalhos" aria-label={t.explore}>
              <Link href="/destinos">{t.explore} ↗</Link>
              <Link href="/rede">{t.network} ↗</Link>
              <a href={emailHref} title={c.emailHelp}>{t.email} ↗</a>
            </nav>
          )}

          <form
            className="compositor"
            onSubmit={(evento) => {
              evento.preventDefault();
              enviar(entrada);
            }}
          >
            <label className="sr-only" htmlFor="ern-chat-mensagem">{c.input}</label>
            <input
              id="ern-chat-mensagem"
              value={entrada}
              maxLength={300}
              autoComplete="off"
              placeholder={c.placeholder}
              disabled={limite}
              onChange={(evento) => setEntrada(evento.target.value)}
            />
            <button
              type="submit"
              className="principal"
              disabled={!entrada.trim() || limite}
            >{c.send}</button>
          </form>

          <footer className="chat-rodape">
            <p>{etapa === 4 ? c.emailHelp : t.notice}</p>
            <button type="button" onClick={reiniciar}>
              {limite ? c.limitButton : c.restart}
            </button>
          </footer>
        </div>
      </dialog>

      <style jsx>{`
        .ern-chat-compacto {
          position: relative;
          width: 100%;
          max-width: 360px;
          margin-left: auto;
          border: 1px solid #d5bf81;
          border-radius: 20px;
          background: #fffcf0;
          color: #30260d;
          box-shadow: 0 10px 28px rgb(0 0 0 / 12%);
          font-family: var(--font-work-sans), sans-serif;
        }
        .cartao-topo, .chat-topo {
          display: flex; align-items: center; gap: 10px;
          padding: 14px 16px; border-bottom: 1px solid #dfcf9e;
          background: #fff3cf; border-radius: 20px 20px 0 0;
        }
        .avatar {
          display: grid; place-items: center; flex-shrink: 0;
          width: 32px; height: 32px; border-radius: 50%;
          background: #805600; color: white;
        }
        .marca { margin: 0; font-size: 14px; font-weight: 700; }
        .legenda { margin: 3px 0 0; font-size: 10px; line-height: 1.5; color: #695727; }
        .cartao-corpo { padding: 16px; }
        .cartao-corpo h2 {
          margin: 0; font-family: var(--font-fraunces), serif;
          color: #30260d; font-size: 23px; line-height: 1.2;
        }
        .cartao-corpo p {
          margin: 10px 0 14px; font-size: 12px;
          line-height: 1.65; color: #695727;
        }
        button { font-family: inherit; cursor: pointer; }
        .principal {
          display: inline-flex; align-items: center; justify-content: center; gap: 10px;
          min-height: 44px; padding: 10px 16px; border: 1px solid #805600;
          border-radius: 12px; background: #805600; color: white;
          font-size: 13px; font-weight: 600;
        }
        .cartao-corpo .principal { width: 100%; }
        .principal:hover:not(:disabled) { background: #644300; }
        button:disabled { opacity: .55; cursor: not-allowed; }
        dialog {
          box-sizing: border-box;
          position: fixed; inset: 0;
          width: min(460px, calc(100vw - 32px));
          height: min(680px, calc(100dvh - 32px));
          max-width: none; max-height: none;
          margin: auto; padding: 0;
          border: 1px solid #d5bf81; border-radius: 20px;
          background: #fffcf0; color: #30260d;
          overflow: hidden;
          font-family: var(--font-work-sans), sans-serif;
          box-shadow: 0 24px 80px rgb(0 0 0 / 30%);
        }
        dialog::backdrop { background: rgb(3 15 11 / 65%); }
        .janela { display: flex; flex-direction: column; height: 100%; min-height: 0; }
        .chat-topo { flex-shrink: 0; padding: 12px 14px; }
        .identidade { flex: 1; min-width: 0; }
        .identidade h2 { margin: 0; color: #30260d; font-size: 15px; font-weight: 700; }
        .identidade p { margin: 3px 0 0; color: #695727; font-size: 10px; }
        .fechar {
          flex-shrink: 0; width: 44px; height: 44px;
          border: 1px solid #c4ae72; border-radius: 12px;
          background: transparent; color: #805600; font-size: 26px;
        }
        .informacoes { flex-shrink: 0; padding: 8px 14px; border-bottom: 1px solid #e4d9b5; }
        .informacoes p { margin: 0; font-size: 10px; line-height: 1.5; color: #695727; }
        .mensagens {
          flex: 1; min-height: 0; overflow-y: auto;
          padding: 16px 14px; overscroll-behavior: contain;
          scrollbar-width: thin; background: #faf3df;
        }
        .linha { display: flex; margin-bottom: 12px; }
        .visitante { justify-content: flex-end; }
        .balao {
          max-width: 88%; padding: 11px 13px; border-radius: 15px 15px 15px 4px;
          background: #fffdf6; border: 1px solid #dfcf9e;
          overflow-wrap: anywhere;
        }
        .visitante .balao {
          border-radius: 15px 15px 4px 15px;
          background: #805600; border-color: #805600; color: #fff;
        }
        .autor { display: block; margin-bottom: 5px; font-size: 10px; font-weight: 700; }
        .balao p { margin: 0; white-space: pre-wrap; font-size: 13px; line-height: 1.65; }
        .sugestoes, .atalhos {
          display: flex; flex-wrap: wrap; gap: 6px;
          padding: 10px 14px; flex-shrink: 0;
          border-top: 1px solid #e4d9b5;
        }
        .sugestoes button, .atalhos :global(a) {
          display: inline-flex; align-items: center;
          min-height: 36px; padding: 7px 10px;
          border: 1px solid #b89c56; border-radius: 999px;
          color: #805600; background: #fffdf6;
          font-size: 11px; line-height: 1.4; text-decoration: none;
        }
        .compositor {
          display: flex; gap: 8px; padding: 10px 12px;
          border-top: 1px solid #dfcf9e; flex-shrink: 0;
        }
        .compositor input {
          flex: 1; min-width: 0; width: 100%; min-height: 44px;
          box-sizing: border-box; padding: 10px 12px;
          border: 1px solid #a58b48; border-radius: 12px;
          color: #30260d; background: white; font: inherit; font-size: 16px;
        }
        .compositor input::placeholder { color: #75643b; }
        .chat-rodape { padding: 0 14px 10px; flex-shrink: 0; }
        .chat-rodape p { margin: 0 0 5px; font-size: 10px; line-height: 1.5; color: #695727; }
        .chat-rodape button {
          min-height: 32px; padding: 4px 0; border: 0;
          background: transparent; color: #805600;
          font-size: 11px; text-decoration: underline;
        }
        .limite { font-size: 12px; line-height: 1.6; }
        .sr-only {
          position: absolute; width: 1px; height: 1px;
          padding: 0; margin: -1px; overflow: hidden;
          clip-path: inset(50%); white-space: nowrap;
        }
        button:focus-visible, input:focus-visible,
        .mensagens:focus-visible, .atalhos :global(a:focus-visible) {
          outline: 3px solid #805600; outline-offset: 2px;
        }
        @media (max-width: 1023px) {
          .ern-chat-compacto { margin-inline: auto; }
        }
        @media (max-width: 600px) {
          dialog {
            width: calc(100vw - 16px);
            height: calc(100dvh - 16px);
            border-radius: 16px;
          }
          .chat-topo { border-radius: 16px 16px 0 0; }
        }
        /* ERN_CONCIERGE_VISUAL_V2 */
        .ern-concierge-mobile {
          display: none;
        }

        .cartao-topo {
          position: relative;
          overflow: hidden;
        }

        .cartao-topo::after {
          content: '';
          position: absolute;
          right: 0;
          top: 18px;
          bottom: 18px;
          width: 3px;
          border-radius: 3px;
          background: #b58b38;
          pointer-events: none;
        }

        @media (prefers-reduced-motion: no-preference) {
          .cartao-topo::after {
            animation: ern-concierge-luz 2.4s ease-in-out 2;
          }
          .cartao-topo .avatar,
          .ern-concierge-orbe {
            animation: ern-concierge-orbe 2.4s ease-in-out 2;
          }
        }

        @keyframes ern-concierge-luz {
          0%, 100% { opacity: .5; box-shadow: 0 0 0 transparent; }
          50% { opacity: 1; box-shadow: 0 0 12px #d6ab56; }
        }

        @keyframes ern-concierge-orbe {
          0%, 100% { transform: scale(1); }
          50% { transform: scale(1.07); }
        }

        @media (max-width: 1023px) {
          .ern-chat-compacto {
            width: 0;
            height: 0;
            margin: 0;
            border: 0;
            background: transparent;
            box-shadow: none;
          }

          .cartao-topo,
          .cartao-corpo {
            display: none;
          }

          .ern-concierge-mobile {
            position: fixed;
            right: max(16px, env(safe-area-inset-right));
            bottom: calc(104px + env(safe-area-inset-bottom));
            z-index: 90;
            display: inline-flex;
            align-items: center;
            justify-content: center;
            gap: 9px;
            min-height: 48px;
            max-width: calc(100vw - 32px);
            padding: 8px 14px 8px 8px;
            border: 1px solid #d5bf81;
            border-radius: 999px;
            background: #fffcf0;
            color: #30260d;
            box-shadow: 0 5px 20px rgb(0 0 0 / 20%);
            font-size: 12px;
            font-weight: 700;
          }

          .ern-concierge-orbe {
            display: grid;
            place-items: center;
            flex-shrink: 0;
            width: 32px;
            height: 32px;
            border-radius: 50%;
            background: #805600;
            color: #fff;
            font-size: 20px;
          }
        }

        @media (max-height: 500px) {
          .informacoes, .chat-rodape p { display: none; }
          .sugestoes { max-height: 72px; overflow-y: auto; }
        }
      `}</style>
    </section>
  );
}