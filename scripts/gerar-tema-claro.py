# Gera app/tema-claro-gestao.css: versão clara das regras com cores fixas
# dos arquivos *-premium.css e das classes Tailwind de cor usadas na gestão.
import re, sys, os, glob
RAIZ = sys.argv[1]
PREFIXO = '.ern-gestao:is([data-ern-tema="branco"],[data-ern-tema="amarelo"])'

def lum(r, g, b):
    def c(v):
        v /= 255
        return v / 12.92 if v <= 0.03928 else ((v + 0.055) / 1.055) ** 2.4
    return 0.2126 * c(r) + 0.7152 * c(g) + 0.0722 * c(b)

def parse_cor(t):
    t = t.strip()
    m = re.fullmatch(r'#([0-9a-fA-F]{3}|[0-9a-fA-F]{6})', t)
    if m:
        h = m.group(1)
        if len(h) == 3: h = ''.join(ch * 2 for ch in h)
        return int(h[0:2], 16), int(h[2:4], 16), int(h[4:6], 16), 1.0
    m = re.fullmatch(r'rgba?\(\s*(\d+)[ ,]+(\d+)[ ,]+(\d+)(?:\s*[,/]\s*([\d.]+%?))?\s*\)', t)
    if m:
        a = m.group(4)
        if a is None: a = 1.0
        elif a.endswith('%'): a = float(a[:-1]) / 100
        else: a = float(a)
        return int(m.group(1)), int(m.group(2)), int(m.group(3)), a
    return None

COR_RE = re.compile(r'#[0-9a-fA-F]{6}\b|#[0-9a-fA-F]{3}\b|rgba?\([^)]*\)')

def ouro(r, g, b):
    return r > g > b and r - b > 70 and r > 150

def mapear_fundo(cor):
    r, g, b, a = cor
    L = lum(r, g, b)
    if r > 200 and g > 200 and b > 200 and a < 0.5:
        return f'rgb(20 39 30 / {a:.3g})'
    if a < 0.5:
        return None
    if ouro(r, g, b):
        return None
    if L < 0.008: return 'var(--ern-fundo)'
    if L < 0.016: return 'var(--ern-painel)'
    if L < 0.12: return 'var(--ern-elevado)'
    return None

def mapear_texto(cor):
    r, g, b, a = cor
    L = lum(r, g, b)
    if ouro(r, g, b): return 'var(--ern-destaque)'
    if L > 0.75: return 'var(--ern-texto)'
    if L > 0.3: return 'var(--ern-secundario)'
    return None

def mapear_borda(cor):
    r, g, b, a = cor
    L = lum(r, g, b)
    if ouro(r, g, b): return None
    if (r > 150 and g > 150 and b > 150 and a < 0.6) or L < 0.05:
        return 'var(--ern-borda)'
    return None

def converter_valor(prop, valor):
    if 'var(' in valor and not COR_RE.search(valor):
        return None
    mud = False
    def troca(m):
        nonlocal mud
        cor = parse_cor(m.group(0))
        if not cor: return m.group(0)
        if prop in ('background', 'background-color', 'background-image'):
            novo = mapear_fundo(cor)
        elif prop in ('color', 'fill', 'stroke', '-webkit-text-fill-color', 'caret-color'):
            novo = mapear_texto(cor)
        elif prop.startswith('border') or prop.startswith('outline') or prop == 'column-rule-color':
            novo = mapear_borda(cor)
        elif prop == 'box-shadow':
            r, g, b, a = cor
            novo = f'rgb(20 39 30 / {min(a, .1):.3g})' if (r + g + b) < 60 else None
        else:
            novo = None
        if novo:
            mud = True
            return novo
        return m.group(0)
    novo = COR_RE.sub(troca, valor)
    return novo if mud else None

def blocos(css):
    """Divide CSS em (cabecalho, corpo) respeitando chaves aninhadas."""
    i, n, out = 0, len(css), []
    while i < n:
        j = css.find('{', i)
        if j < 0: break
        cab = css[i:j].strip()
        prof, k = 1, j + 1
        while k < n and prof:
            if css[k] == '{': prof += 1
            elif css[k] == '}': prof -= 1
            k += 1
        out.append((cab, css[j + 1:k - 1]))
        i = k
    return out

