import http from 'node:http';
import { mkdirSync,readFileSync } from 'node:fs';
import { openStore,areas } from './db.js';
mkdirSync('data',{recursive:true}); const store=openStore('data/mossjr.sqlite');
const assets={'/':['public/index.html','text/html'],'/app.js':['public/app.js','text/javascript'],'/style.css':['public/style.css','text/css'],'/favicon.svg':['public/favicon.svg','image/svg+xml']};
const server=http.createServer(async(req,res)=>{
 res.setHeader('X-Content-Type-Options','nosniff');res.setHeader('Content-Security-Policy',"default-src 'self'; style-src 'self'; script-src 'self'; object-src 'none'; base-uri 'none'; frame-ancestors 'none'");
 const url=new URL(req.url,'http://localhost');
 const send=(code,data)=>{res.writeHead(code,{'Content-Type':'application/json','Cache-Control':'no-store'});res.end(JSON.stringify(data));};
 try{
 if(req.method==='GET'&&assets[url.pathname]){const [file,type]=assets[url.pathname];res.writeHead(200,{'Content-Type':type});return res.end(readFileSync(new URL(file,import.meta.url)));}
 if(req.method==='GET'&&url.pathname==='/api/records')return send(200,{areas,events:store.list(),audit:store.audit()});
 if(req.method==='POST'){
 // Require same-origin browser requests; bind only to loopback until authenticated hosting is added.
 const origin=req.headers.origin;if(origin!==`http://${req.headers.host}`)return send(403,{error:'Same-origin request required'});
 if(!req.headers['content-type']?.startsWith('application/json'))return send(415,{error:'JSON required'});
 let body='';for await(const chunk of req){body+=chunk;if(Buffer.byteLength(body)>65536)return send(413,{error:'Request too large'});}const input=JSON.parse(body);
 if(url.pathname==='/api/events')return send(201,{id:store.create(input)});
 const match=url.pathname.match(/^\/api\/events\/([^/]+)\/evidence$/);if(match)return send(201,{id:store.addEvidence(match[1],input)});
 }
 send(404,{error:'Not found'});
 }catch(e){send(400,{error:e.message});}
});
server.listen(Number(process.env.PORT||3000),'127.0.0.1',()=>console.log('Moss Gurukul local prototype: http://127.0.0.1:'+server.address().port));
