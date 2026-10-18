"""Rule tables for the Muhurta finder.  Source: B. V. Raman, 'Muhurtha (Electional Astrology)', unless a rule is
marked 'classical' (widely used, but not stated by Raman).  Indices: nakshatra 0-26 (Ashwini..Revati), tithi 0-29
(0 Shukla Pratipada .. 14 Purnima, 15 Krishna Pratipada .. 29 Amavasya), weekday 0-6 (Sunday..Saturday), sign 0-11."""

ASW, BHA, KRI, ROH, MRI, ARD, PUN, PUS, ASL, MAG, PPH, UPH, HAS, CHI, SWA, VIS, ANU, JYE, MUL, PAS, UAS, SRA, DHA, SAT, PBH, UBH, REV = range(27)
SUN, MON, TUE, WED, THU, FRI, SAT_ = range(7)
ARI, TAU, GEM, CAN, LEO, VIR, LIB, SCO, SAG, CAP, AQU, PIS = range(12)


def B(*n):      # bright-half tithi numbers 1..15 -> index
    return {i - 1 for i in n}


def D(*n):      # dark-half tithi numbers 1..15 -> index
    return {14 + i for i in n}


LEVELS = {'best': 1.0, 'good': 0.85, 'ok': 0.6, 'weak': 0.35, 'bad': 0.12, 'veto': 0.0}

# relative weights of the factors (normalised over the factors that apply to the purpose and the data given)
WEIGHTS = {
    'tara': 14, 'chandra': 14, 'nak': 14, 'tithi': 11, 'vara': 9, 'yoga': 6, 'karana': 4, 'paksha': 3, 'month': 5,
    'panchaka': 4, 'timing': 8, 'lagna_sign': 6, 'lagna_strength': 8, 'eighth': 3, 'moon_lagna': 3, 'kartari': 2,
    'lagna_natal': 3, 'special_house': 3, 'hora': 3, 'kunavamsa': 2,
}

NAK_CLASS = {
    'fixed': ('Fixed (Sthira)', 'Rohini, Uttara Phalguni, Uttara Ashadha and Uttara Bhadrapada give lasting results. Suited to coronations, foundations, sowing, planting and other permanent things.', [ROH, UPH, UAS, UBH]),
    'soft': ('Soft (Mridu)', 'Chitra, Anuradha, Mrigashira and Revati are gentle. Suited to new clothes, music and the arts, union and auspicious ceremonies.', [CHI, ANU, MRI, REV]),
    'light': ('Light (Laghu)', 'Ashwini, Pushya and Hasta are quick and light. Suited to ornaments, pleasures, medicine, starting industries and travel.', [ASW, PUS, HAS]),
    'sharp': ('Sharp (Tikshna)', 'Mula, Jyeshtha, Ardra and Ashlesha are severe. Suited to incantations and separation, not to gentle or lasting beginnings.', [MUL, JYE, ARD, ASL]),
    'movable': ('Movable (Chara)', 'Shravana, Dhanishta, Shatabhisha, Punarvasu and Swati are moving stars. Suited to acquiring vehicles, gardening and processions.', [SRA, DHA, SAT, PUN, SWA]),
    'dreadful': ('Dreadful (Ugra)', 'Purva Phalguni, Purva Ashadha, Purva Bhadrapada, Bharani and Magha are fierce. Suited to harsh or nefarious acts, not to auspicious beginnings.', [PPH, PAS, PBH, BHA, MAG]),
    'mixed': ('Mixed (Misra)', 'Krittika and Vishakha are mixed. Suited to works of day-to-day importance.', [KRI, VIS]),
}

TARA = {
    1: ('Janma', 'danger to the body'), 2: ('Sampat', 'wealth and prosperity'), 3: ('Vipat', 'dangers, losses and accidents'),
    4: ('Kshema', 'prosperity'), 5: ('Pratyak', 'obstacles'), 6: ('Sadhana', 'realisation of ambitions'),
    7: ('Naidhana', 'danger'), 8: ('Mitra', 'good'), 9: ('Parama Mitra', 'very favourable'),
}

