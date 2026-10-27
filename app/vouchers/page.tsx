'use client';

import React, {
  useCallback,
  useEffect,
  useMemo,
  useRef,
  useState,
} from 'react';
import Link from 'next/link';
import { baixarDocumentoPremiumERN } from '@/lib/documentosPremiumERN';
import { consultarIdentificacaoEmpresaERN } from '@/lib/identificacaoEmpresaERN';
import { isSupabaseConfigured, supabase } from '@/lib/supabase';
import { reservaOperacionalERN } from '@/lib/reservasStatusERN';

type StatusVoucher = 'Ativo' | 'Utilizado' | 'Cancelado';
type StatusExibido = StatusVoucher | 'Desconhecido';
type FiltroStatus = '' | StatusExibido | 'Expirado';

interface Voucher {
  id: string;
  empresa_id: string | null;
  created_at: string | null;
  codigo: string;
  reserva_id: string | null;
  status: string | null;
  data_emissao: string | null;
  cliente_id: string | null;
  cliente_nome: string | null;
  passeio_id: string | null;
  passeio_nome: string | null;
  valor: number | string | null;
  validade: string | null;
  quantidade_pessoas: number | null;
  data_passeio: string | null;
  horario_passeio: string | null;
}

interface Opcao {
  id: string;
  nome: string | null;
}

interface Edicao {
  codigo: string;
  clienteId: string;
  passeioId: string;
  valor: string;
  validade: string;
  status: StatusVoucher | '';
}

type ModalAberto = {
  tipo: 'ver' | 'editar' | 'excluir';
  item: Voucher;
} | null;

const buttonClass =
  'inline-flex min-h-11 items-center justify-center rounded-xl border border-white/15 px-4 py-2 text-sm font-medium text-[#D6E2D9] transition hover:bg-white/5 disabled:cursor-not-allowed disabled:opacity-50';

const inputClass =
  'min-h-12 w-full min-w-0 rounded-xl border border-white/15 bg-[#07110E] px-4 py-3 text-sm text-[#EDEDE3] outline-none placeholder:text-[#B4C8BB]/60 focus:border-[#E3A144] disabled:opacity-60';

const labelClass = 'mb-2 block text-sm font-medium text-[#C5D4CA]';

const headingStyle = {
  fontFamily: 'var(--font-fraunces), serif',
};

function normalizar(valor: string): string {
  return valor
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .trim()
    .toLowerCase();
}

function obterStatus(valor: string | null): StatusExibido {
  const status = normalizar(valor ?? '');

  if (status === 'ativo' || status === 'valido') return 'Ativo';
  if (status === 'utilizado') return 'Utilizado';
  if (status === 'cancelado') return 'Cancelado';

  return 'Desconhecido';
}

function apenasData(valor?: string | null): string {
  return valor?.split('T')[0] ?? '';
}

function dataValida(valor: string): boolean {
  if (!/^\d{4}-\d{2}-\d{2}$/.test(valor)) return false;

  const data = new Date(`${valor}T12:00:00Z`);

  return (
    Number.isFinite(data.getTime()) &&
    data.toISOString().slice(0, 10) === valor
  );
}

function hojeManaus(): string {
  const partes = new Intl.DateTimeFormat('en-US', {
    timeZone: 'America/Manaus',
    year: 'numeric',
    month: '2-digit',
    day: '2-digit',
  }).formatToParts(new Date());

  const obter = (tipo: string) =>
    partes.find((parte) => parte.type === tipo)?.value ?? '';

  return `${obter('year')}-${obter('month')}-${obter('day')}`;
}

function formatarData(valor?: string | null): string {
  const data = apenasData(valor);
  if (!data) return 'Não informada';
  if (!dataValida(data)) return 'Data inválida';

  const [ano, mes, dia] = data.split('-');
  return `${dia}/${mes}/${ano}`;
}

function formatarEmissao(valor: string | null): string {
  if (!valor) return 'Não informada';

  const data = new Date(valor);
  if (!Number.isFinite(data.getTime())) return 'Data inválida';

  return new Intl.DateTimeFormat('pt-BR', {
    timeZone: 'America/Manaus',
    dateStyle: 'short',
    timeStyle: 'short',
  }).format(data);
}

function expirado(item: Voucher, hoje: string): boolean {
  const validade = apenasData(item.validade);

  return (
    obterStatus(item.status) === 'Ativo' &&
    dataValida(validade) &&
    validade < hoje
  );
}

// A coluna numeric do banco retorna número ou texto decimal sem milhar.
function valorDoBanco(valor: Voucher['valor']): number | null {
  if (valor === null || valor === '') return null;

  const numero = typeof valor === 'number' ? valor : Number(valor);

  return Number.isFinite(numero) ? numero : null;
}

function moeda(valor: number | null): string {
  if (valor === null) return 'Não informado';

  return valor.toLocaleString('pt-BR', {
    style: 'currency',
    currency: 'BRL',
  });
}

function valorDoCampo(entrada: string): number | null {
  let valor = entrada.trim().replace(/^R\$\s*/i, '').replace(/\s/g, '');

  if (!valor) return null;

  if (valor.includes(',')) {
    if (!/^(?:\d+|\d{1,3}(?:\.\d{3})+),\d{1,2}$/.test(valor)) {
      return null;
    }
    valor = valor.replace(/\./g, '').replace(',', '.');
  } else if (/^\d{1,3}(?:\.\d{3})+$/.test(valor)) {
    valor = valor.replace(/\./g, '');
  } else if (!/^\d+(?:\.\d{1,2})?$/.test(valor)) {
    return null;
  }

  const numero = Number(valor);

  if (
    !Number.isFinite(numero) ||
    !Number.isSafeInteger(Math.round(numero * 100))
  ) {
    return null;
  }

  return numero;
}

