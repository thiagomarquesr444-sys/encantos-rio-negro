'use client';

import Link from 'next/link';
import { useEffect, useRef, useState } from 'react';
import type { CSSProperties, FormEvent } from 'react';
import { supabase } from '@/lib/supabase';

type Tema = 'verde' | 'azul' | 'amarelo' | 'branco';

type Configuracao = {
  id?: string;
  nome_sistema: string;
  tema: Tema;
  moeda: string;
  fuso_horario: string;
  permitir_reservas_mesmo_dia: boolean;
  antecedencia_minima_horas: number;
  porcentagem_sinal: number;
  enviar_email_confirmacao: boolean;
  enviar_whatsapp_confirmacao: boolean;
  chave_api_pix: string;
};

type Feedback = {
  tipo: 'sucesso' | 'erro';
  texto: string;
};

const TEMAS: Record<
  Tema,
  {
    nome: string;
    descricao: string;
    fundo: string;
    painel: string;
    texto: string;
    secundario: string;
    borda: string;
    destaque: string;
    sobreDestaque: string;
  }
> = {
  verde: {
    nome: 'Verde Rio Negro',
    descricao: 'Identidade atual da plataforma.',
    fundo: '#07110E',
    painel: '#10231B',
    texto: '#EDEDE3',
    secundario: '#B8C9BF',
    borda: '#355043',
    destaque: '#F4C77E',
    sobreDestaque: '#07110E',
  },
  azul: {
    nome: 'Azul',
    descricao: 'Azul profundo com detalhes claros.',
    fundo: '#081525',
    painel: '#10263D',
    texto: '#F0F6FC',
    secundario: '#B7CAE0',
    borda: '#35516F',
    destaque: '#9AD4FF',
    sobreDestaque: '#081525',
  },
  amarelo: {
    nome: 'Amarelo',
    descricao: 'Fundo suave com identidade solar.',
    fundo: '#FFF7DB',
    painel: '#FFFCF0',
    texto: '#30260D',
    secundario: '#695727',
    borda: '#CDBA7A',
    destaque: '#805600',
    sobreDestaque: '#FFFFFF',
  },
  branco: {
    nome: 'Branco',
    descricao: 'Superfícies claras e detalhes verdes.',
    fundo: '#F4F6F5',
    painel: '#FFFFFF',
    texto: '#14271E',
    secundario: '#4E6257',
    borda: '#B8C9BF',
    destaque: '#176042',
    sobreDestaque: '#FFFFFF',
  },
};

const PADRAO: Configuracao = {
  nome_sistema: 'Encantos Rio Negro',
  tema: 'verde',
  moeda: 'BRL',
  fuso_horario: 'America/Manaus',
  permitir_reservas_mesmo_dia: true,
  antecedencia_minima_horas: 2,
  porcentagem_sinal: 50,
  enviar_email_confirmacao: true,
  enviar_whatsapp_confirmacao: false,
  chave_api_pix: '',
};

function temaValido(valor: unknown): Tema {
  return typeof valor === 'string' &&
    Object.prototype.hasOwnProperty.call(TEMAS, valor)
    ? (valor as Tema)
    : 'verde';
}

function mensagemErro(falha: unknown, padrao: string) {
  return falha instanceof Error ? falha.message : padrao;
}

