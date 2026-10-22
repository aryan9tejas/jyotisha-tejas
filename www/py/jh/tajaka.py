"""Tajaka annual charts: Varshaphala, Muntha, Harsha bala, Pancha Vargeeya bala; Tithi Pravesha."""
import swisseph as swe

from .consts import *
from . import core
from .core import (LOCK, norm, sign_of, build_chart, solve_sun, offset_for_jd, compound_rel, varga_sign,
                   planet_pos, birth_jd, fmt_local, DEFAULT_CFG)

EGYPT = {
    0: [(6, 'Jupiter'), (12, 'Venus'), (20, 'Mercury'), (25, 'Mars'), (30, 'Saturn')],
    1: [(8, 'Venus'), (14, 'Mercury'), (22, 'Jupiter'), (27, 'Saturn'), (30, 'Mars')],
    2: [(6, 'Mercury'), (12, 'Jupiter'), (17, 'Venus'), (24, 'Mars'), (30, 'Saturn')],
    3: [(7, 'Mars'), (13, 'Venus'), (19, 'Mercury'), (26, 'Jupiter'), (30, 'Saturn')],
    4: [(6, 'Jupiter'), (11, 'Venus'), (18, 'Saturn'), (24, 'Mercury'), (30, 'Mars')],
    5: [(7, 'Mercury'), (17, 'Venus'), (21, 'Jupiter'), (28, 'Mars'), (30, 'Saturn')],
    6: [(6, 'Saturn'), (14, 'Mercury'), (21, 'Jupiter'), (28, 'Venus'), (30, 'Mars')],
    7: [(7, 'Mars'), (11, 'Venus'), (19, 'Mercury'), (24, 'Jupiter'), (30, 'Saturn')],
    8: [(12, 'Jupiter'), (17, 'Venus'), (21, 'Mercury'), (26, 'Saturn'), (30, 'Mars')],
    9: [(7, 'Mercury'), (14, 'Jupiter'), (22, 'Venus'), (26, 'Saturn'), (30, 'Mars')],
    10: [(7, 'Mercury'), (13, 'Venus'), (20, 'Jupiter'), (25, 'Mars'), (30, 'Saturn')],
    11: [(12, 'Venus'), (16, 'Jupiter'), (19, 'Mercury'), (28, 'Mars'), (30, 'Saturn')],
}
_RATIO = {'adhimitra': 0.75, 'mitra': 0.5, 'sama': 0.25, 'satru': 0.125, 'adhisatru': 0.0625}


def hadda_lord(sign, deg):
    for lim, lord in EGYPT[sign]:
        if deg < lim:
            return lord
    return EGYPT[sign][-1][1]


def _ratio(p, lord, signs):
    return 1.0 if lord == p else _RATIO[compound_rel(p, lord, signs)]


def _angdist(a, b):
    d = abs(norm(a) - norm(b))
    return 360 - d if d > 180 else d


