#!/usr/bin/env bash
set -euo pipefail

# ============================================================
# CRAudioVizAI — MASS GAME FACTORY
# Generates COUNT new games instantly using reusable engines.
# Default COUNT=200 (override: COUNT=1000 bash game_factory.sh)
# Creates: components/games/EnginesV2.jsx and /app/<slug>/page.jsx
# ============================================================

COUNT="${COUNT:-200}"           # change to 1000 for a thousand games
PREFIX="${PREFIX:-challenge}"   # route prefix; e.g., /challenge-001
ROOT="$(pwd)"

mkdir -p components/games lib app content/games

# --- shared (safe to overwrite) ---
cat > components/games/AdSlot.jsx <<'EOF'
'use client';
import React from 'react';
export default function AdSlot({ id='default', className='' }) {
  return (
    <div aria-label={`Ad slot ${id}`} className={`border rounded-md p-4 text-sm opacity-80 ${className}`}>
      <div className="font-semibold">Sponsored</div>
      <div>Replace with your ad network tag or house promo.</div>
    </div>
  );
}
EOF

cat > components/games/UpsellSidebar.jsx <<'EOF'
'use client';
import React from 'react';
import Link from 'next/link';
export default function UpsellSidebar({ className='' }) {
  const items = [
    { title: 'Javari AI — Pro', href: '/pricing#pro' },
    { title: 'Javariverse — Early Access', href: '/javariverse' },
    { title: 'Courses & Ebooks', href: '/ebooks' },
    { title: 'Newsletter (Free)', href: '/rss' },
  ];
  return (
    <aside className={`space-y-3 ${className}`}>
      <h3 className="text-lg font-semibold">Power ups</h3>
      <ul className="space-y-2">
        {items.map((x) => (
          <li key={x.title}>
            <Link href={x.href} className="underline">{x.title}</Link>
          </li>
        ))}
      </ul>
    </aside>
  );
}
EOF

cat > components/games/PaywallGate.jsx <<'EOF'
'use client';
import React from 'react';
export default function PaywallGate({ featureId, children }) {
  const [unlocked, setUnlocked] = React.useState(false);
  React.useEffect(() => {
    const key = `entitlement:${featureId}`;
    setUnlocked(typeof window !== 'undefined' && localStorage.getItem(key) === '1');
  }, [featureId]);
  if (unlocked) return children;
  return (
    <div className="border rounded-lg p-4">
      <div className="font-semibold mb-2">Premium Mode</div>
      <p className="mb-3">Unlock harder modes, global leaderboards, and events.</p>
      <button
        onClick={() => { localStorage.setItem(`entitlement:${featureId}`, '1'); location.reload(); }}
        className="px-3 py-2 rounded-md border"
      >Simulate Purchase (Dev)</button>
    </div>
  );
}
EOF

cat > components/games/Leaderboard.jsx <<'EOF'
'use client';
import React from 'react';

export default function Leaderboard({ gameId }) {
  const [scores, setScores] = React.useState([]);
  React.useEffect(() => {
    const key = `scores:${gameId}`;
    const raw = typeof window !== 'undefined' && localStorage.getItem(key);
    setScores(raw ? JSON.parse(raw) : []);
  }, [gameId]);
  return (
    <div className="border rounded-md p-3">
      <div className="font-semibold mb-2">Leaderboard (local)</div>
      <ol className="list-decimal pl-6 space-y-1">
        {scores.slice(0,10).map((s, i) => (<li key={i}>{s.name} — {s.score}</li>))}
        {scores.length===0 && <li>No scores yet.</li>}
      </ol>
    </div>
  );
}

export function saveScore(gameId, name, score) {
  const key = `scores:${gameId}`;
  const raw = typeof window !== 'undefined' && localStorage.getItem(key);
  const scores = raw ? JSON.parse(raw) : [];
  scores.push({ name, score, ts: Date.now() });
  scores.sort((a,b) => b.score - a.score);
  localStorage.setItem(key, JSON.stringify(scores));
}
EOF

cat > lib/games-utils.js <<'EOF'
export function randInt(min, max){ return Math.floor(Math.random()*(max-min+1))+min; }
export function shuffle(arr){ return arr.map(v=>[Math.random(), v]).sort((a,b)=>a[0]-b[0]).map(x=>x[1]); }
EOF

# --- Engines V2 (reusable gameplay cores) ---
cat > components/games/EnginesV2.jsx <<'EOF'
'use client';
import React from 'react';
import { randInt, shuffle } from '@/lib/games-utils';
import { saveScore } from './Leaderboard';

/**
 * Engines:
 *  - reflex      : timing tap vs moving window (zones/lives)
 *  - anagram     : unscramble words under time pressure
 *  - stacker     : stop a sliding block stack, precision matters
 *  - pathfind    : build a path in limited moves (lite)
 *  - tileslide   : 3x3/4x4 sliding puzzle (lite)
 *  - memory      : 2x4/3x4 memory pairs
 */

