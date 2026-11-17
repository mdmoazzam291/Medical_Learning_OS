EXISTING = {
 'Neuron': 'C-17785168-8736-405d-b35f-622ab672919f',
 'Synapse': 'C-e132c81b-ccd6-40da-b4b0-d36ffdcfe6fe',
 'Breast': 'C-c0a77490-b0e0-4c93-b1d5-22b424e8d0eb',
 'Hernia': 'C-e62bf46a-72e7-476e-b4a3-f371e81f5663',
 'Joint dislocations': 'C-880a6014-4afb-495a-84c9-5e83fd098057',
 'Osteoarthritis': 'C-ea76fcfe-9f1b-4789-950c-573fe5b5daaa',
 'Musculoskeletal deformities': 'C-d402514d-bdeb-49be-bdb8-6ced2c389f10',
 'Lymphadenopathy': 'C-5d0d416e-3b30-441c-9290-d4ffb1e65ea1',
 'Mechanics of breathing': 'C-622a38c1-e454-404e-af4d-7ee9762004dd',
 'Heart': 'C-63ed7978-7558-43e2-ad7c-c6de64135755',
 'Coronary circulation': 'C-cf863984-06c6-4dde-be84-02d8d42d2a99',
 'Ischaemic heart disease': 'C-a2adf544-5ee4-4719-a0ee-f8ab62dc4f46',
 'Cardiac conduction system': 'C-89898250-7d12-4e32-b496-9acf5ccf86d1',
 'Oesophagus': 'C-6329e2bb-7e91-4fb7-b224-b5aeaec9275f',
 'Chest radiograph': 'C-84182a33-36d3-433f-b9c7-eb63b3133e8e',
 'Facial nerve palsy': 'C-f0218df1-d3ae-4ae4-afd1-2c2cd3a6224b',
 'Pituitary gland': 'C-aab0f877-59bc-4753-a8df-a0457d082ab4',
 'Thyroid gland': 'C-c38e21df-0b56-408b-9824-7079a7949a9f',
 'Parathyroid glands': 'C-9f13c669-ef1b-4950-b382-34719d38383f',
 'Tonsillitis': 'C-d280c033-b01b-45b2-a9d0-5eaf156ee59e',
 'Sinusitis': 'C-4d256d05-6009-4931-987d-07482915fe2c',
 'External ear disorders': 'C-20d93ec9-615b-4c88-8e91-7f824bc8ecbf',
 'Acute suppurative otitis media': 'C-27ebe127-1aa4-4513-be55-50277fbc6c14',
 'Myringotomy': 'C-e98ea73a-122d-4834-99c7-136b8440a1b5',
 'Cataract': 'C-c7b5c09f-1c2f-487f-b9c9-81fc54048b53',
 'Retinal vascular occlusion': 'C-f97c8419-1017-4459-a2c1-67eae7d11a48',
}
"""Anatomy concept specification, part A v1 (2026-11-17): rows AN1-AN43 (general anatomy, limbs, thorax,
head and neck). Part B covers AN44-AN82. Evidenced subjects only (ADR-135)."""
import json as _j, re as _re
SUBJECT = 'anatomy'
SUBJECT_NAME = 'Anatomy'
BATCH_KIND = 'concept batch'
VERSION = 'part-a-v1'
_cat = _j.load(open('data/nmc-reference-catalogue.json'))
SCOPE_CODES = tuple(r['observedCode'] for r in _cat['references'] if r['subjectId'] == 'anatomy'
                    and int(_re.match(r'AN\s?(\d+)', r['observedCode']).group(1)) <= 43)
CONCEPT_TYPES = ('structure', 'function', 'disorder', 'clinical-finding', 'investigation',
                 'clinical-skill', 'intervention', 'field')
EVIDENCED_SUBJECTS_ONLY = True
EXTRA_TEST_LABELS = r'|radiograph|radiographic|angiograph|surface|barium|histology|examination'
C = []
def c(label, kind, system, links, aliases=(), expected=(), organs=(), task=None):
    d = {'label': label, 'aliases': list(aliases), 'system': system, 'links': links, 'extraSubjects': list(expected),
         'conceptType': kind, 'umbrella': False, 'organs': list(organs)}
    if task: d['task'] = task
    C.append(d)
