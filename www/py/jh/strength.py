"""Strengths: Ashtakavarga (BAV/SAV), Shadbala, Vimsopaka bala, Avasthas."""
import math

import swisseph as swe

from .consts import *
from . import core
from .core import (norm, sign_of, compound_rel, varga_sign, varga_chart, sid_lon, last_sankranti, jd_to_local)

# ------------------------------------------------------------------ Ashtakavarga (BPHS)
_BAV = {
    'Sun':     {'Sun': [1,2,4,7,8,9,10,11], 'Moon': [3,6,10,11], 'Mars': [1,2,4,7,8,9,10,11], 'Mercury': [3,5,6,9,10,11,12], 'Jupiter': [5,6,9,11], 'Venus': [6,7,12], 'Saturn': [1,2,4,7,8,9,10,11], 'Lagna': [3,4,6,10,11,12]},
    'Moon':    {'Sun': [3,6,7,8,10,11], 'Moon': [1,3,6,7,10,11], 'Mars': [2,3,5,6,9,10,11], 'Mercury': [1,3,4,5,7,8,10,11], 'Jupiter': [1,4,7,8,10,11,12], 'Venus': [3,4,5,7,9,10,11], 'Saturn': [3,5,6,11], 'Lagna': [3,6,10,11]},
    'Mars':    {'Sun': [3,5,6,10,11], 'Moon': [3,6,11], 'Mars': [1,2,4,7,8,10,11], 'Mercury': [3,5,6,11], 'Jupiter': [6,10,11,12], 'Venus': [6,8,11,12], 'Saturn': [1,4,7,8,9,10,11], 'Lagna': [1,3,6,10,11]},
    'Mercury': {'Sun': [5,6,9,11,12], 'Moon': [2,4,6,8,10,11], 'Mars': [1,2,4,7,8,9,10,11], 'Mercury': [1,3,5,6,9,10,11,12], 'Jupiter': [6,8,11,12], 'Venus': [1,2,3,4,5,8,9,11], 'Saturn': [1,2,4,7,8,9,10,11], 'Lagna': [1,2,4,6,8,10,11]},
    'Jupiter': {'Sun': [1,2,3,4,7,8,9,10,11], 'Moon': [2,5,7,9,11], 'Mars': [1,2,4,7,8,10,11], 'Mercury': [1,2,4,5,6,9,10,11], 'Jupiter': [1,2,3,4,7,8,10,11], 'Venus': [2,5,6,9,10,11], 'Saturn': [3,5,6,12], 'Lagna': [1,2,4,5,6,7,9,10,11]},
    'Venus':   {'Sun': [8,11,12], 'Moon': [1,2,3,4,5,8,9,11,12], 'Mars': [3,5,6,9,11,12], 'Mercury': [3,5,6,9,11], 'Jupiter': [5,8,9,10,11], 'Venus': [1,2,3,4,5,8,9,10,11], 'Saturn': [3,4,5,8,9,10,11], 'Lagna': [1,2,3,4,5,8,9,11]},
    'Saturn':  {'Sun': [1,2,4,7,8,10,11], 'Moon': [3,6,11], 'Mars': [3,5,6,10,11,12], 'Mercury': [6,8,9,10,11,12], 'Jupiter': [5,6,11,12], 'Venus': [6,11,12], 'Saturn': [3,5,6,11], 'Lagna': [1,3,4,6,10,11]},
}
BAV_TOTALS = {'Sun': 48, 'Moon': 49, 'Mars': 39, 'Mercury': 54, 'Jupiter': 56, 'Venus': 52, 'Saturn': 39}


def ashtakavarga(psigns, asc_sign):
    """psigns: planet -> sign index. Returns bav (planet->12 bindus), sav (12), totals, and per-planet contributor detail."""
    pos = {p: psigns[p] for p in SEVEN}
    pos['Lagna'] = asc_sign
    bav = {}
    for target, rules in _BAV.items():
        row = [0] * 12
        for giver, houses in rules.items():
            g = pos[giver]
            for h in houses:
                row[(g + h - 1) % 12] += 1
        bav[target] = row
    sav = [sum(bav[p][s] for p in SEVEN) for s in range(12)]
    return {'bav': bav, 'sav': sav, 'bav_total': {p: sum(v) for p, v in bav.items()}, 'sav_total': sum(sav)}


