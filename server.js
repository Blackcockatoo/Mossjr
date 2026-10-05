import http from 'node:http';
import { mkdirSync,readFileSync } from 'node:fs';
import { openStore,areas } from './db.js';
import { openAuth } from './auth.js';
import {pathToFileURL} from 'node:url';
export async function readJSON(req){
 if(Number(req.headers['content-length'])>65536)throw Object.assign(Error('Request too large'),{status:413});
 let body=req.body;
 if(body===undefined){
 const chunks=[];let size=0;
 for await(const chunk of req){const bytes=Buffer.from(chunk);size+=bytes.length;if(size>65536)throw Object.assign(Error('Request too large'),{status:413});chunks.push(bytes);}
 body=Buffer.concat(chunks).toString('utf8');
 }
 if(Buffer.isBuffer(body))body=body.toString('utf8');
 if(typeof body==='string'){if(Buffer.byteLength(body)>65536)throw Object.assign(Error('Request too large'),{status:413});body=JSON.parse(body);}
 if(!body||typeof body!=='object'||Array.isArray(body))throw Error('JSON object required');
 if(Buffer.byteLength(JSON.stringify(body))>65536)throw Object.assign(Error('Request too large'),{status:413});
 return body;
}
export function createServer(store,{origin=null}={}){
if(origin&&new URL(origin).origin!==origin)throw Error("Use an exact origin");
if(origin&&!origin.startsWith("https://"))throw Error("Hosted origin requires HTTPS");
const auth=openAuth(store.db);
const assets={'/':['public/index.html','text/html'],'/app.js':['public/app.js','text/javascript'],'/style.css':['public/style.css','text/css'],'/favicon.svg':['public/favicon.svg','image/svg+xml']};
const handler=async(req,res)=>{
 res.setHeader('X-Content-Type-Options','nosniff');res.setHeader('Content-Security-Policy',"default-src 'self'; style-src 'self'; script-src 'self'; object-src 'none'; base-uri 'none'; frame-ancestors 'none'");
 if(!origin&&!/^(127\.0\.0\.1|localhost)(:\d+)?$/.test(req.headers.host||'')){res.writeHead(403);return res.end('Local host required');}
 const expectedOrigin=origin||`http://${req.headers.host}`;
 if(origin&&req.headers.host!==new URL(origin).host){res.writeHead(403);return res.end('Untrusted host');}
 if(origin)res.setHeader('Strict-Transport-Security','max-age=31536000');
 res.setHeader('Cache-Control','no-store');
 const url=new URL(req.url,expectedOrigin);
 const token=req.headers.cookie?.split(';').map(c=>c.trim()).find(c=>c.startsWith('moss_session='))?.slice(13);
 let user;
 const send=(code,data)=>{res.writeHead(code,{'Content-Type':'application/json','Cache-Control':'no-store'});res.end(JSON.stringify(data));};
 try{
 user=await auth.user(token);
 if(req.method==='GET'&&assets[url.pathname]){const [file,type]=assets[url.pathname];res.writeHead(200,{'Content-Type':type});return res.end(readFileSync(new URL(file,import.meta.url)));}
 if(req.method==='GET'&&url.pathname==='/api/me')return send(200,{user});
 if(req.method==='GET'&&url.pathname==='/api/records'){
 if(!user)return send(401,{error:'Sign in to view learning records'});
 if(user.role==='learner')return send(200,{areas:[],events:(await store.list()).map(e=>({id:e.id,date:e.date,title:e.title,reflection:e.reflection})),audit:[]});
 return send(200,{areas,events:await store.list(),audit:await store.audit()});
 }
 if(req.method==='POST'){
 // Compare against the configured HTTPS origin, never forwarded host headers.
 const requestOrigin=req.headers.origin;if(requestOrigin!==expectedOrigin)return send(403,{error:'Same-origin request required'});
 if(!req.headers['content-type']?.startsWith('application/json'))return send(415,{error:'JSON required'});
 const input=await readJSON(req);
 if(url.pathname==='/api/login'){const session=await auth.login(input.username,input.password);res.setHeader('Set-Cookie',`moss_session=${session}; HttpOnly; SameSite=Strict; Path=/; Max-Age=28800${origin?'; Secure':''}`);return send(200,{ok:true});}
 if(url.pathname==='/api/logout'){await auth.logout(token);res.setHeader('Set-Cookie',`moss_session=; HttpOnly; SameSite=Strict; Path=/; Max-Age=0${origin?'; Secure':''}`);return send(200,{ok:true});}
 if(!user)return send(401,{error:'Sign in to record learning'});
 if(!['administrator','educator'].includes(user.role))return send(403,{error:'Educator permission required'});
 const attribution=`${user.name} [${user.id}]`;
 if(url.pathname==='/api/events')return send(201,{id:await store.create({...input,educator:attribution})});
 const match=url.pathname.match(/^\/api\/events\/([^/]+)\/evidence$/);if(match)return send(201,{id:await store.addEvidence(match[1],{...input,actor:attribution})});
 }
 send(404,{error:'Not found'});
 }catch(e){
 const credentialError=e.message==='Invalid credentials';
 const throttleError=e.message==='Too many attempts. Try again in 15 minutes.';
 send(e.status===413?413:credentialError?401:throttleError?429:400,{error:!origin||credentialError||throttleError||e.status===413?e.message:'Request could not be completed'});
 }
};
const server=http.createServer(handler);server.handler=handler;return server;
}
if(process.argv[1]&&import.meta.url===pathToFileURL(process.argv[1]).href){mkdirSync('data',{recursive:true});const store=process.env.VERCEL?await (await import('./hosted.js')).openHostedStore():openStore('data/mossjr.sqlite');const server=createServer(store,{origin:process.env.VERCEL?process.env.MOSSJR_ORIGIN:null});server.listen(Number(process.env.PORT||3000),'127.0.0.1',()=>console.log('Moss Gurukul local prototype: http://127.0.0.1:'+server.address().port));}