S = lambda code, text: (code, text)
D, F, X, I, K, IV, ST, FI = 'disorder', 'function', 'field', 'investigation', 'clinical-skill', 'intervention', 'structure', 'clinical-finding'
G, H, IM, GI, R, CV, RN, RP, EN, MS, NV, SS = 'general', 'haematological', 'immune', 'gastrointestinal', 'respiratory', 'cardiovascular', 'renal', 'reproductive', 'endocrine', 'musculoskeletal', 'nervous', 'special-senses'
# --- General anatomy
c('Anatomical terminology', X, G, [('AN1.1', None)], [])
c('Bone', ST, MS, [('AN1.2', None), ('AN2.1', None), ('AN2.3', None)], [], [], ['bone'])
c('Ossification', F, MS, [('AN2.2', None), ('AN26.6', None)], [], [], ['bone'])
c('Cartilage', ST, MS, [('AN2.4', None)], [])
c('Joints', ST, MS, [('AN2.5', None), ('AN2.6', None)], ['Articulations'], [], ['joint'])
c('Skeletal muscle', ST, MS, [('AN3.1', None), ('AN3.2', None), ('AN3.3', None)], [], ['physiology'], ['muscle'])
c('Skin', ST, G, [('AN4.1', None), ('AN4.2', None), ('AN4.5', None)], [], [], ['skin'])
c('Fascia', ST, MS, [('AN4.3', None), ('AN4.4', None)], ['Superficial and deep fascia'])
c('Blood vessels', ST, CV, [('AN5.1', None), ('AN5.3', None), ('AN5.4', None), ('AN5.7', None), ('AN5.8', None)], [], ['physiology'])
c('Systemic and pulmonary circulation', F, CV, [('AN5.2', None)], [], ['physiology'])
c('Portal circulation', F, CV, [('AN5.5', None)], ['Portal systems'])
c('Vascular anastomoses', ST, CV, [('AN5.6', None)], ['Collateral circulation'])
c('Lymphatic system', ST, IM, [('AN6.1', None), ('AN6.2', None), ('AN6.3', None)], [], ['physiology'])
c('Nervous system organisation', ST, NV, [('AN7.1', None), ('AN7.2', None)], [])
c('Neuron', ST, NV, [('AN7.3', None)])
c('Spinal nerves', ST, NV, [('AN7.4', None), ('AN7.5', None), ('AN7.6', None)], [])
c('Synapse', F, NV, [('AN7.7', None)])
c('Ganglia', ST, NV, [('AN7.8', None)], [])
# --- Upper limb
c('Bones of the upper limb', ST, MS, [('AN8.1', None), ('AN8.2', None), ('AN8.3', None)], ['Upper limb osteology'], [], ['bone'])
c('Scaphoid fracture', D, MS, [('AN8.4', None)], ['Fracture of scaphoid'], ['orthopaedics'], ['bone'])
c('Pectoral region', ST, MS, [('AN9.1', None)], [])
c('Breast', ST, RP, [('AN9.2', None), ('AN9.3', None)])
c('Axilla', ST, MS, [('AN10.1', None), ('AN10.2', None), ('AN10.4', None), ('AN10.7', None)], [])
c('Brachial plexus', ST, NV, [('AN10.3', None), ('AN10.5', None)], [])
c('Brachial plexus injuries', D, NV, [('AN10.6', None), ('AN29.3', None)], [], ['orthopaedics'])
c('Back and scapular region', ST, MS, [('AN10.8', None), ('AN10.9', None)], [])
c('Shoulder region', ST, MS, [('AN10.10', None), ('AN10.11', None)], [])
c('Shoulder joint', ST, MS, [('AN10.12', None)], ['Glenohumeral joint'], [], ['joint'])
c('Axillary nerve injury', D, NV, [('AN10.13', None)], [], ['orthopaedics'])
c('Arm', ST, MS, [('AN11.1', None), ('AN11.2', None)], [])
c('Cubital fossa', ST, MS, [('AN11.3', None), ('AN11.5', None), ('AN11.6', None)], [])
c('Radial nerve injury', D, NV, [('AN11.4', None), ('AN12.13', None)], [], ['orthopaedics'])
c('Forearm', ST, MS, [('AN12.1', None), ('AN12.2', None), ('AN12.11', None), ('AN12.12', None), ('AN12.14', None)], [])
c('Flexor retinaculum', ST, MS, [('AN12.3', None)], [])
c('Carpal tunnel syndrome', D, NV, [('AN12.4', None)], [], ['orthopaedics', 'medicine'])
c('Hand', ST, MS, [('AN12.5', None), ('AN12.6', None), ('AN12.7', None), ('AN12.9', None), ('AN12.10', None), ('AN12.15', None)], [])
c('Claw hand', D, NV, [('AN12.8', None)], [], ['orthopaedics'])
c('Upper limb regional anatomy', ST, MS, [('AN13.1', None), ('AN13.2', None)], [])
c('Joints of the upper limb', ST, MS, [('AN13.3', None), ('AN13.4', None)], [], [], ['joint'])
c('Upper limb radiographic anatomy', I, MS, [('AN13.5', None)], [], ['radiology'])
c('Surface anatomy of the upper limb', K, MS, [('AN13.6', None), ('AN13.7', None)], [])
c('Development of the limbs', F, MS, [('AN13.8', None), ('AN20.10', None)], ['Limb development'])
# --- Lower limb
c('Bones of the lower limb', ST, MS, [('AN14.1', None), ('AN14.2', None), ('AN14.3', None), ('AN14.4', None)], ['Lower limb osteology'], [], ['bone'])
c('Thigh', ST, MS, [('AN15.1', None), ('AN15.2', None), ('AN15.5', None), ('AN16.4', None), ('AN16.5', None)], [])
c('Femoral triangle', ST, MS, [('AN15.3', None)], [])
c('Psoas abscess', D, MS, [S('AN15.4', 'Explain the anatomical basis of psoas abscess.')], [], ['surgery'])
c('Hernia', D, GI, [S('AN15.4', 'Explain the anatomical basis of femoral hernia.')])
c('Gluteal region', ST, MS, [('AN16.1', None), ('AN16.2', None)], [])
c('Trendelenburg sign', FI, MS, [('AN16.3', None)], [], ['orthopaedics'])
c('Popliteal fossa', ST, MS, [('AN16.6', None)], [])
c('Hip joint', ST, MS, [('AN17.1', None)], [], [], ['joint'])
c('Femoral neck fracture', D, MS, [('AN17.2', None)], ['Fracture neck of femur'], ['orthopaedics'], ['bone'])
c('Joint dislocations', D, MS, [S('AN17.3', 'Explain the anatomical basis of hip dislocation and of hip replacement.')])
c('Leg', ST, MS, [('AN18.1', None), ('AN18.2', None), ('AN19.1', None), ('AN19.2', None)], [])
c('Common peroneal nerve injury', D, NV, [('AN18.3', None)], ['Common fibular nerve injury'], ['orthopaedics'])
c('Knee joint', ST, MS, [('AN18.4', None), ('AN18.5', None)], [], [], ['joint'])
c('Knee injuries', D, MS, [('AN18.6', None)], ['Knee ligament and meniscal injuries'], ['orthopaedics'])
c('Osteoarthritis', D, MS, [S('AN18.7', 'Explain the anatomical basis of osteoarthritis of the knee joint.')])
c('Calf muscle pump', F, CV, [('AN19.3', None)], ['Peripheral heart'])
c('Calcaneal tendon rupture', D, MS, [('AN19.4', None)], ['Achilles tendon rupture'], ['orthopaedics'])
c('Arches of the foot', ST, MS, [('AN19.5', None)], [])
c('Musculoskeletal deformities', D, MS, [S('AN19.6', 'Explain the anatomical basis of flatfoot and clubfoot.')])
c('Plantar fasciitis and metatarsalgia', D, MS, [('AN19.7', None)], [], ['orthopaedics'])
c('Joints of the lower limb', ST, MS, [('AN20.1', None), ('AN20.2', None)], [], [], ['joint'])
c('Lower limb regional anatomy', ST, MS, [('AN20.3', None)], [])
c('Lymphadenopathy', FI, IM, [S('AN20.4', 'Explain the anatomical basis of enlarged inguinal lymph nodes.')])
c('Varicose veins', D, CV, [S('AN20.5', 'Explain the anatomical basis of varicose veins.')], [], ['surgery'])
c('Deep vein thrombosis', D, CV, [S('AN20.5', 'Explain the anatomical basis of deep vein thrombosis.')], ['DVT'], ['surgery', 'medicine'])
c('Lower limb radiographic anatomy', I, MS, [('AN20.6', None)], [], ['radiology'])
c('Surface anatomy of the lower limb', K, MS, [('AN20.7', None), ('AN20.8', None), ('AN20.9', None)], [])
# --- Thorax
c('Thoracic skeleton', ST, R, [('AN21.1', None), ('AN21.2', None), ('AN21.8', None), ('AN21.10', None)], ['Bones of the thorax'], [], ['bone'])
c('Thoracic wall', ST, R, [('AN21.3', None), ('AN21.4', None), ('AN21.5', None), ('AN21.6', None), ('AN21.7', None)], ['Chest wall'])
c('Mechanics of breathing', F, R, [('AN21.9', None)])
c('Mediastinum', ST, R, [('AN21.11', None)], [], [], ['mediastinum'])
c('Pericardium', ST, CV, [('AN22.1', None)], [], [], ['heart'])
c('Heart', ST, CV, [('AN22.2', None), ('AN22.5', None), ('AN22.6', None)])
c('Coronary circulation', F, CV, [('AN22.3', None)])
c('Ischaemic heart disease', D, CV, [S('AN22.4', 'Explain the anatomical basis of ischaemic heart disease.')])
c('Cardiac conduction system', ST, CV, [('AN22.7', None)])
c('Oesophagus', ST, GI, [('AN23.1', None)])
c('Thoracic duct', ST, IM, [('AN23.2', None)], [])
c('Great veins of the thorax', ST, CV, [('AN23.3', None)], ['Superior vena cava and azygos system'])
c('Thoracic aorta', ST, CV, [('AN23.4', None)], [])
c('Thoracic autonomic nerves', ST, NV, [('AN23.5', None), ('AN23.6', None)], ['Thoracic sympathetic trunk'])
c('Pleura', ST, R, [('AN24.1', None)], [], [], ['lung'])
c('Lungs', ST, R, [('AN24.2', None), ('AN24.3', None), ('AN24.5', None)], [], [], ['lung'])
c('Phrenic nerve', ST, NV, [('AN24.4', None)], [])
c('Trachea', ST, R, [('AN24.6', None)], [], [], ['trachea'])
c('Respiratory system histology', ST, R, [('AN25.1', None)], [])
c('Development of the respiratory system', F, R, [S('AN25.2', 'Describe the development of the pleura and lungs.')], [])
c('Development of the heart', F, CV, [S('AN25.2', 'Describe the development of the heart.'), ('AN25.4', None), ('AN25.5', None), ('AN25.6', None)], ['Cardiac development'], ['pediatrics'])
c('Fetal circulation', F, CV, [('AN25.3', None)], [], ['physiology', 'pediatrics'])
c('Chest radiograph', I, R, [('AN25.7', None)])
c('Barium swallow', I, GI, [('AN25.8', None)], [], ['radiology'])
c('Surface anatomy of the thorax', K, R, [('AN25.9', None)], [])
# --- Head and neck
c('Skull', ST, MS, [('AN26.1', None), ('AN26.2', None), ('AN26.3', None), ('AN26.4', None), ('AN30.1', None), ('AN30.2', None)], [], [], ['bone'])
c('Cervical vertebrae', ST, MS, [('AN26.5', None), ('AN26.7', None)], [], [], ['spine'])
c('Scalp', ST, G, [('AN27.1', None), ('AN27.2', None)], [])
c('Face', ST, G, [('AN28.1', None), ('AN28.2', None), ('AN28.3', None), ('AN28.6', None), ('AN28.8', None)], [])
c('Facial nerve', ST, NV, [('AN28.4', None)], [])
c('Head and neck lymphatics', ST, IM, [('AN28.5', None), ('AN35.5', None)], [])
c('Facial nerve palsy', D, NV, [('AN28.7', None)])
c('Parotid gland', ST, GI, [('AN28.9', None)], [], [], ['salivary-gland'])
c('Frey syndrome', D, NV, [('AN28.10', None)], ['Gustatory sweating'], ['surgery'])
c('Posterior triangle of the neck', ST, MS, [('AN29.1', None), ('AN29.5', None)], [])
c('Sternocleidomastoid', ST, MS, [('AN29.2', None)], [])
c('Torticollis', D, MS, [('AN29.4', None)], ['Wry neck'], ['orthopaedics'])
c('Dural venous sinuses', ST, NV, [('AN30.3', None), ('AN30.4', None)], ['Cranial venous sinuses'])
c('Pituitary gland', ST, EN, [S('AN30.5', 'Explain the anatomical basis of visual field defects from a pituitary mass.')])
c('Orbit', ST, SS, [('AN31.1', None), ('AN31.2', None)], [], [], ['eye'])
c('Horner syndrome', D, NV, [('AN31.3', None)], [], ['ophthalmology'])
c('Lacrimal apparatus', ST, SS, [('AN31.4', None)], [], [], ['eye'])
c('Ocular motor nerve palsies', D, NV, [('AN31.5', None)], ['Oculomotor, trochlear and abducent nerve palsies'], ['ophthalmology'])
c('Anterior triangle of the neck', ST, MS, [('AN32.1', None), ('AN32.2', None)], [])
c('Temporal and infratemporal fossae', ST, MS, [('AN33.1', None), ('AN33.4', None)], [])
c('Muscles of mastication', ST, MS, [('AN33.2', None)], [])
c('Temporomandibular joint', ST, MS, [('AN33.3', None), ('AN33.5', None)], ['TMJ'], [], ['joint'])
c('Submandibular region', ST, GI, [('AN34.1', None), ('AN34.2', None), ('AN34.3', None)], [])
c('Deep cervical fascia', ST, MS, [('AN35.1', None), ('AN35.10', None)], [])
c('Thyroid gland', ST, EN, [('AN35.2', None), S('AN35.8', 'Explain the anatomical basis of thyroid swellings.')])
c('Parathyroid glands', ST, EN, [S('AN35.2', 'Describe the anatomy of the parathyroid glands.')])
c('Subclavian artery', ST, CV, [('AN35.3', None)], [])
c('Veins of the neck', ST, CV, [('AN35.4', None)], ['Internal jugular and brachiocephalic veins'])
c('Cervical sympathetic chain', ST, NV, [('AN35.6', None)], ['Cervical sympathetic trunk'])
c('Lower cranial nerves', ST, NV, [('AN35.7', None)], ['Glossopharyngeal, vagus, accessory and hypoglossal nerves'])
c('Cervical rib', D, MS, [('AN35.9', None)], [], ['orthopaedics'])
c('Oral cavity', ST, GI, [('AN36.1', None)], [])
c('Pharynx', ST, GI, [('AN36.3', None), ('AN36.4', None), ('AN36.5', None), ('AN36.7', None)], [])
c('Palatine tonsil and soft palate', ST, IM, [('AN36.2', None)], [])
c('Tonsillitis', D, IM, [S('AN36.6', 'Explain the anatomical basis of tonsillitis, tonsillectomy and peritonsillar abscess.')])
c('Nasal cavity', ST, R, [('AN37.1', None)], [])
c('Paranasal sinuses', ST, R, [('AN37.2', None)], [])
c('Sinusitis', D, R, [S('AN37.3', 'Explain the anatomical basis of sinusitis and maxillary sinus masses.')])
c('Larynx', ST, R, [('AN38.1', None), ('AN38.2', None)], [], [], ['larynx'])
c('Recurrent laryngeal nerve palsy', D, NV, [('AN38.3', None)], ['Recurrent laryngeal nerve injury'], ['ent', 'surgery'])
c('Tongue', ST, GI, [('AN39.1', None)], [])
c('Hypoglossal nerve palsy', D, NV, [('AN39.2', None)], [], ['medicine'])
c('Ear', ST, SS, [('AN40.1', None), ('AN40.2', None), ('AN40.3', None)], [], [], ['ear'])
c('External ear disorders', D, SS, [S('AN40.4', 'Explain the anatomical basis of otitis externa.')])
c('Acute suppurative otitis media', D, SS, [S('AN40.4', 'Explain the anatomical basis of otitis media.')])
c('Myringotomy', IV, SS, [('AN40.5', None)], [], ['ent'])
c('Eyeball', ST, SS, [('AN41.1', None), ('AN41.3', None)], [], [], ['eye'])
c('Cataract', D, SS, [S('AN41.2', 'Explain the anatomical basis of cataract.')])
c('Aqueous humour circulation', F, SS, [S('AN41.2', 'Explain the anatomical basis of glaucoma.')], [], ['ophthalmology', 'physiology'])
c('Retinal vascular occlusion', D, SS, [S('AN41.2', 'Explain the anatomical basis of central retinal artery occlusion.')])
c('Vertebral canal', ST, NV, [('AN42.1', None)], [])
c('Back of the neck', ST, MS, [('AN42.2', None), ('AN42.3', None)], [])
c('Craniovertebral joints', ST, MS, [('AN43.1', None)], [], [], ['joint'])
c('Head and neck histology', ST, G, [('AN43.2', None), ('AN43.3', None)], [])
c('Development of the head and neck', F, G, [('AN43.4', None)], [])
c('Surface anatomy of the head and neck', K, G, [('AN43.5', None), ('AN43.6', None)], [])
c('Head and neck radiographic anatomy', I, G, [('AN43.7', None)], [], ['radiology'])
c('Cerebral angiography', I, NV, [('AN43.8', None), ('AN43.9', None)], [], ['radiology'])
