import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { DURATION_PICKS, RECITERS, reciterGeneralSearchUrl, reciterSearchUrl, type AudioSection, type DurationPick, type Reciter } from '../data/audio';
import { addAudio, removeAudio, useDB } from '../lib/store';
import { parseLink, play, playlistEmbed } from '../lib/player';
import type { SavedAudio } from '../lib/types';
import { PageHeader, Sheet, useToast } from '../components/ui';
import { Icon } from '../components/Icon';

type Tab = 'recitation' | 'podcast' | 'saved';
const TABS: { id: Tab; label: string }[] = [
  { id: 'recitation', label: 'تلاوات' },
  { id: 'podcast', label: 'بودكاست' },
  { id: 'saved', label: 'محفوظاتي' },
];

const kindLabel: Record<SavedAudio['kind'], string> = { youtube: 'YouTube', playlist: 'قائمة تشغيل', spotify: 'Spotify', other: 'رابط' };

function AudioRow({ a }: { a: SavedAudio }) {
  const p = parseLink(a.url);
  const canEmbed = !!p?.embed;
  return (
    <div className="list-row">
      <span className="ic cold"><Icon name={canEmbed ? 'headphones' : 'external'} /></span>
      <div className="grow">
        <div className="t">{a.title}</div>
        <div className="s">{kindLabel[a.kind]}{canEmbed ? '' : ' · يُفتح خارج التطبيق'}</div>
      </div>
      {canEmbed ? (
        <button className="icon-btn" aria-label={`تشغيل ${a.title}`} onClick={() => play({ src: p!.embed!, title: a.title, sub: kindLabel[a.kind], provider: p!.provider === 'spotify' ? 'spotify' : 'youtube' })}>
          <Icon name="play" />
        </button>
      ) : (
        <a className="icon-btn" href={a.url} target="_blank" rel="noopener noreferrer" aria-label={`فتح ${a.title}`}>
          <Icon name="external" />
        </a>
      )}
      <button className="icon-btn" aria-label={`حذف ${a.title}`} onClick={() => removeAudio(a.id)}>
        <Icon name="trash" />
      </button>
    </div>
  );
}

function AddSheet({ open, onClose, section }: { open: boolean; onClose: () => void; section: AudioSection }) {
  const { toast } = useToast();
  const [title, setTitle] = useState('');
  const [url, setUrl] = useState('');
  const [error, setError] = useState('');

  function submit() {
    const parsed = parseLink(url);
    if (!parsed) {
      setError('الرابط غير صالح. الصق رابط YouTube أو قائمة تشغيل أو Spotify.');
      return;
    }
    let host = '';
    try {
      host = new URL(parsed.url).hostname.replace(/^www\./, '');
    } catch {
      host = 'رابط';
    }
    addAudio({ title: title.trim() || host, url: parsed.url, kind: parsed.kind, section });
    setTitle('');
    setUrl('');
    setError('');
    onClose();
    toast('تمت الإضافة');
  }

  return (
    <Sheet
      open={open}
      onClose={onClose}
      title="إضافة رابط"
      footer={<button className="btn btn-primary btn-lg btn-block" onClick={submit} disabled={!url.trim()}>حفظ</button>}
    >
      <div className="field">
        <label htmlFor="a-title">الاسم</label>
        <input id="a-title" className="input" value={title} onChange={(e) => setTitle(e.target.value)} placeholder="مثلاً: سورة الكهف" maxLength={80} />
      </div>
      <div className="field">
        <label htmlFor="a-url">الرابط</label>
        <input id="a-url" className="input ltr" dir="ltr" inputMode="url" autoCapitalize="none" autoCorrect="off" value={url} onChange={(e) => { setUrl(e.target.value); setError(''); }} placeholder="https://www.youtube.com/…" />
        {error && <p className="input-error">{error}</p>}
      </div>
      <p className="muted" style={{ fontSize: 13 }}>لا يتم تنزيل أي ملف؛ يُشغَّل الرابط عبر المنصة نفسها داخل التطبيق إن سمحت بذلك، وإلا يُفتح في تطبيقها.</p>
    </Sheet>
  );
}


