'use client';

// EDA_FASE_B_V1: pedidos que chegam da Iara (portal), sempre com consentimento
// do visitante (LGPD). A operadora vê só os pedidos dos próprios passeios (RLS).
// Os pedidos são apagados automaticamente em 90 dias.

import { useEffect, useMemo, useState } from 'react';
import Link from 'next/link';
import { supabase } from '@/lib/supabase';
import { CabecalhoEDA, ChipsEDA, PaginaEDA, PillEDA, VazioEDA, type TomEDA } from '@/app/components/PadraoPaginaEDA';

type Status = 'novo' | 'em_contato' | 'convertido' | 'descartado';
type Pedido = {
  id: string; criado_em: string; passeio_nome: string | null; nome: string;
  contato_whatsapp: string | null; contato_email: string | null; idioma: string;
  periodo: string | null; adultos: number; criancas: number; mensagem: string | null;
  status: Status; expira_em: string;
};

const ROTULO: Record<Status, [string, TomEDA]> = {
  novo: ['Novo', 'at'],
  em_contato: ['Em contato', 'info'],
  convertido: ['Virou reserva', 'ok'],
  descartado: ['Descartado', 'nt'],
};

const dataBR = (iso: string) => new Intl.DateTimeFormat('pt-BR', { timeZone: 'America/Manaus', day: '2-digit', month: '2-digit', hour: '2-digit', minute: '2-digit' }).format(new Date(iso));
const soDigitos = (t: string) => t.replace(/\D/g, '');

