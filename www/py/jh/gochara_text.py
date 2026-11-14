"""Long-form interpretation text for the Transits and Dasa card. Pure text composition from the numbers gochara.evaluate already
computed: no new astronomy here. Each builder returns a list of short paragraphs (strings) that the UI shows when a box is opened."""

SIGNS = ['Aries', 'Taurus', 'Gemini', 'Cancer', 'Leo', 'Virgo', 'Libra', 'Scorpio', 'Sagittarius', 'Capricorn', 'Aquarius', 'Pisces']
EXALT = {'Sun': 0, 'Moon': 1, 'Mars': 9, 'Mercury': 5, 'Jupiter': 3, 'Venus': 11, 'Saturn': 6, 'Rahu': 1, 'Ketu': 7}
DEBIL = {'Sun': 6, 'Moon': 7, 'Mars': 3, 'Mercury': 11, 'Jupiter': 9, 'Venus': 5, 'Saturn': 0, 'Rahu': 7, 'Ketu': 1}
OWN = {'Sun': [4], 'Moon': [3], 'Mars': [0, 7], 'Mercury': [2, 5], 'Jupiter': [8, 11], 'Venus': [1, 6], 'Saturn': [9, 10], 'Rahu': [], 'Ketu': []}


def ordn(n):
    return f"{n}{'th' if 10 <= n % 100 <= 20 else {1: 'st', 2: 'nd', 3: 'rd'}.get(n % 10, 'th')}"


def lc(s):
    return s[0].lower() + s[1:] if s and s.startswith(('The ', 'the ')) else s


def uc(s):
    return s[0].upper() + s[1:] if s else s


# ------------------------------------------------------------------ houses
HM = {1: 'the mind itself: mood, body and how you feel in your own skin',
      2: 'speech, savings, food habits and the family circle',
      3: 'initiative, effort, siblings, neighbours and short journeys',
      4: 'inner peace, home, mother, vehicles and property',
      5: 'intelligence, creative flow, children, romance and speculation',
      6: 'rivals, health upkeep, debts and daily service',
      7: 'marriage, partnerships, business dealings and travel',
      8: 'sudden turns, hidden matters, health care, shared money and inheritance',
      9: 'fortune, father, teachers, belief and long journeys',
      10: 'profession, reputation, authority and the fruit of past effort',
      11: 'gains, income, friends, elder siblings and fulfilled wishes',
      12: 'expenditure, sleep, withdrawal, foreign places and quiet endings'}
HL = {1: 'your body, temperament and the first impression you make',
      2: 'income, savings, speech and the family table',
      3: 'effort, courage, siblings, communication and short travel',
      4: 'home, mother, land, vehicles and peace of mind',
      5: 'children, learning, creativity, romance and past-life merit',
      6: 'health upkeep, debts, rivals, service and daily routine',
      7: 'spouse, partners, clients and public dealings',
      8: 'longevity, hidden matters, sudden events, shared resources and research',
      9: 'luck, father, mentors, dharma and long journeys',
      10: 'career, status, authority and public action',
      11: 'gains, networks, elder siblings and the realisation of goals',
      12: 'expenses, foreign lands, sleep, retreat and endings'}
HL_ACT = {1: 'Personal initiatives, health routines and how you present yourself carry the weight.',
          2: 'The money you keep, the words you use and the meals you eat are in focus; kind family conversations set the mood.',
          3: 'Effort, writing, calls, negotiations and short trips are where progress or friction appears.',
          4: 'Home life, the mother, property decisions and domestic comfort are in focus.',
          5: 'Study, creative work, children, romance and any speculation are in focus. Judgement is the asset to protect.',
          6: 'Work routine, health upkeep, debts and competitors are in focus. Order and discipline pay here.',
          7: 'The spouse, business partners, clients and contracts are in focus. Tact decides outcomes.',
          8: 'Hidden matters, insurance, shared funds, research and health checks are in focus. Steady, unhurried choices work best.',
          9: 'Teachers, father, higher learning, ethics and long-distance plans are in focus.',
          10: 'Career, boss, public image and responsibilities are in focus. Visible work is judged now.',
          11: 'Income, contacts, mentors, elder siblings and the fulfilment of earlier plans are in focus.',
          12: 'Spending, sleep, travel abroad, hospitals and spiritual retreat are in focus. Keep outflow deliberate.'}

