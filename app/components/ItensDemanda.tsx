'use client';

import { useEffect, useRef, useState } from 'react';
import SeletorERN from './SeletorERN';
import { confirmarERN } from '@/lib/confirmarERN';
import {
  CATEGORIAS_ITEM,
  SITUACOES_ITEM,
  carregarItensDemanda,
  salvarItensDemanda,
  novoItemDemanda,
  numeroItem,
  type ItemDemanda,
  type CategoriaItem,
  type SituacaoItem,
} from '@/lib/itensDemanda';

type Linha = ItemDemanda & { chave: string };

type Props = {
  demandaId: string;
  bloqueado: boolean;
};

const campo =
  'min-h-12 w-full min-w-0 rounded-xl border border-white/15 bg-[#07110E] px-3 text-base text-[#EDEDE3] outline-none focus:ring-2 focus:ring-[#F4C77E] disabled:opacity-50 sm:text-sm';

const categorias = Object.entries(CATEGORIAS_ITEM).map(([value, label]) => ({
  value, label,
}));

const situacoes = Object.entries(SITUACOES_ITEM).map(([value, label]) => ({
  value, label,
}));

// Quantidade em milésimos e preço em centavos.
// O arredondamento ocorre por item, como no banco.
function subtotal(item: ItemDemanda): bigint | null {
  const quantidade = numeroItem(item.quantidade, 3);
  const preco = numeroItem(item.preco_unitario_estimado, 2);

  if (
    quantidade === null || quantidade <= 0 ||
    quantidade > 999999999.999 ||
    preco === null || preco > 9999999999.99
  ) return null;

  const mil = BigInt(quantidade.toFixed(3).replace('.', ''));
  const centavos = BigInt(preco.toFixed(2).replace('.', ''));
  return (mil * centavos + BigInt(500)) / BigInt(1000);
}

function moeda(centavos: bigint) {
  const inteiro = (centavos / BigInt(100)).toString();
  const decimal = (centavos % BigInt(100)).toString().padStart(2, '0');
  return `R$ ${inteiro.replace(/\B(?=(\d{3})+(?!\d))/g, '.')},${decimal}`;
}

