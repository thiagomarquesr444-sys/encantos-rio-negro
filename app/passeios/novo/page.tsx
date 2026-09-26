'use client';

import React, {
  useEffect,
  useState,
} from 'react';

import Link from 'next/link';
import { useRouter } from 'next/navigation';

import { supabase } from '@/lib/supabase';

type Mensagem = {
  tipo: 'sucesso' | 'erro';
  texto: string;
};

type UsoPasseios = {
  plano_codigo: string;
  plano_nome: string;
  total_passeios: number;
  limite_passeios: number | null;
  ilimitado: boolean;
  percentual_uso: number | null;
};

type PasseioForm = {
  nome: string;
  descricao: string;
  cidade: string;
  duracao: string;
  valor: string;
  vagas: string;
  categoria: string;
  foto_url: string;
  destaque: boolean;
  situacao: string;
};

function converterValor(valor: string) {
  let texto = valor
    .trim()
    .replace(/[^\d,.-]/g, '');

  if (!texto) {
    return 0;
  }

  if (
    texto.includes('.') &&
    texto.includes(',')
  ) {
    texto = texto
      .replace(/\./g, '')
      .replace(',', '.');
  } else if (texto.includes(',')) {
    texto = texto.replace(',', '.');
  }

  const numero =
    Number.parseFloat(texto);

  return Number.isFinite(numero)
    ? numero
    : 0;
}

