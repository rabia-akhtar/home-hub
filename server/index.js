require('dotenv').config();
const express    = require('express');
const cors       = require('cors');
const fetch      = (...a) => import('node-fetch').then(({ default: f }) => f(...a));
const fs         = require('fs');
const path       = require('path');
const { exec }   = require('child_process');
const { promisify } = require('util');
const execAsync  = promisify(exec);
const { google } = require('googleapis');

// ─── PIR motion sensor ────────────────────────────────────────────────────────
// Spawns pir_watch.py (uses gpiozero — pre-installed on all Pi OS versions)
// Create server/pir_watch.py on the Pi — see instructions below
let lastMotion  = null;
let pirReady    = false;
let pirError    = null;
let pirLib      = 'python/gpiozero';
let pirFires    = 0;
let pirPin      = parseInt(process.env.PIR_GPIO || '17');

function onMotion() {
  pirFires++;
  lastMotion = new Date();
  exec('DISPLAY=:0 xset dpms force on 2>/dev/null; DISPLAY=:0 xset s reset 2>/dev/null', ()=>{});
  console.log(`[PIR] Motion #${pirFires} at ${lastMotion.toISOString()}`);
}

const PIR_SCRIPT = path.join(__dirname, 'pir_watch.py');
if (fs.existsSync(PIR_SCRIPT)) {
  const { spawn } = require('child_process');
  const py = spawn('python3', [PIR_SCRIPT], {
    env: { ...process.env, PIR_GPIO: String(pirPin) },
  });
  py.stdout.on('data', data => {
    const msg = data.toString().trim();
    if (msg.includes('ready')) { pirReady = true; console.log(`[PIR] Python watcher ready on GPIO ${pirPin}`); }
    if (msg.includes('motion')) onMotion();
  });
  py.stderr.on('data', data => { pirError = data.toString().trim(); console.log('[PIR] stderr:', pirError); });
  py.on('exit', code => { pirReady = false; pirError = `pir_watch.py exited (code ${code})`; console.log('[PIR]', pirError); });
} else {
  pirError = 'pir_watch.py missing — create it in ~/home-hub/server/ (see hint in /api/motion/debug)';
  console.log('[PIR]', pirError);
}

const app  = express();
const PORT = process.env.PORT || 3001;
app.use(cors());
app.use(express.json());

// ─── Data store ───────────────────────────────────────────────────────────────
const DATA_FILE = path.join(__dirname, 'data.json');
function loadData() {
  if (!fs.existsSync(DATA_FILE)) return { rabia_points:0, clare_points:0, google_tokens:null, rewards:[], redeemed:[] };
  try {
    const d = JSON.parse(fs.readFileSync(DATA_FILE,'utf8'));
    if (!d.rewards)  d.rewards  = [];
    if (!d.redeemed) d.redeemed = [];
    return d;
  } catch { return { rabia_points:0, clare_points:0, google_tokens:null, rewards:[], redeemed:[] }; }
}
function saveData(d) { fs.writeFileSync(DATA_FILE, JSON.stringify(d,null,2)); }

// Seed default rewards if empty
function ensureRewards() {
  const data = loadData();
  if (data.rewards.length === 0) {
    data.rewards = [
      { id:'r1', name:'Coffee date',    cost:50,  icon:'☕', who:'both'  },
      { id:'r2', name:'Movie night',    cost:100, icon:'🎬', who:'both'  },
      { id:'r3', name:'Spa day',        cost:250, icon:'💆', who:'rabia' },
      { id:'r4', name:'Video game time',cost:150, icon:'🎮', who:'clare' },
      { id:'r5', name:'Nice dinner out',cost:300, icon:'🍽️', who:'both'  },
      { id:'r6', name:'Weekend trip',   cost:500, icon:'✈️', who:'both'  },
    ];
    saveData(data);
  }
}
ensureRewards();

// Projects that count toward rewards
const REWARD_PROJECTS = ['chores','house items','cats'];
function countsForReward(projectName) {
  return REWARD_PROJECTS.includes((projectName||'').toLowerCase().trim());
}

// ─── Kasa / Tapo KLAP protocol (EP25 + newer devices) ───────────────────────
// EP25 uses KLAP over HTTP port 80 — the old tplink-smarthome-api (port 9999) won't work.
// Requires: npm install tp-link-tapo-connect   in ~/home-hub/server/
// Credentials go in .env: KASA_EMAIL=you@email.com  KASA_PASSWORD=yourpassword

const KASA_EMAIL    = process.env.KASA_EMAIL;
const KASA_PASSWORD = process.env.KASA_PASSWORD;

// Static device list — configure in .env:
//   KASA_IP_FLOWER=192.168.1.x   KASA_LABEL_FLOWER=Flower Lamp
//   KASA_IP_GLOBE=192.168.1.x    KASA_LABEL_GLOBE=Globe Lamp
//   KASA_IP_LAMP=192.168.1.x     KASA_LABEL_LAMP=Long Lamp
//   KASA_IP_BEDROOM_1=...        KASA_LABEL_BEDROOM_1=Bedside Lamp
//   KASA_IP_BEDROOM_2=...        KASA_LABEL_BEDROOM_2=Closet Light
//   KASA_IP_KITCHEN_1=...        KASA_LABEL_KITCHEN_1=Counter Light
//   KASA_IP_KITCHEN_2=...        KASA_LABEL_KITCHEN_2=Island Light
const TAPO_DEVICES = [
  // Living Room
  { alias: 'Smart Plug Flower',    group: 'living_room', host: process.env.KASA_IP_FLOWER     || '',              label: process.env.KASA_LABEL_FLOWER     || 'Flower Lamp'    },
  { alias: 'Smart Plug Globe',     group: 'living_room', host: process.env.KASA_IP_GLOBE      || '',              label: process.env.KASA_LABEL_GLOBE      || 'Globe Lamp'     },
  { alias: 'Smart Plug Long Lamp', group: 'living_room', host: process.env.KASA_IP_LAMP       || '',              label: process.env.KASA_LABEL_LAMP       || 'Long Lamp'      },
  // Bedroom
  { alias: 'Bedroom Lamp',         group: 'bedroom',     host: process.env.KASA_IP_BEDROOM_1  || '',              label: process.env.KASA_LABEL_BEDROOM_1  || 'Bedroom Lamp'   },
  { alias: 'Bedroom Lamp 2',       group: 'bedroom',     host: process.env.KASA_IP_BEDROOM_2  || '',              label: process.env.KASA_LABEL_BEDROOM_2  || 'Bedroom Lamp 2' },
  // Kitchen
  { alias: 'Kitchen Light',        group: 'kitchen',     host: process.env.KASA_IP_KITCHEN_1  || '',              label: process.env.KASA_LABEL_KITCHEN_1  || 'Kitchen Light'  },
  { alias: 'Kitchen Light 2',      group: 'kitchen',     host: process.env.KASA_IP_KITCHEN_2  || '',              label: process.env.KASA_LABEL_KITCHEN_2  || 'Kitchen Light 2'},
].filter(d => d.host.trim());

