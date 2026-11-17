"""Source-exception concept batch: the 17 editorial exception rows (7 owner-accepted search aliases,
10 Surgery rows under owner-accepted heading labels) plus PE6.4 (official replacement tasks).
PY9.1 is already bound by the physiology v3 batch; PS9.2 is an official deletion and gets no objective.
Owner decision 2026-11-17: accept the 7 aliases, label SU27 'Vascular and lymphatic disorders', and
rewrite the 7 mode-mismatch drafts (SU24.3, SU27.1, SU27.4, SU27.6, SU27.7, OR2.9, AS5.4) as knowledge
objectives at the printed KH level. Wordings are original AI drafts; not clinical approval."""
EXISTING = {
 'Cervical cancer': 'C-e66b9721-0dd1-45c7-b80b-bd6e2be988cf',
 'Sexually transmitted infections': 'C-44b483d9-c7f0-42c0-9482-ebca0067ca7c',
 'Delirium': 'C-6c15b72e-9078-4a50-8103-8cd7da321578',
 'Dementia': 'C-7932594e-e1b7-42ab-afb0-2c62a1f7b990',
 'Gangrene': 'C-8df81be3-aa74-4e43-90ca-694f1c33efdc',
 'Amputation': 'C-5bc44284-6703-42d4-9045-6b0d250157bc',
 'Deep vein thrombosis': 'C-f01f28ba-14f3-4c4a-b4c6-1f1c7efc612a',
 'Varicose veins': 'C-e00716b0-86e8-400f-88ca-909de854625f',
 'Lymphadenopathy': 'C-5d0d416e-3b30-441c-9290-d4ffb1e65ea1',
 'Femoral neck fracture': 'C-9583a4d9-e46d-4ddf-b6b3-1daa832f0268',
 'Regional anaesthesia': 'C-325ccfa8-97bc-4139-b9dc-6c25703fca32',
}
SUBJECT = 'surgery'
SUBJECTS = ('biochemistry', 'pathology', 'microbiology', 'forensic-medicine', 'psychiatry', 'surgery', 'orthopaedics', 'anaesthesia', 'pediatrics')
SUBJECT_NAME = 'Source-exception'
BATCH_KIND = 'concept batch'
VERSION = 'source-exceptions-v1'
CONCEPT_TYPES = ('structure', 'function', 'disorder', 'clinical-finding', 'investigation',
                 'clinical-skill', 'intervention', 'field')
EVIDENCED_SUBJECTS_ONLY = True
EXTRA_TEST_LABELS = r'|examination'
SCOPE_CODES = ('14.1', 'PA.29.1', 'MI 8.', 'FM2:12', 'PS 2.1*', 'SU24.1', 'SU24.2', 'SU24.3', 'SU27.1', 'SU27.2',
               'SU27.3', 'SU27.4', 'SU27.5', 'SU27.6', 'SU27.7', 'SU27.8', 'OR2. 2.9', 'ASS.4', 'PE6.4')
C = []
def c(label, kind, system, links, aliases=(), expected=(), organs=(), task=None):
    d = {'label': label, 'aliases': list(aliases), 'system': system, 'links': links, 'extraSubjects': list(expected),
         'conceptType': kind, 'umbrella': False, 'organs': list(organs)}
    if task: d['task'] = task
    C.append(d)
S = lambda code, text: (code, text)
D, F, X, I, K, IV, ST = 'disorder', 'function', 'field', 'investigation', 'clinical-skill', 'intervention', 'structure'
G, CV, GI, RP, EN, MS, NV, IM = 'general', 'cardiovascular', 'gastrointestinal', 'reproductive', 'endocrine', 'musculoskeletal', 'nervous', 'immune'

