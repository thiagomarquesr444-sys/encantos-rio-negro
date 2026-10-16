import * as THREE from 'three';
export type PoseMarcaERN = { yaw: number; pitch: number; hoverX: number; hoverY: number; arrastando: boolean };
// Letras vetoriais próprias: não depende de fontes, modelos ou serviços externos.
export function criarMarcaERN3D(host: HTMLElement) {
  const renderer = new THREE.WebGLRenderer({ alpha: true, antialias: true, powerPreference: 'low-power' });
  renderer.setPixelRatio(Math.min(window.devicePixelRatio || 1, 1.5)); renderer.setClearColor(0, 0);
  renderer.outputColorSpace = THREE.SRGBColorSpace; renderer.toneMapping = THREE.ACESFilmicToneMapping; renderer.toneMappingExposure = 1.2;
  const scene = new THREE.Scene(), camera = new THREE.PerspectiveCamera(32, 1, 0.1, 30);
  camera.position.set(0, 0.20, 5.8); camera.lookAt(0, -0.12, 0);
  let destruido = false;
  function dispose() {
    if (destruido) return; destruido = true;
    const geometrias = new Set<THREE.BufferGeometry>(), materiais = new Set<THREE.Material>();
    scene.traverse(o => { const m = o as THREE.Mesh; if (m.geometry) geometrias.add(m.geometry); if (m.material) (Array.isArray(m.material) ? m.material : [m.material]).forEach(x => materiais.add(x)); });
    geometrias.forEach(g => g.dispose()); materiais.forEach(m => m.dispose()); renderer.dispose(); renderer.forceContextLoss(); renderer.domElement.remove();
  }
  try {
    scene.add(new THREE.HemisphereLight(0xfff3d7, 0x214b3d, 2.5));
    const luz = new THREE.DirectionalLight(0xffe4ae, 4); luz.position.set(-2, 4, 5); scene.add(luz);
    const recorte = new THREE.DirectionalLight(0x9bd8c5, 3); recorte.position.set(3, 1, -3); scene.add(recorte);
    const frente = new THREE.MeshStandardMaterial({ color: 0xe3ad51, metalness: 0.4, roughness: 0.27 });
    const lateral = new THREE.MeshStandardMaterial({ color: 0x6b703f, metalness: 0.5, roughness: 0.30 });
    const grupo = new THREE.Group(); scene.add(grupo);
    function poligono(pontos: [number, number][]) { const s = new THREE.Shape(); pontos.forEach(([x, y], i) => i ? s.lineTo(x, y) : s.moveTo(x, y)); s.closePath(); return s; }
    const e = poligono([[0,0],[0.86,0],[0.86,0.24],[0.25,0.24],[0.25,0.55],[0.74,0.55],[0.74,0.79],[0.25,0.79],[0.25,1.06],[0.86,1.06],[0.86,1.3],[0,1.3]]);
    const r = new THREE.Shape(); r.moveTo(0,0); r.lineTo(0.25,0); r.lineTo(0.25,0.50); r.lineTo(0.40,0.50); r.lineTo(0.70,0); r.lineTo(0.99,0); r.lineTo(0.64,0.57); r.bezierCurveTo(1.06,0.72,0.99,1.3,0.56,1.3); r.lineTo(0,1.3); r.closePath();
    const furo = new THREE.Path(); furo.moveTo(0.25,0.77); furo.lineTo(0.25,1.06); furo.lineTo(0.53,1.06); furo.bezierCurveTo(0.79,1.06,0.79,0.77,0.53,0.77); furo.closePath(); r.holes.push(furo);
    const n = poligono([[0,0],[0.25,0],[0.25,0.84],[0.84,0],[1.10,0],[1.10,1.3],[0.85,1.3],[0.85,0.46],[0.26,1.3],[0,1.3]]);
    [e,r,n].forEach((forma, i) => { const geo = new THREE.ExtrudeGeometry(forma, { depth: 0.22, bevelEnabled: true, bevelSize: 0.035, bevelThickness: 0.035, bevelSegments: 3, curveSegments: 24, steps: 1 }); const mesh = new THREE.Mesh(geo, [frente,lateral]); mesh.position.x = [0,1.12,2.37][i]; grupo.add(mesh); });
    const centro = new THREE.Box3().setFromObject(grupo).getCenter(new THREE.Vector3()); grupo.children.forEach(c => c.position.sub(centro));
    const ondas = new THREE.Group(); scene.add(ondas);
    for (let linha = 0; linha < 3; linha++) {
      const pontos = Array.from({ length: 60 }, (_, i) => { const x = -1.75 + i / 59 * 3.5; return new THREE.Vector3(x,-1.02 + linha * 0.105 + Math.sin(x * 2.5 + linha * 0.75) * 0.055,-0.28); });
      const curva = new THREE.CatmullRomCurve3(pontos); ondas.add(new THREE.Mesh(new THREE.TubeGeometry(curva,60,0.014,5,false),new THREE.MeshStandardMaterial({ color: linha === 1 ? 0xc39143 : 0x477b6b, metalness: 0.25, roughness: 0.45 })));
    }
    host.appendChild(renderer.domElement); renderer.domElement.setAttribute('aria-hidden','true'); renderer.domElement.style.cssText = 'width:100%;height:100%;display:block;';
    function resize() { const w = Math.max(1,host.clientWidth), h = Math.max(1,host.clientHeight); renderer.setSize(w,h,false); camera.aspect = w / h; camera.position.z = camera.aspect < 1.35 ? 7.4 : 5.8; camera.updateProjectionMatrix(); }
    function render(t: number, pose: PoseMarcaERN, animado = true) {
      if (destruido) return;
      const yaw = pose.yaw + pose.hoverX * 0.26 + Math.sin(t * 0.27) * 0.16;
      const pitch = pose.pitch - pose.hoverY * 0.12 + Math.sin(t * 0.22) * 0.035;
      const suavidade = animado && !pose.arrastando ? 0.10 : 1;
      grupo.rotation.y += (yaw - grupo.rotation.y) * suavidade; grupo.rotation.x += (pitch - grupo.rotation.x) * suavidade;
      grupo.rotation.z = Math.sin(t * 0.31) * 0.025; grupo.position.y = 0.12 + Math.sin(t * 0.8) * 0.08;
      renderer.render(scene,camera);
    }
    resize(); return { canvas: renderer.domElement, render, resize, dispose };
  } catch (e) { dispose(); throw e; }
}
