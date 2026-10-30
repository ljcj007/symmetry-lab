"""Refresh the bridges release without rewriting historical claims.

Run after the final source, catalog and genuine Python fixtures are complete:
  python scripts/refresh-bridges-provenance.py
  python scripts/refresh-bridges-provenance.py --check

Historical releases, dates, coverage, counts, sources and upstream metadata are
retained. Existing file/module digests are refreshed and four original Python
modules are registered. The new manifest also hashes the *prospective refreshed*
historical manifests, so a single refresh is idempotent. No older main(), catalog
builder, fixture builder, package command, Git command or deployment is invoked.
--check is strictly read-only, including on failure, and needs no .openai files.
"""
from pathlib import Path
import argparse
import gzip
import hashlib
import json
import math
import re
from urllib.parse import urlparse

ROOT = Path(__file__).resolve().parents[1]
RELEASE = '20261030-bridges1'
DATE = '2026-10-30'
MANIFEST = 'dist/data/bridges-provenance.json'
TEXT_EXTENSIONS = {'.py','.js','.mjs','.cjs','.json','.html','.css','.md','.txt','.svg','.yaml','.yml','.toml','.csv'}
MODULES = {
    'manybody':('manybody_spectra_lab','manybody-spectra-lab','observables'),
    'polaron':('polaron_lab','polaron-lab','structure-dynamics'),
    'density':('density_matrix_lab','density-matrix-lab','spin'),
    'workshop':('symmetry_workshop','symmetry-workshop','crystal'),
}
CORE = {
    'manybody_spectra_lab':{
        'coverage':['Zero-temperature 2-4 site Hubbard Lehmann addition/removal spectra from genuine fermionic transition matrix elements',
                    'Connected longitudinal spin/density spectra, degenerate-subspace trace averages, conditioned final-state observables and discrete zeroth/first-moment sum rules'],
        'limitations':['Fixed up/down particle sector; supplied chemical potential shifts spectral reference but does not set filling',
                       'Relative finite-cluster spectra and numerical Lorentz broadening; no material cross sections, finite-temperature spectra, DMFT or thermodynamic phase claim']},
    'polaron_lab':{
        'coverage':['One electron on two Holstein sites, two truncated local quantum oscillators, electronic reduced density and conditional displacement clouds',
                    'Neighboring phonon-cutoff comparison, top-level probabilities and bounded coupling scans'],
        'limitations':['Synthetic supplied parameters, omitted oscillator zero-point energy and dimensionless displacement; no structure-based coupling fit',
                       'An adjacent-cutoff diagnostic is not a rigorous global error bound; finite symmetric density alone neither proves nor excludes electron-phonon correlations']},
    'density_matrix_lab':{
        'coverage':['One/two spin-1/2 density matrices under a constant Hamiltonian and independent phenomenological Lindblad channels',
                    'Bloch trajectories, partial traces, total purity, local entropy, two-qubit negativity and trajectory trace/Hermiticity/positivity diagnostics'],
        'limitations':['Angular-frequency coefficients in rad/ns and rates in inverse ns; fixed up-to-down relaxation direction',
                       'Initial Gibbs temperature does not define a thermal bath; no non-Markov environment, pulse sequence or automatic detailed-balance thermalization']},
    'symmetry_workshop':{
        'coverage':['Real coefficient nullspace of a two-dimensional spin-half k.p polynomial through order two for selected C2v/C3v/C4v generators',
                    'Optional mirror, rotation, same-parity inversion and time-reversal constraints, coefficient projection and local two-band comparisons'],
        'limitations':['Specified same-parity physical-spin doublet near Gamma, with axial-vector mirror transformation; not an arbitrary orbital pseudospin representation',
                       'Projection uses the displayed coefficient Euclidean metric; no material fit, generic new k.p solver, full-Brillouin-zone spectrum or topological invariant']},
}
EXPECTED_COUNTS = {'modules':4,'lessons':13,'exercises':13,'exerciseSteps':52,
                   'cases':11,'presets':25,'predictions':8,'projects':4,
                   'projectStages':12,'retainedProjects':10,'projectCenterTotal':14,
                   'dictionaryEntries':82,'dictionarySources':30}


