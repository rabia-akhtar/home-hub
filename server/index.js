require('dotenv').config();
const express    = require('express');
const cors       = require('cors');
const { Client } = require('tplink-smarthome-api');
const fetch      = (...a) => import('node-fetch').then(({ default: f }) => f(...a));
const fs         = require('fs');
const path       = require('path');
const { exec }   = require('child_process');
const { google } = require('googleapis');

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

// ─── Kasa ─────────────────────────────────────────────────────────────────────
const kasaClient = new Client();
let deviceCache  = {};
let kasaLog      = [];   // rolling log for /api/lights/debug

function kasaInfo(msg) { const t=new Date().toISOString(); console.log('[Kasa]',msg); kasaLog.push(`${t} ${msg}`); if(kasaLog.length>50) kasaLog.shift(); }

// Static IPs — bypass UDP discovery for known devices
const STATIC_KASA_IPS = ['192.168.1.189'];

async function connectStaticDevices() {
  for (const host of STATIC_KASA_IPS) {
    try {
      kasaInfo(`Trying static IP ${host}…`);
      const device = await kasaClient.getDevice({ host });
      deviceCache[device.alias] = device;
      kasaInfo(`✓ Static connected: "${device.alias}" @ ${host}`);
    } catch(e) {
      kasaInfo(`✗ Static ${host} failed: ${e.message}`);
    }
  }
}

async function discoverKasa() {
  return new Promise(resolve => {
    const found = {};
    kasaInfo('Starting UDP discovery…');
    kasaClient.startDiscovery({ discoveryTimeout: 4000 })
      .on('device-new', device => {
        kasaInfo(`✓ Discovered: "${device.alias}" @ ${device.host}`);
        found[device.alias] = device;
        deviceCache = { ...deviceCache, ...found };
      });
    setTimeout(() => {
      kasaInfo(`Discovery done. Cache: [${Object.keys(deviceCache).join(', ') || 'empty'}]`);
      resolve(found);
    }, 4500);
  });
}

connectStaticDevices();
discoverKasa();
setInterval(()=>{ connectStaticDevices(); discoverKasa(); }, 30000);

// Debug endpoint — call http://pi:3001/api/lights/debug to see what's happening
app.get('/api/lights/debug', (req, res) => {
  res.json({
    cached: Object.keys(deviceCache).map(k => ({ alias: k, host: deviceCache[k].host })),
    static_ips: STATIC_KASA_IPS,
    log: kasaLog.slice(-30),
  });
});

app.get('/api/lights', async (req,res) => {
  try {
    const devices = await Promise.all(Object.values(deviceCache).map(async d => {
      try {
        const info = await d.getSysInfo();
        return { id:d.alias.toLowerCase().replace(/\s+/g,'_'), alias:d.alias, on:info.relay_state===1||info.light_state?.on_off===1, brightness:info.light_state?.brightness??null, power_mw:info.emeter_realtime?.power_mw??null, host:d.host };
      } catch { return null; }
    }));
    res.json(devices.filter(Boolean));
  } catch(e) { res.status(500).json({error:e.message}); }
});
app.post('/api/lights/:alias/on',  async (req,res) => { const d=deviceCache[req.params.alias]; if(!d) return res.status(404).json({error:'Not found'}); await d.setPowerState(true);  res.json({ok:true}); });
app.post('/api/lights/:alias/off', async (req,res) => { const d=deviceCache[req.params.alias]; if(!d) return res.status(404).json({error:'Not found'}); await d.setPowerState(false); res.json({ok:true}); });
app.post('/api/lights/:alias/brightness', async (req,res) => { const d=deviceCache[req.params.alias]; if(!d) return res.status(404).json({error:'Not found'}); if(d.lighting) await d.lighting.setLightingService({brightness:req.body.brightness}); res.json({ok:true}); });
const LIGHT_SCENES = { bright:{on:true,brightness:100}, relax:{on:true,brightness:45}, night:{on:true,brightness:10}, away:{on:false,brightness:0} };
app.post('/api/lights/scene', async (req,res) => {
  const cfg=LIGHT_SCENES[req.body.scene]; if(!cfg) return res.status(400).json({error:'Unknown scene'});
  await Promise.all(Object.values(deviceCache).map(async d => { try { await d.setPowerState(cfg.on); if(cfg.on&&d.lighting) await d.lighting.setLightingService({brightness:cfg.brightness}); } catch{} }));
  res.json({ok:true});
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

// Serve built frontend (production / Pi)
const DIST = path.join(__dirname, '../frontend/dist');
if (fs.existsSync(DIST)) {
  app.use(express.static(DIST));
  app.get('*', (req, res) => res.sendFile(path.join(DIST, 'index.html')));
}

app.listen(PORT,()=>{
  console.log(`\n🏠  Hub → http://localhost:${PORT}`);
  console.log(`📅  Connect Google → http://localhost:${PORT}/api/auth/google\n`);
});
