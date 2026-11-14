// IARA_RECEPCAO_PAGINAS_V1
// A Iara como recepcionista do portal: a cada página ela apresenta o que o
// visitante está vendo, mostra que a plataforma é automatizada e oferece
// duas alternativas. Primeira visita, volta à plataforma e primeiro login têm
// recepções próprias, mais calorosas. Sem insistência: uma fala por página
// por visita, e quem fecha duas vezes deixa a Iara quieta até a próxima visita.

export type IdiomaRecepcao = 'PT' | 'EN' | 'ES';
export type OpcaoRecepcao = { rotulo: string; pedido?: string; href?: string };
export type RecepcaoIara = { chave: string; texto: string; opcoes: OpcaoRecepcao[] };

export type MomentoRecepcao = 'primeira-visita' | 'voltou' | 'primeiro-login' | 'login' | 'pagina';

function grupoPagina(caminho: string): string {
  if (caminho === '/' || caminho === '') return 'descubra';
  if (/^\/experiencias\/[^/]+$/.test(caminho)) return 'passeio';
  if (caminho.startsWith('/experiencias')) return 'experiencias';
  if (caminho.startsWith('/destinos')) return 'destinos';
  if (caminho.startsWith('/rede/perfil')) return 'perfil';
  if (caminho.startsWith('/rede/publicacao')) return 'publicacao';
  if (caminho.startsWith('/rede')) return 'rede';
  if (caminho.startsWith('/pesca-esportiva')) return 'pesca';
  if (caminho.startsWith('/operadores')) return 'operadores';
  if (caminho.startsWith('/precos')) return 'precos';
  if (caminho.startsWith('/contato')) return 'contato';
  if (/^\/(privacidade|termos|reembolso)/.test(caminho)) return 'institucional';
  return 'outra';
}

export const chaveRecepcao = grupoPagina;

const sorteia = <T,>(l: T[]): T => l[Math.floor(Math.random() * l.length)];

type Fala = { texto: string; opcoes: OpcaoRecepcao[] };