def prefixar(sel):
    partes = [p.strip() for p in sel.split(',') if p.strip()]
    res = []
    for p in partes:
        if p.startswith(':root') or p.startswith('html') or p.startswith('body') or p.startswith('@') or '::backdrop' in p:
            continue
        if p.startswith('.ern-gestao'):
            p = p.replace('.ern-gestao', PREFIXO, 1)
        else:
            p = f'{PREFIXO} {p}'
        res.append(p)
    return ', '.join(res)

def processar(css):
    css = re.sub(r'/\*.*?\*/', '', css, flags=re.S)
    saida = []
    for cab, corpo in blocos(css):
        if cab.startswith('@media') or cab.startswith('@supports'):
            interno = processar(corpo)
            if interno.strip():
                saida.append(f'{cab} {{\n{interno}}}\n')
            continue
        if cab.startswith('@'):
            continue
        decls = []
        for d in corpo.split(';'):
            if ':' not in d: continue
            prop, val = d.split(':', 1)
            prop = prop.strip().lower()
            if prop.startswith('--'): continue
            imp = '!important' in val
            val = val.replace('!important', '').strip()
            novo = converter_valor(prop, val)
            if novo:
                decls.append(f'  {prop}: {novo}{" !important" if imp else ""};')
        sel = prefixar(cab)
        if decls and sel:
            saida.append(f'{sel} {{\n' + '\n'.join(decls) + '\n}\n')
    return ''.join(saida)

arquivos = sorted(glob.glob(os.path.join(RAIZ, 'app/*/*-premium.css')) + glob.glob(os.path.join(RAIZ, 'app/*/*-v39.css')))
partes = ['/* ERN_TEMA_CLARO_GERADO_V1 — gerado automaticamente a partir dos estilos\n   das páginas da gestão. Só vale com o tema Claro (branco) ou Amarelo. */\n']
for f in arquivos:
    trecho = processar(open(f, encoding='utf8').read())
    if trecho.strip():
        partes.append(f'\n/* {os.path.relpath(f, RAIZ)} */\n' + trecho)

# Classes Tailwind de cor fixa usadas nas páginas da gestão.
dirs = ['dashboard','financeiro','clientes','reservas','hospedagens','passeios','configuracoes','embarcacoes','guias','parceiros','relatorios','vouchers','documentos','fiscal','planos','demandas','comando']
tsx = []
for d in dirs:
    tsx += glob.glob(os.path.join(RAIZ, 'app', d, '**/*.tsx'), recursive=True)
tsx += glob.glob(os.path.join(RAIZ, 'app/components/*.tsx'))
classes = set()
for f in tsx:
    classes |= set(re.findall(r'(?<![\w-])((?:hover:)?(?:bg|text|border|from|via|to)-\[#[0-9A-Fa-f]{6}\](?:/\[?[\d.]+\]?)?)', open(f, encoding='utf8').read()))
regras = []
for c in sorted(classes):
    m = re.match(r'(hover:)?(bg|text|border|from|via|to)-\[#([0-9A-Fa-f]{6})\](?:/\[?([\d.]+)\]?)?', c)
    hover, tipo, hx, alfa = m.groups()
    r, g, b = int(hx[0:2], 16), int(hx[2:4], 16), int(hx[4:6], 16)
    a = 1.0
    if alfa:
        a = float(alfa)
        if a > 1: a /= 100
    cor = (r, g, b, a)
    if tipo == 'bg': novo, prop = mapear_fundo(cor), 'background-color'
    elif tipo == 'text': novo, prop = mapear_texto(cor), 'color'
    elif tipo == 'border': novo, prop = mapear_borda(cor), 'border-color'
    else:
        novo = mapear_fundo(cor)
        prop = {'from': '--tw-gradient-from', 'via': '--tw-gradient-via', 'to': '--tw-gradient-to'}[tipo]
    if not novo: continue
    esc = c.replace('[', '\\[').replace(']', '\\]').replace('#', '\\#').replace('/', '\\/').replace(':', '\\:').replace('.', '\\.')
    sel = f'{PREFIXO} .ern-gestao-conteudo .{esc}' + (':hover' if hover else '')
    regras.append(f'{sel} {{ {prop}: {novo}; }}')
partes.append('\n/* Classes Tailwind com cor fixa */\n' + '\n'.join(regras) + '\n')
open(os.path.join(RAIZ, 'app/tema-claro-gestao.css'), 'w', encoding='utf8').write(''.join(partes))
print(len(arquivos), 'arquivos css;', len(regras), 'classes')
