# 🧁 Elise's Bakery

A sweet, kid-friendly bakery tycoon game — in **3D**! Built for a 7-year-old to
run their own bakery: bake and decorate treats, serve cute customers, and design
every part of the shop.

It's a **Vite + TypeScript** web app using **Three.js**, installable as a PWA. It
runs fully on the device — progress saves right in the browser, with no backend,
accounts, or internet connection needed after the first load.

## ▶️ Play / host it

The game is built with Vite and deployed automatically to **GitHub Pages** by a
GitHub Actions workflow (`.github/workflows/deploy.yml`) on every push to `main`.

One-time setup: repository **Settings → Pages → Build and deployment → Source →
GitHub Actions**. After the next push, it's live at
`https://gibbs119.github.io/Ellie-s-Bakery/`.

Locally:

```bash
npm install
npm run dev      # dev server with hot reload
npm run build    # production build into dist/
npm run preview  # preview the production build
```

The **2D** original is preserved at `public/classic.html` (served alongside the 3D
game, needs no build and works fully offline).

## 🎮 How to play (for grown-ups helping out)

A friendly guide named **Poppy** points a bobbing arrow at the next thing to do,
so a young child can follow along with no reading required:

1. **Tap the sleepy oven, register, and decorating table** to wake them up.
2. **Fix a wobbly table** so guests can sit.
3. When a guest arrives, **tap their order bubble** to open the **3D studio**.
4. **Build → Bake → Decorate → Serve**: choose cake tiers and flavors, tap the oven
   to bake, add frosting/toppings/drizzle/toppers, then serve it.
5. Earn 🪙 coins, climb from ⭐1 to ⭐5, and spend coins in the **🛍️ Shop**.

**No wrong answers:** guests happily pay full price for whatever she makes, so
experimenting is never punished — matching their exact request just earns a small
bonus. Nobody loses patience or walks in while she's decorating, either.

## 🎯 Goals & stickers

The **Goals** tab keeps three little challenges on the go — *serve 3 treats*,
*put 5 toppings on one treat*, *earn 40 coins*. They have **no timer and can't be
failed**: finishing one pays out coins instantly and a fresh goal takes its place,
so there's always something to aim for. Goals only offer treats she's unlocked.

Underneath is a **sticker book** — 22 collectible stickers for milestones like
first treat, 50 treats, a birthday party, ⭐5, and a full menu. Stickers show as
`???` until earned, then pop into place. A badge on the tab shows when something
new is waiting.

## ✨ What you can customize

- **The food:** cakes (1–3 tiers, chocolate/vanilla/strawberry/mint/rainbow),
  cookies (shapes + dough), ice cream (cone/cup + up to 3 scoops), plus 3D toppings,
  drizzles, and toppers. Birthday **animal cakes** (lion/giraffe/leopard) too.
- **The restaurant:** shop name, logo emoji + color, **wall colors**, **floor styles**,
  table designs, and placeable decorations (flowers, plants, rugs, balloons, teddy,
  play area, fountain).
- **The team:** hire a **Waitress** and a **Baker** who help serve, and dress Elise in
  costumes (chef hat, fairy, kitty, crown, superstar).
- **The prices:** set the price of every treat yourself — too high and guests grumble!

## 📱 Install it as an app (PWA)

On a phone or tablet you can add it to the home screen and it opens full-screen with
its own cupcake icon, just like a real app:

- **iPad/iPhone (Safari):** open the Pages URL → Share → *Add to Home Screen*.
- **Android/Chrome:** open the URL → menu → *Install app* / *Add to Home screen*.

A service worker caches the app shell, so after the first load it starts fast and
keeps working offline.

## 💾 Where saves live

Everything is stored **locally on the device** in the browser's `localStorage` —
no backend, no accounts, no network. The bakery persists between visits on the
same device/browser, and the **🔄 Start Over** button (in *My Shop*) clears it.

Because it's local, saves don't follow you to a different device or browser, and
clearing site data / browser storage wipes progress. Installing it as a PWA (below)
keeps the same local save.

## 🎨 Adding real 3D art packs (Kenney / Quaternius / Poly Pizza)

The game ships with hand-built low-poly models so it works with zero downloads, but
it's wired for a **data-driven model catalog** — dropping in professional CC0 art is
a data change, not a code change:

1. Download `.glb` models from a **CC0** source (no attribution, commercial-safe):
   - [Kenney.nl](https://kenney.nl/assets) — Food Kit, Furniture Kit, characters, etc.
   - [Quaternius](https://poly.pizza/u/Quaternius) — rigged characters + props.
   - [Poly Pizza](https://poly.pizza/explore) — check each model is CC0 (some are CC-BY).
2. Put the files in `public/assets/models/` and add a URL to the item in the
   `CATALOG` object inside `src/main.js`, e.g.
   `plant:{ glb:'assets/models/plant.glb', scale:0.5 }`.
3. The loader swaps the procedural placeholder for the model automatically, with
   `DRACOLoader` for compressed meshes and skeletal-animation support for rigged
   characters.

**Tip:** pick a single art family (all Kenney *or* all Quaternius) — mismatched
styles are the biggest "amateur" tell.

## 🗂️ Project structure

```
index.html              Vite entry (UI markup + styles)
src/main.js             the game (Three.js scene, logic, studio, UI)
public/                 static assets served at the site root
  classic.html            the 2D original
  manifest.json, sw.js    PWA manifest + service worker
  fonts/                  self-hosted Baloo 2 + Nunito (OFL)
  icons/                  app icons
.github/workflows/      GitHub Pages build + deploy
```

## 🛠️ Tech notes

- **Three.js r184** bundled from npm (no CDN), with `GLTFLoader` for `.glb`
  models and a procedural fallback, so the built game is fully self-contained.
- **Fonts are self-hosted** (Baloo 2 + Nunito, SIL OFL — see `public/fonts/`), so
  the lettering survives offline, including text baked into 3D textures like the
  shop sign, menu board, and station name plates.
- Tuned for tablets, **including older iPads**: three graphics levels (*Fancy /
  Smooth / Fastest*) controlling pixel ratio, antialiasing, shadow quality and
  image-based lighting. **Auto** picks one, then watches the real frame rate and
  steps down if the device struggles, remembering the result for next launch —
  or pin a level in *My Shop → Graphics*. Also recovers from WebGL context loss,
  and the build targets older Safari (iOS 13+).
- Gentle touch orbit/zoom controls with limits so a young child can't get lost.
- **Audio:** everything is synthesized with the Web Audio API — no audio files, so
  it works offline. A gentle I–V–vi–IV tune plays with a bass note, chord pad and
  a wandering pentatonic melody over separate music/effects buses (lightly
  compressed), plus distinct effects for coins, the oven bell, and prizes. 🔊 mute
  lives in the top bar and there's a volume slider in *My Shop → Sound*.
- Progress saves to `localStorage` on the device — no backend or accounts. The
  **🔄 Start Over** button (in *My Shop*) resets everything.

Made with 💖 for Elise.
