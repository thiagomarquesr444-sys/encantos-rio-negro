'use client';

// EDA_FICHA_SAUDE_V1: quem viaja nesta reserva + ficha de saúde de cada um.
// Salvo à parte da reserva (como as chegadas). Fichas só aparecem para
// admin/operador; cada consulta fica registrada.

import { useCallback, useEffect, useState, type FormEvent } from 'react';
import { supabase } from '@/lib/supabase';
import FormFichaEDA from '@/app/components/FormFichaEDA';
import {
  fichaDeBanco, gerarLinkFichaEDA, listarFichasReservaEDA, mensagemFichaEDA, salvarFichaEDA,
  type ParticipanteEDA,
} from '@/lib/fichaSaudeEDA';
import { dataCurtaEDA } from '@/lib/passeiosPublicosEDA';
import {
  faixaEtariaEDA, idadeNaDataEDA, RELACOES_PARTICIPANTE, type FaixaEtariaEDA, type PoliticaCriancasEDA,
} from '@/lib/opcoesEDA';
import { copiarEDA } from '@/lib/copiarEDA';

const ROTULO_FAIXA: Record<FaixaEtariaEDA, string> = { adulto: 'Adulto', crianca: 'Criança', colo: 'Colo' };
type ContextoReserva = {
  data: string | null; qtd_criancas: number; qtd_colo: number; politica: PoliticaCriancasEDA | null;
  relacoes: Record<string, string | null>;
};

const ROTULO_NIVEL = { grave: 'Alerta grave', atencao: 'Atenção', ok: 'Sem alertas', pendente: 'Ficha pendente' } as const;

