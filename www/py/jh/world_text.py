"""Traditional (Brihat Samhita style) mundane text for the World outlook: sign and planet meanings, pair effects, themes, industries,
eclipse and nation text. Pure data and small composers; the numbers come from world.py. Written as composed principles, not verse quotations."""

SIGNS = ['Aries', 'Taurus', 'Gemini', 'Cancer', 'Leo', 'Virgo', 'Libra', 'Scorpio', 'Sagittarius', 'Capricorn', 'Aquarius', 'Pisces']
SIGN_M = ['war, the military, leadership contests, mining and metals, sudden initiatives',
          'banking, agriculture, land, food, luxury goods, currency and savings',
          'media, communication, trade, the movement of goods, education and short-distance travel',
          'the homeland, housing, water, the food supply, public mood and women',
          'rulers and governments, power, prestige, entertainment, gold and speculation',
          'health systems, labour, service industries, analysis, pharmaceuticals and farming',
          'trade and treaties, law and justice, diplomacy, partnerships, the arts and fashion',
          'secrets, intelligence, insurance, debt, oil and mining, crises and transformation',
          'religion, higher learning, law, foreign affairs, long-distance travel and publishing',
          'governments and institutions, infrastructure, industry, labour, austerity and real estate',
          'technology, networks, science, the masses, social movements, aviation and reform',
          'oceans, oil and liquids, pharmaceuticals, charity, spirituality, hospitals, illusion and fraud']
SIGN_EL = ['fire', 'earth', 'air', 'water', 'fire', 'earth', 'air', 'water', 'fire', 'earth', 'air', 'water']
SIGN_LORD = ['Mars', 'Venus', 'Mercury', 'Moon', 'Sun', 'Mercury', 'Venus', 'Mars', 'Jupiter', 'Saturn', 'Saturn', 'Jupiter']
EXALT = {'Sun': 0, 'Moon': 1, 'Mars': 9, 'Mercury': 5, 'Jupiter': 3, 'Venus': 11, 'Saturn': 6}
DEBIL = {'Sun': 6, 'Moon': 7, 'Mars': 3, 'Mercury': 11, 'Jupiter': 9, 'Venus': 5, 'Saturn': 0}
OWN = {'Sun': [4], 'Moon': [3], 'Mars': [0, 7], 'Mercury': [2, 5], 'Jupiter': [8, 11], 'Venus': [1, 6], 'Saturn': [9, 10]}
FRIEND = {'Sun': ['Moon', 'Mars', 'Jupiter'], 'Moon': ['Sun', 'Mercury'], 'Mars': ['Sun', 'Moon', 'Jupiter'], 'Mercury': ['Sun', 'Venus'],
          'Jupiter': ['Sun', 'Moon', 'Mars'], 'Venus': ['Mercury', 'Saturn'], 'Saturn': ['Mercury', 'Venus']}
ENEMY = {'Sun': ['Venus', 'Saturn'], 'Moon': [], 'Mars': ['Mercury'], 'Mercury': ['Moon'], 'Jupiter': ['Mercury', 'Venus'], 'Venus': ['Sun', 'Moon'], 'Saturn': ['Sun', 'Moon', 'Mars']}
BENEFIC = {'Jupiter', 'Venus', 'Mercury', 'Moon'}

PLANET_M = {'Sun': 'rulers, governments, authority and gold', 'Moon': 'the public mood, the masses, food, water and silver',
            'Mars': 'armies, police, conflict, energy, land and metals', 'Mercury': 'trade, communication, technology, education and media',
            'Jupiter': 'finance, law, religion, institutions and wise counsel', 'Venus': 'consumption, luxury, the arts, entertainment and harmony between nations',
            'Saturn': 'labour, the working masses, austerity, oil and institutions', 'Rahu': 'technology, foreign influence, sudden disruption, mass obsession and deception',
            'Ketu': 'withdrawal, separatism, spirituality, research and sudden endings'}
PLANET_DUR = {'Sun': 'about a month', 'Moon': 'two to three days', 'Mars': 'about six weeks', 'Mercury': 'three to four weeks', 'Jupiter': 'about a year',
              'Venus': 'about four weeks', 'Saturn': 'about two and a half years', 'Rahu': 'about eighteen months', 'Ketu': 'about eighteen months'}
