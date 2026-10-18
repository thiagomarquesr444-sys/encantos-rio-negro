'use client';

const animais = [
  { nome: 'arara-vermelha', esquerda: 'max(80px, calc((100vw - 1600px) / 2 + 80px))', deslocamento: '0%', recorte: 'inset(0 69% 0 0)' },
  { nome: 'segunda-arara', esquerda: '42%', deslocamento: '-40%', recorte: 'inset(0 51% 0 31%)' },
  { nome: 'tuiuiu', esquerda: '65%', deslocamento: '-59%', recorte: 'inset(0 31% 0 49%)' },
  { nome: 'onca', esquerda: '88%', deslocamento: '-84.5%', recorte: 'inset(0 0 0 69%)' },
];

export default function FaunaCabecalhoERN({ altura, oncaNaConta = false }: { altura: number; oncaNaConta?: boolean }) {
  return (
    <span
      aria-hidden="true"
      style={{
        position: 'absolute',
        inset: 0,
        zIndex: -1,
        pointerEvents: 'none',
        overflow: 'hidden',
        opacity: 0.22,
      }}
    >
      {animais.map(animal => (
        <span
          key={animal.nome}
          style={{
            position: 'absolute',
            top: '50%',
            left: animal.nome === 'onca' && oncaNaConta ? 'calc(100% - max(78px, calc((100vw - 1600px) / 2 + 78px)))' : animal.esquerda,
            width: altura * 3,
            height: altura,
            transform: 'translate(' + animal.deslocamento + ', -50%)',
            clipPath: animal.recorte,
            backgroundImage: "url('/images/regiao/ern-fauna-menu.png')",
            backgroundSize: '100% 100%',
            backgroundRepeat: 'no-repeat',
          }}
        />
      ))}
    </span>
  );
}
