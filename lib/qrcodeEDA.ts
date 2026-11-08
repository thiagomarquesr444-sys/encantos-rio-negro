// EDA_PIX_QRCODE_V1: gerador de QR Code próprio (modo byte, correção M),
// sem dependência externa. Baseado no algoritmo de referência do padrão
// ISO/IEC 18004 (mesma abordagem da biblioteca qrcodegen, de Project Nayuki, MIT).

const ECC_M_POR_BLOCO = [-1, 10, 16, 26, 18, 24, 16, 18, 22, 22, 26, 30, 22, 22, 24, 24, 28, 28, 26, 26, 26, 26, 28, 28, 28, 28, 28, 28, 28, 28, 28, 28, 28, 28, 28, 28, 28, 28, 28, 28, 28];
const BLOCOS_M = [-1, 1, 1, 1, 2, 2, 4, 4, 4, 5, 5, 5, 8, 9, 9, 10, 10, 11, 13, 14, 16, 17, 17, 18, 20, 21, 23, 25, 26, 28, 29, 31, 33, 35, 37, 38, 40, 43, 45, 47, 49];
const FORMATO_M = 0;

const bit = (x: number, i: number) => ((x >>> i) & 1) !== 0;

function modulosBrutos(ver: number): number {
  let r = (16 * ver + 128) * ver + 64;
  if (ver >= 2) {
    const n = Math.floor(ver / 7) + 2;
    r -= (25 * n - 10) * n - 55;
    if (ver >= 7) r -= 36;
  }
  return r;
}
const codewordsDados = (ver: number) => Math.floor(modulosBrutos(ver) / 8) - ECC_M_POR_BLOCO[ver] * BLOCOS_M[ver];

function gfMul(x: number, y: number): number {
  let z = 0;
  for (let i = 7; i >= 0; i--) {
    z = (z << 1) ^ ((z >>> 7) * 0x11d);
    z ^= ((y >>> i) & 1) * x;
  }
  return z & 0xff;
}
function rsDivisor(grau: number): number[] {
  const r: number[] = new Array(grau - 1).fill(0);
  r.push(1);
  let raiz = 1;
  for (let i = 0; i < grau; i++) {
    for (let j = 0; j < r.length; j++) {
      r[j] = gfMul(r[j], raiz);
      if (j + 1 < r.length) r[j] ^= r[j + 1];
    }
    raiz = gfMul(raiz, 0x02);
  }
  return r;
}
function rsResto(dados: number[], div: number[]): number[] {
  const r = div.map(() => 0);
  for (const b of dados) {
    const f = b ^ (r.shift() as number);
    r.push(0);
    div.forEach((c, i) => { r[i] ^= gfMul(c, f); });
  }
  return r;
}

export type MatrizQR = { tamanho: number; modulos: boolean[][] };

