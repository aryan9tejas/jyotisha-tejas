"""World outlook: mundane (Brihat Samhita style) reading of the sky. Planet-in-sign meanings, themes (economy, leaders, war, gold, oil,
technology and so on), industries, slow cycles (Jupiter, Saturn, nodes), a forward calendar with eclipses, and transits over national charts.
Traditional principles, composed from tables; not a forecast and not advice."""
from datetime import datetime, timedelta
from zoneinfo import ZoneInfo
import swisseph as swe
from .consts import *
from . import core
from .core import LOCK, norm, sign_of, planet_pos, nak_info, dms
from . import world_text as T

BODIES = ['Sun', 'Moon', 'Mars', 'Mercury', 'Jupiter', 'Venus', 'Saturn', 'Rahu', 'Ketu']
CFG = dict(core.DEFAULT_CFG)
ASP = {'Mars': (4, 7, 8), 'Jupiter': (5, 7, 9), 'Saturn': (3, 7, 10), 'Sun': (7,), 'Moon': (7,), 'Mercury': (7,), 'Venus': (7,)}
YUDDHA = ['Mars', 'Mercury', 'Jupiter', 'Venus', 'Saturn']
CONJ_S = {'Jupiter': 0.7, 'Venus': 0.3, 'Mercury': 0.2, 'Moon': 0.2, 'Sun': 0.0, 'Mars': -0.5, 'Saturn': -0.6, 'Rahu': -0.7, 'Ketu': -0.5}
ASP_S = {'Jupiter': 0.5, 'Saturn': -0.5, 'Mars': -0.4}
BASE_D = {'exalted': 2.0, 'own': 1.5, 'friend': 0.8, 'neutral': 0.0, 'enemy': -0.8, 'debilitated': -2.0}


def ordn(n):
    return f"{n}{'th' if 10 <= n % 100 <= 20 else {1: 'st', 2: 'nd', 3: 'rd'}.get(n % 10, 'th')}"


def _lon(jd, p):
    r = planet_pos(jd, p, CFG)
    return norm(r[0]), r[3], r[1]


def loc(jd, tz):
    y, m, d, h = swe.revjul(jd)
    u = datetime(y, m, d, tzinfo=ZoneInfo('UTC')) + timedelta(hours=h)
    return u.astimezone(ZoneInfo(tz)).strftime('%Y-%m-%d %H:%M')


# ------------------------------------------------------------------ state of the sky
def state(jd):
    with LOCK:
        core.set_ayanamsa(CFG['ayanamsa'])
        P = {}
        for p in BODIES:
            lon, spd, lat = _lon(jd, p)
            s = sign_of(lon)
            ni, pada = nak_info(lon)
            P[p] = {'planet': p, 'lon': lon, 'sign_idx': s, 'sign': SIGNS[s], 'deg': dms(lon % 30), 'nak': NAKSHATRAS[ni], 'nak_idx': ni, 'pada': pada,
                    'retro': bool(spd < 0) or p in ('Rahu', 'Ketu'), 'speed': spd, 'dignity': T.dignity(p, s) if p not in ('Rahu', 'Ketu') else 'node'}
    sun = P['Sun']['lon']
    for p in BODIES:
        o = P[p]
        o['combust'] = False
        if p in COMBUST_ORB:
            sep = abs(((o['lon'] - sun + 180) % 360) - 180)
            o['combust'] = sep < COMBUST_ORB[p] and p != 'Sun'
            o['sun_sep'] = round(sep, 1)
        o['conj'] = [q for q in BODIES if q != p and P[q]['sign_idx'] == o['sign_idx'] and not (p in ('Rahu', 'Ketu') and q in ('Rahu', 'Ketu'))]
        o['aspected_by'] = []
        for q in BODIES:
            if q == p or q in ('Rahu', 'Ketu'):
                continue
            d = (o['sign_idx'] - P[q]['sign_idx']) % 12 + 1
            if d in ASP[q] and d != 1:
                o['aspected_by'].append({'planet': q, 'house': d})
        o['yuddha'] = None
        if p in YUDDHA:
            for q in YUDDHA:
                if q != p and abs(((P[q]['lon'] - o['lon'] + 180) % 360) - 180) < 1.0:
                    o['yuddha'] = q
        s = BASE_D.get(o['dignity'], 0.0)
        st = [('Dignity', s)]
        if o['retro'] and p not in ('Rahu', 'Ketu', 'Sun', 'Moon'):
            s += 0.3; st.append(('Retrograde (strong but erratic)', 0.3))
        if o['combust']:
            s -= 1.0; st.append(('Combust', -1.0))
        for q in o['conj']:
            v = CONJ_S.get(q, 0)
            if v:
                s += v; st.append((f'Conjunct {q}', v))
        for a in o['aspected_by']:
            v = ASP_S.get(a['planet'], 0)
            if v:
                s += v; st.append((f"Aspected by {a['planet']}", v))
        if o['yuddha']:
            s -= 0.5; st.append((f"Planetary war with {o['yuddha']}", -0.5))
        o['strength'] = max(-2.5, min(2.5, round(s, 2)))
        o['strength_parts'] = st
    return P