export default function Engine({ type, gameId, title }) {
  switch (type) {
    case 'reflex':    return <Reflex gameId={gameId} title={title} />;
    case 'anagram':   return <Anagram gameId={gameId} title={title} />;
    case 'stacker':   return <Stacker gameId={gameId} title={title} />;
    case 'pathfind':  return <Pathfind gameId={gameId} title={title} />;
    case 'tileslide': return <TileSlide gameId={gameId} title={title} />;
    case 'memory':    return <Memory gameId={gameId} title={title} />;
    default:          return <Reflex gameId={gameId} title={title} />;
  }
}

/* ---------- Reflex ---------- */
function Reflex({ gameId, title }) {
  const [zone,setZone]=React.useState(1);
  const [target,setTarget]=React.useState(0);
  const [pos,setPos]=React.useState(0);
  const [score,setScore]=React.useState(0);
  const [lives,setLives]=React.useState(3);
  const [running,setRunning]=React.useState(false);
  const speed = Math.max(200, 900 - zone*90);

  React.useEffect(()=>{ if(!running) return;
    const tick=setInterval(()=>setPos(p=>(p+10)%100), speed/10);
    return ()=>clearInterval(tick);
  },[running,speed]);

  function start(){ setRunning(true); setTarget(Math.floor(Math.random()*100)); }
  function tap(){
    const diff=Math.abs(pos-target);
    if(diff<=5){ const ns=score+10; setScore(ns); setTarget(Math.floor(Math.random()*100)); if(ns%50===0) setZone(z=>z+1); }
    else { setLives(l=>l-1); if(lives-1<=0){ setRunning(false); const name=prompt('Game over! Name?')||'Player'; saveScore(gameId,name,score); } }
  }

  return (
    <div className="space-y-3">
      <div className="text-xl font-semibold">{title}</div>
      <div>Zone: {zone} • Score: {score} • Lives: {lives}</div>
      <div className="h-6 bg-gray-200 rounded relative overflow-hidden">
        <div className="absolute inset-y-0" style={{left:`${target}%`,width:'6%',background:'rgba(34,197,94,0.45)'}}/>
        <div className="absolute inset-y-0" style={{left:`${pos}%`,width:'3%',background:'rgba(59,130,246,0.75)'}}/>
      </div>
      {!running && <button onClick={start} className="border rounded px-3 py-2">Start</button>}
      {running && <button onClick={tap} className="border rounded px-3 py-2">Tap</button>}
    </div>
  );
}

/* ---------- Anagram ---------- */
function Anagram({ gameId, title }) {
  const WORDS=['vector','planet','signal','cipher','bridge','magnet','matrix','rocket','jungle','galaxy','neutron','plasma','cobalt','quantum','kernel'];
  const [time,setTime]=React.useState(60), [score,setScore]=React.useState(0);
  const [word,setWord]=React.useState(''), [scr,setScr]=React.useState(''), [ans,setAns]=React.useState('');
  React.useEffect(()=>{ next(); const t=setInterval(()=>setTime(t=>t>0?t-1:0),1000); return ()=>clearInterval(t)},[]);
  React.useEffect(()=>{ if(time===0){ const name=prompt('Time! Name?')||'Player'; saveScore(gameId,name,score);}},[time]);
  function next(){ const w=WORDS[randInt(0,WORDS.length-1)]; setWord(w); setScr(shuffle(w.split('')).join('')); setAns(''); }
  function submit(e){ e.preventDefault(); if(ans.toLowerCase()===word){ setScore(s=>s+10); next(); } else { setScore(s=>Math.max(0,s-5)); setAns(''); } }
  return (
    <div className="space-y-3">
      <div className="text-xl font-semibold">{title}</div>
      <div>Time: {time} • Score: {score}</div>
      <div className="text-3xl">{scr}</div>
      <form onSubmit={submit} className="flex gap-2">
        <input className="border rounded px-3 py-2" value={ans} onChange={e=>setAns(e.target.value)} placeholder="Unscramble…" />
        <button className="border rounded px-3 py-2">Submit</button>
      </form>
    </div>
  );
}

