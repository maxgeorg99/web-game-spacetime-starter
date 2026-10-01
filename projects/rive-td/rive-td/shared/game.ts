import { enemies, towers, levels, waves } from './catalog';
export type Enemy = { id:number; kind:number; x:number; y:number; progress:number; hp:number; maxHp:number; slow:number };
export type Tower = { pad:number; kind:number; x:number; y:number; cooldown:number; owner:string };
export type Shot = { x:number; y:number; tx:number; ty:number; kind:number; life:number };
export type State = { level:number; wave:number; phase:'prepare'|'combat'|'cleared'|'won'|'lost'; gold:number; lives:number; kills:number; spawned:number; clock:number; serial:number; enemies:Enemy[]; towers:Tower[]; shots:Shot[] };
export function fresh(level=0):State { return {level,wave:0,phase:'prepare',gold:levels[level].gold,lives:30,kills:0,spawned:0,clock:0,serial:0,enemies:[],towers:[],shots:[]}; }
export function waveGroups(s:State) { return waves[s.level*4 + Math.min(3,Math.max(0,s.wave-(s.phase==='combat'?1:0)))]; }
export function build(s:State,pad:number,kind:number,owner='local') {
  if (!['prepare','combat'].includes(s.phase)) throw Error('This battlefield is finished.');
  if (!Number.isInteger(pad)||!Number.isInteger(kind)||!levels[s.level].pads[pad]||!towers[kind]) throw Error('Invalid tower or build pad.');
  if (s.towers.some(t=>t.pad===pad)) throw Error('That pad is already occupied.');
  const spec=towers[kind]; if(s.gold<spec.cost) throw Error(`Need ${spec.cost} gold.`);
  const [x,y]=levels[s.level].pads[pad];s.gold-=spec.cost;s.towers.push({pad,kind,x,y,cooldown:0,owner});
}
export function start(s:State) { if(s.phase!=='prepare') throw Error('Wait until this wave ends.');s.wave++;s.phase='combat';s.spawned=0;s.clock=0; }
export function next(s:State):State { if(s.phase!=='cleared') throw Error('Clear this battlefield first.');const n=fresh(s.level+1);n.kills=s.kills;return n; }
export function step(s:State,dt:number) {
  s.shots=s.shots.filter(p=>(p.life-=dt)>0);
  if(s.phase!=='combat') return;
  const groups=waves[s.level*4+s.wave-1],total=groups.reduce((n,g)=>n+g[1],0);
  s.clock-=dt;
  if(s.spawned<total&&s.clock<=0) {
    let index=s.spawned,kind=0;for(const g of groups){if(index<g[1]){kind=g[0];break;}index-=g[1];}
    const spec=enemies[kind],hp=spec.hp*(1+s.level*.3+(s.wave-1)*.12),p=levels[s.level].path[0];
    s.enemies.push({id:++s.serial,kind,x:p.x,y:p.y,progress:0,hp,maxHp:hp,slow:0});s.spawned++;s.clock+=.85-s.level*.12;
  }
  const path=levels[s.level].path;
  for(const e of s.enemies) {
    const spec=enemies[e.kind]; e.progress+=dt*spec.speed*(e.slow>0?.45:1);e.slow=Math.max(0,e.slow-dt);e.hp=Math.min(e.maxHp,e.hp+spec.regen*dt);
    const i=Math.floor(e.progress);if(i>=path.length-1){s.lives=Math.max(0,s.lives-spec.damage);e.hp=0;continue;}
    const a=path[i],b=path[i+1],f=e.progress-i;e.x=a.x+(b.x-a.x)*f;e.y=a.y+(b.y-a.y)*f;
  }
  s.enemies=s.enemies.filter(e=>e.hp>0);
  if(s.lives===0){s.phase='lost';s.shots=[];return;}
  for(const t of s.towers) {
    t.cooldown=Math.max(0,t.cooldown-dt);if(t.cooldown>0)continue;
    const spec=towers[t.kind],range=s.enemies.filter(e=>e.hp>0&&(e.x-t.x)**2+(e.y-t.y)**2<=spec.range**2).sort((a,b)=>b.progress-a.progress),target=range[0];
    if(!target)continue;t.cooldown=spec.interval;
    const targets=t.kind===1?s.enemies.filter(e=>e.hp>0&&(e.x-target.x)**2+(e.y-target.y)**2<=2.25):t.kind===3?range.slice(0,3):[target];
    for(const e of targets){e.hp-=Math.max(1,spec.damage-(t.kind===3?0:enemies[e.kind].armor));if(t.kind===2)e.slow=2;
      s.shots.push({x:t.x,y:t.y,tx:e.x,ty:e.y,kind:t.kind,life:.2});
      if(e.hp<=0){s.gold+=enemies[e.kind].reward;s.kills++;}
    }
  }
  s.enemies=s.enemies.filter(e=>e.hp>0);
  if(s.spawned===total&&s.enemies.length===0){s.gold+=40+s.level*15;s.phase=s.wave===4?(s.level===2?'won':'cleared'):'prepare';}
}
// Numeric, versioned transport for Rive's deliberately small Luau parser.
export function wire(s:State) {
  return [[1,s.level,s.wave,['prepare','combat','cleared','won','lost'].indexOf(s.phase),s.gold,s.lives,s.kills,s.spawned,s.serial].join(','),s.towers.map(t=>[t.pad,t.kind,t.x,t.y,t.cooldown].join(',')).join(';'),s.enemies.map(e=>[e.id,e.kind,e.x,e.y,e.progress,e.hp,e.maxHp,e.slow].join(',')).join(';'),s.shots.map(p=>[p.x,p.y,p.tx,p.ty,p.kind,p.life].join(',')).join(';')].join('#');
}
