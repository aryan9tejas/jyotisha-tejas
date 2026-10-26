"""Hijri (Islamic) dates and holidays, and regional solar calendars (Tamil, Malayalam, Bengali, Odia, Assamese, Punjabi, Tulu)."""
import math
from datetime import date, timedelta

import swisseph as swe

from .core import norm, sid_lon, day_bounds, tz_offset_hours

# ------------------------------------------------------------------ Hijri
HMONTHS = ['Muharram', 'Safar', "Rabi al-Awwal", "Rabi al-Thani", 'Jumada al-Awwal', 'Jumada al-Thani', 'Rajab', "Sha'ban", 'Ramadan', 'Shawwal', "Dhu al-Qa'dah", 'Dhu al-Hijjah']
_C0 = 2460851.938          # conjunction before 1 Muharram 1447 (25 Jun 2025)
_SYN = 29.530588
_VIS = 10.0                # Moon-Sun elongation (degrees) at local 18:00 that makes the new crescent visible
_memo = {}


def _vis(dt, off):
    key = (dt, off)
    if key not in _memo:
        if len(_memo) > 4000:
            _memo.clear()
        jd = swe.julday(dt.year, dt.month, dt.day, 18.0) - off / 24.0
        s = swe.calc_ut(jd, swe.SUN, swe.FLG_SWIEPH)[0][0]
        m = swe.calc_ut(jd, swe.MOON, swe.FLG_SWIEPH)[0][0]
        e = (m - s) % 360
        _memo[key] = _VIS <= e < 180
    return _memo[key]


def hijri(dt, off, adj=0):
    """(day, month index 0=Muharram, year) of civil date dt. adj shifts the sighting by whole days (+1 = a day later)."""
    d = dt - timedelta(days=adj)
    for back in range(0, 32):
        s = d - timedelta(days=back)
        if _vis(s - timedelta(days=1), off) and not _vis(s - timedelta(days=2), off):
            jd = swe.julday(s.year, s.month, s.day, 12.0)
            k = round((jd - _C0 - 1.5) / _SYN)
            return back + 1, k % 12, 1447 + k // 12
    return None


# (month, day) -> (name, gazetted holiday in India)
HIJRI_EV = {
    (0, 1): ('Islamic New Year (1 Muharram)', 0), (0, 10): ('Muharram (Ashura)', 1), (2, 12): ('Eid-e-Milad (Mawlid)', 1),
    (6, 27): ("Shab-e-Meraj (Isra and Mi'raj)", 0), (7, 15): ('Shab-e-Barat', 0), (8, 1): ('Ramadan begins', 0),
    (8, 27): ('Shab-e-Qadr (Laylat al-Qadr)', 0), (9, 1): ('Eid-ul-Fitr', 1), (11, 9): ('Day of Arafah', 0), (11, 10): ('Eid-ul-Adha (Bakrid)', 1),
}


def hijri_events(dt, off, adj, vara):
    h = hijri(dt, off, adj)
    if not h:
        return None, []
    ev = []
    x = HIJRI_EV.get((h[1], h[0]))
    if x:
        ev.append({'id': 'hijri', 'name': x[0], 'cat': 'hol' if x[1] else 'fest', 'pub': x[1], 'hijri': 1})
    if h[1] == 8 and vara == 5:
        n = hijri(dt + timedelta(days=7), off, adj)
        if n and n[1] != 8:
            ev.append({'id': 'hijri', 'name': "Jumu'atul-Vida (last Friday of Ramadan)", 'cat': 'fest', 'hijri': 1})
    return {'d': h[0], 'm': h[1], 'y': h[2], 'name': HMONTHS[h[1]]}, ev


# ------------------------------------------------------------------ regional solar calendars
SAMV = ['Prabhava', 'Vibhava', 'Shukla', 'Pramoda', 'Prajapati', 'Angirasa', 'Shrimukha', 'Bhava', 'Yuva', 'Dhatri', 'Ishvara', 'Bahudhanya', 'Pramathi', 'Vikrama', 'Vrisha', 'Chitrabhanu', 'Subhanu', 'Tarana', 'Parthiva', 'Vyaya', 'Sarvajit', 'Sarvadhari', 'Virodhi', 'Vikriti', 'Khara', 'Nandana', 'Vijaya', 'Jaya', 'Manmatha', 'Durmukhi', 'Hevilambi', 'Vilambi', 'Vikari', 'Sharvari', 'Plava', 'Shubhakrit', 'Shobhakrit', 'Krodhi', 'Vishvavasu', 'Parabhava', 'Plavanga', 'Kilaka', 'Saumya', 'Sadharana', 'Virodhikrit', 'Paridhavi', 'Pramadicha', 'Ananda', 'Rakshasa', 'Nala', 'Pingala', 'Kalayukti', 'Siddharthi', 'Raudri', 'Durmati', 'Dundubhi', 'Rudhirodgari', 'Raktakshi', 'Krodhana', 'Akshaya']
samv = lambda saka: SAMV[(saka + 12 - 1) % 60]