# ------------------------------------------------------------------ planets
PL = {
    'Sun': dict(role='is the soul-significator: vitality, authority, the father, government and ego', dur='about a month in each sign', speed=30,
                good='the Sun lends clarity, confidence and recognition. Seniors listen, health holds up and decisions come easily.',
                bad='the Sun runs warm, so energy needs pacing. Rest, eye comfort and a little humility with bosses or the father keep things smooth, even when credit feels slow to come.',
                tip_g='Take the lead, ask for recognition, schedule important meetings in the morning hours.',
                tip_b='Cooperate with authority, rest the eyes, and keep important conversations for a calmer day. The Sun moves on within weeks.',
                rem='Offering water to the Sun at sunrise and Aditya Hridayam on Sundays are the traditional steadiers.'),
    'Moon': dict(role='is the mind and the mother: mood, emotional tone, public contact and daily comfort', dur='about two and a quarter days in each sign', speed=2.25,
                 good='the mind is settled and receptive; food, sleep and company agree with you, and small plans fall into place.',
                 bad='the mood is more sensitive than usual, so sleep, appetite and small matters deserve a little extra gentleness.',
                 tip_g='Use the day for meetings, purchases for the home and anything needing goodwill.',
                 tip_b='Keep the schedule light, choose calm conversations and save big decisions for a settled moment. The Moon changes sign in about two days.',
                 rem='Rest, plain food, time near water and a calm evening routine do more than any ritual on a Moon day.'),
    'Mars': dict(role='is energy, courage, blood, surgery, property and conflict', dur='about six weeks in each sign', speed=45,
                 good='Mars gives drive, stamina and the nerve to finish things. Property matters, sport, engineering and competition favour you.',
                 bad='Mars brings extra heat and drive, so patience, care with tools and driving, and a physical outlet matter more than usual.',
                 tip_g='Start the demanding work now, train hard, take a decisive step you have delayed.',
                 tip_b='Drive and handle tools with care, choose calm over argument, plan physical or financial moves carefully and burn the energy through exercise.',
                 rem='Hanuman Chalisa on Tuesdays and disciplined exercise are the classic outlets for this energy.'),
    'Mercury': dict(role='is intellect, speech, trade, writing, nerves and the skin', dur='three to four weeks in each sign (faster when direct, slower around retrogression)', speed=25,
                    good='Mercury sharpens thinking and speech. Negotiation, study, accounts, writing and trade go well.',
                    bad='Mercury keeps the mind busy, so clear communication, careful paperwork and a calm routine help avoid mix-ups.',
                    tip_g='Sign agreements, study, pitch and write. Put important things in writing.',
                    tip_b='Re-read before sending or signing, double-check numbers, and take your time over new contracts.',
                    rem='Reading Vishnu Sahasranama on Wednesdays and feeding cattle green fodder are the traditional remedies.'),
    'Jupiter': dict(role='is wisdom, grace, children, teachers, wealth and dharma, the great benefic', dur='about a year in each sign', speed=365,
                    good='Jupiter expands whatever it touches: opportunity, growth, good counsel, support from elders and a protective hand over your plans.',
                    bad='Jupiter gives less direct support here, so modest promises, healthy habits, good advisers and patience let your effort mature at its own pace.',
                    tip_g='Plant long-term seeds now: study, investment in skill, marriage, children, property or a new venture.',
                    tip_b='Keep commitments realistic, moderate habits and stay close to teachers and elders. Jupiter moves on in about a year.',
                    rem='Thursday observance, respect to gurus and Brihaspati mantra, and donating yellow items such as chana dal, keep the grace flowing.'),
    'Venus': dict(role='is love, comfort, the arts, vehicles, luxury and the spouse', dur='about four weeks in each sign', speed=28,
                  good='Venus brings affection, pleasant company, beauty, social ease and often money through relationships or the arts.',
                  bad='Venus asks for balance: mindful spending, gentle conversations in love, and care of the throat, kidneys and general wellbeing.',
                  tip_g='Socialise, take the partner out, buy for comfort, do creative work and look after appearance.',
                  tip_b='Budget with intention, keep relationship talks warm and give luxury purchases a day before deciding.',
                  rem='Friday worship of Lakshmi and offering white flowers or rice keep Venus gracious.'),
    'Saturn': dict(role='is time, karma, discipline, delay, longevity and the working class', dur='about two and a half years in each sign', speed=912,
                   good='Saturn rewards steady effort here: promotions that were earned, stability, fewer obstacles and a sense of structure.',
                   bad='Saturn asks for patience and discipline: things move slowly, workload is steady and rest, joint care and honest effort build something lasting.',
                   tip_g='Build slowly and formally: systems, savings, contracts, long projects. Saturn pays those who are patient and regular.',
                   tip_b='Do the necessary work steadily, keep commitments, choose the straight path and respect elders and workers. Consistent effort is what Saturn rewards.',
                   rem='Saturday observance, Hanuman or Shani worship, a sesame-oil lamp, and service to the elderly and to labourers are the traditional relief.'),
    'Rahu': dict(role='is ambition, foreign things, technology, obsession and the sudden unconventional turn', dur='about eighteen months in each sign, moving backward', speed=548,
                 good='Rahu amplifies ambition in a way that works: foreign or technical gain, sudden opportunity and success through unconventional routes.',
                 bad='Rahu stirs ambition and restlessness, so verified facts, clear routines and patience with shortcuts keep you steady.',
                 tip_g='Use the push for technology, abroad, media or bold ideas, but verify facts before you commit.',
                 tip_b='Prefer verified facts to speculation, keep intoxicants away, sleep well and keep routines simple.',
                 rem='Durga worship, Rahu mantra on Saturdays and charity to the poor are the traditional calmers.'),
    'Ketu': dict(role='is detachment, past-life residue, intuition, research and sudden cut-offs', dur='about eighteen months in each sign, moving backward', speed=548,
                 good='Ketu gives focus, insight and the courage to drop what no longer serves. Research, spiritual practice and surgical precision are favoured.',
                 bad='Ketu turns the mind inward, so company, routine and meaningful activity help you feel connected.',
                 tip_g='Use the detachment for study, meditation, decluttering and clean exits from dead ends.',
                 tip_b='Give emotional decisions time before making them final. Keep company, meditate and stay physically active.',
                 rem='Ganesha worship, meditation and feeding stray dogs are the traditional remedies.'),
}


NOTE = ("Note. These are indicative tendencies from classical Vedic texts for this one placement, offered so you can prepare, not to alarm. "
        "Your own effort, choices and the full pattern of your chart change the outcome; a professional astrologer who reads the whole chart gives the most reliable view.")


def _dignity(p, sign_idx):
    if sign_idx == EXALT.get(p) and p not in ('Rahu', 'Ketu'):
        return 'exalted'
    if sign_idx == DEBIL.get(p) and p not in ('Rahu', 'Ketu'):
        return 'debilitated'
    if sign_idx in OWN.get(p, []):
        return 'own'
    return ''


def _pace(p, retro):
    if p in ('Rahu', 'Ketu'):
        return 'It is always moving backward, so its results arrive as a slow, repeating theme rather than a single event.'
    if retro:
        return f"{p} is retrograde: it revisits ground already covered, so results come late, in a review-and-repeat pattern, and old matters resurface for a second look."
    return ''


# ------------------------------------------------------------------ combined lagna + Moon reading
HL_SHORT = {1: 'self and health', 2: 'money and family', 3: 'effort and communication', 4: 'home and peace', 5: 'children and learning', 6: 'work and health upkeep',
            7: 'partnerships', 8: 'hidden matters', 9: 'travel, beliefs and mentors', 10: 'career and status', 11: 'gains and networks', 12: 'expenses and rest'}
