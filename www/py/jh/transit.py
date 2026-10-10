"""Transits (gochara): snapshot, houses from lagna/Moon, ashtakavarga scores, ingress calendar."""
import swisseph as swe

from .consts import *
from . import core
from .core import LOCK, norm, sign_of, planet_pos, fmt_local, offset_for_jd, nak_info, dms
from .strength import ashtakavarga

TRANSIT_BODIES = ['Sun', 'Moon', 'Mars', 'Mercury', 'Jupiter', 'Venus', 'Saturn', 'Rahu', 'Ketu']
# Classical gochara: houses from natal Moon in which a transiting planet gives good results
FAVORABLE_FROM_MOON = {
    'Sun': [3, 6, 10, 11], 'Moon': [1, 3, 6, 7, 10, 11], 'Mars': [3, 6, 11], 'Mercury': [2, 4, 6, 8, 10, 11],
    'Jupiter': [2, 5, 7, 9, 11], 'Venus': [1, 2, 3, 4, 5, 8, 9, 11, 12], 'Saturn': [3, 6, 11],
    'Rahu': [3, 6, 10, 11], 'Ketu': [3, 6, 10, 11],
}


def snapshot(chart, jd):
    cfg = chart['meta']['cfg']
    with LOCK:
        core.set_ayanamsa(cfg['ayanamsa'])
        av = ashtakavarga(chart['signs'], chart['asc']['sign'])
        asc_sign = chart['asc']['sign']
        moon_sign = chart['pmap']['Moon']['sign']
        rows = []
        for p in TRANSIT_BODIES:
            r = planet_pos(jd, p, cfg)
            lon = norm(r[0])
            sg = sign_of(lon)
            idx, pada = nak_info(lon)
            hm = (sg - moon_sign) % 12 + 1
            rows.append({
                'planet': p, 'lon': lon, 'sign': SIGNS[sg], 'sign_idx': sg, 'deg': dms(lon % 30),
                'nakshatra': NAKSHATRAS[idx], 'pada': pada, 'retro': (r[3] < 0) or p in ('Rahu', 'Ketu'),
                'house_lagna': (sg - asc_sign) % 12 + 1, 'house_moon': hm,
                'bindus': av['bav'][p][sg] if p in av['bav'] else None,
                'sav': av['sav'][sg],
                'favorable': hm in FAVORABLE_FROM_MOON[p],
            })
        sat = [r for r in rows if r['planet'] == 'Saturn'][0]
        d = sat['house_moon']
        sade = {12: 'Sade Sati: first phase (Saturn 12th from Moon)', 1: 'Sade Sati: peak phase (Saturn over Moon)',
                2: 'Sade Sati: last phase (Saturn 2nd from Moon)'}.get(d)
        ashtama = 'Ashtama Shani (Saturn 8th from Moon)' if d == 8 else None
        kantaka = 'Kantaka Shani (Saturn 4th from Moon)' if d == 4 else None
        return {'jd': jd, 'rows': rows, 'sade_sati': sade or ashtama or kantaka, 'moon_sign': SIGNS[moon_sign],
                'lagna': SIGNS[asc_sign], 'sav': av['sav']}


def _signs_between(planet, jd0, jd1, cfg, step=1.0):
    segs = []
    t = jd0
    cur = sign_of(planet_pos(t, planet, cfg)[0])
    seg_start = jd0
    while t < jd1:
        t2 = min(t + step, jd1)
        s2 = sign_of(planet_pos(t2, planet, cfg)[0])
        if s2 != cur:
            lo, hi = t, t2
            for _ in range(30):
                mid = (lo + hi) / 2
                if sign_of(planet_pos(mid, planet, cfg)[0]) == cur:
                    lo = mid
                else:
                    hi = mid
            tb = (lo + hi) / 2
            segs.append((cur, seg_start, tb))
            cur, seg_start = s2, tb
        t = t2
    segs.append((cur, seg_start, jd1))
    return segs


def _stations(planet, jd0, jd1, cfg):
    ev = []
    t = jd0
    prev = planet_pos(t, planet, cfg)[3] < 0
    while t < jd1:
        t2 = min(t + 2.0, jd1)
        cur = planet_pos(t2, planet, cfg)[3] < 0
        if cur != prev:
            lo, hi = t, t2
            for _ in range(30):
                mid = (lo + hi) / 2
                if (planet_pos(mid, planet, cfg)[3] < 0) == prev:
                    lo = mid
                else:
                    hi = mid
            ev.append(((lo + hi) / 2, 'turns retrograde' if cur else 'turns direct'))
            prev = cur
        t = t2
    return ev


def calendar(chart, jd0, jd1, tz=None, include_moon=False):
    cfg = chart['meta']['cfg']
    off = offset_for_jd(jd0, tz) if tz else chart['meta']['tz_offset']
    with LOCK:
        core.set_ayanamsa(cfg['ayanamsa'])
        av = ashtakavarga(chart['signs'], chart['asc']['sign'])
        asc_sign = chart['asc']['sign']
        moon_sign = chart['pmap']['Moon']['sign']
        bodies = [p for p in TRANSIT_BODIES if p != 'Moon'] if not include_moon else TRANSIT_BODIES
        out, events = {}, []
        for p in bodies:
            step = 1.0 if p not in ('Moon',) else 0.25
            segs = []
            for sg, a, b in _signs_between(p, jd0, jd1, cfg, step):
                hm = (sg - moon_sign) % 12 + 1
                segs.append({'sign': SIGNS[sg], 'sign_idx': sg, 'start': fmt_local(a, off, False)[:10], 'end': fmt_local(b, off, False)[:10],
                             'start_jd': a, 'end_jd': b, 'house_lagna': (sg - asc_sign) % 12 + 1, 'house_moon': hm,
                             'bindus': av['bav'][p][sg] if p in av['bav'] else None, 'favorable': hm in FAVORABLE_FROM_MOON[p]})
            out[p] = segs
            for i in range(1, len(segs)):
                s = segs[i]
                events.append({'jd': s['start_jd'], 'date': fmt_local(s['start_jd'], off, False), 'planet': p,
                               'event': f"enters {s['sign']}", 'house_lagna': s['house_lagna'], 'house_moon': s['house_moon'],
                               'bindus': s['bindus'], 'favorable': s['favorable']})
            if p in ('Mercury', 'Mars', 'Jupiter', 'Venus', 'Saturn'):
                for t, what in _stations(p, jd0, jd1, cfg):
                    events.append({'jd': t, 'date': fmt_local(t, off, False), 'planet': p, 'event': what})
        events.sort(key=lambda e: e['jd'])
        return {'segments': out, 'events': events, 'from': fmt_local(jd0, off, False)[:10], 'to': fmt_local(jd1, off, False)[:10]}