def planet_view(o):
    """Per planet reading shown under Transiting planets."""
    p = o['planet']
    paras = []
    paras.extend(T.sign_meaning(p, o['sign_idx']))
    paras.append(f"Position. {o['deg']} {o['sign']}, {o['nak']} pada {o['pada']}. It stays in a sign for {T.PLANET_DUR[p]}.")
    flags = []
    if o['retro'] and p not in ('Rahu', 'Ketu'):
        paras.append(f"Retrograde. {p} is retrograde: " + T.RETRO[p])
        flags.append('retrograde')
    elif p in ('Rahu', 'Ketu'):
        paras.append('Motion. ' + T.RETRO[p])
    if o['combust']:
        paras.append(f"Combust. {p} is {o['sun_sep']} degrees from the Sun, inside its combustion orb: its themes ({T.PLANET_M[p]}) are weak, hidden or taken over by governments and rulers.")
        flags.append('combust')
    if o['conj']:
        for q in o['conj']:
            paras.append('Conjunction. ' + T.pair_text(p, q, 'conjunction'))
        flags.append('conjunct ' + ', '.join(o['conj']))
    for a in o['aspected_by']:
        if a['planet'] in ('Jupiter', 'Saturn', 'Mars'):
            paras.append(f"Aspect. {a['planet']} aspects {p} from its {ordn(a['house'])} house. " + T.pair_text(a['planet'], p, 'aspect'))
            flags.append(f"{a['planet']} aspect")
    if o['yuddha']:
        paras.append(f"Planetary war. {p} and {o['yuddha']} are within one degree. Their themes are contested and the result is uncertain until they separate.")
        flags.append('planetary war')
    paras.append('Vedha. Vedha is a personal rule counted from a native\'s Moon, so it is shown in Transits and Dasa. For the world, conjunctions, aspects and planetary war do the same work.')
    return {'planet': p, 'sign': o['sign'], 'deg': o['deg'], 'nak': o['nak'], 'pada': o['pada'], 'retro': o['retro'], 'combust': o['combust'], 'dignity': o['dignity'],
            'strength': o['strength'], 'flags': flags, 'paras': paras}


# ------------------------------------------------------------------ themes
def _lvl(kind, pct):
    if kind == 'risk':
        return 'High risk' if pct >= 40 else 'Elevated' if pct >= 15 else 'Moderate' if pct > -15 else 'Low' if pct > -40 else 'Very low'
    if kind == 'mkt':
        return 'Firm' if pct >= 40 else 'Mild upward bias' if pct >= 15 else 'Neutral' if pct > -15 else 'Mild downward bias' if pct > -40 else 'Soft'
    return 'Strong' if pct >= 40 else 'Supportive' if pct >= 15 else 'Mixed' if pct > -15 else 'Pressured' if pct > -40 else 'Weak'


def _tone(kind, pct):
    good = (-pct if kind == 'risk' else pct)
    return 'bu2' if good >= 40 else 'bu1' if good >= 15 else 'mx' if good > -15 else 'be1' if good > -40 else 'be2'


