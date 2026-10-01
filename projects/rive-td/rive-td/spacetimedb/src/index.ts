import { schema, table, t, SenderError } from 'spacetimedb/server';
import { ScheduleAt } from 'spacetimedb';
import { fresh, build, start, next, step, wire, type State } from '../../shared/game';
const room=table({name:'room',public:true},{code:t.string().primaryKey(),state:t.string(),snapshot:t.string(),revision:t.u32(),players:t.u32(),updated:t.timestamp()});
const member=table({name:'member',public:true},{connection:t.connectionId().primaryKey(),identity:t.identity(),room:t.string().index('btree'),name:t.string()});
const timer=table({name:'timer'},{scheduledId:t.u64().primaryKey().autoInc(),scheduledAt:t.scheduleAt()});
const db=schema({room,member,timer});export default db;
export const init=db.init(ctx=>{ctx.db.timer.insert({scheduledId:0n,scheduledAt:ScheduleAt.interval(100_000n)});});
export const join=db.reducer({code:t.string(),name:t.string()},(ctx,{code,name})=>{
  code=code.trim().toUpperCase();name=name.trim();
  if(!/^[A-Z0-9]{3,12}$/.test(code))throw new SenderError('Use 3–12 letters or digits for the room code.');
  if(name.length<1||name.length>24)throw new SenderError('Use a name between 1 and 24 characters.');
  if(!ctx.connectionId)throw new SenderError('A live connection is required.');
  const previous=ctx.db.member.connection.find(ctx.connectionId);
  if(previous&&previous.room===code){ctx.db.member.connection.update({...previous,name});return;}
  let r=ctx.db.room.code.find(code);
  if(r&&r.players>=8)throw new SenderError('This room is full (8 players).');
  if(!r){if(ctx.db.room.count()>=32n)throw new SenderError('All rooms are busy. Try again later.');const s=fresh();r=ctx.db.room.insert({code,state:JSON.stringify(s),snapshot:wire(s),revision:0,players:0,updated:ctx.timestamp});}
  if(previous){const old=ctx.db.room.code.find(previous.room);if(old)ctx.db.room.code.update({...old,players:Math.max(0,old.players-1),updated:ctx.timestamp});ctx.db.member.connection.delete(ctx.connectionId);}
  ctx.db.member.insert({connection:ctx.connectionId,identity:ctx.sender,room:code,name});
  ctx.db.room.code.update({...r,players:r.players+1,updated:ctx.timestamp});
});
export const command=db.reducer({action:t.string(),pad:t.u32(),kind:t.u32(),revision:t.u32()},(ctx,args)=>{
  const m=ctx.connectionId&&ctx.db.member.connection.find(ctx.connectionId);if(!m)throw new SenderError('Join a room first.');
  const r=ctx.db.room.code.find(m.room);if(!r)throw new SenderError('Room not found.');
  let s=JSON.parse(r.state) as State;
  try{
    if(args.action==='build')build(s,args.pad,args.kind,ctx.sender.toHexString());
    else {if(args.revision!==r.revision)throw Error('State changed. Try again.');
      if(args.action==='start')start(s);else if(args.action==='next')s=next(s);
      else if(args.action==='restart'){if(!['lost','won'].includes(s.phase))throw Error('Restart is available after victory or defeat.');s=fresh();}
      else throw Error('Unknown command.');
    }
  }catch(error){throw new SenderError((error as Error).message);}
  ctx.db.room.code.update({...r,state:JSON.stringify(s),snapshot:wire(s),revision:r.revision+1,updated:ctx.timestamp});
});
export const disconnect=db.clientDisconnected(ctx=>{
  if(!ctx.connectionId)return;const m=ctx.db.member.connection.find(ctx.connectionId);if(!m)return;
  ctx.db.member.connection.delete(ctx.connectionId);const r=ctx.db.room.code.find(m.room);
  if(r)ctx.db.room.code.update({...r,players:Math.max(0,r.players-1),updated:ctx.timestamp});
});
export const tick=db.reducer({onSchedule:timer},{timer:timer.rowType},ctx=>{
  if(!ctx.sender.isEqual(ctx.identity))throw new SenderError('Only the scheduler may advance combat.');
  for(const r of ctx.db.room.iter()){
    if(r.players===0){if(ctx.timestamp.microsSinceUnixEpoch-r.updated.microsSinceUnixEpoch>1_800_000_000n)ctx.db.room.code.delete(r.code);continue;}
    const s=JSON.parse(r.state) as State;if(s.phase!=='combat')continue;
    step(s,.1);ctx.db.room.code.update({...r,state:JSON.stringify(s),snapshot:wire(s),revision:r.revision+1,updated:ctx.timestamp});
  }
});