let tapo        = null;   // tp-link-tapo-connect client
let tapoCache   = {};     // alias → { host, alias, token, on, power_mw }
let tapoLog     = [];
let tapoReady   = false;

function tapoInfo(msg) {
  const t = new Date().toISOString();
  console.log('[Tapo]', msg);
  tapoLog.push(`${t} ${msg}`);
  if (tapoLog.length > 60) tapoLog.shift();
}

async function initTapo() {
  if (!KASA_EMAIL || !KASA_PASSWORD) {
    tapoInfo('⚠ KASA_EMAIL / KASA_PASSWORD not set in .env — Lights tab disabled');
    return;
  }
  try {
    const mod = require('tp-link-tapo-connect');
    // loginDeviceByIp is a top-level export: loginDeviceByIp(email, password, ip) → device object
    // The device object has methods: device.getDeviceInfo(), device.turnOn(), device.turnOff()
    tapo = mod;
    tapoReady = true;
    tapoInfo('Tapo client ready — connecting to devices…');
    await refreshTapoDevices();
  } catch(e) {
    tapoInfo(`Failed to load tp-link-tapo-connect: ${e.message}`);
    tapoInfo('Run: cd ~/home-hub/server && npm install tp-link-tapo-connect');
  }
}

// Returns a device object with methods (getDeviceInfo, turnOn, turnOff)
async function loginDevice(host) {
  if (tapo.loginDeviceByIp) return tapo.loginDeviceByIp(KASA_EMAIL, KASA_PASSWORD, host);
  if (tapo.loginDevice)     return tapo.loginDevice(KASA_EMAIL, KASA_PASSWORD, host);
  throw new Error('Unrecognised tp-link-tapo-connect API — no loginDeviceByIp found');
}

// device is the object returned by loginDevice — call methods on IT, not on tapo module
async function getDeviceOn(device) {
  let info;
  if (device && typeof device.getDeviceInfo === 'function') {
    info = await device.getDeviceInfo();
  } else if (device && typeof device.getDeviceState === 'function') {
    info = await device.getDeviceState();
  } else {
    throw new Error('Device object has no getDeviceInfo method — check tp-link-tapo-connect version');
  }
  return !!(info.device_on ?? (info.relay_state === 1));
}

async function refreshTapoDevices() {
  if (!tapoReady) return;
  for (const dev of TAPO_DEVICES) {
    try {
      tapoInfo(`Connecting to ${dev.alias} @ ${dev.host}…`);
      const device = await loginDevice(dev.host);
      const on     = await getDeviceOn(device);
      tapoCache[dev.alias] = { ...dev, device, on, unreachable: false };
      tapoInfo(`✓ ${dev.alias}: ${on ? 'ON' : 'OFF'}`);
    } catch(e) {
      tapoInfo(`✗ ${dev.alias} @ ${dev.host}: ${e.message}`);
      // Keep stale entry so UI still shows device (greyed out)
      if (!tapoCache[dev.alias]) tapoCache[dev.alias] = { ...dev, device: null, on: false, unreachable: true };
      else tapoCache[dev.alias].unreachable = true;
    }
  }
}

initTapo();
setInterval(refreshTapoDevices, 30000);

// GET /api/lights — list all devices with current state
app.get('/api/lights', async (req, res) => {
  try {
    // Refresh states inline for accurate reading
    if (tapoReady) {
      for (const alias of Object.keys(tapoCache)) {
        const d = tapoCache[alias];
        if (!d.device) continue;
        try {
          d.on = await getDeviceOn(d.device);
          d.unreachable = false;
        } catch { d.unreachable = true; }
      }
    }
    const devices = Object.values(tapoCache).map(d => ({
      id:          d.alias.toLowerCase().replace(/\s+/g, '_'),
      alias:       d.alias,
      label:       d.label || d.alias,
      group:       d.group || 'living_room',
      on:          d.on,
      unreachable: d.unreachable || false,
      host:        d.host,
      brightness:  null,  // EP25 is a plug, no brightness
      power_mw:    null,
    }));
    res.json(devices);
  } catch(e) { res.status(500).json({ error: e.message }); }
});

async function tapoSetPower(alias, state) {
  const d = tapoCache[alias];
  if (!d) throw new Error('Device not found');
  if (!d.device) {
    // Try re-connecting first
    try {
      tapoInfo(`Re-connecting to ${alias} @ ${d.host}…`);
      d.device = await loginDevice(d.host);
      d.unreachable = false;
    } catch(e) {
      throw new Error(`Device not connected — ${e.message}`);
    }
  }
  // Call turnOn/turnOff on the device object
  if (state) {
    if (typeof d.device.turnOn === 'function') await d.device.turnOn();
    else throw new Error('Device has no turnOn method');
  } else {
    if (typeof d.device.turnOff === 'function') await d.device.turnOff();
    else throw new Error('Device has no turnOff method');
  }
  d.on = state;
}

app.post('/api/lights/:alias/on',  async (req, res) => {
  try { await tapoSetPower(req.params.alias, true);  res.json({ ok: true }); }
  catch(e) { res.status(500).json({ error: e.message }); }
});
app.post('/api/lights/:alias/off', async (req, res) => {
  try { await tapoSetPower(req.params.alias, false); res.json({ ok: true }); }
  catch(e) { res.status(500).json({ error: e.message }); }
});
app.post('/api/lights/:alias/brightness', async (req, res) => {
  // EP25 is a plain plug — brightness not supported
  res.json({ ok: true, note: 'EP25 does not support brightness' });
});
const LIGHT_SCENES = { bright:{on:true}, relax:{on:true}, night:{on:true}, away:{on:false} };
app.post('/api/lights/scene', async (req, res) => {
  const cfg = LIGHT_SCENES[req.body.scene];
  if (!cfg) return res.status(400).json({ error: 'Unknown scene' });
  await Promise.all(Object.keys(tapoCache).map(alias => tapoSetPower(alias, cfg.on).catch(()=>{})));
  res.json({ ok: true });
});

