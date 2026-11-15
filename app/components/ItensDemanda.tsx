'use client';

import { useEffect, useRef, useState } from 'react';
import SeletorERN from './SeletorERN';
import { supabase } from '@/lib/supabase';
import GraficoMateriaisDemanda from './GraficoMateriaisDemanda';
import { subtotal, moeda } from '@/lib/calculosMateriaisDemanda';
import { exportarMateriaisDemanda } from '@/lib/exportarMateriaisDemanda';
// EDA_PDF_SOB_DEMANDA_V1: o gerador de PDF só é baixado quando o checklist é pedido.
import { confirmarERN } from '@/lib/confirmarERN';
import {
  CATEGORIAS_ITEM,
  SITUACOES_ITEM,
  carregarItensDemanda,
  salvarItensDemanda,
  novoItemDemanda,
  UNIDADES_ITEM,
  normalizarUnidade,

  type ItemDemanda,
  type CategoriaItem,
  type SituacaoItem,
} from '@/lib/itensDemanda';
import {
  KITS_MATERIAIS,
  acharMaterial,
  buscarMateriais,
  chaveMaterial,
  itemDoCatalogo,
  quantidadeSugerida,
  type MaterialPadrao,
} from '@/lib/catalogoMateriaisEDA';

type Linha = ItemDemanda & { chave: string };

type Props = {
  demandaId?: string;
  bloqueado: boolean;
  onItensChange?: (itens: ItemDemanda[]) => void;
  // EDA_DEMANDA_SAIDA_V1: itens sugeridos pela saída (uma vez por chave).
  acrescentar?: { chave: string; itens: ItemDemanda[] } | null;
  // EDA_MATERIAIS_V2: base para sugerir quantidades (pessoas × dias).
  pessoas?: number;
  dias?: number;
};

const campo =
  'min-h-12 w-full min-w-0 rounded-xl border border-[var(--ern-borda)] bg-[var(--ern-fundo)] px-3 text-base text-[var(--ern-texto)] outline-none focus:ring-2 focus:ring-[var(--ern-destaque)] disabled:opacity-50 sm:text-sm';

const campoCompacto =
  'min-h-11 min-w-0 rounded-lg border border-[var(--ern-borda)] bg-[var(--ern-fundo)] px-2 text-sm text-[var(--ern-texto)] outline-none focus:ring-2 focus:ring-[var(--ern-destaque)] disabled:opacity-50';

const PROXIMA_SITUACAO: Record<SituacaoItem, SituacaoItem> = {
  pendente: 'em_separacao', em_separacao: 'atendido', atendido: 'pendente',
};

const categorias = Object.entries(CATEGORIAS_ITEM).map(([value, label]) => ({
  value, label,
}));

const unidades = UNIDADES_ITEM.map((value) => ({ value, label: value }));

function opcoesUnidade(atual: string) {
  return atual && !UNIDADES_ITEM.some((u) => u === atual)
    ? [{ value: atual, label: atual }, ...unidades]
    : unidades;
}


