#!/usr/bin/env node
/**
 * One-time migration: read ALL completed tasks from Todoist and write
 * reward-eligible ones to the Google Sheets "Task History" tab.
 *
 * Run once on the Pi AFTER creating the Task History sheet:
 *   node migrate_history.js
 *
 * Safe to re-run — skips tasks whose TodoistID is already in the sheet.
 */
require('dotenv').config({ path: require('path').join(__dirname, '.env') });

const fetch  = (...a) => import('node-fetch').then(({ default: f }) => f(...a));
const fs     = require('fs');
const path   = require('path');
const { google } = require('googleapis');

const TODOIST_TOKEN    = process.env.TODOIST_TOKEN;
const SPREADSHEET_ID   = '1h2hk_ia0lI6kJksTBga-Gni1dV84DraglBRH_-Dyje0';
const SHEETS_CREDS     = path.join(__dirname, '../sheets-credentials.json');
const TASK_HISTORY_TAB = 'Task History';
const SYNC_BASE        = 'https://api.todoist.com/sync/v9';
const REST_BASE        = 'https://api.todoist.com/api/v1';
const HDR              = { Authorization: `Bearer ${TODOIST_TOKEN}`, 'Content-Type': 'application/json' };
const REWARD_PROJECTS  = ['chores', 'house items', 'cats'];

function countsForReward(name) {
  return REWARD_PROJECTS.includes((name || '').toLowerCase().trim());
}

function sheetsClient() {
  const creds = JSON.parse(fs.readFileSync(SHEETS_CREDS, 'utf8'));
  const auth  = new google.auth.GoogleAuth({
    credentials: creds,
    scopes: ['https://www.googleapis.com/auth/spreadsheets'],
  });
  return google.sheets({ version: 'v4', auth });
}

// Fetch all completed items from Todoist (paged, newest first)
async function fetchAllCompleted() {
  const all = [];
  let offset = 0;
  const limit = 200;
  while (true) {
    const url = `${SYNC_BASE}/items/completed/get_all?limit=${limit}&offset=${offset}`;
    const r   = await fetch(url, { headers: HDR }).then(r => r.json());
    const items = r.items || [];
    all.push(...items);
    console.log(`  Fetched ${all.length} completed tasks so far…`);
    if (items.length < limit) break;
    offset += limit;
  }
  return all;
}

// Fetch all projects → id:name map, and all active tasks → id:{due,responsible_uid} map
async function fetchMeta() {
  const [projRes, taskRes] = await Promise.all([
    fetch(`${REST_BASE}/projects`, { headers: HDR }).then(r => r.json()),
    fetch(`${REST_BASE}/tasks`,    { headers: HDR }).then(r => r.json()),
  ]);

  const projectMap = {};
  (projRes.results || (Array.isArray(projRes) ? projRes : [])).forEach(p => {
    projectMap[p.id] = p.name;
  });

  // Active tasks give us responsible_uid and is_recurring for tasks not yet archived
  const taskMeta = {};
  (taskRes.results || (Array.isArray(taskRes) ? taskRes : [])).forEach(t => {
    taskMeta[t.id] = { responsible_uid: t.responsible_uid, is_recurring: t.due?.is_recurring };
  });

  return { projectMap, taskMeta };
}

// Build UID → 'rabia'|'clare' map
async function buildUidMap() {
  const [me, projData] = await Promise.all([
    fetch(`${REST_BASE}/user`,     { headers: HDR }).then(r => r.json()),
    fetch(`${REST_BASE}/projects`, { headers: HDR }).then(r => r.json()),
  ]);
  const seen = {};
  if (me.id) seen[me.id] = { id: me.id, email: me.email, name: me.full_name };
  const shared = (projData.results || (Array.isArray(projData) ? projData : [])).filter(p => p.is_shared);
  for (const p of shared) {
    try {
      const c = await fetch(`${REST_BASE}/projects/${p.id}/collaborators`, { headers: HDR }).then(r => r.json());
      (c.results || (Array.isArray(c) ? c : [])).forEach(u => {
        if (u.id) seen[u.id] = { id: u.id, email: u.email, name: u.full_name || u.name };
      });
    } catch {}
  }
  const map = {};
  Object.values(seen).forEach(u => {
    if      (/rabia/i.test(u.name || '') || /rabia/i.test(u.email || '')) map[u.id] = 'rabia';
    else if (/clare/i.test(u.name || '') || /clare/i.test(u.email || '')) map[u.id] = 'clare';
  });
  console.log('  UID map:', map);
  return map;
}