def read_json(path):
    return json.loads(path.read_text(encoding='utf-8'))


def serialized(data):
    return json.dumps(data,ensure_ascii=False,indent=2)+'\n'


def content(path):
    return path.read_text(encoding='utf-8').encode('utf-8') if path.suffix.lower() in TEXT_EXTENSIONS else path.read_bytes()


def digest(raw):
    return hashlib.sha256(raw).hexdigest()


def file_entry(name,prospective=None):
    name=str(name).replace('\\','/')
    path=(ROOT/name).resolve()
    if not name or name.startswith('.openai/') or ROOT.resolve() not in path.parents:
        raise ValueError('Manifest dependencies must be reproducible files inside this repository: '+name)
    raw=prospective[name].encode('utf-8') if prospective and name in prospective else content(path)
    return {'path':name,'sha256':digest(raw),'bytes':len(raw)}


def refresh_rows(rows):
    if isinstance(rows,dict):
        items=[(name,row) for name,row in rows.items() if isinstance(row,dict)]
    elif isinstance(rows,list):
        items=[(row.get('path'),row) for row in rows if isinstance(row,dict)]
    else:
        return
    for name,row in items:
        if not name or 'sha256' not in row:
            continue
        updated=file_entry(name)
        row['sha256']=updated['sha256']
        if 'bytes' in row:
            row['bytes']=updated['bytes']


def historical_outputs():
    outputs={}
    for path in sorted((ROOT/'dist/data').glob('*provenance.json')):
        if path.relative_to(ROOT).as_posix()==MANIFEST:
            continue
        data=read_json(path)
        refresh_rows(data.get('files'))
        refresh_rows(data.get('modules'))
        if path.name=='python-provenance.json':
            rows=data['modules'];known={r['path'] for r in rows}
            if len(known)!=len(rows):
                raise ValueError('Historical Python manifest contains duplicate paths')
            for core,scope in CORE.items():
                name='dist/python/'+core+'.py'
                if name not in known:
                    rows.append({**file_entry(name),'upstream':[],'license':'GPL-3.0-only',
                                 'implementation':'Original NumPy teaching implementation',**scope})
        outputs[path]=data
    return outputs


def unique(rows,label):
    ids=[r['id'] for r in rows]
    if len(ids)!=len(set(ids)):
        raise ValueError('Duplicate '+label+' IDs')
    return set(ids)


def check_url(url):
    parsed=urlparse(url)
    if parsed.scheme!='https' or not parsed.netloc or parsed.username or parsed.password:
        raise ValueError('Expected an uncredentialed HTTPS primary-source URL: '+url)


def check_choices(item,label):
    choices=item.get('choices',[]);answer=item.get('answer')
    if len(choices)<2 or isinstance(answer,bool) or not isinstance(answer,int) or not 0<=answer<len(choices):
        raise ValueError('Invalid answer index in '+label)


def project_headers(name,with_stages=False):
    source=(ROOT/name).read_text(encoding='utf-8')
    matches=list(re.finditer(r"^\s*\{id:'([^']+)',module:'([^']+)',title:'([^']+)'",source,re.MULTILINE))
    if not matches:
        raise ValueError('No project definitions in '+name)
    rows=[]
    for i,match in enumerate(matches):
        identity,module,title=match.groups();row={'id':identity,'module':module,'title':title}
        if with_stages:
            block=source[match.end():matches[i+1].start() if i+1<len(matches) else len(source)]
            stages=re.findall(r"\{id:'([^']+)',title:'([^']+)',action:'([^']+)'",block)
            if not stages:
                raise ValueError('Project stages missing: '+identity)
            row['stages']=[dict(id=s,title=t,action=a) for s,t,a in stages]
            unique(row['stages'],'stage of '+identity)
        rows.append(row)
    unique(rows,'project in '+name)
    return rows