def themes(P):
    out = []
    for th in T.THEMES:
        tot = wsum = 0.0
        drv = []
        vol = False
        nret = 0
        for p, w in th['sig'].items():
            o = P[p]
            s = o['strength']
            tot += w * s; wsum += w
            if w >= 1.5 and o['retro'] and p not in ('Rahu', 'Ketu'):
                nret += 1
            if (w >= 2 and p not in ('Rahu', 'Ketu') and any(q in ('Rahu', 'Ketu') for q in o['conj'])) or o['yuddha']:
                vol = True
            parts = [f"{p} ({th['roles'].get(p, T.PLANET_M[p])}) is in {o['sign']}"]
            if o['dignity'] in ('exalted', 'own', 'debilitated'):
                parts.append(o['dignity'])
            if o['retro'] and p not in ('Rahu', 'Ketu'):
                parts.append('retrograde')
            if o['combust']:
                parts.append('combust')
            if o['conj']:
                parts.append('with ' + ', '.join(o['conj']))
            adv = [a['planet'] for a in o['aspected_by'] if a['planet'] in ('Jupiter', 'Saturn', 'Mars')]
            if adv:
                parts.append('aspected by ' + ', '.join(adv))
            drv.append({'planet': p, 'weight': w, 'strength': s, 'pts': round(w * s, 2), 'text': ', '.join(parts) + f". Net strength {s:+.1f}."})
        vol = vol or nret >= 2
        raw = tot / wsum
        pct = round(max(-100, min(100, raw / 2.0 * 100)))
        if th['kind'] == 'risk':
            pct = -pct
        drv.sort(key=lambda d: -abs(d['pts']))
        good = (-pct if th['kind'] == 'risk' else pct)
        main = drv[0]['planet']
        paras = [('Summary. ' + (th['up'] if good >= 15 else th['down'] if good <= -15 else 'Signals are mixed, so expect no clear direction.'))]
        if th['kind'] == 'mkt':
            paras[0] = 'Bias. ' + (th['up'] if pct >= 15 else th['down'] if pct <= -15 else 'Signals are mixed, so no clear direction. Expect range-bound and news-driven movement.')
        for d in drv[:3]:
            paras.append('Driver. ' + d['text'])
        paras.append(f"Arena. {main} sits in {P[main]['sign']}, which stirs {T.SIGN_M[P[main]['sign_idx']]}.")
        if vol:
            paras.append('Volatility. Two or more key signifiers are retrograde, or one is in planetary war or joined to Rahu or Ketu, so swings and reversals are likelier than the average reading suggests.')
        paras.append('Note. A traditional indication of tendency from planetary strength, not a forecast and not advice.')
        out.append({'id': th['id'], 'name': th['name'], 'kind': th['kind'], 'pct': pct, 'level': _lvl(th['kind'], pct), 'tone': _tone(th['kind'], pct), 'volatile': vol,
                    'headline': (th['up'] if good >= 15 else th['down'] if good <= -15 else 'Mixed signals, no clear direction.'), 'drivers': [{'planet': d['planet'], 'pts': d['pts']} for d in drv[:3]], 'paras': paras,
                    'shown': abs(pct) >= 15 or vol})
    return out


def industries(P):
    up, dn, vol = [], [], []
    for p in BODIES:
        o = P[p]
        if p in ('Rahu', 'Ketu'):
            vol.append({'planet': p, 'sign': o['sign'], 'industries': T.PLANET_IND[p], 'why': f"{p} in {o['sign']}: these sectors move on sudden, narrative-driven news, in either direction."})
            continue
        if p == 'Moon':
            continue
        why = f"{p} in {o['sign']} ({o['dignity']}{', retrograde' if o['retro'] else ''}{', combust' if o['combust'] else ''}), net strength {o['strength']:+.1f}"
        if o['strength'] >= 1.0:
            up.append({'planet': p, 'industries': T.PLANET_IND[p], 'why': why, 'strength': o['strength']})
        elif o['strength'] <= -1.0:
            dn.append({'planet': p, 'industries': T.PLANET_IND[p], 'why': why, 'strength': o['strength']})
    up.sort(key=lambda x: -x['strength']); dn.sort(key=lambda x: x['strength'])
    return {'up': up, 'down': dn, 'volatile': vol}


