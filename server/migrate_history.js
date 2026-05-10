#!/usr/bin/env node
/**
 * One-time migration: read ALL completed tasks from Todoist and write
 * reward-eligible ones to the Google Sheets "Task History" tab.
 *
 * Uses the correct REST API v1 endpoint:
 *   GET /api/v1/tasks/completed/by_completion_date
 * which requires since/until params and covers up to 3 months per call.
 * We loop backwards in 3-month windows to cover full history.
 *
 * Run once on the Pi:  node migrate_history.js
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
const REST_BASE        = 'https://api.todoist.com/api/v1';
const HDR              = { Authorization: `Bearer ${TODOIST_TOKEN}`, 'Content-Type': 'application/json' };
const REWARD_PROJECTS  = ['chores', 'house items', 'cats'];
const EXCLUDE_LABELS   = ['personal', 'exclude'];

// How far back to search (years). Increase if needed.
const YEARS_BACK = 3;

function countsForReward(name, labels) {
  if (!REWARD_PROJECTS.includes((name || '').toLowerCase().trim())) return false;
  if ((labels || []).some(l => EXCLUDE_LABELS.includes(l.toLowerCase().trim()))) return false;
  return true;
}

function sheetsClient() {
  const creds = JSON.parse(fs.readFileSync(SHEETS_CREDS, 'utf8'));
  const auth  = new google.auth.GoogleAuth({
    credentials: creds,
    scopes: ['https://www.googleapis.com/auth/spreadsheets'],
  });
  return google.sheets({ version: 'v4', auth });
}

/**
 * Fetch all completed tasks using GET /api/v1/tasks/completed/by_completion_date
 * Loops in 3-month windows backwards from now to YEARS_BACK years ago.
 * Handles cursor pagination within each window.
 * Response schema: { items: ItemSyncView[], next_cursor: string|null }
 * ItemSyncView fields: id, content, project_id, responsible_uid, completed_by_uid,
 *                      completed_at, due.is_recurring
 */
async function fetchAllCompleted() {
  const all = [];
  const now   = new Date();
  const limit = 200;

  // Build 3-month windows from oldest to newest
  const windows = [];
  let windowEnd = new Date(now);
  const cutoff  = new Date(now);
  cutoff.setFullYear(cutoff.getFullYear() - YEARS_BACK);

  while (windowEnd > cutoff) {
    const windowStart = new Date(windowEnd);
    windowStart.setMonth(windowStart.getMonth() - 3);
    if (windowStart < cutoff) windowStart.setTime(cutoff.getTime());
    windows.push({ since: windowStart.toISOString(), until: windowEnd.toISOString() });
    windowEnd = new Date(windowStart);
  }
  windows.reverse(); // oldest first for display

  console.log(`  Scanning ${windows.length} 3-month windows back to ${cutoff.toDateString()}…`);

  for (const { since, until } of windows) {
    let cursor = null;
    let windowCount = 0;
    while (true) {
      const params = new URLSearchParams({ since, until, limit: String(limit) });
      if (cursor) params.set('cursor', cursor);
      const url = `${REST_BASE}/tasks/completed/by_completion_date?${params}`;
      const raw  = await fetch(url, { headers: HDR });
      const text = await raw.text();
      let r;
      try { r = JSON.parse(text); } catch {
        console.error(`  Unexpected response for window ${since.slice(0,10)}–${until.slice(0,10)}:`, text.slice(0, 200));
        break;
      }
      if (r.error || r.error_code) {
        console.error(`  API error:`, r.error || JSON.stringify(r));
        break;
      }
      const items = r.items || [];
      all.push(...items);
      windowCount += items.length;
      cursor = r.next_cursor || null;
      if (!cursor) break;
    }
    if (windowCount > 0)
      console.log(`  ${since.slice(0,10)} → ${until.slice(0,10)}: ${windowCount} tasks (total so far: ${all.length})`);
  }

  return all;
}

// Fetch all projects → id:name map
async function fetchProjectMap() {
  const r = await fetch(`${REST_BASE}/projects`, { headers: HDR }).then(r => r.json());
  const map = {};
  (r.results || (Array.isArray(r) ? r : [])).forEach(p => { map[p.id] = p.name; });
  return map;
}

// Build UID → 'rabia'|'clare' map from collaborators
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

  console.log('1. Fetching completed tasks from Todoist (by_completion_date)…');
  const completed = await fetchAllCompleted();
  console.log(`   Total completed tasks found: ${completed.length}\n`);

  if (completed.length > 0) {
    console.log('   Sample item keys:', Object.keys(completed[0]).join(', '));
  }

  console.log('2. Fetching project names and UID map…');
  const [projectMap, uidMap] = await Promise.all([fetchProjectMap(), buildUidMap()]);
  console.log(`   Projects: ${Object.keys(projectMap).length}\n`);

  console.log('3. Reading existing Task History sheet to skip duplicates…');
  const sheets    = sheetsClient();
  const alreadyIn = await existingIds(sheets);
  console.log(`   Already in sheet: ${alreadyIn.size} entries\n`);

  // Filter to reward-eligible
  const rows = [];
  let skippedProject = 0, skippedRecurring = 0, skippedUnknown = 0, skippedDupe = 0;

  for (const item of completed) {
    const id = String(item.id || '');
    if (!id)              { continue; }
    if (alreadyIn.has(id)){ skippedDupe++; continue; }

    const projectName = projectMap[item.project_id] || 'Inbox';
    if (!countsForReward(projectName, item.labels)) { skippedProject++; continue; }

    // due.is_recurring is present on ItemSyncView
    if (item.due?.is_recurring) { skippedRecurring++; continue; }

    // responsible_uid = assignee; completed_by_uid = who checked it off
    const uid = item.responsible_uid || item.completed_by_uid;
    const who = uidMap[uid] || null;
    if (!who) {
      skippedUnknown++;
      if (skippedUnknown <= 5)
        console.log(`  Skipping "${item.content}" — unknown assignee (uid=${uid})`);
      continue;
    }

    // completed_at is the correct field per API spec
    const completedAt = item.completed_at || new Date().toISOString();
    rows.push([completedAt, item.content || 'Task', projectName, who, 5, id]);
  }

  console.log(`   Eligible: ${rows.length}`);
  console.log(`   Skipped: ${skippedProject} wrong project, ${skippedRecurring} recurring, ${skippedUnknown} unknown assignee, ${skippedDupe} already in sheet\n`);

  if (rows.length === 0) {
    console.log('Nothing new to write — sheet is already up to date.');
    return;
  }

  // Sort oldest first so history is chronological
  rows.sort((a, b) => new Date(a[0]) - new Date(b[0]));

  console.log(`4. Writing ${rows.length} rows to sheet…`);
  const BATCH = 500;
  for (let i = 0; i < rows.length; i += BATCH) {
    await sheetsClient().spreadsheets.values.append({
      spreadsheetId: SPREADSHEET_ID,
      range: `${TASK_HISTORY_TAB}!A:F`,
      valueInputOption: 'USER_ENTERED',
      requestBody: { values: rows.slice(i, i + BATCH) },
    });
    console.log(`   Written ${Math.min(i + BATCH, rows.length)} / ${rows.length}`);
  }

  console.log('\nDone! Check the Task History tab in your spreadsheet.');
}

main().catch(e => { console.error('Migration failed:', e.message || e); process.exit(1); });
