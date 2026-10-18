'use client';

type OpcoesConfirmacao = {
  titulo?: string;
  confirmar?: string;
  cancelar?: string;
  destrutiva?: boolean;
  somenteInformacao?: boolean;
};

let aberta = false;

export function confirmarERN(
  mensagem: string,
  opcoes: OpcoesConfirmacao = {},
): Promise<boolean> {
  if (typeof document === 'undefined' || aberta) {
    return Promise.resolve(false);
  }

  aberta = true;

  return new Promise<boolean>((resolve) => {
    const anterior = document.activeElement;
    const dialogo = document.createElement('dialog');
    const identificador = `ern-confirmacao-${crypto.randomUUID()}`;
    let concluida = false;
    let aceitou = false;

    dialogo.className =
      'fixed inset-0 m-auto max-h-[90dvh] w-[calc(100%-2rem)] max-w-md overflow-y-auto rounded-3xl border border-[var(--ern-destaque)] bg-[var(--ern-painel)] p-5 text-[var(--ern-texto)] shadow-2xl backdrop:bg-black/75 sm:p-6';

    dialogo.setAttribute('aria-labelledby', `${identificador}-titulo`);
    dialogo.setAttribute('aria-describedby', `${identificador}-mensagem`);

    const marca = document.createElement('p');
    marca.className =
      'text-[10px] font-semibold uppercase tracking-[0.2em] text-[var(--ern-destaque)]';
    marca.textContent = 'Encantos Rio Negro';

    const titulo = document.createElement('h2');
    titulo.id = `${identificador}-titulo`;
    titulo.className = 'mt-3 text-2xl font-semibold';
    titulo.style.fontFamily = 'var(--font-fraunces), serif';
    titulo.textContent = opcoes.titulo ?? 'Confirmar ação';

    const texto = document.createElement('p');
    texto.id = `${identificador}-mensagem`;
    texto.className =
      'mt-3 whitespace-pre-wrap break-words text-sm leading-6 text-[var(--ern-secundario)]';
    texto.textContent = mensagem;

    const acoes = document.createElement('div');
    acoes.className = opcoes.somenteInformacao
      ? 'mt-6 grid grid-cols-1 gap-3'
      : 'mt-6 grid grid-cols-2 gap-3';

    const cancelar = document.createElement('button');
    cancelar.type = 'button';
    cancelar.autofocus = true;
    cancelar.className =
      'min-h-12 rounded-xl border border-[var(--ern-borda)] px-3 text-sm font-semibold text-[var(--ern-texto)] hover:bg-[var(--ern-suave)] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[var(--ern-destaque)]';
    cancelar.textContent = opcoes.cancelar ?? 'Cancelar';

    const confirmar = document.createElement('button');
    confirmar.type = 'button';

    const destrutiva = opcoes.destrutiva ?? true;

    confirmar.className = destrutiva
      ? 'min-h-12 rounded-xl border border-[var(--ern-erro)] bg-rose-400/15 px-3 text-sm font-semibold text-[var(--ern-erro)] hover:bg-rose-400/25 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[var(--ern-erro)]'
      : 'min-h-12 rounded-xl bg-[var(--ern-botao)] px-3 text-sm font-semibold text-[var(--ern-sobre-botao)] hover:bg-[var(--ern-botao)] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[var(--ern-destaque)]';

    confirmar.textContent = opcoes.confirmar ?? 'Confirmar';

    function finalizar(resultado: boolean) {
      if (concluida) return;
      concluida = true;
      aberta = false;

      window.removeEventListener('pagehide', sair);
      window.removeEventListener('popstate', sair);

      if (dialogo.open) dialogo.close();
      dialogo.remove();

      if (anterior instanceof HTMLElement && anterior.isConnected) {
        anterior.focus();
      }

      resolve(resultado);
    }

    function sair() {
      finalizar(false);
    }

    cancelar.addEventListener('click', () => finalizar(false));

    confirmar.addEventListener('click', () => {
      aceitou = true;
      finalizar(true);
    });

    dialogo.addEventListener('cancel', (event) => {
      event.preventDefault();
      finalizar(false);
    });

    dialogo.addEventListener('close', () => finalizar(aceitou));

    window.addEventListener('pagehide', sair);
    window.addEventListener('popstate', sair);

    if (!opcoes.somenteInformacao) acoes.append(cancelar);
    acoes.append(confirmar);
    dialogo.append(marca, titulo, texto, acoes);
    
    // Copia o tema da origem para o dialogo anexado ao body.
    const origemTema =
      anterior instanceof HTMLElement && anterior.isConnected
        ? anterior
        : document.querySelector('main') ?? document.documentElement;

    const estiloTema = window.getComputedStyle(origemTema);

    for (const nome of [
      'fundo', 'painel', 'texto', 'secundario', 'borda',
      'suave', 'botao', 'sobre-botao', 'destaque',
      'erro', 'sucesso',
    ]) {
      const propriedade = '--ern-' + nome;
      const valor = estiloTema.getPropertyValue(propriedade).trim();

      if (valor) dialogo.style.setProperty(propriedade, valor);
    }

    document.body.append(dialogo);


    try {
      dialogo.showModal();
      (opcoes.somenteInformacao ? confirmar : cancelar).focus();
    } catch {
      finalizar(false);
    }
  });
}