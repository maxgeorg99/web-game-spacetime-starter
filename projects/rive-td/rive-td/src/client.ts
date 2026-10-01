import { Rive, Layout, Fit, Alignment, RuntimeLoader } from '@rive-app/webgl2';
import { assetUrl, saved, save, type GameConfig } from './config';
import { connectionHealth } from './connection-health';
import { DbConnection } from './module_bindings';
const element=<T extends HTMLElement>(id:string)=>document.getElementById(id) as T;
const form=element<HTMLFormElement>('join'),status=element('status'),roster=element('roster'),canvas=element<HTMLCanvasElement>('game'),button=element<HTMLButtonElement>('connect'),retry=element<HTMLButtonElement>('retry');
const config=await fetch(assetUrl('config.json')).then(r=>{if(!r.ok)throw Error('Game configuration could not be loaded.');return r.json();}) as GameConfig;
const params=new URLSearchParams(location.search);element<HTMLInputElement>('room').value=params.get('room')??'KEEP';element<HTMLInputElement>('name').value=saved('keep-name')??'Defender';
let conn:DbConnection|undefined,rive:Rive|undefined,room='',name='',ready=false,revision=0,generation=0,retryTimer:ReturnType<typeof setTimeout>|undefined;
function message(text:string){status.textContent=text;}
function showError(error:unknown){message(error instanceof Error?error.message:String(error));}
function setReady(value:boolean){ready=value;canvas.style.pointerEvents=value?'auto':'none';canvas.setAttribute('aria-disabled',String(!value));}
function refresh(){
 if(!conn)return;const row=conn.db.room.code.find(room);if(!row)return;revision=row.revision;
 const vm=rive?.viewModelInstance,p=vm?.string('snapshot');if(p)p.value=row.snapshot;
 roster.textContent=`Room ${room} · ${row.players}/8 players · `+[...conn.db.member.iter()].filter(m=>m.room===room).map(m=>m.name).join(', ');
}
async function loadRive(){
 if(rive)return;if(!config.riveReady)throw Error('The Rive scene needs signing. Run ~/.rive/bin/rive login, then bun run rive:sign and reload.');
 RuntimeLoader.setWasmUrl(assetUrl('rive.wasm'));
 await new Promise<void>((resolve,reject)=>{
  rive=new Rive({src:assetUrl('little-keep.riv'),canvas,autoplay:true,stateMachines:'Play',autoBind:true,layout:new Layout({fit:Fit.Contain,alignment:Alignment.Center}),onLoad:()=>{
   const vm=rive!.viewModelInstance,multi=vm?.boolean('multiplayer'),command=vm?.string('command');
   if(!vm||!multi||!command){reject(Error('The game view model could not be loaded.'));return;}
   multi.value=true;
   let last='';command.on(()=>{
    const value=command.value;if(!ready||!conn||value===last)return;last=value;
    const [,action,pad,kind]=value.split(',');if(!['build','start','next','restart'].includes(action))return;
    conn.reducers.command({action,pad:Number(pad),kind:Number(kind),revision}).then(()=>message('Connected · Your team shares gold and keep health.')).catch(showError);
   });
   rive!.resizeDrawingSurfaceToCanvas();refresh();resolve();
  },onLoadError:()=>reject(Error('Rive could not load the signed game. Run bun run rive:sign again.'))});
 });
}
async function connect(){
 clearTimeout(retryTimer);const current=++generation;conn?.disconnect();setReady(false);retry.hidden=true;message('Connecting to your battlefield…');
 try {
  const health=await connectionHealth(config.uri,config.database);
  if(current!==generation)return;
  if(!health.ok){message(health.message);button.disabled=false;retry.hidden=false;return;}
 } catch(error) {if(current!==generation)return;showError(error);button.disabled=false;retry.hidden=false;return;}
 let joined=false,connectionError='';
 const tokenKey=`keep-token:${config.uri}:${config.database}`;
 conn=DbConnection.builder().withUri(config.uri).withDatabaseName(config.database).withToken(saved(tokenKey)??undefined)
  .onConnect(async(connection,_identity,token)=>{
   if(current!==generation){connection.disconnect();return;}save(tokenKey,token);
   try{
    await connection.reducers.join({code:room,name});
    connection.subscriptionBuilder().onApplied(()=>{if(current!==generation)return;joined=true;setReady(true);refresh();button.disabled=false;retry.hidden=true;message('Connected · Your team shares gold and keep health.');}).onError(ctx=>{setReady(false);showError(ctx.event);retry.hidden=false;button.disabled=false;}).subscribe([`SELECT * FROM room WHERE code = '${room}'`,`SELECT * FROM member WHERE room = '${room}'`]);
   }catch(error){showError(error);button.disabled=false;retry.hidden=false;}
  })
  .onConnectError((_ctx,error)=>{if(current!==generation)return;connectionError=error.message;setReady(false);showError(error);button.disabled=false;retry.hidden=false;})
  .onDisconnect((_ctx,error)=>{if(current!==generation)return;setReady(false);retry.hidden=false;button.disabled=false;if(!joined){message(connectionError||error?.message||'Could not join the battlefield. Click Reconnect to try again.');return;}message('Connection lost. Rejoining your battlefield…');retryTimer=setTimeout(connect,2000);})
  .build();
 conn.db.room.onInsert(refresh);conn.db.room.onUpdate(refresh);conn.db.member.onInsert(refresh);conn.db.member.onDelete(refresh);conn.db.member.onUpdate(refresh);
}
form.addEventListener('submit',async event=>{
 event.preventDefault();room=element<HTMLInputElement>('room').value.trim().toUpperCase();name=element<HTMLInputElement>('name').value.trim();
 if(!/^[A-Z0-9]{3,12}$/.test(room)||!name||name.length>24){message('Use a 3–12 character room code and a name up to 24 characters.');return;}
 button.disabled=true;save('keep-name',name);try{history.replaceState({},'',`?room=${room}`);}catch{/* Some embedding policies restrict history updates. */}
 try{await loadRive();connect();}catch(error){rive?.cleanup();rive=undefined;showError(error);button.disabled=false;}
});
retry.addEventListener('click',connect);
element('share').addEventListener('click',()=>navigator.clipboard.writeText(config.pageUrl?`${config.pageUrl} — Join room ${room||element<HTMLInputElement>('room').value.toUpperCase()}`:location.href).then(()=>message('Invite copied. Your teammates should enter the same room code.')).catch(()=>message(`Room code: ${room||element<HTMLInputElement>('room').value}`)));
new ResizeObserver(()=>rive?.resizeDrawingSurfaceToCanvas()).observe(canvas);
window.addEventListener('beforeunload',()=>{generation++;clearTimeout(retryTimer);conn?.disconnect();rive?.cleanup();});
setReady(false);message(config.riveReady?'Enter the same room code to defend together.':'Multiplayer host ready. Sign the Rive scene with bun run rive:sign to play.');