// POST /api/lights/group — turn ALL devices on or off (used by header button)
app.post('/api/lights/group', async (req, res) => {
  const { on } = req.body;
  if (typeof on !== 'boolean') return res.status(400).json({ error: 'body must include { on: true|false }' });
  const results = await Promise.allSettled(
    Object.keys(tapoCache).map(alias => tapoSetPower(alias, on))
  );
  const failed = results.filter(r => r.status === 'rejected').map(r => r.reason?.message);
  res.json({ ok: true, on, failed });
});

// POST /api/lights/group/:group/on|off — control one room group
app.post('/api/lights/group/:group/on',  async (req, res) => {
  const devs = Object.values(tapoCache).filter(d => d.group === req.params.group);
  if (!devs.length) return res.status(404).json({ error: 'No devices in group' });
  await Promise.allSettled(devs.map(d => tapoSetPower(d.alias, true)));
  res.json({ ok: true, group: req.params.group, on: true });
});
app.post('/api/lights/group/:group/off', async (req, res) => {
  const devs = Object.values(tapoCache).filter(d => d.group === req.params.group);
  if (!devs.length) return res.status(404).json({ error: 'No devices in group' });
  await Promise.allSettled(devs.map(d => tapoSetPower(d.alias, false)));
  res.json({ ok: true, group: req.params.group, on: false });
});

// Debug
app.get('/api/lights/debug', (req, res) => {
  res.json({
    ready:   tapoReady,
    devices: Object.values(tapoCache).map(d => ({ alias: d.alias, host: d.host, on: d.on, connected: !!d.device, unreachable: d.unreachable })),
    log:     tapoLog.slice(-30),
    credentials_set: !!(KASA_EMAIL && KASA_PASSWORD),
  });
});

// ─── Motion sensor ────────────────────────────────────────────────────────────
app.get('/api/motion', (req, res) => {
  const secAgo = lastMotion ? Math.floor((Date.now() - lastMotion.getTime()) / 1000) : null;
  res.json({ lastMotion: lastMotion?.toISOString() || null, secondsAgo: secAgo, active: secAgo !== null && secAgo < 120 });
});
app.post('/api/motion/simulate', (req, res) => {
  lastMotion = new Date();
  exec('DISPLAY=:0 xset dpms force on 2>/dev/null', ()=>{});
  res.json({ ok: true, lastMotion: lastMotion.toISOString() });
});

app.get('/api/motion/debug', (req, res) => {
  res.json({
    pirReady,
    pirLib,
    pirError,
    pirPin,
    pirFires,
    lastMotion:  lastMotion?.toISOString() || null,
    secondsAgo:  lastMotion ? Math.floor((Date.now() - lastMotion.getTime()) / 1000) : null,
    active:      lastMotion ? (Date.now() - lastMotion.getTime()) < 120000 : false,
    hint: !pirReady
      ? 'Create ~/home-hub/server/pir_watch.py (see README), then restart server'
      : pirFires === 0
        ? 'PIR loaded but no motion detected yet — check wiring: VCC→Pin2, GND→Pin6, OUT→Pin11'
        : `PIR working normally (${pirLib})`,
  });
});

// ─── Weather ──────────────────────────────────────────────────────────────────
app.get('/api/weather', async (req,res) => {
  const lat=process.env.LAT||'40.7128', lon=process.env.LON||'-74.0060', city=process.env.CITY||'New York';
  try {
    const data = await fetch(`https://api.open-meteo.com/v1/forecast?latitude=${lat}&longitude=${lon}&current=temperature_2m,apparent_temperature,relative_humidity_2m,wind_speed_10m,weather_code,uv_index&daily=weather_code,temperature_2m_max,temperature_2m_min,sunrise,sunset,precipitation_probability_max&hourly=temperature_2m,precipitation_probability,precipitation,weather_code&temperature_unit=fahrenheit&wind_speed_unit=mph&timezone=auto&forecast_days=7`).then(r=>r.json());
    res.json({city,...data});
  } catch(e) { res.status(500).json({error:e.message}); }
});

// ─── Sun + Moon ───────────────────────────────────────────────────────────────
app.get('/api/sun', async (req,res) => {
  const lat=process.env.LAT||'40.7128', lon=process.env.LON||'-74.0060';
  try {
    const wx = await fetch(`https://api.open-meteo.com/v1/forecast?latitude=${lat}&longitude=${lon}&daily=sunrise,sunset&timezone=auto&forecast_days=1`).then(r=>r.json());
    const phase = (((new Date()-new Date('2000-01-06T18:14:00Z'))/86400000)%29.53058867+29.53058867)%29.53058867;
    const pct   = phase/29.53058867;
    const phases = [{name:'New Moon',icon:'🌑',range:[0,0.063]},{name:'Waxing Crescent',icon:'🌒',range:[0.063,0.25]},{name:'First Quarter',icon:'🌓',range:[0.25,0.313]},{name:'Waxing Gibbous',icon:'🌔',range:[0.313,0.5]},{name:'Full Moon',icon:'🌕',range:[0.5,0.563]},{name:'Waning Gibbous',icon:'🌖',range:[0.563,0.75]},{name:'Last Quarter',icon:'🌗',range:[0.75,0.813]},{name:'Waning Crescent',icon:'🌘',range:[0.813,1.0]}];
    const info = phases.find(p=>pct>=p.range[0]&&pct<p.range[1])||phases[0];
    res.json({ sunrise:wx.daily?.sunrise?.[0]??null, sunset:wx.daily?.sunset?.[0]??null, moon_phase:pct, moon_name:info.name, moon_icon:info.icon, moon_age_days:Math.round(phase*10)/10 });
  } catch(e) { res.status(500).json({error:e.message}); }
});

