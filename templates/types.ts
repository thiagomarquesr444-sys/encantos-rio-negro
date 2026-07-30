export interface CrudEntity {
  id: number;
  created_at?: string;
}

export interface CrudCard {
  titulo: string;
  valor: string | number;
  detalhe?: string;
  cor?: string;
  icone?: React.ReactNode;
}

export interface CrudColumn<T extends CrudEntity> {
  key: keyof T;
  label: string;
  align?: "left" | "center" | "right";
  width?: string;
  hidden?: boolean;
  render?: (item: T) => React.ReactNode;
}

export interface CrudAction {
  visualizar?: boolean;
  editar?: boolean;
  excluir?: boolean;
}

export interface CrudPageProps<T extends CrudEntity> {
  titulo: string;
  subtitulo: string;

  dados: T[];
  loading?: boolean;
  searchTerm: string;
  setSearchTerm: (value: string) => void;
  cards: CrudCard[];
  colunas: CrudColumn<T>[];
  actions?: CrudAction;
}