export default function NovoPasseioPage() {
  const router = useRouter();

  const estadoInicial: PasseioForm = {
    nome: '',
    descricao: '',
    cidade: 'Barcelos - AM',
    duracao: '',
    valor: '',
    vagas: '',
    categoria: 'Ecoturismo',
    foto_url: '',
    destaque: false,
    situacao: 'Ativo',
  };

  const [formData, setFormData] =
    useState<PasseioForm>(
      estadoInicial
    );

  const [salvando, setSalvando] =
    useState(false);

  const [
    carregandoUso,
    setCarregandoUso,
  ] = useState(true);

  const [uso, setUso] =
    useState<UsoPasseios | null>(
      null
    );

  const [mensagem, setMensagem] =
    useState<Mensagem | null>(
      null
    );

  /*
    ============================================================
    USO DO PLANO
    ============================================================
  */

  useEffect(() => {
    carregarUsoPasseios();
  }, []);

  async function carregarUsoPasseios() {
    setCarregandoUso(true);

    try {
      const { data, error } =
        await supabase.rpc(
          'get_meu_uso_passeios'
        );

      if (error) {
        throw error;
      }

      const resultado =
        Array.isArray(data)
          ? data[0]
          : data;

      if (!resultado) {
        setUso(null);
        return;
      }

      setUso({
        plano_codigo:
          resultado.plano_codigo,

        plano_nome:
          resultado.plano_nome,

        total_passeios:
          Number(
            resultado.total_passeios ||
              0
          ),

        limite_passeios:
          resultado.limite_passeios ===
          null
            ? null
            : Number(
                resultado.limite_passeios
              ),

        ilimitado:
          Boolean(
            resultado.ilimitado
          ),

        percentual_uso:
          resultado.percentual_uso ===
          null
            ? null
            : Number(
                resultado.percentual_uso
              ),
      });
    } catch (error) {
      console.error(
        'Erro ao consultar uso de passeios:',
        error
      );
    } finally {
      setCarregandoUso(false);
    }
  }

  /*
    ============================================================
    LIMITE
    ============================================================
  */

  const limiteAtingido =
    !!uso &&
    !uso.ilimitado &&
    uso.limite_passeios !== null &&
    uso.total_passeios >=
      uso.limite_passeios;

  const percentualVisual =
    uso?.percentual_uso === null ||
    uso?.percentual_uso === undefined
      ? 0
      : Math.min(
          100,
          Math.max(
            0,
            uso.percentual_uso
          )
        );

  /*
    ============================================================
    FORMULÁRIO
    ============================================================
  */

  const handleChange = (
    e: React.ChangeEvent<
      | HTMLInputElement
      | HTMLTextAreaElement
      | HTMLSelectElement
    >
  ) => {
    const {
      name,
      value,
      type,
    } = e.target;

    if (type === 'checkbox') {
      const { checked } =
        e.target as HTMLInputElement;

      setFormData((prev) => ({
        ...prev,
        [name]: checked,
      }));

      return;
    }

    setFormData((prev) => ({
      ...prev,
      [name]: value,
    }));
  };

  const handleLimpar = () => {
    setFormData(estadoInicial);
    setMensagem(null);
  };

  const handleCancelar = () => {
    router.push('/passeios');
  };

  /*
    ============================================================
    SALVAR
    ============================================================
  */

  const handleSubmit = async (
    e: React.FormEvent
  ) => {
    e.preventDefault();

    setMensagem(null);

    if (limiteAtingido) {
      setMensagem({
        tipo: 'erro',
        texto:
          'O limite de passeios do seu plano foi atingido.',
      });

      return;
    }

    if (
      !formData.nome.trim() ||
      !formData.duracao.trim() ||
      !formData.valor.trim() ||
      !formData.descricao.trim() ||
      !formData.cidade.trim()
    ) {
      setMensagem({
        tipo: 'erro',
        texto:
          'Preencha os campos obrigatórios: Nome, Cidade, Duração, Valor e Descrição.',
      });

      return;
    }

    const valorTratado =
      converterValor(
        formData.valor
      );

    if (valorTratado < 0) {
      setMensagem({
        tipo: 'erro',
        texto:
          'Informe um valor válido para o passeio.',
      });

      return;
    }

    const vagasTratadas =
      formData.vagas.trim()
        ? Number.parseInt(
            formData.vagas,
            10
          )
        : 0;

    if (
      !Number.isFinite(vagasTratadas) ||
      vagasTratadas < 0
    ) {
      setMensagem({
        tipo: 'erro',
        texto:
          'Informe uma quantidade válida de vagas.',
      });

      return;
    }

    setSalvando(true);

    try {
      const { error } =
        await supabase
          .from('passeios')
          .insert([
            {
              nome:
                formData.nome.trim(),

              descricao:
                formData.descricao.trim(),

              cidade:
                formData.cidade.trim(),

              duracao:
                formData.duracao.trim(),

              /*
                O banco ainda possui valor e preco.
                Enquanto a estrutura não for unificada,
                os dois recebem exatamente o mesmo valor.
              */
              valor:
                valorTratado,

              preco:
                valorTratado,

              vagas:
                vagasTratadas,

              categoria:
                formData.categoria,

              foto_url:
                formData.foto_url.trim() ||
                null,

              destaque:
                formData.destaque,

              situacao:
                formData.situacao,
            },
          ]);

      if (error) {
        throw error;
      }

      await carregarUsoPasseios();

      setMensagem({
        tipo: 'sucesso',
        texto:
          'Passeio cadastrado com sucesso. Redirecionando...',
      });

      setTimeout(() => {
        router.push('/passeios');
        router.refresh();
      }, 1200);
    } catch (err: any) {
      console.error(
        'Erro ao cadastrar passeio:',
        err
      );

      const mensagemErro =
        String(
          err?.message || ''
        );

      if (
        mensagemErro.includes(
          'ERN_LIMITE_PASSEIOS_ATINGIDO'
        )
      ) {
        setMensagem({
          tipo: 'erro',
          texto:
            'O limite de passeios do seu plano foi atingido. Para cadastrar uma nova experiência, será necessário ampliar o plano.',
        });

        await carregarUsoPasseios();

        return;
      }

      if (
        mensagemErro.includes(
          'ERN_ASSINATURA_NAO_ENCONTRADA'
        )
      ) {
        setMensagem({
          tipo: 'erro',
          texto:
            'Não foi encontrada uma assinatura ativa para esta empresa.',
        });

        return;
      }

      if (
        mensagemErro.includes(
          'ERN_USUARIO_SEM_EMPRESA'
        )
      ) {
        setMensagem({
          tipo: 'erro',
          texto:
            'Seu usuário não possui uma empresa vinculada.',
        });

        return;
      }

      setMensagem({
        tipo: 'erro',
        texto:
          err?.message ||
          'Não foi possível cadastrar o passeio.',
      });
    } finally {
      setSalvando(false);
    }
  };

  return (
    <div className="min-h-screen bg-[#07110E] pb-16 text-[#EDEDE3]">
      {/* =====================================================
          CABEÇALHO
      ====================================================== */}

      <section className="border-b border-white/[0.07] bg-[#091510] px-5 py-10 md:px-8 md:py-12">
        <div className="mx-auto max-w-[1180px]">
          <div className="flex flex-col gap-6 sm:flex-row sm:items-end sm:justify-between">
            <div>
              <div className="flex items-center gap-3">
                <span className="h-px w-8 bg-[#E3A144]" />

                <span className="text-[10px] font-semibold uppercase tracking-[0.2em] text-[#E3A144]">
                  Passeios
                </span>
              </div>

              <h1
                className="mt-4 text-3xl text-[#F0F0E8] md:text-4xl"
                style={{
                  fontFamily:
                    'var(--font-fraunces), serif',
                }}
              >
                Novo passeio
              </h1>

              <p className="mt-3 max-w-[620px] text-sm leading-6 text-[#EDEDE3]/42">
                Cadastre experiências,
                roteiros e operações que
                poderão ser utilizadas nas
                reservas da empresa.
              </p>
            </div>

            <Link
              href="/passeios"
              className="inline-flex min-h-[44px] items-center justify-center rounded-xl border border-white/[0.09] bg-white/[0.025] px-5 text-sm font-semibold text-[#EDEDE3]/65 transition hover:bg-white/[0.05]"
            >
              ← Voltar para passeios
            </Link>
          </div>
        </div>
      </section>

      <main className="mx-auto max-w-[1180px] px-5 py-8 md:px-8 md:py-10">
        {/* ===================================================
            USO DO PLANO
        ==================================================== */}

        <section className="mb-6 rounded-[22px] border border-white/[0.075] bg-[#0A1713] p-5 md:p-6">
          <div className="flex flex-col gap-5 md:flex-row md:items-center md:justify-between">
            <div>
              <div className="flex flex-wrap items-center gap-3">
                <p className="text-[9px] font-semibold uppercase tracking-[0.18em] text-[#E3A144]">
                  Uso do plano
                </p>

                {!carregandoUso &&
                  uso && (
                    <span className="rounded-full border border-white/[0.07] bg-white/[0.025] px-2.5 py-1 text-[9px] font-semibold uppercase tracking-[0.12em] text-[#EDEDE3]/38">
                      {uso.plano_nome}
                    </span>
                  )}
              </div>

              <h2
                className="mt-3 text-2xl text-[#F0F0E8]"
                style={{
                  fontFamily:
                    'var(--font-fraunces), serif',
                }}
              >
                {carregandoUso
                  ? 'Consultando limite...'
                  : uso?.ilimitado
                    ? `${uso.total_passeios} passeios cadastrados`
                    : `${uso?.total_passeios ?? 0} de ${uso?.limite_passeios ?? 0} passeios`}
              </h2>

              <p className="mt-2 text-xs leading-5 text-[#EDEDE3]/32">
                {uso?.ilimitado
                  ? 'Seu plano não possui limite numérico de passeios.'
                  : limiteAtingido
                    ? 'O limite de experiências do plano atual foi atingido.'
                    : 'Cada experiência cadastrada utiliza uma vaga do limite contratado.'}
              </p>
            </div>

            {!carregandoUso &&
              uso &&
              !uso.ilimitado && (
                <div className="w-full max-w-[300px]">
                  <div className="flex items-center justify-between text-[10px] text-[#EDEDE3]/35">
                    <span>
                      {uso.total_passeios}
                    </span>

                    <span>
                      {uso.limite_passeios}
                    </span>
                  </div>

                  <div className="mt-2 h-2 overflow-hidden rounded-full bg-white/[0.055]">
                    <div
                      className={`h-full rounded-full transition-all ${
                        limiteAtingido
                          ? 'bg-red-400'
                          : percentualVisual >=
                              80
                            ? 'bg-[#E3A144]'
                            : 'bg-emerald-400'
                      }`}
                      style={{
                        width: `${percentualVisual}%`,
                      }}
                    />
                  </div>

                  <p className="mt-2 text-right text-[10px] text-[#EDEDE3]/25">
                    {percentualVisual.toFixed(
                      1
                    )}
                    % utilizado
                  </p>
                </div>
              )}
          </div>
        </section>

        {/* ===================================================
            LIMITE
        ==================================================== */}

        {limiteAtingido && (
          <div className="mb-6 rounded-[20px] border border-[#E3A144]/20 bg-[#E3A144]/[0.055] p-5">
            <p className="text-[10px] font-bold uppercase tracking-[0.17em] text-[#F4C77E]">
              Limite atingido
            </p>

            <h2
              className="mt-2 text-xl text-[#F0F0E8]"
              style={{
                fontFamily:
                  'var(--font-fraunces), serif',
              }}
            >
              Novos passeios estão bloqueados.
            </h2>

            <p className="mt-2 text-xs leading-6 text-[#EDEDE3]/40">
              Os passeios existentes continuam
              disponíveis normalmente. Para
              cadastrar novas experiências será
              necessário ampliar o limite do
              plano.
            </p>
          </div>
        )}

        {/* ===================================================
            FEEDBACK
        ==================================================== */}

        {mensagem && (
          <div
            className={`mb-6 rounded-[18px] border px-5 py-4 text-sm ${
              mensagem.tipo === 'sucesso'
                ? 'border-emerald-400/20 bg-emerald-400/[0.07] text-emerald-200'
                : 'border-red-400/20 bg-red-400/[0.07] text-red-200'
            }`}
          >
            {mensagem.texto}
          </div>
        )}

        {/* ===================================================
            FORMULÁRIO
        ==================================================== */}

        <form
          onSubmit={handleSubmit}
          className="overflow-hidden rounded-[26px] border border-white/[0.075] bg-[#0A1713]"
        >
          <div className="border-b border-white/[0.06] px-5 py-5 md:px-6">
            <p className="text-[9px] font-semibold uppercase tracking-[0.18em] text-[#7C9C87]">
              Catálogo
            </p>

            <h2
              className="mt-2 text-2xl text-[#F0F0E8]"
              style={{
                fontFamily:
                  'var(--font-fraunces), serif',
              }}
            >
              Dados da experiência
            </h2>
          </div>

          <div className="grid gap-6 p-5 md:grid-cols-2 md:p-6">
            <div>
              <label className="mb-2 block text-[10px] font-semibold uppercase tracking-[0.13em] text-[#EDEDE3]/42">
                Nome do passeio *
              </label>

              <input
                type="text"
                name="nome"
                value={formData.nome}
                onChange={handleChange}
                disabled={
                  salvando ||
                  limiteAtingido
                }
                className="min-h-[48px] w-full rounded-xl border border-white/[0.08] bg-[#07110E] px-4 text-sm text-[#F0F0E8] outline-none transition focus:border-[#E3A144]/45 disabled:cursor-not-allowed disabled:opacity-45"
              />
            </div>

            <div>
              <label className="mb-2 block text-[10px] font-semibold uppercase tracking-[0.13em] text-[#EDEDE3]/42">
                Categoria *
              </label>

              <select
                name="categoria"
                value={formData.categoria}
                onChange={handleChange}
                disabled={
                  salvando ||
                  limiteAtingido
                }
                className="min-h-[48px] w-full rounded-xl border border-white/[0.08] bg-[#07110E] px-4 text-sm text-[#F0F0E8] outline-none focus:border-[#E3A144]/45 disabled:opacity-45"
              >
                <option value="Ecoturismo">
                  Ecoturismo
                </option>

                <option value="Passeios Fluviais">
                  Passeios Fluviais
                </option>

                <option value="Pesca Esportiva">
                  Pesca Esportiva
                </option>

                <option value="Imersão Cultural">
                  Imersão Cultural
                </option>
              </select>
            </div>

            <div>
              <label className="mb-2 block text-[10px] font-semibold uppercase tracking-[0.13em] text-[#EDEDE3]/42">
                Cidade / Destino *
              </label>

              <input
                type="text"
                name="cidade"
                value={formData.cidade}
                onChange={handleChange}
                disabled={
                  salvando ||
                  limiteAtingido
                }
                className="min-h-[48px] w-full rounded-xl border border-white/[0.08] bg-[#07110E] px-4 text-sm text-[#F0F0E8] outline-none focus:border-[#E3A144]/45 disabled:opacity-45"
              />
            </div>

            <div>
              <label className="mb-2 block text-[10px] font-semibold uppercase tracking-[0.13em] text-[#EDEDE3]/42">
                Duração *
              </label>

              <input
                type="text"
                name="duracao"
                value={formData.duracao}
                onChange={handleChange}
                placeholder="Ex.: 4 horas, 1 dia, 3 dias"
                disabled={
                  salvando ||
                  limiteAtingido
                }
                className="min-h-[48px] w-full rounded-xl border border-white/[0.08] bg-[#07110E] px-4 text-sm text-[#F0F0E8] outline-none placeholder:text-[#EDEDE3]/18 focus:border-[#E3A144]/45 disabled:opacity-45"
              />
            </div>

            <div>
              <label className="mb-2 block text-[10px] font-semibold uppercase tracking-[0.13em] text-[#EDEDE3]/42">
                Preço (R$) *
              </label>

              <input
                type="text"
                inputMode="decimal"
                name="valor"
                value={formData.valor}
                onChange={handleChange}
                placeholder="Ex.: 3500 ou 3.500,00"
                disabled={
                  salvando ||
                  limiteAtingido
                }
                className="min-h-[48px] w-full rounded-xl border border-white/[0.08] bg-[#07110E] px-4 text-sm text-[#F0F0E8] outline-none placeholder:text-[#EDEDE3]/18 focus:border-[#E3A144]/45 disabled:opacity-45"
              />
            </div>

            <div>
              <label className="mb-2 block text-[10px] font-semibold uppercase tracking-[0.13em] text-[#EDEDE3]/42">
                Vagas
              </label>

              <input
                type="number"
                min="0"
                step="1"
                name="vagas"
                value={formData.vagas}
                onChange={handleChange}
                placeholder="0"
                disabled={
                  salvando ||
                  limiteAtingido
                }
                className="min-h-[48px] w-full rounded-xl border border-white/[0.08] bg-[#07110E] px-4 text-sm text-[#F0F0E8] outline-none placeholder:text-[#EDEDE3]/18 focus:border-[#E3A144]/45 disabled:opacity-45"
              />
            </div>

            <div>
              <label className="mb-2 block text-[10px] font-semibold uppercase tracking-[0.13em] text-[#EDEDE3]/42">
                Situação
              </label>

              <select
                name="situacao"
                value={formData.situacao}
                onChange={handleChange}
                disabled={
                  salvando ||
                  limiteAtingido
                }
                className="min-h-[48px] w-full rounded-xl border border-white/[0.08] bg-[#07110E] px-4 text-sm text-[#F0F0E8] outline-none focus:border-[#E3A144]/45 disabled:opacity-45"
              >
                <option value="Ativo">
                  Ativo
                </option>

                <option value="Inativo">
                  Inativo
                </option>

                <option value="Em Breve">
                  Em Breve
                </option>
              </select>
            </div>

            <div className="flex min-h-[48px] items-center rounded-xl border border-white/[0.08] bg-[#07110E] px-4">
              <input
                type="checkbox"
                id="destaque"
                name="destaque"
                checked={formData.destaque}
                onChange={handleChange}
                disabled={
                  salvando ||
                  limiteAtingido
                }
                className="h-4 w-4"
              />

              <label
                htmlFor="destaque"
                className="ml-3 text-sm text-[#EDEDE3]/60"
              >
                Marcar como destaque
              </label>
            </div>

            <div className="md:col-span-2">
              <label className="mb-2 block text-[10px] font-semibold uppercase tracking-[0.13em] text-[#EDEDE3]/42">
                URL da foto
              </label>

              <input
                type="url"
                name="foto_url"
                value={formData.foto_url}
                onChange={handleChange}
                placeholder="URL da imagem cadastrada para a experiência"
                disabled={
                  salvando ||
                  limiteAtingido
                }
                className="min-h-[48px] w-full rounded-xl border border-white/[0.08] bg-[#07110E] px-4 text-sm text-[#F0F0E8] outline-none placeholder:text-[#EDEDE3]/18 focus:border-[#E3A144]/45 disabled:opacity-45"
              />
            </div>

            <div className="md:col-span-2">
              <label className="mb-2 block text-[10px] font-semibold uppercase tracking-[0.13em] text-[#EDEDE3]/42">
                Descrição *
              </label>

              <textarea
                name="descricao"
                rows={5}
                value={formData.descricao}
                onChange={handleChange}
                disabled={
                  salvando ||
                  limiteAtingido
                }
                placeholder="Descrição completa da experiência, operação e principais características..."
                className="w-full resize-none rounded-xl border border-white/[0.08] bg-[#07110E] px-4 py-3 text-sm leading-6 text-[#F0F0E8] outline-none placeholder:text-[#EDEDE3]/18 focus:border-[#E3A144]/45 disabled:opacity-45"
              />
            </div>
          </div>

          <div className="flex flex-col-reverse gap-3 border-t border-white/[0.06] px-5 py-5 sm:flex-row sm:justify-end md:px-6">
            <button
              type="button"
              onClick={handleCancelar}
              disabled={salvando}
              className="min-h-[46px] rounded-xl border border-white/[0.09] bg-white/[0.02] px-5 text-sm font-semibold text-[#EDEDE3]/55 transition hover:bg-white/[0.045] disabled:opacity-40"
            >
              Cancelar
            </button>

            <button
              type="button"
              onClick={handleLimpar}
              disabled={
                salvando ||
                limiteAtingido
              }
              className="min-h-[46px] rounded-xl border border-white/[0.09] bg-white/[0.02] px-5 text-sm font-semibold text-[#EDEDE3]/55 transition hover:bg-white/[0.045] disabled:opacity-40"
            >
              Limpar
            </button>

            <button
              type="submit"
              disabled={
                salvando ||
                carregandoUso ||
                limiteAtingido
              }
              className="min-h-[46px] rounded-xl bg-[#E3A144] px-6 text-sm font-bold text-[#07130F] transition hover:bg-[#F0B35C] disabled:cursor-not-allowed disabled:opacity-45"
            >
              {salvando
                ? 'Salvando...'
                : limiteAtingido
                  ? 'Limite atingido'
                  : 'Cadastrar passeio'}
            </button>
          </div>
        </form>
      </main>
    </div>
  );
}