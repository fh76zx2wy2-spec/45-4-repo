// يحوّل رسومات الأجهزة المستخرجة من ملف PDF (SVG متجهي) إلى وحدة TypeScript
// بألوان مرتبطة بمتغيرات CSS (لتعمل في الوضعين الفاتح والداكن).
import fs from 'node:fs';
import path from 'node:path';
const dir = path.resolve('scripts/illustrations-src');
const out = path.resolve('src/data/illustrations.generated.ts');

const MAP = {
  '94.898987%, 54.899597%, 15.689087%': '--il-p',
  '78.819275%, 43.919373%, 10.198975%': '--il-p2',
  '90.589905%, 60.389709%, 29.019165%': '--il-p3',
  '7.058716%, 52.159119%, 48.629761%': '--il-t',
  '29.40979%, 36.468506%, 43.139648%': '--il-m',
  '19.999695%, 24.708557%, 29.019165%': '--il-m2',
  '17.248535%, 22.349548%, 27.449036%': '--il-m2',
  '19.999695%, 19.999695%, 19.999695%': '--il-m2',
  '62.348938%, 69.018555%, 74.119568%': '--il-g',
  '81.17981%, 85.879517%, 89.019775%': '--il-floor',
  '84.309387%, 88.238525%, 90.589905%': '--il-floor',
  '87.449646%, 90.589905%, 92.549133%': '--il-floor2',
  '49.798584%, 71.759033%, 69.799805%': '--il-mat',
  '49.798584%, 83.918762%, 81.17981%': '--il-screen',
  '49.798584%, 57.249451%, 63.139343%': '--il-g2',
  '91.369629%, 97.24884%, 99.21875%': '--il-wave',
  '60.778809%, 83.139038%, 90.979004%': '--il-water',
  '43.528748%, 71.369934%, 81.568909%': '--il-water2',
};
const varFor = (rgb) => {
  const k = rgb.replace(/^rgb\(|\)$/g, '');
  if (!MAP[k]) throw new Error('لون غير معروف: ' + rgb);
  return `var(${MAP[k]})`;
};
const r1 = (n) => { const v = Math.round(parseFloat(n) * 10) / 10; return String(v); };

const result = {};
for (const f of fs.readdirSync(dir).filter((x) => x.endsWith('.svg'))) {
  const id = f.replace('.svg', '');
  const src = fs.readFileSync(path.join(dir, f), 'utf8');
  const vb = src.match(/viewBox="([^"]+)"/)[1].split(' ').map(Number).map((n) => Math.round(n * 100) / 100).join(' ');
  const paths = [...src.matchAll(/<path ([^>]*?)\/>/g)].map((m) => m[1]);
  const parts = [];
  for (const a of paths) {
    const fill = a.match(/ fill="([^"]*)"/)?.[1] ?? a.match(/^fill="([^"]*)"/)?.[1];
    const stroke = a.match(/stroke="([^"]*)"/)?.[1];
    // مسارات سوداء بلا مساحة (خطوط مفتوحة) غير مرئية أصلًا
    if (fill === 'rgb(0%, 0%, 0%)') continue;
    let d = a.match(/ d="([^"]*)"/)?.[1] ?? a.match(/^d="([^"]*)"/)[1];
    d = d.replace(/-?\d+\.\d+/g, r1).replace(/\s+/g, ' ').trim();
    const st = [];
    if (fill && fill !== 'none') st.push(`fill:${varFor(fill)}`); else st.push('fill:none');
    if (stroke) {
      st.push(`stroke:${varFor(stroke)}`);
      const sw = a.match(/stroke-width="([^"]*)"/)?.[1];
      const cap = a.match(/stroke-linecap="([^"]*)"/)?.[1];
      const join = a.match(/stroke-linejoin="([^"]*)"/)?.[1];
      if (sw) st.push(`stroke-width:${sw}`);
      if (cap) st.push(`stroke-linecap:${cap}`);
      if (join && join !== 'miter') st.push(`stroke-linejoin:${join}`);
    }
    const tr = a.match(/transform="matrix\(([^)]*)\)"/)?.[1];
    let t = '';
    if (tr) {
      const n = tr.split(',').map((x) => Math.round(parseFloat(x) * 10000) / 10000);
      t = ` transform="matrix(${n.join(' ')})"`;
    }
    const rule = a.includes('fill-rule="nonzero"') && fill && fill !== 'none' ? '' : '';
    parts.push(`<path d="${d}" style="${st.join(';')}"${t}${rule}/>`);
  }
  result[id] = { vb, body: parts.join('') };
}
const hand = JSON.parse(fs.readFileSync(path.join(dir, '_handmade.json'), 'utf8'));
Object.assign(result, hand);

const ids = Object.keys(result).sort();
const ts = `// ملف مُولَّد آليًا بواسطة scripts/build-illustrations.mjs — لا تعدّله يدويًا.\n` +
`// المصدر: رسومات الأجهزة في ملف خطة النادي (PDF) + ثلاثة رسومات مرسومة بنفس الأسلوب.\n` +
`export const ILLUSTRATIONS: Record<string, { vb: string; body: string }> = ${JSON.stringify(result, null, 0)};\n` +
`export type IllustrationId = ${ids.map((i) => `'${i}'`).join(' | ')};\n`;
fs.writeFileSync(out, ts);
console.log('illustrations:', ids.length, (ts.length / 1024).toFixed(1) + ' KB');
