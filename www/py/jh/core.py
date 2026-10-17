"""Core chart engine: positions, lagna, divisional charts, special lagnas, upagrahas, karakas, arudhas."""
import math
import threading
from datetime import datetime, timedelta
from zoneinfo import ZoneInfo

import swisseph as swe

from .consts import *

LOCK = threading.RLock()

AYANAMSAS = {
    'lahiri': swe.SIDM_LAHIRI,
    'krishnamurti': swe.SIDM_KRISHNAMURTI,
    'raman': swe.SIDM_RAMAN,
}

DEFAULT_CFG = {
    'ayanamsa': 'lahiri',
    'node': 'true',            # 'true' or 'mean'
    'sunrise': 'tip',          # 'tip' (upper limb, refraction), 'center' (disc centre, no refraction)
    'gulika_pos': 'start',     # start / middle / end of Saturn's portion
    'mandi_pos': 'middle',
    'upa_pos': 'start',        # Kaala, Mrityu, Artha Praharaka, Yama Ghantaka: start/middle/end of their portion
    'year_days': 365.2425,     # length of dasa year
}

PID = {'Sun': swe.SUN, 'Moon': swe.MOON, 'Mars': swe.MARS, 'Mercury': swe.MERCURY,
       'Jupiter': swe.JUPITER, 'Venus': swe.VENUS, 'Saturn': swe.SATURN}
FLAGS = swe.FLG_SWIEPH | swe.FLG_SIDEREAL | swe.FLG_SPEED


def norm(x):
    return x % 360.0


