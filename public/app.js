const $=s=>document.querySelector(s);let records;let currentUser;
function node(tag,text){const n=document.createElement(tag);n.textContent=text;return n;}
function card(title,body){const a=node('article','');a.append(node('h3',title),node('p',body));return a;}
async function request(path,body){const r=await fetch(path,body?{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify(body)}:{});const data=await r.json();if(!r.ok)throw Error(data.error);return data;}
function message(text){$('#status').textContent=text;}
async function load(){try{records=await request('/api/records');render();}catch(e){message(e.message);}}
function render(){
 $('#stats').replaceChildren(...[[records.events.length,'learning events'],[records.events.reduce((s,e)=>s+e.minutes,0),'recorded minutes'],[records.events.reduce((s,e)=>s+e.evidence.length,0),'evidence references']].map(([v,l])=>{const d=node('div',l);d.prepend(node('strong',v));return d;}));
 $('#areas').replaceChildren(...records.areas.map(a=>{const events=records.events.filter(e=>e.areas.includes(a));return card(a,`${events.length} recorded activities · ${events.reduce((s,e)=>s+e.evidence.length,0)} linked references`);}));
 $('#events').replaceChildren(...records.events.map(e=>{const a=card(e.title,`${e.date} · ${e.minutes} min · ${e.educator} · ${e.location}`);a.append(node('p',e.areas.join(' / ')),node('p',`Intention: ${e.intention}`),node('p',`Observation: ${e.observation}`));if(e.reflection)a.append(node('p',`Reflection: ${e.reflection}`));for(const item of e.evidence)a.append(node('p',`Evidence: ${item.description} — ${item.reference}`));const form=document.createElement('form');for(const [name,caption] of [['description','Evidence description'],['reference','File identifier or private storage reference']]){const label=node('label',caption),input=document.createElement('input');input.name=name;input.required=true;label.append(input);form.append(label);}const button=node('button','Add evidence reference');form.append(button);form.onsubmit=async ev=>{ev.preventDefault();button.disabled=true;try{await request(`/api/events/${e.id}/evidence`,Object.fromEntries(new FormData(form)));await load();message('Evidence reference recorded.');}catch(err){message(err.message);button.disabled=false;}};a.append(form);return a;}));
 if(!records.events.length)$('#events').append(card('A fresh beginning','Log your first real activity. No invented evidence or demonstration records.'));
 $('#history').replaceChildren(...records.audit.map(a=>card(`#${a.seq} · ${a.action}`,`${a.at} · ${a.actor} · Record ${a.entity_id}`)));
 $('#adventures').replaceChildren(...records.events.map(e=>card(e.title,e.reflection||e.observation)));
}
for(const b of document.querySelectorAll('[data-panel]'))b.onclick=()=>{for(const p of document.querySelectorAll('.panel'))p.hidden=p.id!==b.dataset.panel;for(const n of document.querySelectorAll('[data-panel]'))n.setAttribute('aria-pressed',String(n===b));};
$('#mode').onclick=()=>{const learner=$('#learner').hidden;$('#learner').hidden=!learner;$('#educator').hidden=learner;$('#mode').textContent=learner?'Open educator view':'Open learner view';};
$('#event-form').onsubmit=async e=>{e.preventDefault();const form=e.currentTarget,button=form.querySelector('button[type=submit]');button.disabled=true;const input=Object.fromEntries(new FormData(form));input.minutes=Number(input.minutes);input.areas=[...form.querySelectorAll('[name=area]:checked')].map(n=>n.value);delete input.area;try{await request('/api/events',input);form.reset();setDate();form.querySelector("[name=educator]").value=currentUser.name;await load();message('Learning event saved with audit entry.');}catch(err){message(err.message);}finally{button.disabled=false;}};
function download(content,type,name){const url=URL.createObjectURL(new Blob([content],{type}));const a=document.createElement('a');a.href=url;a.download=name;a.click();setTimeout(()=>URL.revokeObjectURL(url),1000);}
$('#export').onclick=()=>{if(records)download(JSON.stringify({format:'mossjr/1',exportedAt:new Date().toISOString(),...records},null,2),'application/json','mossjr-records.json');};
$('#csv').onclick=()=>{if(!records)return;const q=v=>'"'+String(v).replaceAll('"','""')+'"';const columns=['id','date','title','educator','minutes','location','intention','observation','reflection'];download([columns.join(','),...records.events.map(e=>columns.map(k=>q(/^[=+@\-\t\r]/.test(String(e[k]))?"'"+e[k]:e[k])).join(','))].join('\r\n'),'text/csv','mossjr-activities.csv');};
function setDate(){const d=new Date();$('#event-form [name=date]').value=`${d.getFullYear()}-${String(d.getMonth()+1).padStart(2,'0')}-${String(d.getDate()).padStart(2,'0')}`;}setDate();
async function initialize(){
 const {user}=await request('/api/me');currentUser=user;
 $('#agency-admin').hidden=user?.role!=='administrator';
 $('#agency-queue').replaceChildren();$('#agency-history').replaceChildren();
 if(user?.role==='administrator')await loadAgencies();
 $('#signin').hidden=!!user;$('#logout').hidden=!user;$('#mode').hidden=!user||user.role==='learner';
 $('#educator').hidden=!user||user.role==='learner';$('#learner').hidden=!user||user.role!=='learner';
 $('#mode').textContent='Open learner view';
 if(!user){records=null;for(const id of ['events','history','adventures','areas','stats','choices'])$('#'+id).replaceChildren();return;}
 $('#event-form [name=educator]').value=user.name;
 records=await request('/api/records');$('#choices').replaceChildren();
 for(const a of records.areas){const label=node('label',a),input=document.createElement('input');input.type='checkbox';input.name='area';input.value=a;label.prepend(input);$('#choices').append(label);}
 if(user.role==='learner'){$('#adventures').replaceChildren(...records.events.map(e=>card(e.title,e.reflection||'A recorded discovery')));return;}
 render();
}
$('#login-form').onsubmit=async e=>{e.preventDefault();const form=e.currentTarget,button=form.querySelector('button');button.disabled=true;try{await request('/api/login',Object.fromEntries(new FormData(form)));form.reset();await initialize();message('Signed in.');}catch(err){message(err.message);}finally{button.disabled=false;}};
$('#logout').onclick=async()=>{try{await request('/api/logout',{});await initialize();message('Signed out.');}catch(e){message(e.message);}};
initialize().catch(e=>message(e.message));