export default function ParticipantesReservaEDA({ reservaId, bloqueado, pessoas }: {
  reservaId?: string; bloqueado: boolean; pessoas: string;
}) {
  const [lista, setLista] = useState<ParticipanteEDA[] | null>(null);
  const [erro, setErro] = useState('');
  const [semPermissao, setSemPermissao] = useState(false);
  const [aberto, setAberto] = useState<string | null>(null);
  const [salvando, setSalvando] = useState(false);
  const [nome, setNome] = useState('');
  const [nascimento, setNascimento] = useState('');
  const [link, setLink] = useState('');
  const [relacao, setRelacao] = useState('');
  const [ctx, setCtx] = useState<ContextoReserva | null>(null);

  const carregar = useCallback(async () => {
    if (!reservaId) return;
    setErro('');
    try {
      setLista(await listarFichasReservaEDA(reservaId));
      // EDA_FAMILIA_RESERVA_V1: relação de cada um e regra de idade do passeio.
      const [{ data: r }, { data: rel }] = await Promise.all([
        supabase.from('reservas').select('data_reserva,qtd_criancas,qtd_colo,passeios(crianca_idade_max,crianca_percentual,colo_idade_max)').eq('id', reservaId).maybeSingle(),
        supabase.from('reserva_participantes').select('id,relacao').eq('reserva_id', reservaId),
      ]);
      const pa = (Array.isArray(r?.passeios) ? r?.passeios[0] : r?.passeios) as PoliticaCriancasEDA | null | undefined;
      setCtx({
        data: r?.data_reserva ?? null, qtd_criancas: Number(r?.qtd_criancas) || 0, qtd_colo: Number(r?.qtd_colo) || 0,
        politica: pa ?? null,
        relacoes: Object.fromEntries((rel ?? []).map((x) => [x.id as string, (x.relacao as string | null) ?? null])),
      });
    } catch (e) {
      const m = mensagemFichaEDA(e);
      if (m.startsWith('Sua função')) setSemPermissao(true); else setErro(m);
      setLista([]);
    }
  }, [reservaId]);

  useEffect(() => { void carregar(); }, [carregar]);

  if (!reservaId) return null;
  if (semPermissao) {
    return <section className="eda-pg-secao" id="participantes"><p className="eda-pg-secao-eb">Participantes e saúde</p>
      <p className="eda-pg-secao-txt">Somente administradores e operadores acessam as fichas de saúde.</p></section>;
  }

  const total = Math.max(Number(pessoas) || 1, 1);
  const faltam = Math.max(total - (lista?.length ?? 0), 0);

  async function adicionar(e: FormEvent) {
    e.preventDefault();
    if (!reservaId) return;
    setSalvando(true); setErro('');
    const { data: perfil } = await supabase.auth.getUser();
    const { data: dono } = await supabase.from('reservas').select('empresa_id').eq('id', reservaId).single();
    const { error } = await supabase.from('reserva_participantes').insert({
      reserva_id: reservaId,
      empresa_id: dono?.empresa_id,
      nome: nome.trim(),
      data_nascimento: nascimento || null,
      titular: !lista?.some((p) => p.titular),
      relacao: lista?.some((p) => p.titular) ? relacao || null : 'titular',
    });
    setSalvando(false);
    if (!perfil.user || error) { setErro(mensagemFichaEDA(error)); return; }
    setNome(''); setNascimento(''); setRelacao('');
    void carregar();
  }

  async function mudarRelacao(id: string, valor: string) {
    const { error } = await supabase.from('reserva_participantes').update({ relacao: valor || null }).eq('id', id);
    if (error) { setErro(mensagemFichaEDA(error)); return; }
    setCtx((c) => c ? { ...c, relacoes: { ...c.relacoes, [id]: valor || null } } : c);
  }

  // Faixa de cada participante pela idade na data da viagem x o que a reserva cobrou.
  const faixas = (lista ?? []).map((p) => faixaEtariaEDA(idadeNaDataEDA(p.data_nascimento, ctx?.data), ctx?.politica ?? null));
  const contagem = { crianca: faixas.filter((f) => f === 'crianca').length, colo: faixas.filter((f) => f === 'colo').length };
  const divergente = ctx?.politica && (contagem.crianca !== ctx.qtd_criancas || contagem.colo !== ctx.qtd_colo)
    && faixas.every((f) => f !== null) && (lista?.length ?? 0) === total;
  const titular = lista?.find((p) => p.titular);

  async function remover(p: ParticipanteEDA) {
    if (!window.confirm(`Remover ${p.nome} da reserva? A ficha de saúde dele também será apagada.`)) return;
    const { error } = await supabase.from('reserva_participantes').delete().eq('id', p.participante_id);
    if (error) { setErro(mensagemFichaEDA(error)); return; }
    void carregar();
  }

  async function gerarLink() {
    if (!reservaId) return;
    setErro('');
    try { setLink(await gerarLinkFichaEDA(reservaId)); } catch (e) { setErro(mensagemFichaEDA(e)); }
  }

  const textoZap = encodeURIComponent(
    `Olá! Para cuidarmos bem de vocês na viagem, preencha a ficha de saúde e segurança de cada participante (leva 2 minutos): ${link}`);

  return (
    <section className="eda-pg-secao eda-pg-largo pr" id="participantes">
      <p className="eda-pg-secao-eb">Participantes e saúde</p>
      <h2>Quem viaja nesta reserva</h2>
      <p className="eda-pg-secao-txt">
        Alergias, alimentação, natação e contato de emergência de cada pessoa. Esses alertas aparecem no resumo da saída e nas demandas.
      </p>

      {erro && <p role="alert" className="pr-erro">{erro}</p>}

      {lista === null ? <p className="pr-nota">Carregando…</p> : (
        <ul className="pr-lista">
          {lista.map((p) => (
            <li key={p.participante_id} data-nivel={p.nivel}>
              <div className="pr-linha">
                <div>
                  <strong>{p.nome}{p.titular && <small> · titular{p.cliente_id ? ' (cliente cadastrado)' : ''}</small>}</strong>
                  {(() => {
                    const idade = idadeNaDataEDA(p.data_nascimento, ctx?.data);
                    const faixa = faixaEtariaEDA(idade, ctx?.politica ?? null);
                    return <span className="pr-faixa">{idade === null ? 'Sem data de nascimento' : `${ROTULO_FAIXA[faixa!]} · ${idade} ano${idade === 1 ? '' : 's'} na viagem`}</span>;
                  })()}
                  {!p.titular && (
                    <select className="pr-relacao" aria-label={`Relação de ${p.nome} com o titular`} disabled={bloqueado}
                      value={ctx?.relacoes[p.participante_id] ?? ''} onChange={(e) => void mudarRelacao(p.participante_id, e.target.value)}>
                      <option value="">Relação com o titular…</option>
                      {RELACOES_PARTICIPANTE.map(([v, r]) => <option key={v} value={v}>{r}</option>)}
                    </select>
                  )}
                  <span className="pr-selo">{ROTULO_NIVEL[p.nivel]}
                    {p.ficha?.preenchido_por === 'turista' && ' · enviada pelo turista'}</span>
                  {p.alertas.length > 0 && p.nivel !== 'pendente' && (
                    <ul className="pr-alertas">{p.alertas.map((a) => <li key={a}>{a}</li>)}</ul>
                  )}
                </div>
                <div className="pr-acoes">
                  <button type="button" className="eda-pg-bt" disabled={bloqueado}
                    onClick={() => setAberto(aberto === p.participante_id ? null : p.participante_id)}>
                    {p.ficha ? 'Editar ficha' : 'Preencher ficha'}
                  </button>
                  <button type="button" className="eda-pg-bt" disabled={bloqueado} onClick={() => remover(p)} aria-label={`Remover ${p.nome}`}>×</button>
                </div>
              </div>
              {aberto === p.participante_id && (
                <div className="pr-form">
                  <FormFichaEDA
                    modo="operadora"
                    inicial={fichaDeBanco(p.ficha)}
                    salvando={salvando}
                    textoBotao="Salvar ficha"
                    textoConsentimento="Declaro que o participante (ou responsável) autorizou o uso destes dados de saúde exclusivamente para a segurança na viagem."
                    onCancelar={() => setAberto(null)}
                    onSalvar={async (ficha) => {
                      setSalvando(true); setErro('');
                      try { await salvarFichaEDA(p.participante_id, ficha, true); setAberto(null); void carregar(); }
                      catch (e) { setErro(mensagemFichaEDA(e)); }
                      finally { setSalvando(false); }
                    }}
                  />
                </div>
              )}
            </li>
          ))}
        </ul>
      )}

      {divergente && (
        <p role="alert" className="pr-aviso">
          Pelas idades, viajam {contagem.crianca} criança(s) e {contagem.colo} de colo, mas a reserva foi cobrada com {ctx!.qtd_criancas} criança(s) e {ctx!.qtd_colo} de colo. Ajuste a quantidade e o valor na reserva.
        </p>
      )}

      {faltam > 0 && (
        <form className="pr-novo" onSubmit={adicionar}>
          <span className="pr-nota">
            {titular
              ? `Faltam ${faltam} acompanhante(s) de ${titular.nome.split(' ')[0]}. Não precisam ser clientes: basta nome, nascimento (define criança/colo) e relação.`
              : `${faltam} de ${total} pessoa(s) sem nome. Escolha o cliente na reserva para ele entrar como titular.`}
          </span>
          <input required minLength={2} maxLength={120} placeholder="Nome completo" value={nome}
            onChange={(e) => setNome(e.target.value)} disabled={bloqueado || salvando} />
          <input type="date" aria-label="Data de nascimento" value={nascimento}
            onChange={(e) => setNascimento(e.target.value)} disabled={bloqueado || salvando} />
          {titular && (
            <select aria-label="Relação com o titular" value={relacao} onChange={(e) => setRelacao(e.target.value)} disabled={bloqueado || salvando}>
              <option value="">Relação…</option>
              {RELACOES_PARTICIPANTE.map(([v, r]) => <option key={v} value={v}>{r}</option>)}
            </select>
          )}
          <button type="submit" className="eda-pg-bt eda-pg-bt-ouro" disabled={bloqueado || salvando}>+ Participante</button>
        </form>
      )}

      <div className="pr-link">
        <button type="button" className="eda-pg-bt" disabled={bloqueado} onClick={gerarLink}>
          {link ? 'Gerar novo link' : 'Gerar link para o turista preencher'}
        </button>
        {link && (
          <>
            <input readOnly value={link} onFocus={(e) => e.target.select()} aria-label="Link da ficha" />
            <button type="button" className="eda-pg-bt" onClick={() => void copiarEDA(link, 'Link da ficha copiado')}>Copiar</button>
            <a className="eda-pg-bt eda-pg-bt-ouro" href={`https://wa.me/?text=${textoZap}`} target="_blank" rel="noopener noreferrer">Enviar no WhatsApp</a>
            <span className="pr-nota">Gerar um novo link desativa o anterior.</span>
          </>
        )}
      </div>

      {lista?.[0]?.expira_em && (
        <p className="pr-nota">As fichas de saúde serão excluídas automaticamente em {dataCurtaEDA(lista[0].expira_em)} (120 dias após a viagem).</p>
      )}

      <style jsx>{`
        .pr h2 { margin: 4px 0; }
        .pr-erro { color: var(--ern-erro, #f87171); font-size: 13px; }
        .pr-nota { display: block; font-size: 12px; color: var(--ern-secundario, #b4c8bb); }
        .pr-lista { list-style: none; margin: 14px 0 0; padding: 0; display: grid; gap: 8px; }
        .pr-lista > li { padding: 12px 14px; border-radius: 14px; border: 1px solid var(--ern-borda); border-left-width: 4px; }
        .pr-lista > li[data-nivel='grave'] { border-left-color: #ef4444; }
        .pr-lista > li[data-nivel='atencao'] { border-left-color: var(--ern-destaque, #e3a144); }
        .pr-lista > li[data-nivel='ok'] { border-left-color: #22c55e; }
        .pr-lista > li[data-nivel='pendente'] { border-left-style: dashed; }
        .pr-linha { display: flex; justify-content: space-between; gap: 12px; align-items: flex-start; }
        .pr-linha strong { display: block; font-size: 15px; } .pr-linha strong small { font-weight: 400; opacity: .7; }
        .pr-selo { font-size: 12px; color: var(--ern-secundario, #b4c8bb); }
        .pr-alertas { margin: 6px 0 0; padding-left: 18px; font-size: 13px; line-height: 1.6; }
        .pr-acoes { display: flex; gap: 6px; flex: none; }
        .pr-form { margin-top: 12px; padding-top: 12px; border-top: 1px solid var(--ern-borda); }
        .pr-novo, .pr-link { display: flex; flex-wrap: wrap; gap: 8px; align-items: center; margin-top: 14px; }
        .pr-novo .pr-nota { flex-basis: 100%; }
        .pr-faixa { display: block; margin-top: 2px; font-size: 12px; color: var(--ern-secundario, #b4c8bb); }
        .pr-relacao, .pr-novo select { min-height: 36px; margin-top: 6px; padding: 0 10px; border-radius: 10px; border: 1px solid var(--ern-borda); background: transparent; color: inherit; font-size: 12px; }
        .pr-novo select { min-height: 40px; margin-top: 0; }
        .pr-aviso { margin-top: 12px; padding: 10px 12px; border-radius: 12px; border: 1px solid #e3a14480; font-size: 12px; line-height: 1.6; }
        .pr-novo input, .pr-link input { min-height: 40px; padding: 0 12px; border-radius: 12px; border: 1px solid var(--ern-borda); background: transparent; color: inherit; }
        .pr-novo input:first-of-type, .pr-link input { flex: 1 1 220px; }
      `}</style>
    </section>
  );
}
