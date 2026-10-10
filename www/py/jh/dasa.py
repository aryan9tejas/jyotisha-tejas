"""Vimsottari dasa (maha, antar, pratyantar, sookshma, prana) and lookup at a date."""
from .consts import *
from .core import fmt_local, jd_to_local, DEFAULT_CFG

LEVEL_NAMES = ['Mahadasa', 'Antardasa', 'Pratyantardasa', 'Sookshma', 'Prana', 'Deha']


def sub_periods(lord, start, dur):
    i0 = VIM_ORDER.index(lord)
    t = start
    out = []
    for k in range(9):
        L = VIM_ORDER[(i0 + k) % 9]
        d = dur * VIM_YEARS[L] / 120.0
        out.append({'lord': L, 'start': t, 'end': t + d})
        t += d
    return out


def vimsottari_mds(chart):
    cfg = chart['meta']['cfg']
    yd = cfg.get('year_days', 365.2425)
    moon = chart['pmap']['Moon']['lon']
    idx = int(moon // NAK_SPAN)
    lord = NAK_LORD[idx]
    elapsed = (moon % NAK_SPAN) / NAK_SPAN
    t = chart['meta']['jd'] - elapsed * VIM_YEARS[lord] * yd
    mds = []
    i0 = VIM_ORDER.index(lord)
    for i in range(9):
        L = VIM_ORDER[(i0 + i) % 9]
        d = VIM_YEARS[L] * yd
        mds.append({'lord': L, 'start': t, 'end': t + d})
        t += d
    balance = VIM_YEARS[lord] * (1 - elapsed)
    return mds, lord, balance


def _d(jd, off):
    return fmt_local(jd, off, False)[:10]


def vimsottari(chart, depth=3):
    off = chart['meta']['tz_offset']
    mds, lord, bal = vimsottari_mds(chart)

    def build(periods, level):
        rows = []
        for p in periods:
            row = {'lord': p['lord'], 'start': _d(p['start'], off), 'end': _d(p['end'], off),
                   'start_jd': p['start'], 'end_jd': p['end']}
            if level < depth:
                row['sub'] = build(sub_periods(p['lord'], p['start'], p['end'] - p['start']), level + 1)
            rows.append(row)
        return rows

    tree = build(mds, 1)
    # level 1 starts before birth: flag current at birth
    b = chart['meta']['jd']
    return {'moon_nakshatra': NAKSHATRAS[int(chart['pmap']['Moon']['lon'] // NAK_SPAN)], 'start_lord': lord,
            'balance_years': round(bal, 4), 'balance_ymd': _ymd(bal), 'periods': tree, 'birth_jd': b,
            'year_days': chart['meta']['cfg'].get('year_days', 365.2425)}


def _ymd(years):
    y = int(years)
    r = (years - y) * 12
    m = int(r)
    d = int(round((r - m) * 30))
    return f'{y}y {m}m {d}d'


def dasa_at(chart, jd, depth=5):
    off = chart['meta']['tz_offset']
    mds, _, _ = vimsottari_mds(chart)
    periods = mds
    path = []
    for lvl in range(depth):
        hit = None
        for p in periods:
            if p['start'] <= jd < p['end']:
                hit = p
                break
        if hit is None:
            return path
        path.append({'level': LEVEL_NAMES[lvl], 'lord': hit['lord'], 'start': fmt_local(hit['start'], off, False), 'end': fmt_local(hit['end'], off, False)})
        periods = sub_periods(hit['lord'], hit['start'], hit['end'] - hit['start'])
    return path
