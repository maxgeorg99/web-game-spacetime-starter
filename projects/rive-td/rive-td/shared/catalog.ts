export const enemies = [
  { name: 'Skull', hp: 70, speed: 1.125, reward: 12, damage: 2, armor: 0, regen: 0, frames: 6, frameSize: 192, asset: 'Skull_Skull_Run', portrait: 'Skull_Skull Avatar', trait: 'Steady' },
  { name: 'Snake', hp: 28, speed: 1.875, reward: 7, damage: 1, armor: 0, regen: 0, frames: 8, frameSize: 192, asset: 'Snake_Snake_Run', portrait: 'Snake_Snake Avatar', trait: 'Fast' },
  { name: 'Spider', hp: 35, speed: 2.25, reward: 8, damage: 1, armor: 0, regen: 0, frames: 5, frameSize: 192, asset: 'Spider_Spider_Run', portrait: 'Spider_Spider Avatar', trait: 'Swarm' },
  { name: 'Turtle', hp: 180, speed: .55, reward: 18, damage: 2, armor: 10, regen: 0, frames: 7, frameSize: 320, asset: 'Turtle_Turtle_Walk', portrait: 'Turtle_Turtle Avatar', trait: 'Armored' },
  { name: 'Gnome', hp: 48, speed: 1.65, reward: 9, damage: 1, armor: 0, regen: 0, frames: 6, frameSize: 192, asset: 'Gnome_Gnome_Run', portrait: 'Gnome_Gnome Avatar', trait: 'Raider' },
  { name: 'Gnoll', hp: 110, speed: 1.25, reward: 14, damage: 2, armor: 4, regen: 0, frames: 8, frameSize: 192, asset: 'Gnoll_Gnoll_Run', portrait: 'Gnoll_Gnoll Avatar', trait: 'Light armor' },
  { name: 'Bear', hp: 250, speed: .85, reward: 25, damage: 3, armor: 5, regen: 0, frames: 5, frameSize: 256, asset: 'Bear_Bear_Run', portrait: 'Bear_Bear Avatar', trait: 'Heavy' },
  { name: 'Shaman', hp: 125, speed: 1.05, reward: 22, damage: 2, armor: 0, regen: 5, frames: 4, frameSize: 192, asset: 'Shaman_Shaman_Run', portrait: 'Shaman_Shaman Avatar', trait: 'Regenerates' },
  { name: 'Troll', hp: 420, speed: .7, reward: 35, damage: 4, armor: 8, regen: 8, frames: 10, frameSize: 384, asset: 'Troll_Troll_Walk', portrait: 'Troll_Troll Avatar', trait: 'Regenerates' },
  { name: 'Minotaur', hp: 800, speed: .8, reward: 60, damage: 6, armor: 16, regen: 0, frames: 8, frameSize: 320, asset: 'Minotaur_Minotaur_Walk', portrait: 'Minotaur_Minotaur Avatar', trait: 'Boss / armor' },
];
export const towers = [
  { name: 'Archer', cost: 50, damage: 25, range: 3.2, interval: .5, effect: 'Leading target', color: '#E4C77E', asset: 'Blue_Tower' },
  { name: 'Cannon', cost: 90, damage: 58, range: 3, interval: 1.3, effect: '1.5 tile splash', color: '#E99A79', asset: 'Red_Tower' },
  { name: 'Frost', cost: 75, damage: 12, range: 3.1, interval: .65, effect: '55% slow for 2s', color: '#91DCE5', asset: 'Purple_Tower' },
  { name: 'Arcane', cost: 120, damage: 42, range: 3.7, interval: .8, effect: '3 targets / ignores armor', color: '#C3ACF3', asset: 'Yellow_Tower' },
];
export type Point = { x: number; y: number };
function route(corners: number[][]): Point[] {
  const result: Point[] = [];
  let [x,y] = corners[0]; result.push({x,y});
  for (const [tx,ty] of corners.slice(1)) while (x !== tx || y !== ty) {
    x += Math.sign(tx-x); y += Math.sign(ty-y); result.push({x,y});
  }
  return result;
}
export const levels = [
  { name: 'Willow Crossing', size: 19, gold: 250, path: route([[0,3],[13,3],[13,8],[3,8],[3,13],[12,13],[12,18]]), pads: [[2,2],[5,4],[9,2],[14,5],[12,7],[8,9],[4,7],[2,11],[4,12],[8,14],[13,15],[11,17],[11,12],[6,7]] },
  { name: 'Amber Gorge', size: 19, gold: 310, path: route([[0,4],[15,4],[15,9],[4,9],[4,14],[14,14],[14,18]]), pads: [[2,3],[6,5],[10,3],[14,5],[16,7],[12,8],[8,10],[5,8],[3,12],[5,13],[9,15],[15,16],[13,17],[12,13],[10,5],[7,8]] },
  { name: 'The Last Citadel', size: 19, gold: 370, path: route([[0,3],[15,3],[15,8],[3,8],[3,13],[15,13],[15,18]]), pads: [[2,2],[6,4],[10,2],[14,4],[16,6],[13,7],[9,9],[5,7],[2,11],[4,12],[8,14],[12,12],[16,15],[14,17],[7,7],[14,11]] },
];
export const waves = [
  [[0,8],[1,6]], [[2,12],[4,6],[0,6]], [[3,5],[5,8],[1,8]], [[6,3],[7,3],[0,10]],
  [[4,10],[5,8],[2,12]], [[3,6],[6,5],[7,4]], [[1,14],[8,3],[5,8]], [[9,1],[8,3],[7,6]],
  [[2,20],[4,12],[6,6]], [[3,10],[7,8],[8,4]], [[5,14],[6,8],[9,2]], [[0,12],[7,8],[8,6],[9,3]],
];
