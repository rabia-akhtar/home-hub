import { useState, useEffect, useCallback, useRef } from "react";

const API = "/api";
const RABIA = { name:"Rabia", color:"#38bdf8", light:"#e0f2fe", dark:"#0369a1", initial:"R" };
const CLARE = { name:"Clare", color:"#f472b6", light:"#fce7f3", dark:"#9d174d", initial:"C" };
const REWARD_PROJECTS = ["chores","house items","cats"];
const countsForReward = p => REWARD_PROJECTS.includes((p||"").toLowerCase().trim());

const WX = {0:"Clear",1:"Mainly clear",2:"Partly cloudy",3:"Overcast",45:"Foggy",48:"Foggy",51:"Drizzle",53:"Drizzle",55:"Drizzle",61:"Light rain",63:"Rain",65:"Heavy rain",71:"Light snow",73:"Snow",75:"Heavy snow",80:"Showers",81:"Showers",82:"Showers",95:"Storm",96:"Storm",99:"Storm"};
const wxL = c => WX[c] || "–";

function WxIcon({ code, size=28, style:st={} }) {
  const s = {width:size,height:size,flexShrink:0,display:"inline-block",...st};
  const c = code ?? 0;
  if(c===0) return (
    <svg style={s} viewBox="0 0 24 24" fill="none">
      <circle cx="12" cy="12" r="4" fill="#fbbf24"/>
      {[[12,2.5,12,5],[12,19,12,21.5],[2.5,12,5,12],[19,12,21.5,12],[5.6,5.6,7.4,7.4],[16.6,16.6,18.4,18.4],[18.4,5.6,16.6,7.4],[7.4,16.6,5.6,18.4]].map(([x1,y1,x2,y2],i)=>(
        <line key={i} x1={x1} y1={y1} x2={x2} y2={y2} stroke="#fbbf24" strokeWidth="2" strokeLinecap="round"/>
      ))}
    </svg>
  );
  if(c<=2) return (
    <svg style={s} viewBox="0 0 24 24" fill="none">
      <circle cx="9" cy="9" r="3.2" fill="#fbbf24"/>
      <line x1="9" y1="3.5" x2="9" y2="5" stroke="#fbbf24" strokeWidth="1.5" strokeLinecap="round"/>
      <line x1="3.5" y1="9" x2="5" y2="9" stroke="#fbbf24" strokeWidth="1.5" strokeLinecap="round"/>
      <line x1="5.1" y1="5.1" x2="6.1" y2="6.1" stroke="#fbbf24" strokeWidth="1.5" strokeLinecap="round"/>
      <line x1="12.9" y1="5.1" x2="11.9" y2="6.1" stroke="#fbbf24" strokeWidth="1.5" strokeLinecap="round"/>
      <path d="M5.5 18c0-2.2 1.8-4 4-4 .7 0 1.3.2 1.9.5.4-1.6 1.8-2.8 3.5-2.8 2 0 3.5 1.6 3.5 3.5s-1.5 3.5-3.5 3.5H7c-.8 0-1.5-.4-1.5-1.2V18z" fill="#94a3b8"/>
    </svg>
  );
  if(c===3) return (
    <svg style={s} viewBox="0 0 24 24" fill="none">
      <path d="M3.5 16c0-2.5 2-4.5 4.5-4.5.6 0 1.2.1 1.7.4.5-1.8 2.2-3 4.1-3 2.4 0 4.2 1.9 4.2 4.2s-1.9 4.2-4.2 4.2H5.2c-.9 0-1.7-.6-1.7-1.3z" fill="#94a3b8"/>
      <path d="M17.5 12.5c1.5.5 2.5 1.9 2.5 3.5 0 1.9-1.6 3.5-3.5 3.5" stroke="#cbd5e1" strokeWidth="1.5" strokeLinecap="round"/>
    </svg>
  );
  if(c===45||c===48) return (
    <svg style={s} viewBox="0 0 24 24" fill="none">
      <line x1="3" y1="8" x2="21" y2="8" stroke="#94a3b8" strokeWidth="2" strokeLinecap="round"/>
      <line x1="5" y1="12" x2="19" y2="12" stroke="#94a3b8" strokeWidth="2" strokeLinecap="round"/>
      <line x1="3" y1="16" x2="21" y2="16" stroke="#94a3b8" strokeWidth="2" strokeLinecap="round"/>
    </svg>
  );
  if(c>=51&&c<=57) return (
    <svg style={s} viewBox="0 0 24 24" fill="none">
      <path d="M4 12c0-2.2 1.8-4 4-4 .5 0 1 .1 1.4.3.4-1.5 1.7-2.5 3.3-2.5 1.9 0 3.3 1.5 3.3 3.3s-1.5 3.3-3.3 3.3H5.4c-.8 0-1.4-.5-1.4-1.1V12z" fill="#94a3b8"/>
      <line x1="8" y1="17" x2="7.2" y2="20" stroke="#60a5fa" strokeWidth="1.8" strokeLinecap="round"/>
      <line x1="12" y1="16" x2="11.2" y2="19" stroke="#60a5fa" strokeWidth="1.8" strokeLinecap="round"/>
      <line x1="16" y1="17" x2="15.2" y2="20" stroke="#60a5fa" strokeWidth="1.8" strokeLinecap="round"/>
    </svg>
  );
  if((c>=61&&c<=67)||(c>=80&&c<=82)) return (
    <svg style={s} viewBox="0 0 24 24" fill="none">
      <path d="M3.5 11c0-2.2 1.8-4 4-4 .5 0 1 .1 1.5.3.4-1.5 1.7-2.6 3.3-2.6 1.9 0 3.4 1.5 3.4 3.4s-1.5 3.4-3.4 3.4H4.9c-.8 0-1.4-.5-1.4-1.1V11z" fill="#64748b"/>
      <line x1="7" y1="16" x2="6" y2="20" stroke="#60a5fa" strokeWidth="1.8" strokeLinecap="round"/>
      <line x1="11" y1="15" x2="10" y2="19" stroke="#60a5fa" strokeWidth="1.8" strokeLinecap="round"/>
      <line x1="15" y1="16" x2="14" y2="20" stroke="#60a5fa" strokeWidth="1.8" strokeLinecap="round"/>
    </svg>
  );
  if(c>=71&&c<=77) return (
    <svg style={s} viewBox="0 0 24 24" fill="none">
      <path d="M3.5 11c0-2.2 1.8-4 4-4 .5 0 1 .1 1.5.3.4-1.5 1.7-2.6 3.3-2.6 1.9 0 3.4 1.5 3.4 3.4s-1.5 3.4-3.4 3.4H4.9c-.8 0-1.4-.5-1.4-1.1V11z" fill="#94a3b8"/>
      <circle cx="7.5" cy="17" r="1.3" fill="#bfdbfe"/>
      <circle cx="12" cy="16" r="1.3" fill="#bfdbfe"/>
      <circle cx="16.5" cy="17" r="1.3" fill="#bfdbfe"/>
      <circle cx="10" cy="21" r="1" fill="#dbeafe"/>
      <circle cx="14.5" cy="21" r="1" fill="#dbeafe"/>
    </svg>
  );
  if(c>=95) return (
    <svg style={s} viewBox="0 0 24 24" fill="none">
      <path d="M3.5 10c0-2.2 1.8-4 4-4 .5 0 1 .1 1.5.3.4-1.5 1.7-2.6 3.3-2.6 1.9 0 3.4 1.5 3.4 3.4s-1.5 3.4-3.4 3.4H4.9c-.8 0-1.4-.5-1.4-1.1V10z" fill="#475569"/>
      <line x1="7" y1="14" x2="6.2" y2="17" stroke="#60a5fa" strokeWidth="1.5" strokeLinecap="round"/>
      <line x1="15" y1="14" x2="14.2" y2="17" stroke="#60a5fa" strokeWidth="1.5" strokeLinecap="round"/>
      <polyline points="12,13 10,18 13,18 11,23" stroke="#fbbf24" strokeWidth="2.2" strokeLinejoin="round" strokeLinecap="round" fill="none"/>
    </svg>
  );
  return (
    <svg style={s} viewBox="0 0 24 24" fill="none">
      <circle cx="12" cy="19" r="2.5" fill="#ef4444"/>
      <rect x="11" y="4" width="2" height="12" rx="1" fill="#94a3b8"/>
    </svg>
  );
}

const fmt12 = iso => { if(!iso) return "--"; const d=new Date(iso); let h=d.getHours(),m=d.getMinutes().toString().padStart(2,"0"); return `${h%12||12}:${m}${h>=12?"p":"a"}`; };
const fmtFull12 = iso => { if(!iso) return "--:--"; const d=new Date(iso); let h=d.getHours(),m=d.getMinutes().toString().padStart(2,"0"); return `${h%12||12}:${m} ${h>=12?"PM":"AM"}`; };
const fmtDate = d => d.toLocaleDateString("en-US",{weekday:"long",month:"long",day:"numeric"});
const fmtTime = d => { let h=d.getHours(),m=d.getMinutes().toString().padStart(2,"0"); return `${h%12||12}:${m} ${h>=12?"PM":"AM"}`; };
const isFamily = task => (task.labels||[]).some(l=>l.toLowerCase()==='family');

const fmtDue = dateStr => {
  if(!dateStr) return null;
  const d=new Date(dateStr+'T12:00:00'), t=new Date(); t.setHours(0,0,0,0);
  const tm=new Date(t); tm.setDate(t.getDate()+1);
  if(d<t)                          return {label:'Overdue',  color:'#ef4444'};
  if(d.toDateString()===t.toDateString())  return {label:'Today',    color:'#f59e0b'};
  if(d.toDateString()===tm.toDateString()) return {label:'Tomorrow', color:'#10b981'};
  return {label:d.toLocaleDateString('en-US',{weekday:'short',month:'short',day:'numeric'}), color:'#94a3b8'};
};

function useWide() {
  const [wide, setWide] = useState(()=>window.innerWidth >= 900);
  useEffect(()=>{
    const fn = ()=>setWide(window.innerWidth >= 900);
    window.addEventListener('resize', fn);
    return ()=>window.removeEventListener('resize', fn);
  }, []);
  return wide;
}

// ─── Design tokens ────────────────────────────────────────────────────────────
const GRAD = "linear-gradient(160deg,#ff9472 0%,#f2709c 30%,#a78bfa 65%,#38bdf8 100%)";
const CARD = { background:"rgba(255,255,255,0.95)", borderRadius:24, boxShadow:"0 2px 16px rgba(0,0,0,0.06)", border:"1px solid rgba(255,255,255,0.8)" };
const TOUCH_ROW = { minHeight:60, display:"flex", alignItems:"center", padding:"0 20px", borderBottom:"1px solid #f1f5f9", cursor:"pointer" };

// ─── Global state hook ────────────────────────────────────────────────────────
function useHub() {
  const [wx,    setWx]    = useState(null);
  const [sun,   setSun]   = useState(null);
  const [pts,   setPts]   = useState({rabia_points:0,clare_points:0});
  const [tasks, setTasks] = useState([]);
  const [projs, setProjs] = useState([]);
  const [evts,  setEvts]  = useState([]);
  const [authOk,setAuthOk]= useState(null);
  const [rwds,  setRwds]  = useState({rewards:[],redeemed:[]});
  const [users, setUsers] = useState([]);

  const loadWx   = useCallback(()=>fetch(`${API}/weather`).then(r=>r.json()).then(setWx).catch(()=>{}), []);
  const loadSun  = useCallback(()=>fetch(`${API}/sun`).then(r=>r.json()).then(setSun).catch(()=>{}), []);
  const loadPts  = useCallback(()=>fetch(`${API}/points`).then(r=>r.json()).then(setPts).catch(()=>{}), []);
  const loadRwds = useCallback(()=>fetch(`${API}/rewards`).then(r=>r.json()).then(setRwds).catch(()=>{}), []);
  const loadProjs= useCallback(()=>fetch(`${API}/projects`).then(r=>r.json()).then(d=>setProjs(Array.isArray(d)?d:[])).catch(()=>{}), []);
  const loadTasks= useCallback(()=>fetch(`${API}/tasks`).then(r=>r.json()).then(d=>setTasks(Array.isArray(d)?d:[])).catch(()=>{}), []);
  const loadUsers= useCallback(()=>fetch(`${API}/users`).then(r=>r.json()).then(d=>setUsers(Array.isArray(d)?d:[])).catch(()=>{}), []);
  const loadCal  = useCallback(async()=>{
    try {
      const r=await fetch(`${API}/calendar`);
      if(r.status===401){setAuthOk(false);return;}
      setEvts(await r.json()); setAuthOk(true);
    } catch{setAuthOk(false);}
  },[]);

  useEffect(()=>{
    loadWx(); loadSun(); loadPts(); loadRwds(); loadProjs(); loadTasks(); loadCal(); loadUsers();
    const t1=setInterval(loadWx,  600000);
    const t2=setInterval(loadSun, 600000);
    const t3=setInterval(loadTasks,30000);
    const t4=setInterval(loadCal,  60000);
    return()=>{clearInterval(t1);clearInterval(t2);clearInterval(t3);clearInterval(t4);};
  },[]);

  return { wx,sun,pts,setPts,tasks,setTasks,projs,evts,setEvts,authOk,rwds,setRwds,users, reload:{wx:loadWx,sun:loadSun,pts:loadPts,rwds:loadRwds,tasks:loadTasks,cal:loadCal,projs:loadProjs} };
}

// ─── Shared UI ────────────────────────────────────────────────────────────────
function Av({ person, size=48 }) {
  return <div style={{ width:size,height:size,borderRadius:"50%",background:person.color,display:"flex",alignItems:"center",justifyContent:"center",fontSize:size*0.38,fontWeight:800,color:"#fff",border:"3px solid rgba(255,255,255,0.85)",boxShadow:`0 2px 12px ${person.color}55`,flexShrink:0 }}>{person.initial}</div>;
}

function Pill({ label, color, bg }) {
  return <span style={{ fontSize:11,fontWeight:700,padding:"3px 10px",borderRadius:99,background:bg||color+"22",color:color,letterSpacing:0.3 }}>{label}</span>;
}

function StarBadge({ pts }) {
  const icon = pts>=500?"🏆":pts>=250?"🥇":pts>=100?"🌟":"✨";
  return <span style={{fontSize:14}}>{icon}</span>;
}

function ProgressRing({ pts, max=500, size=56, color }) {
  const r=22, circ=2*Math.PI*r, pct=Math.min(pts/max,1), dash=pct*circ;
  return (
    <svg width={size} height={size} viewBox="0 0 56 56">
      <circle cx="28" cy="28" r={r} fill="none" stroke={color+"22"} strokeWidth="5"/>
      <circle cx="28" cy="28" r={r} fill="none" stroke={color} strokeWidth="5"
        strokeDasharray={`${dash} ${circ}`} strokeLinecap="round"
        transform="rotate(-90 28 28)" style={{transition:"stroke-dasharray 0.6s ease"}}/>
      <text x="28" y="33" textAnchor="middle" fontSize="13" fontWeight="800" fill={color}>{pts}</text>
    </svg>
  );
}

