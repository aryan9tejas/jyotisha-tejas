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


def segments_fast(f, unit, jd0, jd1, step=0.08):
    """Like segments() but with a coarser scan and a regula-falsi root finder (a few evaluations per boundary).
    f must be cheap to call repeatedly at the same instants (the home page memoises the Sun and Moon)."""
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
            dv = lambda x: ((f(x) - boundary + 180) % 360) - 180
            lo, hi = t, t2
            dlo, dhi = dv(lo), dv(hi)
            tb = None
            for _ in range(8):
                if dhi == dlo:
                    break
                tm = min(max(lo - dlo * (hi - lo) / (dhi - dlo), lo), hi)
                dm = dv(tm)
                if abs(dm) < 2e-8:
                    tb = tm
                    break
                if dm < 0:
                    lo, dlo = tm, dm
                else:
                    hi, dhi = tm, dm
            if tb is None:
                for _ in range(14):
                    mid = (lo + hi) / 2
                    if dv(mid) < 0:
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


MASAS = ['Chaitra', 'Vaishakha', 'Jyeshtha', 'Ashadha', 'Shravana', 'Bhadrapada', 'Ashwina', 'Kartika', 'Margashirsha', 'Pausha', 'Magha', 'Phalguna']
DUR_SLOTS = [[14], [9, 12], [4, 8], [8], [6, 12], [4, 9], [1, 2]]     # by weekday Sun..Sat (muhurta numbers 1-15)


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
    out['Vijaya Muhurta'] = (sr + 10 * m, sr + 11 * m)          # 11th of the 15 muhurtas of the day
    nsr, pss = day.get('next_sr'), day.get('prev_ss')
    if nsr:                                                        # Godhuli: half a night-muhurta from sunset
        out['Godhuli Muhurta'] = (ss, ss + (nsr - ss) / 30.0)
    if pss:                                                        # Brahma: 14th of the 15 muhurtas of the night before sunrise
        nm = (sr - pss) / 15.0
        out['Brahma Muhurta'] = (sr - 2 * nm, sr - nm)
    for n, slot in enumerate(DUR_SLOTS[vara]):                     # Dur Muhurta: weekday-wise muhurta(s) of the day
        out['Dur Muhurta' if n == 0 else f'Dur Muhurta ({n + 1})'] = (sr + (slot - 1) * m, sr + slot * m)
    return out


# Amrita Gadiya (Amrita Kalam): starts at this many 24ths of the Moon's nakshatra duration after the nakshatra begins,
# and lasts 1.6/24 of that duration (4 ghatis of 60). Table by nakshatra, Ashwini to Revati
# (traditional values, as in Karanam Ramakumar's Panchangam calculations).
AMRITA_START = [16.8, 19.2, 21.6, 20.8, 15.2, 14, 21.6, 17.6, 22.4, 21.6, 17.6, 16.8, 18, 17.6, 15.2, 15.2, 13.6, 15.2,
                17.6, 19.2, 17.6, 13.6, 13.6, 16.8, 16, 19.2, 21.6]
AMRITA_LEN = 1.6 / 24.0


def amrita_windows(f_moon, lo, hi):
    """Amrita Kalam windows (a, b, nakshatra index) that overlap [lo, hi) (JD, UT)."""
    out = []
    for s in segments(f_moon, NAK_SPAN, lo - 1.6, hi + 1.6):
        if s['start'] is None or s['end'] is None:
            continue
        dur = s['end'] - s['start']
        a = s['start'] + AMRITA_START[s['index']] / 24.0 * dur
        b = a + dur * AMRITA_LEN
        if b > lo and a < hi:
            out.append((a, b, s['index']))
    return out


def amrita_from_rows(nak_rows, lo, hi):
    """Amrita Kalam windows (a, b, nakshatra index) overlapping [lo, hi) from complete nakshatra segments."""
    out = []
    for r in nak_rows:
        if r['a'] is None or r['b'] is None:
            continue
        dur = r['b'] - r['a']
        a = r['a'] + AMRITA_START[r['i']] / 24.0 * dur
        b = a + dur * AMRITA_LEN
        if b > lo and a < hi:
            out.append((a, b, r['i']))
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
            # scan beyond the day so that every element carries its true start and end (with dates)
            for s in segments_fast(f, unit, sr - 3.0, nsr + 3.0):
                if s['start'] is None or s['end'] is None or s['end'] <= sr or s['start'] >= nsr:
                    continue
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
        am = amrita_windows(_f_moon(cfg), sr, nsr)
        for n, (a, b, ni) in enumerate(am):
            kl['Amrita Kalam' if n == 0 else f'Amrita Kalam ({n + 1})'] = [F(a), F(b)]
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
            'amrita': ', '.join(' - '.join(x[11:16] for x in v) for k, v in p['kalams'].items() if k.startswith('Amrita')),
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


