export function homeHTML({link,toolCard,knownTool,favorites,recent,pathways,esc}){
 return `<section class="nav-home-hero"><span class="nav-card-kicker">SYMMETRY LAB · 从理解到验证</span><h1>理解对称性，<br>再把它用于物理。</h1><p>选择适合你的起点，在同一条路线中阅读、预测、计算和解释。</p></section>
 <section class="nav-path-section" aria-label="三个学习入口"><div class="entry-levels">${[
 ['01','基础入门','第一次学习群论','认识对称操作，学会表示与特征标，再进入晶体对称。','向量与矩阵基础','classroom/foundations?lesson=group-basics','开始第一课'],
 ['02','物理应用','把群论用于物理问题','从声子、选择定则和材料响应，理解对称性怎样限制可观测量。','基础群论与物理概念','classroom/observables','选择物理主题'],
 ['03','进阶研究','已有明确计算任务','直接进入磁共表示、精确代数、表示耦合与多体模型。','表示论与相关物理基础','compute','进入计算中心']
 ].map(([n,title,who,goal,prior,route,action])=>`<article class="entry-level"><span class="entry-number">${n}</span><p class="entry-audience">${who}</p><h3>${title}</h3><p>${goal}</p><p class="entry-prior">建议基础：${prior}</p>${link(route,action+' →','entry-action')}</article>`).join('')}</div></section>
 <section class="entry-flagship"><div><span class="nav-card-kicker">精选实验 · 建议预留 25–35 分钟</span><h2>为什么 Si、GaAs 与 BaTiO₃ 的倍频响应不同？</h2><p>先预测反演对称性的作用，再计算偏振响应，最后用一个“允许却为零”的反例检验理解。</p><p class="entry-flow">01 预测 → 02 计算 → 03 解释 → 04 反例</p></div>${link('classroom/observables?module=shg-story','开始 SHG 旗舰实验 →','primary')}</section>
 ${recent.length?`<section class="nav-tool-section"><h2>继续上次的学习与计算</h2><div class="nav-recent">${recent.map(t=>link(t.route,esc(t.title))).join('')}</div></section>`:''}
 <section class="nav-tool-section"><h2>我的常用工具</h2>${favorites.length?`<div class="nav-card-grid">${favorites.map(r=>toolCard(knownTool(r),favorites)).join('')}</div>`:`<p class="nav-empty">收藏常用工具，下次直接进入。${link('compute','浏览计算中心 →')}</p>`}</section>
 <details class="entry-directory"><summary>查看完整学习路线 · 七条路线与全部专题</summary><div class="nav-card-grid">${pathways.map(p=>link('classroom/'+p.id,`<h3>${p.title}</h3><p>${p.summary}</p>`,'nav-atlas-card')).join('')}</div><p>${link('atlas','群与材料图谱 →')}　${link('atlas/projects','跨模块项目 →')}　${link('docs/dictionary','公式与符号词典 →')}</p></details>`;
}
