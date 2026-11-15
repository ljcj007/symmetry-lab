// Rendering and camera only: all positions, colours and spins are Python output.
const esc=value=>String(value??'').replace(/[&<>"']/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]));
const palette=['#277b96','#ce7748','#8a65a9','#6e984a'];
const edges=[[0,1],[0,2],[0,4],[1,3],[1,5],[2,3],[2,6],[3,7],[4,5],[4,6],[5,7],[6,7]];
const defaults={yaw:-28,pitch:24,zoom:1,showReference:true,showLabels:true};
const line=(a,b,attrs)=>`<line x1="${a.x}" y1="${a.y}" x2="${b.x}" y2="${b.y}" ${attrs}/>`;
const vector=p=>Array.isArray(p)&&p.length===3&&p.every(Number.isFinite);
const clamp=(x,min,max,fallback)=>Number.isFinite(Number(x))?Math.max(min,Math.min(max,Number(x))):fallback;
let sequence=0;

export function createSpinColorViewer({container,data,frameIndex=0,initialView={},isCurrent=()=>true}){
  const supplied=initialView&&typeof initialView==='object'&&!Array.isArray(initialView)?initialView:{},view={...defaults};
  for(const [name,min,max]of [['yaw',-180,180],['pitch',-85,85],['zoom',.55,2]])view[name]=Number.isFinite(supplied[name])?clamp(supplied[name],min,max,defaults[name]):defaults[name];
  for(const name of ['showReference','showLabels'])if(typeof supplied[name]==='boolean')view[name]=supplied[name];
  const storedCenter=supplied.panCenter,initialCenter=storedCenter&&['x','y'].every(k=>Number.isFinite(storedCenter[k])&&storedCenter[k]>=0&&storedCenter[k]<=1)?{x:storedCenter.x,y:storedCenter.y}:{x:.5,y:.5};
  let frame=frameIndex,pointer=null,destroyed=false,observer=null,resizer=null,lastWidth=0,canvas=null,dragMode=supplied.dragMode==='pan'?'pan':'rotate';
  const markerId='gx-view-'+(++sequence),reference=data.referenceSites||[],frames=data.frames||[];
  const isColor=data.lab==='color_group',isSpin=data.lab==='spin_group',space=data.dimension==='space';
  const vertices=space?(data.cellVertices||[]).filter(vector):[];
  const axes=(data.latticeAxes?.length?data.latticeAxes:[{label:'x',start:[0,0,0],end:[.55,0,0]},{label:'y',start:[0,0,0],end:[0,.55,0]},{label:'z',start:[0,0,0],end:[0,0,.55]}]).map((a,i)=>Array.isArray(a)?{label:['a','b','c'][i]||String(i+1),start:[0,0,0],end:a}:a).filter(a=>vector(a.start)&&vector(a.end));
  // A single envelope includes every returned frame, initial sites, axes and
  // moment tips. Frame changes never recenter or rescale the camera.
  const base=[...vertices,...reference.filter(s=>vector(s.position)).map(s=>s.position),...axes.flatMap(a=>[a.start,a.end]),[0,0,0]];
  const baseMin=[0,1,2].map(i=>Math.min(...base.map(p=>p[i]))),baseMax=[0,1,2].map(i=>Math.max(...base.map(p=>p[i]))),baseCenter=baseMin.map((n,i)=>(n+baseMax[i])/2);
  const glyphLength=.28*Math.max(.45,...base.map(p=>Math.hypot(...p.map((n,i)=>n-baseCenter[i]))));
  const tip=s=>s.position.map((n,i)=>n+glyphLength*s.spin[i]);
  const envelope=[...base,...[...reference,...frames.flatMap(f=>f.sites||[])].filter(s=>vector(s.position)).flatMap(s=>vector(s.spin)?[s.position,tip(s)]:[s.position])];
  const minimum=[0,1,2].map(i=>Math.min(...envelope.map(p=>p[i]))),maximum=[0,1,2].map(i=>Math.max(...envelope.map(p=>p[i]))),center=minimum.map((n,i)=>(n+maximum[i])/2);
  container.innerHTML=`<div class="gx-viewer"><div class="gx-view-options"><label><input data-gx="reference" type="checkbox" ${view.showReference?'checked':''}>叠加初始图案</label><label><input data-gx="labels" type="checkbox" ${view.showLabels?'checked':''}>显示站点标签</label><span>${space?'三维周期模型':'点群模型 · 固定原点'}</span></div><div class="gx-stage" data-gx="stage" tabindex="0" role="group" aria-label="双群、色群与自旋群三维操作演示；方向键旋转视角，+ 和 − 缩放"><svg viewBox="0 0 760 480" role="img" aria-label="Python 计算的空间位置与内部自由度"><title>三维空间与内部自由度对照</title></svg></div><p class="gx-instructions">拖动图形或用方向键旋转视角；+ / − 缩放。空心虚线表示初始图案，实心表示当前结果。${isColor?'颜色旁的数字表示可区分的标签，不代表时间反演。':isSpin?'箭头表示经典自旋方向；自旋转动和空间操作分别计算。':'箭头只表示自旋期望值；旋量整体负号须查看精确矩阵。'}</p><div class="gx-camera"><label>水平角 <output data-gx="yaw-value"></output><input data-gx="yaw" type="range" min="-180" max="180" value="${view.yaw}" step="1"></label><label>俯仰角 <output data-gx="pitch-value"></output><input data-gx="pitch" type="range" min="-85" max="85" value="${view.pitch}" step="1"></label><label>缩放 <output data-gx="zoom-value"></output><input data-gx="zoom" type="range" min="0.55" max="2" value="${view.zoom}" step="0.05"></label><button type="button" class="secondary" data-gx="reset">重置三维视角</button></div><p class="gx-camera-status" data-gx="status" aria-live="polite"></p></div>`;
  const modes='<label class="gx-drag-mode">图内拖动<select data-gx="drag-mode"><option value="rotate">旋转视角</option><option value="pan">平移放大图</option></select></label>';
  const keyAndNote='<div data-gx="site-key" class="gx-site-key" hidden></div><p class="gx-fit-note">全部步骤共用同一场景范围，保留跨胞位移与箭头。放大后可切换“平移放大图”，拖动或用方向键查看图内其余部分。</p>';
  container.innerHTML=container.innerHTML.replace('<div class="gx-stage"',modes+'<div class="gx-stage"').replace('</svg></div>','</svg></div>'+keyAndNote);
  const $=name=>container.querySelector(`[data-gx="${name}"]`),stage=$('stage'),svg=stage.querySelector('svg'),shell=container.querySelector('.gx-viewer');
  const ownedControls=['reference','labels','drag-mode','yaw','pitch','zoom','reset'].map($);
  const width=()=>{const n=stage.clientWidth||stage.getBoundingClientRect?.().width||container.clientWidth||container.getBoundingClientRect?.().width;return Number.isFinite(n)&&n>0?Math.max(1,Math.round(n)):lastWidth||760;};
  const active=()=>!destroyed&&isCurrent()&&stage.isConnected!==false;
  const guarded=fn=>(...args)=>{if(!active()){destroy();return;}return fn(...args);};
  const describe=()=>stage.setAttribute?.('aria-label',dragMode==='pan'?'三维操作放大图；拖动或用方向键平移，+ 和 − 缩放':'双群、色群与自旋群三维操作演示；方向键旋转视角，+ 和 − 缩放');
  function panTo(x,y){stage.scrollLeft=clamp(x,0,Math.max(0,canvas.width-canvas.viewportWidth),0);stage.scrollTop=clamp(y,0,Math.max(0,canvas.height-canvas.viewportHeight),0);}
  const panCenter=()=>canvas?{x:clamp(((Number(stage.scrollLeft)||0)+canvas.viewportWidth/2)/canvas.width,0,1,.5),y:clamp(((Number(stage.scrollTop)||0)+canvas.viewportHeight/2)/canvas.height,0,1,.5)}:{...initialCenter};
  function release(){if(pointer){try{if(stage.hasPointerCapture?.(pointer.id))stage.releasePointerCapture(pointer.id);}catch{/* Detached pointer capture. */}pointer=null;}}
  function destroy(){if(destroyed)return;destroyed=true;release();observer?.disconnect();resizer?.disconnect();globalThis.removeEventListener?.('resize',resize);for(const name of ['onpointerdown','onpointermove','onpointerup','onpointercancel','onlostpointercapture','onkeydown'])stage[name]=null;for(const node of ownedControls)if(node)for(const event of ['oninput','onchange','onclick'])node[event]=null;}
  function draw(){
    if(!active()){destroy();return;}
    const current=frames[frame]||frames[0],sites=(current?.sites||[]).filter(s=>vector(s.position)),w=width(),h=w<420?340:Math.min(520,Math.max(360,Math.round(w*.632))),compact=w<420,numbered=compact||sites.some(s=>Array.from(String(s.id||'')).length>16);
    const old=canvas,scrollX=Number(stage.scrollLeft)||0,scrollY=Number(stage.scrollTop)||0;lastWidth=w;
    canvas={width:Math.max(w,w*view.zoom),height:Math.max(h,h*view.zoom),viewportWidth:w,viewportHeight:h};
    stage.setAttribute?.('style',`height:${h+2}px;touch-action:none`);svg.setAttribute?.('viewBox',`0 0 ${canvas.width} ${canvas.height}`);svg.setAttribute?.('style',`width:${canvas.width}px;height:${canvas.height}px;max-width:none`);shell.setAttribute?.('data-gx-layout',compact?'compact':'wide');$('drag-mode').value=dragMode;describe();
    const shown=[...(view.showReference?reference.map((site,i)=>({site,index:i,reference:true})):[]),...sites.map((site,i)=>({site,index:i,reference:false}))];
    const yaw=view.yaw*Math.PI/180,pitch=view.pitch*Math.PI/180,cy=Math.cos(yaw),sy=Math.sin(yaw),cp=Math.cos(pitch),sp=Math.sin(pitch);
    const rotate=p=>{const [x,y,z]=p.map((n,i)=>n-center[i]),xx=cy*x-sy*y,yy=sy*x+cy*y;return{x:xx,y:cp*z-sp*yy,depth:sp*z+cp*yy};};
    const projected=envelope.map(rotate),loX=Math.min(...projected.map(p=>p.x)),hiX=Math.max(...projected.map(p=>p.x)),loY=Math.min(...projected.map(p=>p.y)),hiY=Math.max(...projected.map(p=>p.y));
    const pad=compact?34:45,scale=Math.max(.001,Math.min(Math.max(1,w-2*pad)/Math.max(.3,hiX-loX),Math.max(1,h-2*pad)/Math.max(.3,hiY-loY)))*view.zoom;
    const project=p=>{const q=rotate(p);return{x:canvas.width/2+scale*(q.x-(loX+hiX)/2),y:canvas.height/2-scale*(q.y-(loY+hiY)/2),depth:q.depth};};
    const primitives=[];
    for(const [i,j] of edges)if(vertices[i]&&vertices[j]){const a=project(vertices[i]),b=project(vertices[j]);primitives.push({depth:(a.depth+b.depth)/2,html:line(a,b,'class="gx-cell-edge"')});}
    for(const [index,axis] of axes.entries()){const a=project(Array.isArray(axis)?[0,0,0]:axis.start),b=project(Array.isArray(axis)?axis:axis.end);primitives.push({depth:b.depth,html:line(a,b,'class="gx-axis"')+`<text x="${b.x+9}" y="${b.y-9}" class="gx-axis-label">${esc(Array.isArray(axis)?['a','b','c'][index]:axis.label)}</text>`});}
    for(const item of shown){
      if(!Array.isArray(item.site.position))continue;
      const p=project(item.site.position),color=isColor?palette[Number(item.site.color)%palette.length]||palette[0]:item.reference?'#8faaa1':'#357b70',r=item.reference?12:9;
      let html='';
      if(vector(item.site.spin)&&item.site.spin.some(n=>Math.abs(n)>1e-10)){
        const q=project(tip(item.site));
        html+=line(p,q,`data-gx-spin="${item.reference?'reference':'current'}" stroke="${item.reference?'#82958a':'#b86a33'}" stroke-width="${item.reference?2:3.5}" ${item.reference?'stroke-dasharray="5 4"':''} marker-end="url(#${markerId}-${item.reference?'initial':'current'}-arrow)"`);
      }
      html+=`<circle data-gx-site="${esc(item.site.id??'r'+(item.index+1))}" data-gx-pattern="${item.reference?'reference':'current'}" cx="${p.x}" cy="${p.y}" r="${r}" fill="${item.reference?'#fff':color}" fill-opacity="${item.reference?'.35':'1'}" stroke="${item.reference?color:'#fff'}" stroke-width="${item.reference?2.5:1.5}" ${item.reference?'stroke-dasharray="4 3"':''}/>`;
      if(isColor)html+=`<text x="${p.x}" y="${p.y+4}" text-anchor="middle" class="gx-color-number" fill="${item.reference?color:'#fff'}">${esc(item.site.color)}</text>`;
      if(view.showLabels&&!item.reference)html+=`<text x="${p.x+(p.x>canvas.width/2?-15:15)}" y="${p.y-10}" text-anchor="${p.x>canvas.width/2?'end':'start'}" class="gx-site-label"><title>${esc(item.site.id??'r'+(item.index+1))}</title>${numbered?'#'+(item.index+1):esc(item.site.id??'r'+(item.index+1))}</text>`;
      primitives.push({depth:p.depth+(item.reference?0:.0001),html});
    }
    primitives.sort((a,b)=>a.depth-b.depth);
    svg.innerHTML=`<title>${esc(data.title)} · 第 ${esc(current?.step??frame)} 步</title><defs><marker id="${markerId}-initial-arrow" viewBox="0 0 10 10" refX="9" refY="5" markerWidth="5" markerHeight="5" orient="auto-start-reverse"><path d="M0 0L10 5L0 10Z" fill="#82958a"/></marker><marker id="${markerId}-current-arrow" viewBox="0 0 10 10" refX="9" refY="5" markerWidth="5" markerHeight="5" orient="auto-start-reverse"><path d="M0 0L10 5L0 10Z" fill="#b86a33"/></marker></defs>${primitives.map(p=>p.html).join('')}`;
    $('site-key').hidden=!numbered||!view.showLabels;$('site-key').innerHTML=numbered&&view.showLabels?'<p>站点对照：图中 # 编号对应完整标签。</p><ol>'+sites.map((s,i)=>`<li><span>#${i+1}</span><bdi>${esc(s.id??'r'+(i+1))}</bdi></li>`).join('')+'</ol>':'';
    if(!old||old.width!==canvas.width||old.height!==canvas.height||old.viewportWidth!==w)panTo(old?(scrollX+old.viewportWidth/2)/old.width*canvas.width-w/2:initialCenter.x*canvas.width-w/2,old?(scrollY+old.viewportHeight/2)/old.height*canvas.height-h/2:initialCenter.y*canvas.height-h/2);
    for(const key of ['yaw','pitch','zoom']){$(key).value=String(view[key]);$(key+'-value').textContent=key==='zoom'?view[key].toFixed(2)+'×':Math.round(view[key])+'°';}
    $('status').textContent=`第 ${current?.step??frame} 步 · ${space?'保留跨胞位移':'固定原点'} · 相机水平 ${Math.round(view.yaw)}° / 俯仰 ${Math.round(view.pitch)}°`;
  }
  for(const [name,key]of [['reference','showReference'],['labels','showLabels']])$(name).onchange=guarded(()=>{view[key]=$(name).checked;draw();});
  for(const name of ['yaw','pitch','zoom'])$(name).oninput=guarded(()=>{view[name]=clamp($(name).value,name==='yaw'?-180:name==='pitch'?-85:.55,name==='yaw'?180:name==='pitch'?85:2,view[name]);draw();});
  $('drag-mode').onchange=guarded(()=>{release();dragMode=$('drag-mode').value==='pan'?'pan':'rotate';describe();});
  $('reset').onclick=guarded(()=>{release();Object.assign(view,{yaw:defaults.yaw,pitch:defaults.pitch,zoom:defaults.zoom});dragMode='rotate';$('drag-mode').value='rotate';draw();panTo(0,0);});
  stage.onpointerdown=guarded(e=>{if(e.button!==0)return;e.preventDefault();release();pointer={id:e.pointerId,x:e.clientX,y:e.clientY,yaw:view.yaw,pitch:view.pitch,scrollX:stage.scrollLeft||0,scrollY:stage.scrollTop||0,mode:dragMode};try{stage.setPointerCapture?.(e.pointerId);}catch{/* A pointer may end before capture. */}stage.focus?.({preventScroll:true});});
  stage.onpointermove=guarded(e=>{if(!pointer||e.pointerId!==pointer.id)return;if(pointer.mode==='pan')panTo(pointer.scrollX+pointer.x-e.clientX,pointer.scrollY+pointer.y-e.clientY);else{view.yaw=((pointer.yaw+(e.clientX-pointer.x)*.45+540)%360)-180;view.pitch=Math.max(-85,Math.min(85,pointer.pitch+(e.clientY-pointer.y)*.35));draw();}});
  stage.onpointerup=release;stage.onpointercancel=release;stage.onlostpointercapture=()=>{pointer=null;};
  stage.onkeydown=guarded(e=>{let handled=true;if(dragMode==='pan'&&['ArrowLeft','ArrowRight','ArrowUp','ArrowDown'].includes(e.key)){panTo((stage.scrollLeft||0)+(e.key==='ArrowRight'?32:e.key==='ArrowLeft'?-32:0),(stage.scrollTop||0)+(e.key==='ArrowDown'?32:e.key==='ArrowUp'?-32:0));}else if(e.key==='ArrowLeft')view.yaw=Math.max(-180,view.yaw-5);else if(e.key==='ArrowRight')view.yaw=Math.min(180,view.yaw+5);else if(e.key==='ArrowUp')view.pitch=Math.min(85,view.pitch+5);else if(e.key==='ArrowDown')view.pitch=Math.max(-85,view.pitch-5);else if(e.key==='+'||e.key==='=')view.zoom=Math.min(2,view.zoom+.05);else if(e.key==='-'||e.key==='−')view.zoom=Math.max(.55,view.zoom-.05);else handled=false;if(handled){e.preventDefault();draw();}});
  function resize(){if(!active()||container.isConnected===false){destroy();return;}if(width()!==lastWidth){release();draw();}}
  if(typeof ResizeObserver!=='undefined'){resizer=new ResizeObserver(resize);resizer.observe(stage);}else globalThis.addEventListener?.('resize',resize);
  if(typeof MutationObserver!=='undefined'&&container.ownerDocument?.body){observer=new MutationObserver(()=>{if(!active()||!container.isConnected)destroy();});observer.observe(container.ownerDocument.body,{childList:true,subtree:true});}
  draw();return {destroy,getView:()=>({...view,dragMode,panCenter:panCenter()}),setFrame:index=>{if(!active())return;frame=index;draw();}};
}
