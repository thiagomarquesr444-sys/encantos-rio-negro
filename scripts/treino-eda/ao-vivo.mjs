// EDA_TREINO_AO_VIVO_V1: prova da EDA de verdade (IA + servidor) no site publicado.
// Uso (PowerShell, um comando por vez):
//   $env:EDA_URL="https://os-rio-negro.vercel.app"
//   $env:EDA_TOKEN="<access_token da sua sessão>"   (DevTools › Application › Local Storage › sb-...-auth-token › access_token)
//   npm run treino:eda:ao-vivo
// Só PREPARA ações (nada é gravado: gravar exige o clique em "Autorizar").
// Ajuste os nomes abaixo para os da sua operadora de teste.
import cenarios from './cenarios.json' with { type: 'json' };

const URL_BASE = process.env.EDA_URL ?? 'https://os-rio-negro.vercel.app';
const TOKEN = process.env.EDA_TOKEN;
if (!TOKEN) { console.error('Defina EDA_TOKEN (veja o topo do arquivo).'); process.exit(1); }

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