def validate_catalogs():
    catalog=read_json(ROOT/'dist/data/bridges-materials.json')
    dictionary=read_json(ROOT/'dist/data/formula-dictionary.json')
    if catalog.get('release')!=RELEASE or dictionary.get('extensionRelease')!=RELEASE or dictionary.get('release')!='20261029-pathways1':
        raise ValueError('Current catalog/dictionary extension version is missing or changed')
    for key in ('modules','lessons','exercises','cases','sources'):
        unique(catalog[key],key)
    module_map={m['id']:m for m in catalog['modules']}
    if set(module_map)!=set(MODULES):
        raise ValueError('Expected exactly the four reviewed bridges modules')
    source_ids={s['id'] for s in catalog['sources']}
    preset_ids={}
    prediction_ids=[]
    for mid,module in module_map.items():
        action,route,pathway=MODULES[mid]
        if (module['action'],module['route'],module['pathway'])!=(action,route,pathway):
            raise ValueError('Module route/action mismatch: '+mid)
        original=read_json(ROOT/f'dist/data/{mid}-content.json')
        if original.get('release')!=RELEASE or original['module']['id']!=mid:
            raise ValueError('Source content version/module mismatch: '+mid)
        own_sources=unique(original['sources'],mid+' source')
        for lesson in original['lessons']:
            if lesson['module']!=mid or not set(lesson['references'])<=own_sources:
                raise ValueError('Invalid original lesson/source reference: '+lesson['id'])
        fields={f['key']:f for f in module['fields']}
        if len(fields)!=len(module['fields']):
            raise ValueError('Duplicate input field: '+mid)
        preset_ids[mid]=unique(module['presets'],mid+' preset')
        for preset in module['presets']:
            if not set(preset['input'])<=set(fields):
                raise ValueError('Unknown preset field: '+preset['id'])
            values={k:f['default'] for k,f in fields.items()};values.update(preset['input'])
            for key,value in values.items():
                f=fields[key]
                if f['type']=='select':
                    if value not in [choice[0] for choice in f['options']]:
                        raise ValueError('Invalid select preset value: '+preset['id']+'/'+key)
                elif isinstance(value,bool) or not isinstance(value,(int,float)) or not math.isfinite(value) or not f['min']<=value<=f['max']:
                    raise ValueError('Invalid numeric preset value: '+preset['id']+'/'+key)
        for prediction in module['predictions']:
            check_choices(prediction,prediction['id'])
            if prediction['preset'] not in preset_ids[mid]:
                raise ValueError('Prediction references missing preset: '+prediction['id'])
            prediction_ids.append(prediction['id'])
    if len(prediction_ids)!=len(set(prediction_ids)):
        raise ValueError('Duplicate prediction IDs')
    lesson_map={l['id']:l for l in catalog['lessons']}
    for lesson in catalog['lessons']:
        if lesson['module'] not in module_map or lesson['preset'] not in preset_ids[lesson['module']]:
            raise ValueError('Invalid lesson preset/module: '+lesson['id'])
        if not set(lesson['references'])<=source_ids:
            raise ValueError('Invalid merged lesson source: '+lesson['id'])
    for exercise in catalog['exercises']:
        if exercise['lesson'] not in lesson_map or exercise['module']!=lesson_map[exercise['lesson']]['module']:
            raise ValueError('Invalid exercise lesson/module: '+exercise['id'])
        if len(exercise['steps'])!=4:
            raise ValueError('Expected four steps: '+exercise['id'])
        for step in exercise['steps']:
            check_choices(step,exercise['id'])
    for case in catalog['cases']:
        if case['module'] not in module_map or case['preset'] not in preset_ids[case['module']]:
            raise ValueError('Invalid case preset/module: '+case['id'])
    unique(dictionary['entries'],'dictionary entry');dict_sources=unique(dictionary['sources'],'dictionary source')
    for entry in dictionary['entries']:
        if not set(entry['sources'])<=dict_sources:
            raise ValueError('Invalid dictionary source: '+entry['id'])
    for source in catalog['sources']+dictionary['sources']:
        check_url(source['url'])
    projects=project_headers('dist/bridges-projects.js',True)
    prior=sum((project_headers('dist/'+name+'-projects.js') for name in ('response','spectroscopy','pathways')),[])
    unique(projects+prior,'all project')
    if any(p['module'] not in module_map for p in projects):
        raise ValueError('Unknown new project module')
    counts={k:len(catalog[k]) for k in ('modules','lessons','exercises','cases')}
    counts.update(exerciseSteps=sum(len(e['steps']) for e in catalog['exercises']),presets=sum(len(m['presets']) for m in catalog['modules']),
                  predictions=len(prediction_ids),projects=len(projects),projectStages=sum(len(p['stages']) for p in projects),
                  retainedProjects=len(prior),projectCenterTotal=len(projects)+len(prior),
                  dictionaryEntries=len(dictionary['entries']),dictionarySources=len(dictionary['sources']),
                  catalogSources=len(catalog['sources']),sources=len(catalog['sources'])+len(dictionary['sources']),
                  uniqueSourceURLs=len({s['url'] for s in catalog['sources']+dictionary['sources']}))
    for key,value in EXPECTED_COUNTS.items():
        if counts[key]!=value:
            raise ValueError(f'Unexpected release count {key}: {counts[key]} != {value}')
    return catalog,dictionary,counts,projects


