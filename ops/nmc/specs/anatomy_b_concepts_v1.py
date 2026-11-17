EXISTING = {
 'Hernia': 'C-e62bf46a-72e7-476e-b4a3-f371e81f5663',
 'Varicocele': 'C-2e96f256-4cf7-4279-8d14-242404004c26',
 'Phimosis and paraphimosis': 'C-c55fea74-b72a-48bf-a5dc-481de72fced7',
 'Peritonitis': 'C-e6af1f55-f7e1-4af8-a15c-0a4cbb85f8e4',
 'Gallbladder': 'C-c2832f1a-179d-4018-bef0-85afa8363b8d',
 'Portal hypertension': 'C-cf526b28-cbf5-4b3b-afab-86e08df9a1fa',
 'Lumbar puncture': 'C-161aab86-3cc7-43f8-9fbc-d9c7c8ec12fe',
 'Imaging modalities': 'C-ce8f4cd2-1b82-404f-a455-0cc7ca53a853',
 'Cerebrospinal fluid': 'C-8127ea27-445e-40bc-98d0-09b86310d74b',
 'Cerebellum': 'C-f03b0ec8-e968-41a1-9ce1-8e784f3bd7b4',
 'Cerebral cortex': 'C-8d21954d-6d08-4cdc-8cad-472b2e0726a3',
 'Basal ganglia': 'C-e13191ba-ef00-4bb8-b47b-c1c3124a6a27',
 'Hypothalamus and limbic system': 'C-90d792a8-2138-4675-bae6-bc08b6fb7d30',
 'Hydrocephalus': 'C-1b3b5ebe-8c3b-419c-8bd2-7083ee76d2a9',
 'Karyotyping': 'C-0e6f39bf-a375-4247-be59-e882f8233bba',
 'Chromosomal disorders': 'C-6ba7e30c-15a5-48af-82ca-31454ac83794',
 'Menstrual cycle': 'C-ce20e759-cb42-4a66-b69d-011be60032ad',
 'Contraception': 'C-c9154160-3a41-4767-928b-eddc29a19061',
 'Assisted reproductive technology': 'C-9538144a-fd36-4247-97c8-b1c7faa16833',
 'Placenta and fetal development': 'C-2fcaaea4-5909-48b7-8c9a-ab152b6449bf',
 'Multiple pregnancy': 'C-f2d82a38-55a8-4cf2-affc-4234b05208dc',
 'Fetal age estimation': 'C-75ee394a-5ebb-44a4-a617-bd734aa482d4',
 'Prenatal screening': 'C-7882e2fc-242b-4e96-84a2-3c604018bb23',
}
"""Anatomy concept specification, part B v1 (2026-11-17): rows AN44-AN82 except AN57.1-57.5, which are
already in the registry. Accepted in two batches to stay inside the acceptance RPC time limit:
B1 = AN44-AN56, B2 = AN58-AN82. Evidenced subjects only (ADR-135)."""
import json as _j, re as _re
SUBJECT = 'anatomy'
SUBJECT_NAME = 'Anatomy'
BATCH_KIND = 'concept batch'
VERSION = 'part-b-v1'
_cat = _j.load(open('data/nmc-reference-catalogue.json'))
_n = lambda code: int(_re.match(r'AN\s?(\d+)', code).group(1))
SCOPE_CODES = tuple(r['observedCode'] for r in _cat['references'] if r['subjectId'] == 'anatomy'
                    and _n(r['observedCode']) >= 44 and _n(r['observedCode']) != 57)
CONCEPT_TYPES = ('structure', 'function', 'disorder', 'clinical-finding', 'investigation',
                 'clinical-skill', 'intervention', 'field')
EVIDENCED_SUBJECTS_ONLY = True
EXTRA_TEST_LABELS = r'|radiograph|imaging|histology|examination|karyotyping|pedigree|counselling|estimation|sampling|amniocentesis'
C = []
def c(label, kind, system, links, aliases=(), expected=(), organs=(), task=None):
    d = {'label': label, 'aliases': list(aliases), 'system': system, 'links': links, 'extraSubjects': list(expected),
         'conceptType': kind, 'umbrella': False, 'organs': list(organs)}
    if task: d['task'] = task
    C.append(d)
