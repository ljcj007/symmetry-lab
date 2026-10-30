"""Refresh the symmetry construction release with dependency-ordered provenance.

Call only after source, catalogs and genuine Python fixtures are final.
Historical declarations/counts remain unchanged; registered file hashes and
four new Python cores are updated. Nested manifest digests use prospective
UTF-8/LF content. Cycles fail with the dependency path before any write.
--check computes all expected bytes in memory and never writes any file.
No previous refresh main(), build command, package or Git operation is run.
"""
from pathlib import Path
import argparse
import copy
import gzip
import hashlib
import json
import math
import re
from urllib.parse import urlparse

ROOT=Path(__file__).resolve().parents[1]
RELEASE='20261030-construction1'
MANIFEST='dist/data/construction-provenance.json'
TEXT_EXTENSIONS={'.py','.js','.mjs','.cjs','.json','.html','.css','.md','.txt','.svg','.yaml','.yml','.toml','.csv'}
MODULES={'salc':('salc_lab','salc-lab','foundations'),
         'wavevector':('wavevector_lab','wavevector-lab','structure-dynamics'),
         'nonsymmorphic':('nonsymmorphic_lab','nonsymmorphic-lab','crystal')}
CORE={
  "salc_lab": {
    "coverage": [
      "Exact four-site C4v permutation representations with one or two equivalent copies; character and matrix-element projectors, replayed SALC construction and full matrix elements",
      "Finite-group selection multiplicities distinguished from actual polarized intensities; repeated-irrep Schur blocks, true finite subgroup graph and enumerated constraint-removal challenges"
    ],
    "limitations": [
      "Only the declared four/eight-dimensional orthogonal scalar-orbital model, not arbitrary materials, orbital geometries or a complete SALC catalogue",
      "Allowed transitions can have zero matrix elements; a repeated isotypic component does not automatically have one common energy"
    ]
  },
  "wavevector_lab": {
    "coverage": [
      "Commensurate N=2/3/4 square scalar modes, exact C4v stars and conjugate real pairing, finite supercell semidirect-product permutations",
      "Actual pattern stabilizers, finite subgroup inclusion, parent/translation orbits, compatible rectangular periods, minimal translation indices and normalized DFT intensities"
    ],
    "limitations": [
      "Known square parent lattice and one scalar per site; no arbitrary three-dimensional space-group classification, incommensurate superspace or real-material stability prediction",
      "Scalar Fourier weights omit atomic form factors, displacement/polarization and experimental geometry; a compatible rectangular cell need not be a primitive oblique cell"
    ]
  },
  "nonsymmorphic_lab": {
    "coverage": [
      "Periodic two/four-band Bloch teaching matrices for embedded three-dimensional glide or twofold screw operations, with momentum little-group and TRIM checks",
      "Single/double-valued square relations, degenerate-block operation diagonalization, endpoint partner pairing, analytic crossing and anticommuting-mass gap checks; actual perturbation challenges"
    ],
    "limitations": [
      "One-dimensional momentum-line toy model, not fitted material bands, a full three-dimensional nonsymmorphic classification or global topological index",
      "Middle direct gaps do not prove indirect or three-dimensional insulating gaps; label subgroup diagrams quotient translations and the double-group center"
    ]
  },
  "symmetry_grading": {
    "coverage": [
      "Numeric matrix and subspace assignment grading with complex JSON inputs, rank/projector comparisons and explicit invariance checks",
      "Equivalent non-singular changes of subspace basis and overall complex phases do not change the grading target"
    ],
    "limitations": [
      "Grades only the declared finite matrix/subspace task with numerical tolerances; does not automatically grade unrestricted written derivations",
      "Stored task and reference data are public teaching data, not an assessment-security or plagiarism-detection system"
    ]
  }
}
EXPECTED_COUNTS={'modules':3,'lessons':9,'exercises':9,'exerciseSteps':36,'cases':9,'presets':21,'predictions':6,
                 'projects':3,'projectStages':9,'retainedProjects':17,'projectCenterTotal':20,'dictionaryEntries':106,'dictionarySources':39}