def interests(P):
    out = []
    for p, head, lead in (('Jupiter', 'Where the world expands', 'Growth, optimism and investment flow toward'),
                          ('Saturn', 'Where the world is tested', 'Restructuring, austerity and hard reckoning fall on'),
                          ('Rahu', 'Where the world is obsessed', 'Collective fascination, disruption and boom-and-bust gather around'),
                          ('Ketu', 'What is fading or dissolving', 'Withdrawal, separation and loss of interest touch')):
        o = P[p]
        out.append({'planet': p, 'head': head, 'sign': o['sign'], 'text': f"{lead} {T.SIGN_M[o['sign_idx']]}."})
    return out


# ------------------------------------------------------------------ slow cycles
def _span(p, jd):
    """When the planet entered its current sign and when it leaves it."""
    s0 = sign_of(_lon(jd, p)[0])
    step = 3.0 if p == 'Jupiter' else 5.0

    def find(sgn):
        t = jd
        for _ in range(400):
            t2 = t + sgn * step
            if sign_of(_lon(t2, p)[0]) != s0:
                a, b = (t, t2) if sgn > 0 else (t2, t)       # a in sign, b outside (forward); mirrored otherwise
                lo, hi = (t, t2) if sgn > 0 else (t2, t)
                for _ in range(30):
                    mid = (lo + hi) / 2
                    ins = sign_of(_lon(mid, p)[0]) == s0
                    if sgn > 0:
                        lo, hi = (mid, hi) if ins else (lo, mid)
                    else:
                        lo, hi = (lo, mid) if ins else (mid, hi)
                return (lo + hi) / 2
            t = t2
        return None
    with LOCK:
        core.set_ayanamsa(CFG['ayanamsa'])
        return find(-1), find(1)


def _diff(jd):
    return ((_lon(jd, 'Jupiter')[0] - _lon(jd, 'Saturn')[0] + 180) % 360) - 180


def _conjunctions(jd):
    """Jupiter-Saturn conjunctions: the last one and the next one."""
    last = nxt = None
    with LOCK:
        core.set_ayanamsa(CFG['ayanamsa'])
        t = jd - 365.25 * 21
        prev = _diff(t)
        while t < jd + 365.25 * 21:
            t2 = t + 12.0
            cur = _diff(t2)
            if prev < 0 <= cur and abs(cur - prev) < 90:
                lo, hi = t, t2
                for _ in range(30):
                    mid = (lo + hi) / 2
                    if _diff(mid) < 0:
                        lo = mid
                    else:
                        hi = mid
                tc = (lo + hi) / 2
                sg = sign_of(_lon(tc, 'Jupiter')[0])
                if tc <= jd:
                    last = (tc, sg)
                elif nxt is None:
                    nxt = (tc, sg)
            prev, t = cur, t2
    return last, nxt


