import unittest
from source_freshness import screen_page, build_screen, verify_screen


def page(title='A routine notice',url='https://nmc.org.in/whats-new/download/1'):
    row='<tr class="wn-tr"><a href="'+url+'" class="wn-title-link">'+title+'</a>'
    row+=''.join('<span class="wn-date-'+key+'">'+value+'</span>' for key,value in [('day','03'),('mon','Nov'),('yr','2026')])+'</tr>'
    return (row*20).encode()


class SourceFreshnessTests(unittest.TestCase):
    def test_curriculum_title_match_is_not_complete_source_review(self):
        result,_=screen_page(page('Updated CBME curriculum'),1)
        self.assertEqual(result['rowCount'],20)
        self.assertEqual(result['matches'][0]['matchedRules'],['curriculum'])
        self.assertNotIn('title',result['matches'][0])

    def test_missing_pages_or_malformed_layout_fail_closed(self):
        with self.assertRaises(ValueError):build_screen({1:page()})
        with self.assertRaises(ValueError):screen_page(b'<p>no listing rows</p>',1)
        with self.assertRaises(ValueError):screen_page(page(url='https://untrusted.example/doc'),1)

    def test_screen_retains_duplicate_appearances_and_rejects_stale_metadata(self):
        pages={n:page() for n in range(1,19)}
        result=build_screen(pages)
        self.assertEqual(result['listingAppearances'],360)
        self.assertEqual(result['distinctDocumentUrls'],1)
        self.assertFalse(result['allNoticesContentReviewed'])
        self.assertFalse(result['allCompetenciesLatestCertified'])
        verify_screen(result,pages)
        pages[18]=page('Disability assessment guidelines')
        with self.assertRaises(ValueError):verify_screen(result,pages)


if __name__=='__main__':unittest.main()
