local Game = require('game')
local function hex(s: string): Color
    return Color.rgb(tonumber(string.sub(s,2,3),16) or 0,tonumber(string.sub(s,4,5),16) or 0,tonumber(string.sub(s,6,7),16) or 0)
end
type Board = {state: Game.State, time: number, hover: number, vm: ViewModel?, tower: Image?, enemies: {[string]: Image}, castle: Image?, sampler: ImageSampler,lastX: {[number]: number}, lastY: {[number]: number},
    flip: {[number]: boolean} }
local function iso(x: number,y: number): Vector return Vector.xy(434+(x-y)*42,208+(x+y)*22) end
local function polygon(r: Renderer, points: {Vector}, color: Color)
    local p=Path.new();p:moveTo(points[1]);for i=2,#points do p:lineTo(points[i]) end;p:close()
    r:drawPath(p,Paint.with({color=color}))
end
local function rect(r: Renderer,x: number,y: number,w: number,h: number,c: Color)
    polygon(r,{Vector.xy(x,y),Vector.xy(x+w,y),Vector.xy(x+w,y+h),Vector.xy(x,y+h)},c)
end
local function diamond(r: Renderer,x: number,y: number,w: number,h: number,c: Color)
    polygon(r,{Vector.xy(x,y-h),Vector.xy(x+w,y),Vector.xy(x,y+h),Vector.xy(x-w,y)},c)
end
local function sprite(self: Board,r: Renderer,img: Image?,x: number,y: number,scale: number,frame: number,fw: number,flipX: boolean?)    if not img then return end
    if not img then return end
    r:save()
    local m=Mat2D.identity()
    m.xx=if flipX then -scale else scale
    m.yy=scale
    m.tx=if flipX then x+fw*scale/2 else x-fw*scale/2
    m.ty=y-img.height*scale
    r:transform(m)
    local clip=Path.new();clip:moveTo(Vector.xy(0,0));clip:lineTo(Vector.xy(fw,0));clip:lineTo(Vector.xy(fw,img.height));clip:lineTo(Vector.xy(0,img.height));clip:close();r:clipPath(clip)
    local offset=Mat2D.identity();offset.tx=-frame*fw;r:transform(offset)
    r:drawImage(img,self.sampler,'srcOver',1);r:restore()
