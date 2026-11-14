import { supabase } from '@/lib/supabase';

// EDA_FILA_OFFLINE_V1
// Quando a internet cai (comunidade, rio, Starlink oscilando), ações da operadora
// ficam guardadas NESTE aparelho e sobem sozinhas quando o sinal volta.
// Com internet normal nada disso entra em ação: a ação vai direto, como sempre.
//
// Segurança / LGPD:
// - Só ações da lista abaixo (nada genérico): a fila não executa SQL livre.
// - Guarda só identificadores (id do voucher + horário), nunca dados pessoais.
// - Cada ação fica presa ao usuário que fez; só é enviada com a mesma conta logada.
// - A cópia da lista de embarques do dia expira sozinha e é apagada ao sair da conta.

const BANCO = 'eda-offline';
const VERSAO_BANCO = 1;
const FILA = 'fila';
const COPIAS = 'copias';
const EVENTO = 'eda-fila-mudou';

export type AcaoFilaEDA = {
  id: string;
  tipo: 'checkin_voucher';
  alvo: string; // id do voucher
  quando: string; // ISO: momento real em que o operador fez a ação
  usuario: string;
  rotulo: string; // texto curto para o aviso (código do voucher)
  tentativas: number;
};

export type FalhaFilaEDA = { rotulo: string; motivo: string };

function abrir(): Promise<IDBDatabase> {
  return new Promise((ok, falha) => {
    const pedido = indexedDB.open(BANCO, VERSAO_BANCO);
    pedido.onupgradeneeded = () => {
      const db = pedido.result;
      if (!db.objectStoreNames.contains(FILA)) db.createObjectStore(FILA, { keyPath: 'id' });
      if (!db.objectStoreNames.contains(COPIAS)) db.createObjectStore(COPIAS, { keyPath: 'chave' });
    };
    pedido.onsuccess = () => ok(pedido.result);
    pedido.onerror = () => falha(pedido.error);
  });
}

async function operar<T>(loja: string, modo: IDBTransactionMode, fn: (s: IDBObjectStore) => IDBRequest<T>): Promise<T> {
  const db = await abrir();
  return new Promise<T>((ok, falha) => {
    const tx = db.transaction(loja, modo);
    const req = fn(tx.objectStore(loja));
    tx.oncomplete = () => { db.close(); ok(req.result); };
    tx.onerror = () => { db.close(); falha(tx.error); };
    tx.onabort = () => { db.close(); falha(tx.error); };
  });
}

function avisarMudanca() {
  if (typeof window !== 'undefined') window.dispatchEvent(new Event(EVENTO));
}

export function aoMudarFilaEDA(fn: () => void): () => void {
  window.addEventListener(EVENTO, fn);
  return () => window.removeEventListener(EVENTO, fn);
}

/** Erro de rede (sem internet / caiu no meio), não erro de regra do sistema. */
export function erroDeRedeEDA(erro: unknown): boolean {
  if (typeof navigator !== 'undefined' && navigator.onLine === false) return true;
  const msg = String((erro as { message?: string })?.message ?? erro ?? '').toLowerCase();
  return /failed to fetch|networkerror|network request failed|load failed|fetch failed|timeout|aborted/.test(msg);
}

// iPhone apaga dados de sites pouco usados; pedimos para manter a fila.
async function pedirArmazenamentoPersistente() {
  try { await navigator.storage?.persist?.(); } catch { /* opcional */ }
}

const CHAVE_USUARIO = 'eda-offline-usuario-v1';

async function usuarioAtual(): Promise<string | null> {
  try {
    const { data } = await supabase.auth.getSession(); // lê do aparelho
    const id = data.session?.user?.id ?? null;
    if (id) {
      try { sessionStorage.setItem(CHAVE_USUARIO, id); } catch { /* nada */ }
      return id;
    }
  } catch { /* sem rede para renovar o login */ }

  // Sem internet o login pode não conseguir se renovar: vale a conta desta aba
  // (apagada ao sair da conta). O envio real exige login válido no servidor.
  try { return sessionStorage.getItem(CHAVE_USUARIO); } catch { return null; }
}

export async function listarFilaEDA(): Promise<AcaoFilaEDA[]> {
  try {
    const itens = await operar<AcaoFilaEDA[]>(FILA, 'readonly', s => s.getAll() as IDBRequest<AcaoFilaEDA[]>);
    return itens.sort((a, b) => a.quando.localeCompare(b.quando));
  } catch {
    return [];
  }
}

export async function enfileirarCheckinEDA(voucherId: string, codigo: string): Promise<void> {
  const usuario = await usuarioAtual();
  if (!usuario) throw new Error('Entre na sua conta para registrar o embarque.');
  const existentes = await listarFilaEDA();
  if (existentes.some(a => a.tipo === 'checkin_voucher' && a.alvo === voucherId)) return;

  const acao: AcaoFilaEDA = {
    id: crypto.randomUUID(),
    tipo: 'checkin_voucher',
    alvo: voucherId,
    quando: new Date().toISOString(),
    usuario,
    rotulo: codigo,
    tentativas: 0,
  };
  await operar(FILA, 'readwrite', s => s.put(acao));
  void pedirArmazenamentoPersistente();
  avisarMudanca();
}

