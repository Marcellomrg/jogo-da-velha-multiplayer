import {createServer} from 'node:http';
import {readFile} from 'node:fs/promises';
import path from 'node:path';
const root=path.resolve('dist');
const types={'.html':'text/html; charset=utf-8','.js':'text/javascript; charset=utf-8','.css':'text/css; charset=utf-8','.json':'application/json'};
createServer(async (req,res)=>{
  try{
    const url=new URL(req.url,'http://localhost');
    const file=path.resolve(root,'.'+decodeURIComponent(url.pathname === '/' ? '/index.html':url.pathname));
    if(!file.startsWith(root+path.sep)){res.writeHead(404).end();return;}
    const data=await readFile(file);
    res.writeHead(200,{'Content-Type':types[path.extname(file)] || 'application/octet-stream','X-Content-Type-Options':'nosniff'}).end(data);
  }catch{res.writeHead(404).end('Não encontrado');}
}).listen(Number(process.env.PORT || 5173),'0.0.0.0');