SOLAR = {
    'tamil': {'rule': 'sunset', 'start': 0, 'cs': 4, 'names': ['Chithirai', 'Vaikasi', 'Aani', 'Aadi', 'Aavani', 'Purattasi', 'Aippasi', 'Karthigai', 'Margazhi', 'Thai', 'Maasi', 'Panguni'], 'state': 'Tamil Nadu'},
    'malayalam': {'rule': 'apara', 'start': 4, 'cs': 8, 'names': ['Medam', 'Edavam', 'Mithunam', 'Karkidakam', 'Chingam', 'Kanni', 'Thulam', 'Vrischikam', 'Dhanu', 'Makaram', 'Kumbham', 'Meenam'], 'state': 'Kerala'},
    'bengali': {'rule': 'bengal', 'start': 0, 'cs': 4, 'names': ['Boishakh', 'Joishtho', 'Asharh', 'Shrabon', 'Bhadro', 'Ashwin', 'Kartik', 'Agrahayan', 'Poush', 'Magh', 'Falgun', 'Choitro'], 'state': 'West Bengal'},
    'odia': {'rule': 'same', 'start': 0, 'cs': 4, 'names': ['Baisakha', 'Jyeshtha', 'Ashadha', 'Shravana', 'Bhadraba', 'Ashwina', 'Kartika', 'Margashira', 'Pausha', 'Magha', 'Phalguna', 'Chaitra'], 'state': 'Odisha'},
    'assamese': {'rule': 'sunset', 'start': 0, 'cs': 4, 'names': ['Bohag', 'Jyeth', 'Ahar', 'Xaon', 'Bhado', 'Ahin', 'Kati', 'Aghon', 'Puh', 'Magh', 'Phagun', 'Chot'], 'state': 'Assam'},
    'punjabi': {'rule': 'sunset', 'start': 0, 'cs': 4, 'names': ['Vaisakh', 'Jeth', 'Harh', 'Sawan', 'Bhadon', 'Assu', 'Katak', 'Maghar', 'Poh', 'Magh', 'Phagun', 'Chet'], 'state': 'Punjab'},
    'tulu': {'rule': 'sunset', 'start': 0, 'cs': 4, 'names': ['Paggu', 'Beshya', 'Kartel', 'Aati', 'Sona', 'Nirnal', 'Bonthel', 'Jarde', 'Perarde', 'Puntel', 'Mayi', 'Suggi'], 'state': 'Karnataka'},
}
# (solar month 0=Mesha, day or 'last', name, category)
SOLAR_EV = {
    'tamil': [(0, 1, 'Puthandu (Tamil New Year)', 'hol'), (8, 'last', 'Bhogi', 'fest'), (9, 1, 'Thai Pongal', 'hol'), (9, 2, 'Mattu Pongal, Thiruvalluvar Day', 'hol'),
              (9, 3, 'Kaanum Pongal', 'fest'), (3, 1, 'Aadi month begins', 'fest'), (3, 18, 'Aadi Perukku', 'fest'), (4, 1, 'Aavani month begins', 'fest'), (7, 1, 'Karthigai month begins', 'fest')],
    'malayalam': [(0, 1, 'Vishu', 'hol'), (3, 1, 'Karkidakam 1 (Ramayana Masam begins)', 'fest'), (4, 1, 'Chingam 1 (Malayalam New Year)', 'hol'), (7, 1, 'Vrischikam 1 (Mandala season, Sabarimala)', 'fest'), (9, 1, 'Makaram 1 (Makaravilakku)', 'fest')],
    'bengali': [(0, 1, 'Poila Boishakh (Bengali New Year)', 'hol'), (0, 25, 'Rabindra Jayanti', 'fest'), (1, 11, 'Nazrul Jayanti', 'fest'), (8, 'last', 'Poush Sankranti (Poush Parbon)', 'fest'),
                (9, 1, 'Makar Sankranti (Uttarayan)', 'fest'), (10, 1, 'Pohela Falgun', 'fest'), (11, 'last', 'Choitro Sankranti (Charak, Gajan)', 'fest')],
    'odia': [(0, 1, 'Maha Vishuva Pana Sankranti (Odia New Year)', 'hol'), (2, 1, 'Raja Sankranti (Mithuna)', 'fest'), (8, 1, 'Dhanu Sankranti', 'fest'), (9, 1, 'Makara Sankranti', 'fest')],
    'assamese': [(11, 'last', 'Goru Bihu', 'fest'), (0, 1, 'Bohag Bihu (Rongali Bihu)', 'hol'), (6, 1, 'Kati Bihu (Kongali Bihu)', 'fest'), (8, 'last', 'Uruka (Bhogali Bihu eve)', 'fest'), (9, 1, 'Magh Bihu (Bhogali Bihu)', 'hol')],
    'punjabi': [(0, 1, 'Vaisakhi (Baisakhi)', 'hol'), (8, 'last', 'Lohri', 'fest'), (9, 1, 'Maghi', 'hol')],
    'tulu': [(0, 1, 'Bisu Parba (Tulu New Year)', 'hol'), (3, 1, 'Aati month begins (Aati Tingalu)', 'fest'), (4, 1, 'Sona Sankramana (Simha)', 'fest'), (9, 1, 'Makara Sankramana', 'fest')],
}


