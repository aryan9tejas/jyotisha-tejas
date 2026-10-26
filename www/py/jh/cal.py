"""Calendar engine: lunar months (amanta and purnimanta), tithi festivals, vratas, sankrantis, fixed holidays,
and the planner that turns a user's alert rules into dated notifications."""
import math
from datetime import date, timedelta

import swisseph as swe

from .consts import *
from . import core
from .core import LOCK, DEFAULT_CFG, norm, sid_lon, day_bounds, fmt_local, tz_offset_hours
from . import cal_ext
from .panchanga import _f_tithi, _f_moon, _f_yoga, segments_fast, hora_table, kalams, tithi_name, karana_name, MASAS

MASA_FROM_SIGN = lambda s: (s + 1) % 12          # Sun in Pisces at the new moon starts Chaitra
SKR = ['Mesha', 'Vrishabha', 'Mithuna', 'Karka', 'Simha', 'Kanya', 'Tula', 'Vrischika', 'Dhanu', 'Makara', 'Kumbha', 'Meena']
EK_NAMES = {  # amanta month: (Krishna, Shukla)
    0: ('Papamochani', 'Kamada'), 1: ('Varuthini', 'Mohini'), 2: ('Apara', 'Nirjala'), 3: ('Yogini', 'Devshayani'),
    4: ('Kamika', 'Shravana Putrada'), 5: ('Aja', 'Parivartini'), 6: ('Indira', 'Papankusha'), 7: ('Rama', 'Prabodhini'),
    8: ('Utpanna', 'Mokshada'), 9: ('Saphala', 'Pausha Putrada'), 10: ('Shattila', 'Jaya'), 11: ('Vijaya', 'Amalaki')}
SANK = {0: 'Mesha Sankranti (Vishu, Tamil and Bengali New Year, Baisakhi)', 3: 'Karka Sankranti (Dakshinayana begins)',
        6: 'Tula Sankranti', 9: 'Makara Sankranti (Pongal, Uttarayana)'}
