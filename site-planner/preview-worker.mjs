import http from 'node:http';
import worker from './worker/index.mjs';
// Local test fixtures only. This module never uses or modifies the hosted database.
import {env} from './check-accounts.mjs';
http.createServer(async(req,res)=>{
  try{
    const chunks=[];for await(const chunk of req)chunks.push(chunk);
    const body=Buffer.concat(chunks);
    const request=new Request('http://127.0.0.1:4174'+req.url,{method:req.method,headers:req.headers,...(body.length?{body}:{} )});
    const response=await worker.fetch(request,env);res.statusCode=response.status;
    for(const [key,value]of response.headers)if(key!=='set-cookie')res.setHeader(key,value);
    if(response.headers.getSetCookie().length)res.setHeader('Set-Cookie',response.headers.getSetCookie());
    res.end(Buffer.from(await response.arrayBuffer()));
  }catch{res.statusCode=500;res.end('Preview error');}
}).listen(4174,'127.0.0.1',()=>console.log('Local: http://127.0.0.1:4174'));
