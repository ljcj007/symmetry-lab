const esc=value=>String(value??'').replace(/[&<>"']/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]));

const settingRows=[
 ['number-only','sg4_number_only.cif','载入仅编号的 CIF','_space_group_IT_number 4'],
 ['unique-c','sg4_unique_c.cif','载入 P 2c CIF',"_space_group_name_Hall 'P 2c'"],
 ['unique-b','sg4_unique_b.cif','载入 P 2yb CIF',"_space_group_name_Hall 'P 2yb'"],
 ['dotted-c','sg4_dotted_c.cif','载入点号 P 2c CIF',"_space_group.name_Hall 'P 2c'",true]
];

export const cifSettingCases=Object.freeze(settingRows.map(([id,filename,label,declaration,dotted])=>{
 const join=dotted?'.':'_';
 return Object.freeze({id,filename,label,text:`data_metric
_cell${join}length_a 3
_cell${join}length_b 5
_cell${join}length_c 4
_cell${join}angle_alpha 90
_cell${join}angle_beta 90
_cell${join}angle_gamma 101.2(1)
${declaration}
loop_
_atom_site${join}type_symbol
_atom_site${join}fract_x
_atom_site${join}fract_y
_atom_site${join}fract_z
Na .123 .345 .234
Cl .271 .159 .414
`
 });
}));

export function cifSettingPracticeEnabled(query){
 const values=new URLSearchParams(query).getAll('cif-setting');
 return values.length===1&&values[0]==='practice';
}

export function cifSettingPracticeHTML(open){
 const button=({id,label})=>`<button type="button" id="structure-cif-practice-${id}" class="secondary small" data-cif-setting-case="${id}">${esc(label)}</button>`;
 return `<details class="structure-details" id="structure-cif-practice"${open?' open':''}>
  <summary>空间群 4 · CIF 设置练习</summary>
  <p>三份合成 CIF 使用同一个单斜晶胞和同一组原子坐标。改变的是空间群的声明。先预测哪份声明会通过晶胞度量核对，再逐一载入并手动转换。</p>
  <p class="form-note">载入会替换编辑框中的结构，并采用默认角度容差及该练习的波矢和对称性容差。</p>
  <div class="controls-row">${cifSettingCases.slice(0,3).map(button).join('')}</div>
  <p>再对照点号写法。与 P 2c 版本逐项比较输入 Hall 记录、展开原子数和 BC 波矢。</p>
  <div class="controls-row">${button(cifSettingCases[3])}</div>
  <p id="structure-cif-practice-status" class="form-note" role="status" tabindex="-1" hidden></p>
  <p class="controls-row"><a href="#classroom/crystal?track=space&amp;tab=learn&amp;lesson=space-06">返回空间群课堂 →</a><a href="docs/cif-setting-practice.md">查看练习步骤与坐标约定 →</a></p>
 </details>`;
}

const methods=Object.freeze({
 explicit_operations:'采用 CIF 中明确列出的操作',
 explicit_hall:'读取 CIF 中明确声明的 Hall 符号',
 metadata_hall:'从 CIF 编号或 Hermann–Mauguin 符号筛选相容设置',
 complete_cell_p1:'按完整 P1 晶胞读取'
});

export function cifInputSettingHTML(setting){
 if(!setting||!Object.hasOwn(methods,setting.method))return '';
 const hall=setting.selected_hall;
 const showHall=setting.method==='metadata_hall'||setting.method==='explicit_hall';
 if(showHall&&(!Number.isInteger(hall?.number)||hall.number<1||hall.number>530||typeof hall.symbol!=='string'||!hall.symbol))return '';
 const count=setting.compatible_hall_count;
 const showCount=setting.method==='metadata_hall'&&Number.isInteger(count)&&count>0&&count<=530;
 return `<aside class="notice" id="structure-cif-setting-evidence">
  <strong>读取输入 CIF 时采用的设置</strong>
  <p>${esc(methods[setting.method])}</p>
  ${showHall?`<p>Hall ${hall.number} · <code>${esc(hall.symbol)}</code>${typeof hall.choice==='string'&&hall.choice?` · <code>${esc(hall.choice)}</code>`:''}</p>`:''}
  ${showCount?`<p>${esc('与输入晶胞度量相容的候选数')} · ${count}</p>`:''}
  ${showCount&&count>1&&setting.ambiguous===true?'<p>多个候选与度量相容。解析器采用目录中的第一个匹配设置。</p>':''}
  <p class="form-note">上方空间群结果中的 Hall 编号对应标准化后的晶胞。</p>
 </aside>`;
}

const hallCheckStatuses=Object.freeze({
 match:'在输入设置中匹配',
 different_in_input_setting:'在输入设置中不同',
 catalogue_unresolved:'所用目录中未解析'
});
const hallCandidateStatuses=Object.freeze({
 match:'完整操作集匹配',
 operation_count:'操作数不同',
 rotations:'旋转部分不同',
 translations:'平移部分不同'
});

export function cifExplicitHallCheckHTML(check,open=false){
 if(!check||!Object.hasOwn(hallCheckStatuses,check.status)||typeof check.declared_hall_symbol!=='string'||!check.declared_hall_symbol.trim()||!Array.isArray(check.candidates))return '';
 const count=check.explicit_operation_count,tolerance=check.translation_tolerance_fractional;
 if(!Number.isInteger(count)||count<1||!Number.isFinite(tolerance)||tolerance<=0)return '';
 const rows=check.candidates.filter(row=>row&&Number.isInteger(row.hall_number)&&row.hall_number>=1&&row.hall_number<=530&&
  Number.isInteger(row.group_number)&&row.group_number>=1&&row.group_number<=230&&Number.isInteger(row.operation_count)&&row.operation_count>=1&&Object.hasOwn(hallCandidateStatuses,row.status));
 return `<details class="structure-details" id="structure-cif-explicit-hall-check"${open?' open':''}>
  <summary><span>Hall 声明与显式操作核对</span> · ${esc(hallCheckStatuses[check.status])}</summary>
  <p><strong>CIF 中声明的 Hall 符号</strong> · <code style="overflow-wrap:anywhere">${esc(check.declared_hall_symbol)}</code></p>
  <p>比较限定在同一输入晶胞基底和原点，平移按整数晶格周期比较。结构展开采用 CIF 明确列出的操作。</p>
  <p class="form-note"><span>去除等价项后的显式操作数</span> · ${count}<br><span>平移比较容差（分数坐标）</span> · ${tolerance.toExponential()}</p>
  ${rows.length?`<div class="table-wrap"><table><thead><tr><th>目录 Hall 编号</th><th>目录空间群编号</th><th>目录操作数</th><th>匹配情况</th></tr></thead><tbody>${rows.map(row=>`<tr><td>${row.hall_number}</td><td>${row.group_number}</td><td>${row.operation_count}</td><td>${esc(hallCandidateStatuses[row.status])}</td></tr>`).join('')}</tbody></table></div>`:''}
 </details>`;
}
