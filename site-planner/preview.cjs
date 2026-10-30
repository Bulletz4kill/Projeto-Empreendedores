const http=require('http');
const fs=require('fs');
const path=require('path');
const root=path.join(__dirname,'dist');
http.createServer((req,res)=>{
  const pathname=new URL(req.url,'http://localhost').pathname;
  const name=pathname==='/'?'index.html':pathname.replace(/^\//,'');
  const target=path.resolve(root,name);
  if(!target.startsWith(root+path.sep)){res.writeHead(403);return res.end();}
  fs.readFile(target,(error,data)=>{
    if(error){res.writeHead(404);return res.end('Not found');}
    res.setHeader('Content-Type',({'html':'text/html; charset=utf-8','js':'text/javascript; charset=utf-8','css':'text/css; charset=utf-8'})[path.extname(target).slice(1)]||'application/octet-stream');res.end(data);
  });
}).listen(4173,'127.0.0.1',()=>console.log('Local: http://127.0.0.1:4173'));