export default function ConfiguracoesPage() {
  const [config, setConfig] = useState<Configuracao>(PADRAO);
  const [empresaId, setEmpresaId] = useState('');
  const [carregando, setCarregando] = useState(true);
  const [erroCarga, setErroCarga] = useState('');
  const [tentativa, setTentativa] = useState(0);
  const [salvando, setSalvando] = useState(false);
  const [feedback, setFeedback] = useState<Feedback | null>(null);

  const [novaSenha, setNovaSenha] = useState('');
  const [confirmacao, setConfirmacao] = useState('');
  const [alterandoSenha, setAlterandoSenha] = useState(false);
  const [feedbackSenha, setFeedbackSenha] = useState<Feedback | null>(null);

  const travaSalvar = useRef(false);
  const travaSenha = useRef(false);
  const aviso = useRef<HTMLDivElement>(null);

  useEffect(() => {
    let ativo = true;

    async function carregar() {
      setCarregando(true);
      setErroCarga('');
      setFeedback(null);

      try {
        const { data: auth, error: erroAuth } =
          await supabase.auth.getUser();

        if (erroAuth || !auth.user) {
          throw new Error('Sua sessão não está disponível. Entre novamente.');
        }

        const { data: perfil, error: erroPerfil } = await supabase
          .from('perfis')
          .select('empresa_id,role')
          .eq('id', auth.user.id)
          .single();

        if (erroPerfil || !perfil?.empresa_id) {
          throw new Error('Não foi possível identificar sua empresa.');
        }

        if (perfil.role !== 'admin_empresa') {
          throw new Error(
            'As configurações da empresa estão disponíveis aos administradores.',
          );
        }

        const empresa = String(perfil.empresa_id);

        const { data, error } = await supabase
          .from('configuracoes')
          .select(
            'id,nome_sistema,tema,moeda,fuso_horario,' +
            'permitir_reservas_mesmo_dia,antecedencia_minima_horas,' +
            'porcentagem_sinal,enviar_email_confirmacao,' +
            'enviar_whatsapp_confirmacao,chave_api_pix',
          )
          .eq('empresa_id', empresa)
          .maybeSingle();

        if (error) {
          throw new Error(
            'Não foi possível carregar as configurações. Tente novamente.',
          );
        }

        if (!ativo) return;

        setEmpresaId(empresa);

        if (!data) {
          setConfig({ ...PADRAO });
          return;
        }

        // A consulta não altera campos legados que não fazem parte do formulário.
        const registro = data as unknown as Partial<Configuracao>;

        setConfig({
          id: registro.id,
          nome_sistema: registro.nome_sistema ?? PADRAO.nome_sistema,
          tema: temaValido(registro.tema),
          moeda: registro.moeda ?? PADRAO.moeda,
          fuso_horario: registro.fuso_horario ?? PADRAO.fuso_horario,
          permitir_reservas_mesmo_dia:
            registro.permitir_reservas_mesmo_dia ??
            PADRAO.permitir_reservas_mesmo_dia,
          antecedencia_minima_horas: Number(
            registro.antecedencia_minima_horas ??
            PADRAO.antecedencia_minima_horas,
          ),
          porcentagem_sinal: Number(
            registro.porcentagem_sinal ?? PADRAO.porcentagem_sinal,
          ),
          enviar_email_confirmacao:
            registro.enviar_email_confirmacao ??
            PADRAO.enviar_email_confirmacao,
          enviar_whatsapp_confirmacao:
            registro.enviar_whatsapp_confirmacao ??
            PADRAO.enviar_whatsapp_confirmacao,
          chave_api_pix: registro.chave_api_pix ?? '',
        });
      } catch (falha) {
        if (ativo) {
          setErroCarga(
            mensagemErro(falha, 'Não foi possível carregar a configuração.'),
          );
        }
      } finally {
        if (ativo) setCarregando(false);
      }
    }

    void carregar();

    return () => {
      ativo = false;
    };
  }, [tentativa]);

  const paleta = TEMAS[config.tema];

  const estilo = {
    '--cfg-fundo': paleta.fundo,
    '--cfg-painel': paleta.painel,
    '--cfg-texto': paleta.texto,
    '--cfg-secundario': paleta.secundario,
    '--cfg-borda': paleta.borda,
    '--cfg-destaque': paleta.destaque,
    '--cfg-sobre-destaque': paleta.sobreDestaque,
    colorScheme:
      config.tema === 'branco' || config.tema === 'amarelo'
        ? 'light'
        : 'dark',
  } as CSSProperties;

  const painel =
    'min-w-0 rounded-2xl border border-[var(--cfg-borda)] ' +
    'bg-[var(--cfg-painel)] p-4 sm:p-6';

  const campo =
    'mt-2 min-h-12 w-full min-w-0 rounded-xl border ' +
    'border-[var(--cfg-borda)] bg-[var(--cfg-fundo)] px-3 ' +
    'text-base text-[var(--cfg-texto)] outline-none ' +
    'focus-visible:ring-2 focus-visible:ring-[var(--cfg-destaque)] ' +
    'disabled:opacity-60';

  const botao =
    'inline-flex min-h-12 items-center justify-center rounded-xl ' +
    'border border-[var(--cfg-borda)] px-4 text-sm font-semibold ' +
    'focus-visible:outline-none focus-visible:ring-2 ' +
    'focus-visible:ring-[var(--cfg-destaque)] disabled:opacity-60';

  function alterar<K extends keyof Configuracao>(
    chave: K,
    valor: Configuracao[K],
  ) {
    setConfig((atual) => ({ ...atual, [chave]: valor }));
    setFeedback(null);
  }

  async function salvar(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();

    if (travaSalvar.current || !empresaId || erroCarga) return;

    const nome = config.nome_sistema.trim();

    if (nome.length < 3 || nome.length > 100) {
      setFeedback({
        tipo: 'erro',
        texto: 'Informe um nome entre 3 e 100 caracteres.',
      });
      return;
    }

    if (
      !Number.isFinite(config.porcentagem_sinal) ||
      config.porcentagem_sinal < 0 ||
      config.porcentagem_sinal > 100
    ) {
      setFeedback({
        tipo: 'erro',
        texto: 'O sinal deve estar entre 0% e 100%.',
      });
      return;
    }

    if (
      !Number.isSafeInteger(config.antecedencia_minima_horas) ||
      config.antecedencia_minima_horas < 0
    ) {
      setFeedback({
        tipo: 'erro',
        texto: 'Informe uma antecedência inteira, igual ou maior que zero.',
      });
      return;
    }

    travaSalvar.current = true;
    setSalvando(true);
    setFeedback(null);

    try {
      const payload = {
        nome_sistema: nome,
        tema: config.tema,
        moeda: config.moeda,
        fuso_horario: config.fuso_horario,
        permitir_reservas_mesmo_dia: config.permitir_reservas_mesmo_dia,
        antecedencia_minima_horas: config.antecedencia_minima_horas,
        porcentagem_sinal: config.porcentagem_sinal,
        enviar_email_confirmacao: config.enviar_email_confirmacao,
        enviar_whatsapp_confirmacao: config.enviar_whatsapp_confirmacao,
        chave_api_pix: config.chave_api_pix.trim() || null,
        updated_at: new Date().toISOString(),
      };

      if (config.id) {
        const { data, error } = await supabase
          .from('configuracoes')
          .update(payload)
          .eq('id', config.id)
          .eq('empresa_id', empresaId)
          .select('id')
          .single();

        if (error || !data) {
          throw new Error(
            'Não foi possível salvar. Confira sua sessão e tente novamente.',
          );
        }
      } else {
        const { data, error } = await supabase
          .from('configuracoes')
          .insert({ ...payload, empresa_id: empresaId })
          .select('id')
          .single();

        if (error || !data) {
          throw new Error(
            'Não foi possível criar a configuração. Recarregue a página antes de tentar novamente.',
          );
        }

        setConfig((atual) => ({ ...atual, id: String(data.id) }));
      }

      setConfig((atual) => ({
        ...atual,
        nome_sistema: nome,
        chave_api_pix: atual.chave_api_pix.trim(),
      }));

      window.dispatchEvent(
        new CustomEvent('ern:tema-salvo', {
          detail: { empresaId, tema: config.tema },
        }),
      );

      setFeedback({
        tipo: 'sucesso',
        texto: 'Configurações da empresa salvas.',
      });
    } catch (falha) {
      setFeedback({
        tipo: 'erro',
        texto: mensagemErro(falha, 'Não foi possível salvar as configurações.'),
      });
    } finally {
      travaSalvar.current = false;
      setSalvando(false);
      aviso.current?.focus();
    }
  }

  async function atualizarSenha(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();

    if (travaSenha.current) return;

    if (novaSenha.length < 8) {
      setFeedbackSenha({
        tipo: 'erro',
        texto: 'Use uma senha com pelo menos 8 caracteres.',
      });
      return;
    }

    if (novaSenha !== confirmacao) {
      setFeedbackSenha({
        tipo: 'erro',
        texto: 'As senhas não coincidem.',
      });
      return;
    }

    travaSenha.current = true;
    setAlterandoSenha(true);
    setFeedbackSenha(null);

    try {
      const { error } = await supabase.auth.updateUser({
        password: novaSenha,
      });

      if (error) throw error;

      setNovaSenha('');
      setConfirmacao('');
      setFeedbackSenha({
        tipo: 'sucesso',
        texto: 'Senha atualizada com sucesso.',
      });
    } catch (falha) {
      setFeedbackSenha({
        tipo: 'erro',
        texto: mensagemErro(falha, 'Não foi possível atualizar a senha.'),
      });
    } finally {
      travaSenha.current = false;
      setAlterandoSenha(false);
    }
  }

  if (carregando || erroCarga) {
    return (
      <main className="mx-auto w-full max-w-6xl px-4 py-8 text-[#EDEDE3]">
        <h1 className="text-2xl font-semibold">Configurações</h1>

        {carregando ? (
          <p role="status" className="mt-4">
            Carregando configurações da empresa…
          </p>
        ) : (
          <div role="alert" className="mt-4 space-y-4">
            <p>{erroCarga}</p>
            <button
              type="button"
              onClick={() => setTentativa((atual) => atual + 1)}
              className="min-h-12 rounded-xl border border-white/20 px-4"
            >
              Tentar novamente
            </button>
          </div>
        )}
      </main>
    );
  }

  return (
    <main
      style={estilo}
      className="min-h-screen min-w-0 bg-[var(--cfg-fundo)] text-[var(--cfg-texto)]"
    >
      <div className="mx-auto w-full max-w-6xl space-y-6 px-4 py-6 sm:px-6 sm:py-8">
        <header className="flex flex-col gap-5 sm:flex-row sm:items-center sm:justify-between">
          <div className="min-w-0">
            <p className="text-xs font-semibold uppercase tracking-[0.18em] text-[var(--cfg-destaque)]">
              Gestão da empresa
            </p>
            <h1
              className="mt-2 text-3xl sm:text-4xl"
              style={{ fontFamily: 'var(--font-fraunces), serif' }}
            >
              Configurações
            </h1>
            <p className="mt-3 max-w-2xl text-sm leading-6 text-[var(--cfg-secundario)]">
              Personalize a aparência e organize as preferências da sua empresa.
            </p>
          </div>

          <Link href="/configuracoes/equipe" className={botao}>
            Gerenciar equipe
          </Link>
        </header>

        <form onSubmit={salvar} className="space-y-6">
          <fieldset disabled={salvando} className="min-w-0 space-y-6">
            <section className={painel} aria-labelledby="titulo-aparencia">
              <h2 id="titulo-aparencia" className="text-lg font-semibold">
                Aparência
              </h2>
              <p className="mt-2 text-sm leading-6 text-[var(--cfg-secundario)]">
                Escolha uma paleta para visualizar nesta página.
                Salve para registrar a preferência da empresa.
              </p>

              <div
                role="group"
                aria-label="Tema da empresa"
                className="mt-5 grid min-w-0 gap-3 sm:grid-cols-2 xl:grid-cols-4"
              >
                {(Object.keys(TEMAS) as Tema[]).map((chave) => {
                  const tema = TEMAS[chave];
                  const selecionado = config.tema === chave;

                  return (
                    <button
                      key={chave}
                      type="button"
                      aria-pressed={selecionado}
                      onClick={() => alterar('tema', chave)}
                      className="min-w-0 rounded-xl border-2 p-3 text-left focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[var(--cfg-destaque)]"
                      style={{
                        backgroundColor: tema.painel,
                        color: tema.texto,
                        borderColor: selecionado
                          ? paleta.destaque
                          : paleta.borda,
                      }}
                    >
                      <span
                        aria-hidden="true"
                        className="flex h-20 items-end gap-2 rounded-lg p-3"
                        style={{ backgroundColor: tema.fundo }}
                      >
                        <span
                          className="h-7 w-1/3 rounded"
                          style={{ backgroundColor: tema.destaque }}
                        />
                        <span
                          className="h-11 flex-1 rounded border"
                          style={{
                            backgroundColor: tema.painel,
                            borderColor: tema.borda,
                          }}
                        />
                      </span>
                      <span className="mt-3 block text-sm font-semibold">
                        {tema.nome}
                      </span>
                      <span
                        className="mt-1 block text-xs leading-5"
                        style={{ color: tema.secundario }}
                      >
                        {tema.descricao}
                      </span>
                      <span className="mt-2 block text-xs font-semibold">
                        {selecionado ? 'Selecionado' : 'Visualizar'}
                      </span>
                    </button>
                  );
                })}
              </div>
            </section>

            <section className={painel} aria-labelledby="titulo-identificacao">
              <h2 id="titulo-identificacao" className="text-lg font-semibold">
                Identificação e referências
              </h2>

              <div className="mt-5 grid min-w-0 gap-5 sm:grid-cols-2">
                <label className="min-w-0 text-sm sm:col-span-2">
                  Nome de exibição
                  <input name="nome_sistema"
                    required
                    minLength={3}
                    maxLength={100}
                    value={config.nome_sistema}
                    onChange={(event) =>
                      alterar('nome_sistema', event.target.value)
                    }
                    className={campo}
                  />
                </label>

                <label className="min-w-0 text-sm">
                  Moeda cadastrada
                  <input name="moeda"
                    readOnly
                    value={config.moeda}
                    className={campo}
                  />
                </label>

                <label className="min-w-0 text-sm">
                  Fuso horário cadastrado
                  <input name="fuso_horario"
                    readOnly
                    value={config.fuso_horario}
                    className={campo}
                  />
                </label>
              </div>

              <p className="mt-3 text-xs leading-6 text-[var(--cfg-secundario)]">
                A operação atual utiliza real brasileiro e horário de Manaus.
                Alterações dessas referências exigem integração com os demais módulos.
              </p>
            </section>

            <section className={painel} aria-labelledby="titulo-reservas">
              <h2 id="titulo-reservas" className="text-lg font-semibold">
                Preferências de reservas
              </h2>
              <p className="mt-2 text-sm leading-6 text-[var(--cfg-secundario)]">
                Valores de referência cadastrados para a operação.
                Salvar aqui não modifica reservas existentes.
              </p>

              <div className="mt-5 grid min-w-0 gap-5 sm:grid-cols-2">
                <label className="min-w-0 text-sm">
                  Sinal de referência (%)
                  <input name="porcentagem_sinal"
                    required
                    type="number"
                    min={0}
                    max={100}
                    step="0.01"
                    value={
                      Number.isFinite(config.porcentagem_sinal)
                        ? config.porcentagem_sinal
                        : ''
                    }
                    onChange={(event) =>
                      alterar(
                        'porcentagem_sinal',
                        event.target.value === ''
                          ? Number.NaN
                          : Number(event.target.value),
                      )
                    }
                    className={campo}
                  />
                </label>

                <label className="min-w-0 text-sm">
                  Antecedência mínima (horas)
                  <input name="antecedencia_minima_horas"
                    required
                    type="number"
                    min={0}
                    step={1}
                    value={
                      Number.isFinite(config.antecedencia_minima_horas)
                        ? config.antecedencia_minima_horas
                        : ''
                    }
                    onChange={(event) =>
                      alterar(
                        'antecedencia_minima_horas',
                        event.target.value === ''
                          ? Number.NaN
                          : Number(event.target.value),
                      )
                    }
                    className={campo}
                  />
                </label>
              </div>

              <label className="mt-5 flex min-h-12 cursor-pointer items-center gap-3 text-sm">
                <input name="permitir_reservas_mesmo_dia"
                  type="checkbox"
                  checked={config.permitir_reservas_mesmo_dia}
                  onChange={(event) =>
                    alterar('permitir_reservas_mesmo_dia', event.target.checked)
                  }
                  className="h-5 w-5 shrink-0 accent-[var(--cfg-destaque)]"
                />
                Permitir reservas para o mesmo dia
              </label>
            </section>

            <section className={painel} aria-labelledby="titulo-comunicacao">
              <h2 id="titulo-comunicacao" className="text-lg font-semibold">
                Preferências de comunicação
              </h2>
              <p className="mt-2 text-sm leading-6 text-[var(--cfg-secundario)]">
                O envio de mensagens depende da integração e dos recursos do plano.
              </p>

              <div className="mt-4 space-y-2">
                <label className="flex min-h-12 cursor-pointer items-center gap-3 text-sm">
                  <input name="enviar_email_confirmacao"
                    type="checkbox"
                    checked={config.enviar_email_confirmacao}
                    onChange={(event) =>
                      alterar('enviar_email_confirmacao', event.target.checked)
                    }
                    className="h-5 w-5 shrink-0 accent-[var(--cfg-destaque)]"
                  />
                  Preferir confirmação por e-mail
                </label>

                <label className="flex min-h-12 cursor-pointer items-center gap-3 text-sm">
                  <input name="enviar_whatsapp_confirmacao"
                    type="checkbox"
                    checked={config.enviar_whatsapp_confirmacao}
                    onChange={(event) =>
                      alterar('enviar_whatsapp_confirmacao', event.target.checked)
                    }
                    className="h-5 w-5 shrink-0 accent-[var(--cfg-destaque)]"
                  />
                  Preferir confirmação por WhatsApp
                </label>
              </div>
            </section>

            <section className={painel} aria-labelledby="titulo-pix">
              <h2 id="titulo-pix" className="text-lg font-semibold">
                Recebimento por Pix
              </h2>
              <label className="mt-4 block min-w-0 text-sm">
                Chave Pix de recebimento
                <input name="chave_api_pix"
                  type="text"
                  autoComplete="off"
                  spellCheck={false}
                  maxLength={200}
                  value={config.chave_api_pix}
                  onChange={(event) =>
                    alterar('chave_api_pix', event.target.value)
                  }
                  className={campo}
                />
              </label>
              <p className="mt-3 text-xs leading-6 text-[var(--cfg-secundario)]">
                Informe a chave de recebimento. Credenciais de APIs de pagamento
                devem ser configuradas no servidor.
              </p>
            </section>
          </fieldset>

          <div
            ref={aviso}
            tabIndex={-1}
            aria-live="polite"
            aria-atomic="true"
            className="outline-none"
          >
            {feedback && (
              <p
                role={feedback.tipo === 'erro' ? 'alert' : 'status'}
                className="rounded-xl border border-[var(--cfg-borda)] p-4 text-sm leading-6"
              >
                {feedback.texto}
              </p>
            )}
          </div>

          <div className="flex flex-col gap-3 sm:flex-row sm:justify-end">
            <button
              type="submit"
              disabled={salvando}
              className={`${botao} border-transparent bg-[var(--cfg-destaque)] text-[var(--cfg-sobre-destaque)]`}
            >
              {salvando ? 'Salvando…' : 'Salvar configurações'}
            </button>
          </div>
        </form>

        <section className={painel} aria-labelledby="titulo-seguranca">
          <h2 id="titulo-seguranca" className="text-lg font-semibold">
            Segurança da sua conta
          </h2>
          <p className="mt-2 text-sm leading-6 text-[var(--cfg-secundario)]">
            A alteração de senha afeta apenas seu acesso pessoal.
          </p>

          <form onSubmit={atualizarSenha} className="mt-5 space-y-5">
            <fieldset
              disabled={alterandoSenha}
              className="grid min-w-0 gap-5 sm:grid-cols-2"
            >
              <label className="min-w-0 text-sm">
                Nova senha
                <input name="nova_senha"
                  required
                  type="password"
                  minLength={8}
                  autoComplete="new-password"
                  value={novaSenha}
                  onChange={(event) => {
                    setNovaSenha(event.target.value);
                    setFeedbackSenha(null);
                  }}
                  className={campo}
                />
              </label>

              <label className="min-w-0 text-sm">
                Confirmar nova senha
                <input name="confirmacao_senha"
                  required
                  type="password"
                  minLength={8}
                  autoComplete="new-password"
                  value={confirmacao}
                  onChange={(event) => {
                    setConfirmacao(event.target.value);
                    setFeedbackSenha(null);
                  }}
                  className={campo}
                />
              </label>
            </fieldset>

            {feedbackSenha && (
              <p
                role={feedbackSenha.tipo === 'erro' ? 'alert' : 'status'}
                className="text-sm leading-6"
              >
                {feedbackSenha.texto}
              </p>
            )}

            <button
              type="submit"
              disabled={alterandoSenha}
              className={`${botao} w-full sm:w-auto`}
            >
              {alterandoSenha ? 'Atualizando…' : 'Atualizar minha senha'}
            </button>
          </form>
        </section>
      </div>
    </main>
  );
}