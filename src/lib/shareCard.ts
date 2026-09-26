export interface GymSummaryShare {
  coach: string;
  dateLabel: string;
  durationLabel: string;
  exercises: number;
  sets: number;
  weekCount: number;
}

function summaryText(s: GymSummaryShare) {
  const parts = [`45/4 · الكوتش / ${s.coach}`, s.dateLabel, `جلست في النادي ${s.durationLabel}`];
  if (s.exercises > 0) parts.push(`أنجزت ${s.exercises} تمارين${s.sets > 0 ? ` · ${s.sets} سيت` : ''}`);
  parts.push(`هذا الأسبوع ${s.weekCount}/4 ✅`);
  return parts.join('\n');
}

export async function shareGymSummary(s: GymSummaryShare): Promise<'shared' | 'copied'> {
  const text = summaryText(s);
  if (navigator.share) {
    await navigator.share({ title: 'ملخص 45/4', text });
    return 'shared';
  }
  await navigator.clipboard.writeText(text);
  return 'copied';
}

export function downloadGymSummaryCard(s: GymSummaryShare) {
  const canvas = document.createElement('canvas');
  canvas.width = 1080;
  canvas.height = 1350;
  const ctx = canvas.getContext('2d');
  if (!ctx) return;
  ctx.direction = 'rtl';
  ctx.textAlign = 'right';
  const bg = ctx.createLinearGradient(0, 0, 1080, 1350);
  bg.addColorStop(0, '#F5F7F8');
  bg.addColorStop(1, '#DAF4FF');
  ctx.fillStyle = bg;
  ctx.fillRect(0, 0, 1080, 1350);

  ctx.fillStyle = '#10151B';
  ctx.beginPath();
  ctx.roundRect(90, 90, 900, 1170, 54);
  ctx.fill();

  ctx.fillStyle = '#FFFFFF';
  ctx.font = '700 64px system-ui, -apple-system, sans-serif';
  ctx.fillText('45/4', 900, 205);
  ctx.font = '700 48px system-ui, -apple-system, sans-serif';
  ctx.fillText(`الكوتش / ${s.coach}`, 900, 310);

  ctx.fillStyle = '#BDEEFF';
  ctx.font = '400 34px system-ui, -apple-system, sans-serif';
  ctx.fillText(s.dateLabel, 900, 372);

  ctx.fillStyle = '#FFFFFF';
  ctx.font = '800 96px system-ui, -apple-system, sans-serif';
  ctx.fillText(s.durationLabel, 900, 560);
  ctx.font = '500 34px system-ui, -apple-system, sans-serif';
  ctx.fillStyle = '#BDEEFF';
  ctx.fillText('وقت النادي', 900, 615);

  const rows: [string, string][] = [];
  if (s.exercises > 0) rows.push(['التمارين', `${s.exercises}`]);
  if (s.sets > 0) rows.push(['السيتات', `${s.sets}`]);
  rows.push(['إنجاز الأسبوع', `${s.weekCount}/4`]);
  rows.forEach(([label, value], i) => {
    const y = 770 + i * 140;
    ctx.fillStyle = 'rgba(255,255,255,.12)';
    ctx.beginPath();
    ctx.roundRect(180, y - 78, 720, 104, 26);
    ctx.fill();
    ctx.fillStyle = '#BDEEFF';
    ctx.font = '500 32px system-ui, -apple-system, sans-serif';
    ctx.fillText(label, 850, y - 12);
    ctx.fillStyle = '#FFFFFF';
    ctx.textAlign = 'left';
    ctx.font = '800 44px system-ui, -apple-system, sans-serif';
    ctx.fillText(value, 230, y - 12);
    ctx.textAlign = 'right';
  });

  ctx.fillStyle = '#BDEEFF';
  ctx.font = '500 28px system-ui, -apple-system, sans-serif';
  ctx.fillText('جلسة واحدة أفضل من لا شيء.', 900, 1190);

  const a = document.createElement('a');
  a.download = `45-4-${new Date().toISOString().slice(0, 10)}.png`;
  a.href = canvas.toDataURL('image/png');
  a.click();
}
