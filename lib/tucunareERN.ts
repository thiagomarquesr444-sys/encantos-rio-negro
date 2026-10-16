import * as THREE from 'three';

// Escultura procedural original: sem modelos, texturas ou serviços externos.
export function criarTucunareERN(host: HTMLElement) {
  const renderer = new THREE.WebGLRenderer({ alpha: true, antialias: true, powerPreference: 'low-power' });
  renderer.setPixelRatio(Math.min(window.devicePixelRatio || 1, 1.5));
  renderer.setClearColor(0x000000, 0); renderer.outputColorSpace = THREE.SRGBColorSpace;
  renderer.toneMapping = THREE.ACESFilmicToneMapping; renderer.toneMappingExposure = 1.45;
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
    scene.add(new THREE.HemisphereLight(0xe0ffed, 0x123e30, 2.3));
    const sol = new THREE.DirectionalLight(0xffe2a1, 4.5); sol.position.set(2, 5, 5); scene.add(sol);
    const contorno = new THREE.DirectionalLight(0x5fcac1, 2.7); contorno.position.set(-3, 1, -4); scene.add(contorno);
    const peixe = new THREE.Group(); scene.add(peixe);
    const corte = new THREE.Plane(new THREE.Vector3(0, 1, 0), 1.1);
    const material = (cor: number, metalness = 0.15) => new THREE.MeshStandardMaterial({ color: cor, roughness: 0.36, metalness, side: THREE.DoubleSide, clippingPlanes: [corte] });
    const ouro = material(0xd4b94a), escuro = material(0x142d24), vermelho = material(0xcb7738), iris = material(0xf5a82e, 0.4), pupila = material(0x07120c, 0.3);
    function esfera(parent: THREE.Object3D, mat: THREE.Material, x: number, y: number, z: number, sx: number, sy: number, sz: number) { const m = new THREE.Mesh(new THREE.SphereGeometry(1, 24, 16), mat); m.position.set(x, y, z); m.scale.set(sx, sy, sz); parent.add(m); return m; }
    const pos: number[] = [], cores: number[] = [], indices: number[] = []; const n = 72, volta = 40;
    const dourado = new THREE.Color('#bea532'), verde = new THREE.Color('#425f22'), barriga = new THREE.Color('#efda8b'), faixa = new THREE.Color('#142a20');
    for (let i = 0; i <= n; i++) {
      const u = i / n, x = -1.48 + u * 2.82;
      const volume = Math.pow(Math.sin(Math.PI * u), 0.58) * (0.82 + 0.28 * u);
      for (let j = 0; j <= volta; j++) {
        const a = j / volta * Math.PI * 2, v = Math.cos(a);
        const y = volume * 0.52 * v + 0.045 * Math.sin(u * Math.PI), z = volume * 0.27 * Math.sin(a);
        pos.push(x, y, z);
        let cor = v > 0 ? dourado.clone().lerp(verde, v * 0.8) : dourado.clone().lerp(barriga, -v * 0.82);
        if ([-0.84, -0.12, 0.56].some(c => Math.abs(x - c - 0.09 * v) < 0.105 + 0.045 * (v + 1)) && v > -0.64) cor = cor.lerp(faixa, 0.94);
        const escama = 0.94 + Math.sin(i * 2.4 + j * 1.8) * 0.045; cor.multiplyScalar(escama); cores.push(cor.r, cor.g, cor.b);
      }
    }
    for (let i = 0; i < n; i++) for (let j = 0; j < volta; j++) { const a = i * (volta + 1) + j, b = a + volta + 1; indices.push(a, b, a + 1, a + 1, b, b + 1); }
    const geo = new THREE.BufferGeometry(); geo.setAttribute('position', new THREE.Float32BufferAttribute(pos, 3)); geo.setAttribute('color', new THREE.Float32BufferAttribute(cores, 3)); geo.setIndex(indices); geo.computeVertexNormals();
    const pele = new THREE.MeshStandardMaterial({ vertexColors: true, metalness: 0.28, roughness: 0.32, side: THREE.DoubleSide, clippingPlanes: [corte] });
    peixe.add(new THREE.Mesh(geo, pele));
    // Cabeça e mandíbula de boca larga.
    esfera(peixe, ouro, 1.16, 0.02, 0, 0.30, 0.30, 0.255);
    esfera(peixe, escuro, 1.405, 0.015, 0, 0.045, 0.19, 0.19);
    const boca = new THREE.Mesh(new THREE.TorusGeometry(0.19, 0.033, 10, 28), ouro); boca.rotation.y = Math.PI / 2; boca.position.set(1.44, 0.015, 0); boca.scale.set(1, 0.88, 1); peixe.add(boca);
    esfera(peixe, ouro, 1.24, -0.20, 0, 0.25, 0.075, 0.18);
    for (const lado of [-1, 1]) {
      esfera(peixe, iris, 1.06, 0.15, lado * 0.238, 0.087, 0.087, 0.035);
      esfera(peixe, pupila, 1.072, 0.154, lado * 0.267, 0.046, 0.048, 0.018);
      esfera(peixe, material(0xffffff), 1.09, 0.177, lado * 0.282, 0.014, 0.014, 0.008);
      const curva = new THREE.QuadraticBezierCurve3(new THREE.Vector3(0.83, 0.32, lado * 0.23), new THREE.Vector3(0.67, 0, lado * 0.32), new THREE.Vector3(0.82, -0.28, lado * 0.23));
      peixe.add(new THREE.Mesh(new THREE.TubeGeometry(curva, 16, 0.013, 5, false), escuro));
      esfera(peixe, iris, -1.28, 0.035, lado * 0.145, 0.12, 0.13, 0.018);
      esfera(peixe, pupila, -1.28, 0.035, lado * 0.16, 0.074, 0.084, 0.013);
    }
    function nadadeira(parent: THREE.Object3D, pontos: [number, number][], mat: THREE.Material, z = 0) {
      const shape = new THREE.Shape(); pontos.forEach(([x, y], i) => { if (!i) shape.moveTo(x, y); else shape.lineTo(x, y); }); shape.closePath();
      const mesh = new THREE.Mesh(new THREE.ExtrudeGeometry(shape, { depth: 0.035, bevelEnabled: true, bevelThickness: 0.012, bevelSize: 0.016, bevelSegments: 1, steps: 1 }), mat); mesh.position.z = z; parent.add(mesh); return mesh;
    }
    const cauda = new THREE.Group(); cauda.position.x = -1.34; peixe.add(cauda);
    nadadeira(cauda, [[0.1, 0.12], [-0.30, 0.24], [-0.73, 0.52], [-0.82, 0.24], [-0.74, 0], [-0.82, -0.29], [-0.70, -0.48], [-0.26, -0.19], [0.1, -0.1]], vermelho);
    for (let i = 0; i < 9; i++) { const y = (i / 8 - 0.5) * 0.8; const linha = new THREE.Line(new THREE.BufferGeometry().setFromPoints([new THREE.Vector3(-0.12, 0, 0.045), new THREE.Vector3(-0.72, y, 0.045)]), new THREE.LineBasicMaterial({ color: 0x69551f, transparent: true, opacity: 0.65, clippingPlanes: [corte] })); cauda.add(linha); }
    nadadeira(peixe, [[-1.0, 0.25], [-0.95, 0.68], [-0.76, 0.58], [-0.61, 0.82], [-0.45, 0.62], [-0.28, 0.83], [-0.12, 0.64], [0.06, 0.78], [0.24, 0.60], [0.44, 0.70], [0.57, 0.36]], ouro);
    nadadeira(peixe, [[-0.95, -0.22], [-0.68, -0.66], [-0.24, -0.58], [-0.12, -0.42]], vermelho);
    const lateral = nadadeira(peixe, [[0.52, 0], [0.10, -0.15], [0.19, -0.52], [0.61, -0.28]], ouro, 0.24); lateral.rotation.x = -0.38;
    const outra = lateral.clone(); outra.position.z = -0.24; outra.rotation.x = 0.38; peixe.add(outra);
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
      peixe.rotation.set(salto ? 0.10 * Math.sin(p * Math.PI * 2) : 0, salto ? -0.20 + p * Math.PI * 2 : -0.20, salto ? 0.46 * Math.cos(p * Math.PI) : 0);
      cauda.rotation.y = Math.sin(segundos * 9) * 0.25; lateral.rotation.y = Math.sin(segundos * 6) * 0.16; outra.rotation.y = -lateral.rotation.y;
      ondas.forEach((m, i) => { const tempo = (ciclo - 3.35 - i * 0.21); const u = tempo / 1.65; const mostrar = u >= 0 && u <= 1; m.visible = mostrar; m.position.x = 0.62; m.scale.setScalar(0.3 + Math.max(0, u) * 1.7); (m.material as THREE.MeshBasicMaterial).opacity = mostrar ? (1 - u) * 0.47 : 0; });
      gotas.forEach((m, i) => { const u = (ciclo - 3.4) / 0.9; const mostrar = u > 0 && u < 1; m.visible = mostrar; const a = i * 2.399; m.position.set(0.62 + Math.cos(a) * u * (0.65 + i % 4 * 0.1), -1.1 + Math.sin(u * Math.PI) * (0.4 + i % 5 * 0.18), Math.sin(a) * u); (m.material as THREE.MeshBasicMaterial).opacity = mostrar ? (1 - u) * 0.85 : 0; });
      renderer.render(scene, camera);
    }
    resize(); return { render, resize, dispose, canvas: renderer.domElement };
  } catch (erro) { dispose(); throw erro; }
}
