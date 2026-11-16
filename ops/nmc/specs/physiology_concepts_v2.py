"""Physiology pilot concept specification v2 (2026-11-16). Supersedes v1 (never accepted).

Editorial changes from v1, applied as explicit overrides so the diff stays reviewable:
1. Entity naming: concepts name the thing, not a subject's view of it ("Liver", not "Liver
   physiology"). The physiology angle lives in the objective; other subjects add objectives
   to the same concept instead of creating duplicates.
2. Alias hygiene: an alias must be another name for the SAME concept. Aliases that named a
   part, a member, a process or a test of the concept (e.g. "Myasthenia gravis" under
   "Neuromuscular junction disorders", "Insulin" under "Endocrine pancreas") are removed,
   because acceptance treats aliases as identity claims and they would block later subjects.
3. Splits where the source row names separable entities (PY3.5, PY4.9, PY5.1).
4. Concept type, organ, and umbrella facets (stored in the existing classification facets:
   domains = [conceptType] (+ 'umbrella'), organs = [organ slugs]); no schema change.
Concept type vocabulary (CONCEPT_TYPES) is controlled; umbrella concepts organise navigation
and are not scored as mastery units until decomposed.
"""
import physiology_concepts_v1 as v1

EXISTING = dict(v1.EXISTING)
CONCEPT_TYPES = ('structure', 'function', 'disorder', 'clinical-finding', 'investigation',
                 'clinical-skill', 'intervention', 'field')

# old label -> new label (entity naming)
RENAME = {
 'Cell physiology': 'Cell',
 'Digestive system functional anatomy': 'Digestive system',
 'Liver physiology': 'Liver',
 'Gallbladder physiology': 'Gallbladder',
 'Heart functional anatomy': 'Heart',
 'Respiratory tract functional anatomy': 'Respiratory system',
 'Kidney functional anatomy': 'Kidney',
 'Endocrine system organization': 'Endocrine system',
 'Pituitary physiology': 'Pituitary gland',
 'Thyroid physiology': 'Thyroid gland',
 'Adrenal physiology': 'Adrenal gland',
 'Thymus physiology': 'Thymus',
 'Pineal gland physiology': 'Pineal gland',
 'Male reproductive physiology': 'Male reproductive system',
 'Female reproductive physiology': 'Female reproductive system',
 'Physiology of pregnancy': 'Pregnancy',
 'Central nervous system organization': 'Central nervous system',
 'Peripheral and autonomic nervous system': 'Peripheral nervous system',
 'Pain physiology': 'Pain',
 'High-altitude physiology': 'High altitude',
 'Deep-sea diving physiology': 'Diving',
 'Exercise physiology': 'Exercise',
 'Infant physiology': 'Infancy',
}
# new label -> full replacement alias list (only where v1 aliases were wrong or labels changed)
ALIASES = {
 'Cell': [], 'Homeostasis': [], 'Acid-base buffer systems': ['Buffers'], 'Membrane potentials': [],
 'Leucocytes': ['White blood cells'], 'Platelets': ['Thrombocytes'], 'Haemostasis': [],
 'Blood transfusion': ['Transfusion'], 'Red cell indices': ['RBC indices'],
 'Nerve fibre properties': [], 'Peripheral nerve injury': [], 'Neuromuscular transmission': [],
 'Muscle work and metabolism': [], 'Gastrointestinal motility': ['GI motility'],
 'Liver': ['Hepatic'], 'Gallbladder': ['Gall bladder'], 'Heart': ['Cardiac'],
 'Electrocardiogram': ['ECG', 'EKG'], 'Regional circulations': ['Special circulations'],
 'Respiratory system': [], 'Mechanics of breathing': ['Ventilatory mechanics'],
 'Pulmonary compliance and gas exchange': [], 'Transport of respiratory gases': ['Gas transport'],
 'Regulation of respiration': ['Control of breathing'], 'Periodic breathing': [],
 'Pulmonary function tests': ['PFT', 'Lung function tests'], 'High altitude': ['High-altitude physiology'],
 'Diving': ['Deep-sea diving'], 'Kidney': ['Renal'], 'Juxtaglomerular apparatus': ['JGA'],
 'Urine formation': [], 'Urine concentration and dilution': [], 'Micturition': [],
 'Renal replacement therapy': ['RRT'], 'Endocrine system': [], 'Pituitary gland': ['Hypophysis'],
 'Thyroid gland': ['Thyroid'], 'Adrenal gland': ['Suprarenal gland'], 'Calcium-regulating hormones': [],
 'Endocrine pancreas': ['Pancreatic islets', 'Islets of Langerhans'], 'Thymus': [], 'Pineal gland': ['Pineal body'],
 'Male reproductive system': [], 'Female reproductive system': [], 'Pregnancy': ['Gestation'],
 'Menopause': [], 'Central nervous system': ['CNS'], 'Peripheral nervous system': [],
 'Neurotransmitters': [], 'Pain': [], 'Learning and memory': [], 'Speech': [],
 'Auditory pathway': [], 'Vestibular apparatus': [], 'Hearing tests': [],
 'Colour vision': ['Color vision'], 'Cold injury': [], 'Growth monitoring': ['Growth charts'],
 'Ageing': ['Aging'], 'Basic life support': ['BLS'], 'Exercise': ['Physical exercise'],
 'Infancy': [], 'Blood groups': [],
}
# label removed and replaced by the listed concepts (source-row splits)
DROP = {'Neuromuscular junction disorders'}
ADD = [  # (insert after label, concept)
 ('Neuromuscular transmission', dict(label='Myasthenia gravis', system='musculoskeletal', aliases=['MG'], extraSubjects=['medicine'],
   links=[('PY3.5', 'Explain the postsynaptic neuromuscular transmission defect in myasthenia gravis and how blocking agents affect it.')])),
 ('Myasthenia gravis', dict(label='Lambert-Eaton myasthenic syndrome', system='musculoskeletal', aliases=['Lambert-Eaton syndrome', 'LEMS'], extraSubjects=['medicine'],
   links=[('PY3.5', 'Explain the presynaptic neuromuscular transmission defect in Lambert-Eaton syndrome and contrast it with myasthenia gravis.')])),
 ('Gallbladder', dict(label='Bile', system='gastrointestinal', aliases=[], extraSubjects=['biochemistry'],
   links=[('PY4.9', 'Describe the production, composition and functions of bile.')])),
 ('Heart', dict(label='Coronary circulation', system='cardiovascular', aliases=[], extraSubjects=['anatomy', 'medicine'],
   links=[('PY5.1', 'Map the major coronary arteries to the myocardial territories they supply.')])),
]
LINKS = {  # replacement links where a split narrows the remaining concept
 'Heart': [('PY5.1', 'Trace blood flow through the chambers and valves of the heart.')],
 'Gallbladder': [('PY4.9', 'Describe the structure and functions of the gallbladder, including storage and concentration of bile.')],
}
UMBRELLA = {'Cell', 'Digestive system', 'Respiratory system', 'Endocrine system', 'Central nervous system',
 'Peripheral nervous system', 'Regional circulations', 'Pulmonary compliance and gas exchange',
 'Calcium-regulating hormones', 'Male reproductive system', 'Female reproductive system',
 'Hypothalamus and limbic system', 'Renal regulation of fluid, electrolytes and acid-base', 'Immunity',
 'Blood composition', 'Cardiovascular regulation'}
