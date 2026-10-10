"""Time zone fallback for the offline app: the page looks up the nearest bundled place."""


def tz_for(lat, lon):
    import _swe_js as J
    return J.tz_for(lat, lon) or None