def _sign(jd, cfg):
    return int(norm(sid_lon(jd, 'Sun', cfg)) // 30)


def _ingress_before(jd, cfg):
    s0 = _sign(jd, cfg)
    lo, hi = jd - 33.0, jd
    for _ in range(24):
        mid = (lo + hi) / 2
        if _sign(mid, cfg) == s0:
            hi = mid
        else:
            lo = mid
    return hi, s0


def _start_date(t, rule, off, lat, lon, cfg):
    y, m, d, _h = swe.revjul(t + off / 24.0)
    ld = date(y, m, d)
    if rule == 'same':
        return ld
    noon = swe.julday(y, m, d, 12.0) - off / 24.0
    b = day_bounds(noon, off, lat, lon, cfg['sunrise'])
    sr, ss = b['sr'], b['ss']
    if rule == 'bengal':
        return ld if t < sr else ld + timedelta(days=1)
    lim = ss if rule == 'sunset' else sr + 0.8 * (ss - sr)
    return ld if t < lim else ld + timedelta(days=1)


def solar_rows(system, dates, offs, lat, lon, cfg, naks=None):
    """For each civil date: solar month index, day, names, era text, and regional events. dates is a consecutive list."""
    S = SOLAR[system]
    off0 = offs[0]
    jd_first = swe.julday(dates[0].year, dates[0].month, dates[0].day, 12.0) - off0 / 24.0
    jd_last = swe.julday(dates[-1].year, dates[-1].month, dates[-1].day, 12.0) - offs[-1] / 24.0 + 3
    ing = []
    t, s = _ingress_before(jd_last, cfg)
    ing.append((t, s))
    while t > jd_first - 40:
        t, s = _ingress_before(t - 0.5, cfg)
        ing.append((t, s))
    ing.reverse()
    starts = [(_start_date(t, S['rule'], off0, lat, lon, cfg), s) for (t, s) in ing]
    out = []
    for i, dt in enumerate(dates):
        cur = None
        for (sd, s) in starts:
            if sd <= dt:
                cur = (sd, s)
        if not cur:
            out.append(None)
            continue
        nxt = [sd for (sd, s) in starts if sd > dt]
        last = bool(nxt) and nxt[0] == dt + timedelta(days=1)
        d = (dt - cur[0]).days + 1
        m = cur[1]
        Yc, cm = dt.year, dt.month
        rel = (m - S['start']) % 12
        Ys = Yc - 1 if (cm < S['cs'] or (cm == S['cs'] and rel >= 6)) else Yc
        saka = Ys - 78
        if system == 'tamil':
            tv = Yc + 30 if (cm == 1 and m == 8) else Yc + 31
            era = f"{samv(saka)} (Saka {saka}), Thiruvalluvar {tv}"
        elif system == 'malayalam':
            era = f"Kollam {Ys - 824}"
        elif system == 'bengali':
            era = f"Bangabda {Ys - 593}"
        elif system == 'assamese':
            era = f"Bhaskarabda {Ys - 593}, Saka {saka}"
        elif system == 'punjabi':
            era = f"Bikrami {Ys + 57}"
        else:
            era = f"{samv(saka)} (Saka {saka})"
        ev = []
        for (em, ed, nm, cat) in SOLAR_EV[system]:
            if em == m and (ed == d or (ed == 'last' and last)):
                ev.append({'id': 'solar', 'name': nm, 'cat': cat, 'pub': 0, 'regional': S['state']})
        if system == 'punjabi' and d == 1 and m not in (0, 9):
            ev.append({'id': 'solar', 'name': f"{S['names'][m]} Sangrand", 'cat': 'fest', 'pub': 0, 'regional': S['state']})
        nk = naks[i] if naks else None
        if system == 'malayalam' and nk is not None:
            if m == 4 and nk == 21:
                ev.append({'id': 'solar', 'name': 'Thiruvonam (Onam)', 'cat': 'hol', 'pub': 0, 'regional': 'Kerala'})
            if m == 8 and nk == 5:
                ev.append({'id': 'solar', 'name': 'Thiruvathira', 'cat': 'fest', 'pub': 0, 'regional': 'Kerala'})
        out.append({'d': d, 'm': m, 'name': S['names'][m], 'era': era, 'last': last, 'ev': ev})
    return out