c('Laboratory equipment and biosafety', X, G, [S('14.1', 'Explain the purpose of common laboratory equipment and use a simulated workflow to identify safe practice, biological hazards and waste handling needs.')], ['Laboratory safety'])
c('Cervical cancer', D, RP, [S('PA.29.1', 'Connect cervical carcinoma risk and pathogenesis with pathological changes, screening, diagnosis and disease progression in case examples.')])
c('Sexually transmitted infections', D, RP, [S('MI 8.', 'Explain when syndromic assessment of a sexually transmitted infection can guide initial care and discuss its limitations in case examples.')])
c('Mortuary and embalming', X, G, [S('FM2:12', 'Describe mortuary organization and the facilities needed for post-mortem work, then explain the purpose and principles of embalming.')], ['Embalming'])
c('Delirium', D, NV, [S('PS 2.1*', 'Describe the clinical features, common causes and course of delirium and distinguish it from dementia.')])
c('Dementia', D, NV, [S('PS 2.1*', 'Describe the clinical features, common causes and course of dementia and distinguish it from delirium.')])
c('Pancreatitis', D, GI, [S('SU24.1', 'Use a pancreatitis case to explain presentation, investigation choices, prognostic assessment and management principles.'),
                          S('SU24.3', 'Describe the principles of investigating and managing pancreatitis and explain how the findings guide treatment decisions.')],
  ['Acute pancreatitis', 'Chronic pancreatitis'], organs=['pancreas'])
c('Pancreatic endocrine tumours', D, EN, [S('SU24.2', 'Compare representative pancreatic endocrine tumour presentations and explain investigation, prognosis and management principles.'),
                                          S('SU24.3', 'Describe the principles of investigating and managing pancreatic endocrine tumours and how they differ from those for pancreatitis.')],
  ['Pancreatic neuroendocrine tumours'], organs=['pancreas'])
c('Peripheral arterial disease', D, CV, [S('SU27.1', 'Describe the causes, pathophysiology, clinical features, investigation and treatment principles of occlusive arterial disease.')],
  ['Occlusive arterial disease'])
c('Peripheral vascular examination', K, CV, [S('SU27.2', 'Demonstrate a structured vascular examination and explain how the findings guide the choice of investigations.')])
c('Vasospastic disorders', D, CV, [S('SU27.3', 'Compare vasospastic presentations and explain investigation choices and management principles using clinical cases.')], ['Raynaud phenomenon'])
c('Gangrene', D, CV, [S('SU27.4', 'Describe the types of gangrene, their causes and clinical features, and the principles of their management.')])
c('Amputation', IV, MS, [S('SU27.4', 'Describe the indications for amputation, the choice of level and the principles of postoperative care.')])
c('Lower limb venous system', ST, CV, [S('SU27.5', 'Explain lower-limb venous anatomy and use diagrams to relate superficial, deep and communicating veins to clinical assessment.')])
c('Deep vein thrombosis', D, CV, [S('SU27.6', 'Describe the pathophysiology, clinical features, investigation and management principles of deep vein thrombosis.')])
c('Varicose veins', D, CV, [S('SU27.6', 'Describe the pathophysiology, clinical features, investigation and management principles of varicose veins.')])
c('Lymphoedema', D, IM, [S('SU27.7', 'Describe the causes, clinical features, investigation and management principles of lymphoedema.')])
c('Lymphangitis', D, IM, [S('SU27.7', 'Describe the causes, clinical features and management principles of lymphangitis.')])
c('Lymphadenopathy', D, IM, [S('SU27.7', 'Describe how lymphoma can present as lymph node enlargement and the principles of its surgical evaluation, including biopsy.')])
c('Lymphatic system examination', K, IM, [S('SU27.8', 'Demonstrate a structured lymphatic examination, describe findings and explain their relevance to the differential diagnosis.')])
c('Femoral neck fracture', D, MS, [S('OR2. 2.9', 'Describe the mechanism of injury, clinical features, investigation and management principles of femoral neck fractures, including their functional consequences.')])
c('Intertrochanteric fracture', D, MS, [S('OR2. 2.9', 'Describe the mechanism of injury, clinical features, investigation and management principles of intertrochanteric fractures, including their functional consequences.')])
c('Regional anaesthesia', IV, NV, [S('ASS.4', 'Describe the drugs and adjuncts used in regional anaesthesia, their intended roles and the precautions for their safe use.')])
c('Adolescent sexuality', F, RP, [S('PE6.4', 'Describe adolescent sexuality in an age-appropriate clinical education discussion.')])
c('Sexual orientation and gender identity', F, G, [S('PE6.4', 'Distinguish sexual orientation and gender identity and explain diversity in both using respectful clinical language.')])