/* ---------- Stacker ---------- */
function Stacker({ gameId, title }) {
  const [level,setLevel]=React.useState(1), [width,setWidth]=React.useState(60);
  const [x,setX]=React.useState(0), [dir,setDir]=React.useState(1);
  const [running,setRunning]=React.useState(false), [score,setScore]=React.useState(0);

  React.useEffect(()=>{ if(!running) return;
    const id=setInterval(()=>setX(v=>{ let nx=v+dir*5; if(nx<0||nx>100-width){ setDir(d=>-d); nx=Math.max(0, Math.min(100-width, nx)); } return nx; }), 50);
    return ()=>clearInterval(id);
  },[running,width,dir]);

  function start(){ setLevel(1); setWidth(60); setX(0); setDir(1); setScore(0); setRunning(true); }
  function stop(){
    const center = 50 - width/2;
    const overlap = Math.max(0, Math.min(x+width, 80) - Math.min(x, 20));
    if(overlap<=0){ setRunning(false); const name=prompt('Dropped! Name?')||'Player'; saveScore(gameId,name,score); return; }
    const newWidth = Math.max(10, overlap);
    setWidth(newWidth); setLevel(l=>l+1); setScore(s=>s+10);
    if(level%5===0) setWidth(w=>Math.max(8, w-5));
  }

  return (
    <div className="space-y-3">
      <div className="text-xl font-semibold">{title}</div>
      <div>Level: {level} • Score: {score}</div>
      <div className="h-24 bg-gray-100 rounded relative overflow-hidden">
        <div className="absolute bottom-2 left-1/5 right-1/5 h-2 bg-green-300 rounded" />
        <div className="absolute bottom-6 h-3 bg-blue-400 rounded" style={{left:`${x}%`, width:`${width}%`}} />
      </div>
      {!running && <button onClick={start} className="border rounded px-3 py-2">Start</button>}
      {running && <button onClick={stop} className="border rounded px-3 py-2">Stop</button>}
    </div>
  );
}

/* ---------- Pathfind (lite) ---------- */
function Pathfind({ gameId, title }) {
  const SIZE=5;
  const [grid,setGrid]=React.useState(()=>Array.from({length:SIZE},()=>Array.from({length:SIZE},()=>0)));
  const [x,setX]=React.useState(0), [y,setY]=React.useState(0);
  const [tx,setTx]=React.useState(SIZE-1), [ty,setTy]=React.useState(SIZE-1);
  const [moves,setMoves]=React.useState(12);

  function step(dx,dy){
    if(moves<=0) return;
    const nx=Math.max(0,Math.min(SIZE-1,x+dx)), ny=Math.max(0,Math.min(SIZE-1,y+dy));
    setX(nx); setY(ny); setMoves(m=>m-1);
    if(nx===tx && ny===ty){ const name=prompt('Goal! Name?')||'Player'; const score=moves*5; saveScore(gameId,name,score); setMoves(0); }
  }

  return (
    <div className="space-y-3">
      <div className="text-xl font-semibold">{title}</div>
      <div>Moves left: {moves}</div>
      <div className="grid grid-cols-5 gap-1">
        {grid.map((row,ry)=>row.map((_,rx)=>{
          const here=(rx===x&&ry===y), goal=(rx===tx&&ry===ty);
          return <div key={`${rx}-${ry}`} className={`h-8 w-8 border rounded ${here?'bg-blue-300':goal?'bg-green-300':'bg-white'}`} />;
        }))}
      </div>
      <div className="flex gap-2">
        <button onClick={()=>step(0,-1)} className="border rounded px-2 py-1">Up</button>
        <button onClick={()=>step(-1,0)} className="border rounded px-2 py-1">Left</button>
        <button onClick={()=>step(1,0)} className="border rounded px-2 py-1">Right</button>
        <button onClick={()=>step(0,1)} className="border rounded px-2 py-1">Down</button>
      </div>
    </div>
  );
}

/* ---------- Tile Slide (15-puzzle lite) ---------- */
function TileSlide({ gameId, title }) {
  const N=3;
  const goal=[...Array(N*N).keys()];
  const [tiles,setTiles]=React.useState(()=>shuffle(goal));
  function swap(i,j){ setTiles(t=>{ const n=[...t]; const tmp=n[i]; n[i]=n[j]; n[j]=tmp; return n; }); }
  function click(i){
    const z=tiles.indexOf(0);
    const adj=[z-1,z+1,z-N,z+N].filter(k=>k>=0 && k<N*N);
    if(adj.includes(i)) swap(i,z);
  }
  React.useEffect(()=>{ if(JSON.stringify(tiles)===JSON.stringify(goal)){ const name=prompt('Solved! Name?')||'Player'; saveScore(gameId,name,100);} },[tiles]);
  return (
    <div className="space-y-3">
      <div className="text-xl font-semibold">{title}</div>
      <div className="grid grid-cols-3 gap-2">
        {tiles.map((v,i)=>(
          <button key={i} onClick={()=>click(i)} className={`h-12 w-12 border rounded ${v===0?'bg-gray-100':'bg-white'}`}>{v===0?'':v}</button>
        ))}
      </div>
    </div>
  );
}

