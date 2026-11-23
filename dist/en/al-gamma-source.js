const folder='example/Al-ABACUS/abacus-pw/';
const commit='18cad919af8fe8aad349e04f101887fa19b051a0';
const upstream='https://github.com/phonopy/phonopy/blob/'+commit+'/'+folder;

export const AL_GAMMA_SOURCE=Object.freeze({
 id:'official-phonopy-al-abacus-pw',commit,license:'BSD-3-Clause',lengthUnit:'au',
 frequencyUnit:'THz',frequencyUnitInBandFile:null,
 band:Object.freeze({
  filename:'phonopy-al-abacus-band.yaml',path:folder+'band.yaml',url:upstream+'band.yaml',byteCount:63428,
  sha256:'08da0d622d6f423f4bc5d3900a30c9bb5dfb86933bc849f59aad60fe67ec330b',
 }),
 companion:Object.freeze({
  filename:'phonopy-al-abacus-structure.yaml',path:folder+'phonopy.yaml',url:upstream+'phonopy.yaml',byteCount:8206,
  sha256:'a5d34dc7f9ddf73066e07a9b64a53e7d9b89735d9af353de0af1a21a5512b87f',
 }),
});

export const AL_GAMMA_SCENES=Object.freeze([
 ['gamma-reciprocal',0,[1,1,1],[1,1,1]],
 ['gamma-origin',62,[0,0,0],[1,1,1]],
 ['boundary',83,[.5,.5,.5],[2,2,2]],
].map(([id,selected_q,q,supercell])=>Object.freeze({
 id,selected_q,selected_band:0,q:Object.freeze(q),supercell:Object.freeze(supercell),
})));

const asHex=buffer=>Array.from(new Uint8Array(buffer),byte=>byte.toString(16).padStart(2,'0')).join('');

async function readVerifiedFile(file,fetcher,signal,crypto){
 const url=new URL('./data/examples/'+file.filename,import.meta.url);
 const response=await fetcher(url,{signal});
 signal?.throwIfAborted();
 if(!response.ok)throw Error("The official Al input could not be loaded. Try again.");
 const bytes=await response.arrayBuffer();
 signal?.throwIfAborted();
 if(bytes.byteLength!==file.byteCount)throw Error("The official Al example could not be read. Load it again.");
 const hash=asHex(await crypto.digest('SHA-256',bytes));
 signal?.throwIfAborted();
 if(hash!==file.sha256)throw Error("The official Al example could not be read. Load it again.");
 return new TextDecoder('utf-8',{fatal:true,ignoreBOM:true}).decode(bytes);
}

// The returned loader has no rendering or compute side effects. A host applies
// only an explicitly selected scene while it still owns the current form.
export async function readAlGammaSource({signal,fetcher=globalThis.fetch}={}){
 signal?.throwIfAborted();
 const crypto=globalThis.crypto?.subtle;
 if(!crypto)throw Error("This browser cannot verify the official Al input files.");
 const {band,companion,frequencyUnit}=AL_GAMMA_SOURCE;
 const [content,structure_content]=await Promise.all([
  readVerifiedFile(band,fetcher,signal,crypto),
  readVerifiedFile(companion,fetcher,signal,crypto),
 ]);
 signal?.throwIfAborted();
 return Object.freeze({
  sourceEvidence:AL_GAMMA_SOURCE,
  createInput(sceneId){
   const scene=AL_GAMMA_SCENES.find(item=>item.id===sceneId);
   if(!scene)return null;
   return {
    preset:'custom',content,filename:band.filename,structure_content,structure_filename:companion.filename,
    frequency_unit:frequencyUnit,selected_q:scene.selected_q,selected_band:scene.selected_band,
    supercell:[...scene.supercell],amplitude:.01,phase:0,frequency_tolerance:1e-5,symprec:1e-5,
   };
  },
 });
}
