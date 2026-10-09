import { supabase } from '@/lib/supabase';

export type IdiomaRedePublica =
  | 'PT'
  | 'EN'
  | 'ES';

export type TipoInteracaoPublicacao =
  | 'curtida'
  | 'salvo'
  | 'quero_ir';

export type CategoriaPublicacao = {
  id: string;
  slug: string;
  nome: string;
  familia: string;
  descricao: string | null;
  icone: string | null;
  ordem: number;
};

export type TerritorioPublico = {
  id: string;
  pai_id: string | null;
  slug: string;
  nome: string;
  tipo: string;
  descricao: string | null;
  ordem: number;
};

export type PerfilPublico = {
  id: string;
  slug: string;

  origem_tipo: string;
  categoria: string;

  nome_publico: string;

  cidade: string;
  uf: string;

  descricao_curta: string | null;

  logo_url: string | null;
  capa_url: string | null;

  whatsapp: string | null;
  instagram: string | null;
  site: string | null;

  verificado: boolean;
  destaque: boolean;

  territorio_id: string | null;
};

export type MidiaPublicacao = {
  id: string;
  publicacao_id: string;

  tipo:
    | 'imagem'
    | 'video';

  url: string;

  thumbnail_url: string | null;

  alt_text: string | null;

  credito: string | null;

  ordem: number;
};

export type PublicacaoPublica = {
  id: string;

  slug: string;

  tipo: string;

  titulo: string;

  resumo: string | null;

  conteudo: string | null;

  idioma_original:
    | 'pt'
    | 'en'
    | 'es';

  localidade_texto: string | null;

  data_evento_inicio: string | null;

  data_evento_fim: string | null;

  destaque: boolean;

  permitir_interacoes: boolean;

  publicado_em: string;

  autor: PerfilPublico;

  categoria: CategoriaPublicacao | null;

  territorio: TerritorioPublico | null;

  midias: MidiaPublicacao[];
};

export type FiltrosFeedPublico = {
  busca?: string;

  categoriaId?: string;

  territorioId?: string;

  limite?: number;
};

export type EstadoSocialPublicacao = {
  curtida: boolean;
  salvo: boolean;
  quero_ir: boolean;
};

export type EstadoSocialRede = {
  autenticado: boolean;

  perfisSeguidos: Set<string>;

  interacoes: Record<
    string,
    EstadoSocialPublicacao
  >;
};

type PublicacaoBanco = {
  id: string;

  autor_perfil_id: string;

  territorio_id: string | null;

  categoria_id: string | null;

  slug: string;

  tipo: string;

  titulo: string;

  resumo: string | null;

  conteudo: string | null;

  idioma_original:
    | 'pt'
    | 'en'
    | 'es';

  localidade_texto: string | null;

  data_evento_inicio: string | null;

  data_evento_fim: string | null;

  destaque: boolean;

  permitir_interacoes: boolean;

  publicado_em: string | null;
};

type TraducaoBanco = {
  publicacao_id: string;

  idioma:
    | 'pt'
    | 'en'
    | 'es';

  titulo: string;

  resumo: string | null;

  conteudo: string | null;
};

export class ErroRedePublica extends Error {
  constructor(
    mensagem: string,
  ) {
    super(mensagem);

    this.name =
      'ErroRedePublica';
  }
}

function idiomaBanco(
  idioma: IdiomaRedePublica,
):
  | 'pt'
  | 'en'
  | 'es' {
  if (idioma === 'EN') {
    return 'en';
  }

  if (idioma === 'ES') {
    return 'es';
  }

  return 'pt';
}

function limparBusca(
  valor: string,
): string {
  return valor
    .trim()
    .slice(0, 160)
    .replace(
      /[%_\\]/g,
      '',
    );
}

export async function listarCategoriasPublicas():
Promise<CategoriaPublicacao[]> {
  const {
    data,
    error,
  } = await supabase
    .from(
      'categorias_publicacoes',
    )
    .select(
      'id,slug,nome,familia,descricao,icone,ordem',
    )
    .eq(
      'ativo',
      true,
    )
    .order(
      'ordem',
      {
        ascending: true,
      },
    );

  if (error) {
    throw error;
  }

  return (
    (data ?? []) as CategoriaPublicacao[]
  );
}

export async function listarTerritoriosPublicos():
Promise<TerritorioPublico[]> {
  const {
    data,
    error,
  } = await supabase
    .from('territorios')
    .select(
      'id,pai_id,slug,nome,tipo,descricao,ordem',
    )
    .eq(
      'ativo',
      true,
    )
    .order(
      'ordem',
      {
        ascending: true,
      },
    );

  if (error) {
    throw error;
  }

  return (
    (data ?? []) as TerritorioPublico[]
  );
}

