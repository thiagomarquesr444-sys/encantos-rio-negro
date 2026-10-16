'use client';
import { useEffect, useRef, useState, type PointerEvent, type KeyboardEvent } from 'react';
import type { PoseMarcaERN } from '@/lib/marcaERN3D';
const neutra = (): PoseMarcaERN => ({ yaw:0, pitch:0, hoverX:0, hoverY:0, arrastando:false });
export default function MarcaERN3D() {
  const root = useRef<HTMLDivElement>(null), host = useRef<HTMLDivElement>(null);
  const pose = useRef(neutra()), anterior = useRef({ x:0,y:0 }), ponteiro = useRef<number|null>(null);
  const tempo = useRef(0), pausadoRef = useRef(false), redesenhar = useRef<()=>void>(()=>{});
  const [visivel,setVisivel] = useState(false), [aba,setAba] = useState(true), [reduzido,setReduzido] = useState(true);
  const [pronto,setPronto] = useState(false), [falhou,setFalhou] = useState(false), [pausado,setPausado] = useState(false);
  useEffect(()=>{
    const mq = window.matchMedia('(prefers-reduced-motion: reduce)'); const movimento=()=>setReduzido(mq.matches); movimento(); mq.addEventListener('change',movimento);
    const pagina=()=>setAba(!document.hidden); pagina(); document.addEventListener('visibilitychange',pagina);
    const observer=typeof IntersectionObserver==='undefined'?null:new IntersectionObserver(e=>setVisivel(e.some(x=>x.isIntersecting)),{threshold:0.05});
    if(observer&&root.current)observer.observe(root.current);else setVisivel(true);
    return()=>{mq.removeEventListener('change',movimento);document.removeEventListener('visibilitychange',pagina);observer?.disconnect();};
  },[]);
  useEffect(()=>{
    if(!visivel||!aba||reduzido||falhou||!host.current)return;
    let ativo=true,quadro=0,ultimo=0;let cena:ReturnType<typeof import('@/lib/marcaERN3D')['criarMarcaERN3D']>|undefined;let tamanho:ResizeObserver|undefined;
    const perdeu=(e:Event)=>{e.preventDefault();if(ativo){setPronto(false);setFalhou(true);}};
    const acordar=()=>{if(ativo&&!quadro)quadro=requestAnimationFrame(animar);};
    function animar(agora:number){
      quadro=0;if(!ativo)return;
      if(!ultimo||agora-ultimo>=1000/30||pausadoRef.current){if(!pausadoRef.current)tempo.current+=ultimo?Math.min((agora-ultimo)/1000,0.1):1/30;ultimo=agora;cena?.render(tempo.current,pose.current,!pausadoRef.current);}
      if(!pausadoRef.current)acordar();
    }
    const redimensionar=()=>{cena?.resize();acordar();};
    async function iniciar(){try{
      const {criarMarcaERN3D}=await import('@/lib/marcaERN3D');if(!ativo||!host.current)return;
      cena=criarMarcaERN3D(host.current);cena.canvas.addEventListener('webglcontextlost',perdeu);
      if(typeof ResizeObserver!=='undefined'){tamanho=new ResizeObserver(redimensionar);tamanho.observe(host.current);}
      window.addEventListener('resize',redimensionar);redesenhar.current=acordar;setPronto(true);acordar();
    }catch{if(ativo){setPronto(false);setFalhou(true);}}}
    void iniciar();
    return()=>{ativo=false;cancelAnimationFrame(quadro);redesenhar.current=()=>{};tamanho?.disconnect();window.removeEventListener('resize',redimensionar);cena?.canvas.removeEventListener('webglcontextlost',perdeu);cena?.dispose();pose.current.arrastando=false;ponteiro.current=null;setPronto(false);};
  },[visivel,aba,reduzido,falhou]);
  function mover(e:PointerEvent<HTMLDivElement>){
    if(!pronto)return;
    if(pose.current.arrastando&&ponteiro.current===e.pointerId){pose.current.yaw+=(e.clientX-anterior.current.x)*0.009;pose.current.pitch=Math.max(-0.55,Math.min(0.55,pose.current.pitch+(e.clientY-anterior.current.y)*0.006));anterior.current={x:e.clientX,y:e.clientY};}
    else if(e.pointerType!=='touch'){const r=e.currentTarget.getBoundingClientRect();pose.current.hoverX=((e.clientX-r.left)/Math.max(1,r.width)-0.5)*2;pose.current.hoverY=((e.clientY-r.top)/Math.max(1,r.height)-0.5)*2;}
    redesenhar.current();
  }
  function soltar(e:PointerEvent<HTMLDivElement>){if(ponteiro.current!==e.pointerId)return;pose.current.arrastando=false;ponteiro.current=null;if(e.currentTarget.hasPointerCapture?.(e.pointerId))e.currentTarget.releasePointerCapture(e.pointerId);redesenhar.current();}
  function resetar(){pose.current=neutra();redesenhar.current();}
  function teclado(e:KeyboardEvent<HTMLDivElement>){if(!pronto)return;if(!['ArrowLeft','ArrowRight','ArrowUp','ArrowDown','Home'].includes(e.key))return;e.preventDefault();if(e.key==='Home')resetar();else{if(e.key==='ArrowLeft')pose.current.yaw-=0.16;if(e.key==='ArrowRight')pose.current.yaw+=0.16;if(e.key==='ArrowUp')pose.current.pitch=Math.max(-0.55,pose.current.pitch-0.1);if(e.key==='ArrowDown')pose.current.pitch=Math.min(0.55,pose.current.pitch+0.1);redesenhar.current();}}
  return <div ref={root} className="pointer-events-none absolute inset-y-0 right-0 w-full lg:w-[46%]">
    <div role="group" aria-label="Marca ERN. Arraste para girar ou use as setas do teclado. Home retorna à posição inicial." tabIndex={pronto?0:undefined} onKeyDown={teclado} onPointerDown={e=>{if(!pronto||e.button!==0||ponteiro.current!==null)return;ponteiro.current=e.pointerId;pose.current.arrastando=true;pose.current.hoverX=0;pose.current.hoverY=0;anterior.current={x:e.clientX,y:e.clientY};e.currentTarget.setPointerCapture?.(e.pointerId);}} onPointerMove={mover} onPointerUp={soltar} onPointerCancel={soltar} onLostPointerCapture={()=>{pose.current.arrastando=false;ponteiro.current=null;}} onPointerLeave={()=>{if(!pose.current.arrastando){pose.current.hoverX=0;pose.current.hoverY=0;redesenhar.current();}}} className={'absolute inset-x-2 bottom-12 top-1 rounded-2xl focus-visible:outline-2 focus-visible:outline-[#F4C77E] '+(pronto?'pointer-events-auto cursor-grab active:cursor-grabbing':'')} style={{touchAction:'pan-y'}}>
      <div ref={host} aria-hidden="true" className="absolute inset-0"/>
      {!pronto&&<div role="img" aria-label="ERN — Encantos Rio Negro" className="absolute inset-0 flex flex-col items-center justify-center"><span className="text-[clamp(4rem,10vw,7.5rem)] font-black leading-none tracking-[.08em] text-[#E3B361]" style={{textShadow:'1px 2px #936830,3px 5px #2b4233,0 10px 30px #07110E'}}>ERN</span><span className="mt-3 text-[9px] font-semibold uppercase tracking-[.3em] text-[#F4C77E]">Encantos Rio Negro</span></div>}
    </div>
    {pronto&&<span className="absolute inset-x-0 top-1 text-center text-[9px] text-[#EDEDE3]/70">Arraste para girar</span>}
    {pronto&&<span className="absolute inset-x-0 bottom-14 text-center text-[9px] font-semibold uppercase tracking-[.25em] text-[#F4C77E]">Encantos Rio Negro</span>}
    {pronto&&<div className="pointer-events-auto absolute bottom-1 left-0 right-0 flex items-center justify-center gap-2"><button type="button" aria-pressed={pausado} onClick={()=>{pausadoRef.current=!pausadoRef.current;setPausado(pausadoRef.current);redesenhar.current();}} className="min-h-11 rounded-xl border border-white/20 bg-[#07110E]/85 px-3 text-[10px] font-semibold text-[#F4C77E] focus-visible:outline-2 focus-visible:outline-[#F4C77E]">{pausado?'Retomar animação':'Pausar animação'}</button><button type="button" onClick={resetar} className="min-h-11 rounded-xl border border-white/20 bg-[#07110E]/85 px-3 text-[10px] text-[#F4C77E] focus-visible:outline-2 focus-visible:outline-[#F4C77E]">Centralizar</button></div>}
  </div>;
}