function RecitationPickerSheet({
  pick,
  reciter,
  onClose,
}: {
  pick: DurationPick | null;
  reciter: Reciter;
  onClose: () => void;
}) {
  const { toast } = useToast();
  if (!pick) return null;

  function start(listId: string, listTitle: string) {
    play({
      src: playlistEmbed(listId),
      title: listTitle,
      sub: `${reciter.name} · تشغيل داخل 45/4`,
      provider: 'youtube',
    });
    onClose();
    toast('بدأ التشغيل داخل 45/4');
  }

  return (
    <Sheet open={!!pick} onClose={onClose} title={`${pick.title} · ${pick.approx}`}>
      <div className="card" style={{ padding: 14 }}>
        <div className="t" style={{ fontWeight: 700, marginBottom: 4 }}>استماع بدون مغادرة الصفحة</div>
        <p className="muted" style={{ fontSize: 13 }}>
          اختر إحدى قوائم {reciter.name}. سيظهر المشغّل داخل 45/4 ويستمر أثناء تنقلك بين صفحات الموقع.
        </p>
      </div>

      <div className="stack" style={{ gap: 8 }}>
        {reciter.playlists.map((pl) => (
          <button key={pl.listId} className="list-row card" style={{ padding: '10px 12px' }} onClick={() => start(pl.listId, pl.title)}>
            <span className="ic cold"><Icon name="play" /></span>
            <div className="grow">
              <div className="t">{pl.title}</div>
              <div className="s">{reciter.name} · داخل الموقع</div>
            </div>
            <Icon name="headphones" className="chev" />
          </button>
        ))}
      </div>

      <div className="row" style={{ justifyContent: 'center', marginTop: 2 }}>
        <a
          className="btn btn-sm btn-ghost"
          href={reciterSearchUrl(reciter, pick.surahs)}
          target="_blank"
          rel="noopener noreferrer"
        >
          <Icon name="search" size={17} /> بحث YouTube عن السورة (اختياري)
        </a>
      </div>
    </Sheet>
  );
}