TITHI_CLASS = {1: 'Nanda', 2: 'Bhadra', 3: 'Jaya', 4: 'Rikta', 5: 'Purna'}      # by (tithi in paksha - 1) % 5 + 1

# universal tithi verdicts (Raman Ch II and Ch V item 1); purposes override with their own best lists
TITHI_VETO = {3, 7, 13, 18, 22, 28, 29}          # 4th, 8th and 14th of both halves, and Amavasya
TITHI_BAD = {5, 8, 11, 20, 23, 26, 14}           # 6th, 9th and 12th of both halves, and Purnima

# yogas (index) Raman Ch V item 1: 6th Atiganda, 9th Shula, 10th Ganda, 17th Vyatipata, 27th Vaidhriti
YOGA_VETO = {16, 26}
YOGA_BAD = {5, 8, 9}
YOGA_GOOD = {1, 2, 3, 4, 6, 7, 10, 13, 15, 19, 20, 21, 22, 23, 24, 25}

KARANA_VETO = {'Vishti'}                          # Bhadra: unfit for any good work (Raman Ch V item 1)
KARANA_FIXED = {'Shakuni', 'Chatushpada', 'Naga', 'Kimstughna'}

# Raman Ch XIV, travel and Ch III
JOURNEY_AVOID_DIR = {SAT_: 'East', MON: 'East', THU: 'South', SUN: 'West', FRI: 'West', WED: 'North', TUE: 'North'}
JOURNEY_FREE_AFTER_GHATIS = {THU: 22, TUE: 12, WED: 12, FRI: 15, SUN: 15, SAT_: 8, MON: 8}

# Raman Ch VI: Siddha yogas (weekday: (tithi numbers in the half, nakshatras)); Tuesday has stars only
SIDDHA = {
    SUN: ({1, 4, 6, 7, 12}, {PUS, HAS, UPH, UAS, MUL, SRA, UBH}),
    MON: ({2, 7, 12}, {ROH, MRI, PUN, CHI, SRA, SAT, DHA, PBH}),
    TUE: (None, {ASW, MRI, CHI, ANU, MUL, UPH, DHA, PBH}),
    WED: ({2, 3, 7, 12}, {ROH, MRI, ARD, UPH, UAS, ANU}),
    THU: ({4, 5, 7, 9, 13, 14}, {MAG, PUS, PUN, SWA, PAS, PBH, REV, ASW}),
    FRI: ({1, 6, 11, 2, 7, 12}, {ASW, BHA, ARD, UPH, CHI, SWA, PAS, REV}),
    SAT_: ({4, 9, 14, 2, 7, 12}, {SWA, ROH, VIS, ANU, DHA, SAT}),
}
AMRITA_SIDDHA = {SUN: HAS, MON: SRA, TUE: ASW, WED: ANU, THU: PUS, FRI: REV, SAT_: ROH}       # Raman Ch VI
VARA_TITHI_SIDDHA = {FRI: 1, WED: 2, TUE: 3, SAT_: 4, THU: 5}      # Nanda Fri, Bhadra Wed, Jaya Tue, Rikta Sat, Purna Thu

# Lagna tyajya (Raman Ch II and Ch V): degree zones inside the sign, and the weekdays on which each zone bites
LAGNA_ZONES = [
    ('Bhujanga (first 3 degrees)', {ARI, TAU, SAG, VIR}, 0.0, 3.0, {WED, SAT_}),
    ('Rahu zone (last 3 degrees)', {PIS, CAP, CAN, SCO}, 27.0, 30.0, {TUE, THU, SUN}),
    ('Gridhra (13.5 to 16.5 degrees)', {GEM, LIB, LEO, AQU}, 13.5, 16.5, {MON, FRI}),
]
LAGNA_GANDANTA = [({CAN, SCO, PIS}, 28.0, 30.0), ({LEO, SAG, ARI}, 0.0, 2.0)]

