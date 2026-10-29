"""Refresh pathways provenance after final source/catalog edits.

python scripts/refresh-pathways-provenance.py
python scripts/refresh-pathways-provenance.py --check

Historical release/date/count/source metadata is retained: existing manifest
file/module hashes are refreshed, missing Python files are registered, and only
the pathways manifest is newly generated. Text follows the existing formula
refresh script's UTF-8/LF hash convention. This command does not call its main(),
which would regenerate the historical formula release's counts.
--check is strictly read-only, including when it reports stale/missing output.
No catalog building, packaging, Git operation, deployment or .openai dependency.
"""
from pathlib import Path
from functools import lru_cache
import argparse
import hashlib
import json
import re

ROOT=Path(__file__).resolve().parents[1]
RELEASE='20261029-pathways1'
DATE='2026-10-29'
MANIFEST='dist/data/pathways-provenance.json'
TEXT_EXTENSIONS={'.py','.js','.mjs','.cjs','.json','.html','.css','.md','.txt','.svg','.yaml','.yml','.toml','.csv'}
CORE={
    'band_rep_lab':{
        'coverage':['Site orbits, stabilizers, periodic-gauge Bloch matrices and selected-k little-group decomposition for ordinary space groups 2, 4, 19 and 221; scalar s or complete polar p orbitals'],
        'limitations':['BC primitive settings, including the group-4 screw along z; single-valued and no SOC/time reversal', 'No generic EBR classification, electronic energy calculation, structure identification or complete topological diagnosis']},
    'dynamic_scattering_lab':{
        'coverage':['One-dimensional longitudinal diatomic harmonic chain with mass-normalized complex modes, coherent one-phonon amplitudes, Bose populations and positive/negative energy scattering'],
        'limitations':['Synthetic chain with explicit energy cutoff and relative scattering weights; no arbitrary Phonopy dataset import', 'No fitted material cross section, Debye-Waller factor, elastic/multiphonon scattering or computed damping']},
    'domain_wall_lab':{
        'coverage':['Independent scalar phi4 pinned-wall finite-grid stationary calculation with continuum and Hessian diagnostics', 'Independent finite open SSH chain with central-pair potential, LDOS and selected-subspace spatial projectors'],
        'limitations':['Reduced continuum units do not automatically map to SSH parameters or fitted ferroelectric energies', 'Finite-grid residual is distinct from unconstrained stability; spatial windows may overlap and finite chains need not reach asymptotic dimerization']},
    'hubbard_lab':{
        'coverage':['Exact fermionic diagonalization of 2-4 site open/periodic single-band Hubbard clusters in fixed up/down particle sectors', 'Degenerate-ground-state trace averages, densities, double occupancy, spin correlations, U scans, all-Sz charge gaps and dimer singlet-triplet splitting'],
        'limitations':['Two-site periodic model has one undirected bond; zero temperature and supplied model parameters', 'Finite-sector gaps and finite-cluster charge costs do not prove a thermodynamic Mott transition or material magnetic order']},
}


def read_json(path):
    return json.loads(path.read_text(encoding='utf-8'))


def serialized(data):
    return json.dumps(data,ensure_ascii=False,indent=2)+'\n'


def content(path):
    # Same convention as refresh-formula-provenance.py; binary gzip is unchanged.
    return path.read_text(encoding='utf-8').encode('utf-8') if path.suffix.lower() in TEXT_EXTENSIONS else path.read_bytes()


@lru_cache(maxsize=None)
def file_entry(name):
    if not name or name.replace('\\','/').startswith('.openai/'):
        raise ValueError('Local helper files are not reproducible manifest dependencies')
    path=ROOT/name
    if ROOT.resolve() not in path.resolve().parents:
        raise ValueError(f'Manifest path must stay in the repository: {name}')
    raw=content(path)
    return {'path':name,'sha256':hashlib.sha256(raw).hexdigest(),'bytes':len(raw)}


