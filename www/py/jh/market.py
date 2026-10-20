"""Market view: a transit-based reading of benefic and malefic planetary influence on financial markets.

Layers
  1. Rules: each rule tests the sky (conjunctions, dignity, combustion, retrogression, stations, eclipses, Sarvatobhadra
     vedha ...) and adds a signed contribution = polarity x weight x strength. Weights are editable (defaults here).
  2. Sectors: planetary significations plus sign themes plus Sarvatobhadra sign squares give a favoured or pressured tone.
  3. Optional reference chart of a market (Nifty, S&P 500 ...): transits are read against that chart's houses and planets.
  4. Ahead: the next ingresses, stations and eclipses.
The Moon is deliberately left out of the score (it changes sign every two to three days and has no record as a driver).
These are traditional rules. They have not been tested against price history.
"""
import math

import swisseph as swe

from .consts import *
from . import core
from . import panchanga as PN
from . import dasa
from .core import LOCK, DEFAULT_CFG, norm, planet_pos, sid_lon, tz_offset_hours, fmt_local, day_bounds

BODIES = ['Sun', 'Mercury', 'Venus', 'Mars', 'Jupiter', 'Saturn', 'Rahu', 'Ketu']
MAL = {'Saturn', 'Mars', 'Rahu', 'Ketu'}
BEN = {'Jupiter', 'Venus', 'Mercury'}
SBC_MAL = {'Sun', 'Mars', 'Saturn', 'Rahu', 'Ketu'}
SBC_BEN = {'Jupiter', 'Venus', 'Mercury'}
WATER = {3, 7, 11}
NORM_DEFAULT = 30.0

SECTORS = ['Banks & NBFC', 'Insurance', 'Fintech & Crypto', 'IT & Software', 'AI & Semiconductors', 'Telecom & Media', 'Defence',
           'Real estate', 'Metals & Mining', 'Oil, Gas & Energy', 'Power & Renewables', 'Infrastructure & Cables', 'Capital goods',
           'Chemicals', 'Pharma & Healthcare', 'Auto', 'FMCG & Agri', 'Luxury & Retail', 'Gold & Precious', 'PSU & Government',
           'Aviation, Travel & Shipping']

# planet -> {sector: share}. Natural significations (karakatwa) from Parashara, extended to listed sectors by market-astrology convention.
SIG = {
    'Sun': {'PSU & Government': 1, 'Power & Renewables': 1, 'Gold & Precious': .7, 'Pharma & Healthcare': .4},
    'Mercury': {'IT & Software': 1, 'Telecom & Media': 1, 'Fintech & Crypto': .7, 'Banks & NBFC': .7, 'Insurance': .4},
    'Venus': {'Auto': 1, 'FMCG & Agri': .6, 'Luxury & Retail': 1, 'Telecom & Media': .5, 'Chemicals': .4, 'Gold & Precious': .5},
    'Mars': {'Defence': 1, 'Real estate': 1, 'Metals & Mining': 1, 'Oil, Gas & Energy': .8, 'Capital goods': .5, 'Power & Renewables': .4},
    'Jupiter': {'Banks & NBFC': 1, 'Insurance': .6, 'Gold & Precious': .7, 'Pharma & Healthcare': .5, 'Fintech & Crypto': .4},
    'Saturn': {'Infrastructure & Cables': 1, 'Oil, Gas & Energy': .8, 'Metals & Mining': .7, 'PSU & Government': .5, 'Capital goods': .8, 'Real estate': .4},
}
# nodes make their sectors volatile (neither up nor down)
NODE_SIG = {
    'Rahu': ['IT & Software', 'AI & Semiconductors', 'Fintech & Crypto', 'Aviation, Travel & Shipping', 'Chemicals', 'Telecom & Media'],
    'Ketu': ['Pharma & Healthcare', 'Chemicals', 'Metals & Mining', 'AI & Semiconductors'],
}
SIGN_SECT = {
    0: ['Defence', 'Metals & Mining', 'Oil, Gas & Energy'], 1: ['Banks & NBFC', 'FMCG & Agri', 'Luxury & Retail', 'Gold & Precious'],
    2: ['IT & Software', 'Telecom & Media', 'Fintech & Crypto'], 3: ['Banks & NBFC', 'Real estate', 'FMCG & Agri'],
    4: ['PSU & Government', 'Power & Renewables', 'Gold & Precious'], 5: ['Pharma & Healthcare', 'IT & Software', 'Chemicals'],
    6: ['Luxury & Retail', 'Auto', 'Fintech & Crypto'], 7: ['Insurance', 'Chemicals', 'Metals & Mining', 'Defence'],
    8: ['Banks & NBFC', 'Aviation, Travel & Shipping', 'Capital goods'], 9: ['Infrastructure & Cables', 'PSU & Government', 'Real estate', 'Metals & Mining'],
    10: ['IT & Software', 'AI & Semiconductors', 'Telecom & Media', 'Power & Renewables'],
    11: ['Pharma & Healthcare', 'Oil, Gas & Energy', 'Chemicals', 'Aviation, Travel & Shipping'],
}
TONE = {'Jupiter': 0.45, 'Venus': 0.25, 'Mercury': 0.2, 'Sun': 0.1, 'Saturn': -0.3}
PLANET_SW = {'Sun': .6, 'Mercury': 1, 'Venus': .8, 'Mars': 1, 'Jupiter': 1, 'Saturn': 1}

# ---------------------------------------------------------------- Sarvatobhadra Chakra (nakshatra squares from the published grid)
_TOP = ['Dhanishta', 'Shatabhisha', 'Purva Bhadrapada', 'Uttara Bhadrapada', 'Revati', 'Ashwini', 'Bharani']
_RIGHT = ['Krittika', 'Rohini', 'Mrigashira', 'Ardra', 'Punarvasu', 'Pushya', 'Ashlesha']
_BOTTOM = ['Vishakha', 'Swati', 'Chitra', 'Hasta', 'Uttara Phalguni', 'Purva Phalguni', 'Magha']
_LEFT = ['Shravana', 'Abhijit', 'Uttara Ashadha', 'Purva Ashadha', 'Mula', 'Jyeshtha', 'Anuradha']
SBC_NAK = {}
for _i, _n in enumerate(_TOP):
    SBC_NAK[_n] = (0, 1 + _i)
for _i, _n in enumerate(_RIGHT):
    SBC_NAK[_n] = (1 + _i, 8)
for _i, _n in enumerate(_BOTTOM):
    SBC_NAK[_n] = (8, 1 + _i)
