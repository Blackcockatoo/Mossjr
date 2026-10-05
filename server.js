import http from 'node:http';
import { mkdirSync,readFileSync } from 'node:fs';
import { openStore,areas } from './db.js';
import { openAuth } from './auth.js';
import {pathToFileURL} from 'node:url';
export function createServer(store){
const auth=openAuth(store.db);
const assets={'/':['public/index.html','text/html'],'/app.js':['public/app.js','text/javascript'],'/style.css':['public/style.css','text/css'],'/favicon.svg':['public/favicon.svg','image/svg+xml']};
const server=http.createServer(async(req,res)=>{
 res.setHeader('X-Content-Type-Options','nosniff');res.setHeader('Content-Security-Policy',"default-src 'self'; style-src 'self'; script-src 'self'; object-src 'none'; base-uri 'none'; frame-ancestors 'none'");
 if(!/^(127\.0\.0\.1|localhost)(:\d+)?$/.test(req.headers.host||'')){res.writeHead(403);return res.end('Local host required');}
 const url=new URL(req.url,'http://localhost');
 const token=req.headers.cookie?.split(';').map(c=>c.trim()).find(c=>c.startsWith('moss_session='))?.slice(13);
 const user=auth.user(token);
 const send=(code,data)=>{res.writeHead(code,{'Content-Type':'application/json','Cache-Control':'no-store'});res.end(JSON.stringify(data));};
 try{
 if(req.method==='GET'&&assets[url.pathname]){const [file,type]=assets[url.pathname];res.writeHead(200,{'Content-Type':type});return res.end(readFileSync(new URL(file,import.meta.url)));}
 if(req.method==='GET'&&url.pathname==='/api/me')return send(200,{user});
 if(req.method==='GET'&&url.pathname==='/api/records'){
 if(!user)return send(401,{error:'Sign in to view learning records'});
 if(user.role==='learner')return send(200,{areas:[],events:store.list().map(e=>({id:e.id,date:e.date,title:e.title,reflection:e.reflection})),audit:[]});
 return send(200,{areas,events:store.list(),audit:store.audit()});
 }
 if(req.method==='POST'){
 // Require same-origin browser requests; bind only to loopback until authenticated hosting is added.
 const origin=req.headers.origin;if(origin!==`http://${req.headers.host}`)return send(403,{error:'Same-origin request required'});
 if(!req.headers['content-type']?.startsWith('application/json'))return send(415,{error:'JSON required'});
 let body='';for await(const chunk of req){body+=chunk;if(Buffer.byteLength(body)>65536)return send(413,{error:'Request too large'});}const input=JSON.parse(body);
 if(url.pathname==='/api/login'){const session=await auth.login(input.username,input.password);res.setHeader('Set-Cookie',`moss_session=${session}; HttpOnly; SameSite=Strict; Path=/; Max-Age=28800`);return send(200,{ok:true});}
 if(url.pathname==='/api/logout'){auth.logout(token);res.setHeader('Set-Cookie','moss_session=; HttpOnly; SameSite=Strict; Path=/; Max-Age=0');return send(200,{ok:true});}
 if(!user)return send(401,{error:'Sign in to record learning'});
 if(!['administrator','educator'].includes(user.role))return send(403,{error:'Educator permission required'});
 const attribution=`${user.name} [${user.id}]`;
 if(url.pathname==='/api/events')return send(201,{id:store.create({...input,educator:attribution})});
 const match=url.pathname.match(/^\/api\/events\/([^/]+)\/evidence$/);if(match)return send(201,{id:store.addEvidence(match[1],{...input,actor:attribution})});
 }
 send(404,{error:'Not found'});
 }catch(e){send(400,{error:e.message});}
});
return server;
}
if(process.argv[1]&&import.meta.url===pathToFileURL(process.argv[1]).href){mkdirSync('data',{recursive:true});const server=createServer(openStore('data/mossjr.sqlite'));server.listen(Number(process.env.PORT||3000),'127.0.0.1',()=>console.log('Moss Gurukul local prototype: http://127.0.0.1:'+server.address().port));}