def read_json(path):return json.loads(path.read_text(encoding='utf-8'))
def serialized(data):return json.dumps(data,ensure_ascii=False,indent=2)+'\n'
def digest(raw):return hashlib.sha256(raw).hexdigest()
def content(path):return path.read_text(encoding='utf-8').encode('utf-8') if path.suffix.lower() in TEXT_EXTENSIONS else path.read_bytes()


def safe_name(name):
    name=str(name).replace('\\','/')
    path=(ROOT/name).resolve()
    if not name or name.startswith('.openai/') or ROOT.resolve() not in path.parents:
        raise ValueError('Manifest dependency must be a reproducible repository file: '+name)
    return name


class ManifestGraph:
    """Resolve nested manifests against final in-memory bytes with cycle detection."""
    def __init__(self,manifests,leaf_content=None):
        self.manifests=copy.deepcopy(manifests)
        self.leaf_content=leaf_content or (lambda name:content(ROOT/name))
        self.resolved={}
        self.active=[]

    def file_entry(self,name):
        name=safe_name(name)
        raw=serialized(self.resolve(name)).encode('utf-8') if name in self.manifests else self.leaf_content(name)
        return {'path':name,'sha256':digest(raw),'bytes':len(raw)}

    def refresh_rows(self,rows):
        items=rows.items() if isinstance(rows,dict) else ((r.get('path'),r) for r in rows if isinstance(r,dict)) if isinstance(rows,list) else ()
        for name,row in items:
            if not isinstance(row,dict) or not name or 'sha256' not in row:continue
            updated=self.file_entry(name)
            row['sha256']=updated['sha256']
            if 'bytes' in row:row['bytes']=updated['bytes']

    def resolve(self,name):
        if name in self.resolved:return self.resolved[name]
        if name in self.active:raise ValueError('Provenance dependency cycle: '+' -> '.join(self.active+[name]))
        self.active.append(name)
        try:
            data=self.manifests[name]
            self.refresh_rows(data.get('files'));self.refresh_rows(data.get('modules'))
            self.resolved[name]=data
            return data
        finally:self.active.pop()

    def all_outputs(self):
        for name in sorted(self.manifests):self.resolve(name)
        return {name:self.resolved[name] for name in sorted(self.manifests)}