def validate_fixtures(catalog,projects):
    path=ROOT/'scripts/fixtures/bridges.json.gz'
    fixture=json.loads(gzip.decompress(path.read_bytes()).decode('utf-8'))
    if fixture.get('release')!=RELEASE or fixture.get('sourceHashNormalization')!='utf8-lf-v1':
        raise ValueError('Current preset fixture version/hash convention missing')
    if fixture['catalogSHA256']!=digest(content(ROOT/'dist/data/bridges-materials.json')):
        raise ValueError('Preset fixture catalog hash is stale; rebuild genuine Python fixtures')
    expected={p['id'] for m in catalog['modules'] for p in m['presets']}
    if set(fixture['requests'])!=expected or set(fixture['results'])!=expected:
        raise ValueError('Preset fixture IDs differ from current catalog')
    for m in catalog['modules']:
        defaults={f['key']:f['default'] for f in m['fields']}
        for p in m['presets']:
            if fixture['requests'][p['id']]!={'action':m['action'],'input':{**defaults,**p['input']}}:
                raise ValueError('Fixture preset input differs: '+p['id'])
    project_fixture=read_json(ROOT/'scripts/fixtures/bridges-projects.json')
    if project_fixture.get('sourceHashNormalization')!='utf8-lf-v1':
        raise ValueError('Project fixture hash convention missing')
    expected_projects={p['id']+'/'+s['id']:s['action'] for p in projects for s in p['stages']}
    if set(project_fixture['requests'])!=set(expected_projects) or set(project_fixture['results'])!=set(expected_projects):
        raise ValueError('Project fixture stage IDs differ')
    for key,action in expected_projects.items():
        if project_fixture['requests'][key]['action']!=action:
            raise ValueError('Project fixture action differs: '+key)
    for data in (fixture,project_fixture):
        for name,expected_hash in data['sourceHashes'].items():
            if digest(content(ROOT/'dist/python'/name))!=expected_hash:
                raise ValueError('Stale Python fixture source: '+name)


def validate_cache_versions():
    for pattern in ('*.js','*.css','*.html'):
        for path in (ROOT/'dist').glob(pattern):
            versions=re.findall(r'[?&]v=(202\d{5}-[A-Za-z0-9.-]+)',path.read_text(encoding='utf-8'))
            if any(value!=RELEASE for value in versions):
                raise ValueError('Stale public asset cache version: '+path.relative_to(ROOT).as_posix())


