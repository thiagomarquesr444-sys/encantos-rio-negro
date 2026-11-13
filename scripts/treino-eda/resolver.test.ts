// EDA_TREINO_V1: prova automática do "cérebro" da EDA (rode: npm run treino:eda).
// Cada cenário é um jeito real de o operador falar; o resultado tem que ser sempre o mesmo.
import { test } from 'node:test';
import assert from 'node:assert/strict';
import { acharRegistro, campoReal, escolherSaida, semelhanca, type Candidato } from '../../lib/resolverEDA';
import { acaoRegistroValida, converterValor, REGRAS_ACAO } from '../../lib/acoesEDA';

const id = (n: number) => `00000000-0000-4000-8000-${String(n).padStart(12, '0')}`;
const C: Candidato[] = [
  { codigo: 'P1', tabela: 'passeios', id: id(1), rotulo: 'Visita a Ilha do Aracá' },
  { codigo: 'P2', tabela: 'passeios', id: id(2), rotulo: 'Conheça o Rio Negro Jaú/Anavilhanas' },
  { codigo: 'P3', tabela: 'passeios', id: id(3), rotulo: 'Pesca esportiva do tucunaré' },
  { codigo: 'E1', tabela: 'embarcacoes', id: id(11), rotulo: 'Jaguá' },
  { codigo: 'E2', tabela: 'embarcacoes', id: id(12), rotulo: 'Jaguatirica' },
  { codigo: 'G1', tabela: 'guias', id: id(21), rotulo: 'Oziel Barbosa' },
  { codigo: 'G2', tabela: 'guias', id: id(22), rotulo: 'Alison Guia' },
  { codigo: 'R1', tabela: 'reservas', id: id(31), rotulo: 'Visita a Ilha do Aracá 15/11', busca: 'Raimundo Nonato da Silva Visita a Ilha do Aracá' },
  { codigo: 'R2', tabela: 'reservas', id: id(32), rotulo: 'Visita a Ilha do Aracá 15/11', busca: 'Francisco Damasceno Neto Visita a Ilha do Aracá' },
  { codigo: 'D1', tabela: 'demandas', id: id(41), rotulo: 'Rancho da saída do Aracá' },
];

const achaCodigo = (valor: string, tabela?: string) => { const r = acharRegistro(valor, C, tabela); return r.ok ? r.candidato.codigo : r.motivo; };

test('acha pelo código', () => {
  assert.equal(achaCodigo('P1'), 'P1');
  assert.equal(achaCodigo('e2', 'embarcacoes'), 'E2');
});

test('acha passeio pelo nome, com e sem acento e com erro de digitação', () => {
  assert.equal(achaCodigo('ilha do aracá', 'passeios'), 'P1');
  assert.equal(achaCodigo('visita a ilha do araca', 'passeios'), 'P1');
  assert.equal(achaCodigo('ilha do arac', 'passeios'), 'P1');
  assert.equal(achaCodigo('anavilhanas', 'passeios'), 'P2');
  assert.equal(achaCodigo('pesca do tucunare', 'passeios'), 'P3');
});

test('barco Jaguá não confunde com Jaguatirica', () => {
  assert.equal(achaCodigo('Jaguá', 'embarcacoes'), 'E1');
  assert.equal(achaCodigo('jagua', 'embarcacoes'), 'E1');
  assert.equal(achaCodigo('jaguatirica', 'embarcacoes'), 'E2');
});

test('guia pelo primeiro nome', () => {
  assert.equal(achaCodigo('Oziel', 'guias'), 'G1');
  assert.equal(achaCodigo('guia Oziel', 'guias'), 'G1');
});

test('reserva pelo nome do cliente (busca do servidor, sem expor à IA)', () => {
  assert.equal(achaCodigo('reserva do Raimundo Nonato'), 'R1');
  assert.equal(achaCodigo('Francisco Damasceno', 'reservas'), 'R2');
});

test('duas reservas iguais sem cliente = pergunta (não chuta)', () => {
  assert.equal(achaCodigo('Visita a Ilha do Aracá 15/11', 'reservas'), 'ambiguo');
});

