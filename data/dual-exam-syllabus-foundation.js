// Editorial navigation scaffold, not a licensed syllabus extract or approved exam scope.
// These shared domain headings are organizational seeds, NOT NMC competency IDs,
// source-verified topic requirements, canonical medical concepts, or exam priorities.
const rows=[
 ['anatomy','Anatomy','preclinical',[
  ['gross','Gross and regional anatomy'],['neuro','Neuroanatomy'],['embryology','Embryology'],
  ['histology','Histology'],['clinical','Applied and imaging anatomy']]],
 ['physiology','Physiology','preclinical',[
  ['cellular','Cellular and general physiology'],['blood','Blood and body fluids'],['cardiorespiratory','Cardiovascular and respiratory physiology'],
  ['renal','Renal physiology'],['gastrointestinal','Gastrointestinal physiology'],['neuro','Neurophysiology'],
  ['endocrine','Endocrine and reproductive physiology']]],
 ['biochemistry','Biochemistry','preclinical',[
  ['metabolism','Metabolism and energetics'],['enzymes','Enzymes and regulation'],['molecular','Molecular biology and genetics'],
  ['nutrition','Nutrition and vitamins'],['clinical','Clinical biochemistry']]],
 ['pathology','Pathology','paraclinical',[
  ['general','General pathology'],['systemic','Systemic pathology'],['hematology','Hematopathology'],
  ['neoplasia','Neoplasia'],['laboratory','Laboratory and molecular pathology']]],
 ['pharmacology','Pharmacology','paraclinical',[
  ['general','General pharmacology'],['autonomic','Autonomic pharmacology'],['systems','Systemic pharmacology'],
  ['antimicrobials','Antimicrobials and chemotherapy'],['adverse','Adverse effects and toxicology']]],
 ['microbiology','Microbiology','paraclinical',[
  ['general','General microbiology and immunity'],['bacteriology','Bacteriology'],['virology','Virology'],
  ['mycology','Mycology'],['parasitology','Parasitology'],['infection-control','Infection prevention and diagnostic microbiology']]],
 ['forensic','Forensic Medicine and Toxicology','paraclinical',[
  ['medicolegal','Medical jurisprudence and documentation'],['injury','Forensic injury and death investigation'],
  ['toxicology','Toxicology'],['ethics','Ethics and professional responsibilities']]],
 ['community','Community Medicine','paraclinical',[
  ['epidemiology','Epidemiology'],['biostatistics','Biostatistics and research methods'],['prevention','Prevention and screening'],
  ['public-programmes','Public health programmes'],['environment','Environmental and occupational health'],
  ['health-systems','Health systems and population health']]],
 ['medicine','General Medicine','clinical',[
  ['cardiology','Cardiology'],['respiratory','Respiratory medicine'],['neurology','Neurology'],
  ['gastroenterology','Gastroenterology and hepatology'],['nephrology','Nephrology'],['endocrine','Endocrinology'],
  ['infectious','Infectious diseases'],['hematology','Hematology'],['rheumatology','Rheumatology'],
  ['emergency','Acute and emergency medicine']]],
 ['surgery','General Surgery','clinical',[
  ['principles','General and perioperative surgery'],['abdomen','Abdominal and gastrointestinal surgery'],
  ['trauma','Trauma and surgical emergencies'],['urology','Urology'],['endocrine','Endocrine and breast surgery'],
  ['vascular','Vascular surgery']]],
 ['obgyn','Obstetrics and Gynaecology','clinical',[
  ['antenatal','Antenatal and maternal care'],['intrapartum','Intrapartum care'],['postpartum','Postpartum care'],
  ['gynecology','Gynaecological conditions'],['reproduction','Reproductive health and contraception']]],
 ['pediatrics','Paediatrics','clinical',[
  ['growth','Growth and development'],['neonatology','Neonatology'],['nutrition','Paediatric nutrition and prevention'],
  ['general','Paediatric medical conditions'],['emergencies','Paediatric emergencies']]],
 ['ent','Otorhinolaryngology','clinical',[
  ['ear','Ear and hearing'],['nose','Nose and paranasal sinuses'],['throat','Throat and larynx'],
  ['head-neck','Head and neck disorders']]],
 ['ophthalmology','Ophthalmology','clinical',[
  ['optics','Ocular anatomy and optics'],['anterior','Anterior segment and lens'],['retina','Retina and vitreous'],
  ['glaucoma','Glaucoma'],['neuro','Neuro-ophthalmology and ocular emergencies']]],
 ['orthopedics','Orthopaedics','clinical',[
  ['trauma','Fractures and trauma'],['joints','Joint disorders'],['spine','Spine disorders'],
  ['pediatric','Paediatric orthopaedics'],['bone','Bone diseases and tumours']]],
 ['dermatology','Dermatology and Venereology','clinical',[
  ['inflammatory','Inflammatory dermatoses'],['infection','Skin infections and infestations'],
  ['systemic','Skin manifestations of systemic disease'],['venereology','Sexually transmitted infections']]],
 ['psychiatry','Psychiatry','clinical',[
  ['assessment','Psychiatric assessment'],['mood','Mood disorders'],['psychotic','Psychotic disorders'],
  ['anxiety','Anxiety and related disorders'],['substance','Substance use disorders'],
  ['sleep','Sleep and behavioural disorders']]],
 ['anesthesia','Anaesthesiology','clinical',[
  ['airway','Airway and ventilation'],['agents','Anaesthetic drugs'],['monitoring','Perioperative monitoring'],
  ['critical','Resuscitation and critical care'],['pain','Pain management']]],
 ['radiology','Radiodiagnosis','clinical',[
  ['principles','Imaging principles and safety'],['chest','Thoracic imaging'],['abdomen','Abdominal imaging'],
  ['neuro','Neuroimaging'],['musculoskeletal','Musculoskeletal imaging']]]
];
const subjects=rows.map(([subjectId,label,phase,domains])=>({
 subjectId,label,phase,domains:domains.map(([key,name])=>({domainId:subjectId+':'+key,label:name}))
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
