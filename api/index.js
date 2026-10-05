import {openHostedStore} from '../hosted.js';
import {createServer} from '../server.js';
let application;
export default async function handler(req,res){
 try{
 application ||= openHostedStore().then(store=>createServer(store,{origin:process.env.MOSSJR_ORIGIN}).handler).catch(e=>{application=null;throw e;});
 await (await application)(req,res);
 }catch{
 res.writeHead(503,{'Content-Type':'application/json','Cache-Control':'no-store'});
 res.end(JSON.stringify({error:'MossJr is awaiting secure hosted configuration. Learning records are unavailable.'}));
 }
}
