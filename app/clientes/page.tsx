'use client';
import './clientes-premium.css';

import { useEffect, useMemo, useRef, useState } from 'react';
import Link from 'next/link';
import { supabase } from '@/lib/supabase';
import { SeletorPeriodoMensalERN } from '@/app/components/PeriodoMensalERN';
import { dataNoPeriodoERN, mesAtualERN, periodoDaURLERN, type PeriodoMensalERN } from '@/lib/periodoMensalERN';
import {
  BuscaEDA,
  CabecalhoEDA,
  ChipsEDA,
  DadoEDA,
  PaginaEDA,
  PainelLateralEDA,
  PillEDA,
  VazioEDA,
} from '@/app/components/PadraoPaginaEDA';

type Cliente = {
  id: string;
  empresa_id: string;
  nome: string;
  documento: string | null;
  telefone: string | null;
  email: string | null;
  cidade: string | null;
  nacionalidade: string | null;
  situacao: string | null;
  observacoes: string | null;
  created_at: string | null;
};

type Contexto = {
  usuarioId: string;
  empresaId: string;
};

const normalizar = (valor: string) =>
  valor.normalize('NFD').replace(/[\u0300-\u036f]/g, '')
    .trim().toLowerCase();

// ERN_PADRAO_PAGINAS_EDA_V1: link direto para conversar com o cliente.
function linkWhatsApp(telefone: string | null): string | null {
  const digitos = (telefone ?? '').replace(/\D/g, '');
  if (digitos.length < 10) return null;
  const completo = digitos.length <= 11 ? `55${digitos}` : digitos;
  return `https://wa.me/${completo}`;
}

async function consultarContexto(): Promise<Contexto> {
  const { data: auth, error: authError } =
    await supabase.auth.getUser();

  if (authError || !auth.user) {
    throw new Error('Sua sessão expirou. Entre novamente.');
  }

  const { data: perfil, error: perfilError } = await supabase
    .from('perfis')
    .select('empresa_id')
    .eq('id', auth.user.id)
    .single();

  if (perfilError || !perfil?.empresa_id) {
    throw new Error('Não foi possível identificar sua empresa.');
  }

  return {
    usuarioId: auth.user.id,
    empresaId: String(perfil.empresa_id),
  };
}

function situacaoCliente(cliente: Cliente) {
  const valor = normalizar(cliente.situacao ?? '');
  if (!valor || valor === 'ativo') return 'Ativo';
  if (valor === 'inativo') return 'Inativo';
  return cliente.situacao?.trim() || 'Não informada';
}

