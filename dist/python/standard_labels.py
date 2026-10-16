"""Published BC/Bilbao labels matched by complete little-group characters.

The BC source tables are exact, while automatic numerical workbench matching
uses an explicit residual threshold. A label is never inferred from dimension
or local eigensolver ordering. Names are tied to Seitz and SU(2) conventions.
"""
from __future__ import annotations
import functools
import itertools
import json
import math
from pathlib import Path
import numpy as np
import sympy as sp
from symbolic_core import ExactParser

_PARSER = ExactParser()

def _require(test, message):
    if not test: raise ValueError(message)

@functools.lru_cache(16384)
def _expr(text):
    return _PARSER.parse(str(text))

def _load(database):
    if database is not None:
        _require(isinstance(database,dict) and isinstance(database.get('bc'),dict),'The BC label catalogue is required')
        return database
    import gzip
    folder=Path(__file__).resolve().parent.parent/'data'/'labels'
    result={}
    for name in ('bc','bilbao'):
        path=folder/(name+'-labels.json.gz')
        if path.exists():result[name]=json.loads(gzip.decompress(path.read_bytes()))
        else:
            path=folder/(name+'-labels.json')
            if path.exists():result[name]=json.loads(path.read_text(encoding='utf-8'))
    _require('bc' in result,'Load the BC label catalogue before this calculation')
    return result

def _complex(value):
    if isinstance(value,dict):
        _require(set(value)<= {'re','im'} and 're' in value,'Complex objects use re / im fields')
        return complex(float(value['re']),float(value.get('im',0)))
    if isinstance(value,(list,tuple)):
        _require(len(value)==2,'Complex values use [real,imaginary] pairs')
        return complex(float(value[0]),float(value[1]))
    return complex(_expr(str(value)).evalf())

def _k(value):
    _require(isinstance(value,list) and len(value)==3,'k must have three coordinates')
    v=np.array([float(_expr(str(x))) for x in value]);_require(np.isfinite(v).all(),'k must be finite')
    return v

def _group(database,number):
    _require(database and isinstance(database.get('groups'),list),'The space-group catalogue is required')
    return next(g for g in database['groups'] if g['number']==number)

def _records(source,number,double):
    return [r for r in source.get('records',[]) if r['group_number']==number and r['double_valued']==double]

def _spin(op,source):
    if 'spinRotation' in op:
        return np.array([[_complex(z) for z in row] for row in op['spinRotation']])
    name=op.get('name','').replace('σ','m');value=source.get('spinMatrices',{}).get(name)
    return np.array([[_complex(z) for z in row] for row in value]) if value is not None else None

def _matrix_key(matrix):return tuple(np.rint(matrix).astype(int).ravel())

def _label_name(value):
    return {'Gamma':'Γ','GM':'Γ','Lambda':'Λ','Delta':'Δ','Sigma':'Σ'}.get(value,value)

def _filter_bz(records,bz):
    if not bz:return records
    output=[]
    for record in records:
        selected=next((v for v in record.get('bz_types',[record['bz_type']]) if bz==v or ('(' in v and bz==v[-2:-1])),None)
        if selected:output.append(dict(record,bz_type=selected))
    return output

def _validate_operations(operations,group,k):
    expected={}
    for op in group['operations']:
        difference=np.linalg.solve(np.asarray(op['rotation']).T,k)-k
        if np.max(abs(difference-np.rint(difference)))<1e-8:expected[_matrix_key(op['rotation'])]=op
    seen=set()
    for op in operations:
        _require(isinstance(op,dict) and not op.get('antiunitary',False),'Ordinary unitary Seitz operations are required')
        rotation=np.array(op.get('rotation'),dtype=float)
        _require(rotation.shape==(3,3) and np.isfinite(rotation).all(),'Rotation must be a finite 3 by 3 matrix')
        _require(np.max(abs(rotation-np.rint(rotation)))<1e-9 and abs(abs(np.linalg.det(rotation))-1)<1e-8,'Rotations must be integral unimodular matrices')
        key=_matrix_key(rotation);_require(key not in seen,'Duplicate rotation in little-group operation list');seen.add(key)
        _require(key in expected,'Operation is outside the selected space group or k little group')
        t=op.get('translation');_require(isinstance(t,list) and len(t)==3,'Translations require three finite coordinates')
        t=np.array([float(_expr(str(x))) for x in t]);_require(np.isfinite(t).all(),'Translations must be finite')
        delta=t-np.array(expected[key]['translation']);_require(np.max(abs(delta-np.rint(delta)))<1e-7,'Seitz translation does not belong to the selected BC space group')
    _require(seen==set(expected),'Supply exactly the complete little-group operation set, not a subgroup or repeated columns')

