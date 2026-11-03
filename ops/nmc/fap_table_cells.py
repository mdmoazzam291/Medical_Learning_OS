"""Candidate raster-table cell fragments and blank logbook labels; no clinical acceptance."""
import argparse
import hashlib
import io
import json
import math
from pathlib import Path
import re
import subprocess

from codecell_inventory import ELIGIBILITY, canonical, digest
from electives_fap_audit import BASE_SHA

PARENT_SHA='843977966a07169b31b2535b4c7aeaef3f42cf5cede0ab732d632b8630edb6ec'
METHOD='fap-raster-grid-cell-fragments-v1'
ROLES=['year_visit_context','competency_column','objective_column','teaching_method_column','assessment_method_column','hours_column']
FIELDS={'institution':'Institute','university':'University','student_name':'Name of the Student','roll_number':'Roll No','batch':'Batch',
        'community_address':'Address of Community for FAP','family_count':'Number of Adopted Families',
        'household_head_names':'Names of Head of Household of Adopted families','screening_dates':'Dates of Screening Camp',
        'faculty_mentor':'Name of Faculty Guide/Mentor','pg_sr_mentors':'Names of PGs/SRs Guide/Mentor',
        'paramedical_mentors':'Names of Para-medical staff Guide/Mentor'}


def centres(indices):
    groups=[]
    for value in sorted(set(indices)):
        if not groups or value>groups[-1][-1]+1:groups.append([value])
        else:groups[-1].append(value)
    return [sum(g)/len(g) for g in groups]


def bands(rules,length):
    if length<2:raise ValueError('invalid_image_dimension')
    ys=centres(rules)
    if not ys:return [(0.0,float(length-1),True,True)]
    if ys[0]>=8:ys.insert(0,0.0)
    if length-1-ys[-1]>=8:ys.append(float(length-1))
    original=set(centres(rules))
    return [(a,b,a not in original,b not in original) for a,b in zip(ys,ys[1:]) if b-a>=8]


def template_fields(text):
    result=[]
    for key,label in FIELDS.items():
        pattern=r'(?im)^[ \t]*'+r'[ \t]+'.join(re.escape(w) for w in label.split())+r'[ \t]*:?[ \t]*$'
        matches=list(re.finditer(pattern,text))
        if len(matches)!=1:raise ValueError('template_field_unresolved')
        m=matches[0];result.append({'localFieldKey':key,'pdfPage':71,'startChar':m.start(),'endChar':m.end(),'labelSpanSha256':digest(m.group())})
    return result