export default function PedidosVisitantePage() {
  const [pedidos, setPedidos] = useState<Pedido[] | null>(null);
  const [erro, setErro] = useState('');
  const [filtro, setFiltro] = useState<'abertos' | Status>('abertos');
  const [salvando, setSalvando] = useState<string | null>(null);
  const [copiado, setCopiado] = useState<string | null>(null);

  useEffect(() => {
    let ativo = true;
    supabase.from('pedidos_visitante')
      .select('id,criado_em,passeio_nome,nome,contato_whatsapp,contato_email,idioma,periodo,adultos,criancas,mensagem,status,expira_em')
      .order('criado_em', { ascending: false }).limit(300)
      .then(({ data, error }) => {
        if (!ativo) return;
        if (error) { setErro('Não foi possível carregar os pedidos agora.'); setPedidos([]); return; }
        setPedidos((data ?? []) as Pedido[]);
      });
    return () => { ativo = false; };
  }, []);

  const lista = useMemo(() => (pedidos ?? []).filter(p =>
    filtro === 'abertos' ? p.status === 'novo' || p.status === 'em_contato' : p.status === filtro), [pedidos, filtro]);

  async function mudarStatus(id: string, status: Status) {
    setSalvando(id);
    const { error } = await supabase.from('pedidos_visitante').update({ status, atualizado_em: new Date().toISOString() }).eq('id', id);
    setSalvando(null);
    if (error) { setErro('Não foi possível atualizar o pedido.'); return; }
    setPedidos(ps => (ps ?? []).map(p => (p.id === id ? { ...p, status } : p)));
  }

  async function copiarResumo(p: Pedido) {
    const texto = [
      `Pedido pela Iara — ${dataBR(p.criado_em)}`,
      `Nome: ${p.nome}`,
      p.passeio_nome ? `Passeio: ${p.passeio_nome}` : 'Passeio: a definir',
      `Pessoas: ${p.adultos} adulto(s)${p.criancas ? ` e ${p.criancas} criança(s)` : ''}`,
      p.periodo ? `Período: ${p.periodo}` : '',
      p.mensagem ? `Mensagem: ${p.mensagem}` : '',
    ].filter(Boolean).join('\n');
    try { await navigator.clipboard.writeText(texto); setCopiado(p.id); setTimeout(() => setCopiado(null), 2000); } catch { /* sem permissão */ }
  }

  const contagem = (s: Status) => (pedidos ?? []).filter(p => p.status === s).length;

  return (
    <PaginaEDA>
      <CabecalhoEDA
        etiqueta="Reservas · Iara"
        titulo="Pedidos do portal"
        resumo="Visitantes que conversaram com a Iara e pediram contato. Cada pedido tem consentimento e é apagado em 90 dias (LGPD)."
        acoes={<Link className="eda-pg-bt" href="/reservas">Voltar às reservas</Link>}
      />

      <div className="eda-pg-filtros">
        <ChipsEDA
          rotulo="Filtrar pedidos"
          valor={filtro}
          aoMudar={setFiltro}
          opcoes={[
            { valor: 'abertos', rotulo: 'Abertos', qtd: contagem('novo') + contagem('em_contato') },
            { valor: 'convertido', rotulo: 'Viraram reserva', qtd: contagem('convertido') },
            { valor: 'descartado', rotulo: 'Descartados', qtd: contagem('descartado') },
          ]}
        />
      </div>

      {erro && <p className="eda-pg-aviso eda-pg-aviso-er" role="alert">{erro}</p>}

      {pedidos === null ? (
        <p className="eda-pg-estado">Carregando pedidos…</p>
      ) : !lista.length ? (
        <VazioEDA titulo="Nenhum pedido aqui" texto="Quando um visitante pedir contato pela Iara sobre um passeio seu, ele aparece nesta lista e a EDA te avisa no Painel." />
      ) : (
        <div className="eda-pg-tabela-caixa" style={{ padding: 12, display: 'grid', gap: 10 }}>
          {lista.map(p => {
            const [rotulo, tom] = ROTULO[p.status];
            const zap = p.contato_whatsapp ? soDigitos(p.contato_whatsapp) : '';
            return (
              <article key={p.id} className="eda-pg-cartao" style={{ display: 'grid' }}>
                <div className="eda-pg-cartao-topo">
                  <div>
                    <strong>{p.nome}</strong>
                    <p className="eda-pg-texto-mut" style={{ margin: '2px 0 0' }}>{p.passeio_nome ?? 'Interesse geral'} · {dataBR(p.criado_em)}</p>
                  </div>
                  <PillEDA tom={tom}>{rotulo}</PillEDA>
                </div>
                <div className="eda-pg-cartao-info">
                  <span>{p.adultos} adulto(s){p.criancas ? ` · ${p.criancas} criança(s)` : ''}</span>
                  {p.periodo && <span>Período: {p.periodo}</span>}
                  <span>Idioma: {p.idioma}</span>
                </div>
                {p.mensagem && <p style={{ margin: 0, fontSize: 13.5, whiteSpace: 'pre-wrap' }}>{p.mensagem}</p>}
                <div className="eda-pg-acoes" style={{ flexWrap: 'wrap' }}>
                  {zap && (
                    <a className="eda-pg-bt eda-pg-bt-p eda-pg-bt-ouro" href={`https://wa.me/${zap.length <= 11 ? `55${zap}` : zap}`} target="_blank" rel="noopener noreferrer" onClick={() => p.status === 'novo' && void mudarStatus(p.id, 'em_contato')}>WhatsApp</a>
                  )}
                  {p.contato_email && (
                    <a className="eda-pg-bt eda-pg-bt-p" href={`mailto:${encodeURIComponent(p.contato_email)}`} onClick={() => p.status === 'novo' && void mudarStatus(p.id, 'em_contato')}>E-mail</a>
                  )}
                  <button type="button" className="eda-pg-bt eda-pg-bt-p" onClick={() => void copiarResumo(p)}>{copiado === p.id ? 'Copiado!' : 'Copiar resumo'}</button>
                  <Link className="eda-pg-bt eda-pg-bt-p" href="/reservas/nova" onClick={() => void copiarResumo(p)}>Criar reserva</Link>
                  {p.status !== 'convertido' && <button type="button" className="eda-pg-bt eda-pg-bt-p" disabled={salvando === p.id} onClick={() => void mudarStatus(p.id, 'convertido')}>Marcar como reserva</button>}
                  {p.status !== 'descartado' && <button type="button" className="eda-pg-bt eda-pg-bt-p eda-pg-bt-perigo" disabled={salvando === p.id} onClick={() => void mudarStatus(p.id, 'descartado')}>Descartar</button>}
                </div>
              </article>
            );
          })}
        </div>
      )}
    </PaginaEDA>
  );
}
