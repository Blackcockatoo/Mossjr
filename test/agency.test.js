import {test} from 'node:test';import assert from 'node:assert/strict';import {openStore} from '../db.js';import {openAuth} from '../auth.js';import {createServer} from '../server.js';
test('agency intake is private, bounded, audited and never grants record access',async t=>{
 const store=openStore(),auth=openAuth(store.db);for(const role of ['administrator','educator'])await auth.create({username:role,name:role,role,password:'test-password-long'});
 const server=createServer(store);await new Promise(r=>server.listen(0,'127.0.0.1',r));t.after(async()=>{await new Promise(r=>server.close(r));store.db.close();});
 const base=`http://127.0.0.1:${server.address().port}`;const post=(path,body,cookie,origin=base)=>fetch(base+path,{method:'POST',headers:{Origin:origin,'Content-Type':'application/json',...(cookie?{Cookie:cookie}:{})},body:JSON.stringify(body)});
 const input={name:'Test worker',agency:'Example agency',email:'worker@example.org',role:'Reviewer',purpose:'Selected curriculum records',acknowledge:true};
 assert.equal((await post('/api/agency-requests',input,null,'https://evil.example')).status,403);
 assert.equal((await post('/api/agency-requests',{...input,acknowledge:false})).status,422);
 const response=await post('/api/agency-requests',input);assert.equal(response.status,201);const result=await response.json();assert.equal(result.accessGranted,false);assert.equal(result.emailVerified,false);
 assert.equal((await fetch(base+'/api/agency-requests')).status,403);assert.equal((await fetch(base+'/api/records')).status,401);
 const login=async username=>(await post('/api/login',{username,password:'test-password-long'})).headers.get('set-cookie').split(';')[0];const educator=await login('educator'),admin=await login('administrator');
 assert.equal((await fetch(base+'/api/agency-requests',{headers:{Cookie:educator}})).status,403);
 assert.equal((await post(`/api/agency-requests/${result.id}/review`,{decision:'approved_for_followup'},educator)).status,403);
 assert.equal((await post(`/api/agency-requests/${result.id}/review`,{decision:'approved_for_followup'},admin)).status,200);
 assert.equal((await post(`/api/agency-requests/${result.id}/review`,{decision:'declined'},admin)).status,409);
 const queue=await (await fetch(base+'/api/agency-requests',{headers:{Cookie:admin}})).json();assert.equal(queue.requests[0].status,'approved_for_followup');assert.equal(queue.reviews.length,1);
 assert.equal(store.db.prepare('SELECT COUNT(*) AS n FROM accounts').get().n,2);assert.equal((await store.audit()).length,0);assert.throws(()=>store.db.exec('DELETE FROM agency_reviews'),/cannot be deleted/);
 await post('/api/agency-requests',input);await post('/api/agency-requests',input);assert.equal((await post('/api/agency-requests',input)).status,429);
});