function falasPT(grupo: string, regional: boolean): Fala {
  const tu = (a: string, b: string) => (regional ? a : b);
  switch (grupo) {
    case 'descubra':
      return sorteia([
        { texto: tu('Aqui é a Descubra, a porta de entrada da Amazônia 🌊 Tu pode filtrar os 62 municípios por cultura, culinária, crendices ou floresta — e eu te levo no mapa.', 'Esta é a Descubra, a porta de entrada da Amazônia 🌊 Você pode filtrar os 62 municípios por cultura, culinária, crendices ou floresta — e eu levo você no mapa.'),
          opcoes: [{ rotulo: 'Me sugere um roteiro', pedido: 'Me sugere um roteiro pela Amazônia' }, { rotulo: 'Me conta uma lenda', pedido: 'Me conta uma lenda amazônica' }] },
        { texto: tu('Já viu o Encontro das Águas aí no fundo? Do Rio Negro ao Solimões, eu conheço cada curva. Bora escolher por onde começar?', 'Já viu o Encontro das Águas ao fundo? Do Rio Negro ao Solimões, conheço cada curva. Vamos escolher por onde começar?'),
          opcoes: [{ rotulo: 'Culinária amazonense', pedido: 'Me fala da culinária amazonense' }, { rotulo: 'Pesca esportiva', pedido: 'Quero pescar tucunaré' }] },
      ]);
    case 'experiencias':
      return { texto: tu('Aqui ficam as experiências publicadas pelas próprias operadoras, com preço e datas reais. Me diz o que tu quer viver que eu filtro pra ti — e se quiser, já mando teu pedido pra operadora.', 'Aqui ficam as experiências publicadas pelas próprias operadoras, com preço e datas reais. Diga o que gostaria de viver que eu filtro para você — e, se quiser, já encaminho seu pedido à operadora.'),
        opcoes: [{ rotulo: 'Passeios de 1 dia', pedido: 'Quero um passeio de um dia' }, { rotulo: 'Pesca esportiva', pedido: 'Quero uma expedição de pesca esportiva' }] };
    case 'passeio':
      return { texto: tu('Égua, esse passeio é bonito demais! Posso ver as vagas, o valor pro teu grupo e já deixar o pedido pronto pra operadora confirmar.', 'Este passeio é lindo! Posso verificar vagas, o valor para o seu grupo e deixar o pedido pronto para a operadora confirmar.'),
        opcoes: [{ rotulo: 'Ver vagas e valores', pedido: 'Quero ver vagas e valores deste passeio' }, { rotulo: 'O que levar?', pedido: 'O que devo levar neste passeio?' }] };
    case 'destinos':
      return { texto: tu('Esse é o mapa vivo do Amazonas 🗺️ Me diz qualquer um dos 62 municípios ou um lugar do rio que eu voo contigo até lá, com zoom no território e o que tem de bom.', 'Este é o mapa vivo do Amazonas 🗺️ Diga qualquer um dos 62 municípios ou um lugar do rio e eu levo você até lá, com zoom no território e o que há de melhor.'),
        opcoes: [{ rotulo: 'Me leva a Barcelos', pedido: 'Me leva para Barcelos' }, { rotulo: 'Me leva a Parintins', pedido: 'Me leva para Parintins' }] };
    case 'rede':
      return { texto: tu('Aqui é a Rede EDA: o que operadoras, guias e barqueiros tão vivendo agora no rio. Toca no “Quero ir!” no que te encantar — eu aviso quem faz.', 'Esta é a Rede EDA: o que operadoras, guias e barqueiros estão vivendo agora no rio. Toque em “Quero ir!” no que encantar você — eu aviso quem faz.'),
        opcoes: [{ rotulo: 'Quem tá na Rede?', pedido: 'Quem são as operadoras e guias da Rede?' }, { rotulo: 'Ver passeios', href: '/experiencias' }] };
    case 'perfil':
      return { texto: tu('Esse é o perfil de quem faz a Amazônia acontecer. Quer que eu te conte o que eles oferecem ou já mande um pedido pra eles?', 'Este é o perfil de quem faz a Amazônia acontecer. Quer que eu conte o que oferecem ou já envie um pedido?'),
        opcoes: [{ rotulo: 'O que eles oferecem?', pedido: 'O que esta operadora oferece?' }, { rotulo: 'Fazer um pedido', pedido: 'Quero fazer um pedido para esta operadora' }] };
    case 'publicacao':
      return { texto: tu('Bonito, né? Essa vivência foi publicada direto do rio. Se deu vontade, eu te mostro como viver isso também.', 'Bonito, não é? Esta vivência foi publicada direto do rio. Se deu vontade, mostro como viver isso também.'),
        opcoes: [{ rotulo: 'Quero viver isso', pedido: 'Quero viver uma experiência como esta' }, { rotulo: 'Ver a Rede', href: '/rede' }] };
    case 'pesca':
      return { texto: tu('Tucunaré-açu, Mariuá e o Rio Negro: aqui é terra de pescador. Te mostro a melhor época, as operadoras e o que vem no pacote.', 'Tucunaré-açu, Mariuá e o Rio Negro: aqui é terra de pescador. Mostro a melhor época, as operadoras e o que está incluído.'),
        opcoes: [{ rotulo: 'Melhor época', pedido: 'Qual a melhor época para pescar tucunaré em Barcelos?' }, { rotulo: 'Ver expedições', pedido: 'Quero ver expedições de pesca esportiva' }] };
    case 'operadores':
      return { texto: tu('Trabalha com turismo? Aqui tu vê a Encantos Gestão: reservas, saídas, vouchers, financeiro e a EDA, a IA que opera contigo — tudo automatizado, 24h. Eu atendo teus clientes aqui no portal.', 'Trabalha com turismo? Aqui você conhece a Encantos Gestão: reservas, saídas, vouchers, financeiro e a EDA, a IA que opera com você — tudo automatizado, 24h. Eu atendo seus clientes aqui no portal.'),
        opcoes: [{ rotulo: 'Como funciona?', pedido: 'Como a plataforma funciona para operadoras?' }, { rotulo: 'Ver planos', href: '/precos' }] };
    case 'precos':
      return { texto: tu('Tem o Grátis pra começar, o Pro e o Plus — no Plus, eu (a Iara) e a EDA trabalhamos pela tua operação sem parar. Quer que eu te ajude a escolher?', 'Há o Grátis para começar, o Pro e o Plus — no Plus, eu (a Iara) e a EDA trabalhamos pela sua operação sem parar. Quer ajuda para escolher?'),
        opcoes: [{ rotulo: 'Qual plano pra mim?', pedido: 'Qual plano combina com a minha operação?' }, { rotulo: 'Criar conta grátis', href: '/login?acesso=operadora' }] };
    case 'contato':
      return { texto: tu('Precisa falar com a equipe da Encantos da Amazônia AI? Eu resolvo muita coisa na hora — me pergunta primeiro que eu te ajudo.', 'Precisa falar com a equipe da Encantos da Amazônia AI? Resolvo muita coisa na hora — pergunte primeiro e eu ajudo.'),
        opcoes: [{ rotulo: 'Tirar uma dúvida', pedido: 'Tenho uma dúvida sobre a plataforma' }, { rotulo: 'Sobre meus dados', pedido: 'Como a plataforma cuida dos meus dados?' }] };
    case 'institucional':
      return { texto: tu('Documento oficial da Encantos da Amazônia AI. Se algum ponto ficou confuso, me pergunta que eu explico em palavras simples.', 'Documento oficial da Encantos da Amazônia AI. Se algum ponto ficou confuso, pergunte e eu explico em palavras simples.'),
        opcoes: [{ rotulo: 'Explicar em resumo', pedido: 'Me explica este documento em resumo' }] };
    default:
      return { texto: tu('Tô por aqui se precisar 🌊', 'Estou por aqui se precisar 🌊'), opcoes: [] };
  }
}

