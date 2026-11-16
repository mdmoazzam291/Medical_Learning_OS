EXISTING = {
 'Immunity': 'C-76801578-01e8-4b7d-a643-c07e25b2689e',
 'Immunoglobulins': 'C-2608186d-e7fa-45e9-9687-394d32a9d741',
 'Host response to infection': 'C-e0f02828-d619-4703-b154-120f28014a3d',
 'Hypersensitivity reactions': 'C-c7c918ab-cefe-435f-8e16-0a0b1dbb5fdc',
 'Autoimmunity': 'C-cfbebd88-b509-4118-a1a6-3faa3fd8b39b',
 'Transplant rejection': 'C-8a4b7395-0b9f-4511-a857-b6ddcf704121',
 'Tumour immunity': 'C-08f0d5b2-db8f-4cfc-b64d-44e5aee18c2a',
 'Rheumatic fever': 'C-804459af-a405-45e6-ab32-c4af65eda2d4',
 'Infective endocarditis': 'C-1f5000e4-df91-45e6-884f-a30a628f4f14',
 'Anaemia': 'C-f9d4f7fe-fe76-41cd-843f-4c9b9efd6bcb',
 'Malaria': 'C-eb68b0c6-88ff-4df8-9d4e-c8f96b44ea4a',
 'HIV infection': 'C-67c5fb8a-ff54-4768-b21e-a27cbc81600b',
 'Diarrhoea': 'C-e735a8bd-0002-4258-b4aa-aacebef784e0',
 'Viral hepatitis': 'C-9c9de011-3521-424b-9bcf-822de0afabca',
 'Osteomyelitis': 'C-281b5474-4826-4fbc-9f9c-78c4f4a0eb73',
 'Leprosy': 'C-2de1b44e-ee2b-4ef4-a97d-5b4232a00d3b',
 'Meningitis': 'C-d76a7ddf-2be1-4ab2-a618-90a5d39a8305',
 'Pneumonia': 'C-610bc030-3ae1-4bb2-9ad6-2980b096993d',
 'Polymerase chain reaction': 'C-c96995ff-a113-4d60-ae5c-e7b137770eac',
 'Cerebrospinal fluid': 'C-8127ea27-445e-40bc-98d0-09b86310d74b',
}
"""Microbiology concept specification v1 (2026-11-16). ADR-134/135 rules; EXISTING reuses accepted
identities. Row "MI 8." (unresolved printed code) stays on the source-exception track."""
SUBJECT = 'microbiology'
SUBJECT_NAME = 'Microbiology'
BATCH_KIND = 'concept batch'
VERSION = 'v1'
CONCEPT_TYPES = ('structure', 'function', 'disorder', 'clinical-finding', 'investigation',
                 'clinical-skill', 'intervention', 'field')
EVIDENCED_SUBJECTS_ONLY = True
EXTRA_TEST_LABELS = r'|staining|examination|culture|serological|susceptibility|diagnosis of infection'
C = []
def c(label, kind, system, links, aliases=(), expected=(), organs=(), task=None):
    d = {'label': label, 'aliases': list(aliases), 'system': system, 'links': links, 'extraSubjects': list(expected),
         'conceptType': kind, 'umbrella': False, 'organs': list(organs)}
    if task: d['task'] = task
    C.append(d)
