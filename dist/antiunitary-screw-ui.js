import {mathHTML} from './math-display.js?v=20261113-prose2';
import {buildWorkbenchRoute} from './workbench-route.js?v=20261112-flow2';

const cuts = [
  {id:'center', axialQuarters:0},
  {id:'intermediate', axialQuarters:1},
  {id:'boundary', axialQuarters:2}
];
const math = tex => `<span class="sl-math">${mathHTML(tex)}</span>`;
const escapeHTML = value => String(value).replace(/[&<>"']/g, char => ({
  '&':'&amp;', '<':'&lt;', '>':'&gt;', '"':'&quot;', "'":'&#39;'
})[char]);

// Quarter units keep the reciprocal-lattice differences integral throughout the check.
function quarterTex(value) {
  if (value % 4 === 0) return String(value / 4);
  const denominator = value % 2 === 0 ? 2 : 4;
  const numerator = Math.abs(value) / (4 / denominator);
  return (value < 0 ? '-' : '') + `\\tfrac{${numerator}}{${denominator}}`;
}

function vectorTex(values) {
  return '(' + values.map(quarterTex).join(',') + ')';
}

function checkCut({id, axialQuarters}) {
  const k = [1, 0, axialQuarters];
  const screw = [-k[0], -k[1], k[2]];
  const timeReversal = k.map(value => -value);
  const compound = screw.map(value => -value);
  const difference = compound.map((value, i) => value - k[i]);
  const fixesK = difference.every(value => value % 4 === 0);
  // At an invariant cut, exp(-2πi k_z) reduces to (-1)^(2 k_z).
  const square = fixesK ? (-1) ** (axialQuarters / 2) : null;
  return {id, k, screw, timeReversal, compound, difference, fixesK, square};
}

export function antiunitaryScrewHTML() {
  return `<section class="sc-worked" id="sc-antiunitary-screw" aria-labelledby="sc-antiunitary-screw-title">
    <h3 id="sc-antiunitary-screw-title">先螺旋再时间反演，区边界为何成对？</h3>
    <p>取灰磁空间群 BNS 4.8，采用本站 BC 原胞倒易分数坐标和电子自旋双值约定。固定横向坐标，只改变轴向分量。</p>
    <p>${math(String.raw`k=(\tfrac14,0,k_z)\qquad k_z\in\{0,\tfrac14,\tfrac12\}`)}</p>
    <form id="sc-antiunitary-screw-form">
      <p><label for="sc-antiunitary-screw-membership">预测哪些切面上的波矢经组合操作后折回自身</label><br>
        <select id="sc-antiunitary-screw-membership" required>
          <option value="">选择保持波矢的切面</option>
          <option value="center-boundary">中心与边界切面（0、1/2）</option>
          <option value="center">只有中心切面（0）</option>
          <option value="boundary">只有边界切面（1/2）</option>
          <option value="all">三个切面（0、1/4、1/2）</option>
          <option value="none">三个都不保持</option>
        </select></p>
      <p><label for="sc-antiunitary-screw-pairing">预测其中哪些切面由组合操作强制等能配对</label><br>
        <select id="sc-antiunitary-screw-pairing" required>
          <option value="">选择强制配对的切面</option>
          <option value="center-boundary">中心与边界切面（0、1/2）</option>
          <option value="center">只有中心切面（0）</option>
          <option value="boundary">只有边界切面（1/2）</option>
          <option value="none">三个都不强制配对</option>
        </select></p>
      <div class="sc-actions"><button class="primary" id="sc-antiunitary-screw-run" type="submit">计算并核对两个预测</button></div>
    </form>
    <p id="sc-antiunitary-screw-status" role="status"></p>
    <div id="sc-antiunitary-screw-result"></div>
  </section>`;
}