export default function ClientesPage() {
  const [clientes, setClientes] = useState<Cliente[]>([]);
  const [contexto, setContexto] = useState<Contexto | null>(null);
  const [carregando, setCarregando] = useState(true);
  const [erro, setErro] = useState('');
  const [feedback, setFeedback] = useState('');
  const [tentativa, setTentativa] = useState(0);
  const [busca, setBusca] = useState('');
  const [situacao, setSituacao] = useState('');
  const [selecionado, setSelecionado] = useState<Cliente | null>(null);
  const [modo, setModo] = useState<'detalhes' | 'excluir'>('detalhes');
  const [excluindo, setExcluindo] = useState(false);
  const [erroExclusao, setErroExclusao] = useState('');

  const travaExclusao = useRef(false);

  useEffect(() => {
    let ativo = true;

    async function carregar() {
      setCarregando(true);
      setErro('');
      setClientes([]);
      setContexto(null);

      try {
        const atual = await consultarContexto();
        const lista: Cliente[] = [];
        let esperado: number | null = null;

        for (let inicio = 0; inicio < 10000; inicio += 200) {
          if (!ativo) return;

          const { data, count, error } = await supabase
            .from('clientes')
            .select(
              'id,empresa_id,nome,documento,telefone,email,cidade,nacionalidade,situacao,observacoes,created_at',
              { count: 'exact' },
            )
            .eq('empresa_id', atual.empresaId)
            .order('created_at', {
              ascending: false,
              nullsFirst: false,
            })
            .order('id', { ascending: true })
            .range(inicio, inicio + 199);

          if (error) {
            throw new Error('Não foi possível consultar os clientes.');
          }

          if (count === null || count > 10000) {
            throw new Error(
              'Este volume exige busca no servidor. A consulta foi interrompida para evitar totais parciais.',
            );
          }

          if (esperado !== null && esperado !== count) {
            throw new Error(
              'Os cadastros mudaram durante a consulta. Atualize os dados.',
            );
          }

          esperado = count;
          lista.push(...((data ?? []) as Cliente[]));

          if (lista.length >= count) break;

          if (!data?.length) {
            throw new Error('A consulta ficou incompleta. Tente novamente.');
          }
        }

        if (
          lista.length !== esperado ||
          lista.some((item) =>
            !item.id || item.empresa_id !== atual.empresaId
          ) ||
          new Set(lista.map((item) => item.id)).size !== lista.length
        ) {
          throw new Error('Não foi possível obter uma listagem consistente.');
        }

        const confirmado = await consultarContexto();

        if (
          confirmado.usuarioId !== atual.usuarioId ||
          confirmado.empresaId !== atual.empresaId
        ) {
          throw new Error('A sessão mudou. Atualize a página.');
        }

        if (ativo) {
          setClientes(lista);
          setContexto(atual);
        }
      } catch (falha) {
        if (ativo) {
          setErro(
            falha instanceof Error
              ? falha.message
              : 'Não foi possível carregar os clientes.',
          );
        }
      } finally {
        if (ativo) setCarregando(false);
      }
    }

    void carregar();
    return () => { ativo = false; };
  }, [tentativa]);

  // ERN_PERIODO_MENSAL_V1: abre nos cadastros do mês atual; a busca procura em todo o histórico.
  const [periodo, setPeriodo] = useState<PeriodoMensalERN>(mesAtualERN);
  useEffect(() => { setPeriodo(periodoDaURLERN(new URLSearchParams(window.location.search).get('mes'))); }, []);

  const filtrados = useMemo(() => {
    const termo = normalizar(busca);

    return clientes.filter((cliente) => {
      if (!termo && !dataNoPeriodoERN(cliente.created_at, periodo)) return false;
      if (situacao && situacaoCliente(cliente) !== situacao) {
        return false;
      }

      return !termo || normalizar([
        cliente.nome,
        cliente.documento,
        cliente.telefone,
        cliente.email,
        cliente.cidade,
        cliente.nacionalidade,
        situacaoCliente(cliente),
      ].filter(Boolean).join(' ')).includes(termo);
    });
  }, [periodo, clientes, busca, situacao]);

  const ativos = clientes.filter(
    (item) => situacaoCliente(item) === 'Ativo',
  ).length;

  const inativos = clientes.filter(
    (item) => situacaoCliente(item) === 'Inativo',
  ).length;

  function abrir(cliente: Cliente, proximoModo: typeof modo) {
    setErroExclusao('');
    setModo(proximoModo);
    setSelecionado(cliente);
  }

  function fechar() {
    if (travaExclusao.current) return;
    setSelecionado(null);
    setErroExclusao('');
  }

  async function excluir() {
    if (!selecionado || !contexto || travaExclusao.current) return;

    travaExclusao.current = true;
    setExcluindo(true);
    setErroExclusao('');

    try {
      const atual = await consultarContexto();

      if (
        atual.usuarioId !== contexto.usuarioId ||
        atual.empresaId !== contexto.empresaId ||
        selecionado.empresa_id !== atual.empresaId
      ) {
        throw new Error('A sessão mudou. Feche esta janela e atualize a página.');
      }

      const { data, error } = await supabase
        .from('clientes')
        .delete()
        .eq('id', selecionado.id)
        .eq('empresa_id', atual.empresaId)
        .select('id');

      if (error) {
        if (error.code === '23503') {
          throw new Error(
            'Este cliente possui vínculos que impedem a exclusão. Considere inativar o cadastro.',
          );
        }

        throw new Error(
          'A exclusão não foi confirmada. Feche esta janela e atualize a listagem antes de tentar novamente.',
        );
      }

      if (
        data?.length !== 1 ||
        data[0].id !== selecionado.id
      ) {
        throw new Error(
          'Nenhum registro foi confirmado como excluído. Atualize a listagem para conferir suas permissões e o cadastro.',
        );
      }

      setClientes((atuais) =>
        atuais.filter((item) => item.id !== selecionado.id),
      );
      setFeedback('Cliente excluído. As reservas existentes foram preservadas.');
        setSelecionado(null);
    } catch (falha) {
      setErroExclusao(
        falha instanceof Error
          ? falha.message
          : 'Não foi possível confirmar a exclusão. Atualize a listagem.',
      );
    } finally {
      travaExclusao.current = false;
      setExcluindo(false);
    }
  }

  const tomSituacao = (cliente: Cliente) => {
    const valor = situacaoCliente(cliente);
    return valor === 'Ativo' ? 'ok' : valor === 'Inativo' ? 'nt' : 'at';
  };

  const whatsSelecionado = selecionado ? linkWhatsApp(selecionado.telefone) : null;

  return (
    <PaginaEDA>
      {feedback && <div role="status" className="eda-pg-toast">{feedback}</div>}

      <div className="eda-pg-miolo">
        <CabecalhoEDA
          etiqueta="Operação"
          titulo="Clientes"
          resumo={carregando
            ? 'Carregando clientes…'
            : erro
              ? 'Listagem indisponível no momento.'
              : <><b>{clientes.length}</b> {clientes.length === 1 ? 'viajante cadastrado' : 'viajantes cadastrados'} · <b>{ativos}</b> {ativos === 1 ? 'ativo' : 'ativos'}</>}
          acoes={<>
            <button
              type="button"
              disabled={carregando}
              className="eda-pg-bt"
              onClick={() => { setFeedback(''); setTentativa((atual) => atual + 1); }}
            >
              Atualizar
            </button>
            <Link href="/clientes/novo" className="eda-pg-bt eda-pg-bt-ouro">+ Novo cliente</Link>
          </>}
        />

        {erro && (
          <div role="alert" className="eda-pg-aviso eda-pg-aviso-er">
            <p style={{ margin: 0 }}>{erro}</p>
            <button type="button" className="eda-pg-bt eda-pg-bt-p" style={{ marginTop: 10 }} onClick={() => setTentativa((atual) => atual + 1)}>
              Tentar novamente
            </button>
          </div>
        )}

        <SeletorPeriodoMensalERN valor={periodo} aoMudar={setPeriodo} rotulo="Período de cadastro" total={clientes.filter((x) => dataNoPeriodoERN(x.created_at, periodo)).length} />

        <section aria-label="Filtros dos clientes" className="eda-pg-filtros">
          <BuscaEDA id="cliente-busca" rotulo="Buscar cliente" valor={busca} aoMudar={setBusca} placeholder="Nome, documento, telefone, e-mail ou cidade" />
          <ChipsEDA
            rotulo="Filtrar por situação"
            valor={situacao}
            aoMudar={setSituacao}
            opcoes={[
              { valor: '', rotulo: 'Todos', qtd: clientes.length },
              { valor: 'Ativo', rotulo: 'Ativos', qtd: ativos },
              { valor: 'Inativo', rotulo: 'Inativos', qtd: inativos },
            ]}
          />
        </section>

        <section aria-busy={carregando} aria-labelledby="carteira-clientes" className="eda-pg-tabela-caixa">
          <div className="eda-pg-tabela-topo">
            <span id="carteira-clientes" role="status">
              {carregando || erro ? '—' : <>Mostrando <b>{filtrados.length}</b> de {clientes.length} {clientes.length === 1 ? 'cliente' : 'clientes'}</>}
            </span>
            <span>Clique num cliente para ver o cadastro</span>
          </div>

          {carregando ? (
            <p role="status" className="eda-pg-estado">Carregando clientes…</p>
          ) : erro ? (
            <p className="eda-pg-estado">A listagem está indisponível. Atualize os dados.</p>
          ) : filtrados.length === 0 ? (
            clientes.length === 0 ? (
              <VazioEDA
                titulo="Nenhum cliente ainda"
                texto="Cadastre o primeiro viajante para usar nas reservas, vouchers e no financeiro."
                acao={<Link href="/clientes/novo" className="eda-pg-bt eda-pg-bt-ouro">+ Novo cliente</Link>}
              />
            ) : (
              <VazioEDA
                titulo="Nenhum cliente encontrado"
                texto="Ajuste a busca ou a situação selecionada."
                acao={<button type="button" className="eda-pg-bt" onClick={() => { setBusca(''); setSituacao(''); }}>Limpar filtros</button>}
              />
            )
          ) : (
            <>
              <div className="eda-pg-cartoes">
                {filtrados.map((cliente) => (
                  <button key={cliente.id} type="button" className="eda-pg-cartao" onClick={() => abrir(cliente, 'detalhes')}>
                    <span className="eda-pg-cartao-topo">
                      <span style={{ minWidth: 0 }}>
                        <b>{cliente.nome}</b>
                        <small>{[cliente.cidade, cliente.nacionalidade].filter(Boolean).join(' · ') || 'Cidade não informada'}</small>
                      </span>
                      <PillEDA tom={tomSituacao(cliente)}>{situacaoCliente(cliente)}</PillEDA>
                    </span>
                    <span className="eda-pg-cartao-info">
                      <span>{cliente.telefone || 'Sem telefone'}</span>
                      {cliente.email && <span style={{ overflowWrap: 'anywhere' }}>{cliente.email}</span>}
                    </span>
                  </button>
                ))}
              </div>

              <div className="eda-pg-rolagem">
                <table className="eda-pg-tabela">
                  <caption className="eda-pg-sr">Clientes da empresa autenticada</caption>
                  <thead>
                    <tr>
                      {['Cliente', 'Documento', 'Telefone', 'E-mail', 'Cidade', 'Situação', ''].map((nome, i) => (
                        <th key={nome || i} scope="col">{nome || <span className="eda-pg-sr">Ações</span>}</th>
                      ))}
                    </tr>
                  </thead>
                  <tbody>
                    {filtrados.map((cliente) => (
                      <tr key={cliente.id} aria-selected={selecionado?.id === cliente.id}>
                        <td style={{ minWidth: 200, maxWidth: 280 }}>
                          <button type="button" className="eda-pg-linha-bt" onClick={() => abrir(cliente, 'detalhes')}>
                            <b>{cliente.nome}</b>
                            {cliente.nacionalidade && <small>{cliente.nacionalidade}</small>}
                          </button>
                        </td>
                        <td className="eda-pg-mut">{cliente.documento || '—'}</td>
                        <td style={{ whiteSpace: 'nowrap' }}>{cliente.telefone || '—'}</td>
                        <td className="eda-pg-mut" style={{ maxWidth: 240, overflowWrap: 'anywhere' }}>{cliente.email || '—'}</td>
                        <td className="eda-pg-mut">{cliente.cidade || '—'}</td>
                        <td><PillEDA tom={tomSituacao(cliente)}>{situacaoCliente(cliente)}</PillEDA></td>
                        <td>
                          <div className="eda-pg-acoes-linha">
                            <button type="button" className="eda-pg-bt eda-pg-bt-p" aria-label={`Visualizar ${cliente.nome}`} onClick={() => abrir(cliente, 'detalhes')}>Ver</button>
                            <Link href={`/clientes/editar/${cliente.id}`} className="eda-pg-bt eda-pg-bt-p" aria-label={`Editar ${cliente.nome}`}>Editar</Link>
                          </div>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </>
          )}
        </section>
      </div>

      {selecionado && (
        <PainelLateralEDA
          etiqueta={modo === 'excluir' ? 'Excluir cliente' : 'Cliente'}
          titulo={modo === 'excluir' ? 'Excluir este cliente?' : selecionado.nome}
          subtitulo={modo === 'excluir' ? selecionado.nome : [selecionado.cidade, selecionado.nacionalidade].filter(Boolean).join(' · ') || undefined}
          bloqueado={excluindo}
          aoFechar={fechar}
          rodape={modo === 'detalhes' ? (
            <>
              <Link href={`/clientes/editar/${selecionado.id}`} className="eda-pg-bt eda-pg-bt-ouro">Editar cliente</Link>
              <button type="button" className="eda-pg-bt eda-pg-bt-perigo" onClick={() => abrir(selecionado, 'excluir')}>Excluir</button>
            </>
          ) : (
            <>
              <button type="button" className="eda-pg-bt" disabled={excluindo} onClick={() => abrir(selecionado, 'detalhes')}>Voltar</button>
              <button type="button" className="eda-pg-bt eda-pg-bt-perigo" disabled={excluindo} onClick={() => void excluir()}>
                {excluindo ? 'Excluindo…' : 'Confirmar exclusão'}
              </button>
            </>
          )}
        >
          {modo === 'detalhes' ? (
            <>
              <div className="eda-pg-pills" style={{ marginTop: 0 }}>
                <PillEDA tom={tomSituacao(selecionado)}>{situacaoCliente(selecionado)}</PillEDA>
              </div>

              <div className="eda-pg-bloco" style={{ marginTop: 16 }}>
                <p className="eda-pg-bloco-titulo">Contato</p>
                <dl className="eda-pg-dados">
                  <DadoEDA rotulo="Telefone / WhatsApp">{selecionado.telefone || 'Não informado'}</DadoEDA>
                  <DadoEDA rotulo="E-mail">{selecionado.email || 'Não informado'}</DadoEDA>
                </dl>
                {(whatsSelecionado || selecionado.email) && (
                  <div className="eda-pg-atalhos" style={{ marginTop: 12 }}>
                    {whatsSelecionado && <a href={whatsSelecionado} target="_blank" rel="noopener noreferrer" className="eda-pg-bt eda-pg-bt-p">Abrir WhatsApp ↗</a>}
                    {selecionado.email && <a href={`mailto:${selecionado.email}`} className="eda-pg-bt eda-pg-bt-p">Enviar e-mail</a>}
                  </div>
                )}
              </div>

              <div className="eda-pg-bloco">
                <p className="eda-pg-bloco-titulo">Cadastro</p>
                <dl className="eda-pg-dados">
                  <DadoEDA rotulo="Documento">{selecionado.documento || 'Não informado'}</DadoEDA>
                  <DadoEDA rotulo="Nacionalidade">{selecionado.nacionalidade || 'Não informada'}</DadoEDA>
                  <DadoEDA rotulo="Cidade">{selecionado.cidade || 'Não informada'}</DadoEDA>
                  <DadoEDA rotulo="Cadastrado em">{selecionado.created_at ? new Date(selecionado.created_at).toLocaleDateString('pt-BR', { timeZone: 'America/Manaus' }) : '—'}</DadoEDA>
                  <DadoEDA rotulo="Observações" largo>{selecionado.observacoes || 'Nenhuma observação registrada.'}</DadoEDA>
                </dl>
              </div>

              <div className="eda-pg-bloco">
                <p className="eda-pg-bloco-titulo">Atalhos</p>
                <div className="eda-pg-atalhos">
                  <Link href="/reservas/nova" className="eda-pg-bt eda-pg-bt-p">Nova reserva</Link>
                  <Link href={`/reservas`} className="eda-pg-bt eda-pg-bt-p">Ver reservas</Link>
                </div>
              </div>
            </>
          ) : (
            <>
              <p className="eda-pg-texto-mut">
                O cadastro será removido permanentemente. As reservas existentes serão mantidas, mas perderão o vínculo com este cliente. Para preservar o cadastro e seus vínculos, você pode editar a situação para Inativo.
              </p>
              {erroExclusao && <p role="alert" className="eda-pg-aviso eda-pg-aviso-er">{erroExclusao}</p>}
            </>
          )}
        </PainelLateralEDA>
      )}
    </PaginaEDA>
  );
}
