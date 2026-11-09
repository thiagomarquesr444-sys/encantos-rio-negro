'use client';

import { useEffect, useRef, useState } from 'react';
import Link from 'next/link';
import ConciergeLancadorERN from './ConciergeLancadorERN';
import IconeIara from './IconeIara';
import TextoDigitadoIA from './TextoDigitadoIA';
import { useLanguage } from '@/app/components/LanguageProvider';

const textos = {
  PT: {
    title: 'Iara',
    status: 'Guardiã das águas · Encantos da Amazônia',
    welcome: 'Vamos descobrir sua próxima viagem?',
    intro: 'A Encantos da Amazônia conecta você ao território e aos profissionais da região. Nossa rede está em formação.',
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
    privacy: 'As escolhas não são gravadas pela EDA e se perdem ao sair ou recarregar. O envio por e-mail acontece somente por sua iniciativa.',
    subject: 'EDA — interesse em viagem',
    greeting: 'Olá, equipe EDA! Gostaria de informações sobre estas possibilidades de viagem:',
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
    title: 'Iara',
    status: 'Guardian of the waters · Encantos da Amazônia',
    welcome: 'Where could your next trip take you?',
    intro: 'Encantos da Amazônia connects you with the region and local professionals. Our network is taking shape.',
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
    privacy: 'EDA does not save these choices. They reset when you leave or reload. Email is sent only when you choose to send it.',
    subject: 'EDA — travel enquiry',
    greeting: 'Hello, EDA team! I would like information about these travel possibilities:',
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
    title: 'Iara',
    status: 'Guardiana de las aguas · Encantos da Amazônia',
    welcome: '¿Descubrimos su próximo viaje?',
    intro: 'Encantos da Amazônia le conecta con el territorio y los profesionales locales. Nuestra red está en formación.',
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
    privacy: 'EDA no guarda estas elecciones. Se pierden al salir o recargar. El correo se envía solo por su iniciativa.',
    subject: 'EDA — consulta sobre viaje',
    greeting: '¡Hola, equipo EDA! Quisiera información sobre estas posibilidades de viaje:',
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
type LinkIara = { href: string; rotulo: string };
type MensagemERN = { autor: 'ern' | 'visitante'; texto: string; sugestoes?: string[]; links?: LinkIara[] };
const linkIaraSeguro = (l: LinkIara) => typeof l?.rotulo === 'string' && typeof l?.href === 'string' && (/^\/[a-z]/.test(l.href) || /^https:\/\/[^\s<>"]+$/i.test(l.href));

const conversaTextos = {
  PT: {
    badge: 'Guardiã das águas · assistente com IA',
    open: 'Conversar',
    close: 'Fechar conversa',
    send: 'Enviar',
    input: 'Sua mensagem',
    placeholder: 'Escreva sua mensagem...',
    hello: 'Oi! Eu sou a Iara, a guardiã das águas da Encantos da Amazônia. 🌊 Conheço os segredos do Rio Negro e adoro ajudar a planejar viagens. Me conta: o que te trouxe até aqui — pesca, natureza, cultura ou só curiosidade?',
    destination: 'Qual lugar você gostaria de conhecer? Pode ser Manaus, Novo Airão, Barcelos, Santa Isabel, São Gabriel ou um destino ainda a definir.',
    period: 'Em qual mês ou período você pensa em viajar? Se ainda não sabe, pode dizer “a definir”.',
    group: 'Quantas pessoas vão e por quantos dias? Pode responder, por exemplo, “2 pessoas, 5 dias”, ou deixar a definir.',
    summary: 'Aqui está o que você compartilhou:',
    details: ['Interesse', 'Destino', 'Período', 'Grupo e duração'],
    finish: 'Podemos começar pelo mapa ou pelos perfis da Rede. Para verificar possibilidades de atendimento, você também pode preparar um e-mail para a EDA. Ainda não há preço, disponibilidade ou reserva confirmados.',
    fallback: 'Nesta versão, consigo organizar suas preferências e orientar sobre os próximos passos. Para uma pergunta específica, use o contato da EDA abaixo. Você também pode escrever “mapa”, “rede”, “preço” ou “resumo”.',
    map: 'O mapa de Destinos ajuda a descobrir lugares. Use “Explorar destinos” abaixo. Os marcadores podem representar bases regionais, e não pontos exatos de acesso.',
    network: 'Na Rede você encontra publicações e perfis. Confira os canais informados por cada profissional. A presença de um perfil não confirma disponibilidade.',
    price: 'Ainda não consulto preços nem disponibilidade. Esses dados dependem do prestador, do período e da operação. Posso organizar suas preferências para um pedido de informações.',
    contact: 'O contato da EDA é contato.encantosrionegro@gmail.com. O botão de e-mail prepara uma mensagem; ela só é enviada quando você envia no seu aplicativo.',
    pending: 'Vamos completar suas preferências primeiro.',
    privacy: 'A Iara usa inteligência artificial para responder. A conversa não fica gravada e se perde ao recarregar; CPF, telefone e e-mail digitados são ocultados automaticamente. Não envie documentos, senhas ou dados sensíveis.',
    emailHelp: 'O e-mail abre no seu aplicativo para revisão e envio.',
    restart: 'Nova conversa',
    visitor: 'Você',
    limit: 'Você chegou ao limite desta conversa. Inicie uma nova conversa ou utilize o contato da EDA.',
    limitButton: 'Nova conversa para continuar',
    clear: 'Apagar esta conversa e começar novamente?',
    language: 'Português',
  },
  EN: {
    badge: 'Guardian of the waters · AI assistant',
    open: 'Start a conversation',
    close: 'Close conversation',
    send: 'Send',
    input: 'Your message',
    placeholder: 'Write your message...',
    hello: 'Hi! I am Iara, guardian of the waters at Encantos da Amazônia. 🌊 I know the secrets of the Rio Negro and love helping plan trips. Tell me: what brought you here — fishing, nature, culture or just curiosity?',
    destination: 'Which place would you like to visit? Manaus, Novo Airão, Barcelos, Santa Isabel, São Gabriel, or a destination still to be decided?',
    period: 'Which month or period are you considering? You can also say “not decided”.',
    group: 'How many people and how many days? For example, “2 people, 5 days”, or leave it undecided.',
    summary: 'Here is what you shared:',
    details: ['Interest', 'Destination', 'Period', 'Group and duration'],
    finish: 'Start with the map or network profiles below. You can also prepare an email to EDA to ask about possible assistance. Prices, availability and bookings are not confirmed.',
    fallback: 'This version organizes preferences and explains next steps. For a specific enquiry, use the EDA contact below. You can also type “map”, “network”, “price” or “summary”.',
    map: 'The destination map helps you discover places. Use “Explore destinations” below. Markers may represent regional bases rather than exact access points.',
    network: 'The network contains posts and profiles. Check each professional’s contact channels. A profile does not confirm availability.',
    price: 'I do not check prices or availability yet. They depend on the provider, period and operation. I can organize preferences for an enquiry.',
    contact: 'Contact EDA at contato.encantosrionegro@gmail.com. The email button prepares a message; it is sent only when you send it in your email app.',
    pending: 'Let us complete your preferences first.',
    privacy: 'Iara uses artificial intelligence to reply. The chat is not saved and resets on reload; IDs, phone numbers and emails you type are hidden automatically. Do not send documents, passwords or sensitive data.',
    emailHelp: 'Email opens in your app for review and sending.',
    restart: 'New conversation',
    visitor: 'You',
    limit: 'This conversation has reached its limit. Start a new one or contact EDA.',
    limitButton: 'Start a new conversation to continue',
    clear: 'Clear this conversation and start again?',
    language: 'English',
  },
  ES: {
    badge: 'Guardiana de las aguas · asistente con IA',
    open: 'Conversar',
    close: 'Cerrar conversación',
    send: 'Enviar',
    input: 'Su mensaje',
    placeholder: 'Escriba su mensaje...',
    hello: '¡Hola! Soy Iara, la guardiana de las aguas de Encantos da Amazônia. 🌊 Conozco los secretos del Río Negro y me encanta ayudar a planear viajes. Cuéntame: ¿qué te trajo aquí — pesca, naturaleza, cultura o pura curiosidad?',
    destination: '¿Qué lugar le gustaría conocer? Manaus, Novo Airão, Barcelos, Santa Isabel, São Gabriel, o un destino por definir.',
    period: '¿En qué mes o período piensa viajar? Si todavía no sabe, puede decir “por definir”.',
    group: '¿Cuántas personas y cuántos días? Por ejemplo, “2 personas, 5 días”, o déjelo por definir.',
    summary: 'Esto es lo que compartió:',
    details: ['Interés', 'Destino', 'Período', 'Grupo y duración'],
    finish: 'Puede empezar por el mapa o los perfiles de la red. También puede preparar un correo a EDA para consultar posibilidades de atención. No hay precios, disponibilidad ni reservas confirmados.',
    fallback: 'Esta versión organiza preferencias y orienta sobre los próximos pasos. Para una consulta específica, utilice el contacto de EDA. También puede escribir “mapa”, “red”, “precio” o “resumen”.',
    map: 'El mapa de destinos ayuda a descubrir lugares. Use “Explorar destinos” abajo. Los marcadores pueden representar bases regionales, no puntos exactos de acceso.',
    network: 'La red contiene publicaciones y perfiles. Consulte los canales de cada profesional. Un perfil no confirma disponibilidad.',
    price: 'Todavía no consulto precios ni disponibilidad. Dependen del prestador, período y operación. Puedo organizar preferencias para una consulta.',
    contact: 'El contacto es contato.encantosrionegro@gmail.com. El botón prepara un correo; solo se envía cuando usted lo envía desde su aplicación.',
    pending: 'Primero completemos sus preferencias.',
    privacy: 'Iara usa inteligencia artificial para responder. La conversación no se guarda y se pierde al recargar; documentos, teléfonos y correos escritos se ocultan automáticamente. No envíe documentos, contraseñas ni datos sensibles.',
    emailHelp: 'El correo abre en su aplicación para revisar y enviar.',
    restart: 'Nueva conversación',
    visitor: 'Usted',
    limit: 'Esta conversación llegó a su límite. Inicie otra o utilice el contacto de EDA.',
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
    document.getElementById('ern-abrir-concierge')?.focus({
      preventScroll: true,
    });
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
  const [animandoIara, setAnimandoIara] = useState<number | null>(null);
  // EDA_IARA_PRO_V1: ficha da conversa (memória) e sessão anônima para métricas.
  const fichaIara = useRef<Record<string, unknown>>({});
  const linksResposta = useRef<LinkIara[]>([]);
  const sessaoIara = useRef('');
  useEffect(() => {
    try {
      let s = sessionStorage.getItem('iara.sessao');
      if (!s) { s = (crypto.randomUUID?.() ?? `${Date.now()}-${Math.random().toString(36).slice(2)}`).replace(/[^a-z0-9-]/gi, '').slice(0, 64); sessionStorage.setItem('iara.sessao', s); }
      sessaoIara.current = s;
    } catch {}
  }, []);
  // Seletor de linguagem: jeito regional (padrão) ou formal.
  const [estiloIara, setEstiloIara] = useState<'regional' | 'formal'>('regional');
  useEffect(() => { try { if (localStorage.getItem('iara.estilo') === 'formal') setEstiloIara('formal'); } catch {} }, []);
  const trocarEstiloIara = () => setEstiloIara(e => { const n = e === 'regional' ? 'formal' : 'regional'; try { localStorage.setItem('iara.estilo', n); } catch {} return n; });

  // EDA_FASE_B_V1: pedido com consentimento (LGPD) — o visitante preenche os próprios dados.
  type PedidoIara = { passeio_slug: string | null; passeio_nome: string | null; adultos: number | null; criancas: number | null; periodo: string | null };
  const [pedidoIara, setPedidoIara] = useState<PedidoIara | null>(null);
  const [formPedido, setFormPedido] = useState({ nome: '', whatsapp: '', email: '', adultos: '2', criancas: '0', periodo: '', mensagem: '', aceite: false });
  const [enviandoPedido, setEnviandoPedido] = useState(false);
  const [erroPedido, setErroPedido] = useState('');
  const tp = {
    PT: { titulo: 'Levar meu pedido à operadora', nome: 'Seu nome', zap: 'WhatsApp (com DDD)', email: 'ou e-mail', adultos: 'Adultos', criancas: 'Crianças', periodo: 'Quando pretende ir', msg: 'Algo mais? (opcional)', aceite: 'Aceito que a Encantos da Amazônia e a operadora do passeio usem estes dados para entrar em contato sobre este pedido. Os dados são apagados em até 90 dias.', priv: 'Privacidade', enviar: 'Enviar pedido', cancelar: 'Agora não', ok: (n: string) => `Pronto, ${n}! 🌊 Seu pedido já está com a operadora. Ela vai te responder com valores e datas confirmados. Enquanto isso, posso te contar mais sobre a região?`, okGeral: (n: string) => `Pronto, ${n}! 🌊 Recebemos seu pedido e vamos indicar a operadora ideal para você. Quer continuar explorando enquanto isso?` },
    EN: { titulo: 'Send my request to the operator', nome: 'Your name', zap: 'WhatsApp (with country code)', email: 'or email', adultos: 'Adults', criancas: 'Children', periodo: 'When do you plan to go', msg: 'Anything else? (optional)', aceite: 'I agree that Encantos da Amazônia and the tour operator may use this data to contact me about this request. Data is deleted within 90 days.', priv: 'Privacy', enviar: 'Send request', cancelar: 'Not now', ok: (n: string) => `Done, ${n}! 🌊 Your request is with the operator, who will reply with confirmed prices and dates. Shall I tell you more about the region meanwhile?`, okGeral: (n: string) => `Done, ${n}! 🌊 We received your request and will point you to the right operator. Want to keep exploring?` },
    ES: { titulo: 'Llevar mi pedido a la operadora', nome: 'Tu nombre', zap: 'WhatsApp (con código)', email: 'o correo', adultos: 'Adultos', criancas: 'Niños', periodo: 'Cuándo piensas ir', msg: '¿Algo más? (opcional)', aceite: 'Acepto que Encantos da Amazônia y la operadora del paseo usen estos datos para contactarme sobre este pedido. Los datos se eliminan en hasta 90 días.', priv: 'Privacidad', enviar: 'Enviar pedido', cancelar: 'Ahora no', ok: (n: string) => `¡Listo, ${n}! 🌊 Tu pedido ya está con la operadora, que responderá con precios y fechas confirmados. ¿Te cuento más de la región mientras tanto?`, okGeral: (n: string) => `¡Listo, ${n}! 🌊 Recibimos tu pedido y te indicaremos la operadora ideal. ¿Seguimos explorando?` },
  }[idioma];

  async function enviarPedido() {
    if (enviandoPedido || !pedidoIara) return;
    setErroPedido('');
    if (!formPedido.aceite) { setErroPedido(tp.aceite.split('.')[0] + '.'); return; }
    setEnviandoPedido(true);
    try {
      const r = await fetch('/api/pedido-visitante', {
        method: 'POST', headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          nome: formPedido.nome, whatsapp: formPedido.whatsapp || null, email: formPedido.email || null, idioma,
          periodo: formPedido.periodo || null, adultos: Number(formPedido.adultos) || 1, criancas: Number(formPedido.criancas) || 0,
          mensagem: formPedido.mensagem || null, passeio_slug: pedidoIara.passeio_slug, consentimento: true, sessao: sessaoIara.current || undefined,
        }),
      });
      const j = await r.json().catch(() => ({})) as { ok?: boolean; erro?: string; operadora?: boolean };
      if (!r.ok || !j.ok) { setErroPedido(j.erro || 'Não foi possível enviar agora.'); return; }
      const nome = formPedido.nome.trim().split(' ')[0];
      setPedidoIara(null);
      setAnimandoIara(mensagens.length);
      setMensagens(m => [...m, { autor: 'ern', texto: j.operadora ? tp.ok(nome) : tp.okGeral(nome) }]);
      setFormPedido(f => ({ ...f, mensagem: '', aceite: false }));
    } catch {
      setErroPedido('Sem conexão agora. Tente de novo.');
    } finally {
      setEnviandoPedido(false);
    }
  }

  // EDA_FASE_A_V1: iniciativa única da Iara — oferece ajuda uma vez por visita,
  // depois de ~40 s na página (ou ~8 s para quem está voltando). Fechou, não volta.
  const [ofertaIara, setOfertaIara] = useState<string | null>(null);
  useEffect(() => {
    let voltou = false;
    try {
      if (sessionStorage.getItem('iara.oferta.v1')) return;
      voltou = !!localStorage.getItem('iara.visitou.v1');
      localStorage.setItem('iara.visitou.v1', '1');
    } catch { return; }
    const noPasseio = /^\/experiencias\/[a-z0-9-]+$/.test(window.location.pathname);
    const regional = (() => { try { return localStorage.getItem('iara.estilo') !== 'formal'; } catch { return true; } })();
    const textos = {
      PT: noPasseio
        ? (regional ? 'Égua, gostou desse passeio? Posso ver as vagas e os valores pra ti 🌊' : 'Gostou deste passeio? Posso verificar vagas e valores para você 🌊')
        : voltou ? (regional ? 'Que bom te ver de volta, maninho! Bora continuar planejando tua viagem?' : 'Que bom te ver de volta! Quer continuar planejando sua viagem comigo?') : 'Oi, eu sou a Iara 🌊 Posso te ajudar a escolher a experiência ideal?',
      EN: voltou ? 'Welcome back! Shall we keep planning your trip?' : 'Hi, I am Iara 🌊 Can I help you find the perfect experience?',
      ES: voltou ? '¡Qué bueno verte de nuevo! ¿Seguimos planeando tu viaje?' : 'Hola, soy Iara 🌊 ¿Te ayudo a elegir la experiencia ideal?',
    };
    const id = window.setTimeout(() => {
      try { sessionStorage.setItem('iara.oferta.v1', '1'); } catch {}
      setOfertaIara(textos[idioma]);
    }, voltou ? 8000 : noPasseio ? 25000 : 40000);
    return () => window.clearTimeout(id);
    // Uma vez por montagem; o idioma inicial basta.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);
  useEffect(() => { if (aberto) setOfertaIara(null); }, [aberto]);

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

  // ERN_DIGITANDO_V1
  const [digitandoERN, setDigitandoERN] = useState(false);
  const enviandoERN = useRef(false);

  // EDA_IARA_AUDIO_V1: o visitante grava um áudio (pensado para o celular);
  // o servidor transcreve (Whisper/Groq, sem guardar o áudio) e a frase vai
  // para a Iara como se tivesse sido escrita. Toque para gravar, toque para enviar.
  const [gravando, setGravando] = useState(false);
  const [transcrevendo, setTranscrevendo] = useState(false);
  const [segundosAudio, setSegundosAudio] = useState(0);
  const [erroAudio, setErroAudio] = useState<string | null>(null);
  const [audioSuportado, setAudioSuportado] = useState(false);
  const gravadorRef = useRef<MediaRecorder | null>(null);
  const fluxoRef = useRef<MediaStream | null>(null);
  const pedacosRef = useRef<Blob[]>([]);
  const cancelarAudioRef = useRef(false);
  const relogioAudioRef = useRef<ReturnType<typeof setInterval> | null>(null);
  const enviarRef = useRef<(v: string, origem?: 'busca') => void>(() => undefined);
  const MAX_AUDIO_S = 60;
  const ta = idioma === 'EN'
    ? { gravar: 'Record a voice message', parar: 'Stop and send', cancelar: 'Cancel recording', gravandoTxt: 'Recording…', ouvindo: 'Listening to your audio…', semMic: 'I could not access the microphone. Check the permission in your browser.', falha: 'I could not understand the audio. Could you type it?' }
    : idioma === 'ES'
      ? { gravar: 'Grabar un audio', parar: 'Detener y enviar', cancelar: 'Cancelar grabación', gravandoTxt: 'Grabando…', ouvindo: 'Escuchando tu audio…', semMic: 'No pude acceder al micrófono. Revisa el permiso del navegador.', falha: 'No pude entender el audio. ¿Puedes escribirlo?' }
      : { gravar: 'Gravar áudio', parar: 'Parar e enviar', cancelar: 'Cancelar gravação', gravandoTxt: 'Gravando…', ouvindo: 'Ouvindo seu áudio…', semMic: 'Não consegui acessar o microfone. Confira a permissão no navegador.', falha: 'Não consegui entender o áudio. Pode escrever?' };

  useEffect(() => {
    setAudioSuportado(typeof window !== 'undefined' && typeof window.MediaRecorder !== 'undefined' && !!navigator.mediaDevices?.getUserMedia);
    return () => { liberarMicrofone(); };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  function liberarMicrofone() {
    if (relogioAudioRef.current) { clearInterval(relogioAudioRef.current); relogioAudioRef.current = null; }
    fluxoRef.current?.getTracks().forEach((faixa) => faixa.stop());
    fluxoRef.current = null;
  }

  async function iniciarAudio() {
    if (gravando || transcrevendo || limite || digitandoERN) return;
    setErroAudio(null);
    try {
      const fluxo = await navigator.mediaDevices.getUserMedia({ audio: { echoCancellation: true, noiseSuppression: true } });
      fluxoRef.current = fluxo;
      const tipos = ['audio/webm;codecs=opus', 'audio/webm', 'audio/mp4', 'audio/ogg;codecs=opus'];
      const tipo = tipos.find((x) => MediaRecorder.isTypeSupported?.(x));
      const gravador = new MediaRecorder(fluxo, tipo ? { mimeType: tipo, audioBitsPerSecond: 32000 } : undefined);
      pedacosRef.current = [];
      cancelarAudioRef.current = false;
      gravador.ondataavailable = (e) => { if (e.data.size) pedacosRef.current.push(e.data); };
      gravador.onstop = () => {
        liberarMicrofone();
        setGravando(false);
        const blob = new Blob(pedacosRef.current, { type: gravador.mimeType || tipo || 'audio/webm' });
        pedacosRef.current = [];
        if (cancelarAudioRef.current || blob.size < 800) return;
        void transcreverAudio(blob);
      };
      gravadorRef.current = gravador;
      gravador.start(250);
      setSegundosAudio(0);
      setGravando(true);
      if (navigator.vibrate) navigator.vibrate(30);
      let decorridos = 0;
      relogioAudioRef.current = setInterval(() => {
        decorridos += 1;
        setSegundosAudio(decorridos);
        if (decorridos >= MAX_AUDIO_S) pararAudio(false);
      }, 1000);
    } catch {
      liberarMicrofone();
      setErroAudio(ta.semMic);
    }
  }

  function pararAudio(cancelar: boolean) {
    cancelarAudioRef.current = cancelar;
    const g = gravadorRef.current;
    if (g && g.state !== 'inactive') g.stop();
    else { liberarMicrofone(); setGravando(false); }
  }

  async function transcreverAudio(blob: Blob) {
    setTranscrevendo(true);
    try {
      const corpo = new FormData();
      corpo.append('audio', blob, 'audio');
      corpo.append('idioma', idioma);
      const r = await fetch('/api/iara-audio', { method: 'POST', body: corpo });
      const j = await r.json().catch(() => ({})) as { texto?: string; erro?: string };
      if (!r.ok || !j.texto) { setErroAudio(j.erro || ta.falha); return; }
      enviarRef.current(j.texto);
    } catch {
      setErroAudio(ta.falha);
    } finally {
      setTranscrevendo(false);
    }
  }
  const respostaTimerERN = useRef<ReturnType<typeof setTimeout> | null>(null);
  const textoDigitandoERN = idioma === 'EN'
    ? 'Preparing a response'
    : idioma === 'ES'
      ? 'Preparando respuesta'
      : 'Preparando resposta';

  useEffect(() => {
    return () => {
      if (respostaTimerERN.current !== null) {
        clearTimeout(respostaTimerERN.current);
      }
    };
  }, []);

  const limite = mensagens.length >= 61;

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
  }, [mensagens, aberto, digitandoERN]);

  function fechar() {
    if (gravadorRef.current?.state === 'recording') pararAudio(true);
    setAberto(false);
    devolverFocoERN();
  }

  function reiniciar() {
    if (!window.confirm(c.clear)) return;

    if (respostaTimerERN.current !== null) {
      clearTimeout(respostaTimerERN.current);
      respostaTimerERN.current = null;
    }
    enviandoERN.current = false;
    setDigitandoERN(false);
    setEtapa(0);
    setPreferencias([]);
    setEntrada('');
    setMensagens([{ autor: 'ern', texto: c.hello }]);
  }

  function enviar(valor: string, origem?: 'busca') {
    const texto = valor.trim().slice(0, 300);
    if (!texto || limite || enviandoERN.current) return;

    const normalizado = texto.normalize('NFD')
      .replace(/[\u0300-\u036f]/g, '').toLowerCase();

    // Atalhos de uma palavra continuam com resposta pronta; o resto vai para a Iara (IA).
    const mapa = /^(mapa|map|destinos|destinations)$/.test(normalizado);
    const rede = /^(rede|network|red)$/.test(normalizado);
    const respostaPronta = mapa ? c.map : rede ? c.network : null;

    enviandoERN.current = true;
    setDigitandoERN(true);

    const historico = [...mensagens, { autor: 'visitante' as const, texto }]
      .slice(-12)
      .map(m => ({ papel: m.autor === 'visitante' ? 'usuario' : 'eda', texto: m.texto }));

    setMensagens((atuais) => [...atuais, { autor: 'visitante', texto }]);
    setEntrada('');

    const indiceResposta = mensagens.length + 1;
    linksResposta.current = [];
    const responder = (final: string, sugestoes: string[] = []) => {
      setAnimandoIara(indiceResposta);
      const links = linksResposta.current;
      setMensagens((atuais) => [...atuais, { autor: 'ern', texto: final, sugestoes, links }]);
      setDigitandoERN(false);
      enviandoERN.current = false;
      respostaTimerERN.current = null;
    };

    if (respostaPronta) {
      respostaTimerERN.current = setTimeout(() => responder(respostaPronta), 700);
      return;
    }

    fetch('/api/eda-ia', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ modo: 'publico', idioma, estilo: estiloIara, mensagens: historico, ficha: fichaIara.current, sessao: sessaoIara.current || undefined, origem, pagina_atual: { caminho: window.location.pathname.slice(0, 120) } }),
    })
      .then(r => r.json())
      .then((j: { resposta?: string; erro?: string; sugestoes?: unknown; pedido?: PedidoIara | null; ficha?: unknown; links?: unknown }) => {
        if (!j.resposta) throw new Error(j.erro || 'sem resposta');
        if (j.ficha && typeof j.ficha === 'object') fichaIara.current = j.ficha as Record<string, unknown>;
        linksResposta.current = Array.isArray(j.links) ? (j.links as LinkIara[]).filter(linkIaraSeguro).slice(0, 3) : [];
        if (j.pedido && typeof j.pedido === 'object') {
          const pd = j.pedido;
          setPedidoIara({ passeio_slug: typeof pd.passeio_slug === 'string' ? pd.passeio_slug : null, passeio_nome: typeof pd.passeio_nome === 'string' ? pd.passeio_nome : null, adultos: pd.adultos ?? null, criancas: pd.criancas ?? null, periodo: typeof pd.periodo === 'string' ? pd.periodo : null });
          setFormPedido(f => ({ ...f, adultos: pd.adultos ? String(pd.adultos) : f.adultos, criancas: pd.criancas != null ? String(pd.criancas) : f.criancas, periodo: typeof pd.periodo === 'string' ? pd.periodo : f.periodo }));
        }
        const sugestoes = Array.isArray(j.sugestoes)
          ? j.sugestoes.filter((x): x is string => typeof x === 'string').map(x => x.slice(0, 80)).slice(0, 3)
          : [];
        responder(j.resposta.replace(/\*\*/g, ''), sugestoes);
      })
      .catch((e: unknown) => responder(e instanceof Error && /limite|Volte amanh/i.test(e.message) ? e.message : c.fallback));
  }

  enviarRef.current = enviar;

  // EDA_IARA_PONTE_V1: a busca da página Descubra, o botão "Planejar viagem" e
  // qualquer outro ponto do portal abrem a Iara por este evento (com ou sem texto).
  useEffect(() => {
    let espera: ReturnType<typeof setTimeout> | null = null;
    function aoChamar(evento: Event) {
      const detalhe = (evento as CustomEvent<{ texto?: unknown; origem?: unknown }>).detail;
      const texto = typeof detalhe?.texto === 'string' ? detalhe.texto.trim().slice(0, 300) : '';
      setOfertaIara(null);
      setAberto(true);
      if (!texto) return;
      if (espera) clearTimeout(espera);
      espera = setTimeout(() => enviarRef.current(texto, detalhe?.origem === 'busca' ? 'busca' : undefined), 380);
    }
    window.addEventListener('iara:abrir', aoChamar);
    return () => { window.removeEventListener('iara:abrir', aoChamar); if (espera) clearTimeout(espera); };
  }, []);

  return (
    <section className="ern-chat-compacto" aria-label={t.title} data-ern-vida-pausada={vidaPausadaERN}>
      {/* ERN_CONCIERGE_VISUAL_V2 */}
      {ofertaIara && !aberto && (
        <div role="status" className="iara-oferta">
          <span aria-hidden="true" className="iara-oferta-avatar"><IconeIara /></span>
          <div className="iara-oferta-corpo">
            <span className="iara-oferta-nome">Iara</span>
            <p>{ofertaIara}</p>
            <button type="button" className="iara-oferta-acao" onClick={() => { setOfertaIara(null); setAberto(true); }}>{c.open} <span aria-hidden="true">→</span></button>
          </div>
          <button type="button" className="iara-oferta-fechar" aria-label={c.close} onClick={() => setOfertaIara(null)}>×</button>
        </div>
      )}
      <ConciergeLancadorERN
        idioma={idioma}
        aberto={aberto}
        pausado={vidaPausadaERN}
        aoAbrir={() => setAberto(true)}
        aoPausar={() => setVidaPausadaERN(valor => !valor)}
      />
      <header className="cartao-topo">
        <span className="avatar" aria-hidden="true"><IconeIara /></span>
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
            <span className="avatar" aria-hidden="true"><IconeIara /></span>
            <div className="identidade">
              <h2 id="ern-chat-titulo">{t.title}</h2>
              <p>{c.badge}</p>
            </div>
            <button
              type="button"
              onClick={trocarEstiloIara}
              aria-pressed={estiloIara === 'formal'}
              title={idioma === 'EN' ? 'Switch between regional and formal language' : idioma === 'ES' ? 'Cambiar entre lenguaje regional y formal' : 'Alternar entre jeito regional e linguagem formal'}
              style={{ flex: 'none', padding: '4px 9px', borderRadius: 999, border: '1px solid rgb(244 199 126 / 35%)', background: 'transparent', color: 'inherit', fontSize: 11, fontWeight: 600, cursor: 'pointer' }}
            >{estiloIara === 'regional' ? (idioma === 'PT' ? 'Jeito regional' : 'Regional') : 'Formal'}</button>
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
                  <p>
                    {mensagem.autor === 'ern'
                      ? <TextoDigitadoIA texto={mensagem.texto} animar={animandoIara === indice} render={(t2) => t2} aoTerminar={() => setAnimandoIara(a => (a === indice ? null : a))} />
                      : mensagem.texto}
                  </p>
                  {mensagem.autor === 'ern' && animandoIara !== indice && !!mensagem.links?.length && (
                    <div className="iara-links" style={{ display: 'flex', flexWrap: 'wrap', gap: 6, marginTop: 8 }}>
                      {mensagem.links.map(l => l.href.startsWith('/')
                        ? <Link key={l.href} href={l.href} className="iara-link">{l.rotulo} →</Link>
                        : <a key={l.href} href={l.href} target="_blank" rel="noopener noreferrer" className="iara-link">{l.rotulo} ↗</a>)}
                    </div>
                  )}
                </div>
              </div>
            ))}
            {digitandoERN && (
              <div className="linha assistente">
                <div className="balao ern-digitando" role="status">
                  <span className="autor">{t.title}</span>
                  <span className="sr-only">{textoDigitandoERN}</span>
                  <span className="ern-pontos" aria-hidden="true">
                    <i /><i /><i />
                  </span>
                </div>
              </div>
            )}
            {pedidoIara && !digitandoERN && animandoIara === null && (
              <form
                className="iara-pedido"
                onSubmit={(e) => { e.preventDefault(); void enviarPedido(); }}
                style={{ display: 'grid', gap: 8, margin: '6px 0', padding: 12, borderRadius: 14, border: '1px solid rgb(244 199 126 / 35%)', background: 'rgb(244 199 126 / 7%)' }}
              >
                <strong style={{ fontSize: 14 }}>{tp.titulo}{pedidoIara.passeio_nome ? ` · ${pedidoIara.passeio_nome}` : ''}</strong>
                <input required maxLength={80} autoComplete="name" placeholder={tp.nome} aria-label={tp.nome} value={formPedido.nome} onChange={e => setFormPedido(f => ({ ...f, nome: e.target.value }))} style={{ width: '100%', padding: '8px 10px', borderRadius: 10, border: '1px solid rgb(244 199 126 / 30%)', background: 'rgb(0 0 0 / 18%)', color: 'inherit', font: 'inherit', fontSize: 13.5 }} />
                <input type="tel" maxLength={25} autoComplete="tel" placeholder={tp.zap} aria-label={tp.zap} value={formPedido.whatsapp} onChange={e => setFormPedido(f => ({ ...f, whatsapp: e.target.value }))} style={{ width: '100%', padding: '8px 10px', borderRadius: 10, border: '1px solid rgb(244 199 126 / 30%)', background: 'rgb(0 0 0 / 18%)', color: 'inherit', font: 'inherit', fontSize: 13.5 }} />
                <input type="email" maxLength={254} autoComplete="email" placeholder={tp.email} aria-label={tp.email} value={formPedido.email} onChange={e => setFormPedido(f => ({ ...f, email: e.target.value }))} style={{ width: '100%', padding: '8px 10px', borderRadius: 10, border: '1px solid rgb(244 199 126 / 30%)', background: 'rgb(0 0 0 / 18%)', color: 'inherit', font: 'inherit', fontSize: 13.5 }} />
                <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 8 }}>
                  <label style={{ fontSize: 12 }}>{tp.adultos}<input type="number" min={1} max={99} value={formPedido.adultos} onChange={e => setFormPedido(f => ({ ...f, adultos: e.target.value }))} style={{ width: '100%', padding: '8px 10px', borderRadius: 10, border: '1px solid rgb(244 199 126 / 30%)', background: 'rgb(0 0 0 / 18%)', color: 'inherit', font: 'inherit', fontSize: 13.5 }} /></label>
                  <label style={{ fontSize: 12 }}>{tp.criancas}<input type="number" min={0} max={99} value={formPedido.criancas} onChange={e => setFormPedido(f => ({ ...f, criancas: e.target.value }))} style={{ width: '100%', padding: '8px 10px', borderRadius: 10, border: '1px solid rgb(244 199 126 / 30%)', background: 'rgb(0 0 0 / 18%)', color: 'inherit', font: 'inherit', fontSize: 13.5 }} /></label>
                </div>
                <input maxLength={60} placeholder={tp.periodo} aria-label={tp.periodo} value={formPedido.periodo} onChange={e => setFormPedido(f => ({ ...f, periodo: e.target.value }))} style={{ width: '100%', padding: '8px 10px', borderRadius: 10, border: '1px solid rgb(244 199 126 / 30%)', background: 'rgb(0 0 0 / 18%)', color: 'inherit', font: 'inherit', fontSize: 13.5 }} />
                <textarea rows={2} maxLength={800} placeholder={tp.msg} aria-label={tp.msg} value={formPedido.mensagem} onChange={e => setFormPedido(f => ({ ...f, mensagem: e.target.value }))} style={{ width: '100%', padding: '8px 10px', borderRadius: 10, border: '1px solid rgb(244 199 126 / 30%)', background: 'rgb(0 0 0 / 18%)', color: 'inherit', font: 'inherit', fontSize: 13.5, resize: 'vertical' }} />
                <label style={{ display: 'flex', gap: 8, alignItems: 'flex-start', fontSize: 12, lineHeight: 1.4 }}>
                  <input type="checkbox" checked={formPedido.aceite} onChange={e => setFormPedido(f => ({ ...f, aceite: e.target.checked }))} style={{ marginTop: 2 }} />
                  <span>{tp.aceite} <Link href="/privacidade" target="_blank">{tp.priv}</Link></span>
                </label>
                {erroPedido && <p role="alert" style={{ margin: 0, fontSize: 12.5, color: '#f08a8a' }}>{erroPedido}</p>}
                <div style={{ display: 'flex', gap: 8, flexWrap: 'wrap' }}>
                  <button type="submit" disabled={enviandoPedido || !formPedido.nome.trim() || (!formPedido.whatsapp.trim() && !formPedido.email.trim()) || !formPedido.aceite} style={{ padding: '8px 14px', borderRadius: 999, border: 0, fontWeight: 600, color: '#1a1205', background: '#f4c77e', cursor: 'pointer' }}>{tp.enviar}</button>
                  <button type="button" onClick={() => setPedidoIara(null)} style={{ padding: '8px 14px', borderRadius: 999, border: '1px solid rgb(244 199 126 / 35%)', background: 'transparent', color: 'inherit', cursor: 'pointer' }}>{tp.cancelar}</button>
                </div>
              </form>
            )}
            {limite && <p className="limite" role="status">{c.limit}</p>}
          </div>

          {erroAudio && <p className="iara-audio-erro" role="alert">{erroAudio}</p>}
          <form
            className="compositor"
            data-gravando={gravando || undefined}
            onSubmit={(evento) => {
              evento.preventDefault();
              enviar(entrada);
            }}
          >
            {gravando ? (
              <>
                <button type="button" className="iara-audio-cancelar" onClick={() => pararAudio(true)} aria-label={ta.cancelar} title={ta.cancelar}>
                  <svg viewBox="0 0 24 24" width="20" height="20" aria-hidden="true"><path d="M6 7h12M9.5 7V5h5v2M8 7l.8 12h6.4L16 7" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round" /></svg>
                </button>
                <div className="iara-audio-status" role="status" aria-live="polite">
                  <span className="iara-audio-ponto" aria-hidden="true" />
                  <span>{ta.gravandoTxt}</span>
                  <span className="iara-audio-tempo">{`0:${String(segundosAudio).padStart(2, '0')}`}</span>
                  <span className="iara-audio-onda" aria-hidden="true"><i /><i /><i /><i /><i /></span>
                </div>
                <button type="button" className="principal iara-audio-btn" onClick={() => pararAudio(false)} aria-label={ta.parar} title={ta.parar}>
                  <svg viewBox="0 0 24 24" width="20" height="20" aria-hidden="true"><path d="M4 12l15-7-5 15-2.5-6.2L4 12Z" fill="currentColor" /></svg>
                </button>
              </>
            ) : transcrevendo ? (
              <div className="iara-audio-status" role="status" aria-live="polite">
                <span className="iara-audio-onda" aria-hidden="true"><i /><i /><i /><i /><i /></span>
                <span>{ta.ouvindo}</span>
              </div>
            ) : (
              <>
                <label className="sr-only" htmlFor="ern-chat-mensagem">{c.input}</label>
                <input
                  id="ern-chat-mensagem"
                  value={entrada}
                  maxLength={300}
                  autoComplete="off"
                  placeholder={c.placeholder}
                  disabled={limite || digitandoERN}
                  onChange={(evento) => { setEntrada(evento.target.value); if (erroAudio) setErroAudio(null); }}
                />
                {audioSuportado && !entrada.trim() ? (
                  <button
                    type="button"
                    className="principal iara-audio-btn"
                    onClick={() => void iniciarAudio()}
                    disabled={limite || digitandoERN}
                    aria-label={ta.gravar}
                    title={ta.gravar}
                  >
                    <svg viewBox="0 0 24 24" width="20" height="20" aria-hidden="true"><rect x="9" y="3" width="6" height="11" rx="3" fill="currentColor" /><path d="M5.5 11a6.5 6.5 0 0 0 13 0M12 17.5V21" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" /></svg>
                  </button>
                ) : (
                  <button
                    type="submit"
                    className="principal"
                    disabled={!entrada.trim() || limite || digitandoERN}
                  >{c.send}</button>
                )}
              </>
            )}
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
          border: 1px solid #d6d2c8;
          border-radius: 20px;
          background: #ffffff;
          color: #0f1c17;
          box-shadow: 0 10px 28px rgb(0 0 0 / 12%);
          font-family: var(--font-work-sans), sans-serif;
        }
        .cartao-topo, .chat-topo {
          display: flex; align-items: center; gap: 10px;
          padding: 14px 16px; border-bottom: 1px solid #e3dfd6;
          background: #f3f1ec; border-radius: 20px 20px 0 0;
        }
        .avatar {
          display: grid; place-items: center; flex-shrink: 0;
          width: 32px; height: 32px; border-radius: 50%;
          background: transparent; overflow: visible;
        }
        .marca { margin: 0; font-size: 14px; font-weight: 700; }
        .legenda { margin: 3px 0 0; font-size: 10px; line-height: 1.5; color: #4b5a53; }
        .cartao-corpo { padding: 16px; }
        .cartao-corpo h2 {
          margin: 0; font-family: var(--font-fraunces), serif;
          color: #0f1c17; font-size: 23px; line-height: 1.2;
        }
        .cartao-corpo p {
          margin: 10px 0 14px; font-size: 12px;
          line-height: 1.65; color: #4b5a53;
        }
        button { font-family: inherit; cursor: pointer; }
        .principal {
          display: inline-flex; align-items: center; justify-content: center; gap: 10px;
          min-height: 44px; padding: 10px 16px; border: 1px solid #8a4b12;
          border-radius: 12px; background: #8a4b12; color: white;
          font-size: 13px; font-weight: 600;
        }
        .cartao-corpo .principal { width: 100%; }
        .principal:hover:not(:disabled) { background: #6e3a0c; }
        button:disabled { opacity: .55; cursor: not-allowed; }
        /* ERN_CONCIERGE_LATERAL_V1: painel lateral direito */
        dialog {
          box-sizing: border-box;
          position: fixed; inset: 16px 16px 16px auto;
          width: min(440px, calc(100vw - 32px));
          height: calc(100dvh - 32px);
          max-width: none; max-height: none;
          margin: 0 0 0 auto; padding: 0;
          border: 1px solid #d6d2c8; border-radius: 20px;
          background: #ffffff; color: #0f1c17;
          overflow: hidden;
          font-family: var(--font-work-sans), sans-serif;
          box-shadow: 0 24px 80px rgb(0 0 0 / 30%);
        }
        dialog::backdrop { background: rgb(3 15 11 / 35%); backdrop-filter: blur(2px); }
        dialog[open] { animation: ern-painel-entra .35s cubic-bezier(.2,.7,.2,1); }
        @keyframes ern-painel-entra {
          from { transform: translateX(32px); opacity: 0; }
          to { transform: none; opacity: 1; }
        }
        @media (prefers-reduced-motion: reduce) { dialog[open] { animation: none; } }
        .ern-chat-compacto {
          width: 0 !important; height: 0; margin: 0 !important;
          border: 0 !important; background: transparent !important; box-shadow: none !important;
        }
        .cartao-topo, .cartao-corpo { display: none !important; }
        .janela { display: flex; flex-direction: column; height: 100%; min-height: 0; }
        .chat-topo { flex-shrink: 0; padding: 12px 14px; }
        .identidade { flex: 1; min-width: 0; }
        .identidade h2 { margin: 0; color: #0f1c17; font-size: 15px; font-weight: 700; }
        .identidade p { margin: 3px 0 0; color: #4b5a53; font-size: 10px; }
        .fechar {
          flex-shrink: 0; width: 44px; height: 44px;
          border: 1px solid #c4ae72; border-radius: 12px;
          background: transparent; color: #8a4b12; font-size: 26px;
        }
        .informacoes { flex-shrink: 0; padding: 8px 14px; border-bottom: 1px solid #e4d9b5; }
        .informacoes p { margin: 0; font-size: 10px; line-height: 1.5; color: #4b5a53; }
        .mensagens {
          flex: 1; min-height: 0; overflow-y: auto;
          padding: 16px 14px; overscroll-behavior: contain;
          scrollbar-width: thin; background: #f7f6f2;
        }
        .linha { display: flex; margin-bottom: 12px; }
        .visitante { justify-content: flex-end; }
        .balao {
          max-width: 88%; padding: 11px 13px; border-radius: 15px 15px 15px 4px;
          background: #fffdf6; border: 1px solid #e3dfd6;
          overflow-wrap: anywhere;
        }
        .visitante .balao {
          border-radius: 15px 15px 4px 15px;
          background: #8a4b12; border-color: #8a4b12; color: #fff;
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
          color: #8a4b12; background: #fffdf6;
          font-size: 11px; line-height: 1.4; text-decoration: none;
        }
        .compositor {
          display: flex; gap: 8px; padding: 10px 12px;
          border-top: 1px solid #e3dfd6; flex-shrink: 0;
        }
        .compositor input {
          flex: 1; min-width: 0; width: 100%; min-height: 44px;
          box-sizing: border-box; padding: 10px 12px;
          border: 1px solid #a58b48; border-radius: 12px;
          color: #0f1c17; background: white; font: inherit; font-size: 16px;
        }
        .compositor input::placeholder { color: #75643b; }
        .chat-rodape { padding: 0 14px 10px; flex-shrink: 0; }
        .chat-rodape p { margin: 0 0 5px; font-size: 10px; line-height: 1.5; color: #4b5a53; }
        .chat-rodape button {
          min-height: 32px; padding: 4px 0; border: 0;
          background: transparent; color: #8a4b12;
          font-size: 11px; text-decoration: underline;
        }
        .limite { font-size: 12px; line-height: 1.6; }

        .ern-digitando {
          min-width: 100px;
        }

        .ern-pontos {
          display: inline-flex;
          align-items: center;
          gap: 5px;
          height: 22px;
          padding: 3px 0;
        }

        .ern-pontos i {
          display: block;
          width: 7px;
          height: 7px;
          border-radius: 50%;
          background: #287b72;
        }

        @media (prefers-reduced-motion: no-preference) {
          .ern-pontos i {
            animation: ern-ponto-digitando .75s ease-in-out infinite;
          }
          .ern-pontos i:nth-child(2) { animation-delay: .12s; }
          .ern-pontos i:nth-child(3) { animation-delay: .24s; }
        }

        @keyframes ern-ponto-digitando {
          0%, 100% { transform: translateY(0); opacity: .55; }
          50% { transform: translateY(-3px); opacity: 1; }
        }
        .sr-only {
          position: absolute; width: 1px; height: 1px;
          padding: 0; margin: -1px; overflow: hidden;
          clip-path: inset(50%); white-space: nowrap;
        }
        button:focus-visible, input:focus-visible,
        .mensagens:focus-visible, .atalhos :global(a:focus-visible) {
          outline: 3px solid #8a4b12; outline-offset: 2px;
        }
        @media (max-width: 1023px) {
          .ern-chat-compacto { margin-inline: auto; }
        }
        @media (max-width: 600px) {
          dialog {
            inset: 8px;
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
          background: #e3a144;
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
            border: 1px solid #d6d2c8;
            border-radius: 999px;
            background: #ffffff;
            color: #0f1c17;
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
            background: #8a4b12;
            color: #fff;
            font-size: 20px;
          }
        }

        @media (max-height: 500px) {
          .informacoes, .chat-rodape p { display: none; }
          .sugestoes { max-height: 72px; overflow-y: auto; }
        }

        /* ERN_CONCIERGE_PREMIUM_V1: visual premium no padrão Encantos da Amazônia */
        dialog {
          border: 1px solid rgb(244 199 126 / 28%);
          background: #f7f6f2;
          box-shadow: 0 30px 90px rgb(3 16 11 / 45%), 0 0 0 1px rgb(255 255 255 / 4%);
        }
        .chat-topo {
          position: relative;
          gap: 12px;
          padding: 16px 16px 14px;
          border-bottom: 0;
          background: radial-gradient(120% 140% at 0% 0%, #1b4a3a 0%, #0b1f18 55%, #07110e 100%);
          color: #f0f0e8;
        }
        .chat-topo::after {
          content: '';
          position: absolute; left: 16px; right: 16px; bottom: 0; height: 1px;
          background: linear-gradient(90deg, transparent, rgb(244 199 126 / 55%), transparent);
        }
        .chat-topo .avatar {
          position: relative;
          width: 42px; height: 42px;
          background: transparent;
          box-shadow: 0 8px 22px rgb(0 0 0 / 35%);
        }
        .chat-topo .avatar::after {
          content: '';
          position: absolute; right: -1px; bottom: -1px;
          width: 11px; height: 11px; border-radius: 50%;
          background: #3fbf7f; border: 2px solid #0b1f18;
        }
        .identidade h2 { color: #f5f3ea; font-size: 16px; font-weight: 650; letter-spacing: -.01em; }
        .identidade p { color: #b8c9bf; font-size: 11px; }
        .fechar {
          border: 1px solid rgb(255 255 255 / 16%);
          border-radius: 999px;
          background: rgb(255 255 255 / 6%);
          color: #f0f0e8; font-size: 22px;
        }
        .fechar:hover { border-color: rgb(244 199 126 / 60%); color: #f4c77e; }
        .informacoes { padding: 10px 16px; border-bottom: 1px solid #e3dfd6; background: #ffffff; }
        .informacoes p { font-size: 11px; }
        .mensagens { padding: 18px 16px; background: #f7f6f2; }
        .linha { margin-bottom: 14px; }
        .balao {
          padding: 12px 14px;
          border-radius: 18px 18px 18px 6px;
          border: 1px solid #ebe7de;
          background: #ffffff;
          box-shadow: 0 1px 2px rgb(15 28 23 / 6%), 0 6px 18px rgb(15 28 23 / 5%);
        }
        .assistente .autor { color: #8a4b12; }
        .visitante .balao {
          border: 0;
          border-radius: 18px 18px 6px 18px;
          background: linear-gradient(180deg, #1b4a3a, #13342a);
          color: #f5f3ea;
          box-shadow: 0 8px 20px rgb(19 52 42 / 25%);
        }
        .visitante .autor { color: #f4c77e; }
        .balao p { font-size: 14px; line-height: 1.6; }
        .sugestoes, .atalhos { gap: 8px; padding: 12px 16px; border-top: 1px solid #e3dfd6; background: #ffffff; }
        .sugestoes button, .atalhos :global(a) {
          min-height: 38px; padding: 8px 14px;
          border: 1px solid rgb(227 161 68 / 55%);
          background: #fffaf0; color: #6e3a0c;
          font-size: 12.5px; font-weight: 600;
          transition: background .2s, border-color .2s, transform .2s;
        }
        .sugestoes button:hover, .atalhos :global(a:hover) {
          background: #f7d595; border-color: #e3a144; transform: translateY(-1px);
        }
        .compositor {
          gap: 8px; margin: 10px 12px 6px; padding: 6px;
          border: 1px solid #e3dfd6; border-radius: 999px;
          background: #ffffff;
          box-shadow: 0 6px 18px rgb(15 28 23 / 6%);
        }
        .compositor input {
          min-height: 44px; padding: 10px 14px;
          border: 0; border-radius: 999px; background: transparent;
        }
        .compositor input:focus-visible { outline: none; }
        .compositor:focus-within { border-color: #e3a144; box-shadow: 0 0 0 3px rgb(227 161 68 / 25%); }
        .compositor input::placeholder { color: #7a857f; }
        .compositor .principal {
          min-height: 44px; padding: 10px 18px;
          border: 0; border-radius: 999px;
          background: linear-gradient(180deg, #f7d595, #e3a144);
          color: #07110e; font-weight: 700;
          box-shadow: inset 0 1px 0 rgb(255 255 255 / 55%);
        }
        .compositor .principal:hover:not(:disabled) { background: linear-gradient(180deg, #fbe3ae, #eaa94d); }
        /* EDA_IARA_AUDIO_V1 + links mais sóbrios */
        .mensagens :global(.iara-link) {
          display: inline-flex; align-items: center; gap: 6px;
          padding: 7px 12px; border-radius: 10px;
          font-size: 12.5px; font-weight: 600; text-decoration: none;
          color: #0b1f18; background: #f6f1e6; border: 1px solid #e3c999;
        }
        .mensagens :global(.iara-link:hover) { background: #f1e5cc; border-color: #d99a3e; }
        .compositor { display: flex; align-items: center; }
        .compositor input { flex: 1; min-width: 0; }
        .iara-audio-btn {
          flex: none; width: 44px; min-width: 44px; padding: 0 !important;
          display: grid !important; place-items: center;
        }
        .iara-audio-cancelar {
          flex: none; display: grid; place-items: center;
          width: 40px; height: 40px; border: 0; border-radius: 50%;
          background: transparent; color: #8a3b2a;
        }
        .iara-audio-cancelar:hover { background: #f6e8e4; }
        .iara-audio-status {
          flex: 1; min-width: 0; min-height: 44px;
          display: flex; align-items: center; gap: 10px;
          padding: 0 10px; font-size: 13.5px; color: #33443c;
        }
        .iara-audio-tempo { font-variant-numeric: tabular-nums; font-weight: 600; color: #0f1c17; }
        .iara-audio-ponto {
          width: 9px; height: 9px; border-radius: 50%; background: #d64545;
          animation: iara-pisca 1s ease-in-out infinite;
        }
        .iara-audio-onda { display: inline-flex; align-items: center; gap: 3px; height: 18px; margin-left: auto; }
        .iara-audio-onda i {
          display: block; width: 3px; height: 6px; border-radius: 2px; background: #d99a3e;
          animation: iara-onda 0.9s ease-in-out infinite;
        }
        .iara-audio-onda i:nth-child(2) { animation-delay: .12s; }
        .iara-audio-onda i:nth-child(3) { animation-delay: .24s; }
        .iara-audio-onda i:nth-child(4) { animation-delay: .36s; }
        .iara-audio-onda i:nth-child(5) { animation-delay: .48s; }
        @keyframes iara-onda { 0%, 100% { height: 5px; } 50% { height: 18px; } }
        @keyframes iara-pisca { 0%, 100% { opacity: 1; } 50% { opacity: .3; } }
        .iara-audio-erro { margin: 8px 16px 0; font-size: 12.5px; color: #a33a2a; }
        @media (prefers-reduced-motion: reduce) {
          .iara-audio-onda i, .iara-audio-ponto { animation: none; }
        }
        .chat-rodape { padding: 4px 16px 12px; }
        .chat-rodape p { font-size: 11px; }
        .chat-rodape button { color: #8a4b12; font-weight: 600; }
        .ern-pontos i { background: #e3a144; }
        @media (prefers-reduced-motion: no-preference) {
          .linha { animation: ern-balao-entra .32s cubic-bezier(.2,.7,.2,1) both; }
        }
        @keyframes ern-balao-entra {
          from { opacity: 0; transform: translateY(8px); }
          to { opacity: 1; transform: none; }
        }
        @media (max-width: 600px) {
          .chat-topo { border-radius: 16px 16px 0 0; }
        }
        /* EDA_IARA_ACABAMENTO_V1: convite da Iara e detalhes finos da conversa */
        .iara-oferta {
          position: fixed; z-index: 60;
          right: max(20px, env(safe-area-inset-right));
          bottom: calc(28px + env(safe-area-inset-bottom, 0px));
          max-width: min(340px, calc(100vw - 40px));
          display: flex; gap: 12px; align-items: flex-start;
          padding: 14px 14px 14px 16px;
          border-radius: 20px 20px 6px 20px;
          color: #f2f0e6; font-size: 14px; line-height: 1.5;
          background: linear-gradient(160deg, rgb(20 48 38 / 96%), rgb(7 17 14 / 97%));
          border: 1px solid rgb(244 199 126 / 32%);
          box-shadow: 0 24px 60px rgb(0 0 0 / 45%), inset 0 1px 0 rgb(255 255 255 / 7%);
          backdrop-filter: blur(14px);
        }
        .iara-oferta::before {
          content: ''; position: absolute; left: 18px; right: 18px; top: 0; height: 1px;
          background: linear-gradient(90deg, transparent, rgb(244 199 126 / 70%), transparent);
        }
        .iara-oferta-avatar {
          flex: none; display: grid; place-items: center;
          width: 40px; height: 40px; border-radius: 50%; overflow: hidden;
          box-shadow: 0 6px 16px rgb(0 0 0 / 40%), 0 0 0 3px rgb(244 199 126 / 14%);
        }
        .iara-oferta-corpo { flex: 1; min-width: 0; }
        .iara-oferta-nome {
          display: block; margin-bottom: 2px;
          font-size: 11px; font-weight: 700; letter-spacing: .14em; text-transform: uppercase; color: #f4c77e;
        }
        .iara-oferta p { margin: 0; }
        .iara-oferta-acao {
          display: inline-flex; align-items: center; gap: 6px;
          min-height: 36px; margin-top: 10px; padding: 7px 16px;
          border: 0; border-radius: 999px;
          font-size: 13px; font-weight: 700; color: #07110e;
          background: linear-gradient(180deg, #f7d595, #e3a144);
          box-shadow: 0 8px 20px rgb(227 161 68 / 30%), inset 0 1px 0 rgb(255 255 255 / 55%);
          transition: filter .2s, transform .2s;
        }
        .iara-oferta-acao:hover { filter: brightness(1.06); transform: translateY(-1px); }
        .iara-oferta-fechar {
          flex: none; display: grid; place-items: center;
          width: 28px; height: 28px; border: 0; border-radius: 50%;
          background: rgb(255 255 255 / 6%); color: #b8c9bf; font-size: 17px; line-height: 1;
        }
        .iara-oferta-fechar:hover { background: rgb(255 255 255 / 12%); color: #f4c77e; }
        @media (prefers-reduced-motion: no-preference) {
          .iara-oferta { animation: iara-oferta-entra .5s cubic-bezier(.2,.7,.2,1) both; }
        }
        @keyframes iara-oferta-entra {
          from { opacity: 0; transform: translateY(14px) scale(.97); }
          to { opacity: 1; transform: none; }
        }
        .identidade h2 { font-family: var(--font-fraunces), serif; font-size: 19px; font-weight: 600; letter-spacing: 0; }
        .identidade p { letter-spacing: .02em; }
        .mensagens {
          background:
            radial-gradient(90% 40% at 100% 0%, rgb(227 161 68 / 9%), transparent 70%),
            radial-gradient(80% 35% at 0% 100%, rgb(27 74 58 / 8%), transparent 70%),
            #f7f6f2;
        }
        .assistente .autor { letter-spacing: .12em; text-transform: uppercase; font-size: 9.5px; }
        .visitante .autor { letter-spacing: .12em; text-transform: uppercase; font-size: 9.5px; }
        .mensagens :global(.iara-link) {
          border-radius: 999px; padding: 8px 14px;
          background: linear-gradient(180deg, #fffaf0, #f6ecd6);
          box-shadow: 0 2px 8px rgb(138 75 18 / 10%);
          transition: transform .2s, box-shadow .2s, border-color .2s;
        }
        .mensagens :global(.iara-link:hover) { transform: translateY(-1px); box-shadow: 0 6px 16px rgb(138 75 18 / 18%); }
      `}</style>
    </section>
  );
}