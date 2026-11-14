"""Transit reading (gochara) for a native: every planet from the natal Moon, refined by vedha, by the natal lagna and by the
running dasa, then amalgamated into life domains. Also the daily "Today" strip (Moon, Tara bala, Chandra bindus).

Layers (each one is explained in guide()):
  1. From Moon: classical favourable houses and their results (the baseline).
  2. Vedha: a favourable house is cancelled when its vedha house is occupied by another transiting planet.
  3. From Lagna: the house from lagna routes the result to a life area; the planet's lordship for this lagna sets whether it
     is a functional benefic or malefic; upachaya and benefic houses add a small agreement term.
  4. Ashtakavarga bindus: shown as information only (not scored).
  5. Dasa lens: the running dasa lords decide how fully transits deliver, which transits are triggers and which domains are
     concentrated. Shown beside the transit-only result so the effect of the dasa is visible.
  6. Special flags: Sade Sati, Ashtama Shani, Janma Guru (display only, to avoid double counting).
These are traditional rules. Weights are proposals and editable. An astrological reading, not a forecast.
"""
from .consts import *
from . import core, transit
from . import dasa as DS
from .core import LOCK
from . import gochara_text as GT

FAV = transit.FAVORABLE_FROM_MOON
BODIES = ['Sun', 'Moon', 'Mars', 'Mercury', 'Jupiter', 'Venus', 'Saturn', 'Rahu', 'Ketu']
NATURAL_MAL = {'Sun', 'Mars', 'Saturn', 'Rahu', 'Ketu'}
NATURAL_BEN = {'Moon', 'Mercury', 'Jupiter', 'Venus'}

# favourable house from Moon -> vedha house (the house whose occupant cancels it). Nodes have no vedha table.
VEDHA = {
    'Sun': {3: 9, 6: 12, 10: 4, 11: 5},
    'Moon': {1: 5, 3: 9, 6: 12, 7: 2, 10: 4, 11: 8},
    'Mars': {3: 12, 6: 9, 11: 5},
    'Mercury': {2: 5, 4: 3, 6: 9, 8: 1, 10: 8, 11: 12},
    'Jupiter': {2: 12, 5: 4, 7: 3, 9: 10, 11: 8},
    'Venus': {1: 8, 2: 7, 3: 1, 4: 10, 5: 9, 8: 5, 9: 11, 11: 6, 12: 3},
    'Saturn': {3: 12, 6: 9, 11: 5},
}
VEDHA_EXEMPT = {('Sun', 'Saturn'), ('Saturn', 'Sun'), ('Moon', 'Mercury'), ('Mercury', 'Moon')}
VEDHA_GIVERS = ['Sun', 'Moon', 'Mars', 'Mercury', 'Jupiter', 'Venus', 'Saturn']

# strength of each planet in each house from the natal Moon (index 0 = 1st house): positive where the house is favourable,
# negative where it is not, graded by how strongly the classical results speak of it (Ashtama Shani and Sade Sati houses are the heaviest).
BASE = {
    'Sun': [-0.5, -1, 1, -0.5, -0.75, 1, -0.5, -1.5, -0.75, 1, 1.25, -1],
    'Moon': [0.75, -0.75, 0.5, -0.5, -0.5, 0.75, 0.75, -1, -0.75, 0.75, 1, -0.75],
    'Mars': [-0.75, -1, 1, -0.5, -0.75, 1.25, -0.75, -1.5, -1, -0.5, 1.5, -1],
    'Mercury': [-0.75, 0.75, -0.5, 0.75, -0.5, 1, -0.75, 0.75, -0.5, 1, 1.25, -0.75],
    'Jupiter': [-1, 1, -0.75, -0.5, 1.25, -0.75, 1, -1, 1.25, -0.5, 1.5, -0.75],
    'Venus': [1, 1, 0.75, 0.75, 1, -0.75, -0.75, 0.75, 0.75, -0.5, 1, 0.5],
    'Saturn': [-1.5, -1, 1, -0.35, -0.6, 1, -0.35, -2, -0.6, -0.35, 1.5, -1],
    'Rahu': [-0.75, -1, 1, -0.5, -0.75, 1.25, -0.5, -1.25, -0.75, 1, 1.25, -1],
    'Ketu': [-0.75, -1, 1, -0.5, -0.75, 1.25, -0.5, -1.25, -0.75, 1, 1.25, -1],
}
BASE_MEAN = {p: sum(v) / 12 for p, v in BASE.items()}

