'use client';

// EDA_RESUMO_SEGURANCA_V1: resumo de segurança da saída, preparado pela EDA.
// Mostra o que as fichas de saúde pedem (alertas por pessoa), as precauções que
// a equipe deve tomar antes de embarcar e os primeiros socorros do rio, cada
// um com a fonte oficial. O acesso às fichas fica registrado (LGPD) pela própria
// função do banco. Orientação geral: não substitui treinamento nem atendimento médico.
// Fica dentro de /reservas para herdar a proteção de acesso da área da operadora.

import { useCallback, useEffect, useMemo, useState, type ReactNode } from 'react';
import Link from 'next/link';
import { useParams } from 'next/navigation';
import { supabase } from '@/lib/supabase';
import { CabecalhoEDA, PaginaEDA, PillEDA, VazioEDA } from '@/app/components/PadraoPaginaEDA';
import { mensagemFichaEDA, resumoSegurancaEDA, type LinhaResumoEDA } from '@/lib/fichaSaudeEDA';
import './seguranca-eda.css';

type Saida = { id: string; passeio_id: string | null; data_inicio: string; data_fim: string | null; horario: string | null };
type DemandaSaude = { id: string; titulo: string | null; status: string | null; saude_preparada_em: string | null };

const dm = (iso?: string | null) => (iso ? `${iso.slice(8, 10)}/${iso.slice(5, 7)}` : '');

// Ilustrações próprias (traço da marca), sem depender de imagens externas.
const ARTE: Record<string, ReactNode> = {
  alergia: <><circle cx="32" cy="32" r="20" /><path d="M32 20v14M32 41v1" /><path d="M14 14l6 6M50 14l-6 6" /></>,
  agua: <><path d="M6 44c6-6 12-6 18 0s12 6 18 0 12-6 16 0" /><path d="M6 54c6-6 12-6 18 0s12 6 18 0 12-6 16 0" /><circle cx="34" cy="20" r="6" /><path d="M24 34l10-6 10 6" /></>,
  coracao: <><path d="M32 52S10 40 10 24a11 11 0 0 1 22-3 11 11 0 0 1 22 3c0 16-22 28-22 28z" /><path d="M14 32h10l4-8 6 14 4-6h12" /></>,
  remedio: <><rect x="12" y="24" width="40" height="18" rx="9" /><path d="M32 24v18" /><path d="M20 12h24M26 12v6M38 12v6" /></>,
  comida: <><path d="M18 10v20M12 10v10a6 6 0 0 0 12 0V10M18 30v24" /><path d="M44 10c-6 4-8 12-6 22h6V10zM44 32v22" /></>,
  telefone: <><rect x="20" y="8" width="24" height="48" rx="5" /><path d="M28 48h8" /><path d="M27 22h10M32 17v10" /></>,
  cobra: <><path d="M10 50c8 0 8-10 16-10s8 10 16 10 12-6 12-14-6-14-14-14-12 4-12 10" /><circle cx="42" cy="26" r="1.5" /><path d="M54 22l6-4" /></>,
  sol: <><circle cx="32" cy="30" r="10" /><path d="M32 8v6M32 46v6M10 30h6M48 30h6M16 14l4 4M48 14l-4 4M16 46l4-4M48 46l-4-4" /><path d="M22 58h20" /></>,
  arraia: <><path d="M32 12c14 4 22 12 22 20S44 44 32 44 10 40 10 32s8-16 22-20z" /><path d="M32 44v14" /><circle cx="26" cy="26" r="1.5" /><circle cx="38" cy="26" r="1.5" /></>,
  radio: <><rect x="18" y="20" width="28" height="36" rx="5" /><path d="M26 20V8" /><circle cx="32" cy="34" r="6" /><path d="M26 48h12" /></>,
};
function Arte({ nome }: { nome: string }) {
  return <svg viewBox="0 0 64 64" fill="none" stroke="currentColor" strokeWidth="2.4" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">{ARTE[nome]}</svg>;
}

