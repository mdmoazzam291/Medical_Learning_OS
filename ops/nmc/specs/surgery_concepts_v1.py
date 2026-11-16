EXISTING = {
 'Shock': 'C-39ffe670-839b-4691-9aa9-186bcc20a865',
 'Prognosis counselling': 'C-c8c2d3e6-d532-4f05-91b0-0d75851773f7',
 'Blood products': 'C-82939e95-7c9f-4668-8f79-d55a253cd9cd',
 'Blood transfusion': 'C-10026240-f836-4ea1-aa9c-8c105461dc5d',
 'Burns': 'C-c6124cc5-939e-4ec1-a086-07a009bf821b',
 'Wound healing': 'C-075d073b-8417-446e-af88-001e69a29178',
 'Injury report': 'C-75bdefc6-3be3-4b81-9b73-5ad485978104',
 'Research methodology': 'C-b31b6030-aee1-4012-a979-e2c8a516490c',
 'Medical ethics': 'C-f0dac750-64ff-4f93-9acc-19231bb22d29',
 'Doctor-patient relationship': 'C-ea5c037c-f133-4ada-ae08-db878106c61c',
 'Professional conduct': 'C-4a75d8f7-6820-4399-a9c4-f4f76a231ee0',
 'Diagnostic test counselling': 'C-7c965fab-6521-4b1c-a4db-ba0fbd26ed44',
 'Informed consent': 'C-326aa73a-ebb4-4be2-877f-a78be8715daa',
 'Preoperative assessment': 'C-93fec1d5-8dfc-45f0-84e3-6736aebc104c',
 'Anaesthesiology': 'C-79d0924a-e2a2-43d8-92a9-9a1e538dcc8f',
 'Airway management': 'C-631d3d1e-fb07-4737-882b-eb04c235c283',
 'Pain management': 'C-a4396a40-9125-4f8a-8245-76d2c02a8581',
 'Perioperative fluid therapy': 'C-d2cea6d4-2adc-4577-afaf-e42d8f270f6c',
 'Transplant rejection': 'C-8a4b7395-0b9f-4511-a857-b6ddcf704121',
 'Organ donation': 'C-cd19e19e-1bb5-4a34-a362-3ee005197890',
 'Biomedical waste management': 'C-2396a7f1-b588-46ef-bc75-dd354b8af35e',
 'Basic life support': 'C-5e4feff5-7ba5-4dd9-89eb-0f1f8c48c5a8',
 'Mass disaster management': 'C-54c44fd0-1d3e-4dd2-8fb0-f67521a2754e',
 'Soft tissue injuries': 'C-9e836600-05a3-4b68-934d-98e74f7952f7',
 'Skin and soft tissue infections': 'C-bbcd6379-fa2f-40c3-89b9-7954d7fff370',
 'Head and neck cancer': 'C-13c4bb18-d7c9-4cde-96b8-4c1122578357',
 'Salivary gland disorders': 'C-99cf5538-5d14-4a36-8e8e-08667fa7ca31',
 'Thyroid gland': 'C-c38e21df-0b56-408b-9824-7079a7949a9f',
 'Goitre': 'C-056f2314-90cc-4172-b4fa-ac177f4722e1',
 'Thyroid neoplasms': 'C-b2ad8873-b3f0-4cb2-ad2f-d9ee1dd855b7',
 'Hyperparathyroidism': 'C-a9eb50ff-7d9d-49d9-8e92-3da460090513',
 'Adrenal gland': 'C-292c0d76-eab3-4101-9b09-aacf9070290c',
 'Adrenal tumours': 'C-e1cb7a8d-57b9-47eb-aa45-6edd74aa1c25',
 'Benign breast disease': 'C-69d02c77-82f2-448c-9a4e-ba6344e28a42',
 'Breast cancer': 'C-35f01536-a3a1-4948-9077-5835c4bbd68b',
 'Lung carcinoma': 'C-6ecca386-f9b5-47d4-9411-6a4944ffdaa9',
 'Oesophageal disorders': 'C-c22016b3-792f-4d4e-b172-14ccb933f140',
 'Abdominal examination': 'C-f56328e5-1f4d-4fe8-a4ab-8b12da5c0586',
 'Liver': 'C-6a665032-76c9-4b06-a1a8-4757dc0e4150',
 'Appendicitis': 'C-749e5c60-ad07-4688-82a0-0f1e17fc9f68',
 'Urinary tract infection': 'C-4ea2bdcb-27f5-4fbd-a9fd-6d3c9b48b35e',
 'Hydronephrosis': 'C-959f320b-c435-4062-83e3-ce819420bb2b',
 'Urolithiasis': 'C-04790641-1de4-484e-8545-58a3b6c1e935',
 'Renal tumours': 'C-6b7a631e-2c14-4a67-8416-de0340110b8f',
 'Urothelial carcinoma': 'C-25fbab0b-e72e-4ea9-8797-4cda4a9a8dc9',
 'Benign prostatic hyperplasia': 'C-33fdc035-3fe5-4bfa-ac5e-a16232b0a05d',
 'Prostatitis': 'C-8718226b-b54e-47d9-ac1f-d0affa041b78',
 'Prostate cancer': 'C-0ef05790-7561-42b1-ae9e-b3e8c687996c',
 'Penile carcinoma': 'C-771f5c27-8a38-4412-9b4c-d6f2f927a966',
 'Testicular tumours': 'C-5c0b29fc-c025-4b70-8f4e-e704fb4f3cb8',
}
"""Surgery concept specification v1 (2026-11-17). Each concept lists only evidenced subjects (ADR-135).
SU24.1-SU24.3 and SU27.1-SU27.8 (no Topic 24/27 headings in the source table) stay on the
source-exception track with the other heading exceptions and are not in this batch."""
SUBJECT = 'surgery'
SUBJECT_NAME = 'Surgery'
BATCH_KIND = 'concept batch'
VERSION = 'v1'
CONCEPT_TYPES = ('structure', 'function', 'disorder', 'clinical-finding', 'investigation',
                 'clinical-skill', 'intervention', 'field')
