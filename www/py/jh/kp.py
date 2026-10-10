"""Krishnamoorthy Paddhati: star/sub lords up to 5 levels, KP 249 table."""
from .consts import *
from .core import norm, sign_of, dms


def kp_chain(lon, depth=5):
    lon = norm(lon)
    idx = int(lon // NAK_SPAN)
    cur = NAK_LORD[idx]
    start, span = idx * NAK_SPAN, NAK_SPAN
    lords = [cur]
    for _ in range(depth - 1):
        i0 = VIM_ORDER.index(cur)
        t = start
        for k in range(9):
            L = VIM_ORDER[(i0 + k) % 9]
            w = span * VIM_YEARS[L] / 120.0
            if lon < t + w or k == 8:
                cur, start, span = L, t, w
                lords.append(L)
                break
            t += w
    return lords


LEVEL_LABEL = ['Star', 'Sub', 'Sub-sub', 'Sub-sub-sub', 'Sub-sub-sub-sub']


def kp_table(chart, depth=5):
    rows = []
    def row(name, lon, kind):
        ch = kp_chain(lon, depth)
        return {'name': name, 'kind': kind, 'lon': lon, 'sign': SIGNS[sign_of(lon)], 'deg': dms(lon % 30),
                'sign_lord': SIGN_LORD[sign_of(lon)], 'chain': ch}
    rows.append(row('Lagna', chart['asc']['lon'], 'lagna'))
    for p in chart['planets']:
        rows.append(row(p['name'], p['lon'], 'planet'))
    for i, c in enumerate(chart['cusps']):
        rows.append(row(f'Cusp {i + 1}', c, 'cusp'))
    # reverse lookup: bodies occupying star / sub (levels) of each planet
    rev = {L: [[] for _ in range(depth)] for L in VIM_ORDER}
    for r in rows:
        for lvl, L in enumerate(r['chain']):
            rev[L][lvl].append(r['name'])
    return {'rows': rows, 'reverse': rev, 'levels': LEVEL_LABEL[:depth],
            'ayanamsa': chart['meta']['ayanamsa'], 'house_system': 'Placidus (sidereal)'}


def kp249():
    """The 249 KP subdivisions (243 subs + 6 splits at sign boundaries)."""
    out = []
    for n in range(27):
        lord = NAK_LORD[n]
        i0 = VIM_ORDER.index(lord)
        t = n * NAK_SPAN
        for k in range(9):
            L = VIM_ORDER[(i0 + k) % 9]
            w = NAK_SPAN * VIM_YEARS[L] / 120.0
            a, b = t, t + w
            # split at sign boundaries
            cut = (int(a // 30) + 1) * 30.0
            if a < cut < b - 1e-9:
                out.append({'nak': n, 'sub': L, 'start': a, 'end': cut})
                out.append({'nak': n, 'sub': L, 'start': cut, 'end': b})
            else:
                out.append({'nak': n, 'sub': L, 'start': a, 'end': b})
            t = b
    for i, r in enumerate(out):
        r['no'] = i + 1
    return out