function falasEN(grupo: string): Fala {
  switch (grupo) {
    case 'descubra': return { texto: 'Welcome to Discover 🌊 Filter all 62 towns of Amazonas by culture, food, legends or forest — and I will fly you there on the map.', opcoes: [{ rotulo: 'Suggest a trip', pedido: 'Suggest an Amazon itinerary' }, { rotulo: 'Tell me a legend', pedido: 'Tell me an Amazon legend' }] };
    case 'experiencias': return { texto: 'These experiences are published by the operators themselves, with real prices and dates. Tell me what you want to live and I will filter it for you.', opcoes: [{ rotulo: 'Day trips', pedido: 'I want a day trip' }, { rotulo: 'Sport fishing', pedido: 'I want a sport fishing expedition' }] };
    case 'passeio': return { texto: 'Lovely tour! I can check availability and the price for your group, and prepare the request for the operator.', opcoes: [{ rotulo: 'Check availability', pedido: 'Check availability and prices for this tour' }] };
    case 'destinos': return { texto: 'This is the living map of Amazonas 🗺️ Name any of the 62 towns and I will fly you there.', opcoes: [{ rotulo: 'Take me to Barcelos', pedido: 'Take me to Barcelos' }, { rotulo: 'Take me to Parintins', pedido: 'Take me to Parintins' }] };
    case 'rede': return { texto: 'This is the EDA Network: what operators and guides are living on the river right now.', opcoes: [{ rotulo: 'See tours', href: '/experiencias' }] };
    case 'operadores': case 'precos': return { texto: 'Work in tourism? Bookings, departures, vouchers, finance and EDA, the AI that runs with you — fully automated, 24/7.', opcoes: [{ rotulo: 'How does it work?', pedido: 'How does the platform work for operators?' }, { rotulo: 'See plans', href: '/precos' }] };
    default: return { texto: 'I am right here if you need me 🌊', opcoes: [] };
  }
}

function falasES(grupo: string): Fala {
  switch (grupo) {
    case 'descubra': return { texto: 'Bienvenido a Descubre 🌊 Filtra los 62 municipios de Amazonas por cultura, culinaria, leyendas o selva — y te llevo en el mapa.', opcoes: [{ rotulo: 'Sugiéreme una ruta', pedido: 'Sugiéreme una ruta por la Amazonía' }, { rotulo: 'Cuéntame una leyenda', pedido: 'Cuéntame una leyenda amazónica' }] };
    case 'experiencias': return { texto: 'Estas experiencias las publican los propios operadores, con precios y fechas reales. Dime qué quieres vivir y te las filtro.', opcoes: [{ rotulo: 'Paseos de un día', pedido: 'Quiero un paseo de un día' }, { rotulo: 'Pesca deportiva', pedido: 'Quiero una expedición de pesca' }] };
    case 'destinos': return { texto: 'Este es el mapa vivo de Amazonas 🗺️ Dime cualquiera de los 62 municipios y te llevo volando.', opcoes: [{ rotulo: 'Llévame a Barcelos', pedido: 'Llévame a Barcelos' }] };
    case 'operadores': case 'precos': return { texto: '¿Trabajas con turismo? Reservas, salidas, vouchers, finanzas y EDA, la IA que opera contigo — todo automatizado, 24 h.', opcoes: [{ rotulo: '¿Cómo funciona?', pedido: '¿Cómo funciona la plataforma para operadores?' }, { rotulo: 'Ver planes', href: '/precos' }] };
    default: return { texto: 'Aquí estoy si me necesitas 🌊', opcoes: [] };
  }
}

