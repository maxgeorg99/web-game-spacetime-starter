# Discovery tile art

Six static transparent PNGs, 96×96, no spritesheet slicing. Total runtime size: 63,368 bytes. Keep originals outside public; runtime uses only compact sprites. OpenAI sources were 1280×1280 and resized using nearest-neighbor sampling, preserving alpha. The originals remain in the Codex generated_images directory.

| Asset     | Source                           | Job / source                                  |
| --------- | -------------------------------- | --------------------------------------------- |
| quarry    | PixelLab Pro Flash               | c4ee9b54-92a4-44ce-a5d5-c85e40198484          |
| orchard   | PixelLab Pro Flash               | 82a3bb03-3b60-42bf-933b-51eff9c9fd0c          |
| watchpost | Built-in OpenAI image generation | exec-6cba2f0b-b743-43d3-94dc-bd779bb32114.png |
| shrine    | Built-in OpenAI image generation | exec-fe3c8987-6259-4249-afff-65d2ffe97d5e.png |
| relic     | Built-in OpenAI image generation | exec-dc9beb55-5f48-4cd5-913c-c74fee1d22f5.png |
| windmill  | Built-in OpenAI image generation | exec-64f259d0-8238-49ba-821b-51cd1c5d3442.png |

PixelLab ran out of generations after two sprites. The user explicitly chose OpenAI as an alternative. No hand-drawn fallback sprites were used.

## PixelLab prompts

Quarry: three chunky warm sandstone boulders with rich gold ore veins, small mining brace and pickaxe; cozy medieval fantasy pixel art, 2:1 isometric camera, muted sage and cream with honey gold, warm outlines, top-left light, transparent background, no terrain slab or text. 96×96, seed 42.

Orchard: two rounded fruit trees with dusky teal/sage leaves, pale yellow pears and a harvest basket; same palette, camera, outlines and lighting as quarry reference 510f9c82-99c7-5b82-b06f-0f4ec865f961. 96×96, seed 43.

## OpenAI prompts

Reference for each: public/art/tiles/quarry.png. Transparent-background output requested. Exact prompts:

### watchpost

Create a separate replacement sprite derived from this reference quarry. Replace the quarry subject completely with Eagle perch: a low, broad, flat-topped pale blue-grey stone lookout platform with three little stone steps and one small wooden eagle-shaped waymarker at the back. Leave the broad top empty for a tower. Not a tall tower. Preserve the reference's cozy fantasy hand-made pixel art, warm dark outlines, muted sage and cream palette, top-left lighting and 2:1 isometric camera. This is a single small game prop, NOT a scene or tile sheet. Crucial size: design on a 96x96 logical pixel grid, ideally return 96x96 PNG. If a larger output is required, use uniform square pixel blocks that survive nearest-neighbor downsampling to 96x96. No fine illustration detail or smooth gradients. Entire prop fits within 80% of canvas width/height, centered, bottom ground contact around 88% height. Genuine transparent background, no floor slab, no island, no cast shadow outside footprint, no text or UI. Match visual weight of quarry.

### shrine

Create a separate replacement sprite derived from this reference quarry. Replace the quarry subject completely with Ember shrine: a small ancient cream-stone altar with a vivid amber flame in a bronze bowl, backed by a short carved stone arch, a few purple runes. Not a house. Preserve the reference's cozy fantasy hand-made pixel art, warm dark outlines, muted sage and cream palette, top-left lighting and 2:1 isometric camera. This is a single small game prop, NOT a scene or tile sheet. Crucial size: design on a 96x96 logical pixel grid, ideally return 96x96 PNG. If a larger output is required, use uniform square pixel blocks that survive nearest-neighbor downsampling to 96x96. No fine illustration detail or smooth gradients. Entire prop fits within 80% of canvas width/height, centered, bottom ground contact around 88% height. Genuine transparent background, no floor slab, no island, no cast shadow outside footprint, no text or UI. Match visual weight of quarry.

### relic

Create a separate replacement sprite derived from this reference quarry. Replace the quarry subject completely with Golden spring: a small circular pool bordered by cream rocks, turquoise water, one gold crystal at its center, two reeds. No building. Preserve the reference's cozy fantasy hand-made pixel art, warm dark outlines, muted sage and cream palette, top-left lighting and 2:1 isometric camera. This is a single small game prop, NOT a scene or tile sheet. Crucial size: design on a 96x96 logical pixel grid, ideally return 96x96 PNG. If a larger output is required, use uniform square pixel blocks that survive nearest-neighbor downsampling to 96x96. No fine illustration detail or smooth gradients. Entire prop fits within 80% of canvas width/height, centered, bottom ground contact around 88% height. Genuine transparent background, no floor slab, no island, no cast shadow outside footprint, no text or UI. Match visual weight of quarry.

### windmill

Create a separate replacement sprite derived from this reference quarry. Replace the quarry subject completely with Windmill: a squat cream plaster medieval windmill, brown shingle roof, four readable cream canvas sails on a wooden cross, small sage-green door. Complete sails inside canvas. Preserve the reference's cozy fantasy hand-made pixel art, warm dark outlines, muted sage and cream palette, top-left lighting and 2:1 isometric camera. This is a single small game prop, NOT a scene or tile sheet. Crucial size: design on a 96x96 logical pixel grid, ideally return 96x96 PNG. If a larger output is required, use uniform square pixel blocks that survive nearest-neighbor downsampling to 96x96. No fine illustration detail or smooth gradients. Entire prop fits within 80% of canvas width/height, centered, bottom ground contact around 88% height. Genuine transparent background, no floor slab, no island, no cast shadow outside footprint, no text or UI. Match visual weight of quarry.

## Timber grove — existing asset composition

`public/art/tiles/grove.png` is a 96×96 transparent PNG (2,099 bytes), assembled from the existing shared pack rather than generated. Two conifers use `assets/sprites/environment/Tree1.png`; the rear birch uses `Tree3.png`. Both sheets have eight 192px-wide frames: Tree1 is 1536×256, Tree3 is 1536×192. Extracted the first frame, trimmed transparent padding, then used nearest-neighbor sizing (44/40px conifers, 38px birch) on a 96px canvas. Final visible bounds are (17,22)–(78,80), leaving side margins on the island tile. Original sources unchanged.

The former `forest.png` is identical to Tree1, but had been incorrectly registered as six 256×256 frames, showing part of its neighboring tree. Removed that unused loader entry and the oversized 95px forest rendering special case. The grove now uses the same image in the island, draft and field guide; its source tile ID and gameplay bonuses remain `forest`.