RETRO = {'Mercury': 'contracts, communications and technology glitch; deals are revisited and renegotiated; supply and logistics run late.',
         'Venus': 'consumer sentiment and luxury demand wobble; old relationships, treaties and art are re-evaluated.',
         'Mars': 'conflicts stall and re-ignite; military and construction plans are delayed; energy projects slip.',
         'Jupiter': 'expansion pauses; financial, legal and religious matters are re-examined; credit tightens before it eases.',
         'Saturn': 'old debts, laws and structures resurface; labour and austerity issues reopen; delays deepen before they clear.',
         'Rahu': 'always moving backward: the theme is a slow, repeating one, not a single event.', 'Ketu': 'always moving backward: the theme is a slow, repeating one, not a single event.'}

# ------------------------------------------------------------------ planet in sign
NODE_FRIEND = {'Rahu': ['Mercury', 'Venus', 'Saturn'], 'Ketu': ['Mars', 'Venus', 'Saturn']}
NODE_ENEMY = {'Rahu': ['Sun', 'Moon', 'Mars'], 'Ketu': ['Sun', 'Moon']}
NODE_EX = {'Rahu': 1, 'Ketu': 7}
NODE_DEB = {'Rahu': 7, 'Ketu': 1}


def dignity(p, s):
    if p in NODE_EX:
        if s == NODE_EX[p]:
            return 'exalted'
        if s == NODE_DEB[p]:
            return 'debilitated'
        lord = SIGN_LORD[s]
        return 'friend' if lord in NODE_FRIEND[p] else 'enemy' if lord in NODE_ENEMY[p] else 'neutral'
    if p in EXALT and EXALT[p] == s:
        return 'exalted'
    if p in DEBIL and DEBIL[p] == s:
        return 'debilitated'
    if p in OWN and s in OWN[p]:
        return 'own'
    if p in FRIEND:
        lord = SIGN_LORD[s]
        if lord in FRIEND[p]:
            return 'friend'
        if lord in ENEMY[p]:
            return 'enemy'
    return 'neutral'


def sign_meaning(p, s):
    d = dignity(p, s)
    nm = SIGNS[s]
    out = [f"{p} in {nm} ({SIGN_EL[s]}, ruled by {SIGN_LORD[s]}) works on {PLANET_M[p]} through the arena of {SIGN_M[s]}."]
    if p in ('Rahu', 'Ketu'):
        out.append(('Rahu amplifies and distorts ' if p == 'Rahu' else 'Ketu strips and detaches from ') + f"the {SIGN_EL[s]} themes of {nm}. Its result is coloured by {SIGN_LORD[s]}, the sign lord." + {'exalted': ' Exalted here, so its themes surge and succeed visibly.', 'debilitated': ' Debilitated here, so its themes misfire, overheat or collapse.', 'friend': ' This sign lord is friendly to the node, so it runs with less resistance.', 'enemy': ' This sign lord is hostile to the node, so results come with friction and backlash.', 'neutral': ''}[d])
    else:
        out.append({'exalted': f"Exalted: its significations are at full strength and tend to work constructively and visibly.",
                    'debilitated': f"Debilitated: its significations are strained and tend to disappoint, break down or turn corrupt. A strong {SIGN_LORD[s]} softens this.",
                    'own': f"In its own sign: steady, dependable and able to deliver what it promises.",
                    'friend': f"In a friendly sign ({SIGN_LORD[s]}'s): supported, and works with less resistance.",
                    'enemy': f"In an unfriendly sign ({SIGN_LORD[s]}'s): resisted, so results come with friction and effort.",
                    'neutral': f"In a neutral sign: results are ordinary and depend on aspects and conjunctions."}[d])
    return out