async function remover(id: string) {
  await operar(FILA, 'readwrite', s => s.delete(id));
}

let enviando = false;

/** Envia o que estiver guardado. Retorna as ações recusadas pelo sistema. */
export async function processarFilaEDA(): Promise<{ enviadas: number; falhas: FalhaFilaEDA[] }> {
  const resultado = { enviadas: 0, falhas: [] as FalhaFilaEDA[] };
  if (enviando || (typeof navigator !== 'undefined' && navigator.onLine === false)) return resultado;
  enviando = true;

  try {
    const usuario = await usuarioAtual();
    if (!usuario) return resultado;

    for (const acao of await listarFilaEDA()) {
      if (acao.usuario !== usuario) continue; // nunca envia ação de outra conta

      if (acao.tipo === 'checkin_voucher') {
        const { error } = await supabase.rpc('marcar_voucher_utilizado_offline_eda', {
          p_voucher_id: acao.alvo,
          p_utilizado_em: acao.quando,
        });

        if (!error) {
          await remover(acao.id);
          resultado.enviadas += 1;
          continue;
        }

        if (erroDeRedeEDA(error)) break; // sinal caiu de novo: tenta depois

        const msg = String(error.message ?? '');
        if (msg.includes('EDA_VOUCHER_JA_UTILIZADO')) {
          await remover(acao.id); // alguém já fez o check-in: está resolvido
          resultado.enviadas += 1;
          continue;
        }

        const motivo = msg.includes('EDA_VOUCHER_CANCELADO')
          ? 'o voucher foi cancelado'
          : msg.includes('EDA_VOUCHER_SUBSTITUIDO')
            ? 'o voucher foi substituído por uma nova versão'
            : 'o sistema não aceitou o check-in';

        acao.tentativas += 1;
        if (acao.tentativas >= 3 || !/jwt|auth|permission|401|403/i.test(msg)) {
          await remover(acao.id);
          resultado.falhas.push({ rotulo: acao.rotulo, motivo });
        } else {
          await operar(FILA, 'readwrite', s => s.put(acao));
        }
      }
    }
  } finally {
    enviando = false;
    avisarMudanca();
  }

  return resultado;
}

// ---------------------------------------------------------------------------
// Cópia da lista de embarques do dia (para abrir a tela sem internet no porto).
// Expira no fim do dia seguinte e é apagada ao sair da conta.
// ---------------------------------------------------------------------------

type CopiaEDA = { chave: string; usuario: string; expira: number; dados: unknown };

function fimDoDiaSeguinte(dataISO: string): number {
  const d = new Date(`${dataISO}T23:59:59-04:00`); // horário de Manaus
  return d.getTime() + 24 * 3600 * 1000;
}

export async function guardarCopiaEmbarquesEDA(dataISO: string, dados: unknown): Promise<void> {
  try {
    const usuario = await usuarioAtual();
    if (!usuario) return;
    const copia: CopiaEDA = { chave: `embarques:${dataISO}`, usuario, expira: fimDoDiaSeguinte(dataISO), dados };
    await operar(COPIAS, 'readwrite', s => s.put(copia));
  } catch { /* sem IndexedDB: segue sem cópia */ }
}

export async function lerCopiaEmbarquesEDA<T>(dataISO: string): Promise<T | null> {
  try {
    const usuario = await usuarioAtual();
    const copia = await operar<CopiaEDA | undefined>(COPIAS, 'readonly', s => s.get(`embarques:${dataISO}`) as IDBRequest<CopiaEDA | undefined>);
    if (!copia || copia.usuario !== usuario) return null;
    if (copia.expira < Date.now()) {
      await operar(COPIAS, 'readwrite', s => s.delete(copia.chave));
      return null;
    }
    return copia.dados as T;
  } catch {
    return null;
  }
}

export async function limparCopiasExpiradasEDA(): Promise<void> {
  try {
    const todas = await operar<CopiaEDA[]>(COPIAS, 'readonly', s => s.getAll() as IDBRequest<CopiaEDA[]>);
    for (const c of todas) if (c.expira < Date.now()) await operar(COPIAS, 'readwrite', s => s.delete(c.chave));
  } catch { /* nada */ }
}

/** Ao sair da conta: apaga as cópias de dados (a fila só guarda ids). */
export async function limparDadosOfflineEDA(): Promise<void> {
  try { sessionStorage.removeItem(CHAVE_USUARIO); } catch { /* nada */ }
  try { await operar(COPIAS, 'readwrite', s => s.clear()); } catch { /* nada */ }
}