S = lambda code, text: (code, text)
D, F, X, I, K, IV, ST, FI = 'disorder', 'function', 'field', 'investigation', 'clinical-skill', 'intervention', 'structure', 'clinical-finding'
G, H, IM, GI, R, CV, RN, RP, EN, MS, NV, SS = 'general', 'haematological', 'immune', 'gastrointestinal', 'respiratory', 'cardiovascular', 'renal', 'reproductive', 'endocrine', 'musculoskeletal', 'nervous', 'special-senses'
# --- B1: abdomen, pelvis, back (AN44-AN56)
c('Surface anatomy of the abdomen', K, GI, [('AN44.1', None), ('AN55.1', None), ('AN55.2', None)], [])
c('Anterior abdominal wall', ST, GI, [('AN44.2', None), ('AN44.3', None), ('AN44.6', None)], [])
c('Inguinal canal', ST, GI, [('AN44.4', None)], [])
c('Hernia', D, GI, [('AN44.5', None), S('AN47.14', 'Locate congenital and acquired diaphragmatic hernias and explain how their positions shape presentation.')])
c('Abdominal incisions', K, GI, [('AN44.7', None)], [], ['surgery'])
c('Muscles of the back', ST, MS, [('AN45.1', None), ('AN45.3', None)], [])
c('Lumbar plexus', ST, NV, [('AN45.2', None)], [])
c('Testis and epididymis', ST, RP, [('AN46.1', None), ('AN46.2', None)], [], [], ['testis'])
c('Penis', ST, RP, [('AN46.3', None)], [])
c('Varicocele', D, RP, [('AN46.4', None)])
c('Phimosis and paraphimosis', D, RP, [('AN46.5', None)])
c('Peritoneum', ST, GI, [('AN47.1', None), ('AN47.2', None), ('AN47.4', None)], [])
c('Peritonitis', D, GI, [('AN47.3', None)])
c('Abdominal viscera', ST, GI, [('AN47.5', None), ('AN47.6', None)], [])
c('Gallbladder', ST, GI, [('AN47.7', None)])
c('Portal venous system', ST, GI, [('AN47.8', None), ('AN47.10', None)], ['Portal vein'])
c('Portal hypertension', D, GI, [('AN47.11', None)])
c('Abdominal aorta and its branches', ST, CV, [('AN47.9', None)], [])
c('Abdominal autonomic plexuses', ST, NV, [('AN47.12', None)], ['Prevertebral plexuses'])
c('Diaphragm', ST, R, [('AN47.13', None)], [])
c('Pelvic viscera', ST, RP, [('AN48.1', None), ('AN48.5', None)], [])
c('Pelvic floor', ST, MS, [('AN48.2', None)], ['Pelvic diaphragm'])
c('Internal iliac artery', ST, CV, [('AN48.3', None)], [])
c('Sacral plexus', ST, NV, [('AN48.4', None)], [])
c('Neurogenic bladder', D, RN, [('AN48.6', None)], [], ['medicine', 'surgery'])
c('Prostate', ST, RP, [('AN48.7', None)], ['Prostate gland'], ['surgery'])
c('Pelvic examination landmarks', K, RP, [('AN48.8', None)], [])
c('Perineum', ST, RP, [('AN49.1', None), ('AN49.2', None), ('AN49.3', None)], [])
c('Ischioanal fossa', ST, GI, [('AN49.4', None)], ['Ischiorectal fossa'])
c('Perineal injuries and infections', D, RP, [('AN49.5', None)], [], ['obstetrics-gynaecology', 'surgery'])
c('Vertebral column', ST, MS, [('AN50.1', None), ('AN50.2', None), ('AN50.4', None)], [], [], ['spine'])
c('Lumbar puncture', K, NV, [('AN50.3', None)])
c('Sectional anatomy', I, G, [('AN51.1', None), ('AN51.2', None)], ['Cross-sectional anatomy'], ['radiology'])
c('Digestive system histology', ST, GI, [S('AN52.1', 'Identify histological slides of the digestive tract, its glands and the adrenal gland.'), S('AN52.3', 'Identify the epithelial transition at the gastro-oesophageal junction.')], [])
c('Urogenital system histology', ST, RN, [('AN52.2', None), S('AN52.3', 'Identify the luteal cell populations of the corpus luteum.')], [])
c('Development of the body wall and diaphragm', F, GI, [('AN52.4', None), ('AN52.5', None)], [])
c('Development of the gut', F, GI, [('AN52.6', None)], ['Gut development'], ['pediatrics'])
c('Development of the urinary system', F, RN, [('AN52.7', None)], [], ['pediatrics'])
c('Development of the reproductive system', F, RP, [('AN52.8', None)], [], ['pediatrics'])
c('Bony pelvis', ST, MS, [('AN53.1', None), ('AN53.2', None), ('AN53.3', None), ('AN53.4', None)], [], ['obstetrics-gynaecology'], ['bone'])
c('Imaging modalities', I, G, [('AN54.1', None), ('AN54.4', None)])
c('Abdominal radiographic anatomy', I, GI, [('AN54.2', None), ('AN54.3', None)], [], ['radiology'])
c('Meninges', ST, NV, [('AN56.1', None)], [])
c('Cerebrospinal fluid', I, NV, [('AN56.2', None), ('AN63.1', None)])
# --- B2: neuroanatomy, histology, genetics, embryology (AN58-AN82)
c('Medulla oblongata', ST, NV, [('AN58.1', None), ('AN58.2', None), ('AN58.3', None)], [])
c('Brainstem lesion syndromes', D, NV, [('AN58.4', None), ('AN59.4', None), ('AN61.3', None)], [], ['medicine'])
c('Pons', ST, NV, [('AN59.1', None), ('AN59.2', None), ('AN59.3', None)], [])
c('Cerebellum', ST, NV, [('AN60.1', None), ('AN60.2', None), ('AN60.3', None)])
c('Midbrain', ST, NV, [('AN61.1', None), ('AN61.2', None)], ['Mesencephalon'])
c('Cranial nerve nuclei', ST, NV, [('AN62.1', None)], [])
c('Cerebral cortex', ST, NV, [('AN62.2', None)])
c('Cerebral white matter', ST, NV, [('AN62.3', None)], [])
c('Basal ganglia', ST, NV, [S('AN62.4', 'Describe the basal ganglia and their connections.')])
c('Hypothalamus and limbic system', ST, NV, [S('AN62.4', 'Describe the limbic lobe and its connections.')])
c('Diencephalon', ST, NV, [('AN62.5', None)], [])
c('Cerebral arterial supply', ST, CV, [('AN62.6', None)], [], ['medicine'])
c('Hydrocephalus', D, NV, [('AN63.2', None)])
c('Special sensory pathways', ST, NV, [('AN63.3', None)], [], ['physiology'])
c('Nervous tissue histology', ST, NV, [('AN64.1', None), ('AN68.1', None), ('AN68.2', None), ('AN68.3', None)], [])
c('Development of the nervous system', F, NV, [('AN64.2', None)], [], ['pediatrics'])
c('Neural tube defects', D, NV, [('AN64.3', None), ('AN79.5', None)], [], ['pediatrics', 'obstetrics-gynaecology'])
c('Epithelium', ST, G, [('AN65.1', None), ('AN65.2', None)], ['Epithelial tissue'])
c('Connective tissue', ST, G, [('AN66.1', None), ('AN66.2', None)], [])
c('Muscle tissue histology', ST, MS, [('AN67.1', None), ('AN67.2', None), ('AN67.3', None)], [])
c('Blood vessel histology', ST, CV, [('AN69.1', None), ('AN69.2', None), ('AN69.3', None)], [])
c('Exocrine glands', ST, G, [('AN70.1', None)], [])
c('Lymphoid organs', ST, IM, [('AN70.2', None)], [], ['pathology'])
c('Bone and cartilage histology', ST, MS, [('AN71.1', None), ('AN71.2', None)], [])
c('Skin histology', ST, G, [('AN72.1', None)], [])
c('Chromosomes', ST, G, [('AN73.1', None)], [], ['biochemistry'])
c('Karyotyping', I, G, [('AN73.2', None)])
c('X chromosome inactivation', F, G, [('AN73.3', None)], ['Lyonisation', 'Lyonization'])
c('Modes of inheritance', F, G, [('AN74.1', None), ('AN74.2', None)], ['Patterns of inheritance'], ['biochemistry', 'pediatrics'])
c('Multifactorial inheritance', F, G, [('AN74.3', None)], ['Polygenic inheritance'], ['biochemistry'])
c('Single-gene disorders', D, G, [('AN74.4', None)], ['Monogenic disorders'], ['pediatrics'])
c('Chromosomal disorders', D, G, [('AN75.1', None), ('AN75.3', None)])
c('Mosaicism and chimerism', F, G, [('AN75.2', None)], [])
c('Genetic variation', F, G, [('AN75.4', None)], [], ['biochemistry'])
c('Genetic testing and counselling', K, G, [('AN75.5', None)], [], ['pediatrics', 'obstetrics-gynaecology'])
c('Human development', F, G, [('AN76.1', None), ('AN76.2', None)], ['Stages of human development'])
c('Menstrual cycle', F, RP, [('AN77.1', None), ('AN77.2', None)])
c('Gametogenesis', F, RP, [('AN77.3', None)], ['Spermatogenesis and oogenesis'], ['physiology'])
c('Fertilisation', F, RP, [('AN77.4', None)], ['Fertilization'], ['physiology'])
c('Contraception', IV, RP, [('AN77.5', None)])
c('Teratogenesis', F, G, [S('AN77.6', 'Distinguish teratogenic effects from factors affecting fertility.'), S('AN79.6', 'Relate teratogenic risk to developmental timing in early pregnancy.')], ['Teratology'], ['obstetrics-gynaecology', 'pharmacology'])
c('Assisted reproductive technology', IV, RP, [S('AN77.6', 'Explain surrogacy, assisted reproduction and related reproductive and social concepts.')])
c('Early embryonic development', F, RP, [('AN78.1', None), ('AN78.2', None), ('AN78.4', None)], ['Pre-embryonic period'], [])
c('Implantation', F, RP, [('AN78.3', None)], [], ['obstetrics-gynaecology'])
c('Early pregnancy', F, RP, [('AN78.5', None), S('AN79.6', 'Explain how early pregnancy is established and assessed in the first trimester.')], [], ['obstetrics-gynaecology'])
c('Gastrulation', F, G, [('AN79.1', None)], ['Primitive streak formation'])
c('Notochord', ST, G, [('AN79.2', None)], [])
c('Neurulation', F, NV, [('AN79.3', None)], ['Neural tube formation'])
c('Somites and intraembryonic coelom', F, G, [('AN79.4', None)], [])
c('Fetal membranes', ST, RP, [('AN80.1', None)], [], ['obstetrics-gynaecology'])
c('Umbilical cord', ST, RP, [('AN80.2', None), ('AN80.7', None)], [], ['obstetrics-gynaecology'])
c('Placenta and fetal development', F, RP, [('AN80.3', None), ('AN80.5', None)])
c('Multiple pregnancy', D, RP, [S('AN80.4', 'Compare dizygotic and monozygotic twinning and relate the timing of embryonic division to placentation.')])
c('Fetal age estimation', I, RP, [('AN80.6', None)])
c('Prenatal screening', I, RP, [('AN81.1', None)])
c('Amniocentesis', IV, RP, [('AN81.2', None)], [], ['obstetrics-gynaecology'])
c('Chorionic villus sampling', IV, RP, [('AN81.3', None)], [], ['obstetrics-gynaecology'])
c('Respectful handling of human remains', K, G, [('AN 82.1', None)], [], [])
