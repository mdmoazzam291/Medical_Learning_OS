EXISTING = {
 'Apoptosis': 'C-d481b63b-7010-4f22-bbad-58b10f6b5611',
 'Shock': 'C-39ffe670-839b-4691-9aa9-186bcc20a865',
 'Haemostasis': 'C-492420e5-53bc-42ab-859f-2cf3ad020663',
 'Immunity': 'C-76801578-01e8-4b7d-a643-c07e25b2689e',
 'HIV infection': 'C-67c5fb8a-ff54-4768-b21e-a27cbc81600b',
 'Obesity': 'C-a40ab47d-0b34-4094-b1c2-502f268421c5',
 'Protein-energy malnutrition': 'C-57cd5641-239a-4526-91a8-e92d09dc5d1f',
 'Vitamins': 'C-3b1bb622-41f0-4cef-83f3-6020dff8c1ce',
 'Anaemia': 'C-f9d4f7fe-fe76-41cd-843f-4c9b9efd6bcb',
 'Haemoglobin': 'C-45e8e6a5-1c59-4062-a2f9-c2bd293b273c',
 'Red cell count': 'C-9bff84ee-8e2f-49ca-959e-3588e2911758',
 'Leucocyte counts': 'C-58bc42da-5335-48be-bb64-345e6706b7d5',
 'Iron metabolism': 'C-ccc56e83-719b-41db-8752-a697db197db9',
 'Blood groups': 'C-c9c35a54-59e2-43be-9f9d-edbdfa2c00cf',
 'Blood transfusion': 'C-10026240-f836-4ea1-aa9c-8c105461dc5d',
 'Urinalysis': 'C-63575197-eae1-440f-8641-8072a9193423',
 'Thyroid function tests': 'C-a902737b-701c-4d23-927f-93112522c494',
 'Liver function tests': 'C-dc3a65b9-2f5f-4092-8e31-d3027a9ef2d1',
 'Renal function tests': 'C-077e9a68-45db-4e70-a30c-7eae5136ebca',
 'Jaundice': 'C-20fd4723-19f0-480c-a675-6370bab9ecd2',
 'Peptic ulcer disease': 'C-63a4b041-8208-4455-9245-1e97572e0da5',
 'Gallstones': 'C-0983ef6c-f771-4d85-a1ba-611229c4fb27',
 'Heart failure': 'C-6078a16c-e191-4b0b-bc71-cb40cf9ffc5d',
 'Diabetes mellitus': 'C-3ec81eff-d64a-4682-a816-351afa99165d',
 'Kidney': 'C-d37242ef-2027-4d25-887e-86e2d875ab99',
 'Cerebrospinal fluid': 'C-8127ea27-445e-40bc-98d0-09b86310d74b',
 'Oncogenes and tumour suppressor genes': 'C-ff7469b8-0b81-40a1-b46b-2b2b07a2c433',
}
"""Pathology concept specification v1 (2026-11-16). ADR-134/135 rules; EXISTING reuses accepted
Physiology and Biochemistry identities. Row PA.29.1 (unresolved printed code) stays on the
source-exception track. Specimen-identification rows attach to the topic's representative concept."""
SUBJECT = 'pathology'
SUBJECT_NAME = 'Pathology'
BATCH_KIND = 'concept batch'
VERSION = 'v1'
CONCEPT_TYPES = ('structure', 'function', 'disorder', 'clinical-finding', 'investigation',
                 'clinical-skill', 'intervention', 'field')
EVIDENCED_SUBJECTS_ONLY = True
EXTRA_TEST_LABELS = r'|panel|profile|marker|analysis|examination|cytology|testing|tests$|collection'
C = []
def c(label, kind, system, links, aliases=(), expected=(), organs=(), task=None):
    d = {'label': label, 'aliases': list(aliases), 'system': system, 'links': links, 'extraSubjects': list(expected),
         'conceptType': kind, 'umbrella': False, 'organs': list(organs)}
    if task: d['task'] = task
    C.append(d)