def slow(jd, tz, P):
    out = {'planets': [], 'js': {}, 'nodes': {}}
    for p in ('Jupiter', 'Saturn', 'Rahu', 'Ketu'):
        a, b = _span(p, jd)
        o = P[p]
        out['planets'].append({'planet': p, 'sign': o['sign'], 'entered': loc(a, tz)[:10] if a else '', 'leaves': loc(b, tz)[:10] if b else '', 'retro': o['retro'],
                               'frac': round((jd - a) / (b - a), 2) if a and b else None,
                               'text': f"{p} is in {o['sign']} ({o['dignity']}). " + T.sign_meaning(p, o['sign_idx'])[0]})
    last, nxt = _conjunctions(jd)
    dsep = ((P['Jupiter']['lon'] - P['Saturn']['lon']) % 360)
    rel = (P['Saturn']['sign_idx'] - P['Jupiter']['sign_idx']) % 12 + 1
    phase = 'building (the cycle is young)' if dsep < 90 or dsep > 330 else 'expanding' if dsep < 180 else 'culminating (the peak of tension and results)' if dsep < 270 else 'waning (consolidation and release)'
    js = {'sep': round(dsep, 1), 'relation': T.JS_REL[rel], 'house': rel, 'phase': phase}
    if last:
        js['last'] = {'date': loc(last[0], tz)[:10], 'sign': SIGNS[last[1]]}
    if nxt:
        js['next'] = {'date': loc(nxt[0], tz)[:10], 'sign': SIGNS[nxt[1]]}
    paras = ['Cycle. Jupiter and Saturn meet about every twenty years. The meeting sets the tone for the next two decades: Jupiter is expansion and wisdom, Saturn is structure and limits, and their contact shapes policy, finance and institutions.',
             f"Now. Jupiter is {js['sep']} degrees ahead of Saturn, so the cycle is {phase}. Counted from Jupiter, Saturn is in the {ordn(rel)} sign: {js['relation']}."]
    if last:
        paras.append(f"Last meeting. {js['last']['date']} in {js['last']['sign']}.")
    if nxt:
        paras.append(f"Next meeting. {js['next']['date']} in {js['next']['sign']}.")
    js['paras'] = paras
    out['js'] = js
    ra = P['Rahu']; ke = P['Ketu']
    axis = ra['sign_idx'] % 6
    ph = out['planets'][2]
    fr = ph['frac'] if ph['frac'] is not None else 0.5
    nodes = {'rahu': ra['sign'], 'ketu': ke['sign'], 'entered': ph['entered'], 'leaves': ph['leaves'], 'axis': T.AXIS[axis]}
    np_ = [f"Axis. Rahu is in {ra['sign']} and Ketu in {ke['sign']}. " + T.AXIS[axis],
           f"Rahu. Rahu amplifies the themes of {ra['sign']}: {T.SIGN_M[ra['sign_idx']]}. These are where the world is hungry, ambitious and prone to excess.",
           f"Ketu. Ketu withdraws from the themes of {ke['sign']}: {T.SIGN_M[ke['sign_idx']]}. These are where the world is losing interest, cutting ties or turning inward.",
           'Phase. ' + T.NODE_PHASE[0 if fr < 0.33 else 1 if fr < 0.66 else 2] + (f" Rahu entered {ph['entered']} and leaves {ph['leaves']}." if ph['entered'] else '')]
    for q in ('Jupiter', 'Saturn', 'Mars'):
        oq = P[q]
        if oq['sign_idx'] in (ra['sign_idx'], ke['sign_idx']):
            nd = 'Rahu' if oq['sign_idx'] == ra['sign_idx'] else 'Ketu'
            np_.append('Contact. ' + T.pair_text(q, nd, 'conjunction'))
    nodes['paras'] = np_
    out['nodes'] = nodes
    return out


# ------------------------------------------------------------------ calendar
def _bis(f, lo, hi, n=26):
    flo = f(lo)
    for _ in range(n):
        mid = (lo + hi) / 2
        if (f(mid) > 0) == (flo > 0):
            lo = mid
        else:
            hi = mid
    return (lo + hi) / 2


