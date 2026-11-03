"""Normalize independent AI scope proposals; verify source spans and raster crops."""
import argparse
import hashlib
import io
import json
from pathlib import Path
import re

from codecell_inventory import canonical,digest,number
from review_package import no_duplicates

GROUPS=['aetcom-foundation','ece-skills','assessment-logbook-electives','alignment-online','pandemic']
CATEGORIES={'frontmatter','learner_outcomes','teaching_example','faculty_guidance','assessment_guidance','reference_or_appendix','mixed','uncertain'}
FLAGS=['clinicalApproval','semanticEquivalenceApproved','cohortApplicabilityApproved','qualifiedHumanApproval',
       'completeCoverageClaim','learnerActivation','allAtomicMedicalRequirementsAccepted']


def seal(row):
    row=dict(row);row['candidateId']=digest(canonical(row));return row


def valid_hash(x):return isinstance(x,str) and re.fullmatch('[0-9a-f]{64}',x) is not None


def validate_packet(packet,profiles):
    keys={'schemaVersion','kind','sourceRights','sourceTextStored','reviewAuthority','sources','textCandidates','rasterCandidates','reviewPacketBindings',*FLAGS}
    if not isinstance(packet,dict) or set(packet)!=keys or type(packet['schemaVersion']) is not int or packet['schemaVersion']!=1:raise ValueError('scope_packet_shape')
    if packet['kind']!='nmc-full-support-ai-scope-proposals' or packet['sourceRights']!='citation_only' or packet['sourceTextStored'] is not False or packet['reviewAuthority']!='AI_source_investigation':raise ValueError('scope_authority')
    if any(packet[f] is not False for f in FLAGS):raise ValueError('unapproved_scope')
    sources=packet['sources']
    if len(sources)!=len(profiles) or {s['sourceId'] for s in sources}!=set(profiles):raise ValueError('source_set')
    for source in sources:
        if set(source)!={'sourceId','sourceSha256','pageCount','pageJudgments'}:raise ValueError('source_shape')
        sha,pages=profiles[source['sourceId']]
        if source['sourceSha256']!=sha or type(source['pageCount']) is not int or source['pageCount']!=pages:raise ValueError('source_profile')
        judgments=source['pageJudgments']
        if len(judgments)!=pages or [p['pdfPage'] for p in judgments]!=list(range(1,pages+1)):raise ValueError('page_scope')
        for page in judgments:
            if set(page)!={'pdfPage','category','pageTextSha256','decision'} or type(page['pdfPage']) is not int or page['category'] not in CATEGORIES or not valid_hash(page['pageTextSha256']) or page['decision'] is not None:raise ValueError('page_judgment')
    ids=[]
    for raster,rows in [(False,packet['textCandidates']),(True,packet['rasterCandidates'])]:
        for row in rows:
            common={'candidateId','sourceId','pdfPage','candidateKind','parentContextSha256','decision'}
            extra={'locatorSpace','imageSha256','imageDimensions','pixelBBox','sourcePageBBox','cropSha256'} if raster else {'startChar','endChar','bodySha256'}
            if set(row)!=common|extra or row['sourceId'] not in profiles or type(row['pdfPage']) is not int or not 1<=row['pdfPage']<=profiles[row['sourceId']][1]:raise ValueError('candidate_shape_or_source')
            if not isinstance(row['candidateKind'],str) or not re.fullmatch('[a-z][a-z0-9_]{0,99}',row['candidateKind']) or row['decision'] is not None or row['parentContextSha256'] is not None and not valid_hash(row['parentContextSha256']):raise ValueError('candidate_kind_or_authority')
            if row['candidateId']!=digest(canonical({k:v for k,v in row.items() if k!='candidateId'})):raise ValueError('candidate_digest')
            ids.append(row['candidateId'])
            if raster:
                if row['locatorSpace'] not in ['page_render_3x','embedded_image_pixels'] or not valid_hash(row['imageSha256']) or not valid_hash(row['cropSha256']):raise ValueError('raster_space')
                dims=row['imageDimensions'];box=row['pixelBBox'];pdfbox=row['sourcePageBBox']
                if len(dims)!=2 or any(type(n) is not int or n<1 for n in dims) or len(box)!=4 or any(type(n) is not int for n in box) or not 0<=box[0]<box[2]<=dims[0] or not 0<=box[1]<box[3]<=dims[1] or len(pdfbox)!=4 or not all(number(n) for n in pdfbox) or not pdfbox[0]<pdfbox[2] or not pdfbox[1]<pdfbox[3]:raise ValueError('raster_bounds')
            elif type(row['startChar']) is not int or type(row['endChar']) is not int or not 0<=row['startChar']<row['endChar'] or not valid_hash(row['bodySha256']):raise ValueError('text_bounds')
    if len(ids)!=len(set(ids)):raise ValueError('duplicate_candidate_identity')
    for binding in packet['reviewPacketBindings']:
        if set(binding)!={'group','sha256'} or binding['group'] not in GROUPS or not valid_hash(binding['sha256']):raise ValueError('review_binding')
    return True