// ─── Todoist — full two-way sync ──────────────────────────────────────────────
const TODO_BASE = 'https://api.todoist.com/api/v1';
const TODO_HDR = { Authorization:`Bearer ${process.env.TODOIST_TOKEN}`, 'Content-Type':'application/json' };
const todoList = r => r.results || (Array.isArray(r) ? r : []);

// GET /api/tasks — all tasks with project name
app.get('/api/tasks', async (req,res) => {
  try {
    const [tasks,projects] = await Promise.all([
      fetch(`${TODO_BASE}/tasks`,    {headers:TODO_HDR}).then(r=>r.json()),
      fetch(`${TODO_BASE}/projects`, {headers:TODO_HDR}).then(r=>r.json()),
    ]);
    const pm = {};
    todoList(projects).forEach(p=>{ pm[p.id]=p.name; });
    const enriched = todoList(tasks).map(t=>({
      ...t,
      project_name: pm[t.project_id]||'Inbox',
      counts_for_reward: countsForReward(pm[t.project_id]||'Inbox'),
    }));
    res.json(enriched);
  } catch(e) { res.status(500).json({error:e.message}); }
});

// GET /api/projects
app.get('/api/projects', async (req,res) => {
  try {
    const r = await fetch(`${TODO_BASE}/projects`,{headers:TODO_HDR}).then(r=>r.json());
    res.json(todoList(r));
  } catch(e) { res.status(500).json({error:e.message}); }
});

// ─── Recipes (Edamam) ────────────────────────────────────────────────────────
const EDAMAM_ID  = process.env.EDAMAM_APP_ID;
const EDAMAM_KEY = process.env.EDAMAM_APP_KEY;
const EDAMAM_FIELDS = ['label','image','ingredientLines','calories','totalTime','cuisineType','mealType','yield','source','url'].map(f=>`field=${f}`).join('&');

// GET /api/recipes/search?q=...&next=<url>
app.get('/api/recipes/search', async (req, res) => {
  try {
    if (!EDAMAM_ID || !EDAMAM_KEY) return res.status(500).json({ error: 'Edamam credentials not set in .env (EDAMAM_APP_ID / EDAMAM_APP_KEY)' });
    const q = req.query.q;
    if (!q) return res.json({ hits: [], count: 0 });
    // Support pagination via ?next=<encoded url>
    const url = req.query.next
      ? decodeURIComponent(req.query.next)
      : `https://api.edamam.com/api/recipes/v2?type=public&q=${encodeURIComponent(q)}&app_id=${EDAMAM_ID}&app_key=${EDAMAM_KEY}&${EDAMAM_FIELDS}`;
    const data = await fetch(url).then(r => r.json());
    res.json({
      hits:  data.hits || [],
      count: data.count || 0,
      next:  data._links?.next?.href || null,
    });
  } catch(e) { res.status(500).json({ error: e.message }); }
});

// GET /api/recipes/recommended — vegetarian + dairy-free, random rotation
const RECOMMENDED_QUERIES = ['pasta','soup','salad','curry','stir fry','tacos','pizza','bowl','risotto','noodles','chili','roasted vegetables','lentil','chickpea','tofu'];
app.get('/api/recipes/recommended', async (req, res) => {
  try {
    if (!EDAMAM_ID || !EDAMAM_KEY) return res.status(500).json({ error: 'Edamam credentials not set' });
    const q   = RECOMMENDED_QUERIES[Math.floor(Math.random() * RECOMMENDED_QUERIES.length)];
    const url = `https://api.edamam.com/api/recipes/v2?type=public&q=${encodeURIComponent(q)}&app_id=${EDAMAM_ID}&app_key=${EDAMAM_KEY}&health=vegetarian&health=dairy-free&random=true&${EDAMAM_FIELDS}`;
    const data = await fetch(url).then(r => r.json());
    res.json({ hits: (data.hits || []).slice(0, 9), query: q });
  } catch(e) { res.status(500).json({ error: e.message }); }
});

// POST /api/recipes/add-ingredients  body: { ingredients: string[], recipeName: string }
app.post('/api/recipes/add-ingredients', async (req, res) => {
  try {
    const { ingredients, recipeName } = req.body;
    if (!ingredients?.length) return res.status(400).json({ error: 'No ingredients' });
    // Find the Groceries project
    const projects = await fetch(`${TODO_BASE}/projects`, { headers: TODO_HDR }).then(r => r.json());
    const grocProj  = todoList(projects).find(p => p.name.toLowerCase() === 'groceries');
    if (!grocProj) return res.status(404).json({ error: 'Groceries project not found in Todoist' });
    // Create one task per ingredient (parallel)
    await Promise.all(ingredients.map(line =>
      fetch(`${TODO_BASE}/tasks`, {
        method: 'POST', headers: TODO_HDR,
        body: JSON.stringify({ content: line, project_id: grocProj.id, description: `From: ${recipeName}` }),
      })
    ));
    res.json({ ok: true, added: ingredients.length, project: grocProj.name });
  } catch(e) { res.status(500).json({ error: e.message }); }
});

// POST /api/tasks — create
app.post('/api/tasks', async (req,res) => {
  try { res.json(await fetch(`${TODO_BASE}/tasks`,{method:'POST',headers:TODO_HDR,body:JSON.stringify(req.body)}).then(r=>r.json())); }
  catch(e) { res.status(500).json({error:e.message}); }
});

// POST /api/tasks/:id/close — complete + award points
app.post('/api/tasks/:id/close', async (req,res) => {
  try {
    await fetch(`${TODO_BASE}/tasks/${req.params.id}/close`,{method:'POST',headers:TODO_HDR});
    const data = loadData();
    if (req.body.counts_for_reward) {
      const who = req.body.assignee;
      if (who==='rabia'  || who==='family') data.rabia_points=Math.min((data.rabia_points||0)+5,9999);
      if (who==='clare'  || who==='family') data.clare_points=Math.min((data.clare_points||0)+5,9999);
    }
    saveData(data);
    res.json({ok:true, points:data});
  } catch(e) { res.status(500).json({error:e.message}); }
});

// DELETE /api/tasks/:id
app.delete('/api/tasks/:id', async (req,res) => {
  try {
    await fetch(`${TODO_BASE}/tasks/${req.params.id}`,{method:'DELETE',headers:TODO_HDR});
    res.json({ok:true});
  } catch(e) { res.status(500).json({error:e.message}); }
});

