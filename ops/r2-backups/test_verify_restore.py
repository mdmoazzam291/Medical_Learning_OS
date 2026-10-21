import importlib.util
from pathlib import Path
import tempfile
import unittest


class RestoreVerificationTests(unittest.TestCase):
    def module(self):
        path = Path(__file__).with_name('verify_restore.py')
        self.assertTrue(path.exists(), 'full-table restore verifier is missing')
        spec = importlib.util.spec_from_file_location('verify_restore', path)
        module = importlib.util.module_from_spec(spec)
        spec.loader.exec_module(module)
        return module

    def test_copy_inventory_covers_empty_and_managed_tables(self):
        m = self.module()
        text = 'COPY public.notes (id, body) FROM stdin;\na\ttext\\nvalue\n\\.\nCOPY "auth"."users" ("id") FROM stdin;\n\\.\n'
        blocks = m.copy_inventory(text.splitlines())
        self.assertEqual(set(blocks), {('public', 'notes'), ('auth', 'users')})
        self.assertEqual(blocks[('auth', 'users')]['rows'], 0)
        self.assertEqual(blocks[('public', 'notes')]['columns'], ['id', 'body'])

    def test_row_fingerprint_ignores_order_but_preserves_duplicates_and_bytes(self):
        m = self.module()
        self.assertEqual(m.fingerprint(['b', 'a']), m.fingerprint(['a', 'b']))
        self.assertNotEqual(m.fingerprint(['a', 'a']), m.fingerprint(['a']))
        self.assertNotEqual(m.fingerprint(['a\t\\N']), m.fingerprint(['a\t']))

    def test_truncated_duplicate_and_unsafe_copy_blocks_fail(self):
        m = self.module()
        for lines in [
            ['COPY public.notes (id) FROM stdin;', '1'],
            ['COPY public.notes (id) FROM stdin;', '\\.', 'COPY public.notes (id) FROM stdin;', '\\.'],
            ['COPY public."bad;name" (id) FROM stdin;', '\\.'],
            ['COPY public.notes (id) FROM PROGRAM \'x\';'],
        ]:
            with self.subTest(lines=lines), self.assertRaises(ValueError):
                m.copy_inventory(lines)

    def test_missing_extra_and_altered_table_data_fail(self):
        m = self.module()
        expected = {('public', 'notes'): {'columns': ['id'], **m.fingerprint(['1'])}}
        m.compare_inventory(expected, expected, {'notes'})
        for actual in [{}, {**expected, ('public', 'other'): expected[('public', 'notes')]},
                       {('public', 'notes'): {'columns': ['id'], **m.fingerprint(['2'])}}]:
            with self.subTest(actual=actual), self.assertRaises(ValueError):
                m.compare_inventory(expected, actual, {'notes'})
        with self.assertRaises(ValueError):
            m.compare_inventory(expected, expected, {'notes', 'missing'})


if __name__ == '__main__':
    unittest.main()
