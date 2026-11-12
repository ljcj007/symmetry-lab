// One query convention for the directory, home search and global finder.
export function normalizeSearchText(value){
 return String(value??'').normalize('NFKC').toLocaleLowerCase()
  .replace(/\b(su|so|sp|u|o)\s*\(\s*(\d+)\s*\)/g,'$1$2')
  .replace(/[₀₁₂₃₄₅₆₇₈₉]/g,c=>'₀₁₂₃₄₅₆₇₈₉'.indexOf(c))
  .replace(/[-‐‑‒–—−·()（）{}\[\],，]/g,' ').replace(/\s+/g,' ').trim();
}
export function searchEntries(entries,query,limit=30){
 const terms=normalizeSearchText(query).split(/\s+/).filter(Boolean);
 if(!terms.length)return [];
 const prepared=entries.map(item=>({item,title:normalizeSearchText(item.title),summary:normalizeSearchText(item.summary),keywords:normalizeSearchText(item.keywords),extra:normalizeSearchText(item.capabilityKeywords)}));
 const score=row=>terms.reduce((sum,term)=>sum+(row.title.includes(term)?4:0)+(row.keywords.includes(term)?2:0)+(row.extra.includes(term)?1:0),0);
 return prepared.filter(row=>terms.every(term=>(row.title+' '+row.summary+' '+row.keywords+' '+row.extra).includes(term)))
  .sort((a,b)=>score(b)-score(a)).slice(0,limit).map(row=>row.item);
}
