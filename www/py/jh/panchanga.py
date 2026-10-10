"""Panchanga: tithi, nakshatra, yoga, karana, vara, kalams, horas, monthly table."""
import calendar
import swisseph as swe

from .consts import *
from . import core
from .core import LOCK, DEFAULT_CFG, norm, sid_lon, rise_set, day_bounds, fmt_local, tz_offset_hours

HORA_ORDER = ['Sun', 'Venus', 'Mercury', 'Moon', 'Saturn', 'Jupiter', 'Mars']
RAHU_PART = [8, 2, 7, 5, 6, 4, 3]     # by weekday Sun..Sat (1-based part of the 8-part day)
YAMA_PART = [5, 4, 3, 2, 1, 7, 6]
GULIKA_PART = [7, 6, 5, 4, 3, 2, 1]


def tithi_name(idx):
    n = idx % 15
    paksha = 'Shukla' if idx < 15 else 'Krishna'
    if n == 14:
        nm = 'Purnima' if idx < 15 else 'Amavasya'
    else:
        nm = TITHI_NAMES[n]
    return f'{paksha} {nm}'


def karana_name(k):
    if k == 0:
        return 'Kimstughna'
    if k >= 57:
        return ['Shakuni', 'Chatushpada', 'Naga'][k - 57]
    return KARANA_REPEAT[(k - 1) % 7]


