import { numeroItem, type ItemDemanda } from '@/lib/itensDemanda';

// Quantidade em milésimos e preço em centavos.
// O arredondamento ocorre por item, como no banco.
export function subtotal(item: ItemDemanda): bigint | null {
  const quantidade = numeroItem(item.quantidade, 3);
  const preco = numeroItem(item.preco_unitario_estimado, 2);

  if (
    quantidade === null || quantidade <= 0 ||
    quantidade > 999999999.999 ||
    preco === null || preco > 9999999999.99
  ) return null;

  const mil = BigInt(quantidade.toFixed(3).replace('.', ''));
  const centavos = BigInt(preco.toFixed(2).replace('.', ''));
  return (mil * centavos + BigInt(500)) / BigInt(1000);
}

export function moeda(centavos: bigint) {
  const inteiro = (centavos / BigInt(100)).toString();
  const decimal = (centavos % BigInt(100)).toString().padStart(2, '0');
  return `R$ ${inteiro.replace(/\B(?=(\d{3})+(?!\d))/g, '.')},${decimal}`;
}
