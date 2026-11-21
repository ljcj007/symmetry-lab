const magneticIDQuery=/^(?:(bns|og)\s*(?:no\.?\s*|编号\s*)?:?\s*)?(\d+(?:\.\d+){0,2}\.?)$/iu;

function parseMagneticGroupQuery(value){
 const query=String(value??'').normalize('NFKC').trim();
 const match=query.match(magneticIDQuery);
 if(!match)return null;
 const [,prefix,id]=match;
 const partial=id.endsWith('.');
 const segments=id.replace(/\.$/u,'').split('.').length;
 if(!prefix&&(partial||segments===1))return null;
 const key=prefix?.toLowerCase()??(segments===2?'bns':'og');
 const length=key==='bns'?2:3;
 return {prefix,id,partial,segments,key,length};
}

export function isFullMagneticGroupQuery(value){
 const query=parseMagneticGroupQuery(value);
 return query!==null&&!query.partial&&query.segments===query.length;
}

// null leaves ordinary search in charge; [] is a recognized identifier with no match.
export function matchMagneticGroupQuery(groups,value,ids){
 const query=parseMagneticGroupQuery(value);
 if(!query)return null;
 const {prefix,id,partial,segments,key,length}=query;
 if(segments>length||(partial&&segments===length))return [];
 if(segments<length){
  const start=partial?id:`${id}.`;
  return groups.filter(group=>String(ids(group)[key]??'').startsWith(start));
 }
 const exact=groups.filter(group=>String(ids(group)[key]??'')===id);
 return prefix||exact.length?exact:null;
}