async function carregarPerfis(
  ids: string[],
): Promise<Map<string, PerfilPublico>> {
  if (ids.length === 0) {
    return new Map();
  }

  const {
    data,
    error,
  } = await supabase
    .from('perfis_publicos')
    .select(
      'id,slug,origem_tipo,categoria,nome_publico,cidade,uf,descricao_curta,logo_url,capa_url,whatsapp,instagram,site,verificado,destaque,territorio_id',
    )
    .in(
      'id',
      ids,
    )
    .eq(
      'publicado',
      true,
    );

  if (error) {
    throw error;
  }

  const mapa =
    new Map<
      string,
      PerfilPublico
    >();

  const registros =
    (data ?? []) as PerfilPublico[];

  for (
    const perfil of registros
  ) {
    mapa.set(
      perfil.id,
      perfil,
    );
  }

  return mapa;
}

async function carregarCategorias(
  ids: string[],
): Promise<
  Map<string, CategoriaPublicacao>
> {
  if (ids.length === 0) {
    return new Map();
  }

  const {
    data,
    error,
  } = await supabase
    .from(
      'categorias_publicacoes',
    )
    .select(
      'id,slug,nome,familia,descricao,icone,ordem',
    )
    .in(
      'id',
      ids,
    )
    .eq(
      'ativo',
      true,
    );

  if (error) {
    throw error;
  }

  const mapa =
    new Map<
      string,
      CategoriaPublicacao
    >();

  const registros =
    (data ?? []) as CategoriaPublicacao[];

  for (
    const categoria of registros
  ) {
    mapa.set(
      categoria.id,
      categoria,
    );
  }

  return mapa;
}

async function carregarTerritorios(
  ids: string[],
): Promise<
  Map<string, TerritorioPublico>
> {
  if (ids.length === 0) {
    return new Map();
  }

  const {
    data,
    error,
  } = await supabase
    .from(
      'territorios',
    )
    .select(
      'id,pai_id,slug,nome,tipo,descricao,ordem',
    )
    .in(
      'id',
      ids,
    )
    .eq(
      'ativo',
      true,
    );

  if (error) {
    throw error;
  }

  const mapa =
    new Map<
      string,
      TerritorioPublico
    >();

  const registros =
    (data ?? []) as TerritorioPublico[];

  for (
    const territorio of registros
  ) {
    mapa.set(
      territorio.id,
      territorio,
    );
  }

  return mapa;
}

async function carregarMidias(
  idsPublicacoes: string[],
): Promise<
  Map<string, MidiaPublicacao[]>
> {
  if (
    idsPublicacoes.length === 0
  ) {
    return new Map();
  }

  const {
    data,
    error,
  } = await supabase
    .from(
      'publicacao_midias',
    )
    .select(
      'id,publicacao_id,tipo,url,thumbnail_url,alt_text,credito,ordem',
    )
    .in(
      'publicacao_id',
      idsPublicacoes,
    )
    .order(
      'ordem',
      {
        ascending: true,
      },
    );

  if (error) {
    throw error;
  }

  const mapa =
    new Map<
      string,
      MidiaPublicacao[]
    >();

  const registros =
    (data ?? []) as MidiaPublicacao[];

  for (
    const midia of registros
  ) {
    const atuais =
      mapa.get(
        midia.publicacao_id,
      ) ?? [];

    atuais.push(
      midia,
    );

    mapa.set(
      midia.publicacao_id,
      atuais,
    );
  }

  return mapa;
}

async function carregarTraducoes(
  idsPublicacoes: string[],
  idioma: IdiomaRedePublica,
): Promise<
  Map<string, TraducaoBanco>
> {
  const codigo =
    idiomaBanco(idioma);

  if (
    codigo === 'pt' ||
    idsPublicacoes.length === 0
  ) {
    return new Map();
  }

  const {
    data,
    error,
  } = await supabase
    .from(
      'publicacao_traducoes',
    )
    .select(
      'publicacao_id,idioma,titulo,resumo,conteudo',
    )
    .in(
      'publicacao_id',
      idsPublicacoes,
    )
    .eq(
      'idioma',
      codigo,
    );

  if (error) {
    throw error;
  }

  const mapa =
    new Map<
      string,
      TraducaoBanco
    >();

  const registros =
    (data ?? []) as TraducaoBanco[];

  for (
    const traducao of registros
  ) {
    mapa.set(
      traducao.publicacao_id,
      traducao,
    );
  }

  return mapa;
}