FIELDS = {
    1: [('Body and energy', 'your health, vitality and physical comfort'), ('Self-image', 'how you present yourself and how others see you'), ('Fresh starts', 'personal initiatives and a new way of living')],
    2: [('Money and savings', 'income, savings and how you spend'), ('Speech and family', 'what you say and the family table'), ('Values and food', 'what you value and what you eat')],
    3: [('Effort and courage', 'your drive, initiative and self-made progress'), ('Communication', 'calls, writing, negotiations and short travel'), ('Siblings and neighbours', 'brothers, sisters and close contacts')],
    4: [('Home and property', 'home, land, vehicles and domestic comfort'), ('Mother and family peace', 'your mother and emotional security at home'), ('Inner peace', 'contentment, rest and a settled mind')],
    5: [('Children and creativity', 'children, creative work and what you enjoy making'), ('Learning and judgement', 'study, intelligence and the quality of your decisions'), ('Romance and speculation', 'romance, play and risk-taking')],
    6: [('Health routines', 'daily health upkeep and discipline'), ('Work and service', 'daily work, colleagues and service'), ('Debts and rivals', 'loans, disputes and competitors')],
    7: [('Marriage and partnership', 'your spouse or partner'), ('Business and clients', 'contracts, clients and public dealings'), ('Travel and the public', 'journeys and dealing with many people')],
    8: [('Hidden matters', 'secrets, research and what lies beneath the surface'), ('Shared money', 'insurance, inheritance and joint finances'), ('Health and change', 'health checks and sudden turns of plan')],
    9: [('Travel and relocation', 'long journeys, moves and people from other cultures'), ('Beliefs and mentors', 'philosophy, teachers, higher learning and faith'), ('Father figures and authority', 'your father, mentors and those you look up to')],
    10: [('Career and status', 'your profession and standing'), ('Authority and bosses', 'seniors, responsibility and public judgement'), ('Visible results', 'recognition for work already done')],
    11: [('Income and gains', 'earnings and the fruit of past effort'), ('Friends and networks', 'friends, groups and elder siblings'), ('Goals and wishes', 'long-held plans coming within reach')],
    12: [('Expenses and outflow', 'spending and what leaves your hands'), ('Sleep and retreat', 'rest, solitude and inner work'), ('Foreign places', 'distance, travel abroad and unfamiliar settings')]}
FEEL = {
    1: [('Emotional footing', 'your own mood and sense of self'), ('Body and mind', 'how you feel in your own skin')],
    2: [('Family and money', 'family conversations and savings'), ('Speech', 'what you say and how it lands')],
    3: [('Initiative', 'your drive to act and communicate'), ('Close contacts', 'siblings and neighbours')],
    4: [('Inner peace', 'home and emotional security'), ('Mother and home', 'family comfort')],
    5: [('Creative flow', 'ideas, children and romance'), ('Judgement', 'how clearly you decide')],
    6: [('Daily pressures', 'work, health upkeep and rivals'), ('Debts', 'money you owe or are owed')],
    7: [('Partnerships', 'your spouse, partner and business associates'), ('Closeness', 'dealings where another person is involved')],
    8: [('Hidden concerns', 'what is private, shared or uncertain'), ('Change', 'sudden turns and deep matters')],
    9: [('Faith and fortune', 'belief, luck and guidance'), ('Teachers and elders', 'father figures and mentors')],
    10: [('Career mind', 'work, reputation and responsibility'), ('Authority', 'bosses and public expectations')],
    11: [('Hopes and gains', 'income, friends and wishes'), ('Social circle', 'groups and networks')],
    12: [('Rest and outflow', 'sleep, spending and withdrawal'), ('Solitude', 'your inner life and distance from others')]}
PLENS = {'Sun': ('clearer recognition, confidence and leadership', 'a stronger ego and some friction with authority'),
         'Moon': ('warmth, comfort and easy flow', 'mood swings and extra sensitivity'),
         'Mars': ('drive, courage and decisive progress', 'heat, impatience and quick reactions'),
         'Mercury': ('clever, well-timed communication and useful ideas', 'scattered attention and mix-ups'),
         'Jupiter': ('growth, guidance and goodwill', 'a tendency to over-expand or over-promise'),
         'Venus': ('harmony, comfort and pleasant company', 'indulgence and mixed feelings'),
         'Saturn': ('steady, disciplined progress and lasting results', 'delay, weight and a need for patience'),
         'Rahu': ('sudden, unconventional openings', 'restless urgency and temptation'),
         'Ketu': ('quiet insight, detachment and focus', 'withdrawal, distraction or loosening ties')}
PMIND = {'Sun': ('Your mind feels confident, purposeful and ready to lead', 'Your mind feels proud, pressured or over-focused on itself'),
         'Moon': ('Your mind feels soothed and receptive', 'Your mind feels sensitive and easily swayed'),
         'Mars': ('Your mind feels energetic and determined', 'Your mind feels quick to react and impatient'),
         'Mercury': ('Your mind feels sharp, curious and communicative', 'Your mind feels busy and prone to overthinking'),
         'Jupiter': ('Your mind feels hopeful, generous and supported', 'Your mind feels over-optimistic or stretched too wide'),
         'Venus': ('Your mind feels warm, affectionate and appreciative', 'Your mind feels tempted by comfort or unsure of its wishes'),
         'Saturn': ('Your mind feels steady, serious and mature', 'Your mind feels weighed down and cautious'),
         'Rahu': ('Your mind feels excited, curious and drawn to the new', 'Your mind feels an urgency and desire that magnify small things'),
         'Ketu': ('Your mind feels calm, intuitive and inward', 'Your mind feels detached and unsure of its footing')}
PHEAD = {'Sun': ('Recognition and confidence', 'Strong ego and pace'), 'Moon': ('Ease and comfort', 'Sensitivity'), 'Mars': ('Drive and progress', 'Heat and haste'),
         'Mercury': ('Smart communication', 'A busy mind'), 'Jupiter': ('Growth and guidance', 'Over-reach to avoid'), 'Venus': ('Harmony and comfort', 'Indulgence to balance'),
         'Saturn': ('Steady progress', 'Slow, serious demands'), 'Rahu': ('Sudden openings', 'Restless urgency'), 'Ketu': ('Quiet insight', 'Withdrawal')}


def combo_head(p, hl, hm, good):
    """One merged surface line: where life events show (lagna house) and how the mind feels it (Moon house)."""
    return f"{PHEAD[p][0 if good else 1]} around {HL_SHORT[hl]}; mind turns to {HL_SHORT[hm]}"