def refresh_rows(rows):
    if isinstance(rows,dict):
        entries=[(name,row) for name,row in rows.items() if isinstance(row,dict)]
    elif isinstance(rows,list):
        entries=[(row.get('path'),row) for row in rows if isinstance(row,dict)]
    else:
        return
    for name,row in entries:
        if not name or 'sha256' not in row:
            continue
        updated=file_entry(name)
        row['sha256']=updated['sha256']
        if 'bytes' in row:
            row['bytes']=updated['bytes']


def register_python_modules(data):
    rows=data['modules']
    known={row['path']:row for row in rows}
    if len(known)!=len(rows):
        raise ValueError('Duplicate Python manifest paths')
    for path in sorted((ROOT/'dist/python').glob('*.py')):
        name=path.relative_to(ROOT).as_posix()
        if name not in known:
            row={**file_entry(name)}
            if path.stem in CORE:
                row.update(upstream=[],license='GPL-3.0-only',
                           implementation='Original NumPy teaching implementation',**CORE[path.stem])
            else:
                # Register previously omitted existing files without inventing
                # their provenance, license, historical release or coverage.
                row['registrationNote']='File hash registration only; existing repository source and upstream license notices remain authoritative.'
            rows.append(row)
    refresh_rows(rows)


def historical_outputs():
    outputs={}
    for path in sorted((ROOT/'dist/data').glob('*provenance.json')):
        if path.relative_to(ROOT).as_posix()==MANIFEST:
            continue
        data=read_json(path)
        refresh_rows(data.get('files'))
        if path.name=='python-provenance.json':
            register_python_modules(data)
        else:
            refresh_rows(data.get('modules'))
        outputs[path]=data
    return outputs


def project_headers(name):
    source=(ROOT/name).read_text(encoding='utf-8')
    rows=re.findall(r"^\s*\{id:'([^']+)',module:'([^']+)',title:'([^']+)'",source,re.MULTILINE)
    if not rows or len({r[0] for r in rows})!=len(rows):
        raise ValueError(f'Missing or duplicate project headers in {name}')
    return [{'id':i,'module':m,'title':t} for i,m,t in rows]


def catalog_data():
    catalog=read_json(ROOT/'dist/data/pathways-materials.json')
    dictionary=read_json(ROOT/'dist/data/formula-dictionary.json')
    for data in (catalog,dictionary):
        if data.get('release')!=RELEASE:
            raise ValueError('Build the current catalog and dictionary before refreshing')
    for key in ('modules','lessons','exercises','cases','sources'):
        ids=[row['id'] for row in catalog[key]]
        if len(set(ids))!=len(ids):
            raise ValueError(f'Duplicate catalog {key} IDs')
    if {m['id'] for m in catalog['modules']}!={'bandrep','scattering','domainwall','hubbard'}:
        raise ValueError('Expected the four reviewed pathways modules')
    dictionary_ids=[row['id'] for row in dictionary['entries']]
    if len(set(dictionary_ids))!=len(dictionary_ids):
        raise ValueError('Duplicate dictionary entry IDs')
    counts={key:len(catalog[key]) for key in ('modules','lessons','exercises','cases')}
    counts.update(exerciseSteps=sum(len(e['steps']) for e in catalog['exercises']),
                  presets=sum(len(m['presets']) for m in catalog['modules']),
                  dictionaryEntries=len(dictionary['entries']),catalogSources=len(catalog['sources']),
                  dictionarySources=len(dictionary['sources']),sources=len(catalog['sources'])+len(dictionary['sources']),
                  uniqueSourceURLs=len({row['url'] for row in catalog['sources']+dictionary['sources']}))
    projects=project_headers('dist/pathways-projects.js')
    prior=project_headers('dist/response-projects.js')+project_headers('dist/spectroscopy-projects.js')
    if len({p['id'] for p in projects+prior})!=len(projects+prior):
        raise ValueError('Project IDs must remain unique across old and new modules')
    counts.update(projects=len(projects),retainedProjects=len(prior),projectCenterTotal=len(projects)+len(prior))
    return catalog,dictionary,counts,projects


