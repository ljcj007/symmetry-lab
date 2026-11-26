import {mountBandExplorer} from './viewer.js';
const en=new URLSearchParams(location.search).get('lang')==='en';
if(en){document.getElementById('offline-link').textContent='Download the offline Si view';document.documentElement.lang='en';document.title='Bands and verification · Symmetry Lab';const a=document.getElementById('back-workflow');a.textContent='Calculation and certificate';a.href='../?lang=en#native-run';}
try{
 const response=await fetch('./datasets.json',{cache:'no-cache'});
 if(!response.ok)throw new Error(en?'Could not load the published examples.':'未能载入已发布的示例。');
 const data=await response.json();
 mountBandExplorer(document.getElementById('band-explorer'),Array.isArray(data)?data:data.datasets);
}catch(error){
 const p=document.createElement('p');p.setAttribute('role','alert');p.textContent=(en?'Could not display this result: ':'无法显示本次结果：')+String(error.message).slice(0,250);document.getElementById('band-explorer').replaceChildren(p);
}
