// Searchable upstream-function inventory; no coverage status is inferred here.
const escape = value => String(value ?? '').replace(/[&<>"']/g, c => ({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]));
const statusNames = {
  exact_workflow:'精确计算流程', partial_exact_workflow:'部分精确流程',
  existing_numerical_workflow:'现有数值流程', partial_existing_workflow:'部分现有流程',
  not_covered_by_symbolic_port:'尚未移植', data_or_option:'数据或选项',
  non_computational:'非计算接口'
};
const kindNames={calculation:'计算函数',catalogue_data:'目录数据',option_or_state:'选项或状态',presentation:'显示与绘图',io_or_external:'外部 I/O'};
let inventory, pending;
export function filterCoverage(entries, query='', project='', status='', kind='') {
  const words=query.trim().toLocaleLowerCase().split(/\s+/).filter(Boolean);
  return entries.filter(row => (!project || row.project===project) && (!status || row.status===status) && (!kind || row.kind===kind) &&
    words.every(word => [row.symbol,row.project,row.tool,row.action,row.scope].join(' ').toLocaleLowerCase().includes(word)));
}
export function mountCoverage(host) {
  if (!host) return;
  host.innerHTML='<button class="secondary small" data-coverage-open>查找上游函数与迁移状态</button><div data-coverage-content></div>';
  const content=host.querySelector('[data-coverage-content]'), button=host.querySelector('[data-coverage-open]');
  button.onclick=async()=>{
    if(content.innerHTML){content.innerHTML='';button.textContent='查找上游函数与迁移状态';return;}
    button.disabled=true;content.textContent='正在读取接口清单…';
    try {
      if(!inventory){
        pending ||= fetch('data/symbolic-api-coverage.json?v=20261029-pathways1b').then(async response=>{
          if(!response.ok)throw new Error('接口清单读取失败');
          const data=await response.json();
          if(!Array.isArray(data.inventory))throw new Error('接口清单格式错误');
          return data;
        }).finally(()=>{pending=null;});
        inventory=await pending;
      }
      const rows=inventory.inventory;
      const projects=[...new Set(rows.map(row=>row.project))].sort();
      const statuses=[...new Set(rows.map(row=>row.status))].sort();
      const kinds=[...new Set(rows.map(row=>row.kind).filter(Boolean))].sort();
      content.innerHTML=`<p>清单包含 ${rows.length} 个公开符号，涵盖函数、数据和选项。精确流程表示下述数学范围已实现，不等同于原 Mathematica 调用签名完全兼容。</p><div class="coverage-filters"><label>函数名称或关键词<input data-coverage-query placeholder="例如 getSGIrep、Bloch、Wigner"></label><label>项目<select data-coverage-project><option value="">全部项目</option>${projects.map(x=>`<option>${escape(x)}</option>`).join('')}</select></label><label>迁移状态<select data-coverage-status><option value="">全部状态</option>${statuses.map(x=>`<option value="${escape(x)}">${escape(statusNames[x]||x)}</option>`).join('')}</select></label><label>接口类型<select data-coverage-kind><option value="">全部类型</option>${kinds.map(x=>`<option value="${escape(x)}">${escape(kindNames[x]||x)}</option>`).join('')}</select></label></div><p data-coverage-count role="status"></p><div class="table-wrap coverage-table" data-coverage-rows></div><button class="secondary small" data-coverage-more>显示更多</button><p><a href="data/symbolic-api-coverage.json" download>下载逐项接口清单 ↓</a></p>`;
      const query=content.querySelector('[data-coverage-query]'), project=content.querySelector('[data-coverage-project]'), status=content.querySelector('[data-coverage-status]'), kind=content.querySelector('[data-coverage-kind]');
      const more=content.querySelector('[data-coverage-more]');let limit=30;
      const draw=()=>{
        const matches=filterCoverage(rows,query.value,project.value,status.value,kind.value), visible=matches.slice(0,limit);
        content.querySelector('[data-coverage-count]').textContent=`${matches.length} 项匹配，显示 ${visible.length} 项`;
        content.querySelector('[data-coverage-rows]').innerHTML=visible.length?`<table><thead><tr><th>上游符号</th><th>迁移状态 / Python 接口</th><th>已实现范围与限制</th></tr></thead><tbody>${visible.map(row=>`<tr><td><strong>${escape(row.symbol)}</strong><small>${escape(row.project)} · ${escape(kindNames[row.kind]||row.kind||'')}</small></td><td>${escape(statusNames[row.status]||row.status)}${row.tool?`<code>${escape(row.tool)}${row.action?' / '+escape(row.action):''}</code>`:''}</td><td>${escape(row.scope)}</td></tr>`).join('')}</tbody></table>`:'<p class="empty-state">没有匹配的公开符号。</p>';
        more.hidden=visible.length>=matches.length;
      };
      for(const input of [query,project,status,kind]) input.addEventListener(input===query?'input':'change',()=>{limit=30;draw();});
      more.onclick=()=>{limit+=30;draw();};draw();button.textContent='收起接口清单';
    }catch(error){content.textContent=error.message;button.textContent='关闭提示';}
    finally{button.disabled=false;}
  };
}
