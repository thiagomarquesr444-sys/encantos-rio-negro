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
        { texto: tu('Escolhe um tema ou um dos 62 municípios que eu te levo 🌊', 'Escolha um tema ou um dos 62 municípios e eu levo você 🌊'),
          opcoes: [{ rotulo: 'Me sugere um roteiro', pedido: 'Me sugere um roteiro pela Amazônia' }, { rotulo: 'Me conta uma lenda', pedido: 'Me conta uma lenda amazônica' }] },
        { texto: tu('Do Rio Negro ao Solimões, por onde a gente começa?', 'Do Rio Negro ao Solimões, por onde começamos?'),
          opcoes: [{ rotulo: 'Culinária', pedido: 'Me fala da culinária amazonense' }, { rotulo: 'Pesca esportiva', pedido: 'Quero pescar tucunaré' }] },
      ]);
    case 'experiencias':
      return { texto: tu('Passeios reais, com preço e data. Me diz o que tu quer viver.', 'Passeios reais, com preço e data. O que gostaria de viver?'),
        opcoes: [{ rotulo: 'Passeio de 1 dia', pedido: 'Quero um passeio de um dia' }, { rotulo: 'Pesca esportiva', pedido: 'Quero uma expedição de pesca esportiva' }] };
    case 'passeio':
      return { texto: tu('Gostou? Vejo vagas e valor pro teu grupo agora.', 'Gostou? Verifico vagas e valor para o seu grupo agora.'),
        opcoes: [{ rotulo: 'Ver vagas e valores', pedido: 'Quero ver vagas e valores deste passeio' }, { rotulo: 'O que levar?', pedido: 'O que devo levar neste passeio?' }] };
    case 'destinos':
      return { texto: tu('Fala uma cidade do Amazonas que eu te levo no mapa 🗺️', 'Diga uma cidade do Amazonas e eu levo você no mapa 🗺️'),
        opcoes: [{ rotulo: 'Barcelos', pedido: 'Me leva para Barcelos' }, { rotulo: 'Parintins', pedido: 'Me leva para Parintins' }] };
    case 'rede':
      return { texto: tu('O que tá rolando agora no rio. Toca em “Quero ir!” no que te encantar.', 'O que acontece agora no rio. Toque em “Quero ir!” no que encantar você.'),
        opcoes: [{ rotulo: 'Quem tá na Rede?', pedido: 'Quem são as operadoras e guias da Rede?' }, { rotulo: 'Ver passeios', href: '/experiencias' }] };
    case 'perfil':
      return { texto: tu('Quer saber o que eles oferecem ou já mandar um pedido?', 'Quer saber o que oferecem ou já enviar um pedido?'),
        opcoes: [{ rotulo: 'O que oferecem?', pedido: 'O que esta operadora oferece?' }, { rotulo: 'Fazer pedido', pedido: 'Quero fazer um pedido para esta operadora' }] };
    case 'publicacao':
      return { texto: tu('Bateu vontade? Te mostro como viver isso.', 'Deu vontade? Mostro como viver isso.'),
        opcoes: [{ rotulo: 'Quero viver isso', pedido: 'Quero viver uma experiência como esta' }, { rotulo: 'Ver a Rede', href: '/rede' }] };
    case 'pesca':
      return { texto: tu('Terra de tucunaré-açu 🐟 Te mostro época e expedições.', 'Terra de tucunaré-açu 🐟 Mostro época e expedições.'),
        opcoes: [{ rotulo: 'Melhor época', pedido: 'Qual a melhor época para pescar tucunaré em Barcelos?' }, { rotulo: 'Ver expedições', pedido: 'Quero ver expedições de pesca esportiva' }] };
    case 'operadores':
      return { texto: tu('Gestão automatizada 24h pra tua operação, com a EDA do teu lado.', 'Gestão automatizada 24h para a sua operação, com a EDA ao seu lado.'),
        opcoes: [{ rotulo: 'Como funciona?', pedido: 'Como a plataforma funciona para operadoras?' }, { rotulo: 'Ver planos', href: '/precos' }] };
    case 'precos':
      return { texto: tu('Grátis, Pro ou Plus. Te ajudo a escolher?', 'Grátis, Pro ou Plus. Posso ajudar a escolher?'),
        opcoes: [{ rotulo: 'Qual plano pra mim?', pedido: 'Qual plano combina com a minha operação?' }, { rotulo: 'Criar conta grátis', href: '/login?acesso=operadora' }] };
    case 'contato':
      return { texto: tu('Me pergunta primeiro, resolvo muita coisa na hora.', 'Pergunte primeiro, resolvo muita coisa na hora.'),
        opcoes: [{ rotulo: 'Tirar uma dúvida', pedido: 'Tenho uma dúvida sobre a plataforma' }] };
    case 'institucional':
      return { texto: tu('Ficou alguma dúvida? Explico em palavras simples.', 'Alguma dúvida? Explico em palavras simples.'),
        opcoes: [{ rotulo: 'Explicar em resumo', pedido: 'Me explica este documento em resumo' }] };
    default:
      return { texto: tu('Tô por aqui se precisar 🌊', 'Estou por aqui se precisar 🌊'), opcoes: [] };
  }
}