def source_files(root,directory):
    catalog=json.loads((Path(root)/'docs/evidence/nmc-supplement-sources.json').read_bytes(),object_pairs_hook=no_duplicates)
    paths={hashlib.sha256(p.read_bytes()).hexdigest():p for p in Path(directory).glob('*.pdf')}
    return {d['id']:(d['sha256'],d['pages'],paths[d['sha256']]) for d in catalog['documents']}


def verify_page_bbox(observed,expected_candidates):
    if not any(all(abs(a-b)<=0.002 for a,b in zip(observed,expected)) for expected in expected_candidates):
        raise ValueError('raster_source_page_bbox_mismatch')
    return True


def normalize(root,directory,reviews):
    import fitz
    files=source_files(root,directory);by_sha={v[0]:k for k,v in files.items()};texts={}
    for sid,(_,_,path) in files.items():
        with fitz.open(path) as doc:texts[sid]=[p.get_text() for p in doc]
    sources=[];candidates=[];rasters=[];bindings=[]
    for group in GROUPS:
        path=Path(reviews)/('support-semantic-'+group+'.json');value=json.loads(path.read_bytes(),object_pairs_hook=no_duplicates)
        for key in ['clinicalApproval','semanticEquivalenceApproved','cohortApplicabilityApproved','learnerActivation']:
            if value.get(key) is not False:raise ValueError('raw_review_approval')
        bindings.append({'group':group,'sha256':hashlib.sha256(path.read_bytes()).hexdigest()});raw_sources=value.get('sources')
        if isinstance(raw_sources,dict):raw_sources=[dict(v,localAlias=k) for k,v in raw_sources.items()]
        if raw_sources is None:raw_sources=[{'localAlias':'pandemic','sourceSHA256':value['sourceSHA256'],'pages':value['sourcePages'],'pageJudgments':value['pageJudgments']}]
        aliases={}
        for source in raw_sources:
            sha=source.get('sourceSHA256',source.get('pinnedSourceSHA256'));sid=by_sha[sha]
            for alias in [source.get('sourceId'),source.get('source'),source.get('localAlias'),sid]:
                if alias:aliases[alias]=sid
            pages=source.get('pageScope',source.get('pageJudgments'));judgments=[]
            for page in pages:
                n=page['page'];tag=page.get('scopeCategory',page.get('category'))
                judgments.append({'pdfPage':n,'category':tag,'pageTextSha256':digest(texts[sid][n-1]),'decision':None})
            sources.append({'sourceId':sid,'sourceSha256':sha,'pageCount':files[sid][1],'pageJudgments':judgments})
        rows=next(value[k] for k in ['candidates','newOrRefinedLocators','newOrMoreGranularPassageLocators','previouslyUncapturedCandidates'] if k in value)
        def identity(row):
            alias=row.get('sourceId',row.get('source'))
            sid=aliases[alias] if alias else next(iter(set(aliases.values())))
            kind=row.get('candidateKind',row.get('controlledKind',row.get('controlledCandidateKind')))
            kind=re.sub('[^a-z0-9_]+','_',kind.lower()).strip('_')
            parent=row.get('parentId',row.get('parent',row.get('parentExampleId')))
            return {'sourceId':sid,'pdfPage':row.get('page',row.get('pdfPage')),'candidateKind':kind,
                    'parentContextSha256':digest(canonical(parent)) if parent is not None else None,'decision':None}
        for row in rows:
            item=identity(row)
            if row['startChar'] is None and row.get('locatorKind')=='embedded_image':
                from PIL import Image
                sid=item['sourceId']
                with fitz.open(files[sid][2]) as doc:
                    blobs=[doc.extract_image(image[0])['image'] for image in doc[item['pdfPage']-1].get_images(full=True)]
                    data=next(blob for blob in blobs if hashlib.sha256(blob).hexdigest()==row['bodySHA256'])
                image=Image.open(io.BytesIO(data)).convert('RGB');buffer=io.BytesIO();image.save(buffer,format='PNG')
                item.update(locatorSpace='embedded_image_pixels',imageSha256=row['bodySHA256'],imageDimensions=list(image.size),
                            pixelBBox=[0,0,*image.size],sourcePageBBox=row['bbox'],cropSha256=hashlib.sha256(buffer.getvalue()).hexdigest())
                rasters.append(seal(item));continue
            item.update(startChar=row['startChar'],endChar=row['endChar'],bodySha256=row['bodySHA256']);candidates.append(seal(item))
        for row in value.get('rasterCandidates',[]):
            item=identity(row)
            if 'embeddedImagePixelBBox' in row:
                item.update(locatorSpace='embedded_image_pixels',imageSha256=row['embeddedImageSHA256'],imageDimensions=row['embeddedImagePixelDimensions'],pixelBBox=row['embeddedImagePixelBBox'])
            else:item.update(locatorSpace='page_render_3x',imageSha256=row['renderSHA256'],imageDimensions=row['renderSizePx'],pixelBBox=row['pixelBBox'])
            item.update(sourcePageBBox=row['sourcePageBBox'],cropSha256=row['cropSHA256']);rasters.append(seal(item))
    packet={'schemaVersion':1,'kind':'nmc-full-support-ai-scope-proposals','sourceRights':'citation_only','sourceTextStored':False,
            'reviewAuthority':'AI_source_investigation','sources':sorted(sources,key=lambda x:x['sourceId']),
            'textCandidates':candidates,'rasterCandidates':rasters,'reviewPacketBindings':bindings,**{f:False for f in FLAGS}}
    validate_packet(packet,{k:v[:2] for k,v in files.items()});return packet


