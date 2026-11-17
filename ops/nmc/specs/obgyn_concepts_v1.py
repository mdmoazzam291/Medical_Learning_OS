EXISTING = {
 'Vital statistics': 'C-8ffc7431-d905-4d03-a514-7c633d573f9b',
 'Maternal and child health': 'C-285143d2-6b3a-490b-91c3-2da164eccf6f',
 'Female reproductive system': 'C-5d8ce34a-437e-4345-a660-e57d966a7802',
 'Menstrual cycle': 'C-ce20e759-cb42-4a66-b69d-011be60032ad',
 'Pregnancy': 'C-a354e0e4-9638-44d8-876b-87ba9ecacf14',
 'Dietary counselling': 'C-8a5e96a6-b364-4e88-8266-a0516d3f3d16',
 'Immunisation': 'C-b276a56d-46dd-46da-8d36-d996257c01af',
 'Abortion': 'C-6633209a-7dc0-493a-86b2-1207ae99bb45',
 'Blood products': 'C-82939e95-7c9f-4668-8f79-d55a253cd9cd',
 'HIV infection': 'C-67c5fb8a-ff54-4768-b21e-a27cbc81600b',
 'Lactation': 'C-84ffe2e8-0437-4264-9a5b-a048070bc0f3',
 'Breastfeeding': 'C-889f7d1c-a026-4db9-a3ba-9288f7e69729',
 'Contraception': 'C-c9154160-3a41-4767-928b-eddc29a19061',
 'Family welfare programme': 'C-e8a0a3da-bf71-491e-a805-64131993a573',
 'PCPNDT Act': 'C-1dcae429-60bd-4f94-8e54-79cec0fa8ca5',
 'Vaginal discharge': 'C-fade20c5-b671-4cca-87f9-8d2425152d0c',
 'Puberty': 'C-180e5940-3d9d-4b19-a737-6ad67e4b1344',
 'Reproductive tract infections': 'C-ab9b4c32-1369-4516-862e-759920fd7f84',
 'Infertility': 'C-4ad0a6f8-98ab-4d55-b414-c09b76252dfa',
 'Assisted reproductive technology': 'C-9538144a-fd36-4247-97c8-b1c7faa16833',
 'Leiomyoma': 'C-26a1135f-6398-4a62-8d1c-0e159c8f40db',
 'Menopause': 'C-c12dbb34-f5f4-44c0-a5c6-b808151f5b21',
 'Endometrial carcinoma': 'C-edfdfde2-0e99-46fe-9148-f07402ccb6b0',
 'Ovarian tumours': 'C-de92ea28-cd9b-4d83-8f57-7d6d07727aac',
 'Gestational trophoblastic disease': 'C-57699b57-3d51-4387-804f-8e67fd55d467',
 'Endometriosis': 'C-cf8a6389-ac3e-480f-9781-aff248b6ac34',
 'Minimally invasive surgery': 'C-8549225d-6c88-4c10-ac6c-f28713795fde',
 'Prognosis counselling': 'C-c8c2d3e6-d532-4f05-91b0-0d75851773f7',
 'Medical ethics': 'C-f0dac750-64ff-4f93-9acc-19231bb22d29',
 'Informed consent': 'C-326aa73a-ebb4-4be2-877f-a78be8715daa',
 'Medical records': 'C-1686faf0-7d9d-4637-96af-4dfd2ff3628a',
}
"""Obstetrics & Gynaecology concept specification v1 (2026-11-17). Evidenced subjects only (ADR-135).
All 142 printed OG rows are recognised; OG30.2 uses its reviewed task (management restored)."""
SUBJECT = 'obstetrics-gynaecology'
SUBJECT_NAME = 'Obstetrics & Gynaecology'
BATCH_KIND = 'concept batch'
VERSION = 'v1'
CONCEPT_TYPES = ('structure', 'function', 'disorder', 'clinical-finding', 'investigation',
                 'clinical-skill', 'intervention', 'field')
