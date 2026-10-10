"""Transit helpers: time for a body (or the lagna) to reach the next or previous sign, and to reach a chosen position.

Retrograde motion is handled by scanning the real motion: the 'next sign' time is the first moment the body enters
the following sign (possibly after a station), and the 'previous sign' time is the first moment it enters the
preceding sign (possibly while retrograde)."""
from .consts import *
from . import core
from .core import LOCK, norm, planet_pos, asc_at, offset_for_jd, fmt_local

STEP = {'Moon': 0.2, 'Sun': 1.0, 'Mercury': 0.5, 'Venus': 0.5, 'Mars': 1.0, 'Jupiter': 4.0, 'Saturn': 5.0,
        'Rahu': 4.0, 'Ketu': 4.0, 'Lagna': 0.01}
HORIZON = {'Moon': 40, 'Sun': 400, 'Mercury': 450, 'Venus': 700, 'Mars': 1500, 'Jupiter': 5200, 'Saturn': 11800,
           'Rahu': 7600, 'Ketu': 7600, 'Lagna': 3}
REACH_HORIZON = {'Moon': 30, 'Sun': 400, 'Mercury': 450, 'Venus': 700, 'Mars': 900, 'Jupiter': 4500, 'Saturn': 11000,
                 'Rahu': 7600, 'Ketu': 7600, 'Lagna': 2}
BODIES = ['Sun', 'Moon', 'Mars', 'Mercury', 'Jupiter', 'Venus', 'Saturn', 'Rahu', 'Ketu', 'Lagna']


def body_lon(jd, body, cfg, lat, lon):
    if body == 'Lagna':
        return norm(asc_at(jd, lat, lon))
    return norm(planet_pos(jd, body, cfg)[0])


def _speed_sign(jd, body, cfg):
    if body in ('Lagna',):
        return 1
    if body in ('Rahu', 'Ketu'):
        return -1
    return 1 if planet_pos(jd, body, cfg)[3] >= 0 else -1


def hms(seconds):
    s = int(round(abs(seconds)))
    d, r = divmod(s, 86400)
    h, r = divmod(r, 3600)
    m, sec = divmod(r, 60)
    return {'d': d, 'h': h, 'm': m, 's': sec}


def _event(jd0, jd, body, cfg, tz, extra=None):
    off = offset_for_jd(jd, tz)
    e = {'jd': jd, 'seconds': (jd - jd0) * 86400.0, 'dur': hms((jd - jd0) * 86400.0), 'when': fmt_local(jd, off),
         'retro': _speed_sign(jd, body, cfg) < 0 and body != 'Lagna'}
    if extra:
        e.update(extra)
    return e


def _sign_at(jd, body, cfg, lat, lon):
    return int(body_lon(jd, body, cfg, lat, lon) // 30)


def _station(body, jd0, cfg, tz):
    """Next time the planet's motion changes direction (station), or None. Not defined for the nodes or the lagna."""
    if body in ('Rahu', 'Ketu', 'Lagna'):
        return None
    sp = lambda t: planet_pos(t, body, cfg)[3]
    step = max(STEP[body], 0.5)
    t, v = jd0, sp(jd0)
    while t < jd0 + 800:
        t2 = t + step
        v2 = sp(t2)
        if (v < 0) != (v2 < 0):
            lo, hi = t, t2
            for _ in range(40):
                mid = (lo + hi) / 2
                if (sp(mid) < 0) == (v < 0):
                    lo = mid
                else:
                    hi = mid
            return {'kind': 'retrograde' if v >= 0 else 'direct', **_event(jd0, hi, body, cfg, tz)}
        t, v = t2, v2
    return None


def sign_times(body, jd0, cfg, lat, lon, tz):
    """Where the body is in its current sign: when it last entered it (and from which sign), when it will leave it
    (and into which sign), and the next station. Real motion is followed, so a retrograde planet entered from the
    sign ahead and leaves into the sign behind, unless it turns direct first."""
    s0 = _sign_at(jd0, body, cfg, lat, lon)
    step, hor = STEP[body], HORIZON[body]
    out = {'sign': s0, 'sign_name': SIGNS[s0], 'since': None, 'until': None, 'station': None, 'horizon_days': hor,
           'retro': _speed_sign(jd0, body, cfg) < 0 and body != 'Lagna'}
    # forward: first moment it is no longer in this sign
    t = jd0
    while t < jd0 + hor:
        t2 = t + step
        s2 = _sign_at(t2, body, cfg, lat, lon)
        if s2 != s0:
            lo, hi = t, t2
            for _ in range(40):
                mid = (lo + hi) / 2
                if _sign_at(mid, body, cfg, lat, lon) == s0:
                    lo = mid
                else:
                    hi = mid
            out['until'] = _event(jd0, hi, body, cfg, tz, {'sign': SIGNS[s2]})
            break
        t = t2
    # backward: last moment before now it entered this sign
    t = jd0
    while t > jd0 - hor:
        t2 = t - step
        s2 = _sign_at(t2, body, cfg, lat, lon)
        if s2 != s0:
            lo, hi = t2, t           # lo outside the sign, hi inside
            for _ in range(40):
                mid = (lo + hi) / 2
                if _sign_at(mid, body, cfg, lat, lon) == s0:
                    hi = mid
                else:
                    lo = mid
            e = _event(jd0, hi, body, cfg, tz, {'sign': SIGNS[s2]})
            e['seconds'] = (jd0 - hi) * 86400.0
            e['dur'] = hms(e['seconds'])
            out['since'] = e
            break
        t = t2
    out['station'] = _station(body, jd0, cfg, tz)
    return out


def all_sign_times(jd0, cfg, lat, lon, tz):
    with LOCK:
        core.set_ayanamsa(cfg['ayanamsa'])
        return {b: sign_times(b, jd0, cfg, lat, lon, tz) for b in BODIES}


def _diff(jd, body, target, cfg, lat, lon):
    return ((body_lon(jd, body, cfg, lat, lon) - target + 180.0) % 360.0) - 180.0


def find_reach(body, target_lon, jd0, cfg, lat, lon, tz, direction='next'):
    """Next (or previous) moment the body is at target_lon, counting retrograde crossings."""
    sgn = 1 if direction == 'next' else -1
    step, hor = STEP[body] * sgn, REACH_HORIZON[body]
    with LOCK:
        core.set_ayanamsa(cfg['ayanamsa'])
        t0 = jd0 + sgn * 1e-4
        d0 = _diff(t0, body, target_lon, cfg, lat, lon)
        t = t0
        while abs(t - jd0) < hor:
            t2 = t + step
            d1 = _diff(t2, body, target_lon, cfg, lat, lon)
            if d0 * d1 <= 0 and abs(d0) < 90 and abs(d1) < 90:
                lo, hi = (t, t2) if t < t2 else (t2, t)
                flo = _diff(lo, body, target_lon, cfg, lat, lon)
                for _ in range(42):
                    mid = (lo + hi) / 2
                    fm = _diff(mid, body, target_lon, cfg, lat, lon)
                    if flo * fm <= 0:
                        hi = mid
                    else:
                        lo, flo = mid, fm
                jd = (lo + hi) / 2
                return {'jd': jd, 'seconds': (jd - jd0) * 86400.0, 'dur': hms((jd - jd0) * 86400.0), 'direction': direction,
                        'when': fmt_local(jd, offset_for_jd(jd, tz)), 'retro': _speed_sign(jd, body, cfg) < 0 and body != 'Lagna'}
            t, d0 = t2, d1
    return None
