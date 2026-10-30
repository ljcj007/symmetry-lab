"""Shared, allowlisted JSON API for CPython and the browser Worker."""
TOOLS = ('salc_lab', 'wavevector_lab', 'nonsymmorphic_lab', 'symmetry_grading', 'order_parameter_lab', 'exchange_symmetry_lab', 'conservation_lab', 'manybody_spectra_lab', 'polaron_lab', 'density_matrix_lab', 'symmetry_workshop', 'band_rep_lab', 'dynamic_scattering_lab', 'domain_wall_lab', 'hubbard_lab', 'analyze', 'induce', 'product', 'match_bands', 'magnetictb',
         'crystkit', 'symbolic', 'carat', 'crystkit_ext',
         'carat_integral', 'integral_normalizer', 'symbolic_interfaces',
         'arithmetic_centralizer', 'symbolic_spacegroups',
         'structure_bc', 'standard_labels', 'teaching_labs', 'phonons', 'tensors', 'phase', 'diffraction', 'phonopy', 'phonon_modes', 'band_connectivity', 'phonon_thermo',
         'distortion_lab', 'magnon_lab', 'qha_lab', 'pairing_lab', 'shg_lab', 'unfold_lab', 'crystal_field_lab', 'quantum_geometry_lab', 'electron_transport_lab', 'hall_response_lab', 'device_transport_lab', 'local_multiplet_lab', 'spin_resonance_lab', 'andreev_lab', 'atomic_spectra_lab')


def run(tool, payload, database=None, catalog=None, magnetic_database=None,
        label_database=None):
    if tool not in TOOLS:
        raise ValueError('Unknown calculation tool')
    if not isinstance(payload, dict):
        raise ValueError('Calculation input must be a JSON object')
    if tool in ('salc_lab', 'wavevector_lab', 'nonsymmorphic_lab', 'symmetry_grading', 'order_parameter_lab', 'exchange_symmetry_lab', 'conservation_lab', 'manybody_spectra_lab', 'polaron_lab', 'density_matrix_lab', 'symmetry_workshop', 'band_rep_lab', 'dynamic_scattering_lab', 'domain_wall_lab', 'hubbard_lab'):
        from importlib import import_module
        return import_module(tool).calculate(payload)
    if tool in ('hall_response_lab', 'device_transport_lab', 'local_multiplet_lab', 'spin_resonance_lab', 'andreev_lab', 'atomic_spectra_lab'):
        from importlib import import_module
        return import_module(tool).run(payload)
    if tool == 'crystal_field_lab':
        from crystal_field_lab import run as calculate
        return calculate(payload)
    if tool == 'quantum_geometry_lab':
        from quantum_geometry_lab import run as calculate
        return calculate(payload)
    if tool == 'electron_transport_lab':
        from electron_transport_lab import run as calculate
        return calculate(payload)
    if tool == 'pairing_lab':
        from pairing_lab import run as calculate
        return calculate(payload)
    if tool == 'shg_lab':
        from shg_lab import run as calculate
        return calculate(payload)
    if tool == 'unfold_lab':
        from unfold_lab import run as calculate
        return calculate(payload)
    if tool == 'distortion_lab':
        from distortion_lab import run as calculate
        return calculate(payload)
    if tool == 'magnon_lab':
        from magnon_lab import run as calculate
        return calculate(payload)
    if tool == 'qha_lab':
        from qha_lab import run as calculate
        return calculate(payload)
    if tool == 'phonon_modes':
        from phonon_modes import run as calculate
        return calculate(payload)
    if tool == 'band_connectivity':
        from band_connectivity import run as calculate
        return calculate(payload)
    if tool == 'phonon_thermo':
        from phonon_thermo import run as calculate
        return calculate(payload)
    if tool == 'phase':
        from phase_domains import run as calculate
        return calculate(payload)
    if tool == 'diffraction':
        from diffraction import run as calculate
        return calculate(payload)
    if tool == 'phonopy':
        from phonopy_import import run as calculate
        return calculate(payload)
    if tool == 'phonons':
        from phonon_spectra import run_phonons
        return run_phonons(payload)
    if tool == 'tensors':
        from property_tensors import run_tensors
        return run_tensors(payload)
    if tool == 'teaching_labs':
        from teaching_labs import run as calculate
        return calculate(payload)
    if tool == 'structure_bc':
        from structure_bc import run as calculate
        return calculate(payload, database)
    if tool == 'standard_labels':
        from standard_labels import run as calculate
        return calculate(payload, database, label_database)
    if tool == 'arithmetic_centralizer':
        from arithmetic_centralizer import run as calculate
        return calculate(payload, database)
    if tool == 'symbolic_spacegroups':
        from symbolic_spacegroups import run as calculate
        return calculate(payload, database, magnetic_database)
    if tool == 'carat_integral':
        from carat_integral import run as calculate
        return calculate(payload, catalog)
    if tool == 'integral_normalizer':
        from integral_normalizer import run as calculate
        return calculate(payload, database)
    if tool == 'symbolic_interfaces':
        from symbolic_interfaces import run as calculate
        return calculate(payload)
    if tool == 'magnetictb':
        from magnetictb_browser import run as calculate
        return calculate(payload)
    if tool == 'crystkit':
        from crystkit_browser import run as calculate
        return calculate(payload, database)
    if tool == 'crystkit_ext':
        if payload.get('action') in ('integral_normalizer', 'extension_orbits') and 'normalizers' not in payload:
            from integral_normalizer import run as calculate
            return calculate(payload, database)
        from crystkit_extensions import run as calculate
        return calculate(payload, database)
    if tool == 'symbolic':
        from symbolic_core import run as calculate
        return calculate(payload)
    if tool == 'carat':
        from carat_browser import run as calculate
        return calculate(payload, catalog)
    from symmetry_core import run as calculate
    result = calculate(tool, payload)
    if tool == 'analyze' and payload.get('group_number') is not None:
        from standard_labels import run as label
        try:
            result['standardLabels'] = label({
                'action': 'annotate', 'group_number': payload['group_number'],
                'k': payload.get('k', [0, 0, 0]),
                'double_valued': payload.get('doubleValued', False),
                'analysis': result,
                **({key: payload[key] for key in ('k_label', 'bz_type') if key in payload})
            }, database, label_database)
        except ValueError as error:
            # Standard names are optional metadata, never a replacement for
            # the independently verified numerical representation above.
            result['standardLabels'] = {
                'complete': False, 'bc_complete': False, 'bilbao_complete': False,
                'status': 'unavailable',
                'message': '标准标签未确认；已保留通过验证的数值表示。原因：' + str(error),
                'mappings': [{'local_label': row['label'], 'bc_label': None,
                              'bilbao_label': None, 'status': 'unmatched'}
                             for row in result['irreps']]}
    return result
