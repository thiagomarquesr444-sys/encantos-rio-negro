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
      'fixed inset-0 m-auto max-h-[90dvh] w-[calc(100%-2rem)] max-w-md overflow-y-auto rounded-3xl border border-[#E3A144]/30 bg-[#0C1C16] p-5 text-[#EDEDE3] shadow-2xl backdrop:bg-black/75 sm:p-6';

    dialogo.setAttribute('aria-labelledby', `${identificador}-titulo`);
    dialogo.setAttribute('aria-describedby', `${identificador}-mensagem`);

    const marca = document.createElement('p');
    marca.className =
      'text-[10px] font-semibold uppercase tracking-[0.2em] text-[#F4C77E]';
    marca.textContent = 'Encantos Rio Negro';

    const titulo = document.createElement('h2');
    titulo.id = `${identificador}-titulo`;
    titulo.className = 'mt-3 text-2xl font-semibold';
    titulo.style.fontFamily = 'var(--font-fraunces), serif';
    titulo.textContent = opcoes.titulo ?? 'Confirmar ação';

    const texto = document.createElement('p');
    texto.id = `${identificador}-mensagem`;
    texto.className =
      'mt-3 whitespace-pre-wrap break-words text-sm leading-6 text-[#B4C8BB]';
    texto.textContent = mensagem;

    const acoes = document.createElement('div');
    acoes.className = opcoes.somenteInformacao
      ? 'mt-6 grid grid-cols-1 gap-3'
      : 'mt-6 grid grid-cols-2 gap-3';

    const cancelar = document.createElement('button');
    cancelar.type = 'button';
    cancelar.autofocus = true;
    cancelar.className =
      'min-h-12 rounded-xl border border-white/20 px-3 text-sm font-semibold text-[#EDEDE3] hover:bg-white/5 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#F4C77E]';
    cancelar.textContent = opcoes.cancelar ?? 'Cancelar';

    const confirmar = document.createElement('button');
    confirmar.type = 'button';

    const destrutiva = opcoes.destrutiva ?? true;

    confirmar.className = destrutiva
      ? 'min-h-12 rounded-xl border border-rose-300/30 bg-rose-400/15 px-3 text-sm font-semibold text-rose-200 hover:bg-rose-400/25 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-rose-200'
      : 'min-h-12 rounded-xl bg-[#E3A144] px-3 text-sm font-semibold text-[#07110E] hover:bg-[#F4C77E] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#F4C77E]';

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
    document.body.append(dialogo);

    try {
      dialogo.showModal();
      (opcoes.somenteInformacao ? confirmar : cancelar).focus();
    } catch {
      finalizar(false);
    }
  });
}