def combined_paras(o, lagna):
    p, hl, hm = o['planet'], o['house_lagna'], o['house_moon']
    good = bool(o['fav'] and not o['blocked'])
    k = 0 if good else 1
    info = PL[p]
    out = [f"Combined reading. {p} {info['role']}. It is in your {ordn(hl)} house from the {lagna} lagna, which shows where events take shape ({HL[hl]}), and in the {ordn(hm)} from your natal Moon, which shows how your mind lives through it ({HM[hm]}). The two are read together below."]
    for i, (lab, what) in enumerate(FIELDS[hl]):
        lead = ('You may notice', 'Expect', 'Watch for')[i]
        out.append(f"{lab}. {lead} {PLENS[p][k]} {('around', 'in', 'in')[i]} {what}.")
    for lab, what in FEEL[hm]:
        out.append(f"{lab}, from the Moon. {PMIND[p][k]} when it comes to {what}.")
    if p in ('Rahu', 'Ketu'):
        other = 'Ketu' if p == 'Rahu' else 'Rahu'
        hlo, hmo = (hl + 5) % 12 + 1, (hm + 5) % 12 + 1
        txt = f"The other end of the axis. {other} sits opposite, in your {ordn(hlo)} house from lagna ({HL_SHORT[hlo]}) and the {ordn(hmo)} from your Moon. "
        if hmo == 1 or hm == 1:
            txt += (f"{other} passes over your natal Moon, which can make you feel temporarily detached, introspective or unsure of your emotional footing while attention is on others." if other == 'Ketu'
                    else f"{other} passes over your natal Moon, which can make you feel restless, eager and pulled by new desires.")
        else:
            txt += (f"Ketu brings a quieter, inward pull to {HL_SHORT[hlo]}, so what Rahu amplifies in one area is loosened or simplified in the other." if other == 'Ketu'
                    else f"Rahu brings appetite and ambition to {HL_SHORT[hlo]}, so what Ketu simplifies in one area is stirred up in the other.")
        out.append(txt)
    leanto = ', '.join(l.lower() for l, _ in FIELDS[hl][:2])
    out.append(f"Navigating the pull. {p} spends {info['dur']}, so over this stay, lean into {leanto}, and give extra thought before big decisions about {FEEL[hm][0][1]}. " + info['tip_g' if good else 'tip_b'])
    return out


def planet_detail(o, lagna, L, dasa_notes):
    """o is one entry of the per-planet list in gochara.evaluate."""
    p, hm, hl = o['planet'], o['house_moon'], o['house_lagna']
    info = PL[p]
    paras = []
    paras.append(f"Headline. {o['effect']}.")
    paras.extend(combined_paras(o, lagna))
    if o['blocked']:
        paras.append(f"Classical rating. The {ordn(hm)} from the Moon is normally a house where {p} gives good results, but {o['vedha_by']} is sitting in the vedha house ({ordn(o['vedha_house'])}) and cuts that promise off. The benefit may come later or in a smaller form until {o['vedha_by']} or {p} changes sign, so patience and steady effort help.")
    elif o['fav']:
        paras.append(f"Classical rating. This is a favourable house for {p}, and no planet obstructs it, so {lc(info['good'])}")
    else:
        paras.append(f"Classical rating. Counted from the Moon, this is a house where {p} gives a more demanding result by the classical texts, so {lc(info['bad'])}")
    fn = o['fn_label']
    fnl = {'strong benefic': 'a strong functional benefic', 'benefic': 'a functional benefic', 'mixed': 'a mixed-nature planet',
           'malefic': 'a functional malefic', 'strong malefic': 'a strong functional malefic', 'neutral': 'neutral'}.get(fn, fn)
    if p in ('Rahu', 'Ketu'):
        lag = f"The nodes carry the colour of their sign lord and of whatever they conjoin, so the result here is read through those rather than through ownership."
    else:
        own = ' and '.join(ordn(h) for h in o['owns'])
        if o['fav'] and not o['blocked']:
            adj = {'strong benefic': 'A strong benefic for your lagna adds extra grace on top of this good placement.', 'benefic': 'Being a benefic for your lagna, it adds a little more.',
                   'mixed': 'Its lordship is mixed for your lagna, so the good result is real but not outsized.', 'malefic': 'As a malefic lord for your lagna, the good result arrives with a slightly muted edge.',
                   'strong malefic': 'As a strong malefic lord for your lagna, the good result is noticeably muted and may cost effort.'}.get(fn, '')
        else:
            adj = {'strong benefic': 'Because it is a strong benefic for your lagna, the demand is cushioned and something constructive is left behind.', 'benefic': 'Because it is a benefic for your lagna, the demand is cushioned.',
                   'mixed': 'Its lordship is mixed for your lagna, so it neither cushions nor adds to the demand.', 'malefic': 'As a malefic lord for your lagna, the demand is a little stronger than usual, so steady effort matters more.',
                   'strong malefic': 'As a strong malefic lord for your lagna, the demand is more persistent, so disciplined effort and patience carry you through.'}.get(fn, '')
        lag = f"For {lagna} it rules the {own} {'houses' if len(o['owns']) > 1 else 'house'} and is {fnl}. {adj}"
    paras.append("Lagna lordship. " + ' '.join(lag.split()))
    dg = _dignity(p, o['sign_idx'])
    bits = []
    if dg == 'exalted':
        bits.append(f"{p} is exalted in {o['sign']}, so its significations are at their strongest and most dependable.")
    elif dg == 'debilitated':
        bits.append(f"{p} is debilitated in {o['sign']}, so its gifts arrive with more effort. Neecha-bhanga conditions in the natal chart can soften this, and a professional astrologer can check for them.")
    elif dg == 'own':
        bits.append(f"{p} is in its own sign {o['sign']}, comfortable and able to deliver what it promises.")
    pc = _pace(p, o['retro'])
    if pc:
        bits.append(pc)
    bits.append(f"{p} stays {info['dur']}, so treat this as {'a passing mood' if info['speed'] <= 5 else 'a weeks-long theme' if info['speed'] <= 60 else 'a long chapter of the year' if info['speed'] <= 400 else 'a multi-year background condition'}.")
    paras.append("Speed and strength. " + ' '.join(bits))
    if o['bindus'] is not None:
        bn = o['bindus']
        bt = 'a high count: the sign supports this planet well and eases demanding effects' if bn >= 5 else 'a middling count: results follow the rules above without much help or hindrance' if bn == 4 else 'an average-low count' if bn == 3 else 'a low count: the sign gives this planet less backing, so good effects are lighter and a little extra effort helps'
        paras.append(f"Ashtakavarga. {p} has {bn} bindus in {o['sign']}: {bt}. This is shown for information and is not added to the score.")
    if o.get('trigger_why'):
        paras.append(f"Dasa trigger. {o['trigger_why']}, so what {p} brings now carries extra weight. The themes of the running period tend to surface through this transit.")
    elif L > 0.4:
        paras.append("Dasa layer. Your running dasa lords are strong, which lets good transits deliver fully and gives you extra support during demanding ones.")
    elif L < -0.4:
        paras.append("Dasa layer. Your running dasa lords are weak, which means good transits ripen more slowly, so patience and preparation matter.")
    else:
        paras.append("Dasa layer. The running dasa is neutral, so this transit plays out close to its textbook result.")
    paras.append("Guidance. " + (info['tip_g'] if (o['fav'] and not o['blocked']) else info['tip_b']) + ' ' + info['rem'])
    paras.append(NOTE)
    return paras


