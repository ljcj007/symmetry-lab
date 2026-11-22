import {crystalSpan} from './crystal-notation.js?v=20261110-en1';

const routes={orbit:'#crystkit?preset=pminus1-orbit',origin:'#crystkit?preset=pminus1-origin'};
const examples={
 general:{action:'analyze',group_number:2,point:['1/5','3/10','2/5']},
 center:{action:'analyze',group_number:2,point:[0,0,0]},
 shifted:{action:'analyze',group_number:2,origin:['1/4',0,0],point:['-1/4',0,0]}
};

export function pMinusOnePracticeFromRoute(route){
 return Object.keys(routes).find(key=>routes[key].slice(1)===route)||null;
}

export function pMinusOneLessonHTML(lesson){
 const group=crystalSpan('P-1','hm');
 if(lesson==='space-04')return `<aside class="sc-worked" data-pminus1-lesson="orbit">
  <h3>核对一般点和反演中心的轨道 · ${group}</h3>
  <p>分别取 (1/5, 3/10, 2/5) 和 (0, 0, 0)。先预测轨道有几个点、哪些操作保持该点，再比较相同的原胞平移取模下的两个结果。</p>
  <a href="${routes.orbit}">在晶体群工具中比较两个点 →</a>
 </aside>`;
 if(lesson==='space-06')return `<aside class="sc-worked" data-pminus1-lesson="origin">
  <h3>把同一个反演中心写在两个原点设定中</h3>
  <p>保持基底不变。新原点的旧坐标是 (1/4, 0, 0)，旧反演中心的新坐标是 (−1/4, 0, 0)。先算反演的未折回平移，再核对计算输出的折回结果。</p>
  <a href="${routes.origin}">在晶体群工具中比较原点移动前后 →</a>
 </aside>`;
 return '';
}

export function pMinusOnePracticeHTML(practice){
 if(practice==='orbit')return `<section class="notice" id="crystkit-pminus1" aria-labelledby="crystkit-pminus1-title">
  <h2 id="crystkit-pminus1-title">一般点与反演中心</h2>
  <p>分别载入并运行两个输入。在点轨道表中核对一般点有两个等价点、稳定子阶为 1，反演中心有一个等价点、稳定子阶为 2。</p>
  <div class="controls-row">
   <button type="button" class="secondary small" data-pminus1-input="general">载入一般点 <code>(1/5, 3/10, 2/5)</code></button>
   <button type="button" class="secondary small" data-pminus1-input="center">载入反演中心 <code>(0, 0, 0)</code></button>
  </div>
  <p>载入会替换当前输入。点击运行后再比较结果。</p>
 </section>`;
 if(practice==='origin')return `<section class="notice" id="crystkit-pminus1" aria-labelledby="crystkit-pminus1-title">
  <h2 id="crystkit-pminus1-title">移动坐标原点</h2>
  <p>比较同一个物理反演中心的两组坐标。移动后，用 origin = (1/4, 0, 0)，并在新坐标中取 point = (−1/4, 0, 0)。</p>
  <div class="controls-row">
   <button type="button" class="secondary small" data-pminus1-input="center">载入原来的原点设定</button>
   <button type="button" class="secondary small" data-pminus1-input="shifted">载入移动后的原点设定</button>
  </div>
  <p>载入会替换当前输入。点击运行后再比较结果。</p>
 </section>`;
 return '';
}

export function pMinusOnePracticeInput(practice,id){
 const allowed=practice==='orbit'?['general','center']:practice==='origin'?['center','shifted']:[];
 return allowed.includes(id)?structuredClone(examples[id]):null;
}

function matchesInput(input,example){
 return input&&Object.keys(input).length===Object.keys(example).length&&
  Object.entries(example).every(([key,value])=>JSON.stringify(input[key])===JSON.stringify(value));
}

export function pMinusOneOriginResultHTML(result,input){
 if(result?.action!=='analyze')return '';
 const moved=matchesInput(input,examples.shifted);
 if(!moved&&!matchesInput(input,examples.center))return '';
 const inversion=result.operations?.find(op=>JSON.stringify(op.rotation)==='[[-1,0,0],[0,-1,0],[0,0,-1]]');
 const folded=moved?'1/2':0;
 if(JSON.stringify(inversion?.translation)!==JSON.stringify([folded,0,0]))return '';
 return `<aside class="notice" id="crystkit-pminus1-inversion">
  <h3>读出反演的平移分量</h3>
  <p>${moved?'按坐标式计算，未折回平移为':'原点设在反演中心时，未折回平移为'} <code>(${moved?'−1/2':'0'}, 0, 0)</code>。</p>
  <p>Python 返回的原胞折回结果为 <code data-pminus1-folded>(${inversion.translation.join(', ')})</code>。</p>
 </aside>`;
}
