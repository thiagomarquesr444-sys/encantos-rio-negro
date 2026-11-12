'use client';

// EDA_IA_CONVERSA_V1 (V2: sem chips/perguntas sugeridas — a própria EDA conduz a conversa)
// "Pergunte à EDA": conversa com IA real (texto livre) dentro da gestão,
// nas páginas Painel, Passeios, Reservas, Demandas e Financeiro.
// Botão discreto flutuante + painel compacto; não altera o layout das páginas.

import { useEffect, useRef, useState, type ReactNode } from 'react';
import Link from 'next/link';
import { usePathname, useRouter } from 'next/navigation';
import { EVENTO_ABRIR_REGISTRO_EDA } from '@/lib/abrirRegistroEDA';
import { supabase } from '@/lib/supabase';
import { useAoVivoEDA } from '@/lib/aoVivoEDA';
import { copiarEDA } from '@/lib/copiarEDA';
import TextoDigitadoIA from './TextoDigitadoIA';
import IconeEDA from './IconeEDA';
import { acaoRegistroValida, REGRAS_ACAO, type AcaoRegistro } from '@/lib/acoesEDA';
import { EVENTO_AO_VIVO_EDA } from '@/lib/aoVivoEDA';
import { saudacaoEDA } from '@/lib/saudacaoEDA';
import './conversa-eda.css';

type LinkEDA = { href: string; rotulo: string };
// EDA_ACOES_V1 / EDA_AVISOS_V1
type AcaoEDA =
  | { tipo: 'lancar'; resumo: string; dados: { tipo: 'receita' | 'despesa'; valor: number; categoria: string; data: string; quitado: boolean; descricao: string } }
  | { tipo: 'baixar'; resumo: string; dados: { id: string; tipo: 'receita' | 'despesa'; data: string } }
  | { tipo: 'demanda'; resumo: string; dados: { id: string; status: 'aberta' | 'encerrada' | 'cancelada' } }
  | AcaoRegistro;
type EstadoAcao = 'pendente' | 'executando' | 'feito' | 'cancelado' | 'erro';
type AvisoEDA = { id: number; tipo: string; titulo: string; texto: string; link: string | null; gravidade: string; extra: { token?: string } | null };
type Msg = { papel: 'usuario' | 'eda'; texto: string; links?: LinkEDA[]; acoes?: AcaoEDA[]; estados?: EstadoAcao[]; avisos?: AvisoEDA[] };

const acaoValida = (a: unknown): a is AcaoEDA => {
  const x = a as { tipo?: string; resumo?: unknown; dados?: unknown };
  if (!x || typeof x.resumo !== 'string') return false;
  if (x.tipo === 'alterar' || x.tipo === 'criar') return acaoRegistroValida(a);
  return !!x.dados && ['lancar', 'baixar', 'demanda'].includes(x.tipo ?? '');
};

// Avisa as telas abertas para se atualizarem sozinhas (sem recarregar nem sair da página).
const avisarTelas = (tabela: string) => window.dispatchEvent(new CustomEvent(EVENTO_AO_VIVO_EDA, { detail: { tabela } }));

async function empresaDaSessao(usuarioId: string) {
  const { data: perfil } = await supabase.from('perfis').select('empresa_id').eq('id', usuarioId).single();
  if (!perfil?.empresa_id) throw new Error('Não encontrei a empresa da sua conta.');
  return String(perfil.empresa_id);
}

/** EDA_EXECUTA_V1: grava a ação autorizada com a sessão da pessoa (RLS e plano valem). */
// Regras do banco (saída lotada, conflito de barco, limite do plano) já vêm em português: mostra direto.
let ultimoCriado: string | null = null;
function mensagemBanco(e: { message?: string; code?: string } | null, padrao: string) {
  const m = e?.message ?? '';
  if (/limite/i.test(m)) return 'Seu plano chegou ao limite para esse cadastro.';
  if (e?.code === 'P0001' && m && m.length < 220) return m;
  return padrao || 'Não consegui concluir agora.';
}