# ------------------------------------------------------------------ today strip
TARA_D = {
    1: ('Janma', 'The day sits on your own birth star. It is a day of heightened self-awareness and sensitivity: the body and emotions react a little more strongly than normal.',
        'Rest well, keep food light and do routine work. Big new ventures and long journeys are better scheduled for another day.'),
    2: ('Sampat', 'The star of wealth. Resources, income, gifts and practical gains tend to flow more readily.',
        'Good for money matters, purchases, negotiations, collecting dues and starting profit-oriented work.'),
    3: ('Vipat', 'The star of caution. Plans may meet small hurdles, so extra preparation pays.',
        'Double-check plans, travel unhurried and keep a time buffer. Routine work is fine; save important starts for a friendlier star.'),
    4: ('Kshema', 'The star of well-being. Safety, health and domestic peace are supported.',
        'Good for family matters, recovery, home improvement and anything that needs a calm, secure base.'),
    5: ('Pratyari', 'The star of the opposing force. Plans may meet some resistance, and critics may be more vocal.',
        'Stay diplomatic, do maintenance work and keep new ventures for the next favourable star.'),
    6: ('Sadhaka', 'The star of accomplishment. Effort converts into results and skills perform well.',
        'Very good for tasks needing achievement: exams, launches, applications, repairs and follow-through on hard work.'),
    7: ('Vadha', 'The star of sensitivity. The day can feel a little tense, so gentleness helps.',
        'Keep plans modest, speak kindly, take good care of health and leave big decisions for a smoother day.'),
    8: ('Mitra', 'The star of friendship. Cooperation, goodwill and helpful people are around.',
        'Good for meetings, partnerships, favours, social plans and mending relationships.'),
    9: ('Parama Mitra', 'The star of the best friend. The most supportive of the nine, with ease and help from others.',
        'Excellent for launches, signing, travel, marriage talks and anything where you want things to go well.')}

CONJ_D = {
    'Sun': 'The Sun with the Moon: the mind is inward and driven by purpose; emotions are less visible and confidence is mixed with self-absorption. Close to the new Moon this is a quiet, low-energy day suited to rest and planning.',
    'Mars': 'Mars with the Moon: a restless, impatient, courageous mind. Good for action and sport; patience needs conscious effort. Tempers can shorten, so patience and care with movement help.',
    'Mercury': 'Mercury with the Moon: a quick, talkative, curious mind. Good for study, calls, writing and trade; the mind jumps from one thing to another.',
    'Jupiter': 'Jupiter with the Moon: the classic Guru-Chandra uplift. Optimism, wisdom, generosity and help from elders; good for learning, advice and auspicious beginnings.',
    'Venus': 'Venus with the Moon: a warm, pleasure-seeking, affectionate mood. Good for romance, art, comfort and social life; moderate indulgence and spending.',
    'Saturn': 'Saturn with the Moon: a serious, reflective mind. Duty and responsibility feel strong; this is the Vish-yoga pattern, so go slowly, rest, and take decisions once the mood lifts.',
    'Rahu': 'Rahu with the Moon: a restless, busy mind, with a grahana-like shadow on the emotions. Sleep and clarity benefit from routine; read important papers twice before signing.',
    'Ketu': 'Ketu with the Moon: a detached, withdrawn or intuitive mind. Good for meditation and research; less suited to socialising or anything needing warmth.'}
ASP_D = {
    'Sun': 'The Sun aspects the Moon: the day carries a note of authority and self-assertion. You may feel pushed to perform; calm preparation helps.',
    'Mars': 'Mars aspects the Moon: edginess can creep in. Energy is high, so use it for action and keep patience handy.',
    'Mercury': 'Mercury aspects the Moon: the mind is alert and talkative, and information moves quickly.',
    'Jupiter': 'Jupiter aspects the Moon: a protective, hopeful tone. Guidance and help arrive and worries ease.',
    'Venus': 'Venus aspects the Moon: sweetness, affection and enjoyment colour the day.',
    'Saturn': 'Saturn aspects the Moon: a cautious, serious tone. Responsibilities feel present; a structured day helps.'}

NAK_D = ['Ashwini: Ashwini Kumaras; swift, light. Good for starts, healing, travel, vehicles. Avoid slow, heavy work.',
         'Bharani: Yama; intense, restraining. Good for firm discipline, transformation, closing things. Avoid auspicious starts and gentle matters.',
         'Krittika: Agni; sharp, cutting. Good for cooking, fire work, clearing, decisive action. Avoid delicate talks.',
         'Rohini: Brahma; fixed, fertile, beautiful. Good for planting, buying, marriage, building, art. A very favourable star.',
         'Mrigashira: Soma; soft, searching. Good for travel, trade, romance, learning. Avoid anything needing certainty.',
         'Ardra: Rudra; sharp, stormy. Good for demolition, research, tackling difficult matters. Avoid auspicious beginnings.',
         'Punarvasu: Aditi; movable, renewing. Good for return, repair, travel, restarts and spiritual work.',
         'Pushya: Brihaspati; the most auspicious star. Good for nearly all new beginnings, learning, buying gold and spiritual work.',
         'Ashlesha: Nagas; sharp, clinging. Good for strategy, medicine, secrecy. Avoid trust-based matters, marriage and lending.',
         'Magha: the Pitris; fierce, regal. Good for rituals of ancestors, authority, public roles. Avoid delicate relationship starts.',
         'Purva Phalguni: Bhaga; gentle, pleasure-giving. Good for romance, arts, rest and celebration. Avoid hard labour.',
         'Uttara Phalguni: Aryaman; fixed, supportive. Good for marriage, contracts, building and long commitments.',
         'Hasta: Savitar; light, skilful. Good for craft, trade, learning, travel and quick tasks.',
         'Chitra: Tvashtar; soft, creative. Good for art, design, jewellery, building and display.',
         'Swati: Vayu; movable, independent. Good for trade, travel, diplomacy and learning. Avoid rigid commitments.',
         'Vishakha: Indra-Agni; mixed, goal-driven. Good for ambition, competition and focus. Avoid casual starts.',
         'Anuradha: Mitra; soft, friendly. Good for friendship, partnership, travel and devotion.',
         'Jyeshtha: Indra; sharp, authoritative. Good for leadership, protection, confrontation. Avoid auspicious starts.',
         'Mula: Nirriti; sharp, uprooting. Good for research, removing, medicine. Avoid weddings and new beginnings.',
         'Purva Ashadha: Apas; fierce, invincible. Good for victory, water-related work and assertion.',
         'Uttara Ashadha: Vishvadevas; fixed, lasting. Good for foundations, long projects, ceremonies and commitments.',
         'Shravana: Vishnu; movable, listening. Good for study, learning, travel, advice and spiritual practice.',
         'Dhanishta: the Vasus; movable, wealthy. Good for music, business, building and gaining.',
         'Shatabhisha: Varuna; movable, healing. Good for medicine, research, secrecy and unconventional work.',
         'Purva Bhadrapada: Aja Ekapada; fierce, intense. Good for austerity, firm action and spiritual work. Avoid gentle starts.',
         'Uttara Bhadrapada: Ahir Budhnya; fixed, deep. Good for foundations, meditation, charity and stable projects.',
         'Revati: Pushan; soft, protective. Good for journeys, ending things well, art and caring work.']


