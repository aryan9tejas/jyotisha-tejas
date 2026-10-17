"""Jyotisha Tejas engine API without a web server: runs inside Pyodide in the offline app.
Each handler takes its JSON body through request.get_json() and returns plain data."""
import json
import os
import sys
from datetime import datetime
from functools import lru_cache
from zoneinfo import ZoneInfo

import swisseph as swe

from jh import core, panchanga, strength, dasa, transit, kp, tajaka, prasna, places, movetools
from jh.consts import *

ROUTES = {}


def route(path):
    def deco(f):
        ROUTES[path] = f
        return f
    return deco


class _Req:
    data = None

    def get_json(self):
        return self.data


request = _Req()


def jsonify(x):
    return x


def dispatch(path, body_json):
    """Entry point used by the page: returns a JSON string."""
    try:
        request.data = json.loads(body_json) if body_json else {}
        return json.dumps(ROUTES[path]())
    except Exception as e:
        return json.dumps({'error': str(e)})


# ---------------------------------------------------------------- helpers
def parse_birth(d):
    b = dict(d)
    if 'date' in d and d['date']:
        y, m, dd = [int(x) for x in d['date'].split('-')]
        b.update(year=y, month=m, day=dd)
    if 'time' in d and d['time']:
        parts = [int(float(x)) for x in d['time'].split(':')]
        while len(parts) < 3:
            parts.append(0)
        b.update(hour=parts[0], minute=parts[1], second=parts[2])
    for k in ('year', 'month', 'day', 'hour', 'minute'):
        b[k] = int(b[k])
    b['second'] = int(b.get('second') or 0)
    b['lat'] = float(b['lat'])
    b['lon'] = float(b['lon'])
    tz = b.get('tz')
    if tz in (None, ''):
        tz = places.tz_for(b['lat'], b['lon'])
        if not tz:
            raise ValueError('Time zone required')
    b['tz'] = tz
    return b


def parse_cfg(d):
    cfg = dict(core.DEFAULT_CFG)
    for k, v in (d or {}).items():
        if k in cfg and v not in (None, ''):
            cfg[k] = float(v) if k == 'year_days' else v
    return cfg


@lru_cache(maxsize=64)
def _chart_cached(key):
    b, cfg = json.loads(key)
    return core.build_chart(b, cfg)


def get_chart(data):
    b = parse_birth(data['birth'])
    cfg = parse_cfg(data.get('cfg'))
    return _chart_cached(json.dumps([b, cfg], sort_keys=True))


def fnum(x, n=4):
    return round(float(x), n)


def pl_view(p):
    return {'name': p['name'], 'sign': p['sign'], 'sign_name': SIGNS[p['sign']], 'deg': fnum(p['deg']), 'dms': core.dms(p['deg']),
            'lon': fnum(p['lon']), 'nak': p['nak'], 'pada': p['pada'], 'nak_lord': p['nak_lord'], 'house': p['house'],
            'dignity': p.get('dignity', '-'), 'states': p.get('states', []), 'dig_pts': dignity_points(p['name']), 'rel': p.get('rel', ''), 'retro': bool(p.get('retro')), 'combust': bool(p.get('combust')),
            'speed': fnum(p.get('speed', 0), 4)}