// PATCH /api/tasks/:id — update content/due
app.patch('/api/tasks/:id', async (req,res) => {
  try {
    const updated = await fetch(`${TODO_BASE}/tasks/${req.params.id}`,{method:'POST',headers:TODO_HDR,body:JSON.stringify(req.body)}).then(r=>r.json());
    res.json(updated);
  } catch(e) { res.status(500).json({error:e.message}); }
});

// GET /api/users — current user + collaborators (for UID→person mapping)
app.get('/api/users', async (req,res) => {
  try {
    const [me, projData] = await Promise.all([
      fetch(`${TODO_BASE}/user`,{headers:TODO_HDR}).then(r=>r.json()),
      fetch(`${TODO_BASE}/projects`,{headers:TODO_HDR}).then(r=>r.json()),
    ]);
    const shared = todoList(projData).filter(p=>p.is_shared);
    const collabArrays = await Promise.all(
      shared.map(p=>fetch(`${TODO_BASE}/projects/${p.id}/collaborators`,{headers:TODO_HDR}).then(r=>r.json()).catch(()=>({})))
    );
    const seen = {};
    if(me.id) seen[me.id]={id:me.id,email:me.email,name:me.full_name};
    collabArrays.forEach(c=>todoList(c).forEach(u=>{ if(u.id) seen[u.id]={id:u.id,email:u.email,name:u.full_name||u.name}; }));
    res.json(Object.values(seen));
  } catch(e) { res.status(500).json({error:e.message}); }
});

// ─── Points ───────────────────────────────────────────────────────────────────
app.get('/api/points', (req,res)=>res.json(loadData()));
app.post('/api/points/reset', (req,res)=>{
  const data=loadData();
  if (!req.body.who||req.body.who==='all'){data.rabia_points=0;data.clare_points=0;}
  else if(req.body.who==='rabia') data.rabia_points=0;
  else if(req.body.who==='clare') data.clare_points=0;
  saveData(data); res.json(data);
});
app.post('/api/points/add', (req,res)=>{
  const data=loadData();
  const {who,amount} = req.body;
  if(who==='rabia') data.rabia_points=Math.min((data.rabia_points||0)+amount,9999);
  if(who==='clare') data.clare_points=Math.min((data.clare_points||0)+amount,9999);
  saveData(data); res.json(data);
});

// ─── Rewards ─────────────────────────────────────────────────────────────────
app.get('/api/rewards', (req,res)=>{ const d=loadData(); res.json({rewards:d.rewards, redeemed:d.redeemed}); });

app.post('/api/rewards', (req,res)=>{
  const data=loadData();
  const reward={id:'r'+Date.now(), name:req.body.name, cost:req.body.cost, icon:req.body.icon||'🎁', who:req.body.who||'both'};
  data.rewards.push(reward); saveData(data); res.json(reward);
});

app.patch('/api/rewards/:id', (req,res)=>{
  const data=loadData();
  const idx=data.rewards.findIndex(r=>r.id===req.params.id);
  if(idx===-1) return res.status(404).json({error:'Not found'});
  data.rewards[idx]={...data.rewards[idx],...req.body};
  saveData(data); res.json(data.rewards[idx]);
});

app.delete('/api/rewards/:id', (req,res)=>{
  const data=loadData();
  data.rewards=data.rewards.filter(r=>r.id!==req.params.id);
  saveData(data); res.json({ok:true});
});

app.post('/api/rewards/:id/redeem', (req,res)=>{
  const data=loadData();
  const reward=data.rewards.find(r=>r.id===req.params.id);
  if(!reward) return res.status(404).json({error:'Not found'});
  const who=req.body.who;
  const pts=who==='rabia'?data.rabia_points:data.clare_points;
  if(pts<reward.cost) return res.status(400).json({error:'Not enough points'});
  if(who==='rabia') data.rabia_points=pts-reward.cost;
  else              data.clare_points=pts-reward.cost;
  data.redeemed.push({...reward, who, redeemedAt:new Date().toISOString()});
  saveData(data); res.json({ok:true, points:data});
});

// ─── Google Calendar OAuth + two-way sync ────────────────────────────────────
const G_CLIENT_ID     = process.env.GOOGLE_CLIENT_ID;
const G_CLIENT_SECRET = process.env.GOOGLE_CLIENT_SECRET;
const G_REDIRECT      = `http://localhost:${PORT}/api/auth/google/callback`;

app.get('/api/auth/google', (req,res)=>{
  const url='https://accounts.google.com/o/oauth2/v2/auth?'+new URLSearchParams({
    client_id:G_CLIENT_ID, redirect_uri:G_REDIRECT, response_type:'code',
    scope:'https://www.googleapis.com/auth/calendar', access_type:'offline', prompt:'consent',
  });
  res.redirect(url);
});

app.get('/api/auth/google/callback', async (req,res)=>{
  if(!req.query.code) return res.status(400).send('No code');
  try {
    const token=await fetch('https://oauth2.googleapis.com/token',{
      method:'POST', headers:{'Content-Type':'application/x-www-form-urlencoded'},
      body:new URLSearchParams({code:req.query.code,client_id:G_CLIENT_ID,client_secret:G_CLIENT_SECRET,redirect_uri:G_REDIRECT,grant_type:'authorization_code'}),
    }).then(r=>r.json());
    if(token.error) return res.status(400).send('Error: '+token.error_description);
    const data=loadData();
    data.google_tokens={access_token:token.access_token, refresh_token:token.refresh_token, expiry:Date.now()+token.expires_in*1000};
    saveData(data);
    res.send('<h2 style="font-family:sans-serif;color:green;padding:40px">✅ Google Calendar connected! Close this tab and reload your dashboard.</h2>');
  } catch(e){ res.status(500).send('Auth failed: '+e.message); }
});

app.get('/api/auth/status',(req,res)=>{
  const d=loadData(); res.json({google_connected:!!(d.google_tokens?.access_token)});
});