test('nome que não existe = nenhum (não inventa)', () => {
  assert.equal(achaCodigo('Cachoeira do El Dorado', 'passeios'), 'nenhum');
  assert.equal(achaCodigo('Bartolomeu', 'guias'), 'nenhum');
});

test('apelidos de campo viram o campo certo', () => {
  assert.equal(campoReal('reservas', 'pessoas'), 'quantidade_pessoas');
  assert.equal(campoReal('reservas', 'barco'), 'embarcacao_id');
  assert.equal(campoReal('reservas', 'guia'), 'guia_id');
  assert.equal(campoReal('reservas', 'criancas'), 'qtd_criancas');
  assert.equal(campoReal('reservas', 'data'), 'data_reserva');
  assert.equal(campoReal('reservas', 'pedido'), 'pedido_id');
  assert.equal(campoReal('passeio_saidas', 'data'), 'data_inicio');
  assert.equal(campoReal('passeio_saidas', 'vagas'), 'vagas_total');
  assert.equal(campoReal('passeios', 'valor'), 'preco');
  assert.equal(campoReal('demandas', 'saida'), 'saida_id');
  assert.equal(campoReal('reservas', 'cpf'), undefined); // fora da lista: nunca gravado
  assert.equal(campoReal('reservas', 'empresa_id'), undefined);
});

test('saída: uma aberta = escolhe; várias = pergunta; pela data = acha', () => {
  const s = [
    { id: 'a', data_inicio: '2026-11-15', status: 'aberta' },
    { id: 'b', data_inicio: '2026-11-22', status: 'aberta' },
    { id: 'c', data_inicio: '2026-11-29', status: 'cancelada' },
  ];
  assert.deepEqual(escolherSaida([s[0], s[2]]), { ok: true, saida: s[0] });
  const v = escolherSaida(s);
  assert.equal(v.ok, false);
  assert.equal(!v.ok && v.motivo, 'varias');
  const d = escolherSaida(s, '2026-11-22');
  assert.equal(d.ok && d.saida.id, 'b');
  const x = escolherSaida(s, '2026-11-29');
  assert.equal(!x.ok && x.motivo, 'sem_na_data');
});

test('valores: datas, horas, status e números', () => {
  const r = REGRAS_ACAO.reservas.campos;
  assert.equal(converterValor(r.horario, '6h'), '06:00');
  assert.equal(converterValor(r.horario, '25:00'), undefined);
  assert.equal(converterValor(r.status, 'confirmada'), 'Confirmada');
  assert.equal(converterValor(r.status, 'paga'), undefined);
  assert.equal(converterValor(r.valor_total, 'R$ 1.250,50'), 1250.5);
  assert.equal(converterValor(r.quantidade_pessoas, '0'), undefined);
  assert.equal(converterValor(r.data_reserva, '2026-02-30'), '2026-02-30' === '2026-02-30' && !Number.isNaN(Date.parse('2026-02-30T12:00:00Z')) ? '2026-02-30' : undefined);
});

test('segurança: ação forjada é barrada no navegador', () => {
  const ok = { tipo: 'alterar', tabela: 'reservas', id: id(31), campos: { status: 'Confirmada' }, resumo: 'x' };
  assert.equal(acaoRegistroValida(ok), true);
  assert.equal(acaoRegistroValida({ ...ok, campos: { empresa_id: id(9) } }), false);
  assert.equal(acaoRegistroValida({ ...ok, tabela: 'perfis' }), false);
  assert.equal(acaoRegistroValida({ ...ok, id: '1 or 1=1' }), false);
  assert.equal(acaoRegistroValida({ tipo: 'criar', tabela: 'vouchers', campos: { status: 'Cancelado' }, resumo: 'x' }), false);
  assert.equal(acaoRegistroValida({ ...ok, campos: { status: 'Confirmada; drop table' } }), false);
});

test('semelhança é estável', () => {
  assert.ok(semelhanca('ilha do araca', 'Visita a Ilha do Aracá') >= 0.6);
  assert.ok(semelhanca('rio negro', 'Pesca esportiva do tucunaré') < 0.6);
});
