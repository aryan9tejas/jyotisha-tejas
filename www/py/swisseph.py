"""Drop-in subset of pyswisseph for Pyodide: forwards to the Swiss Ephemeris WebAssembly build held by the page (module _swe_js)."""
import _swe_js as J

SUN, MOON, MERCURY, VENUS, MARS, JUPITER, SATURN = 0, 1, 2, 3, 4, 5, 6
MEAN_NODE, TRUE_NODE = 10, 11
FLG_SWIEPH, FLG_SPEED, FLG_EQUATORIAL, FLG_SIDEREAL = 2, 256, 2048, 65536
CALC_RISE, CALC_SET, BIT_DISC_CENTER, BIT_NO_REFRACTION = 1, 2, 256, 512
SIDM_LAHIRI, SIDM_RAMAN, SIDM_KRISHNAMURTI = 1, 3, 5
GREG_CAL = 1


def _py(x):
    return x.to_py() if hasattr(x, 'to_py') else x


def julday(year, month, day, hour=0.0, gregflag=GREG_CAL):
    return float(J.julday(year, month, day, hour, gregflag))


def revjul(jd, gregflag=GREG_CAL):
    r = _py(J.revjul(jd, gregflag))
    return (int(r['year']), int(r['month']), int(r['day']), float(r['hour']))


def set_sid_mode(mode, t0=0.0, ayan_t0=0.0):
    J.set_sid_mode(mode, t0, ayan_t0)


def get_ayanamsa_ut(jd):
    return float(J.get_ayanamsa_ut(jd))


def calc_ut(jd, ipl, flags=FLG_SWIEPH | FLG_SPEED):
    r = _py(J.calc_ut(jd, ipl, flags))
    return tuple(float(v) for v in list(r)[:6]), flags


def houses_ex(jd, lat, lon, hsys=b'P', flags=0):
    h = hsys.decode() if isinstance(hsys, (bytes, bytearray)) else hsys
    r = _py(J.houses_ex(jd, flags, lat, lon, h))
    cusps = [float(v) for v in r['cusps']]
    if len(cusps) == 13:
        cusps = cusps[1:]
    return tuple(cusps), tuple(float(v) for v in r['ascmc'])


def rise_trans(tjdut, body, rsmi, geopos, atpress=0.0, attemp=0.0, flags=FLG_SWIEPH):
    try:
        t = float(J.rise_trans(tjdut, body, flags, rsmi, geopos[0], geopos[1], geopos[2], atpress, attemp))
    except Exception:
        return -2, (0.0,)
    if t != t or t <= 0:
        return -2, (0.0,)
    return 0, (t,)
