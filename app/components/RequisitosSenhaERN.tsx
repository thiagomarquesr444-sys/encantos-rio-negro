'use client';
import { requisitosSenhaERN, validarSenhaERN } from '@/lib/politicaSenhaERN';
export default function RequisitosSenhaERN({ senha, id }: { senha: string; id: string }) {
  const requisitos = requisitosSenhaERN(senha);
  const atendidos = requisitos.filter(r => r.ok).length;
  const valido = senha.length > 0 && validarSenhaERN(senha) === null;
  return <div id={id} className="ern-senha-requisitos">
    <div className="ern-senha-progresso" aria-hidden="true">
      {requisitos.map((r, i) => <span key={r.id} data-ativo={i < atendidos} />)}
    </div>
    <p>{valido ? 'Requisitos atendidos' : 'Crie uma senha longa e exclusiva'}</p>
    <ul>{requisitos.map(r => <li key={r.id} data-ok={r.ok}>
      <span aria-hidden="true">{r.ok ? '✓' : '○'}</span>
      <span className="sr-only">{r.ok ? 'Atendido: ' : 'Pendente: '}</span>{r.texto}
    </li>)}</ul>
    {new TextEncoder().encode(senha).length > 72 && <p role="status">Limite de 72 bytes excedido.</p>}
  </div>;
}