# ------------------------------------------------------------------ pairs (conjunction or aspect)
PAIRS = {
    frozenset(['Jupiter', 'Saturn']): 'Jupiter with Saturn: growth meets restraint. Policy is cautious, institutions reform slowly, and the cycle of the next two decades begins or turns.',
    frozenset(['Mars', 'Saturn']): 'Mars with Saturn: a hard, frictional pairing. Accidents, industrial and military crises, strikes, sudden violence and stalled projects are more likely.',
    frozenset(['Mars', 'Jupiter']): 'Mars with Jupiter: energy guided by wisdom. Righteous action, strong leadership, defence strength and productive investment.',
    frozenset(['Mars', 'Rahu']): 'Mars with Rahu (Angaraka): explosive and unpredictable. Fires, accidents, terrorism, sudden clashes and risky bravado.',
    frozenset(['Mars', 'Ketu']): 'Mars with Ketu: sharp, cutting energy. Surgical strikes, sudden injuries and abrupt ends to quarrels.',
    frozenset(['Jupiter', 'Rahu']): 'Jupiter with Rahu (Guru-Chandala): wisdom is clouded. Misleading advice, financial bubbles, religious or ideological extremism and fraud in institutions.',
    frozenset(['Jupiter', 'Ketu']): 'Jupiter with Ketu: spiritual depth and withdrawal. Good for research and faith, weaker for growth and credit.',
    frozenset(['Saturn', 'Rahu']): 'Saturn with Rahu: heavy disruption. Mass anxiety, labour unrest, supply shocks and sudden structural breaks.',
    frozenset(['Saturn', 'Ketu']): 'Saturn with Ketu: austerity and detachment. Slowdowns, quiet decline of old industries, introspection.',
    frozenset(['Venus', 'Saturn']): 'Venus with Saturn: pleasure meets restraint. Luxury spending cools, but quality, craft and long-term commitments are rewarded.',
    frozenset(['Venus', 'Mars']): 'Venus with Mars: passion and appetite. Consumer demand and entertainment heat up; relationship tensions and scandals surface.',
    frozenset(['Mercury', 'Rahu']): 'Mercury with Rahu: technology surges and misinformation spreads. Fast innovation, AI and media booms, hacking and rumour.',
    frozenset(['Mercury', 'Saturn']): 'Mercury with Saturn: serious, slow communication. Regulation and audits, cautious trade, deep but delayed results.',
    frozenset(['Mercury', 'Jupiter']): 'Mercury with Jupiter: knowledge and commerce expand. Good for education, publishing, banking and legal affairs.',
    frozenset(['Mercury', 'Venus']): 'Mercury with Venus: pleasant commerce. The arts, media, trade and diplomacy go smoothly.',
    frozenset(['Venus', 'Jupiter']): 'Venus with Jupiter: two benefics together. Prosperity, harmony and generous policy, though over-optimism can inflate prices.',
    frozenset(['Sun', 'Saturn']): 'Sun with Saturn: rulers meet the masses. Tension between governments and labour, delayed decisions, austerity.',
    frozenset(['Sun', 'Rahu']): 'Sun with Rahu (a grahana-type shadow): rulers are clouded or exposed. Scandals, political turbulence and overreach.',
    frozenset(['Sun', 'Ketu']): 'Sun with Ketu: authority is weakened or withdrawn. Leaders step back; sudden resignations are possible.',
    frozenset(['Sun', 'Mars']): 'Sun with Mars: authority backed by force. Strong state action, military display, heat and conflict.',
    frozenset(['Sun', 'Jupiter']): 'Sun with Jupiter: dignified rule. Wise governance, trust in institutions and a supportive tone for gold and public finance.',
    frozenset(['Moon', 'Saturn']): 'Moon with Saturn: a heavy public mood. Anxiety, fatigue and gloom in the masses; food and water cautions.',
    frozenset(['Moon', 'Rahu']): 'Moon with Rahu: a restless, fearful public mood and eclipse sensitivity.',
}


def pair_text(a, b, kind):
    t = PAIRS.get(frozenset([a, b]))
    if t:
        return t if kind == 'conjunction' else t.replace(' with ', ' aspecting ', 1)
    ben = (a in BENEFIC) + (b in BENEFIC)
    tone = 'a mostly constructive' if ben == 2 else 'a mixed' if ben == 1 else 'a pressured'
    return f"{a} {'with' if kind == 'conjunction' else 'aspecting'} {b}: {tone} blend of {PLANET_M[a]} and {PLANET_M[b]}."


