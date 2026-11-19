const esc=value=>String(value??'').replace(/[&<>"']/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]));

const settingRows=[
 ['number-only','sg4_number_only.cif','载入仅编号的 CIF','_space_group_IT_number 4'],
 ['unique-c','sg4_unique_c.cif','载入 P 2c CIF',"_space_group_name_Hall 'P 2c'"],
 ['unique-b','sg4_unique_b.cif','载入 P 2yb CIF',"_space_group_name_Hall 'P 2yb'"]
];

export const cifSettingCases=Object.freeze(settingRows.map(([id,filename,label,declaration])=>Object.freeze({
 id,filename,label,text:`data_metric
_cell_length_a 3
_cell_length_b 5
_cell_length_c 4
_cell_angle_alpha 90
_cell_angle_beta 90
_cell_angle_gamma 101.2(1)
${declaration}
loop_
_atom_site_type_symbol
_atom_site_fract_x
_atom_site_fract_y
_atom_site_fract_z
Na .123 .345 .234
Cl .271 .159 .414
`
})));

export function cifSettingPracticeEnabled(query){
 const values=new URLSearchParams(query).getAll('cif-setting');
 return values.length===1&&values[0]==='practice';
}

export function cifSettingPracticeHTML(open){
 return `<details class="structure-details" id="structure-cif-practice"${open?' open':''}>
  <summary>空间群 4 · CIF 设置练习</summary>
  <p>三份合成 CIF 使用同一个单斜晶胞和同一组原子坐标。改变的是空间群的声明。先预测哪份声明会通过晶胞度量核对，再逐一载入并手动转换。</p>
  <p class="form-note">载入会替换编辑框中的结构，并采用默认角度容差及该练习的波矢和对称性容差。</p>
  <div class="controls-row">${cifSettingCases.map(({id,label})=>`<button type="button" id="structure-cif-practice-${id}" class="secondary small" data-cif-setting-case="${id}">${esc(label)}</button>`).join('')}</div>
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
