# 3D model credits

All bundled models are free for commercial use. Attribution isn't required for
CC0, but it's recorded here as good practice.

| Files | Pack | Author | License | Source |
|-------|------|--------|---------|--------|
| Food, furniture & kitchen models (`cake.glb`, `cupcake.glb`, `croissant.glb`, `table*.glb`, `chair.glb`, `kitchen*.glb`, `wall*.glb`, …) | Food Kit + Furniture Kit + others | **Kenney** (kenney.nl) | **CC0 1.0** (public domain) | kenney.nl/assets |
| `robot.glb` | RobotExpressive | Tomás Laulhé (mods by Don McCurdy) | **CC0 1.0** | three.js examples |

## Using them in the game

Models are wired through the data-driven `CATALOG` in `src/main.js`. Each entry
points at a `.glb` and is auto-fitted to the tile grid:

```js
oven: { glb:'assets/models/kitchenStove.glb', fitH:1.35, rotY:Math.PI }
```

- `fitH` / `fitXZ` — target height or footprint (models are scaled to match and
  rested on the floor automatically, so packs of any native scale just drop in).
- `rotY` — facing. `tint` — recolor. `accent` — a little emoji marker on top.
- `animate` — play a named animation clip (for rigged models).
