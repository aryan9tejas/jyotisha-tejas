"""Parivartana yoga (mutual exchange of signs): detection and readings.
Classes follow Phaladeepika VI.32-34 and the Parashari tradition: Maha (lords of 1,2,4,5,7,9,10,11), Khala (3rd lord with one of those),
Dainya (a 6th, 8th or 12th lord is involved). Readings are tendencies, worded constructively."""

SEVEN = ['Sun', 'Moon', 'Mars', 'Mercury', 'Jupiter', 'Venus', 'Saturn']
OWN = {'Sun': [4], 'Moon': [3], 'Mars': [0, 7], 'Mercury': [2, 5], 'Jupiter': [8, 11], 'Venus': [1, 6], 'Saturn': [9, 10]}
SIGNS = ['Aries', 'Taurus', 'Gemini', 'Cancer', 'Leo', 'Virgo', 'Libra', 'Scorpio', 'Sagittarius', 'Capricorn', 'Aquarius', 'Pisces']
AREA = {1: 'self and health', 2: 'money and family', 3: 'effort and communication', 4: 'home and peace', 5: 'children and learning', 6: 'work and health upkeep',
        7: 'partnerships', 8: 'hidden matters', 9: 'travel, beliefs and mentors', 10: 'career and status', 11: 'gains and networks', 12: 'expenses and rest'}
DUS = {6: 'service, competition and daily upkeep', 8: 'depth, research, change and the unseen', 12: 'expenses, retreat and distant places'}
DUS_ADV = {6: 'Keep health routines, debts and disputes in order, and the skill and service you bring win through.',
           8: 'Expect some sudden changes and shared-resource matters, and research, depth and transformation turn them into growth.',
           12: 'Watch spending and sleep, and use the pull toward retreat, travel and distant or institutional settings for gain and spiritual progress.'}


def ordn(n):
    return f"{n}{'th' if 10 <= n % 100 <= 20 else {1: 'st', 2: 'nd', 3: 'rd'}.get(n % 10, 'th')}"

SPECIAL = {
    (9, 10): 'This is the Dharma-Karmadhipati link, among the most respected Raja yoga formations: purpose and profession pull in one direction, so the right work, good mentors and public standing build together.',
    (5, 9): 'Learning, creativity and good fortune feed each other, so merit shows up through study, children, teachers and well-timed luck.',
    (2, 11): 'Income and gains reinforce each other, so savings, steady earning and a useful network grow together.',
    (4, 10): 'Home and profession support each other: property, a settled base and career progress go hand in hand.',
    (1, 10): 'Personal identity and status are tied, so how you present yourself directly lifts your standing at work.',
    (1, 5): 'Self-confidence and intelligence work as one, favouring leadership, creative output and recognised talent.',
    (1, 9): 'Self and fortune are linked, so character, belief and blessings from elders or teachers carry you.',
    (1, 2): 'Self and resources are linked, so wealth comes through your own effort, speech and personal brand.',
    (1, 11): 'Self and gains are linked, so your own initiative opens income and a helpful circle.',
    (2, 5): 'Money comes through intellect, advice and creative or educational work; calculated risks suit it better than speculation.',
    (2, 9): 'Wealth and fortune are linked, favouring earning through teaching, law, travel or tradition.',
    (2, 10): 'Income and career rise together, so work is the main engine of finances.',
    (4, 5): 'Peace of mind and intelligence support each other, good for study, a happy home and creative comfort.',
    (4, 9): 'Home, mother and fortune support each other, favouring property, higher education and a secure base.',
    (5, 10): 'Intelligence and career are tied, favouring advisory, creative or authority roles.',
    (5, 11): 'Ideas turn into gains, favouring income from creative work, investments through study and a supportive circle.',
    (7, 10): 'Partnerships and profession lift each other, favouring business partnerships, clients and a supportive spouse in career matters.',
    (7, 9): 'Partnerships and fortune are linked, so spouse, partners and travel bring luck.',
    (10, 11): 'Career converts into gains, favouring profit and recognition from work.',
    (9, 11): 'Fortune turns into gains, favouring income through mentors, foreign links and long-term goals.',
    (1, 4): 'Self and home are tied, giving emotional stability and a strong sense of belonging.',
    (1, 7): 'Self and partnership are tied, so the other person or the public plays a large part in who you become.',
    (2, 4): 'Family wealth and home are linked, favouring inheritance, property and a comfortable base.',
    (2, 7): 'Money and partnerships are linked, favouring earning through shared ventures and the spouse.',
    (4, 7): 'Home and partnership support each other, favouring a settled domestic life.',
    (4, 11): 'Home and gains are linked, favouring property and income that improve the household.',
    (5, 7): 'Intelligence and partnership are linked, favouring companionship through shared interests and learning.',
    (7, 11): 'Partnerships and gains are linked, favouring profit through collaboration and wide contacts.',
    (5, 9): 'Learning, creativity and good fortune feed each other, so merit shows up through study, children, teachers and well-timed luck.',
}