# ------------------------------------------------------------------ themes
# kind: good (high is favourable), risk (high is pressure), mkt (commodity bias)
THEMES = [
    dict(id='economy', name='Economy and finance', kind='good', sig={'Jupiter': 3, 'Saturn': 2, 'Venus': 1.5, 'Mercury': 1.5},
         roles={'Jupiter': 'credit, banking and growth', 'Saturn': 'austerity, labour and the real economy', 'Venus': 'consumer demand and luxury spending', 'Mercury': 'trade, commerce and payments'},
         up='Credit flows, consumers spend and trade expands.', down='Credit tightens, demand cools and trade slows.'),
    dict(id='politics', name='Leaders and politics', kind='good', sig={'Sun': 3, 'Saturn': 2, 'Mars': 1.5, 'Moon': 1},
         roles={'Sun': 'rulers and governments', 'Saturn': 'the masses and opposition', 'Mars': 'security forces and the state', 'Moon': 'public opinion'},
         up='Rulers are steady and trusted; governments act with authority.', down='Rulers are challenged, coalitions strain and public trust slips.'),
    dict(id='conflict', name='War and conflict', kind='risk', sig={'Mars': 3, 'Rahu': 2, 'Ketu': 1.5, 'Saturn': 1.5},
         roles={'Mars': 'armies and aggression', 'Rahu': 'sudden and covert escalation', 'Ketu': 'cut-offs and separatism', 'Saturn': 'prolonged, grinding conflict'},
         up='Tensions are contained and diplomacy holds.', down='Border tension, covert action and sudden escalation are more likely.'),
    dict(id='gold', name='Gold', kind='mkt', sig={'Sun': 2, 'Jupiter': 2.5, 'Venus': 0.5},
         roles={'Sun': 'gold itself and state reserves', 'Jupiter': 'the traditional significator of gold and wealth', 'Venus': 'jewellery demand'},
         up='Gold tends to firm.', down='Gold tends to soften.'),
    dict(id='silver', name='Silver', kind='mkt', sig={'Moon': 2.5, 'Venus': 2, 'Mercury': 0.5},
         roles={'Moon': 'silver and the public mood', 'Venus': 'silver and consumption', 'Mercury': 'industrial use and trade'},
         up='Silver tends to firm.', down='Silver tends to soften.'),
    dict(id='oil', name='Oil and energy', kind='mkt', sig={'Saturn': 2.5, 'Rahu': 1.5, 'Mars': 1.5, 'Sun': 0.5},
         roles={'Saturn': 'oil, coal and heavy energy', 'Rahu': 'petroleum, gas and geopolitical shocks', 'Mars': 'fuel, fire and energy', 'Sun': 'power and electricity'},
         up='Oil and energy prices tend to firm.', down='Oil and energy prices tend to soften.'),
    dict(id='metals', name='Metals', kind='mkt', sig={'Saturn': 2, 'Mars': 2, 'Mercury': 1, 'Venus': 0.5},
         roles={'Saturn': 'iron, steel and base metals', 'Mars': 'copper and mining', 'Mercury': 'brass, tin and alloys', 'Venus': 'platinum and precious industrial metals'},
         up='Industrial metals tend to firm.', down='Industrial metals tend to soften.'),
    dict(id='food', name='Grains and food', kind='good', sig={'Moon': 2, 'Jupiter': 1.5, 'Venus': 1.5, 'Saturn': 1},
         roles={'Moon': 'water, rice and the harvest', 'Jupiter': 'grains, oilseeds and sugar', 'Venus': 'dairy and agriculture', 'Saturn': 'pulses and food logistics'},
         up='Harvests and supply are comfortable; food prices ease.', down='Supply is strained; food prices tend to rise.'),
    dict(id='tech', name='Science, technology and AI', kind='good', sig={'Mercury': 3, 'Rahu': 2.5, 'Saturn': 1, 'Jupiter': 1},
         roles={'Mercury': 'intelligence, software and communication', 'Rahu': 'frontier technology, automation and AI', 'Saturn': 'infrastructure and hardware', 'Jupiter': 'knowledge and research funding'},
         up='Innovation moves fast and funding follows.', down='Setbacks, regulation, outages and loss of trust slow progress.'),
    dict(id='media', name='Celebrities, media and entertainment', kind='good', sig={'Venus': 3, 'Moon': 1.5, 'Rahu': 1.5, 'Mercury': 1},
         roles={'Venus': 'film, music, fashion and celebrity', 'Moon': 'popular taste and public mood', 'Rahu': 'viral fame, scandal and new media', 'Mercury': 'news and publishing'},
         up='Entertainment and popular culture flourish; public figures shine.', down='Scandal, controversy and weak demand dim popular culture.'),
    dict(id='health', name='Health and pandemics', kind='risk', sig={'Saturn': 2, 'Rahu': 2, 'Mars': 1.5, 'Ketu': 1.5, 'Sun': 1},
         roles={'Saturn': 'chronic illness and weak immunity', 'Rahu': 'new and mysterious disease and epidemics', 'Mars': 'fevers, accidents and inflammation', 'Ketu': 'obscure and viral illness', 'Sun': 'vitality'},
         up='Public health is steady.', down='Illness, outbreaks and health-system strain are more likely.'),
    dict(id='weather', name='Weather and disasters', kind='risk', sig={'Mars': 2, 'Saturn': 2, 'Rahu': 1.5, 'Moon': 1},
         roles={'Mars': 'fire, heat and earthquakes', 'Saturn': 'cold, drought and long disasters', 'Rahu': 'sudden freak events', 'Moon': 'rain and floods'},
         up='Weather is regular; disasters are less likely.', down='Extreme weather, fires, quakes and floods are more likely.'),
    dict(id='mood', name='Public mood and society', kind='good', sig={'Moon': 3, 'Venus': 1.5, 'Saturn': 1.5, 'Rahu': 1},
         roles={'Moon': 'the collective mind', 'Venus': 'social harmony', 'Saturn': 'hardship and the working class', 'Rahu': 'unrest and mass anxiety'},
         up='The public mood is calm and cooperative.', down='Anxiety, unrest and polarisation grow.'),
]

