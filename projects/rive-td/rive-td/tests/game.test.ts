import { test,expect } from 'bun:test';
import { enemies,towers,levels,waves } from '../shared/catalog';
import { fresh,build,start,next,step,wire,type State } from '../shared/game';
function run(s:State,seconds=200){for(let i=0;i<seconds*10;i++)step(s,.1);}
test('all three maps use 19x19, adjacent paths, and unique buildable pads',()=>{
 expect(levels).toHaveLength(3);expect(enemies).toHaveLength(10);expect(towers).toHaveLength(4);
 for(const l of levels){expect(l.size).toBe(19);const road=new Set(l.path.map(p=>`${p.x},${p.y}`));expect(road.size).toBe(l.path.length);expect(new Set(l.pads.map(String)).size).toBe(l.pads.length);
 for(const [x,y]of l.pads){expect(road.has(`${x},${y}`)).toBe(false);expect(x>=0&&x<19&&y>=0&&y<19).toBe(true);}
 for(let i=1;i<l.path.length;i++)expect(Math.abs(l.path[i].x-l.path[i-1].x)+Math.abs(l.path[i].y-l.path[i-1].y)).toBe(1);}
 expect(new Set(waves.flat().map(g=>g[0])).size).toBe(10);
});
test('build validates index, cost and occupation atomically',()=>{
 const s=fresh();build(s,0,0);expect(s.gold).toBe(200);expect(()=>build(s,0,3)).toThrow('occupied');expect(()=>build(s,100,0)).toThrow('Invalid');expect(()=>build(s,1,4)).toThrow('Invalid');expect(()=>build(s,NaN,0)).toThrow('Invalid');
 build(s,1,3);expect(()=>build(s,2,1)).toThrow('Need');expect(s.gold).toBe(80);expect(s.towers).toHaveLength(2);
});
function battle(kind:number){const s=fresh();s.phase='combat';s.wave=1;s.clock=999;s.towers=[{pad:0,kind,x:1,y:3,cooldown:0,owner:'test'}];s.enemies=[0,1,2,3].map(id=>({id,kind:3,x:1,y:3,progress:1+id*.1,hp:180,maxHp:180,slow:0}));return s;}
test('cannon splashes, frost slows and arcane chains through armor',()=>{
 const cannon=battle(1);step(cannon,.1);expect(cannon.enemies.every(e=>e.hp===132)).toBe(true);
 const frost=battle(2);step(frost,.1);expect(frost.enemies.filter(e=>e.slow===2)).toHaveLength(1);
 const arcane=battle(3);step(arcane,.1);expect(arcane.enemies.filter(e=>e.hp===138)).toHaveLength(3);
 const archer=battle(0);step(archer,.1);expect(archer.enemies.filter(e=>e.hp===165)).toHaveLength(1);
});
test('defeated targets reward once even when multiple towers attack',()=>{
 const s=battle(3);s.enemies=[s.enemies[0]];s.enemies[0].hp=1;s.towers.push({...s.towers[0],pad:1});step(s,.1);expect(s.kills).toBe(1);expect(s.gold).toBe(268);
});
test('empty defense loses and terminal state is stable',()=>{
 const s=fresh();start(s);expect(()=>start(s)).toThrow();run(s);start(s);run(s);expect(s.phase).toBe('lost');expect(s.lives).toBe(0);const gold=s.gold;run(s);expect(s.gold).toBe(gold);expect(()=>build(s,0,0)).toThrow();
});
test('campaign completes with normal income and fresh level treasuries',()=>{
 let s=fresh();
 for(let level=0;level<3;level++){
  const buy=()=>{if(!['prepare','combat'].includes(s.phase))return;for(let p=0;p<levels[level].pads.length;p++){if(s.towers.some(t=>t.pad===p))continue;const kind=p%3===0?2:3;if(s.gold>=towers[kind].cost)build(s,p,kind);}};
  for(let w=0;w<4;w++){buy();start(s);for(let i=0;i<2500&&s.phase==='combat';i++){step(s,.1);buy();}expect(s.lives).toBeGreaterThan(0);}
  expect(s.phase).toBe(level===2?'won':'cleared');if(level<2){s=next(s);expect(s.towers).toHaveLength(0);expect(s.gold).toBe(levels[level+1].gold);}
 }
});
test('wire transport includes all state needed by Rive',()=>{const s=fresh();build(s,0,3);start(s);step(s,.1);const parts=wire(s).split('#');expect(parts).toHaveLength(4);expect(parts[0].split(',')).toHaveLength(9);expect(parts[1].split(',')).toHaveLength(5);expect(parts[2].split(',')).toHaveLength(8);});
