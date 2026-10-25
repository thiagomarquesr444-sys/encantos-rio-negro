'use client';

import { useEffect, useRef, useState, type FormEvent } from 'react';
import Link from 'next/link';
import { supabase } from '@/lib/supabase';

type Props = {
  usuarioId: string;
};

export default function CadastroOperadoraERN({ usuarioId }: Props) {
  const [nome, setNome] = useState('');
  const [empresa, setEmpresa] = useState('');
  const [cidade, setCidade] = useState('');
  const [erro, setErro] = useState('');
  const [ocupado, setOcupado] = useState(false);
  const trava = useRef(false);

  useEffect(() => {
    let ativo = true;

    void supabase.auth.getUser().then(({ data, error }) => {
      if (!ativo || error || data.user?.id !== usuarioId) return;

      const sugestao =
        data.user.user_metadata?.full_name ??
        data.user.user_metadata?.name;

      if (typeof sugestao === 'string') {
        setNome((atual) => atual || sugestao.slice(0, 100));
      }
    }).catch(() => {
      // O preenchimento manual continua disponível.
    });

    return () => {
      ativo = false;
    };
  }, [usuarioId]);

  async function cadastrar(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (trava.current) return;

    trava.current = true;
    setOcupado(true);
    setErro('');
    let navegando = false;

    try {
      const { data: identidade, error: erroIdentidade } =
        await supabase.auth.getUser();

      if (
        erroIdentidade ||
        !identidade.user ||
        identidade.user.is_anonymous ||
        identidade.user.id !== usuarioId
      ) {
        throw new Error(
          'Sua sessão mudou. Recarregue a página e entre novamente.',
        );
      }

      const { data, error } = await supabase.rpc(
        'ern_criar_minha_operadora',
        {
          p_nome_empresa: empresa.trim(),
          p_nome_responsavel: nome.trim(),
          p_cidade: cidade.trim(),
        },
      );

      if (error) {
        if (error.code === 'P0001' || error.code === '42501') {
          throw new Error(error.message);
        }

        throw new Error(
          'Não foi possível confirmar o cadastro. Tente novamente com esta mesma conta; se a empresa já tiver sido criada, ela será recuperada.',
        );
      }

      if (
        !data ||
        typeof data !== 'object' ||
        data.ok !== true ||
        typeof data.empresa_id !== 'string'
      ) {
        throw new Error(
          'Não foi possível confirmar a conclusão. Recarregue a página para consultar seu vínculo.',
        );
      }

      // Destino fixo: não utiliza URL recebida do banco.
      window.location.replace('/dashboard');
      navegando = true;
    } catch (falha) {
      setErro(
        falha instanceof Error
          ? falha.message
          : 'Não foi possível concluir. Confira sua conexão e tente novamente.',
      );
    } finally {
      if (!navegando) {
        trava.current = false;
        setOcupado(false);
      }
    }
  }

  const campo =
    'mt-2 min-h-12 w-full min-w-0 rounded-xl border border-white/20 ' +
    'bg-[#07110E] px-4 py-3 text-base text-[#EDEDE3] ' +
    'focus-visible:outline-2 focus-visible:outline-offset-2 ' +
    'focus-visible:outline-[#F4C77E] disabled:opacity-60';

  return (
    <div className="mt-6 min-w-0">
      <h2 className="text-xl font-semibold text-[#F4C77E]">
        Cadastre sua operadora
      </h2>

      <p className="mt-3 text-sm leading-7 text-[#EDEDE3]/80">
        Crie o espaço da sua empresa na ERN. Você será o administrador
        e poderá convidar sua equipe conforme os limites do plano.
        O cadastro começa no plano gratuito.
      </p>

      <form onSubmit={cadastrar} className="mt-6 space-y-5">
        <fieldset disabled={ocupado} className="min-w-0 space-y-5">
          <legend className="sr-only">Dados iniciais da operadora</legend>

          <label className="block text-sm font-medium">
            Seu nome
            <input
              name="responsavel"
              autoComplete="name"
              required
              minLength={3}
              maxLength={100}
              value={nome}
              onChange={(event) => setNome(event.target.value)}
              className={campo}
            />
          </label>

          <label className="block text-sm font-medium">
            Nome da empresa
            <input
              name="empresa"
              autoComplete="organization"
              required
              minLength={3}
              maxLength={120}
              value={empresa}
              onChange={(event) => setEmpresa(event.target.value)}
              className={campo}
            />
          </label>

          <label className="block text-sm font-medium">
            Cidade e estado
            <input
              name="cidade"
              placeholder="Ex.: Barcelos/AM"
              required
              minLength={2}
              maxLength={100}
              value={cidade}
              onChange={(event) => setCidade(event.target.value)}
              className={campo}
            />
          </label>

          <p className="text-xs leading-6 text-[#EDEDE3]/70">
            Ao criar a empresa, você declara estar autorizado a
            administrá-la e concorda com os{' '}
            <Link href="/termos" className="underline underline-offset-4">
              Termos de Uso
            </Link>
            . Consulte nossa{' '}
            <Link href="/privacidade" className="underline underline-offset-4">
              Política de Privacidade
            </Link>
            .
          </p>

          <button
            type="submit"
            className="min-h-12 w-full rounded-xl bg-[#E3A144] px-5 py-3 font-bold text-[#07130F] hover:bg-[#F0B35C] focus-visible:outline-2 focus-visible:outline-offset-4 focus-visible:outline-[#F4C77E] disabled:cursor-wait disabled:opacity-60"
          >
            {ocupado ? 'Preparando sua empresa…' : 'Criar minha operadora'}
          </button>
        </fieldset>

        {ocupado && (
          <p role="status" className="text-sm text-[#EDEDE3]/80">
            Aguarde a confirmação do cadastro.
          </p>
        )}

        {erro && (
          <p
            role="alert"
            className="rounded-xl border border-red-400/30 bg-red-500/10 p-4 text-sm leading-6 text-red-200"
          >
            {erro}
          </p>
        )}
      </form>

      <p className="mt-6 border-t border-white/10 pt-5 text-sm leading-7 text-[#EDEDE3]/70">
        Vai trabalhar em uma empresa já cadastrada? Peça um convite
        ao administrador e utilize o e-mail convidado.
      </p>
    </div>
  );
}