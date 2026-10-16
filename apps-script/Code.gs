/**
 * PT Tracker – Google Sheet backend.
 *
 * Paste this whole file into Extensions → Apps Script of the trainer's Google Sheet.
 * Then run `setup` once, and deploy as a Web app (Execute as: Me, Who has access: Anyone).
 * Full steps are in README.md.
 *
 * Two tabs are used:
 *   Clients  – one row per client
 *   Sessions – one row per client per training day
 * The trainer can read them like any spreadsheet. Edit with care: the first two
 * columns (ID, Client ID / Link code) tie everything together.
 */

var CLIENT_HEADERS = ['ID', 'Link code', 'Name', 'Phone', 'Start date', 'Added on'];
var SESSION_HEADERS = ['ID', 'Client ID', 'Client name', 'Date', 'Status', 'Body parts',
  'Training type', 'Exercises (name | sets | reps | kg)', 'Body weight (kg)', 'Notes', 'Updated'];
var STATUS_LABEL = { done: 'Done', missed: 'Missed', cancelled: 'Cancelled' };

// true  = clients can add and change their own training days from their link.
// false = client links are view-only; only the trainer can change anything.
var CLIENTS_CAN_EDIT = true;

/** Run this once from the Apps Script editor. It creates the tabs and the trainer key. */
function setup() {
  var ss = SpreadsheetApp.getActive();
  ensureSheet_(ss, 'Clients', CLIENT_HEADERS);
  ensureSheet_(ss, 'Sessions', SESSION_HEADERS);
  var props = PropertiesService.getScriptProperties();
  var key = props.getProperty('TRAINER_KEY');
  if (!key) {
    key = randomKey_(24);
    props.setProperty('TRAINER_KEY', key);
  }
  Logger.log('Setup done. Your trainer key is:  ' + key);
}

/** Run this only if the trainer key has leaked. Every phone must then enter the new key. */
function newTrainerKey() {
  var key = randomKey_(24);
  PropertiesService.getScriptProperties().setProperty('TRAINER_KEY', key);
  Logger.log('New trainer key:  ' + key);
}

function doGet() {
  return ContentService.createTextOutput('PT Tracker backend is running. Open the tracker website to use it.');
}

function doPost(e) {
  var out;
  try {
    var req = JSON.parse(e.postData.contents);
    out = route_(req) || {};
    out.ok = true;
  } catch (err) {
    out = { ok: false, error: String((err && err.message) || err) };
  }
  return ContentService.createTextOutput(JSON.stringify(out)).setMimeType(ContentService.MimeType.JSON);
}

function route_(req) {
  if (req.action === 'view') return viewClient_(String(req.token || ''));
  if (req.action === 'clientSaveSession' || req.action === 'clientDeleteSession') return clientEdit_(req);

  var key = PropertiesService.getScriptProperties().getProperty('TRAINER_KEY');
  if (!key) throw new Error('The Google Sheet is not set up yet. Run "setup" in Apps Script first.');
  if (String(req.key || '') !== key) throw new Error('Wrong trainer key.');

  var lock = LockService.getScriptLock();
  lock.waitLock(20000);
  try {
    switch (req.action) {
      case 'ping': return {};
      case 'load': return { clients: readClients_(), sessions: readSessions_() };
      case 'saveClient': return { client: saveClient_(req.client) };
      case 'deleteClient': deleteClient_(String(req.id)); return {};
      case 'saveSession': return { session: saveSession_(req.session) };
      case 'deleteSession': deleteRowById_('Sessions', String(req.id)); return {};
      case 'import': return importAll_(req.clients || [], req.sessions || []);
      default: throw new Error('Unknown action: ' + req.action);
    }
  } finally {
    lock.releaseLock();
  }
}

// ---------- Clients ----------

function readClients_() {
  return readRows_('Clients').map(function (r) {
    return { id: str_(r[0]), token: str_(r[1]), name: str_(r[2]), phone: str_(r[3]), start: dateStr_(r[4]), created: dateStr_(r[5]) };
  }).filter(function (c) { return c.id; });
}

function clientRow_(c) {
  return [c.id, c.token, c.name, c.phone || '', c.start || '', c.created || ''];
}

