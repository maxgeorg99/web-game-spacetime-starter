-- Simulation only: grid coordinates, seconds, and reference-inspired stats.
local M = {}
export type Enemy = {x: number, y: number, progress: number, hp: number, maxHp: number, id: number, kind: string}
export type Tower = {x: number, y: number, cooldown: number}
export type Shot = {x: number, y: number, tx: number, ty: number, life: number}
export type State = {gold: number, lives: number, wave: number, active: boolean, ended: boolean, spawned: number, clock: number, kills: number, enemies: {Enemy}, towers: {Tower}, shots: {Shot}, message: string}
export type EnemySpec = {name: string, hp: number, speed: number, reward: number, damage: number, frames: number, frameSize: number, scale: number, trait: string}
export type Spawn = {kind: string, count: number}
export type Wave = {spawns: {Spawn}, interval: number, health: number}
-- Stats from units.toml; world units convert to 40-unit grid cells.
M.enemyOrder = {"skull", "snake", "spider", "turtle"}
M.enemyTypes = {
    skull = {name="Skull",hp=70,speed=45/40,reward=12,damage=2,frames=6,frameSize=192,scale=0.42,trait="Steady"},
    snake = {name="Snake",hp=20,speed=75/40,reward=7,damage=1,frames=8,frameSize=192,scale=0.42,trait="Fast"},
    spider = {name="Spider",hp=25,speed=90/40,reward=8,damage=1,frames=5,frameSize=192,scale=0.42,trait="Very fast"},
    turtle = {name="Turtle",hp=120,speed=20/40,reward=15,damage=1,frames=7,frameSize=320,scale=0.34,trait="Slow / tough"},
} :: {[string]: EnemySpec}
-- The preview and spawning read this same wave data.
M.waves = {
    {interval=1.25,health=1,spawns={{kind="skull",count=6},{kind="snake",count=4}}},
    {interval=1.1,health=1.35,spawns={{kind="skull",count=4},{kind="snake",count=4},{kind="spider",count=6}}},
    {interval=0.95,health=1.7,spawns={{kind="skull",count=4},{kind="snake",count=4},{kind="spider",count=6},{kind="turtle",count=3}}},
} :: {Wave}
function M.waveCount(wave: Wave): number
    local count=0
    for _,group in wave.spawns do count+=group.count end
    return count
end
function M.spawnKind(wave: Wave, index: number): string
    for _,group in wave.spawns do
        if index<=group.count then return group.kind end
        index-=group.count
    end
    error("Spawn index outside wave")
end
function M.preview(s: State): Wave?
    if s.ended then return nil end
    return M.waves[if s.active then s.wave else s.wave+1]
end
M.path = {{x=0,y=2},{x=1,y=2},{x=2,y=2},{x=3,y=2},{x=4,y=2},{x=5,y=2},{x=6,y=2},{x=6,y=3},{x=6,y=4},{x=6,y=5},{x=6,y=6},{x=5,y=6},{x=4,y=6},{x=3,y=6},{x=3,y=7},{x=3,y=8}}
M.pads = {{x=2,y=1},{x=4,y=3},{x=7,y=4},{x=5,y=5},{x=1,y=6}}
M.cost = 50
M.range = 2.5
function M.new(): State
    return {gold=150,lives=10,wave=0,active=false,ended=false,spawned=0,clock=0,kills=0,enemies={},towers={},shots={},message="Place towers on the golden pads."}
end
function M.build(s: State, index: number): boolean
    if s.ended then return false end
    local p = M.pads[index]
    if not p then return false end
    for _,t in s.towers do if t.x==p.x and t.y==p.y then s.message="Tower ready. Range: 2.5 tiles."; return false end end
    if s.gold < M.cost then s.message="Need 50 gold. Defeat enemies to earn more."; return false end
    s.gold -= M.cost
    table.insert(s.towers,{x=p.x,y=p.y,cooldown=0})
    s.message="Tower built. Start the wave when ready."
    return true
end
function M.start(s: State)
    if s.active or s.ended then return end
    s.wave += 1; s.active=true; s.spawned=0; s.clock=0
    s.message="Defend the keep! You can build during a wave."
end
function M.step(s: State, dt: number)
    if s.ended then return end
    for i=#s.shots,1,-1 do
        s.shots[i].life -= dt
        if s.shots[i].life<=0 then table.remove(s.shots,i) end
    end
    if not s.active then return end
    s.clock -= dt
    local wave = M.waves[s.wave]
    local count = M.waveCount(wave)
    if s.spawned<count and s.clock<=0 then
        s.clock += wave.interval; s.spawned+=1
        local kind=M.spawnKind(wave,s.spawned)
        local hp=M.enemyTypes[kind].hp*wave.health
        table.insert(s.enemies,{x=0,y=2,progress=0,hp=hp,maxHp=hp,id=s.spawned,kind=kind})
    end
    for i=#s.enemies,1,-1 do
        local e=s.enemies[i]
        local spec=M.enemyTypes[e.kind]
        e.progress += dt*spec.speed
        local n=math.floor(e.progress)+1
        if n>=#M.path then
            s.lives=math.max(0,s.lives-spec.damage); table.remove(s.enemies,i)
        else
            local a,b=M.path[n],M.path[n+1]
            local f=e.progress%1
            e.x=a.x+(b.x-a.x)*f; e.y=a.y+(b.y-a.y)*f
        end
    end
    if s.lives<=0 then s.ended=true;s.active=false;s.message="The keep fell. Reset and try a new placement.";return end
    for _,t in s.towers do
        t.cooldown=math.max(0,t.cooldown-dt)
        if t.cooldown==0 then
            local target: Enemy?=nil
            for _,e in s.enemies do
                if (e.x-t.x)^2+(e.y-t.y)^2<=M.range^2 and (target==nil or e.progress>target.progress) then target=e end
            end
            if target then
                target.hp-=25;t.cooldown=0.5
                table.insert(s.shots,{x=t.x,y=t.y,tx=target.x,ty=target.y,life=0.18})
                if target.hp<=0 then
                    for i,e in s.enemies do if e==target then table.remove(s.enemies,i);break end end
                    s.gold+=M.enemyTypes[target.kind].reward;s.kills+=1
                end
            end
        end
    end
    if s.spawned==count and #s.enemies==0 then
        s.active=false
        if s.wave==#M.waves then s.ended=true;s.message="Victory! The keep is safe. Reset to play again."
        else s.gold+=25;s.message="Wave cleared! +25 gold. Build, then start again." end
    end
end
return M