function comparisonHTML(results, membershipCorrect, pairingCorrect) {
  const tableLabel = 'BNS 4.8 的三个离轴波矢对照';
  return `<p>${membershipCorrect ? '波矢预测正确。中心与边界都折回同一波矢。' : '检查组合操作的轴向波矢差。中心与边界都折回同一波矢。'}</p>
    <p>${pairingCorrect ? '配对预测正确。只有边界同时满足同一波矢和平方为 −1。' : '检查保持波矢的两个切面。只有边界的反幺正平方为 −1。'}</p>
    <div class="sq-scroll" tabindex="0" role="region" aria-label="${tableLabel}">
      <table><caption class="sr-only">${tableLabel}</caption><thead><tr>
        <th scope="col">${math('k_z')}</th><th scope="col">${math('gk')}</th><th scope="col">${math(String.raw`\Theta k`)}</th>
        <th scope="col">${math('Ak')}</th><th scope="col">${math('Ak-k')}</th>
        <th scope="col">组合操作保持波矢？</th><th scope="col">原波矢空间中的平方</th>
        <th scope="col">强制配对？</th><th scope="col">双值核对</th>
      </tr></thead><tbody>${results.map(({id,k,screw,timeReversal,compound,difference,fixesK,square}) => {
        const route = buildWorkbenchRoute({mode:'msg', id:'4.8', k:k.map(value => value / 4), doubleValued:true});
        const openingLabel = '打开 BNS 4.8 双值工作台，轴向分量';
        return `<tr data-antiunitary-screw-cut="${id}">
          <th scope="row">${math(quarterTex(k[2]))}</th>
          ${[screw,timeReversal,compound,difference].map(values => `<td>${math(vectorTex(values))}</td>`).join('')}
          <td>${fixesK ? '折回自身' : '移到别的星臂'}</td><td>${square === null ? '—' : math(square === 1 ? '+1' : '-1')}</td>
          <td>${square === -1 ? '强制配对' : '无此配对约束'}</td>
          <td><a href="#${escapeHTML(route)}" aria-label="${openingLabel} ${k[2] / 4}">${'打开双值工作台'} →</a></td></tr>`;
      }).join('')}</tbody></table>
    </div>
    <ol>
      <li><strong>先判定动量返回。</strong> 螺旋与纯时间反演各自把横向分量从 1/4 变成 −1/4，差半个倒格周期。组合操作的横向变化相消，只翻转轴向分量。<br>
        ${math(String.raw`g=\{C_{2z}\mid(0,0,\tfrac12)\},\quad A=\Theta g,\quad Ak=(k_x,k_y,-k_z)`)}<br>
        ${math(String.raw`Ak-k=(0,0,-2k_z)\in\mathbb{Z}^3\ \Longleftrightarrow\ 2k_z\in\mathbb{Z}`)}</li>
      <li><strong>再算反幺正平方。</strong> 用自旋提升表示螺旋。两次螺旋给出沿轴整胞平移和一次 2π 自旋回转。时间反演与自旋提升后的螺旋交换，二者平方里的自旋负号相消。<br>
        ${math(String.raw`g^2=-T_z,\quad \Theta^2=-I,\quad A^2=T_z,\quad D_k(T_z)=\mathrm{e}^{-2\pi\mathrm{i}k_z}`)}</li>
      <li><strong>最后推导配对。</strong> 若 Hamiltonian 保持该对称性，且组合操作在同一波矢空间内平方为 −1，它把能量本征态变成一个同能量、正交的伙伴。中心面的平方为 +1，允许一维共表示。中间切面的组合操作连接不同波矢。<br>
        ${math(String.raw`\langle A\psi,\psi\rangle=\langle A\psi,A^2\psi\rangle=-\langle A\psi,\psi\rangle=0`)}</li>
    </ol>
    <p>边界面上的配对条件与横向坐标无关。打开工作台并手动计算，比较三个样点的小群操作与磁共表示。中心样点为一维 a 型，边界样点为二维 b 型，中间样点的小群只含恒等操作。</p>
    <p><a href="https://journals.aps.org/prb/abstract/10.1103/2f4l-tz7p" target="_blank" rel="noreferrer">反幺正螺旋与节点面（§ II）</a> · <a href="https://pmc.ncbi.nlm.nih.gov/articles/PMC7034989/#sec3" target="_blank" rel="noreferrer">声学晶体中同一动量机制的实验</a></p>`;
}

export function bindAntiunitaryScrew(host) {
  const form = host.querySelector('#sc-antiunitary-screw-form');
  const membership = host.querySelector('#sc-antiunitary-screw-membership');
  const pairing = host.querySelector('#sc-antiunitary-screw-pairing');
  const status = host.querySelector('#sc-antiunitary-screw-status');
  const output = host.querySelector('#sc-antiunitary-screw-result');

  form.onchange = () => {
    if (!output.innerHTML) return;
    output.innerHTML = '';
    status.textContent = '预测已更改，请重新核对。';
  };
  form.onsubmit = event => {
    event.preventDefault();
    if (!membership.value || !pairing.value) return;
    const results = cuts.map(checkCut);
    const fixed = results.filter(cut => cut.fixesK).map(cut => cut.id).join('-');
    const paired = results.find(cut => cut.square === -1).id;
    output.innerHTML = comparisonHTML(results, membership.value === fixed, pairing.value === paired);
    status.textContent = '已核对三个切面，结果和分步推导在下方。';
  };
  return () => {
    form.onchange = form.onsubmit = null;
  };
}