def main():
    parser=argparse.ArgumentParser(description=__doc__)
    parser.add_argument('pdf',type=Path);parser.add_argument('output',type=Path)
    args=parser.parse_args();data=args.pdf.read_bytes()
    if hashlib.sha256(data).hexdigest()!=BASE_SHA:raise ValueError('source_hash_mismatch')
    if args.output.suffix!='.json':raise ValueError('invalid_output_path')
    path=Path(__file__).resolve().parents[2]/'docs/evidence/nmc-electives-fap-source-observations-v1.json'
    raw=path.read_bytes()
    if hashlib.sha256(raw).hexdigest()!=PARENT_SHA:raise ValueError('parent_artifact_mismatch')
    parent=json.loads(raw);expected={r['pdfPage']:r for r in parent['fapTableImages']}
    import fitz
    import PIL
    from PIL import Image
    if fitz.VersionBind!='1.26.6':raise ValueError('pymupdf_version_mismatch')
    version=subprocess.run(['tesseract','--version'],capture_output=True,check=True).stdout.decode().splitlines()[0]
    cells,grids=[],[]
    with fitz.open(stream=data,filetype='pdf') as document:
        if len(document)!=467:raise ValueError('page_count_mismatch')
        for page in range(67,71):
            blocks=[b for b in document[page-1].get_text('dict')['blocks'] if b['type']==1]
            if len(blocks)!=1:raise ValueError('image_scope_unresolved')
            block=blocks[0]
            if hashlib.sha256(block['image']).hexdigest()!=expected[page]['embeddedImageSha256']:raise ValueError('image_hash_mismatch')
            image=Image.open(io.BytesIO(block['image'])).convert('L');width,height=image.size;pixels=image.load()
            xs=centres([x for x in range(width) if sum(pixels[x,y]<225 for y in range(height))>height*.75])
            if len(xs)!=7:raise ValueError('six_column_grid_unresolved')
            grids.append({'pdfPage':page,'pixelWidth':width,'pixelHeight':height,'verticalRuleCentres':xs})
            for column,(left,right) in enumerate(zip(xs,xs[1:])):
                x0=math.ceil(left)+2;x1=math.floor(right)-1
                rules=[y for y in range(height) if sum(pixels[x,y]<225 for x in range(x0,x1))>.85*(x1-x0)]
                for ordinal,(top,bottom,open_top,open_bottom) in enumerate(bands(rules,height),1):
                    crop=image.crop((x0,math.ceil(top)+2,x1,math.floor(bottom)-1))
                    if crop.width<=0 or crop.height<=0:raise ValueError('cell_crop_unresolved')
                    record={'pdfPage':page,'columnIndex':column,'columnRoleObservation':ROLES[column],
                            'localFragmentOrdinal':ordinal,'pixelBBox':[left,top,right,bottom],
                            'embeddedImageSha256':expected[page]['embeddedImageSha256'],
                            'cropPixelSha256':hashlib.sha256(crop.tobytes()).hexdigest(),
                            'cropWidth':crop.width,'cropHeight':crop.height,
                            'topEdgeWithoutDetectedRule':open_top,'bottomEdgeWithoutDetectedRule':open_bottom,
                            'touchesImageBoundary':top<=1 or bottom>=height-2,
                            'candidateHeaderBand':page==67 and ordinal==1}
                    record['fragmentId']=digest(canonical(dict(record,sourceSha256=BASE_SHA,method=METHOD)))
                    buffer=io.BytesIO();crop.save(buffer,format='PNG')
                    ocr=subprocess.run(['tesseract','stdin','stdout','-l','eng','--psm','6'],input=buffer.getvalue(),capture_output=True,check=True).stdout
                    record.update(ocrTextSha256=hashlib.sha256(ocr).hexdigest(),ocrWordCount=len(ocr.decode().split()),ocrStatus='candidate_unreviewed')
                    cells.append(record)
        text=document[70].get_text();fields=template_fields(text)
        instruction=re.search(r'\(To be modified by the Institute as per their requirement\)',text)
        if not instruction:raise ValueError('institution_modification_note_unlocated')
        note={'pdfPage':71,'startChar':instruction.start(),'endChar':instruction.end(),'spanSha256':digest(instruction.group())}
    result={'schemaVersion':1,'kind':'fap-candidate-table-cell-fragments-and-logbook-labels','method':METHOD,
            'sourceSha256':BASE_SHA,'parentArtifactSha256':PARENT_SHA,'sourceRights':'citation_only','sourceTextStored':False,
            'engine':{'pymupdf':fitz.VersionBind,'pillow':PIL.__version__,'tesseract':version,'ocrLanguage':'eng','ocrPsm':6},
            'geometry':{'darkPixelThreshold':225,'verticalCoverageThreshold':.75,'horizontalCoverageThreshold':.85,'minimumBandPixels':8},
            'imageGrids':grids,'cellFragments':cells,'logbookTemplateFields':fields,'institutionModificationNote':note,
            'totals':{'tableImages':len(grids),'cellFragments':len(cells),'headerFragments':sum(r['candidateHeaderBand'] for r in cells),
                      'fragmentsWithoutBottomRule':sum(r['bottomEdgeWithoutDetectedRule'] for r in cells),'templateLabels':len(fields)},
            'logicalRowsMergedAcrossImages':False,'clinicalTableInterpretationApproved':False,'templateIsFixedLearnerSchema':False,
            'actualPersonalDataCollected':False,'cohortApplicabilityApproved':False,'allRequirementsEnumerated':False,'eligibility':dict(ELIGIBILITY)}
    with args.output.open('x',encoding='utf-8') as output:output.write(canonical(result)+'\n')
    print(json.dumps(result['totals']))


if __name__=='__main__':main()
