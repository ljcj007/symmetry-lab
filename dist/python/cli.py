"""The same JSON computation interface as the browser, for local CPython.

python dist/python/cli.py magnetictb dist/examples/magnetictb-graphene.json
python dist/python/cli.py crystkit dist/examples/crystkit-space-group.json
python dist/python/cli.py analyze request.json -o result.json
"""
import argparse
import json
from pathlib import Path
import sys


def main():
    parser = argparse.ArgumentParser(description=__doc__)
    parser.add_argument('tool', choices=['analyze', 'induce', 'product', 'match_bands', 'magnetictb', 'crystkit'])
    parser.add_argument('input', help='JSON file, or - for standard input')
    parser.add_argument('-o', '--output', help='Result JSON path; defaults to standard output')
    args = parser.parse_args()
    payload = json.loads(sys.stdin.read() if args.input == '-' else Path(args.input).read_text(encoding='utf-8-sig'))
    if args.tool == 'magnetictb':
        import magnetictb_browser
        result = magnetictb_browser.run(payload)
    elif args.tool == 'crystkit':
        import crystkit_browser
        data = Path(__file__).resolve().parent.parent / 'data' / 'space-groups.json'
        result = crystkit_browser.run(payload, json.loads(data.read_text(encoding='utf8')))
    else:
        import symmetry_core
        result = symmetry_core.run(args.tool, payload)
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
