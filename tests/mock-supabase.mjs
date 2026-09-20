/**
 * خادم Supabase وهمي للاختبار المحلي فقط (لا يُشحن مع التطبيق).
 * يحاكي: Google OAuth عبر Supabase (PKCE: authorize → code → token) + تجديد الجلسة + خروج،
 * وREST لجداول التطبيق مع عزل المستخدمين وقفل المالك (OWNER_EMAIL).
 * التشغيل:  OWNER_EMAIL=me@example.com node tests/mock-supabase.mjs [port]
 * أدوات الاختبار:  /__admin/google?email=x  (حساب Google الذي «يختاره» المستخدم)،
 *                  /__admin/google?cancel=1 (المستخدم يلغي)،  /__admin/owner?email=x  (تغيير المالك)
 */
import http from 'node:http';
import crypto from 'node:crypto';

const PORT = Number(process.argv[2] || 54321);
const OWNER0 = (process.env.OWNER_EMAIL || '').trim().toLowerCase();
const PK = {
  profiles: ['id'],
  user_settings: ['user_id'],
  workout_sessions: ['id'],
  workout_session_exercises: ['id'],
  weekly_measurements: ['id'],
  saved_audio: ['id'],
  daily_logs: ['user_id', 'date'],
};

const state = { users: new Map(), tables: Object.fromEntries(Object.keys(PK).map((t) => [t, []])), refresh: new Map(), codes: new Map(), authorizes: [], google: { email: 'ziyad@example.com', cancel: false }, owner: OWNER0, sends: [], failRest: false, log: [] };

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
    user: { id, aud: 'authenticated', role: 'authenticated', email, email_confirmed_at: new Date().toISOString(), app_metadata: { provider: 'google', providers: ['google'] }, user_metadata: { email_verified: true }, created_at: new Date().toISOString() },
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
  if (path === '/__admin/state') return send(res, 200, { tables: state.tables, sends: state.sends, users: [...state.users.keys()], authorizes: state.authorizes, owner: state.owner, google: state.google });
  if (path === '/__admin/google') {
    if (url.searchParams.get('email')) state.google.email = url.searchParams.get('email').toLowerCase();
    state.google.cancel = url.searchParams.get('cancel') === '1';
    return send(res, 200, state.google);
  }
  if (path === '/__admin/owner') {
    state.owner = (url.searchParams.get('email') || '').toLowerCase();
    return send(res, 200, { owner: state.owner });
  }
  if (path === '/__admin/reset') {
    for (const t of Object.keys(state.tables)) state.tables[t] = [];
    state.users.clear();
    state.refresh.clear();
    state.sends.length = 0;
    state.codes.clear();
    state.authorizes.length = 0;
    state.google = { email: 'ziyad@example.com', cancel: false };
    state.owner = OWNER0;
    state.failRest = false;
    return send(res, 200, { ok: true });
  }
  if (path === '/__admin/fail-rest') {
    state.failRest = url.searchParams.get('on') === '1';
    return send(res, 200, { ok: true });
  }

  /* ---------- Auth ---------- */
  // الدخول بالبريد/الرمز معطّل في هذا المشروع (Google فقط)
  if (path === '/auth/v1/otp' || path === '/auth/v1/verify' || path === '/auth/v1/signup')
    return send(res, 422, { code: 422, error_code: 'email_provider_disabled', msg: 'Email logins are disabled' });

  // 1) بداية OAuth: يحاكي Supabase → Google → عودة برمز مؤقت (PKCE)
  if (path === '/auth/v1/authorize') {
    const q = Object.fromEntries(url.searchParams);
    state.authorizes.push(q);
    if (q.provider !== 'google') return send(res, 400, { code: 400, error_code: 'validation_failed', msg: 'Unsupported provider: provider is not enabled' });
    const back = new URL(q.redirect_to || 'http://127.0.0.1:4173/');
    const redirect = (params) => {
      for (const [k, v] of Object.entries(params)) back.searchParams.set(k, v);
      res.writeHead(302, { ...cors, location: back.toString() });
      res.end();
    };
    if (state.google.cancel) return redirect({ error: 'access_denied', error_description: 'The user denied access' });
    const email = state.google.email;
    // مشغّل القاعدة: لا يُنشأ حساب إلا للمالك المحدَّد (أو حساب موجود مسبقًا)
    if (!state.owner || (email !== state.owner && !state.users.has(email)))
      return redirect({ error: 'server_error', error_code: 'unexpected_failure', error_description: 'Database error saving new user' });
    const code = crypto.randomBytes(12).toString('hex');
    state.codes.set(code, { email, challenge: q.code_challenge, method: q.code_challenge_method });
    return redirect({ code });
  }
  // 2) تبديل الرمز بجلسة (PKCE) أو تجديد الجلسة
  if (path === '/auth/v1/token' && req.method === 'POST' && url.searchParams.get('grant_type') === 'pkce') {
    const b = await readBody(req);
    const c = state.codes.get(b.auth_code);
    state.codes.delete(b.auth_code);
    const challenge = crypto.createHash('sha256').update(String(b.code_verifier || '')).digest('base64url');
    if (!c || (c.method || '').toLowerCase() !== 's256' || c.challenge !== challenge) return send(res, 400, { code: 400, error_code: 'flow_state_not_found', msg: 'invalid flow state, no valid flow state found' });
    state.users.set(c.email, uidFor(c.email));
    return send(res, 200, session(c.email));
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
    // سياسة RLS المقيِّدة: غير المالك لا يرى ولا يكتب
    if (state.owner && user.email !== state.owner) return req.method === 'GET' ? send(res, 200, []) : send(res, 403, { code: '42501', message: 'new row violates row-level security policy' });
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
