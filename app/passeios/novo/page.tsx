'use client';

import React, {
  useState,
} from 'react';

import Link from 'next/link';
import { useRouter } from 'next/navigation';

import { supabase } from '@/lib/supabase';

interface PasseioForm {
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
}

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

function converterValor(
  valor: string
) {
  let texto = valor
    .trim()
    .replace(/\s/g, '')
    .replace(/R\$/gi, '');

  if (!texto) {
    return 0;
  }

  /*
    Padrão definido para a ERN:

    3500  -> 3500
    3.500 -> 3500
  */

  if (
    /^\d{1,3}(\.\d{3})+$/.test(
      texto
    )
  ) {
    texto = texto.replace(
      /\./g,
      ''
    );
  }

  const numero =
    Number(
      texto.replace(',', '.')
    );

  return Number.isFinite(numero)
    ? numero
    : NaN;
}

export default function NovoPasseioPage() {
  const router = useRouter();

  const [
    formData,
    setFormData,
  ] =
    useState<PasseioForm>(
      estadoInicial
    );

  const [
    salvando,
    setSalvando,
  ] = useState(false);

  const [
    mensagem,
    setMensagem,
  ] = useState<{
    tipo: 'sucesso' | 'erro';
    texto: string;
  } | null>(null);

  const inputClass =
    'w-full rounded-xl border border-white/[0.08] bg-[#07110E] px-4 py-3 text-sm text-[#EDEDE3] outline-none transition placeholder:text-[#EDEDE3]/20 focus:border-[#E3A144]/40';

  const labelClass =
    'mb-2 block text-[9px] font-semibold uppercase tracking-[0.16em] text-[#EDEDE3]/34';

  function handleChange(
    event: React.ChangeEvent<
      | HTMLInputElement
      | HTMLTextAreaElement
      | HTMLSelectElement
    >
  ) {
    const {
      name,
      value,
      type,
    } = event.target;

    if (type === 'checkbox') {
      const {
        checked,
      } =
        event.target as HTMLInputElement;

      setFormData(
        (atual) => ({
          ...atual,
          [name]: checked,
        })
      );

      return;
    }

    setFormData(
      (atual) => ({
        ...atual,
        [name]: value,
      })
    );
  }

  function handleLimpar() {
    setFormData(
      estadoInicial
    );

    setMensagem(null);
  }

  async function handleSubmit(
    event: React.FormEvent
  ) {
    event.preventDefault();

    setMensagem(null);

    if (
      !formData.nome.trim() ||
      !formData.duracao.trim() ||
      !formData.valor.trim() ||
      !formData.descricao.trim()
    ) {
      setMensagem({
        tipo: 'erro',
        texto:
          'Preencha os campos obrigatórios: nome, duração, valor e descrição.',
      });

      return;
    }

    const valor =
      converterValor(
        formData.valor
      );

    if (
      !Number.isFinite(valor) ||
      valor < 0
    ) {
      setMensagem({
        tipo: 'erro',
        texto:
          'Informe um valor válido.',
      });

      return;
    }

    const vagas =
      formData.vagas.trim()
        ? Number(
            formData.vagas
          )
        : 0;

    if (
      !Number.isFinite(vagas) ||
      vagas < 0 ||
      !Number.isInteger(vagas)
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
      const payload = {
        nome:
          formData.nome.trim(),

        descricao:
          formData.descricao.trim(),

        cidade:
          formData.cidade.trim() ||
          'Barcelos - AM',

        duracao:
          formData.duracao.trim(),

        /*
          Campo usado pelo cadastro
          atual do banco.
        */
        valor,

        vagas,

        categoria:
          formData.categoria,

        foto_url:
          formData.foto_url.trim() ||
          null,

        destaque:
          formData.destaque,

        situacao:
          formData.situacao,
      };

      const { error } =
        await supabase
          .from('passeios')
          .insert([payload]);

      if (error) {
        throw error;
      }

      setMensagem({
        tipo: 'sucesso',
        texto:
          'Passeio cadastrado com sucesso.',
      });

      setTimeout(() => {
        router.push(
          '/passeios'
        );

        router.refresh();
      }, 1200);
    } catch (error) {
      console.error(
        'Erro ao cadastrar passeio:',
        error
      );

      setMensagem({
        tipo: 'erro',
        texto:
          error instanceof Error
            ? `Erro ao cadastrar o passeio: ${error.message}`
            : 'Ocorreu um erro ao salvar o passeio.',
      });
    } finally {
      setSalvando(false);
    }
  }

  return (
    <div className="min-h-screen bg-[#07110E] text-[#EDEDE3]">
      {/* CABEÇALHO */}

      <section className="border-b border-white/[0.07] bg-[#091510]">
        <div className="mx-auto max-w-[1180px] px-5 py-10 md:px-8 md:py-12">
          <Link
            href="/passeios"
            className="inline-flex items-center gap-2 text-xs font-semibold text-[#EDEDE3]/38 transition hover:text-[#E3A144]"
          >
            <span>←</span>
            Passeios
          </Link>

          <div className="mt-7 flex flex-col gap-5 md:flex-row md:items-end md:justify-between">
            <div>
              <p className="text-[9px] font-semibold uppercase tracking-[0.2em] text-[#E3A144]">
                Operação • Catálogo
              </p>

              <h1
                className="mt-3 text-4xl tracking-[-0.035em] text-[#F0F0E8] md:text-5xl"
                style={{
                  fontFamily:
                    'var(--font-fraunces), serif',
                }}
              >
                Novo passeio
              </h1>

              <p className="mt-4 max-w-[650px] text-sm leading-7 text-[#EDEDE3]/40">
                Adicione uma experiência
                ao catálogo operacional
                da empresa.
              </p>
            </div>

            <span className="rounded-full border border-white/[0.07] bg-white/[0.025] px-3 py-1.5 text-[9px] uppercase tracking-[0.15em] text-[#EDEDE3]/28">
              ERN Gestão
            </span>
          </div>
        </div>
      </section>

      <main className="mx-auto max-w-[1180px] px-5 py-8 md:px-8 md:py-10">
        {mensagem && (
          <div
            className={`mb-6 rounded-2xl border px-5 py-4 text-xs ${
              mensagem.tipo ===
              'sucesso'
                ? 'border-emerald-500/20 bg-emerald-500/[0.07] text-emerald-300'
                : 'border-red-500/20 bg-red-500/[0.07] text-red-300'
            }`}
          >
            {mensagem.texto}
          </div>
        )}

        <form
          onSubmit={handleSubmit}
          className="grid gap-6 lg:grid-cols-[1.15fr_0.85fr]"
        >
          {/* DADOS PRINCIPAIS */}

          <section className="rounded-[26px] border border-white/[0.075] bg-[#0A1713] p-5 md:p-7">
            <div className="border-b border-white/[0.065] pb-5">
              <p className="text-[9px] font-semibold uppercase tracking-[0.18em] text-[#7C9C87]">
                Experiência
              </p>

              <h2
                className="mt-2 text-2xl text-[#F0F0E8]"
                style={{
                  fontFamily:
                    'var(--font-fraunces), serif',
                }}
              >
                Informações principais
              </h2>
            </div>

            <div className="mt-6 space-y-5">
              <div>
                <label className={labelClass}>
                  Nome do passeio *
                </label>

                <input
                  type="text"
                  name="nome"
                  required
                  value={formData.nome}
                  onChange={handleChange}
                  placeholder="Nome da experiência"
                  className={inputClass}
                />
              </div>

              <div className="grid gap-4 sm:grid-cols-2">
                <div>
                  <label className={labelClass}>
                    Categoria *
                  </label>

                  <select
                    name="categoria"
                    value={
                      formData.categoria
                    }
                    onChange={
                      handleChange
                    }
                    className={
                      inputClass
                    }
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
                  <label className={labelClass}>
                    Cidade / Destino *
                  </label>

                  <input
                    type="text"
                    name="cidade"
                    required
                    value={
                      formData.cidade
                    }
                    onChange={
                      handleChange
                    }
                    className={
                      inputClass
                    }
                  />
                </div>
              </div>

              <div className="grid gap-4 sm:grid-cols-3">
                <div>
                  <label className={labelClass}>
                    Duração *
                  </label>

                  <input
                    type="text"
                    name="duracao"
                    required
                    value={
                      formData.duracao
                    }
                    onChange={
                      handleChange
                    }
                    placeholder="Ex.: 4 horas"
                    className={
                      inputClass
                    }
                  />
                </div>

                <div>
                  <label className={labelClass}>
                    Valor (R$) *
                  </label>

                  <input
                    type="text"
                    inputMode="decimal"
                    name="valor"
                    required
                    value={
                      formData.valor
                    }
                    onChange={
                      handleChange
                    }
                    placeholder="Ex.: 3.500"
                    className={
                      inputClass
                    }
                  />
                </div>

                <div>
                  <label className={labelClass}>
                    Vagas
                  </label>

                  <input
                    type="number"
                    min="0"
                    step="1"
                    name="vagas"
                    value={
                      formData.vagas
                    }
                    onChange={
                      handleChange
                    }
                    placeholder="0"
                    className={
                      inputClass
                    }
                  />
                </div>
              </div>

              <div>
                <label className={labelClass}>
                  Descrição *
                </label>

                <textarea
                  name="descricao"
                  required
                  rows={6}
                  value={
                    formData.descricao
                  }
                  onChange={
                    handleChange
                  }
                  placeholder="Descreva a experiência, roteiro e principais características..."
                  className={`${inputClass} resize-none leading-6`}
                />
              </div>
            </div>
          </section>

          {/* PUBLICAÇÃO */}

          <div className="space-y-6">
            <section className="rounded-[26px] border border-white/[0.075] bg-[#0A1713] p-5 md:p-6">
              <p className="text-[9px] font-semibold uppercase tracking-[0.18em] text-[#E3A144]">
                Publicação
              </p>

              <h2
                className="mt-2 text-2xl text-[#F0F0E8]"
                style={{
                  fontFamily:
                    'var(--font-fraunces), serif',
                }}
              >
                Situação do passeio
              </h2>

              <div className="mt-6 space-y-5">
                <div>
                  <label className={labelClass}>
                    Situação
                  </label>

                  <select
                    name="situacao"
                    value={
                      formData.situacao
                    }
                    onChange={
                      handleChange
                    }
                    className={
                      inputClass
                    }
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

                <label className="flex cursor-pointer items-start gap-3 rounded-2xl border border-white/[0.065] bg-white/[0.018] p-4">
                  <input
                    type="checkbox"
                    name="destaque"
                    checked={
                      formData.destaque
                    }
                    onChange={
                      handleChange
                    }
                    className="mt-0.5 h-4 w-4"
                  />

                  <div>
                    <p className="text-xs font-semibold text-[#EDEDE3]/70">
                      Destacar passeio
                    </p>

                    <p className="mt-1 text-[10px] leading-5 text-[#EDEDE3]/28">
                      Marca esta experiência
                      como destaque dentro
                      do catálogo.
                    </p>
                  </div>
                </label>
              </div>
            </section>

            <section className="rounded-[26px] border border-white/[0.075] bg-[#0A1713] p-5 md:p-6">
              <label className={labelClass}>
                URL da imagem
              </label>

              <input
                type="url"
                name="foto_url"
                value={
                  formData.foto_url
                }
                onChange={
                  handleChange
                }
                placeholder="https://..."
                className={
                  inputClass
                }
              />

              <p className="mt-3 text-[10px] leading-5 text-[#EDEDE3]/26">
                Use uma imagem real da
                experiência ou deixe em
                branco por enquanto.
              </p>
            </section>
          </div>

          {/* AÇÕES */}

          <div className="lg:col-span-2">
            <div className="flex flex-col-reverse gap-3 border-t border-white/[0.07] pt-6 sm:flex-row sm:items-center sm:justify-between">
              <button
                type="button"
                onClick={
                  handleLimpar
                }
                disabled={
                  salvando
                }
                className="rounded-xl border border-white/[0.08] bg-white/[0.025] px-5 py-3 text-xs font-semibold text-[#EDEDE3]/45"
              >
                Limpar formulário
              </button>

              <div className="flex flex-col gap-3 sm:flex-row">
                <Link
                  href="/passeios"
                  className="inline-flex min-h-[46px] items-center justify-center rounded-xl border border-white/[0.08] bg-white/[0.025] px-5 text-xs font-semibold text-[#EDEDE3]/55"
                >
                  Cancelar
                </Link>

                <button
                  type="submit"
                  disabled={
                    salvando
                  }
                  className="inline-flex min-h-[46px] items-center justify-center rounded-xl bg-[#E3A144] px-6 text-xs font-bold text-[#07130F] transition hover:bg-[#F0B35C] disabled:opacity-50"
                >
                  {salvando
                    ? 'Salvando...'
                    : 'Cadastrar passeio'}
                </button>
              </div>
            </div>
          </div>
        </form>
      </main>
    </div>
  );
}