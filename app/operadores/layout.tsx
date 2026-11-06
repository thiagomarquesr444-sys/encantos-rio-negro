import type { Metadata } from 'next';
import type { ReactNode } from 'react';

export const metadata: Metadata = {
  title: 'Para operadores de turismo',
  description:
    'Gestão completa para operadoras, guias e fornecedores de turismo no Amazonas: reservas, clientes, financeiro, vouchers e presença na Rede EDA.',
};

export default function Layout({ children }: { children: ReactNode }) {
  return children;
}