function saveClient_(c) {
  if (!c || !c.id || !c.name) throw new Error('Client name is missing.');
  c = { id: str_(c.id), token: str_(c.token), name: str_(c.name).trim(), phone: str_(c.phone), start: str_(c.start), created: str_(c.created) };
  upsertRow_('Clients', c.id, clientRow_(c));
  // Keep the readable client name in the Sessions tab up to date.
  var sh = sheet_('Sessions');
  var rows = readRows_('Sessions');
  for (var i = 0; i < rows.length; i++) {
    if (str_(rows[i][1]) === c.id && str_(rows[i][2]) !== c.name) writeRow_(sh, i + 2, [c.name], 3);
  }
  return c;
}

function deleteClient_(id) {
  rewrite_('Clients', readRows_('Clients').filter(function (r) { return str_(r[0]) !== id; }));
  rewrite_('Sessions', readRows_('Sessions').filter(function (r) { return str_(r[1]) !== id; }));
}

function clientByToken_(token) {
  if (token.length < 16) throw new Error('This link is not complete. Ask your trainer to send it again.');
  var client = null;
  readClients_().forEach(function (c) { if (c.token === token) client = c; });
  if (!client) throw new Error('This link no longer works. Ask your trainer for a new one.');
  return client;
}

function viewClient_(token) {
  var client = clientByToken_(token);
  var sessions = readSessions_().filter(function (s) { return s.clientId === client.id; });
  // Clients only see their own name, start date and sessions – never the phone number or other clients.
  return { client: { id: client.id, name: client.name, start: client.start }, sessions: sessions, canEdit: CLIENTS_CAN_EDIT };
}

// A client link can only change that client's own training days.
function clientEdit_(req) {
  if (!CLIENTS_CAN_EDIT) throw new Error('Only your trainer can make changes.');
  var lock = LockService.getScriptLock();
  lock.waitLock(20000);
  try {
    var client = clientByToken_(String(req.token || ''));
    var ownId = function (id) { return String(id).indexOf(client.id + '_') === 0; };
    if (req.action === 'clientDeleteSession') {
      if (!ownId(req.id)) throw new Error('Not allowed.');
      deleteRowById_('Sessions', String(req.id));
      return {};
    }
    var s = req.session || {};
    s.clientId = client.id;
    s.id = client.id + '_' + s.date;
    return { session: saveSession_(s) };
  } finally {
    lock.releaseLock();
  }
}

// ---------- Sessions ----------

function readSessions_() {
  return readRows_('Sessions').map(function (r) {
    return {
      id: str_(r[0]), clientId: str_(r[1]), date: dateStr_(r[3]),
      status: str_(r[4]).toLowerCase() || 'done',
      parts: list_(r[5]), types: list_(r[6]), exercises: parseExercises_(r[7]),
      bodyWeight: str_(r[8]), notes: str_(r[9]), updated: str_(r[10])
    };
  }).filter(function (s) { return s.id; });
}

function sessionRow_(s, clientName) {
  return [s.id, s.clientId, clientName || '', s.date, STATUS_LABEL[s.status] || 'Done',
    (s.parts || []).join(', '), (s.types || []).join(', '), formatExercises_(s.exercises),
    s.bodyWeight || '', s.notes || '', new Date().toISOString()];
}

function saveSession_(s) {
  if (!s || !s.id || !s.clientId || !/^\d{4}-\d{2}-\d{2}$/.test(String(s.date))) throw new Error('Session details are incomplete.');
  var name = '';
  readClients_().forEach(function (c) { if (c.id === s.clientId) name = c.name; });
  if (!name) throw new Error('This client no longer exists. Reload the page.');
  upsertRow_('Sessions', String(s.id), sessionRow_(s, name));
  return s;
}

function formatExercises_(list) {
  return (list || []).filter(function (x) { return x && x.name; }).map(function (x) {
    var clean = function (v) { return str_(v).replace(/\|/g, '/').trim(); };
    return [clean(x.name), clean(x.sets), clean(x.reps), clean(x.weight)].join(' | ');
  }).join('\n');
}

function parseExercises_(text) {
  return str_(text).split('\n').map(function (line) {
    var p = line.split('|').map(function (v) { return v.trim(); });
    return { name: p[0] || '', sets: p[1] || '', reps: p[2] || '', weight: p[3] || '' };
  }).filter(function (x) { return x.name; });
}

// ---------- Bulk import (from a backup file or from "this phone only" mode) ----------

