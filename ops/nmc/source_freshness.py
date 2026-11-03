"""Bounded official archive title screen; no semantic freshness certification."""
import argparse
import hashlib
import html
import json
from pathlib import Path
import re

from codecell_inventory import canonical, digest
from review_package import no_duplicates

RULES={'curriculum':r'CBME|competenc|curricul|logbook|elective|family adoption|early clinical|AETCOM',
       'admission_disability':r'disabil|PwBD',
       'assessment_progression':r'attempt|passing|assessment',
       'institutional_regulation':r'UG.?MSR|Graduate Medical Education Regulations|Maintenance of Standards'}


def screen_page(raw,index):
    if type(index) is not int or not 1<=index<=18:raise ValueError('index_page_range')
    text=raw.decode('utf-8');rows=[];matches=[]
    for tr in re.findall(r'<tr class="wn-tr">(.*?)</tr>',text,re.S):
        m=re.search(r'<a href="([^"]+)" class="wn-title-link"[^>]*>(.*?)</a>',tr,re.S)
        if not m:raise ValueError('missing_listing_title')
        url=html.unescape(m.group(1))
        if not re.fullmatch(r'https://nmc\.org\.in/whats-new/download/\d+',url):raise ValueError('untrusted_document_url')
        title=html.unescape(re.sub('<[^>]+>','',m.group(2))).strip()
        date=[]
        for key in ['day','mon','yr']:
            part=re.search(r'class="wn-date-'+key+r'">(.*?)</span>',tr,re.S)
            if not part:raise ValueError('missing_listing_date')
            date.append(part.group(1).strip())
        row={'url':url,'published':' '.join(date),'titleSha256':digest(title)};rows.append(row)
        matched=[key for key,pattern in RULES.items() if re.search(pattern,title,re.I)]
        if matched:matches.append({'position':len(rows),**row,'matchedRules':matched})
    if len(rows)!=20:raise ValueError('expected_twenty_listing_rows')
    return {'page':index,'url':f'https://nmc.org.in/whats-new?type=news&page={index}',
            'htmlSha256':hashlib.sha256(raw).hexdigest(),'rowCount':20,
            'listingSequenceSha256':digest(canonical(rows)),'matches':matches},rows


def build_screen(pages):
    if set(pages)!=set(range(1,19)):raise ValueError('expected_eighteen_pages')
    results=[screen_page(pages[n],n) for n in range(1,19)]
    return {'schemaVersion':1,'kind':'bounded-nmc-official-archive-title-screen','patterns':RULES,
            'pages':[r[0] for r in results],'listingAppearances':360,
            'distinctDocumentUrls':len({row['url'] for _,rows in results for row in rows}),
            'sourceTextStored':False,'allNoticesContentReviewed':False,
            'allCompetenciesLatestCertified':False,'learnerActivation':False}


def verify_screen(screen,pages):
    if canonical(screen)!=canonical(build_screen(pages)):raise ValueError('stale_or_modified_archive_screen')
    return True


def main():
    p=argparse.ArgumentParser(description=__doc__);p.add_argument('source_directory',type=Path)
    p.add_argument('--verify',type=Path);p.add_argument('--out',type=Path);args=p.parse_args()
    pages={n:(args.source_directory/f'news{n}.html').read_bytes() for n in range(1,19)}
    screen=build_screen(pages)
    if args.verify:verify_screen(json.loads(args.verify.read_bytes(),object_pairs_hook=no_duplicates),pages)
    if args.out:
        with args.out.open('x') as f:f.write(canonical(screen)+'\n')
    print(json.dumps({'pages':18,'listingAppearances':360,'distinctDocumentUrls':screen['distinctDocumentUrls'],
                      'titleMatchAppearances':sum(len(p['matches']) for p in screen['pages']),
                      'contentCoverageCertified':False}))


if __name__=='__main__':main()
