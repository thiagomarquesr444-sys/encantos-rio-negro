'use client';

import React, { useState } from 'react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { supabase } from '@/lib/supabase';

type FormParceiro = {
  nome: string;
  tipo: string;
  tipo_pessoa: string;
  documento: string;
  telefone: string;
  whatsapp: string;
  email: string;
  cidade: string;
  endereco: string;
  comissao_porcentagem: string;
  status: string;
  observacoes: string;
};

const TIPOS_PARCEIRO = [
  'Agência',
  'Operador',
  'Hospedagem',
  'Transporte',
  'Fornecedor',
  'Prestador de serviço',
  'Outro',
];

function converterComissao(valor: string) {
  const texto = valor.trim().replace(',', '.');

  if (!texto) {
    return 0;
  }

  const numero = Number(texto);

  if (!Number.isFinite(numero)) {
    return null;
  }

  return numero;
}

export default function NovoParceiroPage() {
  const router = useRouter();

  const [salvando, setSalvando] = useState(false);
  const [erro, setErro] = useState<string | null>(null);

  const [form, setForm] = useState<FormParceiro>({
    nome: '',
    tipo: '',
    tipo_pessoa: '',
    documento: '',
    telefone: '',
    whatsapp: '',
    email: '',
    cidade: '',
    endereco: '',
    comissao_porcentagem: '0',
    status: 'ativo',
    observacoes: '',
  });

  function alterarCampo<K extends keyof FormParceiro>(
    campo: K,
    valor: FormParceiro[K]
  ) {
    setForm((atual) => ({
      ...atual,
      [campo]: valor,
    }));
  }

  async function handleSubmit(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();

    setErro(null);

    const nome = form.nome.trim();

    if (!nome) {
      setErro('Informe o nome do parceiro.');
      return;
    }

    const comissao = converterComissao(form.comissao_porcentagem);

    if (comissao === null || comissao < 0 || comissao > 100) {
      setErro('A comissão deve ser um valor entre 0% e 100%.');
      return;
    }

    if (form.email.trim() && !form.email.includes('@')) {
      setErro('Informe um e-mail válido.');
      return;
    }

    setSalvando(true);

    try {
      /*
        IMPORTANTE:
        empresa_id NÃO é enviado pelo frontend.

        O trigger:
        trg_definir_empresa_parceiro

        utiliza:
        public.definir_empresa_registro()

        para identificar a empresa real através de auth.uid().
      */

      const { error } = await supabase.from('parceiros').insert([
        {
          nome,
          tipo: form.tipo.trim() || null,
          tipo_pessoa: form.tipo_pessoa.trim() || null,
          documento: form.documento.trim() || null,
          telefone: form.telefone.trim() || null,
          whatsapp: form.whatsapp.trim() || null,
          email: form.email.trim() || null,
          cidade: form.cidade.trim() || null,
          endereco: form.endereco.trim() || null,
          comissao_porcentagem: comissao,
          status: form.status || 'ativo',
          observacoes: form.observacoes.trim() || null,
        },
      ]);

      if (error) {
        throw error;
      }

      router.push('/parceiros');
      router.refresh();
    } catch (error) {
      console.error('Erro ao cadastrar parceiro:', error);

      if (error instanceof Error) {
        if (error.message.includes('ERN_USUARIO_SEM_EMPRESA')) {
          setErro(
            'Seu usuário não está vinculado a uma empresa. Verifique o perfil da conta.'
          );
          return;
        }

        setErro(error.message);
        return;
      }

      setErro('Não foi possível cadastrar o parceiro.');
    } finally {
      setSalvando(false);
    }
  }

  return (
    <div className="min-h-screen bg-[#07110E] text-[#EDEDE3]">
      {/* =====================================================
          CABEÇALHO
      ====================================================== */}

      <header className="border-b border-white/[0.07] bg-[#091510]">
        <div className="mx-auto max-w-[1100px] px-5 py-9 md:px-8">
          <Link
            href="/parceiros"
            className="inline-flex items-center gap-2 text-[10px] font-semibold text-[#EDEDE3]/40 transition hover:text-[#F4C77E]"
          >
            <span>←</span>
            Voltar para parceiros
          </Link>

          <div className="mt-7 flex items-center gap-3">
            <span className="h-px w-8 bg-[#E3A144]" />

            <span className="text-[10px] font-semibold uppercase tracking-[0.22em] text-[#E3A144]">
              Rede Operacional ERN
            </span>
          </div>

          <h1
            className="mt-4 text-4xl tracking-[-0.04em] text-[#F0F0E8] md:text-5xl"
            style={{
              fontFamily: 'var(--font-fraunces), serif',
            }}
          >
            Novo parceiro
          </h1>

          <p className="mt-4 max-w-2xl text-sm leading-7 text-[#EDEDE3]/40">
            Cadastre empresas, fornecedores e prestadores que participam da
            operação da sua empresa.
          </p>
        </div>
      </header>

      {/* =====================================================
          CONTEÚDO
      ====================================================== */}

      <main className="mx-auto max-w-[1100px] px-5 py-8 md:px-8">
        {erro && (
          <div className="mb-6 flex items-start justify-between gap-4 rounded-2xl border border-red-500/20 bg-red-500/[0.07] px-5 py-4 text-xs text-red-300">
            <span>{erro}</span>

            <button
              type="button"
              onClick={() => setErro(null)}
              className="text-red-300/60 transition hover:text-red-200"
            >
              ✕
            </button>
          </div>
        )}

        <form onSubmit={handleSubmit} className="space-y-6">
          {/* =================================================
              IDENTIFICAÇÃO
          ================================================== */}

          <Section
            eyebrow="Identificação"
            titulo="Dados principais"
            descricao="Informações básicas utilizadas para identificar o parceiro dentro da operação."
          >
            <div className="grid gap-5 md:grid-cols-2">
              <FormField label="Nome *" span>
                <input
                  type="text"
                  required
                  value={form.nome}
                  onChange={(event) =>
                    alterarCampo('nome', event.target.value)
                  }
                  placeholder="Ex: Distribuidora Rio Negro"
                  className={inputClass}
                />
              </FormField>

              <FormField label="Tipo de parceiro">
                <select
                  value={form.tipo}
                  onChange={(event) =>
                    alterarCampo('tipo', event.target.value)
                  }
                  className={inputClass}
                >
                  <option value="">Selecione</option>

                  {TIPOS_PARCEIRO.map((tipo) => (
                    <option key={tipo} value={tipo}>
                      {tipo}
                    </option>
                  ))}
                </select>
              </FormField>

              <FormField label="Tipo de pessoa">
                <select
                  value={form.tipo_pessoa}
                  onChange={(event) =>
                    alterarCampo('tipo_pessoa', event.target.value)
                  }
                  className={inputClass}
                >
                  <option value="">Selecione</option>
                  <option value="Pessoa física">Pessoa física</option>
                  <option value="Pessoa jurídica">Pessoa jurídica</option>
                </select>
              </FormField>

              <FormField label="Documento">
                <input
                  type="text"
                  value={form.documento}
                  onChange={(event) =>
                    alterarCampo('documento', event.target.value)
                  }
                  placeholder="CPF, CNPJ ou outro documento"
                  className={inputClass}
                />
              </FormField>

              <FormField label="Status">
                <select
                  value={form.status}
                  onChange={(event) =>
                    alterarCampo('status', event.target.value)
                  }
                  className={inputClass}
                >
                  <option value="ativo">Ativo</option>
                  <option value="inativo">Inativo</option>
                </select>
              </FormField>
            </div>
          </Section>

          {/* =================================================
              CONTATO
          ================================================== */}

          <Section
            eyebrow="Contato"
            titulo="Canais de comunicação"
            descricao="Dados utilizados pela equipe para contato operacional e comercial."
          >
            <div className="grid gap-5 md:grid-cols-2">
              <FormField label="Telefone">
                <input
                  type="tel"
                  value={form.telefone}
                  onChange={(event) =>
                    alterarCampo('telefone', event.target.value)
                  }
                  placeholder="Ex: +55 97 99999-9999"
                  className={inputClass}
                />
              </FormField>

              <FormField label="WhatsApp">
                <input
                  type="tel"
                  value={form.whatsapp}
                  onChange={(event) =>
                    alterarCampo('whatsapp', event.target.value)
                  }
                  placeholder="Ex: +55 97 99999-9999"
                  className={inputClass}
                />
              </FormField>

              <FormField label="E-mail" span>
                <input
                  type="email"
                  value={form.email}
                  onChange={(event) =>
                    alterarCampo('email', event.target.value)
                  }
                  placeholder="contato@empresa.com"
                  className={inputClass}
                />
              </FormField>
            </div>
          </Section>

          {/* =================================================
              LOCALIZAÇÃO
          ================================================== */}

          <Section
            eyebrow="Localização"
            titulo="Endereço operacional"
            descricao="Localização do parceiro para organização logística e operacional."
          >
            <div className="grid gap-5 md:grid-cols-2">
              <FormField label="Cidade">
                <input
                  type="text"
                  value={form.cidade}
                  onChange={(event) =>
                    alterarCampo('cidade', event.target.value)
                  }
                  placeholder="Ex: Barcelos - AM"
                  className={inputClass}
                />
              </FormField>

              <FormField label="Endereço">
                <input
                  type="text"
                  value={form.endereco}
                  onChange={(event) =>
                    alterarCampo('endereco', event.target.value)
                  }
                  placeholder="Rua, bairro ou referência"
                  className={inputClass}
                />
              </FormField>
            </div>
          </Section>

          {/* =================================================
              COMERCIAL
          ================================================== */}

          <Section
            eyebrow="Comercial"
            titulo="Condições básicas"
            descricao="Informações comerciais gerais da relação com este parceiro."
          >
            <div className="grid gap-5 md:grid-cols-2">
              <FormField label="Comissão (%)">
                <input
                  type="text"
                  inputMode="decimal"
                  value={form.comissao_porcentagem}
                  onChange={(event) =>
                    alterarCampo('comissao_porcentagem', event.target.value)
                  }
                  placeholder="0"
                  className={inputClass}
                />

                <p className="mt-2 text-[9px] leading-4 text-[#EDEDE3]/25">
                  Utilize valores entre 0 e 100.
                </p>
              </FormField>

              <div className="rounded-2xl border border-[#E3A144]/15 bg-[#E3A144]/[0.035] p-4">
                <p className="text-[8px] font-semibold uppercase tracking-[0.16em] text-[#E3A144]">
                  Evolução ERN
                </p>

                <p className="mt-2 text-[10px] leading-5 text-[#EDEDE3]/35">
                  Parceiros classificados como fornecedores poderão ser
                  conectados aos módulos de suprimentos, cotações e pedidos da
                  operação ERN.
                </p>
              </div>

              <FormField label="Observações" span>
                <textarea
                  rows={5}
                  value={form.observacoes}
                  onChange={(event) =>
                    alterarCampo('observacoes', event.target.value)
                  }
                  placeholder="Informações importantes sobre a relação operacional ou comercial..."
                  className={`${inputClass} min-h-[130px] resize-y py-3`}
                />
              </FormField>
            </div>
          </Section>

          {/* =================================================
              AÇÕES
          ================================================== */}

          <div className="flex flex-col-reverse gap-3 border-t border-white/[0.07] pt-6 sm:flex-row sm:justify-end">
            <Link
              href="/parceiros"
              className="inline-flex min-h-[48px] items-center justify-center rounded-xl border border-white/[0.08] bg-white/[0.02] px-6 text-xs font-semibold text-[#EDEDE3]/55 transition hover:bg-white/[0.05]"
            >
              Cancelar
            </Link>

            <button
              type="submit"
              disabled={salvando}
              className="inline-flex min-h-[48px] items-center justify-center rounded-xl bg-[#E3A144] px-7 text-xs font-bold text-[#07130F] transition hover:bg-[#F0B35C] disabled:cursor-not-allowed disabled:opacity-50"
            >
              {salvando ? 'Salvando parceiro...' : 'Cadastrar parceiro'}
            </button>
          </div>
        </form>
      </main>
    </div>
  );
}

