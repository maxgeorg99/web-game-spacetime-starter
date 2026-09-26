local Game = require('game')
local function run(s: Game.State, seconds: number)
	for _ = 1,seconds*60 do
		Game.step(s,1/60)
	end
end
return function(): Tests
	return function(test: Tester)
		test.case('Purchases reject occupied pads and insufficient funds',function(expect: (any)->Expectation)
			local s = Game.new()
			expect(Game.build(s,1)).is(true)
			expect(Game.build(s,1)).is(false)
			expect(s.gold).is(100)
			Game.build(s,2);Game.build(s,3)
			expect(Game.build(s,4)).is(false)
			expect(s.gold).is(0);expect(#s.towers).is(3)
		end)
		test.case('An undefended keep loses and cannot restart a wave',function(expect: (any)->Expectation)
			local s = Game.new();Game.start(s);Game.start(s)
			expect(s.wave).is(1)
			run(s,40)
			expect(s.lives).is(0);expect(s.ended).is(true);expect(s.active).is(false)
			Game.start(s);expect(s.wave).is(1)
		end)
		test.case('Three towers clear all waves and rewards are paid once',function(expect: (any)->Expectation)
			local s = Game.new();Game.build(s,1);Game.build(s,2);Game.build(s,4)
			for _ = 1,3 do
				Game.start(s);run(s,50)
			end
			expect(s.wave).is(3);expect(s.ended).is(true);expect(s.lives).greaterThan(0)
			expect(s.kills).is(41);expect(s.gold).is(443)
			local gold = s.gold;run(s,5);expect(s.gold).is(gold)
		end)
		test.case('Wave preview matches the spawned species and quantities',function(expect: (any)->Expectation)
			for waveIndex = 1,#Game.waves do
				local s = Game.new();s.wave = waveIndex-1;s.lives = 1000
				local wave = Game.preview(s)
				expect(wave).is(Game.waves[waveIndex])
				Game.start(s)
				expect(Game.preview(s)).is(wave)
				local counts: {[string]: number} = {}
				local previous = 0
				for _ = 1,60*65 do
					Game.step(s,1/60)
					if s.spawned>previous then
						local e = s.enemies[#s.enemies]
						counts[e.kind] = (counts[e.kind] or 0)+1
						expect(e.maxHp).is(Game.enemyTypes[e.kind].hp*Game.waves[waveIndex].health)
						previous = s.spawned
					end
				end
				for _,group in Game.waves[waveIndex].spawns do
					expect(counts[group.kind]).is(group.count)
				end
				expect(s.spawned).is(Game.waveCount(Game.waves[waveIndex]))
				if waveIndex==#Game.waves then
					expect(Game.preview(s)).is(nil)
				else
					expect(Game.preview(s)).is(Game.waves[waveIndex+1])
				end
			end
		end)
		test.case('Enemy movement, leak damage, and rewards use species stats',function(expect: (any)->Expectation)
			for _,kind in Game.enemyOrder do
				local spec = Game.enemyTypes[kind]
				local s = Game.new();s.active = true;s.wave = 1;s.clock = 999
				local e: Game.Enemy = {x = 0,y = 2,progress = 0,hp = spec.hp,maxHp = spec.hp,id = 1,kind = kind}
				table.insert(s.enemies,e);Game.step(s,0.1)
				expect(e.progress).is(spec.speed*0.1)
				e.progress = 14.99;Game.step(s,0.1)
				expect(s.lives).is(10-spec.damage)
				e.progress = 0;e.x = 0;e.y = 2;e.hp = 1
				table.insert(s.enemies,e);table.insert(s.towers,{x = 0,y = 2,cooldown = 0})
				Game.step(s,0.01)
				expect(s.gold).is(150+spec.reward);expect(s.kills).is(1)
			end
		end)
		test.case('Separate sessions do not share mutable state',function(expect: (any)->Expectation)
			local a = Game.new();Game.build(a,1);Game.start(a);run(a,2)
			local b = Game.new();expect(b.gold).is(150);expect(b.wave).is(0);expect(#b.towers).is(0);expect(#b.enemies).is(0)
		end)
	end
end
