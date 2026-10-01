local Game=require('game')
local C=Game.catalog
local function hex(s: string): Color return Color.rgb(tonumber(string.sub(s,2,3),16) or 0,tonumber(string.sub(s,4,5),16) or 0,tonumber(string.sub(s,6,7),16) or 0) end
export type Board={state: Game.State,time: number,hover: number,selected: number,vm: ViewModel?,towers: {[number]: Image},enemies: {[number]: Image},castle: Image?,sampler: ImageSampler,payload: string,sequence: number,accumulator: number}
local function iso(x: number,y: number): Vector return Vector.xy(545+(x-y)*26,302+(x+y)*13.5) end
local function polygon(r: Renderer,points: {Vector},color: Color)
 local p=Path.new();p:moveTo(points[1]);for i=2,#points do p:lineTo(points[i]) end;p:close();r:drawPath(p,Paint.with({color=color}))
end
local function rect(r: Renderer,x: number,y: number,w: number,h: number,c: Color) polygon(r,{Vector.xy(x,y),Vector.xy(x+w,y),Vector.xy(x+w,y+h),Vector.xy(x,y+h)},c) end
local function diamond(r: Renderer,x: number,y: number,w: number,h: number,c: Color) polygon(r,{Vector.xy(x,y-h),Vector.xy(x+w,y),Vector.xy(x,y+h),Vector.xy(x-w,y)},c) end
local function sprite(self: Board,r: Renderer,img: Image?,x: number,y: number,scale: number,frame: number,fw: number,flip: boolean?)
 if not img then return end
 r:save();local m=Mat2D.identity();m.xx=if flip then -scale else scale;m.yy=scale;m.tx=if flip then x+fw*scale/2 else x-fw*scale/2;m.ty=y-img.height*scale;r:transform(m)
 local clip=Path.new();clip:moveTo(Vector.xy(0,0));clip:lineTo(Vector.xy(fw,0));clip:lineTo(Vector.xy(fw,img.height));clip:lineTo(Vector.xy(0,img.height));clip:close();r:clipPath(clip)
 local offset=Mat2D.identity();offset.tx=-frame*fw;r:transform(offset);r:drawImage(img,self.sampler,'srcOver',1);r:restore()
end
local function network(self: Board): boolean
 local vm=self.vm;if not vm then return false end;local p=vm:getBoolean('multiplayer');return p~=nil and p.value
