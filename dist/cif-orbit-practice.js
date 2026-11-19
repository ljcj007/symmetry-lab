const quartzFields = `data_quartz_rounded_teaching_excerpt
_space_group_IT_number 154
_symmetry_Int_Tables_number 154
_cell_length_a 4.91239(4)
_cell_length_b 4.91239(4)
_cell_length_c 5.40385(7)
_cell_angle_alpha 90
_cell_angle_beta 90
_cell_angle_gamma 120
loop_
_symmetry_equiv_pos_as_xyz
x,y,z
-y,x-y,2/3+z
y-x,-x,1/3+z
y,x,-z
x-y,-y,1/3-z
-x,y-x,2/3-z
loop_
_atom_site_label
_atom_site_type_symbol
_atom_site_symmetry_multiplicity
_atom_site_fract_x
_atom_site_fract_y
_atom_site_fract_z
_atom_site_occupancy
Si1 Si4+ 3 0.4701(4) 0. 0.6667 1.
O1 O2- 6 0.4139(7) 0.2674(7) 0.7856(6) 1.
`;

export const cifOrbitCases = Object.freeze([
  Object.freeze({id:'rounded', filename:'quartz_rounded_teaching_excerpt.cif', text:quartzFields}),
  Object.freeze({id:'exact', filename:'quartz_exact_teaching_control.cif', text:quartzFields
    .replace('data_quartz_rounded_teaching_excerpt','data_quartz_exact_teaching_control')
    .replace('0. 0.6667 1.','0. 2/3 1.')})
]);

export function cifOrbitPracticeEnabled(query){
  const values=new URLSearchParams(query).getAll('cif-orbit');
  return values.length===1&&values[0]==='practice';
}

export function cifOrbitPracticeHTML(open){
  return `<details class="structure-details" id="structure-cif-orbit-practice"${open?' open':''}>
    <summary>α 石英 · 核对一个位点的轨道重数</summary>
    <p>Si1 的声明重数为 3。先预测把第三个分数坐标从 <code>0.6667</code> 改成 <code>2/3</code>，会不会改变六条操作生成的不同周期位点数。</p>
    <div class="controls-row">
      <button type="button" id="structure-cif-orbit-practice-rounded" class="secondary small" data-cif-orbit-case="rounded">载入石英的舍入坐标</button>
      <button type="button" id="structure-cif-orbit-practice-exact" class="secondary small" data-cif-orbit-case="exact">载入精确坐标对照</button>
    </div>
    <p id="structure-cif-orbit-practice-status" class="form-note" role="status" tabindex="-1" hidden></p>
    <details class="structure-details"><summary>核对预测</summary><p>舍入坐标使 Si1 的像分裂成 6 个位点，导入会显示声明值和实际值的差异。精确对照产生 3 个 Si 位点和 6 个 O 位点。两次都使用同一组空间群操作。</p></details>
    <p class="form-note">舍入版节录原结构字段。精确对照用本站支持的分数写法，只替换教学副本中的一个坐标。标准 CIF 数值字段使用整数或小数。</p>
    <p class="controls-row"><a href="#classroom/crystal?track=space&amp;tab=learn&amp;lesson=space-04">返回位点对称课堂 →</a><a href="https://www.crystallography.net/cod/5000035.html" target="_blank" rel="noreferrer">原结构与来源 ↗</a></p>
  </details>`;
}