/** Fala da Iara sobre a página que o visitante está vendo. */
export function falaPaginaIara(idioma: IdiomaRecepcao, caminho: string, regional: boolean): Fala {
  const g = grupoPagina(caminho);
  return idioma === 'EN' ? falasEN(g) : idioma === 'ES' ? falasES(g) : falasPT(g, regional);
}

/** Recepção calorosa (primeira visita, volta, primeiro login) somada à fala da página. */
export function recepcaoIara(
  idioma: IdiomaRecepcao,
  caminho: string,
  regional: boolean,
  momento: MomentoRecepcao,
  nome = '',
): RecepcaoIara {
  const pagina = falaPaginaIara(idioma, caminho, regional);
  const chave = grupoPagina(caminho);
  const v = nome ? `, ${nome}` : '';
  const tu = (a: string, b: string) => (regional ? a : b);
  let abertura = '';
  if (idioma === 'PT') {
    if (momento === 'primeira-visita') abertura = tu('Seja muito bem-vindo à Encantos da Amazônia! 🌊 Eu sou a Iara, a guardiã das águas e tua recepcionista por aqui. Tudo nesta plataforma é automatizado: eu te atendo a qualquer hora, sem fila.', 'Seja muito bem-vindo à Encantos da Amazônia! 🌊 Eu sou a Iara, a guardiã das águas e sua recepcionista por aqui. Tudo nesta plataforma é automatizado: atendo você a qualquer hora, sem fila.');
    else if (momento === 'voltou') abertura = tu(`Que bom te ver de volta${v}! 🌊 Senti tua falta por aqui.`, `Que bom ver você de volta${v}! 🌊`);
    else if (momento === 'primeiro-login') abertura = tu(`Égua${v}, que alegria te receber! 🎉 Agora tu faz parte da Encantos da Amazônia. Daqui pra frente eu lembro das nossas conversas e cuido dos teus pedidos com carinho.`, `Que alegria receber você${v}! 🎉 Agora você faz parte da Encantos da Amazônia. A partir de agora lembro das nossas conversas e cuido dos seus pedidos.`);
    else if (momento === 'login') abertura = tu(`Oi de novo${v}! Tô contigo.`, `Olá novamente${v}! Estou com você.`);
  } else if (idioma === 'EN') {
    if (momento === 'primeira-visita') abertura = 'A warm welcome to Encantos da Amazônia! 🌊 I am Iara, your host here. Everything on this platform is automated — I can help you at any hour.';
    else if (momento === 'voltou') abertura = `So good to have you back${v}! 🌊`;
    else if (momento === 'primeiro-login') abertura = `What a joy to welcome you${v}! 🎉 You are now part of Encantos da Amazônia, and I will remember our conversations.`;
    else if (momento === 'login') abertura = `Hi again${v}!`;
  } else {
    if (momento === 'primeira-visita') abertura = '¡Bienvenido a Encantos da Amazônia! 🌊 Soy Iara, tu anfitriona. Todo en esta plataforma es automatizado: te atiendo a cualquier hora.';
    else if (momento === 'voltou') abertura = `¡Qué bueno tenerte de vuelta${v}! 🌊`;
    else if (momento === 'primeiro-login') abertura = `¡Qué alegría recibirte${v}! 🎉 Ahora eres parte de Encantos da Amazônia y recordaré nuestras conversaciones.`;
    else if (momento === 'login') abertura = `¡Hola de nuevo${v}!`;
  }
  return { chave, texto: abertura ? `${abertura}\n${pagina.texto}` : pagina.texto, opcoes: pagina.opcoes.slice(0, 2) };
}