def segments(f, unit, jd0, jd1, step=0.04):
    count = int(round(360 / unit))
    t = jd0
    idx = int(f(t) // unit) % count
    cur = {'index': idx, 'start': None, 'end': None}
    segs = []
    while t < jd1:
        t2 = min(t + step, jd1)
        i2 = int(f(t2) // unit) % count
        if i2 != idx:
            boundary = ((idx + 1) % count) * unit
            lo, hi = t, t2
            for _ in range(36):
                mid = (lo + hi) / 2
                dv = ((f(mid) - boundary + 180) % 360) - 180
                if dv < 0:
                    lo = mid
                else:
                    hi = mid
            tb = (lo + hi) / 2
            cur['end'] = tb
            segs.append(cur)
            cur = {'index': i2, 'start': tb, 'end': None}
            idx = i2
        t = t2
    segs.append(cur)
    return segs


def _f_tithi(cfg):
    return lambda jd: norm(sid_lon(jd, 'Moon', cfg) - sid_lon(jd, 'Sun', cfg))


def _f_yoga(cfg):
    return lambda jd: norm(sid_lon(jd, 'Moon', cfg) + sid_lon(jd, 'Sun', cfg))


def _f_moon(cfg):
    return lambda jd: norm(sid_lon(jd, 'Moon', cfg))


def hora_table(day):
    sr, ss, nsr, vara = day['sr'], day['ss'], day['next_sr'], day['vara']
    start = HORA_ORDER.index(VARA_LORDS[vara])
    rows = []
    for i in range(24):
        if i < 12:
            a = sr + (ss - sr) * i / 12.0
            b = sr + (ss - sr) * (i + 1) / 12.0
        else:
            a = ss + (nsr - ss) * (i - 12) / 12.0
            b = ss + (nsr - ss) * (i - 11) / 12.0
        rows.append({'n': i + 1, 'lord': HORA_ORDER[(start + i) % 7], 'start': a, 'end': b, 'night': i >= 12})
    return rows


def hora_at(jd, day):
    for r in hora_table(day):
        if r['start'] <= jd < r['end']:
            return r
    return None


def kalams(day):
    sr, ss, vara = day['sr'], day['ss'], day['vara']
    dur = (ss - sr) / 8.0
    out = {}
    for name, tbl in (('Rahu Kalam', RAHU_PART), ('Yama Gandam', YAMA_PART), ('Gulika Kalam', GULIKA_PART)):
        k = tbl[vara] - 1
        out[name] = (sr + k * dur, sr + (k + 1) * dur)
    # Abhijit muhurta: 8th of 15 muhurtas of the day
    m = (ss - sr) / 15.0
    out['Abhijit'] = (sr + 7 * m, sr + 8 * m)
    return out


def panchanga_day(y, m, d, lat, lon, tz, cfg=None):
    cfg = {**DEFAULT_CFG, **(cfg or {})}
    with LOCK:
        core.set_ayanamsa(cfg['ayanamsa'])
        off = tz_offset_hours(y, m, d, 12, 0, 0, tz)
        noon = swe.julday(y, m, d, 12.0) - off / 24.0
        day = day_bounds(noon, off, lat, lon, cfg['sunrise'])
        sr, ss, nsr = day['sr'], day['ss'], day['next_sr']
        F = lambda jd: fmt_local(jd, off, True) if jd else None

        def seg_rows(f, unit, namer):
            rows = []
            for s in segments(f, unit, sr, nsr):
                rows.append({'name': namer(s['index']), 'index': s['index'],
                             'start': F(s['start']), 'end': F(s['end'])})
            return rows

        tith = seg_rows(_f_tithi(cfg), 12, tithi_name)
        nak = seg_rows(_f_moon(cfg), NAK_SPAN, lambda i: f'{NAKSHATRAS[i]} ({NAK_LORD[i]})')
        yog = seg_rows(_f_yoga(cfg), NAK_SPAN, lambda i: YOGA_NAMES[i])
        kar = seg_rows(lambda jd: norm(sid_lon(jd, 'Moon', cfg) - sid_lon(jd, 'Sun', cfg)), 6, karana_name)
        msign = seg_rows(_f_moon(cfg), 30, lambda i: SIGNS[i])
        moonrise = rise_set(sr - 0.0, lat, lon, swe.MOON, True, cfg['sunrise'])
        moonset = rise_set(sr - 0.0, lat, lon, swe.MOON, False, cfg['sunrise'])
        hr = []
        for h in hora_table(day):
            hr.append({'n': h['n'], 'lord': h['lord'], 'start': F(h['start']), 'end': F(h['end']), 'night': h['night']})
        kl = {k: [F(a), F(b)] for k, (a, b) in kalams(day).items()}
        sun = sid_lon(sr, 'Sun', cfg)
        return {
            'date': f'{y:04d}-{m:02d}-{d:02d}', 'weekday': WEEKDAYS[day['vara']], 'vara_lord': VARA_LORDS[day['vara']],
            'sunrise': F(sr), 'sunset': F(ss), 'next_sunrise': F(nsr),
            'moonrise': F(moonrise), 'moonset': F(moonset),
            'day_length_h': round((ss - sr) * 24, 3),
            'sun_sign': SIGNS[int(sun // 30)], 'ayanamsa': round(swe.get_ayanamsa_ut(sr), 5),
            'tithi': tith, 'nakshatra': nak, 'yoga': yog, 'karana': kar, 'moon_sign': msign,
            'kalams': kl, 'horas': hr,
        }


def panchanga_month(year, month, lat, lon, tz, cfg=None):
    n = calendar.monthrange(year, month)[1]
    rows = []
    for d in range(1, n + 1):
        p = panchanga_day(year, month, d, lat, lon, tz, cfg)
        t0, n0, y0, k0 = p['tithi'][0], p['nakshatra'][0], p['yoga'][0], p['karana'][0]
        rows.append({
            'date': p['date'], 'weekday': p['weekday'][:3], 'sunrise': p['sunrise'][11:16], 'sunset': p['sunset'][11:16],
            'tithi': t0['name'], 'tithi_end': (t0['end'] or '')[5:16],
            'nakshatra': n0['name'], 'nak_end': (n0['end'] or '')[5:16],
            'yoga': y0['name'], 'karana': k0['name'],
            'moon_sign': p['moon_sign'][0]['name'],
            'rahu': ' - '.join(x[11:16] for x in p['kalams']['Rahu Kalam']),
            'yama': ' - '.join(x[11:16] for x in p['kalams']['Yama Gandam']),
            'gulika': ' - '.join(x[11:16] for x in p['kalams']['Gulika Kalam']),
        })
    return rows


def birth_panchanga(chart):
    """Tithi/yoga/karana/nakshatra/vara/hora at the birth moment (with elapsed fractions)."""
    cfg = chart['meta']['cfg']
    jd = chart['meta']['jd']
    sun, moon = chart['pmap']['Sun']['lon'], chart['pmap']['Moon']['lon']
    e = norm(moon - sun)
    ti = int(e // 12)
    ki = int(e // 6)
    yl = norm(sun + moon)
    yi = int(yl // NAK_SPAN)
    ni = int(moon // NAK_SPAN)
    off = chart['meta']['tz_offset']
    hr = hora_at(jd, chart['day'])
    kl = kalams(chart['day'])
    F = lambda t: fmt_local(t, off, False)
    return {
        'vara': WEEKDAYS[chart['day']['vara']],
        'tithi': tithi_name(ti), 'tithi_elapsed_pct': round((e % 12) / 12 * 100, 2),
        'nakshatra': NAKSHATRAS[ni], 'nakshatra_lord': NAK_LORD[ni], 'pada': chart['pmap']['Moon']['pada'],
        'yoga': YOGA_NAMES[yi], 'karana': karana_name(ki),
        'hora_lord': hr['lord'] if hr else None,
        'sunrise': F(chart['day']['sr']), 'sunset': F(chart['day']['ss']),
        'rahu_kalam': ' - '.join(F(x)[11:] for x in kl['Rahu Kalam']),
        'yama_gandam': ' - '.join(F(x)[11:] for x in kl['Yama Gandam']),
        'gulika_kalam': ' - '.join(F(x)[11:] for x in kl['Gulika Kalam']),
        'moon_sign': SIGNS[int(moon // 30)],
    }
