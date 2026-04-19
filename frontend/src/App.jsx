import { useState, useEffect, useCallback, useRef } from "react";

const API = "/api";
const RABIA = { name:"Rabia", color:"#38bdf8", light:"#e0f2fe", dark:"#0369a1", initial:"R" };
const CLARE = { name:"Clare", color:"#f472b6", light:"#fce7f3", dark:"#9d174d", initial:"C" };
const REWARD_PROJECTS = ["chores","house items","cats"];
const countsForReward = p => REWARD_PROJECTS.includes((p||"").toLowerCase().trim());

const WX = {0:["Clear","☀️"],1:["Mainly clear","🌤️"],2:["Partly cloudy","⛅"],3:["Overcast","☁️"],45:["Foggy","🌫️"],51:["Drizzle","🌦️"],61:["Light rain","🌧️"],63:["Rain","🌧️"],65:["Heavy rain","⛈️"],71:["Light snow","🌨️"],73:["Snow","❄️"],80:["Showers","🌦️"],95:["Storm","⛈️"]};
const wxE = c=>(WX[c]||["–","🌡️"])[1];
const wxL = c=>(WX[c]||["–","🌡️"])[0];

const fmt12 = iso => { if(!iso) return "--"; const d=new Date(iso); let h=d.getHours(),m=d.getMinutes().toString().padStart(2,"0"); return `${h%12||12}:${m}${h>=12?"p":"a"}`; };
const fmtFull12 = iso => { if(!iso) return "--:--"; const d=new Date(iso); let h=d.getHours(),m=d.getMinutes().toString().padStart(2,"0"); return `${h%12||12}:${m} ${h>=12?"PM":"AM"}`; };
const fmtDate = d => d.toLocaleDateString("en-US",{weekday:"long",month:"long",day:"numeric"});
const fmtTime = d => { let h=d.getHours(),m=d.getMinutes().toString().padStart(2,"0"); return `${h%12||12}:${m} ${h>=12?"PM":"AM"}`; };

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

  const loadWx   = useCallback(()=>fetch(`${API}/weather`).then(r=>r.json()).then(setWx).catch(()=>{}), []);
  const loadSun  = useCallback(()=>fetch(`${API}/sun`).then(r=>r.json()).then(setSun).catch(()=>{}), []);
  const loadPts  = useCallback(()=>fetch(`${API}/points`).then(r=>r.json()).then(setPts).catch(()=>{}), []);
  const loadRwds = useCallback(()=>fetch(`${API}/rewards`).then(r=>r.json()).then(setRwds).catch(()=>{}), []);
  const loadProjs= useCallback(()=>fetch(`${API}/projects`).then(r=>r.json()).then(d=>setProjs(Array.isArray(d)?d:[])).catch(()=>{}), []);
  const loadTasks= useCallback(()=>fetch(`${API}/tasks`).then(r=>r.json()).then(d=>setTasks(Array.isArray(d)?d:[])).catch(()=>{}), []);
  const loadCal  = useCallback(async()=>{
    try {
      const r=await fetch(`${API}/calendar`);
      if(r.status===401){setAuthOk(false);return;}
      setEvts(await r.json()); setAuthOk(true);
    } catch{setAuthOk(false);}
  },[]);

  useEffect(()=>{
    loadWx(); loadSun(); loadPts(); loadRwds(); loadProjs(); loadTasks(); loadCal();
    const t1=setInterval(loadWx,  600000);
    const t2=setInterval(loadSun, 600000);
    const t3=setInterval(loadTasks,30000);
    const t4=setInterval(loadCal,  60000);
    return()=>{clearInterval(t1);clearInterval(t2);clearInterval(t3);clearInterval(t4);};
  },[]);

  return { wx,sun,pts,setPts,tasks,setTasks,projs,evts,setEvts,authOk,rwds,setRwds, reload:{wx:loadWx,sun:loadSun,pts:loadPts,rwds:loadRwds,tasks:loadTasks,cal:loadCal,projs:loadProjs} };
}

// ─── Shared UI ────────────────────────────────────────────────────────────────
function Av({ person, size=48 }) {
  return <div style={{ width:size,height:size,borderRadius:"50%",background:person.color,display:"flex",alignItems:"center",justifyContent:"center",fontSize:size*0.38,fontWeight:800,color:"#fff",border:"3px solid rgba(255,255,255,0.85)",boxShadow:`0 2px 12px ${person.color}55`,flexShrink:0 }}>{person.initial}</div>;
}

function Pill({ label, color, bg }) {
  return <span style={{ fontSize:11,fontWeight:700,padding:"3px 10px",borderRadius:99,background:bg||color+"22",color:color,letterSpacing:0.3 }}>{label}</span>;
}

