# Missing roster portraits

Generated on 2026-11-17 using the built-in image generation tool. The four missing portraits now live at `public/art/avatars/{dragon,dwarf,knight,mage}.png`; each is a 256×256 RGBA PNG. Unit avatar references in `shared/config/bevy-units.ts` point to these images instead of animation strips. The existing portraits remain unchanged.

## References and prompts

Each call used `public/art/avatars/gryphon.png` as the ticket/style reference and the matching `public/art/units/<unit>.png` animation strip as the character reference, with transparent background enabled.

Shared prompt:

> Create one production game avatar PNG, square canvas. Reference 1 is the exact style and layout guide: copy its flat mustard yellow ticket backing, irregular notched ticket edges, thin darker ochre inset border, upward right tilt, dark brown pixel outlines, chunky pixel clusters and limited shaded palette. Reference 2 is a horizontal animation sheet for character identity only: draw ONE head-and-shoulders portrait, not a sheet. Subject: [subject below]. Match the gryphon's head scale and framing, graphic pixel art with no antialiasing, no painterly texture or extra detail. Ticket fills approximately 80% width, head centered over it. Transparent canvas outside the ticket and silhouette. No text, symbols, labels, extra panels or decorative particles. This must belong to the same existing 256x256 icon set. Save the output image.

Subjects:

- Dragon: black charcoal dragon head and upper neck, ivory horns, orange eye and tan-orange wing edge. Match the black dragon in reference 2.
- Dwarf: stout dwarf head and shoulders, large reddish brown beard, steel blue helmet with a white curled plume, purple shoulder clothing. Match the dwarf in reference 2.
- Knight: steel silver-blue knight helmet and shoulders, closed vertical-slit visor, short dark red plume. Match the knight in reference 2.
- Mage: elderly blue wizard head and shoulders, white beard, tall bent blue pointed hat with a gold band, blue robe and small golden staff edge. Match the mage in reference 2.

Generated originals were retained in the tool's output directory. Runtime copies were resized with macOS sips to match the existing 256×256 canvas. Inspected the resulting images directly; no browser verification, build, lint, typechecks or tests were run.
