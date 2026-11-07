'use client';

// EDA_FICHA_SAUDE_V1: o turista preenche a ficha de cada participante pelo link
// enviado pela operadora. Não exige conta. A página nunca mostra dados de saúde
// já enviados — só quem já preencheu.

import { useCallback, useEffect, useState } from 'react';
import { useParams } from 'next/navigation';
import FormFichaEDA from '@/app/components/FormFichaEDA';
import {
  abrirConviteEDA, enviarFichaTuristaEDA, FICHA_VAZIA, mensagemFichaEDA, type ConviteEDA,
} from '@/lib/fichaSaudeEDA';
import { dataCurtaEDA } from '@/lib/passeiosPublicosEDA';

type Alvo = { participanteId?: string; nome: string };

export default function FichaTuristaPage() {
  const params = useParams();
  const bruto = params?.token;
  const token = (Array.isArray(bruto) ? bruto[0] : bruto) ?? '';

  const [convite, setConvite] = useState<ConviteEDA | null | undefined>(undefined);
  const [alvo, setAlvo] = useState<Alvo | null>(null);
  const [nome, setNome] = useState('');
  const [nascimento, setNascimento] = useState('');
  const [salvando, setSalvando] = useState(false);
  const [erro, setErro] = useState('');
  const [ok, setOk] = useState('');

  const carregar = useCallback(async () => {
    try { setConvite(await abrirConviteEDA(token)); } catch { setConvite(null); }
  }, [token]);

  useEffect(() => { void carregar(); }, [carregar]);

  if (convite === undefined) return <main className="ft"><p>Carregando…</p><Estilo /></main>;
  if (convite === null) {
    return (
      <main className="ft">
        <h1>Link indisponível</h1>
        <p>Este link expirou ou não é válido. Peça um novo à sua operadora.</p>
        <Estilo />
      </main>
    );
  }

  const faltamCadastro = Math.max(convite.pessoas - convite.participantes.length, 0);
  const enviadas = convite.participantes.filter((p) => p.enviada).length;

  return (
    <main className="ft">
      <p className="ft-sobre">{convite.operadora} · Encantos da Amazônia</p>
      <h1>Ficha de saúde e segurança</h1>
      <p className="ft-viagem">
        <strong>{convite.passeio}</strong><br />
        {dataCurtaEDA(convite.data_inicio)}
        {convite.data_fim && convite.data_fim !== convite.data_inicio ? ` a ${dataCurtaEDA(convite.data_fim)}` : ''}
        {' · '}{convite.pessoas} pessoa(s)
      </p>
      <p className="ft-txt">
        Para cuidarmos de cada pessoa na viagem — alimentação, alergias e segurança no rio — preencha uma ficha por participante.
        Só a equipe da operadora vê estas informações, e elas são apagadas automaticamente em {dataCurtaEDA(convite.exclusao_em)}.
      </p>

      <p className="ft-progresso">{enviadas} de {convite.pessoas} ficha(s) enviada(s)</p>

      {ok && <p className="ft-ok" role="status">{ok}</p>}
      {erro && <p className="ft-erro" role="alert">{erro}</p>}

      {!alvo && (
        <ul className="ft-lista">
          {convite.participantes.map((p) => (
            <li key={p.id}>
              <span>{p.nome}</span>
              <button type="button" onClick={() => { setOk(''); setErro(''); setAlvo({ participanteId: p.id, nome: p.nome }); }}>
                {p.enviada ? '✓ Enviada · corrigir' : 'Preencher'}
              </button>
            </li>
          ))}
          {faltamCadastro > 0 && (
            <li className="ft-novo">
              <input maxLength={120} placeholder="Nome completo do participante" value={nome} onChange={(e) => setNome(e.target.value)} />
              <input type="date" aria-label="Data de nascimento" value={nascimento} onChange={(e) => setNascimento(e.target.value)} />
              <button type="button" disabled={nome.trim().length < 2}
                onClick={() => { setOk(''); setErro(''); setAlvo({ nome: nome.trim() }); }}>
                Preencher ficha
              </button>
            </li>
          )}
        </ul>
      )}

      {alvo && (
        <section className="ft-form">
          <h2>{alvo.nome}</h2>
          <FormFichaEDA
            inicial={{ ...FICHA_VAZIA }}
            salvando={salvando}
            textoBotao="Enviar ficha"
            textoConsentimento={`Autorizo ${convite.operadora} a usar estes dados de saúde exclusivamente para a segurança e o atendimento nesta viagem, com exclusão automática em ${dataCurtaEDA(convite.exclusao_em)}. Se a ficha for de outra pessoa, declaro ter a autorização dela ou ser o responsável legal.`}
            onCancelar={() => setAlvo(null)}
            onSalvar={async (ficha) => {
              setSalvando(true); setErro('');
              try {
                await enviarFichaTuristaEDA(token, { participanteId: alvo.participanteId, nome: alvo.nome, nascimento }, ficha);
                setOk(`Ficha de ${alvo.nome} enviada. Obrigado!`);
                setAlvo(null); setNome(''); setNascimento('');
                await carregar();
              } catch (e) { setErro(mensagemFichaEDA(e)); }
              finally { setSalvando(false); }
            }}
          />
        </section>
      )}
      <Estilo />
    </main>
  );
}

function Estilo() {
  return (
    <style jsx global>{`
      .ft { --ern-destaque: #e3a144; --ern-borda: rgb(237 237 227 / 16%); --ern-secundario: #a9bdb2;
        max-width: 640px; margin: 0 auto; padding: 32px 18px 64px; min-height: 100dvh; color: #edede3; background: #0b1713; font-size: 15px; line-height: 1.6; }
      body:has(.ft) { background: #0b1713; }
      .ft h1 { margin: 6px 0 12px; font-size: 26px; } .ft h2 { margin: 0 0 12px; font-size: 18px; }
      .ft-sobre { margin: 0; font-size: 11px; letter-spacing: .16em; text-transform: uppercase; color: var(--ern-destaque); font-weight: 700; }
      .ft-viagem { padding: 12px 14px; border-radius: 14px; border: 1px solid var(--ern-borda); }
      .ft-txt { color: var(--ern-secundario); font-size: 14px; }
      .ft-progresso { font-weight: 700; color: var(--ern-destaque); }
      .ft-ok { color: #4ade80; } .ft-erro { color: #f87171; }
      .ft-lista { list-style: none; padding: 0; margin: 0; display: grid; gap: 8px; }
      .ft-lista li { display: flex; flex-wrap: wrap; align-items: center; justify-content: space-between; gap: 8px; padding: 12px 14px; border-radius: 14px; border: 1px solid var(--ern-borda); }
      .ft-lista button { min-height: 40px; padding: 0 16px; border-radius: 999px; border: 1px solid var(--ern-destaque); background: transparent; color: var(--ern-destaque); font-weight: 700; cursor: pointer; }
      .ft-lista button:disabled { opacity: .4; }
      .ft-novo input { flex: 1 1 200px; min-height: 42px; padding: 0 12px; border-radius: 12px; border: 1px solid var(--ern-borda); background: transparent; color: inherit; }
      .ft-form { margin-top: 16px; padding: 16px; border-radius: 18px; border: 1px solid var(--ern-borda); }
    `}</style>
  );
}