PLANET_IND = {'Sun': 'government and public-sector firms, power utilities, gold and jewellery, herbal medicine',
              'Moon': 'food and beverages, dairy, shipping, hospitality, retail',
              'Mars': 'defence, real estate and construction, steel and mining, energy, surgical and security services',
              'Mercury': 'IT and software, telecom, media and publishing, trading, education',
              'Jupiter': 'banking and finance, insurance, law and consulting, education and wealth management',
              'Venus': 'luxury and consumer goods, autos, entertainment, fashion and hospitality',
              'Saturn': 'oil and gas, infrastructure, mining, heavy engineering, labour-intensive industry and real estate',
              'Rahu': 'AI, semiconductors, aviation, foreign trade and speculative sectors',
              'Ketu': 'research and spiritual sectors, cybersecurity and niche minerals'}

# ------------------------------------------------------------------ slow cycles
JS_REL = {1: 'conjunct: a new twenty-year cycle of policy and structure begins',
          2: 'Saturn 2nd from Jupiter: finance and policy pull against each other; incremental, grinding progress',
          3: 'Saturn 3rd from Jupiter: effort and communication friction; progress needs sustained work',
          4: 'Saturn 4th from Jupiter (kendra): institutions and the homeland under strain; a hard angle',
          5: 'Saturn 5th from Jupiter (trine): cooperative, supportive; wisdom and discipline work together',
          6: 'Saturn 6th from Jupiter (shadashtaka): conflict, debt and legal pressure; a friction pair',
          7: 'opposition: the two great planets face each other; maximum tension and culmination points',
          8: 'Saturn 8th from Jupiter (shadashtaka): sudden reversals and crises of confidence; a friction pair',
          9: 'Saturn 9th from Jupiter (trine): harmony and a constructive tone between growth and order',
          10: 'Saturn 10th from Jupiter (kendra): authority and accountability dominate; a demanding angle',
          11: 'Saturn 11th from Jupiter: gains through hard work; a mildly positive angle',
          12: 'Saturn 12th from Jupiter: quiet outflow and withdrawal; a mildly draining angle'}