def today_details(t, native):
    """t is the 'today' dict from evaluate; returns {key: {title, paras}}."""
    D = {}
    hm, hl = t['house_moon'], t['house_lagna']
    d = []
    d.append(f"Today the transiting Moon is in {t['sign']}, the {ordn(hm)} house from your natal Moon. This house concerns {HM[hm]}, so the mind and daily mood are drawn to those subjects.")
    if t['blocked']:
        d.append("The Moon would normally be at ease here, but its vedha house is occupied, so the comfort is cut off. Expect small hindrances to otherwise smooth plans.")
    elif t['fav']:
        d.append(f"This is a favourable position for the Moon. {uc(PL['Moon']['good'])}")
    else:
        d.append(f"This is a more demanding position for the Moon. {uc(PL['Moon']['bad'])}")
    d.append(PL['Moon']['tip_g'] if t['fav'] and not t['blocked'] else PL['Moon']['tip_b'])
    D['moon'] = {'title': f"Moon {ordn(hm)} from your Moon", 'paras': d}
    tn, mean, adv = TARA_D[t['tara_no']][0], TARA_D[t['tara_no']][1], TARA_D[t['tara_no']][2]
    D['tara'] = {'title': f"{tn} tara", 'paras': [f"Counting from your birth star {t['birth_nak']} to today's Moon star {t['nak']} gives {t['tara_count']}, which falls in the {ordn(t['tara_no'])} of the nine taras: {tn}.",
                 mean, 'Use it: ' + adv, 'Tara bala changes every day because the Moon changes nakshatra daily, so it is the clearest source of day-to-day variation in this reading.']}
    D['lagna'] = {'title': f"Moon {ordn(hl)} from lagna", 'paras': [f"From your {native['lagna']} lagna the Moon is in the {ordn(hl)} house, the field of {HL[hl]}. Whatever the Moon touches, it makes visible and emotional for the day.",
                  HL_ACT[hl], 'The Moon passes through every house in about 27 days, so this emphasis is brief: use it to notice what the mind keeps returning to today.']}
    if t['bindus'] is not None:
        b = t['bindus']
        txt = ('A strong Chandra count. The Moon is well supported in this sign and the day tends to be easy on the mind.' if b >= 5 else
               'A middling count. The Moon is neither helped nor hindered much.' if b == 4 else
               'A low count. The Moon is thinly supported here, so mood and energy depend more on Tara bala and aspects.')
        D['bindus'] = {'title': f"Chandra bindus {b} of 8", 'paras': [f"In the ashtakavarga of the Moon, {t['sign']} holds {b} of a possible 8 bindus. {txt}",
                       f"The total for all planets in this sign is {t['sav']}. Bindus are shown for information and are not added to the day's score."]}
    parts = []
    for pl in t['conj']:
        parts.append(CONJ_D[pl])
    for pl in t['aspects']:
        parts.append(ASP_D[pl])
    D['with'] = {'title': 'Moon with', 'paras': parts or ['No other planet is in the same sign as the Moon or aspecting it today, so the day follows the nakshatra, Tara and house from the natal Moon without extra influences.']}
    nk = NAK_D[t['nak_idx']].split(': ', 1)
    D['star'] = {'title': f"{t['nak']} pada {t['pada']}", 'paras': [f"Today's Moon is in {t['nak']} nakshatra. {nk[1]}",
                 f"It is pada {t['pada']} in {t['sign']}. Combine this with the Tara and house results to judge the day: the nakshatra describes the nature of the day for everyone, while the Tara and house describe what it does to you."]}
    for k in D:
        D[k]['paras'].append(NOTE)
    return D