# result of each planet in each house from the natal Moon (index 0 = 1st house). Paraphrased from the classical gochara results.
EFFECT = {
    'Sun': ['Energy runs warm: pace yourself, mind the ego', 'Watch spending and speech; family needs patience', 'Courage, gains and the upper hand over rivals; good health',
            'Home life needs calm; look after digestion', 'Thoughtful, a little anxious about children or rivals; stay steady', 'Rivals ease, health improves, debts reduce',
            'Travel and partnerships need tact; go easy on food', 'Take care of health; seniors need diplomacy', 'Luck comes slower; be patient with father or elders',
            'Success at work, recognition, rise in status', 'Gains, honour, good health, goals met', 'Spending rises; rest, and ease eye strain'],
    'Moon': ['Comfort, good food, a steady pleasant mood', 'Spending rises; keep speech and family talk gentle', 'Small gains, courage; messages and short trips go well',
             'Home feels restless; give the mind some quiet', 'Thoughts run fast; keep plans simple', 'Overcomes rivals, health improves, debts ease',
             'Gains through others, social ease, good company', 'Mood is sensitive; rest and go gently', 'Plans move slowly; patience pays',
             'Work goes well, tasks completed, recognition', 'Gains, happy news, wishes fulfilled', 'Spending rises; protect sleep, a reflective mood'],
    'Mars': ['Strong drive; channel the heat into exercise', 'Guard money and speech; family talks need calm', 'Courage, energy, wins in competition, gains',
             'Keep home peaceful; watch heat in the body', 'Energy is high; think before acting', 'Rivals are overcome, strong health, gains',
             'Partnerships need patience; look after eyes and digestion', 'Take care physically; a time for caution and research', 'Fortune needs effort; respect elders and drive carefully',
             'Pressure at work; steady, planned moves protect your standing', 'Gains, property or income success, recognition', 'Expenses are heavy; rest well and keep outflow deliberate'],
    'Mercury': ['Mind is busy; slow down and be careful with money', 'Money comes in, comfort, good speech', 'Rivals test you; clear communication wins',
                'Comfort, gains, friends; property matters help', 'Study and children need patience; clarify before deciding', 'Victory, income, problems solved by wit',
                'Partnerships need open talk; travel needs planning', 'Sudden gains, honour, happiness through children', 'Check documents and decisions twice',
                'Success, progress, deals go through', 'Gains in all forms, happy news, support from friends', 'Spending needs a plan; keep communication clear'],
    'Jupiter': ['Seek direction and keep faith; guard your position', 'Wealth, family harmony, good speech', 'Be ready to move; effort builds slowly',
                'Peace of mind needs tending; look after the home', 'Children, learning and honour; wisdom and prosperity', 'Rivals and health need attention; steady habits help',
                'Gains through spouse and partners, travel, fortune', 'Go gently; a time for inner work, study and patience', 'Good fortune, faith, success and happiness',
                'Work is demanding; stay close to seniors and your skills', 'Gains of every kind, good health, happiness', 'Expenses rise; build quiet, restful routines'],
    'Venus': ['Comfort, pleasure, good food and company', 'Wealth, good fortune, family happiness', 'Success, friends, happiness',
              'Friends, comforts, property or vehicle gains', 'Children, honour, romance and joy', 'Small disappointments possible; care for health and talk things through',
              'Partnerships need warmth; take care of health', 'Gains, comforts, sudden money', 'Fortune, faith, pleasant travel',
              'Keep work relations smooth; tact with authority', 'Gains, friends and comfort; wishes fulfilled', 'Pleasures and luxury; money spent on comfort'],
    'Saturn': ['Slow, serious phase; build energy with routine and rest', 'Money and family ask for care; speak with kindness', 'Gains, steady effort pays, good health',
               'Home asks for patient attention; protect comfort', 'Think carefully about children and decisions; steady judgement', 'Victory over rivals, wealth, good health',
               'Partnerships and travel move slowly; commit with care', 'A testing, inward period; health care and patience help', 'Fortune arrives slowly; respect elders and plan journeys',
               'Work is demanding but builds lasting standing', 'Gains, honour and prosperity', 'Expenses rise; quiet routines and good sleep help'],
    'Rahu': ['Restless mind; ground yourself in routine', 'Watch spending and speech; family needs patience', 'Gains, courage, bold moves succeed',
             'Home needs calm; give the mind rest', 'Think clearly about children and plans; verify first', 'Victory over rivals, health and gains',
             'Partnerships need honest talk; plan travel', 'Be steady and well-informed; look after health', 'Luck is slower; listen to elders',
             'Success and rise through unconventional routes', 'Gains, desires fulfilled, network expands', 'Expenses, foreign matters; protect your sleep'],
    'Ketu': ['Inward mood; keep company and routine', 'Watch money and family talk; stay gentle', 'Gains, courage, quiet success',
             'Home needs peace; give the mind rest', 'Keep thoughts clear about children and plans', 'Victory over rivals, health and gains',
             'Partnerships need space and understanding', 'Go gently; good for research and inner work', 'Luck is slower; stay connected to elders',
             'Success through focus and detachment', 'Gains and fulfilment, spiritual progress', 'Retreat, expenses; good for spiritual work'],
}
HOUSE_AREA = ['body, vitality, self', 'money, family, speech', 'courage, siblings, short travel', 'home, mother, property, peace', 'children, study, creativity',
              'health upkeep, debts, rivals, service', 'spouse, partners, business', 'longevity, hidden matters, sudden events', 'fortune, father, long travel, dharma',
              'career and status', 'gains, network, goals', 'expenses, foreign lands, sleep, retreat']