def calendar(jd, tz, days=366, nations=None):
    ev = []
    t1 = jd + days
    with LOCK:
        core.set_ayanamsa(CFG['ayanamsa'])
        steps = [jd + i for i in range(0, days + 1)]
        # ingress, stations
        for p in ('Sun', 'Mars', 'Mercury', 'Jupiter', 'Venus', 'Saturn', 'Rahu'):
            prev = _lon(steps[0], p)
            for t in steps[1:]:
                cur = _lon(t, p)
                s0, s1 = sign_of(prev[0]), sign_of(cur[0])
                if s0 != s1:
                    lo, hi = t - 1, t
                    for _ in range(24):
                        mid = (lo + hi) / 2
                        if sign_of(_lon(mid, p)[0]) == s0:
                            lo = mid
                        else:
                            hi = mid
                    tc = (lo + hi) / 2
                    nm = SIGNS[s1]
                    big = p in ('Jupiter', 'Saturn', 'Rahu')
                    txt = [f"{p} enters {nm}. Attention shifts to {T.SIGN_M[s1]}.", f"{p} governs {T.PLANET_M[p]}, so these themes now play out through {nm} for {T.PLANET_DUR[p]}."]
                    if p == 'Rahu':
                        txt.append(f"Ketu enters {SIGNS[(s1 + 6) % 12]} at the same time, so the nodal axis changes.")
                    ev.append({'jd': tc, 'type': 'ingress', 'big': big, 'title': f"{p} enters {nm}" + (' (retrograde)' if cur[1] < 0 and p not in ('Rahu',) else '') + (f" (Ketu enters {SIGNS[(s1 + 6) % 12]})" if p == 'Rahu' else ''), 'paras': txt})
                if p in ('Mercury', 'Venus', 'Mars', 'Jupiter', 'Saturn') and (prev[1] < 0) != (cur[1] < 0):
                    tc = _bis(lambda x: _lon(x, p)[1], t - 1, t)
                    sg = SIGNS[sign_of(_lon(tc, p)[0])]
                    retro = cur[1] < 0
                    txt = [f"{p} turns {'retrograde' if retro else 'direct'} in {sg}."]
                    if retro:
                        txt.append(f"While retrograde, {T.RETRO[p]}")
                    else:
                        txt.append(f"The retrograde ends: matters tied to {T.PLANET_M[p]} begin to move forward again, though results of the retrograde phase play out.")
                    ev.append({'jd': tc, 'type': 'station', 'big': p in ('Jupiter', 'Saturn'), 'title': f"{p} turns {'retrograde' if retro else 'direct'} in {sg}", 'paras': txt})
                prev = cur
        # conjunctions of the slow and martial planets
        names = ['Mars', 'Mercury', 'Jupiter', 'Venus', 'Saturn']
        for i, a in enumerate(names):
            for b in names[i + 1:]:
                if not ({a, b} & {'Mars', 'Jupiter', 'Saturn'}):
                    continue
                f = lambda x: ((_lon(x, a)[0] - _lon(x, b)[0] + 180) % 360) - 180
                prev = f(steps[0])
                for t in steps[1:]:
                    cur = f(t)
                    if (prev < 0) != (cur < 0) and abs(cur - prev) < 40:
                        tc = _bis(f, t - 1, t)
                        sg = sign_of(_lon(tc, a)[0])
                        ev.append({'jd': tc, 'type': 'conjunction', 'big': {a, b} == {'Jupiter', 'Saturn'}, 'title': f"{a} meets {b} in {SIGNS[sg]}",
                                   'paras': [T.pair_text(a, b, 'conjunction'), f"The meeting falls in {SIGNS[sg]}, which colours it with {T.SIGN_M[sg]}."]})
                    prev = cur
        # eclipses: new and full moons with the Moon near a node (small ecliptic latitude)
        el = lambda x: ((_lon(x, 'Moon')[0] - _lon(x, 'Sun')[0]) % 360)
        for target, kind in ((0, 'new'), (180, 'full')):
            g = lambda x, tg=target: ((el(x) - tg + 180) % 360) - 180
            prev = g(steps[0])
            for t in steps[1:]:
                cur = g(t)
                if (prev < 0) != (cur < 0) and abs(cur - prev) < 40:
                    tc = _bis(g, t - 1, t)
                    mlon, _, mlat = _lon(tc, 'Moon')
                    al = abs(mlat)
                    etype = None
                    if kind == 'new' and al < 1.55:
                        etype = 'solar'
                    elif kind == 'full' and al < 1.0:
                        etype = 'lunar'
                    elif kind == 'full' and al < 1.58:
                        etype = 'penumbral lunar'
                    if etype:
                        sg = sign_of(mlon)
                        ni, pada = nak_info(mlon)
                        cls = T.NAK_CLS[ni]
                        txt = [T.ECL_SOLAR if etype == 'solar' else T.ECL_LUNAR,
                               f"It falls in {SIGNS[sg]}, {NAKSHATRAS[ni]} nakshatra (pada {pada}), so the themes of {SIGNS[sg]} ({T.SIGN_M[sg]}) are the ones stirred.",
                               T.ECL_CLS[cls],
                               f"Region. In the Brihat Samhita Kurma map, {NAKSHATRAS[ni]} belongs to the {T.KURMA[ni].lower()} of the Indian subcontinent, which traditionally feels the effect most.",
                               T.ECL_GEN]
                        if etype == 'penumbral lunar':
                            txt.insert(0, 'A penumbral lunar eclipse is subtle and traditionally of minor effect.')
                        ev.append({'jd': tc, 'type': 'eclipse', 'big': etype != 'penumbral lunar', 'title': f"{etype.capitalize()} eclipse in {SIGNS[sg]}, {NAKSHATRAS[ni]}",
                                   'paras': txt, 'sign_idx': sg, 'nak': NAKSHATRAS[ni], 'direction': T.KURMA[ni], 'etype': etype})
                prev = cur
    ev = [e for e in ev if jd <= e['jd'] <= t1]
    ev.sort(key=lambda e: e['jd'])
    for e in ev:
        e['date'] = loc(e['jd'], tz)
        e['days'] = round(e['jd'] - jd)
        e.pop('jd')
    return ev