function erroTexto(erro: unknown, padrao: string): string {
  if (erro instanceof Error) return erro.message;

  if (
    typeof erro === 'object' &&
    erro !== null &&
    'message' in erro &&
    typeof erro.message === 'string'
  ) {
    return erro.message;
  }

  return padrao;
}

async function obterEmpresa(): Promise<string> {
  const { data: auth, error: erroAuth } = await supabase.auth.getUser();

  if (erroAuth || !auth.user) {
    throw new Error('Sua sessão não está disponível. Entre novamente.');
  }

  const { data: perfil, error: erroPerfil } = await supabase
    .from('perfis')
    .select('empresa_id')
    .eq('id', auth.user.id)
    .single();

  if (erroPerfil || !perfil?.empresa_id) {
    throw new Error('Não foi possível identificar sua empresa.');
  }

  return String(perfil.empresa_id);
}

async function consultarTabela<T extends { id: string }>(
  tabela: 'vouchers' | 'clientes' | 'passeios',
  empresaId: string
): Promise<T[]> {
  const registros: T[] = [];
  let total: number | null = null;
  const limite = 10000;
  const tamanho = 200;

  for (let inicio = 0; inicio < limite; inicio += tamanho) {
    const { data, error, count } = await supabase
      .from(tabela)
      .select(tabela === 'vouchers' ? '*' : 'id, nome', {
        count: 'exact',
      })
      .eq('empresa_id', empresaId)
      .order('id', { ascending: true })
      .range(inicio, inicio + tamanho - 1);

    if (error) throw error;

    if (count === null || count > limite) {
      throw new Error(
        `A consulta de ${tabela} exige filtros no servidor para evitar resultados parciais.`
      );
    }

    if (total !== null && total !== count) {
      throw new Error(
        `Os registros de ${tabela} mudaram durante a consulta. Atualize a página.`
      );
    }

    total = count;

    const pagina = (data ?? []) as unknown as T[];
    registros.push(...pagina);

    if (registros.length >= count) break;

    if (!pagina.length) {
      throw new Error(`A consulta de ${tabela} ficou incompleta.`);
    }
  }

  if (
    registros.length !== total ||
    registros.some((item) => !item.id) ||
    new Set(registros.map((item) => item.id)).size !== registros.length
  ) {
    throw new Error(`Não foi possível carregar ${tabela} de forma consistente.`);
  }

  return registros;
}

function Modal({
  titulo,
  bloqueado,
  aoFechar,
  children,
}: {
  titulo: string;
  bloqueado: boolean;
  aoFechar: () => void;
  children: React.ReactNode;
}) {
  const tituloId = React.useId();
  const container = useRef<HTMLDivElement>(null);
  const fecharRef = useRef(aoFechar);
  const bloqueadoRef = useRef(bloqueado);

  fecharRef.current = aoFechar;
  bloqueadoRef.current = bloqueado;

  useEffect(() => {
    const anterior = document.activeElement as HTMLElement | null;
    const overflow = document.body.style.overflow;

    document.body.style.overflow = 'hidden';
    container.current?.focus();

    function teclado(event: KeyboardEvent) {
      if (event.key === 'Escape') {
        event.preventDefault();
        if (!bloqueadoRef.current) fecharRef.current();
      }

      if (event.key !== 'Tab' || !container.current) return;

      const elementos = Array.from(
        container.current.querySelectorAll<HTMLElement>(
          'button:not([disabled]), a[href], input:not([disabled]), select:not([disabled]), [tabindex="0"]'
        )
      ).filter((elemento) => elemento.getClientRects().length > 0);

      const primeiro = elementos[0];
      const ultimo = elementos[elementos.length - 1];

      if (!primeiro || !ultimo) {
        event.preventDefault();
        container.current.focus();
        return;
      }

      if (
        event.shiftKey &&
        (document.activeElement === primeiro ||
          document.activeElement === container.current)
      ) {
        event.preventDefault();
        ultimo.focus();
      } else if (
        !event.shiftKey &&
        (document.activeElement === ultimo ||
          document.activeElement === container.current)
      ) {
        event.preventDefault();
        primeiro.focus();
      }
    }

    document.addEventListener('keydown', teclado);

    return () => {
      document.body.style.overflow = overflow;
      document.removeEventListener('keydown', teclado);
      anterior?.focus();
    };
  }, []);

  return (
    <div className="fixed inset-0 z-[80] flex items-center justify-center bg-black/75 p-3 backdrop-blur-sm sm:p-5">
      <div
        ref={container}
        role="dialog"
        aria-modal="true"
        aria-labelledby={tituloId}
        aria-busy={bloqueado}
        tabIndex={-1}
        className="max-h-[90dvh] w-full max-w-[720px] overflow-y-auto rounded-2xl border border-white/15 bg-[#091510] shadow-2xl outline-none"
      >
        <div className="flex items-start justify-between gap-4 border-b border-white/10 p-5">
          <h2 id={tituloId} className="break-words text-2xl" style={headingStyle}>
            {titulo}
          </h2>
          <button
            type="button"
            aria-label="Fechar janela"
            disabled={bloqueado}
            onClick={aoFechar}
            className={`${buttonClass} shrink-0`}
          >
            ✕
          </button>
        </div>
        {children}
      </div>
    </div>
  );
}

