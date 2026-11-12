'use client';

// EDA_FASE_C_V1 — Agente de pós-venda.
// Prepara mensagens para os clientes (antes e depois da viagem). A operadora
// revisa e envia pelo próprio WhatsApp: nada é enviado sozinho e nenhum dado
// pessoal sai para IA (o texto é montado aqui, no navegador, com dados do RLS).

import { useEffect, useMemo, useState } from 'react';
import Link from 'next/link';
import { supabase } from '@/lib/supabase';
import { CabecalhoEDA, PaginaEDA, PillEDA, VazioEDA } from '@/app/components/PadraoPaginaEDA';

type Reserva = {
  id: string; cliente: string | null; cliente_id: string | null; pacote: string | null; passeio_id: string | null;
  data_reserva: string; horario: string | null; quantidade_pessoas: number | null; status: string | null;
};
type Item = Reserva & { tipo: 'pre' | 'vespera' | 'pos'; telefone: string | null; ponto: string | null; inclui: string[] };

const hojeManaus = () => new Intl.DateTimeFormat('en-CA', { timeZone: 'America/Manaus' }).format(new Date());
const somar = (iso: string, d: number) => { const x = new Date(`${iso}T12:00:00Z`); x.setUTCDate(x.getUTCDate() + d); return x.toISOString().slice(0, 10); };
const dm = (iso: string) => `${iso.slice(8, 10)}/${iso.slice(5, 7)}`;
const primeiroNome = (n: string | null) => (n ?? '').trim().split(/\s+/)[0] || 'tudo bem';
const telefoneWa = (t: string | null) => {
  const d = (t ?? '').replace(/\D/g, '');
  if (d.length < 10) return null;
  return d.length <= 11 ? `55${d}` : d;
};

function mensagem(i: Item, empresa: string) {
  const nome = primeiroNome(i.cliente);
  const passeio = i.pacote || 'sua experiência';
  const quando = `${dm(i.data_reserva)}${i.horario ? ` às ${i.horario.slice(0, 5)}` : ''}`;
  if (i.tipo === 'pos') {
    return `Olá, ${nome}! Aqui é da ${empresa}. 🌿 Esperamos que ${passeio} tenha sido inesquecível!\n\nSe puder, conte pra gente como foi, de 1 a 5, e mande sua foto favorita — sua opinião ajuda muito a nossa equipe.\n\nObrigado por viver a Amazônia com a gente. Até a próxima! 🌊`;
  }
  const linhas = [
    i.tipo === 'vespera'
      ? `Olá, ${nome}! Aqui é da ${empresa}. Amanhã é o dia: ${passeio}, ${quando}. 🌊`
      : `Olá, ${nome}! Aqui é da ${empresa}. Sua experiência ${passeio} está chegando: ${quando}. 🌊`,
    i.ponto ? `📍 Ponto de embarque: ${i.ponto}` : '',
    i.inclui.length ? `✅ Incluso: ${i.inclui.slice(0, 6).join(', ')}` : '',
    '🎒 Leve: roupa leve de manga longa, chapéu, protetor solar, repelente, capa de chuva, documento com foto e remédios de uso pessoal.',
    i.tipo === 'vespera' ? 'Chegue com 15 minutos de antecedência, combinado?' : 'Se alguém do grupo tiver alergia, restrição alimentar ou não souber nadar, avise a gente por aqui.',
    'Qualquer dúvida, é só responder esta mensagem. Até breve!',
  ];
  return linhas.filter(Boolean).join('\n');
}

