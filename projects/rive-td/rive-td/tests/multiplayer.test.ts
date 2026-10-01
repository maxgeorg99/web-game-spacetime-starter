import { test,expect } from 'bun:test';
import { DbConnection } from '../src/module_bindings';
import type { State } from '../shared/game';
const uri=process.env.TEST_SPACETIME_URI??'ws://127.0.0.1:3000';
const database=process.env.TEST_SPACETIME_DB??'rive-td';
async function waitFor(predicate:()=>boolean,ms=5000){const end=Date.now()+ms;while(!predicate()){if(Date.now()>end)throw Error('Timed out waiting for subscription state');await Bun.sleep(25);}}
function connect(token?:string):Promise<{conn:DbConnection;token:string}>{return new Promise((resolve,reject)=>{const timeout=setTimeout(()=>reject(Error('Connection timed out')),5000);DbConnection.builder().withUri(uri).withDatabaseName(database).withToken(token).onConnect((conn,_identity,token)=>{clearTimeout(timeout);resolve({conn,token});}).onConnectError((_ctx,error)=>{clearTimeout(timeout);reject(error);}).build();});}
async function join(conn:DbConnection,code:string,name:string){await conn.reducers.join({code,name});await new Promise<void>((resolve,reject)=>conn.subscriptionBuilder().onApplied(()=>resolve()).onError(ctx=>reject(ctx.event)).subscribe([`SELECT * FROM room WHERE code = '${code}'`,`SELECT * FROM member WHERE room = '${code}'`]));}
test('two clients share purchases, combat, late joins and reconnect state',async()=>{
 const code='T'+Date.now().toString(36).toUpperCase();const a=await connect(),b=await connect(),outsider=await connect();let c:Awaited<ReturnType<typeof connect>>|undefined;
 try{
  await join(a.conn,code,'Alice');await join(b.conn,code,'Bob');await waitFor(()=>a.conn.db.room.code.find(code)?.players===2);
  const row=()=>a.conn.db.room.code.find(code)!;const state=()=>JSON.parse(row().state) as State;
  await expect(outsider.conn.reducers.command({action:'build',pad:0,kind:0,revision:0})).rejects.toThrow();
  const results=await Promise.allSettled([a.conn.reducers.command({action:'build',pad:0,kind:0,revision:0}),b.conn.reducers.command({action:'build',pad:0,kind:0,revision:0})]);
  expect(results.filter(r=>r.status==='fulfilled')).toHaveLength(1);
  await waitFor(()=>state().towers.length===1&&b.conn.db.room.code.find(code)?.snapshot===row().snapshot);expect(state().gold).toBe(200);
  await b.conn.reducers.command({action:'build',pad:1,kind:3,revision:row().revision});await waitFor(()=>state().towers.length===2);expect(state().gold).toBe(80);
  await expect(a.conn.reducers.command({action:'build',pad:2,kind:1,revision:row().revision})).rejects.toThrow();
  await expect(a.conn.reducers.command({action:'restart',pad:0,kind:0,revision:row().revision})).rejects.toThrow();
  await a.conn.reducers.command({action:'start',pad:0,kind:0,revision:row().revision});
  await waitFor(()=>state().spawned>=2);expect(state().wave).toBe(1);
  c=await connect();await join(c.conn,code,'Late join');await waitFor(()=>c!.conn.db.room.code.find(code)!.revision>=row().revision);
  expect(JSON.parse(c.conn.db.room.code.find(code)!.state).towers).toHaveLength(2);
  b.conn.disconnect();await waitFor(()=>row().players===2);const reconnect=await connect(b.token);b.conn=reconnect.conn;await join(b.conn,code,'Bob');await waitFor(()=>row().players===3);
  expect(JSON.parse(b.conn.db.room.code.find(code)!.state).wave).toBe(1);
  a.conn.disconnect();b.conn.disconnect();c.conn.disconnect();c=undefined;
  await join(outsider.conn,code+'X','Watcher');
  // A read-only subscription observes a vacated room without joining it.
  await new Promise<void>(resolve=>outsider.conn.subscriptionBuilder().onApplied(()=>resolve()).subscribe(`SELECT * FROM room WHERE code = '${code}'`));
  await waitFor(()=>outsider.conn.db.room.code.find(code)?.players===0);
  const paused=outsider.conn.db.room.code.find(code)!.revision;await Bun.sleep(350);expect(outsider.conn.db.room.code.find(code)!.revision).toBe(paused);
 }finally{a.conn.disconnect();b.conn.disconnect();c?.conn.disconnect();outsider.conn.disconnect();}
},20000);