type Fonte = { nome: string; href: string };
const FONTES: Record<'samu' | 'peconhentos' | 'sobrasa', Fonte> = {
  samu: { nome: 'Ministério da Saúde · SAMU 192', href: 'https://www.gov.br/saude/pt-br/composicao/saes/samu-192' },
  peconhentos: { nome: 'Ministério da Saúde · Guia de Animais Peçonhentos do Brasil', href: 'http://bvsms.saude.gov.br/bvs/publicacoes/guia_animais_peconhentos_brasil.pdf' },
  sobrasa: { nome: 'Sobrasa · ABC dos Primeiros Socorros', href: 'https://sobrasa.org/dowloads/Primeiros_socorros/manual_ABC_dos_Primeiros_Socorros.pdf' },
};

type Cartao = { chave: string; arte: string; titulo: string; quando: string; passos: string[]; evite?: string; fonte: Fonte; tom: 'er' | 'at' | 'nt' };

// Precauções ligadas ao que as fichas desta saída informaram.
function precaucoes(linhas: LinhaResumoEDA[]): Cartao[] {
  const tudo = linhas.flatMap((l) => l.alertas).join(' | ').toLowerCase();
  const n = (re: RegExp) => linhas.filter((l) => l.alertas.some((a) => re.test(a.toLowerCase()))).length;
  const lista: Cartao[] = [];
  const alergiaGrave = n(/alergia grave/);
  const alergia = n(/alergia/);
  if (alergia) lista.push({
    chave: 'alergia', arte: 'alergia', tom: alergiaGrave ? 'er' : 'at',
    titulo: alergiaGrave ? `Alergia grave a bordo (${alergiaGrave})` : `Alergia informada (${alergia})`,
    quando: 'Antes de comprar o rancho e antes de servir qualquer refeição.',
    passos: [
      'Confira o que a ficha diz e tire o item do cardápio do grupo inteiro, não só do prato da pessoa.',
      'Avise a cozinha e o guia: nada de usar a mesma tábua, óleo ou colher.',
      'A medicação de emergência da pessoa fica com ela ou com o guia, nunca no porão.',
      'Falta de ar, inchaço no rosto ou desmaio: é emergência. Acione o socorro e siga para o atendimento mais próximo.',
    ],
    evite: 'Não ofereça "só um pouquinho" e não dê remédio por conta própria.',
    fonte: FONTES.samu,
  });
  const naoNada = n(/não sabe nadar/);
  if (naoNada || /natação não informada/.test(tudo)) lista.push({
    chave: 'nadar', arte: 'agua', tom: naoNada ? 'er' : 'at',
    titulo: naoNada ? `Não sabe nadar (${naoNada})` : 'Natação não informada',
    quando: 'Do embarque ao desembarque, inclusive nas paradas para banho.',
    passos: [
      'Colete do tamanho certo, afivelado o tempo todo na embarcação.',
      'Sente a pessoa longe da borda e perto do guia.',
      'Banho de rio só em área rasa, com colete e um responsável olhando.',
      'Quem não informou se sabe nadar é tratado como quem não sabe.',
    ],
    fonte: FONTES.sobrasa,
  });
  if (/saúde:/.test(tudo)) lista.push({
    chave: 'condicao', arte: 'coracao', tom: n(/cardíaca|cardiaca|epilepsia|gestante/) ? 'er' : 'at',
    titulo: `Condição de saúde informada (${n(/saúde:/)})`,
    quando: 'No planejamento do roteiro e durante toda a viagem.',
    passos: [
      'Leia o detalhe na ficha e combine com a pessoa, em particular, o que ela precisa.',
      'Evite esforço longo, sol forte e trechos sem saída rápida para quem tem restrição.',
      'Deixe definido quem acompanha a pessoa e por onde é a volta mais rápida até a cidade.',
      'Mal súbito, dor no peito, convulsão ou desmaio: acione o socorro na hora.',
    ],
    fonte: FONTES.samu,
  });
  if (/medicação contínua/.test(tudo)) lista.push({
    chave: 'medicacao', arte: 'remedio', tom: 'at',
    titulo: `Medicação contínua (${n(/medicação contínua/)})`,
    quando: 'Na véspera e a cada dia de viagem.',
    passos: [
      'Confirme com a pessoa que ela trouxe o remédio para todos os dias, com folga.',
      'Guarde em local seco e fresco; se precisa de gelo, reserve espaço na caixa térmica.',
      'Combine os horários para que o roteiro não atrapalhe a dose.',
    ],
    evite: 'A equipe não muda dose nem empresta remédio de outra pessoa.',
    fonte: FONTES.samu,
  });
  if (/alimentação:/.test(tudo)) lista.push({
    chave: 'alimentacao', arte: 'comida', tom: 'nt',
    titulo: `Restrição alimentar (${n(/alimentação:/)})`,
    quando: 'Na lista de compras e no preparo.',
    passos: [
      'Inclua na demanda os itens para essa pessoa e marque na lista.',
      'Avise a cozinha antes da primeira refeição.',
      'Tenha sempre uma opção segura no lanche de bordo.',
    ],
    fonte: FONTES.samu,
  });
  if (/sem contato de emergência/.test(tudo)) lista.push({
    chave: 'contato', arte: 'telefone', tom: 'at',
    titulo: `Sem contato de emergência (${n(/sem contato de emergência/)})`,
    quando: 'Antes do embarque.',
    passos: [
      'Peça o nome e o telefone de alguém que não vai na viagem.',
      'Registre na ficha do participante, dentro da reserva.',
    ],
    fonte: FONTES.samu,
  });
  return lista;
}

