EXISTING = {
 'Leprosy': 'C-2de1b44e-ee2b-4ef4-a97d-5b4232a00d3b',
 'Sexually transmitted infections': 'C-44b483d9-c7f0-42c0-9482-ebca0067ca7c',
 'HIV infection': 'C-67c5fb8a-ff54-4768-b21e-a27cbc81600b',
 'Antiretroviral drugs': 'C-41135e3e-7002-4f7f-b27a-b03f47d53276',
 'Skin and soft tissue infections': 'C-bbcd6379-fa2f-40c3-89b9-7954d7fff370',
 'Antibacterial drugs': 'C-ffb2c2c6-ad9c-4361-8b73-f4aed539d128',
 'Shock': 'C-39ffe670-839b-4691-9aa9-186bcc20a865',
 'Osteomyelitis': 'C-281b5474-4826-4fbc-9f9c-78c4f4a0eb73',
 'Septic arthritis': 'C-d5c68e78-a0d8-41cb-a3e1-862f0f186feb',
 'Paget disease of bone': 'C-47b9d310-9b50-41e1-ab41-be38c372826e',
 'Bone tumours': 'C-ddae26a4-ac4e-4b40-a5fd-80fe35f59efa',
 'Peripheral nerve injury': 'C-378f2d4b-13eb-4334-a983-f46baf5cfe40',
 'Informed consent': 'C-326aa73a-ebb4-4be2-877f-a78be8715daa',
 'Non-opioid analgesics': 'C-d63eee28-ec75-45ce-9caf-26c14c6c4c95',
 'Substance use disorders': 'C-6345395e-86f2-4328-b1af-55cbc71c535d',
 'Sexual dysfunction': 'C-a723112f-132c-4cd6-b5e0-fb24de1bf903',
 'Basic life support': 'C-5e4feff5-7ba5-4dd9-89eb-0f1f8c48c5a8',
 'Oxygen therapy': 'C-07c074b3-34d3-4e07-84b1-49fb2ff7775f',
 'General anaesthetics': 'C-363e5b94-17a7-4bd3-b1e1-523d3bbf25b0',
 'Pain': 'C-418a472f-5e3d-4b0d-81e1-6aba1ac19596',
 'Blood products': 'C-82939e95-7c9f-4668-8f79-d55a253cd9cd',
 'PCPNDT Act': 'C-1dcae429-60bd-4f94-8e54-79cec0fa8ca5',
 'Age estimation': 'C-1deffc0c-8e8c-4f1a-99e9-0a2f2ee304d0',
 'Medical ethics': 'C-f0dac750-64ff-4f93-9acc-19231bb22d29',
 'Hand hygiene': 'C-baa5bc2c-7da4-40b2-a467-fdce95892577',
}
"""Combined concept specification v1 (2026-11-17) for Dermatology, Orthopaedics, Psychiatry, Anaesthesia
and Radiology: one acceptance; each concept lists only evidenced subjects (ADR-135). Unresolved or
amended printed codes (OR2. 2.9, PS 2.1*, PS9.2, ASS.4) stay on the source-exception track."""
SUBJECT = 'small-clinical'
SUBJECTS = ('dermatology', 'orthopaedics', 'psychiatry', 'anaesthesia', 'radiology')
SUBJECT_NAME = 'Dermatology, Orthopaedics, Psychiatry, Anaesthesia and Radiology'
BATCH_KIND = 'concept batch'
VERSION = 'v1'
CONCEPT_TYPES = ('structure', 'function', 'disorder', 'clinical-finding', 'investigation',
                 'clinical-skill', 'intervention', 'field')
EVIDENCED_SUBJECTS_ONLY = True
EXTRA_TEST_LABELS = r'|examination|smear|microscopy|imaging|radiographs|monitoring|evaluation'
C = []
def c(label, kind, system, links, aliases=(), expected=(), organs=(), task=None):
    d = {'label': label, 'aliases': list(aliases), 'system': system, 'links': links, 'extraSubjects': list(expected),
         'conceptType': kind, 'umbrella': False, 'organs': list(organs)}
    if task: d['task'] = task
    C.append(d)
