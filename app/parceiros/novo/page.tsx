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
        if (!texto) return 0;
        if (!/^\d+(?:\.\d{1,2})?$/.test(texto)) return null;

        const numero = Number(texto);
        return Number.isFinite(numero) && numero >= 0 && numero <= 100
          ? numero
          : null;
      }


export default function NovoParceiroPage() {
  const router = useRouter();
      const envioParceiroERN = React.useRef(false);
      const gravadoParceiroERN = React.useRef(false);
      const idParceiroERN = React.useRef<string | null>(null);
      const contaParceiroERN = React.useRef<{
        usuarioId: string;
        empresaId: string;
      } | null>(null);

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
      if (envioParceiroERN.current || gravadoParceiroERN.current) return;

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

    envioParceiroERN.current = true;
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

      const { data: auth, error: erroAuth } =
        await supabase.auth.getUser();

      if (erroAuth || !auth.user) {
        throw new Error('Entre novamente para cadastrar o parceiro.');
      }

      const { data: perfil, error: erroPerfil } = await supabase
        .from('perfis')
        .select('empresa_id')
        .eq('id', auth.user.id)
        .single();

      if (erroPerfil || !perfil?.empresa_id) {
        throw new Error('Nao foi possivel identificar sua empresa.');
      }

      const empresa = String(perfil.empresa_id);
      const anterior = contaParceiroERN.current;

      if (
        anterior &&
        (anterior.usuarioId !== auth.user.id || anterior.empresaId !== empresa)
      ) {
        throw new Error('Sua conta mudou. Reabra o formulario.');
      }

      contaParceiroERN.current = {
        usuarioId: auth.user.id,
        empresaId: empresa,
      };
      idParceiroERN.current ??= crypto.randomUUID();

      const { data: registro, error } = await supabase
        .from('parceiros')
        .insert([{
        id: idParceiroERN.current,
        empresa_id: empresa,
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
      ]).select('id').single();
      if (error) {
        throw error;
      }

      if (registro?.id !== idParceiroERN.current) {
        throw new Error('Nao foi possivel confirmar o cadastro.');
      }
      gravadoParceiroERN.current = true;
      router.push('/parceiros');
      router.refresh();
    } catch (error) {
        console.error('Erro ao cadastrar parceiro:', error);

        let texto = 'Nao foi possivel confirmar o cadastro. Confira a listagem antes de tentar novamente.';

        if (error && typeof error === 'object') {
          if ('message' in error && typeof error.message === 'string') {
            texto = error.message;
          }
          if ('code' in error && error.code === '23505') {
            texto = 'Este envio pode ja ter sido registrado. Confira a listagem antes de cadastrar novamente.';
          }
        }

        setErro(texto);
      } finally {
        if (!gravadoParceiroERN.current) {
          envioParceiroERN.current = false;
          setSalvando(false);
        }
      }
  }

  return (
    <div className="min-h-screen bg-[var(--ern-fundo)] text-[var(--ern-texto)]">
      {/* =====================================================
          CABEÇALHO
      ====================================================== */}

      <header className="border-b border-[var(--ern-borda)] bg-[var(--ern-painel)]">
        <div className="mx-auto max-w-[1100px] px-5 py-9 md:px-8">
          <Link
            href="/parceiros"
            className="inline-flex items-center gap-2 text-[10px] font-semibold text-[var(--ern-secundario)] transition hover:text-[var(--ern-destaque)]"
          >
            <span>←</span>
            Voltar para parceiros
          </Link>

          <div className="mt-7 flex items-center gap-3">
            <span className="h-px w-8 bg-[var(--ern-botao)]" />

            <span className="text-[10px] font-semibold uppercase tracking-[0.22em] text-[var(--ern-destaque)]">
              Rede Operacional ERN
            </span>
          </div>

          <h1
            className="mt-4 text-4xl tracking-[-0.04em] text-[var(--ern-texto)] md:text-5xl"
            style={{
              fontFamily: 'var(--font-fraunces), serif',
            }}
          >
            Novo parceiro
          </h1>

          <p className="mt-4 max-w-2xl text-sm leading-7 text-[var(--ern-secundario)]">
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
          <div className="mb-6 flex items-start justify-between gap-4 rounded-2xl border border-red-500/20 bg-red-500/[0.07] px-5 py-4 text-xs text-[var(--ern-erro)]">
            <span>{erro}</span>

            <button
              type="button"
              onClick={() => setErro(null)}
              className="text-[var(--ern-erro)] transition hover:text-[var(--ern-erro)]"
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

                <p className="mt-2 text-[9px] leading-4 text-[var(--ern-secundario)]">
                  Utilize valores entre 0 e 100.
                </p>
              </FormField>

              <div className="rounded-2xl border border-[var(--ern-destaque)] bg-[var(--ern-suave)] p-4">
                <p className="text-[8px] font-semibold uppercase tracking-[0.16em] text-[var(--ern-destaque)]">
                  Evolução ERN
                </p>

                <p className="mt-2 text-[10px] leading-5 text-[var(--ern-secundario)]">
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

          <div className="flex flex-col-reverse gap-3 border-t border-[var(--ern-borda)] pt-6 sm:flex-row sm:justify-end">
            <Link
              href="/parceiros"
              className="inline-flex min-h-[48px] items-center justify-center rounded-xl border border-[var(--ern-borda)] bg-[var(--ern-suave)] px-6 text-xs font-semibold text-[var(--ern-secundario)] transition hover:bg-[var(--ern-suave)]"
            >
              Cancelar
            </Link>

            <button
              type="submit"
              disabled={salvando}
              className="inline-flex min-h-[48px] items-center justify-center rounded-xl bg-[var(--ern-botao)] px-7 text-xs font-bold text-[var(--ern-sobre-botao)] transition hover:bg-[var(--ern-botao)] disabled:cursor-not-allowed disabled:opacity-50"
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
  'h-[46px] w-full rounded-xl border border-[var(--ern-borda)] bg-[var(--ern-fundo)] px-4 text-xs text-[var(--ern-texto)] outline-none placeholder:text-[var(--ern-secundario)] focus:border-[var(--ern-destaque)]';

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
    <section className="overflow-hidden rounded-[24px] border border-[var(--ern-borda)] bg-[var(--ern-painel)]">
      <div className="border-b border-[var(--ern-borda)] px-5 py-5 md:px-6">
        <p className="text-[9px] font-semibold uppercase tracking-[0.18em] text-[var(--ern-secundario)]">
          {eyebrow}
        </p>

        <h2
          className="mt-2 text-xl text-[var(--ern-texto)]"
          style={{
            fontFamily: 'var(--font-fraunces), serif',
          }}
        >
          {titulo}
        </h2>

        <p className="mt-2 max-w-2xl text-[10px] leading-5 text-[var(--ern-secundario)]">
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
      <span className="mb-2 block text-[9px] font-semibold uppercase tracking-[0.14em] text-[var(--ern-secundario)]">
        {label}
      </span>

      {children}
    </label>
  );
}