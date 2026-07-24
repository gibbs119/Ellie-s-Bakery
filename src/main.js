import * as THREE from 'three';
import { OrbitControls } from 'three/addons/controls/OrbitControls.js';
import { GLTFLoader } from 'three/addons/loaders/GLTFLoader.js';
import { DRACOLoader } from 'three/addons/loaders/DRACOLoader.js';
import { clone as skeletonClone } from 'three/addons/utils/SkeletonUtils.js';
import { RoomEnvironment } from 'three/addons/environments/RoomEnvironment.js';

/* animation mixers for any loaded rigged GLB models, ticked each frame */
const mixers = [];

/* =========================================================
   SAFE STORAGE
========================================================= */
const store = (() => {
  let mem = {}, ok = false;
  try { localStorage.setItem('__t','1'); localStorage.removeItem('__t'); ok = true; } catch(e){}
  return {
    get(k){ try { return ok ? localStorage.getItem(k) : (mem[k] ?? null); } catch(e){ return mem[k] ?? null; } },
    set(k,v){ try { if(ok) localStorage.setItem(k,v); else mem[k]=v; } catch(e){ mem[k]=v; } },
    del(k){ try { if(ok) localStorage.removeItem(k); else delete mem[k]; } catch(e){ delete mem[k]; } }
  };
})();

/* =========================================================
   DATA
========================================================= */
const ITEMS = {
  cake:      {ico:'🍰', name:'Cakes',        base:10, always:true},
  cookie:    {ico:'🍪', name:'Cookies',      base:6,  cost:30,  star:2},
  donut:     {ico:'🍩', name:'Donuts',       base:5,  cost:40,  star:2, simple:true},
  iceCream:  {ico:'🍦', name:'Ice Cream',    base:7,  cost:50,  star:3},
  croissant: {ico:'🥐', name:'Croissants',   base:6,  cost:60,  star:3, simple:true},
  muffin:    {ico:'🧁', name:'Muffins',      base:7,  cost:80,  star:3, simple:true},
  animalCake:{ico:'🦁', name:'Animal Cakes', base:32, cost:120, star:4, party:true},
};
const CAKE_FLAVORS = [
  {id:'choc',    name:'Chocolate',  ico:'🍫', color:'#6B4226'},
  {id:'vanilla', name:'Vanilla',    ico:'🍰', color:'#FBE8C8'},
  {id:'strawb',  name:'Strawberry', ico:'🍓', color:'#FF9EC4'},
  {id:'mint',    name:'Mint',       ico:'🌿', color:'#A8E6CF'},
  {id:'blue',    name:'Blueberry',  ico:'🫐', color:'#9AB8E6'},
  {id:'lemon',   name:'Lemon',      ico:'🍋', color:'#FFE07A'},
  {id:'rainbow', name:'Rainbow',    ico:'🌈', color:'rainbow'},
];
const COOKIE_SHAPES = [
  {id:'circle', name:'Circle', ico:'🔵'}, {id:'heart', name:'Heart', ico:'💗'}, {id:'star', name:'Star', ico:'⭐'},
  {id:'flower', name:'Flower', ico:'🌸'}, {id:'square', name:'Square', ico:'🟦'}, {id:'diamond', name:'Diamond', ico:'💎'},
  {id:'hexagon', name:'Hexagon', ico:'🔶'}, {id:'moon', name:'Moon', ico:'🌙'}, {id:'cloud', name:'Cloud', ico:'☁️'},
  {id:'butterfly', name:'Butterfly', ico:'🦋'}, {id:'egg', name:'Egg', ico:'🥚'}, {id:'gift', name:'Gift', ico:'🎁'},
];
const COOKIE_DOUGHS = [
  {id:'sugar', name:'Sugar', color:'#EFC98A'}, {id:'choc', name:'Chocolate', color:'#7A4B2A'}, {id:'ginger', name:'Ginger', color:'#C98B4B'},
  {id:'honey', name:'Honey', color:'#E8B94A'}, {id:'velvet', name:'Red Velvet', color:'#C24E5C'},
];
const SCOOP_FLAVORS = [
  {id:'straw', name:'Strawberry', color:'#FFB3CE'}, {id:'vanilla', name:'Vanilla', color:'#FFF4DC'},
  {id:'choc', name:'Chocolate', color:'#8A5A44'}, {id:'mint', name:'Mint', color:'#A8E6CF'}, {id:'blue', name:'Bubblegum', color:'#BDE3F5'},
  {id:'cherry', name:'Cherry', color:'#FF6B8A'}, {id:'mango', name:'Mango', color:'#FFC24C'}, {id:'grape', name:'Grape', color:'#C8A0FF'},
];
const FROSTINGS = ['#FF9EC4','#FFF4DC','#8A5A44','#A8E6CF','#E4C1F9','#FFD166','#BDE3F5','#FFB4A2','#C8A0FF','#9AD0EC','#B5EAD7','#FF6FA5'];
const DRIZZLES = [{id:'choc',color:'#5C3A21',name:'Choc'},{id:'berry',color:'#E84E8A',name:'Berry'},{id:'gold',color:'#FFD166',name:'Gold'},{id:'none',color:null,name:'None'}];
const TOPPINGS = ['🍓','🍒','✨','🍬','🫐','🍫','🌸','🍭','🥝','🍊','🌈','⭐','💖','🧡','🍯','🥥'];
const TOPPERS = [{id:'candle',ico:'🕯️'},{id:'star',ico:'🌟'},{id:'cherry',ico:'🍒'},{id:'none',ico:'🚫'}];
const ANIMALS = [{id:'lion',ico:'🦁',name:'Lion',color:'#E0A93B'},{id:'giraffe',ico:'🦒',name:'Giraffe',color:'#F2C14E'},{id:'leopard',ico:'🐆',name:'Leopard',color:'#D9A05B'}];
const FURN = {
  flowerPot:{ico:'🌷', name:'Flowers',     cost:20, star:1, desc:'So pretty!'},
  plant:    {ico:'🪴', name:'Plant',       cost:25, star:1, desc:'Cozy vibes'},
  rug:      {ico:'🟪', name:'Pink Rug',    cost:15, star:1, desc:'Walk on it!', walkable:true},
  balloons: {ico:'🎈', name:'Balloons',    cost:30, star:2, desc:'Party time!'},
  teddy:    {ico:'🧸', name:'Teddy Corner',cost:35, star:2, desc:'Kids love it!'},
  playArea: {ico:'🛝', name:'Play Area',   cost:80, star:3, desc:'Kids wait way longer'},
  fountain: {ico:'⛲', name:'Fountain',    cost:90, star:4, desc:'Fancy fancy!'},
  robot:    {ico:'🤖', name:'Robo Pal',    cost:40, star:2, desc:'A dancing robot friend!'},
  bench:    {ico:'🪑', name:'Bench',       cost:28, star:2, desc:'Comfy seating'},
  lamp:     {ico:'💡', name:'Floor Lamp',  cost:32, star:2, desc:'Warm cozy glow'},
  bookcase: {ico:'📚', name:'Bookcase',    cost:45, star:3, desc:'A reading nook'},
  coffee:   {ico:'☕', name:'Coffee Bar',  cost:50, star:3, desc:'Fancy drinks!'},
  sofa:     {ico:'🛋️', name:'Comfy Sofa',  cost:70, star:3, desc:'Lounge in style'},
  fridge:   {ico:'🧊', name:'Treat Fridge',cost:60, star:3, desc:'Keeps treats cool'},
  washSink: {ico:'🚰', name:'Wash Station',cost:38, star:2, desc:'Wash your hands!'},
  toilet:   {ico:'🚽', name:'Toilet',      cost:35, star:2, desc:'A little bathroom'},
  mirror:   {ico:'🪞', name:'Mirror',      cost:24, star:2, desc:'Looking good!'},
  bathCabinet:{ico:'🚻', name:'Bath Cabinet',cost:30, star:2, desc:'Bathroom storage'},
  kitchenSink:{ico:'🧼', name:'Kitchen Sink',cost:40, star:3, desc:'For washing up'},
};
const UPGRADES = {
  art:   {ico:'🖼️', name:'Wall Art',       cost:45,  star:2, desc:'Paintings on the walls!'},
  lights:{ico:'✨', name:'Sparkly Lights', cost:60,  star:3, desc:'Glowing lights above!'},
  expand:{ico:'🏗️', name:'Expand Bakery',  cost:150, star:4, desc:'Bigger room + 2 more table spots!'},
};
const STAFF = {
  waitress:{ico:'👩‍🦰', name:'Waitress Wendy', cost:70, star:2, desc:'Delivers treats + patient guests', color:'#6ECEB2', hair:'#C24E4E'},
  baker:   {ico:'🧑‍🍳', name:'Baker Ben',      cost:90, star:3, desc:'Serves waiting guests for you', color:'#FFFFFF', hair:'#5C3A21'},
};
const COSTUMES = [
  {id:'pink', ico:'🎀', name:'Pink Bow', cost:0}, {id:'chef', ico:'👩‍🍳', name:'Chef Hat', cost:20},
  {id:'fairy', ico:'🧚', name:'Fairy Baker', cost:45}, {id:'cat', ico:'🐱', name:'Kitty Baker', cost:60},
  {id:'crown', ico:'👑', name:'Bakery Queen', cost:75}, {id:'star', ico:'🌟', name:'Superstar', cost:100},
];
const LOGO_EMOJIS = ['🧁','🍰','🍪','🍩','🌈','🦄','🍓','💖','🐱','🌸','⭐','🍦','🎂','🍭','🦋','🐰','👑','🍀'];
const LOGO_COLORS = ['#FFD166','#FF9EC4','#A8E6CF','#BDE3F5','#E4C1F9','#FFB4A2','#FFE07A','#9AD0EC','#C8A0FF','#FF6FA5'];
const WALL_THEMES = [
  {id:'blush', name:'Blush',   right:'#F7BFD9', left:'#F3AECF'},
  {id:'mint',  name:'Mint',    right:'#B7E4CF', left:'#A3D9BE'},
  {id:'sky',   name:'Sky',     right:'#BFD9F7', left:'#AECBEF'},
  {id:'lilac', name:'Lilac',   right:'#DBC7F0', left:'#CBB4E8'},
  {id:'butter',name:'Butter',  right:'#FFE6A8', left:'#FFDA88'},
  {id:'peach', name:'Peach',   right:'#FFD3B6', left:'#FFC29A'},
  {id:'rose',  name:'Rose',    right:'#FF9EC4', left:'#FB86B4'},
  {id:'aqua',  name:'Aqua',    right:'#A8E6E0', left:'#8FDAD3'},
  {id:'grape', name:'Grape',   right:'#C6A8E6', left:'#B593DE'},
  {id:'sunny', name:'Sunny',   right:'#FFE07A', left:'#FFD24D'},
  {id:'polka', name:'Polka',   right:'#FF9EC4', left:'#FFAFCB', pattern:'dots'},
  {id:'candy', name:'Stripes', right:'#A8E6CF', left:'#B7ECD9', pattern:'stripes'},
  {id:'starry',name:'Stars',   right:'#BFD9F7', left:'#CDE3FB', pattern:'stars'},
  {id:'love',  name:'Hearts',  right:'#F7BFD9', left:'#FAD0E4', pattern:'hearts'},
];
/* pattern: check | dots | hearts | stars | stripes | planks */
const FLOOR_THEMES = [
  {id:'cream', name:'Cream',  a:'#FBEAD7', b:'#F6DDC0', pattern:'check'},
  {id:'pink',  name:'Pink',   a:'#FCE0EC', b:'#F7CBDD', pattern:'check'},
  {id:'mint',  name:'Mint',   a:'#DDF2E6', b:'#C6E7D4', pattern:'check'},
  {id:'wood',  name:'Wood',   a:'#E6C79C', b:'#D8B382', pattern:'planks'},
  {id:'candy', name:'Candy',  a:'#FDE1E1', b:'#E1EEFD', pattern:'check'},
  {id:'dots',  name:'Dots',   a:'#FFF3E2', b:'#FF9EC4', pattern:'dots'},
  {id:'hearts',name:'Hearts', a:'#FFF0F5', b:'#FF6FA5', pattern:'hearts'},
  {id:'stars', name:'Stars',  a:'#EAF3FF', b:'#FFD166', pattern:'stars'},
  {id:'stripe',name:'Stripes',a:'#FFF6E5', b:'#A8E6CF', pattern:'stripes'},
  {id:'bubble',name:'Bubbles',a:'#EAF6FF', b:'#9AD0EC', pattern:'dots'},
];
const ADULT_HAIR = ['#5C3A21','#8A6242','#2E2E2E','#B5651D','#C9A24B','#7A4B2A','#A64B9B','#4B6FA6'];
const ADULT_SKIN = ['#F7C69B','#E8B183','#C68642','#8D5524','#F1D2B6'];
const BODY_COLORS = ['#FF6FA5','#6ECEB2','#FFD166','#BDE3F5','#E4C1F9','#FFB4A2','#A8E6CF','#F48FB1','#9AD0EC'];
const KID_HAIR = ['#5C3A21','#8A6242','#2E2E2E','#C9A24B','#B5651D'];
const STAR_PTS = [0, 50, 140, 300, 520];

const STATIONS = {
  oven: { ico:'🔥', name:'Oven', fixCost:3,
    tiers:[
      {name:'Sleepy Oven 💤', perk:'Tap to wake it up so you can bake!'},
      {name:'Cozy Oven', perk:'You can bake! 🎂'},
      {name:'Shiny Oven', cost:60, perk:'Bakes faster — bigger oven taps!'},
      {name:'Rainbow Oven', cost:140, perk:'Super fast + sparkles! ✨'},
    ]},
  deco: { ico:'🎨', name:'Decorating Station', fixCost:8,
    tiers:[
      {name:'Messy Table 💤', perk:'Tidy it up to decorate treats!'},
      {name:'Craft Table', perk:'Frosting + toppings unlocked!'},
      {name:'Artist Table', cost:50, perk:'Unlocks drizzle + more colors!'},
      {name:'Magic Studio', cost:120, perk:'Unlocks cake toppers + ALL toppings!'},
    ]},
  register: { ico:'💰', name:'Cash Register', fixCost:5,
    tiers:[
      {name:'Wobbly Register 💤', perk:'Fix it so guests can order!'},
      {name:'Little Register', perk:'Guests can line up and order!'},
      {name:'Ding Register', cost:45, perk:'+2 coin tip on every order!'},
      {name:'Golden Register', cost:110, perk:'+4 coin tip on every order!'},
    ]},
  display: { ico:'🧁', name:'Display Case', fixCost:40, buyable:true,
    tiers:[
      {name:'Empty Corner', perk:'Add a display case — it sells treats by itself!'},
      {name:'Sweet Case', perk:'Sells treats all by itself! +2🪙'},
      {name:'Big Case', cost:75, perk:'Sells more, more often! +3🪙'},
      {name:'Grand Case', cost:150, perk:'A treat-selling machine! +4🪙'},
    ]},
};
const TABLE_TIERS = [
  {name:'Wobbly Table 💤', perk:'Fix it so guests can sit!'},
  {name:'Cafe Table', perk:'A cozy spot for one guest!'},
  {name:'Pretty Table', cost:25, perk:'Happy guests leave +2🪙!'},
  {name:'Royal Table', cost:60, perk:'Happy guests leave +4🪙!'},
];
const TABLE_BUY_COST = [5, 30, 55, 85, 110, 140];

/* =========================================================
   STATE
========================================================= */
const DEFAULT = () => ({
  shopName:"Elise’s Bakery",
  logo:{emoji:'🧁', color:'#FFD166'},
  wallTheme:'blush', floorTheme:'cream',
  coins:25, starPts:0, served:0, earned:0, parties:0,
  prices:{cake:10, cookie:6, donut:5, iceCream:7, croissant:6, muffin:7, animalCake:32},
  unlockedItems:['cake'],
  stations:{oven:0, deco:0, register:0, display:-1},
  tables:[0,-1,-1,-1,-1,-1],
  inventory:{}, placed:[],
  upgrades:[], staff:[],
  costumes:['pink'], costume:'pink',
  elise:{skin:'#F7C69B', hair:'#6B3F2A', color:'#FF6FA5'},
  tableColor:null,
  objIdx:0,
});
let S = DEFAULT();
try { const raw = store.get('eliseBakery3D'); if (raw) S = Object.assign(DEFAULT(), JSON.parse(raw)); } catch(e){}
S.elise = Object.assign({skin:'#F7C69B', hair:'#6B3F2A', color:'#FF6FA5'}, S.elise||{});
/* customization palettes */
const SKINS = ['#F7C69B','#F1D2B6','#E8B183','#C68642','#8D5524','#5C3A2E'];
const HAIRS = ['#6B3F2A','#2E2E2E','#C9A24B','#B5651D','#A64B9B','#4B6FA6','#FF6FA5','#E84E8A','#6ECEB2'];
const OUTFITS = ['#FF6FA5','#6ECEB2','#FFD166','#BDE3F5','#E4C1F9','#FFB4A2','#C8A0FF','#9AD0EC','#F48FB1'];
const TABLECLOTHS = [null,'#FF9EC4','#A8E6CF','#BDE3F5','#E4C1F9','#FFD166','#FFB4A2','#C8A0FF'];
function save(){ store.set('eliseBakery3D', JSON.stringify(S)); }