def exchanges(signs):
    """signs: planet -> sign index. Returns exchanges among the seven planets, each {'a','b','sa','sb'}."""
    out = []
    for i, a in enumerate(SEVEN):
        for b in SEVEN[i + 1:]:
            if a in signs and b in signs and signs[a] in OWN[b] and signs[b] in OWN[a]:
                out.append({'a': a, 'b': b, 'sa': signs[a], 'sb': signs[b]})
    return out


def classify(h1, h2):
    hs = {h1, h2}
    if hs & {6, 8, 12}:
        return 'Dainya', len(hs & {6, 8, 12}) == 2
    if 3 in hs:
        return 'Khala', False
    return 'Maha', False


def meaning(h1, h2):
    cls, both_dus = classify(h1, h2)
    key = tuple(sorted((h1, h2)))
    if cls == 'Maha':
        return cls, f"A Maha (great) exchange, the most favourable kind: both houses gain strength. " + SPECIAL.get(key, f"{AREA[key[0]].capitalize()} and {AREA[key[1]]} support each other, so progress in one lifts the other.")
    if cls == 'Khala':
        other = h2 if h1 == 3 else h1
        return cls, f"A Khala (mixed) exchange: courage, skill and self-effort (the 3rd house) are tied to {AREA[other]}. Results come through initiative and communication rather than ease, and improve with sustained effort."
    dus = [h for h in (h1, h2) if h in DUS]
    if both_dus:
        return cls, f"A Dainya exchange between two of the 6th, 8th and 12th houses, which the texts treat as Viparita Raja yoga: difficulty itself becomes the turning point, and rise follows setbacks handled with patience."
    d = dus[0]; other = h2 if d == h1 else h1
    return cls, (f"A Dainya exchange: the {ordn(d)} house ({DUS[d]}) is tied to {AREA[other]}. The classics call this testing, because {AREA[other]} gets drawn into those themes, so it rewards planning and care. "
                 + DUS_ADV[d])


def natal_paras(ex, hl_of, hm_of, HM, pl_note):
    """Paragraphs for one natal exchange. hl_of/hm_of: house from lagna / Moon of each planet. pl_note: sentence about the period."""
    a, b = ex['a'], ex['b']
    ha, hb = hl_of[a], hl_of[b]
    cls, txt = meaning(ha, hb)
    ma, mb = hm_of[a], hm_of[b]
    return (f"Parivartana yoga. {a} (in {SIGNS[ex['sa']]}) and {b} (in {SIGNS[ex['sb']]}) exchange signs, so each acts as if in its own sign and the {ordn(ha)} and {ordn(hb)} houses ({AREA[ha]} and {AREA[hb]}) work together. {txt} "
            f"{pl_note} From your Moon the pair sits in the {ordn(ma)} and {ordn(mb)}, so you experience it through {HM[ma]} and {HM[mb]}.")


def transit_para(ex, hl_of, hm_of):
    a, b = ex['a'], ex['b']
    ha, hb = hl_of[a], hl_of[b]
    cls, txt = meaning(ha, hb)
    return (f"Parivartana. {a} (in {SIGNS[ex['sa']]}) and {b} (in {SIGNS[ex['sb']]}) are exchanging signs, so each acts as if in its own sign for as long as it lasts. For you the {ordn(ha)} and {ordn(hb)} houses from lagna ({AREA[ha]} and {AREA[hb]}) cooperate. {txt}")


def mundane_para(ex, M):
    a, b = ex['a'], ex['b']
    return (f"Parivartana. {a} in {SIGNS[ex['sa']]} and {b} in {SIGNS[ex['sb']]} exchange signs, so each acts as if in its own sign and their themes work together: {M[a]} with {M[b]}. "
            f"The classics read this as a link that strengthens both; the matters of each planet move in step while the exchange lasts.")
