// Emit source metadata only. The extraction policy is the runtime display
// allowlist; numerical matrices, inputs, files and user annotations stay opaque.
import fs from 'node:fs';
import {gunzipSync} from 'node:zlib';
import {collectResultDisplayMessages} from '../dist/english-results.js';
export const pythonResultFixtures=['electronic-materials.json','material-research.json','quantum-materials.json','response-materials.json','spectroscopy.json','structure-dynamics.json','bridges.json.gz','construction.json.gz','principles.json.gz','connections.json.gz','frontiers.json.gz','lie-foundations-ui.json'];
const rows=new Map();
for(const name of pythonResultFixtures){
 const raw=fs.readFileSync(new URL('./fixtures/'+name,import.meta.url)),data=JSON.parse((name.endsWith('.gz')?gunzipSync(raw):raw).toString());
 for(const message of collectResultDisplayMessages(data,{nativeAnnotations:true})){
  const row=rows.get(message.source)||{source:message.source,origins:[]};
  if(row.origins.length<5)row.origins.push('python-fixture/'+name+'/'+message.path.join('/'));
  rows.set(message.source,row);
 }
}
process.stdout.write(JSON.stringify([...rows.values()]));
