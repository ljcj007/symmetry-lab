import {verify} from './engine.js';
self.onmessage=async event=>{try{self.postMessage({receipt:await verify(event.data)});}catch(error){self.postMessage({error:error.message||String(error)});}};