# domains: houses counted from the natal lagna, and the natural significators (karakas)
DOMAINS = [
    {'id': 'health', 'name': 'Health and vitality', 'houses': [1, 6, 8], 'karakas': ['Sun', 'Moon', 'Mars', 'Saturn']},
    {'id': 'wealth', 'name': 'Wealth and family', 'houses': [2, 11], 'karakas': ['Jupiter', 'Venus', 'Mercury']},
    {'id': 'career', 'name': 'Career and status', 'houses': [10, 6, 11], 'karakas': ['Sun', 'Saturn', 'Mercury']},
    {'id': 'relations', 'name': 'Relationships and marriage', 'houses': [7, 5, 4], 'karakas': ['Venus', 'Jupiter', 'Moon']},
    {'id': 'children', 'name': 'Children and education', 'houses': [5, 9], 'karakas': ['Jupiter', 'Mercury']},
    {'id': 'home', 'name': 'Home, property, vehicles, mother', 'houses': [4], 'karakas': ['Moon', 'Venus', 'Mars']},
    {'id': 'siblings', 'name': 'Siblings and courage', 'houses': [3], 'karakas': ['Mars']},
    {'id': 'travel', 'name': 'Travel and relocation', 'houses': [3, 9, 12], 'karakas': ['Rahu', 'Moon']},
    {'id': 'legal', 'name': 'Debts, enemies, legal', 'houses': [6, 8, 12], 'karakas': ['Saturn', 'Mars', 'Rahu']},
    {'id': 'fortune', 'name': 'Fortune and spirituality', 'houses': [9, 12, 8], 'karakas': ['Jupiter', 'Ketu', 'Saturn']},
    {'id': 'mind', 'name': 'Mind and sleep', 'houses': [1, 4, 12], 'karakas': ['Moon', 'Mercury']},
]

# editable parameters (defaults are proposals)
PARAMS = {
    'w_Sun': (1.0, 'Weight of the Sun transit'), 'w_Moon': (0.5, 'Weight of the Moon transit (low: it moves in a day)'), 'w_Mars': (1.5, 'Weight of Mars'),
    'w_Mercury': (1.0, 'Weight of Mercury'), 'w_Jupiter': (3.0, 'Weight of Jupiter'), 'w_Venus': (1.0, 'Weight of Venus'),
    'w_Saturn': (3.0, 'Weight of Saturn'), 'w_Rahu': (2.0, 'Weight of Rahu'), 'w_Ketu': (2.0, 'Weight of Ketu'),
    'vedha_keep': (0.0, 'Share of a favourable result that survives a vedha (0 = cancelled fully)'),
    'fn_k': (0.15, 'Lagna layer: change per point of functional nature (benefic lifts, malefic mutes or worsens)'),
    'lagna_k': (0.3, 'Lagna layer: weight of the upachaya / benefic-house agreement term'),
    'house_a': (1.0, 'Domain routing: share when the transit house from lagna belongs to the domain'),
    'karaka_b': (0.6, 'Domain routing: share when the planet is a natural significator of the domain'),
    'dasa_k': (0.15, 'Dasa lens: change per point of dasa-lord strength'),
    'trig_lord': (1.5, 'Dasa lens: multiplier when the transiting planet is the Maha or Antar dasa lord'),
    'trig_sign': (1.3, 'Dasa lens: multiplier when the transiting planet crosses the natal sign of a dasa lord'),
    'dom_md': (1.25, 'Dasa lens: emphasis on domains tied to the Mahadasa lord'),
    'dom_ad': (1.15, 'Dasa lens: emphasis on domains tied to the Antardasa lord'),
    'centre': (1.0, 'Centering: 1 scores a domain against its typical level (planets sit in demanding houses more often than not), 0 turns it off'),
    'norm': (10.0, 'Scale: raw points that make a domain score of 100'),
}
LABELS = [(35, 'Strong'), (12, 'Supportive'), (-12, 'Mixed'), (-35, 'Go gently'), (-1e9, 'Testing')]
TARA = ['Janma', 'Sampat', 'Vipat', 'Kshema', 'Pratyari', 'Sadhaka', 'Vadha', 'Mitra', 'Parama Mitra']
TARA_PTS = [-0.5, 1, -1, 1, -1, 1, -1, 1, 1]
TARA_MEAN = ['birth star itself, mixed', 'wealth, favourable', 'care needed, mixed', 'well-being, favourable', 'resistance, take it slow',
             'achievement, favourable', 'sensitive, take care', 'friend, favourable', 'close friend, favourable']
ASPECTS = {'Mars': (4, 7, 8), 'Jupiter': (5, 7, 9), 'Saturn': (3, 7, 10)}
CONJ_PTS = {'Jupiter': 0.5, 'Venus': 0.5, 'Mercury': 0.25, 'Sun': 0.0, 'Mars': -0.5, 'Saturn': -0.5, 'Rahu': -0.5, 'Ketu': -0.5}
TRIKONA, KENDRA = (1, 5, 9), (4, 7, 10)


def ordn(n):
    return f"{n}{'th' if 10 <= n % 100 <= 20 else {1: 'st', 2: 'nd', 3: 'rd'}.get(n % 10, 'th')}"


def params_from(over):
    p = {k: v[0] for k, v in PARAMS.items()}
    for k, v in (over or {}).items():
        if k in p:
            try:
                p[k] = float(v)
            except (TypeError, ValueError):
                pass
    return p


def label(pct):
    for t, name in LABELS:
        if pct >= t:
            return name
    return 'Testing'


def tone_of(pct):
    return 'bu2' if pct >= 35 else 'bu1' if pct >= 12 else 'mx' if pct > -12 else 'be1' if pct > -35 else 'be2'


def house_of(sign, ref):
    return (sign - ref) % 12 + 1