S = lambda code, text: (code, text)
D, F, X, I, K, ST, FI, IV = 'disorder', 'function', 'field', 'investigation', 'clinical-skill', 'structure', 'clinical-finding', 'intervention'
G, H, IM, GI, R, CV, RN, RP, MS, NV = 'general', 'haematological', 'immune', 'gastrointestinal', 'respiratory', 'cardiovascular', 'renal', 'reproductive', 'musculoskeletal', 'nervous'
# ---- General microbiology, specimens and communication
c('Microbiology', X, G, [('MI 1.1', None)])
c('Microorganisms', ST, G, [('MI 1.2', None)], ['Microbes'])
c('Polymerase chain reaction', I, G, [('MI 1.3', None)])
c('Laboratory diagnosis of infection', I, G, [('MI 1.4', None), ('MI 9.3', None)], ['Microbiological diagnosis'], ['pathology', 'medicine'], task='interpretation')
c('Microbiological specimen collection', K, G, [('MI 1.5', None), ('MI 1.6', None), ('MI 1.7', None)], ['Specimen collection for microbiology'])
c('Diagnostic test counselling', K, G, [('MI 1.8', None)], ['Pre-test and post-test counselling'], ['medicine'])
c('Patient confidentiality', K, G, [('MI 1.9', None)], ['Medical confidentiality'], ['forensic-medicine'])
c('Gram staining', I, G, [S('MI 1.10', 'Perform Gram staining on approved teaching material and report the findings.')], ['Gram stain'])
c('Ziehl-Neelsen staining', I, G, [S('MI 1.10', 'Perform Ziehl-Neelsen staining on approved teaching material and report the findings.')], ['ZN stain', 'Acid-fast staining'])
c('Stool examination', I, GI, [S('MI 1.10', 'Perform routine stool examination on approved teaching material.'), ('MI 4.4', None)], ['Stool microscopy'], ['pathology'])
c('Transmission of infection', F, G, [('MI 1.11', None)], ['Modes of transmission'], ['community-medicine'])
c('Sterilisation', IV, G, [S('MI 1.12', 'Compare the mechanisms, applications and quality controls of physical and chemical methods of sterilisation.')], ['Sterilization'], ['surgery'])
c('Disinfection', IV, G, [S('MI 1.12', 'Compare the mechanisms and applications of disinfectants and antiseptics.'), ('MI 1.13', None)], ['Disinfectants'], ['surgery', 'community-medicine'])
# ---- Immunology
c('Immunity', F, IM, [('MI 2.1', None)])
c('Immune system', ST, IM, [S('MI 2.2', 'Map the organs and cells of the immune system and their roles.')], [], ['pathology'])
c('Complement system', F, IM, [S('MI 2.2', 'Explain how antigens, antibodies and complement interact, including complement activation pathways.')], ['Complement'])
c('Humoral immunity', F, IM, [S('MI 2.3', 'Explain antibody-mediated effector mechanisms during representative infections.')], ['Antibody-mediated immunity'])
c('Cell-mediated immunity', F, IM, [S('MI 2.3', 'Explain cell-mediated effector mechanisms during representative infections.')], ['Cellular immunity'])
c('Host response to infection', F, IM, [('MI 2.4', None)])
c('Serological tests', I, IM, [('MI 2.5', None)], ['Immunoassays', 'Serology'], ['pathology'])
c('Immunisation', IV, IM, [S('MI 2.6', 'Compare active and passive immunisation and their uses.')], ['Immunization', 'Immunoprophylaxis'], ['community-medicine', 'pediatrics'])
c('Herd immunity', F, IM, [S('MI 2.6', 'Explain how population immunity affects transmission.')], ['Population immunity'], ['community-medicine'])
c('Hypersensitivity reactions', D, IM, [S('MI 2.7', 'Compare types of hypersensitivity and select representative laboratory investigations.')])
c('Autoimmunity', D, IM, [S('MI 2.7', 'Explain autoimmunity and select representative laboratory investigations.')])
c('Immunodeficiency', D, IM, [S('MI 2.7', 'Compare primary and secondary immunodeficiencies and select representative laboratory investigations.')], ['Immunodeficiency disorders'], ['pediatrics', 'medicine'])
c('Transplant rejection', D, IM, [S('MI 2.8', 'Explain graft recognition and its implications for transplant management.')])
c('Tumour immunity', F, IM, [S('MI 2.8', 'Explain tumour surveillance and immune escape and their implications for management.')])
# ---- Cardiovascular and blood
c('Rheumatic fever', D, CV, [('MI 3.1', None)])
c('Infective endocarditis', D, CV, [('MI3.2', None), ('MI 3.4', None)])
c('Blood culture', I, CV, [('MI 3.3', None)], [], ['medicine'])
c('Pyrexia of unknown origin', FI, G, [('MI 3.5', None)], ['PUO', 'Fever of unknown origin', 'FUO'], ['medicine'])
c('Enteric fever', D, GI, [('MI 3.6', None), ('MI 3.7', None), ('MI 3.8', None)], ['Typhoid fever', 'Typhoid'], ['medicine', 'pediatrics'])
c('Anaemia', D, H, [S('MI 3.9', 'Classify infectious causes of anaemia by mechanism: blood loss, haemolysis and impaired production.')])
c('Hookworm infection', D, GI, [('MI 3.10', None)], ['Ancylostomiasis'], ['medicine', 'pediatrics'])
c('Malaria', D, H, [S('MI 3.11', 'Compare malaria parasites by morphology, life cycle, presentation, tests and prevention.'), ('MI 3.12', None)])
c('Visceral leishmaniasis', D, H, [S('MI 3.11', 'Describe the morphology, life cycle, presentation, diagnosis and prevention of visceral leishmaniasis.')], ['Kala-azar'], ['medicine'])
c('Lymphatic filariasis', D, H, [S('MI 3.11', 'Describe the morphology, life cycle, presentation, diagnosis and prevention of lymphatic filariasis.')], ['Filariasis'], ['medicine', 'community-medicine'])
c('HIV infection', D, IM, [('MI 3.13', None)])
# ---- Gastrointestinal and hepatobiliary
c('Diarrhoea', FI, GI, [S('MI 4.1', 'Distinguish infectious diarrhoea from dysentery and food poisoning and match representative organisms to each.'), ('MI 4.2', None)])
c('Dysentery', D, GI, [('MI 4.3', None)], [], ['medicine', 'pediatrics'])
c('Food poisoning', D, GI, [('MI 4.5', None)], ['Foodborne illness'], ['community-medicine'])
c('Helicobacter pylori infection', D, GI, [('MI 4.6', None)], ['H. pylori infection'], ['medicine'], ['stomach'])
c('Viral hepatitis', D, GI, [('MI 4.7', None), ('MI 4.8', None), ('MI 4.9', None)])
# ---- Musculoskeletal and skin
c('Anaerobic infections', D, G, [('MI 5.1', None)], [], ['surgery'])
c('Osteomyelitis', D, MS, [S('MI 5.2', 'Compare representative microbial causes of osteomyelitis and select tests by mechanism.')])
c('Septic arthritis', D, MS, [S('MI 5.2', 'Compare representative microbial causes of septic arthritis and select tests by mechanism.')], ['Infective arthritis'], ['orthopaedics'], ['joint'])
c('Skin and soft tissue infections', D, 'general', [('MI 5.3', None)], ['SSTI'], ['dermatology', 'surgery'], ['skin'])
c('Infectious rashes', FI, 'general', [('MI 5.4', None)], ['Exanthems'], ['dermatology', 'pediatrics'], ['skin'])
c('Leprosy', D, 'general', [S('MI 5.5', 'Compare the presentations and complications of leprosy and select appropriate sampling and laboratory tests.')])
c('Cutaneous tuberculosis', D, 'general', [S('MI 5.5', 'Compare representative presentations of cutaneous tuberculosis and atypical mycobacterial skin infection and select laboratory tests.')], ['Tuberculosis of skin'], ['dermatology'], ['skin'])
# ---- CNS
c('Meningitis', D, NV, [('MI 6.1', None), ('MI 6.3', None)])
c('Encephalitis', D, NV, [('MI 6.2', None)], [], ['medicine', 'pediatrics'], ['brain'])
# ---- Respiratory
c('Upper respiratory tract infections', D, R, [('MI 7.1', None), ('MI 7.4', None)], ['URTI'], ['ent', 'pediatrics'])
c('Lower respiratory tract infections', D, R, [('MI 7.2', None), ('MI 7.5', None)], ['LRTI'], ['medicine'])
c('Pneumonia', D, R, [('MI 7.3', None)])
# ---- Genitourinary
c('Reproductive tract infections', D, RP, [('MI 8.1', None)], ['Genital tract infections'], ['obstetrics-gynaecology'])
c('Sexually transmitted infections', D, RP, [('MI 8.2', None)], ['STI', 'Sexually transmitted diseases', 'STD'], ['dermatology', 'obstetrics-gynaecology'])
c('Urinary tract infection', D, RN, [('MI 8.4', None)], ['UTI'], ['medicine', 'pediatrics'])
# ---- Zoonoses and miscellaneous
c('Zoonoses', D, G, [('MI 9.1', None)], ['Zoonotic diseases'], ['community-medicine'])
c('Opportunistic infections', D, IM, [('MI 9.2', None)], [], ['medicine'])
c('Oncogenic infections', D, G, [('MI 9.4', None)], ['Infection-associated cancers'], ['pathology'])
c('Emerging infectious diseases', D, G, [('MI 9.5', None)], ['Emerging and re-emerging infections'], ['community-medicine'])
c('National programmes for infectious diseases', X, G, [('MI 9.6', None)], [], ['community-medicine'])
# ---- Healthcare-associated infection and AMR
c('Healthcare-associated infections', D, G, [('MI 10.1', None)], ['HAI', 'Nosocomial infections', 'Hospital-acquired infections'], ['medicine', 'surgery'])
c('Infection prevention and control', IV, G, [('MI 10.2', None)], ['IPC', 'Infection control'], ['community-medicine'])
c('Hand hygiene', K, G, [S('MI 10.3', 'Demonstrate hand hygiene in simulation.')], ['Hand washing'])
c('Personal protective equipment', K, G, [S('MI 10.3', 'Demonstrate donning and doffing of personal protective equipment in simulation.')], ['PPE'])
c('Biomedical waste management', K, G, [S('MI 10.3', 'Demonstrate biomedical waste segregation in simulation.')], ['Biomedical waste'], ['community-medicine'])
c('Environmental microbiological surveillance', I, G, [('MI 10.4', None)], [], ['community-medicine'])
c('Antimicrobial resistance', F, G, [('MI 10.5', None), S('MI 11.1', 'Compare genetic and phenotypic mechanisms of antimicrobial resistance.'), ('MI 11.2', None)], ['AMR'], ['pharmacology', 'medicine'])
c('Antimicrobial susceptibility testing', I, G, [S('MI 11.1', 'Interpret a representative antimicrobial susceptibility report.')], ['Antibiotic sensitivity testing'], ['pharmacology'])
c('Antimicrobial stewardship', IV, G, [('MI 11.3', None)], ['AMS', 'AMSP'], ['pharmacology', 'medicine'])
