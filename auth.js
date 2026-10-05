import {randomBytes,randomUUID,scrypt,createHash,timingSafeEqual} from 'node:crypto';
import {promisify} from 'node:util';
const derive=promisify(scrypt), options={N:32768,r:8,p:1,maxmem:64*1024*1024};
const digest=value=>createHash('sha256').update(value).digest('hex');
export function openAuth(db){
 db.exec(`CREATE TABLE IF NOT EXISTS accounts(id TEXT PRIMARY KEY,username TEXT UNIQUE NOT NULL,name TEXT NOT NULL,role TEXT NOT NULL CHECK(role IN ('administrator','educator','learner')),salt TEXT NOT NULL,password_hash TEXT NOT NULL,active INTEGER NOT NULL DEFAULT 1);
 CREATE TABLE IF NOT EXISTS sessions(token_hash TEXT PRIMARY KEY,user_id TEXT REFERENCES accounts(id),expires INTEGER NOT NULL);
 CREATE TABLE IF NOT EXISTS login_limits(username TEXT PRIMARY KEY,attempts INTEGER NOT NULL,until INTEGER NOT NULL);`);
 const dummySalt=randomBytes(16).toString('hex');
 return {
 async create({username,name,password,role}){
 if(typeof username!=='string'||! /^[a-z0-9._-]{3,64}$/.test(username)||typeof name!=='string'||!name.trim()||name.length>100||!['administrator','educator','learner'].includes(role)||typeof password!=='string'||password.length<12||password.length>256)throw Error('Use a valid username, name, role and password of 12–256 characters');
 const id=randomUUID(),salt=randomBytes(16).toString('hex'),hash=(await derive(password,salt,64,options)).toString('hex');
 db.prepare('INSERT INTO accounts(id,username,name,role,salt,password_hash) VALUES(?,?,?,?,?,?)').run(id,username,name,role,salt,hash);return id;
 },
 async login(username,password){
 if(typeof username!=='string'||typeof password!=='string'||username.length>64||password.length>256)throw Error('Invalid credentials');
 const now=Date.now();db.prepare('DELETE FROM login_limits WHERE until<?').run(now);
 const limit=db.prepare('SELECT * FROM login_limits WHERE username=?').get(username);if(limit?.attempts>=5)throw Error('Too many attempts. Try again in 15 minutes.');
 // Count before hashing, including concurrent requests.
 db.prepare('INSERT INTO login_limits VALUES(?,1,?) ON CONFLICT(username) DO UPDATE SET attempts=attempts+1').run(username,now+900000);
 const user=db.prepare('SELECT * FROM accounts WHERE username=? AND active=1').get(username);
 const candidate=await derive(password,user?.salt||dummySalt,64,options);
 if(!timingSafeEqual(candidate,Buffer.from(user?.password_hash||'00'.repeat(64),'hex'))||!user)throw Error('Invalid credentials');
 db.prepare('DELETE FROM login_limits WHERE username=?').run(username);
 const token=randomBytes(32).toString('hex');db.prepare('DELETE FROM sessions WHERE expires<=?').run(now);db.prepare('INSERT INTO sessions VALUES(?,?,?)').run(digest(token),user.id,now+8*3600000);return token;
 },
 user(token){if(typeof token!=='string'||! /^[a-f0-9]{64}$/.test(token))return null;return db.prepare('SELECT a.id,a.username,a.name,a.role FROM sessions s JOIN accounts a ON a.id=s.user_id WHERE s.token_hash=? AND s.expires>? AND a.active=1').get(digest(token),Date.now())||null;},
 logout(token){if(token)db.prepare('DELETE FROM sessions WHERE token_hash=?').run(digest(token));}
 };
}