def release_manifest(catalog,dictionary,counts,projects,historical):
    names={'README.md','package.json','.github/workflows/pages.yml',
           'dist/data/bridges-materials.json','dist/data/formula-dictionary.json',
           'scripts/fixtures/bridges.json.gz','scripts/fixtures/bridges-projects.json',
           'dist/python/browser_api.py','dist/python/hubbard_lab.py',
           'dist/docs/bridges.md','dist/docs/symmetry-workshop.md','dist/docs/manybody-spectra.md',
           'dist/docs/polaron-lab.md','dist/docs/density-matrix.md','dist/docs/formula-dictionary.md'}
    names.update('dist/python/'+name+'.py' for name in CORE)
    names.update('dist/data/'+mid+'-content.json' for mid in MODULES)
    # Shared navigation, comparisons, formula context and cache identities all
    # belong to this release. Include the ordinary checked-in test/build tools,
    # not ephemeral helpers or generated source.zip.
    for pattern in ('*.js','*.css','*.html'):
        names.update(p.relative_to(ROOT).as_posix() for p in (ROOT/'dist').glob(pattern))
    for pattern in ('*.py','*.mjs'):
        names.update(p.relative_to(ROOT).as_posix() for p in (ROOT/'scripts').glob(pattern))
    prospective={p.relative_to(ROOT).as_posix():serialized(data) for p,data in historical.items()}
    names.update(prospective)
    sources=[dict(s) for s in catalog['sources']]+[{**s,'id':'dictionary-'+s['id']} for s in dictionary['sources']]
    return {'schema':'symmetry-lab-bridges-provenance-1','release':RELEASE,'date':DATE,'originalContent':True,
            'scope':'Three bounded quantum teaching modules plus a symmetry derivation workshop, controlled prediction exercises, cross-module projects, contextual formula links and a shared parameter-comparison workflow.',
            'counts':counts,'projects':projects,'models':[{'module':name,**scope} for name,scope in CORE.items()],
            'interactionScope':{
                'predictions':'Eight fixed-preset choices require a recorded prediction before calculation; the answer key is pedagogical, backed by actual calculated evidence, not an automated judge of free-text scientific reasoning.',
                'comparisons':'A/B records must use the same calculator; plots additionally require the same release, model/experiment/probe/responseKind/spin/pointGroup and matching plot title/axis labels. Raw records and changed parameters remain available without unsafe overlays.',
                'formulaLinks':'Displayed formulas retain original source; current values link to plot IDs. Dictionary entries use context and preserve unresolved ambiguity; Greek case and T relaxation subscripts differ from time-reversal squares.',
                'projects':'Four new three-stage projects preserve ten prior projects. Evidence inputs must match the declared stage; completion and saved prose do not assert automatic scientific grading.'},
            'sources':sources,'sourceNote':'Primary research and official documentation support method conventions and material context; numerical presets are synthetic teaching models, not imported measured datasets or complete ports of reference software.',
            'hashConvention':'SHA-256 of UTF-8 text normalized to LF; binary files hashed unchanged',
            'historicalMetadataPolicy':'Retain historical release/date/count/source/coverage fields; refresh existing file/module digests and register only the four original Python modules for this release.',
            'refreshCommand':'python scripts/refresh-bridges-provenance.py','verifyCommand':'python scripts/refresh-bridges-provenance.py --check',
            'files':[file_entry(name,prospective) for name in sorted(names)]}


def build_outputs():
    catalog,dictionary,counts,projects=validate_catalogs()
    validate_fixtures(catalog,projects)
    validate_cache_versions()
    historical=historical_outputs()
    manifest=release_manifest(catalog,dictionary,counts,projects,historical)
    return {**historical,ROOT/MANIFEST:manifest},counts


def main():
    parser=argparse.ArgumentParser(description=__doc__)
    parser.add_argument('--check',action='store_true',help='Compare only; never write files or timestamps')
    args=parser.parse_args()
    outputs,counts=build_outputs()
    changed=[]
    for path,data in outputs.items():
        expected=serialized(data)
        if not path.exists() or path.read_text(encoding='utf-8')!=expected:
            changed.append(path.relative_to(ROOT).as_posix())
            if not args.check:
                path.write_text(expected,encoding='utf-8',newline='\n')
    print('Bridges counts:',json.dumps(counts))
    if args.check and changed:
        raise SystemExit('Stale provenance; refresh after final edits:\n'+'\n'.join(changed))
    print(('Verified' if args.check else 'Refreshed')+f' {len(outputs)} provenance manifests; {len(changed)} changed.')


if __name__=='__main__':
    main()