# ---------------------------------------------------------------- planet transits (any direction of motion)
def segments_any(f, unit, jd0, jd1, step=0.08):
    """Segments of f (degrees) by unit-sized bins, for a body that may also move backward (retrograde)."""
    count = int(round(360 / unit))
    t = jd0
    idx = int(f(t) // unit) % count
    cur = {'index': idx, 'start': None, 'end': None}
    segs = []
    while t < jd1:
        t2 = min(t + step, jd1)
        i2 = int(f(t2) // unit) % count
        if i2 != idx:
            fwd = i2 == (idx + 1) % count
            boundary = ((idx + 1) % count if fwd else idx) * unit
            lo, hi = t, t2
            for _ in range(24):
                mid = (lo + hi) / 2
                dv = ((f(mid) - boundary + 180) % 360) - 180
                if (dv < 0) == fwd:
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


TRANSIT_BODIES = ['Mercury', 'Venus', 'Mars', 'Jupiter', 'Saturn', 'Rahu', 'Ketu']
INGRESS_STEP = {'Sun': 1.0, 'Mercury': 1.0, 'Venus': 1.5, 'Mars': 3.0, 'Jupiter': 8.0, 'Saturn': 12.0, 'Rahu': 6.0, 'Ketu': 6.0}


def transit_ingress(when, lat, lon, tz, cfg=None):
    """For the Sun and the planets: the sign they are in at `when`, the one before and the one after, with the local
    time each sign starts and ends (a retrograde planet can return to the previous sign)."""
    cfg = {**DEFAULT_CFG, **(cfg or {})}
    dpart, tpart = when.replace(' ', 'T').split('T')
    y, m, d = [int(x) for x in dpart.split('-')]
    hh, mm = [int(float(x)) for x in tpart.split(':')[:2]]
    out = {}
    with LOCK:
        core.set_ayanamsa(cfg['ayanamsa'])
        off = tz_offset_hours(y, m, d, hh, mm, 0, tz)
        jd = swe.julday(y, m, d, hh + mm / 60.0) - off / 24.0
        F = lambda t: None if t is None else fmt_local(t + 30 / 86400.0, core.offset_for_jd(t, tz), False)
        for body in ['Sun'] + TRANSIT_BODIES:
            memo = {}

            def lon_of(t, body=body, memo=memo):
                v = memo.get(t)
                if v is None:
                    v = memo[t] = norm(sid_lon(t, body, cfg))
                return v
            sg = lambda t, lon_of=lon_of: int(lon_of(t) // 30) % 12
            step = INGRESS_STEP[body]

            def edge(t, direction):
                s0 = sg(t)
                tt = t
                for _ in range(6000):
                    t2 = tt + direction * step
                    if sg(t2) != s0:
                        lo, hi = tt, t2
                        for _ in range(28):
                            mid = (lo + hi) / 2
                            if sg(mid) == s0:
                                lo = mid
                            else:
                                hi = mid
                        tb = (lo + hi) / 2
                        # the true node wobbles by about a degree, so ignore crossings that do not last
                        if body in ('Rahu', 'Ketu') and sg(tb + direction * 20) != sg(tb + direction * 1e-4):
                            tt = t2
                            continue
                        return tb
                    tt = t2
                return None
            end = edge(jd, 1)
            start = edge(jd, -1)
            segs = [{'name': SIGNS[sg(jd)], 'a': start, 'b': end, 'cur': True}]
            if start is not None:
                ps = edge(start - 1e-5, -1)
                segs.insert(0, {'name': SIGNS[sg(start - 1e-5)], 'a': ps, 'b': start})
            if end is not None:
                ne = edge(end + 1e-5, 1)
                segs.append({'name': SIGNS[sg(end + 1e-5)], 'a': end, 'b': ne})
            for s_ in segs:
                s_['sa'], s_['sb'] = F(s_['a']), F(s_['b'])
            out[body] = segs
    return {'jd': jd, 'bodies': out}


# ---------------------------------------------------------------- home page snapshot
def home_snapshot(when, lat, lon, tz, cfg=None):
    """Everything the Panchang home page needs for the Vedic day (sunrise to sunrise) that contains the local
    civil time `when` ('YYYY-MM-DDTHH:MM'). Times are local 'YYYY-MM-DD HH:MM' (rounded to the minute) next to the
    JD (UT) they come from, so the page can pick the segment for any moment inside the day without another call."""
    cfg = {**DEFAULT_CFG, **(cfg or {})}
    dpart, tpart = when.replace(' ', 'T').split('T')
    y, m, d = [int(x) for x in dpart.split('-')]
    hh, mm = [int(float(x)) for x in tpart.split(':')[:2]]
    with LOCK:
        core.set_ayanamsa(cfg['ayanamsa'])
        off = tz_offset_hours(y, m, d, hh, mm, 0, tz)
        jd = swe.julday(y, m, d, hh + mm / 60.0) - off / 24.0
        day = day_bounds(jd, off, lat, lon, cfg['sunrise'])
        sr, ss, nsr = day['sr'], day['ss'], day['next_sr']
        F = lambda t: None if t is None else fmt_local(t + 30 / 86400.0, core.offset_for_jd(t, tz), False)
        w0, w1 = sr - 2.5, nsr + 2.5
        memo_m, memo_s = {}, {}

        def moon(t):
            v = memo_m.get(t)
            if v is None:
                v = memo_m[t] = norm(sid_lon(t, 'Moon', cfg))
            return v

        def sun(t):
            v = memo_s.get(t)
            if v is None:
                v = memo_s[t] = norm(sid_lon(t, 'Sun', cfg))
            return v

        def rows(f, unit, namer, extra=None):
            out = []
            for s_ in segments_fast(f, unit, w0, w1):
                r = {'name': namer(s_['index']), 'i': s_['index'], 'a': s_['start'], 'b': s_['end'],
                     'sa': F(s_['start']), 'sb': F(s_['end'])}
                if extra:
                    r.update(extra(s_['index']))
                out.append(r)
            return out

        ft = lambda t: norm(moon(t) - sun(t))
        fy = lambda t: norm(moon(t) + sun(t))
        data = {
            'when': f'{y:04d}-{m:02d}-{d:02d}T{hh:02d}:{mm:02d}', 'jd': jd,
            'date': F(sr)[:10], 'weekday': WEEKDAYS[day['vara']], 'vara_lord': VARA_LORDS[day['vara']],
            'sunrise': {'jd': sr, 's': F(sr)}, 'sunset': {'jd': ss, 's': F(ss)}, 'next_sunrise': {'jd': nsr, 's': F(nsr)},
            'tithi': rows(ft, 12, tithi_name),
            'nakshatra': rows(moon, NAK_SPAN, lambda i: NAKSHATRAS[i], lambda i: {'lord': NAK_LORD[i]}),
            'pada': rows(moon, NAK_SPAN / 4, lambda i: f'{NAKSHATRAS[i // 4]} {i % 4 + 1}', lambda i: {'pada': i % 4 + 1}),
            'yoga': rows(fy, NAK_SPAN, lambda i: YOGA_NAMES[i]),
            'karana': rows(ft, 6, karana_name),
            'moon_sign': rows(moon, 30, lambda i: SIGNS[i]),
            'sun_sign': rows(sun, 30, lambda i: SIGNS[i]),
            'sun_nak': rows(sun, NAK_SPAN, lambda i: NAKSHATRAS[i]),
        }
        # Lunar month (amanta): named from the Sun's sign at the new moon that began it; no sankranti in it = adhika
        def new_moon(t, direction):
            e = norm(moon(t) - sun(t))
            t += (-e if direction < 0 else 360 - e) / 12.19
            for _ in range(6):
                dv = ((norm(sid_lon(t, 'Moon', cfg) - sid_lon(t, 'Sun', cfg)) + 180) % 360) - 180
                t -= dv / 12.19
            return t
        n0, n1 = new_moon(sr, -1), new_moon(sr, 1)
        s0, s1 = int(norm(sid_lon(n0, 'Sun', cfg)) // 30), int(norm(sid_lon(n1, 'Sun', cfg)) // 30)
        pl = []
        for body in TRANSIT_BODIES:
            memo = {}

            def lon_of(t, body=body, memo=memo):
                v = memo.get(t)
                if v is None:
                    v = memo[t] = norm(sid_lon(t, body, cfg))
                return v
            sp = core.planet_pos(sr, body, cfg)[3]
            def prow(unit, namer, extra=None, lon_of=lon_of):
                out_ = []
                for s_ in segments_any(lon_of, unit, sr - 0.1, nsr + 0.1):
                    r = {'name': namer(s_['index']), 'i': s_['index'], 'a': s_['start'], 'b': s_['end'],
                         'sa': F(s_['start']), 'sb': F(s_['end'])}
                    if extra:
                        r.update(extra(s_['index']))
                    out_.append(r)
                return out_
            pl.append({'body': body, 'retro': sp < 0 or body in ('Rahu', 'Ketu'),
                       'sign': prow(30, lambda i: SIGNS[i]),
                       'nak': prow(NAK_SPAN, lambda i: NAKSHATRAS[i], lambda i: {'lord': NAK_LORD[i]}),
                       'pada': prow(NAK_SPAN / 4, lambda i: f'{NAKSHATRAS[i // 4]} {i % 4 + 1}', lambda i: {'pada': i % 4 + 1})})
        data['planets'] = pl
        data['masa'] = ('Adhika ' if s0 == s1 else '') + MASAS[(s0 + 1) % 12]
        data['masa_span'] = {'a': n0, 'b': n1, 'sa': F(n0), 'sb': F(n1)}
        kal = []
        for name, (a, b) in kalams(day).items():
            kal.append({'name': {'Rahu Kalam': 'Rahu Kala', 'Yama Gandam': 'Yama Ganda', 'Gulika Kalam': 'Gulika Kala'}.get(name, name),
                        'a': a, 'b': b, 'sa': F(a), 'sb': F(b)})
        for n, (a, b, ni) in enumerate(amrita_from_rows(data['nakshatra'], sr, nsr)):
            kal.append({'name': 'Amrita Kala', 'a': a, 'b': b, 'sa': F(a), 'sb': F(b), 'nak': NAKSHATRAS[ni]})
        data['kalas'] = kal
        # Lagna: the rising sign through the day (the ascendant moves forward about 1 degree per 4 minutes)
        la, lo_ = lat, lon
        data['lagna'] = [{'name': SIGNS[g['index']], 'i': g['index'], 'a': g['start'], 'b': g['end'],
                          'sa': F(g['start']), 'sb': F(g['end'])}
                         for g in segments_fast(lambda t: norm(core.asc_at(t, la, lo_)), 30, sr - 0.3, nsr + 0.3, step=0.03)]
        # Moon rise and set in this Vedic day, plus its azimuth and altitude every 15 minutes
        mrs = {}
        for key, rise in (('rise', True), ('set', False)):
            lst, t = [], sr - 0.02
            for _ in range(3):
                r = rise_set(t, lat, lon, body=swe.MOON, rise=rise, mode=cfg['sunrise'])
                if r is None or r >= nsr:
                    break
                lst.append({'jd': r, 's': F(r)})
                t = r + 0.02
            mrs[key] = lst
        armc0 = swe.houses_ex(sr, lat, lon, b'P', 0)[1][2]
        track, t, step = [], sr, 1 / 96.0
        import math
        slat, clat = math.sin(math.radians(lat)), math.cos(math.radians(lat))
        while t <= nsr + 1e-9:
            ra, dec = swe.calc_ut(t, swe.MOON, swe.FLG_SWIEPH | swe.FLG_EQUATORIAL)[0][:2]
            H = math.radians(armc0 + (t - sr) * 360.98564736629 - ra)
            dr = math.radians(dec)
            alt = math.degrees(math.asin(math.sin(dr) * slat + math.cos(dr) * clat * math.cos(H)))
            az = math.degrees(math.atan2(-math.cos(dr) * math.sin(H), math.sin(dr) * clat - math.cos(dr) * slat * math.cos(H))) % 360
            track.append([round(t, 5), round(az, 1), round(alt, 1)])
            t += step
        mrs['track'] = track
        data['moon'] = mrs
        data['horas'] = [{'n': h['n'], 'lord': h['lord'], 'a': h['start'], 'b': h['end'], 'sa': F(h['start']), 'sb': F(h['end']),
                          'night': h['night']} for h in hora_table(day)]
        return data