# ------------------------------------------------------------------ nations
def nations(jd, tz, chart_fn, gochara_mod, dasa_mod):
    out = []
    for n in T.NATIONS:
        try:
            c = chart_fn({'birth': {'name': n['name'], 'date': n['date'], 'time': n['time'], 'lat': n['lat'], 'lon': n['lon'], 'tz': n['tz'], 'place': n['place']}})
            r = gochara_mod.evaluate(c, jd, None, '', tz)
        except Exception as e:      # one failing chart must not hide the others
            out.append({'id': n['id'], 'name': n['name'], 'error': str(e)})
            continue
        pl = {p['planet']: p for p in r['planets']}
        pct = sum(d['dasa']['pct'] for d in r['domains']) / len(r['domains'])
        lab = gochara_mod.label(pct)
        paras = [f"Basis. {n['note']}", f"Chart. Lagna {r['lagna']}, Moon in {r['moon_sign']} ({r['moon_nak']}). Rely most on the Moon sign and the slow planets."]
        sat, jup, rah = pl['Saturn'], pl['Jupiter'], pl['Rahu']
        paras.append('Saturn. ' + T.SAT_NATION[sat['house_moon']] + f" It is in the {ordn(sat['house_lagna'])} from the national lagna: {T.HL_NATION[sat['house_lagna']]}.")
        paras.append('Jupiter. ' + T.JUP_NATION[jup['house_moon']] + f" It is in the {ordn(jup['house_lagna'])} from the national lagna: {T.HL_NATION[jup['house_lagna']]}.")
        paras.append(f"Nodes. Rahu is {ordn(rah['house_moon'])} from the national Moon and {ordn(rah['house_lagna'])} from the lagna, bringing disruption, foreign influence and sudden change to {T.HL_NATION[rah['house_lagna']]}.")
        for l in r['lens']['path'][:2]:
            paras.append(f"{l['level']} of {l['lord']} (to {l['end']}). {l['lord']} sits in the {ordn(l['house_lagna'])} from the national lagna, so this period works through {T.HL_NATION[l['house_lagna']]}. It is {l['strength_word']} by dignity and placement, and its nature for this lagna is {l['fn_label']}.")
        fl = [f['title'] for f in r['flags'] if f['id'] in ('sade', 'ashtama', 'janma_guru')]
        if fl:
            paras.append('Flags. ' + ', '.join(fl) + ' applies to this nation now.')
        out.append({'id': n['id'], 'name': n['name'], 'lagna': r['lagna'], 'moon_sign': r['moon_sign'], 'moon_sign_idx': SIGNS.index(r['moon_sign']), 'lagna_idx': SIGNS.index(r['lagna']),
                    'label': lab, 'pct': round(pct), 'tone': gochara_mod.tone_of(pct), 'flags': fl, 'saturn': f"{sat['sign']} ({ordn(sat['house_moon'])} from Moon)",
                    'jupiter': f"{jup['sign']} ({ordn(jup['house_moon'])} from Moon)", 'dasa': ' / '.join(f"{l['lord']}" for l in r['lens']['path'][:2]), 'paras': paras})
    return out


def view(jd, tz, when_label=''):
    P = state(jd)
    pv = {p: planet_view(P[p]) for p in BODIES}
    th = themes(P)
    return {'when': when_label, 'planets': pv, 'themes': th, 'industries': industries(P), 'interests': interests(P)}
