// Load an optional component on disclosure. This panel owns its mount and cleanup.
export function bindOptionalPanel({detail,body,load,mount,isCurrent}){
 if(!detail||!body)return ()=>{};
 let alive=true,version=0,loading=false,dispose=null;
 const current=()=>alive&&isCurrent();
 function clear(){
  version++;
  loading=false;
  dispose?.();
  dispose=null;
  body.innerHTML='';
 }
 async function show(){
  if(!current()||!detail.open||loading||dispose)return;
  const request=++version;
  const owns=()=>current()&&detail.open&&request===version;
  loading=true;
  body.innerHTML="<p role=\"status\">Loading the demonstration…</p>";
  try{
   const component=await load();
   if(owns())dispose=mount(component,owns)||(()=>{});
  }catch{
   if(!owns())return;
   body.innerHTML="<p role=\"alert\">The demonstration could not load.</p><button type=\"button\" class=\"secondary\" data-optional-retry>Try loading again</button>";
   body.querySelector('[data-optional-retry]').onclick=()=>{if(owns())show();};
  }finally{
   if(request===version)loading=false;
  }
 }
 detail.ontoggle=()=>{if(current()){if(detail.open)show();else clear();}};
 if(detail.open)show();
 return ()=>{alive=false;detail.ontoggle=null;clear();};
}