// Primeiros socorros do rio: valem para toda saída.
const SOCORROS: Cartao[] = [
  {
    chave: 'afogamento', arte: 'agua', tom: 'er', titulo: 'Afogamento',
    quando: 'Alguém em dificuldade na água.',
    passos: [
      'Não entre na água sem treinamento: jogue algo que flutue (colete, boia, galão vazio) e estenda um remo ou corda.',
      'Peça ajuda: Bombeiros 193 ou SAMU 192.',
      'Fora da água, respirando e desacordada: deite a pessoa de lado.',
      'Sem respirar: comece a reanimação e não pare até o socorro chegar ou a pessoa reagir.',
    ],
    evite: 'Quem entra para salvar sem preparo costuma virar a segunda vítima.',
    fonte: FONTES.sobrasa,
  },
  {
    chave: 'cobra', arte: 'cobra', tom: 'er', titulo: 'Picada de cobra',
    quando: 'Trilha, acampamento ou beira de rio.',
    passos: [
      'Lave o local com água e sabão.',
      'Mantenha a pessoa calma e em repouso.',
      'Leve imediatamente ao serviço de saúde: o soro só é aplicado lá.',
    ],
    evite: 'Não faça torniquete, não corte, não esprema e não passe nada no local.',
    fonte: FONTES.peconhentos,
  },
  {
    chave: 'arraia', arte: 'arraia', tom: 'at', titulo: 'Ferrada de arraia',
    quando: 'Praias e águas rasas, principalmente na seca.',
    passos: [
      'Previna: entre na água arrastando os pés, sem pisar.',
      'Aconteceu: tire a pessoa da água e lave o ferimento com água limpa.',
      'Procure o serviço de saúde: a dor é forte e o ferimento infecciona com facilidade.',
    ],
    evite: 'Não corte nem amarre o local.',
    fonte: FONTES.peconhentos,
  },
  {
    chave: 'calor', arte: 'sol', tom: 'at', titulo: 'Calor e desidratação',
    quando: 'Sol forte, pescaria longa, praia.',
    passos: [
      'Água à vontade o dia todo, sombra e pausas.',
      'Tontura, dor de cabeça forte ou confusão: leve para a sombra, refresque e ofereça água aos poucos.',
      'Não melhorou, desmaiou ou parou de suar: acione o socorro.',
    ],
    fonte: FONTES.samu,
  },
  {
    chave: 'socorro', arte: 'radio', tom: 'nt', titulo: 'Como pedir socorro',
    quando: 'Qualquer emergência com risco de vida.',
    passos: [
      'SAMU 192 e Bombeiros 193: a ligação é gratuita.',
      'Diga onde está (rio, comunidade mais próxima, ponto de referência), o que houve e quantas pessoas.',
      'Sem sinal: use o rádio da embarcação e siga para a comunidade ou cidade mais próxima com atendimento.',
      'Antes de sair, deixe combinado com alguém em terra o roteiro e o horário de volta.',
    ],
    fonte: FONTES.samu,
  },
];

