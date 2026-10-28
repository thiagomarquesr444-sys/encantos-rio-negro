'use client';
import '../passeios-premium.css';

import React, { useEffect, useRef, useState } from 'react';

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

const ESTADO_INICIAL: PasseioForm = {
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

/*
  ============================================================
  VALOR MONETÁRIO
  ============================================================

  Exemplos aceitos:

  3500        -> 3500
  3500,00     -> 3500
  3.500       -> 3500
  3.500,00    -> 3500
  3500.00     -> 3500
  R$ 3.500,00 -> 3500
*/
function converterValor(valor: string): number | null {
  let texto = valor.trim().replace(/^R\$\s*/i, '');

  if (!texto) return null;

  if (texto.includes(',')) {
    if (!/^(?:\d+|\d{1,3}(?:\.\d{3})+),\d{1,2}$/.test(texto)) {
      return null;
    }
    texto = texto.replace(/\./g, '').replace(',', '.');
  } else if (/^\d{1,3}(?:\.\d{3})+$/.test(texto)) {
    texto = texto.replace(/\./g, '');
  } else if (!/^\d+(?:\.\d{1,2})?$/.test(texto)) {
    return null;
  }

  const [inteiro, decimal = ''] = texto.split('.');
  const centavos =
    Number(inteiro) * 100 + Number(decimal.padEnd(2, '0'));

  return Number.isSafeInteger(centavos) && centavos >= 0
    ? centavos / 100
    : null;
}
export default function NovoPasseioPage() {
  const router = useRouter();

  // ERN_CADASTRO_PASSEIO_VALIDADO
  const envioPasseio = useRef(false);
  const passeioGravado = useRef(false);

  const [
    formData,
    setFormData,
  ] =
    useState<PasseioForm>(
      ESTADO_INICIAL
    );

  const [
    salvando,
    setSalvando,
  ] = useState(false);

  const [
    carregandoUso,
    setCarregandoUso,
  ] = useState(true);

  const [
    uso,
    setUso,
  ] =
    useState<UsoPasseios | null>(
      null
    );

  const [
    erroUso,
    setErroUso,
  ] =
    useState<string | null>(
      null
    );

  const [
    mensagem,
    setMensagem,
  ] =
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
    setErroUso(null);

    try {
      const {
        data,
        error,
      } =
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

        setErroUso(
          'Não foi possível identificar o uso de passeios desta assinatura.'
        );

        return;
      }

      setUso({
        plano_codigo:
          resultado.plano_codigo,

        plano_nome:
          resultado.plano_nome,

        total_passeios:
          Number(
            resultado.total_passeios ??
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

      setUso(null);

      setErroUso(
        'Não foi possível consultar o limite de passeios neste momento.'
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
    Boolean(uso) &&
    !uso?.ilimitado &&
    uso?.limite_passeios !==
      null &&
    uso?.limite_passeios !==
      undefined &&
    uso.total_passeios >=
      uso.limite_passeios;

  const percentualVisual =
    uso?.percentual_uso ===
      null ||
    uso?.percentual_uso ===
      undefined
      ? 0
      : Math.min(
          100,
          Math.max(
            0,
            uso.percentual_uso
          )
        );

  const restantes =
    uso &&
    !uso.ilimitado &&
    uso.limite_passeios !==
      null
      ? Math.max(
          uso.limite_passeios -
            uso.total_passeios,
          0
        )
      : null;

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

    if (
      type ===
      'checkbox'
    ) {
      const {
        checked,
      } =
        e.target as HTMLInputElement;

      setFormData(
        (prev) => ({
          ...prev,
          [name]:
            checked,
        })
      );

      return;
    }

    setFormData(
      (prev) => ({
        ...prev,
        [name]:
          value,
      })
    );
  };

  const handleLimpar =
    () => {
      setFormData(
        ESTADO_INICIAL
      );

      setMensagem(null);
    };

  const handleCancelar =
    () => {
      router.push(
        '/passeios'
      );
    };

  /*
    ============================================================
    SALVAR
    ============================================================
  */

  const handleSubmit =
    async (
      e: React.FormEvent
    ) => {
      e.preventDefault();
      if (envioPasseio.current) return;

      setMensagem(null);

      /*
        --------------------------------------------------------
        LIMITE VISUAL
        --------------------------------------------------------
      */

      if (
        limiteAtingido
      ) {
        setMensagem({
          tipo:
            'erro',

          texto:
            'O limite de passeios do seu plano foi atingido.',
        });

        return;
      }

      /*
        --------------------------------------------------------
        CAMPOS OBRIGATÓRIOS
        --------------------------------------------------------
      */

      if (
        !formData.nome.trim() ||
        !formData.duracao.trim() ||
        !formData.valor.trim() ||
        !formData.descricao.trim() ||
        !formData.cidade.trim()
      ) {
        setMensagem({
          tipo:
            'erro',

          texto:
            'Preencha os campos obrigatórios: Nome, Cidade, Duração, Valor e Descrição.',
        });

        return;
      }

      /*
        --------------------------------------------------------
        VALOR
        --------------------------------------------------------
      */

      const valorTratado =
        converterValor(
          formData.valor
        );

      if (
        valorTratado ===
          null ||
        valorTratado < 0
      ) {
        setMensagem({
          tipo:
            'erro',

          texto:
            'Informe um valor válido para o passeio.',
        });

        return;
      }

      /*
        --------------------------------------------------------
        VAGAS
        --------------------------------------------------------
      */

      let vagasTratadas =
        0;

      if (
        formData.vagas.trim()
      ) {
        const vagasNumero =
          Number(
            formData.vagas
          );

        if (
          !Number.isFinite(
            vagasNumero
          ) ||
          !Number.isInteger(
            vagasNumero
          ) ||
          vagasNumero < 0
        ) {
          setMensagem({
            tipo:
              'erro',

            texto:
              'Informe uma quantidade inteira e válida de vagas.',
          });

          return;
        }

        vagasTratadas =
          vagasNumero;
      }

      if (carregandoUso || erroUso || !uso) {
        setMensagem({
          tipo: 'erro',
          texto: 'Aguarde a confirmação do plano. Se a consulta falhou, atualize a página para tentar novamente.',
        });
        return;
      }

      if (!['Ativo', 'Inativo', 'Em Breve'].includes(formData.situacao)) {
        setMensagem({
          tipo: 'erro',
          texto: 'Selecione uma situação válida para o passeio.',
        });
        return;
      }

      if (formData.foto_url.trim()) {
        try {
          const url = new URL(formData.foto_url.trim());
          if (url.protocol !== 'https:') throw new Error();
        } catch {
          setMensagem({
            tipo: 'erro',
            texto: 'Informe uma URL completa de imagem com HTTPS ou deixe o campo vazio.',
          });
          return;
        }
      }

      if (vagasTratadas > 2147483647) {
        setMensagem({
          tipo: 'erro',
          texto: 'A quantidade de vagas excede o limite permitido.',
        });
        return;
      }

      envioPasseio.current = true;
      setSalvando(true);

      try {
        const { data: autenticacao, error: erroAuth } =
          await supabase.auth.getUser();

        if (erroAuth || !autenticacao.user) {
          throw new Error('Entre novamente para cadastrar o passeio.');
        }

        const { data: perfil, error: erroPerfil } = await supabase
          .from('perfis')
          .select('empresa_id')
          .eq('id', autenticacao.user.id)
          .single();

        if (erroPerfil || !perfil?.empresa_id) {
          throw new Error('Não foi possível identificar sua empresa.');
        }

        const { error } = await supabase
          .from('passeios')
          .insert([{
                empresa_id: perfil.empresa_id,
                nome:
                  formData.nome.trim(),

                descricao:
                  formData.descricao.trim(),

                cidade:
                  formData.cidade.trim(),

                duracao:
                  formData.duracao.trim(),

                /*
                  Compatibilidade atual.

                  O banco ainda possui
                  valor e preco.

                  Enquanto essa estrutura
                  não for unificada,
                  as duas colunas recebem
                  exatamente o mesmo valor.
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
              }]).select('id').single();

        if (error) {
          throw error;
        }

        await carregarUsoPasseios();

        setMensagem({
          tipo:
            'sucesso',

          texto:
            'Passeio cadastrado com sucesso. Redirecionando...',
        });

        passeioGravado.current = true;
        setTimeout(
          () => {
            router.push(
              '/passeios'
            );

            router.refresh();
          },
          1200
        );
      } catch (
        err: any
      ) {
        console.error(
          'Erro ao cadastrar passeio:',
          err
        );

        const mensagemErro =
          String(
            err?.message ||
              ''
          );

        if (
          mensagemErro.includes(
            'ERN_LIMITE_PASSEIOS_ATINGIDO'
          )
        ) {
          setMensagem({
            tipo:
              'erro',

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
            tipo:
              'erro',

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
            tipo:
              'erro',

            texto:
              'Seu usuário não possui uma empresa vinculada.',
          });

          return;
        }

        setMensagem({
          tipo:
            'erro',

          texto:
            err?.message ||
            'Não foi possível cadastrar o passeio.',
        });
      } finally {
        if (!passeioGravado.current) {
          envioPasseio.current = false;
          setSalvando(false);
        }
      }
    };

  return (
    <div className="ern-passeios-premium ern-passeios-cadastro min-h-screen bg-[var(--ern-fundo)] pb-16 text-[var(--ern-texto)]">
      {/* =====================================================
          CABEÇALHO
      ====================================================== */}

      <section className="border-b border-[var(--ern-borda)] bg-[var(--ern-painel)] px-5 py-9 md:px-8 md:py-11">
        <div className="mx-auto max-w-[1180px]">
          <div className="flex flex-col gap-6 sm:flex-row sm:items-end sm:justify-between">
            <div>
              <div className="flex items-center gap-3">
                <span className="h-px w-8 bg-[var(--ern-botao)]" />

                <span className="text-[10px] font-semibold uppercase tracking-[0.21em] text-[var(--ern-destaque)]">
                  Passeios
                </span>
              </div>

              <h1
                className="mt-4 text-3xl tracking-[-0.025em] text-[var(--ern-texto)] md:text-4xl"
                style={{
                  fontFamily:
                    'var(--font-fraunces), serif',
                }}
              >
                Novo passeio
              </h1>

              <p className="mt-3 max-w-[650px] text-sm leading-6 text-[var(--ern-secundario)]">
                Cadastre experiências, roteiros e
                operações que poderão compor as reservas
                e o catálogo da sua empresa.
              </p>
            </div>

            <Link
              href="/passeios"
              className="inline-flex min-h-[44px] items-center justify-center gap-2 rounded-xl border border-[var(--ern-borda)] bg-[var(--ern-suave)] px-5 text-sm font-semibold text-[var(--ern-secundario)] transition hover:border-[var(--ern-borda)] hover:bg-[var(--ern-suave)] hover:text-[var(--ern-secundario)]"
            >
              <span>←</span>
              Voltar para passeios
            </Link>
          </div>
        </div>
      </section>

      <main className="mx-auto max-w-[1180px] px-5 py-8 md:px-8 md:py-10">
        {/* =====================================================
            USO DO PLANO
        ====================================================== */}

        <section className="mb-6 overflow-hidden rounded-[22px] border border-[var(--ern-borda)] bg-[var(--ern-painel)]">
          <div className="flex flex-col gap-5 p-5 md:flex-row md:items-center md:justify-between md:p-6">
            <div>
              <div className="flex flex-wrap items-center gap-3">
                <div className="flex items-center gap-2.5">
                  <span className="h-px w-7 bg-[var(--ern-botao)]" />

                  <p className="text-[9px] font-bold uppercase tracking-[0.2em] text-[var(--ern-destaque)]">
                    Uso do plano
                  </p>
                </div>

                {!carregandoUso &&
                  uso && (
                    <span className="rounded-full border border-[var(--ern-borda)] bg-[var(--ern-suave)] px-2.5 py-1 text-[9px] font-semibold uppercase tracking-[0.12em] text-[var(--ern-secundario)]">
                      {
                        uso.plano_nome
                      }
                    </span>
                  )}
              </div>

              <h2
                className="mt-3 text-2xl tracking-[-0.015em] text-[var(--ern-texto)]"
                style={{
                  fontFamily:
                    'var(--font-fraunces), serif',
                }}
              >
                {carregandoUso
                  ? 'Consultando limite...'
                  : uso?.ilimitado
                    ? `${uso.total_passeios} passeios cadastrados`
                    : uso
                      ? `${uso.total_passeios} de ${uso.limite_passeios ?? 0} passeios`
                      : 'Uso indisponível'}
              </h2>

              <p className="mt-2 text-xs leading-5 text-[var(--ern-secundario)]">
                {carregandoUso
                  ? 'Carregando os dados da assinatura.'
                  : uso?.ilimitado
                    ? 'Seu plano não possui limite numérico de passeios.'
                    : limiteAtingido
                      ? 'O limite de experiências do plano atual foi atingido.'
                      : uso
                        ? `Você ainda pode cadastrar ${restantes ?? 0} passeio${restantes === 1 ? '' : 's'} neste plano.`
                        : 'O limite continua protegido pelo servidor.'}
              </p>
            </div>

            {!carregandoUso &&
              uso &&
              !uso.ilimitado && (
                <div className="w-full max-w-[310px] rounded-[17px] border border-[var(--ern-borda)] bg-[var(--ern-suave)] p-4">
                  <div className="flex items-end justify-between">
                    <div>
                      <p className="text-[8px] font-semibold uppercase tracking-[0.15em] text-[var(--ern-secundario)]">
                        Consumo
                      </p>

                      <strong className="mt-1 block text-xl text-[var(--ern-texto)]">
                        {
                          uso.total_passeios
                        }

                        <span className="text-sm font-normal text-[var(--ern-secundario)]">
                          {' '}
                          /{' '}
                          {
                            uso.limite_passeios
                          }
                        </span>
                      </strong>
                    </div>

                    <span
                      className={`text-xs font-bold ${
                        limiteAtingido ||
                        percentualVisual >=
                          80
                          ? 'text-[var(--ern-destaque)]'
                          : 'text-[var(--ern-sucesso)]'
                      }`}
                    >
                      {percentualVisual.toFixed(
                        1
                      )}
                      %
                    </span>
                  </div>

                  <div className="mt-3 h-1.5 overflow-hidden rounded-full bg-[var(--ern-suave)]">
                    <div
                      className={`h-full rounded-full transition-all ${
                        limiteAtingido ||
                        percentualVisual >=
                          80
                          ? 'bg-[var(--ern-botao)]'
                          : 'bg-emerald-400'
                      }`}
                      style={{
                        width:
                          `${percentualVisual}%`,
                      }}
                    />
                  </div>
                </div>
              )}
          </div>

          {erroUso && (
            <div className="border-t border-[var(--ern-borda)] px-5 py-3 text-[10px] text-[var(--ern-secundario)] md:px-6">
              {erroUso}
            </div>
          )}
        </section>

        {/* =====================================================
            LIMITE ATINGIDO
        ====================================================== */}

        {limiteAtingido && (
          <section className="mb-6 overflow-hidden rounded-[20px] border border-[var(--ern-borda)] bg-[var(--ern-suave)]">
            <div className="flex flex-col gap-5 p-5 sm:flex-row sm:items-center sm:justify-between">
              <div>
                <p className="text-[9px] font-bold uppercase tracking-[0.19em] text-[var(--ern-destaque)]">
                  Limite atingido
                </p>

                <h2
                  className="mt-2 text-xl text-[var(--ern-texto)]"
                  style={{
                    fontFamily:
                      'var(--font-fraunces), serif',
                  }}
                >
                  Novos passeios estão temporariamente bloqueados.
                </h2>

                <p className="mt-2 max-w-[720px] text-xs leading-6 text-[var(--ern-secundario)]">
                  Os passeios existentes permanecem
                  disponíveis normalmente. Para cadastrar
                  novas experiências, será necessário
                  reduzir o uso ou ampliar o plano da
                  empresa.
                </p>
              </div>

              <Link
                href="/planos"
                className="inline-flex min-h-[42px] shrink-0 items-center justify-center gap-2 rounded-xl bg-[var(--ern-botao)] px-5 text-xs font-bold text-[var(--ern-sobre-botao)] transition hover:bg-[var(--ern-botao)]"
              >
                Ver planos
                <span>→</span>
              </Link>
            </div>
          </section>
        )}

        {/* =====================================================
            FEEDBACK
        ====================================================== */}

        {mensagem && (
          <div
            className={`mb-6 rounded-[18px] border px-5 py-4 text-sm ${
              mensagem.tipo ===
              'sucesso'
                ? 'border-emerald-400/20 bg-emerald-400/[0.07] text-[var(--ern-sucesso)]'
                : 'border-red-400/20 bg-red-400/[0.07] text-[var(--ern-erro)]'
            }`}
          >
            {
              mensagem.texto
            }
          </div>
        )}

        {/* =====================================================
            FORMULÁRIO
        ====================================================== */}

        <form
          onSubmit={
            handleSubmit
          }
          className="overflow-hidden rounded-[26px] border border-[var(--ern-borda)] bg-[var(--ern-painel)]"
        >
          <div className="border-b border-[var(--ern-borda)] px-5 py-5 md:px-6">
            <div className="flex flex-col gap-3 sm:flex-row sm:items-end sm:justify-between">
              <div>
                <p className="text-[9px] font-semibold uppercase tracking-[0.18em] text-[var(--ern-secundario)]">
                  Catálogo
                </p>

                <h2
                  className="mt-2 text-2xl text-[var(--ern-texto)]"
                  style={{
                    fontFamily:
                      'var(--font-fraunces), serif',
                  }}
                >
                  Dados da experiência
                </h2>
              </div>

              <p className="text-[10px] text-[var(--ern-secundario)]">
                * Campos obrigatórios
              </p>
            </div>
          </div>

          <div className="grid gap-6 p-5 md:grid-cols-2 md:p-6">
            {/* NOME */}

            <div>
              <label
                htmlFor="nome"
                className="mb-2 block text-[10px] font-semibold uppercase tracking-[0.13em] text-[var(--ern-secundario)]"
              >
                Nome do passeio *
              </label>

              <input
                id="nome"
                type="text"
                name="nome"
                value={
                  formData.nome
                }
                onChange={
                  handleChange
                }
                disabled={
                  salvando ||
                  limiteAtingido
                }
                placeholder="Ex.: Expedição Rio Negro"
                className="min-h-[48px] w-full rounded-xl border border-[var(--ern-borda)] bg-[var(--ern-fundo)] px-4 text-sm text-[var(--ern-texto)] outline-none transition placeholder:text-[var(--ern-secundario)] focus:border-[var(--ern-borda)] focus:ring-1 focus:ring-[var(--ern-destaque)] disabled:cursor-not-allowed disabled:opacity-45"
              />
            </div>

            {/* CATEGORIA */}

            <div>
              <label
                htmlFor="categoria"
                className="mb-2 block text-[10px] font-semibold uppercase tracking-[0.13em] text-[var(--ern-secundario)]"
              >
                Categoria *
              </label>

              <select
                id="categoria"
                name="categoria"
                value={
                  formData.categoria
                }
                onChange={
                  handleChange
                }
                disabled={
                  salvando ||
                  limiteAtingido
                }
                className="min-h-[48px] w-full rounded-xl border border-[var(--ern-borda)] bg-[var(--ern-fundo)] px-4 text-sm text-[var(--ern-texto)] outline-none transition focus:border-[var(--ern-borda)] focus:ring-1 focus:ring-[var(--ern-destaque)] disabled:cursor-not-allowed disabled:opacity-45"
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

            {/* CIDADE */}

            <div>
              <label
                htmlFor="cidade"
                className="mb-2 block text-[10px] font-semibold uppercase tracking-[0.13em] text-[var(--ern-secundario)]"
              >
                Cidade / Destino *
              </label>

              <input
                id="cidade"
                type="text"
                name="cidade"
                value={
                  formData.cidade
                }
                onChange={
                  handleChange
                }
                disabled={
                  salvando ||
                  limiteAtingido
                }
                placeholder="Ex.: Barcelos - AM"
                className="min-h-[48px] w-full rounded-xl border border-[var(--ern-borda)] bg-[var(--ern-fundo)] px-4 text-sm text-[var(--ern-texto)] outline-none transition placeholder:text-[var(--ern-secundario)] focus:border-[var(--ern-borda)] focus:ring-1 focus:ring-[var(--ern-destaque)] disabled:cursor-not-allowed disabled:opacity-45"
              />
            </div>

            {/* DURAÇÃO */}

            <div>
              <label
                htmlFor="duracao"
                className="mb-2 block text-[10px] font-semibold uppercase tracking-[0.13em] text-[var(--ern-secundario)]"
              >
                Duração *
              </label>

              <input
                id="duracao"
                type="text"
                name="duracao"
                value={
                  formData.duracao
                }
                onChange={
                  handleChange
                }
                placeholder="Ex.: 4 horas, 1 dia, 3 dias"
                disabled={
                  salvando ||
                  limiteAtingido
                }
                className="min-h-[48px] w-full rounded-xl border border-[var(--ern-borda)] bg-[var(--ern-fundo)] px-4 text-sm text-[var(--ern-texto)] outline-none transition placeholder:text-[var(--ern-secundario)] focus:border-[var(--ern-borda)] focus:ring-1 focus:ring-[var(--ern-destaque)] disabled:cursor-not-allowed disabled:opacity-45"
              />
            </div>

            {/* PREÇO */}

            <div>
              <label
                htmlFor="valor"
                className="mb-2 block text-[10px] font-semibold uppercase tracking-[0.13em] text-[var(--ern-secundario)]"
              >
                Preço (R$) *
              </label>

              <input
                id="valor"
                type="text"
                inputMode="decimal"
                name="valor"
                value={
                  formData.valor
                }
                onChange={
                  handleChange
                }
                placeholder="Ex.: 3500 ou 3.500,00"
                disabled={
                  salvando ||
                  limiteAtingido
                }
                className="min-h-[48px] w-full rounded-xl border border-[var(--ern-borda)] bg-[var(--ern-fundo)] px-4 text-sm text-[var(--ern-texto)] outline-none transition placeholder:text-[var(--ern-secundario)] focus:border-[var(--ern-borda)] focus:ring-1 focus:ring-[var(--ern-destaque)] disabled:cursor-not-allowed disabled:opacity-45"
              />

              <p className="mt-1.5 text-[9px] leading-4 text-[var(--ern-secundario)]">
                Aceita formatos como 3500, 3.500, 3500,00 ou 3.500,00.
              </p>
            </div>

            {/* VAGAS */}

            <div>
              <label
                htmlFor="vagas"
                className="mb-2 block text-[10px] font-semibold uppercase tracking-[0.13em] text-[var(--ern-secundario)]"
              >
                Vagas
              </label>

              <input
                id="vagas"
                type="number"
                min="0"
                step="1"
                inputMode="numeric"
                name="vagas"
                value={
                  formData.vagas
                }
                onChange={
                  handleChange
                }
                placeholder="0"
                disabled={
                  salvando ||
                  limiteAtingido
                }
                className="min-h-[48px] w-full rounded-xl border border-[var(--ern-borda)] bg-[var(--ern-fundo)] px-4 text-sm text-[var(--ern-texto)] outline-none transition placeholder:text-[var(--ern-secundario)] focus:border-[var(--ern-borda)] focus:ring-1 focus:ring-[var(--ern-destaque)] disabled:cursor-not-allowed disabled:opacity-45"
              />
            </div>

            {/* SITUAÇÃO */}

            <div>
              <label
                htmlFor="situacao"
                className="mb-2 block text-[10px] font-semibold uppercase tracking-[0.13em] text-[var(--ern-secundario)]"
              >
                Situação
              </label>

              <select
                id="situacao"
                name="situacao"
                value={
                  formData.situacao
                }
                onChange={
                  handleChange
                }
                disabled={
                  salvando ||
                  limiteAtingido
                }
                className="min-h-[48px] w-full rounded-xl border border-[var(--ern-borda)] bg-[var(--ern-fundo)] px-4 text-sm text-[var(--ern-texto)] outline-none transition focus:border-[var(--ern-borda)] focus:ring-1 focus:ring-[var(--ern-destaque)] disabled:cursor-not-allowed disabled:opacity-45"
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

            {/* DESTAQUE */}

            <div>
              <span className="mb-2 block text-[10px] font-semibold uppercase tracking-[0.13em] text-[var(--ern-secundario)]">
                Visibilidade
              </span>

              <label
                htmlFor="destaque"
                className={`flex min-h-[48px] cursor-pointer items-center justify-between rounded-xl border px-4 transition ${
                  formData.destaque
                    ? 'border-[var(--ern-borda)] bg-[var(--ern-suave)]'
                    : 'border-[var(--ern-borda)] bg-[var(--ern-fundo)] hover:border-[var(--ern-borda)]'
                } ${
                  salvando ||
                  limiteAtingido
                    ? 'cursor-not-allowed opacity-45'
                    : ''
                }`}
              >
                <div>
                  <span className="block text-sm font-medium text-[var(--ern-secundario)]">
                    Marcar como destaque
                  </span>

                  <span className="mt-0.5 block text-[9px] text-[var(--ern-secundario)]">
                    Identifica a experiência como prioritária.
                  </span>
                </div>

                <input
                  id="destaque"
                  type="checkbox"
                  name="destaque"
                  checked={
                    formData.destaque
                  }
                  onChange={
                    handleChange
                  }
                  disabled={
                    salvando ||
                    limiteAtingido
                  }
                  className="h-4 w-4 accent-[var(--ern-destaque)]"
                />
              </label>
            </div>

            {/* FOTO */}

            <div className="md:col-span-2">
              <label
                htmlFor="foto_url"
                className="mb-2 block text-[10px] font-semibold uppercase tracking-[0.13em] text-[var(--ern-secundario)]"
              >
                URL da foto
              </label>

              <input
                id="foto_url"
                type="url"
                name="foto_url"
                value={
                  formData.foto_url
                }
                onChange={
                  handleChange
                }
                placeholder="https://..."
                disabled={
                  salvando ||
                  limiteAtingido
                }
                className="min-h-[48px] w-full rounded-xl border border-[var(--ern-borda)] bg-[var(--ern-fundo)] px-4 text-sm text-[var(--ern-texto)] outline-none transition placeholder:text-[var(--ern-secundario)] focus:border-[var(--ern-borda)] focus:ring-1 focus:ring-[var(--ern-destaque)] disabled:cursor-not-allowed disabled:opacity-45"
              />

              <p className="mt-1.5 text-[9px] leading-4 text-[var(--ern-secundario)]">
                Opcional. Use uma imagem real da experiência ou deixe o campo vazio.
              </p>
            </div>

            {/* DESCRIÇÃO */}

            <div className="md:col-span-2">
              <label
                htmlFor="descricao"
                className="mb-2 block text-[10px] font-semibold uppercase tracking-[0.13em] text-[var(--ern-secundario)]"
              >
                Descrição *
              </label>

              <textarea
                id="descricao"
                name="descricao"
                rows={4}
                value={
                  formData.descricao
                }
                onChange={
                  handleChange
                }
                disabled={
                  salvando ||
                  limiteAtingido
                }
                placeholder="Descrição completa da experiência, operação e principais características..."
                className="w-full resize-none rounded-xl border border-[var(--ern-borda)] bg-[var(--ern-fundo)] px-4 py-3 text-sm leading-6 text-[var(--ern-texto)] outline-none transition placeholder:text-[var(--ern-secundario)] focus:border-[var(--ern-borda)] focus:ring-1 focus:ring-[var(--ern-destaque)] disabled:cursor-not-allowed disabled:opacity-45"
              />
            </div>
          </div>

          {/* =================================================
              AÇÕES
          ================================================== */}

          <div className="flex flex-col-reverse gap-3 border-t border-[var(--ern-borda)] bg-[var(--ern-suave)] px-5 py-5 sm:flex-row sm:items-center sm:justify-between md:px-6">
            <p className="hidden max-w-[480px] text-[10px] leading-5 text-[var(--ern-secundario)] sm:block">
              O passeio será vinculado automaticamente à empresa autenticada.
            </p>

            <div className="flex flex-col-reverse gap-3 sm:flex-row">
              <button
                type="button"
                onClick={
                  handleCancelar
                }
                disabled={
                  salvando
                }
                className="min-h-[46px] rounded-xl border border-[var(--ern-borda)] bg-[var(--ern-suave)] px-5 text-sm font-semibold text-[var(--ern-secundario)] transition hover:bg-[var(--ern-suave)] disabled:opacity-40"
              >
                Cancelar
              </button>

              <button
                type="button"
                onClick={
                  handleLimpar
                }
                disabled={
                  salvando ||
                  limiteAtingido
                }
                className="min-h-[46px] rounded-xl border border-[var(--ern-borda)] bg-[var(--ern-suave)] px-5 text-sm font-semibold text-[var(--ern-secundario)] transition hover:bg-[var(--ern-suave)] disabled:cursor-not-allowed disabled:opacity-40"
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
                className="min-h-[46px] min-w-[170px] rounded-xl bg-[var(--ern-botao)] px-6 text-sm font-bold text-[var(--ern-sobre-botao)] shadow-[0_8px_22px_rgba(227,161,68,0.12)] transition hover:bg-[var(--ern-botao)] disabled:cursor-not-allowed disabled:opacity-45"
              >
                {salvando
                  ? 'Salvando...'
                  : limiteAtingido
                    ? 'Limite atingido'
                    : carregandoUso
                      ? 'Verificando plano...'
                      : 'Cadastrar passeio'}
              </button>
            </div>
          </div>
        </form>
      </main>
    </div>
  );
}