export default function ItensDemanda({ demandaId, bloqueado, onItensChange, acrescentar, pessoas, dias }: Props) {
  const [itens, setItens] = useState<Linha[]>([]);
  const [versao, setVersao] = useState<number | null>(null);
  const [carregando, setCarregando] = useState(true);
  const [salvando, setSalvando] = useState(false);
  const [exportando, setExportando] = useState(false);
  const [alterado, setAlterado] = useState(false);
  const [erro, setErro] = useState('');
  const [aviso, setAviso] = useState('');
  const [tentativa, setTentativa] = useState(0);
  // ERN_V42_CONFERENCIA: filtro local; gravacao permanece em Salvar lista.
  const [filtroConferencia, setFiltroConferencia] = useState<'todos' | 'nao_atendidos' | SituacaoItem>('nao_atendidos');
  const trava = useRef(false);
  const [novaChave, setNovaChave] = useState('');
  const [busca, setBusca] = useState('');
  const [abertoChave, setAbertoChave] = useState('');

  useEffect(() => {
    if (!demandaId) {
      setVersao(0);
      setCarregando(false);
      return;
    }

    const idDaDemanda = demandaId;
    const controller = new AbortController();
    let ativo = true;

    async function carregar() {
      try {
        const resultado = await carregarItensDemanda(idDaDemanda, controller.signal);

        if (!ativo) return;

        setItens(resultado.itens.map((item) => ({
          ...item,
          chave: crypto.randomUUID(),
        })));
        setVersao(resultado.versao);
        setAlterado(false);
        setErro('');
      } catch (falha) {
        if (!ativo) return;
        setErro(falha instanceof Error ? falha.message : 'Falha ao carregar a lista.');
        setVersao(null);
      } finally {
        if (ativo) setCarregando(false);
      }
    }

    void carregar();
    return () => {
      ativo = false;
      controller.abort();
    };
  }, [demandaId, tentativa]);

  useEffect(() => {
    if (!alterado) return;
    function avisar(event: BeforeUnloadEvent) {
      event.preventDefault();
      event.returnValue = '';
    }
    window.addEventListener('beforeunload', avisar);
    return () => window.removeEventListener('beforeunload', avisar);
  }, [alterado]);

  const ultimaSugestao = useRef('');
  useEffect(() => {
    if (!acrescentar || carregando || acrescentar.chave === ultimaSugestao.current) return;
    ultimaSugestao.current = acrescentar.chave;
    setItens((atuais) => [
      ...atuais,
      ...acrescentar.itens
        // não duplica um item já presente com a mesma descrição
        .filter((n) => !atuais.some((a) => a.descricao.trim().toLowerCase() === n.descricao.trim().toLowerCase()))
        .map((item) => ({ ...item, chave: crypto.randomUUID() })),
    ]);
    setAlterado(true);
  }, [acrescentar, carregando]);

  useEffect(() => {
    if (!demandaId) onItensChange?.(itens);
  }, [demandaId, itens, onItensChange]);

  const desabilitado = bloqueado || carregando || salvando || exportando || versao === null;

  function editar(chave: string, valores: Partial<ItemDemanda>) {
    if (desabilitado || trava.current) return;
    setItens((atuais) => atuais.map((item) =>
      item.chave === chave ? { ...item, ...valores } : item,
    ));
    setAlterado(true);
    setAviso('');
  }

  // EDA_MATERIAIS_V2 -------------------------------------------------------
  const sugestoes = buscarMateriais(busca);

  function adicionarMaterial(material: MaterialPadrao | null, texto: string) {
    if (desabilitado || trava.current) return;
    const nome = (material?.nome ?? texto).trim();
    if (nome.length < 2) return;
    if (itens.length >= 200) { setErro('Esta lista chegou ao limite de 200 itens.'); return; }
    const repetido = itens.find((i) => chaveMaterial(i.descricao) === chaveMaterial(nome));
    if (repetido) {
      setNovaChave(repetido.chave);
      setFiltroConferencia('todos');
      setAviso(`“${repetido.descricao.trim()}” já está na lista. Ajuste a quantidade nele.`);
      setBusca('');
      return;
    }
    const chaveNova = crypto.randomUUID();
    const base = material ? itemDoCatalogo(material, pessoas, dias) : { ...novoItemDemanda(), descricao: nome };
    setNovaChave(chaveNova);
    setItens((atuais) => [...atuais, { ...base, chave: chaveNova }]);
    setAlterado(true);
    setAviso('');
    setBusca('');
  }

  function adicionarKit(id: string) {
    if (desabilitado || trava.current) return;
    const kit = KITS_MATERIAIS.find((k) => k.id === id);
    if (!kit) return;
    const novos: Linha[] = [];
    for (const nome of kit.itens) {
      const material = acharMaterial(nome);
      if (!material) continue;
      if (itens.some((i) => chaveMaterial(i.descricao) === chaveMaterial(material.nome))) continue;
      novos.push({ ...itemDoCatalogo(material, pessoas, dias), chave: crypto.randomUUID() });
    }
    if (!novos.length) { setAviso(`O kit ${kit.nome} já está todo na lista.`); return; }
    if (itens.length + novos.length > 200) { setErro('Esta lista chegou ao limite de 200 itens.'); return; }
    setItens((atuais) => [...atuais, ...novos]);
    setFiltroConferencia('todos');
    setAlterado(true);
    setAviso(`${novos.length} ${novos.length === 1 ? 'item adicionado' : 'itens adicionados'} do kit ${kit.nome}. Confira as quantidades e salve a lista.`);
  }

  // Itens repetidos (mesmo material e mesma unidade) que "Organizar lista" pode juntar.
  const chaveJuncao = (i: ItemDemanda) => `${chaveMaterial(acharMaterial(i.descricao)?.nome ?? i.descricao)}|${normalizarUnidade(i.unidade)}`;
  const duplicados = itens.length - new Set(itens.map(chaveJuncao)).size;

  function organizar() {
    if (desabilitado || trava.current) return;
    const ordem: SituacaoItem[] = ['pendente', 'em_separacao', 'atendido'];
    const juntos = new Map<string, Linha>();
    for (const item of itens) {
      const k = chaveJuncao(item);
      const padrao = acharMaterial(item.descricao);
      const atual = juntos.get(k);
      if (!atual) {
        juntos.set(k, { ...item, descricao: padrao?.nome ?? item.descricao.trim(), categoria: padrao?.categoria ?? item.categoria, unidade: normalizarUnidade(item.unidade) });
        continue;
      }
      const a = Number(atual.quantidade.replace(',', '.'));
      const b = Number(item.quantidade.replace(',', '.'));
      juntos.set(k, {
        ...atual,
        quantidade: Number.isFinite(a) && Number.isFinite(b) ? String(Math.round((a + b) * 1000) / 1000) : atual.quantidade,
        preco_unitario_estimado: atual.preco_unitario_estimado.trim() || item.preco_unitario_estimado,
        // Fica na situação menos adiantada: só está embarcado se tudo estiver.
        situacao: ordem[Math.min(ordem.indexOf(atual.situacao), ordem.indexOf(item.situacao))],
        observacoes: [atual.observacoes.trim(), item.observacoes.trim()].filter(Boolean).join(' · ').slice(0, 2000),
      });
    }
    setItens(Array.from(juntos.values()));
    setAlterado(true);
    setAviso('Itens repetidos foram juntados. Confira e salve a lista.');
  }

  async function salvar() {
    if (!demandaId) return;
    if (desabilitado || trava.current || versao === null) return;
    if (!alterado) return;

    trava.current = true;
    setSalvando(true);
    setErro('');
    setAviso('');

    try {
      const novaVersao = await salvarItensDemanda(demandaId, versao, itens);
      setVersao(novaVersao);
      setAlterado(false);
      // EDA_DESPESA_DEMANDA_V1: a plataforma mantém a despesa da demanda no Financeiro e conta ao operador.
      let financeiro = '';
      try {
        const { data: despesa } = await supabase.from('financeiro').select('valor,status').eq('demanda_id', demandaId).eq('origem', 'demanda_auto').maybeSingle();
        if (despesa) {
          const centavos = BigInt(Math.round(Number(despesa.valor ?? 0) * 100));
          financeiro = ` A despesa desta demanda no Financeiro está em ${moeda(centavos)} (${String(despesa.status).toLowerCase() === 'pago' ? 'paga' : 'a pagar'}), atualizada pela plataforma.`;
        }
      } catch { /* o aviso do Financeiro é complementar */ }
      setAviso(`Lista salva com sucesso.${financeiro}`);
    } catch (falha) {
      setErro(falha instanceof Error ? falha.message : 'Falha ao salvar a lista.');
    } finally {
      trava.current = false;
      setSalvando(false);
    }
  }

  async function exportarPDF() {
    if (!demandaId || desabilitado || alterado || trava.current || versao === null) return;
    trava.current = true;
    setExportando(true);
    setErro('');
    setAviso('');
    try {
      const { exportarChecklistDemandaERN } = await import('@/lib/exportarChecklistDemandaERN');
      await exportarChecklistDemandaERN(demandaId, versao);
      setAviso('Checklist PDF Premium gerado com a lista salva.');
    } catch (falha) {
      setErro(falha instanceof Error ? falha.message : 'Não foi possível gerar o checklist PDF.');
    } finally {
      trava.current = false;
      setExportando(false);
    }
  }

  async function exportar() {
    if (!demandaId || desabilitado || alterado || trava.current) return;

    trava.current = true;
    setExportando(true);
    setErro('');
    setAviso('');

    try {
      await exportarMateriaisDemanda(demandaId);
      setAviso('Arquivo CSV gerado com a lista salva.');
    } catch (falha) {
      setErro(
        falha instanceof Error
          ? falha.message
          : 'Não foi possível exportar a lista.',
      );
    } finally {
      trava.current = false;
      setExportando(false);
    }
  }

  let total = BigInt(0);
  let semEstimativa = 0;
  for (const item of itens) {
    const valor = subtotal(item);
    if (valor === null) semEstimativa += 1;
    else total += valor;
  }

  const atendidos = itens.filter((item) => item.situacao === 'atendido').length;
  const pendentes = itens.filter((item) => item.situacao === 'pendente').length;
  const separacao = itens.filter((item) => item.situacao === 'em_separacao').length;
  const selecionados = itens.map((item, indice) => ({ item, indice })).filter(({ item }) =>
    filtroConferencia === 'todos' ||
    (filtroConferencia === 'nao_atendidos'
      ? item.situacao !== 'atendido'
      : item.situacao === filtroConferencia)
  );

  const grupos = (Object.keys(CATEGORIAS_ITEM) as CategoriaItem[])
    .map((categoria) => {
      const linhas = selecionados.filter(({ item }) => item.categoria === categoria);
      let soma = BigInt(0);
      for (const { item } of linhas) { const v = subtotal(item); if (v !== null) soma += v; }
      return { categoria, linhas, soma };
    })
    .filter((g) => g.linhas.length > 0);

  return (
    <section
      aria-label="Lista interna de suprimentos"
      aria-busy={carregando || salvando}
      className="rounded-2xl border border-[var(--ern-destaque)] bg-[var(--ern-painel)] p-4 sm:p-6"
    >
      <div className="flex flex-col gap-3 sm:flex-row sm:items-start sm:justify-between">
        <div>
          <p className="text-[10px] font-semibold uppercase tracking-[0.18em] text-[var(--ern-destaque)]">
            Planejamento da empresa
          </p>
          <h2 className="mt-2 text-2xl" style={{ fontFamily: 'var(--font-fraunces), serif' }}>
            Materiais da operação
          </h2>
          <p className="mt-2 max-w-xl text-xs leading-5 text-[var(--ern-secundario)]">
            Organize alimentação, limpeza, gelo, combustível e equipamentos.
            {demandaId
              ? ' Salve esta lista antes de mudar de página ou encerrar a demanda.'
              : ' Os materiais serão salvos junto com a nova demanda no botão final do formulário.'}
          </p>
        </div>
        <span className="self-start rounded-full border border-[var(--ern-borda)] px-3 py-1 text-xs">
          {!demandaId ? 'Nova lista · ainda não salva' : alterado ? 'Alterações não salvas' : 'Lista interna'}
        </span>
      </div>

      {carregando ? (
        <p role="status" className="mt-5 text-sm">Carregando materiais…</p>
      ) : versao !== null && (
        <>
          <div className="mt-5 grid grid-cols-2 gap-3">
            <div className="rounded-xl border border-[var(--ern-borda)] bg-[var(--ern-suave)] p-3">
              <p className="text-xs text-[var(--ern-secundario)]">Itens embarcados</p>
              <p className="mt-1 text-lg font-semibold">{atendidos} de {itens.length}</p>
            </div>
            <div className="min-w-0 rounded-xl border border-[var(--ern-destaque)] bg-[var(--ern-suave)] p-3">
              <p className="text-xs text-[var(--ern-secundario)]">Estimativa dos itens com preço</p>
              <p className="mt-1 break-words text-lg font-semibold text-[var(--ern-destaque)]">
                {itens.length > semEstimativa ? moeda(total) : 'Não informada'}
              </p>
            </div>
          </div>

          {semEstimativa > 0 && (
            <p className="mt-2 text-xs leading-5 text-[var(--ern-destaque)]">
              {semEstimativa} item(ns) sem estimativa válida. O valor acima é parcial.
            </p>
          )}

          <GraficoMateriaisDemanda
            itens={itens}
            previa={!demandaId || alterado}
          />

          {/* EDA_MATERIAIS_V2: adicionar pelo catálogo, kits prontos e lista enxuta por categoria. */}
          <section aria-label="Adicionar materiais" className="mt-5 rounded-2xl border border-[#E3A144]/25 bg-[var(--ern-suave)] p-4 sm:p-5">
            <p className="text-[10px] font-semibold uppercase tracking-[.17em] text-[var(--ern-destaque)]">Adicionar material</p>
            <div className="relative mt-3">
              <input
                value={busca}
                maxLength={200}
                disabled={desabilitado || itens.length >= 200}
                onChange={(event) => setBusca(event.target.value)}
                onKeyDown={(event) => {
                  if (event.key !== 'Enter') return;
                  event.preventDefault();
                  adicionarMaterial(sugestoes[0] ?? null, busca);
                }}
                placeholder="Digite o material: arroz, gelo, gasolina, colete…"
                aria-label="Buscar material no catálogo"
                className={campo}
              />
              {busca.trim().length > 0 && (
                <ul className="mt-2 flex flex-wrap gap-2" aria-label="Sugestões do catálogo">
                  {sugestoes.map((m) => (
                    <li key={m.nome}>
                      <button type="button" disabled={desabilitado} onClick={() => adicionarMaterial(m, m.nome)}
                        className="min-h-11 rounded-full border border-[var(--ern-destaque)] px-4 text-sm font-semibold text-[var(--ern-destaque)] hover:bg-[var(--ern-destaque)]/10 disabled:opacity-50">
                        {m.nome} <span className="font-normal opacity-70">· {m.unidade}</span>
                      </button>
                    </li>
                  ))}
                  {busca.trim().length >= 2 && !sugestoes.some((m) => chaveMaterial(m.nome) === chaveMaterial(busca)) && (
                    <li>
                      <button type="button" disabled={desabilitado} onClick={() => adicionarMaterial(null, busca)}
                        className="min-h-11 rounded-full border border-[var(--ern-borda)] px-4 text-sm text-[var(--ern-texto)] hover:bg-white/5 disabled:opacity-50">
                        Outro: “{busca.trim()}”
                      </button>
                    </li>
                  )}
                </ul>
              )}
            </div>
            <div className="mt-4 flex flex-wrap items-center gap-2" role="group" aria-label="Kits prontos">
              <span className="text-xs text-[var(--ern-secundario)]">Kits prontos:</span>
              {KITS_MATERIAIS.map((kit) => (
                <button key={kit.id} type="button" disabled={desabilitado} onClick={() => adicionarKit(kit.id)}
                  className="min-h-11 rounded-xl border border-[var(--ern-borda)] px-3 text-xs font-semibold text-[var(--ern-texto)] hover:border-[var(--ern-destaque)] disabled:opacity-50">
                  + {kit.nome}
                </button>
              ))}
            </div>
            <p className="mt-3 text-xs leading-5 text-[var(--ern-secundario)]">
              {pessoas && dias
                ? `Quantidades sugeridas para ${pessoas} ${pessoas === 1 ? 'pessoa' : 'pessoas'} em ${dias} ${dias === 1 ? 'dia' : 'dias'}, com 10% de margem. Ajuste o que precisar.`
                : 'Informe pessoas e dias na demanda para a quantidade já vir sugerida.'}
            </p>
          </section>

          <section aria-label="Lista de materiais" className="mt-5">
            <div className="flex flex-wrap items-center justify-between gap-2">
              <div className="flex flex-wrap items-center gap-2" role="group" aria-label="Filtrar materiais">
                {([
                  ['nao_atendidos', `Falta embarcar (${pendentes + separacao})`],
                  ['todos', `Todos (${itens.length})`],
                  ['pendente', `A comprar (${pendentes})`],
                  ['em_separacao', `Separado (${separacao})`],
                  ['atendido', `Embarcado (${atendidos})`],
                ] as const).map(([valor, nome]) => (
                  <button key={valor} type="button" aria-pressed={filtroConferencia === valor}
                    onClick={() => setFiltroConferencia(valor)}
                    className={`min-h-11 rounded-full border px-3 text-xs font-semibold focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[#E3A144] ${filtroConferencia === valor ? 'border-[var(--ern-destaque)] bg-[var(--ern-destaque)]/10 text-[var(--ern-destaque)]' : 'border-[var(--ern-borda)] text-[var(--ern-secundario)]'}`}>
                    {nome}
                  </button>
                ))}
              </div>
              {duplicados > 0 && (
                <button type="button" disabled={desabilitado} onClick={organizar}
                  className="min-h-11 rounded-xl border border-[var(--ern-destaque)] px-3 text-xs font-semibold text-[var(--ern-destaque)] disabled:opacity-50">
                  Organizar lista ({duplicados} {duplicados === 1 ? 'repetido' : 'repetidos'})
                </button>
              )}
            </div>

            {grupos.map(({ categoria, linhas, soma }) => (
              <div key={categoria} className="mt-5">
                <div className="flex items-baseline justify-between gap-3 border-b border-[var(--ern-borda)] pb-2">
                  <h3 className="text-sm font-semibold text-[var(--ern-destaque)]">{CATEGORIAS_ITEM[categoria]} <span className="font-normal text-[var(--ern-secundario)]">· {linhas.length}</span></h3>
                  <span className="text-xs tabular-nums text-[var(--ern-secundario)]">{soma > BigInt(0) ? moeda(soma) : 'sem preço'}</span>
                </div>
                <ul className="mt-2 space-y-2">
                  {linhas.map(({ item, indice }) => {
                    const valor = subtotal(item);
                    const aberto = abertoChave === item.chave;
                    const padrao = acharMaterial(item.descricao);
                    const sugerida = padrao ? quantidadeSugerida(padrao, pessoas, dias) : null;
                    const qtd = Number(item.quantidade.replace(',', '.'));
                    const exagero = sugerida !== null && sugerida > 0 && padrao !== null && normalizarUnidade(item.unidade) === padrao.unidade && Number.isFinite(qtd) && qtd > sugerida * 3;
                    const tomSituacao = item.situacao === 'atendido'
                      ? 'border-emerald-400/50 bg-emerald-400/15 text-emerald-200'
                      : item.situacao === 'em_separacao'
                        ? 'border-[#E3A144]/60 bg-[#E3A144]/15 text-[#F4C77E]'
                        : 'border-[var(--ern-borda)] text-[var(--ern-secundario)]';
                    return (
                      <li key={item.chave} className={`rounded-xl border bg-[var(--ern-fundo)] p-2.5 sm:p-3 ${item.chave === novaChave ? 'border-[var(--ern-destaque)]' : 'border-[var(--ern-borda)]'}`}>
                        <div className="flex flex-wrap items-center gap-2">
                          <button type="button" disabled={desabilitado}
                            onClick={() => editar(item.chave, { situacao: PROXIMA_SITUACAO[item.situacao] })}
                            aria-label={`${item.descricao || `Item ${indice + 1}`}: ${SITUACOES_ITEM[item.situacao]}. Toque para avançar.`}
                            title="Toque para avançar: A comprar → Separado → Embarcado"
                            className={`min-h-11 min-w-[104px] rounded-full border px-3 text-xs font-semibold disabled:opacity-50 ${tomSituacao}`}>
                            {SITUACOES_ITEM[item.situacao]}
                          </button>
                          <span className={`min-w-[8rem] flex-1 break-words text-sm font-semibold ${item.situacao === 'atendido' ? 'opacity-70' : ''}`}>
                            {item.descricao.trim() || 'Sem nome'}
                          </span>
                          <input
                            value={item.quantidade}
                            inputMode="decimal"
                            maxLength={16}
                            disabled={desabilitado}
                            aria-label={`Quantidade de ${item.descricao || `item ${indice + 1}`}`}
                            onChange={(event) => editar(item.chave, { quantidade: event.target.value })}
                            className={`${campoCompacto} w-20 text-right tabular-nums`}
                          />
                          <select
                            value={normalizarUnidade(item.unidade)}
                            disabled={desabilitado}
                            aria-label={`Unidade de ${item.descricao || `item ${indice + 1}`}`}
                            onChange={(event) => editar(item.chave, { unidade: event.target.value })}
                            className={`${campoCompacto} w-28`}
                          >
                            {opcoesUnidade(normalizarUnidade(item.unidade)).map((u) => <option key={u.value} value={u.value}>{u.label}</option>)}
                          </select>
                          <span className="w-24 text-right text-sm tabular-nums text-[var(--ern-destaque)]">{valor === null ? '—' : moeda(valor)}</span>
                          <button type="button" aria-expanded={aberto} onClick={() => setAbertoChave(aberto ? '' : item.chave)}
                            className="min-h-11 rounded-lg border border-[var(--ern-borda)] px-3 text-xs text-[var(--ern-secundario)] hover:text-[var(--ern-texto)]">
                            {aberto ? 'Fechar' : 'Detalhes'}
                          </button>
                        </div>
                        {exagero && (
                          <p role="status" className="mt-2 text-xs leading-5 text-[#F4C77E]">
                            Bem acima do sugerido (cerca de {sugerida} {padrao?.unidade}) para este grupo. Confira a quantidade.
                          </p>
                        )}
                        {aberto && (
                          <div className="mt-3 grid min-w-0 gap-3 border-t border-[var(--ern-borda)] pt-3 sm:grid-cols-2">
                            <label className="block min-w-0 text-xs sm:col-span-2">
                              <span className="mb-2 block">Produto ou material</span>
                              <input
                                value={item.descricao}
                                maxLength={200}
                                disabled={desabilitado}
                                onChange={(event) => editar(item.chave, { descricao: event.target.value })}
                                className={campo}
                              />
                            </label>
                            <SeletorERN
                              label="Categoria"
                              value={item.categoria}
                              options={categorias}
                              disabled={desabilitado}
                              onChange={(categoria) => editar(item.chave, { categoria: categoria as CategoriaItem })}
                            />
                            <label className="min-w-0 text-xs">
                              <span className="mb-2 block">Preço por unidade (R$) · opcional</span>
                              <input
                                value={item.preco_unitario_estimado}
                                inputMode="decimal"
                                maxLength={16}
                                disabled={desabilitado}
                                placeholder="Ex.: 12,50"
                                onChange={(event) => editar(item.chave, { preco_unitario_estimado: event.target.value })}
                                className={campo}
                              />
                            </label>
                            <label className="block text-xs sm:col-span-2">
                              <span className="mb-2 block">Observações · opcional</span>
                              <textarea
                                value={item.observacoes}
                                maxLength={2000}
                                rows={2}
                                disabled={desabilitado}
                                onChange={(event) => editar(item.chave, { observacoes: event.target.value })}
                                className={`${campo} resize-y py-3`}
                              />
                            </label>
                            <div className="sm:col-span-2">
                              <button
                                type="button"
                                disabled={desabilitado}
                                aria-label={`Remover ${item.descricao || `item ${indice + 1}`}`}
                                onClick={async () => {
                                  if (trava.current) return;
                                  if (!await confirmarERN('Remover este item da lista? A remoção será aplicada ao salvar a lista.')) return;
                                  setItens((atuais) => atuais.filter((linha) => linha.chave !== item.chave));
                                  setAlterado(true);
                                  setAviso('');
                                }}
                                className="min-h-11 rounded-xl px-3 text-xs text-[var(--ern-erro)] hover:bg-rose-400/10 disabled:opacity-50"
                              >
                                Remover da lista
                              </button>
                            </div>
                          </div>
                        )}
                      </li>
                    );
                  })}
                </ul>
              </div>
            ))}
          </section>

          {itens.length > 0 && selecionados.length === 0 && (
            <p className="mt-4 rounded-xl border border-dashed border-[var(--ern-borda)] p-5 text-sm text-[var(--ern-secundario)]">
              Nenhum material neste filtro. Escolha Todos para ver a lista completa.
            </p>
          )}
          {!itens.length && (
            <p className="mt-5 rounded-xl border border-dashed border-[var(--ern-borda)] p-4 text-sm text-[var(--ern-secundario)]">
              Esta demanda ainda não possui materiais. Use a busca ou um kit pronto acima.
            </p>
          )}
        </>
      )}

      {erro && (
        <div role="alert" className="mt-4 rounded-xl border border-rose-400/30 bg-rose-400/5 p-3 text-sm text-[var(--ern-erro)]">
          {erro}
        </div>
      )}

      {demandaId && versao !== null && (
        <div className="mt-4 border-t border-[var(--ern-borda)] pt-4">
          <button
            type="button"
            disabled={desabilitado || alterado}
            onClick={() => void exportar()}
            className="min-h-12 w-full rounded-xl border border-[var(--ern-destaque)] px-4 text-sm font-semibold text-[var(--ern-destaque)] disabled:opacity-50 sm:w-auto"
          >
            {exportando ? 'Gerando arquivo…' : 'Exportar materiais · CSV'}
          </button>
          <button
            type="button"
            disabled={desabilitado || alterado || itens.length === 0}
            onClick={() => void exportarPDF()}
            className="ml-0 mt-3 min-h-12 w-full rounded-xl border border-[var(--ern-destaque)] bg-[var(--ern-destaque)]/10 px-4 text-sm font-semibold text-[var(--ern-destaque)] disabled:opacity-50 sm:ml-3 sm:mt-0 sm:w-auto"
          >
            {exportando ? 'Gerando arquivo…' : 'Gerar checklist · PDF Premium'}
          </button>
          <p className="mt-2 text-xs leading-5 text-[var(--ern-secundario)]">
            {alterado
              ? 'Salve as alterações da lista antes de exportar.'
              : 'Exporta a versão salva, com quantidades, preços e situação de cada item.'}
          </p>
        </div>
      )}

      {demandaId && !carregando && !salvando && !exportando && (
        <button
          type="button"
          disabled={bloqueado}
          onClick={async () => {
            if (trava.current) return;
            if (alterado && !await confirmarERN('Recarregar e descartar as alterações não salvas da lista?')) return;
            setCarregando(true);
            setAviso('');
            setTentativa((atual) => atual + 1);
          }}
          className="mt-3 min-h-11 rounded-xl border border-[var(--ern-borda)] px-3 text-xs disabled:opacity-50"
        >
          Recarregar lista salva
        </button>
      )}

      {demandaId && versao !== null && (
        <div className="mt-5 flex justify-end border-t border-[var(--ern-borda)] pt-4">
          <button
            type="button"
            disabled={desabilitado || !alterado}
            onClick={() => void salvar()}
            className="min-h-12 w-full rounded-xl bg-[var(--ern-botao)] px-6 text-sm font-semibold text-[var(--ern-sobre-botao)] disabled:opacity-50 sm:w-auto"
          >
            {salvando ? 'Salvando lista…' : 'Salvar lista'}
          </button>
        </div>
      )}

      {aviso && <p role="status" className="mt-3 text-sm text-[var(--ern-sucesso)]">{aviso}</p>}

      {bloqueado && (
        <p className="mt-3 text-xs leading-5 text-[var(--ern-secundario)]">
          A edição da lista está bloqueada enquanto outra operação está em andamento
          ou quando a demanda está encerrada ou cancelada.
        </p>
      )}
    </section>
  );
}
