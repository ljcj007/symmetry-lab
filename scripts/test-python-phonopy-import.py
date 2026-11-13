"""Independent checks of Phonopy file semantics and displacement conventions."""
from copy import deepcopy
import cmath
import hashlib
import json
import math
from pathlib import Path
import sys
import unittest

ROOT = Path(__file__).resolve().parents[1]
sys.path.insert(0, str(ROOT / 'dist' / 'python'))
from phonopy_import import run, MAX_BYTES, MAX_NODES


def fixture(natom=1):
    """Small explicit Cartesian basis, not the demo generator's formula."""
    bands = []
    for index in range(3 * natom):
        eigen = [[[float(3 * atom + axis == index), 0] for axis in range(3)] for atom in range(natom)]
        bands.append({'frequency': index + 1.0, 'eigenvector': eigen})
    return {'natom': natom, 'nqpoint': 1, 'lattice': [[2,0,0],[0,3,0],[0,0,4]],
            'points': [{'symbol': f'A{i}', 'coordinates': [0,0,0], 'mass': 1.0} for i in range(natom)],
            'phonon': [{'q-position': [0,0,0], 'band': bands}]}


class PhonopyImportTests(unittest.TestCase):
    def test_demo_import_and_segments(self):
        text = (ROOT / 'dist/data/examples/phonopy-demo.yaml').read_text(encoding='utf8')
        result = run({'content': text, 'filename': 'phonopy-demo.yaml', 'selected_q': 8, 'supercell': [2,1,1]})
        self.assertEqual(result['kind'], 'phonon-data')
        self.assertTrue(result['synthetic'])
        self.assertEqual(result['frequencyUnit'], 'THz')
        self.assertEqual(result['summary']['qpointCount'], 18)
        self.assertEqual(result['summary']['bandCount'], 6)
        self.assertEqual([s['indices'] for s in result['segments']], [list(range(9)), list(range(9,18))])
        self.assertEqual(result['qpoints'][9]['label'], 'M')
        self.assertEqual(result['summary']['imaginaryCount'], 8)
        self.assertTrue(result['animation']['available'])
        self.assertTrue(result['animation']['commensurate'])
        self.assertEqual(len(result['animation']['atoms']), 4)
        json.dumps(result, allow_nan=False)

    def test_demo_eigenvectors_form_unitary_basis(self):
        import yaml
        data = yaml.safe_load((ROOT / 'dist/data/examples/phonopy-demo.yaml').read_text(encoding='utf8'))
        for point in data['phonon']:
            vectors = [[complex(*v) for atom in band['eigenvector'] for v in atom] for band in point['band']]
            for i, u in enumerate(vectors):
                for j, v in enumerate(vectors):
                    overlap = sum(a.conjugate() * b for a, b in zip(u,v))
                    self.assertAlmostEqual(abs(overlap - (1 if i == j else 0)), 0, places=12)

    def test_json_and_yaml_same_semantics(self):
        import yaml
        data = fixture()
        json_text, yaml_text = json.dumps(data), yaml.safe_dump(data)
        a = run({'content': json_text})
        b = run({'content': yaml_text})
        for result, text in ((a,json_text),(b,yaml_text)):
            self.assertEqual(result['sourceIdentity']['sha256'], hashlib.sha256(text.encode()).hexdigest())
            self.assertEqual(result['sourceIdentity']['byteCount'], len(text.encode()))
            self.assertEqual(result['sourceIdentity']['representation'], 'utf8-source-text')
            result.pop('sourceIdentity')
        self.assertEqual(a, b)

    def test_length_metadata_aliases_precedence_and_conflict(self):
        data = fixture(); data['length_unit']='au'
        result=run({'data':data})
        self.assertEqual(result['structure']['lengthUnit'],'au')
        self.assertEqual(result['structure']['lengthUnitSource'],'length_unit')
        self.assertEqual(result['structure']['reciprocalLengthUnit'],'1 / au')
        self.assertEqual(result['animation']['lengthUnit'],'au')
        self.assertEqual(result['structure']['lattice'],data['lattice'])
        data['physical_unit']={'length':'bohr'}
        result=run({'data':data})
        self.assertEqual(result['structure']['lengthUnit'],'bohr')
        self.assertEqual(result['structure']['lengthUnitSource'],'physical_unit.length')
        self.assertEqual(result['structure']['lengthUnitDeclarations'],[
            {'field':'physical_unit.length','value':'bohr'},{'field':'length_unit','value':'au'}])
        data['physical_unit']['length']='angstrom'
        with self.assertRaisesRegex(ValueError,'声明冲突'):
            run({'data':data})
        for invalid in (None,12,True,''):
            data['length_unit']=invalid; data.pop('physical_unit',None)
            with self.subTest(invalid=invalid),self.assertRaises(ValueError):
                run({'data':data})

    def test_companion_length_units_never_erase_or_silently_conflict(self):
        data=fixture(); data['length_unit']='au'
        companion={'primitive_cell':{'lattice':deepcopy(data['lattice']),'points':deepcopy(data['points'])}}
        result=run({'data':data,'structure_data':companion})
        self.assertEqual(result['structure']['lengthUnit'],'au')
        self.assertEqual(result['structure']['lengthUnitSource'],'length_unit')
        companion['physical_unit']={'length':'angstrom'}
        with self.assertRaisesRegex(ValueError,'长度单位声明不一致'):
            run({'data':data,'structure_data':companion})
        data.pop('length_unit')
        result=run({'data':data,'structure_data':companion})
        self.assertEqual(result['structure']['lengthUnit'],'angstrom')
        self.assertEqual(result['structure']['lengthUnitSource'],'companion.physical_unit.length')
        self.assertEqual(result['animation']['atoms'][0]['equilibrium'],[0,0,0])

    def test_frequency_unit_source_conflict_and_explicit_label_not_conversion(self):
        data=fixture(); data['frequency_unit']='THz'
        inferred=run({'data':data,'frequency_unit':'unknown'})
        self.assertEqual(inferred['frequencyUnitSource'],'frequency_unit')
        explicit=run({'data':data,'frequency_unit':'meV'})
        self.assertEqual(explicit['frequencyUnit'],'meV')
        self.assertEqual(explicit['frequencyUnitSource'],'user.frequency_unit')
        self.assertEqual(explicit['frequencyUnitDeclarations'],[{'field':'frequency_unit','value':'THz'}])
        self.assertEqual(explicit['qpoints'],inferred['qpoints'])
        self.assertTrue(any('文件声明不同' in warning for warning in explicit['warnings']))
        data['physical_unit']={'frequency':'cm^-1'}
        with self.assertRaisesRegex(ValueError,'频率单位声明冲突'):
            run({'data':data})
        self.assertEqual(run({'data':data,'frequency_unit':'THz'})['frequencyUnit'],'THz')

    def test_official_al_file_identity_units_and_all_source_values(self):
        import yaml
        filename=ROOT/'dist/data/examples/phonopy-al-abacus-band.yaml'
        raw=filename.read_bytes(); text=raw.decode('utf8'); original=yaml.safe_load(text)
        self.assertEqual(hashlib.sha256(raw).hexdigest(),'08da0d622d6f423f4bc5d3900a30c9bb5dfb86933bc849f59aad60fe67ec330b')
        self.assertEqual(len(raw),63428)
        unknown=run({'content':text})
        self.assertEqual(unknown['frequencyUnit'],'未声明单位')
        self.assertEqual(unknown['frequencyUnitSource'],'unspecified')
        result=run({'content':text,'frequency_unit':'THz','selected_q':22,'selected_band':1})
        self.assertFalse(result['synthetic'])
        self.assertEqual(result['sourceIdentity']['reference']['commit'],'18cad919af8fe8aad349e04f101887fa19b051a0')
        self.assertEqual(result['sourceIdentity']['reference']['kind'],'official-calculated-example-not-experiment')
        self.assertEqual(result['frequencyUnitSource'],'user.frequency_unit')
        self.assertEqual(result['frequencyUnitDeclarations'],[])
        self.assertEqual(result['structure']['lengthUnit'],'au')
        self.assertEqual(result['structure']['lengthUnitSource'],'length_unit')
        self.assertEqual(result['summary']['qpointCount'],84)
        self.assertEqual(result['summary']['bandCount'],3)
        self.assertEqual(result['summary']['eigenvectorCount'],252)
        self.assertEqual([segment['indices'] for segment in result['segments']],
                         [list(range(i,i+21)) for i in (0,21,42,63)])
        for actual, expected in zip(result['qpoints'],original['phonon']):
            self.assertEqual(actual['q'],expected['q-position'])
            self.assertEqual(actual['distance'],expected['distance'])
            self.assertEqual(actual['frequencies'],[band['frequency'] for band in expected['band']])
        self.assertEqual(result['selection']['eigenvector'],original['phonon'][22]['band'][1]['eigenvector'])
        self.assertFalse(result['animation']['physicalTrajectory'])
        self.assertEqual(result['structure']['lattice'],original['lattice'])
        self.assertEqual(filename.read_bytes(),raw)
        manifest=json.loads((ROOT/'dist/data/examples/phonopy-al-abacus-source.json').read_text(encoding='utf8'))
        self.assertEqual(manifest['sha256'],hashlib.sha256(raw).hexdigest())
        self.assertEqual(manifest['gitBlobSha1'],hashlib.sha1(b'blob '+str(len(raw)).encode()+b'\0'+raw).hexdigest())
        companion=manifest['companion']
        companion_raw=(ROOT/'dist/data/examples'/companion['localFile']).read_bytes()
        self.assertEqual(len(companion_raw),companion['byteCount'])
        self.assertEqual(hashlib.sha256(companion_raw).hexdigest(),companion['sha256'])
        supplied=run({'content':text,'structure_content':companion_raw.decode('utf8'),'frequency_unit':'THz',
                      'selected_q':22,'selected_band':1})
        self.assertEqual(supplied['qpoints'],result['qpoints'])
        self.assertEqual(supplied['structure']['lengthUnit'],'au')
        self.assertEqual(supplied['structure']['lengthUnitSource'],'length_unit')
        self.assertTrue(supplied['structure']['supplemented'])
        self.assertEqual(supplied['frequencyUnitSource'],'user.frequency_unit')
        license_text=(ROOT/'dist/data/examples'/manifest['licenseFile']).read_text(encoding='utf8')
        self.assertIn('Copyright (c) 2014-2024, Phonopy.',license_text)
        self.assertIn('THIS SOFTWARE IS PROVIDED',license_text)

    def test_file_identity_follows_the_actual_object_input_precedence(self):
        text=(ROOT/'dist/data/examples/phonopy-al-abacus-band.yaml').read_text(encoding='utf8')
        data=fixture()
        result=run({'data':data,'content':text})
        self.assertEqual(result['summary']['qpointCount'],1)
        identity=result['sourceIdentity']
        self.assertNotIn('reference',identity)
        self.assertEqual(identity['representation'],'canonical-json-object-not-original-file')
        expected=json.dumps(data,ensure_ascii=False,allow_nan=False,sort_keys=True,separators=(',',':')).encode()
        self.assertEqual(identity['sha256'],hashlib.sha256(expected).hexdigest())

    def test_official_al_complex_components_and_global_phase_invariants(self):
        import yaml
        original=yaml.safe_load((ROOT/'dist/data/examples/phonopy-al-abacus-band.yaml').read_text(encoding='utf8'))
        complex_rows=[]; relative_rows=[]; component_count=0
        for qi,point in enumerate(original['phonon']):
            for bi,band in enumerate(point['band']):
                vector=[complex(*c) for atom in band['eigenvector'] for c in atom]
                count=sum(abs(z.imag)>1e-12 for z in vector)
                component_count+=count
                if count: complex_rows.append((qi,bi))
                invariant=max(abs((a*b.conjugate()).imag) for a in vector for b in vector)
                if invariant>1e-12: relative_rows.append((qi,bi))
        self.assertEqual(len(complex_rows),12)
        self.assertEqual(len({q for q,b in complex_rows}),7)
        self.assertEqual(component_count,18)
        self.assertEqual(relative_rows,[(66,1),(66,2),(78,1),(78,2),(81,1),(81,2)])
        metadata=json.loads((ROOT/'dist/data/examples/phonopy-al-abacus-source.json').read_text(encoding='utf8'))['complexInput']
        self.assertEqual(metadata['vectorsWithSignificantImaginaryComponents'],len(complex_rows))
        self.assertEqual(metadata['significantImaginaryComponents'],component_count)
        self.assertEqual(metadata['relativeComplexSelectionsZeroBased'],[list(row) for row in relative_rows])
        # q20 has a removable overall phase; q66,b1 has relative Cartesian phase.
        for qi,bi,should_be_real in [(20,0,True),(66,1,False)]:
            vector=[complex(*c) for c in original['phonon'][qi]['band'][bi]['eigenvector'][0]]
            pivot=max(vector,key=abs)
            residual=max(abs((z*cmath.exp(-1j*cmath.phase(pivot))).imag) for z in vector)
            self.assertEqual(residual<1e-12,should_be_real)
        for qi in (66,78,81):
            pair=original['phonon'][qi]['band'][1:3]
            self.assertEqual(pair[0]['frequency'],pair[1]['frequency'])
            vectors=[[complex(*c) for c in band['eigenvector'][0]] for band in pair]
            self.assertLess(max(abs(sum(v[i]*v[j].conjugate() for v in vectors).imag)
                                for i in range(3) for j in range(3)),1e-12)

    def test_official_relative_complex_mode_motion_through_public_api(self):
        import yaml
        from browser_api import run as run_api
        text=(ROOT/'dist/data/examples/phonopy-al-abacus-band.yaml').read_text(encoding='utf8')
        original=yaml.safe_load(text); point=original['phonon'][66]
        source=point['band'][1]['eigenvector']
        vector=[complex(*c) for c in source[0]]
        invariant=max(abs((a*b.conjugate()).imag) for a in vector for b in vector)
        self.assertAlmostEqual(invariant,0.007918578160761238,places=14)
        shifted=[z*cmath.exp(.73j) for z in vector]
        self.assertAlmostEqual(max(abs((a*b.conjugate()).imag) for a in shifted for b in shifted),invariant,places=14)
        result=run_api('phonopy',{'content':text,'frequency_unit':'THz','selected_q':66,
                                  'selected_band':1,'amplitude':.2,'phase':.37,'supercell':[2,2,1]})
        self.assertEqual(result['selection']['eigenvector'],source)
        self.assertFalse(result['animation']['physicalTrajectory'])
        self.assertFalse(result['animation']['commensurate'])
        # One atom's common mass factor cancels in the display normalization.
        # This tests source relative Cartesian phases, not unequal-mass physics.
        norm=math.sqrt(sum(abs(z)**2 for z in vector))
        for atom in result['animation']['atoms']:
            spatial=cmath.exp(2j*math.pi*sum(q*c for q,c in zip(point['q-position'],atom['cell'])))
            expected=[(.2*z*spatial*cmath.exp(-.37j)/norm).real for z in vector]
            for actual,target in zip(atom['displacement'],expected):
                self.assertAlmostEqual(actual,target,places=13)
        for frame in result['animation']['frames']:
            for atom,position in zip(result['animation']['atoms'],frame['positions']):
                spatial=cmath.exp(2j*math.pi*sum(q*c for q,c in zip(point['q-position'],atom['cell'])))
                displacement=[(.2*z*spatial*cmath.exp(-1j*frame['phase'])/norm).real for z in vector]
                for actual,base,delta in zip(position,atom['equilibrium'],displacement):
                    self.assertAlmostEqual(actual,base+delta,places=13)
        # At the origin, phases 0 and pi/2 expose independent real/imaginary
        # Cartesian directions. Discarding imaginary input would fail this check.
        real_direction=result['animation']['frames'][0]['positions'][0]
        imag_direction=result['animation']['frames'][4]['positions'][0]
        cross=[real_direction[(i+1)%3]*imag_direction[(i+2)%3]
               -real_direction[(i+2)%3]*imag_direction[(i+1)%3] for i in range(3)]
        self.assertGreater(math.sqrt(sum(x*x for x in cross)),1e-4)
        self.assertGreater(max(abs(x) for x in imag_direction),1e-3)

    def test_mass_unweighting_keeps_relative_amplitudes(self):
        data = fixture(2)
        data['points'][1]['mass'] = 4
        data['phonon'][0]['band'][0]['eigenvector'] = [[[1/math.sqrt(2),0],[0,0],[0,0]]] * 2
        atoms = run({'data': data, 'amplitude': 0.4})['animation']['atoms']
        self.assertAlmostEqual(atoms[0]['displacement'][0], 0.4)
        self.assertAlmostEqual(atoms[1]['displacement'][0], 0.2)

    def test_complex_eigenvector_and_time_phase_sign(self):
        data = fixture()
        data['phonon'][0]['band'][0]['eigenvector'] = [[[0,1],[0,0],[0,0]]]
        a = run({'data': data, 'phase': 0, 'amplitude': 0.3})['animation']['atoms'][0]
        b = run({'data': data, 'phase': math.pi / 2, 'amplitude': 0.3})['animation']['atoms'][0]
        self.assertAlmostEqual(a['displacement'][0], 0)
        self.assertAlmostEqual(b['displacement'][0], 0.3)

    def test_non_gamma_phase_includes_basis_coordinate_and_cell(self):
        data = fixture()
        data['points'][0]['coordinates'] = [0.5,0,0]
        data['phonon'][0]['q-position'] = [0.5,0,0]
        a = run({'data': data, 'amplitude': 0.3, 'supercell': [2,1,1], 'phase': math.pi/2})['animation']
        self.assertTrue(a['commensurate'])
        self.assertAlmostEqual(a['atoms'][0]['displacement'][0], 0.3)
        self.assertAlmostEqual(a['atoms'][1]['displacement'][0], -0.3)
        self.assertEqual(a['atoms'][0]['equilibrium'], [1,0,0])
        self.assertEqual(a['atoms'][1]['equilibrium'], [3,0,0])
        b = run({'data': data, 'amplitude': 0.3, 'supercell': [2,1,1], 'phase': 0})['animation']
        self.assertAlmostEqual(b['atoms'][0]['displacement'][0], 0)

    def test_noncommensurate_window_is_explicit(self):
        data = fixture()
        data['phonon'][0]['q-position'] = [0.3,0,0]
        r = run({'data': data, 'supercell': [2,1,1]})
        self.assertFalse(r['animation']['commensurate'])
        self.assertTrue(any('有限窗口' in warning for warning in r['warnings']))

    def test_animation_frames_follow_coefficients(self):
        data = fixture()
        data['phonon'][0]['band'][0]['eigenvector'] = [[[0.5,0.5],[0.5,-0.5],[0,0]]]
        r = run({'data': data, 'amplitude': 0.2})['animation']
        for frame in r['frames']:
            for atom, position in zip(r['atoms'], frame['positions']):
                for base, pair, coordinate in zip(atom['equilibrium'], atom['complexDisplacement'], position):
                    expected = base + (complex(*pair) * cmath.exp(-1j * frame['phase'])).real
                    self.assertAlmostEqual(coordinate, expected)

    def test_lattice_rows_and_cartesian_eigenvectors_not_confused(self):
        data = fixture()
        data['lattice'] = [[2,1,0],[0,3,0],[0,0,4]]
        data['points'][0]['coordinates'] = [0.5,0.25,0.25]
        atom = run({'data': data, 'amplitude': 0.2})['animation']['atoms'][0]
        self.assertEqual(atom['equilibrium'], [1,1.25,1])
        self.assertEqual(atom['displacement'], [0.2,0,0])

    def test_missing_animation_inputs_do_not_invent_motion(self):
        for key in ('mass', 'coordinates', 'eigenvector', 'lattice', 'points'):
            data = fixture()
            if key in ('mass', 'coordinates'):
                del data['points'][0][key]
            elif key == 'eigenvector':
                del data['phonon'][0]['band'][0][key]
            else:
                del data[key]
            with self.subTest(key=key):
                result = run({'data': data})
                self.assertEqual(result['summary']['bandCount'], 3)
                self.assertFalse(result['animation']['available'])
                self.assertEqual(result['animation']['frames'], [])
                self.assertTrue(result['animation']['reason'])

    def test_unit_not_guessed_and_explicit_unit_retains_numbers(self):
        data = fixture()
        unknown = run({'data': data, 'frequency_unit': 'unknown'})
        self.assertEqual(unknown['frequencyUnit'], '未声明单位')
        specified = run({'data': data, 'frequency_unit': 'cm^-1'})
        self.assertEqual(specified['frequencyUnit'], 'cm^-1')
        self.assertEqual(specified['qpoints'], unknown['qpoints'])
        data['frequency_unit'] = 'meV'
        self.assertEqual(run({'data': data, 'frequency_unit': 'unknown'})['frequencyUnit'], 'meV')

    def test_imaginary_tolerance_and_negative_frequency_animation(self):
        data = fixture()
        for band, f in zip(data['phonon'][0]['band'], [-0.3, -1e-6, 2e-6]):
            band['frequency'] = f
        r = run({'data': data, 'imaginary_tolerance': 1e-5})
        self.assertEqual(r['summary']['imaginaryCount'], 1)
        self.assertEqual(r['summary']['negativeCount'], 2)
        self.assertEqual(r['summary']['nearZeroCount'], 2)
        self.assertFalse(r['animation']['physicalTrajectory'])
        self.assertTrue(any('真实时间' in message for message in r['warnings']))

    def test_qpoints_are_not_connected_without_declared_path(self):
        data = fixture()
        point = deepcopy(data['phonon'][0])
        point['q-position'] = [0.5,0,0]
        data['phonon'].append(point)
        data['nqpoint'] = 2
        for i, p in enumerate(data['phonon']):
            p['distance'] = i
        self.assertEqual([s['indices'] for s in run({'data': data})['segments']], [[0],[1]])

    def test_structure_only_phonopy_yaml_reports_missing_frequency(self):
        cell = fixture()
        data = {'primitive_cell': {'lattice': cell['lattice'], 'points': cell['points']},
                'force_constants': {'shape': [1,1], 'elements': [[[1,0,0],[0,1,0],[0,0,1]]]}}
        r = run({'data': data, 'filename': 'phonopy.yaml'})
        self.assertEqual(r['kind'], 'structure-only')
        self.assertEqual(r['qpoints'], [])
        self.assertFalse(r['animation']['available'])
        self.assertTrue(any('不从力常数' in warning for warning in r['warnings']))

    def test_optional_empty_inputs_are_ignored(self):
        r = run({'data': fixture(), 'dos_content': '', 'structure_content': '   '})
        self.assertEqual(r['kind'], 'phonon-data')
        self.assertIsNone(r['dos'])

    def test_qpoints_companion_structure_and_reciprocal_check(self):
        data = fixture()
        companion = {'primitive_cell': {'lattice': data.pop('lattice'), 'points': data.pop('points')}}
        data['reciprocal_lattice'] = [[0.5,0,0],[0,1/3,0],[0,0,0.25]]
        r = run({'data': data, 'structure_data': companion})
        self.assertTrue(r['animation']['available'])
        self.assertTrue(r['structure']['supplemented'])
        companion['primitive_cell']['lattice'][0][0] = 3
        with self.assertRaisesRegex(ValueError, 'reciprocal_lattice'):
            run({'data': data, 'structure_data': companion})

    def test_companion_atom_order_and_mass_must_match(self):
        data = fixture(2)
        for key, value in [('symbol','B'), ('mass',4), ('coordinates',[0.1,0,0])]:
            extra = {'primitive_cell': deepcopy(data)}
            extra['primitive_cell']['points'][1][key] = value
            with self.subTest(key=key), self.assertRaises(ValueError):
                run({'data': data, 'structure_data': extra})

    def test_total_dos_preserves_input_integral(self):
        r = run({'dos_content': '# units already chosen\n0 0\n1 2\n2 0\n', 'frequency_unit': 'THz'})
        self.assertEqual(r['kind'], 'dos')
        self.assertEqual(r['dos']['frequency'], [0,1,2])
        self.assertEqual(r['dos']['series'][0]['values'], [0,2,0])
        self.assertEqual(r['dos']['integrals'], [2])
        self.assertEqual(r['qpoints'], [])

    def test_projected_and_xyz_dos_columns_are_explicit(self):
        r = run({'data': fixture(2), 'dos_content': '0 1 2\n1 2 3', 'dos_kind': 'projected'})
        self.assertEqual(len(r['dos']['series']), 2)
        r = run({'data': fixture(2), 'dos_content': '0 1 2 3 4 5 6\n1 2 3 4 5 6 7', 'dos_kind': 'xyz'})
        self.assertEqual([s['label'] for s in r['dos']['series']], ['A0 1 x','A0 1 y','A0 1 z','A1 2 x','A1 2 y','A1 2 z'])
        with self.assertRaisesRegex(ValueError, 'XYZ_PROJECTION'):
            run({'data': fixture(2), 'dos_content': '0 1 2 3 4 5 6', 'dos_kind': 'projected'})

    def test_invalid_dos_inputs(self):
        for content in ['0 1\n1 2 3', '0 -1\n1 2', '1 1\n0 2', '0 nan', '# no data', '0 1 2', 12, True, [], None]:
            with self.subTest(content=content), self.assertRaises(ValueError):
                run({'dos_content': content})

    def test_yaml_code_tags_and_aliases_rejected(self):
        for content in ['!!python/object/apply:os.system ["echo injected"]',
                        'a: &a [1,2,3]\nb: *a', 'a: &a [*a]']:
            with self.subTest(content=content), self.assertRaises(ValueError):
                run({'content': content})

    def test_input_size_depth_cycle_and_nonfinite_limits(self):
        with self.assertRaisesRegex(ValueError, '8 MiB'):
            run({'content': 'a' * (MAX_BYTES + 1)})
        with self.assertRaisesRegex(ValueError, '嵌套'):
            run({'content': 'a: ' + '[' * 40 + '0' + ']' * 40})
        cyclic = {}; cyclic['loop'] = cyclic
        with self.assertRaisesRegex(ValueError, '循环'):
            run({'data': cyclic})
        data = fixture(); data['phonon'][0]['band'][0]['frequency'] = math.nan
        with self.assertRaises(ValueError):
            run({'data': data})
        data['phonon'][0]['band'][0]['frequency'] = 10 ** 1000
        with self.assertRaises(ValueError):
            run({'data': data})

    def test_invalid_metadata_and_missing_frequency(self):
        mutations = [lambda d: d.update(natom=2), lambda d: d.update(nqpoint=2),
                     lambda d: d.update(segment_nqpoint=[2]),
                     lambda d: d['phonon'][0]['band'][0].pop('frequency'),
                     lambda d: d['phonon'][0]['band'].pop(),
                     lambda d: d['phonon'][0]['band'][0].update(eigenvector=[[[1,0],[1,0]]]),
                     lambda d: d.update(lattice=[[0,0,0],[0,1,0],[0,0,1]]),
                     lambda d: d['points'][0].update(mass=0)]
        for index, mutation in enumerate(mutations):
            data = fixture(); mutation(data)
            with self.subTest(index=index), self.assertRaises(ValueError):
                run({'data': data})

    def test_invalid_selection_and_amplitude(self):
        for params in [{'selected_q': 1}, {'selected_band': -1}, {'selected_band': 3},
                       {'amplitude': True}, {'amplitude': -1}, {'phase': math.inf}, {'supercell': [5,1,1]}]:
            with self.subTest(params=params), self.assertRaises(ValueError):
                run({'data': fixture(), **params})

    def test_q_mode_node_and_render_limits(self):
        data = fixture()
        for band in data['phonon'][0]['band']:
            band.pop('eigenvector')
        data['phonon'] = data['phonon'] * 2001
        data['nqpoint'] = 2001
        with self.assertRaisesRegex(ValueError, '2000'):
            run({'data': data})
        point = {'q-position': [0,0,0], 'band': [{'frequency': 1}] * 384}
        with self.assertRaisesRegex(ValueError, '60000'):
            run({'data': {'natom': 128, 'phonon': [point] * 157}})
        with self.assertRaisesRegex(ValueError, '节点'):
            run({'data': {'a': [0] * MAX_NODES}})
        result = run({'data': fixture(9), 'supercell': [4,4,4]})
        self.assertFalse(result['animation']['available'])
        self.assertIn('512', result['animation']['reason'])

    def test_unrecognized_documents_fail_helpfully(self):
        for data in [{}, {'thermal_properties': []}, ['no root mapping']]:
            with self.subTest(data=data), self.assertRaises(ValueError):
                run({'data': data})


if __name__ == '__main__':
    unittest.main()
