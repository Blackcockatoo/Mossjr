import {createClient} from '@libsql/client';
import {openStore} from './db.js';
import {openAuth} from './auth.js';
export function adapter(client){return {
 exec:sql=>client.executeMultiple(sql),
 prepare(sql){return {run:(...args)=>client.execute({sql,args}),get:async(...args)=>(await client.execute({sql,args})).rows[0],all:async(...args)=>(await client.execute({sql,args})).rows};},
 transaction:async()=>adapter(await client.transaction('write')),
 commit:()=>client.commit(),rollback:()=>client.rollback(),close:()=>client.close()
};}
export async function openHostedStore(env=process.env){
 if(!env.TURSO_DATABASE_URL||!env.TURSO_AUTH_TOKEN||!env.MOSSJR_ORIGIN)throw Error('Hosted configuration incomplete');
 if(!/^(libsql|https):\/\//.test(env.TURSO_DATABASE_URL))throw Error('A remote database is required');
 const client=createClient({url:env.TURSO_DATABASE_URL,authToken:env.TURSO_AUTH_TOKEN});
 const store=openStore(null,adapter(client));await store.list();
 const auth=openAuth(store.db);await auth.user(null);
 if(env.MOSSJR_ADMIN_USERNAME&&env.MOSSJR_ADMIN_PASSWORD){
 const exists=await store.db.prepare('SELECT id FROM accounts WHERE username=?').get(env.MOSSJR_ADMIN_USERNAME);
 if(!exists){try{await auth.create({username:env.MOSSJR_ADMIN_USERNAME,name:'Parent educator',password:env.MOSSJR_ADMIN_PASSWORD,role:'administrator'});}catch(e){if(!(await store.db.prepare('SELECT id FROM accounts WHERE username=?').get(env.MOSSJR_ADMIN_USERNAME)))throw e;}}
 }
 return store;
}