AXIS = {0: 'Aries and Libra: the balance between war and peace, self-interest and partnership; treaties against unilateral action.',
        1: 'Taurus and Scorpio: wealth against debt, resources against crisis; banking, commodities and hidden money.',
        2: 'Gemini and Sagittarius: information against belief; media, trade and education against religion and law.',
        3: 'Cancer and Capricorn: the people against the state; homeland, housing and public welfare against institutions and austerity.',
        4: 'Leo and Aquarius: the ruler against the masses; individual power against collective networks and technology.',
        5: 'Virgo and Pisces: service and health against escape and illusion; labour, medicine and fraud.'}
NODE_PHASE = ['The axis has just changed signs: a new theme is being introduced and the old one is fading.', 'The axis is in its middle: the theme is fully developed and its effects are at their clearest.', 'The axis is nearing the end of its stay: the theme is peaking and a change of focus is close.']

# ------------------------------------------------------------------ eclipses
KURMA = {2: 'East', 3: 'East', 4: 'East', 5: 'South-east', 6: 'South-east', 7: 'South-east', 8: 'South', 9: 'South', 10: 'South',
         11: 'South-west', 12: 'South-west', 13: 'South-west', 14: 'West', 15: 'West', 16: 'West', 17: 'North-west', 18: 'North-west', 19: 'North-west',
         20: 'North', 21: 'North', 22: 'North', 23: 'North-east', 24: 'North-east', 25: 'North-east', 26: 'Centre', 0: 'Centre', 1: 'Centre'}
NAK_CLS = {3: 'fixed', 11: 'fixed', 20: 'fixed', 25: 'fixed', 13: 'soft', 16: 'soft', 4: 'soft', 26: 'soft', 0: 'light', 7: 'light', 12: 'light',
           18: 'sharp', 17: 'sharp', 5: 'sharp', 8: 'sharp', 21: 'movable', 22: 'movable', 23: 'movable', 6: 'movable', 14: 'movable',
           10: 'dreadful', 19: 'dreadful', 24: 'dreadful', 1: 'dreadful', 9: 'dreadful', 2: 'mixed', 15: 'mixed'}
ECL_CLS = {'fixed': 'Fixed nakshatra: effects are slow to arrive but lasting. Institutions, borders and long-term policy are affected.',
           'soft': 'Soft nakshatra: a gentler eclipse. Arts, comfort and agreements are affected more than conflict.',
           'light': 'Light nakshatra: effects arrive quickly and fade quickly. Trade, travel and medicine see short, sharp swings.',
           'sharp': 'Sharp nakshatra: a severe eclipse. Disasters, crises, secrecy and sudden conflict are more likely.',
           'movable': 'Movable nakshatra: restlessness. Transport, trade, migration and markets swing.',
           'dreadful': 'Fierce nakshatra: harsh results. Violence, losses and upheaval are more likely.',
           'mixed': 'Mixed nakshatra: mixed results that depend on the other planets present.'}
ECL_SOLAR = 'A solar eclipse bears most on rulers, governments, authority and gold, and on matters of the Sun (father, vitality, fire).'
ECL_LUNAR = 'A lunar eclipse bears most on the public, the masses, women, water, food crops and silver.'
ECL_GEN = 'Traditionally the effects begin to be felt from the eclipse and are said to run for months, with the strongest effect in the region and signs indicated.'