// Read existing TodoistIDs from the sheet to avoid duplicates
async function existingIds(sheets) {
  try {
    const r = await sheets.spreadsheets.values.get({
      spreadsheetId: SPREADSHEET_ID,
      range: `${TASK_HISTORY_TAB}!F2:F10000`,
    });
    return new Set((r.data.values || []).flat().filter(Boolean));
  } catch {
    return new Set();
  }
}

async function main() {
  console.log('=== Todoist → Task History migration ===\n');

  if (!TODOIST_TOKEN) { console.error('TODOIST_TOKEN not set in .env'); process.exit(1); }

  console.log('1. Fetching completed tasks from Todoist…');
  const completed = await fetchAllCompleted();
  console.log(`   Total completed: ${completed.length}\n`);

  console.log('2. Fetching project names and UID map…');
  const [{ projectMap, taskMeta }, uidMap] = await Promise.all([fetchMeta(), buildUidMap()]);
  console.log(`   Projects loaded: ${Object.keys(projectMap).length}\n`);

  console.log('3. Reading existing Task History sheet to skip duplicates…');
  const sheets   = sheetsClient();
  const alreadyIn = await existingIds(sheets);
  console.log(`   Already in sheet: ${alreadyIn.size} entries\n`);

  // Filter to reward-eligible
  const rows = [];
  for (const item of completed) {
    const id = String(item.task_id || item.id || '');
    if (!id || alreadyIn.has(id)) continue;

    const projectName = projectMap[item.project_id] || 'Inbox';
    if (!countsForReward(projectName)) continue;

    // Check recurring: use live task meta if available
    const meta = taskMeta[id] || {};
    // completed items from the sync API don't carry due.is_recurring directly,
    // but we can infer: if the same task ID is still active and recurring, skip it
    if (meta.is_recurring) continue;

    // Determine who: try responsible_uid from meta, fall back to user_id (completer)
    const uid = meta.responsible_uid || item.user_id;
    const who = uidMap[uid] || null;
    if (!who) {
      console.log(`  Skipping "${item.content}" — unknown assignee (uid=${uid})`);
      continue;
    }

    const completedAt = item.completed_at || item.date_completed || new Date().toISOString();
    rows.push([completedAt, item.content || 'Task', projectName, who, 5, id]);
  }

  console.log(`4. Writing ${rows.length} new rows to sheet…`);
  if (rows.length === 0) {
    console.log('   Nothing to migrate — sheet is already up to date.');
    return;
  }

  // Sort oldest first so history is chronological in the sheet
  rows.sort((a, b) => new Date(a[0]) - new Date(b[0]));

  // Append in batches of 500
  const BATCH = 500;
  for (let i = 0; i < rows.length; i += BATCH) {
    const batch = rows.slice(i, i + BATCH);
    await sheets.spreadsheets.values.append({
      spreadsheetId: SPREADSHEET_ID,
      range: `${TASK_HISTORY_TAB}!A:F`,
      valueInputOption: 'USER_ENTERED',
      requestBody: { values: batch },
    });
    console.log(`   Written ${Math.min(i + BATCH, rows.length)} / ${rows.length}`);
  }

  console.log('\nDone! Check the Task History tab in your spreadsheet.');
}

main().catch(e => { console.error('Migration failed:', e); process.exit(1); });