export default function Listen() {
  const nav = useNavigate();
  const db = useDB();
  const { toast } = useToast();
  const [tab, setTab] = useState<Tab>('recitation');
  const [minutes, setMinutes] = useState<20 | 45>(20);
  const [rid, setRid] = useState(RECITERS[0].id);
  const [addOpen, setAddOpen] = useState(false);
  const [recitationPick, setRecitationPick] = useState<DurationPick | null>(null);
  const reciter = RECITERS.find((r) => r.id === rid)!;
  const saved = db?.audio ?? [];
  const picks = DURATION_PICKS.filter((p) => p.minutes === minutes);
  const list = (s: AudioSection) => saved.filter((a) => a.section === s);

  return (
    <div className="page stack">
      <PageHeader title="اسمع أثناء التمرين" onBack={() => nav('/more')} sub="يستمر التشغيل أثناء التنقل وأثناء التمرين" />

      <div className="seg" role="tablist">
        {TABS.map((t) => (
          <button key={t.id} role="tab" aria-selected={tab === t.id} aria-pressed={tab === t.id} className={tab === t.id ? 'on' : ''} onClick={() => setTab(t.id)}>
            {t.label}
          </button>
        ))}
      </div>

      {tab === 'recitation' && (
        <>
          <section className="card stack">
            <div>
              <div className="label" style={{ marginBottom: 8 }}>القارئ</div>
              <div className="chips">
                {RECITERS.map((r) => (
                  <button key={r.id} className={`chip-btn ${rid === r.id ? 'on' : ''}`} onClick={() => setRid(r.id)}>{r.name}</button>
                ))}
              </div>
            </div>
            <div>
              <div className="label" style={{ marginBottom: 8 }}>مدة الجلسة</div>
              <div className="seg" role="group">
                {([20, 45] as const).map((m) => (
                  <button key={m} className={minutes === m ? 'on' : ''} aria-pressed={minutes === m} onClick={() => setMinutes(m)}>{m} دقيقة</button>
                ))}
              </div>
            </div>
            <div className="stack" style={{ gap: 0 }}>
              {picks.map((p) => (
                <button key={p.title} className="list-row" style={{ padding: '10px 0' }} onClick={() => setRecitationPick(p)}>
                  <span className="ic cold"><Icon name="headphones" /></span>
                  <div className="grow">
                    <div className="t">{p.title}</div>
                    <div className="s">بصوت {reciter.name} · {p.approx} · تشغيل داخل 45/4</div>
                  </div>
                  <Icon name="play" className="chev" />
                </button>
              ))}
            </div>
            <p className="muted" style={{ fontSize: 12.5 }}>المدد تقريبية. الضغط على الاقتراح يفتح قوائم القارئ داخل 45/4 دون مغادرة الصفحة، ويبقى بحث YouTube خيارًا ثانويًا فقط.</p>
          </section>

          <section className="card">
            <div className="card-title" style={{ marginBottom: 6 }}>قوائم {reciter.name}</div>
            <p className="muted" style={{ fontSize: 13, marginBottom: 8 }}>تُشغَّل داخل التطبيق عبر YouTube.</p>
            {reciter.playlists.map((pl) => (
              <div key={pl.listId} className="list-row" style={{ padding: '10px 0' }}>
                <span className="ic"><Icon name="list" /></span>
                <div className="grow"><div className="t">{pl.title}</div></div>
                <button className="icon-btn" aria-label={`تشغيل ${pl.title}`} onClick={() => play({ src: playlistEmbed(pl.listId), title: pl.title, sub: reciter.name, provider: 'youtube' })}><Icon name="play" /></button>
                <button className="icon-btn" aria-label="حفظ في محفوظاتي" onClick={() => { addAudio({ title: `${reciter.name} — ${pl.title}`, url: `https://www.youtube.com/playlist?list=${pl.listId}`, kind: 'playlist', section: 'saved' }); toast('حُفظت في «محفوظاتي»'); }}><Icon name="plus" /></button>
              </div>
            ))}
            <div className="row" style={{ gap: 8, marginTop: 8, flexWrap: 'wrap' }}>
              <a className="btn btn-sm btn-ghost" href={reciter.channel} target="_blank" rel="noopener noreferrer"><Icon name="external" size={18} /> القناة</a>
              <a className="btn btn-sm btn-ghost" href={reciterGeneralSearchUrl(reciter)} target="_blank" rel="noopener noreferrer"><Icon name="search" size={18} /> بحث</a>
            </div>
          </section>

          {list('recitation').length > 0 && (
            <section className="card pad-0">
              <div className="card-title" style={{ padding: '16px 18px 0' }}>روابطي</div>
              {list('recitation').map((a) => <AudioRow key={a.id} a={a} />)}
            </section>
          )}
          <button className="btn btn-ghost btn-block" onClick={() => setAddOpen(true)}><Icon name="plus" /> أضف رابط تلاوة</button>
        </>
      )}

      {tab === 'podcast' && (
        <>
          {list('podcast').length === 0 ? (
            <div className="card center stack" style={{ padding: 28 }}>
              <span className="ic-round cold" style={{ margin: '0 auto' }}><Icon name="headphones" /></span>
              <div className="card-title">لا بودكاست بعد</div>
              <p className="muted" style={{ fontSize: 14 }}>أضف الحلقات أو القوائم التي تحب سماعها أثناء التمرين — رابط YouTube أو Spotify — لتجدها هنا بضغطة.</p>
            </div>
          ) : (
            <section className="card pad-0">{list('podcast').map((a) => <AudioRow key={a.id} a={a} />)}</section>
          )}
          <button className="btn btn-primary btn-block" onClick={() => setAddOpen(true)}><Icon name="plus" /> أضف بودكاست أو حلقة</button>
        </>
      )}

      {tab === 'saved' && (
        <>
          {list('saved').length === 0 ? (
            <div className="card center stack" style={{ padding: 28 }}>
              <div className="card-title">لا محفوظات بعد</div>
              <p className="muted" style={{ fontSize: 14 }}>احفظ أي رابط أو قائمة تشغيل تريد الرجوع إليها سريعًا.</p>
            </div>
          ) : (
            <section className="card pad-0">{list('saved').map((a) => <AudioRow key={a.id} a={a} />)}</section>
          )}
          <button className="btn btn-primary btn-block" onClick={() => setAddOpen(true)}><Icon name="plus" /> إضافة رابط</button>
        </>
      )}

      <AddSheet open={addOpen} onClose={() => setAddOpen(false)} section={tab} />
      <RecitationPickerSheet pick={recitationPick} reciter={reciter} onClose={() => setRecitationPick(null)} />
    </div>
  );
}