# ------------------------------------------------------------------ helpers
SAPTA = [1, 2, 3, 7, 9, 12, 30]
_SAPTA_PTS = {'moolatrikona': 45, 'own': 30, 'adhimitra': 22.5, 'mitra': 15, 'sama': 7.5, 'satru': 3.75, 'adhisatru': 1.875}
_VIM_PTS = {'own': 20, 'adhimitra': 18, 'mitra': 15, 'sama': 10, 'satru': 7, 'adhisatru': 5}
NAISARGIKA = {'Sun': 60, 'Moon': 51.43, 'Venus': 42.85, 'Jupiter': 34.28, 'Mercury': 25.71, 'Mars': 17.14, 'Saturn': 8.57}
REQUIRED = {'Sun': 390, 'Moon': 360, 'Mars': 300, 'Mercury': 420, 'Jupiter': 390, 'Venus': 330, 'Saturn': 300}
BENEFIC = ['Jupiter', 'Venus', 'Mercury']


def _rel_to_sign_lord(p, sign, signs):
    lord = SIGN_LORD[sign]
    if lord == p:
        return 'own'
    return compound_rel(p, lord, signs)


def _dist(a, b):
    d = abs(norm(a) - norm(b))
    return 360 - d if d > 180 else d


def _aspect_value(d, planet):
    """Sphuta drishti (virupas) of `planet` onto a body d degrees ahead of it."""
    if d < 30:
        v = 0.0
    elif d < 60:
        v = (d - 30) / 2
    elif d < 90:
        v = d - 45
    elif d < 120:
        v = 30 + (120 - d) / 2
    elif d < 150:
        v = 150 - d
    elif d < 180:
        v = 2 * (d - 150)
    elif d < 300:
        v = (300 - d) / 2
    else:
        v = 0.0
    if planet == 'Mars' and (90 <= d < 120 or 210 <= d < 240):
        v = 60.0
    if planet == 'Jupiter' and (120 <= d < 150 or 240 <= d < 270):
        v = 60.0
    if planet == 'Saturn' and (60 <= d < 90 or 270 <= d < 300):
        v = 60.0
    return v


