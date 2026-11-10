// Searchable upstream-function inventory; no coverage status is inferred here.
const escape = value => String(value ?? '').replace(/[&<>"']/g, c => ({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]));
const statusNames = {
  exact_workflow:"precise calculation process", partial_exact_workflow:"Partially accurate process",
  existing_numerical_workflow:"existing numerical process", partial_existing_workflow:"Part of the existing process",
  not_covered_by_symbolic_port:"has not been ported yet", data_or_option:"data or options",
  non_computational:"non-computing interface"
};
const kindNames={calculation:"calculation function",catalogue_data:"directory data",option_or_state:"option or status",presentation:"Display and Drawing",io_or_external:"External I/O"};
let inventory, pending;
export function filterCoverage(entries, query='', project='', status='', kind='') {
  const words=query.trim().toLocaleLowerCase().split(/\s+/).filter(Boolean);
  return entries.filter(row => (!project || row.project===project) && (!status || row.status===status) && (!kind || row.kind===kind) &&
    words.every(word => [row.symbol,row.project,row.tool,row.action,row.scope].join(' ').toLocaleLowerCase().includes(word)));
}
export function mountCoverage(host) {
  if (!host) return;
  host.innerHTML="<button class=\"secondary small\" data-coverage-open>Find upstream functions and migration status</button><div data-coverage-content></div>";
  const content=host.querySelector('[data-coverage-content]'), button=host.querySelector('[data-coverage-open]');
  button.onclick=async()=>{
    if(content.innerHTML){content.innerHTML='';button.textContent="Find upstream functions and migration status";return;}
    button.disabled=true;content.textContent="Reading interface list...";
    try {
      if(!inventory){
        pending ||= fetch('data/symbolic-api-coverage.json?v=20261110-en1').then(async response=>{
          if(!response.ok)throw new Error("Interface list reading failed");
          const data=await response.json();
          if(!Array.isArray(data.inventory))throw new Error("interface list format error");
          return data;
        }).finally(()=>{pending=null;});
        inventory=await pending;
      }
      const rows=inventory.inventory;
      const projects=[...new Set(rows.map(row=>row.project))].sort();
      const statuses=[...new Set(rows.map(row=>row.status))].sort();
      const kinds=[...new Set(rows.map(row=>row.kind).filter(Boolean))].sort();
      content.innerHTML=`<p>list contains ${rows.length} public symbols covering functions, data, and options. The precise flow means that the mathematical ranges described below are implemented and are not equivalent to full compatibility with the original Mathematica call signature.</p><div class="coverage-filters"><label>function name or keyword<input data-coverage-query placeholder="such as getSGIrep, Bloch, Wigner"></label><label>project<select data-coverage-project><option value="">All projects</option>${projects.map(x=>`<option>${escape(x)}</option>`).join('')}</select></label><label>migration status<select data-coverage-status><option value="">All status</option>${statuses.map(x=>`<option value="${escape(x)}">${escape(statusNames[x]||x)}</option>`).join('')}</select></label><label>interface type<select data-coverage-kind><option value="">All types</option>${kinds.map(x=>`<option value="${escape(x)}">${escape(kindNames[x]||x)}</option>`).join('')}</select></label></div><p data-coverage-count role="status"></p><div class="table-wrap coverage-table" data-coverage-rows></div><button class="secondary small" data-coverage-more>Show more</button><p><a href="data/symbolic-api-coverage.json" download>Download itemized interface list ↓</a></p>`;
      const query=content.querySelector('[data-coverage-query]'), project=content.querySelector('[data-coverage-project]'), status=content.querySelector('[data-coverage-status]'), kind=content.querySelector('[data-coverage-kind]');
      const more=content.querySelector('[data-coverage-more]');let limit=30;
      const draw=()=>{
        const matches=filterCoverage(rows,query.value,project.value,status.value,kind.value), visible=matches.slice(0,limit);
        content.querySelector('[data-coverage-count]').textContent=`${matches.length} items match, display ${visible.length} item`;
        content.querySelector('[data-coverage-rows]').innerHTML=visible.length?`<table><thead><tr><th>upstream symbol</th><th>migration status / Python interface</th><th>Implemented scope and limitations</th></tr></thead><tbody>${visible.map(row=>`<tr><td><strong>${escape(row.symbol)}</strong><small>${escape(row.project)} · ${escape(kindNames[row.kind]||row.kind||'')}</small></td><td>${escape(statusNames[row.status]||row.status)}${row.tool?`<code>${escape(row.tool)}${row.action?' / '+escape(row.action):''}</code>`:''}</td><td>${escape(row.scope)}</td></tr>`).join('')}</tbody></table>`:"<p class=\"empty-state\">No matching public symbol.</p>";
        more.hidden=visible.length>=matches.length;
      };
      for(const input of [query,project,status,kind]) input.addEventListener(input===query?'input':'change',()=>{limit=30;draw();});
      more.onclick=()=>{limit+=30;draw();};draw();button.textContent="Collapse interface list";
    }catch(error){content.textContent=error.message;button.textContent="Close prompt";}
    finally{button.disabled=false;}
  };
}
