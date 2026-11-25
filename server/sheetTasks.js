// Tasks and groceries stored in the "Tasks" tab of the household Google Sheet.
// Columns: A=ID  B=Task  C=List  D=Who  E=Due  F=Status  G=Created  H=Completed
// Status is open | done | deleted; rows are never removed so the tab doubles as a log.
// Responses use the task shape the frontend expects (project_id, responsible_uid, due.date).

const SHEET   = 'Tasks';
const HEADER  = ['ID', 'Task', 'List', 'Who', 'Due', 'Status', 'Created', 'Completed'];
const PROJECTS = [
  { id: 'inbox',          name: 'Inbox' },
  { id: 'chores',         name: 'Chores' },
  { id: 'groceries',      name: 'Groceries' },
  { id: 'rabia_personal', name: "Rabia's Personal" },
  { id: 'house_items',    name: 'House Items' },
  { id: 'cats',           name: 'Cats' },
];
const PEOPLE = ['rabia', 'clare'];
const REFRESH_MS = 30 * 1000;

const projectById   = id   => PROJECTS.find(p => p.id === id);
const projectByName = name => PROJECTS.find(p => p.name.toLowerCase() === String(name || '').trim().toLowerCase());

const pad = n => String(n).padStart(2, '0');
const ymd = d => `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}`;
const WEEKDAYS = ['sunday', 'monday', 'tuesday', 'wednesday', 'thursday', 'friday', 'saturday'];

// Accepts what the app's due fields send: today, tomorrow, weekday names, "next <weekday>", YYYY-MM-DD, M/D.
function parseDue(str, now = new Date()) {
  const s = String(str || '').trim().toLowerCase();
  if (!s) return '';
  if (/^\d{4}-\d{2}-\d{2}$/.test(s)) return s;
  const base = new Date(now.getFullYear(), now.getMonth(), now.getDate());
  if (s === 'today' || s === 'tod') return ymd(base);
  if (s === 'tomorrow' || s === 'tmrw' || s === 'tom') { base.setDate(base.getDate() + 1); return ymd(base); }
  const wd = s.replace(/^(next|this|on)\s+/, '');
  const idx = WEEKDAYS.findIndex(w => w.startsWith(wd.slice(0, 3)) && wd.length >= 3 && w.startsWith(wd));
  if (idx >= 0) {
    let diff = (idx - base.getDay() + 7) % 7;
    if (diff === 0 || s.startsWith('next')) diff = diff || 7;
    base.setDate(base.getDate() + diff);
    return ymd(base);
  }
  const md = s.match(/^(\d{1,2})\/(\d{1,2})(?:\/(\d{2,4}))?$/);
  if (md) {
    let y = md[3] ? +md[3] : base.getFullYear();
    if (y < 100) y += 2000;
    const d = new Date(y, +md[1] - 1, +md[2]);
    if (!md[3] && d < base) d.setFullYear(y + 1);
    return ymd(d);
  }
  return '';
}