# Raman's nakshatra tyajya (negative period) start, in ghatis out of 60 of the nakshatra; lasts 4 ghatis.
# (Bharani, Ardra and Uttara Bhadrapada use the usual 24, 11 and 24: Raman's printed text reads 4, 21 and 30.)
TYAJYA_START = [50, 24, 30, 40, 14, 11, 30, 20, 32, 30, 20, 1, 21, 20, 14, 14, 10, 14, 20, 20, 20, 10, 10, 18, 16, 24, 30]

BENEFIC = ('Jupiter', 'Venus', 'Mercury')
MALEFIC = ('Sun', 'Mars', 'Saturn', 'Rahu', 'Ketu')
BENEFIC_SIGNS = {TAU, GEM, CAN, VIR, LIB, SAG, PIS}      # ruled by Venus, Mercury, Moon or Jupiter
NAV_LORD = ['Mars', 'Venus', 'Mercury', 'Moon', 'Sun', 'Mercury', 'Venus', 'Mars', 'Jupiter', 'Saturn', 'Saturn', 'Jupiter']

# ---------------------------------------------------------------- purposes
PURPOSES = {}


def P(id, **kw):
    kw.setdefault('strict', 'high')
    kw.setdefault('person', 'self')
    kw.setdefault('nak_mode', 'strict')
    kw.setdefault('nak_best', [])
    kw.setdefault('nak_ok', [])
    kw.setdefault('nak_pada_bad', {})
    kw.setdefault('tithi_best', set())
    kw.setdefault('tithi_ok', set())
    kw.setdefault('tithi_bad', set())
    kw.setdefault('tithi_veto', set())
    kw.setdefault('vara_good', [])
    kw.setdefault('vara_mid', [])
    kw.setdefault('vara_bad', [])
    kw.setdefault('panchaka_bad', [])
    kw.setdefault('yoga_bad', set())
    kw.setdefault('karana_best', [])
    kw.setdefault('lagna_good', [])
    kw.setdefault('lagna_ok', [])
    kw.setdefault('lagna_bad', [])
    kw.setdefault('masa', None)
    kw.setdefault('combust', ())
    kw.setdefault('combust_level', 'veto')
    kw.setdefault('hora_good', ['Jupiter', 'Venus', 'Mercury', 'Moon'])
    kw.setdefault('janma_ok', False)
    kw.setdefault('house7_empty', False)
    kw.setdefault('lagna_chart', True)
    kw.setdefault('notes', [])
    kw.setdefault('special_yogas', True)
    kw['id'] = id
    PURPOSES[id] = kw
    return kw


MARRIAGE_STARS = [ROH, MRI, MAG, UPH, HAS, SWA, ANU, MUL, UAS, UBH, REV]

P('marriage', label='Marriage', icon='\U0001F48D', group='Life events', person='both', strict='high',
  blurb='Wedding ceremony. Both partners are checked when you add the partner.',
  nak_best=MARRIAGE_STARS, nak_pada_bad={MAG: [1], MUL: [1], REV: [4]},
  tithi_best=B(2, 3, 5, 7, 10, 11, 13), tithi_ok=B(1) | D(2, 3, 5, 7, 10),
  tithi_veto=TITHI_VETO | D(11, 12, 13, 14, 15), tithi_bad=TITHI_BAD,
  vara_good=[MON, WED, THU, FRI], vara_mid=[SUN, SAT_], vara_bad=[TUE],
  panchaka_bad=[8, 1], yoga_bad={0, 5, 8, 9, 11, 12, 14, 16, 18, 26}, karana_best=['Taitila'],
  lagna_good=[GEM, VIR, LIB], lagna_ok=[TAU, CAN, LEO, SAG, AQU], lagna_bad=[ARI, SCO, CAP, PIS],
  masa={'good': ['Magha', 'Phalguna', 'Vaishakha', 'Jyeshtha'], 'ok': ['Kartika', 'Margashirsha']},
  combust=('Jupiter', 'Venus'), house7_empty=True,
  notes=['Raman Ch IX: lunar months Magha, Phalguna, Vaisakha and Jyeshtha are good, Kartika and Margasira ordinary, the rest unsuitable (local custom varies).',
         'The 7th house must be empty, Mars not in the 8th, Venus not in the 6th, Lagna not hemmed between malefics, no malefic in Lagna, and the Moon not joined by any planet.',
         'Pushya is excellent for almost everything but not for marriage (Ch IV).'])