export default function PosVendaPage() {
  const [itens, setItens] = useState<Item[] | null>(null);
  const [empresa, setEmpresa] = useState('nossa equipe');
  const [textos, setTextos] = useState<Record<string, string>>({});
  const [enviados, setEnviados] = useState<Record<string, boolean>>({});
  const [erro, setErro] = useState('');
  const [empresaId, setEmpresaId] = useState<string | null>(null);

  useEffect(() => {
    let ativo = true;
    void (async () => {
      const hoje = hojeManaus();
      const { data: auth } = await supabase.auth.getUser();
      const { data: perfil } = auth.user ? await supabase.from('perfis').select('empresa_id').eq('id', auth.user.id).maybeSingle() : { data: null };
      if (perfil?.empresa_id) {
        setEmpresaId(perfil.empresa_id);
        const { data: emp } = await supabase.from('empresa').select('nome').eq('id', perfil.empresa_id).maybeSingle();
        if (ativo && emp?.nome) setEmpresa(emp.nome);
      }
      const { data, error } = await supabase.from('reservas')
        .select('id,cliente,cliente_id,pacote,passeio_id,data_reserva,horario,quantidade_pessoas,status')
        .gte('data_reserva', somar(hoje, -3)).lte('data_reserva', somar(hoje, 3))
        .order('data_reserva').limit(200);
      if (!ativo) return;
      if (error) { setErro('Não foi possível carregar as reservas.'); setItens([]); return; }
      const reservas = ((data ?? []) as Reserva[]).filter(r => !/cancel/i.test(r.status ?? ''));
      const ids = [...new Set(reservas.map(r => r.cliente_id).filter((x): x is string => !!x))];
      const pids = [...new Set(reservas.map(r => r.passeio_id).filter((x): x is string => !!x))];
      const [cli, pas] = await Promise.all([
        ids.length ? supabase.from('clientes').select('id,telefone').in('id', ids) : Promise.resolve({ data: [] as { id: string; telefone: string | null }[] }),
        pids.length ? supabase.from('passeios').select('id,ponto_embarque,inclui').in('id', pids) : Promise.resolve({ data: [] as { id: string; ponto_embarque: string | null; inclui: string[] | null }[] }),
      ]);
      const cliData = (cli.data ?? []) as { id: string; telefone: string | null }[];
      const pasData = (pas.data ?? []) as { id: string; ponto_embarque: string | null; inclui: string[] | null }[];
      const tel = new Map(cliData.map(c => [c.id, c.telefone]));
      const pmap = new Map(pasData.map(p => [p.id, p]));
      const lista: Item[] = reservas.map(r => {
        const tipo: Item['tipo'] = r.data_reserva < hoje ? 'pos' : r.data_reserva === somar(hoje, 1) ? 'vespera' : 'pre';
        const p = r.passeio_id ? pmap.get(r.passeio_id) : undefined;
        return { ...r, tipo, telefone: r.cliente_id ? tel.get(r.cliente_id) ?? null : null, ponto: p?.ponto_embarque ?? null, inclui: Array.isArray(p?.inclui) ? p!.inclui! : [] };
      });
      // Registro compartilhado com a equipe (qualquer aparelho).
      const rids = lista.map(i => i.id);
      if (rids.length) {
        const { data: envs } = await supabase.from('posvenda_envios').select('reserva_id,tipo').in('reserva_id', rids);
        if (ativo) setEnviados(Object.fromEntries(((envs ?? []) as { reserva_id: string; tipo: string }[]).map(e => [`${e.reserva_id}:${e.tipo}`, true])));
      }
      if (ativo) setItens(lista);
    })();
    return () => { ativo = false; };
  }, []);

  const grupos = useMemo(() => ({
    antes: (itens ?? []).filter(i => i.tipo !== 'pos'),
    depois: (itens ?? []).filter(i => i.tipo === 'pos'),
  }), [itens]);

  const chave = (i: Item) => `${i.id}:${i.tipo}`;
  const texto = (i: Item) => textos[chave(i)] ?? mensagem(i, empresa);
  function marcar(i: Item) {
    if (enviados[chave(i)]) return;
    setEnviados(e => ({ ...e, [chave(i)]: true }));
    if (empresaId) {
      void supabase.from('posvenda_envios').upsert({ reserva_id: i.id, tipo: i.tipo, empresa_id: empresaId }, { onConflict: 'reserva_id,tipo', ignoreDuplicates: true }).then(() => undefined);
    }
  }

  const cartao = (i: Item) => {
    const wa = telefoneWa(i.telefone);
    const t = texto(i);
    const feito = enviados[chave(i)];
    return (
      <article key={chave(i)} className="eda-pg-cartao" style={{ display: 'grid' }}>
        <div className="eda-pg-cartao-topo">
          <div>
            <strong>{i.cliente || 'Cliente'}</strong>
            <p className="eda-pg-texto-mut" style={{ margin: '2px 0 0' }}>{i.pacote || 'Passeio'} · {dm(i.data_reserva)}{i.horario ? ` ${i.horario.slice(0, 5)}` : ''} · {i.quantidade_pessoas ?? 1} pessoa(s)</p>
          </div>
          <PillEDA tom={feito ? 'ok' : i.tipo === 'pos' ? 'info' : i.tipo === 'vespera' ? 'at' : 'nt'}>
            {feito ? 'Enviada' : i.tipo === 'pos' ? 'Pós-viagem' : i.tipo === 'vespera' ? 'Véspera' : 'Pré-viagem'}
          </PillEDA>
        </div>
        <textarea
          aria-label="Mensagem para o cliente"
          rows={i.tipo === 'pos' ? 5 : 7}
          value={t}
          onChange={e => setTextos(x => ({ ...x, [chave(i)]: e.target.value }))}
          style={{ width: '100%', padding: 10, borderRadius: 12, font: 'inherit', fontSize: 13.5, color: 'inherit', background: 'var(--p-campo, transparent)', border: '1px solid var(--p-borda, rgb(255 255 255 / 10%))', resize: 'vertical' }}
        />
        <div className="eda-pg-acoes" style={{ flexWrap: 'wrap' }}>
          {wa
            ? <a className="eda-pg-bt eda-pg-bt-p eda-pg-bt-ouro" href={`https://wa.me/${wa}?text=${encodeURIComponent(t)}`} target="_blank" rel="noopener noreferrer" onClick={() => marcar(i)}>Enviar no WhatsApp</a>
            : <span className="eda-pg-texto-mut" style={{ fontSize: 12.5 }}>Cliente sem telefone no cadastro.</span>}
          <button type="button" className="eda-pg-bt eda-pg-bt-p" onClick={() => { void navigator.clipboard?.writeText(t); marcar(i); }}>Copiar</button>
          <Link className="eda-pg-bt eda-pg-bt-p" href={`/reservas/editar/${i.id}`}>Abrir reserva</Link>
        </div>
      </article>
    );
  };

  return (
    <PaginaEDA>
      <CabecalhoEDA
        etiqueta="Reservas · Pós-venda"
        titulo="Mensagens aos clientes"
        resumo="A EDA prepara as mensagens de antes e depois da viagem. Você revisa, ajusta se quiser e envia pelo seu WhatsApp — nada sai sozinho."
        acoes={<Link className="eda-pg-bt" href="/reservas">Voltar às reservas</Link>}
      />
      {erro && <p className="eda-pg-aviso eda-pg-aviso-er" role="alert">{erro}</p>}
      {itens === null ? (
        <p className="eda-pg-estado">Preparando mensagens…</p>
      ) : !itens.length ? (
        <VazioEDA titulo="Nada para enviar agora" texto="Aqui aparecem as viagens dos próximos 3 dias (orientações e lembrete de véspera) e dos últimos 3 dias (agradecimento e avaliação)." />
      ) : (
        <>
          {!!grupos.antes.length && (
            <section className="eda-pg-tabela-caixa" style={{ padding: 12, display: 'grid', gap: 10 }}>
              <h2 className="eda-pg-bloco-titulo" style={{ margin: 4 }}>Antes da viagem</h2>
              {grupos.antes.map(cartao)}
            </section>
          )}
          {!!grupos.depois.length && (
            <section className="eda-pg-tabela-caixa" style={{ padding: 12, display: 'grid', gap: 10 }}>
              <h2 className="eda-pg-bloco-titulo" style={{ margin: 4 }}>Depois da viagem</h2>
              {grupos.depois.map(cartao)}
            </section>
          )}
        </>
      )}
    </PaginaEDA>
  );
}