function falasEN(grupo: string): Fala {
  switch (grupo) {
    case 'descubra': return { texto: 'Pick a theme or one of the 62 towns and I will take you 🌊', opcoes: [{ rotulo: 'Suggest a trip', pedido: 'Suggest an Amazon itinerary' }, { rotulo: 'Tell me a legend', pedido: 'Tell me an Amazon legend' }] };
    case 'experiencias': return { texto: 'Real tours, real prices and dates. What would you like to live?', opcoes: [{ rotulo: 'Day trips', pedido: 'I want a day trip' }, { rotulo: 'Sport fishing', pedido: 'I want a sport fishing expedition' }] };
    case 'passeio': return { texto: 'Like it? I can check availability and price for your group.', opcoes: [{ rotulo: 'Check availability', pedido: 'Check availability and prices for this tour' }] };
    case 'destinos': return { texto: 'Name a town in Amazonas and I will take you there 🗺️', opcoes: [{ rotulo: 'Take me to Barcelos', pedido: 'Take me to Barcelos' }, { rotulo: 'Take me to Parintins', pedido: 'Take me to Parintins' }] };
    case 'rede': return { texto: 'What is happening on the river right now.', opcoes: [{ rotulo: 'See tours', href: '/experiencias' }] };
    case 'operadores': case 'precos': return { texto: 'Automated 24/7 management for your operation.', opcoes: [{ rotulo: 'How does it work?', pedido: 'How does the platform work for operators?' }, { rotulo: 'See plans', href: '/precos' }] };
    default: return { texto: 'I am right here if you need me 🌊', opcoes: [] };
  }
}

function falasES(grupo: string): Fala {
  switch (grupo) {
    case 'descubra': return { texto: 'Elige un tema o uno de los 62 municipios y te llevo 🌊', opcoes: [{ rotulo: 'Sugiéreme una ruta', pedido: 'Sugiéreme una ruta por la Amazonía' }, { rotulo: 'Cuéntame una leyenda', pedido: 'Cuéntame una leyenda amazónica' }] };
    case 'experiencias': return { texto: 'Paseos reales, con precio y fecha. ¿Qué quieres vivir?', opcoes: [{ rotulo: 'Paseos de un día', pedido: 'Quiero un paseo de un día' }, { rotulo: 'Pesca deportiva', pedido: 'Quiero una expedición de pesca' }] };
    case 'destinos': return { texto: 'Dime una ciudad de Amazonas y te llevo en el mapa 🗺️', opcoes: [{ rotulo: 'Llévame a Barcelos', pedido: 'Llévame a Barcelos' }] };
    case 'operadores': case 'precos': return { texto: 'Gestión automatizada 24 h para tu operación.', opcoes: [{ rotulo: '¿Cómo funciona?', pedido: '¿Cómo funciona la plataforma para operadores?' }, { rotulo: 'Ver planes', href: '/precos' }] };
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
  curiosidade?: { fala: string; pedido: string; municipio: string } | null,
): RecepcaoIara {
  let pagina = falaPaginaIara(idioma, caminho, regional);
  // IARA_FICHAS_NAS_TELAS_V1: na Descubra e em Destinos, metade das vezes a
  // Iara traz uma curiosidade real de um município (da ficha oficial).
  const g = grupoPagina(caminho);
  if (idioma === 'PT' && curiosidade && (g === 'descubra' || g === 'destinos') && Math.random() < 0.5) {
    pagina = {
      texto: `Sabia? ${curiosidade.fala}`,
      opcoes: [
        { rotulo: `Conhecer ${curiosidade.municipio}`, pedido: `Me leva para ${curiosidade.municipio}` },
        { rotulo: 'Me conta mais', pedido: curiosidade.pedido },
      ],
    };
  }
  const chave = grupoPagina(caminho);
  const v = nome ? `, ${nome}` : '';
  const tu = (a: string, b: string) => (regional ? a : b);
  let abertura = '';
  if (idioma === 'PT') {
    if (momento === 'primeira-visita') abertura = tu('Bem-vindo à Encantos! Eu sou a Iara 🌊', 'Bem-vindo à Encantos! Eu sou a Iara 🌊');
    else if (momento === 'voltou') abertura = tu(`Que bom te ver de volta${v}! 🌊`, `Que bom ver você de volta${v}! 🌊`);
    else if (momento === 'primeiro-login') abertura = tu(`Seja bem-vindo à família Encantos${v}! ✨`, `Seja bem-vindo à Encantos${v}! ✨`);
    else if (momento === 'login') abertura = `Oi de novo${v}!`;
  } else if (idioma === 'EN') {
    if (momento === 'primeira-visita') abertura = 'Welcome to Encantos! I am Iara 🌊';
    else if (momento === 'voltou') abertura = `Good to have you back${v}! 🌊`;
    else if (momento === 'primeiro-login') abertura = `Welcome to the Encantos family${v}! ✨`;
    else if (momento === 'login') abertura = `Hi again${v}!`;
  } else {
    if (momento === 'primeira-visita') abertura = '¡Bienvenido a Encantos! Soy Iara 🌊';
    else if (momento === 'voltou') abertura = `¡Qué bueno tenerte de vuelta${v}! 🌊`;
    else if (momento === 'primeiro-login') abertura = `¡Bienvenido a la familia Encantos${v}! ✨`;
    else if (momento === 'login') abertura = `¡Hola de nuevo${v}!`;
  }
  return { chave, texto: abertura ? `${abertura} ${pagina.texto}` : pagina.texto, opcoes: pagina.opcoes.slice(0, 2) };
}
