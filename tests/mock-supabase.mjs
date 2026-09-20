/**
 * خادم Supabase وهمي للاختبار المحلي فقط (لا يُشحن مع التطبيق).
 * يحاكي: Auth بالبريد (OTP + تجديد الجلسة + خروج) وREST لجداول التطبيق مع عزل المستخدمين.
 * التشغيل:  node tests/mock-supabase.mjs [port]
 */
import http from 'node:http';
import crypto from 'node:crypto';

const PORT = Number(process.argv[2] || 54321);
const CODE = '123456';
const PK = {
  profiles: ['id'],
  user_settings: ['user_id'],
  workout_sessions: ['id'],
  workout_session_exercises: ['id'],
  weekly_measurements: ['id'],
  saved_audio: ['id'],
  daily_logs: ['user_id', 'date'],
};

const state = { users: new Map(), tables: Object.fromEntries(Object.keys(PK).map((t) => [t, []])), refresh: new Map(), sends: [], failRest: false, log: [] };

const b64 = (o) => Buffer.from(JSON.stringify(o)).toString('base64url');
const uidFor = (email) => {
  const h = crypto.createHash('md5').update(email).digest('hex');
  return `${h.slice(0, 8)}-${h.slice(8, 12)}-4${h.slice(13, 16)}-a${h.slice(17, 20)}-${h.slice(20, 32)}`;
};
function session(email) {
  const id = uidFor(email);
  const now = Math.floor(Date.now() / 1000);
  const exp = now + 3600;
  const access = `${b64({ alg: 'HS256', typ: 'JWT' })}.${b64({ sub: id, email, role: 'authenticated', aud: 'authenticated', exp, iat: now })}.mock`;
  const refresh = crypto.randomBytes(8).toString('hex');
  state.refresh.set(refresh, email);
  return {
    access_token: access,
    token_type: 'bearer',
    expires_in: 3600,
    expires_at: exp,
    refresh_token: refresh,
    user: { id, aud: 'authenticated', role: 'authenticated', email, email_confirmed_at: new Date().toISOString(), app_metadata: { provider: 'email' }, user_metadata: {}, created_at: new Date().toISOString() },
  };
}
const userFromAuth = (req) => {
  const m = /^Bearer (.+)$/.exec(req.headers.authorization || '');
  if (!m) return null;
  try {
    const p = JSON.parse(Buffer.from(m[1].split('.')[1], 'base64url').toString());
    return p.exp * 1000 > Date.now() ? { id: p.sub, email: p.email } : null;
  } catch {
    return null;
  }
};

const cors = {
  'access-control-allow-origin': '*',
  'access-control-allow-headers': '*',
  'access-control-allow-methods': 'GET,POST,PUT,PATCH,DELETE,OPTIONS',
  'access-control-expose-headers': '*',
};
const send = (res, code, body, extra = {}) => {
  const txt = body === undefined ? '' : JSON.stringify(body);
  res.writeHead(code, { ...cors, 'content-type': 'application/json', ...extra });
  res.end(txt);
};
const readBody = (req) =>
  new Promise((r) => {
    let d = '';
    req.on('data', (c) => (d += c));
    req.on('end', () => {
      try {
        r(d ? JSON.parse(d) : {});
      } catch {
        r({});
      }
    });
  });

function ownerCol(table) {
  return table === 'profiles' ? 'id' : 'user_id';
}
function applyFilters(rows, url) {
  let out = rows;
  for (const [k, v] of url.searchParams) {
    const m = /^(eq)\.(.*)$/.exec(v);
    if (m && !['select', 'order', 'limit', 'offset', 'on_conflict', 'columns'].includes(k)) out = out.filter((r) => String(r[k]) === m[2]);
  }
  return out;
}