function importAll_(clients, sessions) {
  var cMap = {}, order = [];
  readClients_().forEach(function (c) { cMap[c.id] = c; order.push(c.id); });
  clients.forEach(function (c) {
    if (!c || !c.id || !c.name) return;
    if (!cMap[c.id]) order.push(c.id);
    cMap[c.id] = c;
  });
  var names = {};
  order.forEach(function (id) { names[id] = cMap[id].name; });

  var sMap = {}, sOrder = [];
  readSessions_().forEach(function (s) { sMap[s.id] = s; sOrder.push(s.id); });
  sessions.forEach(function (s) {
    if (!s || !s.id || !names[s.clientId]) return;
    if (!sMap[s.id]) sOrder.push(s.id);
    sMap[s.id] = s;
  });

  rewrite_('Clients', order.map(function (id) { return clientRow_(cMap[id]); }));
  rewrite_('Sessions', sOrder.map(function (id) { var s = sMap[id]; return sessionRow_(s, names[s.clientId]); }));
  return { clients: order.length, sessions: sOrder.length };
}

// ---------- Sheet helpers ----------

function ensureSheet_(ss, name, headers) {
  var sh = ss.getSheetByName(name) || ss.insertSheet(name);
  sh.getRange(1, 1, 1, headers.length).setValues([headers]).setFontWeight('bold');
  sh.setFrozenRows(1);
  // Store everything as plain text so dates and phone numbers are not changed by Sheets.
  sh.getRange(1, 1, sh.getMaxRows(), headers.length).setNumberFormat('@');
  return sh;
}

function sheet_(name) {
  var sh = SpreadsheetApp.getActive().getSheetByName(name);
  if (!sh) throw new Error('The "' + name + '" tab is missing. Run "setup" in Apps Script.');
  return sh;
}

function readRows_(name) {
  var sh = sheet_(name);
  var last = sh.getLastRow();
  if (last < 2) return [];
  var width = name === 'Clients' ? CLIENT_HEADERS.length : SESSION_HEADERS.length;
  return sh.getRange(2, 1, last - 1, width).getValues();
}

function upsertRow_(name, id, values) {
  var sh = sheet_(name);
  var last = sh.getLastRow();
  var row = last + 1;
  if (last >= 2) {
    var ids = sh.getRange(2, 1, last - 1, 1).getValues();
    for (var i = 0; i < ids.length; i++) {
      if (str_(ids[i][0]) === id) { row = i + 2; break; }
    }
  }
  writeRow_(sh, row, values, 1);
}

function deleteRowById_(name, id) {
  var sh = sheet_(name);
  var last = sh.getLastRow();
  if (last < 2) return;
  var ids = sh.getRange(2, 1, last - 1, 1).getValues();
  for (var i = ids.length - 1; i >= 0; i--) {
    if (str_(ids[i][0]) === id) sh.deleteRow(i + 2);
  }
}

function writeRow_(sh, row, values, col) {
  var range = sh.getRange(row, col, 1, values.length);
  range.setNumberFormat('@');
  range.setValues([values.map(safe_)]);
}

function rewrite_(name, rows) {
  var sh = sheet_(name);
  var width = name === 'Clients' ? CLIENT_HEADERS.length : SESSION_HEADERS.length;
  var last = sh.getLastRow();
  if (last >= 2) sh.getRange(2, 1, last - 1, width).clearContent();
  if (!rows.length) return;
  var range = sh.getRange(2, 1, rows.length, width);
  range.setNumberFormat('@');
  range.setValues(rows.map(function (r) { return r.map(safe_); }));
}

// Text that starts with "=" would become a formula; keep it as plain text.
function safe_(v) {
  v = v == null ? '' : String(v);
  return /^[=+@]/.test(v) ? "'" + v : v;
}

function str_(v) {
  if (v == null) return '';
  if (v instanceof Date) return dateStr_(v);
  return String(v);
}

function dateStr_(v) {
  if (v instanceof Date) return Utilities.formatDate(v, Session.getScriptTimeZone(), 'yyyy-MM-dd');
  return v == null ? '' : String(v);
}

function list_(v) {
  return str_(v).split(',').map(function (x) { return x.trim(); }).filter(String);
}

function randomKey_(n) {
  var chars = 'abcdefghijkmnopqrstuvwxyzABCDEFGHJKLMNPQRSTUVWXYZ23456789';
  var out = '';
  var bytes = Utilities.getUuid().replace(/-/g, '') + Utilities.getUuid().replace(/-/g, '');
  for (var i = 0; i < n; i++) out += chars[parseInt(bytes.substr(i * 2 % 60, 2), 16) % chars.length];
  return out;
}
