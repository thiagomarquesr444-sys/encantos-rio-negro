import * as THREE from 'three';

// Escultura procedural original: sem modelos, texturas ou serviços externos.
export function criarTucunareERN(host: HTMLElement) {
  const renderer = new THREE.WebGLRenderer({ alpha: true, antialias: true, powerPreference: 'low-power' });
  renderer.setPixelRatio(Math.min(window.devicePixelRatio || 1, 1.5));
  renderer.setClearColor(0x000000, 0); renderer.outputColorSpace = THREE.SRGBColorSpace;
  renderer.toneMapping = THREE.ACESFilmicToneMapping; renderer.toneMappingExposure = 1.12;
  renderer.localClippingEnabled = true;
  const scene = new THREE.Scene();
  const camera = new THREE.PerspectiveCamera(34, 1, 0.1, 40);
  camera.position.set(0.4, 1.25, 8); camera.lookAt(0, -0.15, 0);
  let descartado = false;
  function dispose() {
    if (descartado) return; descartado = true;
    const geometrias = new Set<THREE.BufferGeometry>(), materiais = new Set<THREE.Material>();
    scene.traverse(o => { const m = o as THREE.Mesh; if (m.geometry) geometrias.add(m.geometry); if (m.material) (Array.isArray(m.material) ? m.material : [m.material]).forEach(x => materiais.add(x)); });
    geometrias.forEach(g => g.dispose()); materiais.forEach(m => { for (const valor of Object.values(m)) if (valor instanceof THREE.Texture) valor.dispose(); m.dispose(); }); renderer.dispose(); renderer.forceContextLoss(); renderer.domElement.remove();
  }
  try {
    scene.add(new THREE.HemisphereLight(0xe0e9e3, 0x29332b, 1.8));
    const sol = new THREE.DirectionalLight(0xffeed4, 3.0); sol.position.set(2, 5, 5); scene.add(sol);
    const contorno = new THREE.DirectionalLight(0xa3c0c4, 1.6); contorno.position.set(-3, 1, -4); scene.add(contorno);
    const peixe = new THREE.Group(); scene.add(peixe);
    const corte = new THREE.Plane(new THREE.Vector3(0, 1, 0), 1.1);
    const material = (cor: number, metalness = 0.15) => new THREE.MeshStandardMaterial({ color: cor, roughness: 0.36, metalness, side: THREE.DoubleSide, clippingPlanes: [corte] });
    const ouro = material(0xa99c43, 0.05), escuro = material(0x152422, 0), vermelho = material(0x9c381f, 0.02), iris = material(0xc74931, 0.05), pupila = material(0x07120c, 0.1), dorsalMat = material(0x536b67, 0.05);
    function esfera(parent: THREE.Object3D, mat: THREE.Material, x: number, y: number, z: number, sx: number, sy: number, sz: number) { const m = new THREE.Mesh(new THREE.SphereGeometry(1, 24, 16), mat); m.position.set(x, y, z); m.scale.set(sx, sy, sz); parent.add(m); return m; }
    // Perfil de corpo contínuo, alto e comprimido lateralmente; a cabeça faz parte da malha.
    const perfil = [
      [-1.82, -0.04, 0.12, 0.12, 0.10], [-1.45, 0.0, 0.28, 0.25, 0.18],
      [-0.95, 0.04, 0.48, 0.42, 0.28], [-0.35, 0.06, 0.59, 0.51, 0.35],
      [0.30, 0.05, 0.60, 0.53, 0.38], [0.82, -0.01, 0.48, 0.44, 0.34],
      [1.20, -0.09, 0.30, 0.29, 0.27], [1.52, -0.16, 0.16, 0.18, 0.19],
      [1.65, -0.18, 0.08, 0.10, 0.09],
    ];
    function secao(x: number) {
      const i = perfil.findIndex(p => p[0] >= x); if (i < 0) return perfil[perfil.length - 1].slice(1); if (i === 0) return perfil[0].slice(1);
      const a = perfil[i - 1], b = perfil[i]; let u = (x - a[0]) / (b[0] - a[0]); u = u * u * (3 - 2 * u);
      return a.slice(1).map((v, j) => v + (b[j + 1] - v) * u);
    }
    const pos: number[] = [], cores: number[] = [], uv: number[] = [], indices: number[] = []; const n = 144, volta = 56;
    const dourado = new THREE.Color('#b2a83a'), verde = new THREE.Color('#3b5144'), barriga = new THREE.Color('#d7bb64'), faixa = new THREE.Color('#25382f'), garganta = new THREE.Color('#b44a28');
    for (let i = 0; i <= n; i++) {
      const u = i / n, x = -1.82 + u * 3.47; const [centro, alto, baixo, largura] = secao(x);
      for (let j = 0; j <= volta; j++) {
        const a = j / volta * Math.PI * 2, v = Math.cos(a);
        const y = centro + (v >= 0 ? alto : baixo) * v, z = largura * Math.sin(a);
        pos.push(x, y, z); uv.push(u, j / volta);
        let cor = v > 0 ? dourado.clone().lerp(verde, Math.pow(v, 2.6) * 0.93) : dourado.clone().lerp(barriga, -v * 0.65);
        const margem = 0.02 * Math.sin(a * 13 + x * 24) + 0.025 * Math.sin(a * 21 - x * 18);
        const barras = [-1.10, -0.24, 0.54].some(c => Math.abs(x - c - 0.10 * v) < 0.12 + 0.045 * (v + 1) + margem);
        if (barras && v > -0.62 && x < 0.8) cor.lerp(faixa, 0.82);
        if (x > 0.66 && x < 1.18 && v > -0.05 && v < 0.72 && Math.sin(x * 37 + Math.cos(a * 17)) * Math.cos(a * 29) > 0.16) cor.lerp(faixa, 0.9);
        if (x > 0.45 && v < -0.67) cor.lerp(garganta, Math.min(0.9, (-v - 0.67) * 3));
        cor.multiplyScalar(0.98 + 0.02 * Math.sin(i * 1.7 + j * 2.1)); cores.push(cor.r, cor.g, cor.b);
      }
    }
    for (let i = 0; i < n; i++) for (let j = 0; j < volta; j++) { const a = i * (volta + 1) + j, b = a + volta + 1; indices.push(a, b, a + 1, a + 1, b, b + 1); }
    const geo = new THREE.BufferGeometry(); geo.setAttribute('position', new THREE.Float32BufferAttribute(pos, 3)); geo.setAttribute('color', new THREE.Float32BufferAttribute(cores, 3)); geo.setAttribute('uv', new THREE.Float32BufferAttribute(uv, 2)); geo.setIndex(indices); geo.computeVertexNormals();
    // Microtextura de escamas desenhada em código, sem usar a foto como recorte ou textura plana.
    const escamas = document.createElement('canvas'); escamas.width = 1024; escamas.height = 512;
    const ctx = escamas.getContext('2d'); let mapaEscamas: THREE.CanvasTexture | null = null;
    if (ctx) {
      ctx.fillStyle = '#e8e8e8'; ctx.fillRect(0, 0, 1024, 512);
      for (let linha = 0; linha < 45; linha++) for (let coluna = 0; coluna < 92; coluna++) {
        const x = coluna * 12 + (linha % 2) * 6, y = linha * 12;
        ctx.beginPath(); ctx.ellipse(x, y, 7, 5, 0, -1.1, 1.1); ctx.strokeStyle = 'rgba(65,65,65,.28)'; ctx.lineWidth = 1; ctx.stroke();
        ctx.beginPath(); ctx.ellipse(x - 1, y - 1, 6, 4, 0, -1.1, 1.1); ctx.strokeStyle = 'rgba(255,255,255,.35)'; ctx.stroke();
      }
      mapaEscamas = new THREE.CanvasTexture(escamas); mapaEscamas.colorSpace = THREE.SRGBColorSpace;
    }
    const pele = new THREE.MeshStandardMaterial({ vertexColors: true, map: mapaEscamas, bumpMap: mapaEscamas, bumpScale: 0.012, metalness: 0.06, roughness: 0.47, side: THREE.DoubleSide, clippingPlanes: [corte] });
    peixe.add(new THREE.Mesh(geo, pele));
    // Boca larga e oblíqua com lábios discretos, sem o anel circular do modelo anterior.
    esfera(peixe, escuro, 1.60, -0.175, 0, 0.035, 0.095, 0.17);
    esfera(peixe, ouro, 1.43, -0.285, 0, 0.29, 0.065, 0.19);
    const linhaMat = new THREE.LineBasicMaterial({ color: 0x314339, transparent: true, opacity: 0.8, clippingPlanes: [corte] });
    function nervura(parent: THREE.Object3D, pontos: THREE.Vector3[], cor = linhaMat) { parent.add(new THREE.Line(new THREE.BufferGeometry().setFromPoints(pontos), cor)); }
    for (const lado of [-1, 1]) {
      esfera(peixe, iris, 1.075, 0.17, lado * 0.268, 0.067, 0.06, 0.022);
      esfera(peixe, pupila, 1.085, 0.17, lado * 0.286, 0.036, 0.035, 0.013);
      esfera(peixe, material(0xe3dfce), 1.10, 0.187, lado * 0.297, 0.010, 0.009, 0.005);
      esfera(peixe, escuro, 1.40, -0.035, lado * 0.17, 0.018, 0.012, 0.008);
      const curva = new THREE.CubicBezierCurve3(new THREE.Vector3(0.82, 0.39, lado * 0.25), new THREE.Vector3(0.52, 0.19, lado * 0.39), new THREE.Vector3(0.50, -0.22, lado * 0.34), new THREE.Vector3(0.77, -0.38, lado * 0.22));
      peixe.add(new THREE.Mesh(new THREE.TubeGeometry(curva, 24, 0.009, 5, false), escuro));
      const labio = new THREE.QuadraticBezierCurve3(new THREE.Vector3(1.66, -0.18, lado * 0.10), new THREE.Vector3(1.40, -0.25, lado * 0.23), new THREE.Vector3(1.10, -0.21, lado * 0.27));
      peixe.add(new THREE.Mesh(new THREE.TubeGeometry(labio, 20, 0.012, 6, false), ouro));
    }
    function nadadeira(parent: THREE.Object3D, shape: THREE.Shape, mat: THREE.Material, z = 0) {
      const mesh = new THREE.Mesh(new THREE.ExtrudeGeometry(shape, { depth: 0.018, bevelEnabled: true, bevelThickness: 0.008, bevelSize: 0.008, bevelSegments: 2, curveSegments: 20, steps: 1 }), mat); mesh.position.z = z; parent.add(mesh); return mesh;
    }
    const cauda = new THREE.Group(); cauda.position.x = -1.73; peixe.add(cauda);
    const caudaShape = new THREE.Shape(); caudaShape.moveTo(0.04, 0.10); caudaShape.quadraticCurveTo(-0.33, 0.18, -0.69, 0.42); caudaShape.bezierCurveTo(-0.98, 0.61, -1.08, 0.37, -1.09, 0.10); caudaShape.quadraticCurveTo(-1.12, -0.18, -1.02, -0.43); caudaShape.quadraticCurveTo(-0.87, -0.57, -0.67, -0.37); caudaShape.quadraticCurveTo(-0.30, -0.14, 0.04, -0.10); caudaShape.closePath();
    const finCauda = nadadeira(cauda, caudaShape, vermelho);
    const finGeo = finCauda.geometry, finPos = finGeo.getAttribute('position'); const coresCauda: number[] = [];
    for (let i = 0; i < finPos.count; i++) { const y = finPos.getY(i); const c = new THREE.Color('#913723').lerp(new THREE.Color('#42534b'), Math.min(1, Math.max(0, (y + 0.08) * 3.7))); coresCauda.push(c.r, c.g, c.b); }
    finGeo.setAttribute('color', new THREE.Float32BufferAttribute(coresCauda, 3)); finCauda.material = new THREE.MeshStandardMaterial({ vertexColors: true, roughness: 0.6, metalness: 0.02, side: THREE.DoubleSide, clippingPlanes: [corte] });
    for (let i = 0; i < 14; i++) { const y = (i / 13 - 0.5) * 0.78; nervura(cauda, [new THREE.Vector3(-0.08, 0, 0.026), new THREE.Vector3(-0.60, y * 0.75, 0.026), new THREE.Vector3(-1.02, y, 0.026)]); }
    for (const lado of [-1, 1]) { esfera(cauda, ouro, -0.20, 0.04, lado * 0.087, 0.095, 0.12, 0.016); esfera(cauda, pupila, -0.20, 0.04, lado * 0.102, 0.064, 0.085, 0.011); }
    const dorso = new THREE.Shape(); dorso.moveTo(0.82, 0.42);
    [[0.69, 0.79], [0.60, 0.54], [0.47, 0.91], [0.37, 0.60], [0.23, 1.00], [0.13, 0.65], [-0.04, 1.02], [-0.15, 0.65], [-0.34, 0.96], [-0.45, 0.61], [-0.63, 0.87], [-0.74, 0.54]].forEach(([x, y]) => dorso.lineTo(x, y));
    dorso.bezierCurveTo(-1.12, 0.82, -1.40, 0.67, -1.48, 0.25); dorso.lineTo(-0.60, 0.40); dorso.lineTo(0.82, 0.42); dorso.closePath(); nadadeira(peixe, dorso, dorsalMat);
    for (let i = 0; i < 17; i++) { const x = -1.35 + i * 0.125; const alto = x < -0.7 ? 0.62 : 0.75 + 0.10 * Math.sin(i); nervura(peixe, [new THREE.Vector3(x + 0.12, 0.40, 0.026), new THREE.Vector3(x, alto, 0.026)]); }
    const anal = new THREE.Shape(); anal.moveTo(-0.43, -0.38); anal.quadraticCurveTo(-0.70, -0.90, -1.03, -0.69); anal.quadraticCurveTo(-1.19, -0.57, -1.10, -0.29); anal.closePath(); nadadeira(peixe, anal, vermelho);
    const ventral = new THREE.Shape(); ventral.moveTo(0.77, -0.32); ventral.quadraticCurveTo(0.40, -0.49, 0.30, -0.94); ventral.quadraticCurveTo(0.63, -0.78, 0.85, -0.39); ventral.closePath(); nadadeira(peixe, ventral, vermelho);
    const lateralShape = new THREE.Shape(); lateralShape.moveTo(0.69, -0.13); lateralShape.bezierCurveTo(0.26, -0.20, 0.11, -0.36, -0.16, -0.56); lateralShape.quadraticCurveTo(0.31, -0.61, 0.74, -0.22); lateralShape.closePath();
    const lateral = nadadeira(peixe, lateralShape, material(0x776044, 0.02), 0.30); lateral.rotation.x = -0.28;
    const outra = lateral.clone(); outra.position.z = -0.30; outra.rotation.x = 0.28; peixe.add(outra);
    const texturaAgua = document.createElement('canvas'); texturaAgua.width = 128; texturaAgua.height = 128;
    const contextoAgua = texturaAgua.getContext('2d');
    let mapaAgua: THREE.CanvasTexture | null = null;
    if (contextoAgua) {
      const gradiente = contextoAgua.createRadialGradient(64, 64, 8, 64, 64, 64);
      gradiente.addColorStop(0, 'rgba(6,35,31,.72)'); gradiente.addColorStop(0.55, 'rgba(6,35,31,.4)'); gradiente.addColorStop(1, 'rgba(6,35,31,0)');
      contextoAgua.fillStyle = gradiente; contextoAgua.fillRect(0, 0, 128, 128);
      mapaAgua = new THREE.CanvasTexture(texturaAgua); mapaAgua.colorSpace = THREE.SRGBColorSpace;
    }
    const agua = new THREE.Mesh(new THREE.CircleGeometry(3.2, 80), new THREE.MeshBasicMaterial({ color: mapaAgua ? 0xffffff : 0x0a2b26, map: mapaAgua, transparent: true, opacity: 0.75, side: THREE.DoubleSide, depthWrite: false })); agua.scale.set(1.15, 0.42, 1); agua.rotation.x = -Math.PI / 2; agua.position.set(0, -1.1, 0); scene.add(agua);
    const ondas: THREE.Mesh[] = [];
    for (let i = 0; i < 3; i++) { const m = new THREE.Mesh(new THREE.RingGeometry(0.94, 1, 64), new THREE.MeshBasicMaterial({ color: 0x9dd6bd, transparent: true, opacity: 0, side: THREE.DoubleSide, depthWrite: false })); m.rotation.x = -Math.PI / 2; m.position.y = -1.085; scene.add(m); ondas.push(m); }
    const gotas = Array.from({ length: 22 }, () => { const m = new THREE.Mesh(new THREE.SphereGeometry(0.028, 6, 5), new THREE.MeshBasicMaterial({ color: 0xc9f3e5, transparent: true, opacity: 0 })); scene.add(m); return m; });
    host.appendChild(renderer.domElement); renderer.domElement.setAttribute('aria-hidden', 'true'); renderer.domElement.style.cssText = 'width:100%;height:100%;display:block;';
    function resize() { const w = Math.max(1, host.clientWidth), h = Math.max(1, host.clientHeight); renderer.setSize(w, h, false); camera.aspect = w / h; camera.position.z = camera.aspect < 1.4 ? 10 : 8; camera.updateProjectionMatrix(); }
    function render(segundos: number) {
      if (descartado) return;
      const ciclo = segundos % 9, salto = ciclo < 3.6, p = Math.min(1, ciclo / 3.6);
      peixe.position.set(salto ? -0.62 + p * 1.24 : 0.2 * Math.sin(segundos * 0.6), salto ? -1.35 + Math.sin(p * Math.PI) * 2.05 : -1.35, 0);
      peixe.rotation.set(salto ? 0.10 * Math.sin(p * Math.PI * 2) : 0, salto ? 0.16 + Math.sin(p * Math.PI * 2) * 0.70 : 0.16, salto ? 0.46 * Math.cos(p * Math.PI) : 0);
      cauda.rotation.y = Math.sin(segundos * 9) * 0.25; lateral.rotation.y = Math.sin(segundos * 6) * 0.16; outra.rotation.y = -lateral.rotation.y;
      ondas.forEach((m, i) => { const tempo = (ciclo - 3.35 - i * 0.21); const u = tempo / 1.65; const mostrar = u >= 0 && u <= 1; m.visible = mostrar; m.position.x = 0.62; m.scale.setScalar(0.3 + Math.max(0, u) * 1.7); (m.material as THREE.MeshBasicMaterial).opacity = mostrar ? (1 - u) * 0.47 : 0; });
      gotas.forEach((m, i) => { const u = (ciclo - 3.4) / 0.9; const mostrar = u > 0 && u < 1; m.visible = mostrar; const a = i * 2.399; m.position.set(0.62 + Math.cos(a) * u * (0.65 + i % 4 * 0.1), -1.1 + Math.sin(u * Math.PI) * (0.4 + i % 5 * 0.18), Math.sin(a) * u); (m.material as THREE.MeshBasicMaterial).opacity = mostrar ? (1 - u) * 0.85 : 0; });
      renderer.render(scene, camera);
    }
    resize(); return { render, resize, dispose, canvas: renderer.domElement };
  } catch (erro) { dispose(); throw erro; }
}