async function executarRegistro(a: AcaoRegistro, usuarioId: string): Promise<string> {
  if (!acaoRegistroValida(a)) throw new Error('Essa ação não passou na conferência de segurança.');
  const empresa = await empresaDaSessao(usuarioId);
  const regra = REGRAS_ACAO[a.tabela];
  const dados: Record<string, unknown> = { ...a.campos };
  // Campos ligados: nome do guia na reserva, valor espelhado, preço do passeio.
  if (a.tabela === 'reservas') {
    if (typeof dados.guia_id === 'string') {
      const { data: g } = await supabase.from('guias').select('nome').eq('id', dados.guia_id).eq('empresa_id', empresa).maybeSingle();
      if (!g) throw new Error('Não encontrei esse guia na sua equipe.');
      dados.guia = g.nome;
    } else if (dados.guia_id === null) dados.guia = null;
    if (typeof dados.valor_total === 'number') dados.valor = dados.valor_total;
  }
  if (a.tabela === 'passeios' && typeof dados.preco === 'number') dados.valor = dados.preco;
  if (a.tabela === 'pedidos_visitante' || a.tabela === 'passeio_saidas') dados.atualizado_em = new Date().toISOString();
  if (a.tipo === 'criar') {
    // Guias: a política de criação exige o autor (usuario_id) da sessão.
    if (a.tabela === 'guias') dados.usuario_id = usuarioId;
    if (a.tabela === 'demandas') { dados.criado_por = usuarioId; dados.metodo_estimativa = 'manual'; }
    // Reserva de cliente novo: cadastra o cliente só com o nome (a ficha é completada depois).
    if (a.tabela === 'reservas' && !dados.cliente_id) {
      const { data: novo, error: eCli } = await supabase.from('clientes').insert({ nome: dados.cliente, empresa_id: empresa }).select('id').single();
      if (eCli || !novo) throw new Error(mensagemBanco(eCli, 'Não consegui cadastrar o cliente.'));
      dados.cliente_id = novo.id;
      avisarTelas('clientes');
    }
    const { data: criado, error } = await supabase.from(a.tabela).insert({ ...dados, empresa_id: empresa }).select('id').single();
    if (error || !criado) throw new Error(mensagemBanco(error, `Não consegui criar ${regra.nome === 'saída' || regra.nome === 'reserva' || regra.nome === 'demanda' || regra.nome === 'embarcação' || regra.nome === 'hospedagem' ? 'a' : 'o'} ${regra.nome}. Confira os dados ou sua permissão.`));
    avisarTelas(a.tabela);
    ultimoCriado = a.tabela === 'reservas' ? `/reservas/editar/${criado.id}` : a.tabela === 'demandas' ? `/demandas/editar/${criado.id}` : null;
    return `${regra.nome.charAt(0).toUpperCase()}${regra.nome.slice(1)} ${['reserva', 'saída', 'demanda', 'embarcação', 'hospedagem'].includes(regra.nome) ? 'criada' : 'criado'}.`;
  }
  const { data, error } = await supabase.from(a.tabela).update(dados).eq('id', a.id).eq('empresa_id', empresa).select('id');
  if (error?.code === 'P0001') throw new Error(mensagemBanco(error, ''));
  if (error || !data?.length) throw new Error(`Não consegui alterar ${regra.nome === 'reserva' || regra.nome === 'saída' || regra.nome === 'embarcação' || regra.nome === 'hospedagem' || regra.nome === 'demanda' ? 'a' : 'o'} ${regra.nome}. Confira sua permissão ou os dados.`);
  avisarTelas(a.tabela);
  return 'Alteração feita.';
}

async function executarAcao(a: AcaoEDA): Promise<string> {
  const { data: auth } = await supabase.auth.getUser();
  if (!auth.user) throw new Error('Sua sessão expirou. Entre novamente.');
  if (a.tipo === 'alterar' || a.tipo === 'criar') return executarRegistro(a, auth.user.id);
  if (a.tipo === 'lancar') {
    const { data: perfil } = await supabase.from('perfis').select('empresa_id').eq('id', auth.user.id).single();
    if (!perfil?.empresa_id) throw new Error('Não encontrei a empresa da sua conta.');
    const d = a.dados;
    const { data, error } = await supabase.from('financeiro').insert({
      descricao: d.descricao, tipo: d.tipo, valor: d.valor, categoria: d.categoria, data_vencimento: d.data,
      data_liquidacao: d.quitado ? d.data : null,
      status: d.quitado ? (d.tipo === 'receita' ? 'Recebido' : 'Pago') : 'Pendente',
      user_id: auth.user.id, empresa_id: perfil.empresa_id,
    }).select('id').single();
    if (error || !data) throw new Error('Não consegui lançar. Confira sua permissão no financeiro.');
    avisarTelas('financeiro');
    return 'Lançado no financeiro.';
  }
  if (a.tipo === 'baixar') {
    const { data, error } = await supabase.from('financeiro')
      .update({ status: a.dados.tipo === 'receita' ? 'Recebido' : 'Pago', data_liquidacao: a.dados.data })
      .eq('id', a.dados.id).select('id');
    if (error || !data?.length) throw new Error('Não consegui dar baixa. Confira sua permissão no financeiro.');
    avisarTelas('financeiro');
    return 'Baixa feita.';
  }
  const { data, error } = await supabase.from('demandas').update({ status: a.dados.status }).eq('id', a.dados.id).select('id');
  if (error || !data?.length) throw new Error('Não consegui mudar a demanda. Confira sua permissão.');
  avisarTelas('demandas');
  return 'Demanda atualizada.';
}