/* =========================================================
   HELPERS
========================================================= */
const $ = id => document.getElementById(id);
const rand = a => a[Math.floor(Math.random()*a.length)];
function stars(){ let s=1; for (let i=0;i<STAR_PTS.length;i++){ if (S.starPts>=STAR_PTS[i]) s=i+1; } return Math.min(s,5); }
function addStarPts(n){
  const before=stars(); S.starPts+=n; const after=stars();
  if (after>before){
    setTimeout(()=>{ confetti(30); toast('⭐ '+after+' STARS! Your bakery is growing! ⭐',2600); bigChime(); renderShop(); renderTop(); }, 700);
  }
}
function toast(msg, ms=1700){
  const t=$('toast'); t.innerHTML=msg; t.classList.add('show');
  clearTimeout(t._h); t._h=setTimeout(()=>t.classList.remove('show'), ms);
}
function confetti(n=14){
  for (let i=0;i<n;i++){
    const c=document.createElement('div'); c.className='confetti';
    c.textContent=['🎉','✨','💖','🌟','🎊'][i%5];
    c.style.left=(Math.random()*100)+'vw';
    c.style.animationDuration=(1+Math.random()*1.2)+'s';
    document.body.appendChild(c); setTimeout(()=>c.remove(),2600);
  }
}
function coinFlyScreen(sx, sy, amt){
  const c=document.createElement('div');
  c.className='coinfly';
  c.style.left=sx+'px'; c.style.top=sy+'px';
  c.textContent='🪙+'+amt;
  document.body.appendChild(c);
  requestAnimationFrame(()=>{ c.style.left='calc(100vw - 92px)'; c.style.top='12px'; c.style.opacity='0.2'; });
  setTimeout(()=>c.remove(), 780);
}
/* ---- Audio: synthesized SFX + gentle looping music, with mute ---- */
let AC=null, masterGain=null, musicGain=null;
let muted = store.get('eliseMute')==='1';
function audioEnsure(){
  if (AC) { if (AC.state==='suspended') AC.resume(); return; }
  try{
    AC = new (window.AudioContext||window.webkitAudioContext)();
    masterGain=AC.createGain(); masterGain.gain.value=muted?0:1; masterGain.connect(AC.destination);
    musicGain=AC.createGain(); musicGain.gain.value=0.10; musicGain.connect(masterGain);
    startMusic();
  }catch(e){}
}
function beep(freq=600, dur=.09, type='sine'){
  if (muted) return;
  try{
    audioEnsure(); if (!AC) return;
    const o=AC.createOscillator(), g=AC.createGain();
    o.type=type; o.frequency.value=freq; o.connect(g); g.connect(masterGain);
    g.gain.setValueAtTime(.12, AC.currentTime);
    g.gain.exponentialRampToValueAtTime(.001, AC.currentTime+dur);
    o.start(); o.stop(AC.currentTime+dur);
  }catch(e){}
}
const chime=()=>{ beep(660,.08); setTimeout(()=>beep(880,.1),90); };
const bigChime=()=>{ beep(523,.09); setTimeout(()=>beep(659,.09),100); setTimeout(()=>beep(784,.14),200); };
/* looping cheerful melody (major pentatonic), scheduled with a lookahead */
const MELODY=[523.25,587.33,659.25,783.99,659.25,587.33,523.25,659.25, 698.46,659.25,587.33,523.25,587.33,659.25,523.25,392.00];
let musicStep=0, musicTimer=null, nextNoteAt=0;
function noteOn(freq,time,dur){
  if (!AC) return;
  const o=AC.createOscillator(), g=AC.createGain();
  o.type='triangle'; o.frequency.value=freq; o.connect(g); g.connect(musicGain);
  g.gain.setValueAtTime(0.0001,time); g.gain.linearRampToValueAtTime(0.5,time+0.02);
  g.gain.exponentialRampToValueAtTime(0.0001,time+dur);
  o.start(time); o.stop(time+dur+0.02);
  /* soft bass every 4th note */
  if (musicStep%4===0){ const b=AC.createOscillator(), bg=AC.createGain();
    b.type='sine'; b.frequency.value=freq/2; b.connect(bg); bg.connect(musicGain);
    bg.gain.setValueAtTime(0.0001,time); bg.gain.linearRampToValueAtTime(0.4,time+0.03);
    bg.gain.exponentialRampToValueAtTime(0.0001,time+dur*1.6);
    b.start(time); b.stop(time+dur*1.6+0.02); }
}
function startMusic(){
  if (!AC || musicTimer) return;
  nextNoteAt=AC.currentTime+0.1;
  const beat=0.34;
  musicTimer=setInterval(()=>{
    if (!AC) return;
    while (nextNoteAt < AC.currentTime+0.25){
      noteOn(MELODY[musicStep%MELODY.length], nextNoteAt, beat*0.9);
      musicStep++; nextNoteAt+=beat;
    }
  }, 60);
}
function setMuted(m){
  muted=m; store.set('eliseMute', m?'1':'0');
  if (masterGain && AC) masterGain.gain.setTargetAtTime(m?0:1, AC.currentTime, 0.05);
  const b=$('muteBtn'); if (b) b.textContent=m?'🔇':'🔊';
}

/* =========================================================
   GRID (game logic space, reused from 2D)
========================================================= */
let GX=12, GY=9;
let DOOR={x:6,y:8};
/* Two zones split by a display-counter divider row (DIV_Y):
   kitchen (baking area) is behind it (y<DIV_Y), the restaurant/dining area is
   in front (y>DIV_Y). Staff cross through gaps at the ends of the divider. */
let DIV_Y=4, DIVIDER_GAPS=[0,11];
let STATION_POS = { oven:{x:1,y:1}, deco:{x:3,y:1}, display:{x:5,y:4}, register:{x:9,y:4} };
let QUEUE_SPOTS = [{x:9,y:5},{x:9,y:6},{x:9,y:7}];
function gridSetup(){
  const expand=S.upgrades.includes('expand');
  GX = expand ? 14 : 12;
  GY = expand ? 11 : 9;
  DIV_Y = Math.max(3, Math.floor(GY*0.45));            /* 4 (small) / 4 (big) */
  DOOR = {x:Math.floor(GX/2), y:GY-1};
  /* kitchen stations along the back */
  STATION_POS.oven = {x:1, y:1};
  STATION_POS.deco = {x:3, y:1};
  /* register + main display case sit on the divider, facing the diners */
  STATION_POS.register = {x:GX-3, y:DIV_Y};
  STATION_POS.display  = {x:Math.floor(GX/2)-1, y:DIV_Y};
  /* guests line up in front of the register (dining side) */
  QUEUE_SPOTS = [{x:GX-3,y:DIV_Y+1},{x:GX-3,y:DIV_Y+2},{x:GX-3,y:DIV_Y+3}];
  /* staff pass-through gaps at both ends of the counter */
  DIVIDER_GAPS = [0, GX-1];
}
function tableSlots(){
  const a=DIV_Y+2, b=GY-2;                              /* dining rows */
  const base=[{x:2,y:a},{x:5,y:a},{x:8,y:b},{x:2,y:b}];
  if (S.upgrades.includes('expand')) base.push({x:GX-2,y:a},{x:5,y:b});
  return base;
}
function dividerBlocked(x,y){
  return y===DIV_Y && !DIVIDER_GAPS.includes(x);
}
function inGrid(x,y){ return x>=0&&y>=0&&x<GX&&y<GY; }
function stationAt(x,y){
  for (const [k,p] of Object.entries(STATION_POS)) if (p.x===x&&p.y===y) return k;
  const ts=tableSlots();
  for (let i=0;i<ts.length;i++) if (ts[i].x===x&&ts[i].y===y) return 'table'+i;
  return null;
}
function furnAt(x,y){ return S.placed.find(p=>p.x===x&&p.y===y); }
function blocked(x,y){
  if (!inGrid(x,y)) return true;
  const st=stationAt(x,y);
  if (st){
    if (st.startsWith('table')) return S.tables[parseInt(st.slice(5),10)]>=0;
    return true;
  }
  if (dividerBlocked(x,y)) return true;   /* the counter separates the rooms */
  const f=furnAt(x,y); return !!(f && !FURN[f.type].walkable);
}
function reservedTile(x,y){
  if (stationAt(x,y)) return true;
  if (dividerBlocked(x,y)) return true;
  if (x===DOOR.x&&y===DOOR.y) return true;
  return QUEUE_SPOTS.some(q=>q.x===x&&q.y===y);
}
function findPath(sx,sy,tx,ty){
  if (sx===tx&&sy===ty) return [];
  const key=(x,y)=>x+','+y, prev={}, seen={[key(sx,sy)]:true};
  let q=[[sx,sy]];
  while (q.length){
    const [x,y]=q.shift();
    for (const [dx,dy] of [[1,0],[-1,0],[0,1],[0,-1]]){
      const nx=x+dx, ny=y+dy, k=key(nx,ny);
      if (seen[k]) continue;
      if (blocked(nx,ny)) continue;
      seen[k]=true; prev[k]=[x,y];
      if (nx===tx&&ny===ty){
        const path=[[nx,ny]]; let cur=[x,y];
        while (!(cur[0]===sx&&cur[1]===sy)){ path.push(cur); cur=prev[key(cur[0],cur[1])]; }
        return path.reverse().map(p=>({x:p[0],y:p[1]}));
      }
      q.push([nx,ny]);
    }
  }
  return null;
}
/* grid(x,y) -> world (centered). x->worldX, y->worldZ */
function W(x,y){ return new THREE.Vector3(x-(GX-1)/2, 0, y-(GY-1)/2); }

/* =========================================================
   THREE CORE
========================================================= */
const canvas=$('c');
let renderer, scene, camera, controls;
const mats = {};
function mat(color, o={}){
  return new THREE.MeshStandardMaterial({
    color:new THREE.Color(color),
    roughness:o.rough!==undefined?o.rough:0.85,
    metalness:o.metal!==undefined?o.metal:0.0,
    flatShading:!!o.flat,
    transparent:!!o.transparent, opacity:o.opacity!==undefined?o.opacity:1,
    emissive:o.emissive?new THREE.Color(o.emissive):new THREE.Color('#000000'),
    emissiveIntensity:o.emissiveIntensity||0,
  });
}
/* =========================================================
   GLB MODEL PIPELINE (data-driven catalog + graceful fallback)
   ---------------------------------------------------------
   Every prop/station/costume can be rendered either from the
   built-in procedural low-poly builder (default, zero deps) OR
   from a downloaded .glb model — just add a `glb:` URL to its
   catalog entry below. This makes swapping in cohesive CC0 art
   packs (Kenney / Quaternius / Poly Pizza) a data change, not code.
========================================================= */
const CDN='https://cdn.jsdelivr.net/npm/three@0.184.0/examples/jsm/libs/draco/';
let gltfLoader=null;
function getGLTFLoader(){
  if (gltfLoader) return gltfLoader;
  gltfLoader=new GLTFLoader();
  try{ const draco=new DRACOLoader(); draco.setDecoderPath(CDN); gltfLoader.setDRACOLoader(draco); }catch(e){}
  return gltfLoader;
}
const modelCache=new Map();   /* url -> Promise<THREE.Object3D (template)> */
function loadModelTemplate(url){
  if (modelCache.has(url)) return modelCache.get(url);
  const p=new Promise((res,rej)=>{
    getGLTFLoader().load(url, g=>{
      const root=g.scene||g.scenes[0];
      root.traverse(o=>{ if (o.isMesh){ o.castShadow=true; o.receiveShadow=true; } });
      root.userData.animations=g.animations||[];
      res(root);
    }, undefined, err=>rej(err));
  });
  modelCache.set(url,p);
  return p;
}
/* resolve a catalog asset path against the site base (Vite BASE_URL) so it
   works both locally and under a GitHub Pages sub-path */
