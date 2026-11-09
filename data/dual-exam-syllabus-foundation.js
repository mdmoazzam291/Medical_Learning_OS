// Editorial navigation scaffold, not a licensed syllabus extract or approved exam scope.
// These shared domain headings are organizational seeds, NOT NMC competency IDs,
// source-verified topic requirements, canonical medical concepts, or exam priorities.
import {SUBJECT_INDEX} from '../src/domain/subject-index.js';
// Derive ALL subject/module identifiers from the single owner-approved navigation
// blueprint. No alternate 19-subject tree, module names or concept ontology.
const preclinical=new Set(['anatomy','physiology','biochemistry']);
const paraclinical=new Set(['pathology','pharmacology','microbiology','forensic-medicine','community-medicine']);
const subjects=SUBJECT_INDEX.map(s=>({
 subjectId:s.id,label:s.label,
 phase:preclinical.has(s.id)?'preclinical':paraclinical.has(s.id)?'paraclinical':'clinical',
 domains:s.modules.map(m=>({domainId:s.id+':'+m.id,label:m.label}))
}));
const ids=subjects.map(s=>s.subjectId);
export default {
 schemaVersion:1,
 foundationVersion:'mbbs-dual-exam:editorial@1',
 status:'editorial-scaffold',
 subjects,
 sources:[
  {sourceId:'nmc-cbme-2024',issuer:'NMC',sourceVersion:'2024-09-12',sourceRole:'undergraduate-competency-reference',
   url:'https://www.nmc.org.in/wp-content/uploads/2026/02/12bCompetencyBasedMedicalEducationCBMECurriculum12092024.pdf'},
  {sourceId:'nbems-neetpg-2026',issuer:'NBEMS',sourceVersion:'2026-examination-bulletin-index',sourceRole:'exam-bulletin',
   url:'https://natboard.edu.in/viewnbeexam?exam=neetpg'},
  {sourceId:'aiims-inicet-2027',issuer:'AIIMS Examination Section',sourceVersion:'January-2027-portal',sourceRole:'exam-announcement',
   url:'https://www.aiimsexams.ac.in/'},
  {sourceId:'aiims-inicet-2025-brochure',issuer:'AIIMS Examination Section',sourceVersion:'July-2025-Part-A',sourceRole:'exam-prospectus',
   url:'https://docs.aiimsexams.ac.in/sites/2_PROSPECTUS%20PART-A%20INI-CET%20JULY%202025%20SESSION%20-%20UPDATED%2002.04.2025.pdf'}
 ],
 scopes:[
  {examId:'neet-pg',pathwayVersionId:'neet-pg:preparation@1',status:'editorial-scaffold',
   sourceIds:['nmc-cbme-2024','nbems-neetpg-2026'],subjectIds:[...ids],
   officialTopicListCertified:false,scopeApproved:false,priorityEvidenceStatus:'not-evaluated'},
  {examId:'ini-cet',pathwayVersionId:'ini-cet:preparation@1',status:'editorial-scaffold',
   sourceIds:['nmc-cbme-2024','aiims-inicet-2027','aiims-inicet-2025-brochure'],subjectIds:[...ids],
   officialTopicListCertified:false,scopeApproved:false,priorityEvidenceStatus:'not-evaluated'}
 ],
 // No second ontology or exam objectives: the existing Preparation Curriculum owns
 // reviewed mappings; canonical Medical Knowledge Graph concepts remain unique.
 conceptBindings:[],
 proposedExamObjectives:[],
 reviewedExamMappings:[]
};
