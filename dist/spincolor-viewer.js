// Rendering and camera only: all positions, colours and spins are Python output.
const esc=value=>String(value??'').replace(/[&<>"']/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]));
const palette=['#277b96','#ce7748','#8a65a9','#6e984a'];
const edges=[[0,1],[0,2],[0,4],[1,3],[1,5],[2,3],[2,6],[3,7],[4,5],[4,6],[5,7],[6,7]];
const defaults={yaw:-28,pitch:24,zoom:1,showReference:true,showLabels:true};
const line=(a,b,attrs)=>`<line x1="${a.x}" y1="${a.y}" x2="${b.x}" y2="${b.y}" ${attrs}/>`;

export function createSpinColorViewer({container,data,frameIndex=0,initialView={},isCurrent=()=>true}){
  const view={...defaults,...initialView};let frame=frameIndex,pointer=null,destroyed=false,observer=null;
  const isColor=data.lab==='color_group',isSpin=data.lab==='spin_group',space=data.dimension==='space';
  container.innerHTML=`<div class="gx-viewer"><div class="gx-view-options"><label><input data-gx="reference" type="checkbox" ${view.showReference?'checked':''}>叠加初始图案</label><label><input data-gx="labels" type="checkbox" ${view.showLabels?'checked':''}>显示站点标签</label><span>${space?'三维周期模型':'点群模型 · 固定原点'}</span></div><div class="gx-stage" data-gx="stage" tabindex="0" role="group" aria-label="双群、色群与自旋群三维操作演示；方向键旋转视角，+ 和 − 缩放"><svg viewBox="0 0 760 480" role="img" aria-label="Python 计算的空间位置与内部自由度"><title>三维空间与内部自由度对照</title></svg></div><p class="gx-instructions">拖动图形或用方向键旋转视角；+ / − 缩放。空心虚线表示初始图案，实心表示当前结果。${isColor?'颜色旁的数字表示可区分的标签，不代表时间反演。':isSpin?'箭头表示经典自旋方向；自旋转动和空间操作分别计算。':'箭头只表示自旋期望值；旋量整体负号须查看精确矩阵。'}</p><div class="gx-camera"><label>水平角 <output data-gx="yaw-value"></output><input data-gx="yaw" type="range" min="-180" max="180" value="${view.yaw}" step="1"></label><label>俯仰角 <output data-gx="pitch-value"></output><input data-gx="pitch" type="range" min="-85" max="85" value="${view.pitch}" step="1"></label><label>缩放 <output data-gx="zoom-value"></output><input data-gx="zoom" type="range" min="0.55" max="2" value="${view.zoom}" step="0.05"></label><button type="button" class="secondary" data-gx="reset">重置三维视角</button></div><p class="gx-camera-status" data-gx="status" aria-live="polite"></p></div>`;
  const $=name=>container.querySelector(`[data-gx="${name}"]`),stage=$('stage'),svg=stage.querySelector('svg');
  const active=()=>!destroyed&&isCurrent();
  function release(){if(pointer){try{if(stage.hasPointerCapture?.(pointer.id))stage.releasePointerCapture(pointer.id);}catch{/* Detached pointer capture. */}pointer=null;}}
  function destroy(){if(destroyed)return;destroyed=true;release();observer?.disconnect();for(const name of ['onpointerdown','onpointermove','onpointerup','onpointercancel','onlostpointercapture','onkeydown'])stage[name]=null;}
  function draw(){
    if(!active()){destroy();return;}
    const current=data.frames?.[frame]||data.frames?.[0],reference=data.referenceSites||[],sites=current?.sites||[],vertices=space?(data.cellVertices||[]):[];
    const shown=[...(view.showReference?reference.map((site,i)=>({site,index:i,reference:true})):[]),...sites.map((site,i)=>({site,index:i,reference:false}))];
    const positions=[...vertices,...shown.map(item=>item.site.position),[0,0,0]].filter(p=>Array.isArray(p)&&p.length===3);
    if(!positions.length)return;
    const minimum=[0,1,2].map(i=>Math.min(...positions.map(p=>p[i]))),maximum=[0,1,2].map(i=>Math.max(...positions.map(p=>p[i]))),center=minimum.map((n,i)=>(n+maximum[i])/2);
    const radius=Math.max(.45,...positions.map(p=>Math.hypot(...p.map((n,i)=>n-center[i])))),scale=160/radius*view.zoom;
    const yaw=view.yaw*Math.PI/180,pitch=view.pitch*Math.PI/180,cy=Math.cos(yaw),sy=Math.sin(yaw),cp=Math.cos(pitch),sp=Math.sin(pitch);
    const project=p=>{const [x,y,z]=p.map((n,i)=>n-center[i]),xx=cy*x-sy*y,yy=sy*x+cy*y;return {x:380+scale*xx,y:240-scale*(cp*z-sp*yy),depth:sp*z+cp*yy};};
    const primitives=[];
    for(const [i,j] of edges)if(vertices[i]&&vertices[j]){const a=project(vertices[i]),b=project(vertices[j]);primitives.push({depth:(a.depth+b.depth)/2,html:line(a,b,'class="gx-cell-edge"')});}
    const axes=data.latticeAxes?.length?data.latticeAxes:[{label:'x',start:[0,0,0],end:[.55,0,0]},{label:'y',start:[0,0,0],end:[0,.55,0]},{label:'z',start:[0,0,0],end:[0,0,.55]}];
    for(const [index,axis] of axes.entries()){const a=project(Array.isArray(axis)?[0,0,0]:axis.start),b=project(Array.isArray(axis)?axis:axis.end);primitives.push({depth:b.depth,html:line(a,b,'class="gx-axis"')+`<text x="${b.x+9}" y="${b.y-9}" class="gx-axis-label">${esc(Array.isArray(axis)?['a','b','c'][index]:axis.label)}</text>`});}
    for(const item of shown){
      if(!Array.isArray(item.site.position))continue;
      const p=project(item.site.position),color=isColor?palette[Number(item.site.color)%palette.length]||palette[0]:item.reference?'#8faaa1':'#357b70',r=item.reference?12:9;
      let html='';
      if(Array.isArray(item.site.spin)&&item.site.spin.some(n=>Math.abs(n)>1e-10)){
        const q=project(item.site.position.map((n,i)=>n+radius*.28*item.site.spin[i]));
        html+=line(p,q,`stroke="${item.reference?'#82958a':'#b86a33'}" stroke-width="${item.reference?2:3.5}" ${item.reference?'stroke-dasharray="5 4"':''} marker-end="url(#gx-${item.reference?'initial':'current'}-arrow)"`);
      }
      html+=`<circle cx="${p.x}" cy="${p.y}" r="${r}" fill="${item.reference?'#fff':color}" fill-opacity="${item.reference?'.35':'1'}" stroke="${item.reference?color:'#fff'}" stroke-width="${item.reference?2.5:1.5}" ${item.reference?'stroke-dasharray="4 3"':''}/>`;
      if(isColor)html+=`<text x="${p.x}" y="${p.y+4}" text-anchor="middle" class="gx-color-number" fill="${item.reference?color:'#fff'}">${esc(item.site.color)}</text>`;
      if(view.showLabels&&!item.reference)html+=`<text x="${p.x+15}" y="${p.y-10}" class="gx-site-label">${esc(item.site.id??'r'+(item.index+1))}</text>`;
      primitives.push({depth:p.depth+(item.reference?0:.0001),html});
    }
    primitives.sort((a,b)=>a.depth-b.depth);
    svg.innerHTML=`<title>${esc(data.title)} · 第 ${esc(current?.step??frame)} 步</title><defs><marker id="gx-initial-arrow" viewBox="0 0 10 10" refX="9" refY="5" markerWidth="5" markerHeight="5" orient="auto-start-reverse"><path d="M0 0L10 5L0 10Z" fill="#82958a"/></marker><marker id="gx-current-arrow" viewBox="0 0 10 10" refX="9" refY="5" markerWidth="5" markerHeight="5" orient="auto-start-reverse"><path d="M0 0L10 5L0 10Z" fill="#b86a33"/></marker></defs>${primitives.map(p=>p.html).join('')}`;
    for(const key of ['yaw','pitch','zoom']){$(key).value=String(view[key]);$(key+'-value').textContent=key==='zoom'?view[key].toFixed(2)+'×':Math.round(view[key])+'°';}
    $('status').textContent=`第 ${current?.step??frame} 步 · ${space?'保留跨胞位移':'固定原点'} · 相机水平 ${Math.round(view.yaw)}° / 俯仰 ${Math.round(view.pitch)}°`;
  }
  for(const [name,key] of [['reference','showReference'],['labels','showLabels']])$(name).onchange=()=>{view[key]=$(name).checked;draw();};
  for(const name of ['yaw','pitch','zoom'])$(name).oninput=()=>{view[name]=Number($(name).value);draw();};
  $('reset').onclick=()=>{Object.assign(view,{yaw:defaults.yaw,pitch:defaults.pitch,zoom:defaults.zoom});draw();};
  stage.onpointerdown=e=>{if(!active()||e.button!==0)return;e.preventDefault();release();pointer={id:e.pointerId,x:e.clientX,y:e.clientY,yaw:view.yaw,pitch:view.pitch};stage.setPointerCapture?.(e.pointerId);stage.focus({preventScroll:true});};
  stage.onpointermove=e=>{if(!active()){destroy();return;}if(!pointer||e.pointerId!==pointer.id)return;view.yaw=((pointer.yaw+(e.clientX-pointer.x)*.45+540)%360)-180;view.pitch=Math.max(-85,Math.min(85,pointer.pitch+(e.clientY-pointer.y)*.35));draw();};
  stage.onpointerup=release;stage.onpointercancel=release;stage.onlostpointercapture=()=>{pointer=null;};
  stage.onkeydown=e=>{if(!active())return;let handled=true;if(e.key==='ArrowLeft')view.yaw=Math.max(-180,view.yaw-5);else if(e.key==='ArrowRight')view.yaw=Math.min(180,view.yaw+5);else if(e.key==='ArrowUp')view.pitch=Math.min(85,view.pitch+5);else if(e.key==='ArrowDown')view.pitch=Math.max(-85,view.pitch-5);else if(e.key==='+'||e.key==='=')view.zoom=Math.min(2,view.zoom+.05);else if(e.key==='-'||e.key==='−')view.zoom=Math.max(.55,view.zoom-.05);else handled=false;if(handled){e.preventDefault();draw();}};
  if(typeof MutationObserver!=='undefined'&&container.ownerDocument?.body){observer=new MutationObserver(()=>{if(!active()||!container.isConnected)destroy();});observer.observe(container.ownerDocument.body,{childList:true,subtree:true});}
  draw();return {destroy,getView:()=>({...view}),setFrame:index=>{frame=index;draw();}};
}