P('engagement', label='Engagement / betrothal', icon='\U0001F91D', group='Life events', person='both', strict='high',
  blurb='Betrothal or ring ceremony. Follows the marriage rules, a little relaxed.',
  nak_best=MARRIAGE_STARS, nak_ok=[PUS, PUN, CHI, SRA, DHA, ASW, MRI], nak_pada_bad={MAG: [1], MUL: [1], REV: [4]},
  tithi_best=B(2, 3, 5, 7, 10, 11, 13), tithi_ok=B(1) | D(2, 3, 5, 7, 10),
  tithi_veto=TITHI_VETO | D(12, 13, 14, 15), tithi_bad=TITHI_BAD,
  vara_good=[MON, WED, THU, FRI], vara_mid=[SUN, SAT_], vara_bad=[TUE],
  panchaka_bad=[8, 1], yoga_bad={0, 5, 8, 9, 14, 16, 26}, karana_best=['Taitila', 'Balava', 'Kaulava'],
  lagna_good=[GEM, VIR, LIB, TAU, CAN], lagna_ok=[LEO, SAG, AQU, ARI, CAP], lagna_bad=[SCO, PIS],
  combust=('Jupiter', 'Venus'), combust_level='bad', house7_empty=True,
  notes=['Raman gives no separate rules for betrothal; the marriage rules are applied with the star list widened and the month rule dropped.'])

P('griha_pravesha', label='Housewarming (Griha Pravesha)', icon='\U0001F3E1', group='Home and property', strict='high',
  blurb='First entry into a new home.', janma_ok=True,
  nak_best=[ROH, MRI, UAS, CHI, UBH], nak_ok=[ANU, REV],
  tithi_best=D(1) | B(2, 3, 5, 7, 10, 11, 13), tithi_veto=TITHI_VETO, tithi_bad=TITHI_BAD,
  vara_good=[MON, WED, THU, FRI], vara_mid=[SAT_], vara_bad=[SUN, TUE],
  panchaka_bad=[4, 2], yoga_bad={0, 5, 8, 9, 12, 14, 18}, karana_best=['Bava', 'Balava', 'Kaulava'],
  lagna_good=[TAU, LEO, SCO, AQU], lagna_ok=[GEM, VIR, SAG, PIS], lagna_bad=[ARI, CAN, LIB, CAP],
  masa={'good': ['Vaishakha', 'Jyeshtha', 'Magha', 'Phalguna'], 'ok': ['Kartika', 'Margashirsha']},
  combust=('Jupiter', 'Venus'),
  notes=['Raman Ch XII: best stars Rohini, Mrigasira, Uttarashadha, Chitta, Uttarabhadra; Anuradha and Revati permissible; all others rejected.',
         'Monday, Wednesday, Thursday and Friday are auspicious. Saturday is recommended by some but risks frequent thefts.',
         'Fixed Lagna preferred and the 8th house vacant. Entry in your own Janma Rasi, Janma Nakshatra or Janma Lagna is highly beneficial.',
         'Prefer the Sun in Uttarayana with Jupiter and Venus strong.'])

