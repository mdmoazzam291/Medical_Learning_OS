// Read-only, non-approving 2024 NMC coded-competency completeness gate.
// Source totals are NOT proof that code enumeration or learner mastery is complete.
import expected from '../../data/nmc-2024-competency-counts.json' with {type:'json'};
import ledger from '../../data/competency-evidence-proposals.json' with {type:'json'};
import {SUBJECT_INDEX} from './subject-index.js';
import {validateCompetencyEvidenceProposals} from './competency-evidence.js';
import {validateNmcRightsRegister} from './nmc-cbme-rights.js';
const fail=()=>{throw new TypeError('nmc_competency_coverage_invalid');};
const exact=(x,keys)=>x&&typeof x==='object'&&!Array.isArray(x)&&
 Object.keys(x).sort().join('|')===[...keys].sort().join('|');
const total=rs=>rs.reduce((n,r)=>n+r.expectedCompetencies,0);
const validCode=s=>typeof s==='string'&&/^[A-Z]{2,4}\d{1,3}\.\d{1,3}$/.test(s);
export function validateNmcCompetencyCounts(source=expected){
 if(!exact(source,['schemaVersion','edition','kind','sourceId','sourceVersion',
 'sourceRights','sourceOrigin','referenceUrl','referencePages','pagesNumbering',
 'primaryPdfSha256','subjectCodesIndependentlyVerified',
 'globalCompetenciesAudited','aetcomAndSupplementalModulesAudited',
 'expectedTotal','volumeTotals','subjects'])||
 source.schemaVersion!==1||source.edition!=='nmc-cbme-2024-09-12'||
 source.kind!=='subject-coded-competency-denominators'||
 source.sourceId!=='nmc-cbme-2024'||source.sourceVersion!=='2024-09-12'||
 source.sourceRights!=='citation_only'||source.primaryPdfSha256!==null||
 source.subjectCodesIndependentlyVerified!==false||
 source.globalCompetenciesAudited!==false||
 source.aetcomAndSupplementalModulesAudited!==false||
 !source.referenceUrl.startsWith('https://medicaleducationucms.weebly.com/')||
 !Array.isArray(source.referencePages)||source.referencePages.length!==3||
 !Array.isArray(source.subjects)||source.subjects.length!==19||
 !exact(source.volumeTotals,['I','II','III'])||
 source.expectedTotal!==2781||total(source.subjects)!==2781||
 source.volumeTotals.I!==1139||source.volumeTotals.II!==1132||source.volumeTotals.III!==510)fail();
 const subjectIndex=new Map(SUBJECT_INDEX.map(s=>[s.id,s]));
 const seen=new Set(),volumeCount={I:0,II:0,III:0};
 for(const row of source.subjects){
  if(!exact(row,['subjectId','volume','printedLegend','expectedTopics','expectedCompetencies'])||
    !subjectIndex.has(row.subjectId)||seen.has(row.subjectId)||
    !Object.hasOwn(volumeCount,row.volume)||
    typeof row.printedLegend!=='string'||!/^[A-Z]{2,4}$/.test(row.printedLegend)||
    !Number.isInteger(row.expectedTopics)||row.expectedTopics<1||
    !Number.isInteger(row.expectedCompetencies)||row.expectedCompetencies<1)fail();
  seen.add(row.subjectId);volumeCount[row.volume]+=row.expectedCompetencies;
 }
 if(Object.keys(volumeCount).some(v=>volumeCount[v]!==source.volumeTotals[v]))fail();
 return structuredClone(source);
}
// An extracted PDF code inventory is metadata only, NEVER a verified source.
// Do not promote this field to 'verified' simply because OCR or text matches counts.
export function auditNmcCodedCompetencies({counts=expected,proposals=ledger,scan=null}={}){
 const c=validateNmcCompetencyCounts(counts);
 const rights=validateNmcRightsRegister().sourceRecords.find(x=>x.sourceId==='nmc-cbme-2024');
 if(!rights||rights.rightsMode!=='citation_only'||rights.publicRedistributionAllowed!==false)fail();
 validateCompetencyEvidenceProposals(proposals);
 const subjects=c.subjects.map(s=>{
  const rows=proposals.competencyProposals.filter(r=>r.subjectId===s.subjectId);
  const observed=new Set(rows.map(r=>r.competencyCode));
  return {
   volume:s.volume,subjectId:s.subjectId,expectedCodedCompetencies:s.expectedCompetencies,
   candidateMetadataRecords:observed.size,sourceVerifiedCodes:0,
   notYetRecordedAtLeast:Math.max(0,s.expectedCompetencies-observed.size),
   exceedsPublishedCount:observed.size>s.expectedCompetencies,
   sourceCodeListVerified:false
  };
 });
 let scanEvidence=null,unmatchedInScan=[],extraFromScan=[],ambiguousScanPrefixes=[];
 if(scan!==null){
  if(!exact(scan,['schemaVersion','documentSha256','extractionMethod','pagesParsed',
    'codes','rightsMode','sourceContentStored'])||
   scan.schemaVersion!==1||typeof scan.documentSha256!=='string'||
   !/^[0-9a-f]{64}$/.test(scan.documentSha256)||
   scan.extractionMethod!=='pdftotext-local-unreviewed'||
   !Number.isInteger(scan.pagesParsed)||scan.pagesParsed<1||
   scan.rightsMode!=='citation_only'||scan.sourceContentStored!==false||
   !Array.isArray(scan.codes)||scan.codes.length>10000)fail();
  const unique=new Set();
  for(const row of scan.codes){
   if(!exact(row,['code','pages'])||!validCode(row.code)||unique.has(row.code)||
      !Array.isArray(row.pages)||!row.pages.length||row.pages.length>500||
      row.pages.some(p=>!Number.isInteger(p)||p<1||p>scan.pagesParsed))fail();
   unique.add(row.code);
  }
  const proposed=new Set(proposals.competencyProposals.map(r=>r.competencyCode));
  unmatchedInScan=[...proposed].filter(k=>!unique.has(k));
  extraFromScan=[...unique].filter(k=>!proposed.has(k));
  const declared=new Set(c.subjects.map(r=>r.printedLegend));
  ambiguousScanPrefixes=[...unique].filter(code=>!declared.has(code.match(/^[A-Z]+/)[0]));
  scanEvidence={extractedCodeCount:scan.codes.length,pdfPagesParsed:scan.pagesParsed,
   pdfSha256ObservedButUnverified:scan.documentSha256,
   metadataOnly:true,independentVisualPageReview:false,
   matchedToCandidateRecords:proposed.size-unmatchedInScan.length};
 }
 const recorded=subjects.reduce((n,s)=>n+s.candidateMetadataRecords,0);
 return {
  contractId:'nmc-2024-coded-competency-coverage-audit-v1',
  sourceEdition:c.edition,expectedCodedCompetencies:c.expectedTotal,
  expectedByVolume:{...c.volumeTotals},subjects,
  candidateMetadataRecords:recorded,notYetRecordedAtLeast:Math.max(0,c.expectedTotal-recorded),
  sourceVerifiedRecords:0,canonicallyMapped:0,approvedExamMappings:0,
  sourceFileHashVerified:false,independentCodeReview:false,
  globalCompetenciesAudited:false,aetcomAndSupplementalModulesAudited:false,
  pdfScan:scanEvidence,
  provisionalCandidatesMissingFromScan:unmatchedInScan,
  extractedCodesNotInCandidateLedger:extraFromScan,
  extractedUnknownPrintedPrefixes:ambiguousScanPrefixes,
  publishedCountReconciliationPassed:scan!==null&&
    extraFromScan.length===0&&unmatchedInScan.length===0&&
    recorded===c.expectedTotal&&
    subjects.every(s=>s.candidateMetadataRecords===s.expectedCodedCompetencies),
  complete:false,officialSyllabusCertified:false,coverageFraction:null,
  readinessInferred:false,learnerRelease:false,
  blockers:[
   'full-exact-code-inventory-not-independently-verified',
   'copyright-protected-citation-only-no-republication',
   'original-pdf-digest-and-edition-parity-not-verified',
   'global-and-aetcom-supplemental-competencies-not-audited',
   'source-identity-medical-rights-review-missing',
   'exam-specific-approval-and-independent-review-missing'
  ]
 };
}