async function loadAgencies(){
 const data=await request('/api/agency-requests');
 $('#agency-queue').replaceChildren(...data.requests.map(r=>{const a=card(r.name,`${r.agency} · ${r.role}`);a.append(node('p',`Work email (unverified): ${r.email}`),node('p',r.purpose),node('p',`${r.created_at} · ${r.status} · No access granted`));if(r.status==='pending')for(const [decision,label] of [['approved_for_followup','Approve for follow-up only'],['declined','Decline request']]){const b=node('button',label);b.onclick=async()=>{b.disabled=true;try{await request(`/api/agency-requests/${r.id}/review`,{decision});await loadAgencies();message('Review recorded. No account or record access granted.');}catch(e){message(e.message);b.disabled=false;}};a.append(b);}return a;}));
 if(!data.requests.length)$('#agency-queue').append(node('p','No external requests.'));
 $('#agency-history').replaceChildren(...data.reviews.map(r=>card(r.decision,`${r.at} · ${r.actor} · Request ${r.request_id}`)));
}
$('#refresh-agencies').onclick=()=>loadAgencies().catch(e=>message(e.message));
$('#agency-form').onsubmit=async e=>{e.preventDefault();const form=e.currentTarget,b=form.querySelector('button');b.disabled=true;try{const input=Object.fromEntries(new FormData(form));input.acknowledge=form.elements.acknowledge.checked;const result=await request('/api/agency-requests',input);form.reset();$('#agency-status').textContent=`Request ${result.id} received. Pending review; email unverified; no access granted. Keep this reference. No email has been sent.`;if(currentUser?.role==='administrator')await loadAgencies();}catch(err){$('#agency-status').textContent=err.message;}finally{b.disabled=false;}};
