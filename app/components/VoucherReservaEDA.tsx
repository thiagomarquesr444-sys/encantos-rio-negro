'use client';
// EDA_VOUCHER_NA_RESERVA_V1: o voucher do turista mora dentro da reserva.
// Emitir (com sinal/pagamento), nova versão, PDF, WhatsApp, check-in, cancelar e histórico.

import { useCallback, useEffect, useState } from 'react';
import { supabase } from '@/lib/supabase';
import { useAoVivoEDA } from '@/lib/aoVivoEDA';
import { copiarEDA } from '@/lib/copiarEDA';
import {
  baixarPDFVoucherEDA, cancelarVoucherEDA, checkinVoucherEDA, dataBR, emitirVoucherEDA, enviarWhatsAppVoucherEDA,
  linkVerificacaoEDA, listarVouchersReservaEDA, mensagemVoucherEDA, moedaBR, situacaoVoucherEDA,
  type SituacaoVoucherEDA, type VoucherEDA,
} from '@/lib/voucherTuristaEDA';
import { confirmarEDA } from '@/lib/dialogoEDA';

const COR: Record<SituacaoVoucherEDA, string> = {
  Ativo: 'var(--p-verde, #22c55e)', Utilizado: 'var(--p-amar, #f59e0b)', Cancelado: 'var(--p-verm, #ef4444)',
  Substituído: '#38bdf8', Expirado: 'var(--p-amar, #f59e0b)',
};

const sem = (v: string | null | undefined) => (v ?? '').normalize('NFD').replace(/[̀-ͯ]/g, '').trim().toLowerCase();