P('foundation', label='House foundation / construction start', icon='\U0001F9F1', group='Home and property', strict='high',
  blurb='Laying the foundation stone or starting building work.',
  nak_best=[ROH, MRI, CHI, HAS, JYE, UPH, UAS, SRA], nak_ok=[SWA, PUS, ANU, ASW, SAT, UBH, REV],
  tithi_best=B(1, 3, 5, 7, 11, 13, 15, 2, 6, 10) | D(1, 3, 5, 7, 11, 13), tithi_veto=TITHI_VETO | {8, 23}, tithi_bad=TITHI_BAD - {5, 9, 20},
  vara_good=[MON, WED, THU, FRI], vara_mid=[SUN], vara_bad=[TUE, SAT_],
  panchaka_bad=[4, 2], yoga_bad={0, 5, 8, 9, 12, 14, 18}, karana_best=['Bava'],
  lagna_good=[TAU, LEO, SCO, AQU], lagna_ok=[GEM, VIR, SAG, PIS], lagna_bad=[ARI, CAN, LIB, CAP],
  masa={'good': ['Chaitra', 'Vaishakha', 'Shravana', 'Kartika', 'Magha'],
        'bad': ['Jyeshtha', 'Ashadha', 'Bhadrapada', 'Ashwina', 'Margashirsha', 'Pausha', 'Phalguna']},
  notes=['Raman Ch XII: Chaitra, Vaisakha, Sravana, Kartika and Magha are best. Jyeshta, Ashadha, Bhadrapada, Aswayuja, Margasira, Pushya and Phalguna are not.',
         'The Sun should be in a fixed or movable sign, never a common sign.',
         'Monday is rejected when the Moon is waning. Fixed Lagna is best, with malefics in 3, 6 and 11 and the 8th house vacant.'])

P('buy_land', label='Buy land / property', icon='\U0001F5FA️', group='Home and property', strict='medium', janma_ok=True,
  blurb='Purchasing or registering land and plots.',
  nak_best=[ASW, ROH, MRI, PUN, PUS, UPH, HAS, SWA, ANU, UAS, SRA, DHA, SAT, UBH],
  tithi_best=B(2, 3, 5, 7, 10, 11, 13, 1), tithi_veto=TITHI_VETO | {8, 23}, tithi_bad=TITHI_BAD,
  vara_good=[MON, WED, THU, SAT_], vara_mid=[FRI, SUN], vara_bad=[TUE], panchaka_bad=[4], yoga_bad={5, 8, 9},
  lagna_good=[TAU, LEO, SCO, AQU], lagna_ok=[GEM, VIR, SAG, PIS, CAN, LIB], lagna_bad=[],
  notes=['Raman Ch XII: Riktha tithis must be scrupulously avoided. Monday, Wednesday, Thursday and Saturday are good; Tuesday should be rejected.',
         'Let a fixed sign rise, Jupiter in a kendra or trikona, Mars in the 11th and not in Lagna.'])

P('buy_house', label='Buy a house / flat', icon='\U0001F3E0', group='Home and property', strict='medium',
  blurb='Purchasing a built home.',
  nak_best=[MRI, ASL, MAG, PPH, VIS, MUL, PUN, REV], nak_ok=[ROH, UPH, HAS, ANU, UAS, SRA, UBH, PUS, ASW],
  tithi_best=B(1, 6, 11) | D(1, 6), tithi_ok=B(2, 3, 5, 7, 10, 13), tithi_veto=TITHI_VETO | {8, 23}, tithi_bad=TITHI_BAD - {5, 20},
  vara_good=[THU, FRI], vara_mid=[MON, WED], vara_bad=[TUE, SAT_], panchaka_bad=[4, 2], yoga_bad={5, 8, 9},
  lagna_good=[TAU, GEM, LEO, LIB, SCO], lagna_ok=[CAN, VIR, SAG, PIS, AQU], lagna_bad=[],
  notes=['Raman Ch XII: Nanda tithis are favourable. New and old houses can be bought on Thursdays and Fridays.',
         'Taurus, Gemini, Leo, Libra and Scorpio are the best Lagnas. Malefics should be out of the 7th, and Mars not in Lagna.'])