export default function ItensDemanda({ demandaId, bloqueado }: Props) {
  const [itens, setItens] = useState<Linha[]>([]);
  const [versao, setVersao] = useState<number | null>(null);
  const [carregando, setCarregando] = useState(true);
  const [salvando, setSalvando] = useState(false);
  const [alterado, setAlterado] = useState(false);
  const [erro, setErro] = useState('');
  const [aviso, setAviso] = useState('');
  const [tentativa, setTentativa] = useState(0);
  const trava = useRef(false);

  useEffect(() => {
    const controller = new AbortController();
    let ativo = true;

    async function carregar() {
      try {
        const resultado = await carregarItensDemanda(
          demandaId,
          controller.signal,
        );

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

  const desabilitado = bloqueado || carregando || salvando || versao === null;

  function editar(chave: string, valores: Partial<ItemDemanda>) {
    if (desabilitado || trava.current) return;
    setItens((atuais) => atuais.map((item) =>
      item.chave === chave ? { ...item, ...valores } : item,
    ));
    setAlterado(true);
    setAviso('');
  }

  async function salvar() {
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
      setAviso('Lista salva com sucesso.');
    } catch (falha) {
      setErro(falha instanceof Error ? falha.message : 'Falha ao salvar a lista.');
    } finally {
      trava.current = false;
      setSalvando(false);
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

  return (
    <section
      aria-label="Lista interna de suprimentos"
      aria-busy={carregando || salvando}
      className="rounded-2xl border border-[#E3A144]/25 bg-[#0A1713] p-4 sm:p-6"
    >
      <div className="flex flex-col gap-3 sm:flex-row sm:items-start sm:justify-between">
        <div>
          <p className="text-[10px] font-semibold uppercase tracking-[0.18em] text-[#F4C77E]">
            Planejamento da empresa
          </p>
          <h2 className="mt-2 text-2xl" style={{ fontFamily: 'var(--font-fraunces), serif' }}>
            Materiais da operação
          </h2>
          <p className="mt-2 max-w-xl text-xs leading-5 text-[#B4C8BB]">
            Organize alimentação, limpeza, gelo, combustível e equipamentos.
            Salve esta lista antes de mudar de página ou encerrar a demanda.
          </p>
        </div>
        <span className="self-start rounded-full border border-white/15 px-3 py-1 text-xs">
          {alterado ? 'Alterações não salvas' : 'Lista interna'}
        </span>
      </div>

      {carregando ? (
        <p role="status" className="mt-5 text-sm">Carregando materiais…</p>
      ) : versao !== null && (
        <>
          <div className="mt-5 grid grid-cols-2 gap-3">
            <div className="rounded-xl border border-white/10 bg-white/[0.03] p-3">
              <p className="text-xs text-[#B4C8BB]">Itens atendidos</p>
              <p className="mt-1 text-lg font-semibold">{atendidos} de {itens.length}</p>
            </div>
            <div className="min-w-0 rounded-xl border border-[#E3A144]/20 bg-[#E3A144]/5 p-3">
              <p className="text-xs text-[#B4C8BB]">Estimativa dos itens com preço</p>
              <p className="mt-1 break-words text-lg font-semibold text-[#F4C77E]">
                {itens.length > semEstimativa ? moeda(total) : 'Não informada'}
              </p>
            </div>
          </div>

          {semEstimativa > 0 && (
            <p className="mt-2 text-xs leading-5 text-amber-200">
              {semEstimativa} item(ns) sem estimativa válida. O valor acima é parcial.
            </p>
          )}

          <div className="mt-5 space-y-3">
            {itens.map((item, indice) => {
              const valor = subtotal(item);
              return (
                <article key={item.chave} className="rounded-2xl border border-white/10 bg-[#07110E]/40 p-3 sm:p-4">
                  <div className="mb-3 flex items-center justify-between gap-3">
                    <h3 className="text-sm font-semibold text-[#F4C77E]">Item {indice + 1}</h3>
                    <button
                      type="button"
                      disabled={desabilitado}
                      aria-label={`Remover item ${indice + 1}: ${item.descricao || 'sem descrição'}`}
                      onClick={async () => {
                        if (trava.current) return;
                        if (!await confirmarERN('Remover este item da lista? A remoção será aplicada ao salvar a lista.')) return;
                        setItens((atuais) => atuais.filter((linha) => linha.chave !== item.chave));
                        setAlterado(true);
                        setAviso('');
                      }}
                      className="min-h-11 rounded-xl px-3 text-xs text-rose-200 hover:bg-rose-400/10 disabled:opacity-50"
                    >
                      Remover
                    </button>
                  </div>

                  <div className="grid min-w-0 gap-3 sm:grid-cols-2">
                    <label className="block min-w-0 text-xs sm:col-span-2">
                      <span className="mb-2 block">Produto ou material</span>
                      <input
                        value={item.descricao}
                        maxLength={200}
                        disabled={desabilitado}
                        onChange={(event) => editar(item.chave, { descricao: event.target.value })}
                        placeholder="Ex.: gelo — saco de 5 kg"
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

                    <SeletorERN
                      label="Situação do item"
                      value={item.situacao}
                      options={situacoes}
                      disabled={desabilitado}
                      onChange={(situacao) => editar(item.chave, { situacao: situacao as SituacaoItem })}
                    />

                    <div className="grid grid-cols-2 gap-3">
                      <label className="min-w-0 text-xs">
                        <span className="mb-2 block">Quantidade</span>
                        <input
                          value={item.quantidade}
                          inputMode="decimal"
                          maxLength={16}
                          disabled={desabilitado}
                          onChange={(event) => editar(item.chave, { quantidade: event.target.value })}
                          className={campo}
                        />
                      </label>
                      <label className="min-w-0 text-xs">
                        <span className="mb-2 block">Unidade</span>
                        <input
                          value={item.unidade}
                          maxLength={40}
                          disabled={desabilitado}
                          placeholder="kg, litro, saco..."
                          onChange={(event) => editar(item.chave, { unidade: event.target.value })}
                          className={campo}
                        />
                      </label>
                    </div>

                    <label className="min-w-0 text-xs">
                      <span className="mb-2 block">Preço por unidade (R$) · opcional</span>
                      <input
                        value={item.preco_unitario_estimado}
                        inputMode="decimal"
                        maxLength={16}
                        disabled={desabilitado}
                        placeholder="Ex.: 12,50 — sem separador de milhar"
                        onChange={(event) => editar(item.chave, { preco_unitario_estimado: event.target.value })}
                        className={campo}
                      />
                    </label>

                    <label className="block text-xs sm:col-span-2">
                      <span className="mb-2 block">Observações do item · opcional</span>
                      <textarea
                        value={item.observacoes}
                        maxLength={2000}
                        rows={2}
                        disabled={desabilitado}
                        onChange={(event) => editar(item.chave, { observacoes: event.target.value })}
                        className={`${campo} resize-y py-3`}
                      />
                    </label>
                  </div>

                  <p className="mt-3 text-right text-sm">
                    Total estimado: <strong className="text-[#F4C77E]">
                      {valor === null ? 'Não informado ou inválido' : moeda(valor)}
                    </strong>
                  </p>
                </article>
              );
            })}
          </div>

          {!itens.length && (
            <p className="mt-5 rounded-xl border border-dashed border-white/15 p-4 text-sm text-[#B4C8BB]">
              Esta demanda ainda não possui materiais na lista.
            </p>
          )}

          <div className="mt-4 grid gap-3 sm:flex sm:flex-wrap">
            <button
              type="button"
              disabled={desabilitado || itens.length >= 200}
              onClick={async () => {
                if (trava.current) return;
                setItens((atuais) => [
                  ...atuais,
                  { ...novoItemDemanda(), chave: crypto.randomUUID() },
                ]);
                setAlterado(true);
                setAviso('');
              }}
              className="min-h-12 rounded-xl border border-[#E3A144]/40 px-4 text-sm font-semibold text-[#F4C77E] disabled:opacity-50"
            >
              + Adicionar material
            </button>
            <button
              type="button"
              disabled={desabilitado || !alterado}
              onClick={() => void salvar()}
              className="min-h-12 rounded-xl bg-[#E3A144] px-5 text-sm font-semibold text-[#07110E] disabled:opacity-50"
            >
              {salvando ? 'Salvando lista…' : 'Salvar lista'}
            </button>
          </div>
        </>
      )}

      {erro && (
        <div role="alert" className="mt-4 rounded-xl border border-rose-400/30 bg-rose-400/5 p-3 text-sm text-rose-200">
          {erro}
        </div>
      )}

      {!carregando && !salvando && (
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
          className="mt-3 min-h-11 rounded-xl border border-white/15 px-3 text-xs disabled:opacity-50"
        >
          Recarregar lista salva
        </button>
      )}

      {aviso && <p role="status" className="mt-3 text-sm text-emerald-200">{aviso}</p>}

      {bloqueado && (
        <p className="mt-3 text-xs leading-5 text-[#B4C8BB]">
          A edição da lista está bloqueada enquanto outra operação está em andamento
          ou quando a demanda está encerrada ou cancelada.
        </p>
      )}
    </section>
  );
}