def expected_raw(d, P):
    """Typical raw level of a domain if planets sat anywhere: used to score a domain against its usual level."""
    return sum(P['w_' + p] * (BASE_MEAN[p] + P['lagna_k'] * LS_MEAN[p]) * (P['house_a'] * len(d['houses']) / 12.0 + (P['karaka_b'] if p in d['karakas'] else 0)) for p in BODIES)


# ---------------------------------------------------------------- natal side
def owned_houses(planet, asc):
    return sorted(house_of(s, asc) for s in range(12) if SIGN_LORD[s] == planet)


def functional(planet, asc):
    """Functional nature of a planet for this lagna: (points -3..3, label, owned houses, note). Nodes act through their sign lord and are neutral."""
    if planet not in SEVEN:
        return 0, 'neutral', [], 'acts through its sign lord and conjunctions, so it is treated as neutral'
    hs = owned_houses(planet, asc)
    ben = planet in NATURAL_BEN
    pts, parts = 0, []
    for h in hs:
        if h in (1, 5, 9):
            v = 2
        elif h in KENDRA:
            v = 0 if ben else 1
        elif h == 8:
            v = -2
        elif h in (3, 6, 11, 12):
            v = -1
        else:
            v = 0
        pts += v
        parts.append(f"{ordn(h)} lord {'+' if v > 0 else ''}{v}")
    if any(h in TRIKONA for h in hs) and any(h in KENDRA for h in hs):
        pts += 1
        parts.append('yogakaraka +1')
    pts = max(-3, min(3, pts))
    lab = 'strong benefic' if pts >= 2 else 'benefic' if pts == 1 else 'mixed' if pts == 0 else 'malefic' if pts == -1 else 'strong malefic'
    return pts, lab, hs, ', '.join(parts)


def lagna_support(planet, h):
    """Agreement of the house from lagna with the planet's nature: +1 supportive, 0 neutral, -1 straining."""
    if planet in NATURAL_MAL:
        return 1 if h in (3, 6, 10, 11) else -1 if h in (1, 4, 7, 8, 12) else 0
    return 1 if h in (1, 2, 4, 5, 7, 9, 10, 11) else -1 if h in (6, 8, 12) else 0


LS_MEAN = {p: sum(lagna_support(p, h) for h in range(1, 13)) / 12 for p in BODIES}


def lord_strength(chart, planet):
    """Natal strength of a dasa lord, -2..+2: dignity, house and combustion."""
    pm = chart['pmap']
    p = pm[planet]
    if planet in SEVEN:
        d = p.get('dignity', 'sama')
        dig = {'exalted': 2, 'moolatrikona': 2, 'own': 2, 'adhimitra': 1, 'mitra': 1, 'sama': 0, 'satru': -1, 'adhisatru': -1, 'debilitated': -2}.get(d, 0)
        dlabel = d
    else:
        disp = SIGN_LORD[p['sign']]
        dd = pm[disp].get('dignity', 'sama')
        dig = round(0.5 * {'exalted': 2, 'moolatrikona': 2, 'own': 2, 'adhimitra': 1, 'mitra': 1, 'sama': 0, 'satru': -1, 'adhisatru': -1, 'debilitated': -2}.get(dd, 0))
        dlabel = f"via {disp} ({dd})"
    h = p['house']
    ht = 1 if h in (1, 4, 5, 7, 9, 10) else -1 if h in (6, 8, 12) else 0
    cb = -1 if p.get('combust') else 0
    s = max(-2, min(2, dig + ht + cb))
    return s, dlabel, ht, cb


def strength_word(s):
    return 'strong' if s >= 2 else 'good' if s == 1 else 'average' if s == 0 else 'weak' if s == -1 else 'very weak'