P('vehicle', label='Buy a vehicle', icon='\U0001F697', group='Everyday', strict='medium',
  blurb='Buying or taking delivery of a car, bike or other vehicle.',
  nak_best=[SRA, DHA, SAT, PUN, SWA], nak_ok=[ASW, PUS, HAS, MRI, CHI, ANU, REV, ROH, UPH, UAS, UBH],
  tithi_best=B(2, 3, 5, 7, 10, 11, 13), tithi_ok=B(1, 6, 12) | D(1, 2, 3, 5), tithi_veto=TITHI_VETO,
  tithi_bad=TITHI_BAD,
  vara_good=[MON, WED, THU, FRI], vara_mid=[SUN], vara_bad=[TUE, SAT_], panchaka_bad=[4, 6], yoga_bad={5, 8, 9},
  lagna_good=[TAU, GEM, CAN, VIR, LIB, PIS], lagna_ok=[ARI, LEO, SAG, AQU], lagna_bad=[SCO, CAP],
  hora_good=['Venus', 'Jupiter', 'Mercury', 'Moon'],
  notes=['Raman Ch IV: Shravana, Dhanishta, Shatabhisha, Punarvasu and Swati are the movable stars, auspicious for acquiring vehicles.',
         'Weekday and tithi lists follow his rules for new purchases (clothes and general buying).',
         'Safety: for a long first drive also read the Travel rules.'])

P('travel', label='Travel / start a journey', icon='✈️', group='Everyday', strict='medium',
  blurb='Starting a trip. Add a direction to apply the weekday direction rule.',
  nak_best=[MRI, ASW, PUS, PUN, HAS, ANU, SRA, MUL, DHA, REV], nak_ok=[UPH, CHI, MAG, SWA, PAS, UAS, JYE, ROH, SAT, UBH],
  nak_mode='strict', tithi_best=B(2, 3, 5, 7, 10, 11, 13) | D(2, 3, 5, 7, 10, 11, 13), tithi_veto=TITHI_VETO | {13, 14, 28, 29},
  tithi_bad=TITHI_BAD,
  vara_good=[MON, WED, THU, FRI], vara_mid=[SUN], vara_bad=[TUE, SAT_], panchaka_bad=[6], yoga_bad={5, 8, 9},
  lagna_good=[ARI, TAU, CAN, LEO, LIB, SAG], lagna_ok=[GEM, VIR, AQU, PIS], lagna_bad=[SCO, CAP],
  nak_hard_avoid=[KRI, BHA, ASL, VIS, PPH, PBH, ARD],
  notes=['Raman Ch XIV: best tithis 2, 3, 5, 7, 10, 11 and 13. The 14th, Full Moon and New Moon are to be avoided at any cost.',
         'No journey under Krittika, Bharani, Ashlesha, Vishakha, Purva Phalguni, Purva Bhadrapada or Ardra. Bharani and Krittika always rejected.',
         'Start in the 2nd, 3rd or last quarter of the star; the first quarter is better avoided. Avoid equinox days and Sun ingress days.',
         'Do not travel East on Saturday and Monday, South on Thursday, West on Sunday and Friday, North on Wednesday and Tuesday, unless you leave after the permitted ghatis.',
         'Rising sign: your own Janma Rasi is highly favoured, but never the Janma Lagna, nor the 5th, 7th or 9th from it.'])

P('interview', label='Interview / important meeting', icon='\U0001F454', group='Career and money', strict='low',
  blurb='Job interviews, meeting superiors, signing a deal.',
  nak_mode='open', nak_best=[ASW, PUS, HAS, MRI, CHI, ANU, REV, PUN, SRA, UPH, UAS, ROH], nak_ok=[SWA, DHA, SAT, UBH],
  tithi_best=B(2, 3, 5, 7, 10, 11, 13), tithi_ok=B(1, 6, 12) | D(2, 3, 5, 7, 10), tithi_veto={29, 13, 28}, tithi_bad={3, 7, 8, 18, 22, 23},
  vara_good=[WED, THU, FRI, MON, SUN], vara_mid=[], vara_bad=[TUE, SAT_], panchaka_bad=[4],
  lagna_good=[ARI, LEO, GEM, VIR, SAG], lagna_ok=[TAU, CAN, LIB, AQU, PIS], lagna_bad=[],
  hora_good=['Mercury', 'Jupiter', 'Sun', 'Venus'],
  notes=['Raman Ch III: for ordinary matters such as interviewing superiors, a favourable Tarabala is enough and Panchaka need not be examined.',
         'Ch XIV: to meet an influential person, let the rising sign fall in the 10th house of your birth chart, with no malefic in Lagna or the 9th.'])