def dignity_points(name):
    """Peak exaltation, deepest debilitation and Mulatrikona range for the seven planets."""
    if name not in EXALT_POINT:
        return None
    ex, de = EXALT_POINT[name], DEBIL_POINT[name]
    ms, a, b = MOOLATRIKONA[name]
    return {'exalt': {'sign': SIGNS[int(ex // 30)], 'deg': core.dms(ex % 30)},
            'debil': {'sign': SIGNS[int(de // 30)], 'deg': core.dms(de % 30)},
            'mt': {'sign': SIGNS[ms], 'sign_idx': ms, 'from': core.dms(a), 'to': core.dms(b)}}


def pos_view(name, v):
    return {'name': name, 'sign': v['sign'], 'sign_name': SIGNS[v['sign']], 'deg': fnum(v['deg']), 'dms': core.dms(v['deg']),
            'nak': v.get('nak'), 'pada': v.get('pada'), 'nak_lord': v.get('nak_lord') or (NAK_LORD[NAKSHATRAS.index(v['nak'])] if v.get('nak') else None), 'house': v.get('house')}


def _varga_view(x):
    r4 = lambda m: {k: fnum(v) for k, v in m.items()}
    return {'name': x['name'], 'asc': x['asc'], 'asc_deg': fnum(x['asc_deg']), 'planets': x['planets'], 'pos': r4(x['pos']),
            'upa': x['upa'], 'upa_pos': r4(x['upa_pos']), 'lagnas': x['lagnas'], 'lagna_pos': r4(x['lagna_pos'])}


def chart_view(c, with_strength=True):
    vargas = core.all_vargas(c)
    v = {
        'meta': {'name': c['meta']['name'], 'place': c['meta']['place'], 'lat': c['meta']['lat'], 'lon': c['meta']['lon'],
                 'tz_offset': c['meta']['tz_offset'], 'local': c['meta']['local'], 'ayanamsa': c['meta']['ayanamsa'],
                 'ayanamsa_value': core.dms(c['meta']['ayanamsa_value']), 'is_day': c['meta']['is_day'],
                 'jd': fnum(c['meta']['jd'], 6), 'cfg': c['meta']['cfg']},
        'asc': pos_view('Lagna', c['asc']),
        'planets': [pl_view(p) for p in c['planets']],
        'upagrahas': [pos_view(k, x) for k, x in c['upagrahas'].items()],
        'lagnas': [pos_view(k, x) for k, x in c['lagnas'].items()],
        'karakas8': c['karakas8'], 'karakas7': c['karakas7'],
        'vargas': {str(n): _varga_view(x) for n, x in vargas.items()},
        'arudhas': {str(n): [a['sign'] for a in row] for n, row in core.arudhas_for(c, VARGAS).items()},
        'panchanga': panchanga.birth_panchanga(c),
        'signs': SIGNS, 'sign_abbr': SIGN_ABBR,
    }
    if with_strength:
        sb = strength.shadbala(c)
        v['shadbala'] = {p: {k: fnum(x, 2) if isinstance(x, float) else x for k, x in r.items()} for p, r in sb['planets'].items()}
        v['shadbala_notes'] = sb['notes']
        v['vimsopaka'] = strength.vimsopaka(c)
        v['avasthas'] = strength.avasthas(c)
        av = {}
        for n, x in vargas.items():
            av[str(n)] = strength.ashtakavarga({p: x['planets'][p] for p in PLANETS}, x['asc'])
        v['ashtakavarga'] = av
    return v


def err(e, code=400):
    raise e if isinstance(e, Exception) else ValueError(str(e))


# ---------------------------------------------------------------- calculations
@route('/api/chart')
def api_chart():
    try:
        c = get_chart(request.get_json())
        return jsonify(chart_view(c))
    except Exception as e:
        return err(e)


@route('/api/panchanga/day')
def api_pday():
    try:
        d = request.get_json()
        y, m, dd = [int(x) for x in d['date'].split('-')]
        tz = d.get('tz') or places.tz_for(float(d['lat']), float(d['lon']))
        return jsonify(panchanga.panchanga_day(y, m, dd, float(d['lat']), float(d['lon']), tz, parse_cfg(d.get('cfg'))))
    except Exception as e:
        return err(e)


@route('/api/home')
def api_home():
    try:
        d = request.get_json()
        lat, lon = float(d['lat']), float(d['lon'])
        tz = d.get('tz') or places.tz_for(lat, lon)
        return jsonify(panchanga.home_snapshot(d['when'], lat, lon, tz, parse_cfg(d.get('cfg'))))
    except Exception as e:
        return err(e)


@route('/api/panchanga/month')
def api_pmonth():
    try:
        d = request.get_json()
        tz = d.get('tz') or places.tz_for(float(d['lat']), float(d['lon']))
        return jsonify(panchanga.panchanga_month(int(d['year']), int(d['month']), float(d['lat']), float(d['lon']), tz, parse_cfg(d.get('cfg'))))
    except Exception as e:
        return err(e)


def _now_jd(tz, when=None):
    if when:
        dt = datetime.fromisoformat(when.replace('T', ' ')).replace(tzinfo=ZoneInfo(tz))
    else:
        dt = datetime.now(ZoneInfo(tz))
    u = dt.astimezone(ZoneInfo('UTC'))
    return swe.julday(u.year, u.month, u.day, u.hour + u.minute / 60 + u.second / 3600), dt


@route('/api/dasa')
def api_dasa():
    try:
        d = request.get_json()
        c = get_chart(d)
        v = dasa.vimsottari(c, depth=int(d.get('depth', 3)))
        tz = d.get('tz') or c['meta']['input'].get('tz')
        jd, dt = _now_jd(tz, d.get('when'))
        v['at'] = {'when': dt.strftime('%Y-%m-%d %H:%M'), 'path': dasa.dasa_at(c, jd, 5)}
        # trim helper jd fields to keep payload light
        def strip(rows):
            for r in rows:
                r.pop('start_jd', None); r.pop('end_jd', None)
                if 'sub' in r:
                    strip(r['sub'])
        strip(v['periods'])
        return jsonify(v)
    except Exception as e:
        return err(e)


def _loc(d, c):
    """Location for transit views: defaults to the birth place."""
    loc = d.get('loc') or {}
    lat = float(loc['lat']) if loc.get('lat') not in (None, '') else c['meta']['lat']
    lon = float(loc['lon']) if loc.get('lon') not in (None, '') else c['meta']['lon']
    tz = loc.get('tz') or c['meta']['input'].get('tz') or places.tz_for(lat, lon)
    return lat, lon, tz, loc.get('label') or c['meta']['place']


def _transit_response(d, c, jd):
    lat, lon, tz, label = _loc(d, c)
    cfg = parse_cfg(d.get('cfg'))
    s = transit.snapshot(c, jd)
    off = core.offset_for_jd(jd, tz)
    s['when'] = core.fmt_local(jd, off, secs=False)
    s['when_iso'] = core.fmt_local(jd, off, secs=True).replace(' ', 'T')
    tc = core.build_chart({'jd': jd, 'tz_offset': off, 'lat': lat, 'lon': lon, 'name': 'Transit', 'place': label, 'tz': tz}, cfg)
    s['chart'] = chart_view(tc, with_strength=False)
    s['loc'] = {'lat': lat, 'lon': lon, 'tz': tz, 'label': label, 'utc_offset': off}
    s['transit_lagna'] = {'sign': SIGNS[tc['asc']['sign']], 'dms': core.dms(tc['asc']['deg'])}
    return s


@route('/api/transit')
def api_transit():
    try:
        d = request.get_json()
        c = get_chart(d)
        lat, lon, tz, label = _loc(d, c)
        jd, dt = _now_jd(tz, d.get('when'))
        return jsonify(_transit_response(d, c, jd))
    except Exception as e:
        return err(e)


@route('/api/transit/signtimes')
def api_signtimes():
    """Time for one transiting body (or the lagna) to enter the next and the previous sign."""
    try:
        d = request.get_json()
        c = get_chart(d)
        lat, lon, tz, label = _loc(d, c)
        jd, dt = _now_jd(tz, d.get('when'))
        body = d['body']
        if body not in movetools.BODIES:
            raise ValueError('Unknown body')
        cfg = parse_cfg(d.get('cfg'))
        with core.LOCK:
            core.set_ayanamsa(cfg['ayanamsa'])
            r = movetools.sign_times(body, jd, cfg, lat, lon, tz)
        r['body'] = body
        return jsonify(r)
    except Exception as e:
        return err(e)


@route('/api/transit/move')
def api_transit_move():
    """Move a transiting body or the lagna to a chosen sign and degree; return all transits at the moment it gets there."""
    try:
        d = request.get_json()
        c = get_chart(d)
        lat, lon, tz, label = _loc(d, c)
        jd, dt = _now_jd(tz, d.get('when'))
        body = d['body']
        if body not in movetools.BODIES:
            raise ValueError('Unknown body')
        sign = int(d['sign']); deg = float(d['deg'])
        if not (0 <= sign <= 11 and 0 <= deg < 30):
            raise ValueError('Sign must be 0-11 and degree 0 to under 30')
        cfg = parse_cfg(d.get('cfg'))
        target = sign * 30 + deg
        ev = movetools.find_reach(body, target, jd, cfg, lat, lon, tz, d.get('direction', 'next'))
        if ev is None:
            raise ValueError(f'{body} does not reach {SIGNS[sign]} {core.dms(deg)} within the search window ' +
                             f'({movetools.REACH_HORIZON[body]} days {"after" if d.get("direction", "next") == "next" else "before"} this time)')
        s = _transit_response(d, c, ev['jd'])
        ev.update({'body': body, 'sign': SIGNS[sign], 'deg': core.dms(deg), 'from_when': core.fmt_local(jd, core.offset_for_jd(jd, tz), secs=False)})
        s['moved'] = ev
        return jsonify(s)
    except Exception as e:
        return err(e)


@route('/api/transit/calendar')
def api_tcal():
    try:
        d = request.get_json()
        c = get_chart(d)
        lat, lon, tz, label = _loc(d, c)
        jd, dt = _now_jd(tz, d.get('from'))
        months = int(d.get('months', 24))
        cal = transit.calendar(c, jd, jd + months * 30.4375, tz)
        for segs in cal['segments'].values():
            for s in segs:
                s['start_jd'] = fnum(s['start_jd'], 4); s['end_jd'] = fnum(s['end_jd'], 4)
        return jsonify(cal)
    except Exception as e:
        return err(e)


@route('/api/kp')
def api_kp():
    try:
        d = request.get_json()
        c = get_chart(d)
        t = kp.kp_table(c, int(d.get('depth', 5)))
        for r in t['rows']:
            r['lon'] = fnum(r['lon'])
        return jsonify(t)
    except Exception as e:
        return err(e)


def _annual_view(res):
    c = res['chart']
    out = {k: v for k, v in res.items() if k != 'chart'}
    out['chart'] = chart_view(c, with_strength=False)
    return out


@route('/api/varsha')
def api_varsha():
    try:
        d = request.get_json()
        c = get_chart(d)
        if d.get('age') in (None, ''):
            tz = d.get('tz') or c['meta']['input'].get('tz')
            _, dt = _now_jd(tz)
            age = dt.year - c['meta']['input']['year']
        else:
            age = int(d['age'])
        r = tajaka.varshaphala(c, age, d.get('annual_tz') or None, _opt(d.get('lat')), _opt(d.get('lon')))
        out = _annual_view(r)
        for k in ('harsha_bala', 'pancha_vargeeya'):
            out[k] = {p: {a: (fnum(b, 2) if isinstance(b, float) else b) for a, b in x.items()} for p, x in r[k].items()}
        return jsonify(out)
    except Exception as e:
        return err(e)


@route('/api/tp')
def api_tp():
    try:
        d = request.get_json()
        c = get_chart(d)
        if d.get('age') in (None, ''):
            tz = d.get('tz') or c['meta']['input'].get('tz')
            _, dt = _now_jd(tz)
            age = dt.year - c['meta']['input']['year']
        else:
            age = int(d['age'])
        r = tajaka.tithi_pravesha(c, age, d.get('annual_tz') or None, _opt(d.get('lat')), _opt(d.get('lon')))
        return jsonify(_annual_view(r))
    except Exception as e:
        return err(e)


def _opt(x):
    return None if x in (None, '') else float(x)


@route('/api/prasna')
def api_prasna():
    try:
        d = request.get_json()
        mode = int(d.get('mode', 108))
        n = int(d['number'])
        res = prasna.from_108(n) if mode == 108 else prasna.from_249(n)
        out = {'mode': mode, 'lagna': res}
        if d.get('birth'):
            c = get_chart(d)
            asc = res['rasi_idx']
            pl = {p['name']: p['sign'] for p in c['planets']}
            out['chart'] = {'asc': asc, 'planets': pl, 'degs': {p['name']: fnum(p['deg']) for p in c['planets']},
                            'when': c['meta']['local'], 'place': c['meta']['place'],
                            'houses': {p['name']: (p['sign'] - asc) % 12 + 1 for p in c['planets']}}
            nav = core.varga_sign(res['lagna_lon'] + 0.01, 9)
            out['chart']['navamsa'] = {'asc': nav, 'planets': {p['name']: core.varga_sign(p['lon'], 9) for p in c['planets']},
                                       'degs': {p['name']: fnum(core.varga_deg(p['lon'], 9)) for p in c['planets']}}
        return jsonify(out)
    except Exception as e:
        return err(e)


