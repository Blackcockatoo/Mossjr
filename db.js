import { DatabaseSync } from 'node:sqlite';
import { randomUUID } from 'node:crypto';
export const areas = ['English','Mathematics','Science','Humanities','Arts','Languages','Health & PE','Technologies'];
export function openStore(path=':memory:', connection=null) {
 const db=connection||new DatabaseSync(path); const ready=Promise.resolve(db.exec(`PRAGMA foreign_keys=ON;
 CREATE TABLE IF NOT EXISTS learning_events(id TEXT PRIMARY KEY,date TEXT NOT NULL,title TEXT NOT NULL,educator TEXT NOT NULL,minutes INTEGER NOT NULL CHECK(minutes>0),location TEXT NOT NULL,intention TEXT NOT NULL,observation TEXT NOT NULL,reflection TEXT NOT NULL,created_at TEXT NOT NULL);
 CREATE TABLE IF NOT EXISTS event_areas(event_id TEXT REFERENCES learning_events(id),area TEXT NOT NULL,PRIMARY KEY(event_id,area));
 CREATE TABLE IF NOT EXISTS evidence(id TEXT PRIMARY KEY,event_id TEXT NOT NULL REFERENCES learning_events(id),description TEXT NOT NULL,reference TEXT NOT NULL,created_at TEXT NOT NULL);
 CREATE TABLE IF NOT EXISTS audit(seq INTEGER PRIMARY KEY AUTOINCREMENT,entity_id TEXT NOT NULL,action TEXT NOT NULL,actor TEXT NOT NULL,at TEXT NOT NULL,payload TEXT NOT NULL);
 CREATE TRIGGER IF NOT EXISTS audit_no_update BEFORE UPDATE ON audit BEGIN SELECT RAISE(ABORT,'Audit entries cannot be edited'); END;
 CREATE TRIGGER IF NOT EXISTS audit_no_delete BEFORE DELETE ON audit BEGIN SELECT RAISE(ABORT,'Audit entries cannot be deleted'); END;`));
 async function append(db,id,action,actor,payload){await db.prepare('INSERT INTO audit(entity_id,action,actor,at,payload) VALUES(?,?,?,?,?)').run(id,action,actor,new Date().toISOString(),JSON.stringify(payload));}
 let pending=Promise.resolve();
 function transaction(fn){const task=pending.then(()=>runTransaction(fn));pending=task.catch(()=>{});return task;}
 async function runTransaction(fn){
 if(connection){const tx=await db.transaction();try{const result=await fn(tx);await tx.commit();return result;}catch(e){await tx.rollback();throw e;}finally{tx.close();}}
 db.exec('BEGIN IMMEDIATE');try{const result=await fn(db);db.exec('COMMIT');return result;}catch(e){db.exec('ROLLBACK');throw e;}
 }
 return {db,transaction,
 async list(){await ready;const events=await db.prepare('SELECT * FROM learning_events ORDER BY date DESC,created_at DESC').all();return Promise.all(events.map(async e=>({...e,areas:(await db.prepare('SELECT area FROM event_areas WHERE event_id=?').all(e.id)).map(a=>a.area),evidence:await db.prepare('SELECT * FROM evidence WHERE event_id=?').all(e.id)})));},
 async audit(){await ready;return db.prepare('SELECT * FROM audit ORDER BY seq DESC').all();},
 async create(input){await ready;
 const fields=['title','educator','location','intention','observation'];
 for(const field of fields)if(typeof input[field]!=='string'||!input[field].trim()||input[field].length>5000)throw Error(`Invalid ${field}`);
 if(!/^\d{4}-\d{2}-\d{2}$/.test(input.date)||Number.isNaN(Date.parse(input.date))||new Date(input.date).toISOString().slice(0,10)!==input.date)throw Error('Invalid date');
 if(!Number.isInteger(input.minutes)||input.minutes<1||input.minutes>1440)throw Error('Minutes must be 1–1440');
 if(!Array.isArray(input.areas)||!input.areas.length||input.areas.some(a=>!areas.includes(a)))throw Error('Select valid learning areas');
 if(input.reflection!==undefined&&(typeof input.reflection!=='string'||input.reflection.length>5000))throw Error('Invalid reflection');
 return transaction(async db=>{const id=randomUUID(),at=new Date().toISOString();await db.prepare('INSERT INTO learning_events VALUES(?,?,?,?,?,?,?,?,?,?)').run(id,input.date,input.title,input.educator,input.minutes,input.location,input.intention,input.observation,input.reflection||'',at);for(const a of new Set(input.areas))await db.prepare('INSERT INTO event_areas VALUES(?,?)').run(id,a);await append(db,id,'learning_event.created',input.educator,input);return id;});
 },
 async addEvidence(id,input){await ready;if(!await db.prepare('SELECT id FROM learning_events WHERE id=?').get(id))throw Error('Learning event not found');for(const f of ['description','reference','actor'])if(typeof input[f]!=='string'||!input[f].trim()||input[f].length>5000)throw Error(`Invalid ${f}`);return transaction(async db=>{const evidenceId=randomUUID();await db.prepare('INSERT INTO evidence VALUES(?,?,?,?,?)').run(evidenceId,id,input.description,input.reference,new Date().toISOString());await append(db,id,'evidence.referenced',input.actor,{evidenceId,...input});return evidenceId;});}
 };
}