P('business', label='Start a business / important project', icon='\U0001F680', group='Career and money', strict='high',
  blurb='Launch a company, shop, project or any major venture.',
  nak_best=[PUS, ASW, HAS, ROH, MRI, CHI, REV, ANU, UPH, UAS, UBH, SRA, DHA, PUN, SWA], nak_ok=[SAT, VIS, KRI],
  tithi_best=B(2, 3, 5, 7, 10, 11, 13), tithi_ok=B(1, 6, 12) | D(2, 3, 5, 7, 10), tithi_veto=TITHI_VETO, tithi_bad=TITHI_BAD,
  vara_good=[THU, WED, FRI, MON], vara_mid=[SAT_, SUN], vara_bad=[TUE], panchaka_bad=[4], yoga_bad={5, 8, 9},
  karana_best=['Bava', 'Vanija'],
  lagna_good=[TAU, LEO, SCO, AQU, GEM, VIR], lagna_ok=[ARI, CAN, LIB, SAG, PIS], lagna_bad=[],
  hora_good=['Mercury', 'Jupiter', 'Venus', 'Moon'],
  notes=['Raman Ch X (buying for business): Thursday, the 10th lunar day and Pushyami are the best. Tuesday completely rejected, Saturday passable.',
         'Mercury, the 2nd lord and the 2nd house should be fortified; Mercury and Jupiter together in Lagna are highly propitious.',
         'Raja Panchaka is avoided for occupation.'])

P('invest', label='Invest / buy stock or goods for trade', icon='\U0001F4C8', group='Career and money', strict='medium',
  blurb='Placing a significant investment or buying stock for trade.',
  nak_best=[PUS, ASW, HAS, ROH, MRI, CHI, REV, ANU, SRA, DHA, PUN, SWA], nak_ok=[UPH, UAS, UBH, SAT],
  tithi_best=B(10, 2, 3, 5, 7, 11, 13), tithi_ok=B(1, 6, 12) | D(2, 3, 5, 7, 10), tithi_veto=TITHI_VETO, tithi_bad=TITHI_BAD,
  vara_good=[THU, WED, MON], vara_mid=[SAT_, SUN, FRI], vara_bad=[TUE], panchaka_bad=[4],
  karana_best=['Vanija', 'Bava'],
  lagna_good=[GEM, VIR, TAU, LEO, SCO, AQU], lagna_ok=[ARI, CAN, LIB, SAG, PIS], lagna_bad=[],
  hora_good=['Mercury', 'Jupiter', 'Venus'],
  notes=['Raman Ch X: buying for trade on Thursday, the 10th lunar day and Pushyami. Avoid Mercury afflicted by Mars, which destroys stocks and brings discord.',
         'For selling for profit: the Moon in Taurus, Cancer or Pisces helps; Monday, Wednesday and Thursday are best.',
         'This is a traditional timing aid, not financial advice.'])

P('jewellery', label='Buy jewellery / gold / new clothes', icon='\U0001F48E', group='Everyday', strict='medium',
  blurb='Buying or first wearing ornaments and new clothes.',
  nak_best=[ASW, ROH, PUN, PUS, UPH, HAS, CHI, SWA, VIS, DHA, REV], nak_ok=[MRI, ANU, UAS, UBH, SRA],
  tithi_best=B(2, 3, 5, 7, 10, 11, 13), tithi_ok=B(1, 6, 12), tithi_veto=TITHI_VETO | {8, 23}, tithi_bad=TITHI_BAD,
  vara_good=[MON, WED, THU, FRI], vara_mid=[SUN], vara_bad=[TUE, SAT_], panchaka_bad=[4], yoga_bad={5, 8, 9},
  lagna_good=[TAU, GEM, CAN, LEO, LIB, SAG, PIS], lagna_ok=[ARI, VIR, AQU], lagna_bad=[SCO, CAP],
  hora_good=['Venus', 'Jupiter', 'Mercury', 'Moon'],
  notes=['Raman Ch X (new clothes): Ashwini, Rohini, Punarvasu, Pushyami, Uttara, Hasta, Chitta, Swati, Visakha, Dhanishta and Revati are best.',
         'Monday, Wednesday, Thursday and Friday are good, Sunday middling. Avoid the 4th, 9th and 14th and the New Moon.',
         'For jewellery the Sun and Moon should be well placed.'])