ORGANS = {'Liver': ['liver'], 'Gallbladder': ['gallbladder'], 'Bile': ['liver', 'gallbladder'], 'Heart': ['heart'],
 'Coronary circulation': ['heart'], 'Kidney': ['kidney'], 'Juxtaglomerular apparatus': ['kidney'],
 'Pituitary gland': ['pituitary'], 'Thyroid gland': ['thyroid'], 'Adrenal gland': ['adrenal'],
 'Thymus': ['thymus'], 'Pineal gland': ['pineal'], 'Endocrine pancreas': ['pancreas'],
 'Pancreatic exocrine secretion': ['pancreas'], 'Gastric secretion': ['stomach'], 'Salivary secretion': ['salivary-gland'],
 'Cerebellum': ['brain'], 'Basal ganglia': ['brain'], 'Thalamus': ['brain'], 'Cerebral cortex': ['brain'],
 'Hypothalamus and limbic system': ['brain'], 'Micturition': ['urinary-bladder'], 'Cystometry': ['urinary-bladder'],
 'Optics of the eye': ['eye'], 'Visual pathway': ['eye', 'brain'], 'Pupillary light reflex': ['eye'],
 'Refractive errors': ['eye'], 'Colour vision': ['eye'], 'Auditory pathway': ['ear', 'brain'], 'Vestibular apparatus': ['ear'],
 'Hearing': ['ear'], 'Deafness': ['ear'], 'Hearing tests': ['ear'], 'Olfaction': ['nose'], 'Taste': ['tongue'],
 'Lactation': ['breast'], 'Peptic ulcer disease': ['stomach'], 'Gastro-oesophageal reflux disease': ['oesophagus'],
 'Hirschsprung disease': ['colon'], 'Spinal cord pathways': ['spinal-cord'], 'Spinal cord transection patterns': ['spinal-cord']}
TYPE = {}
def _t(kind, *labels):
    for x in labels: TYPE[x] = kind
