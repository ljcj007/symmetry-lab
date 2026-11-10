import fs from 'node:fs';
import path from 'node:path';
import {fileURLToPath} from 'node:url';
export const localeRoot=fileURLToPath(new URL('../locales/',import.meta.url));
// Reviewed editorial/scientific choices take precedence over development drafts.
export const catalogFiles=['en-draft.json','en-manual-1.json','en-manual-2.json','en-manual-3.json','en-manual-extra.json','en-meta.json','en-editorial.json','en-science.json','en-quality.json','en-quality-physics.json','en-quality-dictionary.json','en-quality-teaching-1.json','en-quality-teaching-2.json','en-quality-controls-1.json','en-quality-controls-2.json','en-quality-controls-3.json','en-corrections.json'];
export function loadEnglishCatalog(){
 return Object.assign({},...catalogFiles.filter(name=>fs.existsSync(path.join(localeRoot,name))).map(name=>JSON.parse(fs.readFileSync(path.join(localeRoot,name),'utf8'))));
}