# (id, name, amanta month or None, tithi 1..30, time of day, category, gazetted holiday)
# tithi 1-15 Shukla, 16-30 Krishna (30 = Amavasya). Time: sr sunrise, mid midday, apa afternoon, pra after sunset, mnt midnight, mrise moonrise
FEST = [
    ('ugadi', 'Ugadi / Gudi Padwa', 0, 1, 'sr', 'fest', 1),
    ('ramnavami', 'Rama Navami', 0, 9, 'mid', 'fest', 1),
    ('mahavir', 'Mahavir Jayanti', 0, 13, 'sr', 'fest', 1),
    ('hanuman', 'Hanuman Jayanti', 0, 15, 'sr', 'fest', 0),
    ('akshaya', 'Akshaya Tritiya', 1, 3, 'sr', 'fest', 0),
    ('narasimha', 'Narasimha Jayanti', 1, 14, 'pra', 'fest', 0),
    ('buddha', 'Buddha Purnima', 1, 15, 'sr', 'fest', 1),
    ('vatsavitri', 'Vat Savitri', 2, 30, 'sr', 'fest', 0),
    ('rathyatra', 'Jagannath Rath Yatra', 3, 2, 'sr', 'fest', 0),
    ('guru', 'Guru Purnima', 3, 15, 'sr', 'fest', 0),
    ('nagapanchami', 'Nag Panchami', 4, 5, 'sr', 'fest', 0),
    ('raksha', 'Raksha Bandhan', 4, 15, 'apa', 'fest', 0),
    ('janmashtami', 'Krishna Janmashtami', 4, 23, 'mnt', 'fest', 1),
    ('hartalika', 'Hartalika Teej', 5, 3, 'sr', 'fest', 0),
    ('ganesh', 'Ganesh Chaturthi', 5, 4, 'mid', 'fest', 1),
    ('ananta', 'Ananta Chaturdashi', 5, 14, 'sr', 'fest', 0),
    ('mahalaya', 'Mahalaya Amavasya', 5, 30, 'apa', 'fest', 0),
    ('navaratri', 'Navaratri begins', 6, 1, 'sr', 'fest', 0),
    ('durgashtami', 'Durga Ashtami', 6, 8, 'sr', 'fest', 0),
    ('mahanavami', 'Maha Navami', 6, 9, 'sr', 'fest', 0),
    ('dussehra', 'Vijayadashami (Dussehra)', 6, 10, 'apa', 'fest', 1),
    ('sharad', 'Sharad Purnima', 6, 15, 'pra', 'fest', 0),
    ('karwa', 'Karwa Chauth', 6, 19, 'mrise', 'fest', 0),
    ('dhanteras', 'Dhanteras', 6, 28, 'pra', 'fest', 0),
    ('narakachat', 'Naraka Chaturdashi', 6, 29, 'sr', 'fest', 0),
    ('diwali', 'Diwali (Lakshmi Puja)', 6, 30, 'pra', 'fest', 1),
    ('govardhan', 'Govardhan Puja / Bali Pratipada', 7, 1, 'sr', 'fest', 0),
    ('bhaidooj', 'Bhai Dooj', 7, 2, 'apa', 'fest', 0),
    ('chhath', 'Chhath Puja', 7, 6, 'pra', 'fest', 0),
    ('kartikapurnima', 'Kartika Purnima / Dev Diwali', 7, 15, 'pra', 'fest', 1),
    ('skanda', 'Skanda Shashti', 8, 6, 'sr', 'fest', 0),
    ('datta', 'Datta Jayanti', 8, 15, 'pra', 'fest', 0),
    ('vasant', 'Vasant Panchami', 10, 5, 'sr', 'fest', 0),
    ('rathasaptami', 'Ratha Saptami', 10, 7, 'sr', 'fest', 0),
    ('shivaratri', 'Maha Shivaratri', 10, 29, 'mnt', 'fest', 1),
    ('holika', 'Holika Dahan', 11, 15, 'pra', 'fest', 0),
    ('holi', 'Holi (Dhulivandana)', 11, 16, 'sr', 'fest', 1),
]
VRATA = [  # monthly observances: (id, name, tithi, time, category)
    ('ekadashi_s', 'Ekadashi', 11, 'sr', 'vrata'), ('ekadashi_k', 'Ekadashi', 26, 'sr', 'vrata'),
    ('pradosham_s', 'Pradosham', 13, 'pra', 'vrata'), ('pradosham_k', 'Pradosham', 28, 'pra', 'vrata'),
    ('sankashti', 'Sankashti Chaturthi', 19, 'mrise', 'vrata'), ('vinayaka', 'Vinayaka Chaturthi', 4, 'mid', 'vrata'),
    ('masashivaratri', 'Masa Shivaratri', 29, 'mnt', 'vrata'),
    ('purnima', 'Purnima', 15, 'sr', 'moon'), ('amavasya', 'Amavasya', 30, 'sr', 'moon'),
]
HOLIDAYS = {(1, 1): 'New Year\'s Day', (1, 26): 'Republic Day (India)', (4, 14): 'Ambedkar Jayanti', (5, 1): 'Labour Day',
            (8, 15): 'Independence Day (India)', (10, 2): 'Gandhi Jayanti', (12, 25): 'Christmas'}
PUBLIC = {(1, 26), (4, 14), (8, 15), (10, 2), (12, 25)}     # gazetted national holidays that fall on a fixed date
OBSERVE = {(1, 24): 'National Girl Child Day', (9, 5): 'Teachers\' Day', (10, 31): 'National Unity Day', (11, 14): 'Children\'s Day', (11, 26): 'Constitution Day'}
# state days with a fixed date: state -> {(month, day): name}
STATE_DAYS = {
    'Karnataka': {(11, 1): 'Karnataka Rajyotsava'}, 'Maharashtra': {(5, 1): 'Maharashtra Day'}, 'Gujarat': {(5, 1): 'Gujarat Day'},
    'Telangana': {(6, 2): 'Telangana Formation Day'}, 'Andhra Pradesh': {(11, 1): 'Andhra Pradesh Formation Day'}, 'Kerala': {(11, 1): 'Kerala Piravi'},
    'Tamil Nadu': {(7, 18): 'Tamil Nadu Day'}, 'Odisha': {(4, 1): 'Utkal Divas'}, 'West Bengal': {(6, 20): 'Paschimbanga Dibas'},
    'Punjab': {(11, 1): 'Punjab Day'}, 'Haryana': {(11, 1): 'Haryana Day'}, 'Madhya Pradesh': {(11, 1): 'Madhya Pradesh Foundation Day'},
    'Chhattisgarh': {(11, 1): 'Chhattisgarh Foundation Day'}, 'Rajasthan': {(3, 30): 'Rajasthan Day'}, 'Uttar Pradesh': {(1, 24): 'Uttar Pradesh Diwas'},
    'Bihar': {(3, 22): 'Bihar Diwas'}, 'Jharkhand': {(11, 15): 'Jharkhand Foundation Day'}, 'Uttarakhand': {(11, 9): 'Uttarakhand Foundation Day'},
    'Himachal Pradesh': {(1, 25): 'Himachal Statehood Day'}, 'Assam': {(12, 2): 'Asom Divas'}, 'Goa': {(5, 30): 'Goa Statehood Day', (12, 19): 'Goa Liberation Day'},
    'Delhi': {(2, 2): 'Delhi Statehood Day'},
}


