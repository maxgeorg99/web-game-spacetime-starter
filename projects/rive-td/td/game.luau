local Catalog = require('catalog')
local M = {}
export type Enemy = {id: number, kind: number, x: number, y: number, progress: number, hp: number, maxHp: number, slow: number}
export type Tower = {pad: number, kind: number, x: number, y: number, cooldown: number}
export type Shot = {x: number, y: number, tx: number, ty: number, kind: number, life: number}
export type State = {level: number, wave: number, phase: number, gold: number, lives: number, kills: number, spawned: number, clock: number, serial: number, enemies: {Enemy}, towers: {Tower}, shots: {Shot}, message: string}
M.catalog = Catalog
function M.new(level: number?): State
 local n = level or 1
 return {level=n,wave=0,phase=0,gold=Catalog.levels[n].gold,lives=30,kills=0,spawned=0,clock=0,serial=0,enemies={},towers={},shots={},message='Choose a tower, then click a golden pad.'}
end
function M.groups(s: State): {{number}}
 return Catalog.waves[(s.level-1)*4+math.min(4,math.max(1,s.wave+(if s.phase==1 then 0 else 1)))]
end
function M.build(s: State,pad: number,kind: number): boolean
 if s.phase>1 then return false end
 local p=Catalog.levels[s.level].pads[pad];local spec=Catalog.towers[kind]
 if not p or not spec then return false end
 for _,t in s.towers do if t.pad==pad then s.message='That pad is already occupied.';return false end end
 if s.gold<spec.cost then s.message='Need '..tostring(spec.cost)..' gold.';return false end
 s.gold-=spec.cost;table.insert(s.towers,{pad=pad,kind=kind,x=p.x,y=p.y,cooldown=0});s.message=spec.name..' built. '..spec.effect..'.';return true
end
function M.start(s: State)
 if s.phase~=0 then return end
 s.wave+=1;s.phase=1;s.spawned=0;s.clock=0;s.message='Hold the line! You can build during combat.'
end
function M.next(s: State): State
 if s.phase~=2 then return s end
 local n=M.new(s.level+1);n.kills=s.kills;return n
end
function M.step(s: State,dt: number)
 for i=#s.shots,1,-1 do local p=s.shots[i];p.life-=dt;if p.life<=0 then table.remove(s.shots,i) end end
 if s.phase~=1 then return end
 local groups=Catalog.waves[(s.level-1)*4+s.wave];local total=0
 for _,g in groups do total+=g[2] end
 s.clock-=dt
 if s.spawned<total and s.clock<=0 then
  local index=s.spawned;local kind=1
  for _,g in groups do if index<g[2] then kind=g[1]+1;break end;index-=g[2] end
  local spec=Catalog.enemies[kind];local hp=spec.hp*(1+(s.level-1)*0.3+(s.wave-1)*0.12);local p=Catalog.levels[s.level].path[1]
  s.serial+=1;table.insert(s.enemies,{id=s.serial,kind=kind,x=p.x,y=p.y,progress=0,hp=hp,maxHp=hp,slow=0});s.spawned+=1;s.clock+=0.85-(s.level-1)*0.12
 end
 local path=Catalog.levels[s.level].path
 for i=#s.enemies,1,-1 do
  local e=s.enemies[i];local spec=Catalog.enemies[e.kind]
  e.progress+=dt*spec.speed*(if e.slow>0 then 0.45 else 1);e.slow=math.max(0,e.slow-dt);e.hp=math.min(e.maxHp,e.hp+spec.regen*dt)
  local n=math.floor(e.progress)+1
  if n>=#path then s.lives=math.max(0,s.lives-spec.damage);table.remove(s.enemies,i)
  else local a,b=path[n],path[n+1];local f=e.progress%1;e.x=a.x+(b.x-a.x)*f;e.y=a.y+(b.y-a.y)*f end
 end
 if s.lives==0 then s.phase=4;s.shots={};s.message='The keep fell. Rally your team and try again.';return end
 for _,t in s.towers do
  t.cooldown=math.max(0,t.cooldown-dt);if t.cooldown>0 then continue end
  local spec=Catalog.towers[t.kind];local targets: {Enemy}={}
  for _,e in s.enemies do if e.hp>0 and (e.x-t.x)^2+(e.y-t.y)^2<=spec.range^2 then table.insert(targets,e) end end
  table.sort(targets,function(a: Enemy,b: Enemy): boolean return a.progress>b.progress end)
  local target=targets[1];if not target then continue end;t.cooldown=spec.interval
  if t.kind==2 then targets={};for _,e in s.enemies do if e.hp>0 and (e.x-target.x)^2+(e.y-target.y)^2<=2.25 then table.insert(targets,e) end end
  elseif t.kind==4 then while #targets>3 do table.remove(targets) end
  else targets={target} end
  for _,e in targets do
   e.hp-=math.max(1,spec.damage-(if t.kind==4 then 0 else Catalog.enemies[e.kind].armor));if t.kind==3 then e.slow=2 end
   table.insert(s.shots,{x=t.x,y=t.y,tx=e.x,ty=e.y,kind=t.kind,life=0.2})
   if e.hp<=0 then s.gold+=Catalog.enemies[e.kind].reward;s.kills+=1 end
  end
 end
 for i=#s.enemies,1,-1 do if s.enemies[i].hp<=0 then table.remove(s.enemies,i) end end
 if s.spawned==total and #s.enemies==0 then
  s.gold+=40+(s.level-1)*15;s.phase=if s.wave==4 then (if s.level==3 then 3 else 2) else 0
  s.message=if s.phase==3 then 'Victory! All three keeps are safe.' elseif s.phase==2 then 'Battlefield secured! Continue to the next keep.' else 'Wave cleared! Reinforcements paid. Prepare your defense.'
 end
end
local function numbers(text: string): {number}
 local result: {number}={};for _,v in string.split(text,',') do table.insert(result,tonumber(v) or 0) end;return result
end
function M.snapshot(payload: string): State?
 local parts=string.split(payload,'#');if #parts~=4 then return nil end
 local h=numbers(parts[1]);if #h~=9 or h[1]~=1 or h[2]<0 or h[2]>2 then return nil end
 local s=M.new(h[2]+1);s.wave=h[3];s.phase=h[4];s.gold=h[5];s.lives=h[6];s.kills=h[7];s.spawned=h[8];s.serial=h[9]
 if parts[2]~='' then for _,row in string.split(parts[2],';') do local v=numbers(row);if #v==5 then table.insert(s.towers,{pad=v[1]+1,kind=v[2]+1,x=v[3],y=v[4],cooldown=v[5]}) end end end
 if parts[3]~='' then for _,row in string.split(parts[3],';') do local v=numbers(row);if #v==8 then table.insert(s.enemies,{id=v[1],kind=v[2]+1,x=v[3],y=v[4],progress=v[5],hp=v[6],maxHp=v[7],slow=v[8]}) end end end
 if parts[4]~='' then for _,row in string.split(parts[4],';') do local v=numbers(row);if #v==6 then table.insert(s.shots,{x=v[1],y=v[2],tx=v[3],ty=v[4],kind=v[5]+1,life=v[6]}) end end end
 s.message=if s.phase==1 then 'Team defense in progress.' elseif s.phase==2 then 'Battlefield secured! Continue to the next keep.' elseif s.phase==3 then 'Victory! All three keeps are safe.' elseif s.phase==4 then 'The keep fell. Rally your team and try again.' else 'Choose a tower, then click a golden pad.'
 return s
end
return M
