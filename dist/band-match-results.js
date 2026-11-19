const escapeCell=value=>String(value??'').replace(/[&<>"']/g,char=>({
 '&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'
})[char]);

export function bandMatchRows(bands,displayLabel){
 if(!Array.isArray(bands))throw new TypeError('能带匹配结果缺少有效的能级列表。');
 return bands.map(band=>{
  const decomposition=band.terms;
  const terms=Array.isArray(decomposition)?decomposition:decomposition?.terms;
  if(!Array.isArray(terms))throw new TypeError('能带分解结果缺少有效的表示项。');
  const pieces=terms.flatMap(term=>{
   const multiplicity=term.multiplicity??term.count??term.coefficient;
   if(!Number.isFinite(multiplicity)||multiplicity<=0)return [];
   return [(multiplicity>1?escapeCell(multiplicity)+' ':'')+displayLabel(term.label||term.id)];
  });
  const degeneracy=band.degeneracy??decomposition.dimension;
  return [escapeCell(band.index),Number.isFinite(band.energy)?band.energy.toFixed(6):'—',
   Number.isFinite(degeneracy)?escapeCell(degeneracy):'—',pieces.join(' ⊕ ')];
 });
}