// Só caminhos internos da plataforma.
const linkSeguro = (l: LinkEDA) => typeof l?.href === 'string' && /^\/[a-z]/.test(l.href) && !l.href.startsWith('//') && typeof l.rotulo === 'string';

const PAGINAS: [string, string][] = [
  ['/dashboard', 'painel'], ['/passeios', 'passeios'], ['/reservas', 'reservas'],
  ['/demandas', 'demandas'], ['/financeiro', 'financeiro'], ['/clientes', 'clientes'],
  ['/hospedagens', 'hospedagens'], ['/configuracoes', 'configuracoes'], ['/embarcacoes', 'embarcacoes'],
  ['/guias', 'guias'], ['/parceiros', 'parceiros'], ['/relatorios', 'relatorios'],
  ['/vouchers', 'vouchers'], ['/documentos', 'documentos'], ['/fiscal', 'fiscal'], ['/planos', 'planos'],
];

export function periodoManaus(): 'madrugada' | 'manha' | 'tarde' | 'noite' {
  const h = Number(new Intl.DateTimeFormat('en-US', { hour: 'numeric', hour12: false, timeZone: 'America/Manaus' }).format(new Date())) % 24;
  return h < 5 ? 'madrugada' : h < 12 ? 'manha' : h < 18 ? 'tarde' : 'noite';
}

// EDA_SAUDACAO_V3: a conversa abre com a MESMA saudação do painel, digitada letra a letra.
function corpoBoasVindas(pagina: string): string {
  const p = periodoManaus();
  const area = ROTULO_PAGINA[pagina];
  const op = p === 'madrugada'
    ? [
      'O rio está quieto a esta hora, mas eu sigo de vigia por aqui. 🌙 O que você precisa?',
      'Fico contigo nessa madrugada. Me diz o que mudar ou conferir que eu resolvo.',
      'Enquanto Barcelos dorme, eu adianto o que você pedir. Por onde começamos?',
    ]
    : [
      area ? `Tô cuidando de ${area} contigo. Me diz o que precisa mudar que eu faço aqui mesmo — você só autoriza.` : 'Me diz o que precisa que eu resolvo aqui mesmo — você só autoriza.',
      area ? `${area.charAt(0).toUpperCase()}${area.slice(1)} está comigo. Pode pedir do seu jeito: eu confiro, preparo e você confirma.` : 'Pode pedir do seu jeito: eu confiro, preparo e você confirma.',
      'Aqui é a EDA. Peça a mudança ou a dúvida que eu cuido sem você sair desta página.',
    ];
  return op[Math.floor(Math.random() * op.length)];
}

const ROTULO_PAGINA: Record<string, string> = {
  painel: 'toda a operação', passeios: 'passeios e saídas', reservas: 'reservas', demandas: 'demandas e suprimentos',
  financeiro: 'o financeiro', clientes: 'clientes', hospedagens: 'hospedagens', configuracoes: 'configurações',
  embarcacoes: 'a frota', guias: 'a equipe de guias', parceiros: 'parceiros', relatorios: 'relatórios',
  vouchers: 'vouchers', documentos: 'documentos', fiscal: 'o fiscal', planos: 'o seu plano',
};

// Negrito simples (**texto**) sem HTML: o React escapa todo o conteúdo.
function formatar(texto: string): ReactNode[] {
  return texto.split('\n').map((linha, i) => (
    <span key={i} className="cv-eda-linha">
      {linha.split(/(\*\*[^*]+\*\*)/g).map((parte, j) =>
        parte.startsWith('**') && parte.endsWith('**') ? <b key={j}>{parte.slice(2, -2)}</b> : parte.replace(/^\s*[*-]\s+/, '• '),
      )}
    </span>
  ));
}