# ------------------------------------------------------------------ nations
NATIONS = [
    dict(id='in', name='India', date='1947-08-15', time='00:00:00', tz='Asia/Kolkata', place='New Delhi', lat=28.6139, lon=77.2090, note='Independence, midnight 14/15 August 1947, New Delhi (the standard Vedic chart).'),
    dict(id='us', name='United States', date='1776-07-04', time='22:10:41', tz='UTC', place='Philadelphia', lat=39.9526, lon=-75.1652, note='Declaration of Independence, 4 July 1776, 17:10 local mean time Philadelphia (the Sibley chart; 22:10 UT).'),
    dict(id='uk', name='United Kingdom', date='1801-01-01', time='00:00:00', tz='UTC', place='London', lat=51.5074, lon=-0.1278, note='Union of Great Britain and Ireland, 1 January 1801, midnight London.'),
    dict(id='au', name='Australia', date='1901-01-01', time='00:00:00', tz='Australia/Sydney', place='Sydney', lat=-33.8688, lon=151.2093, note='Federation, 1 January 1901, Sydney. The time of day is uncertain, so rely on the Moon sign and slow planets.'),
    dict(id='pk', name='Pakistan', date='1947-08-14', time='00:00:00', tz='Asia/Karachi', place='Karachi', lat=24.8607, lon=67.0011, note='Independence, 14 August 1947, Karachi. Charts vary (midnight is common), so rely on the Moon sign and slow planets.'),
    dict(id='cn', name="People's Republic of China", date='1949-10-01', time='15:15:00', tz='Asia/Shanghai', place='Beijing', lat=39.9042, lon=116.4074, note='Proclamation, 1 October 1949, 15:15 Beijing.'),
    dict(id='ru', name='Russia', date='1991-12-25', time='19:38:00', tz='Europe/Moscow', place='Moscow', lat=55.7558, lon=37.6173, note='Russian Federation after the dissolution of the USSR, 25 December 1991, 19:38 Moscow. Other founding dates are also used.'),
]
HL_NATION = {1: 'the national image and character', 2: 'the treasury, revenue and banking', 3: 'the military, communications, media and neighbours', 4: 'the homeland, the people, housing and land',
             5: 'legislature, education, the young and speculation', 6: 'debt, disease, the armed services and enemies', 7: 'foreign relations, treaties and trade partners',
             8: 'crises, secrets, hidden finance and sudden events', 9: 'law, religion, higher courts and foreign policy', 10: 'the government, the leader and the economy at large',
             11: 'income, trade gains, parliament and allies', 12: 'foreign lands, expenditure, hospitals, prisons and losses'}
SAT_NATION = {1: 'Saturn over the national Moon (Sade Sati peak): a heavy chapter for the people, with austerity, fatigue and hard reckoning.',
              2: 'Saturn 2nd from the national Moon (last Sade Sati phase): pressure on the treasury and the cost of living, but the worst is passing.',
              3: 'Saturn 3rd from the national Moon: a favourable position. Effort, courage and communications improve, and enemies are held back.',
              4: 'Saturn 4th from the national Moon (Kantaka Shani, mild): pressure on housing, land and domestic peace.',
              5: 'Saturn 5th from the national Moon: strain on education, the young, and speculative markets.',
              6: 'Saturn 6th from the national Moon: a favourable position. Enemies are defeated, debts are manageable and services improve.',
              7: 'Saturn 7th from the national Moon: friction in foreign relations and trade partnerships.',
              8: 'Saturn 8th from the national Moon (Ashtama Shani): a difficult chapter. Crises, sudden events, health and financial stress.',
              9: 'Saturn 9th from the national Moon: slowing of fortune, legal and foreign-policy delays.',
              10: 'Saturn 10th from the national Moon: the government is under pressure, with workload, accountability and slow performance.',
              11: 'Saturn 11th from the national Moon: a favourable position. Gains, stable income and cooperation.',
              12: 'Saturn 12th from the national Moon (Sade Sati begins): rising expenditure, foreign entanglements and a growing sense of heaviness.'}
JUP_NATION = {1: 'Jupiter over the national Moon (Janma Guru): drifting optimism; promises exceed delivery.',
              2: 'Jupiter 2nd from the national Moon: a favourable position. The treasury, banking and national wealth are supported.',
              3: 'Jupiter 3rd from the national Moon: effort without much return; communications are strained.',
              4: 'Jupiter 4th from the national Moon: unease in the homeland and housing.',
              5: 'Jupiter 5th from the national Moon: a favourable position. Education, the legislature and the young are supported.',
              6: 'Jupiter 6th from the national Moon: debts, disputes and health-system strain.',
              7: 'Jupiter 7th from the national Moon: a favourable position. Treaties, trade and diplomacy are supported.',
              8: 'Jupiter 8th from the national Moon: hidden crises and loss of trust in institutions.',
              9: 'Jupiter 9th from the national Moon: a favourable position. Fortune, law and foreign policy are supported.',
              10: 'Jupiter 10th from the national Moon: setbacks for the government and leadership.',
              11: 'Jupiter 11th from the national Moon: a favourable position. Income, trade and alliances prosper.',
              12: 'Jupiter 12th from the national Moon: heavy expenditure and losses abroad.'}