const inputClass =
  'h-[46px] w-full rounded-xl border border-white/[0.08] bg-[#07110E] px-4 text-xs text-[#EDEDE3] outline-none placeholder:text-[#EDEDE3]/20 focus:border-[#E3A144]/35';

function Section({
  eyebrow,
  titulo,
  descricao,
  children,
}: {
  eyebrow: string;
  titulo: string;
  descricao: string;
  children: React.ReactNode;
}) {
  return (
    <section className="overflow-hidden rounded-[24px] border border-white/[0.075] bg-[#0A1713]">
      <div className="border-b border-white/[0.06] px-5 py-5 md:px-6">
        <p className="text-[9px] font-semibold uppercase tracking-[0.18em] text-[#7C9C87]">
          {eyebrow}
        </p>

        <h2
          className="mt-2 text-xl text-[#F0F0E8]"
          style={{
            fontFamily: 'var(--font-fraunces), serif',
          }}
        >
          {titulo}
        </h2>

        <p className="mt-2 max-w-2xl text-[10px] leading-5 text-[#EDEDE3]/28">
          {descricao}
        </p>
      </div>

      <div className="p-5 md:p-6">{children}</div>
    </section>
  );
}

function FormField({
  label,
  children,
  span = false,
}: {
  label: string;
  children: React.ReactNode;
  span?: boolean;
}) {
  return (
    <label className={span ? 'md:col-span-2' : ''}>
      <span className="mb-2 block text-[9px] font-semibold uppercase tracking-[0.14em] text-[#7C9C87]">
        {label}
      </span>

      {children}
    </label>
  );
}