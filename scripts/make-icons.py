#!/usr/bin/env python3
"""يولّد أيقونة 45/4 (SVG + PNG) من خط ثمانية نفسه: الأرقام تُحوَّل إلى مسارات متجهية."""
import os, sys, json
from fontTools.ttLib import TTFont
from fontTools.pens.svgPathPen import SVGPathPen
from fontTools.pens.transformPen import TransformPen
from playwright.sync_api import sync_playwright

FONT = os.environ.get('ICON_FONT', 'public/fonts/thmanyahserifdisplay-Black.woff2')
font = TTFont(FONT)
gs = font.getGlyphSet(); cmap = font.getBestCmap(); upm = font['head'].unitsPerEm

def text_path(txt, size, x, y, anchor='middle', tracking=0):
    """يعيد (path, width) لنص لاتيني بحجم size عند الإحداثي (x,y = خط الأساس)"""
    scale = size / upm
    names = [cmap[ord(c)] for c in txt]
    adv = [gs[n].width * scale + tracking for n in names]
    total = sum(adv) - tracking
    cx = x - total / 2 if anchor == 'middle' else x
    d = ''
    for n, a in zip(names, adv):
        pen = SVGPathPen(gs)
        tp = TransformPen(pen, (scale, 0, 0, -scale, cx, y))
        gs[n].draw(tp)
        d += pen.getCommands()
        cx += a
    return d, total

def icon_svg(pad=0.0, rounded=True):
    S = 512
    inner = S * (1 - pad * 2)
    o = S * pad
    p45, w45 = text_path('45', inner * 0.50, S / 2, o + inner * 0.50, tracking=-inner*0.012)
    p4, w4 = text_path('4', inner * 0.50, S / 2, o + inner * 0.985, tracking=0)
    rx = 112 if rounded else 0
    bar_y = o + inner * 0.585
    bar_w = inner * 0.60
    return f'''<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 {S} {S}" width="{S}" height="{S}">
<defs><linearGradient id="g" x1="0" y1="0" x2="1" y2="1"><stop offset="0" stop-color="#111820"/><stop offset="1" stop-color="#070A0D"/></linearGradient></defs>
<rect width="{S}" height="{S}" rx="{rx}" fill="url(#g)"/>
<path d="{p45}" fill="#FFFFFF"/>
<rect x="{S/2 - bar_w/2:.1f}" y="{bar_y:.1f}" width="{bar_w:.1f}" height="{inner*0.03:.1f}" rx="{inner*0.015:.1f}" fill="#F42367"/>
<path d="{p4}" fill="#19C2FF"/>
</svg>'''

os.makedirs('public/icons', exist_ok=True)
open('public/favicon.svg', 'w').write(icon_svg(pad=0.13))
variants = {
  'icons/icon-192.png': (192, 0.13, True),
  'icons/icon-512.png': (512, 0.13, True),
  'icons/icon-maskable-512.png': (512, 0.24, False),
  'icons/apple-touch-icon.png': (180, 0.13, False),
}
with sync_playwright() as p:
    chrome = '/opt/pw-browsers/chromium-1194/chrome-linux/chrome'
    b = p.chromium.launch(executable_path=chrome) if os.path.exists(chrome) else p.chromium.launch()
    for name, (size, pad, rounded) in variants.items():
        svg = icon_svg(pad=pad, rounded=rounded)
        pg = b.new_page(viewport={'width': size, 'height': size}, device_scale_factor=1)
        sized = svg.replace('width="512" height="512"', 'width="%d" height="%d"' % (size, size))
        pg.set_content('<body style="margin:0;background:transparent">' + sized + '</body>')
        pg.screenshot(path='public/' + name, omit_background=True)
        pg.close()
    b.close()
print('icons ok')
