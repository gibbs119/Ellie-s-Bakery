# 🧁 Elise's Bakery

A sweet, kid-friendly bakery tycoon game — now in **3D**! Built for a 7-year-old to
run their own bakery: bake and decorate treats, serve cute customers, and design
every part of the shop.

Everything runs in a single web page. No installs, no accounts, and your bakery is
saved automatically in the browser.

## ▶️ Play it

- **`index.html`** — the new **3D** game (Three.js). This is the main game.
- **`classic.html`** — the original **2D** version (kept as a lighter-weight fallback
  that works fully offline).

### Easiest way to share it with a kid: GitHub Pages
1. Go to the repository **Settings → Pages**.
2. Under **Build and deployment**, set **Source** to *Deploy from a branch*,
   pick the **`main`** branch and the **`/ (root)`** folder, and **Save**.
3. After a minute, the game is live at
   `https://gibbs119.github.io/Ellie-s-Bakery/` — open it on a tablet or phone
   and add it to the home screen.

You can also just open `index.html` in any modern browser.

## 🎮 How to play (for grown-ups helping out)

A friendly guide named **Poppy** points a bobbing arrow at the next thing to do,
so a young child can follow along with no reading required:

1. **Tap the sleepy oven, register, and decorating table** to wake them up.
2. **Fix a wobbly table** so guests can sit.
3. When a guest arrives, **tap their order bubble** to open the **3D studio**.
4. **Build → Bake → Decorate → Serve**: choose cake tiers and flavors, tap the oven
   to bake, add frosting/toppings/drizzle/toppers, then serve it.
5. Earn 🪙 coins, climb from ⭐1 to ⭐5, and spend coins in the **🛍️ Shop**.

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

## 🛠️ Tech notes

- The 3D game uses **Three.js r184** loaded via an ES-module import map from a CDN.
  All models are built procedurally from low-poly primitives (no external 3D asset
  files), so the game stays a single self-contained page.
- Tuned for tablets: capped pixel ratio, soft shadows, one main light, gentle
  touch orbit/zoom controls with limits so a young child can't get lost.
- Progress saves to `localStorage`. The **🔄 Start Over** button (in *My Shop*)
  resets everything.

Made with 💖 for Elise.