EVIDENCED_SUBJECTS_ONLY = True
EXTRA_TEST_LABELS = r'|examination|Glasgow Coma Scale|investigations'
C = []
def c(label, kind, system, links, aliases=(), expected=(), organs=(), task=None):
    d = {'label': label, 'aliases': list(aliases), 'system': system, 'links': links, 'extraSubjects': list(expected),
         'conceptType': kind, 'umbrella': False, 'organs': list(organs)}
    if task: d['task'] = task
    C.append(d)
S = lambda code, text: (code, text)
D, F, X, I, K, IV, ST, FI = 'disorder', 'function', 'field', 'investigation', 'clinical-skill', 'intervention', 'structure', 'clinical-finding'
G, H, IM, GI, R, CV, RN, RP, EN, MS, NV = 'general', 'haematological', 'immune', 'gastrointestinal', 'respiratory', 'cardiovascular', 'renal', 'reproductive', 'endocrine', 'musculoskeletal', 'nervous'
# --- General principles
c('Metabolic response to injury', F, G, [('SU1.1', None), ('SU1.2', None)], [], ['physiology', 'biochemistry'])
c('Perioperative care', IV, G, [('SU1.3', None), ('SU10.1', None)], [], ['anaesthesia'])
c('Shock', D, CV, [('SU2.1', None), ('SU2.2', None)])
c('Prognosis counselling', K, G, [('SU2.3', None)])
c('Blood products', ST, H, [('SU3.1', None)])
c('Blood transfusion', IV, H, [('SU3.2', None), ('SU3.3', None)])
c('Burns', D, G, [('SU4.1', None), ('SU4.2', None), ('SU4.3', None), ('SU4.4', None)])
c('Wound healing', F, G, [('SU5.1', None)])
c('Wound care', IV, G, [('SU5.2', None), ('SU5.3', None)], ['Wound management'])
c('Injury report', K, G, [('SU5.4', None)])
c('Surgical infections', D, G, [('SU6.1', None), ('SU6.2', None)], [], ['microbiology'])
c('Clinical audit', X, G, [('SU7.1', None)], ['Medical audit'], ['community-medicine'])
c('Research methodology', X, G, [('SU7.2', None)])
c('Medical ethics', X, G, [('SU8.1', None)])
c('Doctor-patient relationship', K, G, [('SU8.2', None)])
c('Professional conduct', X, G, [('SU8.3', None)])
c('Investigations in surgical patients', I, G, [('SU9.1', None)], [])
c('Surgical oncology', X, G, [('SU9.2', None)], [], ['pathology'])
c('Diagnostic test counselling', K, G, [('SU9.3', None)])
c('Informed consent', K, G, [('SU10.2', None)])
c('Minor surgical procedures', K, G, [('SU10.3', None), ('SU10.4', None)], [])
c('Preoperative assessment', K, G, [('SU11.1', None)])
c('Anaesthesiology', X, G, [('SU11.2', None)])
c('Airway management', K, R, [('SU11.3', None)])
c('Day-care surgery', IV, G, [('SU11.4', None)], ['Ambulatory surgery'], ['anaesthesia'])
c('Pain management', IV, NV, [('SU11.5', None)])
c('Surgical safety checklist', K, G, [('SU11.6', None)], [], ['anaesthesia'])
c('Malnutrition in surgical patients', D, G, [('SU12.1', None)], [])
c('Perioperative fluid therapy', IV, G, [('SU12.2', None)])
c('Nutritional support', IV, G, [('SU12.3', None)], [])
c('Transplant rejection', D, IM, [('SU13.1', None)])
c('Organ transplantation', IV, IM, [('SU13.2', None)], [])
c('Organ donation', X, G, [('SU13.3', None), ('SU13.4', None)])
c('Aseptic technique', K, G, [('SU14.1', None), ('SU14.4', None)], ['Asepsis'], ['microbiology'])
c('Surgical incisions and instruments', K, G, [('SU14.2', None)], [])
c('Sutures and knots', K, G, [('SU14.3', None)], ['Suture materials'])
c('Biomedical waste management', X, G, [('SU15.1', None)])
c('Minimally invasive surgery', IV, G, [('SU16.1', None)], ['Minimal access surgery'])
# --- Trauma
c('Prehospital trauma care', K, G, [('SU17.1', None)], [])
c('Basic life support', K, CV, [('SU17.2', None)])
c('Mass disaster management', X, G, [('SU17.3', None)])
c('Head injury', D, NV, [('SU17.4', None), ('SU17.6', None)], ['Traumatic brain injury'], [], ['brain'])
c('Glasgow Coma Scale', I, NV, [('SU17.5', None)], ['GCS'])
c('Soft tissue injuries', D, MS, [('SU17.7', None)])
c('Chest trauma', D, R, [('SU17.8', None), ('SU17.9', None), ('SU17.10', None)], ['Thoracic trauma'], [], ['chest'])
# --- Skin, head and neck, endocrine, breast
c('Skin and soft tissue infections', D, G, [('SU18.1', None)])
c('Skin tumours', D, G, [('SU18.2', None)], [], ['dermatology', 'pathology'], ['skin'])
c('Examination of a swelling', K, G, [('SU18.3', None)], ['Lump examination'])
c('Cleft lip and palate', D, GI, [('SU19.1', None), ('SU19.2', None)], [], ['pediatrics'])
c('Head and neck cancer', D, G, [('SU20.1', None), ('SU20.2', None)])
c('Salivary gland disorders', D, GI, [('SU21.1', None), ('SU21.2', None)])
c('Thyroid gland', ST, EN, [('SU22.1', None)])
c('Goitre', D, EN, [('SU22.2', None), ('SU22.3', None)])
c('Thyroid neoplasms', D, EN, [('SU22.4', None)])
c('Parathyroid glands', ST, EN, [('SU22.5', None)], [], ['anatomy'])
c('Hyperparathyroidism', D, EN, [S('SU22.6', 'Explain the presentation and management principles of hyperparathyroidism.')])
c('Hypoparathyroidism', D, EN, [S('SU22.6', 'Explain the presentation and management principles of hypoparathyroidism.')], [], ['medicine'])
c('Adrenal gland', ST, EN, [('SU23.1', None), ('SU23.2', None)])
c('Adrenal tumours', D, EN, [('SU23.3', None)])
c('Breast', ST, RP, [('SU25.1', None)], [], ['anatomy'], ['breast'])
c('Benign breast disease', D, RP, [('SU25.2', None)])
c('Breast cancer', D, RP, [('SU25.3', None), ('SU25.4', None)])
c('Breast examination', K, RP, [('SU25.5', None)], [], [], ['breast'])
# --- Thorax
c('Cardiac surgery', X, CV, [('SU26.1', None)], [])
c('Mediastinal disorders', D, R, [('SU26.3', None)], [], [], ['mediastinum'])
c('Lung carcinoma', D, R, [('SU26.4', None)])
# --- Abdomen
c('Hernia', D, GI, [('SU28.1', None), ('SU28.2', None)], [])
c('Peritonitis', D, GI, [('SU28.3', None)], [])
c('Retroperitoneal and mesenteric lesions', D, GI, [('SU28.4', None)], [])
c('Oesophagus', ST, GI, [('SU28.5', None)], [], ['anatomy'], ['oesophagus'])
c('Oesophageal disorders', D, GI, [('SU28.6', None)])
c('Stomach', ST, GI, [('SU28.7', None)], [], ['anatomy'], ['stomach'])
c('Surgical disorders of the stomach', D, GI, [('SU28.8', None)], [], [], ['stomach'])
c('Abdominal examination', K, GI, [('SU28.9', None)])
c('Liver', ST, GI, [('SU28.10', None)])
c('Spleen', ST, H, [('SU28.11', None)], [], ['anatomy'], ['spleen'])
c('Biliary tract disease', D, GI, [('SU28.12', None)], [], [], ['gallbladder'])
c('Small and large intestine', ST, GI, [('SU28.13', None)], [], ['anatomy'])
c('Surgical bowel disorders', D, GI, [('SU28.14', None)], [], ['pediatrics'])
c('Appendicitis', D, GI, [('SU28.15', None)])
c('Rectum and anal canal', ST, GI, [('SU28.16', None)], [], ['anatomy', 'pediatrics'])
c('Anorectal disorders', D, GI, [('SU28.17', None)], [])
c('Digital rectal examination', K, GI, [('SU28.18', None), ('SU29.10', None)], [])
# --- Urology
c('Haematuria', FI, RN, [('SU29.1', None)], ['Hematuria'], ['medicine'])
c('Congenital urinary tract anomalies', D, RN, [('SU29.2', None)], [], ['pediatrics'])
c('Urinary tract infection', D, RN, [('SU29.3', None)])
c('Hydronephrosis', D, RN, [('SU29.4', None)])
c('Urolithiasis', D, RN, [('SU29.5', None)])
c('Renal tumours', D, RN, [('SU29.6', None)])
c('Urinary retention', FI, RN, [('SU29.7', None)], [])
c('Urothelial carcinoma', D, RN, [('SU29.8', None)])
c('Benign prostatic hyperplasia', D, RP, [S('SU29.9', 'Explain the presentation of benign prostatic hyperplasia and justify its assessment and care.')])
c('Prostatitis', D, RP, [S('SU29.9', 'Explain the presentation of prostatitis and justify its assessment and care.')])
c('Prostate cancer', D, RP, [S('SU29.9', 'Distinguish prostate cancer from benign prostatic disease and justify its assessment and care.')])
c('Urethral stricture', D, RN, [('SU29.11', None)], [])
c('Phimosis and paraphimosis', D, RP, [S('SU30.1', 'Distinguish phimosis and paraphimosis and justify care and referral.')], [], ['pediatrics'])
c('Penile carcinoma', D, RP, [S('SU30.1', 'Recognise penile carcinoma and justify care and referral.')])
c('Undescended testis', D, RP, [('SU30.2', None)], ['Cryptorchidism'], ['pediatrics'], ['testis'])
c('Acute scrotum', FI, RP, [('SU30.3', None)], [], ['pediatrics'], ['testis'])
c('Varicocele', D, RP, [('SU30.4', None)], [], [], ['testis'])
c('Hydrocele', D, RP, [('SU30.5', None)], [], [], ['testis'])
c('Testicular tumours', D, RP, [('SU30.6', None)])