async function getGoogleToken(){
  const data=loadData();
  if(!data.google_tokens) throw new Error('NOT_AUTHED');
  if(Date.now()>data.google_tokens.expiry-60000){
    const r=await fetch('https://oauth2.googleapis.com/token',{
      method:'POST', headers:{'Content-Type':'application/x-www-form-urlencoded'},
      body:new URLSearchParams({client_id:G_CLIENT_ID,client_secret:G_CLIENT_SECRET,refresh_token:data.google_tokens.refresh_token,grant_type:'refresh_token'}),
    }).then(r=>r.json());
    data.google_tokens.access_token=r.access_token;
    data.google_tokens.expiry=Date.now()+r.expires_in*1000;
    saveData(data);
  }
  return data.google_tokens.access_token;
}

// GET /api/calendar — read events from both calendars
app.get('/api/calendar', async (req,res)=>{
  try {
    const token=await getGoogleToken();
    const calIds=[
      {id:process.env.GOOGLE_CALENDAR_ID_RABIA, color:'#38bdf8', name:'Rabia'},
      {id:process.env.GOOGLE_CALENDAR_ID_CLARE, color:'#f472b6', name:'Clare'},
    ].filter(c=>c.id&&c.id!=='PLACEHOLDER');
    const now=new Date(), end=new Date(now); end.setDate(now.getDate()+7);
    const events=await Promise.all(calIds.map(async cal=>{
      const data=await fetch(
        `https://www.googleapis.com/calendar/v3/calendars/${encodeURIComponent(cal.id)}/events?`+
        new URLSearchParams({timeMin:now.toISOString(),timeMax:end.toISOString(),singleEvents:'true',orderBy:'startTime',maxResults:'50'}),
        {headers:{Authorization:`Bearer ${token}`}}
      ).then(r=>r.json());
      return (data.items||[]).map(e=>({
        id:e.id, title:e.summary||'(No title)',
        start:e.start?.dateTime||e.start?.date, end:e.end?.dateTime||e.end?.date,
        allDay:!e.start?.dateTime, color:cal.color, calendar:cal.name, calendarId:cal.id,
      }));
    }));
    res.json(events.flat());
  } catch(e){
    if(e.message==='NOT_AUTHED') return res.status(401).json({error:'NOT_AUTHED'});
    res.status(500).json({error:e.message});
  }
});

// POST /api/calendar — create event (two-way write)
app.post('/api/calendar', async (req,res)=>{
  try {
    const token=await getGoogleToken();
    const {calendarId, summary, start, end, allDay} = req.body;
    const body = {
      summary,
      start: allDay ? {date:start} : {dateTime:start, timeZone:'America/New_York'},
      end:   allDay ? {date:end}   : {dateTime:end,   timeZone:'America/New_York'},
    };
    const event=await fetch(
      `https://www.googleapis.com/calendar/v3/calendars/${encodeURIComponent(calendarId)}/events`,
      {method:'POST', headers:{Authorization:`Bearer ${token}`,'Content-Type':'application/json'}, body:JSON.stringify(body)}
    ).then(r=>r.json());
    res.json(event);
  } catch(e){ res.status(500).json({error:e.message}); }
});

// DELETE /api/calendar/:calendarId/:eventId
app.delete('/api/calendar/:calendarId/:eventId', async (req,res)=>{
  try {
    const token=await getGoogleToken();
    await fetch(
      `https://www.googleapis.com/calendar/v3/calendars/${encodeURIComponent(req.params.calendarId)}/events/${req.params.eventId}`,
      {method:'DELETE', headers:{Authorization:`Bearer ${token}`}}
    );
    res.json({ok:true});
  } catch(e){ res.status(500).json({error:e.message}); }
});

// ─── Budget — Google Sheets sync ─────────────────────────────────────────────
const SPREADSHEET_ID   = '1h2hk_ia0lI6kJksTBga-Gni1dV84DraglBRH_-Dyje0';
const SHEETS_CREDS_PATH = path.join(__dirname, '../sheets-credentials.json');

function sheetsClient() {
  const creds = JSON.parse(fs.readFileSync(SHEETS_CREDS_PATH, 'utf8'));
  const auth  = new google.auth.GoogleAuth({
    credentials: creds,
    scopes: ['https://www.googleapis.com/auth/spreadsheets'],
  });
  return google.sheets({ version: 'v4', auth });
}

// GET /api/budget/balances — read the Balances summary (rows 8-10, A=indicator B=name … G=balance)
app.get('/api/budget/balances', async (req, res) => {
  try {
    const sheets = sheetsClient();
    const r = await sheets.spreadsheets.values.get({
      spreadsheetId: SPREADSHEET_ID,
      range: 'Balances!A8:G10',
    });
    const rows = r.data.values || [];
    // row[0]=unused, row[1]=Name, row[2]=Paid, row[3]=Owes,
    // row[4]=ReimbSent, row[5]=ReimbReceived, row[6]=CurrentBalance
    const people = rows.slice(1).map(row => ({
      name:          row[1] || '',
      paid:          row[2] || '',
      owes:          row[3] || '',
      reimbSent:     row[4] || '',
      reimbReceived: row[5] || '',
      balance:       row[6] || '',
    }));
    res.json({ people });
  } catch(e) { res.status(500).json({ error: e.message }); }
});

// GET /api/budget/expenses — read Expenses & Payments tab (row 4 = header, 5+ = data)
app.get('/api/budget/expenses', async (req, res) => {
  try {
    const sheets = sheetsClient();
    const r = await sheets.spreadsheets.values.get({
      spreadsheetId: SPREADSHEET_ID,
      range: 'Expenses & Payments!A4:J2000',
    });
    const rows = r.data.values || [];
    // rows[0] is the header row; data starts rows[1]
    // A=empty, B=category, C=item, D=date, E=paidBy, F=amount, G=reimbTo, H=errorCheck, I=rabiaP, J=clareP
    const items = rows.slice(1)
      .map((row, i) => {
        // skip fully empty rows
        if (!row[1] && !row[2]) return null;
        return {
          _row:       i + 5,          // actual 1-indexed sheet row (header=4, data starts 5)
          category:   row[1] || '',
          item:       row[2] || '',
          date:       row[3] || '',
          paidBy:     row[4] || '',
          amount:     row[5] || '',
          reimbTo:    row[6] || '',
          errorCheck: row[7] || '',
          rabiaP:     row[8] || '',
          clareP:     row[9] || '',
        };
      })
      .filter(Boolean);
    res.json({ items });
  } catch(e) { res.status(500).json({ error: e.message }); }
});

