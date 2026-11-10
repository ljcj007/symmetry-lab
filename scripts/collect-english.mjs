import fs from 'node:fs';
import path from 'node:path';
import {ROOT,collectEnglishSources} from './english-source.mjs';
const sources=collectEnglishSources();fs.mkdirSync(path.join(ROOT,'locales'),{recursive:true});
fs.writeFileSync(path.join(ROOT,'locales/en-sources.json'),JSON.stringify(sources,null,2)+'\n');
console.log('English translation units:',sources.length,'source characters:',sources.reduce((n,x)=>n+x.source.length,0));