def verify_sources(packet,root,directory):
    import fitz
    from PIL import Image
    if fitz.VersionBind!='1.26.6':raise ValueError('engine_version')
    files=source_files(root,directory);validate_packet(packet,{k:v[:2] for k,v in files.items()});docs={k:fitz.open(v[2]) for k,v in files.items()}
    try:
        for source in packet['sources']:
            for page in source['pageJudgments']:
                if digest(docs[source['sourceId']][page['pdfPage']-1].get_text())!=page['pageTextSha256']:raise ValueError('page_text_hash')
        for row in packet['textCandidates']:
            text=docs[row['sourceId']][row['pdfPage']-1].get_text()
            if row['endChar']>len(text) or digest(text[row['startChar']:row['endChar']])!=row['bodySha256']:raise ValueError('passage_hash')
        images={}
        for row in packet['rasterCandidates']:
            key=(row['sourceId'],row['pdfPage'],row['imageSha256'])
            doc=docs[row['sourceId']];page=doc[row['pdfPage']-1]
            if row['locatorSpace']=='page_render_3x':
                expected_boxes=[[n/3 for n in row['pixelBBox']]]
            else:
                expected_boxes=[];w,h=row['imageDimensions'];x0,y0,x1,y1=row['pixelBBox']
                for image in page.get_images(full=True):
                    blob=doc.extract_image(image[0])['image']
                    if hashlib.sha256(blob).hexdigest()!=row['imageSha256']:continue
                    for _,matrix in page.get_image_rects(image[0],transform=True):
                        expected_boxes.append(list(fitz.Rect(x0/w,y0/h,x1/w,y1/h)*matrix))
            verify_page_bbox(row['sourcePageBBox'],expected_boxes)
            if key not in images:
                if row['locatorSpace']=='page_render_3x':
                    pix=page.get_pixmap(matrix=fitz.Matrix(3,3));data=pix.tobytes('png')
                    if hashlib.sha256(data).hexdigest()!=row['imageSha256']:raise ValueError('page_render_hash')
                else:
                    blobs=[doc.extract_image(image[0])['image'] for image in page.get_images(full=True)]
                    data=next((blob for blob in blobs if hashlib.sha256(blob).hexdigest()==row['imageSha256']),None)
                    if data is None:raise ValueError('embedded_image_hash')
                images[key]=Image.open(io.BytesIO(data)).convert('RGB')
            image=images[key]
            if list(image.size)!=row['imageDimensions']:raise ValueError('image_dimensions')
            buffer=io.BytesIO();image.crop(row['pixelBBox']).save(buffer,format='PNG')
            if hashlib.sha256(buffer.getvalue()).hexdigest()!=row['cropSha256']:raise ValueError('crop_hash')
    finally:
        for doc in docs.values():doc.close()
    return True


def main():
    p=argparse.ArgumentParser(description=__doc__);p.add_argument('supplement_dir',type=Path);p.add_argument('--root',type=Path,default=Path(__file__).resolve().parents[2])
    p.add_argument('--reviews',type=Path);p.add_argument('--verify',type=Path);p.add_argument('--out',type=Path);args=p.parse_args()
    packet=normalize(args.root,args.supplement_dir,args.reviews) if args.reviews else json.loads(args.verify.read_bytes(),object_pairs_hook=no_duplicates)
    verify_sources(packet,args.root,args.supplement_dir)
    if args.out:
        with args.out.open('x') as f:f.write(canonical(packet)+'\n')
    print(json.dumps({'sourceDocuments':len(packet['sources']),'pageScopeProposals':sum(s['pageCount'] for s in packet['sources']),
                      'textPassageLocators':len(packet['textCandidates']),'rasterLocators':len(packet['rasterCandidates']),'clinicalApproval':False}))


if __name__=='__main__':main()
