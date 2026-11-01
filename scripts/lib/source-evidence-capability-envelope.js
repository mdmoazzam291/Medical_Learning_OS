import {canonicalize,digestCanonical} from '../../src/domain/canonical-integrity.js';
import {digestSourceRowPackage} from '../../src/domain/source-row-evidence.js';
import {prepareSourceEvidenceStagingRequest} from '../../src/domain/source-evidence-staging.js';
import {platformFixture} from './source-evidence-platform-fixture.js';
export async function capabilityEnvelope(){
 const p={packageId:crypto.randomUUID(),packageVersion:1,cases:[{caseId:'capability',caseVersion:1,sourceSha256:'a'.repeat(64),sourceEdition:'platform-fixture',appearance:{pdfPage:1,rowOrdinal:1,rotation:0,bboxMilliPoints:[0,0,1,1],rawCellSha256:'b'.repeat(64)},interpretation:{proposedIdentity:null,relation:'unresolved',rationaleSha256:'c'.repeat(64)}}]};
 const m=await digestSourceRowPackage(p),b=await prepareSourceEvidenceStagingRequest({...p,requestId:crypto.randomUUID(),expectedPackageDigest:m.packageDigest},platformFixture.owner),{packageDigest,...manifest}=m,r={contractId:'source-evidence-staging-receipt-v1',receiptId:crypto.randomUUID(),...b,recordedAt:new Date().toISOString(),sourceReviewOnly:true,clinicalApproved:false,rightsApproved:false,examScopeApproved:false,learnerRelease:false};
 return {p,b,args:[platformFixture.owner,platformFixture.session,canonicalize(p),canonicalize({contractId:'source-row-package-evidence-v1',...manifest}),b,canonicalize(r),canonicalize({...r,receiptDigest:(await digestCanonical(r)).digestHex})]};
}
