import { Link } from 'react-router-dom';
import { Footer, Logo } from '../components/ui';
import { Icon, type IconName } from '../components/Icon';

const ITEMS: { to: string; icon: IconName; title: string; sub: string; cold?: boolean }[] = [
  { to: '/devices', icon: 'search', title: 'دليل الأجهزة', sub: 'كل جهاز بصورته وعضلاته وطريقة استخدامه' },
  { to: '/listen', icon: 'headphones', title: 'اسمع أثناء التمرين', sub: 'تلاوات وبودكاست ومحفوظاتك', cold: true },
  { to: '/progress', icon: 'chart', title: 'تقدّمي', sub: 'الوزن والإحصائيات وسلسلة الالتزام' },
  { to: '/apple-health', icon: 'share', title: 'Apple Health', sub: 'استيراد اختياري للإحصائيات فقط', cold: true },
  { to: '/history', icon: 'list', title: 'سجل الجلسات', sub: 'كل جلساتك من الأحدث إلى الأقدم', cold: true },
  { to: '/settings', icon: 'gear', title: 'الإعدادات', sub: 'المظهر والتنبيهات والبرنامج والحساب' },
];

export default function More() {
  return (
    <div className="page stack">
      <div className="topbar">
        <h1>المزيد</h1>
        <Logo size={30} />
      </div>
      <div className="card pad-0">
        {ITEMS.map((it) => (
          <Link key={it.to} to={it.to} className="list-row">
            <span className={`ic ${it.cold ? 'cold' : ''}`}><Icon name={it.icon} /></span>
            <div className="grow">
              <div className="t">{it.title}</div>
              <div className="s">{it.sub}</div>
            </div>
            <Icon name="chevL" className="chev" />
          </Link>
        ))}
      </div>
      <Footer />
    </div>
  );
}