EVIDENCED_SUBJECTS_ONLY = True
EXTRA_TEST_LABELS = r'|examination|monitoring|screening|test'
C = []
def c(label, kind, system, links, aliases=(), expected=(), organs=(), task=None):
    d = {'label': label, 'aliases': list(aliases), 'system': system, 'links': links, 'extraSubjects': list(expected),
         'conceptType': kind, 'umbrella': False, 'organs': list(organs)}
    if task: d['task'] = task
    C.append(d)
S = lambda code, text: (code, text)
D, F, X, I, K, IV, ST, FI = 'disorder', 'function', 'field', 'investigation', 'clinical-skill', 'intervention', 'structure', 'clinical-finding'
G, H, IM, GI, R, CV, RN, RP, EN, MS, NV = 'general', 'haematological', 'immune', 'gastrointestinal', 'respiratory', 'cardiovascular', 'renal', 'reproductive', 'endocrine', 'musculoskeletal', 'nervous'
# --- Demography, programmes, basic sciences
c('Maternal mortality', X, RP, [('OG1.1', None)], [], ['community-medicine'])
c('Perinatal mortality', X, RP, [('OG1.2', None)], [], ['pediatrics', 'community-medicine'])
c('Vital statistics', X, G, [('OG1.3', None)])
c('Caesarean section', IV, RP, [('OG1.4', None), S('OG15.1', 'Explain indications, steps and complications of caesarean section.')], ['Cesarean section', 'Caesarean delivery'])
c('Maternal and child health', X, RP, [('OG 1.5', None)])
c('Female reproductive system', ST, RP, [('OG2.1', None)])
c('Menstrual cycle', F, RP, [('OG3.1', None)])
c('Placenta and fetal development', F, RP, [('OG4.1', None)], [], ['anatomy', 'physiology'], ['placenta'])
# --- Antenatal care
c('High-risk pregnancy', FI, RP, [('OG5.1', None), ('OG5.2', None)], [], ['medicine'])
c('Diagnosis of pregnancy', K, RP, [('OG6.1', None)], [])
c('Pregnancy', F, RP, [('OG7.1', None)])
c('Antenatal care', IV, RP, [('OG8.1', None), ('OG8.4', None), ('OG8.8', None)], ['Prenatal care'], ['community-medicine'])
c('Obstetric history taking', K, RP, [('OG8.2', None)], [])
c('Obstetric examination', K, RP, [('OG8.3', None)], [])
c('Pelvic assessment', K, RP, [('OG8.5', None)], ['Clinical pelvimetry'])
c('Dietary counselling', K, G, [('OG8.6', None)])
c('Immunisation', IV, IM, [('OG8.7', None)])
c('Intrauterine fetal death', D, RP, [('OG 8.9', None)], ['IUFD'], ['forensic-medicine'])
c('Pregnancy after caesarean section', FI, RP, [('OG8.10', None)], ['Previous caesarean section'])
# --- Early pregnancy and haemorrhage
c('Recurrent pregnancy loss', D, RP, [('OG 9.2', None)], ['Recurrent miscarriage'])
c('Ectopic pregnancy', D, RP, [('OG9.4', None)], [], ['surgery'])
c('Pregnancy of unknown location', FI, RP, [('OG9.5', None)], [])
c('Hyperemesis gravidarum', D, RP, [('OG9.6', None)], [])
c('Antepartum haemorrhage', D, RP, [('OG10.1', None), S('OG35.19', 'Recognise antepartum haemorrhage and demonstrate initial stabilisation, teamwork and escalation in simulation.')], ['Antepartum hemorrhage'])
c('Blood products', ST, H, [('OG10.2', None)])
c('Multiple pregnancy', D, RP, [('OG11.1', None)], ['Multifetal pregnancy'])
# --- Medical disorders in pregnancy
c('Hypertensive disorders of pregnancy', D, RP, [('OG12.1', None)], [], ['medicine'])
c('Anaemia in pregnancy', D, H, [('OG12.2', None)], [], ['medicine'])
c('Diabetes in pregnancy', D, EN, [('OG12.3', None)], [], ['medicine'])
c('Heart disease in pregnancy', D, CV, [('OG12.4', None)], [], ['medicine'])
c('Urinary tract infection in pregnancy', D, RN, [('OG12.5', None)], [])
c('Liver disease in pregnancy', D, GI, [('OG12.6', None)], [], ['medicine'])
c('HIV infection', D, IM, [S('OG12.7', 'Explain antenatal HIV screening and plan maternal and newborn care using applicable guidance.')])
c('Rh isoimmunisation', D, H, [('OG12.8', None)], ['Rh alloimmunisation', 'Rhesus isoimmunisation'], ['pathology'])
c('Infections in pregnancy', D, IM, [('OG 12.9', None)], [], ['microbiology'])
c('Medical disorders in pregnancy', D, G, [('OG 12.10', None)], [], ['medicine'])
c('Fetal growth restriction', D, RP, [('OG12.11', None), ('OG16.4', None)], ['Intrauterine growth restriction', 'IUGR'])
# --- Labour
c('Maternal pelvis and fetal skull', ST, RP, [('OG 13.1', None)], [], ['anatomy'])
c('Mechanism of labour', F, RP, [('OG 13.2', None)], ['Cardinal movements of labour'])
c('Normal labour', F, RP, [('OG13.3', None), ('OG13.6', None), ('OG13.7', None)], [])
c('Preterm labour', D, RP, [S('OG13.4', 'Explain the assessment and management of preterm labour.')], ['Preterm birth'])
c('Prelabour rupture of membranes', D, RP, [S('OG13.4', 'Explain the assessment and management of prelabour rupture of membranes.')], [])
c('Post-term pregnancy', D, RP, [S('OG13.4', 'Explain the assessment and management of post-dated pregnancy.')], ['Prolonged pregnancy', 'Post-dated pregnancy'])
c('Induction of labour', IV, RP, [('OG13.5', None)], [])
c('Respectful maternity care', K, RP, [('OG 13.8', None)], [])
c('Abnormal labour', D, RP, [('OG14.1', None), ('OG14.2', None)], [])
c('Malpresentation', D, RP, [('OG14.3', None)], ['Malposition and malpresentation'])
c('Operative obstetrics', IV, RP, [S('OG15.1', 'Compare indications, steps and complications of episiotomy, vacuum, forceps, assisted breech delivery and other operative obstetric procedures.'), ('OG37.6', None)], [])
c('Episiotomy', IV, RP, [('OG15.2', None), ('OG35.17', None)], [])
c('Postpartum haemorrhage', D, RP, [('OG16.1', None), ('OG 16.2', None), S('OG35.19', 'Recognise postpartum haemorrhage and demonstrate initial stabilisation, teamwork and escalation in simulation.')], ['PPH', 'Postpartum hemorrhage'])
c('Uterine inversion', D, RP, [('OG16.3', None)], ['Inversion of uterus'])
# --- Puerperium and newborn
c('Lactation', F, RP, [('OG17.1', None)])
c('Breastfeeding', K, RP, [('OG17.2', None)])
c('Breast disorders during lactation', D, RP, [('OG17.3', None)], [])
c('Newborn assessment', K, G, [('OG18.1', None), ('OG18.3', None)], [], ['pediatrics'])
c('Neonatal resuscitation', K, R, [('OG18.2', None), ('OG18.4', None)], [], ['pediatrics'])
c('Puerperium', F, RP, [('OG19.1', None)], ['Postpartum period'])
c('Contraception', IV, RP, [('OG19.2', None), ('OG21.1', None)])
c('Female sterilisation', IV, RP, [('OG19.3', None)], ['Tubal ligation', 'Tubectomy'])
c('Family welfare programme', X, RP, [('OG19.4', None)])
c('Abortion', D, RP, [('OG9.1', None), ('OG9.3', None), ('OG20.1', None), ('OG20.2', None), ('OG37.7', None)])
c('PCPNDT Act', X, RP, [('OG20.3', None)])
c('Intrauterine contraceptive device', IV, RP, [('OG21.2', None), ('OG35.18', None)], ['IUCD', 'Intrauterine device'])
# --- Gynaecology
c('Vaginal discharge', FI, RP, [('OG22.1', None), ('OG22.2', None)])
c('Puberty', F, RP, [('OG23.1', None)])
c('Disorders of puberty', D, RP, [('OG23.2', None), ('OG23.3', None)], [], ['pediatrics'])
c('Amenorrhoea', FI, RP, [('OG25.1', None)], ['Amenorrhea'])
c('Abnormal uterine bleeding', FI, RP, [('OG24.1', None)], ['AUB'])
c('Pelvic organ injuries', D, RP, [('OG26.1', None)], [])
c('Genital tract fistula', D, RP, [('OG26.2', None)], ['Genitourinary fistula'])
c('Reproductive tract infections', D, RP, [('OG27.1', None)])
c('Genital tuberculosis', D, RP, [('OG27.2', None)], [], ['microbiology'])
c('Pelvic inflammatory disease', D, RP, [('OG27.3', None)], [])
c('Infertility', D, RP, [('OG28.1', None), ('OG28.2', None)])
c('Ovulation induction', IV, RP, [('OG28.3', None)], [], ['pharmacology'])
c('Assisted reproductive technology', IV, RP, [('OG28.4', None)])
c('Leiomyoma', D, RP, [('OG29.1', None)])
c('Polycystic ovary syndrome', D, EN, [('OG 30.1', None)], ['PCOS'], ['medicine'])
c('Hyperandrogenism', FI, EN, [('OG30.2', None)], [], ['medicine'])
c('Pelvic organ prolapse', D, RP, [('OG31.1', None)], ['Genital prolapse'])
c('Menopause', F, RP, [('OG32.1', None)])
c('Postmenopausal bleeding', FI, RP, [('OG32.2', None)], [])
c('Cervical cancer', D, RP, [('OG33.1', None), ('OG33.2', None)], ['Carcinoma cervix'], ['pathology'])
c('Cervical cancer screening', I, RP, [('OG33.3', None), ('OG33.4', None), ('OG 33.5', None)], [], ['community-medicine'])
c('Endometrial carcinoma', D, RP, [('OG34.1', None)])
c('Ovarian tumours', D, RP, [('OG34.2', None)])
c('Gestational trophoblastic disease', D, RP, [('OG34.3', None)])
c('Minor gynaecological procedures', IV, RP, [('OG34.4', None), ('OG36.3', None), ('OG37.5', None)], [])
c('Gynaecological surgery', IV, RP, [('OG34.5', None), ('OG37.1', None), ('OG37.2', None), ('OG37.3', None), ('OG37.4', None)], [])
c('Endometriosis', D, RP, [('OG 34.6', None)])
c('Minimally invasive surgery', IV, G, [('OG38.1', None), ('OG38.2', None)])
# --- Clinical skills and professionalism
c('Gynaecological history and examination', K, RP, [('OG35.1', None), ('OG35.2', None), ('OG35.4', None), ('OG 35.5', None), ('OG35.6', None)], [])
c('Obstetric emergencies', K, RP, [('OG35.3', None)], [])
c('Prognosis counselling', K, G, [('OG35.7', None)])
c('Gestational age calculation', K, RP, [('OG35.8', None)], [])
c('Medical ethics', X, G, [('OG35.9', None)])
c('Informed consent', K, G, [('OG35.10', None), ('OG38.3', None)])
c('Medical records', K, G, [('OG35.11', None), ('OG35.12', None), ('OG35.13', None), ('OG38.4', None)])
c('Occupational exposure to bloodborne infections', K, IM, [('OG35.14', None)], [], ['microbiology'])
c('Pap smear', I, RP, [('OG35.15', None)], ['Papanicolaou smear', 'Cervical cytology'], ['pathology'])
c('Artificial rupture of membranes', IV, RP, [('OG35.16', None)], ['Amniotomy'])
c('Urinary catheterisation', K, RN, [('OG35.20', None)], ['Bladder catheterisation'], ['surgery'])
c('Health care planning', X, G, [('OG36.1', None), ('OG36.2', None)], [])
