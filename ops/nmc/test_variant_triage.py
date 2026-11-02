import copy
import json
from pathlib import Path
import unittest
from codecell_inventory import canonical, digest
from validate_variant_triage import FILES, validate


class VariantTriageTests(unittest.TestCase):
    def setUp(self):
        root = Path(__file__).resolve().parents[2] / 'docs/evidence'
        self.packet = json.loads((root / 'nmc-aetcom-variant-triage-v1.json').read_bytes())
        self.inputs = {n: (root / n).read_bytes() for n in FILES}

    def resign(self, case):
        case['caseDigest'] = digest(canonical({k: v for k, v in case.items() if k != 'caseDigest'}))

    def test_frozen_actual_packet_covers_all_unmatched_appearances(self):
        self.assertTrue(validate(self.packet, self.inputs))
        self.assertEqual(len(self.packet['cases']), 14)

    def test_stale_artifact_and_modified_case_fail(self):
        self.inputs[FILES[0]] += b' '
        with self.assertRaises(ValueError): validate(self.packet, self.inputs)
        self.setUp(); self.packet['cases'][0]['proposalKind'] = 'grammatical_variant'
        with self.assertRaises(ValueError): validate(self.packet, self.inputs)

    def test_missing_duplicate_and_fabricated_target_fail(self):
        for change in ['missing', 'duplicate', 'target']:
            self.setUp()
            if change == 'missing': self.packet['cases'].pop()
            elif change == 'duplicate': self.packet['cases'].append(copy.deepcopy(self.packet['cases'][0]))
            else:
                case = self.packet['cases'][0]; case['candidateAppendixAppearances'][0]['sourceNumber'] = 999; self.resign(case)
            with self.assertRaises(ValueError): validate(self.packet, self.inputs)

    def test_ai_packet_cannot_carry_decisions_or_approvals_even_if_resigned(self):
        for field, value in [('decision', 'accepted'), ('semanticEquivalenceApproved', True), ('canonicalMappingApproved', 0)]:
            self.setUp(); case = self.packet['cases'][0]; case[field] = value; self.resign(case)
            with self.assertRaises(ValueError): validate(self.packet, self.inputs)

    def test_boolean_schema_and_numeric_false_flag_are_not_equal_types(self):
        self.packet['schemaVersion'] = True
        with self.assertRaises(ValueError): validate(self.packet, self.inputs)
        self.setUp(); self.packet['eligibility']['learnerActivation'] = 0
        with self.assertRaises(ValueError): validate(self.packet, self.inputs)


if __name__ == '__main__': unittest.main()