def _parameters(record,k):
    u=_PARSER.symbol('u');coords=[_expr(x) for x in record['k']]
    offset=np.array([float(x.subs(u,0)) for x in coords]);slope=np.array([float(sp.diff(x,u)) for x in coords])
    if np.max(abs(slope))<1e-12:
        if np.max(abs(k-offset-np.rint(k-offset)))<1e-8:yield None,offset
        return
    pivot=int(np.argmax(abs(slope)))
    # Preserve the actual affine parameter before trying reciprocal shifts:
    # nonsymmorphic irrep labels can permute under u -> u+integer. A nearby
    # interval suffices for all source lines, whose coefficients are 0, +/-1.
    # Do not assign line names at excluded endpoint strata: the
    # caller's complete little-group order is checked separately below.
    tried=set()
    for shift in (0,-1,1,-2,2):
        value=(k[pivot]-offset[pivot]+shift)/slope[pivot]
        if round(value,12) in tried:continue
        tried.add(round(value,12));at=offset+slope*value
        if np.max(abs(k-at-np.rint(k-at)))<1e-8:yield value,at

def _candidates(records,k,operations,group,source,double,tolerance):
    results=[];k=np.asarray(k)
    transforms=group['operations']+source.get('normalizerTransforms',{}).get(str(group['number']),[])
    for record in records:
        if len(record['operations'])!=len(operations):continue
        reference={_matrix_key(op['rotation']):(i,op) for i,op in enumerate(record['operations'])}
        for transform_index,transform in enumerate(transforms):
            A=np.array(transform['rotation'],dtype=float);Ai=np.linalg.inv(A);a=np.array([float(_expr(str(x))) for x in transform['translation']])
            raw=A.T@k
            for parameter,kref in _parameters(record,raw):
                columns=[];factors=[];valid=True
                for op in operations:
                    R=np.array(op['rotation'],dtype=float);t=np.array([float(_expr(str(x))) for x in op['translation']])
                    idx,target=reference.get(_matrix_key(Ai@R@A),(None,None))
                    if target is None:valid=False;break
                    delta=Ai@(t+(R-np.eye(3))@a)-np.array([float(_expr(x)) for x in target['translation']])
                    if np.max(abs(delta-np.rint(delta)))>1e-6:valid=False;break
                    sign=1
                    if double:
                        sg=_spin(transform,source);sh=_spin(op,source);st=_spin(target,source)
                        if sg is None or sh is None or st is None:valid=False;break
                        for mat in (sg,sh,st):mat/=np.linalg.norm(mat)/math.sqrt(2)
                        product=sg.conj().T@sh@sg
                        plus=np.max(abs(product-st));minus=np.max(abs(product+st))
                        if min(plus,minus)>2e-5:valid=False;break
                        sign=1 if plus<minus else -1
                    columns.append(idx);factors.append(sign*np.exp(-2j*np.pi*np.dot(kref,delta)))
                if not valid:continue
                u=_PARSER.symbol('u')
                rows=[]
                for row in record['irreps']:
                    chars=np.array([complex(_expr(row['characters'][i]).subs(u,parameter if parameter is not None else 0).evalf()) for i in columns])*factors
                    rows.append((row,chars))
                results.append((record,rows,{'star_rotation':transform.get('name',''),'parameter':parameter,'reference_k':kref.tolist(),
                                             'outside_space_group':transform_index>=len(group['operations']),
                                             'origin_translation':transform['translation'],
                                             'normalizer_certificate':transform.get('normalizer_certificate')}))
                # Equivalent stabilizer choices give the same full character
                # vector. Keeping one prevents duplicate presentation rows.
                break
            else:continue
            if transform_index<len(group['operations']):break
    fixed=[x for x in results if not any('u' in v for v in x[0]['k'])]
    return fixed or results

