import {randomUUID} from 'node:crypto';
export function openAgency(store){
 const ready=Promise.resolve(store.db.exec(`CREATE TABLE IF NOT EXISTS agency_requests(id TEXT PRIMARY KEY,name TEXT NOT NULL,agency TEXT NOT NULL,email TEXT NOT NULL,role TEXT NOT NULL,purpose TEXT NOT NULL,status TEXT NOT NULL DEFAULT 'pending',created_at TEXT NOT NULL);
 CREATE TABLE IF NOT EXISTS agency_reviews(seq INTEGER PRIMARY KEY AUTOINCREMENT,request_id TEXT NOT NULL,decision TEXT NOT NULL,actor TEXT NOT NULL,at TEXT NOT NULL);
 CREATE TRIGGER IF NOT EXISTS agency_reviews_no_update BEFORE UPDATE ON agency_reviews BEGIN SELECT RAISE(ABORT,'Review history cannot be edited'); END;
 CREATE TRIGGER IF NOT EXISTS agency_reviews_no_delete BEFORE DELETE ON agency_reviews BEGIN SELECT RAISE(ABORT,'Review history cannot be deleted'); END;`));
 return {
 async submit(input){await ready;const limits={name:100,agency:150,email:254,role:150,purpose:1000};const value={};
 for(const [key,max] of Object.entries(limits)){if(typeof input[key]!=='string'||!input[key].trim()||input[key].length>max)throw Object.assign(Error('Complete all fields within the stated limits'),{status:422});value[key]=input[key].trim();}
 value.email=value.email.toLowerCase();if(!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(value.email)||input.acknowledge!==true)throw Object.assign(Error('Use a valid work email and acknowledge the access conditions'),{status:422});
 return store.transaction(async db=>{const since=new Date(Date.now()-86400000).toISOString();const count=await db.prepare('SELECT COUNT(*) AS n FROM agency_requests WHERE email=? AND created_at>?').get(value.email,since);const total=await db.prepare('SELECT COUNT(*) AS n FROM agency_requests WHERE created_at>?').get(since);
 if(count.n>=3||total.n>=100)throw Object.assign(Error('Request limit reached. Please try again tomorrow'),{status:429});const id=randomUUID();await db.prepare('INSERT INTO agency_requests(id,name,agency,email,role,purpose,created_at) VALUES(?,?,?,?,?,?,?)').run(id,value.name,value.agency,value.email,value.role,value.purpose,new Date().toISOString());return id;});
 },
 async list(){await ready;return {requests:await store.db.prepare('SELECT * FROM agency_requests ORDER BY created_at DESC').all(),reviews:await store.db.prepare('SELECT * FROM agency_reviews ORDER BY seq DESC').all()};},
 async review(id,decision,actor){await ready;if(!['approved_for_followup','declined'].includes(decision))throw Object.assign(Error('Invalid decision'),{status:422});return store.transaction(async db=>{const row=await db.prepare('SELECT status FROM agency_requests WHERE id=?').get(id);if(!row)throw Object.assign(Error('Request not found'),{status:404});if(row.status!=='pending')throw Object.assign(Error('Request already reviewed'),{status:409});await db.prepare('UPDATE agency_requests SET status=? WHERE id=?').run(decision,id);await db.prepare('INSERT INTO agency_reviews(request_id,decision,actor,at) VALUES(?,?,?,?)').run(id,decision,actor,new Date().toISOString());});}
 };
}