export default function VoucherReservaEDA({ reservaId, compacto = false }: { reservaId: string; compacto?: boolean }) {
  const [vouchers, setVouchers] = useState<VoucherEDA[] | null>(null);
  const [status, setStatus] = useState('');
  const [pago, setPago] = useState(0);
  const [ocupado, setOcupado] = useState(false);
  const [erro, setErro] = useState('');
  const [aviso, setAviso] = useState('');
  const [verHistorico, setVerHistorico] = useState(false);

  const carregar = useCallback(async () => {
    if (!reservaId) return;
    try {
      const [lista, reserva, fin] = await Promise.all([
        listarVouchersReservaEDA(reservaId),
        supabase.from('reservas').select('status').eq('id', reservaId).maybeSingle(),
        supabase.from('financeiro').select('tipo,status,valor').eq('reserva_id', reservaId).limit(500),
      ]);
      setVouchers(lista);
      setStatus(sem(reserva.data?.status));
      setPago((fin.data ?? []).filter((f) => sem(f.tipo) === 'receita' && ['recebido', 'pago'].includes(sem(f.status)))
        .reduce((n, f) => n + (Number(f.valor) > 0 ? Number(f.valor) : 0), 0));
    } catch (e) {
      setErro(mensagemVoucherEDA(e, 'Não foi possível carregar o voucher desta reserva.'));
    }
  }, [reservaId]);

  useEffect(() => { setVouchers(null); setErro(''); setAviso(''); void carregar(); }, [carregar]);
  useAoVivoEDA(['vouchers', 'reservas', 'financeiro'], () => void carregar());

  async function executar(acao: () => Promise<unknown>, ok?: string) {
    if (ocupado) return;
    setOcupado(true); setErro(''); setAviso('');
    try {
      const r = await acao();
      if (r !== false && ok) setAviso(ok);
      await carregar();
    } catch (e) {
      setErro(e instanceof Error && !e.message.startsWith('EDA_') && !('code' in e) ? e.message : mensagemVoucherEDA(e));
    } finally { setOcupado(false); }
  }

  if (!reservaId) return null;
  const ativo = vouchers?.find((v) => ['Ativo', 'Expirado'].includes(situacaoVoucherEDA(v)) && sem(v.status) === 'ativo') ?? null;
  const atual = ativo ?? vouchers?.[0] ?? null;
  const anteriores = (vouchers ?? []).filter((v) => v.id !== atual?.id);
  const confirmada = status === 'confirmada';
  const podeEmitir = confirmada && pago > 0 && !ativo;

  const emitir = (nova: boolean) => executar(async () => {
    const ok = nova
      ? await confirmarEDA('O voucher será refeito com os dados atuais da reserva. A versão atual fica como Substituída e deixa de valer. Depois, reenvie o novo ao turista.', { titulo: 'Emitir nova versão?', confirmar: 'Emitir nova versão' })
      : await confirmarEDA('Os dados da reserva, dos passageiros e do pagamento ficarão registrados no voucher, como comprovante de compra do turista.', { titulo: 'Emitir o voucher?', confirmar: 'Emitir voucher' });
    if (!ok) return false;
    const v = await emitirVoucherEDA(reservaId, nova);
    setAviso(`Voucher ${v.codigo} emitido${v.versao > 1 ? ` (versão ${v.versao})` : ''}. Baixe o PDF ou envie pelo WhatsApp.`);
    return false;
  });

  return (
    <section className={compacto ? 'eda-pg-bloco' : 'eda-pg-secao eda-pg-largo'} aria-busy={vouchers === null}>
      {compacto ? <p className="eda-pg-bloco-titulo">Voucher do turista</p> : (<>
        <p className="eda-pg-secao-eb">Voucher do turista</p>
        <h2>Comprovante de compra e embarque</h2>
      </>)}

      {vouchers === null && !erro && <p className="eda-pg-texto-mut">Consultando voucher…</p>}

      {vouchers !== null && !atual && (
        <div>
          {!confirmada && <p className="eda-pg-texto-mut">Confirme a reserva para emitir o voucher do turista.</p>}
          {confirmada && pago <= 0 && <p className="eda-pg-texto-mut">Registre o sinal ou o pagamento em Pagamentos para liberar o voucher.</p>}
          {podeEmitir && <p className="eda-pg-texto-mut">Reserva confirmada e com pagamento ({moedaBR(pago)}). Pronta para emitir.</p>}
          <button type="button" className="eda-pg-bt eda-pg-bt-ouro" style={{ marginTop: 10 }} disabled={!podeEmitir || ocupado} onClick={() => void emitir(false)}>
            {ocupado ? 'Emitindo…' : 'Emitir voucher'}
          </button>
        </div>
      )}

      {atual && (() => {
        const sit = situacaoVoucherEDA(atual);
        const f = atual.snapshot?.financeiro;
        const ehAtivo = sem(atual.status) === 'ativo';
        return (
          <div>
            <div className="eda-pg-linha-valor"><span>Código</span><b>{atual.codigo}{(atual.versao ?? 1) > 1 ? ` · v${atual.versao}` : ''}</b></div>
            <div className="eda-pg-linha-valor"><span>Situação</span><b style={{ color: COR[sit] }}>{sit === 'Ativo' ? (atual.enviado_em ? 'Ativo · enviado ao turista' : 'Ativo · ainda não enviado') : sit}</b></div>
            <div className="eda-pg-linha-valor"><span>Embarque</span><b>{dataBR(atual.snapshot?.passeio?.inicio || atual.data_passeio)}{(atual.horario_passeio ?? '').slice(0, 5) ? ` · ${atual.horario_passeio?.slice(0, 5)}` : ''}</b></div>
            <div className="eda-pg-linha-valor"><span>Passageiros</span><b>{atual.snapshot?.passageiros?.length || atual.quantidade_pessoas || '—'}</b></div>
            {f && <div className="eda-pg-linha-valor"><span>Pago / total</span><b>{moedaBR(f.pago)} de {moedaBR(f.total)}</b></div>}
            {f && <div className="eda-pg-linha-valor"><span>Saldo no embarque</span><b style={{ color: f.saldo > 0 ? 'var(--p-amar)' : 'var(--p-verde)' }}>{f.saldo > 0 ? moedaBR(f.saldo) : 'Quitado'}</b></div>}
            {atual.utilizado_em && <div className="eda-pg-linha-valor"><span>Check-in</span><b>{new Date(atual.utilizado_em).toLocaleString('pt-BR', { timeZone: 'America/Manaus' })}</b></div>}
            {sit === 'Cancelado' && atual.motivo_cancelamento && <p className="eda-pg-texto-mut" style={{ marginTop: 8 }}>Motivo: {atual.motivo_cancelamento}</p>}
            {ehAtivo && atual.reserva_alterada_em && (
              <p role="status" style={{ marginTop: 10, color: 'var(--p-amar)', fontSize: 13 }}>A reserva ou o pagamento mudou depois da emissão. Emita a nova versão e reenvie ao turista.</p>
            )}

            <div className="eda-pg-atalhos" style={{ marginTop: 12 }}>
              <button type="button" className="eda-pg-bt eda-pg-bt-p" disabled={ocupado} onClick={() => void executar(() => baixarPDFVoucherEDA(atual))}>Baixar PDF</button>
              {ehAtivo && <button type="button" className="eda-pg-bt eda-pg-bt-p" disabled={ocupado} onClick={() => void executar(() => enviarWhatsAppVoucherEDA(atual))}>{atual.enviado_em ? 'Reenviar WhatsApp' : 'Enviar WhatsApp'}</button>}
              {ehAtivo && <button type="button" className="eda-pg-bt eda-pg-bt-p" disabled={ocupado} onClick={() => void executar(() => checkinVoucherEDA(atual), 'Check-in registrado.')}>Fazer check-in</button>}
              {ehAtivo && <button type="button" className={`eda-pg-bt eda-pg-bt-p ${atual.reserva_alterada_em ? 'eda-pg-bt-ouro' : ''}`} disabled={ocupado} onClick={() => void emitir(true)}>Emitir nova versão</button>}
              {atual.token_verificacao && <button type="button" className="eda-pg-bt eda-pg-bt-p" onClick={() => void copiarEDA(linkVerificacaoEDA(atual), 'Link de verificação copiado')}>Copiar link</button>}
              {ehAtivo && <button type="button" className="eda-pg-bt eda-pg-bt-p eda-pg-bt-perigo" disabled={ocupado} onClick={() => void executar(() => cancelarVoucherEDA(atual), 'Voucher cancelado.')}>Cancelar voucher</button>}
            </div>
            {!ehAtivo && sit !== 'Utilizado' && confirmada && (
              <button type="button" className="eda-pg-bt eda-pg-bt-ouro" style={{ marginTop: 10 }} disabled={!podeEmitir || ocupado} onClick={() => void emitir(false)}>Emitir novo voucher</button>
            )}
          </div>
        );
      })()}

      {anteriores.length > 0 && (
        <div style={{ marginTop: 12 }}>
          <button type="button" className="eda-pg-bt eda-pg-bt-p" onClick={() => setVerHistorico((x) => !x)}>
            {verHistorico ? 'Ocultar histórico' : `Histórico (${anteriores.length})`}
          </button>
          {verHistorico && (
            <ul style={{ marginTop: 8, display: 'grid', gap: 6, fontSize: 13 }}>
              {anteriores.map((v) => (
                <li key={v.id} className="eda-pg-linha-valor">
                  <span>{v.codigo}{(v.versao ?? 1) > 1 ? ` · v${v.versao}` : ''} · {dataBR(v.data_emissao || v.created_at)}</span>
                  <b style={{ color: COR[situacaoVoucherEDA(v)] }}>{situacaoVoucherEDA(v)}</b>
                </li>
              ))}
            </ul>
          )}
        </div>
      )}

      {aviso && <p role="status" style={{ marginTop: 10, color: 'var(--p-verde)', fontSize: 13 }}>{aviso}</p>}
      {erro && <p role="alert" style={{ marginTop: 10, color: 'var(--p-verm)', fontSize: 13 }}>{erro}</p>}
    </section>
  );
}