_t('structure', 'Cell', 'Haemoglobin', 'Plasma proteins', 'Leucocytes', 'Platelets', 'Neuron', 'Neuroglia', 'Digestive system',
   'Liver', 'Gallbladder', 'Bile', 'Heart', 'Coronary circulation', 'Cardiac conduction system', 'Regional circulations',
   'Respiratory system', 'Kidney', 'Juxtaglomerular apparatus', 'Endocrine system', 'Pituitary gland', 'Thyroid gland',
   'Adrenal gland', 'Calcium-regulating hormones', 'Endocrine pancreas', 'Thymus', 'Pineal gland', 'Male reproductive system',
   'Female reproductive system', 'Central nervous system', 'Peripheral nervous system', 'Neurotransmitters', 'Synapse',
   'Sensory receptors', 'Spinal cord pathways', 'Cerebellum', 'Basal ganglia', 'Thalamus', 'Hypothalamus and limbic system',
   'Cerebral cortex', 'Reticular activating system', 'Auditory pathway', 'Vestibular apparatus', 'Visual pathway',
   'Blood composition', 'Body fluid compartments', 'Blood groups', 'Gastrointestinal hormones', 'Muscle fibre types')
_t('disorder', 'Anaemia', 'Polycythaemia', 'Peripheral nerve injury', 'Myasthenia gravis', 'Lambert-Eaton myasthenic syndrome',
   'Myopathies', 'Peptic ulcer disease', 'Gastro-oesophageal reflux disease', 'Adynamic ileus', 'Hirschsprung disease',
   'Cardiac arrhythmias', 'Shock', 'Heart failure', 'Hypoxia', 'Asphyxia', 'Drowning', 'Spinal cord transection patterns',
   'Upper and lower motor neuron lesions', 'Deafness', 'Refractive errors', 'Cold injury', 'Heat stroke', 'Obesity',
   'Metabolic syndrome', 'Infertility', 'Brain death')
_t('clinical-finding', 'Jaundice', 'Vomiting', 'Diarrhoea', 'Constipation', 'Syncope', 'Dyspnoea', 'Cyanosis',
   'Periodic breathing', 'Fever', 'Pain')
_t('investigation', 'Red cell count', 'Leucocyte counts', 'Bleeding and clotting times', 'Red cell indices',
   'Erythrocyte sedimentation rate', 'Osmotic fragility test', 'Haematocrit', 'Reticulocyte count', 'Platelet count',
   'Liver function tests', 'Electrocardiogram', 'Pulmonary function tests', 'Peak expiratory flow rate', 'Cystometry',
   'Renal function tests', 'Pregnancy tests', 'Hearing tests', 'Electroencephalogram', 'Ergography',
   'Amphibian nerve-muscle experiments', 'Growth monitoring')
_t('clinical-skill', 'Abdominal examination', 'Cardiovascular examination', 'Respiratory examination', 'Neurological examination',
   'Cranial nerve examination', 'General physical examination', 'Basic life support')
_t('intervention', 'Blood transfusion', 'Oxygen therapy', 'Artificial respiration', 'Renal replacement therapy',
   'Contraception', 'In vitro fertilization')
_t('field', 'Yoga and meditation')

def _build():
    out = []
    for c in v1.C:
        if c['label'] in DROP: continue
        c = dict(c); old = c['label']; c['label'] = RENAME.get(old, old)
        if c['label'] in ALIASES: c['aliases'] = list(ALIASES[c['label']])
        if c['label'] in LINKS: c['links'] = LINKS[c['label']]
        out.append(c)
        for after, add in ADD:
            if after == c['label']: out.append(dict(add))
    # ADD entries anchored to another ADD entry
    for after, add in ADD:
        if not any(x['label'] == add['label'] for x in out):
            i = next(i for i, x in enumerate(out) if x['label'] == after); out.insert(i + 1, dict(add))
    for c in out:
        c['conceptType'] = TYPE.get(c['label'], 'function')
        c['umbrella'] = c['label'] in UMBRELLA
        c['organs'] = ORGANS.get(c['label'], [])
        assert c['conceptType'] in CONCEPT_TYPES, c['label']
    return out

C = _build()
_labels = {c['label'] for c in C}
for _m in (RENAME.values(), ALIASES, LINKS, UMBRELLA, ORGANS, TYPE):
    _missing = set(_m) - _labels
    assert not _missing, _missing

VERSION = 'v2'
SUPERSEDES = {'batchId': 'nmc-physiology-concepts-v1-20261116', 'sha256': 'bb6882e44e682904b87d3b2d238133fb77e4a7b65eea3241b53ed3ece7e32b8c', 'accepted': False}
RENAMED_TO = set(RENAME.values())
ADDED = {a['label'] for _, a in ADD}
