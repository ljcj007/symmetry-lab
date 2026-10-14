import http from 'node:http';
import fs from 'node:fs';
import path from 'node:path';
import {fileURLToPath} from 'node:url';
import {spawn} from 'node:child_process';
const root=fileURLToPath(new URL('../dist/',import.meta.url));
const port=Number(process.env.PORT||4318);
const types={'.html':'text/html; charset=utf-8','.js':'application/javascript; charset=utf-8','.css':'text/css; charset=utf-8','.json':'application/json; charset=utf-8','.svg':'image/svg+xml','.txt':'text/plain; charset=utf-8'};
http.createServer((req,res)=>{try{const name=decodeURIComponent(new URL(req.url,'http://localhost').pathname);const file=path.resolve(root,'.'+(name==='/'?'/index.html':name));if(!file.startsWith(root)||!fs.existsSync(file)||!fs.statSync(file).isFile()){res.writeHead(404);res.end('Not found');return;}res.writeHead(200,{'Content-Type':types[path.extname(file)]||'application/octet-stream','X-Content-Type-Options':'nosniff','Cache-Control':'no-cache'});fs.createReadStream(file).pipe(res);}catch{res.writeHead(400);res.end('Bad request');}}).on('error',error=>{console.error(error.code==='EADDRINUSE'?`Port ${port} is already in use. If Symmetry Lab is running, open http://127.0.0.1:${port}. Otherwise set PORT to another port.`:error.message);process.exitCode=1;}).listen(port,'127.0.0.1',()=>{const url=`http://127.0.0.1:${port}`;console.log(`Local: ${url}\nClose this window or press Ctrl+C to stop the static file server.`);if(process.argv.includes('--open')&&process.platform==='win32')spawn('powershell.exe',['-NoProfile','-Command',`Start-Process '${url}'`],{windowsHide:true,stdio:'ignore'});});