# ------------------------------------------------------------------ Shadbala
def shadbala(chart):
    cfg = chart['meta']['cfg']
    jd = chart['meta']['jd']
    off = chart['meta']['tz_offset']
    pm = chart['pmap']
    signs = chart['signs']
    asc = chart['asc']['lon']
    mc = chart['mc']
    asc_sign = chart['asc']['sign']
    day = chart['day']
    ay = chart['meta']['ayanamsa_value']
    sun, moon = pm['Sun']['lon'], pm['Moon']['lon']
    T = (jd - 2451545.0) / 36525.0

    # time-based pieces
    noon = (day['sr'] + day['ss']) / 2.0
    d_noon = abs((((jd - noon) * 24.0) + 12.0) % 24.0 - 12.0)       # hours from local noon (0..12)
    diurnal = 60.0 * (12.0 - d_noon) / 12.0
    elong = norm(moon - sun)
    is_day = day['sr'] <= jd < day['ss']
    if is_day:
        third = min(int((jd - day['sr']) / (day['ss'] - day['sr']) * 3), 2)
        trib_lord = ['Mercury', 'Sun', 'Saturn'][third]
    else:
        third = min(int((jd - day['ss']) / (day['next_sr'] - day['ss']) * 3), 2)
        trib_lord = ['Moon', 'Venus', 'Mars'][third]
    year_start = last_sankranti(jd, cfg, month=False)
    month_start = last_sankranti(jd, cfg, month=True)
    def wk_lord(t):
        civil = math.floor(t + off / 24.0 + 0.5)
        return VARA_LORDS[(int(civil) + 1) % 7]
    abda_lord, masa_lord = wk_lord(year_start), wk_lord(month_start)
    vara_lord = VARA_LORDS[day['vara']]
    from .panchanga import hora_at
    hr = hora_at(jd, day)
    hora_lord = hr['lord'] if hr else None

    # Mean longitudes (tropical) for cheshta kendra
    L0 = norm(280.46646 + 36000.76983 * T)
    LP = {'Mercury': norm(252.250906 + 149472.674635 * T), 'Venus': norm(181.979801 + 58517.815676 * T),
          'Mars': norm(355.433275 + 19140.299314 * T), 'Jupiter': norm(34.351484 + 3034.905674 * T),
          'Saturn': norm(50.077471 + 1222.113794 * T)}

    weakest = {'Jupiter': asc + 180, 'Mercury': asc + 180, 'Sun': mc + 180, 'Mars': mc + 180,
               'Saturn': asc, 'Moon': mc, 'Venus': mc}
    malefic_now = {'Sun', 'Mars', 'Saturn'}
    waxing = elong < 180

    def benefic_for_aspect(p):
        if p in BENEFIC:
            return True
        if p == 'Moon':
            return waxing
        return False

    res = {}
    for p in SEVEN:
        rec = pm[p]
        lon = rec['lon']
        sg, deg = rec['sign'], rec['deg']
        # --- Sthana
        uccha = _dist(lon, DEBIL_POINT[p]) / 3.0
        sv = 0.0
        sv_detail = {}
        for n in SAPTA:
            vs = varga_sign(lon, n)
            if n == 1 and MOOLATRIKONA[p][0] == vs and MOOLATRIKONA[p][1] <= deg < MOOLATRIKONA[p][2]:
                pts = 45.0
            else:
                pts = _SAPTA_PTS[_rel_to_sign_lord(p, vs, signs)]
            sv += pts
            sv_detail[n] = pts
        odd_rasi = sg % 2 == 0
        nav = varga_sign(lon, 9)
        odd_nav = nav % 2 == 0
        ojayugma = 0.0
        if p in ('Moon', 'Venus'):
            ojayugma += 15 if not odd_rasi else 0
            ojayugma += 15 if not odd_nav else 0
        else:
            ojayugma += 15 if odd_rasi else 0
            ojayugma += 15 if odd_nav else 0
        h = (sg - asc_sign) % 12 + 1
        kendradi = 60.0 if h in (1, 4, 7, 10) else 30.0 if h in (2, 5, 8, 11) else 15.0
        dr = int(deg // 10)
        drek = 0.0
        if (p in ('Sun', 'Mars', 'Jupiter') and dr == 0) or (p in ('Mercury', 'Saturn') and dr == 1) or (p in ('Moon', 'Venus') and dr == 2):
            drek = 15.0
        sthana = uccha + sv + ojayugma + kendradi + drek
        # --- Dig
        dig = _dist(lon, weakest[p]) / 3.0
        # --- Kala
        if p == 'Mercury':
            nat = 60.0
        elif p in ('Sun', 'Jupiter', 'Venus'):
            nat = diurnal
        else:
            nat = 60.0 - diurnal
        # Paksha: angular distance of Moon from Sun /3 (full Moon = 60); benefics + Moon get it, malefics get the complement
        pk = (elong / 3.0 if elong <= 180 else (360 - elong) / 3.0)
        pk = pk if (p in BENEFIC or p == 'Moon') else 60.0 - pk
        trib = 60.0 if (p == 'Jupiter' or p == trib_lord) else 0.0
        abda = 15.0 if p == abda_lord else 0.0
        masa = 30.0 if p == masa_lord else 0.0
        vara = 45.0 if p == vara_lord else 0.0
        hora = 60.0 if p == hora_lord else 0.0
        decl = rec['decl']
        if p in ('Moon', 'Saturn'):
            ayana = (23.45 - decl) / 46.9 * 60.0
        else:
            ayana = (23.45 + decl) / 46.9 * 60.0
        ayana = max(0.0, min(60.0, ayana))
        if p == 'Sun':
            ayana = min(120.0, ayana * 2)
        kala = nat + pk + trib + abda + masa + vara + hora + ayana
        # --- Cheshta
        if p == 'Sun':
            ch = ayana
        elif p == 'Moon':
            ch = pk
        else:
            true_trop = norm(lon + ay)
            if p in ('Mars', 'Jupiter', 'Saturn'):
                madhya, seeghra = LP[p], L0
            else:
                madhya, seeghra = L0, LP[p]
            dd = ((true_trop - madhya + 180) % 360) - 180
            mid = norm(madhya + dd / 2.0)
            ch = _dist(seeghra, mid) / 3.0
        nais = NAISARGIKA[p]
        # --- Drik
        drik = 0.0
        for q in SEVEN:
            if q == p:
                continue
            d = norm(pm[p]['lon'] - pm[q]['lon'])    # q looks at p: distance from q forward to p
            v = _aspect_value(d, q)
            if benefic_for_aspect(q):
                drik += v
            else:
                drik -= v
        drik /= 4.0
        total = sthana + dig + kala + ch + nais + drik
        ishta = math.sqrt(max(uccha, 0) * max(ch, 0))
        kashta = math.sqrt(max(60 - uccha, 0) * max(60 - min(ch, 60), 0))
        res[p] = {
            'uccha': uccha, 'saptavargaja': sv, 'ojayugma': ojayugma, 'kendradi': kendradi, 'drekkana': drek, 'sthana': sthana,
            'dig': dig, 'nathonnata': nat, 'paksha': pk, 'tribhaga': trib, 'abda': abda, 'masa': masa, 'vara': vara, 'hora': hora,
            'ayana': ayana, 'kala': kala, 'cheshta': ch, 'naisargika': nais, 'drik': drik, 'total': total,
            'rupas': total / 60.0, 'required': REQUIRED[p] / 60.0, 'ratio': total / REQUIRED[p],
            'ishta': ishta, 'kashta': kashta,
        }
    ranked = sorted(SEVEN, key=lambda x: -res[x]['ratio'])
    for i, p in enumerate(ranked):
        res[p]['rank'] = i + 1
    return {'planets': res, 'order': SEVEN,
            'notes': {'year_lord': abda_lord, 'month_lord': masa_lord, 'vara_lord': vara_lord, 'hora_lord': hora_lord, 'tribhaga_lord': trib_lord}}


# ------------------------------------------------------------------ Vimsopaka
VIM_GROUPS = {
    'shadvarga': {1: 6, 2: 2, 3: 4, 9: 5, 12: 2, 30: 1},
    'saptavarga': {1: 5, 2: 2, 3: 3, 7: 2.5, 9: 4.5, 12: 2, 30: 1},
    'dasavarga': {1: 3, 2: 1.5, 3: 1.5, 7: 1.5, 9: 1.5, 10: 1.5, 12: 1.5, 16: 1.5, 30: 1.5, 60: 5},
    'shodasavarga': {1: 3.5, 2: 1, 3: 1, 4: 0.5, 7: 0.5, 9: 3, 10: 0.5, 12: 0.5, 16: 2, 20: 0.5, 24: 0.5, 27: 0.5, 30: 1, 40: 0.5, 45: 0.5, 60: 4},
}


def vimsopaka(chart):
    signs = chart['signs']
    out = {}
    for gname, weights in VIM_GROUPS.items():
        out[gname] = {}
        for p in SEVEN:
            score = 0.0
            for n, w in weights.items():
                vs = varga_sign(chart['pmap'][p]['lon'], n)
                if vs in OWN_SIGNS[p] or EXALT_SIGN[p] == vs:
                    pts = 20
                else:
                    pts = _VIM_PTS[_rel_to_sign_lord(p, vs, signs)]
                score += pts * w
            out[gname][p] = round(score / 20.0, 2)
    return out


# ------------------------------------------------------------------ Avasthas
BALADI = ['Bala (infant)', 'Kumara (youth)', 'Yuva (adult)', 'Vriddha (old)', 'Mrita (dead)']


def avasthas(chart):
    pm = chart['pmap']
    signs = chart['signs']
    sun = pm['Sun']['lon']
    res = {}
    malefics = ['Sun', 'Mars', 'Saturn', 'Rahu', 'Ketu']
    for p in SEVEN:
        rec = pm[p]
        sg, deg = rec['sign'], rec['deg']
        odd = sg % 2 == 0
        part = min(int(deg // 6), 4)
        age = BALADI[part] if odd else BALADI[4 - part]
        # alertness
        if sg in OWN_SIGNS[p] or EXALT_SIGN[p] == sg:
            alert = 'Jagrat (awake)'
        elif (EXALT_SIGN[p] + 6) % 12 == sg:
            alert = 'Sushupti (asleep)'
        else:
            rel = _rel_to_sign_lord(p, sg, signs)
            alert = 'Swapna (dreaming)' if rel in ('adhimitra', 'mitra', 'sama') else 'Sushupti (asleep)'
        # mood
        rel = _rel_to_sign_lord(p, sg, signs) if not (sg in OWN_SIGNS[p]) else 'own'
        with_malefic = any(pm[q]['sign'] == sg for q in malefics if q != p)
        if rec['combust'] and p != 'Sun':
            mood = 'Kopa (angry, combust)'
        elif EXALT_SIGN[p] == sg:
            mood = 'Deepta (radiant, exalted)'
        elif (EXALT_SIGN[p] + 6) % 12 == sg:
            mood = 'Khala (wicked, debilitated)'
        elif rel == 'own':
            mood = 'Swastha (self-assured, own sign)'
        elif with_malefic:
            mood = 'Vikala (crippled, with malefic)'
        elif rel == 'adhimitra':
            mood = 'Mudita (delighted, great friend sign)'
        elif rel == 'mitra':
            mood = 'Shanta (peaceful, friend sign)'
        elif rel == 'sama':
            mood = 'Dina (humble, neutral sign)'
        else:
            mood = 'Dukhita (distressed, enemy sign)'
        res[p] = {'age': age, 'alertness': alert, 'mood': mood}
    return res
