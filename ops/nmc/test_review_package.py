import copy
import json
from pathlib import Path
import unittest

from review_package import FILES, build_package, verify_package


class ReviewPackageTests(unittest.TestCase):
    def setUp(self):
        root = Path(__file__).resolve().parents[2] / 'docs/evidence'
        self.inputs = {name: (root / name).read_bytes() for name in FILES}

    def change(self, name, mutate):
        value = json.loads(self.inputs[name])
        mutate(value)
        self.inputs[name] = json.dumps(value).encode()

    def test_actual_metadata_freezes_deterministically_without_source_wording(self):
        package = build_package(self.inputs)
        self.assertEqual(package, build_package(dict(reversed(list(self.inputs.items())))))
        self.assertTrue(verify_package(package, self.inputs))
        self.assertEqual(package['counts'], {'documents': 12, 'pendingPages': 1031, 'regions': 3369, 'pendingCases': 22})
        self.assertNotIn('observedToken', str(package))
        self.assertNotIn('proposedResolution', str(package))
        self.assertFalse(any(package['eligibility'].values()))

    def test_checked_in_package_matches_current_evidence(self):
        path = Path(__file__).resolve().parents[2] / 'docs/evidence/nmc-unreviewed-review-package-v1.json'
        self.assertTrue(verify_package(json.loads(path.read_bytes()), self.inputs))

    def test_old_package_rejects_changed_case_even_when_still_pending(self):
        package = build_package(self.inputs)
        self.change('nmc-source-adjudication-packet.json', lambda v: v['cases'][0].update(observation='changed evidence'))
        with self.assertRaisesRegex(ValueError, 'stale_or_modified_package'):
            verify_package(package, self.inputs)

    def test_source_hash_mismatch_rejects_cross_source_binding(self):
        self.change('nmc-source-adjudication-packet.json', lambda v: v['sources']['base2024'].update(sha256='0' * 64))
        with self.assertRaises(ValueError): build_package(self.inputs)

    def test_unreviewed_builder_cannot_accept_decision_or_approval(self):
        for field in ['decision', 'status']:
            with self.subTest(field=field):
                changed = copy.deepcopy(self.inputs)
                self.change('nmc-source-adjudication-packet.json', lambda v: v['cases'][0].update({field: 'accepted'}))
                with self.assertRaises(ValueError): build_package(self.inputs)
                self.inputs = changed
        self.change('nmc-row-region-inventory-v1.json', lambda v: v['eligibility'].update(learnerActivation=True))
        with self.assertRaises(ValueError): build_package(self.inputs)

    def test_missing_duplicate_and_out_of_bounds_page_evidence_is_rejected(self):
        original = copy.deepcopy(self.inputs)
        mutations = [lambda v: v['documents'][0]['pages'].pop(),
                     lambda v: v['documents'][0]['pages'].append(v['documents'][0]['pages'][0]),
                     lambda v: v['documents'][0]['pages'][0].update(pdfPage=9999)]
        for mutate in mutations:
            self.inputs = copy.deepcopy(original)
            self.change('nmc-source-page-dispositions.json', mutate)
            with self.assertRaises(ValueError): build_package(self.inputs)

    def test_duplicate_case_and_region_and_unknown_case_source_are_rejected(self):
        original = copy.deepcopy(self.inputs)
        for name, mutate in [
            ('nmc-source-adjudication-packet.json', lambda v: v['cases'].append(v['cases'][0])),
            ('nmc-source-adjudication-packet.json', lambda v: v['cases'][0].update(source='unknown')),
            ('nmc-row-region-inventory-v1.json', lambda v: v['regions'].append(v['regions'][0]))]:
            self.inputs = copy.deepcopy(original); self.change(name, mutate)
            with self.assertRaises(ValueError): build_package(self.inputs)

    def test_modified_package_or_extra_approval_field_is_rejected(self):
        package = build_package(self.inputs)
        package['clinicalApproval'] = True
        with self.assertRaisesRegex(ValueError, 'stale_or_modified_package'):
            verify_package(package, self.inputs)

    def test_missing_or_extra_input_file_is_rejected(self):
        self.inputs['unknown.json'] = b'{}'
        with self.assertRaises(ValueError): build_package(self.inputs)
        del self.inputs['unknown.json']; self.inputs.pop(next(iter(self.inputs)))
        with self.assertRaises(ValueError): build_package(self.inputs)

    def test_altered_region_geometry_and_stale_diagnostic_are_rejected(self):
        original = copy.deepcopy(self.inputs)
        self.change('nmc-row-region-inventory-v1.json', lambda v: v['regions'][0]['bbox'].__setitem__(0, 0))
        with self.assertRaises(ValueError): build_package(self.inputs)
        self.inputs = original
        self.change('nmc-empty-region-selection-diagnostic-v1.json', lambda v: v.update(inventorySha256='0' * 64))
        with self.assertRaises(ValueError): build_package(self.inputs)

    def test_duplicate_json_keys_and_nonfinite_numbers_are_rejected(self):
        name = 'nmc-source-adjudication-packet.json'
        for data in [b'{"schemaVersion":1,"schemaVersion":1}', b'{"number":NaN}']:
            self.inputs[name] = data
            with self.assertRaises(ValueError): build_package(self.inputs)

    def test_boolean_integer_and_float_substitutions_cannot_reuse_package_digest(self):
        original = build_package(self.inputs)
        for mutate in [lambda p: p.update(schemaVersion=True),
                       lambda p: p['eligibility'].update(learnerActivation=0),
                       lambda p: p['counts'].update(pendingCases=22.0)]:
            package = copy.deepcopy(original); mutate(package)
            with self.assertRaisesRegex(ValueError, 'stale_or_modified_package'):
                verify_package(package, self.inputs)


if __name__ == '__main__': unittest.main()