export default function VouchersPage() {
  const [vouchers, setVouchers] = useState<Voucher[]>([]);
  const [clientes, setClientes] = useState<Opcao[]>([]);
  const [passeios, setPasseios] = useState<Opcao[]>([]);

  const [carregando, setCarregando] = useState(true);
  const [erroConsulta, setErroConsulta] = useState<string | null>(null);
  const [erroAuxiliares, setErroAuxiliares] = useState<string | null>(null);
  const [erroModal, setErroModal] = useState<string | null>(null);
  const [sucesso, setSucesso] = useState<string | null>(null);
  const [erroPDF, setErroPDF] = useState<string | null>(null);
  const [gerandoPDFId, setGerandoPDFId] = useState<string | null>(null);

  const [busca, setBusca] = useState('');
  const [filtroStatus, setFiltroStatus] = useState<FiltroStatus>('');
  const [reservaFiltro, setReservaFiltro] = useState('');
  const [hoje, setHoje] = useState(hojeManaus);

  const [modal, setModal] = useState<ModalAberto>(null);
  const [edicao, setEdicao] = useState<Edicao | null>(null);
  const [ocupado, setOcupado] = useState(false);

  const mutacao = useRef(false);
  const pdfEmAndamento = useRef(false);
  const versaoConsulta = useRef(0);

  const carregar = useCallback(async () => {
    const versao = ++versaoConsulta.current;

    setCarregando(true);
    setErroConsulta(null);
    setErroAuxiliares(null);
    setClientes([]);
    setPasseios([]);

    try {
      if (!isSupabaseConfigured) {
        throw new Error('Supabase não está configurado.');
      }

      const empresaId = await obterEmpresa();

      const [resultadoVouchers, resultadoClientes, resultadoPasseios] =
        await Promise.allSettled([
          consultarTabela<Voucher>('vouchers', empresaId),
          consultarTabela<Opcao>('clientes', empresaId),
          consultarTabela<Opcao>('passeios', empresaId),
        ]);

      if (versao !== versaoConsulta.current) return;

      if (resultadoVouchers.status === 'rejected') {
        throw resultadoVouchers.reason;
      }

      const ordenarNomes = (itens: Opcao[]) =>
        [...itens].sort((a, b) =>
          (a.nome ?? '').localeCompare(b.nome ?? '', 'pt-BR')
        );

      if (resultadoClientes.status === 'fulfilled') {
        setClientes(ordenarNomes(resultadoClientes.value));
      }

      if (resultadoPasseios.status === 'fulfilled') {
        setPasseios(ordenarNomes(resultadoPasseios.value));
      }

      if (
        resultadoClientes.status === 'rejected' ||
        resultadoPasseios.status === 'rejected'
      ) {
        setErroAuxiliares(
          'Não foi possível carregar todos os clientes e passeios. Os vouchers continuam disponíveis, mas a edição de vouchers avulsos está bloqueada até atualizar os dados.'
        );
      }

      setVouchers(
        [...resultadoVouchers.value].sort((a, b) => {
          const dataA = a.created_at ?? '';
          const dataB = b.created_at ?? '';
          return dataB.localeCompare(dataA) || a.id.localeCompare(b.id);
        })
      );
      setHoje(hojeManaus());
    } catch (erro) {
      if (versao !== versaoConsulta.current) return;

      setVouchers([]);
      setErroConsulta(erroTexto(erro, 'Não foi possível carregar os vouchers.'));
    } finally {
      if (versao === versaoConsulta.current) setCarregando(false);
    }
  }, []);

  useEffect(() => {
    const parametros = new URLSearchParams(window.location.search);
    setReservaFiltro(parametros.get('reserva_id') ?? '');
    void carregar();

    return () => {
      versaoConsulta.current += 1;
    };
  }, [carregar]);

  useEffect(() => {
    const timer = window.setInterval(() => setHoje(hojeManaus()), 60000);
    return () => window.clearInterval(timer);
  }, []);

  useEffect(() => {
    if (!sucesso) return;
    const timer = window.setTimeout(() => setSucesso(null), 4000);
    return () => window.clearTimeout(timer);
  }, [sucesso]);

  const mapaClientes = useMemo(
    () => new Map(clientes.map((item) => [item.id, item.nome])),
    [clientes]
  );

  const mapaPasseios = useMemo(
    () => new Map(passeios.map((item) => [item.id, item.nome])),
    [passeios]
  );

  function nomeCliente(item: Voucher): string {
    if (item.cliente_nome?.trim()) return item.cliente_nome;

    // Não reconstruir os dados históricos de uma emissão pela reserva atual.
    if (item.reserva_id) return 'Não registrado na emissão';

    return (
      (item.cliente_id && mapaClientes.get(item.cliente_id)) ||
      'Não informado'
    );
  }

  function nomePasseio(item: Voucher): string {
    if (item.passeio_nome?.trim()) return item.passeio_nome;
    if (item.reserva_id) return 'Não registrado na emissão';

    return (
      (item.passeio_id && mapaPasseios.get(item.passeio_id)) ||
      'Não informado'
    );
  }

  const metricas = useMemo(() => {
    const ativos = vouchers.filter((item) => obterStatus(item.status) === 'Ativo');
    const valores = ativos.map((item) => valorDoBanco(item.valor));

    return {
      total: vouchers.length,
      ativos: ativos.length,
      utilizados: vouchers.filter((item) => obterStatus(item.status) === 'Utilizado').length,
      cancelados: vouchers.filter((item) => obterStatus(item.status) === 'Cancelado').length,
      expirados: vouchers.filter((item) => expirado(item, hoje)).length,
      desconhecidos: vouchers.filter((item) => obterStatus(item.status) === 'Desconhecido').length,
      valorAtivo: valores.some((valor) => valor === null)
        ? null
        : valores.reduce<number>((total, valor) => total + (valor ?? 0), 0),
    };
  }, [vouchers, hoje]);

  const filtrados = vouchers.filter((item) => {
    if (reservaFiltro && item.reserva_id !== reservaFiltro) return false;

    const status = obterStatus(item.status);

    if (filtroStatus === 'Expirado') {
      if (!expirado(item, hoje)) return false;
    } else if (filtroStatus && status !== filtroStatus) {
      return false;
    }

    const termo = normalizar(busca);

    return (
      !termo ||
      normalizar(
        `${item.codigo} ${nomeCliente(item)} ${nomePasseio(item)} ${status} ${item.reserva_id ?? ''}`
      ).includes(termo)
    );
  });

  function fecharModal() {
    if (mutacao.current) return;
    setModal(null);
    setEdicao(null);
    setErroModal(null);
  }

  function abrir(tipo: 'ver' | 'editar' | 'excluir', item: Voucher) {
    if (mutacao.current) return;

    setErroModal(null);
    setModal({ tipo, item });

    if (tipo === 'editar') {
      const status = obterStatus(item.status);
      const valor = valorDoBanco(item.valor);

      setEdicao({
        codigo: item.codigo ?? '',
        clienteId: item.cliente_id ?? '',
        passeioId: item.passeio_id ?? '',
        valor: valor === null
          ? ''
          : valor.toLocaleString('pt-BR', {
              useGrouping: false,
              minimumFractionDigits: 2,
              maximumFractionDigits: 2,
            }),
        validade: apenasData(item.validade),
        status: status === 'Desconhecido' ? '' : status,
      });
    }
  }

  async function salvar(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();

    if (modal?.tipo !== 'editar' || !edicao || mutacao.current) return;

    setErroModal(null);

    const item = modal.item;
    const codigo = edicao.codigo.trim();
    const valor = valorDoCampo(edicao.valor);

    if (!codigo) {
      setErroModal('Informe o código do voucher.');
      return;
    }

    if (!edicao.status) {
      setErroModal('Selecione um status válido para este voucher.');
      return;
    }

    if (valor === null || valor <= 0) {
      setErroModal('Informe um valor maior que zero, com até duas casas decimais.');
      return;
    }

    if (edicao.validade && !dataValida(edicao.validade)) {
      setErroModal('Informe uma validade válida ou deixe o campo vazio.');
      return;
    }

    const cliente = clientes.find((opcao) => opcao.id === edicao.clienteId);
    const passeio = passeios.find((opcao) => opcao.id === edicao.passeioId);

    if (!item.reserva_id && (erroAuxiliares || !cliente || !passeio)) {
      setErroModal('Atualize os dados e selecione um cliente e um passeio disponíveis.');
      return;
    }

    mutacao.current = true;
    setOcupado(true);

    try {
      const empresaId = await obterEmpresa();

      if (!item.empresa_id || item.empresa_id !== empresaId) {
        throw new Error('Este voucher não pertence à empresa da sessão atual. Atualize a lista.');
      }

      if (item.reserva_id && edicao.status === 'Ativo') {
        const { data: reservaAtual, error: erroReserva } = await supabase
          .from('reservas')
          .select('id,status')
          .eq('id', item.reserva_id)
          .eq('empresa_id', empresaId)
          .single();

        if (erroReserva || !reservaAtual) {
          throw new Error('Não foi possível verificar a reserva vinculada.');
        }

        if (!reservaOperacionalERN(reservaAtual.status)) {
          throw new Error(
            'Esta reserva não está operacional. Não é permitido ativar o voucher.'
          );
        }
      }

      const alteracoes = {
        codigo,
        valor,
        status: edicao.status,
        validade: edicao.validade || null,
        ...(!item.reserva_id
          ? {
              cliente_id: edicao.clienteId,
              passeio_id: edicao.passeioId,
              cliente_nome: cliente?.nome ?? null,
              passeio_nome: passeio?.nome ?? null,
            }
          : {}),
      };

      const { data, error } = await supabase
        .from('vouchers')
        .update(alteracoes)
        .eq('id', item.id)
        .eq('empresa_id', empresaId)
        .select('id')
        .single();

      if (error) throw error;
      if (!data?.id) {
        throw new Error('Não foi possível confirmar a atualização. Atualize a lista.');
      }

      setModal(null);
      setEdicao(null);
      setSucesso('Voucher atualizado com sucesso.');
      await carregar();
    } catch (erro) {
      setErroModal(erroTexto(erro, 'Não foi possível atualizar o voucher.'));
    } finally {
      mutacao.current = false;
      setOcupado(false);
    }
  }

  async function excluir() {
    if (modal?.tipo !== 'excluir' || mutacao.current) return;

    const item = modal.item;
    mutacao.current = true;
    setOcupado(true);
    setErroModal(null);

    try {
      const empresaId = await obterEmpresa();

      if (!item.empresa_id || item.empresa_id !== empresaId) {
        throw new Error('Este voucher não pertence à empresa da sessão atual. Atualize a lista.');
      }

      const { data, error } = await supabase
        .from('vouchers')
        .delete()
        .eq('id', item.id)
        .eq('empresa_id', empresaId)
        .select('id')
        .single();

      if (error) throw error;
      if (!data?.id) {
        throw new Error('Não foi possível confirmar a exclusão. Atualize a lista.');
      }

      setVouchers((atuais) => atuais.filter((voucher) => voucher.id !== item.id));
      setModal(null);
      setSucesso('Voucher excluído com sucesso.');
    } catch (erro) {
      setErroModal(erroTexto(erro, 'Não foi possível excluir o voucher.'));
    } finally {
      mutacao.current = false;
      setOcupado(false);
    }
  }

  async function baixarPDFVoucher(item: Voucher): Promise<void> {
    if (pdfEmAndamento.current || mutacao.current) return;

    pdfEmAndamento.current = true;
    setGerandoPDFId(item.id);
    setErroPDF(null);

    try {
      const empresa = await consultarIdentificacaoEmpresaERN();

      if (!item.empresa_id || item.empresa_id !== empresa.id) {
        throw new Error(
          'Este voucher não pertence à empresa autenticada.'
        );
      }

      const { data, error } = await supabase
        .from('vouchers')
        .select('*')
        .eq('id', item.id)
        .eq('empresa_id', empresa.id)
        .single();

      if (error || !data) {
        throw new Error(
          'Não foi possível consultar o voucher atualizado.'
        );
      }

      const atual = data as Voucher;

      if (atual.empresa_id !== empresa.id) {
        throw new Error(
          'Inconsistência no vínculo empresarial do voucher.'
        );
      }

      const status = obterStatus(atual.status);
      const expirou = expirado(atual, hoje);

      const situacao = expirou
        ? 'Expirado'
        : status === 'Ativo'
          ? 'Ativo - utilização sujeita a conferência'
          : status;

      baixarDocumentoPremiumERN({
        titulo: 'Voucher Turístico',
        subtitulo: 'Documento operacional | Plataforma Encantos Rio Negro',
        empresa: empresa.nome,
        identificador: atual.codigo,
        nomeArquivo: `ERN-voucher-${atual.id}.pdf`,
        status: situacao,
        dados: [
          { campo: 'Prestador do serviço', valor: empresa.nome },
          { campo: 'CNPJ informado', valor: empresa.cnpj ?? 'Não cadastrado' },
          { campo: 'Endereço da operadora', valor: empresa.endereco ?? 'Não cadastrado' },
          { campo: 'Cidade', valor: empresa.cidade ?? 'Não cadastrada' },
          { campo: 'Telefone', valor: empresa.telefone ?? 'Não cadastrado' },
          { campo: 'E-mail', valor: empresa.email ?? 'Não cadastrado' },
          { campo: 'Cliente na emissão', valor: nomeCliente(atual) },
          { campo: 'Passeio na emissão', valor: nomePasseio(atual) },
          { campo: 'Reserva vinculada', valor: atual.reserva_id ?? 'Voucher avulso' },
          { campo: 'Participantes', valor: atual.quantidade_pessoas ?? 'Não informado' },
          { campo: 'Data do passeio na emissão', valor: formatarData(atual.data_passeio) },
          { campo: 'Horário na emissão', valor: atual.horario_passeio?.slice(0, 5) || 'Não informado' },
          { campo: 'Valor registrado', valor: moeda(valorDoBanco(atual.valor)) },
          { campo: 'Validade', valor: formatarData(atual.validade) },
          { campo: 'Status administrativo', valor: status },
          {
            campo: 'Situação da validade',
            valor: expirou ? 'Expirada' : 'Não identificada como expirada'
          },
          {
            campo: 'Data de emissão',
            valor: formatarEmissao(atual.data_emissao || atual.created_at)
          },
        ],
        observacoes: [
          'Os dados do passeio representam o histórico registrado na emissão do voucher.',
          'Os dados empresariais refletem o cadastro consultado na data deste download.',
          'A identificação empresarial não constitui validação cadastral ou fiscal.',
          'O status Ativo não comprova, isoladamente, aptidão para utilização.',
          'Confirme a reserva e as condições do serviço antes do atendimento.',
          'Este documento não constitui nota fiscal nem comprovante de pagamento.',
        ],
      });

    } catch (falha) {
      setErroPDF(
        erroTexto(falha, 'Não foi possível gerar o PDF Premium.')
      );
    } finally {
      pdfEmAndamento.current = false;
      setGerandoPDFId(null);
    }
  }
  function etiqueta(item: Voucher) {
    const status = obterStatus(item.status);
    const classe =
      status === 'Ativo'
        ? 'border-emerald-400/25 bg-emerald-400/10 text-emerald-300'
        : status === 'Utilizado'
          ? 'border-amber-400/25 bg-amber-400/10 text-amber-300'
          : status === 'Cancelado'
            ? 'border-red-400/25 bg-red-400/10 text-red-300'
            : 'border-white/25 bg-white/5 text-[#D6E2D9]';

    return (
      <div className="space-y-2">
        <span className={`inline-flex rounded-full border px-3 py-1 text-xs font-semibold ${classe}`}>
          {status}
        </span>
        {expirado(item, hoje) && (
          <p className="text-xs font-medium text-red-300">Validade expirada</p>
        )}
      </div>
    );
  }

  function acoes(item: Voucher) {
    return (
      <div className="flex flex-wrap gap-2">
        <button type="button" disabled={ocupado} onClick={() => abrir('ver', item)} className={buttonClass}>
          Ver
        </button>
        <button
          type="button"
          disabled={ocupado || gerandoPDFId !== null}
          onClick={() => void baixarPDFVoucher(item)}
          className={buttonClass}
        >
          {gerandoPDFId === item.id ? 'Gerando PDF...' : 'Baixar PDF Premium'}
        </button>
        <button
          type="button"
          disabled={ocupado || (!item.reserva_id && Boolean(erroAuxiliares))}
          onClick={() => abrir('editar', item)}
          className={buttonClass}
        >
          Editar
        </button>
        <button
          type="button"
          disabled={ocupado}
          onClick={() => abrir('excluir', item)}
          className={`${buttonClass} border-red-400/25 text-red-300`}
        >
          Excluir
        </button>
      </div>
    );
  }

  function vinculo(item: Voucher) {
    if (!item.reserva_id) {
      return <p className="mt-2 text-xs text-[#B4C8BB]">Voucher avulso</p>;
    }

    return (
      <Link
        href={`/reservas/editar/${encodeURIComponent(item.reserva_id)}`}
        className="mt-2 inline-flex min-h-11 items-center text-xs text-[#F4C77E] underline underline-offset-4"
      >
        Abrir reserva vinculada
      </Link>
    );
  }

  const cards: {
    titulo: string;
    valor: string;
    filtro: FiltroStatus;
  }[] = [
    { titulo: 'Total', valor: String(metricas.total), filtro: '' },
    { titulo: 'Ativos', valor: String(metricas.ativos), filtro: 'Ativo' },
    { titulo: 'Utilizados', valor: String(metricas.utilizados), filtro: 'Utilizado' },
    { titulo: 'Cancelados', valor: String(metricas.cancelados), filtro: 'Cancelado' },
    { titulo: 'Ativos expirados', valor: String(metricas.expirados), filtro: 'Expirado' },
    { titulo: 'Valor dos ativos', valor: moeda(metricas.valorAtivo), filtro: 'Ativo' },
  ];

  const itemModal = modal?.item;

  return (
    <div className="min-h-screen bg-[#07110E] text-[#EDEDE3]">
      {erroPDF && (
        <div
          role="alert"
          className="mx-auto mt-4 max-w-4xl rounded-xl border border-red-400/30 bg-red-950/30 p-4 text-sm text-red-200"
        >
          <p>{erroPDF}</p>
          <button
            type="button"
            onClick={() => setErroPDF(null)}
            className={buttonClass + ' mt-3'}
          >
            Fechar aviso
          </button>
        </div>
      )}
      {sucesso && (
        <div role="status" className="fixed left-3 right-3 top-24 z-[90] mx-auto max-w-lg rounded-2xl border border-emerald-400/25 bg-[#0B2119] p-4 text-sm text-emerald-200 shadow-2xl">
          {sucesso}
        </div>
      )}

      <header className="border-b border-white/10 bg-[#091510]">
        <div className="mx-auto flex max-w-[1440px] flex-col gap-6 px-4 py-8 sm:px-6 lg:flex-row lg:items-end lg:justify-between lg:px-8">
          <div>
            <p className="text-xs font-semibold uppercase tracking-[0.18em] text-[#E3A144]">
              Operação · Vouchers
            </p>
            <h1 className="mt-3 text-4xl sm:text-5xl" style={headingStyle}>Vouchers</h1>
            <p className="mt-4 max-w-2xl text-sm leading-7 text-[#B4C8BB]">
              Consulte emissões, clientes, passeios, validade e utilização dos vouchers.
            </p>
          </div>
          <div className="flex flex-wrap gap-3">
            <button type="button" disabled={carregando || ocupado} onClick={() => void carregar()} className={buttonClass}>
              {carregando ? 'Atualizando…' : 'Atualizar'}
            </button>
            <Link href="/vouchers/novo" className={`${buttonClass} border-[#E3A144] bg-[#E3A144] font-bold text-[#07130F] hover:bg-[#F0B35C]`}>
              + Novo voucher
            </Link>
          </div>
        </div>
      </header>

      <main className="mx-auto max-w-[1440px] px-4 py-6 sm:px-6 lg:px-8">
        {erroConsulta && (
          <div role="alert" className="mb-5 rounded-2xl border border-red-400/25 bg-red-400/10 p-4 text-sm text-red-200">
            {erroConsulta}
          </div>
        )}
        {erroAuxiliares && (
          <div role="alert" className="mb-5 rounded-2xl border border-amber-400/25 bg-amber-400/10 p-4 text-sm text-amber-200">
            {erroAuxiliares}
          </div>
        )}
        {!carregando && !erroConsulta && metricas.desconhecidos > 0 && (
          <p role="status" className="mb-5 rounded-xl border border-amber-400/25 p-4 text-sm text-amber-200">
            {metricas.desconhecidos} voucher(s) com status desconhecido. Revise esses registros pelo filtro de status.
          </p>
        )}

        <div className="grid grid-cols-2 gap-3 lg:grid-cols-3 xl:grid-cols-6">
          {cards.map((card) => (
            <button
              key={card.titulo}
              type="button"
              onClick={() => setFiltroStatus(card.filtro)}
              className="min-w-0 rounded-2xl border border-white/10 bg-[#0A1713] p-4 text-left transition hover:border-[#E3A144]/50"
            >
              <span className="block text-sm text-[#B4C8BB]">{card.titulo}</span>
              <strong className="mt-3 block break-words text-xl tabular-nums text-[#F4C77E] sm:text-2xl">
                {carregando || erroConsulta ? '—' : card.valor}
              </strong>
            </button>
          ))}
        </div>

        <p className="mt-4 text-xs leading-6 text-[#B4C8BB]">
          Indicadores de todos os vouchers carregados, independentemente dos filtros.
          Ativos incluem os que têm validade expirada. O valor dos ativos é nominal;
          não representa dinheiro recebido.
        </p>

        {reservaFiltro && (
          <div className="mt-5 flex flex-wrap items-center gap-3 rounded-xl border border-[#E3A144]/30 p-4 text-sm">
            <span className="min-w-0 break-all">Reserva filtrada: {reservaFiltro}</span>
            <button type="button" onClick={() => setReservaFiltro('')} className={buttonClass}>
              Limpar reserva
            </button>
          </div>
        )}

        <section aria-label="Filtros de vouchers" className="mt-6 grid gap-4 rounded-2xl border border-white/10 bg-[#0A1713] p-4 sm:grid-cols-[1fr_220px]">
          <div className="min-w-0">
            <label htmlFor="voucher-busca" className={labelClass}>Buscar</label>
            <input
              id="voucher-busca"
              type="search"
              value={busca}
              onChange={(event) => setBusca(event.target.value)}
              placeholder="Código, cliente, passeio ou reserva"
              className={inputClass}
            />
          </div>
          <div className="min-w-0">
            <label htmlFor="voucher-filtro" className={labelClass}>Status</label>
            <select id="voucher-filtro" value={filtroStatus} onChange={(event) => setFiltroStatus(event.target.value as FiltroStatus)} className={inputClass}>
              <option value="">Todos</option>
              <option value="Ativo">Ativos</option>
              <option value="Utilizado">Utilizados</option>
              <option value="Cancelado">Cancelados</option>
              <option value="Expirado">Ativos expirados</option>
              <option value="Desconhecido">Desconhecidos</option>
            </select>
          </div>
        </section>

        <section aria-busy={carregando} className="mt-6 overflow-hidden rounded-2xl border border-white/10 bg-[#0A1713]">
          <div className="flex flex-wrap items-end justify-between gap-3 border-b border-white/10 p-5">
            <h2 className="text-2xl" style={headingStyle}>Vouchers emitidos</h2>
            <p className="text-sm text-[#B4C8BB]">
              {carregando || erroConsulta ? '—' : `${filtrados.length} de ${vouchers.length} registros`}
            </p>
          </div>

          {carregando ? (
            <p role="status" className="p-10 text-center text-sm text-[#B4C8BB]">Carregando vouchers…</p>
          ) : erroConsulta ? (
            <p className="p-10 text-center text-sm text-red-200">Consulta indisponível. Use Atualizar para tentar novamente.</p>
          ) : filtrados.length === 0 ? (
            <div className="p-10 text-center">
              <h3 className="text-xl" style={headingStyle}>Nenhum voucher encontrado</h3>
              <p className="mt-3 text-sm text-[#B4C8BB]">
                Confira os filtros e se seu plano possui acesso ao recurso de vouchers.
              </p>
            </div>
          ) : (
            <>
              <div className="divide-y divide-white/10 lg:hidden">
                {filtrados.map((item) => (
                  <article key={item.id} className="min-w-0 p-4 sm:p-5">
                    <div className="flex flex-wrap items-start justify-between gap-3">
                      <h3 className="break-all font-mono text-base font-semibold text-[#F4C77E]">{item.codigo}</h3>
                      {etiqueta(item)}
                    </div>
                    <p className="mt-4 break-words font-semibold">{nomeCliente(item)}</p>
                    <p className="mt-2 break-words text-sm text-[#C5D4CA]">{nomePasseio(item)}</p>
                    <dl className="mt-4 grid grid-cols-2 gap-4 text-sm">
                      <div><dt className="text-[#B4C8BB]">Valor</dt><dd className="mt-1">{moeda(valorDoBanco(item.valor))}</dd></div>
                      <div><dt className="text-[#B4C8BB]">Validade</dt><dd className="mt-1">{formatarData(item.validade)}</dd></div>
                      <div><dt className="text-[#B4C8BB]">Data do passeio</dt><dd className="mt-1">{formatarData(item.data_passeio)}</dd></div>
                      <div><dt className="text-[#B4C8BB]">Pessoas</dt><dd className="mt-1">{item.quantidade_pessoas ?? 'Não informado'}</dd></div>
                    </dl>
                    {vinculo(item)}
                    <div className="mt-4 border-t border-white/10 pt-4">{acoes(item)}</div>
                  </article>
                ))}
              </div>

              <div className="hidden overflow-x-auto lg:block">
                <table className="w-full min-w-[1100px] border-collapse text-left text-sm">
                  <thead className="border-b border-white/10 text-xs text-[#B4C8BB]">
                    <tr>
                      {['Código', 'Cliente / Passeio', 'Validade', 'Valor', 'Status', 'Ações'].map((titulo) => (
                        <th scope="col" key={titulo} className="px-4 py-4">{titulo}</th>
                      ))}
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-white/10">
                    {filtrados.map((item) => (
                      <tr key={item.id} className="hover:bg-white/[0.02]">
                        <td className="max-w-[180px] break-all px-4 py-4 font-mono font-semibold text-[#F4C77E]">{item.codigo}</td>
                        <td className="max-w-sm px-4 py-4">
                          <p className="break-words font-medium">{nomeCliente(item)}</p>
                          <p className="mt-2 break-words text-[#B4C8BB]">{nomePasseio(item)}</p>
                          {vinculo(item)}
                        </td>
                        <td className="px-4 py-4">{formatarData(item.validade)}</td>
                        <td className="whitespace-nowrap px-4 py-4 font-semibold tabular-nums">{moeda(valorDoBanco(item.valor))}</td>
                        <td className="px-4 py-4">{etiqueta(item)}</td>
                        <td className="min-w-[240px] px-4 py-4">{acoes(item)}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </>
          )}
        </section>
      </main>

      {modal && itemModal && (
        <Modal
          titulo={modal.tipo === 'editar' ? 'Editar voucher' : modal.tipo === 'excluir' ? 'Excluir voucher?' : `Voucher ${itemModal.codigo}`}
          bloqueado={ocupado}
          aoFechar={fecharModal}
        >
          {modal.tipo === 'ver' && (
            <div className="p-5">
              <dl className="grid gap-3 sm:grid-cols-2">
                {[
                  ['Cliente', nomeCliente(itemModal)],
                  ['Passeio', nomePasseio(itemModal)],
                  ['Reserva vinculada', itemModal.reserva_id || 'Voucher avulso'],
                  ['Quantidade de pessoas', itemModal.quantidade_pessoas == null ? 'Não informada' : String(itemModal.quantidade_pessoas)],
                  ['Data do passeio na emissão', formatarData(itemModal.data_passeio)],
                  ['Horário na emissão', itemModal.horario_passeio?.slice(0, 5) || 'Não informado'],
                  ['Valor', moeda(valorDoBanco(itemModal.valor))],
                  ['Emissão · Manaus', formatarEmissao(itemModal.data_emissao || itemModal.created_at)],
                  ['Validade', formatarData(itemModal.validade)],
                  ['Status', obterStatus(itemModal.status)],
                  ['Validade expirada', expirado(itemModal, hoje) ? 'Sim' : 'Não'],
                ].map(([label, valor]) => (
                  <div key={label} className="min-w-0 rounded-xl border border-white/10 p-4">
                    <dt className="text-xs text-[#B4C8BB]">{label}</dt>
                    <dd className="mt-2 break-words text-sm">{valor}</dd>
                  </div>
                ))}
              </dl>
              {vinculo(itemModal)}
              <div className="mt-5 flex justify-end">
                <button type="button" className={buttonClass} onClick={fecharModal}>Fechar</button>
              </div>
            </div>
          )}

          {modal.tipo === 'editar' && edicao && (
            <form onSubmit={salvar} className="p-5">
              <fieldset disabled={ocupado} className="min-w-0 space-y-5">
                {itemModal.reserva_id && (
                  <div className="rounded-xl border border-[#E3A144]/25 p-4 text-sm leading-7 text-[#C5D4CA]">
                    Cliente, passeio, quantidade, data e horário preservam os dados
                    registrados na emissão. Para corrigir esses dados, cancele o
                    voucher e emita outro.
                  </div>
                )}

                <div>
                  <label htmlFor="voucher-codigo" className={labelClass}>Código *</label>
                  <input id="voucher-codigo" required value={edicao.codigo} onChange={(event) => setEdicao({ ...edicao, codigo: event.target.value })} className={inputClass} />
                </div>

                {itemModal.reserva_id ? (
                  <div className="grid gap-4 sm:grid-cols-2">
                    <div><p className={labelClass}>Cliente na emissão</p><p className="break-words text-sm">{nomeCliente(itemModal)}</p></div>
                    <div><p className={labelClass}>Passeio na emissão</p><p className="break-words text-sm">{nomePasseio(itemModal)}</p></div>
                  </div>
                ) : (
                  <div className="grid gap-4 sm:grid-cols-2">
                    <div>
                      <label htmlFor="voucher-cliente" className={labelClass}>Cliente *</label>
                      <select id="voucher-cliente" required value={edicao.clienteId} onChange={(event) => setEdicao({ ...edicao, clienteId: event.target.value })} className={inputClass}>
                        <option value="">Selecione…</option>
                        {edicao.clienteId && !clientes.some((item) => item.id === edicao.clienteId) && (
                          <option value={edicao.clienteId} disabled>Cliente atual indisponível</option>
                        )}
                        {clientes.map((item) => <option key={item.id} value={item.id}>{item.nome || item.id}</option>)}
                      </select>
                    </div>
                    <div>
                      <label htmlFor="voucher-passeio" className={labelClass}>Passeio *</label>
                      <select id="voucher-passeio" required value={edicao.passeioId} onChange={(event) => setEdicao({ ...edicao, passeioId: event.target.value })} className={inputClass}>
                        <option value="">Selecione…</option>
                        {edicao.passeioId && !passeios.some((item) => item.id === edicao.passeioId) && (
                          <option value={edicao.passeioId} disabled>Passeio atual indisponível</option>
                        )}
                        {passeios.map((item) => <option key={item.id} value={item.id}>{item.nome || item.id}</option>)}
                      </select>
                    </div>
                  </div>
                )}

                <div className="grid gap-4 sm:grid-cols-2">
                  <div>
                    <label htmlFor="voucher-valor" className={labelClass}>Valor (R$) *</label>
                    <input id="voucher-valor" type="text" inputMode="decimal" required value={edicao.valor} onChange={(event) => setEdicao({ ...edicao, valor: event.target.value })} placeholder="Ex.: 1.500,00" className={inputClass} />
                  </div>
                  <div>
                    <label htmlFor="voucher-validade" className={labelClass}>Validade</label>
                    <input id="voucher-validade" type="date" value={edicao.validade} onChange={(event) => setEdicao({ ...edicao, validade: event.target.value })} className={`${inputClass} [color-scheme:dark]`} />
                  </div>
                </div>

                <div>
                  <label htmlFor="voucher-status" className={labelClass}>Status *</label>
                  <select id="voucher-status" required value={edicao.status} onChange={(event) => setEdicao({ ...edicao, status: event.target.value as StatusVoucher | '' })} className={inputClass}>
                    <option value="" disabled>Selecione um status válido</option>
                    <option value="Ativo">Ativo</option>
                    <option value="Utilizado">Utilizado</option>
                    <option value="Cancelado">Cancelado</option>
                  </select>
                </div>

                {erroModal && <p role="alert" className="rounded-xl border border-red-400/25 bg-red-400/10 p-4 text-sm text-red-200">{erroModal}</p>}

                <div className="flex flex-col-reverse gap-3 border-t border-white/10 pt-5 sm:flex-row sm:justify-end">
                  <button type="button" className={buttonClass} onClick={fecharModal}>Cancelar</button>
                  <button type="submit" className={`${buttonClass} border-[#E3A144] bg-[#E3A144] font-bold text-[#07130F] hover:bg-[#F0B35C]`}>
                    {ocupado ? 'Salvando…' : 'Salvar alterações'}
                  </button>
                </div>
              </fieldset>
            </form>
          )}

          {modal.tipo === 'excluir' && (
            <div className="p-5">
              <p className="break-words text-sm leading-7 text-[#C5D4CA]">
                O voucher <strong>{itemModal.codigo}</strong> será removido
                permanentemente. Para manter o histórico da emissão, use
                Editar e altere o status para Cancelado.
              </p>
              {erroModal && <p role="alert" className="mt-4 rounded-xl border border-red-400/25 bg-red-400/10 p-4 text-sm text-red-200">{erroModal}</p>}
              <div className="mt-6 flex flex-wrap justify-end gap-3">
                <button type="button" disabled={ocupado} onClick={fecharModal} className={buttonClass}>Voltar</button>
                <button type="button" disabled={ocupado} onClick={() => void excluir()} className={`${buttonClass} border-red-400/30 bg-red-400/10 text-red-200`}>
                  {ocupado ? 'Excluindo…' : 'Excluir permanentemente'}
                </button>
              </div>
            </div>
          )}
        </Modal>
      )}
    </div>
  );
}