S = lambda code, text: (code, text)
D, F, X, I, K, ST, FI = 'disorder', 'function', 'field', 'investigation', 'clinical-skill', 'structure', 'clinical-finding'
G, H, IM, GI, R, CV, RN, RP, EN, MS, NV, SK = 'general', 'haematological', 'immune', 'gastrointestinal', 'respiratory', 'cardiovascular', 'renal', 'reproductive', 'endocrine', 'musculoskeletal', 'nervous', 'general'
# ---- Introduction, cell injury, inflammation, repair
c('Pathology', X, G, [('PA1.1', None), ('PA1.2', None)])
c('Cell cycle', F, G, [S('PA1.3', 'Map the phases and checkpoints of the cell cycle and explain how their control relates to growth and repair.')])
c('Stem cells', ST, G, [S('PA1.3', 'Explain how stem cells support tissue renewal and repair and outline principles of regenerative medicine.')])
c('Cell injury', D, G, [('PA2.1', None), ('PA2.2', None), ('PA2.8', None)], ['Cellular injury'])
c('Intracellular accumulations', D, G, [('PA2.3', None)])
c('Necrosis', D, G, [S('PA2.4', 'Compare the mechanisms and morphological patterns of necrosis and distinguish necrosis from autolysis.')])
c('Apoptosis', F, G, [S('PA2.4', 'Compare the mechanisms and morphology of apoptosis with necrosis.')])
c('Pathological calcification', D, G, [S('PA2.5', 'Compare dystrophic and metastatic calcification by mechanism, setting and morphology.')])
c('Gangrene', D, G, [S('PA2.5', 'Distinguish dry, wet and gas gangrene by mechanism and morphology.')], [], ['surgery'])
c('Cellular adaptations', F, G, [S('PA2.6', 'Compare atrophy, hypertrophy, hyperplasia and metaplasia by stimulus, mechanism and morphology.')])
c('Dysplasia', D, G, [S('PA2.6', 'Distinguish dysplasia from carcinoma in situ and explain its significance as a precursor lesion.')])
c('Cellular ageing', F, G, [('PA2.7', None)], ['Cellular aging'])
c('Inflammation', F, IM, [('PA3.1', None), ('PA3.4', None)])
c('Inflammatory mediators', F, IM, [('PA3.2', None)], ['Chemical mediators of inflammation'], ['pharmacology'])
c('Chronic inflammation', D, IM, [S('PA3.3', 'Explain the causes, cells and morphological features of chronic nonspecific inflammation.')])
c('Granulomatous inflammation', D, IM, [S('PA3.3', 'Explain granuloma formation and give representative causes of granulomatous inflammation.')], ['Granuloma'])
c('Wound healing', F, G, [('PA4.1', None)], [], ['surgery'])
# ---- Haemodynamic disorders
c('Oedema', FI, CV, [('PA5.1', None)], ['Edema'])
c('Congestion', D, CV, [S('PA5.2', 'Distinguish active hyperaemia from passive congestion and describe the morphology of chronic venous congestion.')], ['Hyperaemia'])
c('Haemorrhage', FI, CV, [S('PA5.2', 'Classify representative patterns of haemorrhage and their consequences.')], ['Hemorrhage'])
c('Shock', D, CV, [('PA5.3', None)])
c('Haemostasis', F, H, [S('PA5.4', 'Trace the steps of normal haemostasis.')])
c('Thrombosis', D, CV, [S('PA5.4', "Use Virchow's triad to explain thrombus formation, morphology and outcomes.")])
c('Embolism', D, CV, [S('PA5.5', 'Relate representative types of embolus to their source, distribution and consequences.')])
c('Ischaemia', D, CV, [S('PA5.5', 'Explain the causes of ischaemia and the factors that determine tissue damage.')], ['Ischemia'])
c('Infarction', D, CV, [S('PA5.5', 'Distinguish infarction from ischaemia and relate its causes to infarct morphology and clinical effects.'), ('PA5.6', None)], ['Infarct'])
# ---- Neoplasia and cytology
c('Neoplasia', D, G, [('PA6.1', None), ('PA6.7', None)], ['Neoplasm'])
c('Oncogenes and tumour suppressor genes', ST, G, [('PA6.2', None)])
c('Carcinogenesis', F, G, [('PA6.3', None)], ['Carcinogens'])
c('Metastasis', F, G, [S('PA6.4', 'Explain the local and metastatic effects of tumours on the host.')])
c('Paraneoplastic syndromes', D, G, [S('PA6.4', 'Explain the mechanisms of representative paraneoplastic syndromes and other systemic effects of tumours.')], [], ['medicine'])
c('Laboratory diagnosis of cancer', I, G, [('PA6.5', None)], [], ['biochemistry'])
c('Tumour immunity', F, IM, [('PA6.6', None)], ['Cancer immunity', 'Tumor immunity'])
c('Diagnostic cytology', I, G, [('PA7.1', None)], ['Cytopathology'])
# ---- Immunopathology
c('Immunity', F, IM, [('PA8.1', None)])
c('Hypersensitivity reactions', D, IM, [('PA8.2', None)], ['Hypersensitivity'])
c('Human leucocyte antigens', ST, IM, [S('PA8.3', 'Explain the HLA system and the role of HLA matching in transplantation.')], ['HLA', 'Human leukocyte antigens'])
c('Transplant rejection', D, IM, [S('PA8.3', 'Compare the immune mechanisms and morphology of hyperacute, acute and chronic rejection.')], ['Graft rejection'], ['surgery'])
c('Autoimmunity', D, IM, [('PA8.4', None)])
c('Systemic lupus erythematosus', D, IM, [('PA8.5', None)], ['SLE', 'Lupus'], ['medicine', 'dermatology'])
c('HIV infection', D, IM, [('PA8.6', None)])
c('Amyloidosis', D, G, [('PA9.1', None), ('PA9.2', None)], ['Amyloid'], ['medicine'])
# ---- Infections, genetic, environmental and nutritional
c('Malaria', D, H, [('PA10.1', None)], [], ['microbiology', 'medicine'])
c('Cysticercosis', D, NV, [('PA10.2', None)], ['Neurocysticercosis'], ['microbiology', 'medicine'])
c('Leprosy', D, SK, [('PA10.3', None)], ["Hansen's disease", 'Hansen disease'], ['microbiology', 'dermatology'])
c('Host response to infection', F, IM, [('PA10.4', None)], [], ['microbiology'])
c('COVID-19', D, R, [('PA10.5', None)], ['Coronavirus disease 2019'], ['microbiology', 'medicine'])
c('Chromosomal disorders', D, G, [('PA11.1', None)], ['Chromosomal abnormalities'], ['pediatrics'])
c('Childhood tumours', D, G, [('PA11.2', None)], ['Paediatric tumours', 'Pediatric tumors'], ['pediatrics'])
c('Lysosomal storage disorders', D, G, [('PA11.3', None)], ['Storage disorders'], ['pediatrics', 'biochemistry'])
c('Environmental pathology', X, G, [('PA12.1', None)], [], ['community-medicine'])
c('Protein-energy malnutrition', D, G, [S('PA12.2', 'Compare the tissue and metabolic responses in protein-energy malnutrition and starvation.')])
c('Vitamins', ST, G, [S('PA12.2', 'Relate representative vitamin deficiencies to their tissue and metabolic consequences.')])
c('Obesity', D, G, [('PA12.3', None)])
# ---- Haematology
c('Haematopoiesis', F, H, [('PA13.1', None)], ['Hematopoiesis', 'Haemopoiesis'])
c('Anaemia', D, H, [('PA13.2', None)])
c('Blood specimen collection', K, H, [('PA13.3', None)], ['Blood sample collection'])
c('Haemoglobin', ST, H, [S('PA13.4', 'Measure haemoglobin concentration on approved samples.')])
c('Red cell count', I, H, [S('PA13.4', 'Perform a red cell count on approved samples.')])
c('Leucocyte counts', I, H, [S('PA13.4', 'Perform total and differential white cell counts on approved samples.')])
c('Iron metabolism', F, H, [S('PA14.1', 'Trace iron absorption, transport and storage as the basis of iron deficiency.')])
c('Microcytic anaemia', D, H, [S('PA14.1', 'Distinguish common causes of microcytic anaemia using red cell indices and iron studies.'), ('PA14.2', None)], ['Microcytic anemia'], ['medicine'])
c('Vitamin B12 deficiency', D, H, [('PA15.1', None)], ['Cobalamin deficiency'], ['medicine'])
c('Megaloblastic anaemia', D, H, [('PA15.2', None), ('PA15.3', None)], ['Megaloblastic anemia'], ['medicine'])
c('Haemolytic anaemia', D, H, [('PA16.1', None), ('PA16.3', None)], ['Hemolytic anemia'], ['medicine'])
c('Sickle cell disease', D, H, [S('PA16.2', 'Explain the pathogenesis of sickle cell disease and its indices, smear findings and distinguishing clinical features.')], ['Sickle cell anaemia', 'Sickle cell anemia'], ['medicine', 'pediatrics'])
c('Thalassaemia', D, H, [S('PA16.2', 'Explain the pathogenesis of thalassaemia and its indices, smear findings and distinguishing clinical features.')], ['Thalassemia'], ['medicine', 'pediatrics'])
c('Aplastic anaemia', D, H, [S('PA 17.1', 'Explain the causes and pathogenesis of marrow failure in aplastic anaemia and its expected findings.')], ['Aplastic anemia'], ['medicine'])
c('Bone marrow examination', I, H, [S('PA 17.1', 'Identify when bone marrow aspiration or biopsy is indicated and what each shows.')], ['Bone marrow aspiration and biopsy'])
c('Leucocytosis', FI, H, [S('PA18.1', 'Compare causes of leucocytosis, lymphocytosis and leukaemoid reactions using representative counts.')], ['Leukocytosis'])
c('Leucopenia', FI, H, [S('PA18.1', 'Compare representative causes of leucopenia.')], ['Leukopenia'])
c('Leukaemias', D, H, [('PA 18.2', None)], ['Leukemias', 'Leukaemia', 'Leukemia'], ['medicine', 'pediatrics'])
c('Lymphadenopathy', FI, IM, [('PA19.1', None)], ['Lymph node enlargement'], ['medicine', 'surgery'])
c('Tuberculous lymphadenitis', D, IM, [('PA19.2', None), ('PA19.5', None)], ['Lymph node tuberculosis'], ['microbiology'])
c('Hodgkin lymphoma', D, IM, [S('PA19.3', 'Distinguish Hodgkin lymphoma from non-Hodgkin lymphoma by pathogenesis, architecture and cell morphology.'), ('PA19.6', None)], ["Hodgkin's lymphoma", 'Hodgkin disease'], ['medicine'])
c('Non-Hodgkin lymphoma', D, IM, [S('PA19.3', 'Distinguish representative non-Hodgkin lymphomas from Hodgkin lymphoma by pathogenesis, architecture and cell morphology.')], ['NHL'], ['medicine'])
c('Splenomegaly', FI, H, [('PA19.4', None)], [], ['medicine'], ['spleen'])
c('Bleeding disorders', D, H, [('PA20.1', None)], ['Haemorrhagic disorders', 'Hemorrhagic disorders'], ['medicine'])
c('Disseminated intravascular coagulation', D, H, [S('PA20.2', 'Interpret sample coagulation panels to recognise consumption coagulopathy in DIC.')], ['DIC'], ['medicine'])
c('Vitamin K deficiency', D, H, [S('PA20.2', 'Interpret sample coagulation panels to recognise reduced vitamin K-dependent factors and distinguish it from DIC.')], [], ['pediatrics'])
c('Multiple myeloma', D, H, [('PA20.3', None)], ['Plasma cell myeloma', 'Myeloma'], ['medicine'])
# ---- Transfusion
c('Blood groups', ST, H, [('PA21.1', None), S('PA21.6', 'Perform ABO and Rh typing on approved training samples and document controls.')])
c('Blood products', ST, H, [('PA21.2', None)], ['Transfusion blood components'], ['medicine', 'anaesthesia'])
c('Transfusion-transmitted infections', D, H, [('PA21.3', None)], ['TTI'], ['microbiology'])
c('Transfusion reactions', D, H, [('PA21.4', None)], [], ['medicine'])
c('Blood transfusion', I, H, [('PA21.5', None)])
c('Compatibility testing', I, H, [S('PA21.6', 'Perform compatibility testing on approved training samples and document controls.')], ['Crossmatching', 'Cross-matching'])
# ---- Clinical pathology
c('Urinalysis', I, RN, [('PA22.1', None)])
c('Body fluid analysis', I, G, [('PA22.2', None)], ['Effusion analysis'])
c('Semen analysis', I, RP, [S('PA22.3', 'Interpret a sample semen report, identify plausible causes of abnormality and its limitations.')], ['Seminogram'], ['obstetrics-gynaecology'])
c('Thyroid function tests', I, EN, [S('PA22.3', 'Interpret sample thyroid reports and identify plausible causes and limitations.')])
c('Liver function tests', I, GI, [('PA22.4', None), S('PA24.6', 'Interpret simulated liver tests and distinguish obstructive from non-obstructive jaundice.')])
c('Renal function tests', I, RN, [('PA22.5', None)])
# ---- Gastrointestinal tract
c('Oral cancer', D, GI, [('PA23.1', None)], ['Oral carcinoma', 'Oral cavity cancer'], ['ent', 'surgery'], ['oral-cavity'])
c('Oesophageal cancer', D, GI, [('PA23.2', None)], ['Esophageal cancer', 'Carcinoma oesophagus'], ['surgery'], ['oesophagus'])
c('Peptic ulcer disease', D, GI, [('PA23.3', None), S('PA23.9', 'Identify peptic and intestinal ulcer patterns on slides.')])
c('Gastric carcinoma', D, GI, [('PA23.4', None)], ['Gastric cancer', 'Stomach cancer', 'Carcinoma stomach'], ['surgery'], ['stomach'])
c('Intestinal tuberculosis', D, GI, [S('PA23.5', 'Explain the causes, mechanisms and characteristic gross and microscopic findings of intestinal tuberculosis.')], ['Abdominal tuberculosis'], ['surgery', 'medicine'])
c('Appendicitis', D, GI, [S('PA23.5', 'Explain the causes, mechanisms and characteristic gross and microscopic findings of appendicitis.')], [], ['surgery'], ['appendix'])
c('Inflammatory bowel disease', D, GI, [('PA23.6', None)], ['IBD'], ['medicine', 'surgery'])
c('Malabsorption syndrome', D, GI, [('PA23.7', None)], ['Malabsorption'], ['medicine'])
c('Colorectal carcinoma', D, GI, [('PA23.8', None), S('PA23.9', 'Identify representative gastrointestinal tumours on slides.')], ['Colorectal cancer', 'Carcinoma colon'], ['surgery'], ['colon'])
# ---- Hepatobiliary
c('Jaundice', FI, GI, [('PA24.1', None)])
c('Hepatic failure', D, GI, [('PA24.2', None)], ['Liver failure'], ['medicine'], ['liver'])
c('Viral hepatitis', D, GI, [S('PA24.3', 'Compare the mechanisms, morphology, clinical and laboratory clues and consequences of viral hepatitis.'), S('PA24.6', 'Interpret viral hepatitis serology in simulated cases.')], [], ['medicine', 'microbiology'], ['liver'])
c('Drug-induced liver injury', D, GI, [S('PA24.3', 'Compare the mechanisms, morphology and consequences of toxic and drug-induced liver injury.')], ['Toxic hepatitis', 'DILI'], ['pharmacology'], ['liver'])
c('Alcohol-related liver disease', D, GI, [S('PA24.4', 'Trace progression from steatosis to alcoholic hepatitis and identify representative pathological findings.')], ['Alcoholic liver disease'], ['medicine'], ['liver'])
c('Cirrhosis', D, GI, [S('PA24.4', 'Trace progression from fibrosis to cirrhosis and describe its morphology and consequences.'), ('PA24.9', None)], ['Liver cirrhosis'], ['medicine'], ['liver'])
c('Portal hypertension', D, GI, [('PA24.5', None)], [], ['medicine', 'surgery'], ['liver'])
c('Hepatocellular carcinoma', D, GI, [('PA24.7', None)], ['HCC', 'Hepatoma'], ['medicine', 'surgery'], ['liver'])
c('Gallstones', D, GI, [S('PA24.8', 'Link gallstone formation to obstruction and its complications.')])
c('Cholecystitis', D, GI, [S('PA24.8', 'Relate gallbladder obstruction to the inflammation, morphology and complications of cholecystitis.')], [], ['surgery'], ['gallbladder'])
# ---- Respiratory
c('Pneumonia', D, R, [('PA25.1', None)], [], ['medicine', 'microbiology'], ['lung'])
c('Lung abscess', D, R, [('PA25.2', None)], [], ['medicine'], ['lung'])
c('Chronic obstructive pulmonary disease', D, R, [S('PA25.3', 'Explain the mechanisms, morphology and complications of chronic obstructive pulmonary disease.')], ['COPD'], ['medicine'], ['lung'])
c('Asthma', D, R, [S('PA25.3', 'Explain the mechanisms, morphology and complications of asthma.')], ['Bronchial asthma'], ['medicine', 'pediatrics'], ['lung'])
c('Bronchiectasis', D, R, [S('PA25.3', 'Explain the mechanisms, morphology and complications of bronchiectasis and select representative investigations.')], [], ['medicine'], ['lung'])
c('Pulmonary tuberculosis', D, R, [('PA25.4', None)], [], ['medicine', 'microbiology', 'community-medicine'], ['lung'])
c('Pneumoconioses', D, R, [('PA25.5', None)], ['Occupational lung disease', 'Pneumoconiosis'], ['community-medicine'], ['lung'])
c('Lung carcinoma', D, R, [S('PA25.6', 'Compare major types of lung carcinoma by exposures, molecular factors, morphology, staging and spread.'), ('PA25.7', None)], ['Lung cancer', 'Bronchogenic carcinoma'], ['medicine', 'surgery'], ['lung'])
c('Mesothelioma', D, R, [S('PA25.6', 'Relate asbestos exposure to the morphology, spread and complications of mesothelioma.')], ['Malignant mesothelioma'], [], ['pleura'])
# ---- Cardiovascular
c('Atherosclerosis', D, CV, [('PA26.1', None)], [], ['medicine'])
c('Aneurysms', D, CV, [('PA26.2', None)], ['Aneurysm'], ['surgery'])
c('Heart failure', D, CV, [('PA26.3', None)])
c('Congenital heart disease', D, CV, [('PA26.4', None)], ['Congenital heart defects'], ['pediatrics'], ['heart'])
c('Rheumatic fever', D, CV, [('PA26.5', None)], ['Acute rheumatic fever'], ['medicine', 'pediatrics'], ['heart'])
c('Ischaemic heart disease', D, CV, [('PA26.6', None)], ['Ischemic heart disease', 'Coronary artery disease'], ['medicine'], ['heart'])
c('Infective endocarditis', D, CV, [('PA26.7', None)], ['Bacterial endocarditis'], ['medicine', 'microbiology'], ['heart'])
c('Pericardial disease', D, CV, [('PA26.8', None)], [], ['medicine'], ['heart'])
c('Cardiomyopathies', D, CV, [('PA26.9', None)], ['Cardiomyopathy'], ['medicine'], ['heart'])
c('Cardiovascular tumours', D, CV, [('PA26.10', None)], ['Cardiac tumours'], [], ['heart'])
# ---- Urinary tract
c('Kidney', ST, RN, [S('PA27.1', 'Identify renal cortex, medulla, glomeruli, tubules and vessels on representative histological sections.')])
c('Nephrotic syndrome', D, RN, [S('PA27.2', 'Explain the mechanisms, morphology, urine and laboratory findings of nephrotic syndrome.')], [], ['medicine', 'pediatrics'], ['kidney'])
c('Nephritic syndrome', D, RN, [S('PA27.2', 'Explain the mechanisms, morphology, urine and laboratory findings of nephritic syndrome.')], [], ['medicine', 'pediatrics'], ['kidney'])
c('Acute kidney injury', D, RN, [('PA27.3', None)], ['AKI', 'Acute renal failure'], ['medicine'], ['kidney'])
c('Chronic kidney disease', D, RN, [('PA27.4', None)], ['CKD', 'Chronic renal failure'], ['medicine'], ['kidney'])
c('Glomerulonephritis', D, RN, [('PA27.5', None)], [], ['medicine'], ['kidney'])
c('IgA nephropathy', D, RN, [('PA27.6', None)], ['Berger disease'], ['medicine'], ['kidney'])
c('Diabetic nephropathy', D, RN, [S('PA27.7', 'Describe the glomerular lesions of diabetic nephropathy and their clinical course.')], ['Diabetic kidney disease'], ['medicine'], ['kidney'])
c('Lupus nephritis', D, RN, [S('PA27.7', 'Describe the glomerular lesions of lupus nephritis and compare them with other systemic glomerular diseases.')], [], ['medicine'], ['kidney'])
c('Tubulointerstitial nephritis', D, RN, [('PA27.8', None)], ['Interstitial nephritis'], ['medicine'], ['kidney'])
c('Acute tubular necrosis', D, RN, [('PA27.9', None)], ['ATN', 'Acute tubular injury'], ['medicine'], ['kidney'])
c('Pyelonephritis', D, RN, [S('PA27.10', 'Contrast acute and chronic pyelonephritis by mechanism, morphology and laboratory findings.')], [], ['medicine', 'microbiology'], ['kidney'])
c('Reflux nephropathy', D, RN, [S('PA27.10', 'Explain how vesicoureteric reflux leads to renal scarring.')], [], ['pediatrics', 'surgery'], ['kidney'])
c('Renal vascular disorders', D, RN, [('PA27.11', None)], [], ['medicine'], ['kidney'])
c('Cystic kidney disease', D, RN, [('PA27.12', None)], ['Cystic diseases of the kidney'], ['medicine', 'surgery'], ['kidney'])
c('Urolithiasis', D, RN, [S('PA27.13', 'Relate stone composition and location to urine findings.')], ['Kidney stones', 'Renal calculi'], ['surgery'])
c('Hydronephrosis', D, RN, [S('PA27.13', 'Trace the progression from urinary obstruction to hydronephrosis.')], [], ['surgery'], ['kidney'])
c('Renal tumours', D, RN, [('PA27.14', None), ('PA27.17', None)], ['Kidney tumours', 'Renal tumors'], ['surgery'], ['kidney'])
c('Thrombotic microangiopathies', D, H, [('PA27.15', None)], ['TMA'], ['medicine'])
c('Urothelial carcinoma', D, RN, [('PA27.16', None)], ['Transitional cell carcinoma'], ['surgery'], ['urinary-bladder'])
# ---- Male genital tract
c('Testicular tumours', D, RP, [('PA28.1', None)], ['Testicular tumors'], ['surgery'], ['testis'])
c('Penile carcinoma', D, RP, [('PA28.2', None)], ['Carcinoma penis'], ['surgery'], ['penis'])
c('Benign prostatic hyperplasia', D, RP, [('PA28.3', None)], ['BPH'], ['surgery'], ['prostate'])
c('Prostate cancer', D, RP, [('PA28.4', None), ('PA28.6', None)], ['Prostatic carcinoma', 'Carcinoma prostate'], ['surgery'], ['prostate'])
c('Prostatitis', D, RP, [('PA28.5', None)], [], ['surgery'], ['prostate'])
# ---- Female genital tract and breast
c('Endometrial carcinoma', D, RP, [('PA29.2', None)], ['Endometrial cancer', 'Carcinoma endometrium'], ['obstetrics-gynaecology'], ['uterus'])
c('Leiomyoma', D, RP, [S('PA29.3', 'Describe the presentation, morphology and behaviour of uterine leiomyoma.')], ['Uterine fibroid', 'Fibroid'], ['obstetrics-gynaecology'], ['uterus'])
c('Leiomyosarcoma', D, RP, [S('PA29.3', 'Distinguish leiomyosarcoma from leiomyoma by diagnostic criteria and behaviour.')], [], ['obstetrics-gynaecology'], ['uterus'])
c('Ovarian tumours', D, RP, [('PA29.4', None), ('PA29.10', None)], ['Ovarian tumors', 'Ovarian neoplasms'], ['obstetrics-gynaecology'], ['ovary'])
c('Gestational trophoblastic disease', D, RP, [('PA29.5', None)], ['Gestational trophoblastic neoplasia', 'GTD'], ['obstetrics-gynaecology'], ['uterus'])
c('Cervicitis', D, RP, [('PA29.6', None)], [], ['obstetrics-gynaecology'], ['cervix'])
c('Endometriosis', D, RP, [('PA29.7', None)], [], ['obstetrics-gynaecology'])
c('Adenomyosis', D, RP, [('PA29.8', None)], [], ['obstetrics-gynaecology'], ['uterus'])
c('Endometrial hyperplasia', D, RP, [('PA29.9', None)], [], ['obstetrics-gynaecology'], ['uterus'])
c('Benign breast disease', D, RP, [('PA30.1', None)], ['Benign breast lesions'], ['surgery'], ['breast'])
c('Breast cancer', D, RP, [('PA30.2', None), ('PA30.5', None)], ['Breast carcinoma', 'Carcinoma breast'], ['surgery'], ['breast'])
c('Phyllodes tumour', D, RP, [('PA30.3', None)], ['Phyllodes tumor'], ['surgery'], ['breast'])
c('Gynaecomastia', D, RP, [('PA30.4', None)], ['Gynecomastia'], ['surgery', 'medicine'], ['breast'])
# ---- Endocrine
c('Goitre', D, EN, [('PA31.1', None)], ['Goiter'], ['surgery', 'medicine'], ['thyroid'])
c('Thyrotoxicosis', D, EN, [('PA31.2', None), S('PA31.3', 'Compare the mechanisms, manifestations and laboratory patterns of thyrotoxicosis.')], [], ['medicine'], ['thyroid'])
c('Hypothyroidism', D, EN, [S('PA31.3', 'Compare the mechanisms, manifestations, laboratory patterns and course of hypothyroidism.')], ['Myxoedema'], ['medicine', 'pediatrics'], ['thyroid'])
c('Thyroid neoplasms', D, EN, [('PA31.4', None)], ['Thyroid tumours', 'Thyroid cancer'], ['surgery'], ['thyroid'])
c('Diabetes mellitus', D, EN, [('PA31.5', None)])
c('Hyperparathyroidism', D, EN, [('PA31.6', None)], [], ['medicine', 'surgery'], ['parathyroid'])
c('Pancreatic carcinoma', D, GI, [('PA31.7', None)], ['Pancreatic cancer', 'Carcinoma pancreas'], ['surgery'], ['pancreas'])
c('Adrenal insufficiency', D, EN, [('PA31.8', None)], ['Hypoadrenalism'], ['medicine'], ['adrenal'])
c('Cushing syndrome', D, EN, [('PA31.9', None)], ["Cushing's syndrome", 'Hypercortisolism'], ['medicine'], ['adrenal'])
c('Adrenal tumours', D, EN, [('PA31.10', None)], ['Adrenal neoplasms'], ['surgery'], ['adrenal'])
# ---- Bone, joints and soft tissue
c('Osteomyelitis', D, MS, [('PA32.1', None)], [], ['orthopaedics'], ['bone'])
c('Bone tumours', D, MS, [('PA32.2', None), ('PA32.7', None)], ['Bone tumors'], ['orthopaedics'], ['bone'])
c('Soft tissue tumours', D, MS, [('PA32.3', None)], ['Soft tissue tumors'], ['surgery', 'orthopaedics'])
c('Paget disease of bone', D, MS, [('PA32.4', None)], ["Paget's disease of bone", 'Osteitis deformans'], ['orthopaedics'], ['bone'])
c('Rheumatoid arthritis', D, MS, [('PA32.5', None)], [], ['medicine', 'orthopaedics'], ['joint'])
c('Osteoarthritis', D, MS, [S('PA32.6', 'Explain degenerative joint injury in osteoarthritis using its diagnostic criteria and characteristic findings.')], ['Degenerative joint disease'], ['orthopaedics'], ['joint'])
c('Gout', D, MS, [S('PA32.6', 'Explain crystal-mediated joint injury in gout using its diagnostic criteria and characteristic findings.')], ['Gouty arthritis'], ['medicine', 'orthopaedics'], ['joint'])
# ---- Skin, CNS and eye
c('Cutaneous squamous cell carcinoma', D, SK, [('PA33.1', None), ('PA33.4', None)], ['Squamous cell carcinoma of skin'], ['dermatology', 'surgery'], ['skin'])
c('Basal cell carcinoma', D, SK, [('PA33.2', None)], ['BCC', 'Rodent ulcer'], ['dermatology', 'surgery'], ['skin'])
c('Melanoma', D, SK, [S('PA33.3', 'Distinguish malignant melanoma from benign melanocytic lesions and relate risks, morphology and prognosis.')], ['Malignant melanoma'], ['dermatology', 'surgery'], ['skin'])
c('Melanocytic naevi', D, SK, [S('PA33.3', 'Describe representative benign melanocytic naevi and their distinction from melanoma.')], ['Naevi', 'Moles', 'Melanocytic nevi'], ['dermatology'], ['skin'])
c('Meningitis', D, NV, [('PA34.1', None), S('PA34.3', 'Interpret sample CSF panels to identify the most likely cause of meningitis and state relevant limitations.')], [], ['medicine', 'microbiology', 'pediatrics'], ['meninges'])
c('Cerebrospinal fluid', ST, NV, [S('PA34.3', 'Interpret representative CSF panels and recognise their limitations.')])
c('Central nervous system tumours', D, NV, [('PA34.2', None)], ['CNS tumours', 'Brain tumours'], ['surgery'], ['brain'])
c('Retinoblastoma', D, 'special-senses', [('PA35.1', None)], [], ['ophthalmology', 'pediatrics'], ['eye'])