end
local function sync(self: Board)
    local vm=self.vm;if not vm then return end
    local s=self.state
    local preview=Game.preview(s)
    for _,kind in Game.enemyOrder do
        local count=0
        if preview then for _,group in preview.spawns do if group.kind==kind then count=group.count end end end
        local visible=vm:getNumber(kind.."Visible");if visible then visible.value=if count>0 then 1 else 0 end
        local label=vm:getString(kind.."Count");if label then label.value=Game.enemyTypes[kind].name.."  x"..tostring(count) end
        local stats=vm:getString(kind.."Stats");if stats then stats.value=if preview then tostring(math.floor(Game.enemyTypes[kind].hp*preview.health+0.5)).." HP  /  "..Game.enemyTypes[kind].trait else "" end
    end
    local title=vm:getString('previewTitle')
    if title then title.value=if s.ended then (if s.lives>0 then "THE KEEP STANDS" else "THE KEEP HAS FALLEN") else (if s.active then "THIS WAVE" else "NEXT WAVE").."  /  "..tostring(if s.active then s.wave else s.wave+1).."     ·     "..tostring(if preview then Game.waveCount(preview) else 0).." ENEMIES" end
    local values: {[string]: string}={gold=tostring(s.gold),lives=tostring(s.lives).." / 10",wave=tostring(s.wave).." / 3",status=s.message,action=if s.ended then (if s.lives>0 then "VICTORY" else "KEEP LOST") elseif s.active then "WAVE IN PROGRESS" else "START WAVE  "..tostring(s.wave+1),remaining=if s.ended then (if s.lives>0 then "All waves defeated" else "No lives remaining") elseif s.active then tostring(#s.enemies).." on the path" else "Prepare your defense"}
    for k,v in values do local p=vm:getString(k);if p then p.value=v end end
end
local function init(self: Board,context: Context): boolean
    self.vm=context:viewModel();self.tower=context:image('tower');for _,kind in Game.enemyOrder do local img=context:image(kind);if img then self.enemies[kind]=img end end;self.castle=context:image('castle');sync(self);return true
end
local function advance(self: Board,seconds: number): boolean
    self.time+=seconds
    -- Fixed-size substeps prevent large frames skipping simulation events.
    local left=math.min(seconds,0.25)
    while left>0 do
        local dt=math.min(left,1/60)
        Game.step(self.state,dt)

        for _,e in self.state.enemies do
            local oldX=self.lastX[e.id]
            local oldY=self.lastY[e.id]

            if oldX and oldY then
                self.flip[e.id]=e.x<oldX or e.y>oldY
            end

            self.lastX[e.id]=e.x
            self.lastY[e.id]=e.y
        end

        left-=dt
    end
    sync(self);return true
end
local function hit(x: number,y: number): number
    for i,p in Game.pads do local v=iso(p.x,p.y);if math.abs(x-v.x)/39+math.abs(y-v.y)/22<=1.2 then return i end end
    return 0
end
local function pointerMove(self: Board,event: PointerEvent) self.hover=hit(event.position.x,event.position.y) end
local function pointerExit(self: Board,event: PointerEvent) self.hover=0 end
local function pointerDown(self: Board,event: PointerEvent)
    local x,y=event.position.x,event.position.y
    if x>=860 and x<=1060 and y>=542 and y<=594 then Game.start(self.state)
    elseif x>=860 and x<=1060 and y>=613 and y<=655 then self.state=Game.new()
    else local i=hit(x,y);if i>0 then Game.build(self.state,i) end end
    sync(self)
end
local function draw(self: Board,r: Renderer)
    -- Ground shadow, then solid side faces and staggered grassy top.
    diamond(r,434,424,390,204,hex('#101F29'))
    polygon(r,{iso(-0.5,8.5),iso(8.5,8.5),Vector.xy(434,630),Vector.xy(56,432)},hex('#384B46'))
    polygon(r,{iso(8.5,-0.5),iso(8.5,8.5),Vector.xy(434,630),Vector.xy(812,432)},hex('#263C3B'))
    for sum=0,16 do for x=0,8 do
        local y=sum-x;if y>=0 and y<=8 then
            local v=iso(x,y);local road=false
            for _,p in Game.path do if p.x==x and p.y==y then road=true;break end end
            local c=if road then (if (x+y)%2==0 then '#C6AE7C' else '#BEA575') else (if (x+y)%2==0 then '#547664' else '#5B7D68')
            diamond(r,v.x,v.y,41.5,21.5,hex(c))
            if not road and (x*7+y*3)%5==0 then
                rect(r,v.x-7,v.y-3,2,5,hex('#72907A'));rect(r,v.x-2,v.y-5,2,7,hex('#72907A'))
            end
        end
    end end
    for i,p in Game.pads do
        local v=iso(p.x,p.y)
        diamond(r,v.x,v.y,32,17,hex(if self.hover==i then '#F4D99D' else '#D1B878'))
        diamond(r,v.x,v.y,27,13,hex('#536960'))
        rect(r,v.x-7,v.y-1,14,2,hex('#ECD9A4'));rect(r,v.x-1,v.y-6,2,12,hex('#ECD9A4'))
    end
    -- A hovered build pad shows the true world-space attack radius.
    if self.hover>0 then
        local p=Game.pads[self.hover];local points: {Vector}={}
        for i=0,47 do local a=i*math.pi/24;table.insert(points,iso(p.x+math.cos(a)*Game.range,p.y+math.sin(a)*Game.range)) end
        local path=Path.new();path:moveTo(points[1]);for i=2,#points do path:lineTo(points[i]) end;path:close()
        r:drawPath(path,Paint.with({color=hex('#DCCE98'),style='stroke',thickness=1.5}))
    end
    -- Sort every upright object together for correct isometric occlusion.
    local objects: {{kind: number,x: number,y: number,enemy: Game.Enemy?}}={}
    for _,t in self.state.towers do table.insert(objects,{kind=1,x=t.x,y=t.y,enemy=nil}) end
    for _,e in self.state.enemies do table.insert(objects,{kind=2,x=e.x,y=e.y,enemy=e}) end
    table.insert(objects,{kind=3,x=3,y=8.4,enemy=nil})
    table.sort(objects,function(a: {kind: number,x: number,y: number,enemy: Game.Enemy?},b: {kind: number,x: number,y: number,enemy: Game.Enemy?}): boolean return a.x+a.y<b.x+b.y end)
    for _,o in objects do
        local v=iso(o.x,o.y)
        if o.kind==1 then sprite(self,r,self.tower,v.x,v.y+14,0.46,0,128)
        elseif o.kind==3 then sprite(self,r,self.castle,v.x,v.y+27,0.43,0,320)
        else
            local enemy=o.enemy
            if enemy then
                local spec=Game.enemyTypes[enemy.kind]
                sprite(self,r,self.enemies[enemy.kind],v.x,v.y+22,spec.scale,math.floor(self.time*10+enemy.id)%spec.frames,spec.frameSize,self.flip[enemy.id])            end
            local e=o.enemy;if e then rect(r,v.x-14,v.y-37,28,4,hex('#283E3B'));rect(r,v.x-14,v.y-37,28*e.hp/e.maxHp,4,hex('#E7A077')) end
        end
    end
    for _,s in self.state.shots do
        local a,b=iso(s.x,s.y),iso(s.tx,s.ty);a=Vector.xy(a.x,a.y-62);b=Vector.xy(b.x,b.y-15)
        local f=1-s.life/0.18;local x=a.x+(b.x-a.x)*f;local y=a.y+(b.y-a.y)*f
        local p=Path.new();p:moveTo(Vector.xy(x-(b.x-a.x)*0.1,y-(b.y-a.y)*0.1));p:lineTo(Vector.xy(x,y));r:drawPath(p,Paint.with({color=hex('#FFE7A3'),style='stroke',thickness=3,cap='round'}))
    end
end
return function(context: Context): Layout<Board>
    return {
        state=Game.new(),
        time=0,
        hover=0,
        vm=nil,
        tower=nil,
        enemies={},
        castle=nil,
        sampler=ImageSampler('clamp','clamp','nearest'),
        lastX={},
        lastY={},
        flip={},
        init=init,
        advance=advance,
        draw=draw,
        pointerDown=pointerDown,
        pointerMove=pointerMove,
        pointerExit=pointerExit
    }
end