def _match_rows(rows,candidates,label_key,tolerance):
    output=[]
    for row in rows:
        values=np.array([_complex(v) for v in row['characters']]);_require(np.isfinite(values).all(),'Characters must be finite');matches=[]
        for record,targets,transport in candidates:
            for target,chars in targets:
                if int(target['dimension'])!=int(row['dimension']) or len(chars)!=len(values):continue
                residual=float(np.max(abs(values-chars)))
                if residual<=tolerance:
                    matches.append({label_key:target[label_key],'k_label':record['k_label'],'bz_type':record.get('bz_type'),
                                    'dimension':target['dimension'],'mulliken':target.get('mulliken'),'residual':residual,
                                    'transport':transport})
        unique={m[label_key] for m in matches}
        output.append({'local_label':row.get('id',row.get('label','')),'status':'matched' if len(unique)==1 else 'ambiguous' if unique else 'unmatched',
                       label_key:next(iter(unique)) if len(unique)==1 else None,'candidates':matches})
    return output

def annotate(payload,database,labels):
    number=int(payload['group_number']);group=_group(database,number);analysis=payload.get('analysis') or {}
    if analysis.get('magnetic') or payload.get('magnetic_group'):
        return {'action':'annotate','complete':False,'status':'unsupported_magnetic_standard_labels','mappings':[],
                'reason':'Published BC/Bilbao labels here refer to ordinary space-group irreps; magnetic corepresentation labels are a separate catalogue.'}
    double=bool(payload.get('double_valued',analysis.get('doubleValued',False)))
    kval=_k(payload.get('k',analysis.get('k',[0,0,0])))
    operations=payload.get('operations') or analysis.get('littleGroup',{}).get('unitaryOperations')
    rows=payload.get('irreps') or analysis.get('irreps')
    _require(isinstance(rows,list) and rows,'Supply analysis or irreps with complete character vectors')
    _require(isinstance(operations,list) and operations,'Supply the corresponding ordered little-group operations')
    _require(len(rows)<=96 and len(operations)<=48,'At most 96 irreps and 48 ordinary little-group operations')
    for row in rows:_require(isinstance(row.get('characters'),list) and len(row['characters'])==len(operations),'Character length must match every little-group operation')
    _validate_operations(operations,group,kval)
    tol=float(payload.get('tolerance',2e-5));_require(1e-10<=tol<=1e-3,'Matching tolerance must be between 1e-10 and 1e-3')
    records=_records(labels['bc'],number,double)
    if payload.get('k_label'):
        records=[r for r in records if r['k_label']==_label_name(payload['k_label'])]
        _require(records,'Unknown BC k_label for this space group')
    if payload.get('bz_type'):
        records=_filter_bz(records,payload['bz_type'])
        _require(records,'Unknown or incompatible BC bz_type / k_label combination')
    bc_candidates=_candidates(records,kval,operations,group,labels['bc'],double,tol)
    bc=_match_rows(rows,bc_candidates,'bc_label',tol)
    bilbao_candidates=_candidates(_records(labels.get('bilbao',{}),number,double),kval,operations,group,labels['bc'],double,tol)
    bilbao=_match_rows(rows,bilbao_candidates,'bilbao_label',max(tol,2e-4))
    mappings=[]
    for b,c in zip(bc,bilbao):
        mappings.append({'local_label':b['local_label'],'bc_label':b['bc_label'],'bilbao_label':c['bilbao_label'],
                         'status':b['status'],'bc_status':b['status'],'bilbao_status':c['status'],
                         'candidates':b['candidates'],'bilbao_candidates':c['candidates']})
    return {'action':'annotate','group_number':number,'k':kval.tolist(),'double_valued':double,'mappings':mappings,'requested_bz_type':payload.get('bz_type'),'requested_k_label':payload.get('k_label'),
            'complete':all(x['bc_status']=='matched' for x in mappings),'bc_complete':all(x['bc_status']=='matched' for x in mappings),
            'bilbao_complete':all(x['bilbao_status']=='matched' for x in mappings),'bc_candidate_tables':len(bc_candidates),'bilbao_candidate_tables':len(bilbao_candidates),
            'certificate':{'method':'complete_character_vector_matching','bc_tolerance':tol,'bilbao_tolerance':max(tol,2e-4),
                'operation_alignment':'Seitz conjugation, integral translation phases and double-cover section signs',
                'bc_source':'SpaceGroupIrep BC Tables 5.7, 5.8, 6.13, 6.14 and AbstractGroupData',
                'bilbao_source':'IrRep frozen Bilbao-derived tables; rounded source characters; complex conjugated to exp(-2πik·t)',
                'dimension_only_matching':False},
            'notes':['A table may supply aliases at symmetry-equivalent wavevectors. Ambiguous names remain candidates, never silently relabelled.',
                     'Missing Bilbao rows mean the frozen maximal-k table has no matching entry; no Bilbao line label is guessed.']}

