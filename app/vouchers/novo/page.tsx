"use client";
import { useEffect, useRef, useState, type FormEvent } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { supabase } from "@/lib/supabase";
import { reservaOperacionalERN } from "@/lib/reservasStatusERN";

type Opcao = { id: string; nome: string };
type Reserva = { id: string; cliente: string | null; pacote: string | null; cliente_id: string | null; passeio_id: string | null; quantidade_pessoas: number | null; data_reserva: string; horario: string | null; valor_total: number | string | null; valor: number | string | null; status: string | null };
type Existente = { id: string; codigo: string; status: string | null };
type Status = "Ativo" | "Utilizado" | "Cancelado";
type Formulario = { codigo: string; clienteId: string; passeioId: string; valor: string; validade: string; status: Status };
const INICIAL: Formulario = { codigo: "", clienteId: "", passeioId: "", valor: "", validade: "", status: "Ativo" };
function converterValorVoucher(entrada: string): number {
  let texto = entrada.trim().replace(/^R\$\s*/i, "");
  if (texto.includes(",")) {
    if (!/^(?:\d+|\d{1,3}(?:\.\d{3})+),\d{1,2}$/.test(texto)) return NaN;
    texto = texto.replace(/\./g, "").replace(",", ".");
  } else if (/^\d{1,3}(?:\.\d{3})+$/.test(texto)) texto = texto.replace(/\./g, "");
  else if (!/^\d+(?:\.\d{1,2})?$/.test(texto)) return NaN;
  const [inteiro, decimal = ""] = texto.split(".");
  const centavos = Number(inteiro) * 100 + Number(decimal.padEnd(2, "0"));
  return Number.isSafeInteger(centavos) && centavos > 0 ? centavos / 100 : NaN;
}
function dataVoucherValida(valor: string): boolean {
  if (!/^\d{4}-\d{2}-\d{2}$/.test(valor)) return false;
  const data = new Date(`${valor}T12:00:00Z`);
  return Number.isFinite(data.getTime()) && data.toISOString().slice(0,10) === valor;
}
const moeda = (valor: number) => valor.toLocaleString("pt-BR", {minimumFractionDigits:2,maximumFractionDigits:2});
const disponivel = (status: string | null) => reservaOperacionalERN(status);
const mensagem = (erro: unknown, fallback: string) => erro && typeof erro === "object" && "message" in erro && typeof erro.message === "string" ? erro.message : fallback;
const codigoNovo = () => `ERN-${crypto.randomUUID().toUpperCase()}`;
const CAMPOS_RESERVA = "id,cliente,pacote,cliente_id,passeio_id,quantidade_pessoas,data_reserva,horario,valor_total,valor,status";
async function listar<T>(tabela: "clientes" | "passeios" | "reservas", colunas: string, empresa: string): Promise<T[]> {
  const registros: T[] = [];
  let total: number | null = null;
  for (let inicio = 0; inicio < 10000; inicio += 200) {
    const {data,error,count} = await supabase.from(tabela).select(colunas,{count:"exact"}).eq("empresa_id",empresa).order("id").range(inicio,inicio+199);
    if (error) throw error;
    if (count === null || count > 10000) throw new Error("O volume de cadastros exige uma busca no servidor. Não foi carregada uma lista parcial.");
    if (total !== null && total !== count) throw new Error("Os cadastros mudaram durante a consulta. Tente novamente.");
    total=count;
    registros.push(...((data ?? []) as unknown as T[]));
    if (registros.length >= count) break;
    if (!data?.length) throw new Error("A consulta ficou incompleta. Tente novamente.");
  }
  if (registros.length !== total || new Set(registros.map(r => (r as {id:string}).id)).size !== registros.length) throw new Error("A consulta não retornou cadastros consistentes.");
  return registros;
}
export default function NovoVoucherPage() {
  const router=useRouter();
  const [form,setForm]=useState<Formulario>(INICIAL);
  const [empresa,setEmpresa]=useState("");
  const [clientes,setClientes]=useState<Opcao[]>([]);
  const [passeios,setPasseios]=useState<Opcao[]>([]);
  const [reservas,setReservas]=useState<Reserva[]>([]);
  const [reservaId,setReservaId]=useState("");
  const [busca,setBusca]=useState("");
  const [carregando,setCarregando]=useState(true);
  const [erroCarga,setErroCarga]=useState("");
  const [erro,setErro]=useState("");
  const [sucesso,setSucesso]=useState(false);
  const [salvando,setSalvando]=useState(false);
  const [tentativa,setTentativa]=useState(0);
  const [existentes,setExistentes]=useState<Existente[]>([]);
  const [totalExistentes,setTotalExistentes]=useState(0);
  const [consultando,setConsultando]=useState(false);
  const [erroExistentes,setErroExistentes]=useState("");
  const [confirmarOutro,setConfirmarOutro]=useState(false);
  const envio=useRef(false);
  const gravado=useRef(false);
  const temporizador=useRef<ReturnType<typeof setTimeout> | null>(null);
  const reserva=reservas.find(r=>r.id===reservaId);
  useEffect(()=>()=>{if(temporizador.current)clearTimeout(temporizador.current);},[]);
  useEffect(()=>{
    let ativo=true;
    async function carregar(){
      setCarregando(true);setErroCarga("");
      try{
        const {data:auth,error:erroAuth}=await supabase.auth.getUser();
        if(erroAuth||!auth.user)throw new Error("Entre novamente para emitir o voucher.");
        const {data:perfil,error:erroPerfil}=await supabase.from("perfis").select("empresa_id").eq("id",auth.user.id).single();
        if(erroPerfil||!perfil?.empresa_id)throw new Error("Sua conta não possui empresa disponível.");
        const emp=String(perfil.empresa_id);
        const [cs,ps,rs]=await Promise.all([listar<Opcao>("clientes","id,nome",emp),listar<Opcao>("passeios","id,nome",emp),listar<Reserva>("reservas",CAMPOS_RESERVA,emp)]);
        if(!ativo)return;
        setEmpresa(emp);setClientes(cs);setPasseios(ps);setReservas(rs);
        setForm(atual=>({...atual,codigo:atual.codigo||codigoNovo()}));
        const pedido=new URLSearchParams(window.location.search).get("reserva_id");
        if(pedido){const r=rs.find(item=>item.id===pedido);if(!r)throw new Error("A reserva indicada não está disponível para sua empresa.");if(!disponivel(r.status))throw new Error("Esta reserva não permite emissão de voucher.");selecionar(r);}
      }catch(falha){if(ativo)setErroCarga(mensagem(falha,"Não foi possível carregar os cadastros."));}
      finally{if(ativo)setCarregando(false);}
    }
    void carregar();return()=>{ativo=false;};
  },[tentativa]);
  async function consultarVinculados(id: string, emp: string){
    const {data,error,count}=await supabase.from("vouchers").select("id,codigo,status",{count:"exact"}).eq("empresa_id",emp).eq("reserva_id",id).order("created_at",{ascending:false}).range(0,4);
    if(error)throw error;if(count===null)throw new Error("Não foi possível conferir os vouchers da reserva.");
    return {itens:(data ?? []) as Existente[],total:count};
  }
  useEffect(()=>{
    let ativo=true;setExistentes([]);setTotalExistentes(0);setConfirmarOutro(false);setErroExistentes("");
    if(!reservaId||!empresa){setConsultando(false);return;}
    setConsultando(true);
    void consultarVinculados(reservaId,empresa).then(resultado=>{if(ativo){setExistentes(resultado.itens);setTotalExistentes(resultado.total);}}).catch(falha=>{if(ativo)setErroExistentes(mensagem(falha,"Não foi possível conferir os vouchers existentes."));}).finally(()=>{if(ativo)setConsultando(false);});
    return()=>{ativo=false;};
  },[reservaId,empresa,tentativa]);
  function selecionar(r: Reserva | null){
    if(envio.current)return;
    setReservaId(r?.id??"");setErro("");setConfirmarOutro(false);
    const valor=Number(r?.valor_total??r?.valor);
    setForm(atual=>({...atual,clienteId:r?.cliente_id??"",passeioId:r?.passeio_id??"",valor:r&&Number.isFinite(valor)&&valor>0?moeda(valor):"",validade:""}));
  }
  async function salvar(event: FormEvent<HTMLFormElement>){
    event.preventDefault();
    if(envio.current||carregando||erroCarga||consultando||erroExistentes)return;
    setErro("");const valor=converterValorVoucher(form.valor);
    if(!form.codigo.trim()){setErro("Informe o código do voucher.");return;}
    if(!Number.isFinite(valor)){setErro("Informe um valor maior que zero, com até duas casas decimais.");return;}
    if(form.validade&&!dataVoucherValida(form.validade)){setErro("Informe uma validade válida.");return;}
    if(!reservaId&&(!form.clienteId||!form.passeioId)){setErro("Selecione cliente e passeio para o voucher avulso.");return;}
    if(reservaId&&(!reserva||!disponivel(reserva.status))){setErro("Selecione uma reserva disponível.");return;}
    if(totalExistentes>0&&!confirmarOutro){setErro("Confira os vouchers já emitidos e confirme se deseja emitir outro.");return;}
    envio.current=true;setSalvando(true);
    try{
      const {data:auth,error:erroAuth}=await supabase.auth.getUser();if(erroAuth||!auth.user)throw new Error("Sua sessão expirou. Entre novamente.");
      const {data:perfil,error:erroPerfil}=await supabase.from("perfis").select("empresa_id").eq("id",auth.user.id).single();
      if(erroPerfil||perfil?.empresa_id!==empresa)throw new Error("O vínculo da sua conta mudou. Recarregue a página.");
      let atual=reserva;
      if(reservaId){
        const {data,error}=await supabase.from("reservas").select(CAMPOS_RESERVA).eq("empresa_id",empresa).eq("id",reservaId).single();
        if(error||!data)throw new Error("A reserva não está mais disponível.");atual=data as Reserva;
        if(!disponivel(atual.status))throw new Error("A reserva não está operacional. Emissão bloqueada.");
        if(CAMPOS_RESERVA.split(",").some(campo => atual![campo as keyof Reserva] !== reserva?.[campo as keyof Reserva])){
          setReservas(lista=>lista.map(r=>r.id===atual!.id?atual!:r));
          throw new Error("A reserva foi alterada. Confira os dados atualizados antes de emitir. O valor do voucher deve ser revisado por você.");
        }
        const vinculados=await consultarVinculados(reservaId,empresa);
        if(vinculados.total!==totalExistentes){setExistentes(vinculados.itens);setTotalExistentes(vinculados.total);setConfirmarOutro(false);throw new Error("A quantidade de vouchers vinculados mudou. Confira a lista antes de emitir.");}
      }
      const {data:emitido,error}=await supabase.from("vouchers").insert({codigo:form.codigo.trim(),reserva_id:reservaId||null,cliente_id:atual?.cliente_id??(reservaId?null:form.clienteId),passeio_id:atual?.passeio_id??(reservaId?null:form.passeioId),valor,status:form.status,validade:form.validade||null,empresa_id:empresa}).select("id").single();
      if(error)throw error;if(!emitido?.id)throw new Error("Não foi possível confirmar a emissão. Consulte a lista antes de tentar novamente.");
      gravado.current=true;setSucesso(true);
      temporizador.current=setTimeout(()=>{router.push("/vouchers");router.refresh();},1000);
    }catch(falha){setErro(mensagem(falha,"Não foi possível emitir. Consulte a lista antes de repetir se houve falha de conexão."));}
    finally{if(!gravado.current){envio.current=false;setSalvando(false);}}
  }
  const campo="mt-2 min-h-12 w-full min-w-0 rounded-xl border border-white/15 bg-[#07110E] px-3 py-2 text-sm text-[#EDEDE3] disabled:opacity-50";
  const botao="min-h-12 rounded-xl border border-white/20 px-4 py-3 text-sm disabled:opacity-50";
  const candidatas=reservas.filter(r=>disponivel(r.status)&&`${r.cliente} ${r.pacote} ${r.data_reserva} ${r.id}`.normalize("NFD").replace(/[\u0300-\u036f]/g,"").toLowerCase().includes(busca.normalize("NFD").replace(/[\u0300-\u036f]/g,"").toLowerCase()));
  return <main className="min-h-screen min-w-0 bg-[#07110E] px-4 py-8 text-[#EDEDE3] sm:px-6">
    <div className="mx-auto max-w-5xl"><Link href="/vouchers" className="inline-flex min-h-11 items-center text-sm text-[#F4C77E]">← Vouchers</Link>
      <h1 className="mt-5 text-3xl sm:text-4xl" style={{fontFamily:"var(--font-fraunces), serif"}}>Emitir voucher</h1>
      <p className="mt-3 text-sm leading-7 text-[#EDEDE3]/65">Use os dados de uma reserva ou emita um voucher avulso. A emissão não registra um pagamento.</p>
      {carregando&&<p role="status" className="mt-6">Carregando cadastros…</p>}
      {erroCarga&&<div role="alert" className="mt-5 rounded-xl border border-red-400/30 p-4"><p>{erroCarga}</p><button type="button" className={botao+" mt-3"} onClick={()=>setTentativa(t=>t+1)}>Tentar carregar novamente</button></div>}
      {!carregando&&!erroCarga&&<form onSubmit={salvar} className="mt-6 space-y-5">
        <fieldset disabled={salvando} className="min-w-0 space-y-5 disabled:opacity-70">
          <section className="rounded-2xl border border-[#E3A144]/25 bg-[#0C211A] p-4 sm:p-6">
            <h2 className="text-lg text-[#F4C77E]">Origem do voucher</h2>
            <label className="mt-4 block text-sm">Buscar reserva<input aria-label="Buscar reserva" value={busca} onChange={e=>setBusca(e.target.value)} placeholder="Cliente, passeio ou data" className={campo}/></label>
            <label className="mt-4 block text-sm">Reserva vinculada<select aria-label="Reserva vinculada" value={reservaId} className={campo} onChange={e=>selecionar(reservas.find(r=>r.id===e.target.value)??null)}><option value="">Voucher avulso — sem reserva</option>{reserva&&!candidatas.slice(0,100).some(r=>r.id===reservaId)&&<option value={reservaId}>{reserva.cliente} · {reserva.pacote}</option>}{candidatas.slice(0,100).map(r=><option key={r.id} value={r.id}>{r.cliente||"Cliente não informado"} · {r.pacote||"Passeio não informado"} · {r.data_reserva} · {r.id.slice(0,8)}</option>)}</select></label>
            <p className="mt-2 text-xs text-[#EDEDE3]/65">{candidatas.length} reservas disponíveis na busca.{candidatas.length>100?" Refine a busca para localizar sua reserva; o seletor mostra até 100 resultados.":""}</p>
            {reserva&&<div className="mt-4 rounded-xl border border-white/15 p-4 text-sm leading-7"><p><strong>{reserva.cliente}</strong> · {reserva.pacote}</p><p>{reserva.quantidade_pessoas == null ? "Quantidade não informada" : `${reserva.quantidade_pessoas} pessoas`} · {reserva.data_reserva} · {reserva.horario?.slice(0,5)||"Horário não informado"}</p><p className="mt-2 text-xs text-[#EDEDE3]/65">Esses dados serão preservados no voucher no momento da emissão, inclusive quando a reserva usa digitação livre.</p></div>}
            {consultando&&<p role="status" className="mt-3 text-xs">Conferindo vouchers já vinculados…</p>}
            {erroExistentes&&<div role="alert" className="mt-3 text-amber-200"><p>{erroExistentes}</p><button type="button" className={botao} onClick={()=>setTentativa(t=>t+1)}>Conferir novamente</button></div>}
            {totalExistentes>0&&<div className="mt-4 rounded-xl border border-amber-400/30 p-4 text-sm"><p>Esta reserva já possui {totalExistentes} voucher(s).</p><ul className="mt-2 space-y-1">{existentes.map(v=><li key={v.id}>{v.codigo} · {v.status}</li>)}</ul>{totalExistentes>5&&<p className="mt-2 text-xs">Exibindo os cinco mais recentes. Confira os demais na listagem.</p>}<label className="mt-3 flex min-h-11 items-center gap-3"><input type="checkbox" checked={confirmarOutro} onChange={e=>setConfirmarOutro(e.target.checked)}/>Conferi os vouchers existentes e quero emitir outro para esta reserva.</label></div>}
          </section>
          {!reservaId&&<section className="grid gap-4 rounded-2xl border border-white/10 p-4 sm:grid-cols-2 sm:p-6"><label className="text-sm">Cliente cadastrado *<select aria-label="Cliente cadastrado" required value={form.clienteId} className={campo} onChange={e=>setForm(f=>({...f,clienteId:e.target.value}))}><option value="">Selecione</option>{clientes.map(c=><option key={c.id} value={c.id}>{c.nome}</option>)}</select></label><label className="text-sm">Passeio cadastrado *<select aria-label="Passeio cadastrado" required value={form.passeioId} className={campo} onChange={e=>setForm(f=>({...f,passeioId:e.target.value}))}><option value="">Selecione</option>{passeios.map(p=><option key={p.id} value={p.id}>{p.nome}</option>)}</select></label></section>}
          <section className="grid gap-4 rounded-2xl border border-white/10 p-4 sm:grid-cols-2 sm:p-6">
            <label className="text-sm">Código único *<input aria-label="Código do voucher" required value={form.codigo} className={campo} onChange={e=>setForm(f=>({...f,codigo:e.target.value}))}/></label>
            <label className="text-sm">Valor do voucher (R$) *<input aria-label="Valor do voucher" required inputMode="decimal" value={form.valor} className={campo} onChange={e=>setForm(f=>({...f,valor:e.target.value}))} onBlur={()=>{const v=converterValorVoucher(form.valor);if(Number.isFinite(v))setForm(f=>({...f,valor:moeda(v)}));}}/></label>
            <label className="text-sm">Validade opcional<input aria-label="Validade do voucher" type="date" value={form.validade} className={campo} onChange={e=>setForm(f=>({...f,validade:e.target.value}))}/></label>
            <label className="text-sm">Status<select aria-label="Status do voucher" value={form.status} className={campo} onChange={e=>setForm(f=>({...f,status:e.target.value as Status}))}>{["Ativo","Utilizado","Cancelado"].map(s=><option key={s}>{s}</option>)}</select></label>
          </section>
        </fieldset>
        {erro&&<p role="alert" className="rounded-xl border border-red-400/30 p-4 text-sm text-red-200">{erro}</p>}
        {sucesso&&<p role="status" className="rounded-xl border border-emerald-400/30 p-4 text-sm text-emerald-200">Voucher emitido com sucesso.</p>}
        <div className="flex flex-wrap justify-end gap-3"><Link href="/vouchers" className={botao}>Voltar</Link><button type="submit" disabled={salvando||consultando||!!erroExistentes} className={botao+" bg-[#E3A144] font-semibold text-[#07110E]"}>{salvando?"Emitindo…":"Emitir voucher"}</button></div>
      </form>}
    </div>
  </main>;
}
