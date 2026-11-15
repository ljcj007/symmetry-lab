// One query convention for the directory, home search and global finder.
export function normalizeSearchText(value){
 return String(value??'').normalize('NFKC').toLocaleLowerCase()
  .replace(/\b(su|so|sp|u|o)\s*\(\s*(\d+)\s*\)/g,'$1$2')
  .replace(/[₀₁₂₃₄₅₆₇₈₉]/g,c=>'₀₁₂₃₄₅₆₇₈₉'.indexOf(c))
  .replace(/[-‐‑‒–—−·()（）{}\[\],，]/g,' ').replace(/\s+/g,' ').trim();
}
// Treat a pasted path as its basename. This changes query interpretation only;
// it never reads a file or chooses a conversion/compute mode.
const queryTerms=query=>(normalizeSearchText(query).match(/"[^"]+"|'[^']+'|\S+/g)||[]).map(term=>{
 const plain=term.replace(/^["']|["']$/g,''),base=plain.split(/[\\/]/).at(-1);
 const filePath=/[\\/]/.test(plain)&&(/^[a-z]:[\\/]|^[\\/]/.test(plain)||plain.includes('\\')||/\.[a-z0-9]+$|^poscar$/i.test(base));
 return plain==='/'?'':filePath?base:plain;
}).filter(Boolean);
export function matchingInputFormats(item,query){
 const terms=queryTerms(query);
 return (item.capability?.inputFormats||[]).filter(row=>row.files.some(file=>terms.includes(normalizeSearchText(file))));
}
export function inputFormatSummary(item,query){
 return matchingInputFormats(item,query).map(row=>row.files.join(' / ')+' — '+row.purpose+' '+row.conditions).join(' ');
}
export function searchEntries(entries,query,limit=30){
 const terms=queryTerms(query);
 if(!terms.length)return [];
 const prepared=entries.map(item=>({item,title:normalizeSearchText(item.title),summary:normalizeSearchText(item.summary),keywords:normalizeSearchText(item.keywords),extra:normalizeSearchText(item.capabilityKeywords)}));
 const score=row=>matchingInputFormats(row.item,query).reduce((sum,format)=>sum+20*format.priority,0)+terms.reduce((sum,term)=>sum+(row.title.includes(term)?4:0)+(row.keywords.includes(term)?2:0)+(row.extra.includes(term)?1:0),0);
 return prepared.filter(row=>terms.every(term=>(row.title+' '+row.summary+' '+row.keywords+' '+row.extra).includes(term)))
  .sort((a,b)=>score(b)-score(a)).slice(0,limit).map(row=>row.item);
}
