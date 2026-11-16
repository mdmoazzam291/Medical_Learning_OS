EXISTING = {
 'Biomedical waste management': 'C-2396a7f1-b588-46ef-bc75-dd354b8af35e',
 'Dietary counselling': 'C-8a5e96a6-b364-4e88-8266-a0516d3f3d16',
 'Nutrients': 'C-ff23a7a1-056b-4bae-a15e-13ad0edf7867',
 'Protein-energy malnutrition': 'C-57cd5641-239a-4526-91a8-e92d09dc5d1f',
 'Immunisation': 'C-b276a56d-46dd-46da-8d36-d996257c01af',
 'Contraception': 'C-c9154160-3a41-4767-928b-eddc29a19061',
 'Transmission of infection': 'C-60525ccd-c657-4e19-bdd1-6b852a860524',
 'National programmes for infectious diseases': 'C-506649ad-fb9c-4f16-ae7c-cab5dccb2cb5',
 'Essential medicines': 'C-11d939a5-7670-47bb-82df-fff773503064',
 'Mass disaster management': 'C-54c44fd0-1d3e-4dd2-8fb0-f67521a2754e',
 'Mental disorders': 'C-ba2f6710-93b6-47a1-8db1-9b121e3d64c4',
 'Vitamins': 'C-3b1bb622-41f0-4cef-83f3-6020dff8c1ce',
}
"""Community Medicine concept specification v1 (2026-11-17). ADR-134/135 rules; EXISTING reuses accepted
identities. Public health methods, programmes and services are modelled as field, investigation or
clinical-skill concepts named for the thing taught."""
SUBJECT = 'community-medicine'
SUBJECT_NAME = 'Community Medicine'
BATCH_KIND = 'concept batch'
VERSION = 'v1'
CONCEPT_TYPES = ('structure', 'function', 'disorder', 'clinical-finding', 'investigation',
                 'clinical-skill', 'intervention', 'field')
EVIDENCED_SUBJECTS_ONLY = True
EXTRA_TEST_LABELS = r'|assessment|screening|statistics|significance|measures|indicators|investigation'
C = []
def c(label, kind, system, links, aliases=(), expected=(), organs=(), task=None):
    d = {'label': label, 'aliases': list(aliases), 'system': system, 'links': links, 'extraSubjects': list(expected),
         'conceptType': kind, 'umbrella': False, 'organs': list(organs)}
    if task: d['task'] = task
    C.append(d)