def _easter(y):
    a, b, c = y % 19, y // 100, y % 100
    d, e = b // 4, b % 4
    f = (b + 8) // 25
    g = (b - f + 1) // 3
    h = (19 * a + b - d - g + 15) % 30
    i, k = c // 4, c % 4
    l = (32 + 2 * e + 2 * i - h - k) % 7
    m = (a + 11 * h + 22 * l) // 451
    mo = (h + l - 7 * m + 114) // 31
    return date(y, mo, (h + l - 7 * m + 114) % 31 + 1)
WD3 = ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat']
TARA = ['Janma', 'Sampat', 'Vipat', 'Kshema', 'Pratyak', 'Sadhana', 'Naidhana', 'Mitra', 'Parama Mitra']
TARA_GOOD = [False, True, False, True, False, True, False, True, True]
CHANDRA_GOOD = [1, 3, 6, 7, 10, 11]


def _bis(dv, lo, hi, n=22):
    for _ in range(n):
        mid = (lo + hi) / 2
        if dv(mid) < 0:
            lo = mid
        else:
            hi = mid
    return (lo + hi) / 2


def _next_change(f, unit, t, limit=3.0):
    """JD when f next crosses a multiple of `unit` after t."""
    v = f(t)
    target = (math.floor(v / unit) + 1) * unit
    dv = lambda x: ((f(x) - target + 180) % 360) - 180
    step = 0.1 if unit > 10 else 0.2
    a = t
    while a < t + limit:
        b = a + step
        if dv(b) >= 0:
            return _bis(dv, a, b)
        a = b
    return None


def _new_moons(f, jd0, jd1):
    """JDs of new moons between jd0 and jd1."""
    out = []
    t = jd0
    prev = f(t)
    while t < jd1:
        t2 = t + 0.5
        cur = f(t2)
        if prev > 300 and cur < 60:
            dv = lambda x: ((f(x) + 180) % 360) - 180
            out.append(_bis(dv, t, t2, 26))
        prev = cur
        t = t2
    return out