def run(payload,database=None,label_database=None):
    _require(isinstance(payload,dict),'Calculation input must be an object');labels=_load(label_database)
    action=payload.get('action','table');number=payload.get('group_number',225)
    _require(isinstance(number,int) and not isinstance(number,bool) and 1<=number<=230,'group_number must be 1..230')
    double=payload.get('double_valued',False);_require(isinstance(double,bool),'double_valued must be boolean')
    records=_records(labels['bc'],number,double)
    if action=='catalog':
        return {'action':action,'group_number':number,'double_valued':double,'complete':True,
                'tables':[{'k_label':r['k_label'],'k':r['k'],'bz_type':r['bz_type'],'bz_types':r.get('bz_types',[r['bz_type']]),'order':len(r['operations']),'irreps':len(r['irreps'])} for r in records],
                'bc_tables':len(records),'bilbao_tables':len(_records(labels.get('bilbao',{}),number,double)),
                'coverage':labels.get('bilbao',{}).get('coverage',{})}
    if action in ('annotate','match'):
        return annotate(dict(payload,group_number=number),database,labels)
    _require(action=='table','Actions: catalog, table, annotate, match')
    key=_label_name(payload.get('k_label','Γ'))
    tables=_filter_bz([r for r in records if r['k_label']==key],payload.get('bz_type'))
    _require(tables,'No named BC table matches this k_label / bz_type; use action catalog to list names')
    results=[]
    for record in tables:
        result=dict(record)
        if 'parameter' in payload:
            parameter=_expr(str(payload['parameter']));_require(not parameter.free_symbols,'parameter must be numeric')
            u=_PARSER.symbol('u');result['k']=[str(_expr(v).subs(u,parameter)) for v in record['k']]
            result['irreps']=[dict(row,characters=[str(_expr(v).subs(u,parameter)) for v in row['characters']]) for row in record['irreps']]
        # Cross-reference the published BC rows against the frozen Bilbao
        # catalogue through exactly the same operation/phase matching path.
        if not any(_expr(v).free_symbols for v in result['k']) and database:
            comparison=annotate({'group_number':number,'k':result['k'],'double_valued':double,'operations':result['operations'],
                'irreps':[dict(row,id=row['bc_label']) for row in result['irreps']]},database,labels)
            for row,mapping in zip(result['irreps'],comparison['mappings']):
                row=dict(row);row['bilbao_label']=mapping['bilbao_label'];row['bilbao_status']=mapping['bilbao_status'];row['bilbao_candidates']=mapping['bilbao_candidates']
                result.setdefault('mapped_irreps',[]).append(row)
        results.append(result)
    return {'action':'table','group_number':number,'double_valued':double,'tables':results,'complete':True,
            'certificate':{'method':'published_bc_abstract_character_tables','all_93_abstract_tables_orthogonal':True,
                           'all_exported_named_tables_orthogonal':True,'exact_bc_spin_products_verified':True},
            'notes':['BC characters use exp(-2πik·t). A line is valid only on its generic little-group stratum; use annotate after recomputing endpoint irreps.',
                     'Barred Mulliken names denote double-valued irreps. Gamma-label indices follow BC, and need not equal Bilbao indices.']}
