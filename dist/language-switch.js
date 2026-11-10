// URL-based locale selection keeps the two static editions shareable. Learning
// progress and user-authored project records remain in their existing stores.
export const LANGUAGE_STORAGE_KEY='symmetry-lab.language.v1';

export function normalizeLanguage(value){
 const language=String(value??'').trim().toLowerCase().replace(/_/g,'-');
 if(language==='en'||language.startsWith('en-'))return 'en';
 if(['zh','zh-cn','zh-hans','zh-hans-cn','cn'].includes(language))return 'zh-CN';
 return null;
}

export function languageURL(value,language){
 const target=normalizeLanguage(language);
 if(!target)throw new RangeError('Unsupported language');
 const url=new URL(value);
 let directory=url.pathname.replace(/\/index\.html$/i,'/');
 if(/\/en\/?$/i.test(directory))directory=directory.replace(/en\/?$/i,'');
 else if(!directory.endsWith('/'))directory+='/';
 url.pathname=directory+(target==='en'?'en/':'');
 // An explicit language parameter must agree with the chosen edition, or a
 // reverse switch would immediately redirect back to the previous language.
 if(url.searchParams.has('lang'))url.searchParams.set('lang',target);
 return url.href;
}

export function explicitLanguageDestination(value,currentLanguage){
 const url=new URL(value),requested=normalizeLanguage(url.searchParams.get('lang'));
 if(!requested||requested===normalizeLanguage(currentLanguage))return null;
 return languageURL(url.href,requested);
}

function browserStorage(){try{return globalThis.localStorage;}catch{return null;}}
export function readLanguagePreference(storage=browserStorage()){
 try{return normalizeLanguage(storage?.getItem(LANGUAGE_STORAGE_KEY));}catch{return null;}
}
export function writeLanguagePreference(language,storage=browserStorage()){
 const normalized=normalizeLanguage(language);if(!normalized)return false;
 try{if(!storage)return false;storage.setItem(LANGUAGE_STORAGE_KEY,normalized);return true;}catch{return false;}
}

export function startLanguageSwitch({document:doc=globalThis.document,location=globalThis.location,window:win=globalThis.window,storage=browserStorage()}={}){
 if(!doc?.documentElement||!location?.href)return null;
 const language=normalizeLanguage(doc.documentElement.lang)||'zh-CN';
 doc.documentElement.lang=language;
 const preferredLanguage=readLanguagePreference(storage);
 const requested=normalizeLanguage(new URL(location.href).searchParams.get('lang'));
 if(requested)writeLanguagePreference(requested,storage);
 const destination=explicitLanguageDestination(location.href,language);
 if(destination){location.replace(destination);return {language,preferredLanguage,redirected:true,destroy(){}};}
 const host=doc.querySelector('.top-right')||doc.querySelector('.topbar')||doc.body;
 if(!host)return null;
 doc.querySelector('#language-switch')?.remove();
 const target=language==='en'?'zh-CN':'en',link=doc.createElement('a');
 link.id='language-switch';link.className='language-switch';link.lang=target;link.hreflang=target;
 link.textContent=target==='en'?'English':'中文';
 link.setAttribute('aria-label',language==='en'?'Switch to Chinese':'切换为英文');
 link.title=language==='en'?'Switch to Chinese':'切换为英文';
 const update=()=>{link.href=languageURL(location.href,target);};
 update();link.addEventListener('focus',update);link.addEventListener('pointerenter',update);
 link.addEventListener('click',()=>{update();writeLanguagePreference(target,storage);});
 host.appendChild(link);win?.addEventListener('hashchange',update);win?.addEventListener('popstate',update);
 return {language,preferredLanguage,element:link,redirected:false,destroy(){win?.removeEventListener('hashchange',update);win?.removeEventListener('popstate',update);link.remove();}};
}

if(globalThis.document?.documentElement&&globalThis.location?.href)startLanguageSwitch();
