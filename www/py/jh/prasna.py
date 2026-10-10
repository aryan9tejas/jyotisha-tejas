"""Prasna tools: 1-108 number and KP 1-249 number to prasna lagna."""
from .consts import *
from .core import sign_of, varga_sign, dms
from .kp import kp249, kp_chain

_KP = None


def table249():
    global _KP
    if _KP is None:
        _KP = kp249()
    return _KP


def from_108(n):
    if not 1 <= n <= 108:
        raise ValueError('Number must be 1-108')
    w = 360.0 / 108
    a, b = (n - 1) * w, n * w
    mid = (a + b) / 2
    return {'number': n, 'rasi': SIGNS[sign_of(a)], 'rasi_idx': sign_of(a), 'navamsa': SIGNS[varga_sign(mid, 9)],
            'navamsa_idx': varga_sign(mid, 9), 'navamsa_no_in_sign': (n - 1) % 9 + 1,
            'from': dms(a % 30), 'to': dms(b % 30 if (b % 30) else 30.0), 'lagna_lon': a}


def from_249(n):
    t = table249()
    if not 1 <= n <= len(t):
        raise ValueError(f'Number must be 1-{len(t)}')
    r = t[n - 1]
    mid = (r['start'] + r['end']) / 2
    return {'number': n, 'rasi': SIGNS[sign_of(r['start'] + 1e-9)], 'rasi_idx': sign_of(r['start'] + 1e-9),
            'nakshatra': NAKSHATRAS[r['nak']], 'star_lord': NAK_LORD[r['nak']], 'sub_lord': r['sub'],
            'from': dms(r['start'] % 30), 'to': dms((r['end'] - 1e-9) % 30 + 1e-9), 'lagna_lon': r['start'],
            'chain': kp_chain(mid, 5), 'navamsa': SIGNS[varga_sign(mid, 9)], 'navamsa_idx': varga_sign(mid, 9)}