def _lunar_months(cfg, jd0, jd1):
    f = _f_tithi(cfg)
    nms = _new_moons(f, jd0 - 40, jd1 + 40)
    ms = []
    for i in range(len(nms) - 1):
        s0 = int(norm(sid_lon(nms[i], 'Sun', cfg)) // 30) % 12
        s1 = int(norm(sid_lon(nms[i + 1], 'Sun', cfg)) // 30) % 12
        ms.append({'a': nms[i], 'b': nms[i + 1], 'masa': MASA_FROM_SIGN(s0), 'adhika': s0 == s1})
    return ms


def _month_at(ms, jd):
    for m in ms:
        if m['a'] <= jd < m['b']:
            return m
    return None


def _day_list(y, m, d, days, lat, lon, tz, cfg):
    """Day records for `days` civil days from y-m-d, plus one extra day each side (for first-day logic)."""
    out = []
    base = date(y, m, d) - timedelta(days=1)
    for i in range(days + 2):
        dt = base + timedelta(days=i)
        off = tz_offset_hours(dt.year, dt.month, dt.day, 12, 0, 0, tz)
        noon = swe.julday(dt.year, dt.month, dt.day, 12.0) - off / 24.0
        b = day_bounds(noon, off, lat, lon, cfg['sunrise'])
        out.append({'date': dt, 'off': off, 'sr': b['sr'], 'ss': b['ss'], 'nsr': b['next_sr'], 'vara': b['vara'], 'b': b})
    return out


def _rt(day, kind):
    sr, ss, nsr = day['sr'], day['ss'], day['nsr']
    return {'sr': sr, 'mid': sr + (ss - sr) * 0.5, 'apa': sr + (ss - sr) * 0.7, 'pra': ss + 0.04,
            'mnt': ss + (nsr - ss) * 0.5, 'mrise': ss + 0.1}[kind]


def build(y, m, d, days, lat, lon, tz, cfg=None, light=False, region=None, solar=None, hadj=0):
    """Calendar rows for `days` days from y-m-d."""
    cfg = {**DEFAULT_CFG, **(cfg or {})}
    with LOCK:
        core.set_ayanamsa(cfg['ayanamsa'])
        dl = _day_list(y, m, d, days, lat, lon, tz, cfg)
        ft, fm, fy = _f_tithi(cfg), _f_moon(cfg), _f_yoga(cfg)
        ms = _lunar_months(cfg, dl[0]['sr'], dl[-1]['nsr'])
        tith = lambda t: int(ft(t) // 12) + 1
        # which days match each observance (first day of a run only)
        segs = [x for x in segments_fast(ft, 12, dl[0]['sr'] - 2, dl[-1]['nsr'] + 2) if x['start'] is not None and x['end'] is not None]

        def matches(kind_t, tnum, month=None):
            """Day indexes for each occurrence of tithi `tnum`: the first day on which it prevails at the rule time;
            else the day it prevails at sunrise; else the day it starts (a tithi that starts and ends between two sunrises)."""
            hit = []
            for sg in segs:
                if sg['index'] != tnum - 1:
                    continue
                if month is not None:
                    mo = _month_at(ms, (sg['start'] + sg['end']) / 2)
                    if not mo or mo['masa'] != month or mo['adhika']:
                        continue
                pick = None
                for tk in (kind_t, 'sr'):
                    for i, dy in enumerate(dl):
                        if sg['start'] <= _rt(dy, tk) < sg['end']:
                            pick = i
                            break
                    if pick is not None:
                        break
                if pick is None:
                    for i, dy in enumerate(dl):
                        if dy['sr'] <= sg['start'] < dy['nsr']:
                            pick = i
                            break
                if pick is not None and pick not in hit:
                    hit.append(pick)
            return hit
        ev = {i: [] for i in range(len(dl))}
        for (eid, name, month, tnum, tk, cat, hol) in FEST:
            for i in matches(tk, tnum, month):
                ev[i].append({'id': eid, 'name': name, 'cat': 'hol' if hol else 'fest', 'fest': 1, 'pub': 1 if hol else 0})
        for (eid, name, tnum, tk, cat) in VRATA:
            for i in matches(tk, tnum):
                nm = name
                mo = _month_at(ms, _rt(dl[i], tk))
                if eid.startswith('ekadashi') and mo and not mo['adhika']:
                    nm = f"{EK_NAMES[mo['masa']][1 if eid.endswith('_s') else 0]} Ekadashi"
                elif eid.startswith('pradosham'):
                    nm = {1: 'Soma ', 2: 'Bhauma ', 6: 'Shani '}.get(dl[i]['vara'], '') + 'Pradosham'
                elif eid == 'sankashti' and dl[i]['vara'] == 2:
                    nm = 'Angaraki Sankashti Chaturthi'
                ev[i].append({'id': eid, 'name': nm, 'cat': cat})
        sols = None
        if solar and solar in cal_ext.SOLAR:
            nk_all = [int(fm(_rt(x, 'sr')) // NAK_SPAN) for x in dl]
            sols = cal_ext.solar_rows(solar, [x['date'] for x in dl], [x['off'] for x in dl], lat, lon, cfg, nk_all)
        rows = []
        for i in range(1, len(dl) - 1):
            dy = dl[i]
            off, sr, ss = dy['off'], dy['sr'], dy['ss']
            F = lambda jd: fmt_local(jd, off, False)[11:16]
            tmoon = int(fm(sr) // NAK_SPAN)
            sun_sr = norm(sid_lon(sr, 'Sun', cfg))
            sun_n = norm(sid_lon(dy['nsr'], 'Sun', cfg))
            e = list(ev[i])
            # sankranti falls on the local date of the Sun's ingress
            for j in (i - 1, i):
                a, b = dl[j]['sr'], dl[j]['nsr']
                s1, s2 = int(norm(sid_lon(a, 'Sun', cfg)) // 30), int(norm(sid_lon(b, 'Sun', cfg)) // 30)
                if s1 != s2:
                    tt = _bis(lambda x: -1 if int(norm(sid_lon(x, 'Sun', cfg)) // 30) == s1 else 1, a, b, 24)
                    if fmt_local(tt, off, False)[:10] == dy['date'].isoformat():
                        sg = s2 % 12
                        e.append({'id': 'sankranti', 'name': SANK.get(sg, SKR[sg] + ' Sankranti'), 'cat': 'sky', 'time': F(tt), 'sign': sg})
            md = (dy['date'].month, dy['date'].day)
            hl = HOLIDAYS.get(md)
            if hl:
                e.append({'id': 'civil', 'name': hl, 'cat': 'hol' if md in PUBLIC else 'fest', 'civil': 1, 'pub': 1 if md in PUBLIC else 0})
            if OBSERVE.get(md):
                e.append({'id': 'obs', 'name': OBSERVE[md], 'cat': 'fest', 'civil': 1})
            es = _easter(dy['date'].year)
            if dy['date'] == es - timedelta(days=2):
                e.append({'id': 'goodfriday', 'name': 'Good Friday', 'cat': 'hol', 'civil': 1, 'pub': 1})
            elif dy['date'] == es:
                e.append({'id': 'easter', 'name': 'Easter Sunday', 'cat': 'fest', 'civil': 1})
            for st in ([region] if region and region != 'all' else (list(STATE_DAYS) if region == 'all' else [])):
                sn = STATE_DAYS.get(st, {}).get(md)
                if sn:
                    e.append({'id': 'state-' + st.lower().replace(' ', ''), 'name': sn + ('' if region != 'all' else f' ({st})'), 'cat': 'hol', 'state': st})
            hj, hev = cal_ext.hijri_events(dy['date'], off, hadj, dy['vara'])
            e.extend(hev)
            sol = sols[i] if sols else None
            if sol:
                e.extend(sol['ev'])
            ids = {x['id'] for x in e}
            if ids & {'buddha', 'guru', 'raksha', 'sharad', 'kartikapurnima', 'hanuman', 'datta', 'holika'}:
                e = [x for x in e if x['id'] != 'purnima']
            if ids & {'vatsavitri', 'mahalaya', 'diwali', 'ugadi'}:
                e = [x for x in e if x['id'] != 'amavasya']
            if ids & {'shivaratri'}:
                e = [x for x in e if x['id'] != 'masashivaratri']
            if ids & {'ganesh'}:
                e = [x for x in e if x['id'] != 'vinayaka']
            mo = _month_at(ms, sr)
            nxt = None
            if mo:
                k = ms.index(mo)
                nxt = ms[k + 1] if k + 1 < len(ms) else None
            ti = tith(sr)
            row = {'date': dy['date'].isoformat(), 'wd': WD3[dy['vara']], 'vara': dy['vara'], 'sunrise': F(sr), 'sunset': F(ss),
                   'tithi': ti, 'tithi_name': tithi_name(ti - 1), 'paksha': 'Shukla' if ti <= 15 else 'Krishna',
                   'nak': tmoon, 'nak_name': NAKSHATRAS[tmoon], 'moon_sign': int(fm(sr) // 30), 'sun_sign': int(sun_sr // 30),
                   'masa': mo['masa'] if mo else None, 'adhika': bool(mo and mo['adhika']),
                   'masa_p': (nxt['masa'] if nxt else None) if ti > 15 and mo else (mo['masa'] if mo else None),
                   'events': e, 'hijri': hj}
            if sol:
                row['sol'] = {k: sol[k] for k in ('d', 'm', 'name', 'era')}
            if not light:
                te = _next_change(ft, 12, sr)
                ne = _next_change(fm, NAK_SPAN, sr)
                ye = _next_change(fy, NAK_SPAN, sr)
                row.update({'tithi_end': F(te) if te else '', 'tithi_end_date': fmt_local(te, off, False)[:10] if te else '',
                            'nak_end': F(ne) if ne else '', 'nak_end_date': fmt_local(ne, off, False)[:10] if ne else '',
                            'yoga': YOGA_NAMES[int(fy(sr) // NAK_SPAN)], 'yoga_end': F(ye) if ye else '',
                            'karana': karana_name(int(ft(sr) // 6)),
                            'moon_sign_name': SIGNS[int(fm(sr) // 30)]})
                kl = kalams(dy['b'])
                row['times'] = {k: [F(a), F(b)] for k, (a, b) in kl.items() if k in ('Rahu Kalam', 'Yama Gandam', 'Gulika Kalam', 'Abhijit', 'Vijaya Muhurta', 'Brahma Muhurta')}
            rows.append(row)
        return rows


def month(year, month_, lat, lon, tz, cfg=None, region=None, solar=None, hadj=0):
    n = (date(year + (month_ == 12), month_ % 12 + 1, 1) - date(year, month_, 1)).days
    return build(year, month_, 1, n, lat, lon, tz, cfg, region=region, solar=solar, hadj=hadj)


def range_(y, m, d, days, lat, lon, tz, cfg=None):
    out = []
    left = days
    cur = date(y, m, d)
    while left > 0:
        n = min(left, 62)
        out += build(cur.year, cur.month, cur.day, n, lat, lon, tz, cfg, light=True)
        cur += timedelta(days=n)
        left -= n
    return out


# ---------------------------------------------------------------- alert planner
def _quality(row, p):
    """Tarabala and Chandrabala for a person {nak, rasi} on the day described by `row`."""
    tara = ((row['nak'] - p['nak']) % 27) % 9
    ch = (row['moon_sign'] - p['rasi']) % 12 + 1
    return {'tara': TARA[tara], 'tara_good': TARA_GOOD[tara], 'chandra': ch, 'chandra_good': ch in CHANDRA_GOOD}


def plan(rules, y, m, d, days, lat, lon, tz, cfg=None, person=None):
    cfg = {**DEFAULT_CFG, **(cfg or {})}
    rows = build(y, m, d, days, lat, lon, tz, cfg, light=False)
    out = []
    with LOCK:
        core.set_ayanamsa(cfg['ayanamsa'])
        dl = _day_list(y, m, d, days, lat, lon, tz, cfg)[1:-1]
        jd_a, jd_b = dl[0]['sr'], dl[-1]['nsr']
        off0 = dl[0]['off']
        L = lambda jd: fmt_local(jd, core.offset_for_jd(jd, tz), False).replace(' ', 'T')

        def at(day_iso, hhmm, offset=0):
            dt = date.fromisoformat(day_iso) + timedelta(days=offset)
            return f'{dt.isoformat()}T{hhmm}'

        def lead(jd, mins):
            return L(jd - mins / 1440.0)
        for r in rules:
            if not r.get('on', True):
                continue
            t, rid = r.get('t'), r.get('id')
            hhmm = r.get('time', '07:00')
            offs = int(r.get('offset', 0))
            if t == 'brief':
                for row in rows:
                    body = f"{row['tithi_name']}, {row['nak_name']}. Rahu Kala {'-'.join(row['times']['Rahu Kalam'])}. Abhijit {'-'.join(row['times']['Abhijit'])}."
                    if person:
                        q = _quality(row, person)
                        body = f"Tarabala {q['tara']} ({'good' if q['tara_good'] else 'weak'}), Chandrabala {'good' if q['chandra_good'] else 'weak'}. " + body
                    out.append({'id': rid, 'at': at(row['date'], hhmm), 'title': 'Your day', 'body': body})
            elif t == 'tithi':
                sel = set(int(x) for x in r.get('tithis', []))
                for row in rows:
                    if row['tithi'] in sel:
                        out.append({'id': rid, 'at': at(row['date'], hhmm, offs), 'title': row['tithi_name'] + (' tomorrow' if offs < 0 else ' today'), 'body': f"Until {row['tithi_end']}. Nakshatra {row['nak_name']}."})
            elif t == 'event':
                keys = set(r.get('keys', []))
                for row in rows:
                    for ev in row['events']:
                        base = ev['id'].replace('_s', '').replace('_k', '')
                        cat = ev['cat']
                        if base in keys or ev['id'] in keys or (cat in keys) or ('fest' in keys and ev.get('fest')):
                            out.append({'id': rid, 'at': at(row['date'], hhmm, offs), 'title': ev['name'] + (' tomorrow' if offs < 0 else ''), 'body': f"{row['tithi_name']}, {row['nak_name']}."})
            elif t == 'hora':
                pl = set(r.get('planets', []))
                lo, hi = r.get('from', '00:00'), r.get('to', '23:59')
                for dy in dl:
                    for h in hora_table(dy['b']):
                        if h['lord'] in pl:
                            s = L(h['start'])
                            if lo <= s[11:16] <= hi:
                                out.append({'id': rid, 'at': lead(h['start'], int(r.get('lead', 0))), 'title': f"{h['lord']} hora begins", 'body': f"{s[11:16]} to {L(h['end'])[11:16]}"})
            elif t == 'rahu':
                for row, dy in zip(rows, dl):
                    a = kalams(dy['b'])['Rahu Kalam'][0]
                    out.append({'id': rid, 'at': lead(a, int(r.get('lead', 15))), 'title': 'Rahu Kala starts soon', 'body': '-'.join(row['times']['Rahu Kalam'])})
            elif t == 'transit':
                pl = r.get('planets', [])
                what = set(r.get('what', ['sign']))
                for body in pl:
                    if body in ('Sun', 'Moon', 'Mars', 'Mercury', 'Jupiter', 'Venus', 'Saturn', 'Rahu', 'Ketu'):
                        step = 0.25 if body == 'Moon' else 1.0
                        t0 = jd_a
                        prev = core.planet_pos(t0, body, cfg)
                        while t0 < jd_b:
                            t1 = t0 + step
                            cur = core.planet_pos(t1, body, cfg)
                            if 'sign' in what and int(norm(prev[0]) // 30) != int(norm(cur[0]) // 30):
                                s_prev = int(norm(prev[0]) // 30)
                                tb = _bis(lambda x: -1 if int(norm(core.planet_pos(x, body, cfg)[0]) // 30) == s_prev else 1, t0, t1, 22)
                                sg = int(norm(cur[0]) // 30)
                                out.append({'id': rid, 'at': lead(tb, int(r.get('lead', 0))), 'title': f"{body} enters {SIGNS[sg]}", 'body': L(tb).replace('T', ' ')})
                            if body not in ('Sun', 'Moon', 'Rahu', 'Ketu') and (prev[3] < 0) != (cur[3] < 0):
                                kind = 'retrograde' if cur[3] < 0 else 'direct'
                                if kind in what:
                                    tb = _bis(lambda x: (0 if (core.planet_pos(x, body, cfg)[3] < 0) == (prev[3] < 0) else 1) - 0.5, t0, t1, 22)
                                    out.append({'id': rid, 'at': lead(tb, int(r.get('lead', 0))), 'title': f"{body} turns {kind}", 'body': L(tb).replace('T', ' ') + f" in {SIGNS[int(norm(cur[0]) // 30)]}"})
                            prev, t0 = cur, t1
            elif t == 'nak':
                sel = set(int(x) for x in r.get('naks', []))
                for s in segments_fast(_f_moon(cfg), NAK_SPAN, jd_a, jd_b):
                    if s['index'] in sel and s['start'] is not None and s['start'] >= jd_a:
                        out.append({'id': rid, 'at': lead(s['start'], int(r.get('lead', 0))), 'title': f"Moon enters {NAKSHATRAS[s['index']]}", 'body': L(s['start']).replace('T', ' ') + (' to ' + L(s['end']).replace('T', ' ') if s['end'] else '')})
            elif t == 'personal' and person:
                what = r.get('what', 'goodday')
                for row in rows:
                    q = _quality(row, person)
                    if what == 'goodday' and q['tara_good'] and q['chandra_good']:
                        out.append({'id': rid, 'at': at(row['date'], hhmm, offs), 'title': 'Favourable day' + (' tomorrow' if offs < 0 else ''), 'body': f"Tarabala {q['tara']} and Chandrabala good. {row['nak_name']}."})
                    elif what == 'chandrashtama' and q['chandra'] == 8:
                        out.append({'id': rid, 'at': at(row['date'], hhmm, offs), 'title': 'Chandrashtama' + (' tomorrow' if offs < 0 else ' today'), 'body': 'Moon is in your 8th: go slowly with new starts.'})
                    elif what == 'weakday' and (not q['tara_good'] and not q['chandra_good']):
                        out.append({'id': rid, 'at': at(row['date'], hhmm, offs), 'title': 'Weak day' + (' tomorrow' if offs < 0 else ''), 'body': f"Tarabala {q['tara']} and Chandrabala weak."})
    out.sort(key=lambda x: x['at'])
    return out