S = lambda code, text: (code, text)
D, F, X, I, K, IV, ST = 'disorder', 'function', 'field', 'investigation', 'clinical-skill', 'intervention', 'structure'
G = 'general'
# ---- Health, disease and prevention
c('Public health', X, G, [('CM1.1', None), ('CM20.1', None), ('CM 20.3', None)])
c('Concept of health', F, G, [('CM1.2', None)], [])
c('Disease causation', F, G, [('CM1.3', None)], ['Models of disease causation'])
c('Natural history of disease', F, G, [('CM1.4', None)])
c('Levels of prevention', IV, G, [('CM1.5', None)], ['Levels of disease prevention'])
c('Health promotion', IV, G, [('CM1.6', None), ('CM4.2', None)])
c('Health indicators', I, G, [('CM1.7', None)])
c('Demography', X, G, [('CM1.8', None), ('CM9.1', None), ('CM9.4', None)], [])
c('Health communication', K, G, [('CM1.9', None)])
c('Doctor-patient relationship', K, G, [('CM1.10', None)], [], ['psychiatry', 'medicine'])
# ---- Social and behavioural
c('Clinico-social assessment', K, G, [('CM2.1', None)], ['Clinico-social case study'])
c('Family health assessment', K, G, [('CM2.2', None)], [])
c('Health-care seeking behaviour', F, G, [('CM2.3', None)], ['Health-seeking behaviour'])
c('Social determinants of health', F, G, [('CM2.4', None)])
c('Social security', IV, G, [('CM2.5', None)], ['Social protection'])
# ---- Environmental health
c('Environmental health', X, G, [('CM3.1', None)])
c('Water purification', IV, G, [('CM3.2', None)], ['Safe water supply'])
c('Waterborne diseases', D, 'gastrointestinal', [('CM3.3', None)], [], ['microbiology'])
c('Excreta and refuse disposal', IV, G, [('CM3.4', None)], [])
c('Housing standards', X, G, [('CM3.5', None)], ['Healthy housing'])
c('Vector-borne diseases', D, G, [('CM3.6', None)], [], ['microbiology', 'medicine'])
c('Medical entomology', X, G, [('CM3.7', None)], ['Public health vectors'], ['microbiology'])
c('Insecticides and rodenticides', IV, G, [('CM3.8', None)], [])
# ---- Health education and programme evaluation
c('Health education', IV, G, [('CM4.1', None), ('CM 4.4', None)])
c('Health programme evaluation', I, G, [('CM4.3', None)], [])
# ---- Nutrition
c('Nutrients', ST, G, [('CM5.1', None)])
c('Nutritional assessment', I, G, [('CM5.2', None), ('CM5.9', None)], [], ['pediatrics', 'medicine'])
c('Protein-energy malnutrition', D, G, [S('CM5.3', 'Compare the epidemiology, assessment and prevention of protein-energy malnutrition in the community.')])
c('Micronutrient deficiencies', D, G, [S('CM5.3', 'Compare the epidemiology and prevention of iron, zinc, iodine and vitamin deficiencies in the community.')], ['Micronutrient malnutrition'], ['pediatrics', 'medicine'])
c('Dietary counselling', K, G, [('CM5.4', None), ('CM 5.10', None), ('CM5.11', None), ('CM 5.14', None), ('CM 5.15', None), ('CM 5.20', None), ('CM 5.21', None)])
c('Nutrition surveillance', I, G, [('CM5.5', None)], [])
c('National nutrition programmes', X, G, [('CM5.6', None)], [], ['pediatrics'])
c('Food hygiene', IV, 'gastrointestinal', [('CM5.7', None)], [])
c('Food fortification', IV, G, [S('CM5.8', 'Compare food fortification methods and their public health uses.')], ['Fortification'])
c('Food adulteration', D, G, [S('CM5.8', 'Explain the functions and risks of food additives and the public health consequences of adulteration.')], [])
c('Breastfeeding', K, 'reproductive', [('CM5.12', None), ('CM 5.16', None), ('CM 5.17', None), S('CM 5.22', 'Counsel a simulated caregiver on breastfeeding and agree a feasible plan.')], ['Breast feeding'], ['pediatrics', 'obstetrics-gynaecology'])
c('Complementary feeding', K, G, [('CM 5.13', None), ('CM 5.18', None), S('CM 5.22', 'Counsel a simulated caregiver on complementary feeding and agree a feasible plan.')], ['Weaning'], ['pediatrics'])
c('Food labelling', X, G, [('CM 5.19', None)], ['Nutrition labelling'])
# ---- Biostatistics, epidemiology and research
c('Research methodology', X, G, [('CM6.1', None), ('CM 7.10', None)], ['Research methods'], ['pharmacology'])
c('Biostatistics', X, G, [('CM6.2', None), ('CM 6.5', None), ('CM 6.6', None), ('CM7.9', None)], ['Medical statistics'])
c('Tests of significance', I, G, [('CM6.3', None)], ['Hypothesis testing'])
c('Sampling methods', I, G, [('CM6.4', None)], ['Sampling'])
c('Epidemiology', X, G, [('CM7.1', None)])
c('Transmission of infection', F, G, [('CM7.2', None)])
c('Sources of epidemiological data', X, G, [('CM7.3', None)], [])
c('Measures of morbidity and mortality', I, G, [('CM7.4', None)], [])
c('Epidemiological study designs', X, G, [('CM7.5', None)], ['Study designs'])
c('Screening for disease', I, G, [('CM7.6', None)], ['Population screening'], ['medicine'])
c('Outbreak investigation', I, G, [('CM7.7', None), ('CM8.4', None), ('CM20.2', None)], ['Epidemic investigation'], ['microbiology'])
c('Association and causation', X, G, [('CM7.8', None)], ['Causal inference'])
c('Critical appraisal', K, G, [('CM 7.11', None)], ['Critical appraisal of literature'])
# ---- Disease control
c('Communicable disease control', IV, G, [('CM8.1', None)], [], ['microbiology', 'medicine'])
c('Non-communicable diseases', D, G, [('CM8.2', None)], ['NCDs'], ['medicine'])
c('National programmes for infectious diseases', X, G, [('CM8.3', None)])
c('Training of health workers', K, G, [('CM8.6', None)], [])
c('Health information systems', X, G, [('CM8.7', None)], ['HMIS'])
# ---- Demography and vital statistics
c('Vital statistics', I, G, [('CM9.2', None), ('CM9.7', None)], [])
c('Sex ratio', I, G, [('CM9.3', None)], [])
c('Population stabilisation', IV, G, [('CM9.5', None)], ['Population stabilization'])
c('National Population Policy', X, G, [('CM9.6', None)], [])
# ---- Reproductive, maternal and child health
c('Maternal and child health', X, G, [('CM10.1', None), ('CM10.3', None)], ['MCH'], ['obstetrics-gynaecology', 'pediatrics'])
c('High-risk approach', IV, G, [('CM10.2', None)], [], ['obstetrics-gynaecology', 'pediatrics'])
c('Safe motherhood', IV, 'reproductive', [S('CM10.4', 'Map safe-motherhood interventions across pregnancy and childbirth.')], [], ['obstetrics-gynaecology'])
c('Child survival', IV, G, [S('CM10.4', 'Map child-survival interventions across the newborn period and childhood.')], [], ['pediatrics'])
c('Immunisation', IV, 'immune', [S('CM10.5', 'Use current official documents to explain the Universal Immunization Programme.')])
c('Integrated Management of Neonatal and Childhood Illness', IV, G, [S('CM10.5', 'Use current official documents to explain integrated management of neonatal and childhood illness.')], ['IMNCI'], ['pediatrics'])
c('Contraception', IV, 'reproductive', [('CM10.6', None)])
c('Family welfare programme', X, G, [('CM10.7', None)], ['Family planning programme'], ['obstetrics-gynaecology'])
c('Adolescent health', X, G, [('CM10.8', None)], [], ['pediatrics'])
c('Gender and health', X, G, [('CM10.9', None)], [])
c('Reproductive and child health programme', X, G, [('CM 10.10', None)], ['RCH programme'], ['obstetrics-gynaecology', 'pediatrics'])
# ---- Occupational health
c('Occupational diseases', D, G, [('CM11.1', None)], ['Occupational illness'], ['medicine'])
c('Employees State Insurance', X, G, [('CM11.2', None)], ['ESI scheme'])
c('Occupational hazards', X, G, [('CM11.3', None)], [])
c('Ergonomics', X, G, [('CM11.4', None)])
c('Occupational health of healthcare workers', X, G, [('CM11.5', None)], [])
c('Occupational health services', IV, G, [('CM 11.6', None)], ['Industrial health services'])
# ---- Geriatrics
c('Geriatric health services', X, G, [('CM12.1', None)], [], ['medicine'])
c('Health problems of the elderly', D, G, [('CM12.2', None), ('CM12.3', None)], ['Geriatric health problems'], ['medicine'])
c('National Programme for Health Care of the Elderly', X, G, [('CM12.4', None)], ['NPHCE'])
c('Geriatric assessment', K, G, [('CM 12.5', None)], ['Comprehensive geriatric assessment'], ['medicine'])
# ---- Disaster, waste, mental health
c('Mass disaster management', IV, G, [('CM13.1', None), ('CM13.2', None), ('CM13.3', None), ('CM13.4', None), ('CM 13.5', None)])
c('Biomedical waste management', K, G, [('CM14.1', None), ('CM14.2', None), ('CM14.3', None), ('CM 14.4', None)])
c('Mental health', F, 'nervous', [('CM15.1', None)], ['Mental well-being'], ['psychiatry'])
c('Mental disorders', D, 'nervous', [('CM15.2', None), ('CM 15.4', None)])
c('National Mental Health Programme', X, G, [('CM15.3', None)], ['NMHP'], ['psychiatry'])
# ---- Planning, management and health systems
c('Health planning', X, G, [('CM16.1', None), ('CM16.2', None), ('CM16.4', None), ('CM8.5', None)])
c('Health management techniques', X, G, [('CM16.3', None)], [])
c('Health economics', X, G, [('CM 16.5', None)], ['Economic evaluation in health'])
c('Primary health care', IV, G, [('CM17.1', None), ('CM17.3', None)], [])
c('Community diagnosis', I, G, [('CM17.2', None)])
c('Sustainable Development Goals', X, G, [('CM17.4', None)], ['SDGs'])
c('Health care delivery system in India', X, G, [('CM17.5', None), ('CM 17.6', None)], [])
c('International health', X, G, [('CM18.1', None), ('CM 18.3', None)], [])
c('International health agencies', X, G, [('CM18.2', None)], [])
c('Essential medicines', X, G, [('CM19.1', None), ('CM19.2', None), ('CM19.4', None)])
c('Counterfeit medicines', X, G, [('CM19.3', None)], ['Spurious drugs', 'Falsified medicines'], ['pharmacology'])
c('Public health law', X, G, [('CM 20.4', None)], ['Public health legislation'])
