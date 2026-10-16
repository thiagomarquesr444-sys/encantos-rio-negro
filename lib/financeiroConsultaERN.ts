import { supabase } from "@/lib/supabase";
export type FiltroPeriodoFinanceiroERN = "mes_atual" | "todos" | "receitas" | "despesas" | "pendentes" | "com_reserva";
export type RegistroFinanceiroERN = {
  id?: string; reserva_id?: string | null; empresa_id?: string | null;
  descricao?: string | null; descrição?: string | null;
  tipo?: string | null; status?: string | null; Status?: string | null;
  categoria?: string | null; data_vencimento?: string | null; data_liquidacao?: string | null;
  valor?: number | string | null; Valor?: number | string | null;
};
export function periodoFinanceiroERN(valor: string | null): FiltroPeriodoFinanceiroERN {
  return ["mes_atual","todos","receitas","despesas","pendentes","com_reserva"].includes(valor ?? "") ? valor as FiltroPeriodoFinanceiroERN : "todos";
}
const normalizar = (valor: string) => valor.normalize("NFD").replace(/[\u0300-\u036f]/g,"").trim().toLowerCase();
export function statusFinanceiroERN(item: RegistroFinanceiroERN): "Recebido" | "Pago" | "Pendente" {
  const status = normalizar(item.status !== undefined ? item.status ?? "" : item.Status ?? "");
  return normalizar(item.tipo ?? "") === "despesa" ? status === "pago" ? "Pago" : "Pendente" : status === "recebido" ? "Recebido" : "Pendente";
}
export function filtrarFinanceiroERN<T extends RegistroFinanceiroERN>(dados: T[], periodo: FiltroPeriodoFinanceiroERN, busca: string, reserva: string, agora = new Date()): T[] {
  const partes = new Intl.DateTimeFormat("en-CA",{timeZone:"America/Manaus",year:"numeric",month:"2-digit"}).formatToParts(agora);
  const mes = `${partes.find(p=>p.type==="year")?.value}-${partes.find(p=>p.type==="month")?.value}`;
  const termo = normalizar(busca);
  return dados.filter(item => {
    if(reserva && item.reserva_id !== reserva) return false;
    const tipo = normalizar(item.tipo ?? "");
    const status = statusFinanceiroERN(item);
    if(periodo === "mes_atual" && item.data_vencimento?.slice(0,7) !== mes) return false;
    if(periodo === "receitas" && tipo !== "receita") return false;
    if(periodo === "despesas" && tipo !== "despesa") return false;
    if(periodo === "pendentes" && status !== "Pendente") return false;
    if(periodo === "com_reserva" && !item.reserva_id) return false;
    return !termo || normalizar(`${item.descricao || item.descrição || ""} ${item.categoria || ""} ${tipo} ${status} ${item.reserva_id || ""}`).includes(termo);
  });
}
export async function consultarFinanceiroERN<T extends RegistroFinanceiroERN>(): Promise<T[]> {
  const {data:auth,error:erroAuth}=await supabase.auth.getUser();
  if(erroAuth||!auth.user)throw new Error("Sua sessão não está disponível. Entre novamente.");
  const {data:perfil,error:erroPerfil}=await supabase.from("perfis").select("empresa_id").eq("id",auth.user.id).single();
  if(erroPerfil||!perfil?.empresa_id)throw new Error("Não foi possível identificar sua empresa.");
  const empresa=String(perfil.empresa_id);
  const resultado:T[]=[];
  let total:number|null=null;
  for(let inicio=0;inicio<10000;inicio+=200){
    const {data,error,count}=await supabase.from("financeiro").select("*",{count:"exact"}).eq("empresa_id",empresa).order("data_vencimento",{ascending:false,nullsFirst:false}).order("id",{ascending:true}).range(inicio,inicio+199);
    if(error)throw error;
    if(count===null||count>10000)throw new Error("O volume financeiro exige filtros no servidor. A consulta foi interrompida para não apresentar totais parciais.");
    if(total!==null&&total!==count)throw new Error("Os lançamentos mudaram durante a consulta. Atualize os dados.");
    total=count;resultado.push(...((data??[]) as T[]));
    if(resultado.length>=count)break;
    if(!data?.length)throw new Error("A consulta financeira ficou incompleta. Tente novamente.");
  }
  if(resultado.length!==total||resultado.some(r=>!r.id)||new Set(resultado.map(r=>r.id)).size!==resultado.length)throw new Error("Não foi possível carregar os lançamentos de forma consistente.");
  return resultado;
}
