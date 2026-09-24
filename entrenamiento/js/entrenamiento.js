(() => {
  'use strict';
  const MAX = 12, OUTER_R = 46, BAND = OUTER_R / 10;
  const localDateKey = () => {
    const d = new Date();
    return `${d.getFullYear()}-${String(d.getMonth()+1).padStart(2,'0')}-${String(d.getDate()).padStart(2,'0')}`;
  };
  const storageKey = `arbat-training-${localDateKey()}`;
  const fresh = () => ({date:localDateKey(), completed:[], current:[]});
  let state = fresh(), activePointer = null, provisional = null;

  const $ = id => document.getElementById(id);
  const svg = $('target'), wrap = $('targetWrap'), highlight = $('highlight');
  const vibrate = ms => { if ('vibrate' in navigator) navigator.vibrate(ms); };
  const valueOf = a => a.label === 'M' ? 0 : 10 === a.score ? 10 : a.score;
  const subtotal = arrows => arrows.reduce((s,a) => s + valueOf(a), 0);
  const totalBeforeCurrent = () => state.completed.reduce((s,e) => s + subtotal(e.arrows), 0);
  const sessionTotal = () => totalBeforeCurrent() + subtotal(state.current);

  try {
    const saved = JSON.parse(localStorage.getItem(storageKey));
    if (saved && saved.date === localDateKey() && Array.isArray(saved.completed) && Array.isArray(saved.current)) state = saved;
  } catch (_) {}

  function save(){
    try { localStorage.setItem(storageKey, JSON.stringify(state)); } catch (_) {}
  }

  function pointFromEvent(e){
    const p = svg.createSVGPoint(); p.x = e.clientX; p.y = e.clientY;
    const q = p.matrixTransform(svg.getScreenCTM().inverse());
    return {x:q.x, y:q.y};
  }

  function scorePoint(p){
    const d = Math.hypot(p.x-50,p.y-50);
    if (d > OUTER_R) return {label:'M',score:0,d};
    let score = Math.min(10, Math.max(1, 11-Math.ceil((d || .00001)/BAND)));
    return {label:d <= BAND/2 ? 'X' : String(score),score,d};
  }

  function showProvisional(p){
    provisional = {...scorePoint(p),x:p.x,y:p.y};
    $('currentScore').textContent = provisional.label;
    if (provisional.label === 'M') { highlight.style.opacity='0'; return; }
    const score = provisional.score;
    highlight.setAttribute('r', provisional.label === 'X' ? BAND/4 : score === 10 ? BAND/2 : OUTER_R-(score-.5)*BAND);
    highlight.setAttribute('stroke-width', provisional.label === 'X' ? BAND/2 : score === 10 ? BAND : BAND*.82);
    highlight.style.opacity='.92';
  }

  function resetProvisional(){ provisional=null; $('currentScore').textContent='—'; highlight.style.opacity='0'; }

  function addArrow(arrow){
    if (state.current.length >= MAX) return;
    arrow.recordedAt = arrow.recordedAt || new Date().toISOString();
    state.current.push(arrow); save(); vibrate(40); render();
    $('status').textContent = state.current.length === MAX ? 'Máximo de 12 flechas. Termina la andanada para continuar.' : `Flecha ${state.current.length} registrada: ${arrow.label}.`;
  }

  wrap.addEventListener('pointerdown', e => {
    if (state.current.length >= MAX || activePointer !== null || !e.isPrimary) return;
    activePointer=e.pointerId; wrap.setPointerCapture(e.pointerId); showProvisional(pointFromEvent(e)); e.preventDefault();
  });
  wrap.addEventListener('pointermove', e => { if(e.pointerId===activePointer){showProvisional(pointFromEvent(e));e.preventDefault();} });
  wrap.addEventListener('pointerup', e => {
    if(e.pointerId!==activePointer) return;
    const p=pointFromEvent(e);
    // Pointer capture can deliver the release outside the interactive square.
    // Cancel it instead of inventing a position outside the visible target.
    if(p.x<0||p.x>100||p.y<0||p.y>100){activePointer=null;resetProvisional();$('status').textContent='Gesto cancelado fuera del área de la diana.';return;}
    showProvisional(p);
    const arrow={label:provisional.label,score:provisional.score,x:provisional.x,y:provisional.y};
    activePointer=null; resetProvisional();
    addArrow(arrow);
    e.preventDefault();
  });
  wrap.addEventListener('pointercancel', e => { if(e.pointerId===activePointer){activePointer=null;resetProvisional();} });

  $('undoBtn').addEventListener('click',()=>{
    if(!state.current.length) return;
    const removed=state.current.pop(); save(); vibrate(40); render();
    $('status').textContent=`Última flecha eliminada (${removed.label}).`;
  });
  $('finishBtn').addEventListener('click',()=>{
    if(!state.current.length)return;
    const lastArrow=state.current[state.current.length-1];
    state.completed.push({arrows:state.current.map(a=>({...a})),endedAt:lastArrow.recordedAt||new Date().toISOString()});
    const ended=state.completed[state.completed.length-1];
    state.current=[]; save(); vibrate(100); render();
    $('status').textContent=`Andanada ${state.completed.length} guardada. El CSV está listo para descargar.`;
    sendAndanadaTelemetry(ended,state.completed.length);
  });

  function localDateTime(iso){
    if(!iso) return '';
    const d=new Date(iso),pad=n=>String(n).padStart(2,'0');
    return `${d.getFullYear()}-${pad(d.getMonth()+1)}-${pad(d.getDate())} ${pad(d.getHours())}:${pad(d.getMinutes())}:${pad(d.getSeconds())}`;
  }
  function sortedScores(arrows){
    return arrows.map(a=>({label:a.label,rank:a.label==='X'?11:valueOf(a)})).sort((a,b)=>b.rank-a.rank).map(a=>a.label);
  }
  function polarPosition(arrow){
    if(!Number.isFinite(arrow?.x)||!Number.isFinite(arrow?.y))return {clock:'',angle:'',radius:''};
    const dx=arrow.x-50,dy=arrow.y-50;
    const radius=Math.hypot(dx,dy)/OUTER_R;
    if(radius<1e-8)return {clock:'',angle:'',radius:'0.0000'};
    const angle=(Math.atan2(dx,-dy)*180/Math.PI+360)%360;
    const hour=Math.round(angle/30)%12||12;
    const roundedRadius=arrow.label==='M'&&radius>1?Math.max(1.0001,Number(radius.toFixed(4))):radius;
    return {clock:`${hour} h`,angle:angle.toFixed(1),radius:roundedRadius.toFixed(4)};
  }
  const originalHeader=['Andanada','Separador 1',...Array.from({length:MAX},(_,i)=>`Flecha ${i+1}`),'Separador 2','Total andanada','Total sesión','Separador 3','Fecha y hora de última flecha'];
  const positionHeader=Array.from({length:MAX},(_,i)=>[`Lanzamiento ${i+1} puntaje`,`Lanzamiento ${i+1} hora de marcado`,`Lanzamiento ${i+1} reloj`,`Lanzamiento ${i+1} ángulo (°)`,`Lanzamiento ${i+1} radio (borde=1)`]).flat();
  const dataHeader=[...originalHeader,'Separador 4',...positionHeader];
  const csvComments=[
    '# Registro de entrenamiento de arbat. Este bloque explicativo aparece una sola vez al comienzo del archivo.',
    '# Una fila de datos corresponde a una andanada terminada. Andanada es un número consecutivo dentro de la sesión.',
    '# Separador 1 a Separador 4 son columnas de datos vacías para dividir visualmente las secciones.',
    '# Flecha 1 a Flecha 12 de la primera sección son puntajes ordenados de mayor a menor: X antes de 10 y M al final.',
    '# X suma 10 puntos; M suma 0. Total andanada es la suma de esa fila; Total sesión acumula todas las andanadas terminadas.',
    '# Fecha y hora de última flecha indica cuándo se confirmó la última flecha de la andanada en hora local del dispositivo.',
    '# Lanzamiento 1 a Lanzamiento 12 conservan el orden real de marcado: puntaje y hora de marcado de cada flecha.',
    '# Las horas de marcado permiten calcular intervalos dentro de una andanada y entre andanadas; miden el registro de la flecha y no el disparo físico.',
    '# Reloj señala la dirección desde el centro: 12 h arriba; 3 h derecha; 6 h abajo; 9 h izquierda.',
    '# Ángulo en grados permite analizar la dirección con más detalle: 0 arriba; 90 derecha; 180 abajo; 270 izquierda; sentido horario.',
    '# Radio es la distancia al centro dividida por el radio exterior de la diana: 0 en el centro y 1 en el borde.',
    '# Un radio mayor que 1 indica M fuera de la diana. Reloj y ángulo quedan vacíos cuando la flecha está exactamente en el centro.',
    '# Los valores de reloj; ángulo y radio permiten analizar agrupaciones. Posiciones de M antiguas sin ubicación registrada quedan vacías.',
    '# Fecha y hora usan el formato AAAA-MM-DD HH:mm:ss en la zona horaria local del dispositivo.'
  ];
  function sessionRows(){
    let running=0;
    return state.completed.map((end,i)=>{
      const values=sortedScores(end.arrows); while(values.length<MAX)values.push('');
      running+=subtotal(end.arrows);
      const endedAt=end.endedAt||end.arrows[end.arrows.length-1]?.recordedAt||'';
      const positions=Array.from({length:MAX},(_,n)=>{
        const arrow=end.arrows[n];
        if(!arrow)return ['','','','',''];
        const p=polarPosition(arrow);
        return [arrow.label,localDateTime(arrow.recordedAt),p.clock,p.angle,p.radius];
      }).flat();
      return [i+1,'',...values,'',subtotal(end.arrows),running,'',localDateTime(endedAt),'',...positions];
    });
  }
  function csvText(){
    const data=[dataHeader,...sessionRows()].map(row=>row.map(v=>`"${String(v).replaceAll('"','""')}"`).join(',')).join('\r\n');
    // El CSV completo se reconstruye en cada descarga. Nunca se agregan comentarios a un archivo anterior.
    return '\uFEFF'+csvComments.join('\r\n')+'\r\n'+data;
  }
  $('exportBtn').addEventListener('click',()=>{
    if(!state.completed.length)return;
    const blob=new Blob([csvText()],{type:'text/csv;charset=utf-8'}),url=URL.createObjectURL(blob),a=document.createElement('a');
    a.href=url;a.download=`arbat-puntajes-${localDateKey()}.csv`;document.body.append(a);a.click();a.remove();setTimeout(()=>URL.revokeObjectURL(url),1000);
    $('status').textContent='CSV descargado con todas las andanadas terminadas.';
  });

  // Telemetría de andanadas terminadas (mismo patrón que archeryGame del proyecto
  // Statetty). Envía a Buddy Telemetry los datos registrados por cada flecha.
  function andanadaDatos(end,numero){
    const flechas=end.arrows.map((a,i)=>{
      const polar=polarPosition(a);
      return {
        numero:i+1,
        valor:a.score,
        label:a.label,
        timestamp:a.recordedAt||'',
        horaDeMarcado:localDateTime(a.recordedAt),
        reloj:polar.clock,
        angulo:polar.angle,
        radio:polar.radius,
        posicion:{x:a.x,y:a.y}
      };
    });
    return {
      fecha:state.date,
      numero:numero,
      iniciada:end.arrows[0]&&end.arrows[0].recordedAt||null,
      completada:end.endedAt||new Date().toISOString(),
      cantidad:end.arrows.length,
      total:subtotal(end.arrows),
      flechas:flechas
    };
  }
  function sendAndanadaTelemetry(end,numero){
    const data={event:'entrenamiento.andanada',module:'entrenamiento',data:{andanada:andanadaDatos(end,numero)}};
    if(!window.Buddy||!window.Buddy.telemetry||typeof window.Buddy.telemetry.send!=='function'){
      if(window.BuddyConfig&&window.BuddyConfig.debugMode===true) console.log('[Buddy] Telemetry no disponible para entrenamiento.andanada');
      return false;
    }
    if(!window.Buddy.telemetry.config||window.Buddy.telemetry.config.enabled===false){
      if(window.BuddyConfig&&window.BuddyConfig.debugMode===true) console.log('[Buddy] Telemetry deshabilitado para entrenamiento.andanada');
      return false;
    }
    return window.Buddy.telemetry.send(data);
  }

  function renderMarkers(){
    $('markers').replaceChildren(...state.current.flatMap((a,i)=>{
      if(!Number.isFinite(a.x) || !Number.isFinite(a.y)) return [];
      const ns='http://www.w3.org/2000/svg',g=document.createElementNS(ns,'g'),c=document.createElementNS(ns,'circle'),t=document.createElementNS(ns,'text');
      g.setAttribute('class','arrow-marker'+(a.label==='M'?' miss':''));
      const vx=Math.max(2.3,Math.min(97.7,a.x)),vy=Math.max(2.3,Math.min(97.7,a.y));
      c.setAttribute('cx',vx);c.setAttribute('cy',vy);c.setAttribute('r','2.15');
      t.setAttribute('x',vx);t.setAttribute('y',vy+.1);t.textContent=String(i+1);g.append(c,t);return [g];
    }));
  }

  function scoreCard(arrows,index,isCurrent,running,endedAt=''){
    const article=document.createElement('article'); article.className='end-card';
    const title=document.createElement('div'); title.className='end-title';
    title.innerHTML=`<span>Andanada ${index+1}</span><small>${isCurrent?'En curso':localDateTime(endedAt)||'Terminada'}</small>`;
    const grid=document.createElement('div'); grid.className='arrow-grid';
    const displayValues=sortedScores(arrows);
    for(let i=0;i<MAX;i++){
      const cell=document.createElement('div'); cell.className='arrow-cell'+(displayValues[i]==='M'?' miss':'');
      const num=document.createElement('span');num.className='num';num.textContent=`F${i+1}`;
      const val=document.createElement('span');val.className='val';val.textContent=displayValues[i]||'·';cell.append(num,val);grid.append(cell);
    }
    const foot=document.createElement('div');foot.className='totals-row';
    foot.innerHTML=`<span>Subtotal: <strong>${subtotal(arrows)}</strong></span><span>Acumulado: <strong>${running}</strong></span>`;
    article.append(title,grid,foot);return article;
  }

  function renderScores(){
    const box=$('scorecards');box.replaceChildren();let running=0;
    state.completed.forEach((e,i)=>{running+=subtotal(e.arrows);box.append(scoreCard(e.arrows,i,false,running,e.endedAt||e.arrows[e.arrows.length-1]?.recordedAt||''));});
    if(state.current.length){running+=subtotal(state.current);box.append(scoreCard(state.current,state.completed.length,true,running));}
    if(!state.completed.length&&!state.current.length){const p=document.createElement('p');p.className='empty';p.textContent='Los puntajes aparecerán aquí al registrar la primera flecha.';box.append(p);}
  }

  function renderDataTable(){
    const body=$('dataTableBody');body.replaceChildren();
    sessionRows().forEach(row=>{
      const tr=document.createElement('tr');
      row.forEach((value,index)=>{
        const td=document.createElement('td');td.textContent=value;
        if(index===1||index===14||index===17||index===19)td.className='separator';
        tr.append(td);
      });
      body.append(tr);
    });
    window.arbatSessionData={date:state.date,headers:[...dataHeader],rows:sessionRows()};
  }

  const constellationOverlay=$('constellationOverlay'), constellationImage=$('constellationImage');
  let constellationUrl='';
  function constellationArrows(){
    return [...state.completed.flatMap(e=>e.arrows||[]),...state.current];
  }
  function drawConstellation(){
    const arrows=constellationArrows();
    if(!arrows.length)return false;
    const visible=arrows.filter(a=>a.label!=='M'&&Number.isFinite(a.x)&&Number.isFinite(a.y));
    const canvas=document.createElement('canvas'),ctx=canvas.getContext('2d');
    canvas.width=1080;canvas.height=1350;
    const W=canvas.width,H=canvas.height;
    const cx=540,cy=650,targetR=466;

    // Fondo y cabecera, siguiendo la composición de la lámina de referencia.
    ctx.fillStyle='#fffdf9';ctx.fillRect(0,0,W,H);
    ctx.textAlign='center';ctx.textBaseline='alphabetic';
    ctx.fillStyle='#11131a';ctx.font='500 51px Arial, sans-serif';
    ctx.fillText('CONSTELACIÓN DE FLECHAS',cx,102);
    const date=new Date(`${state.date}T12:00:00`);
    const months=['ENE','FEB','MAR','ABR','MAY','JUN','JUL','AGO','SEP','OCT','NOV','DIC'];
    const dateText=`${String(date.getDate()).padStart(2,'0')} ${months[date.getMonth()]} ${date.getFullYear()}`;
    ctx.fillStyle='#68727a';ctx.font='400 22px Arial, sans-serif';
    ctx.fillText(`Sesión de entrenamiento · ${dateText}`,cx,140);

    // Pequeños elementos dorados exteriores.
    ctx.strokeStyle='rgba(201,157,68,.34)';ctx.lineWidth=1.2;
    [260,330,400,470].forEach(r=>{
      ctx.beginPath();ctx.arc(cx,cy,r+62,Math.PI*1.12,Math.PI*1.86);ctx.stroke();
      ctx.beginPath();ctx.arc(cx,cy,r+62,Math.PI*1.88,Math.PI*2.48);ctx.stroke();
    });
    [[58,295],[965,328],[69,1010],[958,970]].forEach(([x,y])=>{
      ctx.beginPath();ctx.arc(x,y,7,0,Math.PI*2);ctx.fillStyle='rgba(201,157,68,.42)';ctx.fill();
    });

    // Diana con sombra suave y anillos concéntricos.
    ctx.save();
    ctx.shadowColor='rgba(0,0,0,.24)';ctx.shadowBlur=30;ctx.shadowOffsetY=14;
    ctx.beginPath();ctx.arc(cx,cy,targetR,0,Math.PI*2);ctx.fillStyle='#66686a';ctx.fill();
    ctx.restore();

    // Base más oscura que la V-1.4: la temperatura debe iluminar la diana,
    // no blanquearla. Las zonas siguen la proporción visual de la maqueta.
    const zoneRings=[1,.90,.66,.40,.19,0];
    const zoneFills=['#505256','#090b0e','#043f62','#861124','#746b22'];
    for(let i=0;i<zoneFills.length;i++){
      const r=targetR*zoneRings[i];
      ctx.beginPath();ctx.arc(cx,cy,r,0,Math.PI*2);
      ctx.fillStyle=zoneFills[i];ctx.fill();
    }
    // Aros finos independientes de las zonas de color, como en la maqueta.
    [.90,.70,.60,.50,.40,.30,.20,.10].forEach(ratio=>{
      ctx.beginPath();ctx.arc(cx,cy,targetR*ratio,0,Math.PI*2);
      ctx.strokeStyle='rgba(15,18,20,.72)';ctx.lineWidth=1.15;ctx.stroke();
    });
    ctx.beginPath();ctx.arc(cx,cy,targetR,0,Math.PI*2);
    ctx.strokeStyle='rgba(15,18,20,.72)';ctx.lineWidth=1.3;ctx.stroke();

    // Transformación de las coordenadas de la diana a la lámina.
    const pts=visible.map(a=>({
      x:cx+(a.x-50)/OUTER_R*targetR,
      y:cy+(a.y-50)/OUTER_R*targetR
    }));

    // Mapa de calor: siempre recortado al área de la diana. Las flechas aisladas
    // generan azul; la acumulación progresiva pasa a rojo y amarillo.
    if(pts.length){
      const hw=500,hh=500,heat=document.createElement('canvas');
      heat.width=hw;heat.height=hh;
      const hctx=heat.getContext('2d'), image=hctx.createImageData(hw,hh);
      const sigma=28, values=new Float32Array(hw*hh);let maxDensity=0;
      for(let py=0;py<hh;py++){
        const yy=cy-targetR+(py/(hh-1))*targetR*2;
        for(let px=0;px<hw;px++){
          const xx=cx-targetR+(px/(hw-1))*targetR*2;
          let d=0;
          for(const p of pts){
            const dx=xx-p.x,dy=yy-p.y;
            d+=Math.exp(-(dx*dx+dy*dy)/(2*sigma*sigma));
          }
          const idx=py*hw+px;values[idx]=d;maxDensity=Math.max(maxDensity,d);
        }
      }
      if(maxDensity>0){
        for(let py=0;py<hh;py++)for(let px=0;px<hw;px++){
          const idx=py*hw+px,t=values[idx]/maxDensity;
          if(t<.028)continue;
          const q=Math.min(1,Math.pow(t,.68));
          let r,g,b,a;
          // Paleta eléctrica inspirada en la maqueta: azul ultrabrillante -> magenta -> rojo -> amarillo.
          if(q<.24){
            const u=q/.24; r=0+8*u; g=38+42*u; b=255;
          }else if(q<.46){
            const u=(q-.24)/.22; r=8+232*u; g=80-10*u; b=255-18*u;
          }else if(q<.70){
            const u=(q-.46)/.24; r=240+15*u; g=70-48*u; b=237-150*u;
          }else{
            const u=(q-.70)/.30; r=255; g=22+225*u; b=87-75*u;
          }
          const alpha=Math.round(255*Math.pow(q,.58));
          const k=idx*4;image.data[k]=r;image.data[k+1]=g;image.data[k+2]=b;image.data[k+3]=alpha;
        }
        hctx.putImageData(image,0,0);
        ctx.save();ctx.beginPath();ctx.arc(cx,cy,targetR,0,Math.PI*2);ctx.clip();
        // Halo amplio: aumenta la luminosidad percibida sin borrar el detalle de los colores.
        ctx.globalCompositeOperation='screen';
        ctx.filter='blur(14px)';
        ctx.globalAlpha=.92;
        ctx.drawImage(heat,cx-targetR,cy-targetR,targetR*2,targetR*2);
        ctx.filter='none';
        ctx.globalAlpha=1;
        ctx.drawImage(heat,cx-targetR,cy-targetR,targetR*2,targetR*2);
        ctx.restore();ctx.globalCompositeOperation='source-over';
      }
    }

    // Conexiones: solo entre flechas cercanas, como en la referencia.
    for(let i=0;i<pts.length;i++)for(let j=i+1;j<pts.length;j++){
      const d=Math.hypot(pts[i].x-pts[j].x,pts[i].y-pts[j].y);
      if(d<=112){
        ctx.beginPath();ctx.moveTo(pts[i].x,pts[i].y);ctx.lineTo(pts[j].x,pts[j].y);
        ctx.strokeStyle='rgba(205,220,235,.52)';ctx.lineWidth=1.2;ctx.stroke();
      }
    }

    // Marcadores: cada flecha queda representada por un anillo cuyo color
    // refleja su densidad relativa respecto de las demás flechas. No se
    // muestra numeración para conservar la lectura visual de la constelación.
    const markerSigma=28;
    const markerDensity=pts.map((p,i)=>{
      let d=0;
      for(let j=0;j<pts.length;j++){
        if(i===j)continue;
        const dx=p.x-pts[j].x,dy=p.y-pts[j].y;
        d+=Math.exp(-(dx*dx+dy*dy)/(2*markerSigma*markerSigma));
      }
      return d;
    });
    const markerMax=Math.max(...markerDensity,0);
    const heatColor=q=>{
      q=Math.max(0,Math.min(1,q));
      if(q<.24){
        const u=q/.24; return [0+8*u,38+42*u,255];
      }else if(q<.46){
        const u=(q-.24)/.22; return [8+232*u,80-10*u,255-18*u];
      }else if(q<.70){
        const u=(q-.46)/.24; return [240+15*u,70-48*u,237-150*u];
      }else{
        const u=(q-.70)/.30; return [255,22+225*u,87-75*u];
      }
    };
    pts.forEach((p,i)=>{
      const q=markerMax>0?Math.pow(markerDensity[i]/markerMax,.68):0;
      const [r,g,b]=heatColor(q);
      // Los impactos de la maqueta tienen un borde casi blanco: conservamos
      // la temperatura del color, pero elevamos mucho su luminosidad.
      const whiteMix=.72;
      const br=r+(255-r)*whiteMix;
      const bg=g+(255-g)*whiteMix;
      const bb=b+(255-b)*whiteMix;
      const color=`rgb(${Math.round(br)} ${Math.round(bg)} ${Math.round(bb)})`;

      // Halo más intenso y menos transparente, con un resplandor blanco
      // en el núcleo para acercarse al aspecto luminoso de la maqueta.
      ctx.save();
      ctx.globalCompositeOperation='screen';
      ctx.shadowColor=`rgba(${Math.round(r)},${Math.round(g)},${Math.round(b)},.95)`;
      ctx.shadowBlur=14;ctx.globalAlpha=.98;
      ctx.beginPath();ctx.arc(p.x,p.y,7.2,0,Math.PI*2);
      ctx.strokeStyle=`rgba(${Math.round(br)},${Math.round(bg)},${Math.round(bb)},.96)`;ctx.lineWidth=3.0;ctx.stroke();
      ctx.restore();

      // Anillo limpio, muy brillante y tendiendo al blanco.
      ctx.beginPath();ctx.arc(p.x,p.y,5.2,0,Math.PI*2);
      ctx.strokeStyle='rgba(255,255,255,.98)';ctx.lineWidth=1.55;ctx.stroke();
    });

    // Estadísticas inferiores.
    const total=arrows.reduce((sum,a)=>sum+valueOf(a),0),avg=total/arrows.length;
    const stats=[[''+arrows.length,'FLECHAS'],[''+total,'PUNTAJE'],[avg.toFixed(2).replace('.',','),'PROMEDIO']];
    const cols=[290,540,790];
    ctx.strokeStyle='rgba(190,150,67,.72)';ctx.lineWidth=1.2;
    [415,665].forEach(x=>{ctx.beginPath();ctx.moveTo(x,1138);ctx.lineTo(x,1230);ctx.stroke();});
    stats.forEach((v,i)=>{
      ctx.fillStyle='#11131a';ctx.font='800 42px Arial, sans-serif';ctx.fillText(v[0],cols[i],1174);
      ctx.fillStyle='#4d5660';ctx.font='500 17px Arial, sans-serif';ctx.fillText(v[1],cols[i],1205);
    });
    ctx.fillStyle='#222831';ctx.font='500 18px Arial, sans-serif';ctx.fillText('arbatarchery.com',cx,1280);
    ctx.textAlign='right';ctx.fillStyle='#697178';ctx.font='500 13px Arial, sans-serif';ctx.fillText('V-1.6',1035,1320);

    if(constellationUrl)URL.revokeObjectURL(constellationUrl);
    canvas.toBlob(b=>{
      if(!b)return;
      const url=URL.createObjectURL(b),previous=constellationUrl;
      constellationUrl=url;constellationImage.src=url;
      if(previous)URL.revokeObjectURL(previous);
      constellationOverlay.hidden=false;
    },'image/png');
    return true;
  }
  $('constellationBtn').addEventListener('click',()=>{
    if(!drawConstellation()){$('status').textContent='Registra al menos una flecha para crear la constelación.';return;}
    $('status').textContent='Constelación creada a partir de los datos de la sesión.';
  });
  $('constellationClose').addEventListener('click',()=>{constellationOverlay.hidden=true;});
  $('constellationDownload').addEventListener('click',()=>{
    if(!constellationUrl)return;
    const a=document.createElement('a');a.href=constellationUrl;a.download=`arbat-constelacion-${state.date}.png`;document.body.append(a);a.click();a.remove();
  });

  const tableHead=$('dataTable').tHead.rows[0];
  dataHeader.slice(originalHeader.length).forEach((label,i)=>{
    const th=document.createElement('th');th.textContent=label;
    if(i===0)th.className='separator';
    tableHead.append(th);
  });

  function render(){
    const count=state.current.length,locked=count>=MAX;
    $('endNumber').textContent=state.completed.length+1;$('arrowCount').textContent=`${count} / ${MAX}`;
    $('endTotal').textContent=subtotal(state.current);$('sessionTotal').textContent=sessionTotal();$('progressBar').style.width=`${count/MAX*100}%`;
    $('undoBtn').disabled=!count;$('finishBtn').disabled=!count;$('exportBtn').disabled=!state.completed.length;
    wrap.setAttribute('aria-disabled',String(locked));renderMarkers();renderScores();renderDataTable();
  }

  $('date').textContent=new Intl.DateTimeFormat('es-BO',{weekday:'long',day:'numeric',month:'long',year:'numeric'}).format(new Date());
  render();

  // Mensaje de bienvenida de Raulito (módulo says de Buddy) al entrar a la página.
  const MENSAJE_BIENVENIDA='Anotá tus flechas tocando y deslizando sobre la diana. Los puntajes se guardan localmente en tu dispositivo y podés descargar el CSV al terminar.';
  function decirBienvenida(){
    if(window.Buddy&&window.Buddy.says&&typeof window.Buddy.says.decirSiLibre==='function'){
      // Cortés: no pisa nada que ya esté mostrando. Si está ocupado, cae al respaldo.
      if(window.Buddy.says.decirSiLibre(MENSAJE_BIENVENIDA,{emocion:'sereno'})) return;
    }
    if(typeof window.buddy_says==='function') window.buddy_says(MENSAJE_BIENVENIDA,{emocion:'sereno'});
  }
  if(window.Buddy&&window.Buddy.ready){
    decirBienvenida();
  }else if(window.Buddy&&window.Buddy.readyPromise){
    window.Buddy.readyPromise.then(decirBienvenida).catch(function(){});
  }else{
    window.addEventListener('buddy:ready',decirBienvenida,{once:true});
  }
})();