const server = http.createServer(async (req, res) => {
  const url = new URL(req.url, `http://${req.headers.host}`);
  if (req.method === 'OPTIONS') return send(res, 204);
  const path = url.pathname;

  /* ---------- أدوات الاختبار ---------- */
  if (path === '/__admin/state') return send(res, 200, { tables: state.tables, sends: state.sends, users: [...state.users.keys()] });
  if (path === '/__admin/reset') {
    for (const t of Object.keys(state.tables)) state.tables[t] = [];
    state.users.clear();
    state.refresh.clear();
    state.sends.length = 0;
    state.failRest = false;
    return send(res, 200, { ok: true });
  }
  if (path === '/__admin/fail-rest') {
    state.failRest = url.searchParams.get('on') === '1';
    return send(res, 200, { ok: true });
  }

  /* ---------- Auth ---------- */
  if (path === '/auth/v1/otp' && req.method === 'POST') {
    const b = await readBody(req);
    const email = String(b.email || '').toLowerCase();
    if (!/^\S+@\S+\.\S+$/.test(email)) return send(res, 400, { code: 400, error_code: 'validation_failed', msg: 'Unable to validate email address: invalid format' });
    if (process.env.ONLY_EMAIL && state.users.size > 0 && !state.users.has(email)) return send(res, 500, { code: 500, error_code: 'unexpected_failure', msg: 'Database error saving new user' });
    state.sends.push({ email, at: Date.now() });
    return send(res, 200, {});
  }
  if (path === '/auth/v1/verify' && req.method === 'POST') {
    const b = await readBody(req);
    const email = String(b.email || '').toLowerCase();
    if (b.token !== CODE || !state.sends.some((s) => s.email === email)) return send(res, 403, { code: 403, error_code: 'otp_expired', msg: 'Token has expired or is invalid' });
    state.users.set(email, uidFor(email));
    return send(res, 200, session(email));
  }
  if (path === '/auth/v1/token' && req.method === 'POST') {
    const b = await readBody(req);
    const email = state.refresh.get(b.refresh_token);
    if (!email) return send(res, 400, { code: 400, error_code: 'refresh_token_not_found', msg: 'Invalid Refresh Token: Refresh Token Not Found' });
    state.refresh.delete(b.refresh_token);
    return send(res, 200, session(email));
  }
  if (path === '/auth/v1/user') {
    const u = userFromAuth(req);
    if (!u) return send(res, 401, { code: 401, msg: 'invalid JWT' });
    return send(res, 200, { id: u.id, aud: 'authenticated', role: 'authenticated', email: u.email, app_metadata: {}, user_metadata: {}, created_at: new Date().toISOString() });
  }
  if (path === '/auth/v1/logout') return send(res, 204);

  /* ---------- REST ---------- */
  const rm = /^\/rest\/v1\/([a-z_]+)$/.exec(path);
  if (rm) {
    const table = rm[1];
    if (!PK[table]) return send(res, 404, { message: `relation "public.${table}" does not exist` });
    const user = userFromAuth(req);
    if (!user) return send(res, 401, { message: 'JWT expired', code: 'PGRST301' });
    if (state.failRest) return send(res, 503, { message: 'simulated outage' });
    const own = ownerCol(table);
    const mine = () => state.tables[table].filter((r) => r[own] === user.id);

    if (req.method === 'GET') {
      let rows = applyFilters(mine(), url);
      const ord = url.searchParams.get('order');
      if (ord) {
        const [col, dir] = ord.split('.');
        rows = [...rows].sort((a, b) => (a[col] > b[col] ? 1 : a[col] < b[col] ? -1 : 0) * (dir === 'desc' ? -1 : 1));
      }
      const offset = Number(url.searchParams.get('offset') || 0);
      const limit = url.searchParams.get('limit');
      rows = rows.slice(offset, limit ? offset + Number(limit) : undefined);
      return send(res, 200, rows);
    }
    if (req.method === 'POST') {
      const body = await readBody(req);
      const list = Array.isArray(body) ? body : [body];
      const conflict = (url.searchParams.get('on_conflict') || PK[table].join(',')).split(',');
      for (const row of list) {
        const r = { ...row };
        if (r[own] && r[own] !== user.id) return send(res, 403, { code: '42501', message: 'new row violates row-level security policy' });
        r[own] = user.id;
        const i = state.tables[table].findIndex((x) => x[own] === user.id && conflict.every((c) => x[c] === r[c]));
        if (i >= 0) state.tables[table][i] = { ...state.tables[table][i], ...r };
        else state.tables[table].push(r);
      }
      return send(res, 201);
    }
    if (req.method === 'DELETE') {
      const del = new Set(applyFilters(mine(), url));
      state.tables[table] = state.tables[table].filter((r) => !del.has(r));
      return send(res, 204);
    }
  }
  send(res, 404, { error: 'not found', path });
});

server.listen(PORT, '127.0.0.1', () => console.log(`mock supabase on http://127.0.0.1:${PORT}`));