# ------------------------------------------------------------------ flags
def flag_detail(f, ctx):
    """f: flag dict; ctx: dict(sat=planet entry, jup=planet entry, L, lagna, sat_fn)."""
    i = f['id']
    sat, L = ctx['sat'], ctx['L']
    paras = []
    if i == 'sade':
        ph = f['title'].split('Sade Sati ')[1]
        phase = {'first phase': ('12th from your Moon', 'The first phase is felt on the outer edges of life: sleep, expenses, travel and distance from people. Budgeting, restful routines and a clear plan keep money and mind steady.'),
                 'peak phase': ('over your natal Moon', 'The peak phase is the most personal. It touches the mind and body directly, so rest, health upkeep and supportive company matter. Life slows and asks for maturity at work and in relationships, and the effort you put in now builds lasting foundations.'),
                 'last phase': ('2nd from your Moon', 'The last phase moves the focus to money, family and speech. Savings, food habits and kind words carry the day, and the heaviest part of the cycle is behind you.')}[ph]
        paras.append(f"What it is. Saturn is in the {phase[0]}. Sade Sati is the roughly seven and a half years in which Saturn crosses the sign before your Moon, your Moon sign and the sign after it. It is a period of karmic review and maturing, not of punishment, and many people find it brings lasting strength and clarity.")
        paras.append(phase[1])
        mods = []
        if sat['fn'] > 0:
            mods.append(f"Saturn is a {sat['fn_label']} for your {ctx['lagna']} lagna, which makes this Sade Sati notably gentler and more productive than average. Hard work is rewarded.")
        elif sat['fn'] < 0:
            mods.append(f"Saturn is a {sat['fn_label']} for your {ctx['lagna']} lagna, so this Sade Sati asks for a little more effort than average. Health and workload deserve extra care.")
        dg = _dignity('Saturn', sat['sign_idx'])
        if dg == 'own' or dg == 'exalted':
            mods.append(f"Saturn is {dg} in {sat['sign']}, which keeps the pressure orderly and fair.")
        elif dg == 'debilitated':
            mods.append(f"Saturn is debilitated in {sat['sign']}, which makes the load less even, so regular routines help.")
        if sat['retro']:
            mods.append('Saturn is retrograde at present: this is a time to review earlier commitments, with slower movement on matters tied to it.')
        if L > 0.4:
            mods.append('Your running dasa lords are strong, which cushions the pressure.')
        elif L < -0.4:
            mods.append('Your running dasa lords are weak, so steady health and routine matter more.')
        paras.extend(mods or ['Saturn conditions and your dasa are neutral, so the standard pattern applies.'])
        paras.append('Guidance. Keep routines regular, sleep well, cut waste, do the unglamorous work properly, serve elders and those who work with their hands, and avoid shortcuts. The traditional steadiers are Saturday observances, Hanuman worship and Shani mantra. Met with discipline, Sade Sati usually builds character, patience and lasting foundations.')
    elif i == 'ashtama':
        paras.append(f"What it is. Saturn is in the 8th house from your Moon. In gochara this is a testing, inward position, associated with slower progress, the need for health care and changes of plan. It also turns attention to deep research, inner work and truths that were being set aside, which can be very productive.")
        paras.append('Where it shows. Health upkeep, long-pending legal or financial matters, unresolved conflicts and changes of plan. Keeping the mind occupied with structured work and good company prevents over-thinking.')
        if sat['fn'] > 0:
            paras.append(f"Saturn is a {sat['fn_label']} for your {ctx['lagna']} lagna, which softens the effect and gives something constructive in return for effort.")
        elif sat['fn'] < 0:
            paras.append(f"Saturn is a {sat['fn_label']} for your {ctx['lagna']} lagna, so the effect asks for a little more care than average. Look after health and plan carefully.")
        if L > 0.4:
            paras.append('Strong dasa lords act as a buffer and support you.')
        elif L < -0.4:
            paras.append('Weak dasa lords offer less buffer, so careful planning helps.')
        paras.append('Guidance. Get regular health checks, prefer planned choices to speculation, keep paperwork and insurance in order, drive carefully and keep the mind occupied with structured work. Saturday observances, Hanuman worship and service to the elderly are the traditional remedies.')
    elif i == 'janma_guru':
        paras.append('What it is. Jupiter is transiting your natal Moon sign. In the classical system this position is considered moderate: Jupiter is the great protector, but over the Moon its benefit reaches the mind more slowly.')
        paras.append('How it can feel. A search for direction, an urge to take on too much, some restlessness about the future and results that mature slowly. Clear priorities, healthy habits and trusted advisers keep this phase productive.')
        paras.append('Mitigation. Jupiter does still aspect the 5th, 7th and 9th from your Moon, so support arrives in studies, relationships and fortune. Keep goals realistic, pace your commitments and honour your teachers.')
        paras.append('Guidance. Observe Thursdays, respect gurus, and donate yellow food or books. The effect passes in about a year as Jupiter moves into the next sign.')
    else:
        txt = f['text']
        if f['level'] == 'support':
            paras.append(f"What it is. {txt}. Jupiter's aspect is the strongest protective influence in gochara, a blessing that reaches the planet or point it falls on.")
            paras.append('How it feels. Help from elders and teachers, confidence about the future, easier relationships, and a sense of guidance. If the aspect is on the natal Moon, the mind is calmer. If it is on the lagna, health, reputation and general standing are lifted.')
            paras.append('Guidance. Use the window to start things that need grace: study, a new project, marriage talks, investments in skill. Respect for teachers and elders keeps the aspect productive.')
        else:
            paras.append(f"What it is. {txt}. Saturn's aspect brings slow, steady discipline to the planet or point it falls on, adding duty, patience and the test of time.")
            paras.append('How it can feel. The matters tied to that point become slower and more serious. If the aspect is on the natal Moon, the mind carries more responsibility; if it is on the lagna, energy and self-image feel weightier, so rest and routine help.')
            paras.append('Guidance. Take it as a call for discipline. Keep commitments, work carefully and expect results through patience rather than speed.')
    paras.append(NOTE)
    return paras


# ------------------------------------------------------------------ dasa lens
DASA_THEME = {
    'Sun': 'authority, vitality, the father, government, recognition and a clearer sense of self. Humility with superiors keeps it smooth.',
    'Moon': 'emotions, home, the mother, the public, nurturing and mental swings. Comfort and popularity rise when the Moon is well placed.',
    'Mars': 'energy, property, courage, competition, siblings and technical work. Patience and care keep the energy constructive.',
    'Mercury': 'intellect, commerce, communication, skills, education and friends. Focus and rest keep the mind steady.',
    'Jupiter': 'wisdom, expansion, children, teachers, wealth, dharma and good counsel. Moderation keeps the growth healthy.',
    'Venus': 'relationships, comfort, the arts, vehicles, luxury and money through pleasure or partnership. Balance keeps the comfort wholesome.',
    'Saturn': 'work, duty, discipline, delay, endurance and long-term building. Patience and consistency turn the load into lasting achievement.',
    'Rahu': 'ambition, foreign links, technology, unconventional gains and obsession. Verifying facts and keeping routines steady keep the ambition on course.',
    'Ketu': 'detachment, spiritual interest, research, loss of interest in worldly things and sudden cut-offs. Good company and routine keep the inward mood balanced.'}
LEVEL_D = {'Mahadasa': 'the main chapter of life, lasting years. It sets the overall theme.',
           'Antardasa': 'the sub-chapter inside the mahadasa, lasting months to a couple of years. It shows which part of the main theme is active.',
           'Pratyantardasa': 'the finest layer, lasting weeks to months. It times the actual events within the sub-chapter.'}


def lord_detail(l, lagna):
    pl = l['lord']
    paras = [f"{l['level']} of {pl} ({l['start']} to {l['end']}). This is {LEVEL_D.get(l['level'], 'a layer of the dasa')}",
             f"General themes of {pl}: {DASA_THEME[pl]}",
             f"In your natal chart {pl} sits in {l['sign']}, the {ordn(l['house_lagna'])} house from lagna ({HL[l['house_lagna']]}) and the {ordn(l['house_moon'])} from the Moon. Its results are therefore delivered through {HL[l['house_lagna']]}."]
    if l['owns']:
        paras.append(f"It rules the {' and '.join(ordn(h) for h in l['owns'])} {'houses' if len(l['owns']) > 1 else 'house'} for {lagna} lagna, so it also activates {'; '.join(HL[h] for h in l['owns'])}. It is {l['fn_label']} for this lagna, {'which tends to support the native during its periods' if l['fn'] > 0 else 'which tends to make its periods more varied and effort-driven' if l['fn'] < 0 else 'so it gives mixed results depending on its placement'}.")
    else:
        paras.append(f"{pl} acts through its sign lord and through any planet it joins, so its results are coloured by those.")
    dig = l['dignity']
    sw = l['strength_word']
    paras.append(f"Strength. Dignity: {dig}{', combust' if l['combust'] else ''}. Overall it rates {sw}. " + ('A strong lord delivers its promises with ease.' if l['strength'] > 0 else 'A weaker lord delivers with more effort or time.' if l['strength'] < 0 else 'Results follow the placement and the house it rules.'))
    paras.append(NOTE)
    return paras


