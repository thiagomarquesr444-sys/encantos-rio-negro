# DESIGN.md — Encantos da Amazônia AI

Guia visual oficial da plataforma (portal público + gestão da operadora).
Toda tela nova ou alterada deve seguir este arquivo. Em caso de dúvida, vale o
que está aqui, não o padrão genérico de bibliotecas ou de IA.

## 1. Princípios

- **Sóbrio, robusto e autêntico.** Sem "vestígios de IA": nada de botão dourado
  chamativo, degradê, brilho (shimmer), neon, setas decorativas ou emoji comum.
  Ícones de traço fino, discretos.
- **Amazônia real, não genérica.** Imagens combinam com o segmento (artesão →
  artesanato; pesca → pesca esportiva; destino → paisagem do município) e
  **nunca repetem** uma imagem já publicada na plataforma.
- **Leve na internet ruim.** Comunidade e Starlink: imagens otimizadas, pouco
  JavaScript. Com sinal fraco (`html[data-eda-sinal='fraco']`) ou "reduzir
  movimento", as animações desligam. Com sinal normal, tudo funciona como
  desenvolvido.
- **Operador comum primeiro.** Linguagem simples, sem termo técnico; em
  formulários, nome/identificação no topo; listas de opções padronizadas.
- **Marca EDA em toda janela.** Avisos, confirmações e "copiado" usam a janela
  com a marca EDA, nunca a caixa padrão do navegador.

## 2. Cores (tokens existentes em `app/globals.css`)

Tema Noite (padrão):

| Token | Valor | Uso |
|---|---|---|
| `--ern-fundo` | `#07110e` | fundo da página |
| `--ern-painel` | `#0a1713` | cards e painéis |
| `--ern-elevado` | `#10231b` | camada acima do painel |
| `--ern-texto` | `#edede3` | texto principal |
| `--ern-secundario` | `#b8c9bf` | texto de apoio |
| `--ern-borda` | `#355043` | bordas finas |
| `--ern-destaque` | `#f4c77e` | detalhe pontual (nunca fundo de botão) |
| `--ern-sucesso` / `--ern-alerta` / `--ern-erro` | `#a7f3d0` / `#fde68a` / `#fecaca` | estados |

Tema Claro: mesmos tokens com valores claros (já definidos no CSS). A gestão
tem só **Noite** e **Claro**. Partes do portal que já são claras continuam claras.

Regra: cores sempre por token (`var(--ern-…)`/`var(--eda-acao-…)`), nunca hex
solto em componente novo.

## 3. Tipografia

- **Letreiro** (menu do portal, títulos de seção escura): Bebas Neue
  (`--font-bebas`), maiúsculas, sem caixa em volta; item ativo do menu em verde.
- **Texto do portal:** Montserrat.
- **Gestão:** Geist (`--font-geist`); números com `tabular-nums`.
- Títulos com `text-wrap: balance`, parágrafos com `text-wrap: pretty`.
- Textos com coesão, coerência e pontuação corretas.

## 4. Botões (EDA_BOTAO_PADRAO_V1)

Formato das cidades populares da Descubra, em todo o sistema:

- pílula (`border-radius: 999px`), **borda fina**, **fundo transparente** com
  leve desfoque, texto branco no fundo escuro e texto escuro no fundo claro;
- sem setas, sem dourado, sem verde chapado, sem sombra chamativa;
- usar `.eda-botao` (ação) e `.eda-botao-ativo` (selecionado).

## 5. Cards e layout

- **Mobile (padrão obrigatório, de Passeios e Descubra):** grade de **2
  colunas**, cards compactos, pelo menos 4 cards por tela; o card de destaque
  também cabe na tela. Nunca um card ocupando a tela inteira.
- **Gestão:** padrão Encantos — capa + cards "magnéticos" (fio de luz no topo,
  profundidade em camadas, borda que acende levemente no hover), classe
  `.eda-card` dentro de `[data-fable='gestao']`.
- **Portal:** seções surgem ao rolar (`[data-fable='portal']`), só com suporte do
  navegador e sem "reduzir movimento".
- Toda página da gestão tem **voltar** (e Esc volta).

## 6. Movimento

Permitido: surgir suave, revelar texto letra a letra (saudações da Iara/EDA),
faixa rolante discreta (ex.: municípios, parceiros), hover sutil.
Proibido: brilho passando, gradiente animado, partículas, tilt exagerado.
Todo movimento respeita `prefers-reduced-motion` e o modo de sinal fraco.

## 7. Assistentes

- **Iara** (portal): selo redondo com retrato de sereia; "escrevendo" = três
  pontinhos; sem chips de perguntas sugeridas.
- **Jurupari / EDA** (gestão): retrato próprio, botão no canto superior direito
  do mesmo tamanho do da Iara; sem chips.

## 8. Referências externas (só inspiração)

- **Refero Styles** e **Inspora**: consultar referências antes de criar telas
  novas; nunca copiar a identidade de outra marca.
- **Spell UI** (MIT): componentes só depois de aprovados, adaptados a este
  arquivo (tokens, botão pílula, sem brilho) e testados com sinal fraco.

## 9. Checklist antes de publicar

1. Usa só tokens e `.eda-botao`?
2. Mobile em 2 colunas com cards compactos?
3. Imagens do segmento certo e inéditas na plataforma?
4. Sem brilho, dourado chamativo, emoji ou seta decorativa?
5. Animações desligam com sinal fraco e "reduzir movimento"?
6. Funciona nos temas Noite e Claro?
7. Textos simples e sem erro de pontuação?