export default function ConversaEDA() {
  const pathname = usePathname() ?? '';
  const router = useRouter();
  // EDA_ABRIR_V1: leva a pessoa ao destino sem fechar a conversa. Registro da mesma página abre na hora.
  function irPara(href: string) {
    if (!linkSeguro({ href, rotulo: '' })) return;
    const url = new URL(href, window.location.origin);
    const id = url.searchParams.get('abrir');
    if (id && url.pathname === window.location.pathname) {
      window.dispatchEvent(new CustomEvent(EVENTO_ABRIR_REGISTRO_EDA, { detail: { id } }));
      return;
    }
    try { if (id) sessionStorage.setItem('eda.abrir', id); } catch { /* sem armazenamento */ }
    router.push(href);
  }
  const pagina = PAGINAS.find(([r]) => pathname === r || pathname.startsWith(`${r}/`))?.[1];
  const [aberto, setAberto] = useState(false);
  const [msgs, setMsgs] = useState<Msg[]>([]);
  const [entrada, setEntrada] = useState('');
  const [enviando, setEnviando] = useState(false);
  const [animando, setAnimando] = useState<number | null>(null);
  const [estilo, setEstilo] = useState<'regional' | 'formal'>('regional');
  const [avisos, setAvisos] = useState<AvisoEDA[]>([]);
  const [copiado, setCopiado] = useState<number | null>(null);
  const [nome, setNome] = useState('');
  useEffect(() => {
    void supabase.auth.getUser().then(async ({ data }) => {
      if (!data.user) return;
      const { data: perfil } = await supabase.from('perfis').select('nome').eq('id', data.user.id).maybeSingle();
      setNome(String(perfil?.nome ?? '').trim().split(/\s+/)[0] ?? '');
    });
  }, []);
  // Avisos automáticos ainda não lidos (gerados pela rotina diária).
  // EDA_AO_VIVO_V1: aviso novo chega no balão sem recarregar a página.
  const [revisaoAvisos, setRevisaoAvisos] = useState(0);
  useAoVivoEDA(['eda_avisos'], () => setRevisaoAvisos((r) => r + 1));
  useEffect(() => {
    let ativo = true;
    void supabase.from('eda_avisos').select('id,tipo,titulo,texto,link,gravidade,extra').is('lido_em', null)
      .order('criado_em', { ascending: false }).limit(10)
      .then(({ data }) => { if (ativo && Array.isArray(data)) setAvisos(data as AvisoEDA[]); });
    const lidos = (e: Event) => {
      const tipo = (e as CustomEvent<{ tipo?: string }>).detail?.tipo;
      setAvisos(a => (tipo ? a.filter(x => x.tipo !== tipo) : []));
    };
    window.addEventListener('eda:avisos-lidos', lidos);
    return () => { ativo = false; window.removeEventListener('eda:avisos-lidos', lidos); };
  }, [revisaoAvisos]);
  useEffect(() => {
    if (!aberto || !avisos.length) return;
    const lista = avisos;
    setAvisos([]);
    setMsgs(m => [...m, { papel: 'eda', texto: lista.length === 1 ? 'Tenho um aviso para você:' : `Tenho ${lista.length} avisos para você:`, avisos: lista }]);
    // A chamada só executa quando é aguardada (.then); antes ficava pendente e o aviso voltava.
    void supabase.rpc('marcar_avisos_lidos_eda', { p_ids: lista.map(a => a.id) }).then(() => undefined);
  }, [aberto, avisos]);
  // EDA_PADROES_OPERACAO_V1: o jeito de falar vem das Configurações da empresa (vale em todos os aparelhos).
  useEffect(() => {
    void supabase.rpc('config_operacao_eda').then(({ data }) => {
      if ((data as { tom_eda?: string } | null)?.tom_eda === 'formal') setEstilo('formal');
    });
    const salvo = (e: Event) => setEstilo((e as CustomEvent<{ tom_eda?: string }>).detail?.tom_eda === 'formal' ? 'formal' : 'regional');
    window.addEventListener('eda:padroes-salvos', salvo);
    return () => window.removeEventListener('eda:padroes-salvos', salvo);
  }, []);
  const fimRef = useRef<HTMLDivElement>(null);
  const campoRef = useRef<HTMLTextAreaElement>(null);

  useEffect(() => {
    if (!aberto) return;
    setMsgs(m => {
      if (m.length && !m.every(x => x.avisos)) return m;
      setAnimando(0);
      return [{ papel: 'eda', texto: `${saudacaoEDA(nome).texto}\n${corpoBoasVindas(pagina ?? 'painel')}` }, ...m];
    });
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [aberto]);
  useEffect(() => { fimRef.current?.scrollIntoView({ block: 'end' }); }, [msgs, enviando]);
  useEffect(() => {
    if (!aberto) return;
    campoRef.current?.focus();
    const esc = (e: KeyboardEvent) => { if (e.key === 'Escape') setAberto(false); };
    window.addEventListener('keydown', esc);
    return () => window.removeEventListener('keydown', esc);
  }, [aberto]);

  // EDA_RECEPCAO_V2: o painel chama a EDA já com a recepção como primeira fala.
  useEffect(() => {
    const abrir = (e: Event) => {
      const det = (e as CustomEvent<{ texto?: string; saudacao?: string }>).detail;
      const corpo = typeof det?.texto === 'string' && det.texto.trim() ? det.texto.trim().slice(0, 400) : corpoBoasVindas('painel');
      const cumprimento = typeof det?.saudacao === 'string' && det.saudacao.trim() ? det.saudacao.trim().slice(0, 120) : '';
      setMsgs(m => {
        if (m.length && !m.every(x => x.avisos)) return m;
        setAnimando(0);
        return [{ papel: 'eda', texto: cumprimento ? `${cumprimento}\n${corpo}` : corpo }, ...m];
      });
      setAberto(true);
    };
    window.addEventListener('eda:abrir', abrir);
    return () => window.removeEventListener('eda:abrir', abrir);
  }, []);

  // EDA_AUDIO_V1: grava áudio (até 60 s); o servidor transcreve (Whisper/Groq, sem guardar
  // o áudio) e o texto vai para a EDA como se tivesse sido escrito.
  const [gravando, setGravando] = useState(false);
  const [transcrevendo, setTranscrevendo] = useState(false);
  const [segundos, setSegundos] = useState(0);
  const [erroAudio, setErroAudio] = useState<string | null>(null);
  const [audioOk, setAudioOk] = useState(false);
  const gravadorRef = useRef<MediaRecorder | null>(null);
  const fluxoRef = useRef<MediaStream | null>(null);
  const pedacosRef = useRef<Blob[]>([]);
  const cancelarRef = useRef(false);
  const relogioRef = useRef<ReturnType<typeof setInterval> | null>(null);
  const enviarRef = useRef<(v: string) => void>(() => undefined);
  useEffect(() => {
    setAudioOk(typeof window.MediaRecorder !== 'undefined' && !!navigator.mediaDevices?.getUserMedia);
    return () => liberarMic();
  }, []);
  useEffect(() => { if (!aberto && gravadorRef.current?.state === 'recording') pararAudio(true); }, [aberto]);

  function liberarMic() {
    if (relogioRef.current) { clearInterval(relogioRef.current); relogioRef.current = null; }
    fluxoRef.current?.getTracks().forEach(f => f.stop());
    fluxoRef.current = null;
  }

  async function iniciarAudio() {
    if (gravando || transcrevendo || enviando) return;
    setErroAudio(null);
    try {
      const fluxo = await navigator.mediaDevices.getUserMedia({ audio: { echoCancellation: true, noiseSuppression: true } });
      fluxoRef.current = fluxo;
      const tipo = ['audio/webm;codecs=opus', 'audio/webm', 'audio/mp4', 'audio/ogg;codecs=opus'].find(x => MediaRecorder.isTypeSupported?.(x));
      const g = new MediaRecorder(fluxo, tipo ? { mimeType: tipo, audioBitsPerSecond: 32000 } : undefined);
      pedacosRef.current = [];
      cancelarRef.current = false;
      g.ondataavailable = e => { if (e.data.size) pedacosRef.current.push(e.data); };
      g.onstop = () => {
        liberarMic();
        setGravando(false);
        const blob = new Blob(pedacosRef.current, { type: g.mimeType || tipo || 'audio/webm' });
        pedacosRef.current = [];
        if (cancelarRef.current || blob.size < 800) return;
        void transcrever(blob);
      };
      gravadorRef.current = g;
      g.start(250);
      setSegundos(0);
      setGravando(true);
      if (navigator.vibrate) navigator.vibrate(30);
      let n = 0;
      relogioRef.current = setInterval(() => { n += 1; setSegundos(n); if (n >= 60) pararAudio(false); }, 1000);
    } catch {
      liberarMic();
      setErroAudio('Não consegui acessar o microfone. Confira a permissão no navegador.');
    }
  }

  function pararAudio(cancelar: boolean) {
    cancelarRef.current = cancelar;
    const g = gravadorRef.current;
    if (g && g.state !== 'inactive') g.stop();
    else { liberarMic(); setGravando(false); }
  }

  async function transcrever(blob: Blob) {
    setTranscrevendo(true);
    try {
      const corpo = new FormData();
      corpo.append('audio', blob, 'audio');
      corpo.append('idioma', 'PT');
      const r = await fetch('/api/iara-audio', { method: 'POST', body: corpo });
      const j = await r.json().catch(() => ({})) as { texto?: string; erro?: string };
      if (!r.ok || !j.texto) { setErroAudio(j.erro || 'Não consegui entender o áudio. Pode escrever?'); return; }
      enviarRef.current(j.texto);
    } catch {
      setErroAudio('Não consegui entender o áudio. Pode escrever?');
    } finally {
      setTranscrevendo(false);
    }
  }

  if (!pagina) return null;

  async function enviar(valor: string) {
    const texto = valor.trim().slice(0, 1000);
    if (!texto || enviando) return;
    const historico: Msg[] = [...msgs, { papel: 'usuario', texto }];
    setMsgs(historico);
    setEntrada('');
    setEnviando(true);
    try {
      const { data } = await supabase.auth.getSession();
      const token = data.session?.access_token;
      if (!token) throw new Error('Sua sessão expirou. Entre novamente.');
      const r = await fetch('/api/eda-ia', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${token}` },
        body: JSON.stringify({ modo: 'operadora', pagina, estilo, mensagens: historico.slice(-12).map(({ papel, texto }) => ({ papel, texto })) }),
      });
      const j = await r.json().catch(() => ({})) as { resposta?: string; erro?: string; links?: LinkEDA[]; acoes?: unknown[]; navegar?: LinkEDA | null };
      if (j.navegar && linkSeguro(j.navegar)) irPara(j.navegar.href);
      const acoes = Array.isArray(j.acoes) ? j.acoes.filter(acaoValida).slice(0, 4) : [];
      const links = Array.isArray(j.links) ? j.links.filter(linkSeguro).slice(0, 3) : [];
      setAnimando(historico.length);
      setMsgs(m => [...m, { papel: 'eda', texto: j.resposta || j.erro || 'Não consegui responder agora. Tente de novo em instantes.', links, acoes, estados: acoes.map(() => 'pendente' as EstadoAcao) }]);
    } catch (e) {
      setMsgs(m => [...m, { papel: 'eda', texto: e instanceof Error && e.message.includes('sessão') ? e.message : 'Sem conexão com a EDA agora. Confira a internet e tente de novo.' }]);
    } finally {
      setEnviando(false);
    }
  }

  enviarRef.current = (v: string) => { void enviar(v); };

  function marcarEstado(i: number, k: number, estado: EstadoAcao) {
    setMsgs(m => m.map((x, j) => (j === i && x.estados ? { ...x, estados: x.estados.map((e, n) => (n === k ? estado : e)) } : x)));
  }
  async function confirmar(i: number, k: number, a: AcaoEDA, avisar = true): Promise<boolean> {
    marcarEstado(i, k, 'executando');
    try {
      ultimoCriado = null;
      const ok = await executarAcao(a);
      const href = ultimoCriado;
      marcarEstado(i, k, 'feito');
      if (avisar) setMsgs(m => [...m, { papel: 'eda', texto: `${ok} A tela já está atualizada. ✔`, links: href ? [{ href, rotulo: 'Abrir e gerenciar' }] : undefined }]);
      return true;
    } catch (e) {
      marcarEstado(i, k, 'erro');
      setMsgs(m => [...m, { papel: 'eda', texto: e instanceof Error ? e.message : 'Não consegui concluir agora.' }]);
      return false;
    }
  }
  async function confirmarTodas(i: number) {
    const msg = msgs[i];
    if (!msg?.acoes) return;
    let feitas = 0;
    for (let k = 0; k < msg.acoes.length; k += 1) {
      if ((msg.estados?.[k] ?? 'pendente') !== 'pendente') continue;
      if (await confirmar(i, k, msg.acoes[k], false)) feitas += 1;
    }
    if (feitas) setMsgs(m => [...m, { papel: 'eda', texto: `Pronto: ${feitas} ${feitas === 1 ? 'mudança feita' : 'mudanças feitas'}. A tela já está atualizada. ✔` }]);
  }
  async function copiarAvaliacao(a: AvisoEDA) {
    if (!a.extra?.token || !/^[0-9a-f]{36}$/.test(a.extra.token)) return;
    if (await copiarEDA(`${window.location.origin}/avaliar/${a.extra.token}`, 'Link de avaliação copiado')) { setCopiado(a.id); setTimeout(() => setCopiado(c => (c === a.id ? null : c)), 2500); }
  }

  return (
    <div className="cv-eda" data-aberto={aberto || undefined}>
      {aberto && (
        <section className="cv-eda-painel" role="dialog" aria-label="Conversa com a EDA">
          <header className="cv-eda-topo">
            <span className="cv-eda-avatar" aria-hidden="true"><IconeEDA /></span>
            <div>
              <p className="cv-eda-nome">EDA</p>
              <p className="cv-eda-status">{periodoManaus() === 'madrugada' ? 'De vigia na madrugada' : `Cuidando de ${ROTULO_PAGINA[pagina] ?? 'toda a operação'}`}</p>
            </div>
            <button
              type="button"
              className="cv-eda-estilo"
              aria-pressed={estilo === 'formal'}
              title="Alternar entre jeito regional e linguagem formal"
              onClick={() => setEstilo(e => (e === 'regional' ? 'formal' : 'regional'))}
            >{estilo === 'regional' ? 'Jeito regional' : 'Formal'}</button>
            <button type="button" className="cv-eda-x" onClick={() => setAberto(false)} aria-label="Fechar conversa">×</button>
          </header>

          <div className="cv-eda-lista" aria-live="polite">
            {msgs.map((m, i) => (
              <div key={i} className={`cv-eda-bloco cv-eda-bloco-${m.papel}`}>
                <p className={`cv-eda-msg cv-eda-${m.papel}`}>
                  {m.papel === 'eda'
                    ? <TextoDigitadoIA texto={m.texto} animar={animando === i} msPorLetra={i === 0 ? 26 : undefined} render={formatar} aoTerminar={() => setAnimando(a => (a === i ? null : a))} />
                    : formatar(m.texto)}
                </p>
                {animando !== i && !!m.avisos?.length && (
                  <ul className="cv-eda-avisos">
                    {m.avisos.map(a => (
                      <li key={a.id} data-gravidade={a.gravidade}>
                        <b>{a.titulo}</b>
                        <span>{a.texto}</span>
                        <div className="cv-eda-aviso-acoes">
                          {a.tipo === 'avaliacao' && a.extra?.token && (
                            <button type="button" onClick={() => void copiarAvaliacao(a)}>{copiado === a.id ? 'Link copiado ✔' : 'Copiar link de avaliação'}</button>
                          )}
                          {a.link && <Link href={a.link} onClick={e => { e.preventDefault(); irPara(a.link!); }}>Abrir →</Link>}
                        </div>
                      </li>
                    ))}
                  </ul>
                )}
                {animando !== i && !!m.acoes?.length && (
                  <div className="cv-eda-acoes">
                    {m.acoes.length > 1 && (m.estados ?? []).filter(e => e === 'pendente').length > 1 && (
                      <button type="button" className="cv-eda-acao-todas" onClick={() => void confirmarTodas(i)}>Autorizar todas ({(m.estados ?? []).filter(e => e === 'pendente').length})</button>
                    )}
                    {m.acoes.map((a, k) => {
                      const st = m.estados?.[k] ?? 'pendente';
                      return (
                        <div key={k} className="cv-eda-acao" data-estado={st}>
                          <p>{a.resumo}</p>
                          {st === 'pendente' || st === 'executando' ? (
                            <div>
                              <button type="button" disabled={st === 'executando'} onClick={() => void confirmar(i, k, a)}>{st === 'executando' ? 'Fazendo…' : 'Autorizar'}</button>
                              <button type="button" className="cv-eda-acao-nao" disabled={st === 'executando'} onClick={() => marcarEstado(i, k, 'cancelado')}>Cancelar</button>
                            </div>
                          ) : <small>{st === 'feito' ? 'Feito ✔' : st === 'cancelado' ? 'Cancelado' : 'Não deu certo'}</small>}
                        </div>
                      );
                    })}
                  </div>
                )}
                {animando !== i && !!m.links?.length && (
                  <div className="cv-eda-links">
                    {m.links.map(l => <Link key={l.href} href={l.href} onClick={e => { e.preventDefault(); irPara(l.href); }}>{l.rotulo} →</Link>)}
                  </div>
                )}
              </div>
            ))}
            {enviando && <p className="cv-eda-msg cv-eda-eda cv-eda-pensando" aria-label="EDA pensando"><i /><i /><i /></p>}
            <div ref={fimRef} />
          </div>

          {erroAudio && <p className="cv-eda-erro" role="alert">{erroAudio}</p>}
          <form className="cv-eda-form" onSubmit={e => { e.preventDefault(); void enviar(entrada); }}>
            {gravando ? (
              <>
                <button type="button" className="cv-eda-cancelar" onClick={() => pararAudio(true)} aria-label="Cancelar gravação" title="Cancelar gravação">
                  <svg viewBox="0 0 24 24" width="18" height="18" aria-hidden="true"><path d="M6 7h12M9.5 7V5h5v2M8 7l.8 12h6.4L16 7" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round" /></svg>
                </button>
                <div className="cv-eda-audio" role="status" aria-live="polite">
                  <span className="cv-eda-rec" aria-hidden="true" />
                  <span>Gravando…</span>
                  <span className="cv-eda-tempo">{`0:${String(segundos).padStart(2, '0')}`}</span>
                  <span className="cv-eda-onda" aria-hidden="true"><i /><i /><i /><i /><i /></span>
                </div>
                <button type="button" onClick={() => pararAudio(false)} aria-label="Parar e enviar" title="Parar e enviar">➤</button>
              </>
            ) : transcrevendo ? (
              <div className="cv-eda-audio" role="status" aria-live="polite">
                <span className="cv-eda-onda" aria-hidden="true"><i /><i /><i /><i /><i /></span>
                <span>Ouvindo seu áudio…</span>
              </div>
            ) : (
              <>
                <textarea
                  ref={campoRef}
                  rows={1}
                  value={entrada}
                  maxLength={1000}
                  placeholder="Pergunte à EDA…"
                  aria-label="Mensagem para a EDA"
                  onChange={e => { setEntrada(e.target.value); if (erroAudio) setErroAudio(null); }}
                  onKeyDown={e => { if (e.key === 'Enter' && !e.shiftKey) { e.preventDefault(); void enviar(entrada); } }}
                />
                {audioOk && !entrada.trim() ? (
                  <button type="button" onClick={() => void iniciarAudio()} disabled={enviando} aria-label="Gravar áudio" title="Gravar áudio">
                    <svg viewBox="0 0 24 24" width="18" height="18" aria-hidden="true"><rect x="9" y="3" width="6" height="11" rx="3" fill="currentColor" /><path d="M5.5 11a6.5 6.5 0 0 0 13 0M12 17.5V21" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" /></svg>
                  </button>
                ) : (
                  <button type="submit" disabled={enviando || !entrada.trim()} aria-label="Enviar">➤</button>
                )}
              </>
            )}
          </form>
          <p className="cv-eda-nota">A EDA lê só dados da sua operadora. Dados pessoais de clientes (nome, CPF, contato, saúde) não saem da plataforma — LGPD.</p>
        </section>
      )}

      {/* EDA_LANCADOR_V2: botão redondo igual ao da Iara, canto superior direito. */}
      <button
        type="button"
        className="cv-eda-botao"
        onClick={() => setAberto(v => !v)}
        aria-expanded={aberto}
        aria-label={aberto ? 'Fechar conversa com a EDA' : 'Pergunte à EDA'}
        title="Pergunte à EDA"
      >
        <IconeEDA />
        {!aberto && avisos.length > 0 && <span className="cv-eda-badge" aria-label={`${avisos.length} aviso(s) novo(s)`}>{avisos.length}</span>}
      </button>
    </div>
  );
}