def release_manifest(catalog,dictionary,counts,projects):
    names={
        'README.md','package.json','scripts/refresh-pathways-provenance.py',
        'scripts/refresh-formula-provenance.py','scripts/build-pathways-catalog.py',
        'scripts/build-domainwall-catalog.py','scripts/build-pathways-fixtures.py',
        'scripts/build-pathways-project-fixtures.py','scripts/fixtures/pathways.json.gz',
        'scripts/fixtures/pathways-projects.json','scripts/test-pathways-ui.mjs',
        'scripts/test-pathways-projects.mjs','scripts/test-formula-dictionary.mjs',
        'scripts/test-python-band-rep.py','scripts/test-python-dynamic-scattering.py',
        'scripts/test-python-domain-wall.py','scripts/test-python-hubbard.py',
        'dist/data/pathways-materials.json','dist/data/formula-dictionary.json',
        'dist/data/space-groups.json','dist/docs/pathways.md',
        'dist/docs/band-representations.md','dist/docs/dynamic-scattering.md',
        'dist/docs/domain-walls.md','dist/docs/hubbard-clusters.md',
        'dist/python/browser_api.py','dist/python/symmetry_core.py',
    }
    names.update(f'dist/python/{name}.py' for name in CORE)
    names.update(f'dist/data/{name}-content.json' for name in ('bandrep','scattering','domainwall','hubbard'))
    # Shared routing, formula hooks, notebook/export and cache integration are
    # part of the reviewed deliverable, so include all first-level UI assets.
    for pattern in ('*.js','*.css','*.html'):
        names.update(path.relative_to(ROOT).as_posix() for path in (ROOT/'dist').glob(pattern))
    for pattern in ('*pathways*.py','*pathways*.mjs','*formula-dictionary*.mjs','*formula-dictionary*.py'):
        names.update(path.relative_to(ROOT).as_posix() for path in (ROOT/'scripts').glob(pattern))
    source_rows=[dict(row) for row in catalog['sources']]
    source_rows.extend({**row,'id':'dictionary-'+row['id']} for row in dictionary['sources'])
    return {
        'schema':'symmetry-lab-pathways-provenance-1','release':RELEASE,'date':DATE,
        'originalContent':True,
        'scope':'Four bounded Python teaching workflows, original lessons/model presets and cross-module assignments, plus a context-aware read-only formula dictionary; no generic EBR, real-material fitting or thermodynamic phase claim',
        'counts':counts,'projects':projects,
        'models':[{'module':name,**scope} for name,scope in CORE.items()],
        'dictionaryScope':'Definitions, variables, units and conventions are selected using route/formula context; unresolved ambiguity and unknown formulas are not guessed, and original source math is preserved.',
        'sources':source_rows,
        'sourceNote':'Primary research, author teaching notes and official technical documentation are method/context references; no imported measured dataset or complete upstream software implementation is claimed.',
        'hashConvention':'SHA-256 of UTF-8 text normalized to LF; binary files hashed without conversion',
        'historicalMetadataPolicy':'Retain prior release/date/count/source fields; refresh existing file/module digests and register omitted Python files without reclassifying their historical coverage.',
        'refreshCommand':'python scripts/refresh-pathways-provenance.py',
        'verifyCommand':'python scripts/refresh-pathways-provenance.py --check',
        'files':[file_entry(name) for name in sorted(names)],
    }


def build_outputs():
    catalog,dictionary,counts,projects=catalog_data()
    outputs=historical_outputs()
    outputs[ROOT/MANIFEST]=release_manifest(catalog,dictionary,counts,projects)
    return outputs,counts


def main():
    parser=argparse.ArgumentParser(description=__doc__)
    parser.add_argument('--check',action='store_true',help='Compare only; never write files or update timestamps')
    args=parser.parse_args()
    outputs,counts=build_outputs()
    changed=[]
    for path,data in outputs.items():
        expected=serialized(data)
        if not path.exists() or path.read_text(encoding='utf-8')!=expected:
            changed.append(path.relative_to(ROOT).as_posix())
            if not args.check:
                path.write_text(expected,encoding='utf-8',newline='\n')
    print('Pathways counts:',json.dumps(counts))
    if args.check and changed:
        raise SystemExit('Stale provenance; run refresh after final edits:\n'+'\n'.join(changed))
    print(('Verified' if args.check else 'Refreshed')+f' {len(outputs)} provenance manifests; {len(changed)} changed.')


if __name__=='__main__':
    main()
