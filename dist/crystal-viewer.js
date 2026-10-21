// Camera and rendering only. Atom coordinates, moments and symmetry matches
// are computed by crystal_labs.py before they reach this viewer.
const esc=value=>String(value??'').replace(/[&<>"']/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]));
const colors={Na:'#a67ee2',Cl:'#6caa65',Si:'#c59a57',Ga:'#5a98c7',As:'#b780bb',Fe:'#c87c54',Ni:'#629d9a',O:'#db7373',Mn:'#a58bc3',F:'#93b462'};
const defaults={yaw:-32,pitch:23,zoom:1,mode:'overlay',wrapped:true,labels:false,moments:true};
const edges=[[0,1],[0,2],[0,4],[1,3],[1,5],[2,3],[2,6],[3,7],[4,5],[4,6],[5,7],[6,7]];
const line=(a,b,attrs)=>`<line x1="${a.x}" y1="${a.y}" x2="${b.x}" y2="${b.y}" ${attrs}/>`;

export function createCrystalViewer({container,data,isCurrent=()=>true}){
  const view={...defaults};let destroyed=false,pointer=null,observer=null;
  container.innerHTML=`<div class="cv-root"><div class="cv-toolbar"><label>显示方式<select data-cv="mode"><option value="overlay">原始 + 变换后叠加</option><option value="original">仅原始结构</option><option value="transformed">仅变换后结构</option></select></label><label class="cv-check"><input data-cv="wrapped" type="checkbox" checked>周期折回晶胞</label><label class="cv-check"><input data-cv="labels" type="checkbox">原子标签</label><label class="cv-check"><input data-cv="moments" type="checkbox" checked>磁矩箭头</label></div><div class="cv-stage" data-cv="stage" tabindex="0" role="group" aria-label="可拖动旋转的三维晶胞；方向键旋转，+ 和 − 缩放"><svg viewBox="0 0 760 510" role="img" aria-label="三维晶胞与原子"><title>三维晶体对称操作前后对照</title></svg></div><p class="cv-instructions">拖动旋转视角；也可聚焦图形后用方向键旋转、+ / − 缩放。实心球为原始原子，空心球为变换后原子；箭头表示归一化磁矩。</p><div class="cv-camera"><label>水平转角 <output data-cv="yaw-value"></output><input data-cv="yaw" type="range" min="-180" max="180" value="${view.yaw}" step="1"></label><label>俯仰角 <output data-cv="pitch-value"></output><input data-cv="pitch" type="range" min="-85" max="85" value="${view.pitch}" step="1"></label><label>缩放 <output data-cv="zoom-value"></output><input data-cv="zoom" type="range" min="0.55" max="2" value="1" step="0.05"></label><button type="button" class="secondary" data-cv="reset">重置视角</button></div><div class="cv-element-legend" data-cv="legend"></div><p class="cv-camera-status" data-cv="status" aria-live="polite"></p></div>`;
  const $=name=>container.querySelector(`[data-cv="${name}"]`),stage=$('stage'),svg=stage.querySelector('svg');
  const active=()=>!destroyed&&isCurrent();
  function release(){if(pointer!==null){try{if(stage.hasPointerCapture?.(pointer.id))stage.releasePointerCapture(pointer.id);}catch{/* A detached surface may already have released capture. */}pointer=null;}}
  function destroy(){if(destroyed)return;destroyed=true;release();observer?.disconnect();for(const event of ['onpointerdown','onpointermove','onpointerup','onpointercancel','onlostpointercapture','onkeydown'])stage[event]=null;}
  function draw(){
    if(!active()){destroy();return;}
    const vertices=data.cellVertices||[],atoms=data.atoms||[],shown=[];
    for(const atom of atoms){if(view.mode!=='transformed')shown.push({atom,p:atom.cartesian,m:atom.moment,transformed:false});if(view.mode!=='original')shown.push({atom,p:view.wrapped?atom.transformed.cartesianWrapped:atom.transformed.cartesianUnwrapped,m:atom.transformed.moment,transformed:true});}
    const allPoints=[...vertices,...shown.map(a=>a.p)];if(!allPoints.length)return;
    const minimum=[0,1,2].map(i=>Math.min(...allPoints.map(p=>p[i]))),maximum=[0,1,2].map(i=>Math.max(...allPoints.map(p=>p[i]))),center=minimum.map((n,i)=>(n+maximum[i])/2);
    const radius=Math.max(.1,...allPoints.map(p=>Math.hypot(...p.map((n,i)=>n-center[i])))),scale=175/radius*view.zoom;
    const yaw=view.yaw*Math.PI/180,pitch=view.pitch*Math.PI/180,cy=Math.cos(yaw),sy=Math.sin(yaw),cp=Math.cos(pitch),sp=Math.sin(pitch);
    const camera=p=>{const [x,y,z]=p.map((n,i)=>n-center[i]),xx=cy*x-sy*y,yy=sy*x+cy*y;return {x:380+scale*xx,y:255-scale*(cp*z-sp*yy),depth:sp*z+cp*yy};};
    const primitives=[];
    for(const [a,b] of edges){if(!vertices[a]||!vertices[b])continue;const pa=camera(vertices[a]),pb=camera(vertices[b]);primitives.push({depth:(pa.depth+pb.depth)/2,html:line(pa,pb,'class="cv-cell-edge"')});}
    for(const axis of data.latticeAxes||[]){const a=camera(axis.start),b=camera(axis.end);primitives.push({depth:b.depth,html:line(a,b,'class="cv-lattice-axis"')+`<text x="${b.x+10}" y="${b.y-10}" class="cv-axis-label">${esc(axis.label)}</text>`});}
    // Arrow length is a display scale for normalized moments, not a bond length.
    const arrowScale=radius*.22;
    for(const item of shown){const p=camera(item.p),color=colors[item.atom.element]||'#819daa';const r=Math.max(5,Math.min(13,9.5*view.zoom));let html='';
      if(view.moments&&item.m?.some(n=>Math.abs(n)>1e-10)){const q=camera(item.p.map((n,i)=>n+arrowScale*item.m[i]));html+=line(p,q,`stroke="${item.transformed?'#b77935':'#2d7e69'}" stroke-width="3" ${item.transformed?'stroke-dasharray="6 3"':''} marker-end="url(#cv-${item.transformed?'after':'before'}-arrow)"`);}
      html+=`<circle cx="${p.x}" cy="${p.y}" r="${r+(item.transformed?3:0)}" fill="${item.transformed?'#fff':color}" fill-opacity="${item.transformed?'.2':'1'}" stroke="${item.transformed?color:'#fff'}" stroke-width="${item.transformed?2.8:1.5}" ${item.transformed?'stroke-dasharray="4 2"':''}/>`;
      if(view.labels)html+=`<text x="${p.x+r+5}" y="${p.y-8}" class="cv-atom-label">${esc(item.atom.id)}${item.transformed?'′':''}</text>`;
      primitives.push({depth:p.depth+(item.transformed ? .0001 : 0),html});
    }
    primitives.sort((a,b)=>a.depth-b.depth);
    svg.innerHTML=`<title>${esc(data.operation?.label||'晶体结构')}：三维前后对照</title><defs><marker id="cv-before-arrow" viewBox="0 0 10 10" refX="9" refY="5" markerWidth="5" markerHeight="5" orient="auto-start-reverse"><path d="M0 0L10 5L0 10Z" fill="#2d7e69"/></marker><marker id="cv-after-arrow" viewBox="0 0 10 10" refX="9" refY="5" markerWidth="5" markerHeight="5" orient="auto-start-reverse"><path d="M0 0L10 5L0 10Z" fill="#b77935"/></marker></defs>${primitives.map(p=>p.html).join('')}`;
    for(const name of ['yaw','pitch','zoom']){$(name).value=String(view[name]);$(name+'-value').textContent=name==='zoom'?view[name].toFixed(2)+'×':Math.round(view[name])+'°';}
    $('status').textContent=`${view.mode==='overlay'?'叠加对照':view.mode==='original'?'原始结构':'变换后结构'} · ${view.wrapped?'周期折回':'保留跨胞位移'} · 水平 ${Math.round(view.yaw)}° / 俯仰 ${Math.round(view.pitch)}°`;
  }
  function update(){release();draw();}
  for(const key of ['mode','wrapped','labels','moments'])$(key).onchange=()=>{view[key]=key==='mode'?$(key).value:$(key).checked;update();};
  for(const key of ['yaw','pitch','zoom'])$(key).oninput=()=>{view[key]=Number($(key).value);update();};
  $('reset').onclick=()=>{view.yaw=defaults.yaw;view.pitch=defaults.pitch;view.zoom=defaults.zoom;update();};
  stage.onpointerdown=e=>{if(!active()||e.button!==0)return;e.preventDefault();release();pointer={id:e.pointerId,x:e.clientX,y:e.clientY,yaw:view.yaw,pitch:view.pitch};stage.setPointerCapture?.(e.pointerId);stage.focus({preventScroll:true});};
  stage.onpointermove=e=>{if(!active()){destroy();return;}if(!pointer||e.pointerId!==pointer.id)return;view.yaw=((pointer.yaw+(e.clientX-pointer.x)*.45+540)%360)-180;view.pitch=Math.max(-85,Math.min(85,pointer.pitch+(e.clientY-pointer.y)*.35));draw();};
  stage.onpointerup=release;stage.onpointercancel=release;stage.onlostpointercapture=()=>{pointer=null;};
  stage.onkeydown=e=>{if(!active())return;let handled=true;if(e.key==='ArrowLeft')view.yaw=Math.max(-180,view.yaw-5);else if(e.key==='ArrowRight')view.yaw=Math.min(180,view.yaw+5);else if(e.key==='ArrowUp')view.pitch=Math.min(85,view.pitch+5);else if(e.key==='ArrowDown')view.pitch=Math.max(-85,view.pitch-5);else if(e.key==='+'||e.key==='=')view.zoom=Math.min(2,view.zoom+.05);else if(e.key==='-'||e.key==='−')view.zoom=Math.max(.55,view.zoom-.05);else handled=false;if(handled){e.preventDefault();update();}};
  const elements=[...new Set((data.atoms||[]).map(a=>a.element))];$('legend').innerHTML=elements.map(element=>`<span><i style="background:${colors[element]||'#819daa'}"></i>${esc(element)}</span>`).join('');
  if(typeof MutationObserver!=='undefined'&&container.ownerDocument?.body){observer=new MutationObserver(()=>{if(!active()||!container.isConnected)destroy();});observer.observe(container.ownerDocument.body,{childList:true,subtree:true});}
  draw();return {destroy,getView:()=>({...view})};
}