function resolveAssetUrl(u){
  return /^https?:/i.test(u) ? u : ((import.meta.env.BASE_URL || '/') + String(u).replace(/^\//,''));
}
/* normalise any model to a target size, centre it on its tile, and rest it on
   the floor — so drop-in art packs of varying native scales all fit the grid */
function fitAndGround(inst, entry){
  let box=new THREE.Box3().setFromObject(inst);
  const size=new THREE.Vector3(); box.getSize(size);
  let s=1;
  if (entry.fitH) s=entry.fitH/(size.y||1);
  else if (entry.fitXZ) s=entry.fitXZ/(Math.max(size.x,size.z)||1);
  else if (entry.scale) s=entry.scale;
  if (s!==1 && isFinite(s)) inst.scale.multiplyScalar(s);
  box=new THREE.Box3().setFromObject(inst);
  const c=new THREE.Vector3(); box.getCenter(c);
  inst.position.x-=c.x; inst.position.z-=c.z;      /* centre on tile */
  inst.position.y-=box.min.y;                      /* sit on the floor */
  if (entry.yOffset) inst.position.y+=entry.yOffset;
}
/* real 3D models for served/carried/displayed treats (falls back to an emoji) */
const ITEM_MODEL = { cake:'cake-birthday.glb', cookie:'cookie-chocolate.glb', iceCream:'ice-cream.glb', animalCake:'cake-birthday.glb',
  donut:'donut-sprinkles.glb', croissant:'croissant.glb', muffin:'muffin.glb' };
function makeTreatModel(item, size){
  const g=new THREE.Group();
  const url=ITEM_MODEL[item];
  if (!url){ const s=emojiSprite((ITEMS[item]&&ITEMS[item].ico)||'🍽️', size||0.34); s.position.y=(size||0.34)/2; g.add(s); return g; }
  loadModelTemplate(resolveAssetUrl('assets/models/'+url)).then(tpl=>{
    const inst=tpl.clone(true); fitAndGround(inst,{fitH:size||0.34});
    g.add(inst);
  }).catch(()=>{});
  return g;
}
/* returns a Group immediately; if entry has a glb it loads async and
   swaps the procedural placeholder in-place once ready */
function buildFromCatalog(entry, proceduralFn){
  const g=new THREE.Group();
  const placeholder=proceduralFn(); g.add(placeholder);
  if (entry && entry.glb){
    loadModelTemplate(resolveAssetUrl(entry.glb)).then(tpl=>{
      const anims=tpl.userData.animations||[];
      const inst=anims.length?skeletonClone(tpl):tpl.clone(true);
      if (entry.rotY) inst.rotation.y=entry.rotY;
      fitAndGround(inst, entry);
      if (entry.tint){ inst.traverse(o=>{ if (o.isMesh&&o.material){ o.material=o.material.clone(); o.material.color=new THREE.Color(entry.tint); } }); }
      g.remove(placeholder); g.add(inst);
      if (entry.accent){ const b=new THREE.Box3().setFromObject(inst); const spr=emojiSprite(entry.accent,0.42); spr.position.set(0, b.max.y+(entry.accentY||0.1), 0); g.add(spr); }
      if (entry.props){ entry.props.forEach(pr=>{ const sub=buildFromCatalog(pr, ()=>new THREE.Group()); sub.position.set(pr.x||0, pr.y||0, pr.z||0); g.add(sub); }); }
      if (entry.animate && anims.length){
        const mixer=new THREE.AnimationMixer(inst);
        const clip=THREE.AnimationClip.findByName(anims, entry.animate)||anims[0];
        if (clip){ mixer.clipAction(clip).play(); g.userData.mixer=mixer; mixers.push(mixer); }
      }
    }).catch(()=>{ /* keep procedural placeholder on failure */ });
  }
  return g;
}
/* catalog: model source per item (glb urls intentionally empty by default
   so the game ships self-contained; art packs plug in here) */
const M = 'assets/models/';
const CATALOG = {
  stations:{
    oven:    { glb:M+'kitchenStove.glb',          fitH:1.35, rotY:Math.PI },
    deco:    { glb:M+'kitchenCabinetDrawer.glb',  fitH:1.0,  rotY:Math.PI, accent:'🎂', accentY:0.15 },
    register:{ glb:M+'kitchenBar.glb',            fitH:1.05, rotY:0,        accent:'💰', accentY:0.1 },
    display: { glb:M+'kitchenCabinet.glb', fitH:0.95, rotY:0, props:[
      {glb:M+'cake-birthday.glb',   fitH:0.30, x:-0.34, y:0.98},
      {glb:M+'cupcake.glb',         fitH:0.24, x:-0.02, y:0.98},
      {glb:M+'donut-sprinkles.glb', fitH:0.24, x:0.30,  y:0.98},
    ]},
  },
  tables:{
    1:{ glb:M+'tableRound.glb',      fitXZ:1.15 },
    2:{ glb:M+'tableCloth.glb',      fitXZ:1.15 },
    3:{ glb:M+'tableCrossCloth.glb', fitXZ:1.25 },
  },
  kitchen:{
    hood:   { glb:M+'hoodModern.glb',    fitH:0.55, rotY:Math.PI },
    counter:{ glb:M+'kitchenCabinet.glb',fitH:0.95, rotY:0 },
    sink:   { glb:M+'kitchenSink.glb',   fitH:0.95, rotY:0 },
    mixer:  { glb:M+'kitchenBlender.glb', fitH:0.4, rotY:Math.PI, y:0.98 },
    fridge: { glb:M+'kitchenFridgeLarge.glb', fitH:1.6, rotY:0 },
  },
  furn:{
    flowerPot:{ glb:M+'pottedPlant.glb',  fitH:0.75 },
    plant:    { glb:M+'plantSmall2.glb',  fitH:0.6  },
    rug:      { glb:M+'rugDoormat.glb',   fitXZ:0.95 },
    balloons:{}, teddy:{}, playArea:{}, fountain:{},
    robot:    { glb:M+'robot.glb',        fitH:0.7, animate:'Dance' },
    // new decorations unlocked by the art pack
    bench:    { glb:M+'bench.glb',                fitXZ:0.95 },
    bookcase: { glb:M+'bookcaseOpen.glb',         fitH:1.25, rotY:Math.PI },
    lamp:     { glb:M+'lampRoundFloor.glb',       fitH:1.4  },
    sofa:     { glb:M+'loungeDesignSofa.glb',     fitXZ:1.1, rotY:Math.PI },
    coffee:   { glb:M+'kitchenCoffeeMachine.glb', fitH:0.6  },
    fridge:   { glb:M+'kitchenFridgeSmall.glb',   fitH:1.15, rotY:Math.PI },
    // bathroom + handwashing
    toilet:     { glb:M+'toilet.glb',          fitH:0.85, rotY:Math.PI },
    washSink:   { glb:M+'bathroomSink.glb',    fitH:0.95, rotY:Math.PI },
    mirror:     { glb:M+'bathroomMirror.glb',  fitH:0.7,  rotY:Math.PI },
    bathCabinet:{ glb:M+'bathroomCabinet.glb', fitH:0.9,  rotY:Math.PI },
    kitchenSink:{ glb:M+'kitchenSink.glb',     fitH:0.95, rotY:Math.PI },
  },
};
/* test/diagnostic hook: prove the GLB pipeline end-to-end */
window.__loadTestModel = url => loadModelTemplate(url).then(t=>{ const m=t.clone(true); m.position.set(0,2,0); scene.add(m); return true; });

function initThree(){
  renderer=new THREE.WebGLRenderer({canvas, antialias:true, alpha:false});
  renderer.setPixelRatio(Math.min(window.devicePixelRatio||1, 2));
  renderer.shadowMap.enabled=true;
  renderer.shadowMap.type=THREE.PCFSoftShadowMap;

  scene=new THREE.Scene();
  scene.background=new THREE.Color('#FCE4F0');
  scene.fog=new THREE.Fog('#FCE4F0', 22, 40);

  camera=new THREE.PerspectiveCamera(46, 1, 0.1, 100);

  controls=new OrbitControls(camera, renderer.domElement);
  controls.enableDamping=true; controls.dampingFactor=0.12;
  controls.enablePan=false;
  controls.minDistance=6; controls.maxDistance=20;
  controls.minPolarAngle=0.15; controls.maxPolarAngle=Math.PI*0.46;
  controls.rotateSpeed=0.7; controls.zoomSpeed=0.9;

  const hemi=new THREE.HemisphereLight(0xffffff, 0xFFE0C0, 0.95);
  scene.add(hemi);
  const dir=new THREE.DirectionalLight(0xffffff, 1.15);
  dir.position.set(6,12,7); dir.castShadow=true;
  dir.shadow.mapSize.set(2048,2048);
  dir.shadow.camera.near=1; dir.shadow.camera.far=45;
  dir.shadow.camera.left=-14; dir.shadow.camera.right=14;
  dir.shadow.camera.top=14; dir.shadow.camera.bottom=-14;
  dir.shadow.bias=-0.0005; dir.shadow.normalBias=0.02;
  scene.add(dir);
  const fill=new THREE.DirectionalLight(0xFFF0F5, 0.35);
  fill.position.set(-6,6,-4); scene.add(fill);

  /* soft image-based lighting so materials get gentle reflections/sheen */
  try{
    const pmrem=new THREE.PMREMGenerator(renderer);
    scene.environment=pmrem.fromScene(new RoomEnvironment(), 0.04).texture;
    scene.environmentIntensity=0.35;
  }catch(e){}

  /* ground raycast plane (invisible, big) */
  groundPlane=new THREE.Mesh(new THREE.PlaneGeometry(60,60), new THREE.MeshBasicMaterial({visible:false}));
  groundPlane.rotation.x=-Math.PI/2; groundPlane.position.y=0.001;
  scene.add(groundPlane);

  /* objective arrow */
  objArrow=new THREE.Mesh(new THREE.ConeGeometry(0.22,0.5,10), mat('#E84E8A',{emissive:'#E84E8A',emissiveIntensity:0.35}));
  objArrow.rotation.x=Math.PI; objArrow.visible=false; scene.add(objArrow);

  resize();
  window.addEventListener('resize', resize);
}
let groundPlane, objArrow;
function resize(){
  const w=canvas.clientWidth, h=canvas.clientHeight;
  if (!w||!h) return;
  renderer.setSize(w,h,false);
  camera.aspect=w/h; camera.updateProjectionMatrix();
}
function frameCamera(){
  controls.target.set(0, 0.6, 0.4);
  camera.position.set(0, 9.5, 11);
  controls.update();
}

/* =========================================================
   LOW-POLY BUILDERS
========================================================= */
const G = {
  box:(w,h,d)=>new THREE.BoxGeometry(w,h,d),
  cyl:(rt,rb,h,s=16)=>new THREE.CylinderGeometry(rt,rb,h,s),
  sph:(r,s=16)=>new THREE.SphereGeometry(r,s,Math.max(8,s/2)),
  cone:(r,h,s=16)=>new THREE.ConeGeometry(r,h,s),
  torus:(r,t,s=14)=>new THREE.TorusGeometry(r,t,10,s),
};
function meshOf(geo,material,cast=true){ const m=new THREE.Mesh(geo,material); m.castShadow=cast; m.receiveShadow=true; return m; }

/* ---- floor + walls (canvas-textured, rebuilt on theme change) ---- */
let roomGroup=null;
function cvHeart(c,cx,cy,s,col){ c.save(); c.translate(cx,cy); c.fillStyle=col; c.beginPath();
  c.moveTo(0,s*0.35); c.bezierCurveTo(s,-s*0.3, s*0.5,-s*0.95, 0,-s*0.3); c.bezierCurveTo(-s*0.5,-s*0.95, -s,-s*0.3, 0,s*0.35); c.closePath(); c.fill(); c.restore(); }
function cvStar(c,cx,cy,s,col){ c.save(); c.translate(cx,cy); c.fillStyle=col; c.beginPath();
  for (let i=0;i<10;i++){ const r=i%2?s*0.45:s, a=Math.PI/5*i-Math.PI/2, px=Math.cos(a)*r, py=Math.sin(a)*r; i?c.lineTo(px,py):c.moveTo(px,py);} c.closePath(); c.fill(); c.restore(); }
function shade(hex, amt){ const n=parseInt(hex.slice(1),16); let r=(n>>16)&255,g=(n>>8)&255,b=n&255;
  r=Math.max(0,Math.min(255,r+amt)); g=Math.max(0,Math.min(255,g+amt)); b=Math.max(0,Math.min(255,b+amt));
  return '#'+((1<<24)+(r<<16)+(g<<8)+b).toString(16).slice(1); }
function wallPatternTex(base, pattern){
  const T=128; const cvs=document.createElement('canvas'); cvs.width=cvs.height=T; const c=cvs.getContext('2d');
  c.fillStyle=base; c.fillRect(0,0,T,T);
  const acc=shade(base, pattern==='stripes'?-16:24);
  if (pattern==='dots'){ c.fillStyle=acc; for(let i=0;i<4;i++)for(let j=0;j<5;j++){ c.beginPath(); c.arc((i+0.5)*T/4,(j+0.5)*T/5,T*0.05,0,Math.PI*2); c.fill(); } }
  else if (pattern==='stripes'){ c.fillStyle=acc; for(let i=0;i<6;i++) c.fillRect(i*T/6,0,T/12,T); }
  else if (pattern==='stars'){ for(let i=0;i<3;i++)for(let j=0;j<4;j++) cvStar(c,(i+0.5)*T/3,(j+0.5)*T/4,T*0.06,acc); }
  else if (pattern==='hearts'){ for(let i=0;i<3;i++)for(let j=0;j<4;j++) cvHeart(c,(i+0.5)*T/3,(j+0.5)*T/4,T*0.07,acc); }
  const tex=new THREE.CanvasTexture(cvs); tex.colorSpace=THREE.SRGBColorSpace; tex.anisotropy=4; return tex;
}
function floorTexture(){
  const th=FLOOR_THEMES.find(f=>f.id===S.floorTheme)||FLOOR_THEMES[0];
  const T=48, pat=th.pattern||'check';
  const cvs=document.createElement('canvas'); cvs.width=GX*T; cvs.height=GY*T;
  const c=cvs.getContext('2d');
  c.fillStyle=th.a; c.fillRect(0,0,cvs.width,cvs.height);
  for (let x=0;x<GX;x++) for (let y=0;y<GY;y++){
    const px=x*T, py=y*T;
    if (pat==='check'){ if ((x+y)%2===0){ c.fillStyle=th.b; c.fillRect(px,py,T,T); } }
    else if (pat==='planks'){ c.fillStyle=x%2===0?th.a:th.b; c.fillRect(px,py,T,T); }
    else if (pat==='stripes'){ c.fillStyle=(x+y)%2===0?th.a:th.b; c.fillRect(px,py,T,T); }
    else if (pat==='dots'){ c.fillStyle=th.b; c.beginPath(); c.arc(px+T/2,py+T/2,T*0.24,0,Math.PI*2); c.fill(); }
    else if (pat==='hearts'){ cvHeart(c,px+T/2,py+T*0.55,T*0.30,th.b); }
    else if (pat==='stars'){ cvStar(c,px+T/2,py+T/2,T*0.32,th.b); }
    c.strokeStyle='rgba(92,58,33,.05)'; c.strokeRect(px+0.5,py+0.5,T-1,T-1);
  }
  QUEUE_SPOTS.forEach(q=>{ c.fillStyle='#FCE0B8'; c.fillRect(q.x*T+5,q.y*T+5,T-10,T-10); });
  c.fillStyle='#B8E0D2'; c.fillRect(DOOR.x*T+5,DOOR.y*T+5,T-10,T-10);
  const tex=new THREE.CanvasTexture(cvs); tex.colorSpace=THREE.SRGBColorSpace; tex.anisotropy=4;
  return tex;
}
function signTexture(){
  const cvs=document.createElement('canvas'); cvs.width=512; cvs.height=128;
  const c=cvs.getContext('2d');
  const r=24; c.fillStyle='#FFFDF8';
  c.beginPath(); c.moveTo(r,0); c.arcTo(512,0,512,128,r); c.arcTo(512,128,0,128,r); c.arcTo(0,128,0,0,r); c.arcTo(0,0,512,0,r); c.closePath(); c.fill();
  c.strokeStyle='#FF6FA5'; c.lineWidth=8; c.stroke();
  c.fillStyle='#B93B60'; c.font="800 46px 'Baloo 2', sans-serif"; c.textAlign='center'; c.textBaseline='middle';
  c.fillText(S.logo.emoji+'  '+S.shopName+'  '+S.logo.emoji, 256, 68);
  const tex=new THREE.CanvasTexture(cvs); tex.colorSpace=THREE.SRGBColorSpace; tex.anisotropy=4;
  return tex;
}
function buildRoom(){
  if (roomGroup){ scene.remove(roomGroup); disposeGroup(roomGroup); }
  roomGroup=new THREE.Group(); scene.add(roomGroup);
  const wt=WALL_THEMES.find(w=>w.id===S.wallTheme)||WALL_THEMES[0];
  const roomW=GX, roomD=GY, wallH=2.2;
  /* floor */
  const floor=meshOf(new THREE.PlaneGeometry(roomW,roomD), new THREE.MeshStandardMaterial({map:floorTexture(),roughness:0.95}), false);
  floor.rotation.x=-Math.PI/2; floor.receiveShadow=true; roomGroup.add(floor);
  /* modular walls built from real GLB pieces, tinted to the wall theme */
  buildModularWalls(roomGroup, wt, roomW, roomD);
  /* door on front-ish: a little arch at DOOR */
  const dpos=W(DOOR.x,DOOR.y);
  const door=meshOf(G.box(0.9,1.7,0.12), mat('#C77DAE'));
  door.position.set(dpos.x, 0.85, roomD/2-0.05); roomGroup.add(door);
  const doorTop=meshOf(G.cyl(0.45,0.45,0.12,16), mat('#C77DAE'));
  doorTop.rotation.x=Math.PI/2; doorTop.position.set(dpos.x,1.7,roomD/2-0.05); roomGroup.add(doorTop);
  /* sign above back wall */
  const sign=meshOf(new THREE.PlaneGeometry(4.2,1.05), new THREE.MeshBasicMaterial({map:signTexture(),transparent:true}),false);
  sign.position.set(0, wallH-0.2, -roomD/2+0.06); roomGroup.add(sign);
  /* wall art upgrade */
  if (S.upgrades.includes('art')){
    const art1=meshOf(G.box(0.9,0.7,0.08), mat('#FFFFFF'));
    const canvasA=emojiTexture('🌈');
    const pic=meshOf(new THREE.PlaneGeometry(0.7,0.5), new THREE.MeshBasicMaterial({map:canvasA,transparent:true}),false);
    pic.position.z=0.05; art1.add(pic);
    art1.position.set(-1.6,2.0,-roomD/2+0.09); roomGroup.add(art1);
    const art2=art1.clone(); art2.position.set(-roomW/2+0.09,2.0,-1.4); art2.rotation.y=Math.PI/2; roomGroup.add(art2);
  }
  /* sparkly lights upgrade */
  if (S.upgrades.includes('lights')){
    for (let i=0;i<6;i++){
      const b=meshOf(G.sph(0.12,10), mat('#FFF3B0',{emissive:'#FFE066',emissiveIntensity:0.9}),false);
      b.position.set(-roomW/2+0.5+i*(roomW-1)/5, wallH-0.4, -roomD/2+0.2); roomGroup.add(b);
    }
  }
}
function buildModularWalls(parent, wt, roomW, roomD){
  const yScale=1.7;                       /* native wall is 1.29 tall -> ~2.2 */
  const winAt=Math.floor(roomW*0.62);     /* one window on the back wall */
  const doorAt=Math.floor(roomD*0.5);     /* a side doorway on the left wall */
  function place(url, wx, wz, rotY, tint){
    loadModelTemplate(resolveAssetUrl('assets/models/'+url)).then(tpl=>{
      const w=tpl.clone(true);
      const box=new THREE.Box3().setFromObject(w); const c=new THREE.Vector3(); box.getCenter(c);
      w.position.x-=c.x; w.position.z-=c.z; w.position.y-=box.min.y;   /* centre + ground */
      if (tint) w.traverse(o=>{ if (o.isMesh&&o.material){ o.material=o.material.clone();
        if (wt.pattern){ o.material.map=wallPatternTex(tint, wt.pattern); o.material.color=new THREE.Color('#ffffff'); o.material.needsUpdate=true; }
        else o.material.color=new THREE.Color(tint); } });
      const pivot=new THREE.Group(); pivot.add(w);
      pivot.scale.y=yScale; pivot.rotation.y=rotY; pivot.position.set(wx,0,wz);
      parent.add(pivot);
    }).catch(()=>{});
  }
  /* back wall along -z, facing the room (+z) */
  for (let i=0;i<roomW;i++)
    place(i===winAt?'wallWindow.glb':'wall.glb', i-(roomW-1)/2, -roomD/2, 0, wt.left);
  /* left wall along -x, facing the room (+x) */
  for (let j=1;j<roomD;j++)
    place(j===doorAt?'wallDoorway.glb':'wall.glb', -roomW/2, j-(roomD-1)/2, Math.PI/2, wt.right);
  /* corner piece to close the seam */
  place('wallCorner.glb', -roomW/2, -roomD/2, 0, wt.right);
}
function emojiTexture(emoji, size=128){
  const cvs=document.createElement('canvas'); cvs.width=cvs.height=size;
  const c=cvs.getContext('2d');
  c.font=Math.floor(size*0.8)+"px 'Segoe UI Emoji','Apple Color Emoji','Noto Color Emoji',sans-serif";
  c.textAlign='center'; c.textBaseline='middle'; c.fillText(emoji,size/2,size*0.56);
  const tex=new THREE.CanvasTexture(cvs); tex.colorSpace=THREE.SRGBColorSpace; tex.anisotropy=4;
  return tex;
}
function emojiSprite(emoji, scale=0.6){
  const spr=new THREE.Sprite(new THREE.SpriteMaterial({map:emojiTexture(emoji), transparent:true, depthWrite:false}));
  spr.scale.set(scale,scale,scale); return spr;
}
/* A floating name-plate pill (canvas texture) so it's obvious what each thing is. */
function labelTexture(text){
  const fs=60, padX=34, padY=22;
  const meas=document.createElement('canvas').getContext('2d');
  meas.font="800 "+fs+"px 'Baloo 2','Nunito',sans-serif";
  const w=Math.ceil(meas.measureText(text).width)+padX*2, h=fs+padY*2;
  const cvs=document.createElement('canvas'); cvs.width=w; cvs.height=h;
  const c=cvs.getContext('2d');
  const r=h/2;
  c.fillStyle='rgba(74,42,26,0.92)';
  c.beginPath();
  c.moveTo(r,0); c.arcTo(w,0,w,h,r); c.arcTo(w,h,0,h,r); c.arcTo(0,h,0,0,r); c.arcTo(0,0,w,0,r); c.closePath(); c.fill();
  c.lineWidth=6; c.strokeStyle='rgba(255,255,255,0.85)'; c.stroke();
  c.font="800 "+fs+"px 'Baloo 2','Nunito',sans-serif";
  c.textAlign='center'; c.textBaseline='middle'; c.fillStyle='#FFF7EE';
  c.fillText(text,w/2,h/2+2);
  const tex=new THREE.CanvasTexture(cvs); tex.colorSpace=THREE.SRGBColorSpace; tex.anisotropy=4;
  return {tex,aspect:w/h};
}
function labelSprite(text, height=0.36){
  const {tex,aspect}=labelTexture(text);
  const spr=new THREE.Sprite(new THREE.SpriteMaterial({map:tex, transparent:true, depthWrite:false, depthTest:false}));
  spr.scale.set(height*aspect, height, 1); spr.renderOrder=999;
  return spr;
}
/* Name + hover height for each station's floating label. */
const STATION_LABEL = {
  oven:     {txt:'🔥 Oven',          y:1.85},
  deco:     {txt:'🎨 Decorate',      y:1.5 },
  register: {txt:'💰 Cash Register', y:1.7 },
  display:  {txt:'🧁 Display Case',  y:1.65},
};
function disposeGroup(g){
  g.traverse(o=>{
    if (o.geometry) o.geometry.dispose();
    if (o.material){ const m=o.material; if (m.map) m.map.dispose(); m.dispose&&m.dispose(); }
  });
}

/* ---- station meshes ---- */
let stationObjs={};
function buildStations(){
  Object.keys(STATION_POS).forEach(k=>{
    if (stationObjs[k]){ scene.remove(stationObjs[k]); disposeGroup(stationObjs[k]); }
    const g=makeStation(k); const p=W(STATION_POS[k].x,STATION_POS[k].y);
    g.position.set(p.x,0,p.z); scene.add(g); stationObjs[k]=g;
  });
}
function refreshStation(k){
  if (stationObjs[k]){ scene.remove(stationObjs[k]); disposeGroup(stationObjs[k]); }
  const g=makeStation(k); const p=W(STATION_POS[k].x,STATION_POS[k].y);
  g.position.set(p.x,0,p.z); scene.add(g); stationObjs[k]=g;
}
function makeStation(k){
  const lvl=S.stations[k];
  const entry = (lvl>=1 && CATALOG.stations[k]) ? CATALOG.stations[k] : null;
  const g = buildFromCatalog(entry, ()=>makeStationProcedural(k));
  g.userData.station=k;
  /* generous invisible tap target so the whole station is easy to select
     (tapping the tall body used to project past the model onto the floor) */
  const pad=meshOf(G.box(1.3,2.2,1.3), mat('#000',{transparent:true,opacity:0}), false);
  pad.position.y=1.05; pad.receiveShadow=false; pad.userData.hitPad=true; g.add(pad);
  /* floating name plate so it's obvious what each station is */
  const L=STATION_LABEL[k];
  if (L){ const lab=labelSprite(L.txt, 0.34); lab.position.set(0,L.y,0); lab.userData.nameplate=true; g.add(lab); }
  return g;
}
function makeStationProcedural(k){
  const g=new THREE.Group(); g.userData.station=k;
  const lvl=S.stations[k]; const sleepy=lvl<=0;
  if (k==='oven'){
    const bodyCol=sleepy?'#9A9A9A':(lvl>=3?'#FF8FB0':'#E8577E');
    const body=meshOf(G.box(0.9,0.95,0.8), mat(bodyCol)); body.position.y=0.5; g.add(body);
    const win=meshOf(G.box(0.6,0.5,0.05), mat(sleepy?'#6E6E6E':'#3A1520',{emissive:sleepy?'#000':'#FF7A3C',emissiveIntensity:sleepy?0:0.4}));
    win.position.set(0,0.5,0.41); g.add(win);
    const knob=meshOf(G.cyl(0.07,0.07,0.06,12), mat('#FFF0F5')); knob.rotation.x=Math.PI/2; knob.position.set(0.28,0.82,0.41); g.add(knob);
    const chimney=meshOf(G.cyl(0.1,0.12,0.35,12), mat(bodyCol)); chimney.position.set(0.28,1.15,-0.1); g.add(chimney);
    if (lvl>=3){ const spr=emojiSprite('✨',0.5); spr.position.set(0,1.4,0); g.add(spr); }
    if (!sleepy){ const cake=emojiSprite('🎂',0.45); cake.position.set(0,1.15,0.2); g.add(cake); }
  } else if (k==='deco'){
    const legs=mat(sleepy?'#9A9A9A':'#B5651D');
    const top=meshOf(G.box(1.0,0.12,0.75), mat(sleepy?'#B5B5B5':'#F0D9A8')); top.position.y=0.72; g.add(top);
    [[-0.42,-0.3],[0.42,-0.3],[-0.42,0.3],[0.42,0.3]].forEach(([x,z])=>{
      const l=meshOf(G.box(0.08,0.7,0.08), legs); l.position.set(x,0.35,z); g.add(l);
    });
    const spr=emojiSprite(sleepy?'🕸️':(lvl>=3?'🌟':'🎨'),0.4); spr.position.set(0,0.95,0); g.add(spr);
  } else if (k==='register'){
    const col=sleepy?'#9A9A9A':(lvl>=3?'#E8B94A':'#B5651D');
    const counter=meshOf(G.box(1.0,0.8,0.7), mat(col)); counter.position.y=0.4; g.add(counter);
    const till=meshOf(G.box(0.4,0.3,0.35), mat(sleepy?'#7E7E7E':'#5C3A21')); till.position.set(0,0.95,0); g.add(till);
    const spr=emojiSprite(sleepy?'🕸️':'💰',0.4); spr.position.set(0,1.25,0.1); g.add(spr);
  } else if (k==='display'){
    if (lvl<0){
      const ghost=meshOf(G.box(1.0,1.0,0.7), mat('#B93B60',{transparent:true,opacity:0.18})); ghost.position.y=0.5; ghost.castShadow=false; g.add(ghost);
      const spr=emojiSprite('🪧',0.45); spr.position.set(0,1.2,0); g.add(spr);
    } else {
      const base=meshOf(G.box(1.0,0.55,0.7), mat('#B5651D')); base.position.y=0.28; g.add(base);
      const glass=meshOf(G.box(0.95,0.55,0.65), mat('#CFF0FF',{transparent:true,opacity:0.35,rough:0.2})); glass.position.y=0.85; glass.castShadow=false; g.add(glass);
      const goods=[[],['🧁'],['🧁','🍩'],['🧁','🍩','🍰']][lvl];
      goods.forEach((gc,i)=>{ const s=emojiSprite(gc,0.3); s.position.set((i-(goods.length-1)/2)*0.28,0.7,0); g.add(s); });
    }
  }
  if (sleepy && !(k==='display'&&lvl<0)){ const z=emojiSprite('💤',0.4); z.position.set(0.5,1.5,0); z.userData.zzz=true; g.add(z); }
  return g;
}

/* ---- tables ---- */
let tableObjs=[];
function buildTables(){
  tableObjs.forEach(o=>{ scene.remove(o); disposeGroup(o); }); tableObjs=[];
  tableSlots().forEach((p,i)=>{ const g=makeTable(i); g.userData.tableIndex=i; const w=W(p.x,p.y); g.position.set(w.x,0,w.z); scene.add(g); tableObjs[i]=g; });
}
function refreshTable(i){
  if (tableObjs[i]){ scene.remove(tableObjs[i]); disposeGroup(tableObjs[i]); }
  const g=makeTable(i); g.userData.tableIndex=i; const p=tableSlots()[i]; const w=W(p.x,p.y); g.position.set(w.x,0,w.z); scene.add(g); tableObjs[i]=g;
}
function makeTable(i){
  const lvl=S.tables[i];
  if (lvl<1) return makeTableProcedural(i);
  const g=new THREE.Group();
  const base=CATALOG.tables[Math.min(lvl,3)]||CATALOG.tables[1];
  const entry=S.tableColor?Object.assign({},base,{tint:S.tableColor}):base;
  g.add(buildFromCatalog(entry, ()=>makeTableProcedural(i)));
  [[0,0.7,0],[0,-0.7,Math.PI]].forEach(([x,z,r])=>{
    const ch=buildFromCatalog({glb:M+'chair.glb', fitH:0.72, rotY:r}, ()=>new THREE.Group());
    ch.position.set(x,0,z); g.add(ch);
  });
  return g;
}
function makeTableProcedural(i){
  const g=new THREE.Group(); const lvl=S.tables[i];
  if (lvl<0){
    const ghost=meshOf(G.cyl(0.35,0.35,0.05,18), mat('#B93B60',{transparent:true,opacity:0.16})); ghost.position.y=0.02; ghost.castShadow=false; g.add(ghost);
    const spr=emojiSprite('🪧',0.4); spr.position.set(0,0.5,0); g.add(spr);
    return g;
  }
  const wobbly=lvl===0;
  const legCol=wobbly?'#9A9A9A':'#E8577E';
  const topCol=wobbly?'#C9C9C9':(lvl>=3?'#FFE39A':lvl>=2?'#FFD9EA':'#FDECF4');
  const leg=meshOf(G.cyl(0.06,0.06,0.6,10), mat(legCol)); leg.position.y=0.3; g.add(leg);
  const top=meshOf(G.cyl(0.42,0.42,0.08,20), mat(topCol)); top.position.y=0.62; g.add(top);
  if (lvl>=1){ const spr=emojiSprite(lvl>=3?'👑':lvl>=2?'🌸':'🌼',0.28); spr.position.set(0,0.78,0); g.add(spr); }
  if (wobbly){ g.rotation.z=0.05; const z=emojiSprite('💤',0.35); z.position.set(0.45,1.0,0); z.userData.zzz=true; g.add(z); }
  /* two little chairs */
  if (lvl>=1){
    [[0,0.6],[0,-0.6]].forEach(([x,z])=>{
      const ch=meshOf(G.box(0.28,0.28,0.28), mat(lvl>=3?'#FFCF6B':'#F7A9C6')); ch.position.set(x,0.14,z); g.add(ch);
    });
  }
  return g;
}

/* ---- furniture ---- */
let furnObjs=new Map();
function syncFurniture(){
  const keep=new Set();
  S.placed.forEach(p=>{
    const id=p.type+'@'+p.x+','+p.y; keep.add(id);
    if (!furnObjs.has(id)){
      const g=makeFurn(p.type); const w=W(p.x,p.y); g.position.set(w.x,0,w.z); scene.add(g); furnObjs.set(id,g);
    }
  });
  for (const [id,g] of furnObjs){ if (!keep.has(id)){ if (g.userData.mixer){ const mi=mixers.indexOf(g.userData.mixer); if (mi>=0) mixers.splice(mi,1); } scene.remove(g); disposeGroup(g); furnObjs.delete(id); } }
}
function makeFurn(type){
  const g=buildFromCatalog(CATALOG.furn[type], ()=>makeFurnProcedural(type));
  g.userData.furn=true;
  return g;
}
function makeFurnProcedural(type){
  const g=new THREE.Group(); g.userData.furn=true;
  if (type==='rug'){
    const rug=meshOf(G.cyl(0.46,0.46,0.03,20), mat('#F5A9CB'),false); rug.position.y=0.015; rug.receiveShadow=true; g.add(rug);
    return g;
  }
  if (type==='flowerPot'){
    const pot=meshOf(G.cyl(0.16,0.2,0.24,12), mat('#D9744E')); pot.position.y=0.12; g.add(pot);
    ['#FF6FA5','#FFD166','#E4C1F9'].forEach((col,i)=>{ const f=meshOf(G.sph(0.1,10), mat(col,{flat:true})); f.position.set((i-1)*0.13,0.34,0); g.add(f);
      const st=meshOf(G.cyl(0.02,0.02,0.16,6), mat('#46A98C')); st.position.set((i-1)*0.13,0.24,0); g.add(st); });
    return g;
  }
  if (type==='plant'){
    const pot=meshOf(G.cyl(0.18,0.22,0.28,12), mat('#C77DAE')); pot.position.y=0.14; g.add(pot);
    for (let i=0;i<5;i++){ const leaf=meshOf(G.cone(0.12,0.5,8), mat('#46A98C',{flat:true})); leaf.position.set(Math.cos(i)*0.08,0.5+Math.random()*0.15,Math.sin(i)*0.08); leaf.rotation.z=(Math.random()-0.5)*0.5; g.add(leaf); }
    return g;
  }
  if (type==='balloons'){
    const cols=['#FF6FA5','#FFD166','#6ECEB2','#BDE3F5'];
    cols.forEach((col,i)=>{ const b=meshOf(G.sph(0.17,12), mat(col)); b.scale.y=1.25; b.position.set((i-1.5)*0.16,1.0+Math.abs(i-1.5)*0.08,0); g.add(b);
      const str=meshOf(G.cyl(0.006,0.006,0.9,4), mat('#DDDDDD'),false); str.position.set((i-1.5)*0.16,0.5,0); g.add(str); });
    return g;
  }
  if (type==='teddy'){
    const body=meshOf(G.sph(0.24,12), mat('#B5651D')); body.position.y=0.3; body.scale.y=1.1; g.add(body);
    const head=meshOf(G.sph(0.18,12), mat('#C77B3A')); head.position.y=0.62; g.add(head);
    [[-0.13,0.72],[0.13,0.72]].forEach(([x,y])=>{ const e=meshOf(G.sph(0.06,8), mat('#B5651D')); e.position.set(x,y,0); g.add(e); });
    return g;
  }
  if (type==='playArea'){
    const slide=meshOf(G.box(0.12,0.7,0.7), mat('#FFD166')); slide.position.set(-0.2,0.4,0); slide.rotation.x=0.3; g.add(slide);
    const ball=meshOf(G.sph(0.16,12), mat('#FF6FA5')); ball.position.set(0.25,0.16,0.1); g.add(ball);
    const ball2=meshOf(G.sph(0.13,12), mat('#6ECEB2')); ball2.position.set(0.35,0.13,-0.2); g.add(ball2);
    const step=meshOf(G.box(0.4,0.2,0.4), mat('#BDE3F5')); step.position.set(-0.2,0.1,0); g.add(step);
    return g;
  }
  if (type==='fountain'){
    const base=meshOf(G.cyl(0.42,0.46,0.24,20), mat('#CDB8E8')); base.position.y=0.12; g.add(base);
    const water=meshOf(G.cyl(0.36,0.36,0.06,20), mat('#BDE3F5',{emissive:'#BDE3F5',emissiveIntensity:0.2})); water.position.y=0.26; g.add(water);
    const stem=meshOf(G.cyl(0.08,0.1,0.4,12), mat('#CDB8E8')); stem.position.y=0.46; g.add(stem);
    const top=meshOf(G.cyl(0.2,0.2,0.05,16), mat('#BDE3F5',{emissive:'#BDE3F5',emissiveIntensity:0.2})); top.position.y=0.68; g.add(top);
    const spout=meshOf(G.sph(0.09,10), mat('#DFF4FF',{emissive:'#BDE3F5',emissiveIntensity:0.4})); spout.position.y=0.8; g.add(spout);
    return g;
  }
  const spr=emojiSprite(FURN[type]?FURN[type].ico:'❓',0.6); spr.position.y=0.6; g.add(spr);
  return g;
}

/* =========================================================
   WALKERS (characters)
========================================================= */
function makeWalker(cfg,x,y){ return {cfg,x,y,path:[],speed:2.3,carry:null,face:0,obj:null}; }
function buildCharacter(cfg){
  const g=new THREE.Group();
  const bodyCol=cfg.color||'#FF6FA5';
  const skin=cfg.skin||'#F7C69B';
  const sc=cfg.kid?0.72:1.0;
  const holder=new THREE.Group(); holder.scale.setScalar(sc); g.add(holder);
  const body=meshOf(new THREE.CapsuleGeometry(0.26,0.34,4,12), mat(bodyCol)); body.position.y=0.5; holder.add(body);
  const head=meshOf(G.sph(0.3,16), mat(skin)); head.position.y=1.02; holder.add(head);
  /* eyes (face +z) */
  [-0.11,0.11].forEach(x=>{ const e=meshOf(G.sph(0.045,8), mat('#3A2A1A'),false); e.position.set(x,1.06,0.27); holder.add(e); });
  /* smile */
  const smile=meshOf(new THREE.TorusGeometry(0.08,0.02,8,12,Math.PI), mat('#C24E4E'),false);
  smile.position.set(0,0.96,0.27); smile.rotation.z=Math.PI; holder.add(smile);
  /* hair / hat */
  if (cfg.hat){ addHat(holder, cfg.hat, cfg.hair||'#5C3A21'); }
  else if (cfg.hair){ const h=meshOf(G.sph(0.31,16,16), mat(cfg.hair)); h.scale.y=0.62; h.position.y=1.16; holder.add(h); }
  /* arms */
  [-0.32,0.32].forEach(x=>{ const a=meshOf(new THREE.CapsuleGeometry(0.08,0.22,4,8), mat(bodyCol)); a.position.set(x,0.56,0); holder.add(a); });
  g.userData.holder=holder;
  /* carry tray */
  const tray=new THREE.Group(); tray.position.set(0,0.9,0.34); tray.visible=false; holder.add(tray);
  const plate=meshOf(G.cyl(0.16,0.16,0.03,14), mat('#FFFFFF')); tray.add(plate);
  g.userData.tray=tray; g.userData.traySpr=null;
  return g;
}
function addHat(holder, hat, hairCol){
  if (hat==='chef'){
    const band=meshOf(G.cyl(0.26,0.26,0.12,16), mat('#FFFFFF')); band.position.y=1.24; holder.add(band);
    const puff=meshOf(G.sph(0.24,14), mat('#FFFFFF')); puff.position.y=1.4; puff.scale.y=0.8; holder.add(puff);
  } else if (hat==='crown'){
    const h=meshOf(G.sph(0.31,16), mat(hairCol)); h.scale.y=0.62; h.position.y=1.16; holder.add(h);
    const crown=meshOf(G.cyl(0.2,0.24,0.16,5), mat('#FFD166',{metal:0.3,rough:0.4})); crown.position.y=1.32; holder.add(crown);
  } else if (hat==='fairy'){
    const h=meshOf(G.sph(0.31,16), mat('#E4C1F9')); h.scale.y=0.62; h.position.y=1.16; holder.add(h);
    const wand=emojiSprite('🪄',0.3); wand.position.set(0.4,0.7,0); holder.add(wand);
  } else if (hat==='cat'){
    const h=meshOf(G.sph(0.31,16), mat(hairCol)); h.scale.y=0.62; h.position.y=1.16; holder.add(h);
    [-0.16,0.16].forEach(x=>{ const ear=meshOf(G.cone(0.09,0.16,4), mat(hairCol)); ear.position.set(x,1.36,0); holder.add(ear); });
  } else if (hat==='star'){
    const h=meshOf(G.sph(0.31,16), mat(hairCol)); h.scale.y=0.62; h.position.y=1.16; holder.add(h);
    const st=emojiSprite('🌟',0.34); st.position.set(0,1.5,0); holder.add(st);
  } else if (hat==='bow'){
    const h=meshOf(G.sph(0.31,16), mat(hairCol)); h.scale.y=0.62; h.position.y=1.16; holder.add(h);
    const bow=emojiSprite('🎀',0.3); bow.position.set(0,1.34,0.05); holder.add(bow);
  }
}
function costumeHat(id){ return id==='chef'?'chef':id==='crown'?'crown':id==='fairy'?'fairy':id==='cat'?'cat':id==='star'?'star':'bow'; }
function ensureObj(w){
  if (w.obj) return;
  w.obj=buildCharacter(w.cfg); scene.add(w.obj);
}
function removeObj(w){ if (w.obj){ scene.remove(w.obj); disposeGroup(w.obj); w.obj=null; } }

const elise=makeWalker({color:S.elise.color, skin:S.elise.skin, hat:costumeHat(S.costume), hair:S.elise.hair}, 5,5);
let staffWalkers=[];
function syncStaff(){
  staffWalkers.forEach(removeObj);
  staffWalkers=S.staff.map(k=>{ const w=makeWalker({color:STAFF[k].color, skin:'#F7C69B', hair:STAFF[k].hair, hat:k==='baker'?'chef':null}, 2,3); w.role=k; return w; });
}
function rebuildElise(){ removeObj(elise); elise.cfg.hat=costumeHat(S.costume); elise.cfg.color=S.elise.color; elise.cfg.skin=S.elise.skin; elise.cfg.hair=S.elise.hair; }

function walkTo(w,tx,ty){
  const p=findPath(Math.round(w.x),Math.round(w.y),tx,ty);
  if (p) w.path=p; else { w.x=tx; w.y=ty; w.path=[]; }
  return true;
}
function stepWalker(w,dt){
  if (!w.path.length) return;
  const t=w.path[0], dx=t.x-w.x, dy=t.y-w.y, d=Math.hypot(dx,dy), mv=w.speed*dt;
  if (d>0.0001) w.face=Math.atan2(dx, dy);
  if (d<=mv){ w.x=t.x; w.y=t.y; w.path.shift(); }
  else { w.x+=dx/d*mv; w.y+=dy/d*mv; }
}

/* =========================================================
   CUSTOMERS — pipeline (ported)
========================================================= */
let customers=[], custId=0, deliveries=[];
function fixedTables(){ return S.tables.map((lvl,i)=>({lvl,i})).filter(t=>t.lvl>=1); }
function seatTileFor(slotIdx){
  const p=tableSlots()[slotIdx];
  for (const [dx,dy] of [[0,1],[1,0],[-1,0],[0,-1]]){
    const x=p.x+dx,y=p.y+dy;
    if (inGrid(x,y)&&!blocked(x,y)) return {x,y};
  }
  return {x:p.x,y:p.y+1};
}
/* Where a server should stand to hand over food: next to the guest/table, not
   on the same tile the guest is sitting at. */
function deliverTileFor(c){
  const cust={x:Math.round(c.x),y:Math.round(c.y)};
  const isCust=(x,y)=>x===cust.x&&y===cust.y;
  if (c.seat!=null){
    const p=tableSlots()[c.seat];
    for (const [dx,dy] of [[0,1],[1,0],[-1,0],[0,-1]]){
      const x=p.x+dx,y=p.y+dy;
      if (inGrid(x,y)&&!blocked(x,y)&&!isCust(x,y)) return {x,y};
    }
  }
  /* fall back to any free tile beside the guest */
  for (const [dx,dy] of [[1,0],[-1,0],[0,1],[0,-1]]){
    const x=cust.x+dx,y=cust.y+dy;
    if (inGrid(x,y)&&!blocked(x,y)) return {x,y};
  }
  return cust;
}
function queueList(){ return customers.filter(c=>c.state==='toQueue'||c.state==='queue').sort((a,b)=>a.qIdx-b.qIdx); }
function makeOrder(kid){
  const menu=S.unlockedItems.filter(k=>!ITEMS[k].party);
  const hasParty=S.unlockedItems.includes('animalCake');
  if (hasParty&&kid&&Math.random()<0.35)
    return {item:'animalCake', animal:rand(ANIMALS), want:{flavor:rand(CAKE_FLAVORS).id, tiers:2+Math.floor(Math.random()*2)}};
  const item=rand(menu);
  if (item==='cake') return {item, want:{flavor:rand(CAKE_FLAVORS).id, tiers:1+Math.floor(Math.random()*(stars()>=3?3:2))}};
  if (item==='cookie') return {item, want:{shape:rand(COOKIE_SHAPES).id}};
  if (item==='iceCream') return {item, want:{scoops:1+Math.floor(Math.random()*3)}};
  return {item, want:{}};
}
function spawnCustomer(){
  if (S.stations.register<1) return;
  const q=queueList();
  if (q.length>=QUEUE_SPOTS.length) return;
  const kid=Math.random()<(S.placed.some(p=>p.type==='playArea')?0.5:0.28);
  const order=makeOrder(kid);
  const price=S.prices[order.item], base=ITEMS[order.item].base;
  if (price>base*2&&Math.random()<0.6){ toast(`😤 "${ITEMS[order.item].name}? Too pricey!"`); return; }
  const cfg={ color:rand(BODY_COLORS), skin:rand(ADULT_SKIN), hair:rand(kid?KID_HAIR:ADULT_HAIR), kid };
  const c=makeWalker(cfg, DOOR.x, DOOR.y);
  c.id=++custId; c.kid=kid; c.order=order; c.party=order.item==='animalCake';
  c.state='toQueue'; c.qIdx=q.length;
  let patience=140+(S.staff.includes('waitress')?45:0);
  if (kid&&S.placed.some(p=>p.type==='playArea')) patience+=60;
  c.patience=patience; c.maxP=patience;
  const spot=QUEUE_SPOTS[c.qIdx];
  walkTo(c,spot.x,spot.y);
  ensureObj(c);
  customers.push(c);
  updateBadge();
}
function shiftQueue(){
  queueList().forEach((c,i)=>{
    if (c.qIdx!==i){ c.qIdx=i; const s=QUEUE_SPOTS[i]; walkTo(c,s.x,s.y); if (c.state==='queue') c.state='toQueue'; }
  });
}
function takeOrder(c){
  c.state='toSeat'; shiftQueue();
  const free=fixedTables().find(t=>!customers.some(x=>x.seat===t.i&&x!==c));
  if (free){ c.seat=free.i; const st=seatTileFor(free.i); walkTo(c,st.x,st.y); }
  else { c.seat=null; walkTo(c,Math.min(GX-2,10),Math.min(GY-2,7)); }
  updateBadge();
}
function updateBadge(){
  const waiting=queueList().length;
  const b=$('custBadge'); b.style.display=waiting?'flex':'none'; b.textContent=waiting;
}
function removeCustomer(c){
  removeObj(c);
  if (c.bubble){ c.bubble.remove(); c.bubble=null; }
  customers=customers.filter(x=>x!==c);
  shiftQueue(); updateBadge();
}
function payout(c,amt,party,msg){
  if (c.seat!=null){ amt += [0,0,2,4][S.tables[c.seat]]||0; }
  amt += [0,0,2,4][S.stations.register]||0;
  /* hygiene tip: a wash / handwashing station keeps guests happy */
  if (S.placed.some(p=>p.type==='washSink'||p.type==='kitchenSink')) amt += 2;
  S.coins+=amt; S.earned+=amt; S.served++;
  if (party) S.parties++;
  addStarPts(amt);
  save(); renderTop(); renderMy();
  const sp=projectToScreen(c);
  coinFlyScreen(sp.x, sp.y-30, amt);
  c.state='leaving'; walkTo(c,DOOR.x,DOOR.y);
  if (msg) toast(msg);
  checkObjectives();
}
function projectToScreen(w){
  const wp=W(w.x,w.y); wp.y=1.2;
  const v=wp.clone().project(camera);
  const r=canvas.getBoundingClientRect();
  return { x:r.left + (v.x*0.5+0.5)*r.width, y:r.top + (-v.y*0.5+0.5)*r.height };
}

/* =========================================================
   LOGIC TICK (1s)  (ported)
========================================================= */
let secs=0, ovenGlow=0, spawnCooldown=6;
function logicTick(){
  secs++;
  customers.forEach(c=>{
    if (c.state==='toQueue'&&!c.path.length) c.state='queue';
    /* No one loses patience while an order is being made — Elise can take all
       the time she needs in the studio. */
    if (c.state==='queue' && !studioOpen){
      c.patience--;
      if (c.patience<=0){ c.state='leaving'; walkTo(c,DOOR.x,DOOR.y); shiftQueue(); toast('👋 "Bye! Maybe next time!"'); }
    }
    if (c.state==='toSeat'&&!c.path.length) c.state='waitingFood';
    if (c.state==='eating'){ c.eatT--; if (c.eatT<=0){ const amt=c.pendingAmt; c.pendingAmt=0; payout(c,amt,c.party,c.payMsg); } }
    if (c.state==='leaving'&&!c.path.length) removeCustomer(c);
  });
  deliveries=deliveries.filter(d=>{
    const c=customers.find(x=>x.id===d.custId);
    if (!c){ setCarry(d.w,null); return false; }
    if (d.phase==='pickup'){
      if (!d.w.path.length){
        setCarry(d.w, d.item); d.phase='deliver';
        const st=deliverTileFor(c);
        walkTo(d.w,st.x,st.y);
      }
      return true;
    }
    if (!d.w.path.length&&(c.state==='waitingFood')){
      setCarry(d.w,null);
      c.state='eating'; c.eatT=16; c.eatIco=d.ico; c.pendingAmt=d.amt; c.payMsg=d.msg;
      return false;
    }
    if (!d.w.path.length&&c.state!=='waitingFood'&&c.state!=='toSeat'){ setCarry(d.w,null); return false; }
    return true;
  });
  /* Gentle arrivals: keep the line short, space guests well apart, and never
     let a new guest show up while she's mid-order — a constant full line is
     overwhelming. */
  const cap=2;                       // shorter, calmer line (was 3)
  if (spawnCooldown>0) spawnCooldown--;
  if (!studioOpen && queueList().length<cap && spawnCooldown<=0 && Math.random()<0.6){
    spawnCustomer();
    spawnCooldown = 10 + Math.floor(Math.random()*6);  // ~10–15s between guests
  }
  staffWalkers.forEach(w=>{
    if (w.role==='baker'){
      if (w.cook>0){
        w.cook--; ovenGlow=2;
        if (w.cook===0&&w.target){
          const c=customers.find(x=>x.id===w.target);
          if (c){
            const st=deliverTileFor(c);
            walkTo(w,st.x,st.y);
            const amt=Math.max(2,Math.floor(S.prices[c.order.item]*0.65));
            setCarry(w, c.order.item);
            deliveries.push({custId:c.id,w,amt,item:c.order.item,ico:ITEMS[c.order.item].ico,phase:'deliver',msg:'🧑‍🍳 Baker Ben made it!'});
          }
          w.target=null;
        }
      } else if (!deliveries.some(d=>d.w===w)){
        const front=queueList().find(c=>c.state==='queue');
        if (front&&S.stations.oven>=1&&secs%5===0){
          takeOrder(front); w.target=front.id;
          const op=STATION_POS.oven; walkTo(w,op.x,op.y+1); w.cook=5;
        } else if (!w.path.length&&Math.random()<0.25) wander(w);
      }
    } else if (!deliveries.some(d=>d.w===w)&&!w.path.length&&Math.random()<0.25) wander(w);
  });
  const dl=S.stations.display;
  if (dl>=1){
    const every=[0,12,9,6][dl], amt=[0,2,3,4][dl];
    if (secs%every===0){
      S.coins+=amt; S.earned+=amt; addStarPts(1); save(); renderTop();
      const p=W(STATION_POS.display.x,STATION_POS.display.y); p.y=1.2;
      const v=p.project(camera); const r=canvas.getBoundingClientRect();
      coinFlyScreen(r.left+(v.x*0.5+0.5)*r.width, r.top+(-v.y*0.5+0.5)*r.height-20, amt);
    }
  }
  if (ovenGlow>0) ovenGlow--;
}
function wander(w){
  for (let i=0;i<8;i++){
    const x=Math.floor(Math.random()*GX), y=Math.floor(Math.random()*GY);
    if (!blocked(x,y)&&!reservedTile(x,y)){ walkTo(w,x,y); return; }
  }
}
function setCarry(w, item){
  w.carry=item;
  if (!w.obj) return;
  const tray=w.obj.userData.tray;
  if (w.obj.userData.trayObj){ tray.remove(w.obj.userData.trayObj); w.obj.userData.trayObj=null; }
  if (item){ const m=makeTreatModel(item,0.3); m.position.y=0.04; tray.add(m); w.obj.userData.trayObj=m; tray.visible=true; }
  else tray.visible=false;
}

/* =========================================================
   OBJECTIVES (ported)
========================================================= */
const OBJECTIVES = [
  {text:'Tap the sleepy oven to wake it up! 💤', target:()=>STATION_POS.oven, done:()=>S.stations.oven>=1},
  {text:'Fix the wobbly cash register! 💰', target:()=>STATION_POS.register, done:()=>S.stations.register>=1},
  {text:'Tidy up the decorating station! 🎨', target:()=>STATION_POS.deco, done:()=>S.stations.deco>=1},
  {text:'Fix the wobbly table so guests can sit! 🪑', target:()=>tableSlots()[0], done:()=>S.tables[0]>=1},
  {text:'A guest is here! Tap them to take the order! 🛎️', target:()=>QUEUE_SPOTS[0], done:()=>S.served>=1},
  {text:'Add a display case — it sells treats by itself! 🧁', target:()=>STATION_POS.display, done:()=>S.stations.display>=1},
  {text:'Buy a new table for more guests! 🪑', target:()=>tableSlots()[1], done:()=>S.tables[1]>=1},
  {text:'Serve 5 treats to reach ⭐2!', target:()=>QUEUE_SPOTS[0], done:()=>stars()>=2},
  {text:'Visit the 🛍️ Shop — cookies are waiting!', target:null, done:()=>S.unlockedItems.includes('cookie')},
  {text:'Hire a helper from the 🛍️ Shop!', target:null, done:()=>S.staff.length>=1},
  {text:'Upgrade a station — tap any fixed station! ✨', target:()=>STATION_POS.oven, done:()=>S.stations.oven>=2||S.stations.deco>=2||S.stations.register>=2},
  {text:'Reach ⭐3 — keep serving and upgrading!', target:null, done:()=>stars()>=3},
  {text:'Throw a birthday party! Unlock Animal Cakes! 🎂', target:null, done:()=>S.parties>=1},
  {text:'Make your bakery beautiful! You did it all! 💖', target:null, done:()=>false},
];
function currentObjective(){ return OBJECTIVES[Math.min(S.objIdx,OBJECTIVES.length-1)]; }
function checkObjectives(){
  let advanced=false;
  while (S.objIdx<OBJECTIVES.length-1 && OBJECTIVES[S.objIdx].done()){ S.objIdx++; advanced=true; }
  if (advanced){ save(); confetti(12); chime(); toast('🧁 "Great job!" — Poppy'); }
  $('objText').textContent=currentObjective().text;
}

/* =========================================================
   RENDER LOOP
========================================================= */
let lastT=performance.now();
function frame(now){
  const dt=Math.min(0.05,(now-lastT)/1000); lastT=now;
  const worldActive=$('scr-world').classList.contains('active');
  [elise,...staffWalkers,...customers].forEach(w=>stepWalker(w,dt));
  if (worldActive){
    controls.update();
    for (let i=0;i<mixers.length;i++) mixers[i].update(dt);
    updateSteam(dt);
    updateWalkers(now);
    updateStationsFx(now);
    updateObjArrow(now);
    updateBubbles();
    renderer.render(scene,camera);
  }
  if (studioOpen) renderStudio(now);
  requestAnimationFrame(frame);
}
function updateWalkers(now){
  const list=[elise,...staffWalkers,...customers];
  list.forEach(w=>{
    ensureObj(w);
    if (!w.obj) return;
    const wp=W(w.x,w.y);
    const moving=w.path.length>0;
    const t=now/95;
    const bob=moving?Math.abs(Math.sin(t))*0.06:Math.sin(t/3)*0.02;
    w.obj.position.set(wp.x, bob, wp.z);
    /* face movement or camera-ish */
    const targetRot=w.face||0;
    let cur=w.obj.rotation.y;
    let diff=targetRot-cur; while(diff>Math.PI)diff-=2*Math.PI; while(diff<-Math.PI)diff+=2*Math.PI;
    w.obj.rotation.y=cur+diff*0.2;
    /* squash while walking */
    const holder=w.obj.userData.holder;
    if (holder){ const sq=moving?1+Math.sin(t)*0.04:1; holder.scale.y=(w.cfg.kid?0.72:1.0)*sq; }
  });
}
function updateStationsFx(now){
  /* gently bob the sleepy 💤 sprites on unfixed stations/tables */
  scene.traverse(o=>{ if (o.userData&&o.userData.zzz){ o.position.y = (o.parent&&o.parent.userData.station?1.5:1.0)+Math.sin(now/400)*0.06; } });
}
function updateObjArrow(now){
  const obj=currentObjective();
  if (obj.target){
    const t=obj.target(); const p=W(t.x,t.y);
    objArrow.visible=true;
    objArrow.position.set(p.x, 2.0+Math.sin(now/220)*0.12, p.z);
  } else objArrow.visible=false;
}
function updateBubbles(){
  const layer=$('bubbleLayer');
  const r=canvas.getBoundingClientRect();
  customers.forEach(c=>{
    const show=c.order&&(c.state==='queue'||c.state==='toQueue');
    if (show){
      if (!c.bubble){
        const b=document.createElement('div'); b.className='bubble tap';
        b.innerHTML=`<div class="treat">${orderEmoji(c.order)}</div><div class="hearts"></div>`;
        b.addEventListener('pointerdown', ev=>{ ev.stopPropagation(); tryOrder(c); });
        layer.appendChild(b); c.bubble=b;
      }
      const wp=W(c.x,c.y); wp.y=1.9;
      const v=wp.clone().project(camera);
      const x=(v.x*0.5+0.5)*r.width, y=(-v.y*0.5+0.5)*r.height;
      c.bubble.style.left=x+'px'; c.bubble.style.top=y+'px';
      const hf=c.patience/c.maxP;
      c.bubble.querySelector('.hearts').textContent='💗'.repeat(Math.max(1,Math.ceil(hf*3)));
      c.bubble.style.opacity=(v.z<1)?1:0;
    } else if (c.bubble){ c.bubble.remove(); c.bubble=null; }
  });
}
function orderEmoji(o){
  if (o.item==='cake') return CAKE_FLAVORS.find(f=>f.id===o.want.flavor).ico+'×'+o.want.tiers;
  if (o.item==='animalCake') return o.animal.ico+'🎂';
  if (o.item==='cookie') return '🍪'+COOKIE_SHAPES.find(s=>s.id===o.want.shape).ico;
  if (o.item==='iceCream') return '🍦×'+o.want.scoops;
  return ITEMS[o.item].ico;
}

/* =========================================================
   WORLD INPUT (raycast tap vs orbit drag)
========================================================= */
const raycaster=new THREE.Raycaster();
let buildMode=false, buildSel=null;
let downPt=null;
canvas.addEventListener('pointerdown', ev=>{ downPt={x:ev.clientX,y:ev.clientY,t:performance.now()}; });
canvas.addEventListener('pointerup', ev=>{
  if (!downPt) return;
  const dx=ev.clientX-downPt.x, dy=ev.clientY-downPt.y;
  const moved=Math.hypot(dx,dy), dur=performance.now()-downPt.t;
  downPt=null;
  if (moved>12 || dur>500) return; /* was a drag/orbit */
  handleTap(ev.clientX, ev.clientY);
});
function handleTap(clientX, clientY){
  const r=canvas.getBoundingClientRect();
  const ndc=new THREE.Vector2(((clientX-r.left)/r.width)*2-1, -(((clientY-r.top)/r.height)*2-1));
  raycaster.setFromCamera(ndc, camera);
  const hit=raycaster.intersectObject(groundPlane)[0];
  const gx=hit?Math.round(hit.point.x+(GX-1)/2):null, gy=hit?Math.round(hit.point.z+(GY-1)/2):null;
  const onGrid=hit&&inGrid(gx,gy);
  /* Customers keep priority: tap a waiting guest to take their order. */
  if (onGrid && !buildMode){
    const c=customers.find(x=>(x.state==='queue'||x.state==='toQueue')&&Math.abs(x.x-gx)<0.7&&Math.abs(x.y-gy)<0.7);
    if (c){ tryOrder(c); return; }
  }
  /* A direct hit anywhere on a station or table model opens its sheet — the
     whole 3D piece is clickable, so tall items like the register are easy to
     select instead of relying on the floor tile beneath them. */
  if (!buildMode){
    const pickables=[...Object.values(stationObjs), ...tableObjs].filter(Boolean);
    const picks=raycaster.intersectObjects(pickables, true);
    if (picks.length){
      let o=picks[0].object;
      while (o && o.userData.station===undefined && o.userData.tableIndex===undefined) o=o.parent;
      if (o){
        if (o.userData.station){ openSheet(o.userData.station); return; }
        if (o.userData.tableIndex!==undefined && S.tables[o.userData.tableIndex]>=0){ openSheet('table'+o.userData.tableIndex); return; }
      }
    }
  }
  if (!onGrid) return;
  const st=stationAt(gx,gy);
  if (st&&!buildMode){ openSheet(st); return; }
  if (buildMode){
    const f=furnAt(gx,gy);
    if (f){ S.placed=S.placed.filter(p=>p!==f); S.inventory[f.type]=(S.inventory[f.type]||0)+1; save(); syncFurniture(); renderTray(); chime(); return; }
    if (buildSel&&(S.inventory[buildSel]||0)>0&&!blocked(gx,gy)&&!reservedTile(gx,gy)){
      S.placed.push({type:buildSel,x:gx,y:gy}); S.inventory[buildSel]--;
      if (!S.inventory[buildSel]) buildSel=null;
      save(); syncFurniture(); renderTray(); bigChime();
    }
    return;
  }
  if (!blocked(gx,gy)){ walkTo(elise,gx,gy); beep(500,.05); }
}
function tryOrder(c){
  if (S.stations.oven<1){ toast('Wake up the oven first! 💤'); return; }
  if (S.stations.deco<1){ toast('Tidy the decorating station first! 🎨'); return; }
  openStudioFor(c);
}
$('buildBtn').onclick=()=>{
  buildMode=!buildMode;
  $('buildBtn').classList.toggle('on',buildMode);
  $('buildTray').classList.toggle('show',buildMode);
  if (buildMode) renderTray();
  beep(700,.06);
};
$('camBtn').onclick=()=>{ frameCamera(); beep(600,.05); };
function renderTray(){
  const keys=Object.keys(S.inventory).filter(k=>S.inventory[k]>0);
  $('trayItems').innerHTML=keys.length?keys.map(k=>`
    <button class="tray-item ${buildSel===k?'sel':''}" data-k="${k}">
      <div class="ti">${FURN[k].ico}</div><div class="tn">${FURN[k].name}</div><div class="tc">×${S.inventory[k]}</div>
    </button>`).join('')
    :'<div style="font-weight:800;color:var(--choc-soft);font-size:13px;padding:8px;text-align:center;width:100%">Nothing to place — buy decorations in the 🛍️ Shop!</div>';
  $('trayItems').querySelectorAll('.tray-item').forEach(b=>b.onclick=()=>{ const k=b.dataset.k; buildSel=buildSel===k?null:k; renderTray(); chime(); });
}

/* =========================================================
   STATION SHEET (ported)
========================================================= */
let sheetKey=null;
function openSheet(key){ sheetKey=key; renderSheet(); $('sheetWrap').classList.add('show'); beep(650,.06); }
function sheetInfo(key){
  if (key.startsWith('table')){
    const i=parseInt(key.slice(5),10), lvl=S.tables[i];
    const tier=TABLE_TIERS[Math.max(0,lvl)];
    return {
      ico: lvl<0?'🪧':'🪑', name: lvl<0?'Empty Table Spot':tier.name.replace(' 💤',''),
      lvl, tierTxt: lvl<0?'For sale!':(lvl===0?'Needs fixing! 💤':'Tier '+lvl+' of 3'),
      perk: lvl<0?'Buy a table for more guests!':(lvl<3?TABLE_TIERS[lvl+1].perk:'All maxed out — royal!'),
      cost: lvl<0?TABLE_BUY_COST[i]:(lvl===0?TABLE_BUY_COST[0]:(lvl<3?TABLE_TIERS[lvl+1].cost:0)),
      btn: lvl<0?'Buy table!':(lvl===0?'Fix it!':(lvl<3?'Upgrade!':'✨ MAX ✨')),
    };
  }
  const def=STATIONS[key], lvl=S.stations[key];
  return {
    ico:def.ico, name:def.name, lvl,
    tierTxt: lvl<0?'Not here yet!':(lvl===0?def.tiers[0].name:def.tiers[lvl].name+' — Tier '+lvl+' of 3'),
    perk: lvl<0?def.tiers[0].perk:(lvl===0?def.tiers[0].perk:(lvl<3?'Next: '+def.tiers[lvl+1].perk:'All maxed out! ✨')),
    cost: lvl<=0?def.fixCost:(lvl<3?def.tiers[lvl+1].cost:0),
    btn: lvl<0?'Add it!':(lvl===0?'Fix it!':(lvl<3?'Upgrade!':'✨ MAX ✨')),
  };
}
function renderSheet(){
  const info=sheetInfo(sheetKey);
  $('sheetIco').textContent=info.ico;
  $('sheetName').textContent=info.name;
  $('sheetTier').textContent=info.tierTxt;
  $('sheetPerk').textContent=info.perk;
  const btn=$('sheetBtn');
  btn.classList.toggle('maxed',info.lvl>=3);
  if (info.lvl>=3){ btn.textContent='✨ MAX ✨'; btn.disabled=true; }
  else { btn.textContent=info.btn+'  🪙 '+info.cost; btn.disabled=S.coins<info.cost; }
}
$('sheetBtn').onclick=()=>{
  const info=sheetInfo(sheetKey);
  if (info.lvl>=3||S.coins<info.cost) return;
  S.coins-=info.cost;
  if (sheetKey.startsWith('table')){
    const i=parseInt(sheetKey.slice(5),10);
    S.tables[i]=Math.max(1,S.tables[i]+1); refreshTable(i);
  } else {
    S.stations[sheetKey]=Math.max(1,S.stations[sheetKey]+1); refreshStation(sheetKey);
  }
  addStarPts(15); save(); renderTop(); renderSheet();
  confetti(18); bigChime();
  toast(info.lvl<=0?'✨ All fixed up! ✨':'⬆️ Upgraded! So fancy!');
  checkObjectives();
};
$('sheetClose').onclick=()=>$('sheetWrap').classList.remove('show');
$('sheetWrap').addEventListener('pointerdown',ev=>{ if (ev.target===$('sheetWrap')) $('sheetWrap').classList.remove('show'); });

/* =========================================================
   3D FOOD STUDIO
========================================================= */
function decoTier(){ return Math.max(1,S.stations.deco); }
function allowedFrostings(){ return decoTier()>=2?FROSTINGS:FROSTINGS.slice(0,4); }
function allowedToppings(){ return decoTier()>=3?TOPPINGS:TOPPINGS.slice(0,decoTier()>=2?6:4); }
function drizzleAllowed(){ return decoTier()>=2; }
function topperAllowed(){ return decoTier()>=3; }
function ovenTapPower(){ return [12,12,17,23][Math.max(1,S.stations.oven)]; }

let ST=null, studioOpen=false;
let SR=null, SS=null, SCam=null, STurn=null, treatGroup=null, sControls=null;
function initStudioScene(){
  const sc=$('studioCanvas');
  SR=new THREE.WebGLRenderer({canvas:sc, antialias:true, alpha:true});
  SR.setPixelRatio(Math.min(window.devicePixelRatio||1,2));
  SR.shadowMap.enabled=true; SR.shadowMap.type=THREE.PCFSoftShadowMap;
  SS=new THREE.Scene();
  SCam=new THREE.PerspectiveCamera(42,1,0.1,50);
  SCam.position.set(0,2.4,4.6); SCam.lookAt(0,1.1,0);
  try{ const spm=new THREE.PMREMGenerator(SR); SS.environment=spm.fromScene(new RoomEnvironment(),0.04).texture; SS.environmentIntensity=0.45; }catch(e){}
  SS.add(new THREE.HemisphereLight(0xffffff,0xFFE0C0,1.0));
  const d=new THREE.DirectionalLight(0xffffff,1.1); d.position.set(3,6,4); d.castShadow=true;
  d.shadow.mapSize.set(1024,1024); d.shadow.camera.near=0.5; d.shadow.camera.far=20;
  d.shadow.camera.left=-4;d.shadow.camera.right=4;d.shadow.camera.top=4;d.shadow.camera.bottom=-4;
  SS.add(d);
  /* turntable */
  const plate=meshOf(G.cyl(1.5,1.6,0.16,32), mat('#FFFFFF'));
  plate.position.y=0.6; plate.receiveShadow=true; SS.add(plate);
  const ped=meshOf(G.cyl(0.5,0.7,0.6,20), mat('#F3C6DC')); ped.position.y=0.3; SS.add(ped);
  const floorS=meshOf(new THREE.PlaneGeometry(20,20), mat('#F7E4CF'),false); floorS.rotation.x=-Math.PI/2; floorS.receiveShadow=true; SS.add(floorS);
  STurn=new THREE.Group(); STurn.position.y=0.7; SS.add(STurn);
  sControls=new OrbitControls(SCam, sc);
  sControls.enableDamping=true; sControls.enablePan=false;
  sControls.minDistance=3; sControls.maxDistance=7;
  sControls.minPolarAngle=0.4; sControls.maxPolarAngle=Math.PI*0.5;
  sControls.target.set(0,1.1,0); sControls.autoRotate=true; sControls.autoRotateSpeed=1.4;
  sControls.update();
}
function resizeStudio(){
  const sc=$('studioCanvas'); const w=sc.clientWidth,h=sc.clientHeight;
  if (!w||!h||!SR) return;
  SR.setSize(w,h,false); SCam.aspect=w/h; SCam.updateProjectionMatrix();
}
function renderStudio(now){
  if (!SR) return;
  sControls.update();
  SR.render(SS,SCam);
}
function openStudioFor(cust){
  const o=cust.order;
  ST={cust,custId:cust.id,item:o.item,practice:false,
    tiers:o.item==='iceCream'?0:(o.want.tiers||2),
    flavors:['choc','vanilla','strawb'], frosts:[FROSTINGS[0],FROSTINGS[1],FROSTINGS[4]],
    shape:'circle',dough:'sugar',icing:FROSTINGS[0],
    base:'cone',scoops:[],
    drizzle:'none',decos:[],topper:'none',animalOn:false,
    selTier:0,baked:false,step:0};
  openStudio();
}
function openPractice(item){
  ST={cust:null,custId:null,item,practice:true,
    tiers:2,flavors:['choc','vanilla','rainbow'],frosts:[FROSTINGS[0],FROSTINGS[1],FROSTINGS[4]],
    shape:'circle',dough:'sugar',icing:FROSTINGS[0],
    base:'cone',scoops:[],
    drizzle:'none',decos:[],topper:'none',animalOn:false,
    selTier:0,baked:false,step:0};
  $('picker').classList.remove('show');
  openStudio();
}
window.openPractice=openPractice;
function isSimpleItem(){ return !!(ITEMS[ST.item] && ITEMS[ST.item].simple); }
function stepsFor(){
  if (isSimpleItem()) return ['🔥 Bake','🛎️ Serve'];
  return ST.item==='iceCream'?['🍦 Scoop','🎨 Decorate','🛎️ Serve']:['🧁 Build','🔥 Bake','🎨 Decorate','🛎️ Serve'];
}
function openStudio(){
  studioOpen=true;
  $('studio').classList.add('show');
  if (!SR){ initStudioScene(); }
  setTimeout(resizeStudio, 30);
  const c=ST.cust;
  if (ST.practice) $('stTitle').textContent='🎨 Practice Kitchen';
  else if (ST.item==='animalCake') $('stTitle').textContent=`${orderEmoji(c.order)} "A ${c.order.animal.name} ${c.order.want.tiers}-tier birthday cake!"`;
  else if (ST.item==='cake') $('stTitle').textContent=`"A ${CAKE_FLAVORS.find(f=>f.id===c.order.want.flavor).name.toLowerCase()} cake, ${c.order.want.tiers} tiers!"`;
  else if (ST.item==='cookie') $('stTitle').textContent=`"A ${c.order.want.shape} cookie please!"`;
  else if (isSimpleItem()) $('stTitle').textContent=`${ITEMS[ST.item].ico} "A fresh ${ITEMS[ST.item].name.replace(/s$/,'').toLowerCase()}, please!"`;
  else $('stTitle').textContent=`"${c.order.want.scoops} scoops of ice cream!"`;
  rebuildTreat();
  renderStudio2();
}
$('stClose').onclick=()=>{ closeStudio(); };
function closeStudio(){ $('studio').classList.remove('show'); studioOpen=false; ST=null; }

/* ---- treat 3D builders ---- */
const TOP_BUILDERS = {
  '🍓':()=>{ const g=new THREE.Group(); const b=meshOf(G.sph(0.11,10),mat('#FF3B6B',{flat:true})); b.scale.y=1.2; g.add(b);
    const t=meshOf(G.cone(0.08,0.08,6),mat('#46A98C')); t.position.y=0.13; g.add(t); return g; },
  '🍒':()=>{ const g=new THREE.Group(); const b=meshOf(G.sph(0.1,10),mat('#D11E4C')); g.add(b);
    const s=meshOf(G.cyl(0.012,0.012,0.16,5),mat('#6B4226')); s.position.y=0.12; s.rotation.z=0.3; g.add(s); return g; },
  '✨':()=>meshOf(new THREE.OctahedronGeometry(0.1,0),mat('#FFE066',{emissive:'#FFE066',emissiveIntensity:0.5,flat:true})),
  '🍬':()=>{ const g=new THREE.Group(); const b=meshOf(G.sph(0.09,10),mat('#FF6FA5')); b.scale.x=1.5; g.add(b);
    [-0.13,0.13].forEach(x=>{const e=meshOf(G.cone(0.06,0.08,5),mat('#FFB4D0'));e.position.x=x;e.rotation.z=x>0?-Math.PI/2:Math.PI/2;g.add(e);}); return g; },
  '🫐':()=>meshOf(G.sph(0.1,10),mat('#5A6FD6',{flat:true})),
  '🍫':()=>meshOf(G.box(0.16,0.08,0.16),mat('#5C3A21',{flat:true})),
  '🌸':()=>{ const g=new THREE.Group(); for(let i=0;i<5;i++){const p=meshOf(G.sph(0.07,8),mat('#FF9EC4'));const a=i/5*Math.PI*2;p.position.set(Math.cos(a)*0.08,0,Math.sin(a)*0.08);p.scale.set(1,0.5,1);g.add(p);} const c=meshOf(G.sph(0.05,8),mat('#FFD166'));g.add(c); return g; },
  '🍭':()=>{ const g=new THREE.Group(); const b=meshOf(G.cyl(0.11,0.11,0.03,14),mat('#FF6FA5')); b.rotation.x=Math.PI/2; g.add(b);
    const s=meshOf(G.cyl(0.012,0.012,0.22,5),mat('#FFFFFF')); s.position.y=-0.12; g.add(s); return g; },
};
function makeTopping(key){ return (TOP_BUILDERS[key]?TOP_BUILDERS[key]():emojiSprite(key,0.28)); }
function makeTopper(id){
  if (id==='candle'){ const g=new THREE.Group(); const c=meshOf(G.cyl(0.05,0.05,0.4,10),mat('#FF6FA5')); c.position.y=0.2; g.add(c);
    const f=meshOf(G.cone(0.05,0.14,8),mat('#FFC24C',{emissive:'#FF8A3C',emissiveIntensity:0.7})); f.position.y=0.47; g.add(f); return g; }
  if (id==='star'){ const s=meshOf(new THREE.OctahedronGeometry(0.22,0),mat('#FFD166',{emissive:'#FFD166',emissiveIntensity:0.4,metal:0.3,flat:true})); s.position.y=0.24; return s; }
  if (id==='cherry'){ const g=new THREE.Group(); const b=meshOf(G.sph(0.16,12),mat('#D11E4C')); b.position.y=0.16; g.add(b);
    const st=meshOf(G.cyl(0.015,0.015,0.24,5),mat('#6B4226')); st.position.y=0.36; g.add(st); return g; }
  return null;
}
function cookieShapeGeom(shape){
  const s=new THREE.Shape();
  if (shape==='circle'){ s.absarc(0,0,1,0,Math.PI*2,false); }
  else if (shape==='heart'){
    s.moveTo(0,-0.9); s.bezierCurveTo(0.9,-0.2, 1.1,0.6, 0,1.0);
    s.bezierCurveTo(-1.1,0.6, -0.9,-0.2, 0,-0.9);
  } else if (shape==='flower'){
    for (let i=0;i<=72;i++){ const t=i/72*Math.PI*2, r=0.68+0.32*Math.cos(6*t); const px=Math.cos(t)*r, py=Math.sin(t)*r; if(i===0)s.moveTo(px,py); else s.lineTo(px,py); }
    s.closePath();
  } else if (shape==='square'){
    const q=0.9,r=0.28; s.moveTo(-q+r,-q); s.lineTo(q-r,-q); s.quadraticCurveTo(q,-q,q,-q+r); s.lineTo(q,q-r);
    s.quadraticCurveTo(q,q,q-r,q); s.lineTo(-q+r,q); s.quadraticCurveTo(-q,q,-q,q-r); s.lineTo(-q,-q+r); s.quadraticCurveTo(-q,-q,-q+r,-q);
  } else if (shape==='gift'){
    const q=0.92; s.moveTo(-q,-q); s.lineTo(q,-q); s.lineTo(q,q); s.lineTo(-q,q); s.closePath();
  } else if (shape==='diamond'){
    s.moveTo(0,1); s.lineTo(0.78,0); s.lineTo(0,-1); s.lineTo(-0.78,0); s.closePath();
  } else if (shape==='hexagon'){
    for (let i=0;i<6;i++){ const a=Math.PI/3*i+Math.PI/6, px=Math.cos(a)*0.98, py=Math.sin(a)*0.98; i?s.lineTo(px,py):s.moveTo(px,py); } s.closePath();
  } else if (shape==='egg'){
    for (let i=0;i<=48;i++){ const t=i/48*Math.PI*2, px=Math.cos(t)*0.72, py=Math.sin(t)*(t>Math.PI?0.78:1.0); i?s.lineTo(px,py):s.moveTo(px,py); } s.closePath();
  } else if (shape==='moon'){
    s.moveTo(0.15,0.96); s.bezierCurveTo(-1.15,0.55,-1.15,-0.55,0.15,-0.96); s.bezierCurveTo(-0.32,-0.4,-0.32,0.4,0.15,0.96);
  } else if (shape==='cloud'){
    s.moveTo(-0.92,-0.28); s.quadraticCurveTo(-1.18,0.18,-0.58,0.34); s.quadraticCurveTo(-0.52,0.78,0.03,0.58);
    s.quadraticCurveTo(0.42,0.86,0.7,0.38); s.quadraticCurveTo(1.16,0.42,0.92,-0.08); s.quadraticCurveTo(1.03,-0.5,0.5,-0.42); s.lineTo(-0.92,-0.28);
  } else if (shape==='butterfly'){
    s.moveTo(0,0.12);
    s.bezierCurveTo(0.28,0.98,1.05,0.85,0.86,0.12); s.bezierCurveTo(1.05,-0.2,0.5,-0.78,0.12,-0.22);
    s.lineTo(0,-0.34); s.lineTo(-0.12,-0.22);
    s.bezierCurveTo(-0.5,-0.78,-1.05,-0.2,-0.86,0.12); s.bezierCurveTo(-1.05,0.85,-0.28,0.98,0,0.12);
  } else { /* star */
    const spikes=5, outer=1, inner=0.45;
    for (let i=0;i<spikes*2;i++){ const r=i%2?inner:outer; const a=Math.PI/spikes*i-Math.PI/2; const px=Math.cos(a)*r, py=Math.sin(a)*r; if(i===0)s.moveTo(px,py); else s.lineTo(px,py); }
    s.closePath();
  }
  const geo=new THREE.ExtrudeGeometry(s,{depth:0.28,bevelEnabled:true,bevelThickness:0.06,bevelSize:0.06,bevelSegments:2});
  geo.rotateX(-Math.PI/2); geo.scale(0.62,1,0.62); geo.computeVertexNormals();
  return geo;
}
function rebuildTreat(){
  if (!STurn) return;
  if (treatGroup){ STurn.remove(treatGroup); disposeGroup(treatGroup); }
  treatGroup=new THREE.Group(); STurn.add(treatGroup);
  if (isSimpleItem()){ treatGroup.add(makeTreatModel(ST.item, 1.4)); treatGroup.position.y=0.05; return; }
  const isCake=ST.item==='cake'||ST.item==='animalCake';
  if (isCake){
    const dims=[{r:0.95,h:0.4},{r:0.72,h:0.36},{r:0.52,h:0.34}];
    let y=0;
    const n=ST.tiers;
    for (let i=0;i<n;i++){
      const d=dims[i]||dims[2];
      const fl=CAKE_FLAVORS.find(f=>f.id===ST.flavors[i])||CAKE_FLAVORS[0];
      let bodyMat;
      if (fl.color==='rainbow'){ bodyMat=mat('#FF9EC4',{flat:true}); }
      else bodyMat=mat(fl.color,{flat:true});
      const tier=meshOf(G.cyl(d.r,d.r,d.h,28), bodyMat); tier.position.y=y+d.h/2; treatGroup.add(tier);
      if (fl.color==='rainbow'){
        const stripes=['#FF6FA5','#FFD166','#6ECEB2','#BDE3F5','#E4C1F9'];
        stripes.forEach((col,si)=>{ const ring=meshOf(G.cyl(d.r+0.005,d.r+0.005,d.h/5,28,1,true), mat(col,{flat:true}));
          ring.position.y=y+d.h/10+si*d.h/5; treatGroup.add(ring); });
      }
      /* frosting cap */
      if (ST.step>=(ST.item==='iceCream'?1:2) || ST.step>= (isCake?2:2)){
        const fr=meshOf(G.cyl(d.r+0.06,d.r+0.02,0.12,28), mat(ST.frosts[i]||FROSTINGS[0],{flat:true}));
        fr.position.y=y+d.h+0.02; treatGroup.add(fr);
        /* drips */
        for (let k=0;k<10;k++){ const a=k/10*Math.PI*2; const drip=meshOf(G.sph(0.06,8), mat(ST.frosts[i]||FROSTINGS[0],{flat:true}));
          drip.position.set(Math.cos(a)*(d.r+0.02), y+d.h-0.02, Math.sin(a)*(d.r+0.02)); drip.scale.y=1.6; treatGroup.add(drip); }
      }
      /* drizzle */
      if (ST.drizzle!=='none' && ST.step>=2){
        const dc=DRIZZLES.find(x=>x.id===ST.drizzle).color;
        const dz=meshOf(G.cyl(d.r+0.03,d.r+0.03,0.06,28), mat(dc,{flat:true})); dz.position.y=y+d.h-0.06; treatGroup.add(dz);
      }
      y+=d.h;
    }
    const topR=(dims[n-1]||dims[2]).r;
    /* animal face */
    if (ST.animalOn && ST.cust){ const face=emojiSprite(ST.cust.order.animal.ico,0.7); face.position.set(0,y+0.35,0); treatGroup.add(face); }
    /* toppings ring */
    ST.decos.forEach((key,idx)=>{
      const a=idx/Math.max(1,ST.decos.length)*Math.PI*2 + idx*0.7;
      const rr=topR*0.62;
      const t=makeTopping(key); t.position.set(Math.cos(a)*rr, y+0.06, Math.sin(a)*rr); treatGroup.add(t);
    });
    /* topper */
    if (ST.topper!=='none'){ const tp=makeTopper(ST.topper); if (tp){ tp.position.y=y+(ST.animalOn?0.7:0.05); treatGroup.add(tp); } }
    treatGroup.position.y=0;
  }
  else if (ST.item==='cookie'){
    const d=COOKIE_DOUGHS.find(x=>x.id===ST.dough)||COOKIE_DOUGHS[0];
    const geo=cookieShapeGeom(ST.shape);
    const cookie=meshOf(geo, mat(d.color,{flat:true})); cookie.position.y=0.25; treatGroup.add(cookie);
    if (ST.step>=2){
      const icing=meshOf(cookieShapeGeom(ST.shape), mat(ST.icing,{flat:true}));
      icing.scale.set(0.82,0.5,0.82); icing.position.y=0.42; treatGroup.add(icing);
    }
    ST.decos.forEach((key,idx)=>{ const a=idx*1.3; const rr=0.35; const t=makeTopping(key);
      t.position.set(Math.cos(a)*rr, 0.5, Math.sin(a)*rr); t.scale.setScalar(0.8); treatGroup.add(t); });
    treatGroup.position.y=0.1;
  }
  else { /* ice cream */
    if (ST.base==='cone'){ const cone=meshOf(G.cone(0.5,1.1,20), mat('#D9A05B',{flat:true})); cone.position.y=0.55; cone.rotation.x=Math.PI; treatGroup.add(cone); }
    else { const cup=meshOf(G.cyl(0.55,0.42,0.7,20), mat('#F48FB1')); cup.position.y=0.35; treatGroup.add(cup); }
    let y=ST.base==='cone'?1.0:0.75;
    ST.scoops.forEach((s,i)=>{ const f=SCOOP_FLAVORS.find(x=>x.id===s)||SCOOP_FLAVORS[0];
      const scoop=meshOf(G.sph(0.5-i*0.03,16), mat(f.color,{flat:true})); scoop.position.y=y; treatGroup.add(scoop);
      if (ST.drizzle!=='none'&&ST.step>=1&&i===ST.scoops.length-1){ const dc=DRIZZLES.find(x=>x.id===ST.drizzle).color;
        const dz=meshOf(G.sph(0.5-i*0.03+0.03,16), mat(dc,{transparent:true,opacity:0.5,flat:true})); dz.position.y=y+0.06; dz.scale.y=0.5; treatGroup.add(dz); }
      y+=0.55-i*0.05; });
    ST.decos.forEach((key,idx)=>{ const t=makeTopping(key); const a=idx*1.6; t.position.set(Math.cos(a)*0.2, y-0.1, Math.sin(a)*0.2); t.scale.setScalar(0.8); treatGroup.add(t); });
    treatGroup.position.y=0;
  }
}

/* ---- studio UI ---- */
function renderStudio2(){
  if (!ST) return;
  $('stSteps').innerHTML=stepsFor().map((s,i)=>
    `<div class="st-step ${i===ST.step?'on':i<ST.step?'done':''}">${s}</div>`).join('');
  const B=$('stBody');
  const isCake=ST.item==='cake'||ST.item==='animalCake';
  const decIdx=ST.item==='iceCream'?1:2;

  if (isSimpleItem()){
    if (ST.step===0){
      const pow=ovenTapPower();
      B.innerHTML=`
        <div class="step-title">Baking time! 🔥</div>
        <div class="step-sub">Pop the ${ITEMS[ST.item].name.replace(/s$/,'').toLowerCase()} in — tap the oven!</div>
        <div id="bigOven" style="${S.stations.oven>=3?'background:linear-gradient(135deg,#FF6FA5,#FFD166,#6ECEB2);box-shadow:0 8px 0 #B93B60;':''}">
          <div id="bigOvenWin">${ITEMS[ST.item].ico}</div>
          <div id="bigOvenBar"><div id="bigOvenFill"></div></div>
        </div>
        <div class="tap-note">👆 Tap the oven!</div>`;
      let p=0; const ov=$('bigOven');
      ov.onclick=()=>{ p=Math.min(100,p+pow); $('bigOvenFill').style.width=p+'%';
        ov.classList.remove('shake'); void ov.offsetWidth; ov.classList.add('shake'); beep(400+p*3,.05);
        if (p>=100){ ov.onclick=null; ST.baked=true; bigChime(); setTimeout(nextStep,320); } };
      return;
    }
    B.innerHTML=`
      <div class="step-title">${ST.practice?'Ta-daaa! 🌟':'Serve it up! 🛎️'}</div>
      <div class="step-sub">${ST.practice?'Yummy practice bake!':'Walk it over — they can’t wait!'}</div>
      <button class="go-btn" id="goServe">${ST.practice?'Yay! Done 🎉':'Serve it! 🛎️'}</button>`;
    $('goServe').onclick=ST.practice?closePractice:serveNow;
    return;
  }

  if (ST.step===0 && isCake){
    B.innerHTML=`
      <div class="step-title">Build your cake! 🧁</div>
      <div class="step-sub">Pick tiers, tap a tier on the cake, then choose its flavor</div>
      <div class="tool-label">How many tiers?</div>
      <div class="tool-row" id="rowTiers">
        ${[1,2,3].map(n=>`<button class="tool-btn ${ST.tiers===n?'sel':''}" data-n="${n}">🎂<span class="tb-sub">${n} tier${n>1?'s':''}</span></button>`).join('')}
      </div>
      <div class="tool-label">Which tier to flavor?</div>
      <div class="tool-row" id="rowTierSel">
        ${Array.from({length:ST.tiers}).map((_,i)=>`<button class="tool-btn ${ST.selTier===i?'sel':''}" data-i="${i}">${i+1}<span class="tb-sub">tier</span></button>`).join('')}
      </div>
      <div class="tool-label">Flavor for tier ${ST.selTier+1}</div>
      <div class="tool-row" id="rowFlavor">
        ${CAKE_FLAVORS.map(f=>`<button class="tool-btn ${ST.flavors[ST.selTier]===f.id?'sel':''}" data-f="${f.id}">${f.ico}<span class="tb-sub">${f.name}</span></button>`).join('')}
      </div>
      <button class="go-btn" id="goNext">To the oven! 🔥</button>`;
    bind('#rowTiers','[data-n]','n', v=>{ ST.tiers=+v; ST.selTier=Math.min(ST.selTier,ST.tiers-1); rebuildTreat(); renderStudio2(); });
    bind('#rowTierSel','[data-i]','i', v=>{ ST.selTier=+v; renderStudio2(); });
    bind('#rowFlavor','[data-f]','f', v=>{ ST.flavors[ST.selTier]=v; rebuildTreat(); renderStudio2(); });
    $('goNext').onclick=nextStep;
    return;
  }
  if (ST.step===0 && ST.item==='cookie'){
    B.innerHTML=`
      <div class="step-title">Roll your cookie! 🍪</div>
      <div class="step-sub">Pick a shape and a dough</div>
      <div class="tool-label">Shape</div>
      <div class="tool-row" id="rowShape">
        ${COOKIE_SHAPES.map(s=>`<button class="tool-btn ${ST.shape===s.id?'sel':''}" data-s="${s.id}">${s.ico}<span class="tb-sub">${s.name}</span></button>`).join('')}
      </div>
      <div class="tool-label">Dough</div>
      <div class="tool-row" id="rowDough">
        ${COOKIE_DOUGHS.map(d=>`<button class="swatch ${ST.dough===d.id?'sel':''}" data-d="${d.id}" style="background:${d.color}"></button>`).join('')}
      </div>
      <button class="go-btn" id="goNext">To the oven! 🔥</button>`;
    bind('#rowShape','[data-s]','s', v=>{ ST.shape=v; rebuildTreat(); renderStudio2(); });
    bind('#rowDough','[data-d]','d', v=>{ ST.dough=v; rebuildTreat(); renderStudio2(); });
    $('goNext').onclick=nextStep;
    return;
  }
  if (ST.step===0 && ST.item==='iceCream'){
    B.innerHTML=`
      <div class="step-title">Scoop it up! 🍦</div>
      <div class="step-sub">Pick a cone or cup, then tap flavors to stack up to 3 scoops</div>
      <div class="tool-row" id="rowBase">
        <button class="tool-btn ${ST.base==='cone'?'sel':''}" data-b="cone">🍦<span class="tb-sub">Cone</span></button>
        <button class="tool-btn ${ST.base==='cup'?'sel':''}" data-b="cup">🥤<span class="tb-sub">Cup</span></button>
      </div>
      <div class="tool-label">Tap to add scoops! (${ST.scoops.length}/3)</div>
      <div class="tool-row" id="rowScoop">
        ${SCOOP_FLAVORS.map(f=>`<button class="swatch" data-f="${f.id}" style="background:${f.color}"></button>`).join('')}
        <button class="tool-btn" id="undoScoop">↩️<span class="tb-sub">Undo</span></button>
      </div>
      <button class="go-btn" id="goNext">Decorate! 🎨</button>`;
    bind('#rowBase','[data-b]','b', v=>{ ST.base=v; rebuildTreat(); renderStudio2(); });
    bind('#rowScoop','[data-f]','f', v=>{ if (ST.scoops.length>=3){toast('3 scoops max! 🍨');return;} ST.scoops.push(v); rebuildTreat(); renderStudio2(); });
    $('undoScoop').onclick=()=>{ ST.scoops.pop(); rebuildTreat(); renderStudio2(); beep(300,.06); };
    $('goNext').onclick=nextStep;
    return;
  }
  if (ST.step===1 && ST.item!=='iceCream'){
    const pow=ovenTapPower();
    B.innerHTML=`
      <div class="step-title">Baking time! 🔥</div>
      <div class="step-sub">${S.stations.oven>=3?'Rainbow Oven bakes SUPER fast!':S.stations.oven>=2?'Shiny Oven bakes fast!':'Tap tap tap the oven!'}</div>
      <div id="bigOven" style="${S.stations.oven>=3?'background:linear-gradient(135deg,#FF6FA5,#FFD166,#6ECEB2);box-shadow:0 8px 0 #B93B60;':''}">
        <div id="bigOvenWin">${isCake?'🎂':'🍪'}</div>
        <div id="bigOvenBar"><div id="bigOvenFill"></div></div>
      </div>
      <div class="tap-note">👆 Tap the oven!</div>`;
    let p=0; const ov=$('bigOven');
    ov.onclick=()=>{
      p=Math.min(100,p+pow); $('bigOvenFill').style.width=p+'%';
      ov.classList.remove('shake'); void ov.offsetWidth; ov.classList.add('shake');
      beep(400+p*3,.05);
      if (p>=100){ ov.onclick=null; ST.baked=true; bigChime(); setTimeout(nextStep,320); }
    };
    return;
  }
  if (ST.step===decIdx){
    const isCookie=ST.item==='cookie', isIce=ST.item==='iceCream';
    const party=ST.item==='animalCake';
    const lockBits=[];
    if (!drizzleAllowed()) lockBits.push('drizzle');
    if (!topperAllowed()&&!isCookie&&!isIce) lockBits.push('cake toppers');
    if (decoTier()<3) lockBits.push('more toppings');
    B.innerHTML=`
      <div class="step-title">Decorate it! 🎨</div>
      <div class="step-sub">${party?'Don’t forget the '+(ST.cust?ST.cust.order.animal.name:'animal')+' face! ':''}Tap the buttons — it updates live!</div>
      <div class="tool-label">${isIce?'Sauce':'Frosting'}${isCake?' (pick a tier first!)':''}</div>
      ${isCake?`<div class="tool-row" id="rowTierSel2">
        ${Array.from({length:ST.tiers}).map((_,i)=>`<button class="tool-btn ${ST.selTier===i?'sel':''}" data-i="${i}">${i+1}<span class="tb-sub">tier</span></button>`).join('')}
      </div>`:''}
      <div class="tool-row" id="rowFrost">
        ${allowedFrostings().map(f=>`<button class="swatch ${((isCake?ST.frosts[ST.selTier]:ST.icing)===f)?'sel':''}" data-c="${f}" style="background:${f}"></button>`).join('')}
      </div>
      ${drizzleAllowed()?`
      <div class="tool-label">Drizzle</div>
      <div class="tool-row" id="rowDrizzle">
        ${DRIZZLES.map(d=>`<button class="tool-btn ${ST.drizzle===d.id?'sel':''}" data-d="${d.id}">${d.id==='none'?'🚫':'〰️'}<span class="tb-sub">${d.name}</span></button>`).join('')}
      </div>`:''}
      <div class="tool-label">Toppings — tap to add! (${ST.decos.length})</div>
      <div class="tool-row" id="rowTop">
        ${(party&&ST.cust?[ST.cust.order.animal.ico]:[]).concat(allowedToppings()).map(t=>
          `<button class="tool-btn" data-t="${t}">${t}</button>`).join('')}
        <button class="tool-btn" id="undoTop">↩️<span class="tb-sub">Undo</span></button>
      </div>
      ${topperAllowed()&&!isCookie&&!isIce?`
      <div class="tool-label">Cake topper</div>
      <div class="tool-row" id="rowTopper">
        ${TOPPERS.map(t=>`<button class="tool-btn ${ST.topper===t.id?'sel':''}" data-tp="${t.id}">${t.ico}</button>`).join('')}
      </div>`:''}
      ${lockBits.length?`<div class="lock-note">🔒 Upgrade your Decorating Station to unlock ${lockBits.join(' + ')}!</div>`:''}
      <button class="go-btn" id="goNext">All done! 🛎️</button>`;
    if (isCake) bind('#rowTierSel2','[data-i]','i', v=>{ ST.selTier=+v; renderStudio2(); });
    bind('#rowFrost','[data-c]','c', v=>{ if (isCake) ST.frosts[ST.selTier]=v; else ST.icing=v; rebuildTreat(); renderStudio2(); });
    if (drizzleAllowed()) bind('#rowDrizzle','[data-d]','d', v=>{ ST.drizzle=v; rebuildTreat(); renderStudio2(); });
    bind('#rowTop','[data-t]','t', v=>{
      const isAnimal=ST.cust&&ST.cust.order.animal&&v===ST.cust.order.animal.ico;
      if (isAnimal){ ST.animalOn=true; bigChime(); toast('🎉 Perfect '+ST.cust.order.animal.name+' face!'); rebuildTreat(); return; }
      if (ST.decos.length>=16){ toast('So many toppings! 😋'); return; }
      ST.decos.push(v); rebuildTreat(); renderStudio2();
    });
    $('undoTop').onclick=()=>{ ST.decos.pop(); rebuildTreat(); renderStudio2(); beep(300,.06); };
    if (topperAllowed()&&!isCookie&&!isIce) bind('#rowTopper','[data-tp]','tp', v=>{ ST.topper=v; rebuildTreat(); renderStudio2(); });
    $('goNext').onclick=nextStep;
    return;
  }
  /* serve step */
  B.innerHTML=`
    <div class="step-title">${ST.practice?'Ta-daaa! 🌟':'Serve it up! 🛎️'}</div>
    <div class="step-sub">${ST.practice?'Beautiful practice bake!':'Walk it over — they can’t wait!'}</div>
    ${ST.practice
      ?`<button class="go-btn" id="goServe">Yay! Done 🎉</button>`
      :`<button class="go-btn" id="goServe">Serve it! 🛎️</button>`}
    <button class="go-btn alt" id="goBack">✏️ Keep decorating</button>`;
  $('goServe').onclick=ST.practice?closePractice:serveNow;
  $('goBack').onclick=()=>{ ST.step=ST.item==='iceCream'?1:2; rebuildTreat(); renderStudio2(); };
}
function bind(rowSel, itemSel, attr, fn){
  const row=document.querySelector(rowSel); if (!row) return;
  row.querySelectorAll(itemSel).forEach(b=>b.onclick=()=>{ chime(); fn(b.getAttribute('data-'+attr)); });
}
function nextStep(){
  if (!ST) return;
  if (ST.item==='iceCream'&&ST.step===0&&!ST.scoops.length){ toast('Add at least 1 scoop! 🍨'); return; }
  ST.step++; chime(); rebuildTreat(); renderStudio2();
}
function closePractice(){ closeStudio(); confetti(16); bigChime(); }
function serveNow(){
  const c=ST.cust;
  if (!c||!customers.includes(c)){ toast('Oh no, they left! 🥲'); closeStudio(); return; }
  const o=c.order;
  if (o.item==='animalCake'&&!ST.animalOn){ toast('🦁 Add the animal face! Tap the animal button!'); ST.step=2; renderStudio2(); return; }
  let amt=S.prices[o.item]!=null?S.prices[o.item]:ITEMS[o.item].base, msg='😍 "Yummy! Thank you!"';
  let match=true;
  if (o.item==='cake'||o.item==='animalCake'){
    if (!ST.flavors.slice(0,ST.tiers).includes(o.want.flavor)||ST.tiers!==o.want.tiers) match=false;
  }
  if (o.item==='cookie'&&ST.shape!==o.want.shape) match=false;
  if (o.item==='iceCream'&&ST.scoops.length!==o.want.scoops) match=false;
  if (!match){ amt=Math.max(2,Math.floor(amt/2)); msg='🙂 "Hmm, not what I asked for… but tasty!"'; }
  let bonus=Math.min(ST.decos.length,8);
  if (ST.drizzle!=='none') bonus+=2;
  if (ST.topper!=='none') bonus+=2;
  if (o.item==='animalCake') bonus+=10;
  amt+=bonus;
  const party=o.item==='animalCake';
  closeStudio();
  if (c.state==='queue'||c.state==='toQueue') takeOrder(c);
  const idleW=staffWalkers.find(w=>w.role==='waitress'&&!deliveries.some(d=>d.w===w));
  const deliverer=idleW||elise;
  const dp=STATION_POS.deco; walkTo(deliverer,dp.x,dp.y+1);
  const ico=ITEMS[o.item].ico;
  deliveries.push({custId:c.id,w:deliverer,amt,item:o.item,ico,phase:'pickup',msg:(party?'🎂 BEST BIRTHDAY EVER!':msg)+'<br>🪙 +'+amt});
  confetti(party?22:10); bigChime();
}

/* =========================================================
   PRACTICE PICKER
========================================================= */
$('practiceBtn').onclick=()=>{
  $('pickerRow').innerHTML=S.unlockedItems.map(k=>{
    const label=k==='animalCake'?'Animal Cake':ITEMS[k].name;
    return `<button class="tool-btn" style="width:100%;height:70px" data-k="${k==='animalCake'?'cake':k}">${ITEMS[k].ico}<span class="tb-sub">${label}</span></button>`;
  }).join('');
  $('pickerRow').querySelectorAll('[data-k]').forEach(b=>b.onclick=()=>openPractice(b.dataset.k));
  $('picker').classList.add('show');
};
$('picker').addEventListener('pointerdown',ev=>{ if (ev.target===$('picker')) $('picker').classList.remove('show'); });

/* =========================================================
   SHOP
========================================================= */
function cardHTML(ico,name,sub,btn){ return `<div class="card"><div class="big">${ico}</div><div class="name">${name}</div><div class="sub">${sub}</div>${btn}</div>`; }
function buyBtn(cost,owned,lockStar,act,ownedTxt){
  if (owned) return `<button class="buy-btn owned" disabled>${ownedTxt||'✔ Got it!'}</button>`;
  if (lockStar) return `<button class="buy-btn" disabled>🔒 ⭐${lockStar}</button>`;
  return `<button class="buy-btn" data-act="${act}" ${S.coins>=cost?'':'disabled'}>🪙 ${cost}</button>`;
}
function renderShop(){
  const s=stars();
  $('shopTreats').innerHTML=Object.entries(ITEMS).filter(([k,v])=>!v.always).map(([k,v])=>
    cardHTML(v.ico,v.name,v.party?'Birthday parties! 🎈':'New on the menu!',
      buyBtn(v.cost,S.unlockedItems.includes(k),v.star>s?v.star:0,'item:'+k))).join('');
  $('shopFurn').innerHTML=Object.entries(FURN).map(([k,v])=>{
    const count=(S.inventory[k]||0)+S.placed.filter(p=>p.type===k).length;
    return cardHTML(v.ico,v.name,v.desc+(count?` (×${count})`:''),
      buyBtn(v.cost,false,v.star>s?v.star:0,'furn:'+k));
  }).join('');
  $('shopUpgrades').innerHTML=Object.entries(UPGRADES).map(([k,v])=>
    cardHTML(v.ico,v.name,v.desc,
      buyBtn(v.cost,S.upgrades.includes(k),v.star>s?v.star:0,'upg:'+k))).join('');
  $('shopStaff').innerHTML=Object.entries(STAFF).map(([k,v])=>
    cardHTML(v.ico,v.name,v.desc,
      buyBtn(v.cost,S.staff.includes(k),v.star>s?v.star:0,'staff:'+k))).join('');
  $('shopCostumes').innerHTML=COSTUMES.map(c=>{
    const owned=S.costumes.includes(c.id), wearing=S.costume===c.id;
    let btn;
    if (wearing) btn=`<button class="buy-btn owned" disabled>Wearing! 💃</button>`;
    else if (owned) btn=`<button class="buy-btn" data-act="wear:${c.id}">Wear it!</button>`;
    else btn=buyBtn(c.cost,false,0,'cos:'+c.id);
    return cardHTML(c.ico,c.name,'',btn);
  }).join('');
  document.querySelectorAll('#scr-shop [data-act]').forEach(b=>b.onclick=()=>shopAct(b.dataset.act));
}
function shopAct(a){
  const [kind,id]=a.split(':');
  if (kind==='item'){ const v=ITEMS[id]; if (S.coins<v.cost) return;
    S.coins-=v.cost; S.unlockedItems.push(id); if (S.prices[id]==null) S.prices[id]=v.base;
    addStarPts(15); save(); renderAll(); try{ if(renderer) buildMenuBoard(); }catch(e){}
    confetti(); bigChime(); toast(v.ico+' '+v.name+' added to your menu!'); checkObjectives(); }
  else if (kind==='furn'){ const v=FURN[id]; if (S.coins<v.cost) return;
    S.coins-=v.cost; S.inventory[id]=(S.inventory[id]||0)+1; addStarPts(8); save(); renderAll(); bigChime();
    toast(v.ico+' Bought! Tap 🔨 in your bakery to place it!'); buildSel=id; }
  else if (kind==='upg'){ const v=UPGRADES[id]; if (S.coins<v.cost) return;
    S.coins-=v.cost; S.upgrades.push(id); addStarPts(15); save();
    if (id==='expand'){ gridSetup(); rebuildWorld(); frameCamera(); toast('🏗️ Your bakery is BIGGER now!'); }
    else { buildRoom(); toast(v.ico+' '+v.name+' — gorgeous!'); }
    renderAll(); confetti(20); bigChime(); checkObjectives(); }
  else if (kind==='staff'){ const v=STAFF[id]; if (S.coins<v.cost) return;
    S.coins-=v.cost; S.staff.push(id); syncStaff(); addStarPts(15); save(); renderAll(); confetti(); bigChime();
    toast(v.ico+' '+v.name+' joined your team!'); checkObjectives(); }
  else if (kind==='cos'){ const c=COSTUMES.find(x=>x.id===id); if (S.coins<c.cost) return;
    S.coins-=c.cost; S.costumes.push(id); S.costume=id; rebuildElise(); save(); renderAll(); confetti(); bigChime();
    toast(c.ico+' New costume: '+c.name+'!'); }
  else if (kind==='wear'){ S.costume=id; rebuildElise(); save(); renderAll(); chime(); }
}

/* =========================================================
   MY SHOP
========================================================= */
/* render a treat's 3D model to a small PNG for the menu board (cached) */
let thumbR=null, thumbS=null, thumbC=null;
const thumbCache={};
function renderTreatThumb(item, cb){
  if (thumbCache[item]){ cb(thumbCache[item]); return; }
  const url=ITEM_MODEL[item];
  if (!url){ cb(null); return; }
  try{
    if (!thumbR){
      thumbR=new THREE.WebGLRenderer({antialias:true, alpha:true, preserveDrawingBuffer:true});
      thumbR.setPixelRatio(2); thumbR.setSize(128,128);
      thumbS=new THREE.Scene();
      thumbS.add(new THREE.HemisphereLight(0xffffff,0xFFE6D0,1.3));
      const d=new THREE.DirectionalLight(0xffffff,1.15); d.position.set(2,4,3); thumbS.add(d);
      thumbC=new THREE.PerspectiveCamera(32,1,0.1,20);
      thumbC.position.set(1.5,1.4,1.95); thumbC.lookAt(0,0.42,0);
    }
    loadModelTemplate(resolveAssetUrl('assets/models/'+url)).then(tpl=>{
      const g=new THREE.Group(); const inst=tpl.clone(true);
      fitAndGround(inst,{fitH:0.95}); g.add(inst); thumbS.add(g);
      thumbR.render(thumbS,thumbC);
      let data=null; try{ data=thumbR.domElement.toDataURL('image/png'); }catch(e){}
      thumbS.remove(g); disposeGroup(g);
      if (data) thumbCache[item]=data;
      cb(data);
    }).catch(()=>cb(null));
  }catch(e){ cb(null); }
}
function renderMy(){
  $('nameInput').value=S.shopName;
  $('logoEmojis').innerHTML=LOGO_EMOJIS.map(e=>
    `<div class="logo-opt ${S.logo.emoji===e?'sel':''}" data-e="${e}">${e}</div>`).join('');
  $('logoColors').innerHTML=LOGO_COLORS.map(c=>
    `<div class="color-dot ${S.logo.color===c?'sel':''}" style="background:${c}" data-lc="${c}"></div>`).join('');
  $('wallThemes').innerHTML=WALL_THEMES.map(w=>
    `<div class="theme-swatch ${S.wallTheme===w.id?'sel':''}" data-wall="${w.id}" style="background:linear-gradient(135deg,${w.right},${w.left})">${w.name}</div>`).join('');
  $('floorThemes').innerHTML=FLOOR_THEMES.map(f=>
    `<div class="theme-swatch ${S.floorTheme===f.id?'sel':''}" data-floor="${f.id}" style="background:repeating-linear-gradient(45deg,${f.a} 0 8px,${f.b} 8px 16px);color:#5C3A21;text-shadow:none">${f.name}</div>`).join('');
  const dotRow=(arr,sel,attr)=>arr.map(col=>col==null
    ? `<div class="color-dot none ${sel==null?'sel':''}" data-${attr}="none">🚫</div>`
    : `<div class="color-dot ${sel===col?'sel':''}" style="background:${col}" data-${attr}="${col}"></div>`).join('');
  $('eliseSkin').innerHTML=dotRow(SKINS, S.elise.skin, 'skin');
  $('eliseHair').innerHTML=dotRow(HAIRS, S.elise.hair, 'hair');
  $('eliseOutfit').innerHTML=dotRow(OUTFITS, S.elise.color, 'outfit');
  $('tableColors').innerHTML=dotRow(TABLECLOTHS, S.tableColor, 'tcloth');
  $('priceList').innerHTML=`<div class="menu-head">🍰 ${S.shopName} 🍰</div>`+S.unlockedItems.map(k=>{
    const v=ITEMS[k], p=S.prices[k]!=null?S.prices[k]:v.base;
    const mood=p>v.base*2?'😤':p>v.base*1.4?'😐':'😍';
    return `<div class="menu-item">
      <div class="menu-thumb" id="thumb-${k}">${v.ico}</div>
      <div class="menu-name">${v.name}<span class="mn-base">usually 🪙${v.base}</span></div>
      <div class="stepper">
        <button data-price="${k}:-1">−</button>
        <div class="val">🪙${p}</div>
        <button data-price="${k}:1">+</button>
      </div>
      <div class="p-mood">${mood}</div>
    </div>`;
  }).join('');
  /* swap in real 3D treat thumbnails as they render */
  S.unlockedItems.forEach(k=>renderTreatThumb(k, data=>{
    const el=$('thumb-'+k); if (el && data) el.innerHTML=`<img src="${data}" alt="${ITEMS[k].name}">`;
  }));
  const nxt=stars()<5?` (next at ${STAR_PTS[stars()]} — you have ${S.starPts})`:' (MAX!)';
  $('statsPanel').innerHTML=`
    <div style="font-weight:800;line-height:2">
      🧁 Treats served: <b>${S.served}</b><br>
      🪙 Coins earned: <b>${S.earned}</b><br>
      🎂 Birthday parties: <b>${S.parties}</b><br>
      ⭐ Stars: <b>${stars()}</b>${nxt}
    </div>`;
  $('logoEmojis').querySelectorAll('[data-e]').forEach(b=>b.onclick=()=>{ S.logo.emoji=b.dataset.e; save(); renderTop(); renderMy(); buildRoom(); chime(); });
  $('logoColors').querySelectorAll('[data-lc]').forEach(b=>b.onclick=()=>{ S.logo.color=b.dataset.lc; save(); renderTop(); renderMy(); chime(); });
  $('wallThemes').querySelectorAll('[data-wall]').forEach(b=>b.onclick=()=>{ S.wallTheme=b.dataset.wall; save(); buildRoom(); renderMy(); chime(); });
  $('floorThemes').querySelectorAll('[data-floor]').forEach(b=>b.onclick=()=>{ S.floorTheme=b.dataset.floor; save(); buildRoom(); renderMy(); chime(); });
  $('eliseSkin').querySelectorAll('[data-skin]').forEach(b=>b.onclick=()=>{ S.elise.skin=b.dataset.skin; rebuildElise(); save(); renderMy(); chime(); });
  $('eliseHair').querySelectorAll('[data-hair]').forEach(b=>b.onclick=()=>{ S.elise.hair=b.dataset.hair; rebuildElise(); save(); renderMy(); chime(); });
  $('eliseOutfit').querySelectorAll('[data-outfit]').forEach(b=>b.onclick=()=>{ S.elise.color=b.dataset.outfit; rebuildElise(); save(); renderMy(); chime(); });
  $('tableColors').querySelectorAll('[data-tcloth]').forEach(b=>b.onclick=()=>{ S.tableColor=b.dataset.tcloth==='none'?null:b.dataset.tcloth; save(); try{ if(renderer) buildTables(); }catch(e){} renderMy(); chime(); });
  $('priceList').querySelectorAll('[data-price]').forEach(b=>b.onclick=()=>{ const [k,d]=b.dataset.price.split(':'); const cur=S.prices[k]!=null?S.prices[k]:ITEMS[k].base; S.prices[k]=Math.max(1,Math.min(99,cur+(+d))); save(); renderMy(); try{ if(renderer) buildMenuBoard(); }catch(e){} beep(500,.05); });
}
$('nameInput').addEventListener('input',e=>{ S.shopName=e.target.value||"Elise’s Bakery"; save(); renderTop(); buildRoom(); });
$('resetBtn').onclick=function(){
  if (confirm('Really start the whole bakery over?')){
    store.del('eliseBakery3D'); S=DEFAULT();
    customers.forEach(removeObj); customers=[]; deliveries=[]; buildSel=null;
    gridSetup(); rebuildWorld(); syncStaff(); rebuildElise(); frameCamera();
    save(); renderAll(); checkObjectives(); toast('✨ Fresh new bakery!');
  }
};

/* =========================================================
   RENDER / TABS / INIT
========================================================= */
function renderTop(){
  $('coinCount').textContent=S.coins;
  $('shopNameTop').textContent=S.shopName;
  $('starPill').textContent='⭐ '+stars();
  const lg=$('shopLogo'); lg.textContent=S.logo.emoji; lg.style.background=S.logo.color;
}
function renderAll(){ renderTop(); renderShop(); renderMy(); renderTray(); }
/* the display-counter divider separating the baking area from the restaurant */
let dividerGroup=null;
function halfWall(tint){
  /* a low partition panel that sits on top of the counter (serving-window look) */
  const g=new THREE.Group();
  loadModelTemplate(resolveAssetUrl(M+'wall.glb')).then(tpl=>{
    const w=tpl.clone(true);
    const box=new THREE.Box3().setFromObject(w); const c=new THREE.Vector3(); box.getCenter(c);
    w.position.x-=c.x; w.position.z-=c.z; w.position.y-=box.min.y;
    if (tint) w.traverse(o=>{ if (o.isMesh&&o.material){ o.material=o.material.clone(); o.material.color=new THREE.Color(tint); } });
    const pivot=new THREE.Group(); pivot.add(w);
    pivot.scale.set(1,0.55,1); pivot.position.set(0,0.95,-0.06);   /* on the counter, toward kitchen */
    g.add(pivot);
  }).catch(()=>{});
  return g;
}
function buildDivider(){
  if (dividerGroup){ scene.remove(dividerGroup); disposeGroup(dividerGroup); }
  dividerGroup=new THREE.Group(); scene.add(dividerGroup);
  const wt=WALL_THEMES.find(w=>w.id===S.wallTheme)||WALL_THEMES[0];
  const treats=['cupcake.glb','donut-sprinkles.glb','croissant.glb','muffin.glb','cookie-chocolate.glb','donut-chocolate.glb'];
  let ti=0;
  for (let x=0;x<GX;x++){
    if (DIVIDER_GAPS.includes(x)) continue;
    if (stationAt(x,DIV_Y)) continue;                 /* register / display render separately */
    const showTreats = x%2===0;
    const props = showTreats ? [{glb:M+treats[ti++%treats.length], fitH:0.32, y:0.98}] : undefined;
    const g=buildFromCatalog({glb:M+'kitchenBar.glb', fitH:0.95, rotY:0, tint:'#FFFBF3', props}, ()=>new THREE.Group());
    const p=W(x,DIV_Y); g.position.set(p.x,0,p.z); dividerGroup.add(g);
    /* partition panel on the plain counters -> encloses the kitchen a bit,
       leaving the treat-topped counters as open display windows */
    if (!showTreats){ const hw=halfWall(wt.left); hw.position.set(p.x,0,p.z); dividerGroup.add(hw); }
  }
}
let kitchenGroup=null;
function buildKitchen(){
  if (kitchenGroup){ scene.remove(kitchenGroup); disposeGroup(kitchenGroup); }
  kitchenGroup=new THREE.Group(); scene.add(kitchenGroup);
  const place=(entry,gx,gy,extraY)=>{
    const g=buildFromCatalog(entry, ()=>new THREE.Group());
    const p=W(gx,gy); g.position.set(p.x,(extraY||0),p.z); kitchenGroup.add(g);
  };
  const K=CATALOG.kitchen;
  /* range hood floating above the oven */
  place(K.hood, STATION_POS.oven.x, STATION_POS.oven.y, 1.5);
  /* a run of counters + sink + fridge along the back wall (behind the stations) */
  place(K.fridge, GX-2, 1);
  for (let x=5;x<=GX-3;x++){
    place(x===6?K.sink:K.counter, x, 0);
  }
  /* a mixer on one of the back counters */
  place({glb:M+'kitchenBlender.glb', fitH:0.4, rotY:Math.PI, yOffset:0.95}, 7, 0);
}
/* ---- in-world hanging menu board ---- */
function rr(c,x,y,w,h,r){ c.beginPath(); c.moveTo(x+r,y); c.arcTo(x+w,y,x+w,y+h,r); c.arcTo(x+w,y+h,x,y+h,r); c.arcTo(x,y+h,x,y,r); c.arcTo(x,y,x+w,y,r); c.closePath(); }
function menuBoardTexture(){
  const items=S.unlockedItems, Wd=460, pad=26, titleH=96, rowH=70;
  const Hd=titleH+pad+items.length*rowH+pad;
  const cvs=document.createElement('canvas'); cvs.width=Wd; cvs.height=Hd;
  const c=cvs.getContext('2d');
  c.fillStyle='#FFFDF8'; rr(c,6,6,Wd-12,Hd-12,30); c.fill();
  c.lineWidth=10; c.strokeStyle='#FF6FA5'; rr(c,12,12,Wd-24,Hd-24,26); c.stroke();
  c.textAlign='center'; c.textBaseline='middle'; c.fillStyle='#B93B60';
  c.font="800 48px 'Baloo 2','Nunito',sans-serif"; c.fillText('📋 Menu', Wd/2, titleH/2+14);
  items.forEach((k,i)=>{
    const v=ITEMS[k], p=S.prices[k]!=null?S.prices[k]:v.base, y=titleH+pad+i*rowH+rowH/2;
    c.textAlign='left'; c.textBaseline='middle';
    c.font="42px 'Segoe UI Emoji','Apple Color Emoji','Noto Color Emoji',sans-serif"; c.fillText(v.ico, pad+8, y);
    c.fillStyle='#5C3A21'; c.font="700 32px 'Baloo 2','Nunito',sans-serif"; c.fillText(v.name, pad+70, y);
    c.textAlign='right'; c.fillStyle='#E84E8A'; c.font="800 34px 'Baloo 2','Nunito',sans-serif"; c.fillText('🪙'+p, Wd-pad-8, y);
    if (i<items.length-1){ c.strokeStyle='#EAD3BC'; c.setLineDash([2,7]); c.lineWidth=2;
      c.beginPath(); c.moveTo(pad+8,y+rowH/2); c.lineTo(Wd-pad-8,y+rowH/2); c.stroke(); c.setLineDash([]); }
  });
  const tex=new THREE.CanvasTexture(cvs); tex.colorSpace=THREE.SRGBColorSpace; tex.anisotropy=4;
  return {tex, aspect:Wd/Hd};
}
let menuBoardGroup=null;
function buildMenuBoard(){
  if (menuBoardGroup){ scene.remove(menuBoardGroup); disposeGroup(menuBoardGroup); }
  menuBoardGroup=new THREE.Group(); scene.add(menuBoardGroup);
  const {tex,aspect}=menuBoardTexture();
  const h=1.6, w=h*aspect;
  const grp=new THREE.Group();
  const back=meshOf(G.box(w+0.14,h+0.14,0.08), mat('#8A5A44')); back.position.z=-0.05; grp.add(back);
  const board=new THREE.Mesh(new THREE.PlaneGeometry(w,h), new THREE.MeshBasicMaterial({map:tex, transparent:true}));
  board.position.z=0.001; grp.add(board);
  [-w*0.36,w*0.36].forEach(x=>{ const rod=meshOf(G.cyl(0.018,0.018,0.32,6), mat('#C9A24B'),false); rod.position.set(x,h/2+0.16,0); grp.add(rod); });
  const p=W(Math.floor(GX/2), DIV_Y);
  grp.position.set(0, 2.15, p.z-0.15);
  menuBoardGroup.add(grp);
}
/* ---- steam / warmth particles ---- */
let PUFF=null, steamGroup=null, steamParts=[];
function puffTexture(){
  const cvs=document.createElement('canvas'); cvs.width=cvs.height=64; const c=cvs.getContext('2d');
  const g=c.createRadialGradient(32,32,1,32,32,31); g.addColorStop(0,'rgba(255,255,255,.95)'); g.addColorStop(1,'rgba(255,255,255,0)');
  c.fillStyle=g; c.fillRect(0,0,64,64);
  return new THREE.CanvasTexture(cvs);
}
function buildSteam(){
  if (steamGroup){ scene.remove(steamGroup); steamParts.forEach(s=>s.material.dispose()); }
  steamGroup=new THREE.Group(); scene.add(steamGroup); steamParts=[];
  if (!PUFF) PUFF=puffTexture();
  const emitters=[{p:W(STATION_POS.oven.x,STATION_POS.oven.y), y:1.5, n:5}];
  S.placed.filter(p=>p.type==='coffee').forEach(p=>emitters.push({p:W(p.x,p.y), y:0.9, n:3}));
  emitters.forEach(e=>{
    for (let i=0;i<e.n;i++){
      const spr=new THREE.Sprite(new THREE.SpriteMaterial({map:PUFF, transparent:true, opacity:0, depthWrite:false}));
      spr.userData={x:e.p.x, y0:e.y, z:e.p.z, t:Math.random()}; spr.position.set(e.p.x,e.y,e.p.z);
      steamGroup.add(spr); steamParts.push(spr);
    }
  });
}
function updateSteam(dt){
  for (let i=0;i<steamParts.length;i++){ const spr=steamParts[i], u=spr.userData;
    u.t+=dt*0.35; if (u.t>1) u.t-=1; const l=u.t;
    spr.position.set(u.x+Math.sin(l*5+u.x)*0.13, u.y0+l*1.0, u.z);
    spr.material.opacity=Math.sin(l*Math.PI)*0.45; spr.scale.setScalar(0.22+l*0.42);
  }
}
function rebuildWorld(){ buildRoom(); buildStations(); buildKitchen(); buildTables(); buildDivider(); buildMenuBoard(); buildSteam(); syncFurniture(); }
document.querySelectorAll('.tab').forEach(t=>{
  t.addEventListener('click',()=>{
    document.querySelectorAll('.tab').forEach(x=>x.classList.remove('active'));
    document.querySelectorAll('.screen').forEach(x=>x.classList.remove('active'));
    t.classList.add('active'); $(t.dataset.scr).classList.add('active');
    if (t.dataset.scr==='scr-world'){ resize(); }
    beep(700,.05);
  });
});

function setupAppShell(){
  /* mute toggle */
  const mb=$('muteBtn'); if (mb){ mb.textContent=muted?'🔇':'🔊'; mb.onclick=()=>{ setMuted(!muted); if(!muted) audioEnsure(); }; }
  /* start audio on first user gesture (autoplay policies) */
  const kick=()=>{ audioEnsure(); window.removeEventListener('pointerdown',kick); window.removeEventListener('touchstart',kick); };
  window.addEventListener('pointerdown',kick,{once:false});
  window.addEventListener('touchstart',kick,{once:false});
  /* PWA service worker */
  if ('serviceWorker' in navigator){
    window.addEventListener('load',()=>{ navigator.serviceWorker.register('sw.js').catch(()=>{}); });
  }
}
function boot(){
  try{
    initThree();
    gridSetup();
    rebuildWorld();
    syncStaff();
    ensureObj(elise); walkTo(elise,5,5);
    frameCamera();
    renderAll();
    checkObjectives();
    setupAppShell();
    $('loading').style.display='none';
    setInterval(logicTick,1000);
    requestAnimationFrame(frame);
  }catch(err){
    console.error(err);
    $('loadErr').style.display='block';
    $('loadErr').textContent='Could not start 3D. Please check your internet connection and refresh. ('+(err&&err.message||err)+')';
  }
}
boot();