end
local function sync(self: Board)
 local vm=self.vm;if not vm then return end
 local s=self.state;local level=C.levels[s.level];local spec=C.towers[self.selected]
 local values: {[string]: string}={gold=tostring(s.gold),lives=tostring(s.lives)..' / 30',wave=tostring(s.wave)..' / 4',level='0'..tostring(s.level)..'  /  '..string.upper(level.name),status=s.message,action=if s.phase==1 then 'WAVE IN PROGRESS' elseif s.phase==2 then 'NEXT BATTLEFIELD' elseif s.phase>=3 then 'PLAY AGAIN' else 'START WAVE '..tostring(s.wave+1),remaining=if s.phase==1 then tostring(#s.enemies)..' enemies on the road' elseif s.phase==2 then 'Battlefield secured' elseif s.phase==3 then 'Campaign complete' elseif s.phase==4 then 'Keep lost' else 'Prepare your defense',selection=string.upper(spec.name)..'  /  '..tostring(spec.cost)..' GOLD',details=tostring(spec.damage)..' damage  ·  '..tostring(spec.range)..' range\n'..spec.effect,previewTitle=if s.phase>=2 then 'BATTLE REPORT  /  '..tostring(s.kills)..' ENEMIES DEFEATED' else (if s.phase==1 then 'INCOMING' else 'NEXT WAVE')..'  /  WAVE '..tostring(if s.phase==1 then s.wave else s.wave+1),connection=if network(self) then 'COOPERATIVE DEFENSE' else 'LOCAL CAMPAIGN'}
 for k,v in values do local p=vm:getString(k);if p then p.value=v end end
 for i,t in C.towers do local p=vm:getString('towerLabel'..tostring(i));if p then p.value=(if i==self.selected then '› ' else '')..string.upper(t.name) end end
 for i,e in C.enemies do
  local count=0;if s.phase<2 then for _,g in Game.groups(s) do if g[1]+1==i then count=g[2] end end end
  local p=vm:getString('enemy'..tostring(i));if p then p.value=e.name..(if count>0 then '  x'..tostring(count) else '  —') end
  local q=vm:getString('stats'..tostring(i));if q then q.value=e.trait end
 end
end
local function init(self: Board,context: Context): boolean
 self.vm=context:viewModel();for i=1,4 do local img=context:image('tower'..tostring(i));if img then self.towers[i]=img end end
 for i=1,10 do local img=context:image('enemy'..tostring(i));if img then self.enemies[i]=img end end
 self.castle=context:image('castle');sync(self);return true
end
local function advance(self: Board,seconds: number): boolean
 self.time+=seconds
 if network(self) then
  for i=#self.state.shots,1,-1 do local shot=self.state.shots[i];shot.life-=seconds;if shot.life<=0 then table.remove(self.state.shots,i) end end
  local vm=self.vm;if vm then local p=vm:getString('snapshot');if p and p.value~=self.payload then local s=Game.snapshot(p.value);if s then self.state=s;self.payload=p.value end end end
 else
  self.accumulator+=math.min(seconds,0.25)
  while self.accumulator>=0.1 do Game.step(self.state,0.1);self.accumulator-=0.1 end
 end
 sync(self);return true
end
local function hit(self: Board,x: number,y: number): number
 for i,p in C.levels[self.state.level].pads do local v=iso(p.x,p.y);if math.abs(x-v.x)/24+math.abs(y-v.y)/13<=1.2 then return i end end;return 0
end
local function send(self: Board,action: string,pad: number,kind: number)
 if network(self) then
  local vm=self.vm;if vm then local p=vm:getString('command');if p then self.sequence+=1;p.value=tostring(self.sequence)..','..action..','..tostring(pad-1)..','..tostring(kind-1) end end
 elseif action=='build' then Game.build(self.state,pad,kind)
 elseif action=='start' then Game.start(self.state)
 elseif action=='next' then self.state=Game.next(self.state)
 elseif action=='restart' then self.state=Game.new() end
end
local function pointerDown(self: Board,event: PointerEvent)
 local x,y=event.position.x,event.position.y
 if x>=1130 and x<=1400 then
  if y>=310 and y<614 then self.selected=math.clamp(math.floor((y-310)/76)+1,1,4)
  elseif y>=755 and y<=815 then local phase=self.state.phase;if phase~=1 then send(self,if phase==2 then 'next' elseif phase>=3 then 'restart' else 'start',1,1) end end
 else local pad=hit(self,x,y);if pad>0 then send(self,'build',pad,self.selected) end end
 sync(self)
end
local function pointerMove(self: Board,event: PointerEvent) self.hover=hit(self,event.position.x,event.position.y) end
local function pointerExit(self: Board,_event: PointerEvent) self.hover=0 end
local function draw(self: Board,r: Renderer)
 local level=C.levels[self.state.level];local ground=if self.state.level==1 then {'#547664','#5B7D68'} elseif self.state.level==2 then {'#807250','#897B56'} else {'#526878','#5B7080'}
 local bottom=iso(18.5,18.5);local left=iso(-0.5,18.5);local right=iso(18.5,-0.5)
 diamond(r,545,558,507,263,hex('#101F29'))
 polygon(r,{left,bottom,Vector.xy(bottom.x,bottom.y+20),Vector.xy(left.x,left.y+20)},hex('#384B46'))
 polygon(r,{right,bottom,Vector.xy(bottom.x,bottom.y+20),Vector.xy(right.x,right.y+20)},hex('#263C3B'))
 for sum=0,36 do for x=0,18 do local y=sum-x;if y>=0 and y<=18 then
  local v=iso(x,y);local road=false;for _,p in level.path do if p.x==x and p.y==y then road=true;break end end
  diamond(r,v.x,v.y,25.6,13.2,hex(if road then (if sum%2==0 then '#C6AE7C' else '#BEA575') else ground[sum%2+1]))
  if not road and (x*7+y*3)%11==0 then rect(r,v.x-3,v.y-3,1,5,hex('#9AAA83'));rect(r,v.x+1,v.y-1,1,3,hex('#9AAA83')) end
 end end end
 for i,p in level.pads do local v=iso(p.x,p.y);diamond(r,v.x,v.y,22,11,hex(if self.hover==i then '#FFF0BE' else '#D1B878'));diamond(r,v.x,v.y,18,8,hex('#536960'));rect(r,v.x-5,v.y-1,10,2,hex('#ECD9A4'));rect(r,v.x-1,v.y-4,2,8,hex('#ECD9A4')) end
 if self.hover>0 then
  local p=level.pads[self.hover];local kind=self.selected;for _,t in self.state.towers do if t.pad==self.hover then kind=t.kind end end
  local range=C.towers[kind].range;local path=Path.new()
  for i=0,48 do local a=i*math.pi/24;local v=iso(p.x+math.cos(a)*range,p.y+math.sin(a)*range);if i==0 then path:moveTo(v) else path:lineTo(v) end end;path:close();r:drawPath(path,Paint.with({color=hex(C.towers[kind].color),style='stroke',thickness=1.5}))
 end
 local objects: {{kind: number,x: number,y: number,index: number}}={}
 for i,t in self.state.towers do table.insert(objects,{kind=1,x=t.x,y=t.y,index=i}) end
 for i,e in self.state.enemies do table.insert(objects,{kind=2,x=e.x,y=e.y,index=i}) end
 local exit=level.path[#level.path];table.insert(objects,{kind=3,x=exit.x,y=exit.y,index=0})
 table.sort(objects,function(a: {kind: number,x: number,y: number,index: number},b: {kind: number,x: number,y: number,index: number}): boolean return a.x+a.y<b.x+b.y end)
 for _,o in objects do
  local v=iso(o.x,o.y)
  if o.kind==1 then local t=self.state.towers[o.index];sprite(self,r,self.towers[t.kind],v.x,v.y+9,0.32,0,128);diamond(r,v.x,v.y-49,4,3,hex(C.towers[t.kind].color))
  elseif o.kind==3 then sprite(self,r,self.castle,v.x,v.y+20,0.33,0,320)
  else local e=self.state.enemies[o.index];local spec=C.enemies[e.kind];local n=math.min(#level.path-1,math.floor(e.progress)+1);local a,b=level.path[n],level.path[n+1]
   sprite(self,r,self.enemies[e.kind],v.x,v.y+14,if spec.frameSize>=300 then 0.21 else 0.29,math.floor(self.time*10+e.id)%spec.frames,spec.frameSize,b.x<a.x or b.y>a.y)
   rect(r,v.x-12,v.y-28,24,3,hex('#283E3B'));rect(r,v.x-12,v.y-28,24*e.hp/e.maxHp,3,hex(if e.slow>0 then '#91DCE5' else '#E7A077'))
  end
 end
 for _,s in self.state.shots do local a,b=iso(s.x,s.y),iso(s.tx,s.ty);local path=Path.new();path:moveTo(Vector.xy(a.x,a.y-42));path:lineTo(Vector.xy(b.x,b.y-12));r:drawPath(path,Paint.with({color=hex(C.towers[s.kind].color),style='stroke',thickness=if s.kind==2 then 4 else 2,cap='round'})) end
 for i,spec in C.towers do
  local y=310+(i-1)*76;rect(r,1130,y,3,62,hex(if i==self.selected then spec.color else '#3A5148'))
  sprite(self,r,self.towers[i],1163,y+60,0.28,0,128)
 end
end
return function(_context: Context): Layout<Board>
 return {state=Game.new(),time=0,hover=0,selected=1,vm=nil,towers={},enemies={},castle=nil,sampler=ImageSampler('clamp','clamp','nearest'),payload='',sequence=0,accumulator=0,init=init,advance=advance,draw=draw,pointerDown=pointerDown,pointerMove=pointerMove,pointerExit=pointerExit}
end