function CartaoSeguranca({ c }: { c: Cartao }) {
  return (
    <article className="eda-seg-cartao" data-tom={c.tom}>
      <div className="eda-seg-arte"><Arte nome={c.arte} /></div>
      <div className="eda-seg-corpo">
        <h3>{c.titulo}</h3>
        <p className="eda-seg-quando">{c.quando}</p>
        <ol>{c.passos.map((p) => <li key={p}>{p}</li>)}</ol>
        {c.evite && <p className="eda-seg-evite"><b>Evite:</b> {c.evite}</p>}
        <a className="eda-seg-fonte" href={c.fonte.href} target="_blank" rel="noopener noreferrer">Fonte: {c.fonte.nome} ↗</a>
      </div>
    </article>
  );
}

export default function ResumoSegurancaPage() {
  const { id } = useParams<{ id: string }>();
  const [saida, setSaida] = useState<Saida | null>(null);
  const [passeio, setPasseio] = useState('');
  const [linhas, setLinhas] = useState<LinhaResumoEDA[] | null>(null);
  const [demandas, setDemandas] = useState<DemandaSaude[]>([]);
  const [erro, setErro] = useState('');
  const [aviso, setAviso] = useState('');
  const [confirmando, setConfirmando] = useState(false);

  const carregar = useCallback(async () => {
    setErro('');
    try {
      const { data: s, error } = await supabase.from('passeio_saidas').select('id,passeio_id,data_inicio,data_fim,horario').eq('id', id).maybeSingle();
      if (error) throw error;
      if (!s) { setErro('Não encontrei essa saída na sua empresa.'); setLinhas([]); return; }
      const sd = s as unknown as Saida;
      setSaida(sd);
      let nome = 'Passeio';
      if (sd.passeio_id) {
        const { data: ps } = await supabase.from('passeios').select('nome').eq('id', sd.passeio_id).maybeSingle();
        nome = String((ps as { nome?: string | null } | null)?.nome ?? 'Passeio');
      }
      const [dem, resumo] = await Promise.all([
        supabase.from('demandas').select('id,titulo,status,saude_preparada_em').eq('saida_id', id).neq('status', 'cancelada'),
        resumoSegurancaEDA({ saidaId: id }),
      ]);
      setPasseio(nome);
      setDemandas((dem.data ?? []) as unknown as DemandaSaude[]);
      setLinhas(resumo);
    } catch (e) {
      setErro(mensagemFichaEDA(e));
      setLinhas([]);
    }
  }, [id]);

  useEffect(() => { void carregar(); }, [carregar]);

  const comAlerta = useMemo(() => (linhas ?? []).filter((l) => l.nivel !== 'ok'), [linhas]);
  const graves = comAlerta.filter((l) => l.nivel === 'grave').length;
  const atencao = comAlerta.filter((l) => l.nivel === 'atencao').length;
  const pendentes = comAlerta.filter((l) => l.nivel === 'pendente').length;
  const cartoes = useMemo(() => precaucoes(linhas ?? []), [linhas]);
  const preparada = demandas.some((d) => d.saude_preparada_em);

  async function confirmarPreparo() {
    if (confirmando) return;
    setConfirmando(true);
    setAviso('');
    try {
      let feito = false;
      for (const d of demandas.filter((x) => x.status === 'rascunho' || x.status === 'aberta')) {
        const { data, error } = await supabase.rpc('confirmar_preparo_saude_eda', { p_demanda_id: d.id });
        if (error) throw error;
        if (data) { feito = true; break; }
      }
      if (feito) {
        setAviso('Preparo confirmado. O alerta de saúde desta saída sai do Painel; ele volta sozinho se alguma ficha mudar.');
        await carregar();
      } else {
        setAviso(demandas.length
          ? 'Para confirmar, a demanda desta saída precisa ter os itens de saúde na lista (abra a demanda: a EDA sugere os itens pelas fichas).'
          : 'Esta saída ainda não tem demanda. Crie a demanda de suprimentos para registrar o preparo de saúde.');
      }
    } catch (e) {
      setAviso(mensagemFichaEDA(e));
    } finally {
      setConfirmando(false);
    }
  }

  const periodo = saida ? `${dm(saida.data_inicio)}${saida.data_fim && saida.data_fim !== saida.data_inicio ? ` a ${dm(saida.data_fim)}` : ''}${saida.horario ? ` · ${saida.horario.slice(0, 5)}` : ''}` : '';

  return (
    <PaginaEDA>
      <div className="eda-pg-miolo eda-seg">
        <CabecalhoEDA
          capa
          etiqueta="Segurança da saída"
          titulo={saida ? `${passeio} · ${periodo}` : 'Resumo de segurança'}
          resumo={linhas === null ? 'A EDA está lendo as fichas de saúde…' : (
            <>{graves ? <b style={{ color: 'var(--p-verm)' }}>{graves} alerta{graves > 1 ? 's' : ''} grave{graves > 1 ? 's' : ''}</b> : 'Nenhum alerta grave'}
              {' · '}{atencao} com atenção · {pendentes} pendência{pendentes === 1 ? '' : 's'}
              {preparada && <> · <b style={{ color: 'var(--p-verde)' }}>preparo confirmado</b></>}</>
          )}
          acoes={<>
            <Link href="/dashboard" className="eda-pg-bt">Voltar ao Painel</Link>
            <button type="button" className="eda-pg-bt" onClick={() => window.print()}>Imprimir para a equipe</button>
            {!preparada && graves + atencao > 0 && <button type="button" className="eda-pg-bt eda-pg-bt-ouro" onClick={() => void confirmarPreparo()} disabled={confirmando}>{confirmando ? 'Confirmando…' : 'Equipe orientada · confirmar preparo'}</button>}
          </>}
        />

        {erro && <p role="alert" className="eda-seg-aviso" data-tom="er">{erro}</p>}
        {aviso && <p role="status" className="eda-seg-aviso">{aviso}</p>}

        {linhas !== null && !erro && (
          <>
            <section className="eda-seg-bloco" aria-labelledby="seg-pessoas">
              <header><p className="eda-seg-eb">O que as fichas dizem</p><h2 id="seg-pessoas">Quem precisa de atenção</h2></header>
              {comAlerta.length === 0
                ? <VazioEDA titulo="Todas as fichas sem alertas" texto="Nenhum participante informou alergia, condição de saúde ou restrição nesta saída." />
                : (
                  <ul className="eda-seg-pessoas">
                    {comAlerta.map((l, i) => (
                      <li key={`${l.reserva_id}-${l.participante_id ?? i}`} data-n={l.nivel}>
                        <span className="eda-seg-nome">
                          <b>{l.participante_nome ?? `Reserva de ${l.reserva_cliente ?? 'cliente'}`}</b>
                          <PillEDA tom={l.nivel === 'grave' ? 'er' : l.nivel === 'pendente' ? 'nt' : 'at'}>{l.nivel === 'grave' ? 'Grave' : l.nivel === 'pendente' ? 'Pendente' : 'Atenção'}</PillEDA>
                        </span>
                        <span className="eda-seg-alertas">{l.alertas.join(' · ')}</span>
                        <Link href={`/reservas/editar/${l.reserva_id}#participantes`} className="eda-seg-link">Abrir ficha na reserva</Link>
                      </li>
                    ))}
                  </ul>
                )}
              <p className="eda-seg-nota">Dados de saúde são sensíveis (LGPD): mostre só a quem vai cuidar do grupo. Cada abertura deste resumo fica registrada.</p>
            </section>

            {cartoes.length > 0 && (
              <section className="eda-seg-bloco" aria-labelledby="seg-precaucoes">
                <header><p className="eda-seg-eb">Preparado pela EDA para este grupo</p><h2 id="seg-precaucoes">Precauções antes de embarcar</h2></header>
                <div className="eda-seg-grade">{cartoes.map((c) => <CartaoSeguranca key={c.chave} c={c} />)}</div>
              </section>
            )}

            <section className="eda-seg-bloco" aria-labelledby="seg-socorros">
              <header><p className="eda-seg-eb">Vale para toda saída</p><h2 id="seg-socorros">Primeiros socorros no rio</h2></header>
              <div className="eda-seg-grade">{SOCORROS.map((c) => <CartaoSeguranca key={c.chave} c={c} />)}</div>
              <p className="eda-seg-nota">Orientação geral para a equipe. Não substitui treinamento de primeiros socorros nem atendimento médico. Em emergência, ligue 192 (SAMU) ou 193 (Bombeiros).</p>
            </section>
          </>
        )}
      </div>
    </PaginaEDA>
  );
}