/* ---------- Memory (pairs) ---------- */
function Memory({ gameId, title }) {
  const EMOJI=['🍎','🍌','🍇','🍊','🍒','🍓','🥝','🍍','🥭','🍑','🍉','🍈'];
  const base=EMOJI.slice(0,6);
  const [deck,setDeck]=React.useState(()=>shuffle([...base,...base]).map((v,i)=>({i,v})));
  const [open,setOpen]=React.useState([]); const [done,setDone]=React.useState({}); const [moves,setMoves]=React.useState(0);
  function click(i){
    if(done[i] || open.includes(i) || open.length===2) return;
    const next=[...open,i]; setOpen(next);
    if(next.length===2){
      setMoves(m=>m+1);
      const a=deck[next[0]], b=deck[next[1]];
      if(a.v===b.v){ setDone(d=>({...d,[a.i]:true,[b.i]:true})); setOpen([]); }
      else setTimeout(()=>setOpen([]), 500);
    }
  }
  const complete=Object.keys(done).length===deck.length;
  React.useEffect(()=>{ if(complete){ const name=prompt('Complete! Name?')||'Player'; saveScore(gameId,name,Math.max(10,200-moves*10)); }},[complete]);
  return (
    <div className="space-y-3">
      <div className="text-xl font-semibold">{title}</div>
      <div className="grid grid-cols-4 gap-2">
        {deck.map((c)=>(
          <button key={c.i} onClick={()=>click(c.i)} className="h-16 border rounded text-2xl">
            {(open.includes(c.i) || done[c.i]) ? c.v : '❓'}
          </button>
        ))}
      </div>
    </div>
  );
}
EOF

# --- page template for each generated game ---
page_tpl() {
cat <<'EOF'
'use client';
import React from 'react';
import AdSlot from '@/components/games/AdSlot';
import UpsellSidebar from '@/components/games/UpsellSidebar';
import PaywallGate from '@/components/games/PaywallGate';
import Leaderboard from '@/components/games/Leaderboard';
import Engine from '@/components/games/EnginesV2';

export default function Page(){
  return (
    <div className="max-w-6xl mx-auto p-6 grid md:grid-cols-12 gap-6">
      <div className="md:col-span-8 space-y-4">
        <h1 className="text-3xl font-bold">__TITLE__</h1>
        <AdSlot id="top" />
        <div className="border rounded-lg p-4 space-y-4">
          <Engine type="__ENGINE__" gameId="__SLUG__" title="__TITLE__" />
        </div>
        <PaywallGate featureId="__FLAG__">
          <div className="border rounded-lg p-4">
            <div className="font-semibold mb-2">__TITLE__ — Pro/Elite</div>
            <ul className="list-disc pl-6 text-sm">
              <li>Harder modes & streak multipliers</li>
              <li>Global leaderboards & events</li>
              <li>Cosmetics & season challenges</li>
            </ul>
          </div>
        </PaywallGate>
        <AdSlot id="mid" />
      </div>
      <div className="md:col-span-4 space-y-4">
        <Leaderboard gameId="__SLUG__" />
        <UpsellSidebar />
        <AdSlot id="side" />
      </div>
    </div>
  );
}
EOF
}

# --- name pools for variety ---
MECHS=("reflex" "anagram" "stacker" "pathfind" "tileslide" "memory")
THEMES=("vector" "cipher" "quantum" "nebula" "signal" "matrix" "rocket" "jungle" "aurora" "kernel" "plasma" "cobalt" "orbit" "cosmic" "delta" "omega" "riddle" "forge" "atlas" "nova")

num_pad() { printf "%03d" "$1"; }

# --- generate COUNT routes ---
for i in $(seq 1 "$COUNT"); do
  idx=$(( (i-1) % ${#MECHS[@]} ))
  tdx=$(( (i-1) % ${#THEMES[@]} ))
  ENGINE="${MECHS[$idx]}"
  THEME="${THEMES[$tdx]}"
  NUM="$(num_pad "$i")"
  SLUG="${PREFIX}-${THEME}-${NUM}"
  TITLE="$(echo "${THEME^}")" # capitalize theme
  FLAG="PACK2_${ENGINE^^}_${NUM}"

  mkdir -p "app/${SLUG}"
  P="$(page_tpl)"
  P="${P/__TITLE__/${TITLE} Challenge}"
  P="${P/__SLUG__/${SLUG}}"
  P="${P/__ENGINE__/${ENGINE}}"
  P="${P/__FLAG__/${FLAG}}"
  echo "$P" > "app/${SLUG}/page.jsx"
done

echo "✅ Created ${COUNT} new game routes under /${PREFIX}-<theme>-NNN"
echo "→ Engines: ${MECHS[*]}"
echo "→ Example: /${PREFIX}-${THEMES[0]}-001"
echo "→ To make 1000: COUNT=1000 PREFIX=challenge bash game_factory.sh"