def historical_manifests():
    result={}
    for path in sorted((ROOT/'dist/data').glob('*provenance.json')):
        name=path.relative_to(ROOT).as_posix()
        if name==MANIFEST:continue
        result[name]=read_json(path)
    data=result['dist/data/python-provenance.json']
    rows=data['modules'];known={row['path'] for row in rows}
    if len(known)!=len(rows):raise ValueError('Duplicate historical Python module path')
    for module,scope in CORE.items():
        name='dist/python/'+module+'.py'
        if name not in known:
            rows.append({'path':name,'sha256':'pending','bytes':0,'upstream':[],
                         'license':'GPL-3.0-only','implementation':'Original NumPy teaching implementation',**scope})
    return result


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
    catalog=read_json(ROOT/'dist/data/construction-materials.json')
    dictionary=read_json(ROOT/'dist/data/formula-dictionary.json')
    if catalog.get('release')!=RELEASE or dictionary.get('constructionRelease')!=RELEASE or dictionary.get('principlesRelease')!='20261030-symmetry1' or dictionary.get('extensionRelease')!='20261030-bridges1' or dictionary.get('release')!='20261029-pathways1':
        raise ValueError('Current catalog/dictionary extension version is missing or changed')
    if digest(json.dumps(dictionary['entries'][:94],ensure_ascii=False,separators=(',',':')).encode('utf8'))!='527fd153de9a7a1605722a123144252d3407371de02115076749aa27f92d39be':
        raise ValueError('Original 94 dictionary entries changed')
    if digest(json.dumps(dictionary['sources'][:34],ensure_ascii=False,separators=(',',':')).encode('utf8'))!='8bd6b30c9d5d98eb6bad58d087b4cdfde8fcd39b9c1e81c84faf7049699bab28':
        raise ValueError('Original 34 dictionary source records changed')
    for key in ('modules','lessons','exercises','cases','sources'):
        unique(catalog[key],key)
    module_map={m['id']:m for m in catalog['modules']}
    if set(module_map)!=set(MODULES):
        raise ValueError('Expected exactly the three reviewed construction modules')
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
    projects=project_headers('dist/construction-projects.js',True)
    prior=sum((project_headers('dist/'+name+'-projects.js') for name in ('response','spectroscopy','pathways','bridges','principles')),[])
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
    path=ROOT/'scripts/fixtures/construction.json.gz'
    fixture=json.loads(gzip.decompress(path.read_bytes()).decode('utf-8'))
    if fixture.get('release')!=RELEASE or fixture.get('sourceHashNormalization')!='utf8-lf-v1':
        raise ValueError('Current preset fixture version/hash convention missing')
    if fixture['catalogSHA256']!=digest(content(ROOT/'dist/data/construction-materials.json')):
        raise ValueError('Preset fixture catalog hash is stale; rebuild genuine Python fixtures')
    expected={p['id'] for m in catalog['modules'] for p in m['presets']}
    if set(fixture['requests'])!=expected or set(fixture['results'])!=expected:
        raise ValueError('Preset fixture IDs differ from current catalog')
    for m in catalog['modules']:
        defaults={f['key']:f['default'] for f in m['fields']}
        for p in m['presets']:
            if fixture['requests'][p['id']]!={'action':m['action'],'input':{**defaults,**p['input']}}:
                raise ValueError('Fixture preset input differs: '+p['id'])
    expected_grading={preset+'/'+task['id']+'/'+kind+'/'+example
                      for preset,result in fixture['results'].items()
                      for task in result['grading']['tasks']
                      for kind in ('subspace','projector')
                      for example in ('reference','equivalent','wrong')}
    if set(fixture.get('grading',{}))!=expected_grading:
        raise ValueError('Grading fixtures must cover every task, representation and example')
    for key,exchange in fixture['grading'].items():
        if exchange['grade']['response']['passed']!=(not key.endswith('/wrong')):
            raise ValueError('Unexpected real Python grading result: '+key)
    project_fixture=json.loads(gzip.decompress((ROOT/'scripts/fixtures/construction-projects.json.gz').read_bytes()).decode('utf8'))
    if project_fixture.get('sourceHashNormalization')!='utf8-lf-v1':
        raise ValueError('Project fixture hash convention missing')
    expected_projects={p['id']+'/'+s['id']:s['action'] for p in projects for s in p['stages']}
    if set(project_fixture['requests'])!=set(expected_projects) or set(project_fixture['results'])!=set(expected_projects):
        raise ValueError('Project fixture stage IDs differ')
    for key,action in expected_projects.items():
        if project_fixture['requests'][key]['action']!=action:
            raise ValueError('Project fixture action differs: '+key)
    required={name+'.py' for name in CORE}
    if not required<=set(fixture['sourceHashes']):
        raise ValueError('Preset fixture omits a required Python source hash')
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
           'dist/data/construction-materials.json','dist/data/formula-dictionary.json',
           'scripts/fixtures/construction.json.gz','scripts/fixtures/construction-projects.json.gz',
           'dist/python/browser_api.py','dist/python/symmetry_grading.py',
           'dist/docs/construction.md','dist/docs/salc.md','dist/docs/wavevector.md',
           'dist/docs/nonsymmorphic.md','dist/docs/formula-dictionary.md'}
    names.update('dist/python/'+name+'.py' for name in CORE)
    names.update('dist/data/'+name+'-content.json' for name in MODULES)
    for pattern in ('*.js','*.css','*.html'):
        names.update(p.relative_to(ROOT).as_posix() for p in (ROOT/'dist').glob(pattern))
    for pattern in ('*.py','*.mjs'):
        names.update(p.relative_to(ROOT).as_posix() for p in (ROOT/'scripts').glob(pattern))
    names.update(historical)
    sources=[dict(s) for s in catalog['sources']]+[{**s,'id':'dictionary-'+s['id']} for s in dictionary['sources']]
    return {'schema':'symmetry-lab-construction-provenance-1','release':RELEASE,'date':'2026-10-30','originalContent':True,
            'scope':'Three bounded symmetry-construction teaching modules, explicit representation replay and subgroup inclusion, finite symmetry-breaking challenges and numerical matrix/subspace grading.',
            'counts':counts,'projects':projects,'models':[{'module':name,**scope} for name,scope in CORE.items()],
            'interactionScope':{
                'replay':'Actual group matrices, weighted projection steps, Fourier pairing and supercell permutations, or Bloch phase relations are replayed with computed intermediate vectors and matrices.',
                'subgroups':'Exact finite point/subcell subgroup inclusions are shown for SALC and finite q. Nonsymmorphic constraint diagrams explicitly quotient lattice translations and the double-group center; they are not a full space-group subgroup database.',
                'breaking':'SALC enumerates removal of stated generator constraints while preserving closure; nonsymmorphic challenges add declared physical matrix perturbations and verify whole-line direct-gap bounds.',
                'grading':'One shared Python grader accepts matrices, basis columns or target projectors; equivalent phase and arbitrary full-rank internal basis changes are accepted, while wrong rank or span is rejected. Free-text project reasoning remains ungraded.',
                'predictions':'Six fixed-preset choices require a recorded prediction before calculation; results follow from computed bounded models.',
                'comparisons':'Same-calculator A/B records retain inputs and raw results; compatible models and axes are required for curve overlays.',
                'formulaLinks':'Twelve contextual entries preserve the original 94 entries and 34 source records. Historical release markers remain unchanged; constructionRelease identifies this addition.',
                'projects':'Three new three-stage projects preserve seventeen prior projects. Cross-model maps are explicit teaching assumptions, not inferred material Hamiltonians.'},
            'sources':sources,
            'sourceNote':'Primary research and official documentation establish conventions and material context; numerical presets are synthetic teaching models, not measured material data or full reference-software ports.',
            'hashConvention':'SHA-256 of UTF-8 text normalized to LF; binary files hashed unchanged',
            'historicalMetadataPolicy':'Retain prior release, date, count, coverage and source declarations; refresh existing file/module digests and append only the four new Python modules. Resolve nested manifests in dependency order and reject cycles.',
            'refreshCommand':'python scripts/refresh-construction-provenance.py',
            'verifyCommand':'python scripts/refresh-construction-provenance.py --check',
            'files':[{'path':name,'sha256':'pending','bytes':0} for name in sorted(names)]}


def build_outputs():
    catalog,dictionary,counts,projects=validate_catalogs()
    validate_fixtures(catalog,projects)
    validate_cache_versions()
    historical=historical_manifests()
    historical[MANIFEST]=release_manifest(catalog,dictionary,counts,projects,historical)
    return ManifestGraph(historical).all_outputs(),counts


def main():
    parser=argparse.ArgumentParser(description=__doc__)
    parser.add_argument('--check',action='store_true',help='Compare expected bytes only; never write files or timestamps')
    args=parser.parse_args()
    outputs,counts=build_outputs()
    changed=[]
    for name,data in outputs.items():
        path=ROOT/name;expected=serialized(data)
        if not path.exists() or path.read_text(encoding='utf-8')!=expected:
            changed.append(name)
            if not args.check:path.write_text(expected,encoding='utf-8',newline='\n')
    print('Construction counts:',json.dumps(counts))
    if args.check and changed:raise SystemExit('Stale provenance; refresh after final edits:\n'+'\n'.join(changed))
    print(('Verified' if args.check else 'Refreshed')+f' {len(outputs)} provenance manifests; {len(changed)} changed.')


if __name__=='__main__':main()
