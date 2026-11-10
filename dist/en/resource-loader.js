// Shared promises, bounded waits and retry after failures. No eager requests.
export function createResourceLoader(load){
 const values=new Map(),pending=new Map();
 return {peek:key=>values.get(key),async get(key){
  if(values.has(key))return values.get(key);
  if(!pending.has(key))pending.set(key,Promise.resolve().then(()=>load(key)).then(value=>{values.set(key,value);return value;}).finally(()=>pending.delete(key)));
  return pending.get(key);
 }};
}
export async function fetchJSON(url,{timeout=30000,fetcher=globalThis.fetch}={}){
 const controller=new AbortController();let timer;
 try{return await Promise.race([
  Promise.resolve().then(()=>fetcher(url,{signal:controller.signal})).then(async r=>{if(!r.ok)throw Error("reading failed ("+r.status+'）');return r.json();}),
  new Promise((_,reject)=>{timer=setTimeout(()=>{controller.abort();reject(Error("Reading timeout, please try again."));},timeout);})
 ]);}finally{clearTimeout(timer);}
}
const names={sg:'space-groups',msg:'magnetic-groups',mpg:'points'};
export function createGroupLoader(fetcher=globalThis.fetch){return createResourceLoader(async mode=>{
 if(!Object.hasOwn(names,mode))throw Error("unknown group directory");
 const data=await fetchJSON("../data/"+names[mode]+'.json',{fetcher});
 if(!Array.isArray(mode==='mpg'?data.points:data.groups))throw Error("The group directory format is incorrect");
 return data;
});}
