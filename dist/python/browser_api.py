"""Shared, allowlisted JSON API for CPython and the browser Worker."""
TOOLS = ('analyze', 'induce', 'product', 'match_bands', 'magnetictb',
         'crystkit', 'symbolic', 'carat', 'crystkit_ext')


def run(tool, payload, database=None, catalog=None):
    if tool not in TOOLS:
        raise ValueError('Unknown calculation tool')
    if not isinstance(payload, dict):
        raise ValueError('Calculation input must be a JSON object')
    if tool == 'magnetictb':
        from magnetictb_browser import run as calculate
        return calculate(payload)
    if tool == 'crystkit':
        from crystkit_browser import run as calculate
        return calculate(payload, database)
    if tool == 'crystkit_ext':
        from crystkit_extensions import run as calculate
        return calculate(payload, database)
    if tool == 'symbolic':
        from symbolic_core import run as calculate
        return calculate(payload)
    if tool == 'carat':
        from carat_browser import run as calculate
        return calculate(payload, catalog)
    from symmetry_core import run as calculate
    return calculate(tool, payload)