def pancha_vargeeya(chart):
    signs = chart['signs']
    out = {}
    for p in SEVEN:
        rec = chart['pmap'][p]
        lon, sg, deg = rec['lon'], rec['sign'], rec['deg']
        k = 30 * _ratio(p, SIGN_LORD[sg], signs)
        u = _angdist(lon, DEBIL_POINT[p]) / 9.0
        h = 15 * _ratio(p, hadda_lord(sg, deg), signs)
        dsign = (sg + 4 * int(deg // 10)) % 12
        d = 10 * _ratio(p, SIGN_LORD[dsign], signs)
        nsign = varga_sign(lon, 9)
        n = 5 * _ratio(p, SIGN_LORD[nsign], signs)
        total = (k + u + h + d + n) / 4.0
        out[p] = {'kshetra': k, 'uccha': u, 'hadda': h, 'drekkana': d, 'navamsa': n, 'total': total,
                  'grade': 'Excellent' if total >= 15 else 'Good' if total >= 10 else 'Average' if total >= 5 else 'Weak'}
    return out


HARSHA_HOUSE = {'Sun': 9, 'Moon': 3, 'Mars': 6, 'Mercury': 1, 'Jupiter': 11, 'Venus': 5, 'Saturn': 12}


def harsha_bala(chart):
    asc = chart['asc']['sign']
    day = chart['meta']['is_day']
    out = {}
    for p in SEVEN:
        rec = chart['pmap'][p]
        h = (rec['sign'] - asc) % 12 + 1
        sthana = 5 if h == HARSHA_HOUSE[p] else 0
        male = p in ('Sun', 'Mars', 'Jupiter', 'Saturn')
        odd = rec['sign'] % 2 == 0
        stri = 5 if ((male and odd) or (not male and not odd)) else 0
        ucc = 5 if (rec['sign'] in OWN_SIGNS[p] or EXALT_SIGN[p] == rec['sign']) else 0
        dn = 5 if (p == 'Mercury' or (day and p in ('Sun', 'Jupiter', 'Saturn')) or ((not day) and p in ('Moon', 'Mars', 'Venus'))) else 0
        out[p] = {'sthana': sthana, 'stri_purusha': stri, 'ucchadi': ucc, 'dina_ratri': dn, 'total': sthana + stri + ucc + dn}
    return out


def _tri_rashi_pati(asc_sign, day):
    if asc_sign in FIRE:
        return 'Sun' if day else 'Jupiter'
    if asc_sign in EARTH:
        return 'Venus' if day else 'Moon'
    if asc_sign in AIR:
        return 'Saturn' if day else 'Mercury'
    return 'Venus' if day else 'Mars'


def varshaphala(natal, age, tz=None, lat=None, lon=None):
    cfg = natal['meta']['cfg']
    with LOCK:
        core.set_ayanamsa(cfg['ayanamsa'])
        natal_sun = natal['pmap']['Sun']['lon']
        guess = natal['meta']['jd'] + age * 365.2422
        jd = solve_sun(natal_sun, guess, cfg)
        tzs = tz or natal['meta']['input'].get('tz') or natal['meta']['tz_offset']
        off = offset_for_jd(jd, tzs)
        la = lat if lat is not None else natal['meta']['lat']
        lo = lon if lon is not None else natal['meta']['lon']
        vc = build_chart({'jd': jd, 'tz_offset': off, 'lat': la, 'lon': lo, 'name': f'Varsha {age}',
                          'place': natal['meta']['place'], 'tz': tz or natal['meta']['input'].get('tz')}, cfg)
    n_asc = natal['asc']['sign']
    muntha = (n_asc + age) % 12
    v_asc = vc['asc']['sign']
    pvb = pancha_vargeeya(vc)
    hb = harsha_bala(vc)
    cands = {
        'Munthesha (Muntha lord)': SIGN_LORD[muntha],
        'Janma lagna lord': SIGN_LORD[n_asc],
        'Varsha lagna lord': SIGN_LORD[v_asc],
        'Tri-rashi pati': _tri_rashi_pati(v_asc, vc['meta']['is_day']),
    }
    best = max(set(cands.values()), key=lambda x: pvb[x]['total'])
    return {
        'age': age, 'return_local': vc['meta']['local'], 'return_jd': jd, 'tz_offset': off,
        'muntha': {'sign': SIGNS[muntha], 'sign_idx': muntha, 'house_in_varsha': (muntha - v_asc) % 12 + 1, 'lord': SIGN_LORD[muntha]},
        'varsha_lagna': SIGNS[v_asc], 'chart': vc, 'harsha_bala': hb, 'pancha_vargeeya': pvb,
        'varsha_lord_candidates': cands, 'suggested_varsha_lord': best,
        'note': 'Varsha lord shown is the candidate with the highest Pancha Vargeeya bala; the classical aspect-to-lagna test is not applied.',
    }


def tithi_pravesha(natal, age, tz=None, lat=None, lon=None):
    cfg = natal['meta']['cfg']
    with LOCK:
        core.set_ayanamsa(cfg['ayanamsa'])
        nsun = natal['pmap']['Sun']['lon']
        e0 = norm(natal['pmap']['Moon']['lon'] - nsun)
        anniv = natal['meta']['jd'] + age * 365.2425

        def elong(t):
            return norm(planet_pos(t, 'Moon', cfg)[0] - planet_pos(t, 'Sun', cfg)[0])

        def solve(t):
            for _ in range(60):
                d = ((e0 - elong(t) + 180) % 360) - 180
                t += d / 12.19
                if abs(d) < 1e-8:
                    break
            return t

        cands = []
        t = solve(anniv - 16)
        while t < anniv + 16:
            if t > anniv - 16:
                sd = abs(((planet_pos(t, 'Sun', cfg)[0] - nsun + 180) % 360) - 180)
                cands.append((sd, t))
            t = solve(t + 29.0)
        if not cands:
            raise ValueError('Could not locate tithi return')
        jd = min(cands)[1]
        tzs = tz or natal['meta']['input'].get('tz') or natal['meta']['tz_offset']
        off = offset_for_jd(jd, tzs)
        la = lat if lat is not None else natal['meta']['lat']
        lo = lon if lon is not None else natal['meta']['lon']
        c = build_chart({'jd': jd, 'tz_offset': off, 'lat': la, 'lon': lo, 'name': f'Tithi Pravesha {age}', 'place': natal['meta']['place']}, cfg)
    from .panchanga import tithi_name
    return {'age': age, 'return_local': c['meta']['local'], 'return_jd': jd, 'tz_offset': off, 'chart': c,
            'natal_tithi': tithi_name(int(e0 // 12)), 'tithi_at_return': tithi_name(int(elong(jd) // 12)),
            'note': 'Chosen as the natal-tithi recurrence nearest the Sun\'s natal longitude within the birthday window.'}


def mudda_dasa(chart, jd0=None, year_days=365.2425):
    """Mudda dasa: Vimsottari compressed so that the 120-year cycle spans one year.
    Starts from the nakshatra lord of the annual chart's Moon, with the balance of that dasa
    taken from the Moon's position in its nakshatra. Returns dasas with their antardasas, clipped to the year."""
    from .dasa import sub_periods
    from .core import fmt_local
    off = chart['meta']['tz_offset']
    jd0 = chart['meta']['jd'] if jd0 is None else jd0
    unit = year_days / 120.0                      # days per Vimsottari year
    moon = chart['pmap']['Moon']['lon']
    idx = int(moon // NAK_SPAN)
    lord = NAK_LORD[idx]
    elapsed = (moon % NAK_SPAN) / NAK_SPAN
    t = jd0 - elapsed * VIM_YEARS[lord] * unit
    end = jd0 + year_days
    i0 = VIM_ORDER.index(lord)
    d = lambda x: fmt_local(x, off, False)[:10]
    out = []
    for i in range(10):
        L = VIM_ORDER[(i0 + i) % 9]
        dur = VIM_YEARS[L] * unit
        a, b = t, t + dur
        t = b
        if b <= jd0:
            continue
        if a >= end:
            break
        subs = []
        for sp in sub_periods(L, a, dur):
            if sp['end'] <= jd0 or sp['start'] >= end:
                continue
            subs.append({'lord': sp['lord'], 'start': d(max(sp['start'], jd0)), 'end': d(min(sp['end'], end)),
                         'days': round(min(sp['end'], end) - max(sp['start'], jd0), 1)})
        out.append({'lord': L, 'start': d(max(a, jd0)), 'end': d(min(b, end)),
                    'days': round(min(b, end) - max(a, jd0), 1), 'sub': subs})
    return {'start_lord': lord, 'moon_nakshatra': NAKSHATRAS[idx], 'dasas': out,
            'note': 'Mudda dasa: the Vimsottari sequence compressed so that its 120 years fit one year (1 Vimsottari year = 3.04 days). It starts with the lord of the annual chart\'s Moon nakshatra, with the balance from the Moon\'s position in that star.'}
