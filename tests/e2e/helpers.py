import json, os, urllib.request
from playwright.sync_api import sync_playwright

BASE = os.environ.get('APP_URL', 'http://127.0.0.1:4173')
MOCK = os.environ.get('MOCK_URL', 'http://127.0.0.1:54321')
CHROME = '/opt/pw-browsers/chromium-1194/chrome-linux/chrome'
IPHONE = dict(viewport={'width': 390, 'height': 844}, device_scale_factor=2, is_mobile=True, has_touch=True,
              user_agent='Mozilla/5.0 (iPhone; CPU iPhone OS 17_0 like Mac OS X) AppleWebKit/605.1.15 (KHTML, like Gecko) Version/17.0 Mobile/15E148 Safari/604.1')
ANDROID = dict(viewport={'width': 360, 'height': 780}, device_scale_factor=2, is_mobile=True, has_touch=True,
               user_agent='Mozilla/5.0 (Linux; Android 14; Pixel 7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0 Mobile Safari/537.36')

def mock(path):
    return json.loads(urllib.request.urlopen(MOCK + path).read() or b'{}')

def launch(p):
    return p.chromium.launch(executable_path=CHROME, args=['--no-sandbox'])

def login(page):
    """الدخول بحساب Google (المحاكى في الخادم الوهمي) ثم انتظار الرئيسية"""
    page.goto(BASE + '/')
    page.wait_for_selector('.google-btn')
    page.click('.google-btn')
    page.wait_for_selector('.home-hello', timeout=15000)

def overflow(page):
    return page.evaluate("() => ({sw: document.documentElement.scrollWidth, cw: document.documentElement.clientWidth, bw: document.body.scrollWidth})")
