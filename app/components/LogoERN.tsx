'use client';

import Image from 'next/image';
import { useEffect, useRef, useState } from 'react';

import type {
  BufferGeometry,
  Material,
  WebGLRenderer,
} from 'three';

type LogoERNProps = {
  tamanho?: number;
  prioridade?: boolean;
};

export default function LogoERN({
  tamanho = 48,
  prioridade = false,
}: LogoERNProps) {
  const recipienteRef = useRef<HTMLSpanElement>(null);
  const [pronto, setPronto] = useState(false);
  const [imagemFalhou, setImagemFalhou] = useState(false);

  useEffect(() => {
    const elemento = recipienteRef.current;
    if (elemento === null) return;

    const recipiente: HTMLSpanElement = elemento;

    let encerrado = false;
    let iniciou = false;
    let visivel = false;
    let falhou = false;
    let quadro = 0;

    let renderer: WebGLRenderer | null = null;
    let resizeObserver: ResizeObserver | null = null;
    let sincronizarCena: (() => void) | null = null;

    const geometrias = new Set<BufferGeometry>();
    const materiais = new Set<Material>();

    const movimentoReduzido = window.matchMedia(
      '(prefers-reduced-motion: reduce)',
    );

    setPronto(false);

    function parar(): void {
      cancelAnimationFrame(quadro);
      quadro = 0;
    }

    function aoPerderContexto(evento: Event): void {
      evento.preventDefault();
      falhou = true;
      parar();

      if (!encerrado) setPronto(false);
    }

    function liberar(): void {
      parar();
      resizeObserver?.disconnect();

      if (renderer) {
        renderer.domElement.removeEventListener(
          'webglcontextlost',
          aoPerderContexto,
        );
      }

      geometrias.forEach((item) => item.dispose());
      materiais.forEach((item) => item.dispose());

      geometrias.clear();
      materiais.clear();

      if (renderer) {
        renderer.dispose();
        renderer.forceContextLoss();
        renderer.domElement.remove();
        renderer = null;
      }
    }

    async function iniciar(): Promise<void> {
      if (iniciou || encerrado) return;
      iniciou = true;

      try {
        const THREE = await import('three');
        if (encerrado) return;

        const cena = new THREE.Scene();

        const camera = new THREE.OrthographicCamera(
          -1.8, 1.8, 1.8, -1.8, 0.1, 20,
        );

        camera.position.set(0.35, 0.55, 7);
        camera.lookAt(0, 0.05, 0);

        const renderizador = new THREE.WebGLRenderer({
          alpha: true,
          antialias: true,
          powerPreference: 'low-power',
        });

        renderer = renderizador;

        renderizador.setPixelRatio(
          Math.min(window.devicePixelRatio || 1, 1.5),
        );
        renderizador.setClearColor(0x000000, 0);
        renderizador.outputColorSpace = THREE.SRGBColorSpace;
        renderizador.toneMapping = THREE.ACESFilmicToneMapping;
        renderizador.toneMappingExposure = 1.1;

        const canvas = renderizador.domElement;

        canvas.style.display = 'block';
        canvas.style.width = '100%';
        canvas.style.height = '100%';
        canvas.setAttribute('aria-hidden', 'true');
        canvas.addEventListener('webglcontextlost', aoPerderContexto);

        recipiente.appendChild(canvas);

        cena.add(
          new THREE.HemisphereLight(0xe0e9f5, 0x080809, 2),
        );

        const luzSol = new THREE.DirectionalLight(0xffcf88, 3);
        luzSol.position.set(-3, 4, 5);
        cena.add(luzSol);

        const luzAzul = new THREE.DirectionalLight(0x6aaeff, 3);
        luzAzul.position.set(4, 1, 3);
        cena.add(luzAzul);

        const luzVermelha = new THREE.DirectionalLight(0xff6051, 1.5);
        luzVermelha.position.set(-4, 0, 2);
        cena.add(luzVermelha);

        function registrarMaterial<T extends Material>(
          acabamento: T,
        ): T {
          materiais.add(acabamento);
          return acabamento;
        }

        function malha(
          geometria: BufferGeometry,
          acabamento: Material,
        ) {
          geometrias.add(geometria);
          return new THREE.Mesh(geometria, acabamento);
        }

        const materialSol = registrarMaterial(
          new THREE.MeshStandardMaterial({
            color: 0xffb52e,
            emissive: 0xef7d13,
            emissiveIntensity: 0.4,
            metalness: 0.15,
            roughness: 0.4,
          }),
        );

        const sol = malha(
          new THREE.SphereGeometry(0.85, 28, 20),
          materialSol,
        );

        sol.position.set(0, 0.58, -0.5);
        sol.scale.z = 0.4;
        cena.add(sol);

        const materialHalo = registrarMaterial(
          new THREE.MeshBasicMaterial({
            color: 0xffa735,
            transparent: true,
            opacity: 0.09,
            depthWrite: false,
            side: THREE.DoubleSide,
          }),
        );

        const halo = malha(
          new THREE.CircleGeometry(1.04, 40),
          materialHalo,
        );

        halo.position.set(0, 0.58, -0.95);
        cena.add(halo);

        const configuracoes = [
          {
            cor: 0x380b13,
            largura: 1.31,
            y: -0.03,
            z: 0,
            fase: 0,
          },
          {
            cor: 0x092539,
            largura: 1.4,
            y: -0.46,
            z: 0.22,
            fase: 0.7,
          },
          {
            cor: 0x080d13,
            largura: 1.23,
            y: -0.91,
            z: 0.44,
            fase: 1.4,
          },
        ];

        const segmentos = 48;
        const lados = 12;

        const ondas = configuracoes.map((configuracao) => {
          const geometria = new THREE.BufferGeometry();

          const posicoes = new THREE.BufferAttribute(
            new Float32Array((segmentos + 1) * (lados + 1) * 3),
            3,
          );

          posicoes.setUsage(THREE.DynamicDrawUsage);
          geometria.setAttribute('position', posicoes);

          const indices: number[] = [];

          for (let i = 0; i < segmentos; i += 1) {
            for (let j = 0; j < lados; j += 1) {
              const a = i * (lados + 1) + j;
              const b = a + lados + 1;

              indices.push(
                a, a + 1, b,
                a + 1, b + 1, b,
              );
            }
          }

          geometria.setIndex(indices);

          const acabamento = registrarMaterial(
            new THREE.MeshPhysicalMaterial({
              color: configuracao.cor,
              metalness: 0.15,
              roughness: 0.3,
              clearcoat: 0.85,
              clearcoatRoughness: 0.2,
            }),
          );

          const objeto = malha(geometria, acabamento);

          objeto.position.set(0, configuracao.y, configuracao.z);

          // As ondas mudam de forma dentro de um espaço pequeno fixo.
          objeto.frustumCulled = false;

          cena.add(objeto);

          return {
            configuracao,
            geometria,
            posicoes,
          };
        });

        function atualizarOndas(tempo: number): void {
          ondas.forEach(({ configuracao, geometria, posicoes }) => {
            for (let i = 0; i <= segmentos; i += 1) {
              const u = i / segmentos;
              const x = (u * 2 - 1) * configuracao.largura;

              // Cristas e vales avançam ao longo da onda.
              const fase = x * 3 - tempo * 1.5 + configuracao.fase;

              const altura =
                Math.sin(fase) * 0.15 +
                Math.sin(fase * 2 + 0.5) * 0.025;

              // Extremidades arredondadas e corpo espesso.
              const espessura =
                0.1 + 0.9 * Math.pow(Math.sin(Math.PI * u), 0.35);

              for (let j = 0; j <= lados; j += 1) {
                const angulo = (j / lados) * Math.PI * 2;
                const indice = i * (lados + 1) + j;

                posicoes.setXYZ(
                  indice,
                  x,
                  altura + Math.cos(angulo) * 0.155 * espessura,
                  Math.sin(angulo) * 0.22 * espessura,
                );
              }
            }

            posicoes.needsUpdate = true;

            // Atualiza a iluminação conforme a superfície se deforma.
            geometria.computeVertexNormals();
          });
        }

        let tempo = 0;
        let ultimoInstante = 0;
        let primeiroFrame = true;

        function desenhar(): void {
          if (encerrado || falhou) return;

          try {
            renderizador.render(cena, camera);

            if (primeiroFrame) {
              primeiroFrame = false;
              setPronto(true);
            }
          } catch {
            falhou = true;
            parar();
            setPronto(false);
          }
        }

        function animar(instante: number): void {
          quadro = 0;

          if (
            encerrado ||
            falhou ||
            !visivel ||
            document.hidden ||
            movimentoReduzido.matches
          ) {
            return;
          }

          const diferenca = instante - ultimoInstante;

          if (diferenca >= 1000 / 30) {
            tempo += Math.min(diferenca / 1000, 0.1);
            ultimoInstante = instante;

            atualizarOndas(tempo);
            desenhar();
          }

          if (!falhou) {
            quadro = requestAnimationFrame(animar);
          }
        }

        sincronizarCena = () => {
          parar();

          if (encerrado || falhou || !visivel || document.hidden) {
            return;
          }

          atualizarOndas(movimentoReduzido.matches ? 0 : tempo);
          desenhar();

          if (!movimentoReduzido.matches && !falhou) {
            ultimoInstante = performance.now();
            quadro = requestAnimationFrame(animar);
          }
        };

        function redimensionar(): void {
          if (encerrado || falhou) return;

          const { width, height } = recipiente.getBoundingClientRect();
          if (width <= 0 || height <= 0) return;

          renderizador.setSize(width, height, false);

          const proporcao = width / height;
          camera.left = -1.8 * proporcao;
          camera.right = 1.8 * proporcao;
          camera.updateProjectionMatrix();

          if (visivel && !document.hidden) desenhar();
        }

        atualizarOndas(0);

        resizeObserver = new ResizeObserver(redimensionar);
        resizeObserver.observe(recipiente);

        redimensionar();
        sincronizarCena();
      } catch {
        falhou = true;
        liberar();

        if (!encerrado) setPronto(false);
      }
    }

    function sincronizar(): void {
      sincronizarCena?.();
    }

    const observador = new IntersectionObserver(
      ([entrada]) => {
        visivel = entrada?.isIntersecting ?? false;

        if (visivel && !iniciou) void iniciar();

        sincronizar();
      },
      { threshold: 0.01 },
    );

    observador.observe(recipiente);

    document.addEventListener('visibilitychange', sincronizar);
    movimentoReduzido.addEventListener('change', sincronizar);

    return () => {
      encerrado = true;

      observador.disconnect();
      document.removeEventListener('visibilitychange', sincronizar);
      movimentoReduzido.removeEventListener('change', sincronizar);

      sincronizarCena = null;
      liberar();
    };
  }, []);

  return (
    <span
      role="img"
      aria-label="Encantos Rio Negro — ondas negras, reflexos azuis e vermelhos e sol dourado"
      className="relative inline-block shrink-0 overflow-hidden rounded-full border border-[#D6A657]/40 shadow-[0_4px_18px_rgba(0,0,0,0.25)]"
      style={{
        width: tamanho,
        height: tamanho,
        background:
          'radial-gradient(circle at 50% 25%, #483022 0%, #17232C 55%, #090F15 100%)',
      }}
    >
      <span
        aria-hidden="true"
        className={`absolute inset-0 flex items-center justify-center transition-opacity duration-300 motion-reduce:transition-none ${
          pronto ? 'opacity-0' : 'opacity-100'
        }`}
      >
        {imagemFalhou ? (
          <span
            className="font-serif font-bold text-[#F4C77E]"
            style={{ fontSize: tamanho * 0.24 }}
          >
            ERN
          </span>
        ) : (
          <Image
            src="/logo.png"
            alt=""
            fill
            sizes={`${tamanho}px`}
            priority={prioridade}
            onError={() => setImagemFalhou(true)}
            className="object-contain"
          />
        )}
      </span>

      <span
        ref={recipienteRef}
        aria-hidden="true"
        className={`pointer-events-none absolute inset-0 transition-opacity duration-300 motion-reduce:transition-none ${
          pronto ? 'opacity-100' : 'opacity-0'
        }`}
      />
    </span>
  );
}