P('education', label='Start studies / learning', icon='\U0001F4DA', group='Everyday', strict='medium', janma_ok=True,
  blurb='Beginning a course, a new subject or learning a skill.',
  nak_best=[MRI, ARD, PUN, PUS, HAS, CHI, SWA, SRA, DHA, SAT], nak_ok=[ASW, ROH, UPH, UAS, REV],
  tithi_best=D(1) | B(2, 3, 5, 6, 10, 11), tithi_veto=TITHI_VETO | {8, 23}, tithi_bad=TITHI_BAD - {5, 20},
  vara_good=[WED, THU, FRI, MON], vara_mid=[SUN], vara_bad=[TUE, SAT_], panchaka_bad=[4],
  lagna_good=[GEM, VIR, SAG, PIS], lagna_ok=[ARI, CAN, LIB, CAP], lagna_bad=[TAU, LEO, SCO, AQU],
  hora_good=['Mercury', 'Jupiter', 'Venus', 'Moon'],
  notes=['Raman Ch XI: the most beneficial stars are Mrigasira, Aridra, Punarvasu, Pushya, Hasta, Chitta, Swati, Sravana, Dhanishta and Satabhisha.',
         'Tuesday and Saturday invariably avoided; Sunday permissible. Wednesday morning is the best time to begin.',
         'Lagna should not be a fixed sign: common signs are best, movable ones ordinary. The forenoon and noon are best.'])

P('childbirth', label='Planned childbirth (advisory)', icon='\U0001F476', group='Life events', strict='high',
  blurb='For a planned delivery only when the doctor has already confirmed a safe medical window. Uses the mother\'s star and Moon sign.',
  nak_best=[ROH, MRI, PUN, PUS, UPH, UAS, HAS, SRA, REV, ANU, CHI, UBH], nak_ok=[ASW, SWA, DHA, SAT],
  tithi_best=B(2, 3, 5, 7, 10, 11, 13), tithi_ok=B(1, 6, 12), tithi_veto=TITHI_VETO, tithi_bad=TITHI_BAD,
  vara_good=[MON, WED, THU, FRI], vara_mid=[SUN], vara_bad=[TUE, SAT_], panchaka_bad=[8, 1], yoga_bad={5, 8, 9, 14},
  lagna_good=[TAU, GEM, CAN, LEO, LIB, SAG], lagna_ok=[ARI, VIR, AQU, PIS], lagna_bad=[SCO, CAP],
  notes=['Raman has no separate chapter on timing a birth; this profile applies his pre-natal and post-natal rules (strong Lagna, benefics in kendras, 8th house vacant, no malefic in Lagna, avoid gandanta and tyajya).',
         'Medical need always comes first. Treat any window as a tie-breaker among medically equal options.'])

STRICT_NAK_HARD = {ASW: 0, BHA: 1}      # unused placeholder

# purposes that never take Pushya as a neutraliser
PUSHYA_EXCLUDED = {'marriage', 'engagement'}
BHARANI_KRITTIKA_VETO = {'marriage', 'engagement', 'travel', 'griha_pravesha', 'foundation', 'business', 'childbirth', 'vehicle', 'buy_land', 'buy_house', 'invest', 'jewellery', 'education'}

ORDER = ['marriage', 'engagement', 'griha_pravesha', 'foundation', 'buy_land', 'buy_house', 'vehicle', 'travel',
         'interview', 'business', 'invest', 'jewellery', 'education', 'childbirth']
