# Crystal Quest

A small 16-bit style JRPG that runs in the browser. Someone in black armor has stolen the Crystal of Light from the village of Millbrook, and it's up to Kael (plus whoever he can talk into coming along) to get it back.

It's built to feel like the SNES games it borrows from: gradient menu windows you can recolor, a pointing-glove cursor, turn-based battles with bouncing damage numbers, a mosaic swirl when a fight starts, and chiptune music. Every sprite, tile and menu is drawn in code at 256×224 and scaled up with crisp pixels, so the game ships without a single image asset.

![Title screen](docs/screenshots/title.png)

| | |
|---|---|
| ![Millbrook village](docs/screenshots/village.png) | ![A battle in the forest](docs/screenshots/battle.png) |
| ![Shadowfang Cave](docs/screenshots/cave.png) | ![The Dark Knight](docs/screenshots/boss.png) |
| ![Bram's shop](docs/screenshots/shop.png) | ![Equipment screen](docs/screenshots/equip.png) |

## Playing

| Action | Keyboard | Touch |
|---|---|---|
| Move | Arrow keys or WASD | D-pad |
| Talk / confirm | Z, Enter or Space | A |
| Cancel | X or Backspace | B |
| Run | Hold X or Shift while walking | Hold B |
| Menu | Esc or C | START |

On phones and tablets the on-screen controls show up automatically. On a desktop you can switch them on with the gamepad button in the top bar. The bar also has buttons for sound, the CRT scanline filter and fullscreen.

The whole adventure takes about half an hour:

- **Millbrook:** talk to Elder Rowan, recruit Lira, shop at Bram's, rest at the inn.
- **Whispering Forest:** random encounters, a couple of treasure chests, and Finn, who has opinions about loot.
- **Shadowfang Cave:** darker, torch-lit, with tougher monsters and the Dark Knight waiting at the end.

You can save to one of three files from the menu any time you're not in a fight. Settings (window color, text speed, battle speed, sound, music, CRT filter) are remembered between visits.

<img src="docs/screenshots/mobile.png" alt="Playing on a phone" width="300">

## Running it

You'll need Node 20 or newer.

```bash
npm install
npm run dev        # http://localhost:3000
```

Other scripts:

```bash
npm run build      # production build
npm start          # serve the production build
npm test           # unit tests (Vitest)
npm run lint
npm run typecheck
```

## How it's put together

It's a Next.js app, but React only draws the page around the game: the bezel, the toolbar and the touch controls. The game itself is a single `<canvas>` driven by a small engine.

```
src/
  engine/    game loop, input (keyboard + touch), scene stack, audio synth
  gfx/       pixel font, windows & icons, sprite templates, tiles, enemies,
             battle backdrops and effects
  scenes/    title, overworld, dialogue, menu, shop, battle, save, config, ending
  systems/   pure game rules: battle math, levelling, inventory, saves, settings
  data/      maps (as ASCII art), dialogue, characters, skills, items, enemies, music
  store/     zustand store holding the party, inventory, flags and settings
  world/     pre-renders each map's ground layer
```

A few things worth knowing if you want to change something:

- **Maps are ASCII.** Each map in `src/data/maps.ts` is a grid of characters (`.` grass, `=` path, `T` tree, `%` rock wall and so on). The legend is at the top of the file and in `src/gfx/tiles.ts`. Path edges, shorelines and cliff faces are worked out automatically from the neighbouring tiles.
- **People are 16×24 pixel templates** in `src/gfx/characterTemplates.ts`, mixed and recolored per character in `src/gfx/characters.ts`. Monsters are built from shaded shapes in `src/gfx/enemies.ts`.
- **Dialogue drives the story.** Lines can set flags, start fights, open the shop, heal the party or add someone to it. NPCs pick what to say based on those flags.
- **Music is plain text.** Tracks in `src/data/music.ts` are written note by note and played through the Web Audio API. All of it is original.
- **The tests check the content too.** Besides battle maths and save files, they walk every map to make sure each exit, NPC and chest can actually be reached. That's the kind of mistake that quietly breaks a game.
