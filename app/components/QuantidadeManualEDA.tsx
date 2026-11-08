'use client';

// EDA_QUANTIDADE_MANUAL_V1: explica, por categoria, o que o operador deve informar.
import type { CategoriaDemanda } from '@/lib/demandas';

type Guia = { pergunta: string; ajuda: string; unidades: string[] };

const GUIAS: Partial<Record<CategoriaDemanda, Guia>> = {
  hospedagem: {
    pergunta: 'Quantas diárias de hospedagem a viagem precisa?',
    ajuda: 'Conte o total da viagem inteira. Ex.: 3 quartos por 5 noites = 15 diárias.',
    unidades: ['diárias', 'quartos', 'redes', 'camas'],
  },
  transporte_fluvial: {
    pergunta: 'Quanto de barco a viagem vai usar?',
    ajuda: 'Conte o total da viagem. Ex.: 1 barco durante 6 dias = 6 diárias de barco.',
    unidades: ['diárias de barco', 'viagens', 'barcos', 'horas'],
  },
  guiamento: {
    pergunta: 'Quantas diárias de guia a viagem precisa?',
    ajuda: 'Ex.: 2 guias durante 6 dias = 12 diárias de guia.',
    unidades: ['diárias de guia', 'guias', 'horas'],
  },
  passeios: {
    pergunta: 'Quantos ingressos ou passeios vai contratar?',
    ajuda: 'Ex.: 7 pessoas em 2 passeios = 14 ingressos.',
    unidades: ['ingressos', 'passeios', 'pessoas'],
  },
};

const GUIA_PADRAO: Guia = {
  pergunta: 'Quanto desse material leva para a viagem inteira?',
  ajuda: 'Informe o total para todos os dias. Ex.: 2 fardos de água, 3 sacos de gelo, 1 caixa de descartáveis.',
  unidades: ['unidade', 'fardos', 'caixas', 'pacotes', 'sacos', 'kg', 'litros'],
};

type Props = {
  categoria: CategoriaDemanda;
  quantidade: string;
  unidade: string;
  disabled?: boolean;
  campoClasse: string;
  onQuantidade: (valor: string) => void;
  onUnidade: (valor: string) => void;
};

export default function QuantidadeManualEDA({ categoria, quantidade, unidade, disabled, campoClasse, onQuantidade, onUnidade }: Props) {
  const guia = GUIAS[categoria] ?? GUIA_PADRAO;
  const u = unidade.trim().toLowerCase();
  const naLista = guia.unidades.includes(u);
  // 'unidade' é o padrão do sistema: em categorias sem essa opção, pede para escolher.
  const outra = u !== '' && u !== 'unidade' && !naLista;

  return (
    <>
      <h2 className="text-2xl text-[var(--ern-texto)]">{guia.pergunta}</h2>
      <p className="mt-2 text-sm leading-6 text-[var(--ern-secundario)]">{guia.ajuda}</p>

      <div className="mt-6 grid gap-5 sm:grid-cols-2">
        <label className="block text-sm">
          <span className="mb-2 block">Quantidade total</span>
          <input
            type="number"
            min="0.01"
            step="0.01"
            required
            disabled={disabled}
            placeholder="Ex.: 2"
            value={quantidade}
            onChange={(e) => onQuantidade(e.target.value)}
            className={campoClasse}
          />
        </label>

        <label className="block text-sm">
          <span className="mb-2 block">Medida</span>
          <select
            required
            disabled={disabled}
            value={outra ? '__outra' : naLista ? u : ''}
            onChange={(e) => onUnidade(e.target.value === '__outra' ? 'outra' : e.target.value)}
            className={campoClasse}
          >
            <option value="" disabled>Escolha a medida</option>
            {guia.unidades.map((u) => <option key={u} value={u}>{u}</option>)}
            <option value="__outra">Outra…</option>
          </select>
          {outra && (
            <input
              required
              maxLength={40}
              disabled={disabled}
              placeholder="Digite a medida"
              value={unidade === 'outra' ? '' : unidade}
              onChange={(e) => onUnidade(e.target.value || 'outra')}
              className={`${campoClasse} mt-2`}
            />
          )}
        </label>
      </div>
    </>
  );
}