// ─── HEADER ───────────────────────────────────────────────────────────────────
function Header({ wx, sun, pts, lightsOn, onToggleLights, onStartScreensaver, onOpenVoice }) {
  const [now, setNow] = useState(new Date());
  useEffect(()=>{ const t=setInterval(()=>setNow(new Date()),1000); return()=>clearInterval(t); },[]);
  const exitKiosk = () => fetch(`${API}/kiosk/exit`,{method:'POST'}).catch(()=>{});

  const cur  = wx?.current;
  const code = cur?.weather_code;
  const sunset = sun?.sunset;

  // ── Weather advisories (shown as slim strip in header) ────────────────────
  const _today2 = new Date(); _today2.setHours(0,0,0,0);
  const todayStr2 = _today2.toISOString().slice(0,10);
  const nowHourIso = new Date().toISOString().slice(0,13); // e.g. "2025-05-01T14"
  const fmtHour = t => { const d=new Date(t+':00'); return d.toLocaleTimeString('en-US',{hour:'numeric',hour12:true}); };

  const advisories2 = [];
  const uv2 = wx?.current?.uv_index ?? 0;
  if(uv2>=11) advisories2.push({icon:"🔥",msg:`Extreme UV (${uv2}) — avoid going outside midday, max SPF, full cover.`});
  else if(uv2>=8) advisories2.push({icon:"🕶️",msg:`Very high UV (${uv2}) — minimize time outdoors, SPF 50+.`});
  else if(uv2>=6) advisories2.push({icon:"🌞",msg:`High UV (${uv2}) — sunscreen and a hat before heading out.`});
  else if(uv2>=3) advisories2.push({icon:"🌤️",msg:`Moderate UV (${uv2}) — pop on some SPF before heading out.`});

  // Only look at remaining hours today (current hour onwards)
  const todayHrs2 = wx?.hourly?.time?.reduce((acc,t,i)=>{
    if(t.startsWith(todayStr2) && t.slice(0,13)>=nowHourIso)
      acc.push({time:t, prob:wx.hourly.precipitation_probability?.[i]??0, code:wx.hourly.weather_code?.[i]??0});
    return acc;
  },[]) ?? [];
  const maxRain2   = Math.max(0,...todayHrs2.map(h=>h.prob));
  const hasStorm2  = todayHrs2.some(h=>h.code>=95);
  const firstStorm = todayHrs2.find(h=>h.code>=95);
  const firstRain  = todayHrs2.find(h=>h.prob>=40);

  if(hasStorm2)        advisories2.push({icon:"⛈️", msg:`Thunderstorms from ${fmtHour(firstStorm.time)} — stay safe!`});
  else if(maxRain2>=70) advisories2.push({icon:"🌧️", msg:`Heavy rain from ${fmtHour(firstRain.time)} (${maxRain2}%) — grab your umbrella!`});
  else if(maxRain2>=40) advisories2.push({icon:"🌦️", msg:`Rain possible from ${fmtHour(firstRain.time)} (${maxRain2}%) — worth packing an umbrella.`});

  const windMph2 = wx?.current?.wind_speed_10m ?? 0;
  if(windMph2>=35) advisories2.push({icon:"🌬️",msg:`Very windy (${Math.round(windMph2)} mph) — hold onto your hat!`});

  return (
    <div style={{ background:GRAD, padding:"28px 28px 24px", flexShrink:0, position:"relative", overflow:"hidden" }}>
      <div style={{ position:"absolute",top:-60,right:-60,width:240,height:240,borderRadius:"50%",background:"rgba(255,255,255,0.07)" }}/>
      <div style={{ position:"absolute",bottom:-80,left:-50,width:260,height:260,borderRadius:"50%",background:"rgba(255,255,255,0.05)" }}/>
      <div style={{ position:"relative", zIndex:1 }}>
        {/* Top row: title + clock + kiosk buttons */}
        <div style={{ display:"flex", justifyContent:"space-between", alignItems:"flex-start", marginBottom:16 }}>
          <div>
            <div style={{ fontSize:12,fontWeight:700,color:"rgba(255,255,255,0.65)",letterSpacing:2,textTransform:"uppercase" }}>Clarabiner</div>
            <div style={{ fontSize:14,color:"rgba(255,255,255,0.75)",marginTop:2 }}>{fmtDate(now)}</div>
          </div>
          <div style={{display:"flex",alignItems:"center",gap:10}}>
            {/* Voice — first */}
            {onOpenVoice && (
              <button onClick={onOpenVoice} title="Voice assistant"
                style={{width:44,height:44,borderRadius:"50%",border:"none",background:"rgba(255,255,255,0.18)",cursor:"pointer",display:"flex",alignItems:"center",justifyContent:"center",transition:"background 0.2s"}}>
                <svg width="22" height="22" viewBox="0 0 24 24" fill="none">
                  <rect x="9" y="3" width="6" height="11" rx="3" stroke="rgba(255,255,255,0.85)" strokeWidth="1.8"/>
                  <path d="M5 10a7 7 0 0014 0" stroke="rgba(255,255,255,0.85)" strokeWidth="1.8" strokeLinecap="round"/>
                  <line x1="12" y1="19" x2="12" y2="22" stroke="rgba(255,255,255,0.85)" strokeWidth="1.8" strokeLinecap="round"/>
                  <line x1="8" y1="22" x2="16" y2="22" stroke="rgba(255,255,255,0.85)" strokeWidth="1.8" strokeLinecap="round"/>
                </svg>
              </button>
            )}
            {/* Lights */}
            {onToggleLights && (
              <button onClick={onToggleLights} title={lightsOn ? "Turn all lights off" : "Turn all lights on"}
                style={{width:44,height:44,borderRadius:"50%",border:"none",background:lightsOn?"rgba(255,237,100,0.35)":"rgba(255,255,255,0.18)",cursor:"pointer",display:"flex",alignItems:"center",justifyContent:"center",transition:"background 0.2s"}}>
                <svg width="22" height="22" viewBox="0 0 24 24" fill="none">
                  <path d="M9 21h6M12 3a6 6 0 016 6c0 2.22-1.2 4.16-3 5.2V17H9v-2.8C7.2 13.16 6 11.22 6 9a6 6 0 016-6z"
                    stroke={lightsOn ? "#fde68a" : "rgba(255,255,255,0.85)"} strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"
                    fill={lightsOn ? "rgba(253,230,138,0.4)" : "none"}/>
                </svg>
              </button>
            )}
            {/* Screensaver */}
            {onStartScreensaver && (
              <button onClick={onStartScreensaver} title="Start screensaver"
                style={{width:44,height:44,borderRadius:"50%",border:"none",background:"rgba(255,255,255,0.18)",cursor:"pointer",display:"flex",alignItems:"center",justifyContent:"center",transition:"background 0.2s"}}>
                <svg width="22" height="22" viewBox="0 0 24 24" fill="none">
                  <rect x="3" y="3" width="18" height="18" rx="3" stroke="rgba(255,255,255,0.85)" strokeWidth="1.8"/>
                  <circle cx="8.5" cy="8.5" r="1.5" stroke="rgba(255,255,255,0.85)" strokeWidth="1.5"/>
                  <path d="M3 15l5-5 4 4 3-3 6 6" stroke="rgba(255,255,255,0.85)" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round"/>
                </svg>
              </button>
            )}
            {/* Exit */}
            <button onClick={exitKiosk} title="Exit kiosk / close browser" style={{width:44,height:44,borderRadius:"50%",border:"none",background:"rgba(255,255,255,0.18)",color:"#fff",cursor:"pointer",display:"flex",alignItems:"center",justifyContent:"center"}}>
              <svg width="20" height="20" viewBox="0 0 24 24" fill="none"><path d="M9 21H5a2 2 0 01-2-2V5a2 2 0 012-2h4" stroke="white" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"/><polyline points="16 17 21 12 16 7" stroke="white" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"/><line x1="21" y1="12" x2="9" y2="12" stroke="white" strokeWidth="2" strokeLinecap="round"/></svg>
            </button>
            <div style={{ fontSize:52,fontWeight:200,color:"#fff",lineHeight:1,letterSpacing:-3 }}>{fmtTime(now)}</div>
          </div>
        </div>

        {/* Bottom row: weather + points + sunset */}
        <div style={{ display:"flex", gap:10, alignItems:"center" }}>
          {cur && (
            <div style={{ display:"flex",alignItems:"center",gap:8,background:"rgba(255,255,255,0.18)",backdropFilter:"blur(12px)",borderRadius:16,padding:"10px 16px",flex:1 }}>
              <WxIcon code={code} size={32}/>
              <div>
                <div style={{fontSize:22,fontWeight:700,color:"#fff",lineHeight:1}}>{Math.round(cur.temperature_2m)}°F</div>
                <div style={{fontSize:12,color:"rgba(255,255,255,0.8)"}}>{wxL(code)} · {Math.round(cur.wind_speed_10m)}mph</div>
              </div>
            </div>
          )}
          {sunset && (
            <div style={{ display:"flex",alignItems:"center",gap:8,background:"rgba(255,255,255,0.18)",backdropFilter:"blur(12px)",borderRadius:16,padding:"10px 16px" }}>
              <svg width="24" height="24" viewBox="0 0 24 24" fill="none"><circle cx="12" cy="11" r="4" fill="#fbbf24"/><line x1="12" y1="3" x2="12" y2="5" stroke="#fbbf24" strokeWidth="2" strokeLinecap="round"/><line x1="4.2" y1="4.2" x2="5.6" y2="5.6" stroke="#fbbf24" strokeWidth="2" strokeLinecap="round"/><line x1="19.8" y1="4.2" x2="18.4" y2="5.6" stroke="#fbbf24" strokeWidth="2" strokeLinecap="round"/><line x1="3" y1="11" x2="5" y2="11" stroke="#fbbf24" strokeWidth="2" strokeLinecap="round"/><line x1="21" y1="11" x2="19" y2="11" stroke="#fbbf24" strokeWidth="2" strokeLinecap="round"/><line x1="2" y1="18" x2="22" y2="18" stroke="rgba(255,255,255,0.5)" strokeWidth="1.5" strokeLinecap="round"/><path d="M7 18a5 5 0 0110 0" stroke="rgba(255,255,255,0.7)" strokeWidth="1.5" strokeLinecap="round" fill="none"/></svg>
              <div>
                <div style={{fontSize:13,fontWeight:700,color:"#fff"}}>{fmt12(sunset)}</div>
                <div style={{fontSize:11,color:"rgba(255,255,255,0.75)"}}>Sunset</div>
              </div>
            </div>
          )}
          <div style={{ display:"flex",gap:6 }}>
            <div style={{ textAlign:"center",background:"rgba(255,255,255,0.18)",borderRadius:16,padding:"8px 12px" }}>
              <div style={{fontSize:11,color:"rgba(255,255,255,0.7)",fontWeight:600}}>R</div>
              <div style={{fontSize:16,fontWeight:800,color:"#fff"}}>{pts?.rabia_points||0}</div>
              <div style={{fontSize:10,color:"rgba(255,255,255,0.6)"}}>pts</div>
            </div>
            <div style={{ textAlign:"center",background:"rgba(255,255,255,0.18)",borderRadius:16,padding:"8px 12px" }}>
              <div style={{fontSize:11,color:"rgba(255,255,255,0.7)",fontWeight:600}}>C</div>
              <div style={{fontSize:16,fontWeight:800,color:"#fff"}}>{pts?.clare_points||0}</div>
              <div style={{fontSize:10,color:"rgba(255,255,255,0.6)"}}>pts</div>
            </div>
          </div>
        </div>
        {/* Advisory strip — only shown when there are active advisories */}
        {advisories2.length>0 && (
          <div style={{marginTop:12,display:"flex",flexWrap:"wrap",gap:8}}>
            {advisories2.map((a,i)=>(
              <div key={i} style={{display:"flex",alignItems:"center",gap:6,background:"rgba(255,255,255,0.18)",backdropFilter:"blur(8px)",borderRadius:99,padding:"6px 14px"}}>
                <span style={{fontSize:16}}>{a.icon}</span>
                <span style={{fontSize:12,fontWeight:600,color:"#fff"}}>{a.msg}</span>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}

// ─── HOME DAILY TASK ROW ──────────────────────────────────────────────────────
function HomeDailyTaskRow({ task, onComplete, uidMap }) {
  const mapped = uidMap?.[task.responsible_uid] || "";
  const [assignee, setAssignee] = useState(mapped);
  const [done,     setDone]     = useState(false);
  useEffect(()=>{ if(mapped && !assignee) setAssignee(mapped); }, [mapped]);

  const family = isFamily(task);
  const complete = () => {
    const eff = family ? "family" : assignee;
    setDone(true); onComplete(task, eff, task.counts_for_reward);
  };
  const due = fmtDue(task.due?.date);

  return (
    <div style={{display:"flex",alignItems:"center",padding:"0 20px",minHeight:60,borderBottom:"1px solid #f8fafc",gap:14,opacity:done?0.35:1,transition:"opacity 0.3s"}}>
      <button onClick={complete}
        style={{width:24,height:24,borderRadius:"50%",border:"2px solid #10b981",background:"transparent",cursor:"pointer",flexShrink:0,display:"flex",alignItems:"center",justifyContent:"center"}}>
        {done && <div style={{width:9,height:9,borderRadius:"50%",background:"#10b981"}}/>}
      </button>
      <div style={{flex:1,minWidth:0}}>
        <div style={{fontSize:14,color:"#1e293b",fontWeight:500,textDecoration:done?"line-through":"none"}}>{task.content}</div>
        <div style={{display:"flex",gap:8,alignItems:"center",marginTop:2}}>
          {task.project_name && <span style={{fontSize:11,color:"#94a3b8"}}>{task.project_name}</span>}
          {due && <span style={{fontSize:11,fontWeight:700,color:due.color}}>{due.label}</span>}
        </div>
      </div>
      {task.counts_for_reward && <span style={{fontSize:10,color:"#10b981",fontWeight:700}}>+5⭐</span>}
      <div style={{display:"flex",gap:5,flexShrink:0,alignItems:"center"}}>
        {family && <span style={{width:28,height:28,borderRadius:"50%",background:"#6366f1",color:"#fff",fontWeight:800,fontSize:11,display:"flex",alignItems:"center",justifyContent:"center",flexShrink:0}}>F</span>}
        {[RABIA,CLARE].map(p=>(
          <button key={p.name} onClick={()=>!family&&setAssignee(a=>a===p.name.toLowerCase()?"":p.name.toLowerCase())}
            style={{width:28,height:28,borderRadius:"50%",border:`2px solid ${(family||assignee===p.name.toLowerCase())?p.color:"#e2e8f0"}`,background:(family||assignee===p.name.toLowerCase())?p.color:"#fff",color:(family||assignee===p.name.toLowerCase())?"#fff":"#94a3b8",fontWeight:800,fontSize:12,cursor:family?"default":"pointer",fontFamily:"inherit"}}>
            {p.initial}
          </button>
        ))}
      </div>
    </div>
  );
}

// ─── HOME TAB ─────────────────────────────────────────────────────────────────
function HomeTab({ evts, tasks, projs, pts, wx, authOk, onResetPts, onCompleteTask, onSetTab, wide, uidMap }) {
  const today = new Date(); today.setHours(0,0,0,0);
  const todayStr = today.toISOString().slice(0,10);

  const groceriesProj    = projs.find(p=>p.name.toLowerCase()==="groceries");
  const rabiaPersonalProj= projs.find(p=>p.name.toLowerCase()==="rabia's personal");
  const groceryTasks     = groceriesProj ? tasks.filter(t=>!t.checked && t.project_id===groceriesProj.id) : [];

  const todayEvts = evts.filter(e=>{
    const s=new Date(e.start); s.setHours(0,0,0,0);
    return s.getTime()===today.getTime();
  }).sort((a,b)=>{
    if(a.allDay&&!b.allDay) return -1; if(!a.allDay&&b.allDay) return 1;
    return new Date(a.start)-new Date(b.start);
  });
  const rabiaEvts = todayEvts.filter(e=>e.calendar==="Rabia");
  const clareEvts = todayEvts.filter(e=>e.calendar==="Clare");

  const nonGrocToday = tasks.filter(t=>!t.checked && t.due?.date===todayStr && t.project_id!==groceriesProj?.id);
  const rabiaTasks  = nonGrocToday.filter(t=>{ const a=uidMap?.[t.responsible_uid]; return a==="rabia"&&t.project_id!==rabiaPersonalProj?.id; });
  const clareTasks  = nonGrocToday.filter(t=>{ const a=uidMap?.[t.responsible_uid]; return a==="clare"; });
  const familyTasks = nonGrocToday.filter(t=>{ const a=uidMap?.[t.responsible_uid]; return isFamily(t)||(!a&&t.project_id!==rabiaPersonalProj?.id); });
  const rabiaPersonalTasks = rabiaPersonalProj ? tasks.filter(t=>!t.checked && t.project_id===rabiaPersonalProj.id && t.due?.date===todayStr) : [];

  const weekEnd = new Date(today); weekEnd.setDate(today.getDate()+6);
  const weekTasks = tasks.filter(t=>{
    if(!t.due?.date||t.checked) return false;
    if(t.project_id===groceriesProj?.id) return false;
    if(t.due?.is_recurring) return false;
    const d=new Date(t.due.date+'T12:00:00');
    return d>today && d<=weekEnd;
  }).sort((a,b)=>a.due.date.localeCompare(b.due.date));


  // ── Column builder ────────────────────────────────────────────────────────
  const CalIcon = ({color}) => (
    <svg width="14" height="14" viewBox="0 0 24 24" fill="none">
      <rect x="3" y="4" width="18" height="18" rx="3" stroke={color} strokeWidth="2"/>
      <line x1="8" y1="2" x2="8" y2="6" stroke={color} strokeWidth="2" strokeLinecap="round"/>
      <line x1="16" y1="2" x2="16" y2="6" stroke={color} strokeWidth="2" strokeLinecap="round"/>
      <line x1="3" y1="10" x2="21" y2="10" stroke={color} strokeWidth="1.5"/>
    </svg>
  );
  const TaskIcon = ({color}) => (
    <svg width="14" height="14" viewBox="0 0 24 24" fill="none">
      <rect x="3" y="3" width="18" height="18" rx="3" stroke={color} strokeWidth="2"/>
      <line x1="8" y1="9" x2="16" y2="9" stroke={color} strokeWidth="1.5"/>
      <line x1="8" y1="13" x2="13" y2="13" stroke={color} strokeWidth="1.5"/>
    </svg>
  );

  const makeCol = (person, myEvts, myTasks, personalTasks=[], growable=false) => {
    const pKey  = person.name.toLowerCase();
    const points= pts[`${pKey}_points`]||0;
    const next  = [100,250,500,750,1000].find(m=>m>points)||1000;
    const prog  = Math.round((points/next)*100);
    return (
      <div style={{display:"flex",flexDirection:"column",gap:12,...(growable?{height:"100%"}:{})}}>
        {/* Avatar + points */}
        <div style={{...CARD,overflow:"hidden"}}>
          <div style={{background:`linear-gradient(135deg,${person.color}22,${person.color}08)`,padding:"14px 16px",display:"flex",alignItems:"center",gap:12}}>
            <Av person={person} size={48}/>
            <div style={{flex:1,minWidth:0}}>
              <div style={{fontSize:17,fontWeight:800,color:"#1e293b"}}>{person.name}</div>
              <div style={{display:"flex",alignItems:"center",gap:6,marginTop:4}}>
                <div style={{flex:1,height:6,background:`${person.color}20`,borderRadius:99,overflow:"hidden"}}>
                  <div style={{height:"100%",width:`${prog}%`,background:person.color,borderRadius:99,transition:"width 0.5s"}}/>
                </div>
                <div style={{fontSize:11,fontWeight:700,color:person.color,whiteSpace:"nowrap"}}>{points} / {next} ⭐</div>
              </div>
            </div>
            <button onClick={()=>onResetPts(pKey)} style={{fontSize:10,padding:"3px 9px",borderRadius:99,border:`1px solid ${person.color}40`,background:"transparent",color:person.color,cursor:"pointer",fontFamily:"inherit"}}>reset</button>
          </div>
        </div>

        {/* Due today — shown near top so it's always visible */}
        {myTasks.length>0 && (
          <div style={{...CARD,overflow:"hidden"}}>
            <div style={{padding:"10px 14px",borderBottom:"1px solid #f1f5f9",background:"#fafafa",display:"flex",alignItems:"center",gap:8}}>
              <TaskIcon color={person.color}/>
              <div style={{fontSize:12,fontWeight:700,color:"#1e293b"}}>Due Today</div>
              <span style={{fontSize:11,color:"#94a3b8",marginLeft:2}}>{myTasks.length}</span>
            </div>
            {myTasks.map(t=><HomeDailyTaskRow key={t.id} task={t} onComplete={onCompleteTask} uidMap={uidMap}/>)}
          </div>
        )}

        {/* Personal project tasks */}
        {personalTasks.length>0 && (
          <div style={{...CARD,overflow:"hidden"}}>
            <div style={{padding:"10px 14px",borderBottom:"1px solid #f1f5f9",background:`linear-gradient(135deg,${person.color}10,${person.color}05)`,display:"flex",alignItems:"center",gap:8}}>
              <svg width="14" height="14" viewBox="0 0 24 24" fill="none"><circle cx="12" cy="8" r="4" stroke={person.color} strokeWidth="2"/><path d="M4 20c0-4 3.6-7 8-7s8 3 8 7" stroke={person.color} strokeWidth="2" strokeLinecap="round"/></svg>
              <div style={{fontSize:12,fontWeight:700,color:"#1e293b"}}>Personal</div>
              <span style={{fontSize:11,color:"#94a3b8",marginLeft:2}}>{personalTasks.length}</span>
            </div>
            {personalTasks.map(t=><HomeDailyTaskRow key={t.id} task={t} onComplete={onCompleteTask} uidMap={uidMap}/>)}
          </div>
        )}

        {/* Calendar events — grows to fill remaining column height */}
        <div style={{...CARD,overflow:"hidden",...(growable?{flex:1,display:"flex",flexDirection:"column",minHeight:0}:{})}}>
          <div style={{padding:"10px 14px",borderBottom:"1px solid #f1f5f9",background:"#fafafa",display:"flex",alignItems:"center",gap:8,flexShrink:0}}>
            <CalIcon color={person.color}/>
            <div style={{fontSize:12,fontWeight:700,color:"#1e293b"}}>Today</div>
            {authOk===false && <a href="/api/auth/google" target="_blank" rel="noreferrer" style={{fontSize:10,color:person.color,fontWeight:600,marginLeft:"auto"}}>Connect →</a>}
          </div>
          {growable
            ? <div style={{flex:1,overflowY:"auto",minHeight:60}}>
                {myEvts.length===0
                  ? <div style={{padding:"12px 14px",fontSize:12,color:"#94a3b8"}}>Nothing today</div>
                  : myEvts.map((e,i)=>(
                    <div key={e.id} style={{display:"flex",alignItems:"center",gap:8,padding:"9px 14px",borderBottom:i<myEvts.length-1?"1px solid #f8fafc":"none"}}>
                      <div style={{width:3,alignSelf:"stretch",minHeight:28,borderRadius:99,background:e.color,flexShrink:0}}/>
                      <div style={{flex:1,minWidth:0}}>
                        <div style={{fontSize:13,fontWeight:600,color:"#1e293b",overflow:"hidden",textOverflow:"ellipsis",whiteSpace:"nowrap"}}>{e.title}</div>
                        <div style={{fontSize:11,color:"#94a3b8"}}>{e.allDay?"All day":fmtFull12(e.start)}</div>
                      </div>
                    </div>
                  ))
                }
              </div>
            : <>
                {myEvts.length===0
                  ? <div style={{padding:"12px 14px",fontSize:12,color:"#94a3b8"}}>Nothing today</div>
                  : myEvts.map((e,i)=>(
                    <div key={e.id} style={{display:"flex",alignItems:"center",gap:8,padding:"9px 14px",borderBottom:i<myEvts.length-1?"1px solid #f8fafc":"none"}}>
                      <div style={{width:3,alignSelf:"stretch",minHeight:28,borderRadius:99,background:e.color,flexShrink:0}}/>
                      <div style={{flex:1,minWidth:0}}>
                        <div style={{fontSize:12,fontWeight:600,color:"#1e293b",overflow:"hidden",textOverflow:"ellipsis",whiteSpace:"nowrap"}}>{e.title}</div>
                        <div style={{fontSize:11,color:"#94a3b8"}}>{e.allDay?"All day":fmtFull12(e.start)}</div>
                      </div>
                    </div>
                  ))
                }
              </>
          }
        </div>
      </div>
    );
  };

  // ── Family column (narrow) ────────────────────────────────────────────────
  const familyCol = (
    <div style={{display:"flex",flexDirection:"column",gap:12}}>
      <div style={{...CARD,overflow:"hidden",border:"1px solid #a78bfa30"}}>
        <div style={{background:"linear-gradient(135deg,#6366f112,#a78bfa08)",padding:"14px 16px",display:"flex",alignItems:"center",gap:12}}>
          <div style={{width:48,height:48,borderRadius:"50%",background:"linear-gradient(135deg,#6366f1,#a78bfa)",display:"flex",alignItems:"center",justifyContent:"center",fontWeight:800,fontSize:18,color:"#fff",border:"3px solid rgba(255,255,255,0.85)",flexShrink:0}}>F</div>
          <div style={{fontSize:17,fontWeight:800,color:"#1e293b"}}>Family</div>
        </div>
      </div>
      {familyTasks.length>0 && (
        <div style={{...CARD,overflow:"hidden"}}>
          <div style={{padding:"10px 14px",borderBottom:"1px solid #f1f5f9",background:"#fafafa",display:"flex",alignItems:"center",gap:8}}>
            <TaskIcon color="#6366f1"/>
            <div style={{fontSize:12,fontWeight:700,color:"#1e293b"}}>Due Today</div>
            <span style={{fontSize:11,color:"#94a3b8",marginLeft:2}}>{familyTasks.length}</span>
          </div>
          {familyTasks.map(t=><HomeDailyTaskRow key={t.id} task={t} onComplete={onCompleteTask} uidMap={uidMap}/>)}
        </div>
      )}
      {familyTasks.length===0 && (
        <div style={{...CARD,padding:"16px",fontSize:12,color:"#94a3b8",textAlign:"center"}}>No family tasks today</div>
      )}
    </div>
  );

  // ── Family column (wide — includes groceries as growing card) ──────────────
  const familyWideCol = (
    <div style={{display:"flex",flexDirection:"column",gap:12,height:"100%"}}>
      <div style={{...CARD,overflow:"hidden",border:"1px solid #a78bfa30"}}>
        <div style={{background:"linear-gradient(135deg,#6366f112,#a78bfa08)",padding:"14px 16px",display:"flex",alignItems:"center",gap:12}}>
          <div style={{width:48,height:48,borderRadius:"50%",background:"linear-gradient(135deg,#6366f1,#a78bfa)",display:"flex",alignItems:"center",justifyContent:"center",fontWeight:800,fontSize:18,color:"#fff",border:"3px solid rgba(255,255,255,0.85)",flexShrink:0}}>F</div>
          <div style={{fontSize:17,fontWeight:800,color:"#1e293b"}}>Family</div>
        </div>
      </div>
      {familyTasks.length>0 && (
        <div style={{...CARD,overflow:"hidden"}}>
          <div style={{padding:"10px 14px",borderBottom:"1px solid #f1f5f9",background:"#fafafa",display:"flex",alignItems:"center",gap:8}}>
            <TaskIcon color="#6366f1"/>
            <div style={{fontSize:12,fontWeight:700,color:"#1e293b"}}>Due Today</div>
            <span style={{fontSize:11,color:"#94a3b8",marginLeft:2}}>{familyTasks.length}</span>
          </div>
          {familyTasks.map(t=><HomeDailyTaskRow key={t.id} task={t} onComplete={onCompleteTask} uidMap={uidMap}/>)}
        </div>
      )}
      {/* Groceries — grows to fill remaining column height */}
      <div style={{...CARD,overflow:"hidden",flex:1,display:"flex",flexDirection:"column",minHeight:0,border:"1px solid #bbf7d040"}}>
        <div style={{padding:"10px 16px",borderBottom:"1px solid #f0fdf4",background:"#f0fdf4",display:"flex",alignItems:"center",gap:8,flexShrink:0,justifyContent:"space-between"}}>
          <div style={{display:"flex",alignItems:"center",gap:8}}>
            <svg width="14" height="14" viewBox="0 0 24 24" fill="none"><path d="M6 2L3 6v14a2 2 0 002 2h14a2 2 0 002-2V6l-3-4z" stroke="#059669" strokeWidth="1.8" strokeLinejoin="round"/><line x1="3" y1="6" x2="21" y2="6" stroke="#059669" strokeWidth="1.8"/><path d="M16 10a4 4 0 01-8 0" stroke="#059669" strokeWidth="1.8" strokeLinecap="round"/></svg>
            <span style={{fontSize:12,fontWeight:700,color:"#059669"}}>Groceries</span>
            <span style={{fontSize:11,color:"#94a3b8"}}>{groceryTasks.length}</span>
          </div>
          <button onClick={()=>onSetTab("groceries")} style={{fontSize:11,padding:"4px 10px",borderRadius:99,border:"1px solid #059669",background:"transparent",color:"#059669",cursor:"pointer",fontFamily:"inherit",fontWeight:600}}>See all →</button>
        </div>
        <div style={{flex:1,overflowY:"auto",minHeight:60}}>
          {groceryTasks.length===0
            ? <div style={{padding:"14px 16px",fontSize:12,color:"#94a3b8"}}>All clear! 🛒</div>
            : groceryTasks.map((t,i)=>(
              <div key={t.id} style={{display:"flex",alignItems:"center",padding:"0 16px",minHeight:42,borderBottom:i<groceryTasks.length-1?"1px solid #f8fafc":"none",gap:10}}>
                <div style={{width:6,height:6,borderRadius:"50%",background:"#10b981",flexShrink:0}}/>
                <div style={{fontSize:13,color:"#1e293b"}}>{t.content}</div>
              </div>
            ))
          }
        </div>
      </div>
    </div>
  );

  // ── Bottom row ────────────────────────────────────────────────────────────
  const [weekOpen, setWeekOpen] = useState(true);

  const weekRabia  = weekTasks.filter(t=>{ const a=uidMap?.[t.responsible_uid]; return a==="rabia"||t.project_id===rabiaPersonalProj?.id; });
  const weekClare  = weekTasks.filter(t=>{ const a=uidMap?.[t.responsible_uid]; return a==="clare"; });
  const weekFamily = weekTasks.filter(t=>{ const a=uidMap?.[t.responsible_uid]; return isFamily(t)||(!a&&t.project_id!==rabiaPersonalProj?.id); });

  const WeekCol = ({person, tasks:wt, color}) => (
    <div style={{display:"flex",flexDirection:"column",gap:0,minWidth:0}}>
      <div style={{display:"flex",alignItems:"center",gap:6,padding:"8px 14px",borderBottom:"1px solid #f1f5f9",background:`${color}08`}}>
        {person
          ? <Av person={person} size={20}/>
          : <div style={{width:20,height:20,borderRadius:"50%",background:"linear-gradient(135deg,#6366f1,#a78bfa)",display:"flex",alignItems:"center",justifyContent:"center",fontSize:10,fontWeight:800,color:"#fff",flexShrink:0}}>F</div>
        }
        <span style={{fontSize:12,fontWeight:700,color:"#1e293b"}}>{person?.name||"Family"}</span>
        <span style={{fontSize:11,color:"#94a3b8",marginLeft:2}}>{wt.length}</span>
      </div>
      {wt.length===0
        ? <div style={{padding:"10px 14px",fontSize:12,color:"#94a3b8"}}>Nothing this week</div>
        : wt.map(t=>{
            const due=fmtDue(t.due?.date);
            return (
              <div key={t.id} style={{display:"flex",alignItems:"center",padding:"0 14px",minHeight:46,borderBottom:"1px solid #f8fafc",gap:10}}>
                <div style={{flex:1,minWidth:0}}>
                  <div style={{fontSize:12,color:"#1e293b",fontWeight:500,overflow:"hidden",textOverflow:"ellipsis",whiteSpace:"nowrap"}}>{t.content}</div>
                  {t.project_name && <div style={{fontSize:10,color:"#94a3b8"}}>{t.project_name}</div>}
                </div>
                {due && <span style={{fontSize:11,fontWeight:700,color:due.color,flexShrink:0,whiteSpace:"nowrap"}}>{due.label}</span>}
              </div>
            );
          })
      }
    </div>
  );

  const weekCard = (
    <div style={{...CARD,overflow:"hidden"}}>
      <div onClick={()=>setWeekOpen(v=>!v)} style={{padding:"14px 18px",background:"#fafafa",display:"flex",alignItems:"center",gap:10,cursor:"pointer",userSelect:"none"}}>
        <svg width="16" height="16" viewBox="0 0 24 24" fill="none"><rect x="3" y="4" width="18" height="18" rx="3" stroke="#6366f1" strokeWidth="1.8"/><line x1="8" y1="2" x2="8" y2="6" stroke="#6366f1" strokeWidth="1.8" strokeLinecap="round"/><line x1="16" y1="2" x2="16" y2="6" stroke="#6366f1" strokeWidth="1.8" strokeLinecap="round"/><line x1="3" y1="10" x2="21" y2="10" stroke="#6366f1" strokeWidth="1.5"/></svg>
        <div style={{fontSize:14,fontWeight:800,color:"#1e293b"}}>Upcoming This Week</div>
        <span style={{fontSize:12,fontWeight:600,color:"#94a3b8"}}>{weekTasks.length}</span>
        <svg style={{marginLeft:"auto",transform:weekOpen?"rotate(180deg)":"rotate(0deg)",transition:"transform 0.2s"}} width="16" height="16" viewBox="0 0 24 24" fill="none"><polyline points="6 9 12 15 18 9" stroke="#94a3b8" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"/></svg>
      </div>
      {weekOpen && (
        weekTasks.length===0
          ? <div style={{padding:"16px 18px",fontSize:13,color:"#94a3b8",borderTop:"1px solid #f1f5f9"}}>Nothing coming up this week</div>
          : <div style={{display:"grid",gridTemplateColumns:"1fr 1fr 1fr",borderTop:"1px solid #f1f5f9"}}>
              <WeekCol person={RABIA}  tasks={weekRabia}  color={RABIA.color}/>
              <div style={{borderLeft:"1px solid #f1f5f9"}}><WeekCol person={CLARE} tasks={weekClare} color={CLARE.color}/></div>
              <div style={{borderLeft:"1px solid #f1f5f9"}}><WeekCol person={null}  tasks={weekFamily} color="#6366f1"/></div>
            </div>
      )}
    </div>
  );

  const grocCard = groceriesProj ? (
    <div style={{...CARD,overflow:"hidden"}}>
      <div style={{padding:"14px 18px",borderBottom:"1px solid #f1f5f9",background:"#f0fdf4",display:"flex",justifyContent:"space-between",alignItems:"center"}}>
        <div style={{display:"flex",alignItems:"center",gap:10}}>
          <svg width="16" height="16" viewBox="0 0 24 24" fill="none"><path d="M6 2L3 6v14a2 2 0 002 2h14a2 2 0 002-2V6l-3-4z" stroke="#059669" strokeWidth="1.8" strokeLinejoin="round"/><line x1="3" y1="6" x2="21" y2="6" stroke="#059669" strokeWidth="1.8"/><path d="M16 10a4 4 0 01-8 0" stroke="#059669" strokeWidth="1.8" strokeLinecap="round"/></svg>
          <div style={{fontSize:14,fontWeight:800,color:"#059669"}}>Groceries</div>
          <span style={{fontSize:12,fontWeight:600,color:"#94a3b8"}}>{groceryTasks.length}</span>
        </div>
        <button onClick={()=>onSetTab("groceries")} style={{fontSize:12,padding:"6px 14px",borderRadius:99,border:"1px solid #059669",background:"transparent",color:"#059669",cursor:"pointer",fontFamily:"inherit",fontWeight:600}}>See all →</button>
      </div>
      {groceryTasks.length===0 && <div style={{padding:"14px 18px",fontSize:13,color:"#94a3b8"}}>All clear!</div>}
      {groceryTasks.slice(0,6).map((t,i)=>(
        <div key={t.id} style={{display:"flex",alignItems:"center",padding:"0 18px",minHeight:44,borderBottom:i<Math.min(groceryTasks.length,6)-1?"1px solid #f8fafc":"none",gap:10}}>
          <div style={{width:6,height:6,borderRadius:"50%",background:"#10b981",flexShrink:0}}/>
          <div style={{fontSize:13,color:"#1e293b"}}>{t.content}</div>
        </div>
      ))}
      {groceryTasks.length>6 && <div style={{padding:"10px 18px",fontSize:12,color:"#94a3b8"}}>+{groceryTasks.length-6} more</div>}
    </div>
  ) : null;

  return (
    <div style={{display:"flex",flexDirection:"column",gap:16}}>
      {makeCol(RABIA, rabiaEvts, rabiaTasks, rabiaPersonalTasks)}
      {makeCol(CLARE, clareEvts, clareTasks)}
      {familyCol}
      {grocCard}
    </div>
  );
}

// ─── TASKS TAB ────────────────────────────────────────────────────────────────
function TasksTab({ tasks, projs, pts, onComplete, onDelete, onAdd, reload, uidMap }) {
  const [adding, setAdding]   = useState(null); // project_id being added to
  const [newContent, setNewContent] = useState("");
  const [newDue,     setNewDue]     = useState("");
  const [assignee,   setAssignee]   = useState("rabia");

  const grouped = {};
  projs.forEach(p=>{ grouped[p.id]={ proj:p, tasks:[] }; });
  tasks.forEach(t=>{ if(grouped[t.project_id]) grouped[t.project_id].tasks.push(t); });

  const doAdd = async (projectId) => {
    if(!newContent.trim()) return;
    const body = { content:newContent, project_id:projectId };
    if(newDue) body.due_string=newDue;
    await onAdd(body);
    setNewContent(""); setNewDue(""); setAdding(null);
  };

  return (
    <div style={{display:"flex",flexDirection:"column",gap:14}}>
      {Object.values(grouped).map(({proj,tasks:pt})=>{
        const isReward = countsForReward(proj.name);
        const projColor = isReward ? "#10b981" : "#64748b";
        return (
          <div key={proj.id} style={{...CARD, overflow:"hidden"}}>
            {/* Project header */}
            <div style={{padding:"16px 20px",display:"flex",alignItems:"center",justifyContent:"space-between",borderBottom:"1px solid #f1f5f9",background:isReward?"#f0fdf4":"#fafafa"}}>
              <div style={{display:"flex",alignItems:"center",gap:10}}>
                <div style={{fontSize:13,fontWeight:800,color:projColor}}>{proj.name}</div>
                {isReward && <Pill label="+5⭐ per task" color="#10b981"/>}
                <span style={{fontSize:12,color:"#94a3b8",fontWeight:600}}>{pt.length} tasks</span>
              </div>
              <button onClick={()=>setAdding(adding===proj.id?null:proj.id)} style={{width:36,height:36,borderRadius:"50%",border:"none",background:projColor,color:"#fff",fontSize:20,cursor:"pointer",display:"flex",alignItems:"center",justifyContent:"center",lineHeight:1,fontFamily:"inherit"}}>+</button>
            </div>

            {/* Add row */}
            {adding===proj.id && (
              <div style={{padding:"12px 20px",background:"#f8fafc",borderBottom:"1px solid #f1f5f9",display:"flex",flexDirection:"column",gap:10}}>
                <input autoFocus value={newContent} onChange={e=>setNewContent(e.target.value)} onKeyDown={e=>e.key==="Enter"&&doAdd(proj.id)}
                  placeholder="Task name…" style={{padding:"12px 16px",borderRadius:14,border:"1.5px solid #e2e8f0",fontSize:15,fontFamily:"inherit",outline:"none",background:"#fff",color:"#1e293b"}}/>
                <div style={{display:"flex",gap:8}}>
                  <input value={newDue} onChange={e=>setNewDue(e.target.value)} placeholder="Due (e.g. tomorrow)" style={{flex:1,padding:"10px 14px",borderRadius:14,border:"1.5px solid #e2e8f0",fontSize:13,fontFamily:"inherit",outline:"none",background:"#fff",color:"#1e293b"}}/>
                  <div style={{display:"flex",gap:6}}>
                    {[RABIA,CLARE].map(p=>(
                      <button key={p.name} onClick={()=>setAssignee(p.name.toLowerCase())} style={{width:40,height:40,borderRadius:"50%",border:`3px solid ${assignee===p.name.toLowerCase()?p.color:"#e2e8f0"}`,background:assignee===p.name.toLowerCase()?p.color:"#fff",color:assignee===p.name.toLowerCase()?"#fff":p.color,fontWeight:800,fontSize:14,cursor:"pointer",fontFamily:"inherit"}}>{p.initial}</button>
                    ))}
                  </div>
                  <button onClick={()=>doAdd(proj.id)} style={{padding:"10px 20px",borderRadius:14,border:"none",background:projColor,color:"#fff",fontWeight:700,fontSize:14,cursor:"pointer",fontFamily:"inherit"}}>Add</button>
                  <button onClick={()=>setAdding(null)} style={{padding:"10px 16px",borderRadius:14,border:"1px solid #e2e8f0",background:"#fff",color:"#64748b",fontSize:14,cursor:"pointer",fontFamily:"inherit"}}>✕</button>
                </div>
              </div>
            )}

            {/* Task rows */}
            {pt.length===0 && (
              <div style={{padding:"20px",textAlign:"center",color:"#94a3b8",fontSize:14}}>No tasks — tap + to add one</div>
            )}
            {pt.map(t=>(
              <TaskRow key={t.id} task={t} projColor={projColor} isReward={isReward} onComplete={onComplete} onDelete={onDelete} uidMap={uidMap}/>
            ))}
          </div>
        );
      })}

      {projs.length===0 && (
        <div style={{...CARD,padding:"32px 24px",textAlign:"center",color:"#94a3b8",fontSize:15}}>Loading projects from Todoist…</div>
      )}
    </div>
  );
}

function TaskRow({ task, projColor, isReward, onComplete, onDelete, uidMap }) {
  const mapped = uidMap?.[task.responsible_uid] || "";
  const [assignee, setAssignee] = useState(mapped);
  const [done, setDone] = useState(false);
  useEffect(()=>{ if(mapped && !assignee) setAssignee(mapped); }, [mapped]);

  const family = isFamily(task);
  const complete = () => {
    const eff = family ? "family" : assignee;
    setDone(true); onComplete(task, eff, isReward);
  };
  const due = fmtDue(task.due?.date);

  return (
    <div style={{display:"flex",alignItems:"center",padding:"0 20px",minHeight:60,borderBottom:"1px solid #f8fafc",gap:14,opacity:done?0.35:1,transition:"opacity 0.3s"}}>
      <button onClick={complete} style={{width:26,height:26,borderRadius:"50%",border:`2.5px solid ${projColor}`,background:"transparent",cursor:"pointer",flexShrink:0,display:"flex",alignItems:"center",justifyContent:"center",transition:"all 0.15s"}}>
        {done && <div style={{width:10,height:10,borderRadius:"50%",background:projColor}}/>}
      </button>
      <div style={{flex:1,minWidth:0}}>
        <div style={{fontSize:15,color:"#1e293b",fontWeight:500,textDecoration:done?"line-through":"none",overflow:"hidden",textOverflow:"ellipsis",whiteSpace:"nowrap"}}>{task.content}</div>
        {due && <span style={{fontSize:11,fontWeight:700,color:due.color}}>{due.label}</span>}
      </div>
      {isReward && <span style={{fontSize:11,color:"#10b981",fontWeight:700,flexShrink:0}}>+5⭐</span>}
      <div style={{display:"flex",gap:5,flexShrink:0,alignItems:"center"}}>
        {family && <span style={{width:28,height:28,borderRadius:"50%",background:"#6366f1",color:"#fff",fontWeight:800,fontSize:11,display:"flex",alignItems:"center",justifyContent:"center",flexShrink:0}}>F</span>}
        {[RABIA,CLARE].map(p=>(
          <button key={p.name} onClick={()=>!family&&setAssignee(a=>a===p.name.toLowerCase()?"":p.name.toLowerCase())} style={{width:28,height:28,borderRadius:"50%",border:`2px solid ${(family||assignee===p.name.toLowerCase())?p.color:"#e2e8f0"}`,background:(family||assignee===p.name.toLowerCase())?p.color:"#fff",color:(family||assignee===p.name.toLowerCase())?"#fff":"#94a3b8",fontWeight:800,fontSize:12,cursor:family?"default":"pointer",fontFamily:"inherit"}}>{p.initial}</button>
        ))}
        <button onClick={()=>onDelete(task)} style={{width:28,height:28,borderRadius:"50%",border:"1px solid #fee2e2",background:"#fff5f5",color:"#ef4444",fontSize:14,cursor:"pointer",fontFamily:"inherit"}}>×</button>
      </div>
    </div>
  );
}

// ─── CALENDAR TAB ─────────────────────────────────────────────────────────────
function CalendarTab({ evts, authOk, reload }) {
  const [showAdd, setShowAdd] = useState(false);
  const [form, setForm]       = useState({ title:"", date:"", startTime:"", endTime:"", who:"rabia" });
  const [saving, setSaving]   = useState(false);

  const today = new Date(); today.setHours(0,0,0,0);
  const days  = Array.from({length:7},(_,i)=>{ const d=new Date(today); d.setDate(today.getDate()+i); return d; });
  const DAY   = ["Sun","Mon","Tue","Wed","Thu","Fri","Sat"];
  const HOURS = [7,8,9,10,11,12,13,14,15,16,17,18,19,20];

  const evtsAt = (day,hr) => evts.filter(e=>{
    if(e.allDay) return false;
    const s=new Date(e.start); return s.getFullYear()===day.getFullYear()&&s.getMonth()===day.getMonth()&&s.getDate()===day.getDate()&&s.getHours()===hr;
  });
  const allDay = (day) => evts.filter(e=>{
    if(!e.allDay) return false;
    const s=new Date(e.start); s.setHours(0,0,0,0); return s.getTime()===day.getTime();
  });
  const isToday = d=>{ const n=new Date(); n.setHours(0,0,0,0); return d.getTime()===n.getTime(); };

  const addEvent = async () => {
    if(!form.title||!form.date) return;
    setSaving(true);
    const calId = form.who==="rabia" ? process.env.REACT_APP_CAL_RABIA||"" : process.env.REACT_APP_CAL_CLARE||"";
    // We use a simple approach: post to server with calendarId from env
    const person = form.who==="rabia"?RABIA:CLARE;
    const calendarId = form.who==="rabia"?(window._CAL_RABIA||""):( window._CAL_CLARE||"");
    const body = {
      calendarId: calendarId||form.who+"@gmail.com",
      summary: form.title,
      start: form.startTime ? `${form.date}T${form.startTime}:00` : form.date,
      end:   form.endTime   ? `${form.date}T${form.endTime}:00`   : form.date,
      allDay: !form.startTime,
    };
    await fetch(`${API}/calendar`,{method:"POST",headers:{"Content-Type":"application/json"},body:JSON.stringify(body)});
    setForm({title:"",date:"",startTime:"",endTime:"",who:"rabia"});
    setShowAdd(false); setSaving(false); reload.cal();
  };

  const deleteEvent = async (e) => {
    if(!window.confirm(`Delete "${e.title}"?`)) return;
    await fetch(`${API}/calendar/${encodeURIComponent(e.calendarId)}/${e.id}`,{method:"DELETE"});
    reload.cal();
  };

  return (
    <div style={{display:"flex",flexDirection:"column",gap:14}}>

      {authOk===false && (
        <div style={{...CARD,padding:"18px 22px",display:"flex",justifyContent:"space-between",alignItems:"center",background:"#fffbeb",border:"1.5px solid #fde68a"}}>
          <div style={{fontSize:14,fontWeight:600,color:"#92400e"}}>Connect Google Calendar to see events</div>
          <a href="/api/auth/google" target="_blank" rel="noreferrer" style={{padding:"10px 18px",background:"#f59e0b",color:"#fff",borderRadius:14,fontWeight:700,fontSize:14,textDecoration:"none"}}>Connect →</a>
        </div>
      )}

      {/* Add event button */}
      <button onClick={()=>setShowAdd(v=>!v)} style={{padding:"16px",borderRadius:20,border:"2px dashed #e2e8f0",background:"transparent",color:"#64748b",fontSize:15,fontWeight:600,cursor:"pointer",fontFamily:"inherit"}}>
        {showAdd?"✕ Cancel":"+ Add event"}
      </button>

      {/* Add event form */}
      {showAdd && (
        <div style={{...CARD,padding:"20px"}}>
          <div style={{display:"flex",flexDirection:"column",gap:12}}>
            <input value={form.title} onChange={e=>setForm(f=>({...f,title:e.target.value}))} placeholder="Event title" style={{padding:"14px 18px",borderRadius:16,border:"1.5px solid #e2e8f0",fontSize:15,fontFamily:"inherit",outline:"none",color:"#1e293b"}}/>
            <input type="date" value={form.date} onChange={e=>setForm(f=>({...f,date:e.target.value}))} style={{padding:"14px 18px",borderRadius:16,border:"1.5px solid #e2e8f0",fontSize:15,fontFamily:"inherit",outline:"none",color:"#1e293b"}}/>
            <div style={{display:"flex",gap:10}}>
              <input type="time" value={form.startTime} onChange={e=>setForm(f=>({...f,startTime:e.target.value}))} style={{flex:1,padding:"12px 14px",borderRadius:14,border:"1.5px solid #e2e8f0",fontSize:14,fontFamily:"inherit",outline:"none",color:"#1e293b"}}/>
              <input type="time" value={form.endTime}   onChange={e=>setForm(f=>({...f,endTime:e.target.value}))}   style={{flex:1,padding:"12px 14px",borderRadius:14,border:"1.5px solid #e2e8f0",fontSize:14,fontFamily:"inherit",outline:"none",color:"#1e293b"}}/>
            </div>
            <div style={{display:"flex",gap:10}}>
              {[RABIA,CLARE].map(p=>(
                <button key={p.name} onClick={()=>setForm(f=>({...f,who:p.name.toLowerCase()}))} style={{flex:1,padding:"12px",borderRadius:14,border:`2px solid ${form.who===p.name.toLowerCase()?p.color:"#e2e8f0"}`,background:form.who===p.name.toLowerCase()?p.color+"15":"#fff",color:form.who===p.name.toLowerCase()?p.color:"#64748b",fontWeight:700,fontSize:14,cursor:"pointer",fontFamily:"inherit",display:"flex",alignItems:"center",justifyContent:"center",gap:8}}>
                  <Av person={p} size={28}/>{p.name}
                </button>
              ))}
            </div>
            <button onClick={addEvent} disabled={saving} style={{padding:"14px",borderRadius:16,border:"none",background:"linear-gradient(135deg,#f2709c,#38bdf8)",color:"#fff",fontWeight:700,fontSize:15,cursor:"pointer",fontFamily:"inherit"}}>
              {saving?"Saving…":"Save event"}
            </button>
          </div>
        </div>
      )}

      {/* Legend */}
      <div style={{display:"flex",gap:12,paddingLeft:4}}>
        {[RABIA,CLARE].map(p=>(
          <div key={p.name} style={{display:"flex",alignItems:"center",gap:6,fontSize:13,fontWeight:600,color:"#64748b"}}>
            <div style={{width:10,height:10,borderRadius:"50%",background:p.color}}/>{p.name}
          </div>
        ))}
      </div>

      {/* Calendar grid */}
      <div style={{...CARD,overflow:"hidden"}}>
        {/* Day headers */}
        <div style={{display:"grid",gridTemplateColumns:"44px repeat(7,1fr)",borderBottom:"1px solid #f1f5f9",background:"#fafafa"}}>
          <div/>
          {days.map((d,i)=>(
            <div key={i} style={{textAlign:"center",padding:"10px 0"}}>
              <div style={{fontSize:11,color:"#94a3b8",fontWeight:700}}>{DAY[d.getDay()]}</div>
              <div style={{fontSize:17,fontWeight:800,lineHeight:1.3,color:isToday(d)?"#fff":"#1e293b",background:isToday(d)?"linear-gradient(135deg,#f2709c,#38bdf8)":"transparent",borderRadius:"50%",width:32,height:32,display:"flex",alignItems:"center",justifyContent:"center",margin:"3px auto 0"}}>{d.getDate()}</div>
            </div>
          ))}
        </div>

        {/* All-day */}
        {days.some(d=>allDay(d).length>0) && (
          <div style={{display:"grid",gridTemplateColumns:"44px repeat(7,1fr)",borderBottom:"1px solid #f1f5f9",background:"#fafafa",minHeight:32}}>
            <div style={{fontSize:9,color:"#94a3b8",padding:"8px 4px 0",textAlign:"right"}}>all</div>
            {days.map((d,i)=>(
              <div key={i} style={{padding:"3px 2px"}}>
                {allDay(d).map(e=>(
                  <div key={e.id} onClick={()=>deleteEvent(e)} style={{background:e.color+"28",borderLeft:`3px solid ${e.color}`,borderRadius:4,padding:"3px 5px",fontSize:10,fontWeight:700,color:e.color,whiteSpace:"normal",wordBreak:"break-word",lineHeight:1.3,cursor:"pointer",marginBottom:1}}>{e.title}</div>
                ))}
              </div>
            ))}
          </div>
        )}

        {/* Hourly grid */}
        <div style={{overflowY:"scroll",maxHeight:560,WebkitOverflowScrolling:"touch",touchAction:"pan-y"}}>
          {HOURS.map(h=>(
            <div key={h} style={{display:"grid",gridTemplateColumns:"44px repeat(7,1fr)",minHeight:80,borderBottom:"1px solid #f8fafc"}}>
              <div style={{fontSize:10,color:"#cbd5e1",padding:"6px 6px 0",textAlign:"right",flexShrink:0}}>{h===12?"12p":h>12?`${h-12}p`:`${h}a`}</div>
              {days.map((d,di)=>(
                <div key={di} style={{borderLeft:isToday(d)?"2px solid #38bdf830":"1px solid #f1f5f9",padding:"3px 2px",minWidth:0}}>
                  {evtsAt(d,h).map(e=>(
                    <div key={e.id} onClick={()=>deleteEvent(e)} style={{background:e.color+"22",borderLeft:`3px solid ${e.color}`,borderRadius:5,padding:"4px 5px",fontSize:11,fontWeight:700,color:e.color,whiteSpace:"normal",wordBreak:"break-word",lineHeight:1.35,cursor:"pointer",marginBottom:2}}>{e.title}<div style={{fontSize:10,fontWeight:400,opacity:0.8,marginTop:1}}>{fmt12(e.start)}–{fmt12(e.end)}</div></div>
                  ))}
                </div>
              ))}
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}

// ─── WEATHER TAB ──────────────────────────────────────────────────────────────
function WeatherTab({ wx, sun }) {
  const [selDay, setSelDay] = useState(null);
  const [now,setNow]=useState(new Date());
  useEffect(()=>{ const t=setInterval(()=>setNow(new Date()),60000); return()=>clearInterval(t); },[]);
  if(!wx?.current) return <div style={{...CARD,padding:32,textAlign:"center",color:"#94a3b8"}}>Loading weather…</div>;
  const cur=wx.current, daily=wx.daily, hourly=wx.hourly, code=cur.weather_code;

  const hourlyForDay = (dateStr) => {
    if(!hourly?.time) return [];
    return hourly.time.reduce((acc,t,i)=>{
      if(t.startsWith(dateStr)) acc.push({
        time:t, h:parseInt(t.slice(11,13)),
        temp:hourly.temperature_2m[i],
        precip_prob:hourly.precipitation_probability[i]||0,
        precip:hourly.precipitation[i]||0,
        code:hourly.weather_code[i],
      });
      return acc;
    },[]);
  };

  const selDateStr = selDay!==null ? daily?.time?.[selDay] : null;
  const selHours   = selDateStr ? hourlyForDay(selDateStr) : [];

  return (
    <div style={{display:"flex",flexDirection:"column",gap:14}}>
      <div style={{borderRadius:24,padding:"32px 28px 26px",background:"linear-gradient(145deg,#0ea5e9,#6366f1)",color:"#fff",position:"relative",overflow:"hidden",boxShadow:"0 8px 32px rgba(14,165,233,0.3)"}}>
        <div style={{position:"absolute",top:-20,right:-20,opacity:0.12}}><WxIcon code={code} size={130}/></div>
        <div style={{fontSize:12,fontWeight:700,letterSpacing:2,textTransform:"uppercase",opacity:0.7,marginBottom:8}}>{wx.city}</div>
        <div style={{fontSize:80,fontWeight:200,lineHeight:1}}>{Math.round(cur.temperature_2m)}°</div>
        <div style={{fontSize:20,opacity:0.9,marginTop:6}}>{wxL(code)}</div>
        <div style={{fontSize:15,opacity:0.65,marginTop:4}}>Feels like {Math.round(cur.apparent_temperature)}° · UV {cur.uv_index}</div>
        <div style={{display:"flex",gap:28,marginTop:24}}>
          {[["Humidity",cur.relative_humidity_2m+"%"],["Wind",Math.round(cur.wind_speed_10m)+" mph"]].map(([l,v])=>(
            <div key={l}><div style={{fontSize:11,opacity:0.6,textTransform:"uppercase",letterSpacing:1}}>{l}</div><div style={{fontSize:22,fontWeight:700}}>{v}</div></div>
          ))}
        </div>
      </div>
      <div style={{...CARD,padding:"20px"}}>
        <div style={{fontSize:12,fontWeight:700,color:"#94a3b8",letterSpacing:1,textTransform:"uppercase",marginBottom:16}}>7-day forecast — tap a day for hourly detail</div>
        <div style={{display:"flex",gap:10,overflowX:"auto",paddingBottom:4}}>
          {(daily?.time||[]).map((date,i)=>{
            const d=new Date(date+'T12:00:00'),isT=i===0,isSel=selDay===i;
            return (
              <div key={i} onClick={()=>setSelDay(v=>v===i?null:i)}
                style={{flex:"0 0 auto",width:88,textAlign:"center",background:isSel?"#e0f2fe":isT?"#eff6ff":"#f8fafc",border:isSel?"2px solid #0ea5e9":isT?"2px solid #38bdf850":"1px solid #f1f5f9",borderRadius:18,padding:"14px 8px",cursor:"pointer",transition:"all 0.15s"}}>
                <div style={{fontSize:11,fontWeight:700,color:isSel?"#0ea5e9":isT?"#0ea5e9":"#94a3b8",marginBottom:6}}>{isT?"Today":d.toLocaleDateString("en",{weekday:"short"})}</div>
                <div style={{marginBottom:8,display:"flex",justifyContent:"center"}}><WxIcon code={daily.weather_code[i]} size={30}/></div>
                <div style={{fontSize:15,fontWeight:800,color:"#1e293b"}}>{Math.round(daily.temperature_2m_max[i])}°</div>
                <div style={{fontSize:12,color:"#94a3b8"}}>{Math.round(daily.temperature_2m_min[i])}°</div>
                {(daily.precipitation_probability_max[i]||0)>20 && <div style={{fontSize:11,color:"#38bdf8",marginTop:4}}>💧{daily.precipitation_probability_max[i]}%</div>}
                <div style={{fontSize:10,color:isSel?"#0ea5e9":"#cbd5e1",marginTop:6}}>{isSel?"▲ hide":"▼ detail"}</div>
              </div>
            );
          })}
        </div>

        {/* Hourly detail panel */}
        {selDay!==null && selHours.length>0 && (
          <div style={{marginTop:18,borderTop:"1px solid #e2e8f0",paddingTop:16}}>
            <div style={{fontSize:12,fontWeight:700,color:"#94a3b8",letterSpacing:1,textTransform:"uppercase",marginBottom:12}}>
              {selDateStr ? new Date(selDateStr+'T12:00').toLocaleDateString("en-US",{weekday:"long",month:"short",day:"numeric"}) : "Hourly"} — hour by hour
            </div>
            <div style={{display:"flex",flexDirection:"column",gap:2}}>
              {selHours.filter(hh=>hh.h>=6&&hh.h<=23).map(hh=>(
                <div key={hh.time} style={{display:"flex",alignItems:"center",gap:12,padding:"8px 12px",borderRadius:12,background:hh.precip_prob>60?"#e0f2fe":hh.precip_prob>30?"#f0f9ff":"transparent",minHeight:44}}>
                  <div style={{width:48,fontSize:12,fontWeight:700,color:"#64748b",flexShrink:0}}>{hh.h===12?"12pm":hh.h>12?`${hh.h-12}pm`:`${hh.h}am`}</div>
                  <WxIcon code={hh.code} size={24}/>
                  <div style={{flex:1}}>
                    <div style={{fontSize:13,color:"#64748b"}}>{wxL(hh.code)}</div>
                  </div>
                  <div style={{fontSize:16,fontWeight:800,color:"#1e293b",flexShrink:0}}>{Math.round(hh.temp)}°</div>
                  {hh.precip_prob>10 && (
                    <div style={{display:"flex",alignItems:"center",gap:4,flexShrink:0}}>
                      <svg width="14" height="14" viewBox="0 0 24 24" fill="none"><path d="M12 2C12 2 5 10 5 15a7 7 0 0014 0C19 10 12 2 12 2z" fill="#60a5fa" opacity="0.8"/></svg>
                      <div style={{textAlign:"right"}}>
                        <div style={{fontSize:12,fontWeight:700,color:"#38bdf8"}}>{hh.precip_prob}%</div>
                        {hh.precip>0&&<div style={{fontSize:10,color:"#94a3b8"}}>{hh.precip.toFixed(1)}mm</div>}
                      </div>
                    </div>
                  )}
                </div>
              ))}
            </div>
          </div>
        )}
      </div>

      {/* ── Sun arc ── */}
      {sun && (()=>{
        const rise=new Date(sun.sunrise), set=new Date(sun.sunset);
        const frac=Math.max(0,Math.min((now-rise)/(set-rise),1));
        const dlMs=set-rise, dlH=Math.floor(dlMs/3600000), dlM=Math.floor((dlMs%3600000)/60000);
        const W=320,H=150,R=120,scx=W/2,scy=H-12;
        const sunX=scx-R*Math.cos(Math.PI*frac), sunY=scy-R*Math.sin(Math.PI*frac);
        return (
          <div style={{...CARD,padding:"24px 24px 20px"}}>
            <div style={{fontSize:12,fontWeight:700,color:"#94a3b8",letterSpacing:1,textTransform:"uppercase",marginBottom:16}}>Sun · today</div>
            <div style={{display:"flex",justifyContent:"center"}}>
              <svg width={W} height={H} viewBox={`0 0 ${W} ${H}`}>
                <defs><linearGradient id="ag" x1="0" y1="0" x2="1" y2="0"><stop offset="0%" stopColor="#f2709c"/><stop offset="50%" stopColor="#fbbf24"/><stop offset="100%" stopColor="#f97316"/></linearGradient></defs>
                <path d={`M ${scx-R},${scy} A ${R},${R} 0 0,1 ${scx+R},${scy}`} fill="none" stroke="#f1f5f9" strokeWidth="4" strokeDasharray="5 3"/>
                {frac>0.01&&<path d={`M ${scx-R},${scy} A ${R},${R} 0 0,1 ${sunX.toFixed(1)},${sunY.toFixed(1)}`} fill="none" stroke="url(#ag)" strokeWidth="4" strokeLinecap="round"/>}
                <line x1={scx-R-10} y1={scy} x2={scx+R+10} y2={scy} stroke="#e2e8f0" strokeWidth="1"/>
                <circle cx={sunX.toFixed(1)} cy={sunY.toFixed(1)} r="12" fill="#fbbf24"/>
                <circle cx={sunX.toFixed(1)} cy={sunY.toFixed(1)} r="6" fill="#fef3c7"/>
                {[0,45,90,135,180,225,270,315].map(a=>{const r2=a*Math.PI/180;return<line key={a} x1={sunX+15*Math.cos(r2)} y1={sunY+15*Math.sin(r2)} x2={sunX+21*Math.cos(r2)} y2={sunY+21*Math.sin(r2)} stroke="#fbbf24" strokeWidth="1.5" strokeLinecap="round" opacity="0.5"/>;})}
              </svg>
            </div>
            <div style={{display:"flex",justifyContent:"space-between",marginTop:8}}>
              <div><div style={{fontSize:20,fontWeight:800,color:"#f97316"}}>{fmtFull12(sun.sunrise)}</div><div style={{fontSize:12,color:"#94a3b8"}}>Sunrise</div></div>
              <div style={{textAlign:"center"}}><div style={{fontSize:20,fontWeight:800,color:"#1e293b"}}>{dlH}h {dlM}m</div><div style={{fontSize:12,color:"#94a3b8"}}>Daylight</div></div>
              <div style={{textAlign:"right"}}><div style={{fontSize:20,fontWeight:800,color:"#6366f1"}}>{fmtFull12(sun.sunset)}</div><div style={{fontSize:12,color:"#94a3b8"}}>Sunset</div></div>
            </div>
          </div>
        );
      })()}

      {/* ── Golden hour ── */}
      {sun && (
        <div style={{background:"linear-gradient(135deg,#fef3c7,#fed7aa)",borderRadius:22,padding:"20px 24px",boxShadow:"0 4px 16px rgba(251,191,36,0.2)"}}>
          <div style={{fontSize:12,fontWeight:700,color:"#92400e",letterSpacing:1,textTransform:"uppercase",marginBottom:12}}>Golden hour</div>
          <div style={{display:"flex",justifyContent:"space-between",alignItems:"center"}}>
            <div><div style={{fontSize:12,color:"#b45309"}}>Morning</div><div style={{fontSize:18,fontWeight:800,color:"#92400e"}}>{fmtFull12(sun.sunrise)}</div></div>
            <svg width="44" height="44" viewBox="0 0 24 24" fill="none"><circle cx="12" cy="10" r="4" fill="#f59e0b"/><line x1="12" y1="2" x2="12" y2="4.5" stroke="#f59e0b" strokeWidth="2" strokeLinecap="round"/><line x1="4.2" y1="4.2" x2="5.9" y2="5.9" stroke="#f59e0b" strokeWidth="1.8" strokeLinecap="round"/><line x1="19.8" y1="4.2" x2="18.1" y2="5.9" stroke="#f59e0b" strokeWidth="1.8" strokeLinecap="round"/><line x1="2" y1="10" x2="4.5" y2="10" stroke="#f59e0b" strokeWidth="2" strokeLinecap="round"/><line x1="21.5" y1="10" x2="19" y2="10" stroke="#f59e0b" strokeWidth="2" strokeLinecap="round"/><line x1="2" y1="18" x2="22" y2="18" stroke="#92400e" strokeWidth="1.5" strokeLinecap="round"/><path d="M6.5 18a5.5 5.5 0 0111 0" stroke="#b45309" strokeWidth="1.5" strokeLinecap="round" fill="none"/></svg>
            <div style={{textAlign:"right"}}><div style={{fontSize:12,color:"#b45309"}}>Evening</div><div style={{fontSize:18,fontWeight:800,color:"#92400e"}}>{sun.sunset?fmtFull12(new Date(new Date(sun.sunset).getTime()-3600000)):"--"}</div></div>
          </div>
        </div>
      )}

      {/* ── Moon ── */}
      {sun && (()=>{
        const illumin=Math.round(Math.abs(Math.cos(sun.moon_phase*2*Math.PI))*100);
        return (
          <div style={{background:"linear-gradient(145deg,#1e1b4b,#312e81)",borderRadius:24,padding:"28px",color:"#fff",boxShadow:"0 8px 32px rgba(49,46,129,0.3)"}}>
            <div style={{fontSize:12,fontWeight:700,opacity:0.5,letterSpacing:1,textTransform:"uppercase",marginBottom:18}}>Moon tonight</div>
            <div style={{display:"flex",alignItems:"center",gap:24}}>
              <MoonIcon phase={sun.moon_phase} size={72}/>
              <div><div style={{fontSize:24,fontWeight:800}}>{sun.moon_name}</div><div style={{fontSize:14,opacity:0.6,marginTop:6}}>{illumin}% illuminated · {sun.moon_age_days}d old</div></div>
            </div>
            <div style={{marginTop:22}}>
              <div style={{display:"flex",justifyContent:"space-between",marginBottom:10}}>
                {[0,1,2,3,4,5,6,7].map(i=>{
                  const act=Math.abs(sun.moon_phase-i/7)<0.07;
                  return<div key={i} style={{opacity:act?1:0.35,transform:act?"scale(1.3)":"scale(1)",transition:"all 0.3s"}}><MoonIcon phase={i/7} size={act?26:17}/></div>;
                })}
              </div>
              <div style={{height:4,background:"rgba(255,255,255,0.1)",borderRadius:99,overflow:"hidden"}}>
                <div style={{height:"100%",width:`${Math.round(sun.moon_phase*100)}%`,background:"rgba(255,255,255,0.45)",borderRadius:99}}/>
              </div>
              <div style={{display:"flex",justifyContent:"space-between",fontSize:11,opacity:0.35,marginTop:6}}><span>New</span><span>Full</span><span>New</span></div>
            </div>
          </div>
        );
      })()}
    </div>
  );
}

// ─── MOON PHASE ICON ─────────────────────────────────────────────────────────
// phase: 0=new, 0.25=first quarter, 0.5=full, 0.75=last quarter
function MoonIcon({ phase=0, size=40 }) {
  const s = { width:size, height:size, flexShrink:0, display:"inline-block" };
  const p = ((phase % 1) + 1) % 1; // normalise 0–1
  // Map phase to one of 8 archetypal shapes
  const seg = Math.round(p * 8) % 8;
  // Shadow arc helper: returns SVG path for lit/dark crescent
  // We draw a full circle then overlay a clip arc
  const r = size * 0.38;
  const cx = size / 2;
  const cy = size / 2;
  const glow = "rgba(200,210,255,0.18)";
  const moonFill = "#c7d2fe";
  const shadowFill = "#1e1b4b";

  // For each seg: 0=new, 1=waxing crescent, 2=first quarter, 3=waxing gibbous,
  //               4=full, 5=waning gibbous, 6=last quarter, 7=waning crescent
  let litPath;
  if(seg===0) {
    // New moon – all dark with subtle rim
    return <svg style={s} viewBox={`0 0 ${size} ${size}`} fill="none">
      <circle cx={cx} cy={cy} r={r} fill="#1e1b4b" stroke="#4338ca" strokeWidth={size*0.04}/>
    </svg>;
  }
  if(seg===4) {
    // Full moon
    return <svg style={s} viewBox={`0 0 ${size} ${size}`} fill="none">
      <circle cx={cx} cy={cy} r={r} fill={moonFill}/>
      <circle cx={cx-r*0.15} cy={cy-r*0.2} r={r*0.12} fill="rgba(255,255,255,0.25)"/>
      <circle cx={cx+r*0.25} cy={cy+r*0.1} r={r*0.07} fill="rgba(255,255,255,0.2)"/>
    </svg>;
  }
  // Crescent / gibbous: use two overlapping ellipses technique
  // Lit side always shows; shadow side covered
  const waxing = seg < 4; // 1,2,3 waxing; 5,6,7 waning
  // terminator x-offset as fraction of radius (-1 to 1)
  const offsets = [0, -0.9, 0, 0.9, 0, -0.9, 0, 0.9];
  const tOff = offsets[seg]; // >0 = shadow covers left, <0 = shadow covers right
  const termX = cx + tOff * r;
  // Build clip path: lit half
  const clipId = `mc${seg}s${Math.round(size)}`;
  return <svg style={s} viewBox={`0 0 ${size} ${size}`} fill="none">
    <defs>
      <clipPath id={clipId}>
        <rect x={waxing ? termX : cx-r} y={cy-r} width={waxing ? cx+r-termX : termX-(cx-r)} height={r*2}/>
      </clipPath>
    </defs>
    {/* base circle – lit color */}
    <circle cx={cx} cy={cy} r={r} fill={moonFill}/>
    {/* shadow overlay for dark portion */}
    <circle cx={cx} cy={cy} r={r} fill={shadowFill} clipPath={`url(#${clipId})`}/>
    {/* thin rim */}
    <circle cx={cx} cy={cy} r={r} stroke="#4338ca" strokeWidth={size*0.03} fill="none" opacity="0.6"/>
    {/* small craters on lit side */}
    {seg!==0&&<circle cx={cx+(waxing?r*0.2:-r*0.2)} cy={cy-r*0.2} r={r*0.09} fill="rgba(255,255,255,0.22)"/>}
  </svg>;
}

// ─── LIGHTS TAB ───────────────────────────────────────────────────────────────
const SCENE_ICONS={
  bright:<svg width="22" height="22" viewBox="0 0 24 24" fill="none"><circle cx="12" cy="12" r="4" fill="#fbbf24"/><line x1="12" y1="2" x2="12" y2="5" stroke="#fbbf24" strokeWidth="2" strokeLinecap="round"/><line x1="12" y1="19" x2="12" y2="22" stroke="#fbbf24" strokeWidth="2" strokeLinecap="round"/><line x1="2" y1="12" x2="5" y2="12" stroke="#fbbf24" strokeWidth="2" strokeLinecap="round"/><line x1="19" y1="12" x2="22" y2="12" stroke="#fbbf24" strokeWidth="2" strokeLinecap="round"/><line x1="4.9" y1="4.9" x2="7" y2="7" stroke="#fbbf24" strokeWidth="2" strokeLinecap="round"/><line x1="17" y1="17" x2="19.1" y2="19.1" stroke="#fbbf24" strokeWidth="2" strokeLinecap="round"/><line x1="17" y1="7" x2="19.1" y2="4.9" stroke="#fbbf24" strokeWidth="2" strokeLinecap="round"/><line x1="4.9" y1="19.1" x2="7" y2="17" stroke="#fbbf24" strokeWidth="2" strokeLinecap="round"/></svg>,
  relax:<svg width="22" height="22" viewBox="0 0 24 24" fill="none"><circle cx="12" cy="12" r="5" fill="#fb923c" opacity="0.9"/><path d="M3 18c3-3 6-4 9-2s6 1 9-2" stroke="#fb923c" strokeWidth="1.8" strokeLinecap="round" fill="none"/><line x1="3" y1="21" x2="21" y2="21" stroke="#fed7aa" strokeWidth="1.5" strokeLinecap="round"/></svg>,
  night:<svg width="22" height="22" viewBox="0 0 24 24" fill="none"><path d="M20 14.5A8 8 0 118 4.5a6 6 0 0012 10z" fill="#93c5fd" opacity="0.8" stroke="#60a5fa" strokeWidth="1.5"/></svg>,
  away:<svg width="22" height="22" viewBox="0 0 24 24" fill="none"><rect x="5" y="11" width="14" height="10" rx="2" stroke="#94a3b8" strokeWidth="1.8"/><path d="M8 11V7a4 4 0 018 0v4" stroke="#94a3b8" strokeWidth="1.8" strokeLinecap="round"/><circle cx="12" cy="16" r="1.5" fill="#94a3b8"/></svg>,
};
const SCENES={bright:{label:"Bright",bg:"#fffbeb",border:"#fde68a",text:"#92400e"},relax:{label:"Relax",bg:"#fff7ed",border:"#fed7aa",text:"#9a3412"},night:{label:"Night",bg:"#eff6ff",border:"#bfdbfe",text:"#1e40af"},away:{label:"Away",bg:"#f8fafc",border:"#e2e8f0",text:"#475569"}};

// Device labels come from the server (set KASA_LABEL_* in .env on the Pi)

function Toggle({ on, onToggle, disabled }) {
  return (
    <button onClick={onToggle} disabled={disabled} style={{width:52,height:28,borderRadius:99,border:"none",cursor:disabled?"not-allowed":"pointer",background:on?"#fbbf24":"#e2e8f0",position:"relative",transition:"background 0.2s",flexShrink:0,opacity:disabled?0.4:1}}>
      <div style={{position:"absolute",top:4,width:20,height:20,borderRadius:"50%",background:"#fff",left:on?"28px":"4px",transition:"left 0.2s",boxShadow:"0 1px 4px rgba(0,0,0,0.2)"}}/>
    </button>
  );
}

const GROUP_META = [
  { id: 'living_room', label: 'Living Room' },
  { id: 'bedroom',     label: 'Bedroom'     },
  { id: 'kitchen',     label: 'Kitchen'     },
];

function DeviceRow({ d, busy, onToggle }) {
  return (
    <div style={{ display:"flex", alignItems:"center", gap:14, padding:"12px 16px", borderRadius:14, background: d.on ? "rgba(251,191,36,0.12)" : "rgba(255,255,255,0.6)", border:`1.5px solid ${d.on ? "#fde68a" : "#f1f5f9"}` }}>
      <div style={{ width:36, height:36, borderRadius:"50%", background: d.on ? "#fef3c7" : "#f1f5f9", display:"flex", alignItems:"center", justifyContent:"center", flexShrink:0 }}>
        <svg width="18" height="18" viewBox="0 0 24 24" fill="none">
          <rect x="7" y="2" width="10" height="12" rx="2" stroke={d.on ? "#f59e0b" : "#94a3b8"} strokeWidth="1.8"/>
          <line x1="9" y1="2" x2="9" y2="6" stroke={d.on ? "#f59e0b" : "#94a3b8"} strokeWidth="1.8" strokeLinecap="round"/>
          <line x1="15" y1="2" x2="15" y2="6" stroke={d.on ? "#f59e0b" : "#94a3b8"} strokeWidth="1.8" strokeLinecap="round"/>
          <path d="M12 14v3M9 20h6" stroke={d.on ? "#f59e0b" : "#94a3b8"} strokeWidth="1.8" strokeLinecap="round"/>
        </svg>
      </div>
      <div style={{ flex:1 }}>
        <div style={{ fontSize:14, fontWeight:700, color:"#1e293b" }}>{d.label || d.alias}</div>
        <div style={{ fontSize:12, color: d.on ? "#b45309" : d.unreachable ? "#ef4444" : "#94a3b8" }}>
          {d.unreachable ? "Unreachable" : d.on ? "On" : "Off"}
        </div>
      </div>
      <Toggle on={d.on} onToggle={onToggle} disabled={busy || d.unreachable}/>
    </div>
  );
}

function LightsTab() {
  const [devices, setDevices] = useState([]);
  const [loading, setLoading] = useState(true);
  const [busy,    setBusy]    = useState({});

  const load = useCallback(async () => {
    try { const d = await fetch(`${API}/lights`).then(r => r.json()); setDevices(Array.isArray(d) ? d : []); }
    catch { setDevices([]); }
    setLoading(false);
  }, []);
  useEffect(() => { load(); const t = setInterval(load, 10000); return () => clearInterval(t); }, [load]);

  const toggle = async d => {
    const next = !d.on;
    setDevices(ds => ds.map(x => x.alias === d.alias ? { ...x, on: next } : x));
    setBusy(b => ({ ...b, [d.alias]: true }));
    await fetch(`${API}/lights/${encodeURIComponent(d.alias)}/${d.on ? "off" : "on"}`, { method:"POST" });
    setBusy(b => ({ ...b, [d.alias]: false }));
    setTimeout(load, 800);
  };

  const groupOn  = async id => {
    setDevices(ds => ds.map(d => d.group === id ? { ...d, on: true }  : d));
    await fetch(`${API}/lights/group/${id}/on`,  { method:"POST" });
    setTimeout(load, 800);
  };
  const groupOff = async id => {
    setDevices(ds => ds.map(d => d.group === id ? { ...d, on: false } : d));
    await fetch(`${API}/lights/group/${id}/off`, { method:"POST" });
    setTimeout(load, 800);
  };

  return (
    <div style={{ display:"flex", flexDirection:"column", gap:14 }}>
      {GROUP_META.map(({ id, label }) => {
        const grpDevs = devices.filter(d => d.group === id);
        if (!loading && grpDevs.length === 0) return null;
        const onCount = grpDevs.filter(d => d.on).length;
        const lit = onCount > 0;
        return (
          <div key={id} style={{ ...CARD, padding:"20px 22px", background: lit ? "linear-gradient(135deg,#fffbeb,#fef3c7)" : undefined, border: lit ? "2px solid #fde68a" : undefined, boxShadow: lit ? "0 4px 24px rgba(251,191,36,0.2)" : undefined }}>
            <div style={{ display:"flex", justifyContent:"space-between", alignItems:"center", marginBottom: grpDevs.length ? 16 : 0 }}>
              <div>
                <div style={{ fontSize:18, fontWeight:800, color:"#1e293b" }}>{label}</div>
                <div style={{ fontSize:13, color:"#94a3b8", marginTop:2 }}>
                  {loading ? "Loading…" : `${onCount} of ${grpDevs.length} on`}
                </div>
              </div>
              {grpDevs.length > 0 && (
                <div style={{ display:"flex", gap:8 }}>
                  <button onClick={() => groupOn(id)}  style={{ padding:"8px 18px", background:"#fbbf24", border:"none", borderRadius:10, cursor:"pointer", fontFamily:"inherit", fontSize:13, fontWeight:700, color:"#78350f" }}>On</button>
                  <button onClick={() => groupOff(id)} style={{ padding:"8px 18px", background:"#f1f5f9", border:"none", borderRadius:10, cursor:"pointer", fontFamily:"inherit", fontSize:13, fontWeight:700, color:"#64748b" }}>Off</button>
                </div>
              )}
            </div>
            <div style={{ display:"flex", flexDirection:"column", gap:10 }}>
              {grpDevs.map(d => (
                <DeviceRow key={d.alias} d={d} busy={busy[d.alias]} onToggle={() => toggle(d)}/>
              ))}
            </div>
          </div>
        );
      })}
      {!loading && devices.length === 0 && (
        <div style={{ ...CARD, padding:"30px 24px", textAlign:"center", color:"#94a3b8", fontSize:13, lineHeight:1.8 }}>
          No devices connected.<br/>
          Add device IPs to <code>.env</code> on the Pi (e.g. <code>KASA_IP_FLOWER=192.168.1.x</code>),<br/>
          then restart the server.
        </div>
      )}
    </div>
  );
}

// ─── REWARDS TAB ──────────────────────────────────────────────────────────────
function RewardsTab({ pts, setPts, rwds, setRwds }) {
  const [showAdd, setShowAdd] = useState(false);
  const [form, setForm]       = useState({ name:"", cost:100, icon:"🎁", who:"both" });
  const [editing, setEditing] = useState(null); // reward id being edited
  const [editForm, setEditForm] = useState({});
  const [redeeming, setRedeeming] = useState(null);
  const [confetti, setConfetti]   = useState(null);

  const addReward = async () => {
    if(!form.name.trim()) return;
    const r=await fetch(`${API}/rewards`,{method:"POST",headers:{"Content-Type":"application/json"},body:JSON.stringify(form)}).then(r=>r.json());
    setRwds(rw=>({...rw,rewards:[...rw.rewards,r]}));
    setForm({name:"",cost:100,icon:"🎁",who:"both"}); setShowAdd(false);
  };

  const redeem = async (reward, who) => {
    const pts_val = who==="rabia"?pts.rabia_points:pts.clare_points;
    if(pts_val < reward.cost){ alert(`Not enough points! You have ${pts_val} but need ${reward.cost}.`); return; }
    const r=await fetch(`${API}/rewards/${reward.id}/redeem`,{method:"POST",headers:{"Content-Type":"application/json"},body:JSON.stringify({who})}).then(r=>r.json());
    if(r.error){ alert(r.error); return; }
    setPts(r.points);
    setConfetti(reward.name);
    setTimeout(()=>setConfetti(null),3000);
  };

  const deleteReward = async (id) => {
    await fetch(`${API}/rewards/${id}`,{method:"DELETE"});
    setRwds(rw=>({...rw,rewards:rw.rewards.filter(r=>r.id!==id)}));
  };

  const startEdit = (r) => { setEditing(r.id); setEditForm({name:r.name,cost:r.cost,icon:r.icon,who:r.who}); };
  const saveEdit  = async () => {
    const r=await fetch(`${API}/rewards/${editing}`,{method:"PATCH",headers:{"Content-Type":"application/json"},body:JSON.stringify(editForm)}).then(r=>r.json());
    setRwds(rw=>({...rw,rewards:rw.rewards.map(x=>x.id===editing?r:x)}));
    setEditing(null);
  };

  const people = [RABIA, CLARE];
  const REWARD_ICONS = ["🎬","☕","🍕","🎮","💆‍♀️","✈️","🍽️","🎁","🛍️","🏖️","🎭","🎵","🍦","📚","🏃‍♀️","🧖‍♀️","🍷","🎨","💅","🧘‍♀️","🏋️","🎲","🎤","🛁","🌅","🎊","🍰","🧁"];

  return (
    <div style={{display:"flex",flexDirection:"column",gap:16}}>

      {/* Confetti banner */}
      {confetti && (
        <div style={{...CARD,padding:"20px 24px",background:"linear-gradient(135deg,#fef3c7,#fed7aa)",border:"2px solid #fbbf24",textAlign:"center"}}>
          <div style={{display:"flex",justifyContent:"center",marginBottom:6}}>
            <svg width="40" height="40" viewBox="0 0 24 24" fill="none">
              {/* party popper */}
              <path d="M2 22L8.5 8.5" stroke="#f59e0b" strokeWidth="2.2" strokeLinecap="round"/>
              <path d="M2 22L15.5 15.5" stroke="#f59e0b" strokeWidth="2.2" strokeLinecap="round"/>
              <path d="M2 22l5-2-2-5z" fill="#fbbf24"/>
              <circle cx="9" cy="4" r="1.2" fill="#f472b6"/>
              <circle cx="14" cy="2" r="0.9" fill="#60a5fa"/>
              <circle cx="19" cy="6" r="1.1" fill="#34d399"/>
              <circle cx="5" cy="8" r="0.8" fill="#a78bfa"/>
              <line x1="12" y1="7" x2="13.5" y2="5" stroke="#fbbf24" strokeWidth="1.5" strokeLinecap="round"/>
              <line x1="17" y1="10" x2="19" y2="9" stroke="#f472b6" strokeWidth="1.5" strokeLinecap="round"/>
              <line x1="20" y1="14" x2="22" y2="13" stroke="#60a5fa" strokeWidth="1.5" strokeLinecap="round"/>
              <line x1="16" y1="18" x2="18" y2="19" stroke="#34d399" strokeWidth="1.5" strokeLinecap="round"/>
              <circle cx="20" cy="4" r="0.7" fill="#f59e0b"/>
              <circle cx="6" cy="14" r="0.7" fill="#60a5fa"/>
            </svg>
          </div>
          <div style={{fontSize:18,fontWeight:800,color:"#92400e"}}>{confetti} redeemed!</div>
          <div style={{fontSize:14,color:"#b45309",marginTop:4}}>Enjoy your reward!</div>
        </div>
      )}

      {/* Points summary */}
      <div style={{display:"flex",gap:12}}>
        {people.map(person=>{
          const pKey=person.name.toLowerCase();
          const points=pts[`${pKey}_points`]||0;
          return (
            <div key={person.name} style={{...CARD,flex:1,padding:"18px",textAlign:"center",background:`linear-gradient(145deg,${person.color}12,${person.color}06)`,border:`2px solid ${person.color}30`}}>
              <Av person={person} size={48}/>
              <div style={{marginTop:10}}>
                <ProgressRing pts={points} max={500} color={person.color}/>
                <div style={{fontSize:13,color:"#64748b",marginTop:4,fontWeight:600}}>to next reward</div>
              </div>
            </div>
          );
        })}
      </div>

      {/* Add reward button */}
      <button onClick={()=>setShowAdd(v=>!v)} style={{padding:"16px",borderRadius:20,border:"2px dashed #e2e8f0",background:"transparent",color:"#64748b",fontSize:15,fontWeight:600,cursor:"pointer",fontFamily:"inherit"}}>
        {showAdd?"✕ Cancel":"+ Create reward"}
      </button>

      {/* Add reward form */}
      {showAdd && (
        <div style={{...CARD,padding:"20px"}}>
          <div style={{display:"flex",flexDirection:"column",gap:12}}>
            <input value={form.name} onChange={e=>setForm(f=>({...f,name:e.target.value}))} placeholder="Reward name (e.g. Movie night)" style={{padding:"14px 18px",borderRadius:16,border:"1.5px solid #e2e8f0",fontSize:15,fontFamily:"inherit",outline:"none",color:"#1e293b"}}/>
            <div style={{display:"flex",gap:10,alignItems:"center"}}>
              <div style={{fontSize:13,fontWeight:700,color:"#64748b"}}>Cost:</div>
              <input type="number" value={form.cost} onChange={e=>setForm(f=>({...f,cost:parseInt(e.target.value)||0}))} style={{width:90,padding:"12px 14px",borderRadius:14,border:"1.5px solid #e2e8f0",fontSize:15,fontFamily:"inherit",outline:"none",color:"#1e293b"}}/>
              <div style={{fontSize:14,color:"#64748b"}}>⭐ points</div>
            </div>
            <div>
              <div style={{fontSize:13,fontWeight:700,color:"#64748b",marginBottom:8}}>Icon:</div>
              <div style={{display:"flex",flexWrap:"wrap",gap:8}}>
                {REWARD_ICONS.map(ic=>(
                  <button key={ic} onClick={()=>setForm(f=>({...f,icon:ic}))} style={{width:44,height:44,fontSize:22,borderRadius:12,border:`2px solid ${form.icon===ic?"#6366f1":"#e2e8f0"}`,background:form.icon===ic?"#eef2ff":"#fff",cursor:"pointer"}}>{ic}</button>
                ))}
              </div>
            </div>
            <div style={{display:"flex",gap:10}}>
              {[["both","Everyone"],["rabia","Rabia"],["clare","Clare"]].map(([val,label])=>(
                <button key={val} onClick={()=>setForm(f=>({...f,who:val}))} style={{flex:1,padding:"12px",borderRadius:14,border:`2px solid ${form.who===val?"#6366f1":"#e2e8f0"}`,background:form.who===val?"#eef2ff":"#fff",color:form.who===val?"#6366f1":"#64748b",fontWeight:700,fontSize:13,cursor:"pointer",fontFamily:"inherit"}}>{label}</button>
              ))}
            </div>
            <button onClick={addReward} style={{padding:"14px",borderRadius:16,border:"none",background:"linear-gradient(135deg,#f2709c,#38bdf8)",color:"#fff",fontWeight:700,fontSize:15,cursor:"pointer",fontFamily:"inherit"}}>Save reward</button>
          </div>
        </div>
      )}

      {/* Reward cards per person */}
      {people.map(person=>{
        const pKey  = person.name.toLowerCase();
        const myPts = pts[`${pKey}_points`]||0;
        const myRwds= rwds.rewards.filter(r=>r.who==="both"||r.who===pKey);
        if(myRwds.length===0) return null;
        return (
          <div key={person.name}>
            <div style={{display:"flex",alignItems:"center",gap:10,marginBottom:10}}>
              <Av person={person} size={36}/>
              <div style={{fontSize:16,fontWeight:800,color:"#1e293b"}}>{person.name}</div>
              <div style={{fontSize:13,color:person.color,fontWeight:700}}>{myPts} pts</div>
            </div>
            <div style={{display:"grid",gridTemplateColumns:"1fr 1fr",gap:12}}>
              {myRwds.map(r=>{
                const canAfford=myPts>=r.cost;
                if(editing===r.id) return (
                  <div key={r.id} style={{...CARD,padding:"16px",display:"flex",flexDirection:"column",gap:10}}>
                    <div style={{display:"flex",flexWrap:"wrap",gap:6,marginBottom:2}}>
                      {REWARD_ICONS.map(ic=>(
                        <button key={ic} onClick={()=>setEditForm(f=>({...f,icon:ic}))} style={{width:36,height:36,fontSize:18,borderRadius:10,border:`2px solid ${editForm.icon===ic?"#6366f1":"#e2e8f0"}`,background:editForm.icon===ic?"#eef2ff":"#fff",cursor:"pointer"}}>{ic}</button>
                      ))}
                    </div>
                    <input value={editForm.name} onChange={e=>setEditForm(f=>({...f,name:e.target.value}))} style={{padding:"10px 12px",borderRadius:12,border:"1.5px solid #e2e8f0",fontSize:14,fontFamily:"inherit",outline:"none",color:"#1e293b"}}/>
                    <div style={{display:"flex",gap:8,alignItems:"center"}}>
                      <input type="number" value={editForm.cost} onChange={e=>setEditForm(f=>({...f,cost:parseInt(e.target.value)||0}))} style={{width:80,padding:"9px 12px",borderRadius:12,border:"1.5px solid #e2e8f0",fontSize:14,fontFamily:"inherit",outline:"none",color:"#1e293b"}}/>
                      <span style={{fontSize:13,color:"#64748b"}}>⭐</span>
                    </div>
                    <div style={{display:"flex",gap:6}}>
                      {[["both","All"],["rabia","R"],["clare","C"]].map(([val,label])=>(
                        <button key={val} onClick={()=>setEditForm(f=>({...f,who:val}))} style={{flex:1,padding:"8px",borderRadius:10,border:`2px solid ${editForm.who===val?"#6366f1":"#e2e8f0"}`,background:editForm.who===val?"#eef2ff":"#fff",color:editForm.who===val?"#6366f1":"#64748b",fontWeight:700,fontSize:12,cursor:"pointer",fontFamily:"inherit"}}>{label}</button>
                      ))}
                    </div>
                    <div style={{display:"flex",gap:6}}>
                      <button onClick={saveEdit} style={{flex:1,padding:"10px",borderRadius:12,border:"none",background:"#6366f1",color:"#fff",fontWeight:700,fontSize:13,cursor:"pointer",fontFamily:"inherit"}}>Save</button>
                      <button onClick={()=>setEditing(null)} style={{padding:"10px 14px",borderRadius:12,border:"1px solid #e2e8f0",background:"#fff",color:"#64748b",fontSize:13,cursor:"pointer",fontFamily:"inherit"}}>Cancel</button>
                    </div>
                  </div>
                );
                return (
                  <div key={r.id} style={{...CARD,padding:"18px",textAlign:"center",opacity:canAfford?1:0.6,border:`2px solid ${canAfford?person.color+"40":"#f1f5f9"}`}}>
                    <div style={{fontSize:40,marginBottom:8}}>{r.icon}</div>
                    <div style={{fontSize:14,fontWeight:800,color:"#1e293b",marginBottom:4}}>{r.name}</div>
                    <div style={{fontSize:12,color:person.color,fontWeight:700,marginBottom:12}}>{r.cost} ⭐</div>
                    <div style={{display:"flex",gap:6}}>
                      <button onClick={()=>redeem(r,pKey)} disabled={!canAfford} style={{flex:1,padding:"10px",borderRadius:12,border:"none",background:canAfford?person.color:"#e2e8f0",color:canAfford?"#fff":"#94a3b8",fontWeight:700,fontSize:13,cursor:canAfford?"pointer":"not-allowed",fontFamily:"inherit"}}>
                        {canAfford?"Redeem":"Need "+(r.cost-myPts)+" more"}
                      </button>
                      <button onClick={()=>startEdit(r)} style={{width:36,height:36,borderRadius:12,border:"1px solid #e2e8f0",background:"#f8fafc",color:"#64748b",fontSize:14,cursor:"pointer",fontFamily:"inherit"}}>✏️</button>
                      <button onClick={()=>deleteReward(r.id)} style={{width:36,height:36,borderRadius:12,border:"1px solid #fee2e2",background:"#fff5f5",color:"#ef4444",fontSize:16,cursor:"pointer",fontFamily:"inherit"}}>×</button>
                    </div>
                  </div>
                );
              })}
            </div>
          </div>
        );
      })}

      {/* Redeemed history */}
      {rwds.redeemed.length>0 && (
        <div style={{...CARD,padding:"18px 20px"}}>
          <div style={{fontSize:12,fontWeight:700,color:"#94a3b8",letterSpacing:1,textTransform:"uppercase",marginBottom:12}}>Redemption history</div>
          {[...rwds.redeemed].reverse().slice(0,10).map((r,i)=>(
            <div key={i} style={{display:"flex",alignItems:"center",gap:12,padding:"8px 0",borderBottom:"1px solid #f8fafc"}}>
              <span style={{fontSize:22}}>{r.icon}</span>
              <div style={{flex:1}}>
                <div style={{fontSize:14,fontWeight:600,color:"#1e293b"}}>{r.name}</div>
                <div style={{fontSize:11,color:"#94a3b8"}}>{new Date(r.redeemedAt).toLocaleDateString()}</div>
              </div>
              <div style={{fontSize:12,fontWeight:700,color:r.who==="rabia"?RABIA.color:CLARE.color,textTransform:"capitalize"}}>{r.who}</div>
              <div style={{fontSize:12,color:"#94a3b8"}}>−{r.cost}⭐</div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}

// ─── GROCERIES TAB ───────────────────────────────────────────────────────────
function GroceriesTab({ tasks, projs, onComplete, onDelete, onAdd }) {
  const [newItem, setNewItem] = useState("");
  const [adding,  setAdding]  = useState(false);

  const groceriesProj = projs.find(p=>p.name.toLowerCase()==="groceries");
  const groceryTasks  = groceriesProj ? tasks.filter(t=>!t.checked && t.project_id===groceriesProj.id) : [];

  const doAdd = async () => {
    if(!newItem.trim()||!groceriesProj) return;
    await onAdd({ content:newItem, project_id:groceriesProj.id });
    setNewItem(""); setAdding(false);
  };

  if(!groceriesProj) return (
    <div style={{...CARD,padding:"32px 24px",textAlign:"center",color:"#94a3b8",fontSize:14}}>
      No "Groceries" project found in Todoist. Create one to get started.
    </div>
  );

  return (
    <div style={{display:"flex",flexDirection:"column",gap:14}}>

      {/* Quick add */}
      <div style={{...CARD,padding:"14px 18px"}}>
        {adding ? (
          <div style={{display:"flex",gap:10}}>
            <input autoFocus value={newItem} onChange={e=>setNewItem(e.target.value)} onKeyDown={e=>e.key==="Enter"&&doAdd()}
              placeholder="Add item…"
              style={{flex:1,padding:"12px 16px",borderRadius:14,border:"1.5px solid #e2e8f0",fontSize:15,fontFamily:"inherit",outline:"none",color:"#1e293b"}}/>
            <button onClick={doAdd} style={{padding:"12px 20px",borderRadius:14,border:"none",background:"#10b981",color:"#fff",fontWeight:700,fontSize:14,cursor:"pointer",fontFamily:"inherit"}}>Add</button>
            <button onClick={()=>{setAdding(false);setNewItem("");}} style={{padding:"12px 14px",borderRadius:14,border:"1px solid #e2e8f0",background:"#fff",color:"#64748b",fontSize:14,cursor:"pointer",fontFamily:"inherit"}}>✕</button>
          </div>
        ) : (
          <button onClick={()=>setAdding(true)} style={{width:"100%",padding:"14px",borderRadius:16,border:"2px dashed #10b981",background:"#f0fdf4",color:"#059669",fontSize:15,fontWeight:600,cursor:"pointer",fontFamily:"inherit",textAlign:"left"}}>
            + Add item
          </button>
        )}
      </div>

      {groceryTasks.length>0 && (
        <div style={{fontSize:13,fontWeight:700,color:"#94a3b8",paddingLeft:4}}>
          {groceryTasks.length} item{groceryTasks.length!==1?"s":""} remaining
        </div>
      )}

      <div style={{...CARD,overflow:"hidden"}}>
        {groceryTasks.length===0 && (
          <div style={{padding:"40px 24px",textAlign:"center"}}>
            <svg width="48" height="48" viewBox="0 0 24 24" fill="none" style={{marginBottom:12,opacity:0.4}}><path d="M6 2L3 6v14a2 2 0 002 2h14a2 2 0 002-2V6l-3-4z" stroke="#94a3b8" strokeWidth="1.8" strokeLinejoin="round"/><line x1="3" y1="6" x2="21" y2="6" stroke="#94a3b8" strokeWidth="1.8"/><path d="M16 10a4 4 0 01-8 0" stroke="#94a3b8" strokeWidth="1.8" strokeLinecap="round"/></svg>
            <div style={{fontSize:15,color:"#94a3b8"}}>All done! Tap + to add items.</div>
          </div>
        )}
        {groceryTasks.map((t,i)=>(
          <div key={t.id} style={{display:"flex",alignItems:"center",padding:"0 20px",minHeight:60,borderBottom:i<groceryTasks.length-1?"1px solid #f1f5f9":"none",gap:14}}>
            <button onClick={()=>onComplete(t,"",false)}
              style={{width:26,height:26,borderRadius:6,border:"2px solid #10b981",background:"transparent",cursor:"pointer",flexShrink:0,display:"flex",alignItems:"center",justifyContent:"center"}}>
            </button>
            <div style={{flex:1,fontSize:15,color:"#1e293b",fontWeight:500}}>{t.content}</div>
            <button onClick={()=>onDelete(t)} style={{width:28,height:28,borderRadius:"50%",border:"1px solid #fee2e2",background:"#fff5f5",color:"#ef4444",fontSize:14,cursor:"pointer",fontFamily:"inherit"}}>×</button>
          </div>
        ))}
      </div>
    </div>
  );
}

// ─── UPCOMING TAB ────────────────────────────────────────────────────────────
function UpcomingTab({ tasks, projs, uidMap }) {
  const today = new Date(); today.setHours(0,0,0,0);
  const groceriesProj     = projs.find(p=>p.name.toLowerCase()==="groceries");
  const rabiaPersonalProj = projs.find(p=>p.name.toLowerCase()==="rabia's personal");

  const weekEnd = new Date(today); weekEnd.setDate(today.getDate()+6);
  const weekTasks = tasks.filter(t=>{
    if(!t.due?.date||t.checked) return false;
    if(t.project_id===groceriesProj?.id) return false;
    if(t.due?.is_recurring) return false;
    const d=new Date(t.due.date+'T12:00:00');
    return d>today && d<=weekEnd;
  }).sort((a,b)=>a.due.date.localeCompare(b.due.date));

  const weekRabia  = weekTasks.filter(t=>{ const a=uidMap?.[t.responsible_uid]; return a==="rabia"||t.project_id===rabiaPersonalProj?.id; });
  const weekClare  = weekTasks.filter(t=>{ const a=uidMap?.[t.responsible_uid]; return a==="clare"; });
  const weekFamily = weekTasks.filter(t=>{ const a=uidMap?.[t.responsible_uid]; return isFamily(t)||(!a&&t.project_id!==rabiaPersonalProj?.id); });

  const Col = ({person, color, wt}) => (
    <div style={{...CARD,overflow:"hidden"}}>
      <div style={{padding:"14px 18px",borderBottom:"1px solid #f1f5f9",background:`${color}10`,display:"flex",alignItems:"center",gap:10}}>
        {person
          ? <Av person={person} size={28}/>
          : <div style={{width:28,height:28,borderRadius:"50%",background:"linear-gradient(135deg,#6366f1,#a78bfa)",display:"flex",alignItems:"center",justifyContent:"center",fontSize:12,fontWeight:800,color:"#fff",flexShrink:0}}>F</div>
        }
        <div style={{fontSize:14,fontWeight:800,color:"#1e293b"}}>{person?.name||"Family"}</div>
        <span style={{fontSize:12,color:"#94a3b8"}}>{wt.length} task{wt.length!==1?"s":""}</span>
      </div>
      {wt.length===0
        ? <div style={{padding:"20px",textAlign:"center",fontSize:13,color:"#94a3b8"}}>Nothing this week</div>
        : wt.map((t,i)=>{
            const due=fmtDue(t.due?.date);
            return (
              <div key={t.id} style={{display:"flex",alignItems:"center",padding:"0 18px",minHeight:54,borderBottom:i<wt.length-1?"1px solid #f8fafc":"none",gap:12}}>
                <div style={{flex:1,minWidth:0}}>
                  <div style={{fontSize:14,color:"#1e293b",fontWeight:500,overflow:"hidden",textOverflow:"ellipsis",whiteSpace:"nowrap"}}>{t.content}</div>
                  {t.project_name && <div style={{fontSize:11,color:"#94a3b8"}}>{t.project_name}</div>}
                </div>
                {due && <span style={{fontSize:12,fontWeight:700,color:due.color,flexShrink:0,whiteSpace:"nowrap"}}>{due.label}</span>}
              </div>
            );
          })
      }
    </div>
  );

  return (
    <div style={{display:"flex",flexDirection:"column",gap:16}}>
      <div style={{fontSize:12,fontWeight:700,color:"#94a3b8",letterSpacing:1,textTransform:"uppercase",paddingLeft:4}}>
        Next 7 days · {weekTasks.length} task{weekTasks.length!==1?"s":""}
      </div>
      <div style={{display:"grid",gridTemplateColumns:"1fr 1fr 1fr",gap:16,alignItems:"start"}}>
        <Col person={RABIA}  color={RABIA.color}  wt={weekRabia}/>
        <Col person={CLARE}  color={CLARE.color}  wt={weekClare}/>
        <Col person={null}   color="#6366f1"       wt={weekFamily}/>
      </div>
    </div>
  );
}

// ─── RECIPES TAB ─────────────────────────────────────────────────────────────
const CUISINE_COLORS = {
  american:"#f59e0b", italian:"#ef4444", mexican:"#f97316", asian:"#10b981",
  chinese:"#6366f1", japanese:"#ec4899", indian:"#f59e0b", mediterranean:"#0ea5e9",
  french:"#8b5cf6", greek:"#06b6d4", thai:"#22c55e", middle_eastern:"#fb923c",
};
function cColor(c) { return CUISINE_COLORS[(c||'').toLowerCase()] || "#94a3b8"; }

// ─── RECIPE CARD (Recipes tab — one suggestion at a time) ────────────────────

function RecipeCard({ onIngredientsAdded }) {
  const [recipe,   setRecipe]   = useState(null);
  const [loading,  setLoading]  = useState(false);
  const [adding,   setAdding]   = useState(false);
  const [added,    setAdded]    = useState(false);
  const [err,      setErr]      = useState(null);

  const fetchRecipe = useCallback(async () => {
    setLoading(true); setAdded(false); setErr(null);
    try {
      const d = await fetch(`${API}/recipes/recommended`).then(r => r.json());
      if (d.error) { setErr(d.error); return; }
      // Each hit from Edamam v2 has shape { recipe: {...}, _links: {...} }
      const hits = (d.hits || []).filter(h => h.recipe || h.label);
      if (!hits.length) { setErr('No recipes returned — check EDAMAM_APP_ID / EDAMAM_APP_KEY in .env'); return; }
      const hit = hits[Math.floor(Math.random() * hits.length)];
      setRecipe(hit.recipe ?? hit);
    } catch(e) { setErr(e.message); }
    finally { setLoading(false); }
  }, []);

  useEffect(() => { fetchRecipe(); }, [fetchRecipe]);

  const addToGroceries = async () => {
    if (!recipe) return;
    setAdding(true);
    try {
      const r = await fetch(`${API}/recipes/add-ingredients`, {
        method: 'POST', headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ ingredients: recipe.ingredientLines || [], recipeName: recipe.label }),
      }).then(r => r.json());
      if (r.error) throw new Error(r.error);
      setAdded(true);
      if (onIngredientsAdded) onIngredientsAdded();
    } catch(e) { alert(e.message); }
    finally { setAdding(false); }
  };

  return (
    <div style={{...CARD, padding: 0, overflow: "hidden", marginBottom: 14}}>
      {/* Card header */}
      <div style={{display:"flex", justifyContent:"space-between", alignItems:"center", padding:"14px 18px 10px"}}>
        <div style={{display:"flex", alignItems:"center", gap:8}}>
          <span style={{fontSize:16}}>🌿</span>
          <div>
            <div style={{fontSize:13, fontWeight:800, color:"#1e293b"}}>Recipe Suggestion</div>
            <div style={{fontSize:11, color:"#94a3b8"}}>Vegetarian · Dairy-free</div>
          </div>
        </div>
        <button onClick={fetchRecipe} disabled={loading}
          style={{padding:"6px 14px", background:"#f97316", color:"#fff", border:"none", borderRadius:10, cursor:"pointer", fontFamily:"inherit", fontSize:12, fontWeight:700, opacity:loading?0.5:1}}>
          {loading ? "…" : "↺ New"}
        </button>
      </div>

      {loading && !recipe && (
        <div style={{padding:"24px", textAlign:"center", color:"#94a3b8", fontSize:13}}>Finding a recipe…</div>
      )}

      {err && !loading && (
        <div style={{margin:"0 18px 14px", padding:"12px 14px", background:"#fef2f2", border:"1.5px solid #fecaca", borderRadius:12}}>
          <div style={{fontSize:12, fontWeight:700, color:"#dc2626", marginBottom:4}}>Recipe Suggestion unavailable</div>
          <div style={{fontSize:11, color:"#b91c1c"}}>{err}</div>
          <button onClick={fetchRecipe} style={{marginTop:8, fontSize:11, fontWeight:700, color:"#f97316", background:"none", border:"none", cursor:"pointer", fontFamily:"inherit", padding:0}}>Try again</button>
        </div>
      )}

      {recipe && (
        <>
          {/* Image */}
          {recipe.image && (
            <div style={{position:"relative"}}>
              <img src={recipe.image} alt={recipe.label} style={{width:"100%", height:160, objectFit:"cover", display:"block"}}/>
              <div style={{position:"absolute", bottom:0, left:0, right:0, padding:"20px 16px 10px", background:"linear-gradient(to top, rgba(0,0,0,0.72), transparent)"}}>
                <div style={{fontSize:15, fontWeight:800, color:"#fff", lineHeight:1.2}}>{recipe.label}</div>
                {recipe.source && <div style={{fontSize:11, color:"rgba(255,255,255,0.7)", marginTop:2}}>{recipe.source}</div>}
              </div>
            </div>
          )}

          {/* Ingredients */}
          <div style={{padding:"12px 18px"}}>
            <div style={{fontSize:12, fontWeight:700, color:"#64748b", marginBottom:8, textTransform:"uppercase", letterSpacing:0.5}}>
              Ingredients ({recipe.ingredientLines?.length || 0})
            </div>
            <div style={{display:"flex", flexDirection:"column", gap:5}}>
              {(recipe.ingredientLines || []).map((line, i) => (
                <div key={i} style={{display:"flex", alignItems:"flex-start", gap:8, fontSize:13, color:"#334155", lineHeight:1.4}}>
                  <span style={{color:"#f97316", fontWeight:700, flexShrink:0, marginTop:1}}>·</span>
                  <span>{line}</span>
                </div>
              ))}
            </div>
          </div>

          {/* Add button */}
          <div style={{padding:"0 18px 16px"}}>
            {added ? (
              <div style={{display:"flex", alignItems:"center", gap:8, padding:"12px 16px", background:"#f0fdf4", borderRadius:14, border:"1.5px solid #86efac"}}>
                <svg width="18" height="18" viewBox="0 0 24 24" fill="none"><circle cx="12" cy="12" r="10" fill="#22c55e"/><polyline points="7,12 10,15 17,8" stroke="white" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round"/></svg>
                <span style={{fontSize:13, fontWeight:700, color:"#15803d"}}>Added to groceries!</span>
              </div>
            ) : (
              <button onClick={addToGroceries} disabled={adding}
                style={{width:"100%", padding:"13px", background:"linear-gradient(135deg,#059669,#10b981)", color:"#fff", border:"none", borderRadius:14, cursor:"pointer", fontFamily:"inherit", fontSize:14, fontWeight:800, opacity:adding?0.6:1}}>
                {adding ? "Adding…" : `+ Add all ingredients to Groceries`}
              </button>
            )}
          </div>
        </>
      )}
    </div>
  );
}

// ─── SCREENSAVER ─────────────────────────────────────────────────────────────
// Uses Art Institute of Chicago public API — free, no auth needed
const AIC_BASE = 'https://api.artic.edu/api/v1';

// Fine art classification IDs from AIC:
// Painting=26, Drawing and Watercolor=3, Print=9
const AIC_FINE_ART_QUERY = encodeURIComponent(JSON.stringify({
  bool: {
    must: [
      { term: { is_public_domain: true } },
      { terms: { 'artwork_type_title.keyword': ['Painting', 'Drawing and Watercolor', 'Print'] } },
    ],
  },
}));

function Screensaver({ onDismiss }) {
  const [artworks, setArtworks]   = useState([]);
  const [idx,      setIdx]        = useState(0);
  const [loaded,   setLoaded]     = useState(false);
  const [fade,     setFade]       = useState(true);

  useEffect(() => {
    // Use search endpoint with fine-art filter + random page
    const page = Math.ceil(Math.random() * 8);
    fetch(`${AIC_BASE}/artworks/search?query=${AIC_FINE_ART_QUERY}&fields=id,title,artist_display,date_display,image_id,artwork_type_title&limit=100&page=${page}`)
      .then(r => r.json())
      .then(d => {
        const valid = (d.data || []).filter(a => a.image_id);
        setArtworks(valid);
      })
      .catch(() => {
        // Fallback: plain fetch filtered client-side
        fetch(`${AIC_BASE}/artworks?fields=id,title,artist_display,date_display,image_id,artwork_type_title&limit=100&is_public_domain=true&page=${page}`)
          .then(r => r.json())
          .then(d => {
            const FINE_ART = ['painting', 'drawing and watercolor', 'print'];
            const valid = (d.data || []).filter(a =>
              a.image_id && FINE_ART.includes((a.artwork_type_title || '').toLowerCase())
            );
            setArtworks(valid);
          })
          .catch(() => {});
      });
  }, []);

  // Rotate every hour
  useEffect(() => {
    if (!artworks.length) return;
    const t = setInterval(() => {
      setFade(false);
      setTimeout(() => {
        setIdx(i => (i + 1) % artworks.length);
        setLoaded(false);
        setFade(true);
      }, 600);
    }, 60 * 60 * 1000);
    return () => clearInterval(t);
  }, [artworks]);

  const art = artworks[idx];
  const imgUrl = art?.image_id
    ? `https://www.artic.edu/iiif/2/${art.image_id}/full/1200,/0/default.jpg`
    : null;

  return (
    <div
      onClick={onDismiss}
      style={{position:"fixed",inset:0,zIndex:9999,background:"#000",cursor:"pointer",display:"flex",flexDirection:"column",alignItems:"center",justifyContent:"center",transition:"opacity 0.6s",opacity:fade?1:0}}
    >
      {imgUrl && (
        <img
          src={imgUrl}
          alt={art?.title}
          onLoad={() => setLoaded(true)}
          style={{position:"absolute",inset:0,width:"100%",height:"100%",objectFit:"contain",opacity:loaded?1:0,transition:"opacity 1s"}}
        />
      )}
      {/* Gradient overlay at bottom */}
      <div style={{position:"absolute",bottom:0,left:0,right:0,height:160,background:"linear-gradient(to top,rgba(0,0,0,0.85),transparent)",pointerEvents:"none"}}/>
      {/* Art info */}
      {art && (
        <div style={{position:"absolute",bottom:28,left:28,right:28,color:"#fff",pointerEvents:"none"}}>
          <div style={{fontSize:18,fontWeight:700,textShadow:"0 2px 8px rgba(0,0,0,0.8)",marginBottom:4}}>{art.title}</div>
          <div style={{fontSize:13,opacity:0.75,textShadow:"0 1px 4px rgba(0,0,0,0.8)"}}>{art.artist_display}{art.date_display?` · ${art.date_display}`:""}</div>
          <div style={{fontSize:11,opacity:0.4,marginTop:8}}>Art Institute of Chicago · Tap to wake</div>
        </div>
      )}
      {/* Clock */}
      <ScreensaverClock/>
    </div>
  );
}
function ScreensaverClock() {
  const [now, setNow] = useState(new Date());
  useEffect(() => { const t = setInterval(() => setNow(new Date()), 1000); return () => clearInterval(t); }, []);
  return (
    <div style={{position:"absolute",top:32,right:36,textAlign:"right",color:"#fff",textShadow:"0 2px 10px rgba(0,0,0,0.7)"}}>
      <div style={{fontSize:64,fontWeight:100,lineHeight:1,letterSpacing:-3}}>{fmtTime(now)}</div>
      <div style={{fontSize:14,opacity:0.6,marginTop:4}}>{fmtDate(now)}</div>
    </div>
  );
}

// ─── BUDGET TAB ──────────────────────────────────────────────────────────────
const CATEGORY_COLORS = {
  "Furniture":         { bg:"#dbeafe", text:"#1e40af" },
  "HOA/Insurance":     { bg:"#f0fdf4", text:"#166534" },
  "Paint":             { bg:"#fef9c3", text:"#854d0e" },
  "Installation Cost": { bg:"#f3e8ff", text:"#6b21a8" },
  "Misc Household Cost":{ bg:"#fce7f3", text:"#9d174d" },
  "Venmo":             { bg:"#e0f2fe", text:"#0369a1" },
  "Cats":              { bg:"#fff7ed", text:"#9a3412" },
  "Groceries":         { bg:"#dcfce7", text:"#15803d" },
  "Utilities":         { bg:"#f0fdf4", text:"#166534" },
};
function catColor(cat) {
  return CATEGORY_COLORS[cat] || { bg:"#f1f5f9", text:"#475569" };
}

const EMPTY_FORM = { category:"", item:"", date:"", paidBy:"Rabia", amount:"", reimbTo:"" };

function BudgetTab() {
  const [balances,  setBalances]  = useState(null);
  const [expenses,  setExpenses]  = useState(null);
  const [loading,   setLoading]   = useState(true);
  const [err,       setErr]       = useState(null);
  const [filter,    setFilter]    = useState("");
  const [showForm,  setShowForm]  = useState(false);   // "add" | {editing row} | null
  const [form,      setForm]      = useState(EMPTY_FORM);
  const [saving,    setSaving]    = useState(false);
  const [lastSync,  setLastSync]  = useState(null);

  const load = async () => {
    try {
      setLoading(true); setErr(null);
      const [b, e] = await Promise.all([
        fetch(`${API}/budget/balances`).then(r=>r.json()),
        fetch(`${API}/budget/expenses`).then(r=>r.json()),
      ]);
      if(b.error) throw new Error(b.error);
      if(e.error) throw new Error(e.error);
      setBalances(b.people || []);
      setExpenses(e.items  || []);
      setLastSync(new Date());
    } catch(e) { setErr(e.message); }
    finally    { setLoading(false); }
  };
  useEffect(()=>{ load(); },[]);

  const openAdd  = () => { setForm(EMPTY_FORM); setShowForm("add"); };
  const openEdit = row => { setForm({ category:row.category, item:row.item, date:row.date, paidBy:row.paidBy, amount:row.amount.replace(/[$,]/g,''), reimbTo:row.reimbTo }); setShowForm(row); };
  const closeForm = () => { setShowForm(null); };

  const saveForm = async () => {
    if(!form.item||!form.amount) return;
    setSaving(true);
    try {
      if(showForm==="add") {
        await fetch(`${API}/budget/expenses`, {
          method:"POST", headers:{"Content-Type":"application/json"},
          body:JSON.stringify(form),
        });
      } else {
        await fetch(`${API}/budget/expenses/${showForm._row}`, {
          method:"PUT", headers:{"Content-Type":"application/json"},
          body:JSON.stringify(form),
        });
      }
      setShowForm(null);
      await load();
    } catch(e) { alert(e.message); }
    finally { setSaving(false); }
  };

  const fmtAmt = s => {
    if(!s) return "—";
    const n = parseFloat(s.toString().replace(/[$,]/g,''));
    if(isNaN(n)) return s;
    return n.toLocaleString("en-US",{style:"currency",currency:"USD"});
  };

  const filtered = (expenses||[]).filter(e =>
    !filter ||
    e.item.toLowerCase().includes(filter.toLowerCase()) ||
    e.category.toLowerCase().includes(filter.toLowerCase()) ||
    e.paidBy.toLowerCase().includes(filter.toLowerCase())
  ).slice().reverse(); // most recent (last row in sheet) first

  // Group by category for summary
  const totals = {};
  (expenses||[]).forEach(e=>{
    const n=parseFloat(e.amount.replace(/[$,]/g,'')); if(isNaN(n)) return;
    totals[e.category]=(totals[e.category]||0)+n;
  });
  const grandTotal = Object.values(totals).reduce((a,b)=>a+b,0);

  return (
    <div style={{display:"flex",flexDirection:"column",gap:14}}>

      {/* ── Error ── */}
      {err && (
        <div style={{...CARD,padding:"16px 20px",background:"#fef2f2",border:"1.5px solid #fca5a5",color:"#b91c1c",fontSize:14}}>
          <strong>Sheets error:</strong> {err}
          <button onClick={load} style={{marginLeft:12,padding:"4px 12px",background:"#fee2e2",border:"1px solid #fca5a5",borderRadius:8,cursor:"pointer",color:"#b91c1c",fontSize:12}}>Retry</button>
        </div>
      )}

      {/* ── Balances summary ── */}
      <div style={{...CARD,padding:"20px 24px"}}>
        <div style={{display:"flex",justifyContent:"space-between",alignItems:"center",marginBottom:16}}>
          <div style={{fontSize:13,fontWeight:700,color:"#64748b",letterSpacing:0.8,textTransform:"uppercase"}}>Balances</div>
          {lastSync && <div style={{fontSize:11,color:"#94a3b8"}}>Synced {lastSync.toLocaleTimeString([],{hour:"2-digit",minute:"2-digit"})}</div>}
        </div>
        {loading && !balances ? (
          <div style={{textAlign:"center",color:"#94a3b8",padding:20}}>Loading…</div>
        ) : (
          <div style={{display:"grid",gridTemplateColumns:"1fr 1fr",gap:12}}>
            {(balances||[]).map(p=>{
              const bal = parseFloat(p.balance?.toString().replace(/[$,]/g,'')||0);
              const isOwed = bal > 0;   // positive = owed money (red in sheet)
              const person = p.name?.toLowerCase()==='rabia' ? RABIA : CLARE;
              return (
                <div key={p.name} style={{background:`linear-gradient(145deg,${person.color}14,${person.color}06)`,border:`2px solid ${person.color}30`,borderRadius:18,padding:"16px 18px"}}>
                  <div style={{display:"flex",alignItems:"center",gap:10,marginBottom:12}}>
                    <Av person={person} size={36}/>
                    <div>
                      <div style={{fontSize:14,fontWeight:700,color:"#1e293b"}}>{p.name}</div>
                      <div style={{fontSize:11,color:"#94a3b8"}}>{isOwed?"is owed":"owes"}</div>
                    </div>
                    <div style={{marginLeft:"auto",fontWeight:900,fontSize:22,color:isOwed?"#dc2626":"#16a34a"}}>
                      {fmtAmt(Math.abs(bal).toString())}
                    </div>
                  </div>
                  <div style={{display:"grid",gridTemplateColumns:"1fr 1fr",gap:6}}>
                    {[["Paid",p.paid],["Owes",p.owes],["Reimb. Sent",p.reimbSent],["Reimb. Received",p.reimbReceived]].map(([label,val])=>(
                      <div key={label} style={{background:"rgba(255,255,255,0.6)",borderRadius:10,padding:"6px 10px"}}>
                        <div style={{fontSize:10,color:"#94a3b8",fontWeight:600,textTransform:"uppercase",letterSpacing:0.5}}>{label}</div>
                        <div style={{fontSize:13,fontWeight:700,color:"#1e293b",marginTop:1}}>{val||"—"}</div>
                      </div>
                    ))}
                  </div>
                </div>
              );
            })}
          </div>
        )}
      </div>

      {/* ── Expenses & Payments ── */}
      <div style={{...CARD,padding:"20px 24px"}}>
        <div style={{display:"flex",justifyContent:"space-between",alignItems:"center",marginBottom:14}}>
          <div>
            <div style={{fontSize:13,fontWeight:700,color:"#64748b",letterSpacing:0.8,textTransform:"uppercase"}}>Expenses &amp; Payments</div>
            <div style={{fontSize:12,color:"#94a3b8",marginTop:2}}>Total: <strong style={{color:"#1e293b"}}>{fmtAmt(grandTotal.toFixed(2))}</strong> · {(expenses||[]).length} items</div>
          </div>
          <button onClick={openAdd} style={{display:"flex",alignItems:"center",gap:6,padding:"8px 16px",background:"#6366f1",color:"#fff",border:"none",borderRadius:12,cursor:"pointer",fontFamily:"inherit",fontSize:13,fontWeight:700}}>
            <svg width="14" height="14" viewBox="0 0 24 24" fill="none"><line x1="12" y1="5" x2="12" y2="19" stroke="white" strokeWidth="2.5" strokeLinecap="round"/><line x1="5" y1="12" x2="19" y2="12" stroke="white" strokeWidth="2.5" strokeLinecap="round"/></svg>
            Add
          </button>
        </div>

        {/* Search bar */}
        <div style={{position:"relative",marginBottom:12}}>
          <svg width="16" height="16" viewBox="0 0 24 24" fill="none" style={{position:"absolute",left:12,top:"50%",transform:"translateY(-50%)",color:"#94a3b8"}}><circle cx="11" cy="11" r="7" stroke="#94a3b8" strokeWidth="2"/><line x1="16.5" y1="16.5" x2="21" y2="21" stroke="#94a3b8" strokeWidth="2" strokeLinecap="round"/></svg>
          <input value={filter} onChange={e=>setFilter(e.target.value)} placeholder="Search items, categories…" style={{width:"100%",padding:"9px 12px 9px 36px",border:"1.5px solid #e2e8f0",borderRadius:12,fontSize:14,fontFamily:"inherit",outline:"none",background:"#f8fafc"}}/>
        </div>

        {/* Add/Edit form */}
        {showForm && (
          <div style={{background:"#f8fafc",border:"1.5px solid #e2e8f0",borderRadius:16,padding:"16px 18px",marginBottom:14}}>
            <div style={{fontSize:13,fontWeight:700,color:"#1e293b",marginBottom:12}}>{showForm==="add"?"New Expense":"Edit Expense"}</div>
            <div style={{display:"grid",gridTemplateColumns:"1fr 1fr",gap:8}}>
              {[
                ["category","Category","text"],
                ["item","Item / Description","text"],
                ["date","Date","text"],
                ["paidBy","Paid By","text"],
                ["amount","Amount","text"],
                ["reimbTo","Reimb. To (if any)","text"],
              ].map(([key,label])=>(
                <div key={key} style={{display:"flex",flexDirection:"column",gap:4}}>
                  <label style={{fontSize:11,fontWeight:600,color:"#64748b",textTransform:"uppercase",letterSpacing:0.5}}>{label}</label>
                  {key==="category" ? (
                    <select value={form[key]} onChange={e=>setForm(f=>({...f,[key]:e.target.value}))} style={{padding:"8px 10px",border:"1.5px solid #e2e8f0",borderRadius:10,fontSize:13,fontFamily:"inherit",background:"#fff",outline:"none"}}>
                      <option value="">— Select —</option>
                      {["Cat","Dining out/groceries","Furniture","HOA/Insurance","Installation Cost","Misc Household Cost","Paint","Travel","Utilities","Venmo"].map(c=>(
                        <option key={c}>{c}</option>
                      ))}
                    </select>
                  ) : key==="paidBy" ? (
                    <select value={form[key]} onChange={e=>setForm(f=>({...f,[key]:e.target.value}))} style={{padding:"8px 10px",border:"1.5px solid #e2e8f0",borderRadius:10,fontSize:13,fontFamily:"inherit",background:"#fff",outline:"none"}}>
                      <option>Rabia</option><option>Clare</option>
                    </select>
                  ) : (
                    <input value={form[key]} onChange={e=>setForm(f=>({...f,[key]:e.target.value}))} placeholder={key==="date"?"6/2/2025":""} style={{padding:"8px 10px",border:"1.5px solid #e2e8f0",borderRadius:10,fontSize:13,fontFamily:"inherit",outline:"none",background:"#fff"}}/>
                  )}
                </div>
              ))}
            </div>
            <div style={{display:"flex",gap:8,marginTop:14,justifyContent:"flex-end"}}>
              <button onClick={closeForm} style={{padding:"8px 18px",background:"#f1f5f9",border:"none",borderRadius:10,cursor:"pointer",fontFamily:"inherit",fontSize:13,fontWeight:600,color:"#64748b"}}>Cancel</button>
              <button onClick={saveForm} disabled={saving||!form.item||!form.amount} style={{padding:"8px 20px",background:saving?"#a5b4fc":"#6366f1",color:"#fff",border:"none",borderRadius:10,cursor:"pointer",fontFamily:"inherit",fontSize:13,fontWeight:700,opacity:(!form.item||!form.amount)?0.5:1}}>
                {saving?"Saving…":"Save to Sheet"}
              </button>
            </div>
          </div>
        )}

        {/* List */}
        {loading && !expenses ? (
          <div style={{textAlign:"center",color:"#94a3b8",padding:24}}>Loading expenses…</div>
        ) : (
          <div style={{display:"flex",flexDirection:"column",gap:8}}>
            {filtered.length===0&&<div style={{textAlign:"center",color:"#94a3b8",padding:20,fontSize:14}}>No items found.</div>}
            {filtered.map(row=>{
              const cc = catColor(row.category);
              const isReimb = row.reimbTo || row.category?.toLowerCase()==='venmo';
              const person = row.paidBy?.toLowerCase()==='rabia' ? RABIA : row.paidBy?.toLowerCase()==='clare' ? CLARE : null;
              return (
                <div key={row._row} onClick={()=>openEdit(row)} style={{display:"flex",alignItems:"center",gap:12,padding:"11px 14px",background:"#fff",borderRadius:14,border:"1.5px solid #f1f5f9",cursor:"pointer",transition:"background 0.12s"}}
                  onMouseEnter={e=>e.currentTarget.style.background="#f8fafc"}
                  onMouseLeave={e=>e.currentTarget.style.background="#fff"}
                >
                  {/* Category badge */}
                  <div style={{flexShrink:0,padding:"3px 9px",borderRadius:20,background:cc.bg,color:cc.text,fontSize:11,fontWeight:700,whiteSpace:"nowrap",maxWidth:110,overflow:"hidden",textOverflow:"ellipsis"}}>{row.category||"—"}</div>
                  {/* Description + date */}
                  <div style={{flex:1,minWidth:0}}>
                    <div style={{fontSize:13,fontWeight:600,color:"#1e293b",whiteSpace:"nowrap",overflow:"hidden",textOverflow:"ellipsis"}}>{row.item||"—"}</div>
                    <div style={{fontSize:11,color:"#94a3b8",marginTop:1,display:"flex",gap:8}}>
                      <span>{row.date}</span>
                      {isReimb && <span style={{background:"#fef9c3",color:"#a16207",borderRadius:6,padding:"0 6px",fontWeight:600}}>Reimb → {row.reimbTo}</span>}
                    </div>
                  </div>
                  {/* Paid by avatar */}
                  {person && <Av person={person} size={22}/>}
                  {/* Amount */}
                  <div style={{fontSize:14,fontWeight:800,color:isReimb?"#dc2626":"#1e293b",whiteSpace:"nowrap"}}>{fmtAmt(row.amount)}</div>
                  {/* Edit pen */}
                  <svg width="14" height="14" viewBox="0 0 24 24" fill="none" style={{flexShrink:0,opacity:0.3}}><path d="M11 4H4a2 2 0 00-2 2v14a2 2 0 002 2h14a2 2 0 002-2v-7" stroke="#64748b" strokeWidth="2" strokeLinecap="round"/><path d="M18.5 2.5a2.121 2.121 0 013 3L12 15l-4 1 1-4 9.5-9.5z" stroke="#64748b" strokeWidth="2" strokeLinecap="round"/></svg>
                </div>
              );
            })}
          </div>
        )}

        {/* Reload */}
        <div style={{textAlign:"center",marginTop:14}}>
          <button onClick={load} disabled={loading} style={{padding:"7px 20px",background:"#f1f5f9",border:"none",borderRadius:10,cursor:"pointer",fontFamily:"inherit",fontSize:12,fontWeight:600,color:"#64748b",opacity:loading?0.5:1}}>
            {loading?"Syncing…":"↻ Sync with Sheet"}
          </button>
        </div>
      </div>
    </div>
  );
}

// ─── VOICE TAB ───────────────────────────────────────────────────────────────
function VoiceTab({ triggerRecord = 0 }) {
  const API = import.meta.env.VITE_API_URL || '';
  // state: idle | listening | transcribing | thinking | confirming | executing | done | error
  const [state,      setState]      = useState('idle');
  const [transcript, setTranscript] = useState('');
  const [intent,     setIntent]     = useState(null);
  const [result,     setResult]     = useState(null);
  const [errMsg,     setErrMsg]     = useState('');
  const [history,    setHistory]    = useState([]);
  const mediaRecRef  = useRef(null);
  const chunksRef    = useRef([]);

  // Auto-start when triggered from header button
  useEffect(() => { if (triggerRecord > 0) start(); }, [triggerRecord]);

  const start = async () => {
    setTranscript(''); setIntent(null); setResult(null); setErrMsg('');
    try {
      const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
      const mr = new MediaRecorder(stream);
      chunksRef.current = [];
      mr.ondataavailable = e => { if (e.data.size > 0) chunksRef.current.push(e.data); };
      mr.onstop = () => {
        stream.getTracks().forEach(t => t.stop());
        const blob = new Blob(chunksRef.current, { type: 'audio/webm' });
        sendAudio(blob);
      };
      mr.start();
      mediaRecRef.current = mr;
      setState('listening');
    } catch(e) { setErrMsg(`Mic error: ${e.message}`); setState('error'); }
  };

  const stopListening = () => { mediaRecRef.current?.stop(); };

  const sendAudio = async blob => {
    setState('transcribing');
    try {
      const res  = await fetch(`${API}/api/voice/transcribe`, { method:'POST', headers:{'Content-Type':'audio/webm'}, body: blob });
      const data = await res.json();
      if (data.error) { setErrMsg(data.error); setState('error'); return; }
      const text = data.transcript;
      if (!text) { setErrMsg("Couldn't hear anything — try again."); setState('error'); return; }
      setTranscript(text);
      parseIntent(text);
    } catch(e) { setErrMsg(e.message); setState('error'); }
  };

  const parseIntent = async text => {
    setState('thinking');
    try {
      const res  = await fetch(`${API}/api/voice/parse`, { method:'POST', headers:{'Content-Type':'application/json'}, body:JSON.stringify({transcript:text}) });
      const data = await res.json();
      if (data.error) { setErrMsg(data.error); setState('error'); return; }
      setIntent(data);
      setState('confirming');
    } catch(e) { setErrMsg(e.message); setState('error'); }
  };

  const confirm = async () => {
    setState('executing');
    try {
      const res  = await fetch(`${API}/api/voice/execute`, { method:'POST', headers:{'Content-Type':'application/json'}, body:JSON.stringify(intent) });
      const data = await res.json();
      setResult(data);
      setHistory(h => [{ transcript, intent, result:data, ts:new Date() }, ...h.slice(0,9)]);
      setState('done');
      setTimeout(() => { setState('idle'); setTranscript(''); setIntent(null); setResult(null); }, 4000);
    } catch(e) { setErrMsg(e.message); setState('error'); }
  };

  const reject = () => { setState('idle'); setTranscript(''); setIntent(null); };
  const reset  = () => { setState('idle'); setTranscript(''); setIntent(null); setErrMsg(''); setResult(null); };

  // ── Action label helpers ────────────────────────────────────────────────────
  const actionLabel = a => ({add_grocery:'Add to Groceries', add_task:'Add Task', lights_on:'Lights On', lights_off:'Lights Off', unknown:'Unknown'})[a] || a;
  const actionColor = a => ({add_grocery:'#059669', add_task:'#6366f1', lights_on:'#fbbf24', lights_off:'#94a3b8', unknown:'#ef4444'})[a] || '#94a3b8';

  // ── Mic button visuals ──────────────────────────────────────────────────────
  const busy     = ['transcribing','thinking','executing'].includes(state);
  const micBg    = state==='listening' ? '#ef4444' : busy ? '#6366f1' : state==='done' ? '#10b981' : '#f1f5f9';
  const micColor = state==='idle' ? '#64748b' : '#fff';

  return (
    <div style={{display:'flex',flexDirection:'column',gap:20,alignItems:'center',paddingTop:20}}>
      {/* Mic button */}
      <div style={{position:'relative',display:'flex',flexDirection:'column',alignItems:'center',gap:16}}>
        {state==='listening' && (
          <div style={{position:'absolute',top:'50%',left:'50%',transform:'translate(-50%,-50%)',width:110,height:110,borderRadius:'50%',background:'#ef444420',animation:'pulse 1.2s ease-in-out infinite'}}/>
        )}
        <button
          onClick={state==='idle'?start : state==='listening'?stopListening : undefined}
          disabled={busy||state==='confirming'||state==='done'}
          style={{width:88,height:88,borderRadius:'50%',border:'none',background:micBg,cursor:state==='idle'||state==='listening'?'pointer':'default',display:'flex',alignItems:'center',justifyContent:'center',transition:'background 0.3s',boxShadow:`0 4px 24px ${micBg}55`,position:'relative',zIndex:1}}
        >
          {busy
            ? <svg width="32" height="32" viewBox="0 0 24 24" fill="none"><circle cx="12" cy="12" r="10" stroke={micColor} strokeWidth="2" strokeDasharray="31.4" strokeDashoffset="10"><animateTransform attributeName="transform" type="rotate" from="0 12 12" to="360 12 12" dur="0.8s" repeatCount="indefinite"/></circle></svg>
            : state==='done'
            ? <svg width="32" height="32" viewBox="0 0 24 24" fill="none"><polyline points="20 6 9 17 4 12" stroke="#fff" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round"/></svg>
            : <svg width="32" height="32" viewBox="0 0 24 24" fill="none">
                <rect x="9" y="3" width="6" height="11" rx="3" stroke={micColor} strokeWidth="2"/>
                <path d="M5 10a7 7 0 0014 0" stroke={micColor} strokeWidth="2" strokeLinecap="round"/>
                <line x1="12" y1="19" x2="12" y2="22" stroke={micColor} strokeWidth="2" strokeLinecap="round"/>
                <line x1="8" y1="22" x2="16" y2="22" stroke={micColor} strokeWidth="2" strokeLinecap="round"/>
              </svg>
          }
        </button>
        <div style={{fontSize:13,fontWeight:600,color:'#64748b',textAlign:'center'}}>
          {state==='idle'         && 'Tap to speak'}
          {state==='listening'    && 'Listening… tap to stop'}
          {state==='transcribing' && 'Transcribing…'}
          {state==='thinking'     && 'Thinking…'}
          {state==='confirming'   && 'Confirm below'}
          {state==='executing'    && 'Executing…'}
          {state==='done'         && 'Done!'}
          {state==='error'        && 'Something went wrong'}
        </div>
      </div>

      {/* Transcript */}
      {transcript && (
        <div style={{...CARD,padding:'16px 20px',maxWidth:520,width:'100%',textAlign:'center'}}>
          <div style={{fontSize:11,fontWeight:700,color:'#94a3b8',letterSpacing:1,textTransform:'uppercase',marginBottom:6}}>You said</div>
          <div style={{fontSize:18,color:'#1e293b',fontWeight:500}}>{transcript}</div>
        </div>
      )}

      {/* Intent confirmation card */}
      {state==='confirming' && intent && (
        <div style={{...CARD,padding:'20px 24px',maxWidth:520,width:'100%'}}>
          <div style={{fontSize:11,fontWeight:700,color:'#94a3b8',letterSpacing:1,textTransform:'uppercase',marginBottom:12}}>Understood as</div>
          <div style={{display:'flex',alignItems:'center',gap:12,marginBottom:16}}>
            <span style={{fontSize:13,fontWeight:800,color:actionColor(intent.action),background:`${actionColor(intent.action)}15`,padding:'4px 12px',borderRadius:99}}>{actionLabel(intent.action)}</span>
            {intent.content && <span style={{fontSize:16,fontWeight:600,color:'#1e293b'}}>"{intent.content}"</span>}
            {intent.due && <span style={{fontSize:12,color:'#6366f1',fontWeight:600}}>due {intent.due}</span>}
            {intent.assignee && <span style={{fontSize:12,color:'#94a3b8'}}>→ {intent.assignee}</span>}
          </div>
          {intent.action==='unknown'
            ? <div style={{fontSize:13,color:'#ef4444',marginBottom:16}}>Could not understand the command. Try again.</div>
            : null
          }
          <div style={{display:'flex',gap:12}}>
            {intent.action!=='unknown' && (
              <button onClick={confirm} style={{flex:1,padding:'14px',borderRadius:14,border:'none',background:'#10b981',color:'#fff',fontSize:15,fontWeight:800,cursor:'pointer',fontFamily:'inherit'}}>
                Yes, do it
              </button>
            )}
            <button onClick={reject} style={{flex:1,padding:'14px',borderRadius:14,border:'1px solid #e2e8f0',background:'#fff',color:'#64748b',fontSize:15,fontWeight:700,cursor:'pointer',fontFamily:'inherit'}}>
              {intent.action==='unknown' ? 'Try again' : 'No, cancel'}
            </button>
          </div>
        </div>
      )}

      {/* Error */}
      {state==='error' && (
        <div style={{...CARD,padding:'16px 20px',maxWidth:520,width:'100%',background:'#fef2f2',border:'1px solid #fecaca'}}>
          <div style={{fontSize:13,color:'#ef4444',marginBottom:12}}>{errMsg}</div>
          <button onClick={reset} style={{padding:'10px 20px',borderRadius:12,border:'none',background:'#ef4444',color:'#fff',fontSize:13,fontWeight:700,cursor:'pointer',fontFamily:'inherit'}}>Try again</button>
        </div>
      )}

      {/* Result */}
      {state==='done' && result && (
        <div style={{...CARD,padding:'16px 20px',maxWidth:520,width:'100%',background:'#f0fdf4',border:'1px solid #bbf7d0',textAlign:'center'}}>
          <div style={{fontSize:15,fontWeight:600,color:'#059669'}}>{result.message}</div>
        </div>
      )}

      {/* History */}
      {history.length>0 && (
        <div style={{maxWidth:520,width:'100%'}}>
          <div style={{fontSize:12,fontWeight:700,color:'#94a3b8',letterSpacing:1,textTransform:'uppercase',marginBottom:10}}>Recent</div>
          <div style={{...CARD,overflow:'hidden'}}>
            {history.map((h,i)=>(
              <div key={i} style={{display:'flex',alignItems:'center',padding:'10px 16px',borderBottom:i<history.length-1?'1px solid #f8fafc':'none',gap:10}}>
                <span style={{fontSize:11,fontWeight:800,color:actionColor(h.intent?.action),background:`${actionColor(h.intent?.action)}15`,padding:'2px 8px',borderRadius:99,flexShrink:0}}>{actionLabel(h.intent?.action)}</span>
                <span style={{fontSize:13,color:'#1e293b',flex:1,overflow:'hidden',textOverflow:'ellipsis',whiteSpace:'nowrap'}}>{h.transcript}</span>
                <span style={{fontSize:11,color:'#94a3b8',flexShrink:0}}>{h.ts.toLocaleTimeString([], {hour:'2-digit',minute:'2-digit'})}</span>
              </div>
            ))}
          </div>
        </div>
      )}

      <style>{`@keyframes pulse { 0%,100%{transform:translate(-50%,-50%) scale(1);opacity:0.6} 50%{transform:translate(-50%,-50%) scale(1.4);opacity:0.2} }`}</style>
    </div>
  );
}

// ─── DEBUG TAB ───────────────────────────────────────────────────────────────
function DebugTab() {
  const API = import.meta.env.VITE_API_URL || '';
  const [data,    setData]    = useState(null);
  const [loading, setLoading] = useState(true);
  const [error,   setError]   = useState(null);
  const [ts,      setTs]      = useState(null);

  const load = useCallback(async () => {
    setLoading(true); setError(null);
    try {
      const d = await fetch(`${API}/api/debug/system`).then(r=>r.json());
      setData(d);
      setTs(new Date());
    } catch(e) { setError(e.message); }
    finally { setLoading(false); }
  }, [API]);

  useEffect(()=>{ load(); }, [load]);

  const Dot = ({ok, warn}) => (
    <span style={{
      display:"inline-block",width:10,height:10,borderRadius:"50%",flexShrink:0,
      background: ok==="ok"?"#10b981": ok==="warn"?"#f59e0b": ok==="error"?"#ef4444":"#94a3b8",
      boxShadow: ok==="ok"?"0 0 0 3px #10b98120": ok==="warn"?"0 0 0 3px #f59e0b20": ok==="error"?"0 0 0 3px #ef444420":"none",
    }}/>
  );

  const Section = ({title, color, children}) => (
    <div style={{...CARD,overflow:"hidden"}}>
      <div style={{padding:"12px 16px",borderBottom:"1px solid #f1f5f9",background:"#fafafa",display:"flex",alignItems:"center",gap:10}}>
        <div style={{width:10,height:10,borderRadius:3,background:color,flexShrink:0}}/>
        <div style={{fontSize:14,fontWeight:800,color:"#1e293b"}}>{title}</div>
      </div>
      <div style={{padding:"14px 16px",display:"flex",flexDirection:"column",gap:10}}>
        {children}
      </div>
    </div>
  );

  const Row = ({label, value, status, mono=false}) => (
    <div style={{display:"flex",alignItems:"flex-start",gap:10,minHeight:24}}>
      {status && <Dot ok={status} style={{marginTop:4}}/>}
      <span style={{fontSize:12,fontWeight:600,color:"#64748b",minWidth:140,flexShrink:0}}>{label}</span>
      <span style={{fontSize:12,color:"#1e293b",fontFamily:mono?"monospace":"inherit",wordBreak:"break-all",flex:1}}>{value??<span style={{color:"#94a3b8"}}>—</span>}</span>
    </div>
  );

  const statusColor = s => s==="ok"||s==="authenticated"?"ok": s==="not_configured"||s==="initializing"?"warn":"error";

  if (loading) return <div style={{padding:40,textAlign:"center",color:"#94a3b8",fontSize:14}}>Loading system status…</div>;
  if (error)   return <div style={{padding:40,textAlign:"center",color:"#ef4444",fontSize:14}}>Error: {error}</div>;
  if (!data)   return null;

  const { lights, motion, weather, todoist, google_calendar: gcal, voice, env } = data;

  return (
    <div style={{display:"flex",flexDirection:"column",gap:16}}>
      <div style={{display:"flex",alignItems:"center",justifyContent:"space-between"}}>
        <div style={{fontSize:20,fontWeight:800,color:"#1e293b"}}>System Status</div>
        <div style={{display:"flex",alignItems:"center",gap:12}}>
          {ts && <span style={{fontSize:11,color:"#94a3b8"}}>Updated {ts.toLocaleTimeString()}</span>}
          <button onClick={load} style={{fontSize:12,padding:"7px 16px",borderRadius:99,border:"1px solid #e2e8f0",background:"#fff",cursor:"pointer",fontFamily:"inherit",fontWeight:600,color:"#64748b"}}>↻ Refresh</button>
        </div>
      </div>

      <div style={{display:"grid",gridTemplateColumns:"repeat(auto-fill,minmax(340px,1fr))",gap:16}}>

        {/* Lights */}
        <Section title="Lights (Tapo)" color="#fbbf24">
          <Row label="Status" value={lights.status} status={statusColor(lights.status)}/>
          <Row label="Credentials" value={lights.credentials_set ? "Set ✓" : "Missing in .env"} status={lights.credentials_set?"ok":"error"}/>
          {lights.devices.length===0 && <Row label="Devices" value="None configured (check .env IPs)" status="warn"/>}
          {lights.devices.map(d=>(
            <div key={d.alias} style={{display:"flex",alignItems:"center",gap:8,padding:"8px 10px",background:d.unreachable?"#fef2f2":d.connected?"#f0fdf4":"#fefce8",borderRadius:10}}>
              <Dot ok={d.unreachable?"error":d.connected?"ok":"warn"}/>
              <span style={{fontSize:12,fontWeight:600,color:"#1e293b",flex:1}}>{d.alias}</span>
              <span style={{fontSize:11,color:"#64748b",fontFamily:"monospace"}}>{d.host}</span>
              <span style={{fontSize:11,fontWeight:700,color:d.on?"#10b981":"#94a3b8",marginLeft:4}}>{d.unreachable?"unreachable":d.connected?(d.on?"ON":"OFF"):"connecting…"}</span>
            </div>
          ))}
          {lights.log.length>0 && (
            <details>
              <summary style={{fontSize:11,color:"#94a3b8",cursor:"pointer"}}>Last {lights.log.length} log entries</summary>
              <div style={{marginTop:6,background:"#f8fafc",borderRadius:8,padding:"8px 10px",maxHeight:160,overflowY:"auto"}}>
                {lights.log.map((l,i)=><div key={i} style={{fontSize:10,fontFamily:"monospace",color:"#475569",lineHeight:1.6}}>{l}</div>)}
              </div>
            </details>
          )}
        </Section>

        {/* Motion sensor */}
        <Section title="Motion Sensor (PIR)" color="#f472b6">
          <Row label="Status" value={motion.ready?"Ready":motion.error||"Not ready"} status={motion.ready?"ok":motion.error?"error":"warn"}/>
          <Row label="Library" value={motion.lib}/>
          <Row label="GPIO Pin" value={`GPIO ${motion.pin} (Pin ${motion.pin===17?11:motion.pin})`} mono/>
          <Row label="Fires detected" value={motion.fires} status={motion.fires>0?"ok":motion.ready?"warn":undefined}/>
          <Row label="Last motion" value={motion.last_motion ? `${motion.seconds_ago}s ago (${new Date(motion.last_motion).toLocaleTimeString()})` : "Never"} status={motion.last_motion?(motion.seconds_ago<120?"ok":"warn"):undefined}/>
          {motion.error && (
            <div style={{background:"#fef2f2",borderRadius:8,padding:"8px 10px",fontSize:11,color:"#ef4444",fontFamily:"monospace",wordBreak:"break-all"}}>{motion.error}</div>
          )}
          <button onClick={async()=>{
            await fetch(`${API}/api/motion/simulate`,{method:"POST"});
            setTimeout(load,500);
          }} style={{alignSelf:"flex-start",fontSize:11,padding:"5px 12px",borderRadius:99,border:"1px solid #f472b640",background:"#fdf2f8",color:"#db2777",cursor:"pointer",fontFamily:"inherit",fontWeight:600}}>
            🚶 Simulate motion
          </button>
        </Section>

        {/* Weather */}
        <Section title="Weather (Open-Meteo)" color="#0ea5e9">
          <Row label="Status" value={weather.status} status={statusColor(weather.status)}/>
          <Row label="Location" value={`${weather.location.city} (${weather.location.lat}, ${weather.location.lon})`}/>
          {weather.error && (
            <div style={{background:"#fef2f2",borderRadius:8,padding:"8px 10px",fontSize:11,color:"#ef4444",wordBreak:"break-all"}}>{weather.error}</div>
          )}
        </Section>

        {/* Todoist */}
        <Section title="Todoist" color="#10b981">
          <Row label="Token" value={todoist.token_set?"Set in .env ✓":"Missing TODOIST_TOKEN in .env"} status={todoist.token_set?"ok":"error"}/>
          <Row label="API connection" value={todoist.status} status={statusColor(todoist.status)}/>
          {todoist.error && (
            <div style={{background:"#fef2f2",borderRadius:8,padding:"8px 10px",fontSize:11,color:"#ef4444",wordBreak:"break-all"}}>{todoist.error}</div>
          )}
        </Section>

        {/* Google Calendar */}
        <Section title="Google Calendar" color="#38bdf8">
          <Row label="Client ID" value={gcal.client_id_set?"Set in .env ✓":"Missing GOOGLE_CLIENT_ID"} status={gcal.client_id_set?"ok":"error"}/>
          <Row label="Client Secret" value={gcal.client_secret_set?"Set in .env ✓":"Missing GOOGLE_CLIENT_SECRET"} status={gcal.client_secret_set?"ok":"error"}/>
          <Row label="OAuth tokens" value={gcal.tokens_saved?"Saved ✓":"Not authenticated"} status={gcal.tokens_saved?"ok":"warn"}/>
          {gcal.token_expiry && <Row label="Token expires" value={new Date(gcal.token_expiry).toLocaleString()}/>}
          <Row label="Overall status" value={gcal.status} status={statusColor(gcal.status==="authenticated"?"ok":gcal.status)}/>
          {!gcal.tokens_saved && gcal.client_id_set && (
            <a href="/api/auth/google" target="_blank" rel="noreferrer" style={{alignSelf:"flex-start",fontSize:11,padding:"5px 12px",borderRadius:99,border:"1px solid #38bdf440",background:"#f0f9ff",color:"#0284c7",fontWeight:600,display:"inline-block"}}>
              🔗 Authenticate with Google
            </a>
          )}
        </Section>

        {/* Voice */}
        {voice && (
        <Section title="Voice Assistant" color="#f43f5e">
          <Row label="Groq STT" value={voice.groq_stt?.key_set?"API key set ✓":"Missing"} status={voice.groq_stt?.key_set?"ok":"error"}/>
          <Row label="STT model" value={voice.groq_stt?.model||"whisper-large-v3-turbo"}/>
          <Row label="Groq LLM" value={voice.groq_llm?.key_set?"API key set ✓":"Missing"} status={voice.groq_llm?.key_set?"ok":"error"}/>
          <Row label="Intent model" value={voice.groq_llm?.model||"llama-3.1-8b-instant"}/>
          {!voice.groq_stt?.key_set && <div style={{background:"#fef2f2",borderRadius:8,padding:"8px 10px",fontSize:11,color:"#ef4444"}}>Add <code>GROQ_API_KEY=...</code> to .env — free key at console.groq.com</div>}
        </Section>
        )}

        {/* Environment */}
        <Section title="Environment" color="#6366f1">
          <Row label="Port" value={env.port} mono/>
          <Row label="Node env" value={env.node_env} mono/>
          <Row label="Latitude" value={env.lat} mono/>
          <Row label="Longitude" value={env.lon} mono/>
          <Row label="City" value={env.city}/>
        </Section>

      </div>
    </div>
  );
}

// ─── Find My Tab ─────────────────────────────────────────────────────────────
const DEVICE_ICONS = {
  iphone:  <svg width="22" height="22" viewBox="0 0 24 24" fill="none"><rect x="6" y="1" width="12" height="22" rx="3" stroke="currentColor" strokeWidth="1.8"/><line x1="10" y1="5" x2="14" y2="5" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round"/><circle cx="12" cy="19" r="1" fill="currentColor"/></svg>,
  ipad:    <svg width="22" height="22" viewBox="0 0 24 24" fill="none"><rect x="4" y="1" width="16" height="22" rx="3" stroke="currentColor" strokeWidth="1.8"/><circle cx="12" cy="19.5" r="1" fill="currentColor"/></svg>,
  mac:     <svg width="22" height="22" viewBox="0 0 24 24" fill="none"><rect x="2" y="4" width="20" height="13" rx="2" stroke="currentColor" strokeWidth="1.8"/><path d="M8 21h8M12 17v4" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round"/></svg>,
  watch:   <svg width="22" height="22" viewBox="0 0 24 24" fill="none"><rect x="7" y="6" width="10" height="12" rx="3" stroke="currentColor" strokeWidth="1.8"/><line x1="9" y1="4" x2="15" y2="4" stroke="currentColor" strokeWidth="2" strokeLinecap="round"/><line x1="9" y1="20" x2="15" y2="20" stroke="currentColor" strokeWidth="2" strokeLinecap="round"/></svg>,
  airpods: <svg width="22" height="22" viewBox="0 0 24 24" fill="none"><path d="M8 6a4 4 0 014 4v4H8V10A4 4 0 018 6z" stroke="currentColor" strokeWidth="1.8"/><path d="M16 6a4 4 0 014 4v4h-4V10a4 4 0 014-4z" stroke="currentColor" strokeWidth="1.8"/></svg>,
  item:    <svg width="22" height="22" viewBox="0 0 24 24" fill="none"><circle cx="12" cy="12" r="8" stroke="currentColor" strokeWidth="1.8"/><circle cx="12" cy="12" r="3" fill="currentColor" opacity="0.4"/><line x1="12" y1="4" x2="12" y2="2" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round"/></svg>,
  device:  <svg width="22" height="22" viewBox="0 0 24 24" fill="none"><rect x="5" y="2" width="14" height="20" rx="3" stroke="currentColor" strokeWidth="1.8"/></svg>,
};

function BatteryBar({ level, charging }) {
  if (level == null) return null;
  const pct = Math.round(level * 100);
  const col = charging ? '#10b981' : pct > 30 ? '#10b981' : pct > 15 ? '#f59e0b' : '#ef4444';
  return (
    <div style={{ display:'flex', alignItems:'center', gap:4 }}>
      <div style={{ width:28, height:12, border:`1.5px solid ${col}`, borderRadius:3, position:'relative', display:'flex', alignItems:'center', padding:1 }}>
        <div style={{ width:`${pct}%`, height:'100%', background:col, borderRadius:2, transition:'width 0.3s' }}/>
        <div style={{ position:'absolute', right:-4, top:'50%', transform:'translateY(-50%)', width:3, height:6, background:col, borderRadius:'0 2px 2px 0' }}/>
      </div>
      <span style={{ fontSize:11, color:'#64748b' }}>{charging ? '⚡' : ''}{pct}%</span>
    </div>
  );
}

function FindMyTab() {
  const [data,    setData]    = useState(null);
  const [loading, setLoading] = useState(true);
  const [ringing, setRinging] = useState({});
  const [ringMsg, setRingMsg] = useState({});

  const load = useCallback(async (bust = false) => {
    setLoading(true);
    if (bust) await fetch(`${API}/findmy/refresh`, { method:'POST' });
    try {
      const r = await fetch(`${API}/findmy`);
      setData(await r.json());
    } catch { setData({ rabia:[], clare:[], errors:{ rabia:'Network error', clare:'Network error' } }); }
    setLoading(false);
  }, []);

  useEffect(() => { load(); }, [load]);

  const ring = async (account, id, name) => {
    const key = `${account}-${id}`;
    setRinging(r => ({ ...r, [key]: true }));
    setRingMsg(m => ({ ...m, [key]: '' }));
    try {
      const r = await fetch(`${API}/findmy/ring/${account}/${encodeURIComponent(id)}`, { method:'POST' });
      const d = await r.json();
      setRingMsg(m => ({ ...m, [key]: d.ok ? '🔔 Ringing!' : `Error: ${d.error}` }));
    } catch {
      setRingMsg(m => ({ ...m, [key]: 'Network error' }));
    }
    setRinging(r => ({ ...r, [key]: false }));
    setTimeout(() => setRingMsg(m => ({ ...m, [key]: '' })), 4000);
  };

  const OWNERS = [
    { key:'rabia', label:'Rabia', color:RABIA.color, light:RABIA.light },
    { key:'clare', label:'Clare', color:CLARE.color, light:CLARE.light },
  ];

  return (
    <div style={{ maxWidth:600, margin:'0 auto' }}>
      <div style={{ display:'flex', alignItems:'center', justifyContent:'space-between', marginBottom:20 }}>
        <h2 style={{ margin:0, fontSize:20, fontWeight:700, color:'#1e293b' }}>Find My</h2>
        <button onClick={() => load(true)} disabled={loading}
          style={{ padding:'8px 16px', background:'#f1f5f9', border:'1px solid #e2e8f0', borderRadius:10, cursor:'pointer', fontSize:13, color:'#475569' }}>
          {loading ? 'Loading…' : '↻ Refresh'}
        </button>
      </div>

      {loading && !data && (
        <div style={{ textAlign:'center', padding:40, color:'#94a3b8' }}>Loading devices…</div>
      )}

      {data && OWNERS.map(({ key, label, color, light }) => {
        const devices = data[key] || [];
        const err     = data.errors?.[key];
        return (
          <div key={key} style={{ ...CARD, marginBottom:16, overflow:'hidden' }}>
            <div style={{ padding:'14px 20px', background:light, borderBottom:'1px solid #f1f5f9', display:'flex', alignItems:'center', gap:8 }}>
              <div style={{ width:10, height:10, borderRadius:'50%', background:color }}/>
              <span style={{ fontWeight:700, color, fontSize:15 }}>{label}</span>
              <span style={{ fontSize:12, color:'#94a3b8', marginLeft:'auto' }}>{devices.length} device{devices.length!==1?'s':''}</span>
            </div>

            {err && (
              <div style={{ padding:'12px 20px', color:'#ef4444', fontSize:13 }}>
                {err.includes('2FA_REQUIRED')
                  ? '2FA required — run: python3 server/findmy_setup.py ' + key
                  : err}
              </div>
            )}

            {!err && devices.length === 0 && (
              <div style={{ padding:'12px 20px', color:'#94a3b8', fontSize:13 }}>No devices found</div>
            )}

            {devices.map(d => {
              const k = `${key}-${d.id}`;
              return (
                <div key={d.id} style={{ display:'flex', alignItems:'center', gap:12, padding:'14px 20px', borderBottom:'1px solid #f8fafc' }}>
                  <div style={{ color, flexShrink:0 }}>{DEVICE_ICONS[d.type] || DEVICE_ICONS.device}</div>
                  <div style={{ flex:1, minWidth:0 }}>
                    <div style={{ fontWeight:600, fontSize:14, color:'#1e293b', whiteSpace:'nowrap', overflow:'hidden', textOverflow:'ellipsis' }}>{d.name}</div>
                    <div style={{ display:'flex', alignItems:'center', gap:8, marginTop:3 }}>
                      <span style={{ fontSize:11, color: d.online ? '#10b981' : '#94a3b8' }}>
                        {d.online ? '● Online' : '○ Offline'}
                      </span>
                      <BatteryBar level={d.battery} charging={d.charging}/>
                    </div>
                    {ringMsg[k] && <div style={{ fontSize:12, color: ringMsg[k].startsWith('🔔') ? '#10b981' : '#ef4444', marginTop:2 }}>{ringMsg[k]}</div>}
                  </div>
                  <button onClick={() => ring(key, d.id, d.name)} disabled={ringing[k]}
                    style={{ flexShrink:0, padding:'8px 14px', background: ringing[k] ? '#f1f5f9' : color, color: ringing[k] ? '#94a3b8' : '#fff', border:'none', borderRadius:10, cursor: ringing[k] ? 'default' : 'pointer', fontSize:13, fontWeight:600, fontFamily:'inherit', transition:'all 0.15s' }}>
                    {ringing[k] ? '…' : '🔔 Ring'}
                  </button>
                </div>
              );
            })}
          </div>
        );
      })}
    </div>
  );
}

// ─── NAV ─────────────────────────────────────────────────────────────────────
const NAV = [
  { id:"home",      label:"Home",      color:"#f472b6", icon:<svg width="22" height="22" viewBox="0 0 24 24" fill="none"><path d="M3 9l9-7 9 7v11a2 2 0 01-2 2H5a2 2 0 01-2-2z" stroke="currentColor" strokeWidth="1.8" strokeLinejoin="round"/><polyline points="9 22 9 12 15 12 15 22" stroke="currentColor" strokeWidth="1.8" strokeLinejoin="round"/></svg> },
  { id:"weather",   label:"Weather",   color:"#0ea5e9", icon:<svg width="22" height="22" viewBox="0 0 24 24" fill="none"><circle cx="12" cy="10" r="4" stroke="currentColor" strokeWidth="1.8"/><line x1="12" y1="3" x2="12" y2="5" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round"/><line x1="19" y1="10" x2="21" y2="10" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round"/><path d="M7 18c0-2.8 2.2-5 5-5s5 2.2 5 5" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round"/></svg> },
  { id:"upcoming",  label:"Upcoming",  color:"#6366f1", icon:<svg width="22" height="22" viewBox="0 0 24 24" fill="none"><rect x="3" y="4" width="18" height="18" rx="3" stroke="currentColor" strokeWidth="1.8"/><line x1="8" y1="2" x2="8" y2="6" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round"/><line x1="16" y1="2" x2="16" y2="6" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round"/><line x1="3" y1="10" x2="21" y2="10" stroke="currentColor" strokeWidth="1.5"/><line x1="8" y1="14" x2="16" y2="14" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round"/><line x1="8" y1="18" x2="13" y2="18" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round"/></svg> },
  { id:"groceries", label:"Groceries", color:"#059669", icon:<svg width="22" height="22" viewBox="0 0 24 24" fill="none"><path d="M6 2L3 6v14a2 2 0 002 2h14a2 2 0 002-2V6l-3-4z" stroke="currentColor" strokeWidth="1.8" strokeLinejoin="round"/><line x1="3" y1="6" x2="21" y2="6" stroke="currentColor" strokeWidth="1.8"/><path d="M16 10a4 4 0 01-8 0" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round"/></svg> },
  { id:"lights",    label:"Lights",    color:"#fbbf24", icon:<svg width="22" height="22" viewBox="0 0 24 24" fill="none"><path d="M12 2C8.7 2 6 4.7 6 8c0 2.5 1.4 4.7 3.5 5.9V18h5v-4.1C16.6 12.7 18 10.5 18 8c0-3.3-2.7-6-6-6z" stroke="currentColor" strokeWidth="1.8"/><line x1="9.5" y1="18" x2="14.5" y2="18" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round"/><line x1="10.5" y1="21" x2="13.5" y2="21" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round"/></svg> },
  { id:"tasks",     label:"Tasks",     color:"#10b981", icon:<svg width="22" height="22" viewBox="0 0 24 24" fill="none"><rect x="3" y="3" width="18" height="18" rx="3" stroke="currentColor" strokeWidth="1.8"/><line x1="8" y1="9" x2="16" y2="9" stroke="currentColor" strokeWidth="1.5"/><line x1="8" y1="13" x2="13" y2="13" stroke="currentColor" strokeWidth="1.5"/><circle cx="6" cy="9" r="1.2" fill="currentColor"/><circle cx="6" cy="13" r="1.2" fill="currentColor"/></svg> },
  { id:"calendar",  label:"Calendar",  color:"#38bdf8", icon:<svg width="22" height="22" viewBox="0 0 24 24" fill="none"><rect x="3" y="4" width="18" height="18" rx="3" stroke="currentColor" strokeWidth="1.8"/><line x1="8" y1="2" x2="8" y2="6" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round"/><line x1="16" y1="2" x2="16" y2="6" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round"/><line x1="3" y1="10" x2="21" y2="10" stroke="currentColor" strokeWidth="1.5"/></svg> },
  { id:"rewards",   label:"Rewards",   color:"#a855f7", icon:<svg width="22" height="22" viewBox="0 0 24 24" fill="none"><polygon points="12,2 15.1,8.3 22,9.3 17,14.1 18.2,21 12,17.8 5.8,21 7,14.1 2,9.3 8.9,8.3" stroke="currentColor" strokeWidth="1.8" strokeLinejoin="round"/></svg> },
  { id:"budget",    label:"Budget",    color:"#10b981", icon:<svg width="22" height="22" viewBox="0 0 24 24" fill="none"><rect x="2" y="5" width="20" height="14" rx="3" stroke="currentColor" strokeWidth="1.8"/><line x1="2" y1="10" x2="22" y2="10" stroke="currentColor" strokeWidth="1.5"/><circle cx="7" cy="15" r="1.5" fill="currentColor"/><line x1="11" y1="15" x2="17" y2="15" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round"/></svg> },
  { id:"voice",     label:"Voice",     color:"#f43f5e", icon:<svg width="22" height="22" viewBox="0 0 24 24" fill="none"><rect x="9" y="3" width="6" height="11" rx="3" stroke="currentColor" strokeWidth="1.8"/><path d="M5 10a7 7 0 0014 0" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round"/><line x1="12" y1="19" x2="12" y2="22" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round"/><line x1="8" y1="22" x2="16" y2="22" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round"/></svg> },
  { id:"findmy",    label:"Find My",   color:"#34d399", icon:<svg width="22" height="22" viewBox="0 0 24 24" fill="none"><circle cx="12" cy="10" r="4" stroke="currentColor" strokeWidth="1.8"/><path d="M12 2C7.6 2 4 5.6 4 10c0 5.4 8 12 8 12s8-6.6 8-12c0-4.4-3.6-8-8-8z" stroke="currentColor" strokeWidth="1.8" strokeLinejoin="round"/></svg> },
  { id:"debug",     label:"Debug",     color:"#64748b", icon:<svg width="22" height="22" viewBox="0 0 24 24" fill="none"><circle cx="12" cy="12" r="3" stroke="currentColor" strokeWidth="1.8"/><path d="M12 2v3M12 19v3M2 12h3M19 12h3M4.22 4.22l2.12 2.12M17.66 17.66l2.12 2.12M4.22 19.78l2.12-2.12M17.66 6.34l2.12-2.12" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round"/></svg> },
];

// ─── ROOT APP ─────────────────────────────────────────────────────────────────
export default function App() {
  const [tab,        setTab]        = useState("home");
  const [screensaver,setScreensaver]= useState(false);
  const hub  = useHub();
  const wide = useWide();

  // ── Voice tab — open and auto-start mic from header button ──
  const [voiceTrigger, setVoiceTrigger] = useState(0);
  const openVoice = useCallback(() => {
    setTab('voice');
    setVoiceTrigger(t => t + 1);
  }, []);

  // ── Manual screensaver — suppress motion dismiss for 10s ──
  const startScreensaver = useCallback(() => {
    motionPausedUntil.current = Date.now() + 10_000;
    setScreensaver(true);
    clearTimeout(idleTimer.current); // don't auto-dismiss while manually locked
  }, []);

  // ── Header lights toggle ──
  const [headerLightsOn, setHeaderLightsOn] = useState(null); // null = unknown
  const toggleAllLights = useCallback(async () => {
    const next = !headerLightsOn;
    setHeaderLightsOn(next);
    try {
      await fetch(`${API}/lights/group`, {
        method: 'POST', headers: {'Content-Type':'application/json'},
        body: JSON.stringify({ on: next }),
      });
    } catch {}
  }, [headerLightsOn]);

  // Sync header lights state from /api/lights every 30s
  useEffect(() => {
    const sync = async () => {
      try {
        const devices = await fetch(`${API}/lights`).then(r => r.json());
        if (Array.isArray(devices) && devices.length) {
          setHeaderLightsOn(devices.some(d => d.on && !d.unreachable));
        }
      } catch {}
    };
    sync();
    const t = setInterval(sync, 30000);
    return () => clearInterval(t);
  }, []);

  // ── Idle screensaver: activate after 2 min of no interaction ──
  const idleTimer = useRef(null);
  const IDLE_MS = 1 * 60 * 1000;
  const motionPausedUntil = useRef(0); // timestamp — suppress motion dismissal until this time

  const resetIdle = useCallback(() => {
    clearTimeout(idleTimer.current);
    idleTimer.current = setTimeout(() => setScreensaver(true), IDLE_MS);
  }, []); // no dependency on screensaver — always restarts the timer
  useEffect(() => { resetIdle(); return () => clearTimeout(idleTimer.current); }, []);

  // ── Poll /api/motion every 3s — dismiss screensaver if motion detected ──
  useEffect(() => {
    const poll = setInterval(async () => {
      try {
        const d = await fetch(`${API}/motion`).then(r => r.json());
        if (d.active && Date.now() > motionPausedUntil.current) {
          setScreensaver(false);
          resetIdle(); // restart the idle countdown
        }
      } catch {}
    }, 3000);
    return () => clearInterval(poll);
  }, [resetIdle]);

  // ── JS-driven scroll with momentum ──
  // Handles BOTH touch events (proper touch screens) AND mouse-drag events
  // (USB HID touchscreens on Linux/Pi often report as mouse, not touch)
  const scrollRef  = useRef(null);
  const dragState  = useRef(null);   // shared by touch + mouse handlers
  const rafRef     = useRef(null);

  const startDrag = useCallback((clientY) => {
    cancelAnimationFrame(rafRef.current);
    dragState.current = {
      startY:   clientY,
      startTop: scrollRef.current ? scrollRef.current.scrollTop : 0,
      lastY:    clientY,
      lastT:    Date.now(),
      vel:      0,
    };
  }, []);

  const moveDrag = useCallback((clientY) => {
    if (!dragState.current || !scrollRef.current) return;
    const now = Date.now();
    const dt  = now - dragState.current.lastT;
    if (dt > 0) dragState.current.vel = (dragState.current.lastY - clientY) / dt;
    dragState.current.lastY = clientY;
    dragState.current.lastT = now;
    scrollRef.current.scrollTop = dragState.current.startTop + (dragState.current.startY - clientY);
  }, []);

  const endDrag = useCallback(() => {
    if (!dragState.current || !scrollRef.current) return;
    let vel = dragState.current.vel * 16;
    dragState.current = null;
    const el = scrollRef.current;
    const step = () => {
      if (Math.abs(vel) < 0.5) return;
      el.scrollTop += vel;
      vel *= 0.93;
      rafRef.current = requestAnimationFrame(step);
    };
    rafRef.current = requestAnimationFrame(step);
  }, []);

  // Touch handlers
  const onTouchStart = useCallback(e => startDrag(e.touches[0].clientY), [startDrag]);
  const onTouchMove  = useCallback(e => moveDrag(e.touches[0].clientY),  [moveDrag]);
  const onTouchEnd   = useCallback(() => endDrag(), [endDrag]);

  // Mouse-drag handlers (fallback for HID touchscreens that send mouse events)
  const onMouseDown  = useCallback(e => { if(e.button!==0) return; startDrag(e.clientY); }, [startDrag]);
  const onMouseMove  = useCallback(e => { if(!dragState.current) return; moveDrag(e.clientY); }, [moveDrag]);
  const onMouseUp    = useCallback(() => endDrag(), [endDrag]);

  const uidMap = {};
  hub.users.forEach(u=>{
    if(u.email==='rabia1082@gmail.com')           uidMap[u.id]='rabia';
    if(u.email==='clare.a.tiedemann@gmail.com')   uidMap[u.id]='clare';
  });

  const handleCompleteTask = async (task, who, countsForReward) => {
    hub.setTasks(ts=>ts.filter(t=>t.id!==task.id));
    const res = await fetch(`${API}/tasks/${task.id}/close`,{
      method:"POST", headers:{"Content-Type":"application/json"},
      body:JSON.stringify({assignee:who, counts_for_reward:countsForReward||task.counts_for_reward}),
    }).then(r=>r.json());
    if(res.points) hub.setPts(res.points);
  };

  const handleDeleteTask = async task => {
    hub.setTasks(ts=>ts.filter(t=>t.id!==task.id));
    await fetch(`${API}/tasks/${task.id}`,{method:"DELETE"});
  };

  const handleAddTask = async body => {
    await fetch(`${API}/tasks`,{method:"POST",headers:{"Content-Type":"application/json"},body:JSON.stringify(body)});
    hub.reload.tasks();
  };

  const handleResetPts = async who => {
    const res=await fetch(`${API}/points/reset`,{method:"POST",headers:{"Content-Type":"application/json"},body:JSON.stringify({who})}).then(r=>r.json());
    hub.setPts(res);
  };

  return (
    <div
      style={{ height:"100vh", display:"flex", flexDirection:"column", background:"#f0f4f8", fontFamily:"'DM Sans','Segoe UI',sans-serif", overflow:"hidden" }}
      onMouseMove={resetIdle} onMouseDown={resetIdle} onTouchStart={resetIdle} onKeyDown={resetIdle}
    >
      {screensaver && <Screensaver onDismiss={()=>{ setScreensaver(false); resetIdle(); }}/>}
      <style>{`
        @import url('https://fonts.googleapis.com/css2?family=DM+Sans:ital,opsz,wght@0,9..40,300;0,9..40,400;0,9..40,600;0,9..40,800;1,9..40,400&display=swap');
        * { box-sizing:border-box; margin:0; padding:0; -webkit-tap-highlight-color:transparent; }
        html, body { touch-action:none; -webkit-user-select:none; user-select:none; }
        input, textarea { user-select:text !important; -webkit-user-select:text !important; touch-action:auto !important; }
        body { background:#f0f4f8; overscroll-behavior:none; }
        button { font-family:inherit; }
        input[type=range]{-webkit-appearance:none;height:5px;border-radius:99px;outline:none;cursor:pointer;}
        input[type=range]::-webkit-slider-thumb{-webkit-appearance:none;width:22px;height:22px;border-radius:50%;background:#fff;border:2.5px solid #fbbf24;box-shadow:0 2px 6px rgba(0,0,0,0.15);}
        ::-webkit-scrollbar{width:6px;height:6px;}
        ::-webkit-scrollbar-thumb{background:#e2e8f0;border-radius:99px;}
        ::-webkit-scrollbar-track{background:transparent;}
        a{text-decoration:none;}
      `}</style>

      {/* Header — always visible */}
      <Header wx={hub.wx} sun={hub.sun} pts={hub.pts} lightsOn={headerLightsOn} onToggleLights={toggleAllLights} onStartScreensaver={startScreensaver} onOpenVoice={openVoice}/>

      <div style={{ flex:1, minHeight:0, display:"flex", overflow:"hidden" }}>

        {/* Sidebar nav — wide screens (Pi / desktop) */}
        {wide && (
          <div style={{ width:190, background:"rgba(255,255,255,0.97)", borderRight:"1px solid rgba(0,0,0,0.07)", display:"flex", flexDirection:"column", flexShrink:0, overflowY:"auto", paddingTop:8 }}>
            {NAV.map(n=>{
              const active = tab===n.id;
              return (
                <button key={n.id} onClick={()=>setTab(n.id)} style={{ display:"flex", alignItems:"center", gap:14, padding:"16px 20px", background:active?`${n.color}14`:"transparent", border:"none", borderLeft:`3px solid ${active?n.color:"transparent"}`, cursor:"pointer", color:active?n.color:"#64748b", fontFamily:"inherit", transition:"all 0.15s", textAlign:"left" }}>
                  {n.icon}
                  <span style={{ fontSize:15, fontWeight:active?700:500 }}>{n.label}</span>
                </button>
              );
            })}
          </div>
        )}

        {/* Scrollable content */}
        <div
          ref={scrollRef}
          onTouchStart={onTouchStart}
          onTouchMove={onTouchMove}
          onTouchEnd={onTouchEnd}
          onMouseDown={onMouseDown}
          onMouseMove={onMouseMove}
          onMouseUp={onMouseUp}
          onMouseLeave={onMouseUp}
          style={{ flex:1, minHeight:0, overflowY:"scroll", touchAction:"none", cursor: dragState.current ? "grabbing" : "default", userSelect:"none", WebkitUserSelect:"none", padding: wide ? "24px 28px 28px" : "16px 16px 100px" }}
        >
          {tab==="home"      && <HomeTab evts={hub.evts} tasks={hub.tasks} projs={hub.projs} pts={hub.pts} wx={hub.wx} authOk={hub.authOk} onResetPts={handleResetPts} onCompleteTask={handleCompleteTask} onSetTab={setTab} wide={wide} uidMap={uidMap}/>}
          {tab==="weather"   && <WeatherTab wx={hub.wx} sun={hub.sun}/>}
          {tab==="upcoming"  && <UpcomingTab tasks={hub.tasks} projs={hub.projs} uidMap={uidMap}/>}
          {tab==="groceries" && <GroceriesTab tasks={hub.tasks} projs={hub.projs} onComplete={handleCompleteTask} onDelete={handleDeleteTask} onAdd={handleAddTask}/>}
          {tab==="tasks"     && <TasksTab tasks={hub.tasks} projs={hub.projs} pts={hub.pts} onComplete={handleCompleteTask} onDelete={handleDeleteTask} onAdd={handleAddTask} reload={hub.reload} uidMap={uidMap}/>}
          {tab==="calendar"  && <CalendarTab evts={hub.evts} authOk={hub.authOk} reload={hub.reload}/>}
          {tab==="lights"    && <LightsTab/>}
          {tab==="rewards"   && <RewardsTab pts={hub.pts} setPts={hub.setPts} rwds={hub.rwds} setRwds={hub.setRwds}/>}
          {tab==="budget"    && <BudgetTab/>}
          {tab==="voice"     && <VoiceTab triggerRecord={voiceTrigger}/>}
          {tab==="findmy"    && <FindMyTab/>}
          {tab==="debug"     && <DebugTab/>}
        </div>
      </div>

      {/* Bottom nav — narrow screens (mobile) */}
      {!wide && (
      <div style={{ position:"fixed", bottom:0, left:0, right:0, background:"rgba(255,255,255,0.97)", backdropFilter:"blur(20px)", borderTop:"1px solid rgba(0,0,0,0.07)", display:"flex", justifyContent:"space-around", padding:"10px 2px 20px", zIndex:200, overflowX:"auto" }}>
        {NAV.map(n=>{
          const active=tab===n.id;
          return (
            <button key={n.id} onClick={()=>setTab(n.id)} style={{ display:"flex",flexDirection:"column",alignItems:"center",gap:3,background:"transparent",border:"none",cursor:"pointer",padding:"4px 6px",color:active?n.color:"#94a3b8",transition:"color 0.2s",minWidth:52,flexShrink:0 }}>
              <div style={{transform:active?"scale(1.1)":"scale(1)",transition:"transform 0.2s"}}>{n.icon}</div>
              <div style={{fontSize:9,fontWeight:active?800:600,letterSpacing:0.1}}>{n.label}</div>
              {active&&<div style={{width:4,height:4,borderRadius:"50%",background:n.color}}/>}
            </button>
          );
        })}
      </div>
      )}
    </div>
  );
}
