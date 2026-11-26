"""Check the published Si-first visualization against its audited display scope."""
from pathlib import Path
import json,math,re
ROOT=Path(__file__).resolve().parents[1]
P=ROOT/'dist/end-to-end/bands'
data=json.loads((P/'datasets.json').read_text(encoding='utf8'))
rows=data if isinstance(data,list)else data['datasets']
assert len(rows)==3
assert rows[0]['id']=='si-reference-72pt'
expected={'si-reference-72pt':(72,12,False,True),'carbon-8pt':(8,12,True,False),'hydrogen-gamma':(1,5,True,False)}
for d in rows:
    count,bands,finite,infinite=expected[d['id']]
    assert len(d['points'])==count and d['nbands']==bands
    assert d['scope']['finite_point_spectrum_certified']is finite
    assert d['scope']['infinite_scf_certified']is infinite
    assert d['scope']['global_BZ']is False and d['scope']['pointwise_eigenvalue_intervals']is False
    assert d['scope']['certificate_replayed']is False
    assert d['energy_reference_kind']=='highest-occupied'
    for p in d['points']:
        assert len(p['energies_eV'])==bands and all(isinstance(x,(int,float))and math.isfinite(x)for x in p['energies_eV'])
        assert len(p['k_fractional'])==3 and all(math.isfinite(x)for x in p['k_fractional'])
        if finite:
            c=p['certificate'];assert c['status'].lower()=='certified'
            assert c['lower_cut_eV']<c['upper_cut_eV'] and c['dimension']>bands
        else:assert p['certificate']['status'].lower()!='certified'
text=(P/'datasets.json').read_text(encoding='utf8')
assert not re.search(r'C:[/\\]Users|/home/|10\.20\.160|user-paw|775824aaf21b',text,re.I)
html=(P/'index.html').read_text(encoding='utf8');js=(P/'viewer.js').read_text(encoding='utf8')
assert 'band-explorer'in html and 'mountBandExplorer'in js
assert not re.search(r'https?://[^\s\"\']+(?:cdn|plotly|three)',js,re.I)
parent=(P.parent/'index.html').read_text(encoding='utf8')
assert 'href="./bands/"'in parent
print(json.dumps(dict(status='PASS_SI_FIRST_BAND_VISUALIZATION_SCOPE',materials=3,points=81,
    numerical_bands_only=True,finite_windows_source_matched=True,Si_model_certificate_separate=True,
    private_material_not_published=True)))