export async function listarFeedPublico(
  idioma: IdiomaRedePublica,
  filtros: FiltrosFeedPublico = {},
): Promise<PublicacaoPublica[]> {
  const limite =
    Math.min(
      Math.max(
        filtros.limite ?? 30,
        1,
      ),
      60,
    );

  let consulta =
    supabase
      .from(
        'publicacoes',
      )
      .select(
        'id,autor_perfil_id,territorio_id,categoria_id,slug,tipo,titulo,resumo,conteudo,idioma_original,localidade_texto,data_evento_inicio,data_evento_fim,destaque,permitir_interacoes,publicado_em',
      )
      .eq(
        'status',
        'publicado',
      )
      .not(
        'publicado_em',
        'is',
        null,
      )
      .lte(
        'publicado_em',
        new Date().toISOString(),
      )
      .order(
        'destaque',
        {
          ascending: false,
        },
      )
      .order(
        'publicado_em',
        {
          ascending: false,
        },
      )
      .limit(limite);

  if (
    filtros.categoriaId
  ) {
    consulta =
      consulta.eq(
        'categoria_id',
        filtros.categoriaId,
      );
  }

  if (
    filtros.territorioId
  ) {
    consulta =
      consulta.eq(
        'territorio_id',
        filtros.territorioId,
      );
  }

  const busca =
    filtros.busca
      ? limparBusca(
          filtros.busca,
        )
      : '';

  if (busca) {
    consulta =
      consulta.ilike(
        'titulo',
        `%${busca}%`,
      );
  }

  const {
    data,
    error,
  } = await consulta;

  if (error) {
    throw error;
  }

  const publicacoes =
    (data ?? []) as PublicacaoBanco[];

  if (
    publicacoes.length === 0
  ) {
    return [];
  }

  const autoresIds =
    Array.from(
      new Set(
        publicacoes.map(
          (item) =>
            item.autor_perfil_id,
        ),
      ),
    );

  const categoriasIds =
    Array.from(
      new Set(
        publicacoes
          .map(
            (item) =>
              item.categoria_id,
          )
          .filter(
            (
              valor,
            ): valor is string =>
              Boolean(valor),
          ),
      ),
    );

  const territoriosIds =
    Array.from(
      new Set(
        publicacoes
          .map(
            (item) =>
              item.territorio_id,
          )
          .filter(
            (
              valor,
            ): valor is string =>
              Boolean(valor),
          ),
      ),
    );

  const publicacoesIds =
    publicacoes.map(
      (item) => item.id,
    );

  const [
    perfis,
    categorias,
    territorios,
    midias,
    traducoes,
  ] = await Promise.all([
    carregarPerfis(
      autoresIds,
    ),

    carregarCategorias(
      categoriasIds,
    ),

    carregarTerritorios(
      territoriosIds,
    ),

    carregarMidias(
      publicacoesIds,
    ),

    carregarTraducoes(
      publicacoesIds,
      idioma,
    ),
  ]);

  const resultado:
    PublicacaoPublica[] = [];

  for (
    const item of publicacoes
  ) {
    if (
      !item.publicado_em
    ) {
      continue;
    }

    const autor =
      perfis.get(
        item.autor_perfil_id,
      );

    if (!autor) {
      continue;
    }

    const traducao =
      traducoes.get(
        item.id,
      );

    resultado.push({
      id:
        item.id,

      slug:
        item.slug,

      tipo:
        item.tipo,

      titulo:
        traducao?.titulo ??
        item.titulo,

      resumo:
        traducao?.resumo ??
        item.resumo,

      conteudo:
        traducao?.conteudo ??
        item.conteudo,

      idioma_original:
        item.idioma_original,

      localidade_texto:
        item.localidade_texto,

      data_evento_inicio:
        item.data_evento_inicio,

      data_evento_fim:
        item.data_evento_fim,

      destaque:
        item.destaque,

      permitir_interacoes:
        item.permitir_interacoes,

      publicado_em:
        item.publicado_em,

      autor,

      categoria:
        item.categoria_id
          ? categorias.get(
              item.categoria_id,
            ) ?? null
          : null,

      territorio:
        item.territorio_id
          ? territorios.get(
              item.territorio_id,
            ) ?? null
          : null,

      midias:
        midias.get(
          item.id,
        ) ?? [],
    });
  }

  return resultado;
}