function createTaskStore({ sheetsClient, getSpreadsheetId, onComplete }) {
  let rows = [];               // { id, content, list, who, due, status, created, completed }
  let loadedAt = 0;
  let lastError = null;
  let ensured = false;
  let queue = Promise.resolve();
  const serial = fn => (queue = queue.then(fn, fn));

  const api = () => sheetsClient().spreadsheets;
  const sid = () => getSpreadsheetId();

  async function ensureSheet() {
    if (ensured) return;
    const meta = await api().get({ spreadsheetId: sid() });
    const exists = (meta.data.sheets || []).some(s => s.properties.title === SHEET);
    if (!exists) {
      await api().batchUpdate({ spreadsheetId: sid(), requestBody: { requests: [{ addSheet: { properties: { title: SHEET, gridProperties: { frozenRowCount: 1 } } } }] } });
      await api().values.update({ spreadsheetId: sid(), range: `${SHEET}!A1:H1`, valueInputOption: 'RAW', requestBody: { values: [HEADER] } });
    }
    ensured = true;
  }

  const fromRow = r => ({
    id: r[0] || '', content: r[1] || '', list: r[2] || 'Inbox', who: (r[3] || '').trim().toLowerCase(),
    due: r[4] || '', status: (r[5] || 'open').trim().toLowerCase(), created: r[6] || '', completed: r[7] || '',
  });
  const toRow = t => [t.id, t.content, t.list, t.who, t.due, t.status, t.created, t.completed];

  async function refresh() {
    try {
      await ensureSheet();
      const r = await api().values.get({ spreadsheetId: sid(), range: `${SHEET}!A2:H` });
      rows = (r.data.values || []).filter(v => v[0] && v[1]).map(fromRow);
      loadedAt = Date.now();
      lastError = null;
    } catch (e) {
      lastError = e.message;
      console.warn('[Tasks] Sheet read failed:', e.message);
    }
  }

  // Row numbers shift if someone sorts or edits the sheet, so look the ID up right before writing.
  async function writeRow(task) {
    const r = await api().values.get({ spreadsheetId: sid(), range: `${SHEET}!A:A` });
    const idx = (r.data.values || []).findIndex(v => v[0] === task.id);
    if (idx < 1) throw new Error(`Task ${task.id} not found in sheet`);
    await api().values.update({
      spreadsheetId: sid(), range: `${SHEET}!A${idx + 1}:H${idx + 1}`,
      valueInputOption: 'RAW', requestBody: { values: [toRow(task)] },
    });
  }

  const toApi = t => {
    const proj = projectByName(t.list) || PROJECTS[0];
    return {
      id: t.id, content: t.content,
      project_id: proj.id, project_name: proj.name,
      responsible_uid: PEOPLE.includes(t.who) ? t.who : null,
      labels: t.who === 'family' ? ['family'] : [],
      due: t.due ? { date: t.due, is_recurring: false } : null,
      checked: false,
    };
  };

  const find = id => rows.find(t => t.id === id && t.status === 'open');

  return {
    start() { setTimeout(refresh, 0); setInterval(refresh, REFRESH_MS); },
    status: () => ({ count: rows.filter(t => t.status === 'open').length, loadedAt, error: lastError }),
    projects: () => PROJECTS.map(p => ({ ...p })),
    users: () => PEOPLE.map(id => ({ id, name: id[0].toUpperCase() + id.slice(1) })),

    async list() {
      if (!loadedAt || Date.now() - loadedAt > REFRESH_MS) await refresh();
      if (!loadedAt && lastError) throw new Error(lastError);
      return rows.filter(t => t.status === 'open').map(toApi);
    },

    create(body) {
      return serial(async () => {
        await ensureSheet();
        const proj = projectById(body.project_id) || projectByName(body.project_name) || PROJECTS[0];
        const who = PEOPLE.includes(String(body.assignee_id || body.responsible_uid || '').toLowerCase())
          ? String(body.assignee_id || body.responsible_uid).toLowerCase() : '';
        const task = {
          id: Date.now().toString(36) + Math.random().toString(36).slice(2, 6),
          content: String(body.content || '').trim(),
          list: proj.name, who,
          due: body.due_date || parseDue(body.due_string),
          status: 'open', created: new Date().toISOString(), completed: '',
        };
        if (!task.content) throw new Error('Task text is required');
        await api().values.append({
          spreadsheetId: sid(), range: `${SHEET}!A:H`, valueInputOption: 'RAW',
          insertDataOption: 'INSERT_ROWS', requestBody: { values: [toRow(task)] },
        });
        rows.push(task);
        return toApi(task);
      });
    },

    close(id, assignee) {
      return serial(async () => {
        const t = find(id);
        if (!t) throw new Error('Task not found');
        const updated = { ...t, status: 'done', completed: new Date().toISOString() };
        await writeRow(updated);
        Object.assign(t, updated);
        onComplete?.({ ...toApi(t), who: assignee || t.who || '' });
        return toApi(t);
      });
    },

    remove(id) {
      return serial(async () => {
        const t = find(id);
        if (!t) return;
        const updated = { ...t, status: 'deleted', completed: new Date().toISOString() };
        await writeRow(updated);
        Object.assign(t, updated);
      });
    },

    update(id, body) {
      return serial(async () => {
        const t = find(id);
        if (!t) throw new Error('Task not found');
        const updated = { ...t };
        if (body.content != null) updated.content = String(body.content).trim();
        if (body.due_string != null || body.due_date != null) updated.due = body.due_date || parseDue(body.due_string);
        if (body.project_id) updated.list = (projectById(body.project_id) || projectByName(t.list) || PROJECTS[0]).name;
        if (body.assignee_id !== undefined) updated.who = PEOPLE.includes(String(body.assignee_id).toLowerCase()) ? String(body.assignee_id).toLowerCase() : '';
        await writeRow(updated);
        Object.assign(t, updated);
        return toApi(t);
      });
    },
  };
}

module.exports = { createTaskStore, parseDue };