function StarBadge({ pts }) {
  const icon = pts>=500?"🏆":pts>=250?"🥇":pts>=100?"⭐":"✨";
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
function Header({ wx, sun, pts }) {
  const [now, setNow] = useState(new Date());
  useEffect(()=>{ const t=setInterval(()=>setNow(new Date()),1000); return()=>clearInterval(t); },[]);

  const cur  = wx?.current;
  const code = cur?.weather_code;
  const sunset = sun?.sunset;

  return (
    <div style={{ background:GRAD, padding:"28px 28px 24px", flexShrink:0, position:"relative", overflow:"hidden" }}>
      <div style={{ position:"absolute",top:-60,right:-60,width:240,height:240,borderRadius:"50%",background:"rgba(255,255,255,0.07)" }}/>
      <div style={{ position:"absolute",bottom:-80,left:-50,width:260,height:260,borderRadius:"50%",background:"rgba(255,255,255,0.05)" }}/>
      <div style={{ position:"relative", zIndex:1 }}>
        {/* Top row: title + clock */}
        <div style={{ display:"flex", justifyContent:"space-between", alignItems:"flex-start", marginBottom:16 }}>
          <div>
            <div style={{ fontSize:12,fontWeight:700,color:"rgba(255,255,255,0.65)",letterSpacing:2,textTransform:"uppercase" }}>Akhtar-Tiedemann</div>
            <div style={{ fontSize:14,color:"rgba(255,255,255,0.75)",marginTop:2 }}>{fmtDate(now)}</div>
          </div>
          <div style={{ fontSize:52,fontWeight:200,color:"#fff",lineHeight:1,letterSpacing:-3 }}>{fmtTime(now)}</div>
        </div>

        {/* Bottom row: weather + points + sunset */}
        <div style={{ display:"flex", gap:10, alignItems:"center" }}>
          {cur && (
            <div style={{ display:"flex",alignItems:"center",gap:8,background:"rgba(255,255,255,0.18)",backdropFilter:"blur(12px)",borderRadius:16,padding:"10px 16px",flex:1 }}>
              <span style={{fontSize:28,lineHeight:1}}>{wxE(code)}</span>
              <div>
                <div style={{fontSize:22,fontWeight:700,color:"#fff",lineHeight:1}}>{Math.round(cur.temperature_2m)}°F</div>
                <div style={{fontSize:12,color:"rgba(255,255,255,0.8)"}}>{wxL(code)} · {Math.round(cur.wind_speed_10m)}mph</div>
              </div>
            </div>
          )}
          {sunset && (
            <div style={{ display:"flex",alignItems:"center",gap:8,background:"rgba(255,255,255,0.18)",backdropFilter:"blur(12px)",borderRadius:16,padding:"10px 16px" }}>
              <span style={{fontSize:22}}>🌅</span>
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
      </div>
    </div>
  );
}

// ─── HOME DAILY TASK ROW ──────────────────────────────────────────────────────
function HomeDailyTaskRow({ task, onComplete }) {
  const [assignee, setAssignee] = useState("");
  const [done,     setDone]     = useState(false);

  const complete = () => { setDone(true); onComplete(task, assignee, task.counts_for_reward); };

  return (
    <div style={{display:"flex",alignItems:"center",padding:"0 20px",minHeight:60,borderBottom:"1px solid #f8fafc",gap:14,opacity:done?0.35:1,transition:"opacity 0.3s"}}>
      <button onClick={complete}
        style={{width:24,height:24,borderRadius:"50%",border:"2px solid #10b981",background:"transparent",cursor:"pointer",flexShrink:0,display:"flex",alignItems:"center",justifyContent:"center"}}>
        {done && <div style={{width:9,height:9,borderRadius:"50%",background:"#10b981"}}/>}
      </button>
      <div style={{flex:1,minWidth:0}}>
        <div style={{fontSize:14,color:"#1e293b",fontWeight:500,textDecoration:done?"line-through":"none"}}>{task.content}</div>
        {task.project_name && <div style={{fontSize:11,color:"#94a3b8",marginTop:1}}>{task.project_name}</div>}
      </div>
      {task.counts_for_reward && <span style={{fontSize:10,color:"#10b981",fontWeight:700}}>+5⭐</span>}
      <div style={{display:"flex",gap:5,flexShrink:0}}>
        {[RABIA,CLARE].map(p=>(
          <button key={p.name} onClick={()=>setAssignee(a=>a===p.name.toLowerCase()?"":p.name.toLowerCase())}
            style={{width:28,height:28,borderRadius:"50%",border:`2px solid ${assignee===p.name.toLowerCase()?p.color:"#e2e8f0"}`,background:assignee===p.name.toLowerCase()?p.color:"#fff",color:assignee===p.name.toLowerCase()?"#fff":"#94a3b8",fontWeight:800,fontSize:12,cursor:"pointer",fontFamily:"inherit"}}>
            {p.initial}
          </button>
        ))}
      </div>
    </div>
  );
}

// ─── HOME TAB ─────────────────────────────────────────────────────────────────
function HomeTab({ evts, tasks, projs, pts, wx, sun, authOk, onResetPts, onCompleteTask, onSetTab, wide }) {
  const today = new Date(); today.setHours(0,0,0,0);
  const todayStr = today.toISOString().slice(0,10);

  const todayEvts = evts.filter(e=>{
    const s=new Date(e.start); s.setHours(0,0,0,0);
    return s.getTime()===today.getTime();
  }).sort((a,b)=>{
    if(a.allDay && !b.allDay) return -1;
    if(!a.allDay && b.allDay) return 1;
    return new Date(a.start)-new Date(b.start);
  });

  const groceriesProj = projs.find(p=>p.name.toLowerCase()==="groceries");
  const dailyTasks = tasks.filter(t=>!t.checked && t.due?.date===todayStr && t.project_id!==groceriesProj?.id);
  const groceryTasks = groceriesProj ? tasks.filter(t=>!t.checked && t.project_id===groceriesProj.id) : [];

  const people = [RABIA, CLARE];

  const personCards = people.map(person => {
    const pKey   = person.name.toLowerCase();
    const points = pts[`${pKey}_points`]||0;
    const nextMilestone = [100,250,500,750,1000].find(m=>m>points)||1000;
    const progress = Math.round((points/nextMilestone)*100);
    return (
      <div key={person.name} style={{...CARD, overflow:"hidden"}}>
        <div style={{ background:`linear-gradient(135deg,${person.color}22,${person.color}08)`, padding:"18px 20px", display:"flex",alignItems:"center",gap:14 }}>
          <Av person={person} size={wide?64:52} />
          <div style={{flex:1}}>
            <div style={{fontSize:wide?22:18,fontWeight:800,color:"#1e293b"}}>{person.name}</div>
            <div style={{display:"flex",alignItems:"center",gap:8,marginTop:4}}>
              <div style={{flex:1,height:8,background:`${person.color}20`,borderRadius:99,overflow:"hidden"}}>
                <div style={{height:"100%",width:`${progress}%`,background:person.color,borderRadius:99,transition:"width 0.5s"}}/>
              </div>
              <div style={{fontSize:12,fontWeight:700,color:person.color}}>{points} / {nextMilestone} ⭐</div>
            </div>
          </div>
          <button onClick={()=>onResetPts(pKey)} style={{fontSize:11,padding:"4px 12px",borderRadius:99,border:`1px solid ${person.color}40`,background:"transparent",color:person.color,cursor:"pointer",fontFamily:"inherit"}}>reset</button>
        </div>
      </div>
    );
  });

  const calCard = (
    <div style={{...CARD, overflow:"hidden"}}>
      <div style={{padding:"14px 20px",borderBottom:"1px solid #f1f5f9",background:"#fafafa",display:"flex",alignItems:"center",gap:10}}>
        <span style={{fontSize:16}}>📅</span>
        <div style={{fontSize:14,fontWeight:800,color:"#1e293b"}}>Today</div>
        {todayEvts.length>0 && <span style={{fontSize:12,fontWeight:600,color:"#94a3b8"}}>{todayEvts.length} event{todayEvts.length!==1?"s":""}</span>}
      </div>
      {todayEvts.length===0 && authOk===false && (
        <div style={{padding:"14px 20px"}}>
          <a href="/api/auth/google" target="_blank" rel="noreferrer"
            style={{display:"inline-block",fontSize:13,padding:"8px 16px",background:"#fef9c3",color:"#854d0e",borderRadius:12,fontWeight:600,textDecoration:"none"}}>
            📅 Connect Google Calendar →
          </a>
        </div>
      )}
      {todayEvts.length===0 && authOk!==false && (
        <div style={{padding:"20px",textAlign:"center",color:"#94a3b8",fontSize:14}}>Nothing scheduled today</div>
      )}
      {todayEvts.map((e,i)=>{
        const person = e.calendar==="Rabia"?RABIA:e.calendar==="Clare"?CLARE:null;
        return (
          <div key={e.id} style={{display:"flex",alignItems:"center",gap:12,padding:"12px 20px",borderBottom:i<todayEvts.length-1?"1px solid #f8fafc":"none"}}>
            <div style={{width:3,alignSelf:"stretch",borderRadius:99,background:e.color,flexShrink:0,minHeight:36}}/>
            <div style={{flex:1,minWidth:0}}>
              <div style={{fontSize:wide?16:14,fontWeight:600,color:"#1e293b"}}>{e.title}</div>
              <div style={{fontSize:12,color:"#94a3b8",marginTop:2}}>
                {e.allDay ? "All day" : `${fmtFull12(e.start)} – ${fmtFull12(e.end)}`}
              </div>
            </div>
            {person && <Av person={person} size={28}/>}
          </div>
        );
      })}
    </div>
  );

  const tasksCard = dailyTasks.length > 0 ? (
    <div style={{...CARD, overflow:"hidden"}}>
      <div style={{padding:"14px 20px",borderBottom:"1px solid #f1f5f9",background:"#fafafa",display:"flex",alignItems:"center",gap:10}}>
        <span style={{fontSize:16}}>📋</span>
        <div style={{fontSize:14,fontWeight:800,color:"#1e293b"}}>Due Today</div>
        <span style={{fontSize:12,fontWeight:600,color:"#94a3b8"}}>{dailyTasks.length} task{dailyTasks.length!==1?"s":""}</span>
      </div>
      {dailyTasks.map(t=><HomeDailyTaskRow key={t.id} task={t} onComplete={onCompleteTask}/>)}
    </div>
  ) : null;

  const grocCard = groceriesProj ? (
    <div style={{...CARD, overflow:"hidden"}}>
      <div style={{padding:"14px 20px",borderBottom:"1px solid #f1f5f9",background:"#f0fdf4",display:"flex",justifyContent:"space-between",alignItems:"center"}}>
        <div style={{display:"flex",alignItems:"center",gap:10}}>
          <span style={{fontSize:16}}>🛒</span>
          <div style={{fontSize:14,fontWeight:800,color:"#059669"}}>Groceries</div>
          <span style={{fontSize:12,fontWeight:600,color:"#94a3b8"}}>{groceryTasks.length} item{groceryTasks.length!==1?"s":""}</span>
        </div>
        <button onClick={()=>onSetTab("groceries")} style={{fontSize:12,padding:"6px 14px",borderRadius:99,border:"1px solid #059669",background:"transparent",color:"#059669",cursor:"pointer",fontFamily:"inherit",fontWeight:600}}>See all →</button>
      </div>
      {groceryTasks.length===0 && <div style={{padding:"16px 20px",fontSize:13,color:"#94a3b8"}}>All clear!</div>}
      {groceryTasks.slice(0,5).map((t,i)=>(
        <div key={t.id} style={{display:"flex",alignItems:"center",padding:"0 20px",minHeight:48,borderBottom:i<Math.min(groceryTasks.length,5)-1?"1px solid #f8fafc":"none",gap:12}}>
          <div style={{width:7,height:7,borderRadius:"50%",background:"#10b981",flexShrink:0}}/>
          <div style={{fontSize:14,color:"#1e293b"}}>{t.content}</div>
        </div>
      ))}
      {groceryTasks.length>5 && <div style={{padding:"10px 20px",fontSize:13,color:"#94a3b8"}}>+{groceryTasks.length-5} more items</div>}
    </div>
  ) : null;

  if (wide) return (
    <div style={{display:"grid",gridTemplateColumns:"1fr 1fr",gap:20,alignItems:"start"}}>
      <div style={{display:"flex",flexDirection:"column",gap:16}}>
        <div style={{display:"grid",gridTemplateColumns:"1fr 1fr",gap:16}}>{personCards}</div>
        {tasksCard}
      </div>
      <div style={{display:"flex",flexDirection:"column",gap:16}}>
        {calCard}
        {grocCard}
      </div>
    </div>
  );

  return (
    <div style={{display:"flex",flexDirection:"column",gap:16}}>
      {personCards}
      {calCard}
      {tasksCard}
      {grocCard}
    </div>
  );
}

// ─── TASKS TAB ────────────────────────────────────────────────────────────────
function TasksTab({ tasks, projs, pts, onComplete, onDelete, onAdd, reload }) {
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
              <TaskRow key={t.id} task={t} projColor={projColor} isReward={isReward} onComplete={onComplete} onDelete={onDelete}/>
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

function TaskRow({ task, projColor, isReward, onComplete, onDelete }) {
  const [assignee, setAssignee] = useState("");
  const [done, setDone] = useState(false);
  const [showDelete, setShowDelete] = useState(false);

  const complete = () => { setDone(true); onComplete(task, assignee, isReward); };

  return (
    <div style={{display:"flex",alignItems:"center",padding:"0 20px",minHeight:60,borderBottom:"1px solid #f8fafc",gap:14,opacity:done?0.35:1,transition:"opacity 0.3s"}}>
      <button onClick={complete} style={{width:26,height:26,borderRadius:"50%",border:`2.5px solid ${projColor}`,background:"transparent",cursor:"pointer",flexShrink:0,display:"flex",alignItems:"center",justifyContent:"center",transition:"all 0.15s"}}>
        {done && <div style={{width:10,height:10,borderRadius:"50%",background:projColor}}/>}
      </button>
      <div style={{flex:1,minWidth:0}}>
        <div style={{fontSize:15,color:"#1e293b",fontWeight:500,textDecoration:done?"line-through":"none",overflow:"hidden",textOverflow:"ellipsis",whiteSpace:"nowrap"}}>{task.content}</div>
        {task.due?.string && <div style={{fontSize:12,color:"#94a3b8",marginTop:1}}>{task.due.string}</div>}
      </div>
      {isReward && <span style={{fontSize:11,color:"#10b981",fontWeight:700,flexShrink:0}}>+5⭐</span>}
      <div style={{display:"flex",gap:5,flexShrink:0}}>
        {[RABIA,CLARE].map(p=>(
          <button key={p.name} onClick={()=>setAssignee(a=>a===p.name.toLowerCase()?"":p.name.toLowerCase())} style={{width:28,height:28,borderRadius:"50%",border:`2px solid ${assignee===p.name.toLowerCase()?p.color:"#e2e8f0"}`,background:assignee===p.name.toLowerCase()?p.color:"#fff",color:assignee===p.name.toLowerCase()?"#fff":"#94a3b8",fontWeight:800,fontSize:12,cursor:"pointer",fontFamily:"inherit"}}>{p.initial}</button>
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
        <div style={{overflowY:"auto",maxHeight:560}}>
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
function WeatherTab({ wx }) {
  if(!wx?.current) return <div style={{...CARD,padding:32,textAlign:"center",color:"#94a3b8"}}>Loading weather…</div>;
  const cur=wx.current, daily=wx.daily, code=cur.weather_code;
  return (
    <div style={{display:"flex",flexDirection:"column",gap:14}}>
      <div style={{borderRadius:24,padding:"32px 28px 26px",background:"linear-gradient(145deg,#0ea5e9,#6366f1)",color:"#fff",position:"relative",overflow:"hidden",boxShadow:"0 8px 32px rgba(14,165,233,0.3)"}}>
        <div style={{position:"absolute",top:-20,right:-20,fontSize:130,opacity:0.12,lineHeight:1}}>{wxE(code)}</div>
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
        <div style={{fontSize:12,fontWeight:700,color:"#94a3b8",letterSpacing:1,textTransform:"uppercase",marginBottom:16}}>7-day forecast</div>
        <div style={{display:"flex",gap:10,overflowX:"auto",paddingBottom:4}}>
          {(daily?.time||[]).map((date,i)=>{
            const d=new Date(date),isT=i===0;
            return (
              <div key={i} style={{flex:"0 0 auto",width:88,textAlign:"center",background:isT?"#eff6ff":"#f8fafc",border:isT?"2px solid #38bdf850":"1px solid #f1f5f9",borderRadius:18,padding:"14px 8px"}}>
                <div style={{fontSize:11,fontWeight:700,color:isT?"#0ea5e9":"#94a3b8",marginBottom:6}}>{isT?"Today":d.toLocaleDateString("en",{weekday:"short"})}</div>
                <div style={{fontSize:26,lineHeight:1,marginBottom:8}}>{wxE(daily.weather_code[i])}</div>
                <div style={{fontSize:15,fontWeight:800,color:"#1e293b"}}>{Math.round(daily.temperature_2m_max[i])}°</div>
                <div style={{fontSize:12,color:"#94a3b8"}}>{Math.round(daily.temperature_2m_min[i])}°</div>
                {(daily.precipitation_probability_max[i]||0)>20 && <div style={{fontSize:11,color:"#38bdf8",marginTop:4}}>💧{daily.precipitation_probability_max[i]}%</div>}
              </div>
            );
          })}
        </div>
      </div>
    </div>
  );
}

// ─── SUN & MOON TAB ───────────────────────────────────────────────────────────
function SunMoonTab({ sun }) {
  const [now,setNow]=useState(new Date());
  useEffect(()=>{ const t=setInterval(()=>setNow(new Date()),60000); return()=>clearInterval(t); },[]);
  if(!sun) return <div style={{...CARD,padding:32,textAlign:"center",color:"#94a3b8"}}>Loading sun data…</div>;
  const rise=new Date(sun.sunrise),set=new Date(sun.sunset);
  const frac=Math.max(0,Math.min((now-rise)/(set-rise),1));
  const dlMs=set-rise, dlH=Math.floor(dlMs/3600000), dlM=Math.floor((dlMs%3600000)/60000);
  const illumin=Math.round(Math.abs(Math.cos(sun.moon_phase*2*Math.PI))*100);
  const W=320,H=150,R=120,cx=W/2,cy=H-12;
  const sunX=cx-R*Math.cos(Math.PI*frac), sunY=cy-R*Math.sin(Math.PI*frac);
  return (
    <div style={{display:"flex",flexDirection:"column",gap:14}}>
      <div style={{...CARD,padding:"24px 24px 20px"}}>
        <div style={{fontSize:12,fontWeight:700,color:"#94a3b8",letterSpacing:1,textTransform:"uppercase",marginBottom:16}}>Sun · today</div>
        <div style={{display:"flex",justifyContent:"center"}}>
          <svg width={W} height={H} viewBox={`0 0 ${W} ${H}`}>
            <defs><linearGradient id="ag" x1="0" y1="0" x2="1" y2="0"><stop offset="0%" stopColor="#f2709c"/><stop offset="50%" stopColor="#fbbf24"/><stop offset="100%" stopColor="#f97316"/></linearGradient></defs>
            <path d={`M ${cx-R},${cy} A ${R},${R} 0 0,1 ${cx+R},${cy}`} fill="none" stroke="#f1f5f9" strokeWidth="4" strokeDasharray="5 3"/>
            {frac>0.01&&<path d={`M ${cx-R},${cy} A ${R},${R} 0 0,1 ${sunX.toFixed(1)},${sunY.toFixed(1)}`} fill="none" stroke="url(#ag)" strokeWidth="4" strokeLinecap="round"/>}
            <line x1={cx-R-10} y1={cy} x2={cx+R+10} y2={cy} stroke="#e2e8f0" strokeWidth="1"/>
            <circle cx={sunX.toFixed(1)} cy={sunY.toFixed(1)} r="12" fill="#fbbf24"/>
            <circle cx={sunX.toFixed(1)} cy={sunY.toFixed(1)} r="6"  fill="#fef3c7"/>
            {[0,45,90,135,180,225,270,315].map(a=>{const r2=a*Math.PI/180;return<line key={a} x1={sunX+15*Math.cos(r2)} y1={sunY+15*Math.sin(r2)} x2={sunX+21*Math.cos(r2)} y2={sunY+21*Math.sin(r2)} stroke="#fbbf24" strokeWidth="1.5" strokeLinecap="round" opacity="0.5"/>;})}
          </svg>
        </div>
        <div style={{display:"flex",justifyContent:"space-between",marginTop:8}}>
          <div><div style={{fontSize:20,fontWeight:800,color:"#f97316"}}>{fmtFull12(sun.sunrise)}</div><div style={{fontSize:12,color:"#94a3b8"}}>Sunrise</div></div>
          <div style={{textAlign:"center"}}><div style={{fontSize:20,fontWeight:800,color:"#1e293b"}}>{dlH}h {dlM}m</div><div style={{fontSize:12,color:"#94a3b8"}}>Daylight</div></div>
          <div style={{textAlign:"right"}}><div style={{fontSize:20,fontWeight:800,color:"#6366f1"}}>{fmtFull12(sun.sunset)}</div><div style={{fontSize:12,color:"#94a3b8"}}>Sunset</div></div>
        </div>
      </div>
      <div style={{background:"linear-gradient(135deg,#fef3c7,#fed7aa)",borderRadius:22,padding:"20px 24px",boxShadow:"0 4px 16px rgba(251,191,36,0.2)"}}>
        <div style={{fontSize:12,fontWeight:700,color:"#92400e",letterSpacing:1,textTransform:"uppercase",marginBottom:12}}>Golden hour</div>
        <div style={{display:"flex",justifyContent:"space-between",alignItems:"center"}}>
          <div><div style={{fontSize:12,color:"#b45309"}}>Morning</div><div style={{fontSize:18,fontWeight:800,color:"#92400e"}}>{fmtFull12(sun.sunrise)}</div></div>
          <div style={{fontSize:42}}>🌅</div>
          <div style={{textAlign:"right"}}><div style={{fontSize:12,color:"#b45309"}}>Evening</div><div style={{fontSize:18,fontWeight:800,color:"#92400e"}}>{sun.sunset?fmtFull12(new Date(new Date(sun.sunset).getTime()-3600000)):"--"}</div></div>
        </div>
      </div>
      <div style={{background:"linear-gradient(145deg,#1e1b4b,#312e81)",borderRadius:24,padding:"28px",color:"#fff",boxShadow:"0 8px 32px rgba(49,46,129,0.3)"}}>
        <div style={{fontSize:12,fontWeight:700,opacity:0.5,letterSpacing:1,textTransform:"uppercase",marginBottom:18}}>Moon tonight</div>
        <div style={{display:"flex",alignItems:"center",gap:24}}>
          <div style={{fontSize:72,lineHeight:1}}>{sun.moon_icon}</div>
          <div><div style={{fontSize:24,fontWeight:800}}>{sun.moon_name}</div><div style={{fontSize:14,opacity:0.6,marginTop:6}}>{illumin}% illuminated · {sun.moon_age_days}d old</div></div>
        </div>
        <div style={{marginTop:22}}>
          <div style={{display:"flex",justifyContent:"space-between",marginBottom:10}}>
            {["🌑","🌒","🌓","🌔","🌕","🌖","🌗","🌘"].map((ic,i)=>{
              const act=Math.abs(sun.moon_phase-i/7)<0.07;
              return<div key={i} style={{fontSize:act?26:17,opacity:act?1:0.35,transform:act?"scale(1.2)":"scale(1)",transition:"all 0.3s"}}>{ic}</div>;
            })}
          </div>
          <div style={{height:4,background:"rgba(255,255,255,0.1)",borderRadius:99,overflow:"hidden"}}>
            <div style={{height:"100%",width:`${Math.round(sun.moon_phase*100)}%`,background:"rgba(255,255,255,0.45)",borderRadius:99}}/>
          </div>
          <div style={{display:"flex",justifyContent:"space-between",fontSize:11,opacity:0.35,marginTop:6}}><span>New</span><span>Full</span><span>New</span></div>
        </div>
      </div>
    </div>
  );
}

// ─── LIGHTS TAB ───────────────────────────────────────────────────────────────
const SCENES={bright:{label:"Bright",icon:"☀️",bg:"#fffbeb",border:"#fde68a",text:"#92400e"},relax:{label:"Relax",icon:"🌇",bg:"#fff7ed",border:"#fed7aa",text:"#9a3412"},night:{label:"Night",icon:"🌙",bg:"#eff6ff",border:"#bfdbfe",text:"#1e40af"},away:{label:"Away",icon:"🔒",bg:"#f8fafc",border:"#e2e8f0",text:"#475569"}};

function LightsTab() {
  const [devices,setDevices]=useState([]);
  const [loading,setLoading]=useState(true);
  const [scene,setScene]=useState(null);
  const load=useCallback(async()=>{ try{const d=await fetch(`${API}/lights`).then(r=>r.json());setDevices(Array.isArray(d)?d:[]);}catch{setDevices([]);} setLoading(false);},[]);
  useEffect(()=>{load();const t=setInterval(load,10000);return()=>clearInterval(t);},[load]);
  const toggle=async d=>{setDevices(ds=>ds.map(x=>x.alias===d.alias?{...x,on:!x.on}:x));await fetch(`${API}/lights/${encodeURIComponent(d.alias)}/${d.on?"off":"on"}`,{method:"POST"});};
  const setBr=async(d,b)=>{setDevices(ds=>ds.map(x=>x.alias===d.alias?{...x,brightness:b}:x));await fetch(`${API}/lights/${encodeURIComponent(d.alias)}/brightness`,{method:"POST",headers:{"Content-Type":"application/json"},body:JSON.stringify({brightness:b})});};
  const applyScene=async k=>{setScene(k);await fetch(`${API}/lights/scene`,{method:"POST",headers:{"Content-Type":"application/json"},body:JSON.stringify({scene:k})});setTimeout(load,600);};
  const on=devices.filter(d=>d.on).length;
  return (
    <div style={{display:"flex",flexDirection:"column",gap:14}}>
      <div style={{...CARD,padding:"18px 20px"}}>
        <div style={{display:"flex",justifyContent:"space-between",alignItems:"center",marginBottom:16}}>
          <div style={{fontSize:26,fontWeight:800,color:"#1e293b"}}>{on} <span style={{fontSize:15,color:"#94a3b8",fontWeight:400}}>of {devices.length} on</span></div>
          <button onClick={()=>applyScene(on>0?"away":"bright")} style={{padding:"12px 22px",background:on>0?"#fee2e2":"#fffbeb",border:"none",borderRadius:14,fontSize:14,fontWeight:700,color:on>0?"#dc2626":"#92400e",cursor:"pointer",fontFamily:"inherit"}}>{on>0?"All off":"All on"}</button>
        </div>
        <div style={{display:"grid",gridTemplateColumns:"repeat(4,1fr)",gap:10}}>
          {Object.entries(SCENES).map(([k,s])=>(
            <button key={k} onClick={()=>applyScene(k)} style={{background:scene===k?s.border:s.bg,border:`1.5px solid ${s.border}`,borderRadius:16,padding:"12px 6px",textAlign:"center",cursor:"pointer",transition:"all 0.15s",fontFamily:"inherit"}}>
              <div style={{fontSize:24,marginBottom:4}}>{s.icon}</div>
              <div style={{fontSize:12,fontWeight:700,color:s.text}}>{s.label}</div>
            </button>
          ))}
        </div>
      </div>
      {loading&&<div style={{...CARD,padding:32,textAlign:"center",color:"#94a3b8"}}>Discovering Kasa devices…</div>}
      {!loading&&devices.length===0&&<div style={{...CARD,padding:32,textAlign:"center",color:"#94a3b8",fontSize:14,lineHeight:1.8}}>No Kasa devices found.<br/>Make sure you're on the same WiFi.</div>}
      {!loading&&devices.length>0&&(
        <div style={{display:"grid",gridTemplateColumns:"1fr 1fr",gap:12}}>
          {devices.map(d=>{
            const isPlug=d.brightness===null;
            return (
              <div key={d.alias} style={{...CARD,padding:"16px",background:d.on?"#fffbeb":"rgba(255,255,255,0.95)",border:`2px solid ${d.on?"#fde68a":"#f1f5f9"}`,boxShadow:d.on?"0 4px 20px rgba(251,191,36,0.25)":"0 2px 10px rgba(0,0,0,0.04)"}}>
                <div style={{display:"flex",justifyContent:"space-between",alignItems:"flex-start",marginBottom:10}}>
                  <div style={{width:36,height:36,borderRadius:"50%",background:d.on?"#fef3c7":"#f1f5f9",display:"flex",alignItems:"center",justifyContent:"center",fontSize:18}}>{isPlug?"🔌":"💡"}</div>
                  <button onClick={()=>toggle(d)} style={{width:48,height:26,borderRadius:99,border:"none",cursor:"pointer",background:d.on?"#fbbf24":"#e2e8f0",position:"relative",transition:"background 0.2s"}}>
                    <div style={{position:"absolute",top:3,width:20,height:20,borderRadius:"50%",background:"#fff",left:d.on?"25px":"3px",transition:"left 0.2s",boxShadow:"0 1px 4px rgba(0,0,0,0.2)"}}/>
                  </button>
                </div>
                <div style={{fontSize:14,fontWeight:700,color:"#1e293b",marginBottom:3}}>{d.alias}</div>
                <div style={{fontSize:12,color:d.on?"#b45309":"#94a3b8"}}>{d.on?(d.power_mw?`${(d.power_mw/1000).toFixed(1)}W`:"On"):"Off"}</div>
                {!isPlug&&d.on&&(
                  <div style={{marginTop:12}}>
                    <input type="range" min={1} max={100} value={d.brightness??80} onChange={e=>setBr(d,parseInt(e.target.value))} style={{width:"100%",accentColor:"#fbbf24"}}/>
                    <div style={{fontSize:11,color:"#94a3b8",textAlign:"right"}}>{d.brightness??80}%</div>
                  </div>
                )}
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
}

// ─── REWARDS TAB ──────────────────────────────────────────────────────────────
function RewardsTab({ pts, setPts, rwds, setRwds }) {
  const [showAdd, setShowAdd] = useState(false);
  const [form, setForm]       = useState({ name:"", cost:100, icon:"🎁", who:"both" });
  const [redeeming, setRedeeming] = useState(null); // {rewardId, who}
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

  const people = [RABIA, CLARE];
  const REWARD_ICONS = ["🎬","☕","🍕","🎮","💆","✈️","🍽️","🎁","🛍️","🏖️","🎭","🎵","🍦","📚","🏃","🧖"];

  return (
    <div style={{display:"flex",flexDirection:"column",gap:16}}>

      {/* Confetti banner */}
      {confetti && (
        <div style={{...CARD,padding:"20px 24px",background:"linear-gradient(135deg,#fef3c7,#fed7aa)",border:"2px solid #fbbf24",textAlign:"center"}}>
          <div style={{fontSize:32,marginBottom:6}}>🎉</div>
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
                return (
                  <div key={r.id} style={{...CARD,padding:"18px",textAlign:"center",opacity:canAfford?1:0.6,border:`2px solid ${canAfford?person.color+"40":"#f1f5f9"}`}}>
                    <div style={{fontSize:40,marginBottom:8}}>{r.icon}</div>
                    <div style={{fontSize:14,fontWeight:800,color:"#1e293b",marginBottom:4}}>{r.name}</div>
                    <div style={{fontSize:12,color:person.color,fontWeight:700,marginBottom:12}}>{r.cost} ⭐</div>
                    <div style={{display:"flex",gap:6}}>
                      <button onClick={()=>redeem(r,pKey)} disabled={!canAfford} style={{flex:1,padding:"10px",borderRadius:12,border:"none",background:canAfford?person.color:"#e2e8f0",color:canAfford?"#fff":"#94a3b8",fontWeight:700,fontSize:13,cursor:canAfford?"pointer":"not-allowed",fontFamily:"inherit"}}>
                        {canAfford?"Redeem":"Need "+(r.cost-myPts)+" more"}
                      </button>
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
            <div style={{fontSize:40,marginBottom:12}}>🛒</div>
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

// ─── NAV ─────────────────────────────────────────────────────────────────────
const NAV = [
  { id:"home",      label:"Home",      color:"#f472b6", icon:<svg width="22" height="22" viewBox="0 0 24 24" fill="none"><path d="M3 9l9-7 9 7v11a2 2 0 01-2 2H5a2 2 0 01-2-2z" stroke="currentColor" strokeWidth="1.8" strokeLinejoin="round"/><polyline points="9 22 9 12 15 12 15 22" stroke="currentColor" strokeWidth="1.8" strokeLinejoin="round"/></svg> },
  { id:"tasks",     label:"Tasks",     color:"#10b981", icon:<svg width="22" height="22" viewBox="0 0 24 24" fill="none"><rect x="3" y="3" width="18" height="18" rx="3" stroke="currentColor" strokeWidth="1.8"/><line x1="8" y1="9" x2="16" y2="9" stroke="currentColor" strokeWidth="1.5"/><line x1="8" y1="13" x2="13" y2="13" stroke="currentColor" strokeWidth="1.5"/><circle cx="6" cy="9" r="1.2" fill="currentColor"/><circle cx="6" cy="13" r="1.2" fill="currentColor"/></svg> },
  { id:"groceries", label:"Groceries", color:"#059669", icon:<svg width="22" height="22" viewBox="0 0 24 24" fill="none"><path d="M6 2L3 6v14a2 2 0 002 2h14a2 2 0 002-2V6l-3-4z" stroke="currentColor" strokeWidth="1.8" strokeLinejoin="round"/><line x1="3" y1="6" x2="21" y2="6" stroke="currentColor" strokeWidth="1.8"/><path d="M16 10a4 4 0 01-8 0" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round"/></svg> },
  { id:"calendar",  label:"Calendar",  color:"#38bdf8", icon:<svg width="22" height="22" viewBox="0 0 24 24" fill="none"><rect x="3" y="4" width="18" height="18" rx="3" stroke="currentColor" strokeWidth="1.8"/><line x1="8" y1="2" x2="8" y2="6" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round"/><line x1="16" y1="2" x2="16" y2="6" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round"/><line x1="3" y1="10" x2="21" y2="10" stroke="currentColor" strokeWidth="1.5"/></svg> },
  { id:"weather",   label:"Weather",   color:"#0ea5e9", icon:<svg width="22" height="22" viewBox="0 0 24 24" fill="none"><circle cx="12" cy="10" r="4" stroke="currentColor" strokeWidth="1.8"/><line x1="12" y1="3" x2="12" y2="5" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round"/><line x1="19" y1="10" x2="21" y2="10" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round"/><path d="M7 18c0-2.8 2.2-5 5-5s5 2.2 5 5" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round"/></svg> },
  { id:"sun",       label:"Sun",       color:"#f59e0b", icon:<svg width="22" height="22" viewBox="0 0 24 24" fill="none"><path d="M20 14.5A8 8 0 118 4.5a6 6 0 0012 10z" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round"/></svg> },
  { id:"lights",    label:"Lights",    color:"#fbbf24", icon:<svg width="22" height="22" viewBox="0 0 24 24" fill="none"><path d="M12 2C8.7 2 6 4.7 6 8c0 2.5 1.4 4.7 3.5 5.9V18h5v-4.1C16.6 12.7 18 10.5 18 8c0-3.3-2.7-6-6-6z" stroke="currentColor" strokeWidth="1.8"/><line x1="9.5" y1="18" x2="14.5" y2="18" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round"/><line x1="10.5" y1="21" x2="13.5" y2="21" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round"/></svg> },
  { id:"rewards",   label:"Rewards",   color:"#a855f7", icon:<svg width="22" height="22" viewBox="0 0 24 24" fill="none"><polygon points="12,2 15.1,8.3 22,9.3 17,14.1 18.2,21 12,17.8 5.8,21 7,14.1 2,9.3 8.9,8.3" stroke="currentColor" strokeWidth="1.8" strokeLinejoin="round"/></svg> },
];

// ─── ROOT APP ─────────────────────────────────────────────────────────────────
export default function App() {
  const [tab, setTab] = useState("home");
  const hub = useHub();
  const wide = useWide();

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
    <div style={{ height:"100vh", display:"flex", flexDirection:"column", background:"#f0f4f8", fontFamily:"'DM Sans','Segoe UI',sans-serif", overflow:"hidden" }}>
      <style>{`
        @import url('https://fonts.googleapis.com/css2?family=DM+Sans:ital,opsz,wght@0,9..40,300;0,9..40,400;0,9..40,600;0,9..40,800;1,9..40,400&display=swap');
        * { box-sizing:border-box; margin:0; padding:0; -webkit-tap-highlight-color:transparent; }
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
      <Header wx={hub.wx} sun={hub.sun} pts={hub.pts}/>

      <div style={{ flex:1, display:"flex", overflow:"hidden" }}>

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
        <div style={{ flex:1, overflowY:"auto", padding: wide ? "24px 28px 28px" : "16px 16px 100px" }}>
          {tab==="home"      && <HomeTab evts={hub.evts} tasks={hub.tasks} projs={hub.projs} pts={hub.pts} wx={hub.wx} sun={hub.sun} authOk={hub.authOk} onResetPts={handleResetPts} onCompleteTask={handleCompleteTask} onSetTab={setTab} wide={wide}/>}
          {tab==="tasks"     && <TasksTab tasks={hub.tasks} projs={hub.projs} pts={hub.pts} onComplete={handleCompleteTask} onDelete={handleDeleteTask} onAdd={handleAddTask} reload={hub.reload}/>}
          {tab==="groceries" && <GroceriesTab tasks={hub.tasks} projs={hub.projs} onComplete={handleCompleteTask} onDelete={handleDeleteTask} onAdd={handleAddTask}/>}
          {tab==="calendar"  && <CalendarTab evts={hub.evts} authOk={hub.authOk} reload={hub.reload}/>}
          {tab==="weather"   && <WeatherTab wx={hub.wx}/>}
          {tab==="sun"       && <SunMoonTab sun={hub.sun}/>}
          {tab==="lights"    && <LightsTab/>}
          {tab==="rewards"   && <RewardsTab pts={hub.pts} setPts={hub.setPts} rwds={hub.rwds} setRwds={hub.setRwds}/>}
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