S = lambda code, text: (code, text)
D, F, X, I, K, IV, ST, FI = 'disorder', 'function', 'field', 'investigation', 'clinical-skill', 'intervention', 'structure', 'clinical-finding'
G, SK, MS, NV, R, RP, IM = 'general', 'general', 'musculoskeletal', 'nervous', 'respiratory', 'reproductive', 'immune'
# ================= Dermatology
c('Acne vulgaris', D, SK, [('DR1.1', None), ('DR1.2', None)], ['Acne'], [], ['skin'])
c('Vitiligo', D, SK, [('DR 2.1', None)], [], [], ['skin'])
c('Psoriasis', D, SK, [('DR 3.1', None), ('DR3.2', None), ('DR3.3', None)], [], ['medicine'], ['skin'])
c('Lichen planus', D, SK, [('DR 4.1', None)], [], [], ['skin'])
c('Scabies', D, SK, [('DR5.1', None)], [], ['pediatrics', 'community-medicine'], ['skin'])
c('Pediculosis', D, SK, [('DR 6.1', None)], ['Lice infestation'], ['pediatrics'], ['skin'])
c('KOH mount', I, SK, [('DR7.1', None)], ['Potassium hydroxide mount'], ['microbiology'], ['skin'])
c('Dermatophytosis', D, SK, [('DR7.2', None)], ['Tinea'], ['microbiology'], ['skin'])
c('Viral skin infections', D, SK, [('DR8.1', None)], [], ['microbiology', 'pediatrics'], ['skin'])
c('Herpes simplex infection', D, SK, [('DR8.2', None)], [], ['microbiology'], ['skin'])
c('Varicella zoster infection', D, SK, [('DR8.3', None)], ['Herpes zoster', 'Chickenpox', 'Varicella'], ['microbiology', 'medicine', 'pediatrics'], ['skin'])
c('Viral warts', D, SK, [('DR8.4', None)], ['Warts', 'Verruca'], [], ['skin'])
c('Molluscum contagiosum', D, SK, [('DR8.5', None)], [], ['pediatrics'], ['skin'])
c('Leprosy', D, SK, [('DR9.1', None), ('DR9.2', None), ('DR9.5', None), ('DR9.6', None)])
c('Slit-skin smear', I, SK, [('DR9.3', None)], ['Slit skin smear'], ['microbiology'], ['skin'])
c('Lepra reactions', D, SK, [('DR9.4', None)], ['Leprosy reactions'], [], ['skin'])
c('Sexually transmitted infections', D, RP, [('DR10.1', None), ('DR10.5', None)])
c('Syphilis', D, RP, [('DR10.2', None), ('DR10.6', None)], [], ['microbiology'])
c('Genital ulcer disease', D, RP, [S('DR10.3', 'Differentiate chancroid and genital herpes and select appropriate diagnostic tests.'), ('DR10.4', None)], ['Genital ulcers'], [])
c('Lymphogranuloma venereum and donovanosis', D, RP, [('DR10.7', None)], [], ['microbiology'])
c('Urethritis', D, RP, [('DR10.8', None), ('DR10.9', None)], ['Urethral discharge syndrome'], ['microbiology'])
c('Vaginal discharge', FI, RP, [('DR10.10', None)], ['Leucorrhoea'], ['obstetrics-gynaecology'])
c('Genital warts', D, RP, [('DR 10.11', None)], ['Condylomata acuminata', 'Anogenital warts'], [], ['skin'])
c('HIV infection', D, IM, [S('DR11.1', 'Use clinical findings and targeted tests to assess representative HIV-associated dermatoses.')])
c('Antiretroviral drugs', IV, IM, [S('DR11.2', 'Recognise representative cutaneous reactions to antiretroviral drugs and justify initial assessment.')])
c('Eczema', D, SK, [('DR12.1', None), ('DR12.2', None)], ['Dermatitis'], ['pediatrics'], ['skin'])
c('Erythroderma', D, SK, [('DR12.3', None)], ['Exfoliative dermatitis'], [], ['skin'])
c('Cutaneous drug reactions', D, SK, [('DR12.4', None), ('DR12.5', None)], ['Adverse cutaneous drug reactions'], ['pharmacology', 'medicine'], ['skin'])
c('Autoimmune blistering diseases', D, SK, [('DR13.1', None), ('DR 13.2', None)], ['Vesiculobullous disorders'], [], ['skin'])
c('Urticaria', D, SK, [('DR14.1', None), ('DR14.2', None)], ['Hives'], ['medicine'], ['skin'])
c('Dermographism', FI, SK, [('DR14.3', None)], ['Dermatographism'], [], ['skin'])
c('Skin and soft tissue infections', D, SK, [('DR15.1', None), ('DR15.3', None)])
c('Antibacterial drugs', IV, G, [S('DR15.2', 'Compare indications and adverse effects of topical and systemic antibacterial agents used for pyoderma.')])
# ================= Orthopaedics
c('Trauma systems', X, G, [('OR1.1', None)], ['Trauma care systems'], ['surgery'])
c('Shock', D, 'cardiovascular', [('OR1.2', None)])
c('Soft tissue injuries', D, MS, [('OR1.3', None)], [], ['surgery'])
c('Joint dislocations', D, MS, [('OR1.4', None), ('OR1.5', None)], ['Dislocations'], [], ['joint'])
c('Advances in orthopaedics', X, MS, [('OR1.6', None)], [])
c('Clavicle fracture', D, MS, [('OR2.1', None)], ['Fracture clavicle'], [], ['bone'])
c('Proximal humerus fracture', D, MS, [('OR2.2', None)], [], [], ['bone'])
c('Non-opioid analgesics', IV, NV, [S('OR2.3', 'Choose and communicate an appropriate analgesic plan for a simulated patient with joint pain.')])
c('Humerus fractures', D, MS, [('OR2.4', None)], [], [], ['bone'])
c('Forearm fractures', D, MS, [('OR2.5', None)], [], [], ['bone'])
c('Distal radius fracture', D, MS, [('OR2.6', None)], [], [], ['bone'])
c('Pelvic fractures', D, MS, [('OR2.7', None)], ['Pelvic and acetabular fractures'], ['surgery'], ['bone'])
c('Spinal injuries', D, MS, [('OR2.8', None)], ['Spine trauma'], ['surgery'], ['spine'])
c('Fractures around the knee', D, MS, [('OR2.10', None)], [], [], ['bone'])
c('Femoral shaft fracture', D, MS, [('OR2.11', None)], ['Fracture shaft of femur'], [], ['bone'])
c('Leg and foot fractures', D, MS, [('OR 2.12', None)], [], [], ['bone'])
c('Ankle fractures', D, MS, [('OR2.13', None)], [], [], ['bone'])
c('Fracture complications', D, MS, [('OR 2.14', None)], ['Malunion and nonunion'], [], ['bone'])
c('Open fractures', D, MS, [('OR 2.15', None)], ['Compound fractures'], ['surgery'], ['bone'])
c('Paediatric fractures', D, MS, [('OR2.16', None)], ['Pediatric fractures'], ['pediatrics'], ['bone'])
c('Osteomyelitis', D, MS, [S('OR3.1', 'Distinguish acute, subacute and chronic osteomyelitis and justify investigation and management.'), ('OR3.3', None)])
c('Septic arthritis', D, MS, [S('OR3.1', 'Distinguish septic arthritis from osteomyelitis and justify investigation and management.'), ('OR3.2', None)])
c('Osteoarticular tuberculosis', D, MS, [('OR4.1', None)], ['Skeletal tuberculosis'], ['microbiology'], ['bone'])
c('Inflammatory arthritis', D, MS, [('OR5.1', None)], ['Inflammatory polyarthritis'], ['medicine'], ['joint'])
c('Degenerative spine disease', D, MS, [('OR6.1', None)], ['Spondylosis'], ['medicine'], ['spine'])
c('Osteoporosis', D, MS, [S('OR7.1', 'Explain the causes, findings, investigation and management of osteoporosis.')], [], ['medicine'], ['bone'])
c('Osteomalacia and rickets', D, MS, [S('OR7.1', 'Compare osteomalacia and rickets by cause, findings, investigation and management.')], [], ['pediatrics', 'medicine'], ['bone'])
c('Paget disease of bone', D, MS, [S('OR7.1', 'Compare Paget disease of bone with other metabolic bone disorders by findings and management.')])
c('Post-polio residual paralysis', D, MS, [('OR8.1', None)], ['PPRP'], ['pediatrics'])
c('Cerebral palsy', D, NV, [('OR9.1', None)], [], ['pediatrics'])
c('Bone tumours', D, MS, [('OR10.1', None)])
c('Peripheral nerve injury', D, NV, [('OR11.1', None)])
c('Musculoskeletal deformities', D, MS, [('OR12.1', None)], [], ['pediatrics'])
c('Casting and splinting', K, MS, [('OR13.1', None)], ['Plaster application'], ['surgery'])
c('Polytrauma resuscitation', K, G, [('OR13.2', None)], [], ['surgery', 'anaesthesia'])
c('Prognosis counselling', K, G, [('OR14.1', None), ('OR14.3', None)], [])
c('Informed consent', K, G, [S('OR14.2', 'Counsel a simulated patient on benefits, risks, alternatives and consent for an orthopaedic procedure.'), S('AS1.3', 'Apply consent, confidentiality and benefit-risk principles to a simulated anaesthesia case.')])
c('Amputation', IV, MS, [('OR14.4', None)], ['Limb amputation'], ['surgery'])
# ================= Psychiatry
c('Classification of mental disorders', X, NV, [('PS 1.1', None)], ['Psychiatric classification'])
c('Psychiatric history taking', K, NV, [('PS1.2', None)], [])
c('Mental status examination', K, NV, [('PS1.3', None)], ['MSE'])
c('Substance use disorders', D, NV, [('PS 3.1', None)])
c('Schizophrenia', D, NV, [('PS 4.1', None)], [], ['medicine'])
c('Depression', D, NV, [('PS 5.1', None), ('PS 5.2', None)], ['Depressive disorder', 'Major depressive disorder'], ['medicine'])
c('Bipolar disorder', D, NV, [('PS 6.1', None)], ['Bipolar affective disorder'], [])
c('Anxiety disorders', D, NV, [('PS 7.1', None)], [], ['medicine'])
c('Stress-related disorders', D, NV, [('PS8.1', None)], [], [])
c('Sexual dysfunction', D, RP, [('PS 9.1', None)])
c('Child and adolescent psychiatric disorders', D, NV, [('PS 10.1', None)], [], ['pediatrics'])
c('Intellectual disability', D, NV, [('PS11.1', None)], ['Intellectual developmental disorder'], ['pediatrics'])
c('Suicide risk assessment', K, NV, [('PS12.1', None)], [], ['medicine'])
c('Electroconvulsive therapy', IV, NV, [('PS 13.1', None)], ['ECT', 'Modified ECT'], ['anaesthesia'])
# ================= Anaesthesia
c('Anaesthesiology', X, G, [('AS1.1', None), ('AS1.2', None), ('AS1.4', None)], ['Anesthesiology'])
c('Basic life support', K, 'cardiovascular', [('AS2.1', None)])
c('Advanced life support', K, 'cardiovascular', [('AS2.2', None)], ['Advanced cardiac life support'], ['medicine'])
c('Preoperative assessment', K, G, [('AS3.1', None), ('AS3.2', None), ('AS3.3', None), ('AS3.4', None), ('AS3.5', None)], ['Pre-anaesthetic evaluation'], ['surgery'])
c('Premedication', IV, G, [('AS3.6', None)], ['Preanaesthetic medication'], ['pharmacology'])
c('General anaesthetics', IV, NV, [('AS4.1', None)])
c('Airway anatomy', ST, R, [('AS4.2', None)], [], ['anatomy'])
c('General anaesthesia', IV, G, [('AS4.3', None), ('AS4.4', None)], ['General anesthesia'], ['surgery'])
c('Intraoperative monitoring', I, G, [('AS4.5', None)], ['Anaesthesia monitoring'])
c('Day-care anaesthesia', IV, G, [('AS4.6', None)], ['Ambulatory anaesthesia'])
c('Anaesthesia outside the operating room', IV, G, [('AS4.7', None)], ['Remote-site anaesthesia'])
c('Regional anaesthesia', IV, NV, [('AS5.1', None), ('AS5.2', None), ('AS5.3', None), ('AS5.5', None), ('AS5.6', None)], ['Regional anesthesia'], ['surgery'])
c('Post-anaesthesia care', IV, G, [('AS6.1', None), ('AS6.2', None), ('AS6.3', None)], ['Recovery room care', 'PACU care'])
c('Intensive care unit', X, G, [('AS7.1', None), ('AS7.2', None), ('AS7.5', None)], ['ICU', 'Critical care'], ['medicine'])
c('Unconscious patient', FI, NV, [('AS7.3', None)], [], ['medicine'])
c('Mechanical ventilation', IV, R, [('AS7.4', None), ('AS11.6', None)], ['Ventilator management'], ['medicine'])
c('Pain', FI, NV, [('AS8.1', None)])
c('Pain management', IV, NV, [('AS8.2', None), ('AS8.3', None)], ['Analgesia'], ['medicine'])
c('Palliative care', IV, G, [('AS8.4', None), ('AS8.5', None)], [], ['medicine'])
c('Vascular access', K, 'cardiovascular', [('AS9.1', None), ('AS9.2', None)], ['Venous cannulation'], ['medicine', 'surgery'])
c('Perioperative fluid therapy', IV, G, [('AS9.3', None)], [], ['surgery'])
c('Blood products', ST, 'haematological', [('AS9.4', None)])
c('Patient safety in anaesthesia', X, G, [('AS10.1', None), ('AS10.2', None), ('AS10.3', None), ('AS10.4', None)], ['Perioperative safety'], ['surgery'])
c('Oxygen therapy', IV, R, [('AS11.1', None), ('AS11.2', None)])
c('Airway management', K, R, [('AS11.3', None), ('AS11.4', None), ('AS11.5', None)], [], ['medicine', 'pediatrics'])
# ================= Radiology
c('Imaging modalities', I, G, [('RD1.1', None)], ['Radiological imaging techniques'])
c('Imaging safety', K, G, [('RD2.1', None)], [])
c('Imaging selection', K, G, [('RD2.2', None), ('RD4.1', None)], ['Appropriate imaging requests'], ['medicine', 'surgery'])
c('Radiation biology', F, G, [('RD3.1', None)], ['Biological effects of radiation'])
c('Radiation protection', IV, G, [('RD3.2', None), ('RD3.3', None)], [], ['community-medicine'])
c('PCPNDT Act', X, RP, [('RD3.4', None)])
c('Critical care patient transport', K, G, [('RD4.2', None)], ['Intrahospital transport'], ['anaesthesia'])
c('Radiological-pathological correlation', I, G, [('RD4.3', None)], [])
c('Radiograph interpretation', I, G, [('RD5.1', None), ('RD5.3', None)], ['X-ray interpretation'], ['medicine', 'surgery'])
c('Age estimation', I, G, [('RD5.2', None)])
c('ICU chest radiographs', I, R, [('RD5.4', None)], [], ['anaesthesia'])
c('Patient preparation for imaging', K, G, [('RD6.1', None)], [])
c('Obstetric and gynaecological imaging', I, RP, [('RD7.1', None)], [], ['obstetrics-gynaecology'])
c('ENT imaging', I, R, [('RD7.2', None)], [], ['ent'])
c('Imaging in medical emergencies', I, G, [('RD7.3', None)], [], ['medicine'])
c('Imaging in surgical conditions', I, G, [('RD7.4', None)], [], ['surgery'])
c('Paediatric imaging', I, G, [('RD7.5', None)], ['Pediatric imaging'], ['pediatrics'])
c('Breast imaging', I, RP, [('RD7.6', None)], [], ['surgery'], ['breast'])