export function gerarQrEDA(texto: string): MatrizQR {
  const bytes = Array.from(new TextEncoder().encode(texto));

  // Menor versão que cabe.
  let ver = 1;
  for (; ver <= 40; ver++) {
    const bitsContagem = ver <= 9 ? 8 : 16;
    if (4 + bitsContagem + bytes.length * 8 <= codewordsDados(ver) * 8) break;
  }
  if (ver > 40) throw new Error('Texto longo demais para QR Code.');

  // Fluxo de bits.
  const bits: number[] = [];
  const add = (v: number, n: number) => { for (let i = n - 1; i >= 0; i--) bits.push((v >>> i) & 1); };
  add(0b0100, 4);
  add(bytes.length, ver <= 9 ? 8 : 16);
  bytes.forEach((b) => add(b, 8));
  const capacidade = codewordsDados(ver) * 8;
  add(0, Math.min(4, capacidade - bits.length));
  add(0, (8 - (bits.length % 8)) % 8);
  for (let p = 0xec; bits.length < capacidade; p ^= 0xec ^ 0x11) add(p, 8);
  const dados: number[] = [];
  for (let i = 0; i < bits.length; i += 8) dados.push(bits.slice(i, i + 8).reduce((a, b) => (a << 1) | b, 0));

  // Correção de erros e intercalação.
  const nBlocos = BLOCOS_M[ver];
  const eccLen = ECC_M_POR_BLOCO[ver];
  const brutos = Math.floor(modulosBrutos(ver) / 8);
  const curtos = nBlocos - (brutos % nBlocos);
  const lenCurto = Math.floor(brutos / nBlocos);
  const div = rsDivisor(eccLen);
  const blocos: number[][] = [];
  for (let i = 0, k = 0; i < nBlocos; i++) {
    const d = dados.slice(k, k + lenCurto - eccLen + (i < curtos ? 0 : 1));
    k += d.length;
    const ecc = rsResto(d, div);
    if (i < curtos) d.push(0);
    blocos.push(d.concat(ecc));
  }
  const final: number[] = [];
  for (let i = 0; i < blocos[0].length; i++) {
    blocos.forEach((b, j) => { if (i !== lenCurto - eccLen || j >= curtos) final.push(b[i]); });
  }

  // Matriz.
  const n = ver * 4 + 17;
  const mod: boolean[][] = Array.from({ length: n }, () => new Array(n).fill(false));
  const fun: boolean[][] = Array.from({ length: n }, () => new Array(n).fill(false));
  const set = (x: number, y: number, v: boolean) => { mod[y][x] = v; fun[y][x] = true; };

  for (let i = 0; i < n; i++) { set(6, i, i % 2 === 0); set(i, 6, i % 2 === 0); }
  const finder = (x: number, y: number) => {
    for (let dy = -4; dy <= 4; dy++) for (let dx = -4; dx <= 4; dx++) {
      const d = Math.max(Math.abs(dx), Math.abs(dy));
      const xx = x + dx, yy = y + dy;
      if (xx >= 0 && xx < n && yy >= 0 && yy < n) set(xx, yy, d !== 2 && d !== 4);
    }
  };
  finder(3, 3); finder(n - 4, 3); finder(3, n - 4);

  const posAlinh: number[] = [];
  if (ver > 1) {
    const qtd = Math.floor(ver / 7) + 2;
    const passo = Math.floor((ver * 8 + qtd * 3 + 5) / (qtd * 4 - 4)) * 2;
    posAlinh.push(6);
    for (let p = n - 7; posAlinh.length < qtd; p -= passo) posAlinh.splice(1, 0, p);
  }
  const ult = posAlinh.length - 1;
  posAlinh.forEach((px, i) => posAlinh.forEach((py, j) => {
    if ((i === 0 && j === 0) || (i === 0 && j === ult) || (i === ult && j === 0)) return;
    for (let dy = -2; dy <= 2; dy++) for (let dx = -2; dx <= 2; dx++) set(px + dx, py + dy, Math.max(Math.abs(dx), Math.abs(dy)) !== 1);
  }));

  const formato = (mascara: number) => {
    const d = (FORMATO_M << 3) | mascara;
    let r = d;
    for (let i = 0; i < 10; i++) r = (r << 1) ^ ((r >>> 9) * 0x537);
    const b = ((d << 10) | r) ^ 0x5412;
    for (let i = 0; i <= 5; i++) set(8, i, bit(b, i));
    set(8, 7, bit(b, 6)); set(8, 8, bit(b, 7)); set(7, 8, bit(b, 8));
    for (let i = 9; i < 15; i++) set(14 - i, 8, bit(b, i));
    for (let i = 0; i < 8; i++) set(n - 1 - i, 8, bit(b, i));
    for (let i = 8; i < 15; i++) set(8, n - 15 + i, bit(b, i));
    set(8, n - 8, true);
  };
  formato(0);

  if (ver >= 7) {
    let r = ver;
    for (let i = 0; i < 12; i++) r = (r << 1) ^ ((r >>> 11) * 0x1f25);
    const b = (ver << 12) | r;
    for (let i = 0; i < 18; i++) {
      const v = bit(b, i), a = n - 11 + (i % 3), c = Math.floor(i / 3);
      set(a, c, v); set(c, a, v);
    }
  }

  // Dados em zigue-zague.
  let i = 0;
  for (let dir = n - 1; dir >= 1; dir -= 2) {
    if (dir === 6) dir = 5;
    for (let v = 0; v < n; v++) for (let j = 0; j < 2; j++) {
      const x = dir - j;
      const subindo = ((dir + 1) & 2) === 0;
      const y = subindo ? n - 1 - v : v;
      if (!fun[y][x] && i < final.length * 8) { mod[y][x] = bit(final[i >>> 3], 7 - (i & 7)); i++; }
    }
  }

  const inverte = (m: number, x: number, y: number) => {
    switch (m) {
      case 0: return (x + y) % 2 === 0;
      case 1: return y % 2 === 0;
      case 2: return x % 3 === 0;
      case 3: return (x + y) % 3 === 0;
      case 4: return (Math.floor(x / 3) + Math.floor(y / 2)) % 2 === 0;
      case 5: return ((x * y) % 2) + ((x * y) % 3) === 0;
      case 6: return (((x * y) % 2) + ((x * y) % 3)) % 2 === 0;
      default: return (((x + y) % 2) + ((x * y) % 3)) % 2 === 0;
    }
  };
  const aplicar = (m: number) => {
    for (let y = 0; y < n; y++) for (let x = 0; x < n; x++) if (!fun[y][x] && inverte(m, x, y)) mod[y][x] = !mod[y][x];
  };

  // Escolhe a máscara de menor penalidade (regras 1, 2, 3 e 4).
  const penalidade = () => {
    let p = 0;
    const linha = (get: (k: number) => boolean) => {
      let run = 1;
      for (let k = 1; k <= n; k++) {
        if (k < n && get(k) === get(k - 1)) run++;
        else { if (run >= 5) p += 3 + (run - 5); run = 1; }
      }
      for (let k = 0; k + 7 <= n; k++) {
        const pad = [true, false, true, true, true, false, true];
        if (!pad.every((v, t) => get(k + t) === v)) continue;
        const antes = k >= 4 && [1, 2, 3, 4].every((t) => !get(k - t));
        const depois = k + 11 <= n && [7, 8, 9, 10].every((t) => !get(k + t));
        if (antes || depois) p += 40;
      }
    };
    for (let y = 0; y < n; y++) linha((k) => mod[y][k]);
    for (let x = 0; x < n; x++) linha((k) => mod[k][x]);
    for (let y = 0; y < n - 1; y++) for (let x = 0; x < n - 1; x++) {
      const c = mod[y][x];
      if (c === mod[y][x + 1] && c === mod[y + 1][x] && c === mod[y + 1][x + 1]) p += 3;
    }
    let escuros = 0;
    mod.forEach((r) => r.forEach((v) => { if (v) escuros++; }));
    p += Math.floor(Math.abs(escuros * 20 - n * n * 10) / (n * n)) * 10;
    return p;
  };
  let melhor = 0, menor = Infinity;
  for (let m = 0; m < 8; m++) {
    aplicar(m); formato(m);
    const p = penalidade();
    if (p < menor) { menor = p; melhor = m; }
    aplicar(m);
  }
  aplicar(melhor); formato(melhor);
  return { tamanho: n, modulos: mod };
}

// Caminho SVG (um retângulo por módulo escuro, agrupados por linha).
export function caminhoSvgQrEDA(q: MatrizQR, margem = 4): string {
  const partes: string[] = [];
  q.modulos.forEach((linha, y) => {
    let x = 0;
    while (x < q.tamanho) {
      if (!linha[x]) { x++; continue; }
      const ini = x;
      while (x < q.tamanho && linha[x]) x++;
      partes.push(`M${ini + margem},${y + margem}h${x - ini}v1h-${x - ini}z`);
    }
  });
  return partes.join('');
}
