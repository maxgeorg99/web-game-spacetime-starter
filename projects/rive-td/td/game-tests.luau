local Game=require('game')
local function run(s: Game.State,seconds: number) for _=1,seconds*10 do Game.step(s,0.1) end end
return function(): Tests
 return function(test: Tester)
  test.case('Four towers have distinct prices and reject occupied pads',function(expect: (any)->Expectation)
   local s=Game.new();expect(Game.build(s,1,1)).is(true);expect(Game.build(s,1,2)).is(false);expect(s.gold).is(200)
   expect(Game.build(s,2,2)).is(true);expect(Game.build(s,3,3)).is(true);expect(Game.build(s,4,4)).is(false);expect(s.gold).is(35)
  end)
  test.case('All three maps are 19 by 19 and pads are off the road',function(expect: (any)->Expectation)
   expect(#Game.catalog.enemies).is(10);expect(#Game.catalog.towers).is(4)
   for _,level in Game.catalog.levels do expect(level.size).is(19);for _,p in level.pads do for _,q in level.path do expect(p.x==q.x and p.y==q.y).is(false) end end end
  end)
  test.case('Campaign progresses across all three battlefields',function(expect: (any)->Expectation)
   local s=Game.new()
   for level=1,3 do
    s.gold=100000
    for pad=1,#Game.catalog.levels[level].pads do Game.build(s,pad,if pad%3==0 then 3 else 4) end
    for _=1,4 do Game.start(s);run(s,200) end
    expect(s.lives).greaterThan(0);expect(s.phase).is(if level==3 then 3 else 2)
    if level<3 then s=Game.next(s);expect(s.level).is(level+1);expect(#s.towers).is(0) end
   end
  end)
  test.case('No defense eventually loses and cannot start again',function(expect: (any)->Expectation)
   local s=Game.new();Game.start(s);Game.start(s);expect(s.wave).is(1);run(s,200);Game.start(s);run(s,200)
   expect(s.phase).is(4);expect(s.lives).is(0);local wave=s.wave;Game.start(s);expect(s.wave).is(wave)
  end)
  test.case('Server snapshot decodes indices and never shares state',function(expect: (any)->Expectation)
   local s=Game.snapshot('1,1,2,1,99,27,3,4,5#0,3,2,3,0#5,9,1,2,3,400,800,1#2,3,1,2,3,0.2')
   if s then expect(s.level).is(2);expect(s.towers[1].kind).is(4);expect(s.enemies[1].kind).is(10);expect(s.gold).is(99) end
   expect(Game.snapshot('invalid')).is(nil);local a=Game.new();Game.build(a,1,1);expect(Game.new().gold).is(250)
  end)
 end
end
