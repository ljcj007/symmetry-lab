const esc=value=>String(value??'').replace(/[&<>"']/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]));

const settingRows=[
 ['number-only','sg4_number_only.cif',"Load the number-only CIF",'_space_group_IT_number 4'],
 ['unique-c','sg4_unique_c.cif',"Load the P 2c CIF","_space_group_name_Hall 'P 2c'"],
 ['unique-b','sg4_unique_b.cif',"Load the P 2yb CIF","_space_group_name_Hall 'P 2yb'"],
 ['dotted-c','sg4_dotted_c.cif',"Load the dotted P 2c CIF","_space_group.name_Hall 'P 2c'",true]
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
  <summary>Space group 4 · CIF setting exercise</summary>
  <p>The three synthetic CIFs share a monoclinic cell and atomic coordinates. The space-group declaration varies. Predict which declarations will pass the cell-metric check, then load and convert each one manually.</p>
  <p class="form-note">Loading replaces the structure in the editor and applies the default angle tolerance and the exercise's wave vector and symmetry tolerance.</p>
  <div class="controls-row">${cifSettingCases.slice(0,3).map(button).join('')}</div>
  <p>Compare the dotted spelling with the P 2c input above. Check the input Hall record, expanded atom count, and BC wave vector.</p>
  <div class="controls-row">${button(cifSettingCases[3])}</div>
  <p id="structure-cif-practice-status" class="form-note" role="status" tabindex="-1" hidden></p>
  <p class="controls-row"><a href="#classroom/crystal?track=space&amp;tab=learn&amp;lesson=space-06">Return to the space-group lesson →</a><a href="docs/cif-setting-practice.md">Read the exercise and coordinate conventions →</a></p>
 </details>`;
}

const methods=Object.freeze({
 explicit_operations:"Uses the operations listed explicitly in the CIF",
 explicit_hall:"Uses the Hall symbol declared explicitly in the CIF",
 metadata_hall:"Finds compatible settings from the CIF space-group number or Hermann–Mauguin symbol",
 complete_cell_p1:"Reads the input as a complete P1 cell"
});

export function cifInputSettingHTML(setting){
 if(!setting||!Object.hasOwn(methods,setting.method))return '';
 const hall=setting.selected_hall;
 const showHall=setting.method==='metadata_hall'||setting.method==='explicit_hall';
 if(showHall&&(!Number.isInteger(hall?.number)||hall.number<1||hall.number>530||typeof hall.symbol!=='string'||!hall.symbol))return '';
 const count=setting.compatible_hall_count;
 const showCount=setting.method==='metadata_hall'&&Number.isInteger(count)&&count>0&&count<=530;
 return `<aside class="notice" id="structure-cif-setting-evidence">
  <strong>Setting used to read the input CIF</strong>
  <p>${esc(methods[setting.method])}</p>
  ${showHall?`<p>Hall ${hall.number} · <code>${esc(hall.symbol)}</code>${typeof hall.choice==='string'&&hall.choice?` · <code>${esc(hall.choice)}</code>`:''}</p>`:''}
  ${showCount?`<p>${esc("Settings compatible with the input cell metric")} · ${count}</p>`:''}
  ${showCount&&count>1&&setting.ambiguous===true?"<p>Several settings are compatible with the cell metric. The parser uses the first matching setting in the catalog.</p>":''}
  <p class="form-note">The Hall number in the space-group result above refers to the standardized cell.</p>
 </aside>`;
}

const hallCheckStatuses=Object.freeze({
 match:"Match in the input setting",
 different_in_input_setting:"Difference in the input setting",
 catalogue_unresolved:"Unresolved in the catalogue used"
});
const hallCandidateStatuses=Object.freeze({
 match:"Full operation sets match",
 operation_count:"Different operation counts",
 rotations:"Different rotation parts",
 translations:"Different translation parts"
});

export function cifExplicitHallCheckHTML(check,open=false){
 if(!check||!Object.hasOwn(hallCheckStatuses,check.status)||typeof check.declared_hall_symbol!=='string'||!check.declared_hall_symbol.trim()||!Array.isArray(check.candidates))return '';
 const count=check.explicit_operation_count,tolerance=check.translation_tolerance_fractional;
 if(!Number.isInteger(count)||count<1||!Number.isFinite(tolerance)||tolerance<=0)return '';
 const rows=check.candidates.filter(row=>row&&Number.isInteger(row.hall_number)&&row.hall_number>=1&&row.hall_number<=530&&
  Number.isInteger(row.group_number)&&row.group_number>=1&&row.group_number<=230&&Number.isInteger(row.operation_count)&&row.operation_count>=1&&Object.hasOwn(hallCandidateStatuses,row.status));
 return `<details class="structure-details" id="structure-cif-explicit-hall-check"${open?' open':''}>
  <summary><span>Check the Hall declaration against explicit operations</span> · ${esc(hallCheckStatuses[check.status])}</summary>
  <p><strong>Hall symbol declared in the CIF</strong> · <code style="overflow-wrap:anywhere">${esc(check.declared_hall_symbol)}</code></p>
  <p>The comparison uses the same input lattice basis and origin. Translations are compared modulo integer lattice periods. The structure is expanded using the explicit CIF operations.</p>
  <p class="form-note"><span>Distinct explicit operations</span> · ${count}<br><span>Translation comparison tolerance (fractional coordinates)</span> · ${tolerance.toExponential()}</p>
  ${rows.length?`<div class="table-wrap"><table><thead><tr><th>Catalogue Hall number</th><th>Catalogue space-group number</th><th>Catalogue operation count</th><th>Comparison</th></tr></thead><tbody>${rows.map(row=>`<tr><td>${row.hall_number}</td><td>${row.group_number}</td><td>${row.operation_count}</td><td>${esc(hallCandidateStatuses[row.status])}</td></tr>`).join('')}</tbody></table></div>`:''}
 </details>`;
}