// POST /api/budget/expenses — append a new row
app.post('/api/budget/expenses', async (req, res) => {
  try {
    const sheets = sheetsClient();
    const { category, item, date, paidBy, amount, reimbTo } = req.body;
    // Column order: A=empty, B=category, C=item, D=date, E=paidBy, F=amount, G=reimbTo
    await sheets.spreadsheets.values.append({
      spreadsheetId: SPREADSHEET_ID,
      range: 'Expenses & Payments!A:J',
      valueInputOption: 'USER_ENTERED',
      requestBody: {
        values: [['', category, item, date, paidBy, amount, reimbTo || '', '', '', '']],
      },
    });
    res.json({ ok: true });
  } catch(e) { res.status(500).json({ error: e.message }); }
});

// PUT /api/budget/expenses/:row — update columns A-G of a specific sheet row
app.put('/api/budget/expenses/:row', async (req, res) => {
  try {
    const sheets = sheetsClient();
    const row = parseInt(req.params.row, 10);
    const { category, item, date, paidBy, amount, reimbTo } = req.body;
    // Column order: A=empty, B=category, C=item, D=date, E=paidBy, F=amount, G=reimbTo
    await sheets.spreadsheets.values.update({
      spreadsheetId: SPREADSHEET_ID,
      range: `Expenses & Payments!A${row}:G${row}`,
      valueInputOption: 'USER_ENTERED',
      requestBody: {
        values: [['', category, item, date, paidBy, amount, reimbTo || '']],
      },
    });
    res.json({ ok: true });
  } catch(e) { res.status(500).json({ error: e.message }); }
});

// ─── Kiosk control ───────────────────────────────────────────────────────────
app.post('/api/kiosk/exit', (req, res) => {
  res.json({ok:true});
  setTimeout(()=>exec('pkill -f chromium'), 300);
});

// ─── Voice assistant ──────────────────────────────────────────────────────────
const OLLAMA_URL      = process.env.OLLAMA_URL      || 'http://localhost:11434';
const OLLAMA_MODEL    = process.env.OLLAMA_MODEL    || 'llama3.2:3b';
const GROQ_API_KEY    = process.env.GROQ_API_KEY    || '';
const GROQ_STT_MODEL  = process.env.GROQ_STT_MODEL  || 'whisper-large-v3-turbo';

// POST /api/voice/transcribe — send audio to Groq Whisper API, return transcript
// Groq accepts webm directly — no ffmpeg needed. Free tier at console.groq.com
app.post('/api/voice/transcribe', express.raw({ type: '*/*', limit: '20mb' }), async (req, res) => {
  if (!GROQ_API_KEY) return res.status(500).json({ error: 'GROQ_API_KEY not set in .env — get a free key at console.groq.com' });
  try {
    const blob = new Blob([req.body], { type: 'audio/webm' });
    const form = new FormData();
    form.append('file', blob, 'audio.webm');
    form.append('model', GROQ_STT_MODEL);
    form.append('language', 'en');

    const r = await fetch('https://api.groq.com/openai/v1/audio/transcriptions', {
      method: 'POST',
      headers: { 'Authorization': `Bearer ${GROQ_API_KEY}` },
      body: form,
    });
    if (!r.ok) {
      const err = await r.text();
      console.error('[Groq STT]', r.status, err);
      return res.status(500).json({ error: `Groq error ${r.status}: ${err}` });
    }
    const data = await r.json();
    res.json({ transcript: data.text?.trim() || '' });
  } catch (e) {
    console.error('[Groq STT]', e.message);
    res.status(500).json({ error: e.message });
  }
});

// POST /api/voice/parse — send transcript to Ollama, get back intent JSON
app.post('/api/voice/parse', async (req, res) => {
  const { transcript } = req.body;
  if (!transcript) return res.status(400).json({ error: 'No transcript provided' });

  const prompt = `You are a home assistant. Parse the voice command below and return ONLY a JSON object — no explanation, no extra text.

Supported actions:
- add_grocery  → add an item to the grocery list
- add_task     → add a task (with optional due date and assignee "rabia" or "clare")
- lights_on    → turn all lights on
- lights_off   → turn all lights off
- unknown      → you don't understand the command

Return format:
{"action":"add_grocery","content":"item name"}
{"action":"add_task","content":"task name","due":"tomorrow","assignee":"rabia"}
{"action":"lights_on"}
{"action":"unknown"}

Voice command: "${transcript}"`;

  try {
    const r = await fetch(`${OLLAMA_URL}/api/generate`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ model: OLLAMA_MODEL, prompt, stream: false, format: 'json' }),
    });
    if (!r.ok) {
      const txt = await r.text();
      if (r.status === 404 || txt.includes('not found')) {
        return res.status(503).json({ error: `Ollama model "${OLLAMA_MODEL}" not found. Run: ollama pull ${OLLAMA_MODEL}` });
      }
      return res.status(503).json({ error: `Ollama error: ${txt}` });
    }
    const { response } = await r.json();
    let intent;
    try { intent = JSON.parse(response); }
    catch { intent = { action: 'unknown' }; }
    res.json(intent);
  } catch (e) {
    if (e.code === 'ECONNREFUSED') return res.status(503).json({ error: 'Ollama is not running. Start it with: ollama serve' });
    res.status(500).json({ error: e.message });
  }
});

// POST /api/voice/execute — execute a parsed intent
app.post('/api/voice/execute', async (req, res) => {
  const intent = req.body;

  try {
    if (intent.action === 'add_grocery') {
      const projects = await fetch(`${TODO_BASE}/projects`, { headers: TODO_HDR }).then(r => r.json());
      const grocProj = todoList(projects).find(p => p.name.toLowerCase() === 'groceries');
      if (!grocProj) return res.status(404).json({ ok: false, message: 'Groceries project not found in Todoist' });
      await fetch(`${TODO_BASE}/tasks`, {
        method: 'POST', headers: TODO_HDR,
        body: JSON.stringify({ content: intent.content, project_id: grocProj.id }),
      });
      return res.json({ ok: true, message: `Added "${intent.content}" to Groceries` });
    }

    if (intent.action === 'add_task') {
      const body = { content: intent.content };
      if (intent.due)      body.due_string = intent.due;
      if (intent.assignee) {
        // find the collaborator and set responsible_uid if available
        // for now just add as a plain task; assignee shown in content if needed
      }
      await fetch(`${TODO_BASE}/tasks`, { method: 'POST', headers: TODO_HDR, body: JSON.stringify(body) });
      const extra = [intent.due && `due ${intent.due}`, intent.assignee && `for ${intent.assignee}`].filter(Boolean).join(', ');
      return res.json({ ok: true, message: `Added task "${intent.content}"${extra ? ` (${extra})` : ''}` });
    }

    if (intent.action === 'lights_on' || intent.action === 'lights_off') {
      const on = intent.action === 'lights_on';
      const results = await Promise.allSettled(
        Object.values(tapoCache).map(d => tapoSetPower(d.alias, on))
      );
      const ok = results.some(r => r.status === 'fulfilled');
      return res.json({ ok, message: ok ? `Lights turned ${on ? 'on' : 'off'}` : 'Could not reach lights' });
    }

    return res.json({ ok: false, message: 'Unknown action — nothing was done' });
  } catch (e) {
    res.status(500).json({ ok: false, message: e.message });
  }
});

