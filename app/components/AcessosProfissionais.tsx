'use client';

import Link from 'next/link';
import { useLanguage } from '@/app/components/LanguageProvider';

const textos = {
  PT: {
    eyebrow: 'Faça parte da ERN',
    titulo: 'Como você atua no turismo?',
    descricao:
      'Escolha seu acesso para entrar ou iniciar seu cadastro.',
    acessos: [
      {
        id: 'operadora',
        titulo: 'Operadoras e equipes',
        descricao:
          'Acesse a gestão da sua empresa para organizar clientes, reservas e a operação turística.',
        botao: 'Acesso da operadora',
      },
      {
        id: 'guia',
        titulo: 'Sou guia de turismo',
        descricao:
          'Tenha seu próprio cadastro profissional na ERN, com identidade independente das operadoras.',
        botao: 'Acesso do guia',
      },
      {
        id: 'fornecedor',
        titulo: 'Sou fornecedor',
        descricao:
          'Participe da rede com seus produtos ou serviços e encontre oportunidades relacionadas à sua atividade.',
        botao: 'Acesso do fornecedor',
      },
    ],
    turista: 'Está planejando uma viagem?',
    portal: 'Explore o portal público',
  },

  EN: {
    eyebrow: 'Join ERN',
    titulo: 'What is your role in tourism?',
    descricao:
      'Choose your access to sign in or start your registration.',
    acessos: [
      {
        id: 'operadora',
        titulo: 'Operators and teams',
        descricao:
          'Access your company workspace to organize clients, reservations and tourism operations.',
        botao: 'Operator access',
      },
      {
        id: 'guia',
        titulo: 'I am a tour guide',
        descricao:
          'Create your own professional profile on ERN, with an identity independent of tour operators.',
        botao: 'Guide access',
      },
      {
        id: 'fornecedor',
        titulo: 'I am a supplier',
        descricao:
          'Join the network with your products or services and find opportunities relevant to your activity.',
        botao: 'Supplier access',
      },
    ],
    turista: 'Planning a trip?',
    portal: 'Explore the public portal',
  },

  ES: {
    eyebrow: 'Forma parte de ERN',
    titulo: '¿Cuál es tu actividad en el turismo?',
    descricao:
      'Elige tu acceso para iniciar sesión o comenzar tu registro.',
    acessos: [
      {
        id: 'operadora',
        titulo: 'Operadores y equipos',
        descricao:
          'Accede a la gestión de tu empresa para organizar clientes, reservas y la operación turística.',
        botao: 'Acceso del operador',
      },
      {
        id: 'guia',
        titulo: 'Soy guía de turismo',
        descricao:
          'Ten tu propio perfil profesional en ERN, con una identidad independiente de los operadores.',
        botao: 'Acceso del guía',
      },
      {
        id: 'fornecedor',
        titulo: 'Soy proveedor',
        descricao:
          'Participa en la red con tus productos o servicios y encuentra oportunidades relacionadas con tu actividad.',
        botao: 'Acceso del proveedor',
      },
    ],
    turista: '¿Estás planeando un viaje?',
    portal: 'Explora el portal público',
  },
};

export default function AcessosProfissionais() {
  const { idioma } = useLanguage();
  const t = textos[idioma];

  return (
    <section
      id="acessos-profissionais"
      aria-labelledby="titulo-acessos-profissionais"
      className="scroll-mt-24 border-b border-white/[0.07] bg-[#091510] px-5 py-14 md:px-8 md:py-20"
    >
      <div className="mx-auto max-w-[1180px]">
        <div className="max-w-[720px]">
          <p className="text-[10px] font-semibold uppercase tracking-[0.2em] text-[#E3A144]">
            {t.eyebrow}
          </p>

          <h2
            id="titulo-acessos-profissionais"
            className="mt-4 text-3xl leading-tight tracking-[-0.025em] text-[#F0F0E8] md:text-4xl"
            style={{
              fontFamily: 'var(--font-fraunces), serif',
            }}
          >
            {t.titulo}
          </h2>

          <p className="mt-4 text-sm leading-7 text-[#EDEDE3]/55">
            {t.descricao}
          </p>
        </div>

        <div className="mt-8 grid gap-4 md:grid-cols-3">
          {t.acessos.map((acesso) => (
            <article
              key={acesso.id}
              className="flex min-w-0 flex-col rounded-[22px] border border-white/[0.08] bg-[#0D1B16] p-5 transition hover:border-[#E3A144]/30 md:p-6"
            >
              <span
                aria-hidden="true"
                className="h-1 w-9 rounded-full bg-[#E3A144]"
              />

              <h3
                className="mt-5 text-2xl leading-tight text-[#F0F0E8]"
                style={{
                  fontFamily: 'var(--font-fraunces), serif',
                }}
              >
                {acesso.titulo}
              </h3>

              <p className="mt-3 flex-1 text-sm leading-7 text-[#EDEDE3]/55">
                {acesso.descricao}
              </p>

              <Link
                href={`/login?acesso=${acesso.id}`}
                className="mt-6 inline-flex min-h-[48px] items-center justify-between gap-3 rounded-xl border border-[#E3A144]/25 bg-[#E3A144]/10 px-4 py-3 text-sm font-semibold text-[#F4C77E] transition hover:border-[#E3A144]/50 hover:bg-[#E3A144]/15 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#E3A144] focus-visible:ring-offset-2 focus-visible:ring-offset-[#0D1B16]"
              >
                <span>{acesso.botao}</span>
                <span aria-hidden="true">→</span>
              </Link>
            </article>
          ))}
        </div>

        <div className="mt-7 flex flex-col gap-2 border-t border-white/[0.07] pt-6 text-sm sm:flex-row sm:items-center sm:justify-between">
          <p className="text-[#EDEDE3]/45">
            {t.turista}
          </p>

          <Link
            href="/"
            className="inline-flex min-h-[44px] items-center gap-2 self-start font-semibold text-[#E3A144] transition hover:text-[#F4C77E]"
          >
            {t.portal}
            <span aria-hidden="true">→</span>
          </Link>
        </div>
      </div>
    </section>
  );
}