for _i, _n in enumerate(_LEFT):
    SBC_NAK[_n] = (1 + _i, 0)
SBC_SIGN = {10: (2, 3), 11: (2, 4), 0: (2, 5), 1: (3, 6), 2: (4, 6), 3: (5, 6), 4: (6, 5), 5: (6, 4), 6: (6, 3), 7: (5, 2), 8: (4, 2), 9: (3, 2)}
SBC_VARA = {5: (3, 4), 4: (4, 3), 6: (4, 4), 0: (4, 5), 2: (4, 5), 1: (5, 4), 3: (5, 4)}      # weekday index 0=Sunday
VARA_NAME = ['Sunday', 'Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday']
ABHIJIT = (276 + 40 / 60.0, 280 + 53.333 / 60.0)


def _sbc_cell(lon):
    lon = norm(lon)
    if ABHIJIT[0] <= lon < ABHIJIT[1]:
        return 'Abhijit', SBC_NAK['Abhijit']
    n = NAKSHATRAS[int(lon // NAK_SPAN)]
    return n, SBC_NAK[n]


def _lines(rc):
    """Squares on the same row, column and both diagonals of a square (the straight and crossward vedha lines)."""
    r, c = rc
    out = set()
    for k in range(9):
        out.add((r, k)); out.add((k, c))
        if 0 <= r + (k - c) < 9:
            out.add((r + (k - c), k))
        if 0 <= r - (k - c) < 9:
            out.add((r - (k - c), k))
    return out


# ---------------------------------------------------------------- rule table: id, group, title, default weight, polarity, basis, rationale
def _R(i, g, t, w, pol, basis, why):
    return {'id': i, 'group': g, 'title': t, 'w': w, 'pol': pol, 'basis': basis, 'why': why}


C, P_ = 'Classical', 'Market-astrology convention'
RULES = [
    # malefic combinations
    _R('shrapit', 'Malefic combinations', 'Saturn with Rahu (Shrapit)', 8, -1, C, 'Saturn restricts and Rahu inflates and distorts. Together within about 10 degrees they bring structural fear and shocks. Parashara treats both as natural malefics, and the Shrapit combination is a standard affliction.'),
    _R('saturn_ketu', 'Malefic combinations', 'Saturn with Ketu', 5, -1, C, 'Saturn (contraction) joined with Ketu (sudden cuts and detachment) points to abrupt contraction. Both are natural malefics.'),
    _R('angarak', 'Malefic combinations', 'Mars with Rahu (Angarak)', 7, -1, C, 'Mars (aggression, leverage) with Rahu (speculation, panic) gives aggressive speculation followed by violent reversals. Angarak yoga is a recognised affliction.'),
    _R('mars_ketu', 'Malefic combinations', 'Mars with Ketu', 4, -1, C, 'Mars with Ketu gives sudden, impulsive cuts and accidents. Two natural malefics together.'),
    _R('mars_saturn', 'Malefic combinations', 'Mars and Saturn in conjunction, opposition or square', 7, -1, C, 'Mars and Saturn are natural enemies. Their hard contacts (conjunction strongest, then opposition, then square) are classic indicators of conflict, accidents and market stress.'),
    _R('sun_saturn', 'Malefic combinations', 'Sun and Saturn in conjunction or opposition', 3, -1, C, 'Sun (authority, government) against Saturn (restriction) is a natural enmity. Read as policy friction and caution in government-linked areas.'),
    _R('guru_chandal', 'Malefic combinations', 'Jupiter with Rahu (Guru Chandala)', 7, -1, C, 'Rahu dilutes Jupiter, the planet of liquidity, optimism and sound judgement, so excess optimism turns into bubbles. A named classical yoga.'),
    _R('jup_sat_hard', 'Malefic combinations', 'Jupiter and Saturn in conjunction, opposition or square', 4, -1, P_, 'Expansion (Jupiter) meets contraction (Saturn). Mundane astrologers tie their cycle to the boom-bust rhythm and treat the hard contacts as turning points.'),
    _R('jup_sat_soft', 'Benefic support', 'Jupiter and Saturn in trine or sextile', 2, 1, P_, 'The two heavy planets cooperate. Expansion is disciplined rather than opposed, a steadier backdrop.'),
    _R('eclipse', 'Malefic combinations', 'Eclipse within about two weeks', 6, -1, P_, 'Eclipses add the nodal axis to the luminaries. Practitioners watch for volatility in the weeks around them, strongest right at the eclipse. Dates are a geometric estimate from node distance.'),
    _R('nodes_ts', 'Malefic combinations', 'Rahu-Ketu axis on Taurus-Scorpio', 2, -1, P_, 'Taurus and Scorpio govern wealth, banking, debt and sudden transformation. The nodes on this axis stress those themes.'),
    _R('saturn_water', 'Malefic combinations', 'Saturn in a water sign (Cancer, Scorpio, Pisces)', 1.5, -1, P_, 'Water signs stand for sentiment, liquidity and hidden debt. Saturn there brings fear and tight liquidity.'),
    _R('kala_sarpa', 'Malefic combinations', 'Kala Sarpa (all planets between the nodes)', 4, -1, C, 'When Sun, Mercury, Venus, Mars, Jupiter and Saturn all lie on one side of the Rahu-Ketu axis, classical texts call it Kala Sarpa, a pressured period.'),
    _R('stellium', 'Malefic combinations', 'Three or more planets in one sign', 3, -1, P_, 'Heavy clustering concentrates energy in one sign theme, creating a pressure point.'),
    # planet strength
    _R('dig_jupiter_debil', 'Planet strength', 'Jupiter debilitated (Capricorn)', 7, -1, C, 'Jupiter rules liquidity, optimism and broad economic health. Debilitated, it weakens all three.'),
    _R('dig_jupiter_exalt', 'Planet strength', 'Jupiter exalted (Cancer)', 6, 1, C, 'Exaltation gives full strength to liquidity and optimism.'),
    _R('dig_jupiter_own', 'Planet strength', 'Jupiter in own sign (Sagittarius, Pisces)', 4, 1, C, 'Own-sign planets are comfortable and supportive.'),
    _R('dig_venus_debil', 'Planet strength', 'Venus debilitated (Virgo)', 4, -1, C, 'Venus governs liquid wealth, consumption and valuations. Debilitation weakens them.'),
    _R('dig_venus_exalt', 'Planet strength', 'Venus exalted (Pisces)', 4, 1, C, 'Strong Venus supports consumption, credit and valuations.'),
    _R('dig_venus_own', 'Planet strength', 'Venus in own sign (Taurus, Libra)', 3, 1, C, 'Own-sign Venus supports spending and valuations.'),
    _R('dig_mercury_debil', 'Planet strength', 'Mercury debilitated (Pisces)', 4, -1, C, 'Mercury governs trade, calculation and sentiment. Debilitated, it clouds all three.'),
    _R('dig_mercury_exalt', 'Planet strength', 'Mercury exalted or own (Virgo, Gemini)', 4, 1, C, 'Strong Mercury supports clear pricing, trade and volumes.'),
    _R('dig_mars_debil', 'Planet strength', 'Mars debilitated (Cancer)', 4, -1, C, 'Mars in Cancer is emotionally reactive, which tends to show up as sharp, sentiment-driven swings.'),
    _R('dig_mars_exalt', 'Planet strength', 'Mars exalted (Capricorn)', 2, 1, C, 'Strong Mars lifts energy, defence, metals and construction activity.'),
    _R('dig_saturn_strong', 'Planet strength', 'Saturn exalted or in own sign', 2, -1, C, 'A strong Saturn restricts firmly. Disciplined but tight money and a lid on speculation.'),
    _R('dig_sun_debil', 'Planet strength', 'Sun debilitated (Libra)', 2, -1, C, 'A weak Sun reduces government and authority-led support.'),
    _R('dig_sun_exalt', 'Planet strength', 'Sun exalted (Aries)', 2, 1, C, 'A strong Sun lifts government and authority-led support.'),
    # combustion
    _R('comb_mercury', 'Combustion and war', 'Mercury combust', 4, -1, C, 'Too close to the Sun, Mercury loses visibility. Trade signals are obscured and mispriced.'),
    _R('comb_venus', 'Combustion and war', 'Venus combust', 3, -1, C, 'A combust Venus weakens valuation and consumption indicators.'),
    _R('comb_jupiter', 'Combustion and war', 'Jupiter combust', 4, -1, C, 'A combust Jupiter dims liquidity and optimism.'),
    _R('comb_mars', 'Combustion and war', 'Mars combust', 2, -1, C, 'A combust Mars weakens energy, defence and metals themes.'),
    _R('war', 'Combustion and war', 'Planetary war (two planets within 1 degree)', 3, -1, C, 'Graha Yuddha: both planets lose strength and their themes are contested.'),
    # retrograde and stations
    _R('retro_mercury', 'Retrograde and stations', 'Mercury retrograde', 3, -1, P_, 'Retrograde Mercury is associated with reversals, errors and false breakouts in trade and sentiment.'),
    _R('retro_venus', 'Retrograde and stations', 'Venus retrograde', 2, -1, P_, 'Retrograde Venus is associated with revaluation, with consumer and valuation themes under review.'),
    _R('retro_mars', 'Retrograde and stations', 'Mars retrograde', 2, -1, P_, 'Retrograde Mars is associated with stalled momentum and frustrated aggression.'),
    _R('retro_jupiter', 'Retrograde and stations', 'Jupiter retrograde', 1.5, -1, P_, 'Retrograde Jupiter slows expansion and credit growth.'),
    _R('retro_saturn', 'Retrograde and stations', 'Saturn retrograde', 1.5, -1, P_, 'Retrograde Saturn re-opens unfinished restriction, with delays and re-tests.'),
    _R('double_retro', 'Retrograde and stations', 'Mercury and Venus both retrograde', 3, -1, P_, 'Both trade and value planets retrograde at once: price discovery is distorted and liquidity cautious.'),
    _R('station', 'Retrograde and stations', 'Planet turning direction (station)', 2, -1, P_, 'Stations of Mercury, Venus, Mars, Jupiter and Saturn coincide with trend reversals and false breakouts in practitioner experience.'),
    _R('all_direct', 'Benefic support', 'No retrograde among Mercury, Venus, Mars, Jupiter, Saturn', 2, 1, P_, 'With every planet direct, trends tend to run without the re-tests that retrogrades bring.'),
    # sensitive placements
    _R('pap_mercury', 'Hemming and edges', 'Mercury hemmed between malefics', 3, -1, C, 'Papartari: a planet with malefics on both sides loses support and its theme suffers.'),
    _R('pap_venus', 'Hemming and edges', 'Venus hemmed between malefics', 3, -1, C, 'Papartari applied to Venus.'),
    _R('pap_jupiter', 'Hemming and edges', 'Jupiter hemmed between malefics', 3, -1, C, 'Papartari applied to Jupiter.'),
    _R('gandanta', 'Hemming and edges', 'Planet at a water-sign edge (Gandanta)', 2, -1, C, 'The last or first 3 degrees 20 minutes at Cancer-Leo, Scorpio-Sagittarius and Pisces-Aries are the knot points. Planets there are unstable.'),
    # supportive combinations
    _R('jup_ven', 'Benefic support', 'Jupiter with Venus', 3, 1, C, 'The two natural benefics together support credit, consumption and valuations.'),
    _R('jup_merc', 'Benefic support', 'Jupiter with Mercury', 2, 1, C, 'Jupiter with Mercury supports trade and sound judgement.'),
    _R('ven_merc', 'Benefic support', 'Venus with Mercury', 2, 1, C, 'Venus with Mercury supports trade and valuations.'),
    # Sarvatobhadra
    _R('sbc_vara', 'Sarvatobhadra vedha', 'Weekday square pierced', 4, 1, 'Traditional (Indian market astrology)', 'In the Sarvatobhadra Chakra, planets pierce the squares in line with them. The balance of benefic and malefic piercers on the day of the week is read for that day. Direction-of-motion refinements are not applied because published sources differ.'),
    # market chart
    _R('nat_mal_58', 'Reference chart (market)', 'Saturn, Mars or a node in the 5th or 8th house of the market chart', 3, -1, P_, 'The 5th house is speculation and the 8th sudden loss. Malefics transiting them are read as pressure or shocks (per the standard market-astrology texts).'),
    _R('nat_sat_moon', 'Reference chart (market)', 'Saturn in a hard position from the market Moon (12, 1, 2, 4, 8)', 4, -1, C, 'Saturn over the Moon sign and the signs either side (Sade Sati), and the 4th and 8th from it, are classic Gochara afflictions.'),
    _R('nat_jup_moon', 'Reference chart (market)', 'Jupiter in 2, 5, 7, 9 or 11 from the market Moon', 4, 1, C, 'Parashara Gochara: Jupiter is favourable in these houses from the natal Moon.'),
    _R('nat_jup_lagna', 'Reference chart (market)', 'Jupiter in 2, 5, 9 or 11 from the market Lagna', 2, 1, C, 'Jupiter supports these wealth and fortune houses.'),
    _R('nat_node_moon', 'Reference chart (market)', 'Rahu or Ketu within 5 degrees of the market Moon', 3, -1, C, 'Nodes on the natal Moon unsettle sentiment.'),
    _R('nat_mal_conj', 'Reference chart (market)', 'Malefic within 5 degrees of market Sun, Moon or Lagna', 3, -1, C, 'Transiting Saturn, Mars or a node on a key point strikes it.'),
    _R('nat_ben_conj', 'Reference chart (market)', 'Jupiter or Venus within 5 degrees of market Sun, Moon or Lagna', 2, 1, C, 'Transiting benefics on a key point support it.'),
    _R('nat_dasa', 'Reference chart (market)', 'Running Vimshottari lord of the market chart', 3, 1, C, 'A benefic Mahadasha or Antardasha lord supports, a malefic one presses. Planet nature is the natural benefic or malefic.'),
    _R('open_hora', 'Reference chart (market)', 'Hora lord at the market open', 1.5, 1, P_, 'The hora lord at the opening bell colours the first hours: benefic lords supportive, malefic cautious.'),
]
RULE_IDX = {r['id']: r for r in RULES}


# ---------------------------------------------------------------- helpers
def sep(a, b):
    return abs(((a - b + 180) % 360) - 180)


def _positions(jd, cfg):
    out = {}
    for b in BODIES:
        r = planet_pos(jd, b, cfg)
        lon = norm(r[0])
        out[b] = {'name': b, 'lon': lon, 'sign': int(lon // 30), 'deg': lon % 30, 'speed': r[3], 'retro': True if b in ('Rahu', 'Ketu') else r[3] < 0}
        out[b]['nak'], out[b]['pada'] = core.nak_info(lon)
    return out


def _station(name, jd, cfg, win):
    s0 = planet_pos(jd - win, name, cfg)[3]
    s1 = planet_pos(jd + win, name, cfg)[3]
    if s0 * s1 < 0:
        frac = abs(s0) / (abs(s0) + abs(s1))
        t = -win + 2 * win * frac
        return abs(t), ('direct' if s1 > 0 else 'retrograde')
    return None


def _eclipses(jd0, jd1, cfg):
    out, t = [], jd0
    def el(x):
        return norm(planet_pos(x, 'Moon', cfg)[0] - planet_pos(x, 'Sun', cfg)[0])
    e0 = el(t)
    while t < jd1:
        t2 = t + 1.0
        e1 = el(t2)
        for target in (0.0, 180.0):
            d0 = ((e0 - target + 180) % 360) - 180
            d1 = ((e1 - target + 180) % 360) - 180
            if d0 < 0 <= d1 and (d1 - d0) < 30:
                lo, hi = t, t2
                for _ in range(24):
                    mid = (lo + hi) / 2
                    dm = ((el(mid) - target + 180) % 360) - 180
                    if dm < 0:
                        lo = mid
                    else:
                        hi = mid
                tm = (lo + hi) / 2
                sun = planet_pos(tm, 'Sun', cfg)[0]
                rahu = planet_pos(tm, 'Rahu', cfg)[0]
                dist = min(sep(sun, rahu), sep(sun, rahu + 180))
                lim = 17.5 if target == 0.0 else 12.0
                if dist < lim:
                    out.append({'jd': tm, 'kind': 'Solar' if target == 0.0 else 'Lunar', 'dist': dist, 'lon': norm(sun)})
        t, e0 = t2, e1
    return out


def _dignity(name, sign):
    if name not in EXALT_SIGN:
        return ''
    if EXALT_SIGN[name] == sign:
        return 'exalted'
    if (EXALT_SIGN[name] + 6) % 12 == sign:
        return 'debilitated'
    if sign in OWN_SIGNS.get(name, []):
        return 'own'
    return ''


def _state(name, P, pos):
    """Strength of a planet for its sector themes, from -1 to +1, with the reasons."""
    p = pos[name]
    s, why = 0.0, []
    d = _dignity(name, p['sign'])
    if d == 'exalted':
        s += 1.0; why.append('exalted')
    elif d == 'own':
        s += 0.7; why.append('in own sign')
    elif d == 'debilitated':
        s -= 1.0; why.append('debilitated')
    if p['retro'] and name not in ('Rahu', 'Ketu'):
        s -= 0.3; why.append('retrograde')
    if name in COMBUST_ORB and name != 'Moon' and sep(p['lon'], pos['Sun']['lon']) < (COMBUST_ORB[name] - (2 if (p['retro'] and name in ('Mercury', 'Venus')) else 0)):
        s -= 0.6; why.append('combust')
    for q in ('Saturn', 'Mars', 'Rahu', 'Ketu'):
        if q != name and sep(p['lon'], pos[q]['lon']) <= 6:
            s -= 0.3; why.append('with ' + q)
    for q in ('Jupiter', 'Venus'):
        if q != name and sep(p['lon'], pos[q]['lon']) <= 6:
            s += 0.3; why.append('with ' + q)
    sg = p['sign']
    if name in ('Mercury', 'Venus', 'Jupiter', 'Sun'):
        if any(pos[m]['sign'] == (sg + 1) % 12 for m in MAL) and any(pos[m]['sign'] == (sg - 1) % 12 for m in MAL):
            s -= 0.5; why.append('hemmed between malefics')
    return max(-1.0, min(1.0, s)), why


def _fdate(jd, off):
    return fmt_local(jd, off, False)[:10]


# ---------------------------------------------------------------- evaluation
def _market_chart_rules(add, pos, chart, jd, cfg):
    """Rules that read transits against a market's own chart (planets and houses)."""
    mp = chart['pmap']
    lagna = chart['asc']['sign']
    moon_sign = mp['Moon']['sign']
    lagna_ok = chart.get('lagna_ok', True)
    # malefics in 5th or 8th
    if lagna_ok:
        for q in ('Saturn', 'Mars', 'Rahu', 'Ketu'):
            h = (pos[q]['sign'] - lagna) % 12 + 1
            if h in (5, 8):
                add('nat_mal_58', 1.0, f'{q} in the {h}th house of the market chart')
    h = (pos['Saturn']['sign'] - moon_sign) % 12 + 1
    if h in (12, 1, 2):
        add('nat_sat_moon', 1.0, f'Saturn in the {h}{"st" if h == 1 else "nd" if h == 2 else "th"} from the market Moon sign (Sade Sati phase)')
    elif h in (4, 8):
        add('nat_sat_moon', 0.8, f'Saturn in the {h}th from the market Moon sign')
    hj = (pos['Jupiter']['sign'] - moon_sign) % 12 + 1
    if hj in (2, 5, 7, 9, 11):
        add('nat_jup_moon', 1.0, f'Jupiter in the {hj}th from the market Moon sign')
    if lagna_ok:
        hl = (pos['Jupiter']['sign'] - lagna) % 12 + 1
        if hl in (2, 5, 9, 11):
            add('nat_jup_lagna', 1.0, f'Jupiter in the {hl}th from the market Lagna')
    for q in ('Rahu', 'Ketu'):
        d = sep(pos[q]['lon'], mp['Moon']['lon'])
        if d <= 5:
            add('nat_node_moon', 1 - d / 7.0, f'{q} {d:.1f} degrees from the market Moon')
    keypts = [('Sun', mp['Sun']['lon']), ('Moon', mp['Moon']['lon'])] + ([('Lagna', chart['asc']['lon'])] if lagna_ok else [])
    for q in ('Saturn', 'Mars', 'Rahu', 'Ketu'):
        for nm, lon in keypts:
            d = sep(pos[q]['lon'], lon)
            if d <= 5:
                add('nat_mal_conj', 1 - d / 7.0, f'{q} {d:.1f} degrees from the market {nm}')
    for q in ('Jupiter', 'Venus'):
        for nm, lon in keypts:
            d = sep(pos[q]['lon'], lon)
            if d <= 5:
                add('nat_ben_conj', 1 - d / 7.0, f'{q} {d:.1f} degrees from the market {nm}')
    try:
        path = dasa.dasa_at(chart, jd, 2)
        pts, txt = 0.0, []
        for k, lv in enumerate(path[:2]):
            lord = lv['lord']
            sgn = 1 if lord in ('Jupiter', 'Venus', 'Mercury') else (-1 if lord in ('Saturn', 'Rahu', 'Ketu', 'Mars') else 0)
            pts += sgn * (1.0 if k == 0 else 0.6)
            txt.append(f'{lv["level"]} {lord}')
        if pts:
            add('nat_dasa', min(1.0, abs(pts) / 1.6), ', '.join(txt), sign_override=1 if pts > 0 else -1)
    except Exception:
        pass


def evaluate(date, lat, lon, tz, cfg=None, weights=None, norm_scale=None, market=None, chart=None, open_time='09:15', mkt_loc=None):
    """The market reading for a date. `market` is {'id','name','note'} or None; `chart` is the market's reference chart or None."""
    cfg = {**DEFAULT_CFG, **(cfg or {})}
    weights = weights or {}
    y, m, d = [int(x) for x in date.split('-')]
    with LOCK:
        core.set_ayanamsa(cfg['ayanamsa'])
        off = tz_offset_hours(y, m, d, 12, 0, 0, tz)
        jd = swe.julday(y, m, d, 12.0) - off / 24.0
        pos = _positions(jd, cfg)
        hits = []

        def add(rid, strength, detail, sign_override=None):
            hits.append({'id': rid, 'strength': max(0.05, min(1.0, strength)), 'detail': detail, 'sign': sign_override})

        def orb_hit(a, b, orb, rid, strength_mult=1.0, label=''):
            dd = sep(pos[a]['lon'], pos[b]['lon'])
            if dd <= orb:
                add(rid, (1 - 0.6 * dd / orb) * strength_mult, f'{a} and {b} {label or "conjunct"}, {dd:.1f} degrees apart')
                return True
            return False

        # malefic combinations
        orb_hit('Saturn', 'Rahu', 10, 'shrapit')
        orb_hit('Saturn', 'Ketu', 8, 'saturn_ketu')
        orb_hit('Mars', 'Rahu', 10, 'angarak')
        orb_hit('Mars', 'Ketu', 8, 'mars_ketu')
        orb_hit('Jupiter', 'Rahu', 10, 'guru_chandal')
        for a, b, rid in (('Mars', 'Saturn', 'mars_saturn'), ('Jupiter', 'Saturn', 'jup_sat_hard')):
            dd = sep(pos[a]['lon'], pos[b]['lon'])
            if dd <= 8:
                add(rid, 1 - 0.6 * dd / 8, f'{a} and {b} conjunct, {dd:.1f} degrees apart')
            elif abs(dd - 180) <= 8:
                add(rid, 0.85 * (1 - 0.6 * abs(dd - 180) / 8), f'{a} opposite {b}, within {abs(dd - 180):.1f} degrees')
            elif abs(dd - 90) <= 6:
                add(rid, 0.5 * (1 - 0.6 * abs(dd - 90) / 6), f'{a} square {b}, within {abs(dd - 90):.1f} degrees')
        dd = sep(pos['Sun']['lon'], pos['Saturn']['lon'])
        if dd <= 8:
            add('sun_saturn', 1 - 0.6 * dd / 8, f'Sun and Saturn conjunct, {dd:.1f} degrees apart')
        elif abs(dd - 180) <= 8:
            add('sun_saturn', 0.8 * (1 - 0.6 * abs(dd - 180) / 8), f'Sun opposite Saturn, within {abs(dd - 180):.1f} degrees')
        dd = sep(pos['Jupiter']['lon'], pos['Saturn']['lon'])
        if abs(dd - 120) <= 6:
            add('jup_sat_soft', 1 - 0.6 * abs(dd - 120) / 6, f'Jupiter trine Saturn, within {abs(dd - 120):.1f} degrees')
        elif abs(dd - 60) <= 5:
            add('jup_sat_soft', 0.7 * (1 - 0.6 * abs(dd - 60) / 5), f'Jupiter sextile Saturn, within {abs(dd - 60):.1f} degrees')
        if {pos['Rahu']['sign'], pos['Ketu']['sign']} == {1, 7}:
            add('nodes_ts', 1.0, 'Rahu and Ketu on the Taurus-Scorpio axis')
        if pos['Saturn']['sign'] in WATER:
            add('saturn_water', 1.0, f'Saturn in {SIGNS[pos["Saturn"]["sign"]]}')
        # kala sarpa
        ra = pos['Rahu']['lon']
        inside = [norm(pos[b]['lon'] - ra) < 180 for b in ('Sun', 'Mercury', 'Venus', 'Mars', 'Jupiter', 'Saturn')]
        if all(inside) or not any(inside):
            add('kala_sarpa', 1.0, 'All six planets lie between Rahu and Ketu')
        # stellium
        cnt = {}
        for b in ('Mars', 'Mercury', 'Venus', 'Jupiter', 'Saturn', 'Rahu', 'Ketu'):
            cnt.setdefault(pos[b]['sign'], []).append(b)
        for sg, ls in cnt.items():
            if len(ls) >= 3:
                add('stellium', min(1.0, 0.5 + 0.25 * (len(ls) - 3)), f'{", ".join(ls)} in {SIGNS[sg]}')
        # dignity
        for nm in ('Jupiter', 'Venus', 'Mercury', 'Mars', 'Saturn', 'Sun'):
            dg = _dignity(nm, pos[nm]['sign'])
            sgn = SIGNS[pos[nm]['sign']]
            if nm == 'Mercury':
                if dg in ('exalted', 'own'):
                    add('dig_mercury_exalt', 1.0 if dg == 'exalted' else 0.8, f'Mercury {"exalted" if dg == "exalted" else "in own sign"} in {sgn}')
                elif dg == 'debilitated':
                    add('dig_mercury_debil', 1.0, f'Mercury debilitated in {sgn}')
            elif nm == 'Saturn':
                if dg in ('exalted', 'own'):
                    add('dig_saturn_strong', 1.0 if dg == 'exalted' else 0.8, f'Saturn {"exalted" if dg == "exalted" else "in own sign"} in {sgn}')
            else:
                key = {'exalted': 'exalt', 'debilitated': 'debil', 'own': 'own'}.get(dg)
                rid = f'dig_{nm.lower()}_{key}' if key else None
                if rid and rid in RULE_IDX:
                    add(rid, 1.0 if dg != 'own' else 0.8, f'{nm} {"exalted" if dg == "exalted" else "debilitated" if dg == "debilitated" else "in own sign"} in {sgn}')
        # combustion
        for nm, rid in (('Mercury', 'comb_mercury'), ('Venus', 'comb_venus'), ('Jupiter', 'comb_jupiter'), ('Mars', 'comb_mars')):
            orb = COMBUST_ORB[nm]
            if pos[nm]['retro'] and nm == 'Mercury':
                orb = 12
            if pos[nm]['retro'] and nm == 'Venus':
                orb = 8
            dd = sep(pos[nm]['lon'], pos['Sun']['lon'])
            if dd < orb:
                add(rid, 0.4 + 0.6 * (1 - dd / orb), f'{nm} {dd:.1f} degrees from the Sun')
        # planetary war
        wp = ['Mars', 'Mercury', 'Jupiter', 'Venus', 'Saturn']
        for i in range(len(wp)):
            for j in range(i + 1, len(wp)):
                dd = sep(pos[wp[i]]['lon'], pos[wp[j]]['lon'])
                if dd <= 1.0:
                    add('war', 1 - 0.5 * dd, f'{wp[i]} and {wp[j]} {dd:.2f} degrees apart')
        # retrograde
        for nm, rid in (('Mercury', 'retro_mercury'), ('Venus', 'retro_venus'), ('Mars', 'retro_mars'), ('Jupiter', 'retro_jupiter'), ('Saturn', 'retro_saturn')):
            if pos[nm]['retro']:
                add(rid, 1.0, f'{nm} retrograde in {SIGNS[pos[nm]["sign"]]}')
        if pos['Mercury']['retro'] and pos['Venus']['retro']:
            add('double_retro', 1.0, 'Mercury and Venus both retrograde')
        if not any(pos[nm]['retro'] for nm in ('Mercury', 'Venus', 'Mars', 'Jupiter', 'Saturn')):
            add('all_direct', 1.0, 'All five planets direct')
        for nm, win in (('Mercury', 4.0), ('Venus', 5.0), ('Mars', 7.0), ('Jupiter', 10.0), ('Saturn', 10.0)):
            st = _station(nm, jd, cfg, win)
            if st:
                add('station', 1 - 0.7 * st[0] / win, f'{nm} turns {st[1]} in about {st[0]:.0f} day(s)')
        # hemming
        for nm, rid in (('Mercury', 'pap_mercury'), ('Venus', 'pap_venus'), ('Jupiter', 'pap_jupiter')):
            sg = pos[nm]['sign']
            ahead = [x for x in MAL if pos[x]['sign'] == (sg + 1) % 12]
            behind = [x for x in MAL if pos[x]['sign'] == (sg - 1) % 12]
            if ahead and behind:
                add(rid, 1.0, f'{nm} in {SIGNS[sg]} with {", ".join(behind)} behind and {", ".join(ahead)} ahead')
        # gandanta
        for nm in ('Mercury', 'Venus', 'Jupiter', 'Mars', 'Saturn'):
            l = pos[nm]['lon']
            for edge in (0.0, 120.0, 240.0):
                dd = sep(l, edge)
                if dd <= 3 + 1 / 3.0:
                    add('gandanta', 0.5 + 0.5 * (1 - dd / 3.34), f'{nm} {dd:.1f} degrees from the {SIGNS[int(edge // 30) - 1 if edge else 11]}-{SIGNS[int(edge // 30)]} junction')
        # support
        orb_hit('Jupiter', 'Venus', 8, 'jup_ven')
        orb_hit('Jupiter', 'Mercury', 8, 'jup_merc')
        orb_hit('Venus', 'Mercury', 8, 'ven_merc')
        # eclipses
        ecl = _eclipses(jd - 20, jd + 95, cfg)
        for e in ecl:
            gap = abs(e['jd'] - jd)
            if gap <= 15:
                add('eclipse', 1 - 0.8 * gap / 15, f'{e["kind"]} eclipse near {_fdate(e["jd"], off)} (Sun {e["dist"]:.1f} degrees from a node)')
        # Sarvatobhadra
        cells = {}
        for b in BODIES:
            nm, rc = _sbc_cell(pos[b]['lon'])
            cells[b] = (nm, rc, _lines(rc))
        def piercers(rc):
            mal = [b for b in BODIES if b in SBC_MAL and rc in cells[b][2]]
            ben = [b for b in BODIES if b in SBC_BEN and rc in cells[b][2]]
            return mal, ben
        # weekday square: weekday of the selected date at the market (civil date)
        civil = int(math.floor(jd + off / 24.0 + 0.5))
        vara = (civil + 1) % 7
        vmal, vben = piercers(SBC_VARA[vara])
        net = len(vben) - len(vmal)
        sbc_vara = {'weekday': VARA_NAME[vara], 'mal': vmal, 'ben': vben}
        if net:
            add('sbc_vara', min(1.0, abs(net) / 3.0), f'{VARA_NAME[vara]} square pierced by {", ".join(vmal) or "no malefic"} (malefic) and {", ".join(vben) or "no benefic"} (benefic)', sign_override=1 if net > 0 else -1)
        # market chart
        open_info = None
        if chart is not None:
            _market_chart_rules(add, pos, chart, jd, cfg)
        if mkt_loc:
            try:
                oy, om, od = y, m, d
                hh, mm = [int(x) for x in open_time.split(':')[:2]]
                off2 = tz_offset_hours(oy, om, od, hh, mm, 0, mkt_loc['tz'])
                jd_open = swe.julday(oy, om, od, hh + mm / 60.0) - off2 / 24.0
                day = day_bounds(jd_open, off2, mkt_loc['lat'], mkt_loc['lon'], cfg['sunrise'])
                hr = PN.hora_at(jd_open, day)
                lg = core.asc_at(jd_open, mkt_loc['lat'], mkt_loc['lon'])
                open_info = {'time': open_time, 'lagna': SIGNS[int(norm(lg) // 30)], 'lagna_deg': core.dms(norm(lg) % 30), 'hora': hr['lord'] if hr else None,
                             'weekday': VARA_NAME[day['vara']]}
                if hr:
                    if hr['lord'] in ('Jupiter', 'Venus', 'Mercury'):
                        add('open_hora', 1.0, f'{hr["lord"]} hora at the {open_time} open', sign_override=1)
                    elif hr['lord'] in ('Saturn', 'Mars'):
                        add('open_hora', 1.0, f'{hr["lord"]} hora at the {open_time} open', sign_override=-1)
            except Exception:
                open_info = None

        # ---- contributions
        norm_ = float(norm_scale or NORM_DEFAULT)
        rows, total, bull, bear = [], 0.0, 0.0, 0.0
        for h in hits:
            r = RULE_IDX[h['id']]
            cfgw = weights.get(h['id'], {})
            if cfgw.get('on') is False:
                continue
            w = float(cfgw.get('w', r['w']))
            pol = h['sign'] if h['sign'] is not None else r['pol']
            pts = pol * w * h['strength']
            total += pts
            if pts > 0:
                bull += pts
            else:
                bear += pts
            rows.append({'id': h['id'], 'group': r['group'], 'title': r['title'], 'pol': pol, 'weight': w, 'strength': round(h['strength'], 2),
                         'pts': round(pts, 2), 'detail': h['detail'], 'why': r['why'], 'basis': r['basis']})
        rows.sort(key=lambda x: -abs(x['pts']))
        score = max(-100, min(100, round(100.0 * total / norm_)))
        label = ('Bullish' if score >= 25 else 'Mildly bullish' if score >= 8 else 'Mixed' if score > -8 else 'Mildly bearish' if score > -25 else 'Bearish')

        # ---- sectors
        sec = {s: {'sector': s, 'score': 0.0, 'drivers': [], 'volatile': False} for s in SECTORS}
        def sadd(s, v, txt):
            if s in sec:
                sec[s]['score'] += v
                sec[s]['drivers'].append({'v': round(v, 2), 'text': txt})
        states = {}
        for nm in PLANET_SW:
            st, why = _state(nm, pos, pos)
            states[nm] = (st, why)
            if abs(st) < 0.15:
                continue
            for s, share in SIG[nm].items():
                sadd(s, st * share * PLANET_SW[nm] * 0.8, f'{nm} {", ".join(why)} ({nm} signifies {s})')
        for nm in ('Jupiter', 'Venus', 'Mercury', 'Sun', 'Saturn'):
            st = states[nm][0]
            tone = TONE[nm]
            if nm != 'Saturn' and st <= -0.4:
                tone = -abs(tone)
            elif nm != 'Saturn' and st < 0.15 and nm in ('Sun', 'Mercury'):
                tone = tone * 0.5
            for s in SIGN_SECT[pos[nm]['sign']]:
                sadd(s, tone, f'{nm} in {SIGNS[pos[nm]["sign"]]} ({s} belongs to that sign)')
        for s in ('Pharma & Healthcare', 'FMCG & Agri'):
            sadd(s, 0.15, 'Saturn restraint rotates money into defensive sectors')
        for nd in ('Rahu', 'Ketu'):
            for s in NODE_SIG[nd]:
                sec[s]['volatile'] = True
                sec[s]['drivers'].append({'v': 0, 'text': f'{nd} signifies {s}: sudden, narrative-driven moves'})
            for s in SIGN_SECT[pos[nd]['sign']]:
                sec[s]['volatile'] = True
                sec[s]['drivers'].append({'v': 0, 'text': f'{nd} in {SIGNS[pos[nd]["sign"]]} adds volatility to {s}'})
        # Sarvatobhadra sign squares
        for sg, rc in SBC_SIGN.items():
            mal, ben = piercers(rc)
            net = 0.15 * len(ben) - 0.15 * len(mal)
            if not net:
                continue
            for s in SIGN_SECT[sg]:
                sadd(s, net, f'Sarvatobhadra: {SIGNS[sg]} square pierced by {", ".join(mal) or "no malefic"} and {", ".join(ben) or "no benefic"}')
        sectors = []
        for s, v in sec.items():
            sc = round(max(-1.5, min(1.5, v['score'])), 2)
            tag = 'Favoured' if sc >= 0.35 else 'Pressured' if sc <= -0.35 else 'Neutral'
            sectors.append({'sector': s, 'score': sc, 'tag': tag, 'volatile': v['volatile'], 'drivers': sorted(v['drivers'], key=lambda x: -abs(x['v']))[:6]})
        sectors.sort(key=lambda x: -x['score'])

        # ---- planets
        plist = []
        for nm in BODIES:
            p = pos[nm]
            st, why = states.get(nm, (0, []))
            plist.append({'name': nm, 'sign': SIGNS[p['sign']], 'sign_idx': p['sign'], 'deg': core.dms(p['deg']), 'nak': NAKSHATRAS[p['nak']], 'pada': p['pada'],
                          'retro': p['retro'] and nm not in ('Rahu', 'Ketu'), 'dignity': _dignity(nm, p['sign']), 'notes': why, 'nature': 'malefic' if nm in MAL else ('benefic' if nm in BEN else 'neutral')})

        # ---- Sarvatobhadra board
        naks_out = []
        for nm, rc in SBC_NAK.items():
            mal, ben = piercers(rc)
            naks_out.append({'nak': nm, 'mal': mal, 'ben': ben, 'net': len(ben) - len(mal)})
        naks_out.sort(key=lambda x: (x['net'], x['nak']))
        grid = [[None] * 9 for _ in range(9)]
        for nm, (r, c) in SBC_NAK.items():
            grid[r][c] = {'t': nm, 'k': 'nak'}
        for sg, (r, c) in SBC_SIGN.items():
            grid[r][c] = {'t': SIGNS[sg][:3], 'k': 'sign'}
        for v, (r, c) in SBC_VARA.items():
            cur = grid[r][c]
            names = VARA_NAME[v][:3]
            grid[r][c] = {'t': (cur['t'] + '/' + names) if cur and cur['k'] == 'vara' else names, 'k': 'vara'}
        for r in range(9):
            for c in range(9):
                if grid[r][c] is None:
                    grid[r][c] = {'t': '', 'k': 'fill'}
                grid[r][c]['p'] = []
        for b in BODIES:
            r, c = cells[b][1]
            grid[r][c]['p'].append(PL_ABBR[b])
        sbc = {'weekday': sbc_vara, 'grid': grid, 'naks': naks_out, 'cells': {b: cells[b][0] for b in BODIES}}

        # ---- ahead
        ahead = []
        prev = {b: pos[b]['sign'] for b in ('Sun', 'Mercury', 'Venus', 'Mars', 'Jupiter', 'Saturn', 'Rahu')}
        prev_sp = {b: planet_pos(jd, b, cfg)[3] for b in ('Mercury', 'Venus', 'Mars', 'Jupiter', 'Saturn')}
        for k in range(1, 91):
            t = jd + k
            for b in prev:
                sg = int(norm(planet_pos(t, b, cfg)[0]) // 30)
                if sg != prev[b]:
                    nm = 'Rahu-Ketu' if b == 'Rahu' else b
                    ahead.append({'date': _fdate(t, off), 'jd': t, 'kind': 'Ingress', 'text': f'{nm} enters {SIGNS[sg]}' + (f' (Ketu enters {SIGNS[(sg + 6) % 12]})' if b == 'Rahu' else ''),
                                  'why': {'Saturn': 'Saturn sign changes mark multi-year shifts in restriction and defensive rotation.', 'Jupiter': 'Jupiter sign changes mark shifts in liquidity and optimism.',
                                          'Rahu': 'Node ingress changes which sectors turn volatile and the speculation theme.', 'Mars': 'Mars ingress changes the pressure on defence, metals, energy and real estate.',
                                          'Sun': 'Sun ingress (Sankranti) begins a new solar month.', 'Mercury': 'Mercury ingress changes trade and sentiment themes.', 'Venus': 'Venus ingress changes valuation and consumption themes.'}[b]})
                    prev[b] = sg
            for b in prev_sp:
                sp = planet_pos(t, b, cfg)[3]
                if sp * prev_sp[b] < 0:
                    ahead.append({'date': _fdate(t, off), 'jd': t, 'kind': 'Station', 'text': f'{b} turns {"direct" if sp > 0 else "retrograde"}',
                                  'why': 'Stations are associated with trend reversals and false breakouts (practitioner convention).'})
                prev_sp[b] = sp
        for e in ecl:
            if e['jd'] > jd:
                ahead.append({'date': _fdate(e['jd'], off), 'jd': e['jd'], 'kind': 'Eclipse', 'text': f'{e["kind"]} eclipse (Sun {e["dist"]:.1f} degrees from a node)',
                              'why': 'Volatility is watched in the weeks around eclipses. Geometric estimate, visibility not checked.'})
        ahead.sort(key=lambda x: x['jd'])
        for a in ahead:
            a['days'] = int(round(a.pop('jd') - jd))

    top_bull = [r for r in rows if r['pts'] > 0][:3]
    top_bear = [r for r in rows if r['pts'] < 0][:3]
    return {'date': date, 'market': market, 'bias': {'score': score, 'label': label, 'bull': round(bull, 1), 'bear': round(bear, 1), 'net': round(total, 1), 'norm': norm_},
            'rules': rows, 'top_bull': top_bull, 'top_bear': top_bear, 'sectors': sectors, 'planets': plist, 'sbc': sbc, 'ahead': ahead[:14], 'open': open_info,
            'chart_used': bool(chart is not None), 'tz': tz}


def guide():
    groups = []
    for r in RULES:
        if r['group'] not in groups:
            groups.append(r['group'])
    return {
        'rules': [{k: r[k] for k in ('id', 'group', 'title', 'w', 'pol', 'basis', 'why')} for r in RULES],
        'groups': groups,
        'norm': NORM_DEFAULT,
        'sectors': SECTORS,
        'significators': {k: sorted(v.items(), key=lambda x: -x[1]) for k, v in SIG.items()},
        'node_sectors': NODE_SIG,
        'sign_sectors': {SIGNS[k]: v for k, v in SIGN_SECT.items()},
        'method': [
            'Each rule that is active adds points = polarity x weight x strength. Strength falls with orb (how far from exact) or with distance in days from an eclipse or station.',
            'The total is divided by the scale (default 30) and shown from -100 to +100: Bullish 25 and above, Mildly bullish 8 to 24, Mixed between -7 and 7, Mildly bearish -8 to -24, Bearish -25 and below.',
            'Sectors: a planet that is strong (exalted, own sign, uncombust, direct, unafflicted) lifts the sectors it signifies. A weak one (debilitated, combust, retrograde, hemmed or conjoined with malefics) presses them. Jupiter, Venus, Mercury, Sun and Saturn in a sign also lift or press the sectors of that sign. Rahu and Ketu make their sectors volatile rather than up or down. Sarvatobhadra vedha on sign squares adds a small push.',
            'Sarvatobhadra: planets pierce every square on their row, column and both diagonals of the 9 by 9 grid. Benefic piercers (Jupiter, Venus, Mercury) support the square and malefic ones (Sun, Mars, Saturn, Rahu, Ketu) harm it. Direct and retrograde refinements are not applied because published sources differ.',
            'Market reference charts: transits are read against the chart of the market (houses, Moon, Lagna, dasha). The defaults are conventional dates, many with unverified times. Edit them in Settings.',
            'The Moon is left out of the score on purpose.',
            'These are traditional rules. Rules marked Classical come from Parashara-style texts. Rules marked Market-astrology convention are practitioner conventions. None has been tested against price history, so treat the result as an astrological reading, not a forecast or advice.',
        ],
    }