def lens_detail(lens, names, L):
    path = lens['path']
    if not path:
        return {}
    md, ad = path[0], path[1] if len(path) > 1 else None
    out = {}
    if L > 0.4:
        eff = 'The dasa is strong, so good transits deliver more fully and demanding ones are softened. This is the time when favourable gochara actually translates into results.'
    elif L < -0.4:
        eff = 'The dasa is weak, so good transits ripen more slowly and demanding ones ask for more care. Use the time for preparation, skill-building and patience.'
    else:
        eff = 'The dasa is neutral, so transits play out close to their textbook results.'
    out['L'] = [f"Combined dasa strength is {L:+.2f} on a scale of -2 to +2 (Mahadasa weighs 50%, Antardasa 30%, Pratyantar 20%).", eff,
                'The logic: transit is the weather, dasa is the season. A cold snap in summer and a cold snap in winter do not feel the same; likewise a Saturn transit inside a strong Jupiter dasa is very different from the same transit in a weak Saturn dasa.']
    out['md'] = [f"The Mahadasa lord {md['lord']} places its weight on: {', '.join(names(i) for i in lens['md_domains']) or 'no particular area'}. These are the life areas tied to the house {md['lord']} occupies ({ordn(md['house_lagna'])}) and the houses it rules.",
                 'In the With dasa column these areas are weighted up, so a good or demanding transit there is magnified. The main themes of the current chapter tend to show up in these areas.']
    if ad:
        out['ad'] = [f"The Antardasa lord {ad['lord']} places its weight on: {', '.join(names(i) for i in lens['ad_domains']) or 'no particular area'}. This is the sub-theme of the present phase and times the events inside the main chapter.",
                     'Watch these areas for the actual outcomes of the Mahadasa promise in the coming months.']
    out['trig'] = ['A transit is a trigger when the planet is itself the running Mahadasa or Antardasa lord, or when it crosses the natal sign of one of them.',
                   'Triggers count more because they connect the slow background of dasa with the day-to-day weather of gochara. Important developments tend to surface when a trigger planet crosses a sensitive point.']
    for k in out:
        out[k].append(NOTE)
    return out


# ------------------------------------------------------------------ relation of a sub-lord to its main lord
REL_H = {1: ('mixed', 'in the same sign as', 'the two lords share a sign, so their results are fused and intensified. The period carries the main lord\'s themes with the sub-lord\'s flavour mixed in.'),
         2: ('mixed', '2nd from', 'a moderately supportive relation. Money, speech and family matters are the link between the two periods; results are ordinary and steady.'),
         3: ('mixed', '3rd from', 'a mildly good relation that rewards effort. Gains come through initiative, communication and courage rather than by themselves.'),
         4: ('good', '4th from', 'a kendra relation. The sub-period stands on firm ground, supports the main theme and tends to bring stability, property or settled progress.'),
         5: ('good', '5th from', 'a trine relation. The sub-period carries the main theme with grace: favourable results, good judgement, support from others and often a visible step forward.'),
         6: ('bad', '6th from', 'a shadashtaka relation, one of the more demanding ones. The sub-period pulls against the main theme, so it asks for extra effort, tact and attention to health and finances. Facing the work directly brings steady results.'),
         7: ('mixed', '7th from', 'an opposition relation. Active and eventful, with partnerships, travel and public dealings in play. Results are strong, and tact keeps the tension low.'),
         8: ('bad', '8th from', 'a shadashtaka relation, the most testing kind. The sub-period can bring changes of plan and slower progress on the main theme. Patience, preparation and care carry you through, and it often rewards research and inner work.'),
         9: ('good', '9th from', 'a trine relation, the best kind. Luck, mentors and support arrive, and the sub-period lifts the main theme with grace.'),
         10: ('good', '10th from', 'a kendra relation. Action-oriented and visible: career, status and responsibility advance, and results are seen in public.'),
         11: ('good', '11th from', 'a gain relation. Income, contacts and the fulfilment of earlier plans come through this sub-period.'),
         12: ('bad', '12th from', 'a dwirdwadasha relation. Outflow, expense, withdrawal and distance: energy moves away from the main theme, though it can favour travel abroad, retreat or spiritual work.')}


def relation(a, b, lagna):
    """a: main lord dict, b: sub lord dict (from evaluate's lords). House of b counted from a, by natal sign."""
    h = (b['sign_idx'] - a['sign_idx']) % 12 + 1
    nature, label, text = REL_H[h]
    fr = 'neutral'
    from .consts import NAT_FRIENDS, NAT_ENEMIES
    if a['lord'] in NAT_FRIENDS and b['lord'] in NAT_FRIENDS[a['lord']]:
        fr = 'friend'
    elif a['lord'] in NAT_ENEMIES and b['lord'] in NAT_ENEMIES[a['lord']]:
        fr = 'enemy'
    paras = [f"Relation. {b['lord']} ({b['level']}) sits {label} {a['lord']} ({a['level']}) in the natal chart: {text}",
             {'friend': f"Friendship. {b['lord']} is a natural friend of {a['lord']}, which softens friction and strengthens support between the two periods.",
              'enemy': f"Friendship. {b['lord']} is a natural enemy of {a['lord']}, which sharpens friction and weakens support between the two periods.",
              'neutral': f"Friendship. {b['lord']} and {a['lord']} are neutral toward each other, so the house relation decides the result."}[fr],
             f"Placement. {a['lord']} is in {a['sign']} (the {ordn(a['house_lagna'])} house) and {b['lord']} is in {b['sign']} (the {ordn(b['house_lagna'])} house), so the main theme works through {HL[a['house_lagna']]} and the sub-period through {HL[b['house_lagna']]}.",
             'Use. This is shown for interpretation and is not added to the score. A demanding relation does not cancel good transits; it means the period asks for more effort. A good relation makes the period easier to use.', NOTE]
    key = {'good': 'supportive', 'bad': 'needs effort', 'mixed': 'mixed'}[nature] + (', friends' if fr == 'friend' else ', unfriendly' if fr == 'enemy' else '')
    return {'from': a['lord'], 'to': b['lord'], 'levels': f"{b['level']} from {a['level']}", 'house': h, 'nature': nature, 'friend': fr, 'keyword': f"{ordn(h)} from, {key}", 'paras': paras}
