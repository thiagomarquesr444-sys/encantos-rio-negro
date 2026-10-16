'use client';
import { useEffect, useRef, useState, type FormEvent } from 'react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { supabase } from '@/lib/supabase';
type ReservaReceita = { id: string; cliente: string | null; pacote: string | null; data_reserva: string; status: string | null; valor_total: number | string | null };

type StatusReceita = 'Recebido' | 'Pendente';
interface ReceitaForm {
  descricao: string;
  valor: string;
  categoria: string;
  data_vencimento: string;
  data_liquidacao: string;
  status: StatusReceita;
}
const CATEGORIAS = [
  'Turismo / Pacotes',
  'Hospedagem',
  'Alimentação',
  'Outras Receitas',
];
function hojeManaus(): string {
  const partes = new Intl.DateTimeFormat('en-CA', {
    timeZone: 'America/Manaus',
    year: 'numeric',
    month: '2-digit',
    day: '2-digit',
  }).formatToParts(new Date());
  const obter = (tipo: string) =>
    partes.find((parte) => parte.type === tipo)?.value ?? '';
  return `${obter('year')}-${obter('month')}-${obter('day')}`;
}
function dataValida(valor: string): boolean {
  if (!/^\d{4}-\d{2}-\d{2}$/.test(valor)) return false;
  const data = new Date(`${valor}T12:00:00Z`);
  return (
    Number.isFinite(data.getTime()) &&
    data.toISOString().slice(0, 10) === valor
  );
}
function converterValor(entrada: string): number {
  const texto = entrada
    .trim()
    .replace(/^R\$\s*/i, '')
    .replace(/\s/g, '');
  let normalizado: string;
  if (texto.includes(',')) {
    if (
      !/^(?:\d+|\d{1,3}(?:\.\d{3})+),\d{1,2}$/.test(texto)
    ) {
      return NaN;
    }
    normalizado = texto.replace(/\./g, '').replace(',', '.');
  } else if (/^\d{1,3}(?:\.\d{3})+$/.test(texto)) {
    normalizado = texto.replace(/\./g, '');
  } else if (/^\d+(?:\.\d{1,2})?$/.test(texto)) {
    normalizado = texto;
  } else {
    return NaN;
  }
  const [inteiros, decimais = ''] = normalizado.split('.');
  const centavos =
    Number(inteiros) * 100 +
    Number(decimais.padEnd(2, '0'));
  return Number.isSafeInteger(centavos) && centavos > 0
    ? centavos / 100
    : NaN;
}
export default function NovaReceitaPage() {
  const router = useRouter();
  const [reservas, setReservas] = useState<ReservaReceita[]>([]);
  const [reservaId, setReservaId] = useState('');
  const [empresaConsulta, setEmpresaConsulta] = useState('');
  const [buscaReserva, setBuscaReserva] = useState('');
  const [carregandoReservas, setCarregandoReservas] = useState(true);
  const [erroReservas, setErroReservas] = useState('');
  const [tentativaReservas, setTentativaReservas] = useState(0);
  const reservaSelecionada = reservas.find(r => r.id === reservaId);

  const envioEmAndamento = useRef(false);
  const [formData, setFormData] = useState<ReceitaForm>({
    descricao: '',
    valor: '',
    categoria: 'Turismo / Pacotes',
    data_vencimento: '',
    data_liquidacao: '',
    status: 'Pendente',
  });
  const [salvando, setSalvando] = useState(false);
  const [mensagemErro, setMensagemErro] = useState('');
  const [mensagemSucesso, setMensagemSucesso] = useState('');
  const inputClass =
    'block min-h-12 w-full min-w-0 rounded-xl border ' +
    'border-white/20 bg-[#07110E] px-4 py-3 text-base ' +
    'text-[#EDEDE3] outline-none placeholder:text-[#B4C8BB]/60 ' +
    'focus:border-[#E3A144] focus:ring-2 focus:ring-[#E3A144]/20';
  const labelClass =
    'mb-2 block text-sm font-medium text-[#EDEDE3]/85';
  function escolherReserva(reserva: ReservaReceita | null) {
    if (envioEmAndamento.current) return;
    setReservaId(reserva?.id ?? '');
    setMensagemErro('');
    setFormData(atual => ({ ...atual,
      descricao: reserva ? `Reserva · ${reserva.cliente || 'Cliente não informado'} · ${reserva.pacote || 'Passeio não informado'} · ${reserva.data_reserva}` : '',
      valor: '', data_vencimento: '', data_liquidacao: '', status: 'Pendente',
    }));
  }
  useEffect(() => {
    let ativo = true;
    async function carregar() {
      setCarregandoReservas(true); setErroReservas('');
      try {
        const { data: auth, error: erroAuth } = await supabase.auth.getUser();
        if (erroAuth || !auth.user) throw new Error('Entre novamente para consultar as reservas.');
        const { data: perfil, error: erroPerfil } = await supabase.from('perfis').select('empresa_id').eq('id', auth.user.id).single();
        if (erroPerfil || !perfil?.empresa_id) throw new Error('Não foi possível identificar sua empresa.');
        const empresa = String(perfil.empresa_id);
        const lista: ReservaReceita[] = [];
        let total: number | null = null;
        for (let inicio = 0; inicio < 10000; inicio += 200) {
          const {data, error, count} = await supabase.from('reservas').select('id,cliente,pacote,data_reserva,status,valor_total', {count:'exact'}).eq('empresa_id',empresa).order('id').range(inicio,inicio+199);
          if (error) throw error;
          if (count === null || count > 10000) throw new Error('O volume de reservas exige busca no servidor. A lista não foi carregada parcialmente.');
          if (total !== null && total !== count) throw new Error('As reservas mudaram durante a consulta. Tente novamente.');
          total = count; lista.push(...((data ?? []) as ReservaReceita[]));
          if (lista.length >= count) break;
          if (!data?.length) throw new Error('A consulta ficou incompleta. Tente novamente.');
        }
        if (lista.length !== total || new Set(lista.map(r=>r.id)).size !== lista.length) throw new Error('Não foi possível obter uma lista consistente de reservas.');
        if (!ativo) return;
        setReservas(lista);setEmpresaConsulta(empresa);
        const pedido = new URLSearchParams(window.location.search).get('reserva_id');
        if (pedido) {
          const reserva = lista.find(r=>r.id===pedido);
          if (!reserva) throw new Error('A reserva indicada não está disponível para sua empresa.');
          escolherReserva(reserva);
        }
      } catch (falha) {
        if (ativo) setErroReservas(falha && typeof falha === 'object' && 'message' in falha ? String(falha.message) : 'Não foi possível consultar as reservas.');
      } finally { if (ativo) setCarregandoReservas(false); }
    }
    void carregar(); return () => { ativo = false; };
  }, [tentativaReservas]);
  const reservasEncontradas = reservas.filter(r => `${r.cliente} ${r.pacote} ${r.data_reserva} ${r.id}`.normalize('NFD').replace(/[\u0300-\u036f]/g,'').toLowerCase().includes(buscaReserva.normalize('NFD').replace(/[\u0300-\u036f]/g,'').toLowerCase()));
  function alterar(
    campo: Exclude<keyof ReceitaForm, 'status'>,
    valor: string,
  ) {
    setFormData((atual) => ({
      ...atual,
      [campo]: valor,
    }));
  }
  function alterarStatus(status: StatusReceita) {
    setFormData((atual) => ({
      ...atual,
      status,
      data_liquidacao:
        status === 'Pendente' ? '' : atual.data_liquidacao,
    }));
  }
  async function salvar(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (envioEmAndamento.current || carregandoReservas || erroReservas) return;
    setMensagemErro('');
    setMensagemSucesso('');
    const descricao = formData.descricao.trim();
    const valor = converterValor(formData.valor);
    if (!descricao) {
      setMensagemErro('Informe a descrição da receita.');
      return;
    }
    if (!Number.isFinite(valor)) {
      setMensagemErro(
        'Informe um valor maior que zero, com até duas casas decimais.',
      );
      return;
    }
    if (!dataValida(formData.data_vencimento)) {
      setMensagemErro('Informe uma data de vencimento válida.');
      return;
    }
    if (formData.status === 'Recebido') {
      if (!dataValida(formData.data_liquidacao)) {
        setMensagemErro('Informe a data efetiva do recebimento.');
        return;
      }
      if (formData.data_liquidacao > hojeManaus()) {
        setMensagemErro(
          'Uma receita recebida não pode ter data de recebimento futura.',
        );
        return;
      }
    }
    envioEmAndamento.current = true;
    setSalvando(true);
    try {
      const { data: autenticacao, error: erroAutenticacao } =
        await supabase.auth.getUser();
      if (erroAutenticacao || !autenticacao.user) {
        throw new Error(
          'Sua sessão não está disponível. Entre novamente para continuar.',
        );
      }
      const { data: perfil, error: erroPerfil } = await supabase
        .from('perfis')
        .select('empresa_id')
        .eq('id', autenticacao.user.id)
        .single();
      if (erroPerfil || !perfil?.empresa_id) {
        throw new Error(
          'Não foi possível identificar a empresa vinculada à sua conta.',
        );
      }
      if (reservaId) {
        if (String(perfil.empresa_id) !== empresaConsulta) throw new Error('O vínculo da sua conta mudou. Recarregue a página.');
        const {data: reservaAtual, error: erroReserva} = await supabase.from('reservas').select('id').eq('empresa_id',perfil.empresa_id).eq('id',reservaId).single();
        if (erroReserva || !reservaAtual?.id) throw new Error('A reserva selecionada não está mais disponível. Recarregue a página.');
      }
      const { data: registro, error: erroCadastro } = await supabase
        .from('financeiro')
        .insert({
          descricao,
          reserva_id: reservaId || null,
          tipo: 'receita',
          valor,
          categoria: formData.categoria,
          data_vencimento: formData.data_vencimento,
          data_liquidacao:
            formData.status === 'Recebido'
              ? formData.data_liquidacao
              : null,
          status: formData.status,
          user_id: autenticacao.user.id,
          empresa_id: perfil.empresa_id,
        })
        .select('id')
        .single();
      if (erroCadastro || !registro?.id) {
        throw new Error(
          'Não foi possível confirmar o cadastro. Confira sua permissão e o plano da empresa. Se houve falha de conexão, consulte a lista antes de tentar novamente.',
        );
      }
      setMensagemSucesso('Receita cadastrada com sucesso.');
      router.push('/financeiro');
      router.refresh();
    } catch (error) {
      setMensagemErro(
        error instanceof Error
          ? error.message
          : 'Não foi possível cadastrar a receita.',
      );
      envioEmAndamento.current = false;
      setSalvando(false);
    }
  }
  return (
    <div className="min-h-screen min-w-0 bg-[#07110E] text-[#EDEDE3]">
      <header className="border-b border-white/10 bg-[#091510]">
        <div className="mx-auto max-w-[1180px] px-4 py-7 sm:px-6 md:px-8 md:py-10">
          <Link
            href="/financeiro"
            className="inline-flex min-h-11 items-center rounded-lg text-sm font-semibold text-[#F4C77E] focus-visible:outline-2 focus-visible:outline-offset-4"
          >
            ← Financeiro
          </Link>
          <p className="mt-4 text-xs font-semibold uppercase tracking-[0.18em] text-[#E3A144]">
            Financeiro • Entrada
          </p>
          <h1
            className="mt-3 text-3xl text-[#F0F0E8] sm:text-4xl"
            style={{ fontFamily: 'var(--font-fraunces), serif' }}
          >
            Nova receita
          </h1>
          <p className="mt-3 max-w-2xl text-sm leading-7 text-[#B4C8BB]">
            Registre o valor previsto ou recebido e mantenha
            vencimento e recebimento separados.
          </p>
        </div>
      </header>
      <main className="mx-auto max-w-[1180px] px-4 py-6 sm:px-6 md:px-8 md:py-8">
        {mensagemErro && (
          <div
            role="alert"
            className="mb-5 rounded-xl border border-red-400/30 bg-red-500/10 p-4 text-sm leading-6 text-red-200"
          >
            {mensagemErro}
          </div>
        )}
        {mensagemSucesso && (
          <div
            role="status"
            className="mb-5 rounded-xl border border-emerald-400/30 bg-emerald-500/10 p-4 text-sm text-emerald-200"
          >
            {mensagemSucesso}
          </div>
        )}
        <section aria-labelledby="receita-reserva-titulo" className="mb-5 rounded-2xl border border-[#E3A144]/25 bg-[#0C211A] p-5 sm:p-7">
          <h2 id="receita-reserva-titulo" className="text-xl font-semibold text-[#F4C77E]">Vincular receita a uma reserva</h2>
          <p className="mt-3 text-sm leading-7 text-[#B4C8BB]">Opcional. Registre o valor desta parcela e o vencimento combinado. O total comercial da reserva não é preenchido como pagamento. Cada lançamento precisa representar uma parcela própria.</p>
          {carregandoReservas && <p role="status" className="mt-3 text-sm">Carregando reservas…</p>}
          {erroReservas && <div role="alert" className="mt-3 text-sm text-amber-200"><p>{erroReservas}</p><button type="button" disabled={salvando || carregandoReservas} onClick={()=>setTentativaReservas(t=>t+1)} className="mt-3 min-h-11 rounded-xl border border-white/20 px-4">Tentar carregar novamente</button></div>}
          <div className="mt-4 grid gap-4 sm:grid-cols-2">
            <label className={labelClass}>Buscar reserva<input aria-label="Buscar reserva da receita" disabled={salvando || carregandoReservas || Boolean(erroReservas)} value={buscaReserva} onChange={e=>setBuscaReserva(e.target.value)} className={inputClass + ' mt-2'} placeholder="Cliente, passeio ou data" /></label>
            <label className={labelClass}>Reserva<select aria-label="Reserva vinculada à receita" disabled={salvando || carregandoReservas || Boolean(erroReservas)} value={reservaId} onChange={e=>escolherReserva(reservas.find(r=>r.id===e.target.value) ?? null)} className={inputClass + ' mt-2'}><option value="">Receita avulsa — sem reserva</option>{reservaSelecionada && !reservasEncontradas.slice(0,100).some(r=>r.id===reservaId) && <option value={reservaId}>{reservaSelecionada.cliente} · {reservaSelecionada.pacote}</option>}{reservasEncontradas.slice(0,100).map(r=><option key={r.id} value={r.id}>{r.cliente} · {r.pacote} · {r.data_reserva} · {r.status} · {r.id.slice(0,8)}</option>)}</select></label>
          </div>
          <p className="mt-2 text-xs text-[#B4C8BB]">{reservasEncontradas.length} reservas na busca.{reservasEncontradas.length > 100 ? ' Refine a busca; o seletor mostra até 100 resultados.' : ''} Trocar a reserva limpa o valor e as datas para evitar lançar a parcela no vínculo errado.</p>
          {reservaSelecionada && <div className="mt-4 rounded-xl border border-white/15 p-4 text-sm leading-7"><p><strong>{reservaSelecionada.cliente}</strong> · {reservaSelecionada.pacote} · {reservaSelecionada.data_reserva}</p><p>Referência da reserva: {reservaSelecionada.id}</p><p>Valor comercial: {reservaSelecionada.valor_total == null ? 'Não informado' : Number(reservaSelecionada.valor_total).toLocaleString('pt-BR',{style:'currency',currency:'BRL'})}. Esse valor não representa saldo a receber.</p>{(reservaSelecionada.status ?? '').toLowerCase().includes('cancelad') && <p className="mt-2 text-amber-200">Esta reserva está cancelada. Confira o histórico e o motivo deste lançamento antes de registrar uma receita.</p>}</div>}
        </section>
        <form onSubmit={salvar} aria-busy={salvando}>
          <fieldset
            disabled={salvando}
            className="grid min-w-0 gap-5 disabled:opacity-70 lg:grid-cols-[1.15fr_0.85fr]"
          >
            <legend className="sr-only">
              Cadastro de receita financeira
            </legend>
            <section className="min-w-0 rounded-2xl border border-white/10 bg-[#0A1713] p-5 sm:rounded-[26px] sm:p-7">
              <h2 className="text-xl font-semibold">
                Dados do lançamento
              </h2>
              <div className="mt-6 space-y-5">
                <div>
                  <label htmlFor="receita-descricao" className={labelClass}>
                    Descrição *
                  </label>
                  <input
                    id="receita-descricao"
                    name="descricao"
                    required
                    value={formData.descricao}
                    onChange={(event) =>
                      alterar('descricao', event.target.value)
                    }
                    placeholder="Ex.: Reserva Expedição Rio Negro"
                    className={inputClass}
                  />
                </div>
                <div className="grid gap-5 sm:grid-cols-2">
                  <div>
                    <label htmlFor="receita-valor" className={labelClass}>
                      Valor (R$) *
                    </label>
                    <input
                      id="receita-valor"
                      name="valor"
                      type="text"
                      inputMode="decimal"
                      required
                      value={formData.valor}
                      onChange={(event) =>
                        alterar('valor', event.target.value)
                      }
                      placeholder="Ex.: 3.500,00"
                      className={inputClass}
                    />
                  </div>
                  <div>
                    <label htmlFor="receita-vencimento" className={labelClass}>
                      Data de vencimento *
                    </label>
                    <input
                      id="receita-vencimento"
                      name="data_vencimento"
                      type="date"
                      required
                      value={formData.data_vencimento}
                      onChange={(event) =>
                        alterar('data_vencimento', event.target.value)
                      }
                      className={inputClass}
                    />
                  </div>
                </div>
                <div>
                  <label htmlFor="receita-categoria" className={labelClass}>
                    Categoria
                  </label>
                  <select
                    id="receita-categoria"
                    name="categoria"
                    value={formData.categoria}
                    onChange={(event) =>
                      alterar('categoria', event.target.value)
                    }
                    className={inputClass}
                  >
                    {CATEGORIAS.map((categoria) => (
                      <option key={categoria} value={categoria}>
                        {categoria}
                      </option>
                    ))}
                  </select>
                </div>
              </div>
            </section>
            <section className="min-w-0 rounded-2xl border border-white/10 bg-[#0A1713] p-5 sm:rounded-[26px] sm:p-7">
              <h2 className="text-xl font-semibold">
                Situação da receita
              </h2>
              <p className="mt-3 text-sm leading-7 text-[#B4C8BB]">
                Selecione Recebido somente quando o dinheiro
                tiver efetivamente entrado.
              </p>
              <div className="mt-5">
                <label htmlFor="receita-status" className={labelClass}>
                  Status
                </label>
                <select
                  id="receita-status"
                  name="status"
                  value={formData.status}
                  onChange={(event) =>
                    alterarStatus(
                      event.target.value === 'Recebido'
                        ? 'Recebido'
                        : 'Pendente',
                    )
                  }
                  className={inputClass}
                >
                  <option value="Recebido">Recebido</option>
                  <option value="Pendente">Pendente</option>
                </select>
              </div>
              {formData.status === 'Recebido' ? (
                <div className="mt-5">
                  <label htmlFor="receita-liquidacao" className={labelClass}>
                    Data do recebimento *
                  </label>
                  <input
                    id="receita-liquidacao"
                    name="data_liquidacao"
                    type="date"
                    required
                    value={formData.data_liquidacao}
                    onChange={(event) =>
                      alterar('data_liquidacao', event.target.value)
                    }
                    aria-describedby="receita-liquidacao-ajuda"
                    className={inputClass}
                  />
                  <p
                    id="receita-liquidacao-ajuda"
                    className="mt-2 text-xs leading-6 text-[#B4C8BB]"
                  >
                    Informe a data real da entrada do dinheiro.
                    Ela pode ser diferente do vencimento.
                  </p>
                </div>
              ) : (
                <p className="mt-5 rounded-xl border border-[#E3A144]/20 bg-[#E3A144]/5 p-4 text-sm leading-6 text-[#F4C77E]">
                  Esta receita ficará a receber e não será somada
                  aos recebimentos realizados.
                </p>
              )}
            </section>
            <div className="flex flex-col-reverse gap-3 border-t border-white/10 pt-5 sm:flex-row sm:justify-end lg:col-span-2">
              {salvando ? (
                <button
                  type="button"
                  disabled
                  className="min-h-12 rounded-xl border border-white/20 px-5 text-sm text-[#B4C8BB]"
                >
                  Cancelar
                </button>
              ) : (
                <Link
                  href="/financeiro"
                  className="inline-flex min-h-12 items-center justify-center rounded-xl border border-white/20 px-5 text-sm font-semibold text-[#EDEDE3] focus-visible:outline-2 focus-visible:outline-offset-4"
                >
                  Cancelar
                </Link>
              )}
              <button
                type="submit"
                disabled={salvando || carregandoReservas || Boolean(erroReservas)}
                className="min-h-12 rounded-xl bg-[#E3A144] px-6 text-sm font-bold text-[#07130F] hover:bg-[#F0B35C] focus-visible:outline-2 focus-visible:outline-offset-4 focus-visible:outline-[#E3A144] disabled:cursor-wait disabled:opacity-60"
              >
                {salvando ? 'Salvando...' : 'Salvar receita'}
              </button>
            </div>
          </fieldset>
        </form>
      </main>
    </div>
  );
}