// ─── System debug — aggregated status for all integrations ───────────────────
app.get('/api/debug/system', async (req, res) => {
  const data   = loadData();
  const hasGoogleTokens = !!(data.google_tokens?.access_token);

  // Quick Todoist connectivity check
  let todoistStatus = 'not_configured';
  let todoistError  = null;
  if (process.env.TODOIST_TOKEN) {
    try {
      const r = await fetch(`${TODO_BASE}/projects`, { headers: TODO_HDR });
      todoistStatus = r.ok ? 'ok' : `http_${r.status}`;
      if (!r.ok) todoistError = await r.text();
    } catch (e) { todoistStatus = 'error'; todoistError = e.message; }
  }

  // Quick weather check
  const lat = process.env.LAT || '40.7128', lon = process.env.LON || '-74.0060';
  let weatherStatus = 'unknown';
  let weatherError  = null;
  try {
    const r = await fetch(`https://api.open-meteo.com/v1/forecast?latitude=${lat}&longitude=${lon}&current=temperature_2m&forecast_days=1`);
    weatherStatus = r.ok ? 'ok' : `http_${r.status}`;
    if (!r.ok) weatherError = await r.text();
  } catch (e) { weatherStatus = 'error'; weatherError = e.message; }

  // Voice — check Ollama + Groq
  let ollamaStatus = 'unknown', ollamaModels = [], ollamaError = null;
  try {
    const r = await fetch(`${OLLAMA_URL}/api/tags`);
    if (r.ok) { const d = await r.json(); ollamaStatus = 'ok'; ollamaModels = (d.models||[]).map(m=>m.name); }
    else { ollamaStatus = `http_${r.status}`; ollamaError = await r.text(); }
  } catch(e) { ollamaStatus = e.code==='ECONNREFUSED'?'not_running':'error'; ollamaError = e.message; }

  res.json({
    timestamp: new Date().toISOString(),
    voice: {
      ollama: { status: ollamaStatus, url: OLLAMA_URL, model: OLLAMA_MODEL, models_installed: ollamaModels, error: ollamaError,
        model_ready: ollamaModels.some(m => m.startsWith(OLLAMA_MODEL.split(':')[0])) },
      groq_stt: { ok: !!GROQ_API_KEY, model: GROQ_STT_MODEL, key_set: !!GROQ_API_KEY },
    },
    lights: {
      status: tapoReady ? 'ok' : (!(process.env.KASA_EMAIL && process.env.KASA_PASSWORD) ? 'not_configured' : 'initializing'),
      credentials_set: !!(process.env.KASA_EMAIL && process.env.KASA_PASSWORD),
      devices: Object.values(tapoCache).map(d => ({
        alias: d.alias, host: d.host, on: d.on,
        connected: !!d.device, unreachable: !!d.unreachable,
      })),
      log: tapoLog.slice(-10),
    },
    motion: {
      status: pirReady ? 'ok' : (pirError ? 'error' : 'initializing'),
      ready: pirReady,
      lib: pirLib,
      pin: pirPin,
      fires: pirFires,
      error: pirError,
      last_motion: lastMotion?.toISOString() || null,
      seconds_ago: lastMotion ? Math.floor((Date.now() - lastMotion.getTime()) / 1000) : null,
    },
    weather: {
      status: weatherStatus,
      error: weatherError,
      location: { lat, lon, city: process.env.CITY || 'unknown' },
    },
    todoist: {
      status: todoistStatus,
      token_set: !!process.env.TODOIST_TOKEN,
      error: todoistError,
    },
    google_calendar: {
      status: hasGoogleTokens ? 'authenticated' : (process.env.GOOGLE_CLIENT_ID ? 'not_authenticated' : 'not_configured'),
      client_id_set: !!process.env.GOOGLE_CLIENT_ID,
      client_secret_set: !!process.env.GOOGLE_CLIENT_SECRET,
      tokens_saved: hasGoogleTokens,
      token_expiry: data.google_tokens?.expiry ? new Date(data.google_tokens.expiry).toISOString() : null,
    },
    env: {
      port: PORT,
      node_env: process.env.NODE_ENV || 'production',
      lat: process.env.LAT || '(default)',
      lon: process.env.LON || '(default)',
      city: process.env.CITY || '(default)',
    },
  });
});

// Serve built frontend (production / Pi)
const DIST = path.join(__dirname, '../frontend/dist');
if (fs.existsSync(DIST)) {
  app.use(express.static(DIST));
  app.get('*', (req, res) => res.sendFile(path.join(DIST, 'index.html')));
}

app.listen(PORT,()=>{
  console.log(`\n🏠  Hub → http://localhost:${PORT}`);
  console.log(`📅  Connect Google → http://localhost:${PORT}/api/auth/google\n`);

  // Warm up Ollama so the first voice command is fast
  setTimeout(async () => {
    try {
      console.log(`[Ollama] Warming up ${OLLAMA_MODEL}…`);
      await fetch(`${OLLAMA_URL}/api/generate`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ model: OLLAMA_MODEL, prompt: 'hi', stream: false }),
      });
      console.log('[Ollama] Model warm and ready');
    } catch (e) {
      console.log('[Ollama] Warm-up skipped (not running):', e.message);
    }
  }, 3000); // wait 3s for server to fully settle before hitting Ollama
});
