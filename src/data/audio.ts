/**
 * اسمع أثناء التمرين — القراء المبدوء بهم.
 * لا نحمّل ولا نعيد رفع أي ملف: نستخدم روابط YouTube (قنوات وقوائم تشغيل عامة)
 * ونتائج بحث YouTube، وتُشغَّل داخل الموقع عبر Embedded Player عندما تسمح المنصة.
 */

export interface Reciter {
  id: string;
  name: string;
  /** قناة يوتيوب (عامة) */
  channel: string;
  /** قوائم تشغيل عامة (Embedded عند السماح) */
  playlists: { title: string; listId: string }[];
}

const ytSearch = (q: string) => `https://www.youtube.com/results?search_query=${encodeURIComponent(q)}`;

export const RECITERS: Reciter[] = [
  {
    id: 'ahmed-talib',
    name: 'أحمد طالب حميد',
    channel: 'https://www.youtube.com/channel/UCTLEjIsjbcKKEXjsh8wcbQA',
    playlists: [
      { title: 'روائع تلاوات الشيخ', listId: 'PLJYflIGQRFxZzKOcLpowCe2bC7Y4o4hZ4' },
      { title: 'تلاوات الشيخ أحمد بن طالب', listId: 'PLygjf4aMJegF11RvnLAm-WX1eMamHEYB1' },
    ],
  },
  {
    id: 'abdulrahman-almajed',
    name: 'عبدالرحمن الماجد',
    channel: 'https://www.youtube.com/@ahmn1408sa',
    playlists: [
      { title: 'أجمل التلاوات', listId: 'PLJoEvAAVJKYaI1cNsx1M119Rc5IAomAAB' },
      { title: 'تلاوات مختارة', listId: 'PLWm7hdrCGjCOTN-yPKPd8g-DHY9Cid35p' },
    ],
  },
  {
    id: 'abdullah-alqurafi',
    name: 'عبدالله القرافي',
    channel: 'https://www.youtube.com/@Telawat_alqrafi',
    playlists: [{ title: 'تلاوات الشيخ عبدالله القرافي', listId: 'PLQR7vbF2Oe1r9RCgTtmXhbF1ppjujNxzW' }],
  },
];

export interface DurationPick {
  minutes: 20 | 45;
  title: string;
  /** مدة تقريبية، وتختلف بحسب القارئ */
  approx: string;
  surahs: string;
}

/** اقتراحات بحسب المدة — تقريبية، وتفتح نتائج بحث YouTube للقارئ المختار */
export const DURATION_PICKS: DurationPick[] = [
  { minutes: 20, title: 'سورة يس', approx: '≈ 20 د', surahs: 'سورة يس' },
  { minutes: 20, title: 'الملك والرحمن', approx: '≈ 20–25 د', surahs: 'سورة الملك سورة الرحمن' },
  { minutes: 20, title: 'سورة الواقعة', approx: '≈ 15 د', surahs: 'سورة الواقعة' },
  { minutes: 45, title: 'سورة يوسف', approx: '≈ 40 د', surahs: 'سورة يوسف' },
  { minutes: 45, title: 'الكهف والملك', approx: '≈ 40 د', surahs: 'سورة الكهف سورة الملك' },
  { minutes: 45, title: 'سورة مريم وطه', approx: '≈ 45 د', surahs: 'سورة مريم' },
];

export function reciterSearchUrl(r: Reciter, surahs: string): string {
  return ytSearch(`${r.name} ${surahs}`);
}

export function reciterGeneralSearchUrl(r: Reciter): string {
  return ytSearch(`${r.name} تلاوة`);
}

export type AudioSection = 'recitation' | 'podcast' | 'saved';
