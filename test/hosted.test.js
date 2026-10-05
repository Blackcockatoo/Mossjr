import {test} from 'node:test';
import http from 'node:http';
import assert from 'node:assert/strict';
import {mkdtempSync,rmSync} from 'node:fs';
import {tmpdir} from 'node:os';
import {join} from 'node:path';
import {createClient} from '@libsql/client';
import {adapter,openHostedStore} from '../hosted.js';
import {openStore} from '../db.js';
import {openAuth} from '../auth.js';
import {createServer} from '../server.js';
const event={title:'Deployment test',date:'2026-10-06',educator:'Test educator',minutes:10,location:'Home',intention:'Test',observation:'Test',areas:['Mathematics']};
test('libSQL adapter preserves events, evidence, audits and sessions across connections',async()=>{
 const dir=mkdtempSync(join(tmpdir(),'mossjr-'));const url=`file:${join(dir,'records.db')}`;
 const connect=()=>openStore(null,adapter(createClient({url})));
 let store=connect();
 try{
 const auth=openAuth(store.db);await auth.create({username:'parent',name:'Parent',role:'administrator',password:'adapter-test-password'});
 const token=await auth.login('parent','adapter-test-password');
 const ids=await Promise.all([store.create(event),store.create(event)]);
 await store.addEvidence(ids[0],{description:'Test',reference:'private/test',actor:'Parent'});
 await assert.rejects(store.db.exec('DELETE FROM audit'),/cannot be deleted/);
 // Force an audit failure and prove that the event insert rolls back too.
 await store.db.exec("CREATE TRIGGER audit_reject BEFORE INSERT ON audit BEGIN SELECT RAISE(ABORT,'test rollback'); END;");
 await assert.rejects(store.create(event),/test rollback/);
 await store.db.exec('DROP TRIGGER audit_reject');
 store.db.close();store=connect();
 assert.equal((await store.list()).length,2);assert.equal((await store.audit()).length,3);
 assert.equal((await store.list()).flatMap(e=>e.evidence).length,1);
 const reopened=openAuth(store.db);assert.equal((await reopened.user(token)).role,'administrator');await reopened.logout(token);assert.equal(await reopened.user(token),null);
 }finally{store.db.close();rmSync(dir,{recursive:true,force:true});}
});
test('hosted configuration rejects missing or local-only storage',async()=>{
 await assert.rejects(openHostedStore({}),/incomplete/);
 await assert.rejects(openHostedStore({TURSO_DATABASE_URL:'file:test.db',TURSO_AUTH_TOKEN:'test',MOSSJR_ORIGIN:'https://mossjr.vercel.app'}),/remote/);
});
test('HTTPS origin, host checks and Secure cookie are enforced',async t=>{
 const store=openStore(),auth=openAuth(store.db);await auth.create({username:'parent',name:'Parent',role:'administrator',password:'secure-test-password'});
 const server=createServer(store,{origin:'https://mossjr.vercel.app'});await new Promise(r=>server.listen(0,'127.0.0.1',r));t.after(async()=>{await new Promise(r=>server.close(r));store.db.close();});
 const base=`http://127.0.0.1:${server.address().port}`;
 const post=(origin,host='mossjr.vercel.app')=>new Promise((resolve,reject)=>{
 const req=http.request(base+'/api/login',{method:'POST',headers:{Host:host,Origin:origin,'Content-Type':'application/json'}},res=>{res.resume();res.on('end',()=>resolve({status:res.statusCode,headers:{get:key=>res.headers[key] instanceof Array?res.headers[key].join(','):res.headers[key]}}));});
 req.on('error',reject);req.end(JSON.stringify({username:'parent',password:'secure-test-password'}));
 });
 assert.equal((await post('https://evil.example')).status,403);
 assert.equal((await post('https://mossjr.vercel.app','evil.example')).status,403);
 assert.equal((await post('http://mossjr.vercel.app')).status,403);
 const response=await post('https://mossjr.vercel.app');assert.equal(response.status,200);assert.match(response.headers.get('set-cookie'),/; Secure/);assert.equal(response.headers.get('cache-control'),'no-store');
});
test('Vercel pre-parsed JSON supports login and transactional record creation',async()=>{
 const store=openStore(),auth=openAuth(store.db);
 await auth.create({username:'parent',name:'Parent',role:'administrator',password:'parsed-body-test-password'});
 const server=createServer(store,{origin:'https://mossjr.vercel.app'});
 const call=async(path,body,cookie)=>{
 const headers={};let status,text;
 const req={method:'POST',url:path,body,headers:{host:'mossjr.vercel.app',origin:'https://mossjr.vercel.app','content-type':'application/json',cookie},async *[Symbol.asyncIterator](){throw Error('The consumed request stream must not be read');}};
 const res={setHeader:(key,value)=>{headers[key]=value;},writeHead:(code,extra)=>{status=code;Object.assign(headers,extra);},end:value=>{text=value;}};
 await server.handler(req,res);return {status,headers,data:JSON.parse(text)};
 };
 try{
 const login=await call('/api/login',{username:'parent',password:'parsed-body-test-password'});assert.equal(login.status,200);
 const cookie=login.headers['Set-Cookie'].split(';')[0];
 assert.equal((await call('/api/events',event,cookie)).status,201);assert.equal((await store.audit()).length,1);
 assert.equal((await call('/api/login',{username:'parent',password:'incorrect'})).status,401);
 assert.equal((await call('/api/events',{...event,observation:'x'.repeat(65536)},cookie)).status,413);
 }finally{store.db.close();}
});
