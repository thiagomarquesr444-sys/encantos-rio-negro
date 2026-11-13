// EDA_TREINO_AO_VIVO_V1: prova da EDA de verdade (IA + servidor) no site publicado.
// Uso: npm.cmd run treino:eda:ao-vivo  → pede seu e-mail e senha da plataforma (a senha não aparece
// na tela e não é salva), entra pelo Supabase e roda os cenários.
// Só PREPARA ações (nada é gravado: gravar exige o clique em "Autorizar").
// Ajuste os nomes em cenarios.json para os da sua operadora de teste.
import { readFileSync } from 'node:fs';
import readline from 'node:readline';
import cenarios from './cenarios.json' with { type: 'json' };

const URL_BASE = process.env.EDA_URL ?? 'https://os-rio-negro.vercel.app';

function lerEnvLocal() {
  try {
    return Object.fromEntries(readFileSync('.env.local', 'utf8').split(/\r?\n/)
      .map(l => l.match(/^\s*([A-Z0-9_]+)\s*=\s*"?([^"]*)"?\s*$/)).filter(Boolean).map(m => [m[1], m[2]]));
  } catch { return {}; }
}

function perguntar(texto, oculto = false) {
  return new Promise(resolve => {
    const rl = readline.createInterface({ input: process.stdin, output: process.stdout, terminal: true });
    if (oculto) rl._writeToOutput = s => { if (!s.includes(texto)) return; rl.output.write(texto); };
    rl.question(texto, v => { rl.close(); if (oculto) process.stdout.write('\n'); resolve(v.trim()); });
  });
}

async function obterToken() {
  if (process.env.EDA_TOKEN) return process.env.EDA_TOKEN;
  const env = { ...lerEnvLocal(), ...process.env };
  const url = env.NEXT_PUBLIC_SUPABASE_URL, chave = env.NEXT_PUBLIC_SUPABASE_ANON_KEY;
  if (!url || !chave) { console.error('Não achei NEXT_PUBLIC_SUPABASE_URL/ANON_KEY no .env.local (rode na pasta do projeto).'); process.exit(1); }
  const email = await perguntar('E-mail da plataforma: ');
  const senha = await perguntar('Senha (não aparece): ', true);
  const r = await fetch(`${url}/auth/v1/token?grant_type=password`, {
    method: 'POST', headers: { apikey: chave, 'Content-Type': 'application/json' }, body: JSON.stringify({ email, password: senha }),
  });
  const j = await r.json().catch(() => ({}));
  if (!r.ok || !j.access_token) { console.error('Não consegui entrar:', j.error_description ?? j.msg ?? r.status); process.exit(1); }
  return j.access_token;
}

const TOKEN = await obterToken();

let acertos = 0;
const falhas = [];
for (const c of cenarios) {
  const r = await fetch(`${URL_BASE}/api/eda-ia`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${TOKEN}` },
    body: JSON.stringify({ modo: 'operadora', pagina: c.pagina ?? 'painel', mensagens: [{ papel: 'usuario', texto: c.pedido }] }),
  });
  const j = await r.json().catch(() => ({}));
  const acoes = Array.isArray(j.acoes) ? j.acoes : [];
  const e = c.espera;
  let ok = r.ok;
  if (e.acao) ok &&= acoes.some(a => a.tipo === e.acao && (!e.tabela || a.tabela === e.tabela));
  if (e.navegar) ok &&= !!j.navegar?.href?.startsWith(e.navegar);
  if (e.semAcao) ok &&= acoes.length === 0;
  if (e.naoPergunta) ok &&= !/\b(qual (a )?data|que dia|qual o hor[aá]rio|qual o pre[cç]o)\b/i.test(j.resposta ?? '');
  if (ok) acertos += 1; else falhas.push({ pedido: c.pedido, resposta: (j.resposta ?? j.erro ?? '').slice(0, 160), acoes: acoes.map(a => a.resumo) });
  console.log(`${ok ? '✔' : '✘'} ${c.pedido}`);
  await new Promise(res => setTimeout(res, 1500)); // respeita a cota grátis
}
const nota = Math.round((acertos / cenarios.length) * 100);
console.log(`\nNOTA DA EDA: ${acertos}/${cenarios.length} (${nota}%)`);
if (falhas.length) console.log('\nPara treinar:', JSON.stringify(falhas, null, 2));
process.exit(nota >= 80 ? 0 : 1);
