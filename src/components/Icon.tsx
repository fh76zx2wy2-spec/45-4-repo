import type { SVGProps } from 'react';

/** أيقونات خطية موحّدة (24×24) — بدون Emoji وبدون دمبل تقليدي */
const P: Record<string, string> = {
  home: 'M3.5 10.8 12 4l8.5 6.8V19a1.5 1.5 0 0 1-1.5 1.5h-3.5V14h-7v6.5H5A1.5 1.5 0 0 1 3.5 19z',
  timer: 'M9.5 3h5M12 3v2.2M12 21a7.5 7.5 0 1 0 0-15 7.5 7.5 0 0 0 0 15zm0-10.5V13.5l2.4 1.5',
  calendar: 'M6 4v2.5M18 4v2.5M4 9.5h16M5.5 6h13A1.5 1.5 0 0 1 20 7.5v11a1.5 1.5 0 0 1-1.5 1.5h-13A1.5 1.5 0 0 1 4 18.5v-11A1.5 1.5 0 0 1 5.5 6z',
  plate: 'M12 20.5a8.5 8.5 0 1 0 0-17 8.5 8.5 0 0 0 0 17zm0-4.3a4.2 4.2 0 1 0 0-8.4 4.2 4.2 0 0 0 0 8.4z',
  grid: 'M5 5h5v5H5zM14 5h5v5h-5zM5 14h5v5H5zM14 14h5v5h-5z',
  check: 'M5 12.6 9.6 17 19 7.4',
  x: 'M6 6l12 12M18 6 6 18',
  plus: 'M12 5v14M5 12h14',
  minus: 'M5 12h14',
  play: 'M8 5.5v13l10.5-6.5z',
  pause: 'M8 5.5v13M16 5.5v13',
  chevL: 'M14.5 5.5 8 12l6.5 6.5',
  chevR: 'M9.5 5.5 16 12l-6.5 6.5',
  sun: 'M12 16.2a4.2 4.2 0 1 0 0-8.4 4.2 4.2 0 0 0 0 8.4zM12 2.8v2M12 19.2v2M2.8 12h2M19.2 12h2M5.5 5.5l1.4 1.4M17.1 17.1l1.4 1.4M18.5 5.5l-1.4 1.4M6.9 17.1l-1.4 1.4',
  moon: 'M20 14.2A8.2 8.2 0 0 1 9.8 4 8.2 8.2 0 1 0 20 14.2z',
  headphones: 'M4 15v-3a8 8 0 0 1 16 0v3M4 15a1.5 1.5 0 0 1 1.5-1.5H7v5H5.5A1.5 1.5 0 0 1 4 17zM20 15a1.5 1.5 0 0 0-1.5-1.5H17v5h1.5A1.5 1.5 0 0 0 20 17z',
  chart: 'M4 19.5h16M6.5 16V11M11 16V6.5M15.5 16v-3.5M20 16V9',
  list: 'M8.5 6.5H20M8.5 12H20M8.5 17.5H20M4 6.5h.01M4 12h.01M4 17.5h.01',
  gear: 'M12 15.2a3.2 3.2 0 1 0 0-6.4 3.2 3.2 0 0 0 0 6.4zM19.4 13.5l1.6 1.2-1.7 3-1.9-.7a7.4 7.4 0 0 1-1.6.9l-.3 2h-3.4l-.3-2a7.4 7.4 0 0 1-1.6-.9l-1.9.7-1.7-3 1.6-1.2a7.6 7.6 0 0 1 0-1.9L4.6 10.4l1.7-3 1.9.7a7.4 7.4 0 0 1 1.6-.9l.3-2h3.4l.3 2c.6.2 1.1.5 1.6.9l1.9-.7 1.7 3-1.6 1.2c.1.6.1 1.3 0 1.9z',
  search: 'M11 18a7 7 0 1 0 0-14 7 7 0 0 0 0 14zM20 20l-4-4',
  bolt: 'M13 3 5.5 13.2H11L10 21l8-10.5h-5.6z',
  swap: 'M7 7h11l-3-3M17 17H6l3 3',
  clock: 'M12 21a8.5 8.5 0 1 0 0-17 8.5 8.5 0 0 0 0 17zM12 7.8V12l3 1.8',
  flag: 'M6 21V4M6 5h11l-2 3.5 2 3.5H6',
  undo: 'M9 8H4V3M4.6 8A8 8 0 1 1 4 12',
  link: 'M10 14a4 4 0 0 0 5.7 0l3-3a4 4 0 0 0-5.7-5.7l-1 1M14 10a4 4 0 0 0-5.7 0l-3 3a4 4 0 0 0 5.7 5.7l1-1',
  trash: 'M5 7h14M9.5 7V4.5h5V7M7 7l.8 12.5h8.4L17 7M10 11v5M14 11v5',
  edit: 'M4 20h4L19 9a2.1 2.1 0 0 0-3-3L5 17z',
  info: 'M12 21a9 9 0 1 0 0-18 9 9 0 0 0 0 18zM12 11v5.5M12 7.8h.01',
  drop: 'M12 3.5S5.5 10.4 5.5 14.6a6.5 6.5 0 0 0 13 0C18.5 10.4 12 3.5 12 3.5z',
  leaf: 'M5 19c0-8 5-13.5 14-14 0 9-5 14-13 14M5 19c2-4 5-6.5 9-8',
  share: 'M12 16V4M7.5 8.5 12 4l4.5 4.5M5 13v5.5A1.5 1.5 0 0 0 6.5 20h11a1.5 1.5 0 0 0 1.5-1.5V13',
  logout: 'M14 4h4.5A1.5 1.5 0 0 1 20 5.5v13a1.5 1.5 0 0 1-1.5 1.5H14M10 8l-4 4 4 4M6 12h10',
  download: 'M12 4v11M7.5 10.5 12 15l4.5-4.5M5 19.5h14',
  cloud: 'M7 18.5a4.5 4.5 0 0 1-.6-8.96A6 6 0 0 1 18 9.5a4.5 4.5 0 0 1 0 9z',
  external: 'M14 4h6v6M20 4l-9 9M18 14v4.5a1.5 1.5 0 0 1-1.5 1.5h-11A1.5 1.5 0 0 1 4 18.5v-11A1.5 1.5 0 0 1 5.5 6H10',
  target: 'M12 21a9 9 0 1 0 0-18 9 9 0 0 0 0 18zM12 16.5a4.5 4.5 0 1 0 0-9 4.5 4.5 0 0 0 0 9zM12 12h.01',
  scale: 'M5 4.5h14a1.5 1.5 0 0 1 1.5 1.5v12a1.5 1.5 0 0 1-1.5 1.5H5A1.5 1.5 0 0 1 3.5 18V6A1.5 1.5 0 0 1 5 4.5zM8.5 9.5a4 4 0 0 1 7 0M12 12l1.8-2',
  book: 'M5 4.5h10.5A2.5 2.5 0 0 1 18 7v13H7.5A2.5 2.5 0 0 1 5 17.5zM5 17.5A2.5 2.5 0 0 1 7.5 15H18',
  shield: 'M12 3.5 5 6v5.5c0 4.2 2.8 7.3 7 9 4.2-1.7 7-4.8 7-9V6z',
  sparkle: 'M12 3.5l1.7 5.3 5.3 1.7-5.3 1.7L12 17.5l-1.7-5.3L5 10.5l5.3-1.7z',
};

export type IconName = keyof typeof P;

export function Icon({ name, size, ...rest }: { name: IconName; size?: number } & SVGProps<SVGSVGElement>) {
  return (
    <svg
      viewBox="0 0 24 24"
      width={size}
      height={size}
      fill={name === 'play' ? 'currentColor' : 'none'}
      stroke="currentColor"
      strokeWidth={1.9}
      strokeLinecap="round"
      strokeLinejoin="round"
      aria-hidden="true"
      focusable="false"
      {...rest}
    >
      <path d={P[name]} />
    </svg>
  );
}

/** «رجوع» في واجهة RTL: سهم يشير لليمين */
export const BackIcon = (p: Omit<Parameters<typeof Icon>[0], 'name'>) => <Icon name="chevR" {...p} />;
/** «التالي» في RTL: سهم يشير لليسار */
export const NextIcon = (p: Omit<Parameters<typeof Icon>[0], 'name'>) => <Icon name="chevL" {...p} />;