# ---------------------------------------------------------------- the reading
def dasa_path(chart, jd):
    """Vimshottari path at jd. The cycle repeats every 120 years, so charts older than that (national charts) are shifted back
    by whole cycles and the printed years are moved forward again."""
    path = DS.dasa_at(chart, jd, 3)
    if path:
        return path
    mds, _, _ = DS.vimsottari_mds(chart)
    cyc = 120 * chart['meta']['cfg'].get('year_days', 365.2425)
    n = int((jd - mds[0]['start']) // cyc)
    if n <= 0:
        return path
    path = DS.dasa_at(chart, jd - n * cyc, 3)
    for lv in path:
        for k in ('start', 'end'):
            lv[k] = f"{int(lv[k][:4]) + 120 * n}{lv[k][4:]}"
    return path


def evaluate(chart, jd, params=None, when_label='', tz_label=''):
    P = params_from(params)
    asc = chart['asc']['sign']
    with LOCK:
        snap = transit.snapshot(chart, jd)
    rows = {r['planet']: r for r in snap['rows']}
    moon_sign = chart['pmap']['Moon']['sign']

    # ---- dasa lens
    path = dasa_path(chart, jd)
    lords = []
    for lv in path[:3]:
        pl = lv['lord']
        np_ = chart['pmap'][pl]
        s, dlab, ht, cb = lord_strength(chart, pl)
        fnp, fnl, owns, fnnote = functional(pl, asc)
        lords.append({'level': lv['level'], 'lord': pl, 'start': lv['start'][:10], 'end': lv['end'][:10], 'sign': SIGNS[np_['sign']], 'sign_idx': np_['sign'],
                      'house_lagna': np_['house'], 'house_moon': house_of(np_['sign'], moon_sign), 'dignity': np_.get('dignity', '-') if pl in SEVEN else dlab,
                      'owns': owns, 'fn': fnp, 'fn_label': fnl, 'strength': s, 'strength_word': strength_word(s), 'combust': bool(np_.get('combust'))})
    wts = [0.5, 0.3, 0.2]
    L = sum(w * l['strength'] for w, l in zip(wts, lords))
    md = lords[0] if lords else None
    ad = lords[1] if len(lords) > 1 else None
    lord_names = {l['lord'] for l in lords[:2]}
    lord_signs = {l['sign_idx']: l['lord'] for l in lords[:2]}

    def dom_focus(l):
        hs = set(l['owns']) | {l['house_lagna']}
        return [d['id'] for d in DOMAINS if hs & set(d['houses'])]
    md_dom = set(dom_focus(md)) if md else set()
    ad_dom = set(dom_focus(ad)) if ad else set()

    # ---- per planet
    occupied = {p: rows[p]['house_moon'] for p in BODIES}
    out, notes_fl = [], []
    for p in BODIES:
        r = rows[p]
        hm, hl = r['house_moon'], r['house_lagna']
        fav = hm in FAV[p]
        steps = []
        vh = by = None
        base_v = BASE[p][hm - 1]
        grade = 'strongly' if abs(base_v) >= 1.25 else 'clearly' if abs(base_v) >= 0.75 else 'mildly'
        if fav:
            term = base_v
            steps.append({'layer': 'From Moon', 'text': f"{p} is in the {ordn(hm)} house from natal Moon, a {grade} favourable position", 'pts': round(base_v, 2)})
            vtab = VEDHA.get(p)
            if vtab and hm in vtab:
                vh = vtab[hm]
                culprits = [q for q in VEDHA_GIVERS if q != p and (p, q) not in VEDHA_EXEMPT and occupied[q] == vh]
                if culprits:
                    by = culprits[0]
                    term = P['vedha_keep'] * base_v
                    steps.append({'layer': 'Vedha', 'text': f"{by} sits in the {ordn(vh)} from Moon, the vedha house for the {ordn(hm)}, so the good result is blocked", 'pts': round(term - base_v, 2)})
                else:
                    steps.append({'layer': 'Vedha', 'text': f"No planet in the {ordn(vh)} from Moon, so nothing obstructs it", 'pts': 0})
            elif p in ('Rahu', 'Ketu'):
                steps.append({'layer': 'Vedha', 'text': 'Nodes have no vedha rule in this reading', 'pts': 0})
        else:
            term = base_v
            steps.append({'layer': 'From Moon', 'text': f"{p} is in the {ordn(hm)} house from natal Moon, a {grade} demanding position", 'pts': round(base_v, 2)})
        sgn = 1 if base_v > 0 else -1
        blocked = fav and by is not None
        fnp, fnl, owns, fnnote = functional(p, asc)
        adj = term * (1 + P['fn_k'] * fnp * sgn)
        if term != 0:
            d_fn = round(adj - term, 3)
            word = ('lifts' if d_fn > 0 else 'mutes' if d_fn < 0 else 'leaves unchanged') if sgn > 0 else ('softens' if d_fn > 0 else 'sharpens' if d_fn < 0 else 'leaves unchanged')
            if p in SEVEN:
                steps.append({'layer': 'Lagna lordship', 'text': f"For this lagna {p} rules the {'/'.join(ordn(h) for h in owns)} ({fnnote}), a {fnl}; this {word} the result", 'pts': d_fn})
        ls = lagna_support(p, hl)
        lag_t = P['lagna_k'] * ls
        kind = 'malefic' if p in NATURAL_MAL else 'benefic'
        steps.append({'layer': 'Lagna house', 'text': f"{p} is in the {ordn(hl)} house from lagna ({HOUSE_AREA[hl - 1]}); for a natural {kind} this is {'supportive' if ls > 0 else 'straining' if ls < 0 else 'neutral'}", 'pts': round(lag_t, 3)})
        base = adj + lag_t
        score = P['w_' + p] * base
        # dasa lens version
        trig, trig_why = 1.0, ''
        if p in lord_names:
            trig, trig_why = P['trig_lord'], f"{p} is the running {'Mahadasa' if md and md['lord'] == p else 'Antardasa'} lord"
        elif r['sign_idx'] in lord_signs:
            trig, trig_why = P['trig_sign'], f"{p} crosses the natal sign of the {lord_signs[r['sign_idx']]} dasa lord"
        dmod = 1 + P['dasa_k'] * L * sgn
        base_d = term * (1 + P['fn_k'] * fnp * sgn) * dmod + lag_t
        score_d = P['w_' + p] * trig * base_d
        if term != 0:
            dword = ('raises the result' if dmod > 1 else 'lowers the result' if dmod < 1 else 'leaves it unchanged') if sgn > 0 else ('softens the result' if dmod > 1 else 'sharpens the result' if dmod < 1 else 'leaves it unchanged')
            steps.append({'layer': 'Dasa lens', 'text': f"Dasa strength {L:+.2f} {dword}" + (f"; {trig_why} (x{trig:g})" if trig_why else ''), 'pts': round((base_d - base) , 3)})
        elif trig_why:
            steps.append({'layer': 'Dasa lens', 'text': f"{trig_why} (x{trig:g})", 'pts': 0})
        eff = GT.combo_head(p, hl, hm, bool(fav and not blocked))
        if blocked:
            eff = f"Good result held back by {by}. Normally: {eff[0].lower() + eff[1:]}"
        notes = []
        if p == 'Saturn':
            if hm in (12, 1, 2):
                notes.append({'t': 'flag', 'text': 'Sade Sati ' + {12: 'first phase', 1: 'peak phase', 2: 'last phase'}[hm]})
            if hm == 8:
                notes.append({'t': 'flag', 'text': 'Ashtama Shani'})
            if hm in (4, 7, 10):
                notes.append({'t': 'mild', 'text': 'Kantaka Shani (mild; far gentler than Sade Sati or Ashtama Shani)'})
        if p == 'Jupiter' and hm == 1:
            notes.append({'t': 'flag', 'text': 'Janma Guru'})
        out.append({'planet': p, 'sign': r['sign'], 'deg': r['deg'], 'nak': r['nakshatra'], 'pada': r['pada'], 'retro': bool(r['retro']), 'house_moon': hm, 'house_lagna': hl,
                    'area': HOUSE_AREA[hl - 1], 'fav': fav, 'blocked': blocked, 'vedha_by': by, 'vedha_house': vh,
                    'state': 'blocked' if blocked else 'good' if fav else 'bad', 'effect': eff, 'fn': fnp, 'fn_label': fnl, 'owns': owns, 'lagna_support': ls,
                    'bindus': r['bindus'], 'bindus_tone': None if r['bindus'] is None else ('supports' if r['bindus'] >= 4 else 'average' if r['bindus'] == 3 else 'weak'),
                    'weight': P['w_' + p], 'score': round(score, 3), 'score_dasa': round(score_d, 3), 'trigger': trig, 'trigger_why': trig_why, 'steps': steps, 'notes': notes,
                    'sign_idx': r['sign_idx']})

    # ---- flags (display only: Saturn's and Jupiter's own terms already carry the score)
    flags = []
    sat, jup = rows['Saturn'], rows['Jupiter']
    if sat['house_moon'] in (12, 1, 2):
        ph = {12: ('first phase', 'Saturn in the 12th from Moon: expenses, isolation, sleep, a heavier mind'), 1: ('peak phase', 'Saturn over natal Moon: the heaviest stretch for body, mind and ease'),
              2: ('last phase', 'Saturn in the 2nd from Moon: strain on money, family and speech')}[sat['house_moon']]
        flags.append({'id': 'sade', 'level': 'major', 'title': 'Sade Sati ' + ph[0], 'text': ph[1]})
    if sat['house_moon'] == 8:
        flags.append({'id': 'ashtama', 'level': 'major', 'title': 'Ashtama Shani', 'text': 'Saturn in the 8th from Moon: a testing, inward period; health care, patience and sound planning help'})
    if jup['house_moon'] == 1:
        flags.append({'id': 'janma_guru', 'level': 'moderate', 'title': 'Janma Guru', 'text': 'Jupiter over natal Moon: a time to set realistic goals and avoid over-commitment; support comes through its aspects'})
    lag_sign = asc
    protect, press = [], []
    for pl, houses in (('Jupiter', (5, 7, 9)), ('Saturn', (3, 7, 10))):
        s0 = rows[pl]['sign_idx']
        for tgt, nm in ((moon_sign, 'natal Moon'), (lag_sign, 'natal lagna')):
            d = house_of(tgt, s0)
            if d in houses:
                (protect if pl == 'Jupiter' else press).append(f"{pl} aspects {nm} ({ordn(d)} aspect)")
    for t in protect:
        flags.append({'id': 'asp', 'level': 'support', 'title': 'Protective aspect', 'text': t})
    for t in press:
        flags.append({'id': 'asp', 'level': 'pressure', 'title': 'Pressure aspect', 'text': t})

    # ---- domains
    dom_out = []
    for d in DOMAINS:
        row = {'id': d['id'], 'name': d['name'], 'houses': d['houses'], 'karakas': d['karakas']}
        exp0 = expected_raw(d, P)
        for key, scorekey in (('transit', 'score'), ('dasa', 'score_dasa')):
            raw, drv = 0.0, []
            for o in out:
                share = (P['house_a'] if o['house_lagna'] in d['houses'] else 0) + (P['karaka_b'] if o['planet'] in d['karakas'] else 0)
                if not share:
                    continue
                v = o[scorekey] * share
                raw += v
                why = []
                if o['house_lagna'] in d['houses']:
                    why.append(f"in the {ordn(o['house_lagna'])} from lagna")
                if o['planet'] in d['karakas']:
                    why.append('natural significator')
                drv.append({'planet': o['planet'], 'pts': round(v, 2), 'why': ', '.join(why) + f"; {ordn(o['house_lagna'])} from lagna, {ordn(o['house_moon'])} from Moon is {'supportive' if o['fav'] else 'demanding'}" + (' (vedha)' if o['blocked'] else '')})
            emph = 1.0
            if key == 'dasa':
                if d['id'] in md_dom:
                    emph *= P['dom_md']
                if d['id'] in ad_dom:
                    emph *= P['dom_ad']
            raw -= P['centre'] * exp0
            pct = max(-100.0, min(100.0, 100 * raw * emph / P['norm']))
            drv.sort(key=lambda x: -abs(x['pts']))
            row[key] = {'pct': round(pct), 'label': label(pct), 'tone': tone_of(pct), 'emph': round(emph, 3), 'drivers': drv[:4]}
        dom_out.append(row)

    lens = {'path': lords, 'L': round(L, 2), 'md_domains': sorted(md_dom), 'ad_domains': sorted(ad_dom),
            'triggers': [{'planet': o['planet'], 'mult': o['trigger'], 'why': o['trigger_why']} for o in out if o['trigger_why']]}

    # ---- today strip (the Moon)
    mo = rows['Moon']
    moon_o = [o for o in out if o['planet'] == 'Moon'][0]
    birth_nak = chart['pmap']['Moon']['nak_idx']
    now_nak = int(mo['lon'] // NAK_SPAN)
    cnt = (now_nak - birth_nak) % 27 + 1
    ti = (cnt - 1) % 9
    conj, asp, reasons = [], [], []
    tot = 0.0
    mt = 1 if moon_o['state'] == 'good' else 0 if moon_o['state'] == 'blocked' else -1
    tot += mt
    reasons.append({'k': 'Moon from natal Moon', 'text': f"{ordn(mo['house_moon'])} house from Moon ({ordn(mo['house_lagna'])} from lagna), {'supportive' if moon_o['fav'] else 'demanding'}" + (f"; blocked by {moon_o['vedha_by']}" if moon_o['blocked'] else ''), 'pts': mt})
    tp = TARA_PTS[ti]
    tot += tp
    reasons.append({'k': 'Tara bala', 'text': f"{TARA[ti]} tara (count {cnt} from birth star {NAKSHATRAS[birth_nak]}): {TARA_MEAN[ti]}", 'pts': tp})
    ls = lagna_support('Moon', mo['house_lagna'])
    tot += 0.5 * ls
    reasons.append({'k': 'Moon from lagna', 'text': f"{ordn(mo['house_lagna'])} house ({HOUSE_AREA[mo['house_lagna'] - 1]}); for the Moon this is {'supportive' if ls > 0 else 'straining' if ls < 0 else 'neutral'}", 'pts': 0.5 * ls})
    for pl in BODIES:
        if pl == 'Moon':
            continue
        r = rows[pl]
        if r['sign_idx'] == mo['sign_idx']:
            conj.append(pl)
            v = CONJ_PTS[pl]
            tot += v
            reasons.append({'k': f"Moon with {pl}", 'text': 'conjunct in the same sign', 'pts': v})
        elif pl in ASPECTS or pl in ('Sun', 'Venus', 'Mercury'):
            dist = house_of(mo['sign_idx'], r['sign_idx'])
            hs = ASPECTS.get(pl, (7,))
            if dist in hs:
                asp.append(pl)
                v = CONJ_PTS[pl] * 0.5
                tot += v
                reasons.append({'k': f"{pl} aspects Moon", 'text': f"{ordn(dist)} aspect", 'pts': v})
    day_label = 'Supportive' if tot >= 2 else 'Mixed to supportive' if tot >= 1 else 'Mixed' if tot > -1 else 'Mixed, go gently' if tot > -2 else 'Testing'
    today = {'sign': mo['sign'], 'deg': mo['deg'], 'nak': mo['nakshatra'], 'pada': mo['pada'], 'house_moon': mo['house_moon'], 'house_lagna': mo['house_lagna'],
             'area': HOUSE_AREA[mo['house_lagna'] - 1], 'fav': moon_o['fav'], 'blocked': moon_o['blocked'], 'tara_no': ti + 1, 'tara': TARA[ti], 'tara_count': cnt,
             'nak_idx': now_nak, 'tara_good': TARA_PTS[ti] > 0, 'tara_mean': TARA_MEAN[ti], 'birth_nak': NAKSHATRAS[birth_nak], 'bindus': mo['bindus'], 'sav': mo['sav'], 'conj': conj, 'aspects': asp,
             'score': round(tot, 2), 'label': day_label, 'tone': 'bu2' if tot >= 2 else 'bu1' if tot >= 1 else 'mx' if tot > -1 else 'be1' if tot > -2 else 'be2', 'reasons': reasons}

    # ---- summary
    ranked = sorted(dom_out, key=lambda d: d['dasa']['pct'])
    summary = {'best': [d['name'] for d in ranked[::-1][:2] if d['dasa']['pct'] >= 12], 'worst': [d['name'] for d in ranked[:2] if d['dasa']['pct'] <= -12]}
    # ---- long-form interpretations (shown when a box is opened)
    names = lambda i: (next((d['name'] for d in DOMAINS if d['id'] == i), i))
    lagna_name = SIGNS[asc]
    for o in out:
        o['detail'] = GT.planet_detail(o, lagna_name, L, None)
    sat_o = next(o for o in out if o['planet'] == 'Saturn'); jup_o = next(o for o in out if o['planet'] == 'Jupiter')
    fctx = {'sat': sat_o, 'jup': jup_o, 'L': L, 'lagna': lagna_name}
    for f in flags:
        f['detail'] = GT.flag_detail(f, fctx)
    for l in lords:
        l['combo'] = GT.combo_short(l)
        l['detail'] = GT.lord_detail(l, lagna_name, {o['planet']: o for o in out})
    lens['detail'] = GT.lens_detail(lens, names, L)
    lens['rel'] = [GT.relation(lords[i], lords[i + 1], lagna_name) for i in range(len(lords) - 1)]
    today['detail'] = GT.today_details(today, {'lagna': lagna_name})
    return {'when': when_label, 'tz': tz_label, 'lagna': SIGNS[asc], 'moon_sign': SIGNS[moon_sign], 'moon_nak': chart['pmap']['Moon']['nak'], 'name': chart['meta'].get('name', ''),
            'today': today, 'planets': out, 'flags': flags, 'lens': lens, 'domains': dom_out, 'summary': summary}


def guide():
    return {
        'layers': [
            {'name': '1. From the natal Moon', 'what': 'Each planet is placed by house from the natal Moon and judged on the classical favourable houses.',
             'why': 'The Moon is the mind, and results are felt through the mind, so the classical texts count transits from the Janma Rasi. It is the baseline.',
             'vs': 'A planet judged only by its house from Moon gives the same sentence to everyone with your Moon sign. This layer alone cannot know your chart, so it is only the starting point.'},
            {'name': '2. Vedha (obstruction)', 'what': 'A favourable house is cancelled when its vedha house holds another transiting planet (Sun and Saturn, Moon and Mercury do not obstruct each other).',
             'why': 'The texts say a good position gives its result only if it is not obstructed.',
             'vs': 'Reading "Jupiter in the 5th is good" outright overpromises whenever another planet sits in its vedha house.'},
            {'name': '3. From the natal lagna', 'what': 'The house from lagna names the life area touched. The planet\'s lordship for your lagna sets whether it is a functional benefic or malefic. Upachaya houses (3, 6, 10, 11) suit malefics and kendra, trikona and gain houses suit benefics, as a small agreement term.',
             'why': 'Moon says how the result feels. Lagna says where it lands and whether this planet is friendly to you.',
             'vs': 'Saturn in the 11th from Moon gains for everyone, but for a lagna where Saturn rules the 6th and 8th the gain comes with strain. A raw house reading cannot see that.'},
            {'name': '4. Ashtakavarga bindus', 'what': 'The planet\'s own bindus in the sign it transits (4 or more supports, 3 average, 2 or fewer weak). Shown as information only.',
             'why': 'It measures how strongly the planet can deliver in that sign for this chart.',
             'vs': 'Two natives with the same house placement get different delivery. It is not scored, so you can judge it yourself.'},
            {'name': '5. Dasa lens', 'what': 'The running Maha, Antar and Pratyantar lords set how fully transits deliver (by their natal strength), which transits are triggers (a transit by a dasa lord, or across its natal sign, counts more) and which domains the period concentrates on.',
             'why': 'The dasa is the promise carried in the natal chart and the transit is the timing. A transit delivers what the dasa allows.',
             'vs': 'A fine transit in a weak dasa under-delivers, and a poor one in a strong dasa hurts less. The lens is shown beside the transit-only result so you can see exactly what it changed.'},
            {'name': '6. Special flags', 'what': 'Sade Sati, Ashtama Shani and Janma Guru are flagged; Kantaka Shani is only noted (mild). Jupiter and Saturn aspects on natal Moon or lagna are noted.',
             'why': 'These are long, well-known periods that outweigh daily changes and need to be seen first.',
             'vs': 'They are display only. Saturn and Jupiter\'s positions already carry their score, so scoring the flag again would double count.'},
        ],
        'favourable': FAV, 'vedha': {p: {str(k): v for k, v in t.items()} for p, t in VEDHA.items()},
        'params': [{'id': k, 'default': v[0], 'text': v[1]} for k, v in PARAMS.items()],
        'domains': DOMAINS,
        'method': [
            'Planet score = weight x (Moon term x lagna-lordship factor + lagna agreement). The Moon term is the strength of that house for that planet (about +1.5 to -2, graded from the classical results; Ashtama Shani and Sade Sati houses are the heaviest) and it drops to 0 when vedha cancels a good result.',
            'Each planet\'s score is routed to the domains whose houses (counted from lagna) hold the planet, plus a smaller share to domains it naturally signifies.',
            'Domain score = routed total, measured against that domain\'s typical level (planets sit in demanding houses more often than not, so this keeps Testing and Strong for real extremes), divided by the scale, shown from -100 to +100. Labels: Strong 35 and above, Supportive 12 to 35, Mixed within 12, Go gently -12 to -35, Testing below -35.',
            'With dasa: the same sum after the dasa strength factor, trigger multipliers and domain emphasis. Both columns are shown.',
            'Today strip: Moon from natal Moon, Tara bala from the birth star, Moon from lagna, and Moon\'s conjunctions and aspects. Chandra bindus are information only.',
            'Open items to verify against Raman: which planets can give vedha (nodes are excluded as givers and have no vedha table), and the exact lagna agreement rule.',
            'Traditional rules, not tested. These are indicative tendencies from classical texts, given to help you prepare rather than to alarm. Your effort and choices change outcomes, and a professional astrologer who studies the whole chart gives the most reliable reading. Astrological only; may not apply to the real world.',
        ],
    }
