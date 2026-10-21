import type { Metadata } from 'next';
import ExperienciasPublicasERN from '@/app/components/ExperienciasPublicasERN';

export const metadata: Metadata = {
  title: 'Experiências no Rio Negro, Amazonas | Encantos Rio Negro',
  description:
    'Explore possibilidades de experiências no Rio Negro: natureza, navegação, cultura, sabores e pesca esportiva. Conheça o território e os profissionais da Rede ERN.',
};

export default function ExperienciasPage() {
  return <ExperienciasPublicasERN />;
}