import copy
import json
from pathlib import Path
import unittest
from foundation_completion import build_report, validate_register, registry_counts
from codecell_inventory import canonical

ROOT=Path(__file__).resolve().parents[2]


class FoundationCompletionTests(unittest.TestCase):
    def register(self):
        return json.loads((ROOT/'docs/evidence/nmc-foundation-completion-register-v1.json').read_bytes())

    def test_work_package_count_is_distinct_from_source_cases_and_registry_rows(self):
        report=build_report(ROOT)
        self.assertEqual(report['remainingMajorWorkPackages'],12)
        self.assertEqual(report['pendingSourceCases'],22)
        self.assertIsNone(report['atomicRemainingTaskCount'])
        self.assertEqual(report['registryRows'],{'objectives':0,'mappings':0,'artifacts':0})
        self.assertFalse(report['allCompetenciesLatestCertified'])
        self.assertFalse(report['foundationComplete'])

    def test_duplicate_cycle_and_unsupported_completion_rejected(self):
        base=self.register()
        mutations=[lambda x:x['tasks'].__setitem__(1,copy.deepcopy(x['tasks'][0])),
                   lambda x:x['tasks'][0]['dependsOn'].append('production-release'),
                   lambda x:x['tasks'][0].__setitem__('status','complete'),
                   lambda x:x.__setitem__('learnerActivation',0)]
        for mutate in mutations:
            value=copy.deepcopy(base);mutate(value)
            with self.assertRaises(ValueError):validate_register(value)

    def test_saved_snapshot_matches_current_bound_evidence(self):
        saved=json.loads((ROOT/'docs/evidence/nmc-foundation-readiness-snapshot-2026-11-03.json').read_bytes())
        self.assertEqual(canonical(saved),canonical(build_report(ROOT)))

    def test_registry_rejects_text_or_object_collections_and_nonobject_rows(self):
        text=(ROOT/'data/preparation-curriculum.js').read_text()
        for before,after in [('"objectives": []','"objectives": "oops"'),
                             ('"mappings": []','"mappings": {"fake": true}'),
                             ('"artifacts": []','"artifacts": [null]'),
                             ('"schemaVersion": 1','"schemaVersion": true')]:
            malformed=text.replace(before,after);self.assertNotEqual(malformed,text)
            with self.assertRaises(ValueError):registry_counts(malformed)


if __name__=='__main__':unittest.main()
