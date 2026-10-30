import {svgMathText} from './math-svg.js?v=20261030-symmetry1';
// Pure SVG views of Python results; these functions do not perform spectroscopy.
const esc=x=>String(x??'').replace(/[&<>"']/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]));
const fmt=x=>Number.isFinite(x)?Number(x.toPrecision(4)):'—';
export function quantumCurveSVG(series,{xLabel='x',yLabel='y'}={}){
 const colors=['#247b65','#b17a31','#617caf','#a75f85'];
 const finite=series.flatMap(s=>s.points.filter(p=>Number.isFinite(p[0])&&Number.isFinite(p[1])));
 if(!finite.length)return '<p>当前数据没有这个物理量。</p>';
 const xs=series.flatMap(s=>s.points.map(p=>p[0])).filter(Number.isFinite),xmin=Math.min(...xs),xmax=Math.max(...xs),ymin=Math.min(0,...finite.map(p=>p[1])),ymax=Math.max(0,...finite.map(p=>p[1])),dx=xmax-xmin||1,dy=ymax-ymin||1;
 const xy=p=>[105+535*(p[0]-xmin)/dx,255-210*(p[1]-ymin)/dy],tick=x=>x!==0&&(Math.abs(x)>=1e5||Math.abs(x)<1e-3)?x.toExponential(2):fmt(x);
 const curves=series.map((s,i)=>{const segments=[];let segment=[];for(const p of s.points){if(Number.isFinite(p[0])&&Number.isFinite(p[1]))segment.push(p);else if(segment.length){segments.push(segment);segment=[];}}if(segment.length)segments.push(segment);return segments.map(points=>points.length===1?`<circle cx="${xy(points[0])[0]}" cy="${xy(points[0])[1]}" r="4" fill="${colors[i%4]}"/>`:`<polyline points="${points.map(p=>xy(p).join(',')).join(' ')}" fill="none" stroke="${colors[i%4]}" stroke-width="3"/>`).join('');}).join('');
 return `<svg class="obs-curve" viewBox="0 0 720 340" role="img" aria-label="${esc(yLabel)} 随 ${esc(xLabel)} 变化"><title>${svgMathText(yLabel)}；未定义值保留为断点</title><path d="M105 35V255H650" fill="none" stroke="#9eb3a5"/>${[0,.5,1].map(t=>`<line x1="105" x2="650" y1="${255-t*210}" y2="${255-t*210}" stroke="#dce6df"/><text x="95" y="${261-t*210}" text-anchor="end">${tick(ymin+t*dy)}</text>`).join('')}${curves}<text x="105" y="282">${tick(xmin)}</text><text x="640" y="282" text-anchor="end">${tick(xmax)}</text><text x="110" y="23">${svgMathText(yLabel)}</text><text x="370" y="317" text-anchor="middle">${svgMathText(xLabel)}</text></svg><div class="mr-legend">${series.map((s,i)=>`<span><i style="background:${colors[i%4]}"></i>${esc(s.label)}</span>`).join('')}</div>`;
}
export function heatmapSVG(xs,ys,values,{title='',signed=false,xLabel='kₓ',yLabel='kᵧ',unit=''}={}){
 if(!xs?.length||!ys?.length||!values?.length)return '<p>没有可显示的网格。</p>';
 const finite=values.flat().filter(x=>typeof x==='number'&&Number.isFinite(x));
 if(!finite.length)return '<p>该网格上的几何量均未定义。</p>';
 const lo=signed?-Math.max(...finite.map(Math.abs)):Math.min(...finite),hi=signed?-lo:Math.max(...finite),span=hi-lo||1;
 const paint=v=>{if(v===null||!Number.isFinite(v))return '#e0e2df';const t=Math.max(0,Math.min(1,(v-lo)/span));return signed?(t<.5?`hsl(210 44% ${42+100*t}%)`:`hsl(14 62% ${142-100*t}%)`):`hsl(${160-105*t} 45% ${92-55*t}%)`;};
 const w=430/xs.length,h=340/ys.length;
 return `<svg class="qm-map" viewBox="0 0 590 445" role="img" aria-label="${esc(title)}"><title>${esc(title)}；灰色格点为未定义</title>${values.map((row,j)=>row.map((v,i)=>`<rect x="${75+i*w}" y="${365-(j+1)*h}" width="${w+.15}" height="${h+.15}" fill="${paint(v)}"><title>${svgMathText(xLabel)}=${fmt(xs[i])}, ${esc(yLabel)}=${fmt(ys[j])}: ${fmt(v)}</title></rect>`).join('')).join('')}<rect x="75" y="25" width="430" height="340" fill="none" stroke="#698575"/><text x="75" y="391">${fmt(xs[0])}</text><text x="505" y="391" text-anchor="end">${fmt(xs.at(-1))}</text><text x="290" y="420" text-anchor="middle">${svgMathText(xLabel)}</text><text x="65" y="365" text-anchor="end">${fmt(ys[0])}</text><text x="65" y="40" text-anchor="end">${fmt(ys.at(-1))}</text><text x="28" y="195" text-anchor="middle" transform="rotate(-90 28 195)">${svgMathText(yLabel)}</text>${Array.from({length:60},(_,i)=>`<rect x="530" y="${25+i*340/60}" width="16" height="6" fill="${paint(hi-(hi-lo)*i/59)}"/>`).join('')}<text x="520" y="18">${fmt(hi)}</text><text x="520" y="390">${fmt(lo)}</text><text x="290" y="442" text-anchor="middle">${svgMathText(title)}${unit?' · '+esc(unit):''}</text></svg>`;
}

const realOrbital=(id,x,y,z)=>({xy:Math.sqrt(3)*x*y,yz:Math.sqrt(3)*y*z,xz:Math.sqrt(3)*x*z,'x2-y2':Math.sqrt(3)/2*(x*x-y*y),z2:(3*z*z-1)/2}[id]??0);
export function orbitalSVG(result,{orbital='density',yaw=35,pitch=25}={}){
 const a=yaw*Math.PI/180,b=pitch*Math.PI/180;
 const rotate=([x,y,z])=>{const u=Math.cos(a)*x-Math.sin(a)*y,v=Math.sin(a)*x+Math.cos(a)*y;return [u,Math.cos(b)*v-Math.sin(b)*z,Math.sin(b)*v+Math.cos(b)*z];};
 const project=p=>{const [x,y,z]=rotate(p);return [290+95*x,235-95*z,y];};
 const map=result.angular_map,nt=map?.theta?.length||21,np=map?.phi?.length||42;
 const raw=[];
 for(let j=0;j<nt;j++){const theta=map?.theta?.[j]??Math.PI*j/(nt-1);raw[j]=[];for(let i=0;i<np;i++){const phi=map?.phi?.[i]??2*Math.PI*i/np,x=Math.sin(theta)*Math.cos(phi),y=Math.sin(theta)*Math.sin(phi),z=Math.cos(theta),v=orbital==='density'?Math.sqrt(Math.max(0,map?.density?.[j]?.[i]||0)):realOrbital(orbital,x,y,z);raw[j][i]={dir:[x,y,z],v};}}
 const scale=Math.max(...raw.flat().map(p=>Math.abs(p.v)),1e-10);
 const points=raw.map(row=>row.map(p=>({p:project(p.dir.map(v=>1.55*v*Math.abs(p.v)/scale)),v:p.v})));
 const polygons=[];
 for(let j=0;j<nt-1;j++)for(let i=0;i<np;i++){const q=[points[j][i],points[j][(i+1)%np],points[j+1][(i+1)%np],points[j+1][i]],depth=q.reduce((s,p)=>s+p.p[2],0)/4;polygons.push({depth,svg:`<polygon points="${q.map(p=>p.p.slice(0,2).join(',')).join(' ')}" fill="${orbital==='density'||q.reduce((s,p)=>s+p.v,0)>=0?'#26806c':'#b06c46'}" stroke="#ffffff" stroke-width=".18" opacity=".84"/>`});}
 const ligands=result.ligands?.positions||[],maxR=Math.max(...ligands.map(p=>Math.hypot(...p)),1),atoms=ligands.map(p=>{const end=project(p.map(v=>2.15*v/maxR));return `<line x1="290" y1="235" x2="${end[0]}" y2="${end[1]}" stroke="#8c9c94" stroke-width="2" stroke-dasharray="4 4"/><circle cx="${end[0]}" cy="${end[1]}" r="9" fill="#d8b04e" stroke="#7a682a"/>`;}).join('');
 return `<svg class="qm-orbital" viewBox="0 0 580 490" role="img" aria-label="可旋转的 d 轨道与配体三维示意"><title>半径是归一化角向幅度；不是电子径向分布。可拖动旋转。</title>${atoms}${polygons.sort((x,y)=>x.depth-y.depth).map(p=>p.svg).join('')}${[[[2.45,0,0],'x'],[[0,2.45,0],'y'],[[0,0,2.45],'z']].map(([p,label])=>{const q=project(p);return `<line x1="290" y1="235" x2="${q[0]}" y2="${q[1]}" stroke="#657a6d" opacity=".7"/><text x="${q[0]+7}" y="${q[1]}">${label}</text>`;}).join('')}<text x="290" y="476" text-anchor="middle">${orbital==='density'?'所选简并子空间平均角密度的平方根':'实 d 轨道 · 绿色 / 棕色表示相位正负'}</text></svg>`;
}