def sign_of(lon):
    return int(norm(lon) // 30)


def dms(x):
    x = abs(x)
    d = int(x)
    m = int((x - d) * 60)
    s = int(round(((x - d) * 60 - m) * 60))
    if s == 60:
        s = 0; m += 1
    if m == 60:
        m = 0; d += 1
    return f"{d}°{m:02d}'{s:02d}\""


def set_ayanamsa(name):
    swe.set_sid_mode(AYANAMSAS.get(name, swe.SIDM_LAHIRI))


# ---------------------------------------------------------------- time
def tz_offset_hours(y, m, d, hh, mm, ss, tz):
    if isinstance(tz, (int, float)):
        return float(tz)
    dt = datetime(y, m, d, hh, mm, ss, tzinfo=ZoneInfo(tz))
    return dt.utcoffset().total_seconds() / 3600.0


def offset_for_jd(jd, tz):
    """UTC offset (hours) of IANA zone `tz` at the instant jd (UT)."""
    if isinstance(tz, (int, float)):
        return float(tz)
    from datetime import timezone
    y, m, d, h = swe.revjul(jd)
    t = datetime(y, m, d, tzinfo=timezone.utc) + timedelta(hours=h)
    return t.astimezone(ZoneInfo(tz)).utcoffset().total_seconds() / 3600.0


def birth_jd(b):
    if b.get('jd') is not None:
        return b['jd'], b.get('tz_offset', 0.0)
    off = b.get('tz_offset')
    if off is None:
        off = tz_offset_hours(b['year'], b['month'], b['day'], b['hour'], b['minute'], b.get('second', 0), b['tz'])
    hf = b['hour'] + b['minute'] / 60.0 + b.get('second', 0) / 3600.0
    return swe.julday(b['year'], b['month'], b['day'], hf - off), off


def jd_to_local(jd, off):
    y, m, d, h = swe.revjul(jd + off / 24.0)
    return datetime(y, m, d) + timedelta(seconds=int(round(h * 3600)))


def fmt_local(jd, off, secs=True):
    d = jd_to_local(jd, off)
    return d.strftime('%Y-%m-%d %H:%M:%S' if secs else '%Y-%m-%d %H:%M')


# ---------------------------------------------------------------- sun times
def rise_set(jd_start, lat, lon, body=swe.SUN, rise=True, mode='tip'):
    rs = swe.CALC_RISE if rise else swe.CALC_SET
    if mode == 'center':
        res, t = swe.rise_trans(jd_start, body, rs | swe.BIT_DISC_CENTER | swe.BIT_NO_REFRACTION, (lon, lat, 0), 0, 0)
    else:
        res, t = swe.rise_trans(jd_start, body, rs, (lon, lat, 0), 1013.25, 15.0)
    if res < 0:
        return None
    return t[0]


def day_bounds(jd, off, lat, lon, mode='tip'):
    """Sunrise-to-sunrise day containing jd. Returns dict with sr, ss, next_sr, vara (0=Sunday)."""
    local_mid = math.floor(jd + off / 24.0 + 0.5) - 0.5 - off / 24.0  # JD(UT) of local midnight
    sr = rise_set(local_mid, lat, lon, mode=mode)
    if sr is None:
        raise ValueError('No sunrise at this latitude/date')
    if jd < sr:
        local_mid -= 1.0
        sr = rise_set(local_mid, lat, lon, mode=mode)
    ss = rise_set(sr, lat, lon, rise=False, mode=mode)
    nsr = rise_set(sr + 0.5, lat, lon, mode=mode)
    pss = rise_set(sr - 1.0, lat, lon, rise=False, mode=mode)   # sunset that began the night before this sunrise
    civil_mid = math.floor(sr + off / 24.0 + 0.5)  # JD at local noon-ish of the sunrise's civil date
    vara = (int(civil_mid) + 1) % 7  # JD 0 = Monday
    return {'sr': sr, 'ss': ss, 'next_sr': nsr, 'prev_ss': pss, 'vara': vara}


# ---------------------------------------------------------------- positions
def planet_pos(jd, name, cfg):
    if name == 'Rahu' or name == 'Ketu':
        pid = swe.TRUE_NODE if cfg.get('node', 'true') == 'true' else swe.MEAN_NODE
        r, _ = swe.calc_ut(jd, pid, FLAGS)
        if name == 'Ketu':
            return (norm(r[0] + 180), r[1] * -1, r[2], r[3], r[4], r[5])
        return r
    r, _ = swe.calc_ut(jd, PID[name], FLAGS)
    return r


def sid_lon(jd, name='Sun', cfg=None):
    return planet_pos(jd, name, cfg or DEFAULT_CFG)[0]


def asc_mc(jd, lat, lon):
    for h in (b'P', b'O', b'W'):
        try:
            c, a = swe.houses_ex(jd, lat, lon, h, swe.FLG_SIDEREAL)
            return a[0], a[1], c
        except Exception:
            continue
    raise ValueError('Cannot compute ascendant')


def asc_at(jd, lat, lon):
    return asc_mc(jd, lat, lon)[0]


def nak_info(lon):
    lon = norm(lon)
    idx = int(lon // NAK_SPAN)
    pada = int((lon % NAK_SPAN) // (NAK_SPAN / 4)) + 1
    return idx, pada


# ---------------------------------------------------------------- relationships
def natural_rel(p, q):
    if q in NAT_FRIENDS[p]:
        return 'friend'
    if q in NAT_ENEMIES[p]:
        return 'enemy'
    return 'neutral'


def compound_rel(p, q, signs):
    """Panchadha maitri of p towards q using natural + temporary (from rasi signs)."""
    n = natural_rel(p, q)
    pos = (signs[q] - signs[p]) % 12 + 1
    temp_friend = pos in (2, 3, 4, 10, 11, 12)
    if n == 'friend':
        return 'adhimitra' if temp_friend else 'sama'
    if n == 'enemy':
        return 'sama' if temp_friend else 'adhisatru'
    return 'mitra' if temp_friend else 'satru'


def sign_dignity(p, sign, signs, deg=None):
    """Dignity of planet p placed in `sign`, using rasi `signs` for relationships."""
    if p not in SEVEN:
        return 'none'
    if deg is not None:
        ms, a, b = MOOLATRIKONA[p]
        if sign == ms and a <= deg < b:
            return 'moolatrikona'
    if EXALT_SIGN[p] == sign:
        return 'exalted'
    if (EXALT_SIGN[p] + 6) % 12 == sign:
        return 'debilitated'
    if sign in OWN_SIGNS[p]:
        return 'own'
    lord = SIGN_LORD[sign]
    return compound_rel(p, lord, signs)


def dignity_states(p, sign, deg):
    """List of: exalted, debilitated, moolatrikona, own (all that apply)."""
    if p not in SEVEN:
        return []
    st = []
    if EXALT_SIGN[p] == sign:
        st.append('exalted')
    if (EXALT_SIGN[p] + 6) % 12 == sign:
        st.append('debilitated')
    ms, a, b = MOOLATRIKONA[p]
    in_mt = sign == ms and a <= deg < b
    if in_mt:
        st.append('moolatrikona')
    elif sign in OWN_SIGNS[p]:
        st.append('own')
    return st


# ---------------------------------------------------------------- divisional charts
def _mod(sign):
    return 0 if sign in MOVABLE else (1 if sign in FIXED else 2)


def varga_sign(lon, n):
    """Sign index of a longitude in divisional chart D-n (Parasara schemes)."""
    lon = norm(lon)
    s = int(lon // 30)
    d = lon - s * 30
    odd = (s % 2 == 0)  # Aries (0) is an odd sign
    if n == 1:
        return s
    if n == 2:
        first = d < 15
        if odd:
            return 4 if first else 3      # Leo(Sun) / Cancer(Moon)
        return 3 if first else 4
    if n == 3:
        return (s + 4 * int(d // 10)) % 12
    if n == 4:
        return (s + 3 * int(d // 7.5)) % 12
    if n == 5:
        p = int(d // 6)
        return [0, 10, 8, 2, 6][p] if odd else [1, 5, 11, 9, 7][p]
    if n == 6:
        return ((0 if odd else 6) + int(d // 5)) % 12
    if n == 7:
        return (s + (0 if odd else 6) + int(d // (30 / 7))) % 12
    if n == 8:
        return ([0, 8, 4][_mod(s)] + int(d // 3.75)) % 12
    if n == 9:
        return (s * 9 + int(d // (30 / 9))) % 12
    if n == 10:
        return (s + (0 if odd else 8) + int(d // 3)) % 12
    if n == 12:
        return (s + int(d // 2.5)) % 12
    if n == 16:
        return ([0, 4, 8][_mod(s)] + int(d // (30 / 16))) % 12
    if n == 20:
        return ([0, 8, 4][_mod(s)] + int(d // 1.5)) % 12
    if n == 24:
        return ((4 if odd else 3) + int(d // 1.25)) % 12
    if n == 27:
        el = 0 if s in FIRE else 1 if s in EARTH else 2 if s in AIR else 3
        return ([0, 3, 6, 9][el] + int(d // (30 / 27))) % 12
    if n == 30:
        if odd:
            for lim, sg in ((5, 0), (10, 10), (18, 8), (25, 2), (30, 6)):
                if d < lim:
                    return sg
        else:
            for lim, sg in ((5, 1), (12, 5), (20, 11), (25, 9), (30, 7)):
                if d < lim:
                    return sg
        return s
    if n == 40:
        return ((0 if odd else 6) + int(d // 0.75)) % 12
    if n == 45:
        return ([0, 4, 8][_mod(s)] + int(d // (30 / 45))) % 12
    if n == 60:
        return (s + int(d * 2)) % 12
    # generic cyclical D-N counted from Aries (covers D11, D81, D108, D144 and any custom N)
    return int(lon * n / 30.0) % 12


def varga_deg(lon, n):
    lon = norm(lon)
    d = lon % 30
    span = 30.0 / n
    return (d % span) * n


def varga_chart(chart, n):
    """Divisional chart: planet signs plus degrees within the varga sign, lagnas and upagrahas."""
    asc_lon = chart['asc']['lon']
    out = {'n': n, 'name': VARGA_NAMES.get(n, f'D{n}'), 'asc': varga_sign(asc_lon, n), 'asc_deg': varga_deg(asc_lon, n),
           'planets': {}, 'pos': {}, 'upa': {}, 'upa_pos': {}, 'lagnas': {}, 'lagna_pos': {}}
    for p in chart['planets']:
        out['planets'][p['name']] = varga_sign(p['lon'], n)
        out['pos'][p['name']] = varga_deg(p['lon'], n)
    for k, v in chart['upagrahas'].items():
        out['upa'][k] = varga_sign(v['lon'], n)
        out['upa_pos'][k] = varga_deg(v['lon'], n)
    for k, v in chart['lagnas'].items():
        out['lagnas'][k] = varga_sign(v['lon'], n)
        out['lagna_pos'][k] = varga_deg(v['lon'], n)
    return out


# ---------------------------------------------------------------- upagrahas
UPA_ORDER = ['Gulika', 'Mandi', 'Kaala', 'Mrityu', 'Artha Praharaka', 'Yama Ghantaka',
             'Dhuma', 'Vyatipata', 'Parivesha', 'Indrachapa', 'Upaketu']
# weekday-lord index (Sun=0 .. Sat=6) whose portion of the day/night each time-based upagraha takes
UPA_PORTION = {'Gulika': 6, 'Mandi': 6, 'Kaala': 0, 'Mrityu': 2, 'Artha Praharaka': 3, 'Yama Ghantaka': 4}


def upagraha_data(jd, day, lat, lon, cfg, sun_lon):
    """Time-based upagrahas (ascendant at a point of the planet's portion) and Sun-based ones (Dhuma etc.)."""
    sr, ss, nsr, vara = day['sr'], day['ss'], day['next_sr'], day['vara']
    is_day = sr <= jd < ss
    if is_day:
        start, dur, first = sr, (ss - sr) / 8.0, vara
    else:
        start, dur, first = ss, (nsr - ss) / 8.0, (vara + 4) % 7
    frac = {'start': 0.0, 'middle': 0.5, 'end': 1.0}
    raw = {}
    for name, lord_idx in UPA_PORTION.items():
        k = (lord_idx - first) % 7
        key = {'Gulika': 'gulika_pos', 'Mandi': 'mandi_pos'}.get(name, 'upa_pos')
        t = start + (k + frac[cfg.get(key, 'start')]) * dur
        raw[name] = (asc_at(t, lat, lon), t)
    dhuma = norm(sun_lon + 133 + 20 / 60.0)
    vyat = norm(360 - dhuma)
    pariv = norm(vyat + 180)
    indra = norm(360 - pariv)
    upak = norm(indra + 16 + 40 / 60.0)
    for name, l in (('Dhuma', dhuma), ('Vyatipata', vyat), ('Parivesha', pariv), ('Indrachapa', indra), ('Upaketu', upak)):
        raw[name] = (l, None)
    out = {}
    for name in UPA_ORDER:
        l, t = raw[name]
        out[name] = {'lon': l, 'sign': sign_of(l), 'deg': l % 30, 'time_jd': t}
    return out, is_day


# ---------------------------------------------------------------- special lagnas
KALA_INDU = {'Sun': 30, 'Moon': 16, 'Mars': 6, 'Mercury': 8, 'Jupiter': 10, 'Venus': 12, 'Saturn': 1}


def special_lagnas(jd, day, asc, planets, cfg):
    sun = planets['Sun']['lon']
    moon = planets['Moon']['lon']
    t_h = (jd - day['sr']) * 24.0
    t_gh = t_h * 60.0 / 24.0  # ghatis of 24 min
    out = {}
    out['Hora Lagna'] = norm(sun + 30.0 * t_h)            # 1 sign per hora (1 hr)
    out['Ghati Lagna'] = norm(sun + 30.0 * t_gh)          # 1 sign per ghati
    out['Bhava Lagna'] = norm(sun + 15.0 * t_h)           # 1 sign per 5 ghatis (2 hr)
    frac = (moon % NAK_SPAN) / NAK_SPAN
    out['Sree Lagna'] = norm(asc + frac * 360.0)
    # Indu lagna
    l9 = SIGN_LORD[(sign_of(asc) + 8) % 12]
    m9 = SIGN_LORD[(sign_of(moon) + 8) % 12]
    r = (KALA_INDU[l9] + KALA_INDU[m9]) % 12
    r = 12 if r == 0 else r
    isign = (sign_of(moon) + r - 1) % 12
    out['Indu Lagna'] = isign * 30 + moon % 30
    return {k: {'lon': v, 'sign': sign_of(v), 'deg': v % 30} for k, v in out.items()}


# ---------------------------------------------------------------- karakas
def chara_karakas(planets, scheme=8):
    cands = ['Sun', 'Moon', 'Mars', 'Mercury', 'Jupiter', 'Venus', 'Saturn']
    if scheme == 8:
        cands.append('Rahu')
    vals = {}
    for p in cands:
        d = planets[p]['lon'] % 30
        vals[p] = 30 - d if p == 'Rahu' else d
    order = sorted(cands, key=lambda p: -vals[p])
    names = KARAKA_8 if scheme == 8 else KARAKA_7
    return [{'karaka': names[i], 'planet': p, 'deg': round(vals[p], 4)} for i, p in enumerate(order)]


# ---------------------------------------------------------------- arudhas
def arudha_padas(asc_sign, psigns):
    """Arudha of each house for a chart whose planets' signs are in psigns (dict). Returns 12 signs."""
    out = []
    for h in range(12):
        hs = (asc_sign + h) % 12
        lord = SIGN_LORD[hs]
        ls = psigns[lord]
        d = (ls - hs) % 12
        a = (ls + d) % 12
        rel = (a - hs) % 12
        if rel == 0 or rel == 6:   # falls in the house itself or its 7th -> take 10th from the house
            a = (hs + 9) % 12
        out.append(a)
    return out


# ---------------------------------------------------------------- the chart
def build_chart(b, cfg=None):
    cfg = {**DEFAULT_CFG, **(cfg or {})}
    with LOCK:
        set_ayanamsa(cfg['ayanamsa'])
        jd, off = birth_jd(b)
        lat, lon = b['lat'], b['lon']
        ay = swe.get_ayanamsa_ut(jd)
        asc, mc, cusps = asc_mc(jd, lat, lon)
        day = day_bounds(jd, off, lat, lon, cfg['sunrise'])

        asc_sign = sign_of(asc)
        planets = []
        pmap = {}
        for name in PLANETS:
            r = planet_pos(jd, name, cfg)
            l = norm(r[0])
            idx, pada = nak_info(l)
            # tropical declination for strengths
            if name in PID:
                eq, _ = swe.calc_ut(jd, PID[name], swe.FLG_SWIEPH | swe.FLG_EQUATORIAL)
                decl = eq[1]
            else:
                decl = 0.0
            rec = {'name': name, 'lon': l, 'sign': sign_of(l), 'deg': l % 30, 'speed': r[3],
                   'retro': (r[3] < 0) if name not in ('Rahu', 'Ketu') else True,
                   'lat': r[1], 'dist': r[2], 'decl': decl,
                   'nak': NAKSHATRAS[idx], 'nak_idx': idx, 'pada': pada, 'nak_lord': NAK_LORD[idx],
                   'house': (sign_of(l) - asc_sign) % 12 + 1}
            planets.append(rec)
            pmap[name] = rec
        signs = {p['name']: p['sign'] for p in planets}
        sun = pmap['Sun']['lon']
        for p in planets:
            n = p['name']
            p['dignity'] = sign_dignity(n, p['sign'], signs, p['deg']) if n in SEVEN else '-'
            p['states'] = dignity_states(n, p['sign'], p['deg'])
            p['rel'] = (compound_rel(n, SIGN_LORD[p['sign']], signs) if (n in SEVEN and SIGN_LORD[p['sign']] != n) else '')
            if n in COMBUST_ORB:
                orb = COMBUST_ORB[n]
                if p['retro'] and n == 'Mercury':
                    orb = 12
                if p['retro'] and n == 'Venus':
                    orb = 8
                dd = abs(((p['lon'] - sun + 180) % 360) - 180)
                p['combust'] = dd < orb
            else:
                p['combust'] = False

        idx, pada = nak_info(asc)
        asc_rec = {'name': 'Lagna', 'lon': asc, 'sign': asc_sign, 'deg': asc % 30,
                   'nak': NAKSHATRAS[idx], 'pada': pada, 'nak_lord': NAK_LORD[idx], 'house': 1}
        upa, is_day = upagraha_data(jd, day, lat, lon, cfg, sun)
        for k, v in upa.items():
            v['house'] = (v['sign'] - asc_sign) % 12 + 1
            i2, p2 = nak_info(v['lon'])
            v['nak'] = NAKSHATRAS[i2]; v['pada'] = p2
        lag = special_lagnas(jd, day, asc, pmap, cfg)
        for k, v in lag.items():
            v['house'] = (v['sign'] - asc_sign) % 12 + 1

        chart = {
            'meta': {'name': b.get('name', ''), 'place': b.get('place', ''), 'lat': lat, 'lon': lon,
                     'tz_offset': off, 'jd': jd, 'ayanamsa': cfg['ayanamsa'], 'ayanamsa_value': ay,
                     'local': fmt_local(jd, off), 'is_day': is_day, 'cfg': cfg,
                     'input': {k: b.get(k) for k in ('year', 'month', 'day', 'hour', 'minute', 'second', 'tz', 'tz_offset')}},
            'asc': asc_rec, 'mc': mc, 'cusps': list(cusps),
            'planets': planets, 'pmap': pmap, 'signs': signs,
            'day': day, 'upagrahas': upa, 'lagnas': lag,
        }
        chart['karakas8'] = chara_karakas(pmap, 8)
        chart['karakas7'] = chara_karakas(pmap, 7)
        return chart


def all_vargas(chart, extra=None):
    ns = list(VARGAS)
    for e in (extra or []):
        if e not in ns:
            ns.append(e)
    return {n: varga_chart(chart, n) for n in ns}


def arudhas_for(chart, ns=None):
    res = {}
    for n in (ns or SHODASA):
        v = varga_chart(chart, n)
        ps = {k: v['planets'][k] for k in PLANETS}
        res[n] = [{'name': ARUDHA_NAMES[i], 'sign': s} for i, s in enumerate(arudha_padas(v['asc'], ps))]
    return res


def solve_sun(target_lon, jd_guess, cfg=None):
    """JD (UT) at which sidereal Sun longitude equals target_lon (Newton iteration near jd_guess)."""
    cfg = cfg or DEFAULT_CFG
    jd = jd_guess
    for _ in range(40):
        r = planet_pos(jd, 'Sun', cfg)
        d = ((target_lon - r[0] + 180) % 360) - 180
        sp = r[3] if r[3] > 0.5 else 0.9856
        jd += d / sp
        if abs(d) < 1e-8:
            break
    return jd


def last_sankranti(jd, cfg=None, month=True):
    """JD of the most recent Sun ingress into a sign (month=True) or into Aries (month=False)."""
    cfg = cfg or DEFAULT_CFG
    sun = sid_lon(jd, 'Sun', cfg)
    if month:
        target = int(sun // 30) * 30.0
        guess = jd - (sun - target) / 0.9856
    else:
        target = 0.0
        guess = jd - sun / 0.9856
    return solve_sun(target, guess, cfg)