export async function obterEstadoSocialRede(
  publicacoesIds: string[],
): Promise<EstadoSocialRede> {
  const {
    data: {
      user,
    },
  } =
    await supabase.auth.getUser();

  if (!user) {
    return {
      autenticado:
        false,

      perfisSeguidos:
        new Set(),

      interacoes: {},
    };
  }

  const seguidoresPromise =
    supabase
      .from(
        'seguidores_perfis',
      )
      .select(
        'perfil_seguido_id',
      )
      .eq(
        'seguidor_usuario_id',
        user.id,
      );

  const interacoesPromise =
    publicacoesIds.length >
    0
      ? supabase
          .from(
            'interacoes_publicacoes',
          )
          .select(
            'publicacao_id,tipo',
          )
          .eq(
            'usuario_id',
            user.id,
          )
          .in(
            'publicacao_id',
            publicacoesIds,
          )
      : Promise.resolve({
          data: [],
          error: null,
        });

  const [
    seguidores,
    interacoes,
  ] =
    await Promise.all([
      seguidoresPromise,
      interacoesPromise,
    ]);

  if (
    seguidores.error
  ) {
    throw seguidores.error;
  }

  if (
    interacoes.error
  ) {
    throw interacoes.error;
  }

  const perfisSeguidos =
    new Set<string>();

  for (
    const item of
      seguidores.data ?? []
  ) {
    if (
      typeof item.perfil_seguido_id ===
      'string'
    ) {
      perfisSeguidos.add(
        item.perfil_seguido_id,
      );
    }
  }

  const estadoInteracoes:
    Record<
      string,
      EstadoSocialPublicacao
    > = {};

  for (
    const item of
      interacoes.data ?? []
  ) {
    if (
      typeof item.publicacao_id !==
      'string'
    ) {
      continue;
    }

    if (
      !estadoInteracoes[
        item.publicacao_id
      ]
    ) {
      estadoInteracoes[
        item.publicacao_id
      ] = {
        curtida:
          false,

        salvo:
          false,

        quero_ir:
          false,
      };
    }

    if (
      item.tipo ===
      'curtida'
    ) {
      estadoInteracoes[
        item.publicacao_id
      ].curtida = true;
    }

    if (
      item.tipo ===
      'salvo'
    ) {
      estadoInteracoes[
        item.publicacao_id
      ].salvo = true;
    }

    if (
      item.tipo ===
      'quero_ir'
    ) {
      estadoInteracoes[
        item.publicacao_id
      ].quero_ir = true;
    }
  }

  return {
    autenticado:
      true,

    perfisSeguidos,

    interacoes:
      estadoInteracoes,
  };
}

export async function alternarSeguirPerfil(
  perfilId: string,
  seguindo: boolean,
): Promise<boolean> {
  const {
    data: {
      user,
    },
  } =
    await supabase.auth.getUser();

  if (!user) {
    throw new ErroRedePublica(
      'Entre na ERN para seguir perfis.',
    );
  }

  if (seguindo) {
    const {
      error,
    } = await supabase
      .from(
        'seguidores_perfis',
      )
      .delete()
      .eq(
        'seguidor_usuario_id',
        user.id,
      )
      .eq(
        'perfil_seguido_id',
        perfilId,
      );

    if (error) {
      throw error;
    }

    return false;
  }

  const {
    error,
  } = await supabase
    .from(
      'seguidores_perfis',
    )
    .insert({
      seguidor_usuario_id:
        user.id,

      perfil_seguido_id:
        perfilId,
    });

  if (error) {
    throw error;
  }

  return true;
}

export async function alternarInteracaoPublicacao(
  publicacaoId: string,
  tipo: TipoInteracaoPublicacao,
  ativa: boolean,
): Promise<boolean> {
  const {
    data: {
      user,
    },
  } =
    await supabase.auth.getUser();

  if (!user) {
    throw new ErroRedePublica(
      'Entre na ERN para interagir com publicações.',
    );
  }

  if (ativa) {
    const {
      error,
    } = await supabase
      .from(
        'interacoes_publicacoes',
      )
      .delete()
      .eq(
        'usuario_id',
        user.id,
      )
      .eq(
        'publicacao_id',
        publicacaoId,
      )
      .eq(
        'tipo',
        tipo,
      );

    if (error) {
      throw error;
    }

    return false;
  }

  const {
    error,
  } = await supabase
    .from(
      'interacoes_publicacoes',
    )
    .insert({
      usuario_id:
        user.id,

      publicacao_id:
        publicacaoId,

      tipo,
    });

  if (error) {
    throw error;
  }

  return true;
}

export function mensagemErroRedePublica(
  erro: unknown,
): string {
  if (
    erro instanceof
    ErroRedePublica
  ) {
    return erro.message;
  }

  if (
    typeof erro ===
      'object' &&
    erro !== null &&
    'code' in erro
  ) {
    const codigo =
      String(
        (
          erro as {
            code?: unknown;
          }
        ).code ?? '',
      );

    if (
      codigo === '42501'
    ) {
      return 'Seu acesso não permite esta ação.';
    }

    if (
      codigo === '23505'
    ) {
      return 'Esta interação já foi registrada.';
    }

    if (
      codigo === '23503'
    ) {
      return 'O conteúdo relacionado não está mais disponível.';
    }
  }

  return 'Não foi possível concluir a solicitação. Tente novamente.';
}