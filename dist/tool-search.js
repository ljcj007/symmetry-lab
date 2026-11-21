import {matchMagneticGroupQuery} from './magnetic-group-query.js?v=20261121-msg-gamma1';

// One query convention for the directory, home search and global finder.
export function normalizeSearchText(value){
 return String(value??'').normalize('NFKC').toLocaleLowerCase()
  .replace(/\bposcar[-‐‑‒–—−]0\b/g,'poscar0')
  .replace(/\bwt\.in[-‐‑‒–—−]bands\b/g,'wt.inbands')
  .replace(/\b(su|so|sp|u|o)\s*\(\s*(\d+)\s*\)/g,'$1$2')
  .replace(/[₀₁₂₃₄₅₆₇₈₉]/g,c=>'₀₁₂₃₄₅₆₇₈₉'.indexOf(c))
  .replace(/[-‐‑‒–—−·()（）{}\[\],，]/g,' ').replace(/\s+/g,' ').trim();
}
// Treat a pasted path as its basename. This changes query interpretation only;
// it never reads a file or chooses a conversion/compute mode.
function fileBasename(term){
 const base=term.split(/[\\/]/).at(-1);
 const looksLikeFile=/^[a-z]:[\\/]|^[\\/]/i.test(term)||term.includes('\\')||/\.[a-z0-9]+$|^poscar(?:[-‐‑‒–—−]?0)?$|^wt\.in[-‐‑‒–—−]bands$/i.test(base);
 return /[\\/]/.test(term)&&looksLikeFile&&base?base:term;
}
function queryTerms(query){
 const raw=String(query??'').normalize('NFKC').trim();
 const quoted=/^(?:"[^"]+"|'[^']+')$/.test(raw);
 const complete=quoted?raw.slice(1,-1):raw;
 const basename=quoted||!(/\s/.test(raw))?fileBasename(complete):complete;
 if(basename!==complete)return [normalizeSearchText(basename)];
 return (normalizeSearchText(raw).match(/"[^"]+"|'[^']+'|\S+/g)||[])
  .map(term=>fileBasename(term.replace(/^["']|["']$/g,'')))
  .filter(term=>term&&term!=='/');
}
export function matchingInputFormats(item,query){
 const terms=queryTerms(query);
 return (item.capability?.inputFormats||[]).filter(row=>row.files.some(file=>terms.includes(normalizeSearchText(file))));
}
export function inputFormatSummary(item,query){
 return matchingInputFormats(item,query).map(row=>row.files.join(' / ')+' — '+row.purpose+' '+row.conditions).join(' ');
}
export function searchEntries(entries,query,limit=30,{includeExampleRoutes=true}={}){
 const terms=queryTerms(query);
 if(!terms.length)return [];
 const exampleTerms=terms.join(' ').replace(/[“”‘’]/gu,'').split(' ').filter(Boolean);
 const exampleQuery=exampleTerms.join(' ');
 const prepared=entries.map(item=>({item,title:normalizeSearchText(item.title),summary:normalizeSearchText(item.summary),keywords:normalizeSearchText(item.keywords),extra:normalizeSearchText(item.capabilityKeywords)}));
 const matchingExamples=entries.filter(({searchExample:example})=>example?.matches(exampleQuery,exampleTerms));
 const examples=matchingExamples.map(item=>{
  if(!includeExampleRoutes)return item;
  const {params,title,summary}=item.searchExample;
  return {...item,route:`${item.route}?${params}`,title,summary};
 });
 const score=row=>matchingInputFormats(row.item,query).reduce((sum,format)=>sum+20*format.priority,0)+terms.reduce((sum,term)=>sum+(row.title.includes(term)?4:0)+(row.keywords.includes(term)?2:0)+(row.extra.includes(term)?1:0),0);
 const tools=prepared.filter(row=>!matchingExamples.includes(row.item)&&terms.every(term=>(row.title+' '+row.summary+' '+row.keywords+' '+row.extra).includes(term)))
  .sort((a,b)=>score(b)-score(a)).map(row=>row.item);
 return [...examples,...tools].slice(0,limit);
}

const magneticRoute=/^atlas\/msg\?q=(\d+\.\d+)$/u;
const spaceGroupQuery=/^(?:(?:sg|space\s+group|空间群)\s*(?:no\.?\s*|编号\s*)?:?\s*)?([1-9]\d{0,2})$/iu;
function catalogMagneticIds(item){
 return {bns:item.route.match(magneticRoute)?.[1],og:item.summary?.match(/^OG (\d+\.\d+\.\d+)$/u)?.[1]};
}

export function spaceGroupNumberForQuery(query){
 return String(query??'').normalize('NFKC').trim().match(spaceGroupQuery)?.[1]??null;
}

export function spaceGroupSymbolKey(symbol){
 return String(symbol??'').normalize('NFKC').toLowerCase()
  .replace(/(\d)[\u0304\u0305]/gu,'-$1').replace(/[‐‑‒–—−]/gu,'-')
  .replace(/(\d)_(?=\d)/gu,'$1').replace(/\s/gu,'');
}

export function searchCatalogEntries(entries,query,limit=30){
 const magnetic=matchMagneticGroupQuery(entries.filter(item=>magneticRoute.test(item.route)),query,catalogMagneticIds);
 const spaceNumber=spaceGroupNumberForQuery(query);
 const symbol=magnetic===null&&!spaceNumber?spaceGroupSymbolKey(query):'';
 const space=spaceNumber?entries.filter(item=>item.route===`atlas/sg?q=${spaceNumber}`)
  :symbol?entries.filter(item=>item.route.startsWith('atlas/sg?q=')&&item.symbols?.some(alias=>spaceGroupSymbolKey(alias)===symbol)):[];
 const others=entries.filter(item=>!space.includes(item)&&(magnetic===null||!magneticRoute.test(item.route)));
 return [...(magnetic??[]),...space,...searchEntries(others,query,limit)].slice(0,limit);
}
