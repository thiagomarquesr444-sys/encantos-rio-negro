'use client';

import { supabase } from '@/lib/supabase';
import {
  CATEGORIAS_ITEM,
  SITUACOES_ITEM,
  type CategoriaItem,
  type SituacaoItem,
} from '@/lib/itensDemanda';

function celula(valor: unknown) {
  let texto = valor == null ? '' : String(valor);

  // Impede que campos de texto sejam interpretados como fórmulas.
  if (/^[\s\u0000-\u001f]*[=+\-@]/.test(texto)) {
    texto = "'" + texto;
  }

  return `"${texto.replace(/"/g, '""')}"`;
}

function decimal(valor: unknown) {
  if (valor === null || valor === undefined) return '';
  const texto = String(valor);
  if (!/^\d+(?:\.\d+)?$/.test(texto)) {
    throw new Error('A lista contém um valor numérico inválido.');
  }
  return texto.replace('.', ',');
}

export async function exportarMateriaisDemanda(
  demandaId: string,
): Promise<void> {
  const { data, error } = await supabase
    .from('demandas')
    .select(
      'id,titulo,localidade,data_inicio,data_fim,status,itens_versao,demanda_itens(descricao,categoria,quantidade,unidade,preco_unitario_estimado,total_estimado,situacao,observacoes,ordem)',
    )
    .eq('id', demandaId)
    .single();

  if (error || !data || !Array.isArray(data.demanda_itens)) {
    throw new Error('Não foi possível consultar a lista salva para exportação.');
  }

  if (data.demanda_itens.length > 200) {
    throw new Error('A lista excede o limite permitido para esta exportação.');
  }

  if (!data.demanda_itens.length) {
    throw new Error('Adicione e salve pelo menos um material antes de exportar.');
  }

  const geradoEm = new Date().toISOString();

  const cabecalho = [
    'Demanda ID',
    'Título',
    'Localidade',
    'Início',
    'Fim',
    'Status da demanda',
    'Versão da lista',
    'Material',
    'Categoria',
    'Quantidade',
    'Unidade',
    'Preço unitário estimado (BRL)',
    'Total estimado (BRL)',
    'Situação do item',
    'Observações',
    'Exportado em (UTC)',
  ];

  const linhas: unknown[][] = [cabecalho];

  const itens = [...data.demanda_itens].sort(
    (a, b) => a.ordem - b.ordem,
  );

  for (const item of itens) {
    linhas.push([
      data.id,
      data.titulo,
      data.localidade,
      data.data_inicio,
      data.data_fim,
      data.status,
      data.itens_versao,
      item.descricao,
      CATEGORIAS_ITEM[item.categoria as CategoriaItem] ?? item.categoria,
      decimal(item.quantidade),
      item.unidade,
      decimal(item.preco_unitario_estimado),
      decimal(item.total_estimado),
      SITUACOES_ITEM[item.situacao as SituacaoItem] ?? item.situacao,
      item.observacoes,
      geradoEm,
    ]);
  }

  const csv = '\uFEFF' + linhas
    .map((linha) => linha.map(celula).join(';'))
    .join('\r\n');

  const blob = new Blob([csv], {
    type: 'text/csv;charset=utf-8;',
  });

  const url = URL.createObjectURL(blob);
  const link = document.createElement('a');

  const nome = String(data.titulo)
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .replace(/[^a-zA-Z0-9_-]+/g, '-')
    .slice(0, 60) || 'demanda';

  link.href = url;
  link.download = `ERN-materiais-${nome}-${String(data.id).slice(0, 8)}-v${data.itens_versao}.csv`;

  document.body.append(link);

  try {
    link.click();
  } finally {
    link.remove();
    window.setTimeout(() => URL.revokeObjectURL(url), 1000);
  }
}