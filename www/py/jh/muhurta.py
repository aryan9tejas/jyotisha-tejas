"""Muhurta (electional astrology) finder after B. V. Raman.

Layers (see muhurta_rules.py for the tables):
  1. vetoes: factors that make a moment 'Avoid'
  2. a weighted score over the factors that apply to the purpose and to the data given
  3. time windows inside the Vedic day (sunrise to sunrise): the day is cut wherever any factor changes
  4. neutralisers that Raman allows (Pushya, strong Lagna, midday and night relaxations)
"""
import math
from bisect import bisect_right

import swisseph as swe

from .consts import *
from . import core
from . import panchanga as PN
from .core import LOCK, DEFAULT_CFG, norm, sid_lon, rise_set, day_bounds, fmt_local, tz_offset_hours
from .muhurta_rules import *

WEIGHTS = dict(WEIGHTS)
WEIGHTS['moon_company'] = 2
SRC = 'B. V. Raman, Muhurtha'
NAKS = NAKSHATRAS
GHATI = 24.0 / 1440.0          # one ghati = 24 minutes, in days
MIN_WINDOW = 25.0 / 1440.0     # a recommended window is at least 25 minutes
GRADES = [(80, 'excellent'), (65, 'good'), (50, 'acceptable'), (0, 'poor')]
LABEL = {'best': 'Ideal', 'good': 'Favourable', 'ok': 'Neutral', 'weak': 'Weak', 'bad': 'Unfavourable', 'veto': 'Avoid'}


def grade_of(score):
    for lo, g in GRADES:
        if score >= lo:
            return g
    return 'poor'


def ordinal(n):
    return f'{n}{"th" if 10 <= n % 100 <= 20 else {1: "st", 2: "nd", 3: "rd"}.get(n % 10, "th")}'


