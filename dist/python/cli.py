"""The same JSON computation interface as the browser, for local CPython.

python dist/python/cli.py magnetictb dist/examples/magnetictb-graphene.json
python dist/python/cli.py crystkit dist/examples/crystkit-space-group.json
python dist/python/cli.py analyze request.json -o result.json
"""
import argparse
import json
from pathlib import Path
import sys
import gzip
from browser_api import run, TOOLS


def main():
    parser = argparse.ArgumentParser(description=__doc__)
    parser.add_argument('tool', choices=TOOLS)
    parser.add_argument('input', help='JSON file, or - for standard input')
    parser.add_argument('-o', '--output', help='Result JSON path; defaults to standard output')
    args = parser.parse_args()
    payload = json.loads(sys.stdin.read() if args.input == '-' else Path(args.input).read_text(encoding='utf-8-sig'))
    data = Path(__file__).resolve().parent.parent / 'data'
    database = json.loads((data / 'space-groups.json').read_text(encoding='utf8')) if args.tool in ('crystkit', 'crystkit_ext', 'integral_normalizer', 'arithmetic_centralizer', 'symbolic_spacegroups') else None
    magnetic_database = json.loads((data / 'magnetic-groups.json').read_text(encoding='utf8')) if args.tool == 'symbolic_spacegroups' else None
    catalog = None
    if args.tool in ('carat', 'carat_integral'):
        dimension = payload.get('dimension', 3)
        if type(dimension) is not int or dimension not in range(1, 7):
            raise ValueError('CARAT dimension must be an integer from 1 to 6')
        catalog = json.loads(gzip.decompress((data / 'carat' / f'q{dimension}.json.gz').read_bytes()))
    result = run(args.tool, payload, database, catalog, magnetic_database)
    output = json.dumps(result, ensure_ascii=False, allow_nan=False, indent=2)
    if args.output:
        Path(args.output).write_text(output + '\n', encoding='utf8')
    else:
        sys.stdout.reconfigure(encoding='utf8')
        print(output)


if __name__ == '__main__':
    try:
        main()
    except (ValueError, KeyError, OSError) as error:
        print(f'Input or computation error: {error}', file=sys.stderr)
        raise SystemExit(1)