def nav_sign(sign, deg):
    k = int(deg // (30.0 / 9)) % 9
    return ([0, 9, 6, 3][sign % 4] + k) % 12


# ---------------------------------------------------------------- people
def person_from_chart(chart, name='', sex=None):
    m = chart['pmap']['Moon']
    return {'name': name or chart['meta'].get('name') or '', 'nak': m['nak_idx'], 'pada': m['pada'], 'rasi': m['sign'],
            'lagna': chart['asc']['sign'], 'sex': sex}


def person_manual(nak, pada=None, rasi=None, lagna=None, name='', sex=None):
    nak = int(nak)
    pada = int(pada) if pada else None
    if rasi is None:
        rasi = (nak * 4 + (pada or 1) - 1) // 9
    return {'name': name, 'nak': nak, 'pada': pada, 'rasi': int(rasi), 'lagna': None if lagna in (None, '') else int(lagna), 'sex': sex}


# ---------------------------------------------------------------- one Vedic day
def _new_moon(cfg, t, direction):
    def e(x):
        return norm(sid_lon(x, 'Moon', cfg) - sid_lon(x, 'Sun', cfg))
    t += (-e(t) if direction < 0 else 360 - e(t)) / 12.19
    for _ in range(6):
        dv = ((e(t) + 180) % 360) - 180
        t -= dv / 12.19
    return t


def masa_of(sr, cfg):
    n0, n1 = _new_moon(cfg, sr, -1), _new_moon(cfg, sr, 1)
    s0, s1 = int(norm(sid_lon(n0, 'Sun', cfg)) // 30), int(norm(sid_lon(n1, 'Sun', cfg)) // 30)
    return PN.MASAS[(s0 + 1) % 12], s0 == s1


class Ctx:
    def __init__(self, lat, lon, tz, cfg):
        self.lat, self.lon, self.tz = lat, lon, tz
        self.cfg = {**DEFAULT_CFG, **(cfg or {})}
        self.days = {}


def build_day(ctx, y, m, d, light=False, direction=None):
    key = (y, m, d, light, direction)
    if key in ctx.days:
        return ctx.days[key]
    cfg, lat, lon = ctx.cfg, ctx.lat, ctx.lon
    off = tz_offset_hours(y, m, d, 12, 0, 0, ctx.tz)
    noon = swe.julday(y, m, d, 12.0) - off / 24.0
    day = day_bounds(noon, off, lat, lon, cfg['sunrise'])
    sr, ss, nsr, vara = day['sr'], day['ss'], day['next_sr'], day['vara']
    mm, ms = {}, {}

    def moon(t):
        v = mm.get(t)
        if v is None:
            v = mm[t] = norm(sid_lon(t, 'Moon', cfg))
        return v

    def sun(t):
        v = ms.get(t)
        if v is None:
            v = ms[t] = norm(sid_lon(t, 'Sun', cfg))
        return v

    lo, hi = sr - 1.3, nsr + 1.3

    def segs(f, unit, a=None, b=None):
        a = lo if a is None else a
        b = hi if b is None else b
        out = []
        for s in PN.segments_fast(f, unit, a, b):
            out.append((s['start'] if s['start'] is not None else a - 1, s['end'] if s['end'] is not None else b + 1, s['index']))
        return out

    ft = lambda t: norm(moon(t) - sun(t))
    S = {
        'tithi': segs(ft, 12), 'nak': segs(moon, NAK_SPAN), 'yoga': segs(lambda t: norm(moon(t) + sun(t)), NAK_SPAN),
        'karana': segs(ft, 6), 'msign': segs(moon, 30), 'sunsign': segs(sun, 30, sr - 0.3, nsr + 0.3),
    }
    mid = (sr + nsr) / 2
    pl = {}
    for body in ('Sun', 'Mars', 'Mercury', 'Jupiter', 'Venus', 'Saturn', 'Rahu', 'Ketu'):
        pl[body] = int(norm(sid_lon(mid, body, cfg)) // 30)
    sunlon = sun(mid)
    comb = {}
    for body in ('Jupiter', 'Venus'):
        r = core.planet_pos(mid, body, cfg)
        orb = COMBUST_ORB[body] if r[3] >= 0 else (8 if body == 'Venus' else COMBUST_ORB[body])
        comb[body] = abs(((norm(r[0]) - sunlon + 180) % 360) - 180) < orb
    masa, adhika = masa_of(sr, cfg)
    D = {'y': y, 'm': m, 'd': d, 'off': off, 'sr': sr, 'ss': ss, 'nsr': nsr, 'vara': vara, 'S': S, 'planets': pl,
         'combust': comb, 'masa': masa, 'adhika': adhika, 'sunsign': S['sunsign'], 'sun_nak': int(sunlon // NAK_SPAN),
         'moon': moon, 'noon': (sr + ss) / 2, 'cfg': cfg}
    # hora
    D['hora'] = [(h['start'], h['end'], h['lord']) for h in PN.hora_table(day)]
    if light:
        D['lagna'] = None
        D['intervals'] = []
        ctx.days[key] = D
        return D
    # lagna through the day, with piecewise-linear degrees for zone timing
    asc = lambda t: norm(core.asc_at(t, lat, lon))
    ls = []
    for s in PN.segments_fast(asc, 30, sr - 0.2, nsr + 0.05, step=0.03):
        a = s['start'] if s['start'] is not None else sr - 0.2
        b = s['end'] if s['end'] is not None else nsr + 0.05
        tm = (a + b) / 2
        dm = asc(tm) - s['index'] * 30
        if dm < -180:
            dm += 360
        ls.append({'a': a, 'b': b, 'sign': s['index'], 'dm': dm, 'tm': tm})
    D['lagna'] = ls
    iv = []     # (kind, label, a, b)
    kl = PN.kalams(day)
    for k, lab, kind in (('Rahu Kalam', 'Rahu Kalam', 'rahu'), ('Yama Gandam', 'Yamaganda', 'yama'), ('Gulika Kalam', 'Gulika Kalam', 'gulika'),
                         ('Abhijit', 'Abhijit Muhurta', 'abhijit'), ('Vijaya Muhurta', 'Vijaya Muhurta', 'vijaya'),
                         ('Brahma Muhurta', 'Brahma Muhurta', 'brahma'), ('Godhuli Muhurta', 'Godhuli Muhurta', 'godhuli')):
        if k in kl:
            iv.append((kind, lab, kl[k][0], kl[k][1]))
    for k, v in kl.items():
        if k.startswith('Dur Muhurta'):
            iv.append(('dur', 'Dur Muhurta', v[0], v[1]))
    for a, b, i in S['nak']:           # Varjyam (Raman's tyajya) and nakshatra gandanta
        dur = b - a
        if a < lo - 0.5 or b > hi + 0.5:
            continue
        va = a + TYAJYA_START[i] / 60.0 * dur
        iv.append(('varjyam', 'Tyajya (Varjyam)', va, va + 4 / 60.0 * dur))
        if i in (ASL, JYE, REV):
            iv.append(('nak_gandanta', 'Nakshatra Gandanta', b - 2 * GHATI, b))
        if i in (MAG, MUL, ASW):
            iv.append(('nak_gandanta', 'Nakshatra Gandanta', a, a + 2 * GHATI))
    for a, b, i in S['tithi']:
        if a < lo - 0.5 or b > hi + 0.5:
            continue
        if i in (4, 9, 14):
            iv.append(('tithi_gandanta', 'Tithi Gandanta', b - 2 * GHATI, b))
        if i in (5, 10, 15):
            iv.append(('tithi_gandanta', 'Tithi Gandanta', a, a + 2 * GHATI))
    for a, b, i in S['sunsign'][1:]:   # Surya Sankramana: 16 ghatis either side of the Sun's ingress
        iv.append(('sankranti', 'Sun ingress (Sankramana)', a - 16 * GHATI, a + 16 * GHATI))
    if direction in ('East', 'South', 'West', 'North') and JOURNEY_AVOID_DIR.get(vara) == direction:
        iv.append(('direction', f'{direction}ward travel not allowed yet', sr, sr + JOURNEY_FREE_AFTER_GHATIS[vara] * GHATI))
    zones = []

    def t_at(ls_, deg):
        if deg <= 0:
            return ls_['a']
        if deg >= 30:
            return ls_['b']
        pts = [(0.0, ls_['a']), (ls_['dm'], ls_['tm']), (30.0, ls_['b'])]
        for (d0, t0), (d1, t1) in zip(pts, pts[1:]):
            if d0 <= deg <= d1 and d1 > d0:
                return t0 + (deg - d0) / (d1 - d0) * (t1 - t0)
        return ls_['b']
    for g in ls:
        for name, signs, d0, d1, wds in LAGNA_ZONES:
            if g['sign'] in signs and vara in wds:
                zones.append(('lagna_zone', name, t_at(g, d0), t_at(g, d1)))
        for signs, d0, d1 in LAGNA_GANDANTA:
            if g['sign'] in signs:
                zones.append(('lagna_gandanta', f'Lagna Gandanta ({int(d0)} to {int(d1)} degrees)', t_at(g, d0), t_at(g, d1)))
    D['intervals'] = iv + zones
    ctx.days[key] = D
    return D


def seg_at(arr, t):
    for a, b, i in arr:
        if a <= t < b:
            return i
    return arr[-1][2]


def lagna_at(D, t):
    for g in D['lagna']:
        if g['a'] <= t < g['b']:
            pts = [(0.0, g['a']), (g['dm'], g['tm']), (30.0, g['b'])]
            deg = 15.0
            for (d0, t0), (d1, t1) in zip(pts, pts[1:]):
                if t0 <= t <= t1 and t1 > t0:
                    deg = d0 + (t - t0) / (t1 - t0) * (d1 - d0)
                    break
            return g['sign'], max(0.0, min(29.99, deg))
    g = D['lagna'][-1]
    return g['sign'], 15.0


def boundaries(D, light):
    sr, nsr = D['sr'], D['nsr']
    pts = {sr, nsr}
    for k in ('tithi', 'nak', 'yoga', 'karana', 'msign'):
        for a, b, i in D['S'][k]:
            for x in (a, b):
                if sr < x < nsr:
                    pts.add(x)
    if not light:
        for it in D['intervals']:
            for x in (it[2], it[3]):
                if sr < x < nsr:
                    pts.add(x)
        for g in D['lagna']:
            for x in (g['a'], g['b']):
                if sr < x < nsr:
                    pts.add(x)
        for a, b, _ in D['hora']:
            for x in (a, b):
                if sr < x < nsr:
                    pts.add(x)
    out = []
    for x in sorted(pts):
        if not out or x - out[-1] > 90 / 86400.0:
            out.append(x)
    if out[-1] != nsr:
        out[-1] = nsr
    return out


def state_at(D, t, light):
    S = D['S']
    st = {'t': t, 'vara': D['vara'], 'tithi': seg_at(S['tithi'], t), 'nak': seg_at(S['nak'], t), 'yoga': seg_at(S['yoga'], t),
          'karana': seg_at(S['karana'], t), 'msign': seg_at(S['msign'], t), 'night': t >= D['ss'], 'pm': t >= D['noon'],
          'planets': D['planets'], 'masa': D['masa'], 'adhika': D['adhika'], 'sun_sign': seg_at(D['sunsign'], t),
          'sun_nak': D['sun_nak'], 'combust': D['combust'], 'light': light}
    ml = D['moon'](t)
    st['moon_lon'] = ml
    st['pada'] = int((ml % NAK_SPAN) // (NAK_SPAN / 4)) + 1
    st['moon_nav'] = nav_sign(st['msign'], ml % 30)
    for a, b, lord in D['hora']:
        if a <= t < b:
            st['hora'] = lord
            break
    else:
        st['hora'] = None
    if not light:
        st['lagna'], st['lagna_deg'] = lagna_at(D, t)
        st['kinds'] = [(k, lab) for k, lab, a, b in D['intervals'] if a <= t < b]
    return st


# ---------------------------------------------------------------- evaluation
class F:
    __slots__ = ('key', 'title', 'level', 'value', 'why', 'absolute', 'neut', 'src', 'note')

    def __init__(self, key, title, level, value='', why='', absolute=False, neut=True, src=SRC):
        self.key, self.title, self.level, self.value, self.why = key, title, level, value, why
        self.absolute, self.neut, self.src, self.note = absolute, neut, src, ''


def demote(level, strict, absolute=False):
    if level != 'veto':
        return level
    if strict == 'low':
        return 'bad'
    if strict == 'medium' and not absolute:
        return 'bad'
    return 'veto'


def tara_factor(st, P, p, label, ex, who_ctx):
    c = (st['nak'] - p['nak']) % 27 + 1
    rem = (c - 1) % 9 + 1
    cyc = (c - 1) // 9 + 1
    name, meaning = TARA[rem]
    janma_ok = P['janma_ok'] or (P['id'] in ('marriage', 'engagement') and p.get('sex') == 'F')
    pada = st['pada']
    if rem in (2, 4, 6, 9):
        lv = 'best'
    elif rem == 8:
        lv = 'good'
    elif rem == 1 and janma_ok:
        lv = 'good'
    elif rem in (3, 7):
        if cyc == 1:
            lv = demote('veto', P['strict'])
        elif cyc == 2:
            lv = 'weak' if (rem == 3 and pada == 1) or (rem == 7 and pada == 3) else 'good'
        else:
            lv = 'weak'
    elif rem == 5:
        lv = 'bad' if cyc == 1 else ('weak' if (cyc == 2 and pada == 4) else ('good' if cyc == 2 else 'ok'))
    else:     # Janma, not favourable for this purpose
        lv = 'bad' if cyc == 1 else ('good' if cyc == 2 else 'ok')
    f = F('tara', f'Tarabala{label}', lv, f'{NAKS[st["nak"]]}: {name} ({ordinal(c)} star)', absolute=False)
    if ex:
        w = f'Counting from your birth star {NAKS[p["nak"]]} to the day\'s star {NAKS[st["nak"]]} gives {c}; dividing by 9 leaves {rem}, which is {name} ({meaning}). '
        if lv == 'veto':
            w += f'{name} in the first cycle is a clear dosha: Raman advises avoiding it for important undertakings. '
        elif rem in (3, 5, 7) and cyc == 2:
            w += 'In the second cycle the harm is only about half, and sits mainly in one quarter (Vipat 1st, Pratyak 4th, Naidhana 3rd). '
        elif rem in (3, 5, 7, 1) and cyc == 3:
            w += ('In the third cycle the harm is small, but Raman still prefers to avoid Vipat and Naidhana for important work. ' if rem in (3, 7)
                  else 'In the third cycle the effect of this Tara is slight. ')
        elif rem == 1:
            w += 'Your own birth star day is ordinarily unfavourable' + ('' if not janma_ok else ', but is favourable for this purpose') + '. '
        if rem == 1 and janma_ok:
            w += 'Raman lists your own Janma Nakshatra as favourable for nuptials, buying land, learning the alphabet and house entry. '
        if c in (22, 27):
            w += f'Some classical writers condemn the {ordinal(c)} star; Raman\'s experience is that it is auspicious (Sadhana or Parama Mitra). '
        f.why = w.strip()
    return f


def chandra_factor(st, P, p, label, ex, tara_good):
    h = (st['msign'] - p['rasi']) % 12 + 1
    lv, absolute, neutr = 'best', False, None
    if h == 8:
        waxing = st['tithi'] < 15
        benefic_sign = st['msign'] in BENEFIC_SIGNS
        benefic_nav = st['moon_nav'] in BENEFIC_SIGNS
        eighth_lord = SIGN_LORD[(p['rasi'] + 7) % 12]
        friend = eighth_lord == 'Moon' or eighth_lord in NAT_FRIENDS['Moon']
        if (waxing and benefic_sign and benefic_nav) or tara_good or friend:
            lv = 'weak'
            neutr = ('Moon waxing in a benefic sign and navamsa' if (waxing and benefic_sign and benefic_nav)
                     else ('good Tarabala' if tara_good else 'Moon and the 8th lord are friends'))
        else:
            lv, absolute = 'veto', True
    elif h == 6:
        lv = 'weak'          # accepted with a warning: Raman rejects it, but it is not treated as a veto
    elif h == 12:
        lv = demote('veto', P['strict'], False) if P['strict'] == 'high' else 'bad'
    f = F('chandra', f'Chandrabala{label}', lv, f'Moon in {SIGNS[st["msign"]]}, {ordinal(h)} from your Moon sign', absolute=absolute, neut=True)
    if ex:
        w = f'Your birth Moon is in {SIGNS[p["rasi"]]}; today\'s Moon is in {SIGNS[st["msign"]]}, the {ordinal(h)} house from it. '
        if h == 8:
            w += 'This is Chandrashtama, the most damaging Moon position for you. '
            if neutr:
                w += f'Raman allows it to be neutralised here ({neutr}), so it is only weak, not a veto. '
            else:
                w += 'None of Raman\'s exceptions apply (Moon waxing in a benefic sign and navamsa, good Tarabala, or the Moon friendly with the 8th lord), so avoid it. '
        elif h == 6:
            w += 'WARNING: B. V. Raman rejects the 6th from the natal Moon ("not the 6th, 8th or 12th"). It is accepted here with a warning and scored as weak, not blocked. Prefer another time if a better one exists. '
        elif h == 12:
            w += 'The 12th house from the natal Moon is rejected by Raman ("not the 6th, 8th or 12th"). '
        else:
            w += 'Raman rejects only the 6th, 8th and 12th from the natal Moon, so this position passes. '
        f.why = w.strip()
    return f, h


def nak_factor(st, P, ex):
    n, pada = st['nak'], st['pada']
    best, ok = P['nak_best'], P['nak_ok']
    hard = False
    if n in best:
        lv = 'best'
    elif n in ok:
        lv = 'ok'
    else:
        lv = 'ok' if P['nak_mode'] == 'open' else demote('veto', P['strict'])
    reason = ''
    if n in (BHA, KRI) and P['id'] in BHARANI_KRITTIKA_VETO:
        lv, hard = demote('veto', P['strict'], True), True
        reason = 'Bharani and Krittika are rejected for all auspicious work (ruled by Yama and Agni).'
    elif n in P.get('nak_hard_avoid', []):
        lv = 'bad'
        reason = 'Raman lists this star among those under which no journey should start.'
    if pada in P['nak_pada_bad'].get(n, []) and lv != 'veto':
        lv = 'bad'
        reason = f'Pada {pada} of {NAKS[n]} is specifically rejected.'
    if P['id'] == 'travel' and pada == 1 and lv in ('best', 'ok'):
        lv = 'good' if lv == 'best' else 'weak'
        reason = 'Raman prefers the 2nd, 3rd or last quarter of the star for starting a journey.'
    if n == PUS and P['id'] in PUSHYA_EXCLUDED:
        lv = 'bad'
        reason = 'Pushya, the best star for almost everything, is not suitable for marriage.'
    f = F('nak', 'Nakshatra', lv, f'{NAKS[n]} pada {pada}', absolute=hard, neut=not hard)
    if ex:
        cls = next((v for k, v in NAK_CLASS.items() if n in v[2]), None)
        w = ''
        if cls:
            w += f'{NAKS[n]} is a {cls[0]} star. '
        if reason:
            w += reason + ' '
        elif lv == 'best':
            w += f'Raman lists it among the best stars for {P["label"].lower()}. '
        elif lv == 'ok' and n in ok:
            w += f'Acceptable for {P["label"].lower()}, but not among the best. '
        elif lv == 'ok':
            w += 'Raman gives no objection for this purpose. '
        else:
            w += f'It is not in Raman\'s list of stars for {P["label"].lower()}, so it is better rejected. '
        if n == PUS and P['id'] not in PUSHYA_EXCLUDED:
            w += 'Pushya is the pride of place among the stars and can neutralise many other doshas. '
        f.why = w.strip()
    return f


def tithi_factor(st, P, ex):
    i = st['tithi']
    n = i % 15 + 1
    name = PN.tithi_name(i)
    cls = TITHI_CLASS[(n - 1) % 5 + 1]
    if i in P['tithi_best']:
        lv, cat = 'best', 'best'
    elif i in P['tithi_veto']:
        lv, cat = demote('veto', P['strict']), 'veto'
    elif i in P['tithi_ok']:
        lv, cat = 'ok', 'ok'
    elif i in TITHI_VETO:
        lv, cat = demote('veto', P['strict']), 'veto'
    elif i in P['tithi_bad'] or i in TITHI_BAD:
        lv, cat = 'bad', 'bad'
    else:
        lv, cat = ('ok', 'plain') if not P['tithi_best'] else ('weak', 'weak')
    f = F('tithi', 'Tithi', lv, f'{name} ({cls})', neut=True)
    if ex:
        w = f'{name} is a {cls} tithi. '
        if cat == 'best':
            w += f'It is among Raman\'s favoured tithis for {P["label"].lower()}. '
        elif cat == 'veto':
            if i == 29:
                w += 'New Moon day has no light; Raman says to avoid it for any new beginning. '
            elif n == 14:
                w += 'The 14th is to be avoided at any cost. '
            elif n in (4, 8):
                w += f'The {ordinal(n)} tithi is declared unsuitable for auspicious work (Raman Ch II and Ch V). '
            else:
                w += f'Raman rejects this tithi for {P["label"].lower()}. '
            if lv != 'veto':
                w += 'For this lighter purpose it is a heavy penalty rather than an absolute bar. '
        elif cat == 'bad':
            w += 'Raman lists the 6th, 9th, 12th and Full Moon among the lunar days to avoid. ' + ('In his own experience the 12th is quite auspicious when other factors are strong. ' if n == 12 else '')
        elif cat == 'weak':
            w += f'It is not among the tithis Raman recommends for {P["label"].lower()}. '
        elif cat == 'ok':
            w += 'Acceptable for this purpose. '
        else:
            w += 'No specific objection. '
        f.why = w.strip()
    return f


def vara_factor(st, P, ex, lagna_lord_in=False):
    v = st['vara']
    if v in P['vara_good']:
        lv = 'best'
    elif v in P['vara_mid']:
        lv = 'ok'
    elif v in P['vara_bad']:
        lv = 'bad'
        if v == TUE and P['strict'] == 'high':
            lv = 'veto'
    else:
        lv = 'ok'
    note = ''
    if v in (TUE, SAT_) and lv in ('veto', 'bad'):
        if st['night']:
            lv, note = 'ok', 'Night relaxation: Raman accepts Tuesday and Saturday for a muhurta at night, so no weekday penalty after sunset.'
        elif v == TUE and st['pm']:
            lv, note = 'weak', 'Raman: Tuesday is not evil after midday.'
    if lagna_lord_in and lv in ('bad', 'veto'):
        lv, note = 'ok', 'The lord of the weekday sits in the Lagna, which removes the weekday blemish (Raman Ch V).'
    f = F('vara', 'Weekday', lv, WEEKDAYS[v], neut=True)
    if ex:
        w = f'{WEEKDAYS[v]} is ruled by {VARA_LORDS[v]}. '
        if v in P['vara_good']:
            w += f'Among the best days for {P["label"].lower()}. '
        elif v in P['vara_mid']:
            w += 'Middling for this purpose. '
        elif v in P['vara_bad']:
            w += 'Raman says to avoid it for this purpose. '
        if v in (TUE, SAT_):
            w += 'Tuesday and Saturday are generally avoided for auspicious work. '
        f.why = (w + note).strip()
    f.note = note
    return f


def yoga_factor(st, P, ex):
    y = st['yoga']
    absolute = False
    if y in YOGA_VETO:
        lv, absolute = demote('veto', P['strict'], True), True
        if st['pm']:
            lv, absolute = 'weak', False
    elif y in YOGA_BAD or y in P['yoga_bad']:
        lv = 'bad'
    elif y in YOGA_GOOD:
        lv = 'good'
    else:
        lv = 'ok'
    f = F('yoga', 'Yoga', lv, YOGA_NAMES[y], absolute=absolute, neut=True)
    if ex:
        w = f'{YOGA_NAMES[y]} yoga. '
        if y in YOGA_VETO:
            w += 'Vyatipata and Vaidhriti (excess of evil) are mahadoshas to be avoided for good work' + ('; Raman says their ill effect is defunct after midday. ' if st['pm'] else '. ')
        elif y in YOGA_BAD:
            w += 'Atiganda, Shula and Ganda have deleterious effects on whatever is started under them. '
        elif y in P['yoga_bad']:
            w += f'Raman lists it among the yogas to reject for {P["label"].lower()}. '
        elif y in YOGA_GOOD:
            w += 'A benefic yoga that supports new beginnings. '
        else:
            w += 'Neutral. '
        f.why = w.strip()
    return f


def karana_factor(st, P, ex):
    k = st['karana']
    nm = PN.karana_name(k)
    if nm in KARANA_VETO:
        lv = demote('veto', P['strict'])
    elif nm in KARANA_FIXED:
        lv = 'bad'
    elif nm in P['karana_best']:
        lv = 'best'
    else:
        lv = 'good'
    f = F('karana', 'Karana', lv, nm, neut=True)
    if ex:
        if nm in KARANA_VETO:
            w = 'Vishti (Bhadra) is unfit for any good work, though suitable for harsh deeds. '
        elif nm in KARANA_FIXED:
            w = 'A fixed karana, occurring around the New Moon: not suited to new beginnings. '
        elif nm in P['karana_best']:
            w = f'{nm} is specially suited to {P["label"].lower()} (Raman: Bava for lasting works, Taitila for marriage). '
        else:
            w = 'A benefic moving karana. '
        f.why = w.strip()
    return f


def paksha_factor(st, P, ex):
    i = st['tithi']
    if i < 14:
        lv, w = 'best', 'Bright half: the waxing Moon is strong and supports growth. '
    elif i == 14:
        lv, w = 'good', 'Full Moon: strong, though Raman usually avoids the day itself. '
    elif i < 20:
        lv, w = 'ok', 'Early dark half: the Moon is still reasonably strong. '
    elif i < 29:
        lv, w = 'weak', 'Late dark half: the waning Moon is weak, which affects the mind and results. '
    else:
        lv, w = 'bad', 'New Moon: the Moon has no light. '
    return F('paksha', 'Moon phase', lv, ('Waxing' if i < 15 else 'Waning'), w if ex else '', neut=True)


def month_factor(st, P, ex):
    m = P['masa']
    lvs = []
    notes = []
    if m:
        if st['masa'] in m.get('good', []):
            lv = 'best'
        elif st['masa'] in m.get('ok', []):
            lv = 'ok'
        elif st['masa'] in m.get('bad', []):
            lv = 'bad'
        else:
            lv = 'bad' if m.get('good') and not m.get('bad') else 'ok'
        lvs.append(lv)
        notes.append(f'{st["masa"]} is {"one of the best months" if lv == "best" else "an ordinary month" if lv == "ok" else "not recommended"} for {P["label"].lower()}.')
        if st['adhika']:
            lvs.append('bad')
            notes.append('Adhika (extra) month: classically avoided for auspicious ceremonies.')
    if P['id'] == 'foundation' and st['sun_sign'] in (GEM, VIR, SAG, PIS):
        lvs.append('bad')
        notes.append('The Sun is in a common sign: Raman says no building work should begin then.')
    if not lvs:
        return None
    order = ['veto', 'bad', 'weak', 'ok', 'good', 'best']
    lv = min(lvs, key=order.index)
    return F('month', 'Month', lv, f'{st["masa"]}{" (Adhika)" if st["adhika"] else ""} masa, Sun in {SIGNS[st["sun_sign"]]}', ' '.join(notes) if ex else '', neut=True,
             src=SRC + ' (months), classical (Adhika)')


def combust_factor(st, P, ex):
    if not P['combust']:
        return None
    hit = [b for b in P['combust'] if st['combust'].get(b)]
    if not hit:
        return F('combust', 'Jupiter and Venus', 'best', 'Both visible (not combust)', 'Jupiter and Venus are clear of the Sun, which classical texts require for ceremonies.' if ex else '', neut=True, src='classical')
    lv = demote(P['combust_level'], P['strict'], False)
    return F('combust', 'Jupiter and Venus', lv, ' and '.join(hit) + ' combust (Asta)',
             (f'{" and ".join(hit)} are combust (too near the Sun). Classical texts bar marriage and house entry while a guru or shukra is asta.' if ex else ''), neut=False, src='classical')


def timing_factor(st, P, ex):
    kinds = st['kinds']
    ks = {k for k, _ in kinds}
    labs = [lab for _, lab in kinds]
    vetoish = [k for k in ('rahu', 'dur', 'varjyam', 'tithi_gandanta', 'nak_gandanta', 'sankranti') if k in ks]
    lv = 'ok'
    why = ''
    absolute = False
    if vetoish:
        lv = demote('veto', P['strict'], True)
        absolute = True
        why = 'In ' + ', '.join(l for k, l in kinds if k in vetoish) + '. Raman counts Dur Muhurta, Tithi or Nakshatra Gandanta, Tyajya and Sun ingress among the 21 mahadoshas; Rahu Kalam is the classical window to avoid. '
    elif 'direction' in ks:
        lv, why = 'bad', 'The direction of travel is barred at this hour on this weekday (Raman Ch XIV). '
    elif 'yama' in ks:
        lv, why = 'bad', 'Yamaganda, a classical inauspicious part of the day. '
    elif 'gulika' in ks:
        lv, why = 'weak', 'Gulika Kalam: a minor inauspicious part of the day. '
    elif 'abhijit' in ks:
        if st['vara'] == WED:
            lv, why = 'weak', 'Abhijit on a Wednesday is not propitious (Raman Ch V). '
        else:
            lv, why = 'best', 'Abhijit Muhurta, the 8th muhurta of the day, is the most auspicious time of day. '
    elif 'vijaya' in ks:
        lv, why = 'good', 'Vijaya Muhurta (the 11th muhurta) favours success. '
    elif 'brahma' in ks:
        lv, why = 'good', 'Brahma Muhurta, the pre-dawn hour, is calm and auspicious. '
    elif 'godhuli' in ks:
        lv, why = 'good', 'Godhuli, the twilight hour. '
    else:
        why = 'No special time-of-day factor. '
    value = ', '.join(labs) if labs else 'Ordinary time of day'
    return F('timing', 'Time of day', lv, value, why if ex else '', absolute=absolute, neut=False)


def panchaka_factor(st, P, ex):
    tn = st['tithi'] + 1
    rem = (tn + st['vara'] + 1 + st['nak'] + 1 + st['lagna'] + 1) % 9
    names = {1: 'Mrityu', 2: 'Agni', 4: 'Raja', 6: 'Chora', 8: 'Roga'}
    nakpanchaka = (st['nak'] == DHA and st['pada'] >= 3) or st['nak'] in (SAT, PBH, UBH, REV)
    if rem in names:
        lv = demote('veto', P['strict']) if rem in P['panchaka_bad'] else 'weak'
    else:
        lv = 'good'
    value = f'{names[rem]} Panchaka' if rem in names else 'Panchaka clear'
    why = ''
    if ex:
        why = f'Tithi {tn} + weekday {st["vara"] + 1} + star {st["nak"] + 1} + Lagna {st["lagna"] + 1} = {tn + st["vara"] + 1 + st["nak"] + 1 + st["lagna"] + 1}; remainder {rem} after dividing by 9. '
        if rem in names:
            why += f'{names[rem]} Panchaka. ' + ('Raman says to avoid it for this purpose. ' if rem in P['panchaka_bad'] else 'It is not specifically barred for this purpose but best avoided. ')
        else:
            why += 'Remainder 3, 5, 7 or 0 is good. '
    if nakpanchaka:
        lv = min([lv, 'bad' if P['id'] in ('griha_pravesha', 'foundation') else 'weak'], key=['veto', 'bad', 'weak', 'ok', 'good', 'best'].index)
        value += ', Nakshatra Panchaka'
        why += ' Moon is in the Nakshatra Panchaka (Dhanishta second half to Revati), unsuitable for auspicious work and house matters. ' if ex else ''
    return F('panchaka', 'Panchaka', lv, value, why.strip(), neut=True)


def hora_factor(st, P, ex):
    h = st.get('hora')
    if not h:
        return None
    if h in P['hora_good']:
        lv, w = 'best', f'{h} hora is friendly to {P["label"].lower()}. '
    elif h in ('Mars', 'Saturn'):
        lv, w = 'weak', f'{h} hora is harsh for a new beginning. '
    else:
        lv, w = 'ok', f'{h} hora: neutral for this purpose. '
    return F('hora', 'Hora', lv, f'{h} hora', w if ex else '', neut=False, src='classical')


def lagna_factors(st, P, p_list, ex):
    out = []
    pl = dict(st['planets'])
    pl['Moon'] = st['msign']
    lg = st['lagna']
    house = {b: (s - lg) % 12 + 1 for b, s in pl.items()}
    inh = lambda h: [b for b, x in house.items() if x == h]
    lv = 'ok'
    reasons = []
    if lg in P['lagna_good']:
        lv = 'best'
    elif lg in P['lagna_ok']:
        lv = 'ok'
    elif lg in P['lagna_bad']:
        lv = 'bad'
    elif P['lagna_good']:
        lv = 'weak'
    zone = [lab for k, lab in st['kinds'] if k in ('lagna_zone', 'lagna_gandanta')]
    if zone:
        lv = demote('veto', P['strict'], True)
    fz = F('lagna_sign', 'Rising sign (Lagna)', lv, f'{SIGNS[lg]} {int(st["lagna_deg"])}°' + (f' in {zone[0]}' if zone else ''), absolute=bool(zone), neut=False)
    if ex:
        w = f'{SIGNS[lg]} rises at this moment. '
        if lg in P['lagna_good']:
            w += f'A favoured Lagna for {P["label"].lower()}. '
        elif lg in P['lagna_bad']:
            w += 'Raman does not favour this Lagna for this purpose. '
        else:
            w += 'Acceptable. '
        if zone:
            w += f'The degrees rising now fall in {zone[0]}, a Lagna tyajya zone to be rejected for good work (Raman Ch II, Ch V item 8 and 13). '
        fz.why = w.strip()
    out.append(fz)
    # strength of the Lagna through its occupants
    sc, rs = 0.0, []
    for b in ('Jupiter', 'Venus'):
        if house[b] == 1:
            sc += 2
            rs.append(f'{b} in Lagna')
        elif house[b] in (4, 7, 10):
            sc += 1
            rs.append(f'{b} in a kendra')
        elif house[b] in (5, 9):
            sc += 0.5
            rs.append(f'{b} in a trikona')
    if house['Mercury'] == 1:
        sc += 1
        rs.append('Mercury in Lagna')
    elif house['Mercury'] in (4, 7, 10):
        sc += 0.5
    if house['Moon'] in (4, 7, 10):
        sc += 0.5
    for b in ('Mars', 'Saturn', 'Sun', 'Rahu', 'Ketu'):
        h = house[b]
        if h == 1:
            sc -= 2
            rs.append(f'{b} in Lagna (malefic)')
        elif h in (3, 6, 11):
            sc += 1
            rs.append(f'{b} in house {h} (upachaya)')
        elif h == 7:
            sc -= 1
            rs.append(f'{b} in the 7th')
        elif h in (4, 10):
            sc -= 0.5
    lv = 'best' if sc >= 3 else 'good' if sc >= 1.5 else 'ok' if sc >= 0 else 'weak' if sc >= -1.5 else 'bad'
    out.append(F('lagna_strength', 'Lagna strength', lv, '; '.join(rs[:3]) if rs else 'Planets neither help nor harm the Lagna',
                 (('Benefics in kendras and trikonas and malefics in 3, 6 and 11 strengthen the Lagna; malefics in Lagna or the 7th weaken it (Raman Ch V, Ch XII). ' + ('; '.join(rs) + '.' if rs else '')) if ex else ''), neut=False))
    # 8th house
    e = inh(8)
    mal8 = [b for b in e if b in MALEFIC]
    if not e:
        lv = 'best'
    elif 'Mars' in e:
        lv = 'veto' if P['strict'] == 'high' else 'bad'
    elif mal8:
        lv = 'bad'
    else:
        lv = 'weak'
    out.append(F('eighth', '8th house', lv, ('Empty' if not e else ', '.join(e) + ' in 8th'),
                 ('The 8th house from the Lagna should be vacant. ' + ('Mars in the 8th (Kujashtama) indicates destruction of the object in view: unthinkable for marriage. ' if 'Mars' in e else '')) if ex else '', neut=True))
    # Moon from Lagna and company
    mh = house['Moon']
    lv = 'veto' if mh in (6, 8, 12) and P['strict'] == 'high' else 'bad' if mh in (6, 8, 12) else 'best' if mh == 11 else 'good' if mh in (1, 4, 5, 7, 9, 10) else 'ok'
    out.append(F('moon_lagna', 'Moon from Lagna', lv, f'Moon in the {ordinal(mh)} house',
                 (f'The Moon sits in the {ordinal(mh)} house from the rising sign. ' + ('The 6th, 8th and 12th (Shashtashta Riphagata Chandra dosha) are to be invariably avoided. ' if mh in (6, 8, 12) else 'The Moon in the 11th acts as an antidote to other evils. ' if mh == 11 else 'No Moon dosha. ')) if ex else '', neut=True))
    comp = [b for b in pl if b not in ('Moon', 'Rahu', 'Ketu') and pl[b] == st['msign']]
    if comp:
        lv = 'veto' if P['id'] == 'marriage' else 'bad' if P['id'] == 'engagement' else 'weak'
    else:
        lv = 'best'
    out.append(F('moon_company', 'Moon alone', lv, ('Joined by ' + ', '.join(comp)) if comp else 'Moon has no companion',
                 ('Sagraha Chandra dosha: the Moon should not be associated with any other planet, benefic or malefic, especially for marriage. ' if comp else 'The Moon stands alone in its sign. ') if ex else '', neut=True))
    # Kartari
    mal = lambda h: any(b in MALEFIC and house[b] == h for b in house)
    kart = mal(2) and mal(12)
    lv = ('veto' if P['id'] in ('marriage', 'engagement') else 'bad') if kart else 'best'
    out.append(F('kartari', 'Kartari (hemmed Lagna)', lv, 'Malefics on both sides of Lagna' if kart else 'Lagna not hemmed in',
                 ('Kartari dosha: malefics in the 2nd and 12th hem the Lagna like scissors. Rejected, particularly for marriage. ' if kart else 'No malefic pair on either side of the Lagna. ') if ex else '', neut=True))
    # navamsa of the Lagna
    nv = nav_sign(lg, st['lagna_deg'])
    bad = NAV_LORD[nv] in ('Sun', 'Mars', 'Saturn')
    out.append(F('kunavamsa', 'Lagna navamsa', 'bad' if bad else 'good', f'{SIGNS[nv]} navamsa (lord {NAV_LORD[nv]})',
                 ('Kunavamsa dosha: the Lagna should not fall in a malefic\'s navamsa. ' if bad else 'The Lagna is in a benign navamsa. ') if ex else '', neut=True))
    # Lagna against the natal chart
    for p, label in p_list:
        if p.get('lagna') is None:
            continue
        h = (lg - p['lagna']) % 12 + 1
        lv, note = 'ok', ''
        if h == 8:
            lv = 'veto' if P['id'] in ('marriage', 'engagement') else 'bad'
            note = 'Ashtama Lagna dosha: the rising sign is the 8th from your birth Lagna.'
        elif P['id'] == 'travel':
            if lg == p['rasi']:
                lv, note = 'best', 'The rising sign is your Janma Rasi, highly favoured for travel.'
            elif h in (1, 5, 7, 9):
                lv, note = 'bad', f'For a journey the Lagna must not be your Janma Lagna nor its 5th, 7th or 9th (here the {ordinal(h)}).'
        elif P['id'] == 'interview' and h == 10:
            lv, note = 'best', 'The rising sign is your 10th house: ideal for meeting influential people.'
        elif P['id'] == 'griha_pravesha' and (h == 1 or lg == p['rasi']):
            lv, note = 'best', 'House entry in your own Janma Lagna or Janma Rasi brings highly beneficial results.'
        if not note:
            note = 'The rising sign is not the 8th from the birth Lagna, so there is no Ashtama Lagna dosha.'
        out.append(F('lagna_natal', f'Lagna vs birth chart{label}', lv, f'{ordinal(h)} from the birth Lagna', note if ex else '', neut=True))
    # purpose-specific house checks
    sh = None
    if P['house7_empty']:
        e = inh(7)
        sh = F('special_house', '7th house', 'best' if not e else ('veto' if P['id'] == 'marriage' else 'bad'), 'Empty' if not e else ', '.join(e) + ' in 7th',
               'For marriage the 7th house must be unoccupied by any planet. ' if ex else '', neut=True)
    elif P['id'] == 'travel':
        bad = [b for b in inh(1) + inh(7) + inh(8) if b == 'Mars']
        sh = F('special_house', 'Mars check', 'bad' if bad else 'best', 'Mars in 1, 7 or 8' if bad else 'Mars well away',
               'Mars in Lagna, 7th or 8th brings accidents on a journey. ' if ex else '', neut=True)
    elif P['id'] in ('buy_house', 'foundation', 'griha_pravesha', 'buy_land'):
        bad = [b for b in inh(7) if b in MALEFIC] + (['Mars in Lagna'] if 'Mars' in inh(1) else [])
        sh = F('special_house', '7th house and Mars', 'bad' if bad else 'best', ', '.join(bad) if bad else 'No malefic in 7th, Mars not in Lagna',
               'Malefics in the 7th cause trouble; Mars should not be in Lagna. ' if ex else '', neut=True)
    elif P['id'] in ('business', 'invest'):
        mh2 = house['Mercury']
        sh = F('special_house', 'Mercury', 'best' if mh2 in (1, 10, 11) else 'good' if mh2 in (4, 7, 5, 9) else 'ok', f'Mercury in house {mh2}',
               'Mercury, the planet of trade, is best in Lagna, the 10th or the 11th. ' if ex else '', neut=True)
    if sh:
        out.append(sh)
    # Venus in the 6th for marriage
    if P['id'] in ('marriage', 'engagement'):
        v6 = house['Venus'] == 6
        out.append(F('venus6', 'Venus in 6th', 'veto' if v6 else 'best', 'Venus in the 6th' if v6 else 'Venus not in 6th',
                     'Bhrigu Shatka: Venus in the 6th is injurious to marriage even when exalted. ' if ex else '', neut=True))
    return out, house


def special_bonus(st, P, house, ex):
    b, names = 0.0, []
    v, t, n = st['vara'], st['tithi'] % 15 + 1, st['nak']
    if AMRITA_SIDDHA.get(v) == n:
        b += 8
        names.append('Amrita Siddha yoga (weekday and star)')
    tl, nl = SIDDHA[v]
    if n in nl and (tl is None or t in tl):
        b += 6
        names.append('Siddha yoga (weekday, tithi and star)')
    if VARA_TITHI_SIDDHA.get(v) == (t - 1) % 5 + 1:
        b += 3
        names.append('Siddha tithi on its weekday')
    if n == PUS and P['id'] not in PUSHYA_EXCLUDED:
        b += 2
        names.append('Pushya')
    if house and P['id'] in ('marriage', 'engagement'):
        h = house
        yogas = [
            ('Mahendra Yoga', h['Jupiter'] == 1 and h['Venus'] == 8 and h['Sun'] == 11),
            ('Vishnu Priya Yoga', h['Venus'] == 1 and h['Jupiter'] == 10 and h['Sun'] == 11 and h['Mercury'] == 11),
            ('Sreenatha Yoga', h['Venus'] == 2 and h['Jupiter'] == 12 and h['Sun'] == 8 and h['Saturn'] == 6),
            ('Samudra Yoga', h['Venus'] == 1 and h['Jupiter'] == 4 and h['Mercury'] == 2 and h['Saturn'] == 11),
            ('Vijaya Yoga', h['Mercury'] == 1 and h['Jupiter'] == 1 and h['Venus'] == 1),
            ('Jaya Yoga', h['Venus'] == 1 and h['Jupiter'] == 1),
            ('Pushya Yoga', h['Saturn'] == 3 and h['Jupiter'] == 6 and h['Sun'] == 10 and h['Mars'] == 11),
            ('Maharshi Yoga', h['Mars'] == 3 and h['Saturn'] == 6 and h['Venus'] == 9 and h['Jupiter'] == 12),
            ('Ardhama Yoga', h['Venus'] == 1 and h['Jupiter'] == 11),
        ]
        for nm, ok in yogas:
            if ok:
                b += 6
                names.append(nm + ' (fortifies the marriage chart)')
    return min(b, 10.0), names


def evaluate(st, P, people, ex=False):
    """Returns dict(score, grade, factors, vetoes, neutralised, bonus)."""
    light = st['light']
    fs = []
    tara_good_any = True
    plist = []
    two = len(people) > 1 and people[0] and people[1]
    for i, p in enumerate(people):
        if not p:
            continue
        plist.append((p, (' (' + (p.get('name') or ('you' if i == 0 else 'partner')) + ')') if two else ''))
    for p, label in plist:
        tf = tara_factor(st, P, p, label, ex, None)
        fs.append(tf)
        tg = tf.level in ('best', 'good')
        cf, _ = chandra_factor(st, P, p, label, ex, tg)
        fs.append(cf)
    house = None
    lagna_fs = []
    if not light:
        lagna_fs, house = lagna_factors(st, P, plist, ex)
    vlord = VARA_LORDS[st['vara']]
    lord_in_lagna = False
    if house is not None:
        lord_in_lagna = (house.get(vlord) == 1)
    fs.append(nak_factor(st, P, ex))
    fs.append(tithi_factor(st, P, ex))
    fs.append(vara_factor(st, P, ex, lord_in_lagna))
    fs.append(yoga_factor(st, P, ex))
    fs.append(karana_factor(st, P, ex))
    fs.append(paksha_factor(st, P, ex))
    mf = month_factor(st, P, ex)
    if mf:
        fs.append(mf)
    cf2 = combust_factor(st, P, ex)
    if cf2:
        fs.append(cf2)
    if not light:
        fs.append(timing_factor(st, P, ex))
        fs.append(panchaka_factor(st, P, ex))
        hf = hora_factor(st, P, ex)
        if hf:
            fs.append(hf)
        fs.extend(lagna_fs)
    # krura samyuta (marriage and engagement): the Sun's star and its neighbours
    if P['id'] in ('marriage', 'engagement') and abs(((st['nak'] - st['sun_nak'] + 13) % 27) - 13) <= 1:
        fs.append(F('krura', 'Sun\'s star and neighbours', 'bad', f'Moon in {NAKS[st["nak"]]}, next to the Sun\'s star',
                    'Krura Samyuta dosha: the star the Sun occupies and the ones just before and after it are rejected for marriage. ' if ex else '', neut=True))
        WEIGHTS.setdefault('krura', 3)
    # neutralisers
    neut = []
    if st['nak'] == PUS and P['id'] not in PUSHYA_EXCLUDED:
        for f in fs:
            if f.level == 'veto' and f.neut and f.key in ('tithi', 'vara', 'yoga', 'karana', 'panchaka', 'chandra', 'lagna_natal', 'moon_lagna'):
                f.level = 'bad'
                f.note = 'Softened by Pushya, which Raman says neutralises most doshas.'
                neut.append(f.key)
    if house is not None and any(house.get(b) == 1 for b in BENEFIC):
        which = [b for b in BENEFIC if house.get(b) == 1]
        for f in fs:
            if f.level == 'veto' and f.neut:
                f.level = 'weak'
                f.note = f'Neutralised by {" and ".join(which)} in the Lagna (Raman Ch V, items 6 and 7).'
                neut.append(f.key)
    tot = sum(WEIGHTS.get(f.key, 3) for f in fs)
    earned = sum(WEIGHTS.get(f.key, 3) * LEVELS[f.level] for f in fs)
    base = 100.0 * earned / tot if tot else 0.0
    bonus, bnames = special_bonus(st, P, house, ex)
    score = min(100, round(base + bonus))
    core = [f for f in fs if f.key in ('tara', 'chandra', 'nak', 'tithi', 'vara', 'yoga', 'karana', 'panchaka')]
    nb = sum(1 for f in core if f.level == 'bad')
    nw = sum(1 for f in core if f.level == 'weak')
    cap = 44 if nb >= 2 else 59 if nb == 1 else 69 if nw >= 2 else 79 if nw == 1 else 100
    score = min(score, cap)
    vetoes = [f for f in fs if f.level == 'veto']
    if vetoes:
        score = min(score, 39)
    elif neut:
        score = min(score, 74)
    grade = 'avoid' if vetoes else grade_of(score)
    rows = None
    if ex:
        rows = []
        for f in fs:
            w = WEIGHTS.get(f.key, 3)
            share = 100.0 * w / tot
            rows.append({'key': f.key, 'title': f.title, 'value': f.value, 'level': f.level, 'label': LABEL[f.level],
                         'weight': round(share, 1), 'pts': round(share * LEVELS[f.level], 1),
                         'why': (f.why + (' ' + f.note if f.note else '')).strip(), 'absolute': f.absolute, 'src': f.src})
        if bnames:
            rows.append({'key': 'special', 'title': 'Special yogas', 'value': '; '.join(bnames), 'level': 'best', 'label': 'Bonus',
                         'weight': 0, 'pts': round(bonus, 1), 'why': 'Raman Ch VI: certain weekday, tithi and star combinations create Siddha and Amrita Siddha yogas that strengthen the whole election.', 'absolute': False, 'src': SRC})
    return {'score': score, 'grade': grade, 'vetoes': [(f.key, f.title, f.value) for f in vetoes], 'neutralised': neut, 'factors': rows,
            'bonus': bonus, 'raw': round(base, 1)}


# ---------------------------------------------------------------- driving
def _slots(D, P, people, light, ex=False):
    bps = boundaries(D, light)
    out = []
    for a, b in zip(bps, bps[1:]):
        t = (a + b) / 2
        st = state_at(D, t, light)
        r = evaluate(st, P, people, ex)
        r.update({'a': a, 'b': b, 't': t, 'st': st})
        out.append(r)
    return out


def _merge(slots):
    """Merge neighbouring non-vetoed slots of similar score into windows."""
    wins, cur = [], None
    for s in slots:
        ok = s['grade'] != 'avoid'
        if ok and cur and abs(s['score'] - cur['score_last']) <= 4 and s['a'] - cur['b'] < 1e-6:
            cur['b'] = s['b']
            cur['parts'].append(s)
            cur['score_last'] = s['score']
        else:
            if cur:
                wins.append(cur)
            cur = {'a': s['a'], 'b': s['b'], 'parts': [s], 'score_last': s['score'], 'ok': ok} if ok else None
    if cur:
        wins.append(cur)
    res = []
    for w in wins:
        tot = sum((p['b'] - p['a']) for p in w['parts'])
        sc = sum(p['score'] * (p['b'] - p['a']) for p in w['parts']) / tot
        best = max(w['parts'], key=lambda p: p['score'])
        res.append({'a': w['a'], 'b': w['b'], 'score': round(sc), 'parts': w['parts'], 'best': best})
    return res


def _fmt(D, jd):
    return fmt_local(jd + 30 / 86400.0, D['off'], False)


def _hour(D, t):
    return ((t + D['off'] / 24.0 + 0.5) % 1.0) * 24.0


def _summarise(D, P, slots, people, hours=None):
    if hours:
        h0, h1 = hours
        slots2 = []
        for s in slots:
            h = _hour(D, s['t'])
            if h0 <= h < h1:
                slots2.append(s)
            else:
                s2 = dict(s)
                s2['grade'] = 'avoid'
                s2['vetoes'] = [('hours', 'Outside the hours you chose', '')]
                slots2.append(s2)
        slots_use = slots2
    else:
        slots_use = slots
    wins = [w for w in _merge(slots_use) if (w['b'] - w['a']) >= MIN_WINDOW]
    wins.sort(key=lambda w: (-w['score'], -(w['b'] - w['a'])))
    day = {'date': f'{D["y"]:04d}-{D["m"]:02d}-{D["d"]:02d}', 'weekday': WEEKDAYS[D['vara']], 'sunrise': _fmt(D, D['sr']), 'sunset': _fmt(D, D['ss']),
           'masa': D['masa'] + (' (Adhika)' if D['adhika'] else '')}
    if wins:
        w = wins[0]
        g = grade_of(w['score'])
        if any(p['neutralised'] for p in w['parts']):
            g = 'good' if g == 'excellent' else g
        day.update({'score': w['score'], 'grade': g, 'best': {'a': w['a'], 'b': w['b'], 'sa': _fmt(D, w['a']), 'sb': _fmt(D, w['b'])}})
        day['windows'] = [{'a': x['a'], 'b': x['b'], 'sa': _fmt(D, x['a']), 'sb': _fmt(D, x['b']), 'score': x['score'], 'grade': grade_of(x['score'])} for x in wins[:4]]
        bs = w['best']
        day['facts'] = {'tithi': PN.tithi_name(bs['st']['tithi']), 'nakshatra': NAKS[bs['st']['nak']], 'yoga': YOGA_NAMES[bs['st']['yoga']],
                        'moon_sign': SIGNS[bs['st']['msign']]}
    else:
        day.update({'score': 0, 'grade': 'avoid', 'best': None, 'windows': []})
    # why a day is avoided: the vetoes that occur most across the day
    cnt = {}
    for s in slots_use:
        if s['vetoes'] and s['vetoes'][0][0] == 'hours':
            continue
        for k, t, v in s['vetoes']:
            cnt.setdefault((k, t), [0, v])
            cnt[(k, t)][0] += s['b'] - s['a']
    day['avoid'] = [{'title': t, 'value': v, 'share': round(100 * d / (D['nsr'] - D['sr']))} for (k, t), (d, v) in sorted(cnt.items(), key=lambda kv: -kv[1][0])[:4]]
    return day


def _people(P, person, partner):
    ppl = [person if person and person.get('nak') is not None else None]
    if P['person'] == 'both' and partner and partner.get('nak') is not None:
        ppl.append(partner)
    return ppl


def scan(P_id, person, partner, start, ndays, lat, lon, tz, cfg=None, direction=None, light=False, hours=None):
    P = PURPOSES[P_id]
    people = _people(P, person, partner)
    if people[0] is None and len(people) > 1:
        people = people[1:]
    y, m, d = [int(x) for x in start.split('-')]
    from datetime import date, timedelta
    d0 = date(y, m, d)
    ctx = Ctx(lat, lon, tz, cfg)
    days = []
    with LOCK:
        core.set_ayanamsa(ctx.cfg['ayanamsa'])
        for k in range(int(ndays)):
            dd = d0 + timedelta(days=k)
            D = build_day(ctx, dd.year, dd.month, dd.day, light, direction)
            slots = _slots(D, P, people, light)
            days.append(_summarise(D, P, slots, people, hours))
    return {'purpose': P_id, 'days': days, 'people': len([p for p in people if p])}


def _timeline(D, slots):
    return [{'a': s['a'], 'b': s['b'], 'sa': _fmt(D, s['a']), 'sb': _fmt(D, s['b']), 'score': s['score'], 'grade': s['grade'],
             'veto': [t for _, t, _ in s['vetoes']][:2]} for s in slots]


def day_detail(P_id, person, partner, date_s, lat, lon, tz, cfg=None, direction=None, hours=None):
    P = PURPOSES[P_id]
    people = _people(P, person, partner)
    if people[0] is None and len(people) > 1:
        people = people[1:]
    y, m, d = [int(x) for x in date_s.split('-')]
    ctx = Ctx(lat, lon, tz, cfg)
    with LOCK:
        core.set_ayanamsa(ctx.cfg['ayanamsa'])
        D = build_day(ctx, y, m, d, False, direction)
        slots = _slots(D, P, people, False)
        summ = _summarise(D, P, slots, people, hours)
        use = slots
        if hours:
            use = []
            for s_ in slots:
                if hours[0] <= _hour(D, s_['t']) < hours[1]:
                    use.append(s_)
                else:
                    s2 = dict(s_)
                    s2['grade'] = 'avoid'
                    use.append(s2)
        wins = [w for w in _merge(use) if (w['b'] - w['a']) >= MIN_WINDOW]
        wins.sort(key=lambda w: (-w['score'], -(w['b'] - w['a'])))
        out = []
        for w in wins[:5]:
            bs = w['best']
            ev = evaluate(bs['st'], P, people, True)
            out.append({'a': w['a'], 'b': w['b'], 'sa': _fmt(D, w['a']), 'sb': _fmt(D, w['b']), 'score': w['score'], 'grade': grade_of(w['score']),
                        'factors': ev['factors'], 'neutralised': ev['neutralised']})
        summ['detail'] = out
        tl = _timeline(D, slots)
        if hours:
            for t_, s_ in zip(tl, slots):
                if not (hours[0] <= _hour(D, s_['t']) < hours[1]):
                    t_['grade'] = 'avoid'; t_['veto'] = ['outside the chosen hours']
        summ['timeline'] = tl
        summ['sr'], summ['ss'], summ['nsr'] = D['sr'], D['ss'], D['nsr']
        summ['lagna'] = [{'sign': SIGNS[g['sign']], 'sa': _fmt(D, g['a']), 'sb': _fmt(D, g['b'])} for g in D['lagna']]
        if not out and slots:
            # whole day vetoed: explain the strongest slot so the reasons are visible
            cand = [s_ for s_ in slots if not hours or hours[0] <= _hour(D, s_['t']) < hours[1]] or slots
            bs = max(cand, key=lambda s: s['score'])
            ev = evaluate(bs['st'], P, people, True)
            summ['blocked'] = {'sa': _fmt(D, bs['a']), 'sb': _fmt(D, bs['b']), 'factors': ev['factors']}
    return summ


def explain_at(P_id, person, partner, when, lat, lon, tz, cfg=None, direction=None):
    P = PURPOSES[P_id]
    people = _people(P, person, partner)
    if people[0] is None and len(people) > 1:
        people = people[1:]
    dpart, tpart = when.replace(' ', 'T').split('T')
    y, m, d = [int(x) for x in dpart.split('-')]
    hh, mm = [int(float(x)) for x in tpart.split(':')[:2]]
    ctx = Ctx(lat, lon, tz, cfg)
    with LOCK:
        core.set_ayanamsa(ctx.cfg['ayanamsa'])
        off = tz_offset_hours(y, m, d, hh, mm, 0, tz)
        jd = swe.julday(y, m, d, hh + mm / 60.0) - off / 24.0
        day = day_bounds(jd, off, lat, lon, ctx.cfg['sunrise'])
        sr = day['sr']
        loc = core.fmt_local(sr, off, False)
        yy, mo, dd = [int(x) for x in loc[:10].split('-')]
        D = build_day(ctx, yy, mo, dd, False, direction)
        st = state_at(D, jd, False)
        ev = evaluate(st, P, people, True)
        ev.pop('st', None)
        ev['when'] = when
        return ev


def home_view(when, person, lat, lon, tz, cfg=None, purposes=None):
    """Day quality for every purpose for the Vedic day containing `when`, without the Lagna and time-of-day layers."""
    dpart, tpart = when.replace(' ', 'T').split('T')
    y, m, d = [int(x) for x in dpart.split('-')]
    hh, mm = [int(float(x)) for x in tpart.split(':')[:2]]
    ctx = Ctx(lat, lon, tz, cfg)
    res = {}
    with LOCK:
        core.set_ayanamsa(ctx.cfg['ayanamsa'])
        off = tz_offset_hours(y, m, d, hh, mm, 0, tz)
        jd = swe.julday(y, m, d, hh + mm / 60.0) - off / 24.0
        day = day_bounds(jd, off, lat, lon, ctx.cfg['sunrise'])
        loc = core.fmt_local(day['sr'], off, False)
        yy, mo, dd = [int(x) for x in loc[:10].split('-')]
        D = build_day(ctx, yy, mo, dd, True)
        st_now = state_at(D, jd, True)
        info = {}
        if person and person.get('nak') is not None:
            c = (st_now['nak'] - person['nak']) % 27 + 1
            rem = (c - 1) % 9 + 1
            h = (st_now['msign'] - person['rasi']) % 12 + 1
            info = {'tara': TARA[rem][0], 'tara_n': rem, 'tara_meaning': TARA[rem][1], 'count': c,
                    'tara_good': rem in (2, 4, 6, 8, 9), 'chandra_house': h, 'chandra_bad': h in (8, 12), 'chandra_warn': h == 6, 'chandrashtama': h == 8,
                    'moon_sign': SIGNS[st_now['msign']], 'nak': NAKS[st_now['nak']]}
        else:
            info = {'moon_sign': SIGNS[st_now['msign']], 'nak': NAKS[st_now['nak']]}
        for pid in (purposes or ORDER):
            P = PURPOSES[pid]
            people = [person] if person and person.get('nak') is not None else [None]
            slots = _slots(D, P, people, True)
            # the day's best slot, and the slot in force now
            best = max(slots, key=lambda s: (s['score'] if s['grade'] != 'avoid' else -1))
            cur = next((s for s in slots if s['a'] <= jd < s['b']), slots[0])
            top = best if best['grade'] != 'avoid' else None
            res[pid] = {'now': {'grade': cur['grade'], 'score': cur['score'], 'veto': [t for _, t, _ in cur['vetoes']][:2]},
                        'day': {'grade': top['grade'] if top else 'avoid', 'score': top['score'] if top else 0,
                                'why': [t for _, t, _ in max(slots, key=lambda s: len(s['vetoes']))['vetoes']][:2] if not top else []},
                        'slots': [[s['a'], s['b'], s['grade'], s['score']] for s in slots]}
    return {'info': info, 'purposes': res, 'date': f'{yy:04d}-{mo:02d}-{dd:02d}'}


# ---------------------------------------------------------------- reference tables
def guide():
    def names(pred):
        return [{'id': pid, 'label': PURPOSES[pid]['label'], 'icon': PURPOSES[pid]['icon']} for pid in ORDER if pred(PURPOSES[pid])]
    naks = []
    for i in range(27):
        cls = next((v for v in NAK_CLASS.values() if i in v[2]), None)
        naks.append({'i': i, 'name': NAKS[i], 'cls': cls[0] if cls else '', 'cls_text': cls[1] if cls else '',
                     'best': names(lambda P: i in P['nak_best']), 'ok': names(lambda P: i in P['nak_ok']),
                     'avoid': names(lambda P: (i not in P['nak_best'] and i not in P['nak_ok'] and P['nak_mode'] == 'strict') or (i in (BHA, KRI) and P['id'] in BHARANI_KRITTIKA_VETO)),
                     'absolute': i in (BHA, KRI)})
    tithis = []
    for i in range(30):
        tithis.append({'i': i, 'name': PN.tithi_name(i), 'cls': TITHI_CLASS[(i % 15) % 5 + 1] if i % 15 != 14 or True else '',
                       'best': names(lambda P: i in P['tithi_best']),
                       'avoid': names(lambda P: i in P['tithi_veto'] or (i in TITHI_VETO and not P['tithi_best'])),
                       'absolute': i in TITHI_VETO})
    vara = []
    for v in range(7):
        vara.append({'i': v, 'name': WEEKDAYS[v], 'lord': VARA_LORDS[v], 'best': names(lambda P: v in P['vara_good']),
                     'avoid': names(lambda P: v in P['vara_bad'])})
    yogas = [{'i': i, 'name': YOGA_NAMES[i], 'level': 'veto' if i in YOGA_VETO else 'bad' if i in YOGA_BAD else 'good' if i in YOGA_GOOD else 'ok',
              'avoid': names(lambda P: i in P['yoga_bad'])} for i in range(27)]
    factors = [
        {'key': 'tara', 'title': 'Tarabala', 'weight': WEIGHTS['tara'], 'personal': True,
         'text': 'Count from your birth star to the day\'s star; the remainder after dividing by 9 gives the Tara: 1 Janma (danger to body), 2 Sampat (wealth), 3 Vipat (loss), 4 Kshema (prosperity), 5 Pratyak (obstacles), 6 Sadhana (achievement), 7 Naidhana (danger), 8 Mitra (good), 9 Parama Mitra (very good). 3, 5 and 7 are bad, fully in the first cycle of nine stars, about half in the second, little in the third. Vipat and Naidhana are still avoided for important work.'},
        {'key': 'chandra', 'title': 'Chandrabala', 'weight': WEIGHTS['chandra'], 'personal': True,
         'text': 'The Moon of the day must not be in the 6th, 8th or 12th sign from your birth Moon sign. The 8th (Chandrashtama) is a veto unless the Moon is waxing in a benefic sign and navamsa, or Tarabala is good, or the Moon is friendly with the 8th lord. B. V. Raman also rejects the 6th, which this app accepts with a warning (scored weak, not blocked). The 12th is treated as a serious fault.'},
        {'key': 'nak', 'title': 'Nakshatra', 'weight': WEIGHTS['nak'], 'text': 'Each purpose has its own list of best stars (fixed, soft, light, movable). Bharani and Krittika are rejected for almost all auspicious work.'},
        {'key': 'tithi', 'title': 'Tithi', 'weight': WEIGHTS['tithi'], 'text': 'The lunar day carries the Moon\'s energy. The 4th, 8th, 14th and New Moon are avoided; 2, 3, 5, 7, 10, 11 and 13 are generally favoured.'},
        {'key': 'vara', 'title': 'Weekday', 'weight': WEIGHTS['vara'], 'text': 'Monday, Wednesday, Thursday and Friday are generally good. Tuesday and Saturday are avoided by day, relaxed after midday (Tuesday) and at night.'},
        {'key': 'yoga', 'title': 'Yoga', 'weight': WEIGHTS['yoga'], 'text': 'Vyatipata and Vaidhriti are great evils; Atiganda, Shula and Ganda are harmful.'},
        {'key': 'karana', 'title': 'Karana', 'weight': WEIGHTS['karana'], 'text': 'Vishti (Bhadra) is unfit for good work. Bava suits lasting works, Taitila marriage.'},
        {'key': 'paksha', 'title': 'Moon phase', 'weight': WEIGHTS['paksha'], 'text': 'A waxing Moon is strong; a late waning Moon is weak.'},
        {'key': 'month', 'title': 'Month', 'weight': WEIGHTS['month'], 'text': 'Some purposes (marriage, foundation, housewarming) have good and bad lunar months.'},
        {'key': 'panchaka', 'title': 'Panchaka', 'weight': WEIGHTS['panchaka'], 'text': 'Add tithi, weekday, star and Lagna numbers and divide by 9: remainders 1 Mrityu, 2 Agni, 4 Raja, 6 Chora and 8 Roga are bad; which one matters depends on the purpose (Raja for work, Agni and Raja for houses, Chora for travel, Roga and Mrityu for marriage).'},
        {'key': 'timing', 'title': 'Time of day', 'weight': WEIGHTS['timing'], 'text': 'Avoid Rahu Kalam, Dur Muhurta, Tyajya (Varjyam), Gandanta and the 16 ghatis either side of a Sun ingress. Prefer Abhijit and Vijaya muhurtas.'},
        {'key': 'lagna_sign', 'title': 'Lagna', 'weight': WEIGHTS['lagna_sign'], 'text': 'The rising sign must suit the purpose and avoid the tyajya degrees (Bhujanga, Rahu, Gridhra zones on their weekdays) and Gandanta.'},
        {'key': 'lagna_strength', 'title': 'Lagna strength', 'weight': WEIGHTS['lagna_strength'], 'text': 'Jupiter, Venus or Mercury in Lagna and in kendras help; malefics in 3, 6 and 11 help; malefics in Lagna or the 7th hurt.'},
        {'key': 'eighth', 'title': '8th house', 'weight': WEIGHTS['eighth'], 'text': 'The 8th house from Lagna should be vacant; Mars there is a veto.'},
        {'key': 'moon_lagna', 'title': 'Moon from Lagna', 'weight': WEIGHTS['moon_lagna'], 'text': 'The Moon should not be in the 6th, 8th or 12th from the rising sign, nor joined by another planet.'},
        {'key': 'kartari', 'title': 'Kartari', 'weight': WEIGHTS['kartari'], 'text': 'Malefics on both sides of the Lagna are rejected.'},
        {'key': 'lagna_natal', 'title': 'Lagna vs birth chart', 'weight': WEIGHTS['lagna_natal'], 'personal': True, 'text': 'The rising sign must not be the 8th from your birth Lagna (Ashtama Lagna dosha).'},
    ]
    return {'factors': factors, 'nakshatras': naks, 'tithis': tithis, 'weekdays': vara, 'yogas': yogas,
            'grades': [{'min': 80, 'name': 'Excellent'}, {'min': 65, 'name': 'Good'}, {'min': 50, 'name': 'Acceptable'}, {'min': 0, 'name': 'Poor'}],
            'neutralisers': [
                'Pushya star softens most doshas (not for marriage).',
                'Jupiter, Venus or Mercury in the Lagna neutralises other doshas; the result is capped at Good.',
                'Tuesday is not evil after midday; at night Tuesday and Saturday carry no weekday penalty.',
                'Vyatipata and Vaidhriti are defunct after midday.',
                'Chandrashtama is softened by a waxing Moon in a benefic sign and navamsa, good Tarabala, or a friendly 8th lord.'],
            'purposes': [{'id': pid, 'label': PURPOSES[pid]['label'], 'icon': PURPOSES[pid]['icon'], 'group': PURPOSES[pid]['group'],
                          'blurb': PURPOSES[pid]['blurb'], 'person': PURPOSES[pid]['person'], 'strict': PURPOSES[pid]['strict'],
                          'notes': PURPOSES[pid]['notes']} for pid in ORDER]}
