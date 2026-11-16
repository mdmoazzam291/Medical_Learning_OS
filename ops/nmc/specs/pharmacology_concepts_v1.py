EXISTING = {
 'Antimicrobial stewardship': 'C-6ba1b7a7-db11-4966-9a12-d26810aed6a2',
 'Disinfection': 'C-27e75789-c530-4be9-a10a-2d4076e274bc',
 'Contraception': 'C-c9154160-3a41-4767-928b-eddc29a19061',
 'Urinary tract infection': 'C-4ea2bdcb-27f5-4fbd-a9fd-6d3c9b48b35e',
 'Sexually transmitted infections': 'C-44b483d9-c7f0-42c0-9482-ebca0067ca7c',
 'Alcohol metabolism': 'C-73157719-0c8d-44c3-b819-357c1d294850',
 'Antimicrobial resistance': 'C-9e9630b9-83e1-4e4a-a9b7-39724d447a25',
}
"""Pharmacology concept specification v1 (2026-11-16). ADR-134/135 rules. Drug-therapy rows are named
by the drug class taught (the entity), not by the disease; diseases already accepted are reused only
where the row is about treating that disease (e.g. UTI and STI prescribing)."""
SUBJECT = 'pharmacology'
SUBJECT_NAME = 'Pharmacology'
BATCH_KIND = 'concept batch'
VERSION = 'v1'
CONCEPT_TYPES = ('structure', 'function', 'disorder', 'clinical-finding', 'investigation',
                 'clinical-skill', 'intervention', 'field')
EVIDENCED_SUBJECTS_ONLY = True
EXTRA_TEST_LABELS = r'|monitoring'
C = []
def c(label, kind, system, links, aliases=(), expected=(), organs=(), task=None):
    d = {'label': label, 'aliases': list(aliases), 'system': system, 'links': links, 'extraSubjects': list(expected),
         'conceptType': kind, 'umbrella': False, 'organs': list(organs)}
    if task: d['task'] = task
    C.append(d)
S = lambda code, text: (code, text)
DR, F, X, K, D, I = 'intervention', 'function', 'field', 'clinical-skill', 'disorder', 'investigation'
G, H, IM, GI, R, CV, RN, RP, EN, MS, NV = 'general', 'haematological', 'immune', 'gastrointestinal', 'respiratory', 'cardiovascular', 'renal', 'reproductive', 'endocrine', 'musculoskeletal', 'nervous'
# ---- General pharmacology
c('Pharmacology', X, G, [('PH1.1', None)])
c('Rational use of medicines', K, G, [('PH1.2', None)], ['Rational drug use'], ['medicine'])
c('Drug nomenclature', X, G, [('PH1.3', None)], ['Drug names'])
c('Drug formulations', DR, G, [('PH1.4', None)], ['Dosage forms'])
c('Routes of drug administration', K, G, [('PH1.5', None)], ['Routes of administration'], ['medicine', 'anaesthesia'])
c('Pharmacokinetics', F, G, [('PH1.6', None)])
c('Pharmacodynamics', F, G, [('PH1.7', None), ('PH1.8', None)], ['Mechanisms of drug action'])
c('Drug combinations', DR, G, [('PH 1.9', None)], [])
c('Prescribing in special populations', K, G, [('PH1.10', None), ('PH10.9', None)], [], ['medicine', 'pediatrics', 'obstetrics-gynaecology'])
c('Adverse drug reactions', D, G, [('PH 1.11', None)], ['ADR', 'Adverse drug events'], ['medicine'])
c('Pharmacovigilance', X, G, [('PH1.12', None)], ['Drug safety monitoring'], ['community-medicine'])
c('Drug interactions', F, G, [('PH1.13', None)], ['Drug-drug interactions'], ['medicine'])
# ---- Autonomic, peripheral and autacoids
c('Adrenergic drugs', DR, NV, [('PH2.1', None)], [])
c('Cholinergic drugs', DR, NV, [('PH2.2', None)], [])
c('Vasopressors and inotropes', DR, CV, [('PH 2.3', None)], ['Vasopressors'], ['medicine', 'anaesthesia'])
c('Skeletal muscle relaxants', DR, MS, [('PH2.4', None)], [], ['anaesthesia'])
c('Local anaesthetics', DR, NV, [('PH2.5', None)], ['Local anesthetics'], ['anaesthesia', 'surgery'])
c('Antihistamines', DR, IM, [('PH2.6', None)], ['H1 antihistamines'], ['medicine', 'dermatology'])
c('Non-opioid analgesics', DR, NV, [('PH2.7', None)], [], ['medicine', 'orthopaedics'])
c('Antigout drugs', DR, MS, [S('PH2.8', 'Build and justify a pharmacotherapy plan for a simulated case of gout.')], ['Drugs for gout'], ['medicine', 'orthopaedics'])
c('Antirheumatic drugs', DR, MS, [S('PH2.8', 'Build and justify a pharmacotherapy plan for a simulated case of arthritis, including disease-modifying drugs.')], ['DMARDs', 'Disease-modifying antirheumatic drugs'], ['medicine', 'orthopaedics'])
c('Antimigraine drugs', DR, NV, [S('PH2.8', 'Build and justify acute and preventive pharmacotherapy for a simulated case of migraine.')], ['Drugs for migraine'], ['medicine'])
# ---- CNS
c('General anaesthetics', DR, NV, [('PH3.1', None)], ['General anesthetics'], ['anaesthesia'])
c('Sedative-hypnotics', DR, NV, [('PH3.2', None)], ['Sedatives and hypnotics'], ['psychiatry'])
c('Antiseizure medicines', DR, NV, [('PH3.3', None)], ['Antiepileptic drugs', 'Anticonvulsants'], ['medicine', 'pediatrics'])
c('Opioid analgesics', DR, NV, [('PH3.4', None)], ['Opioids'], ['anaesthesia', 'medicine'])
c('Antidepressants', DR, NV, [S('PH3.5', 'Compare antidepressant classes by kinetics, actions, uses and adverse effects and develop a simulated treatment plan for depression.')], [], ['psychiatry'])
c('Antipsychotics', DR, NV, [S('PH3.5', 'Compare antipsychotic classes by kinetics, actions, uses and adverse effects and develop a simulated treatment plan for psychosis.')], ['Neuroleptics'], ['psychiatry'])
c('Anxiolytics', DR, NV, [('PH3.6', None)], ['Antianxiety drugs'], ['psychiatry'])
c('Antiparkinsonian drugs', DR, NV, [('PH3.7', None)], ['Drugs for parkinsonism'], ['medicine'])
c('Methanol poisoning', D, G, [S('PH3.8', 'Recognise methanol poisoning and outline its supervised management.')], ['Methyl alcohol poisoning'], ['forensic-medicine', 'medicine'])
c('Alcohol metabolism', F, G, [S('PH3.8', 'Distinguish chronic ethanol-related presentations from methanol poisoning and relate them to ethanol pharmacology.')])
c('Substance use disorders', D, NV, [('PH3.9', None), ('PH10.16', None)], ['Drug dependence'], ['psychiatry', 'forensic-medicine'])
# ---- Cardiovascular and blood
c('Haematinics', DR, H, [('PH4.1', None)], ['Hematinics'], ['medicine', 'pathology'])
c('Anticoagulants', DR, H, [('PH4.2', None)], ['Anticoagulant drugs'], ['medicine'])
c('Fibrinolytics', DR, H, [('PH4.3', None)], ['Thrombolytics', 'Fibrinolytic drugs'], ['medicine'])
c('Antiplatelet drugs', DR, H, [('PH4.4', None)], ['Antiplatelet agents'], ['medicine'])
c('Diuretics', DR, RN, [('PH4.5', None)], [], ['medicine'])
c('Renin-angiotensin system inhibitors', DR, CV, [('PH4.6', None)], ['RAAS inhibitors', 'RAS inhibitors'], ['medicine'])
c('Antihypertensive drugs', DR, CV, [('PH4.7', None)], ['Antihypertensives'], ['medicine'])
c('Antianginal drugs', DR, CV, [('PH4.8', None)], ['Drugs for ischaemic heart disease'], ['medicine'])
c('Drugs used in heart failure', DR, CV, [('PH4.9', None)], ['Heart failure pharmacotherapy'], ['medicine'])
c('Antiarrhythmic drugs', DR, CV, [('PH4.10', None)], ['Antiarrhythmics'], ['medicine'])
c('Lipid-lowering drugs', DR, CV, [('PH4.11', None)], ['Hypolipidaemic drugs', 'Hypolipidemic drugs'], ['medicine'])
# ---- Respiratory and GI
c('Drugs for asthma and COPD', DR, R, [('PH5.1', None)], ['Antiasthmatic drugs'], ['medicine', 'pediatrics'])
c('Antitussives', DR, R, [('PH5.2', None)], ['Cough medicines'], ['medicine'])
c('Antiulcer drugs', DR, GI, [('PH6.1', None)], ['Drugs for acid peptic disease'], ['medicine'])
c('Antiemetics', DR, GI, [('PH6.2', None)], ['Antiemetic drugs'], ['medicine'])
c('Antidiarrhoeal drugs', DR, GI, [('PH6.3', None)], ['Antidiarrheal drugs'], ['medicine', 'pediatrics'])
c('Laxatives', DR, GI, [('PH6.4', None)], ['Purgatives'], ['medicine'])
c('Drugs for inflammatory bowel disease', DR, GI, [('PH6.5', None)], ['IBD drugs'], ['medicine'])
# ---- Endocrine and reproductive
c('Antidiabetic drugs', DR, EN, [('PH7.1', None)], ['Hypoglycaemic agents', 'Hypoglycemic agents'], ['medicine'])
c('Antiosteoporotic drugs', DR, MS, [('PH7.2', None)], ['Drugs for osteoporosis'], ['medicine', 'orthopaedics'])
c('Thyroid hormone replacement', DR, EN, [S('PH7.3', 'Compare thyroid hormone preparations and build a simulated replacement plan for hypothyroidism.')], ['Thyroxine replacement'], ['medicine'])
c('Antithyroid drugs', DR, EN, [S('PH7.3', 'Compare antithyroid agents by kinetics, actions and adverse effects and build a simulated plan for hyperthyroidism.')], [], ['medicine'])
c('Pituitary hormone drugs', DR, EN, [('PH7.4', None)], ['Hypothalamic and pituitary hormones'], ['medicine'])
c('Corticosteroids', DR, EN, [('PH7.5', None)], [], ['medicine'])
c('Androgens', DR, RP, [S('PH7.6', 'Compare androgens and anabolic steroids by kinetics, actions, indications, contraindications and harms.')], [], ['medicine'])
c('Drugs for erectile dysfunction', DR, RP, [S('PH7.6', 'Compare drugs for erectile dysfunction by kinetics, actions, indications, contraindications and harms.')], [], ['medicine'])
c('Female sex hormones', DR, RP, [S('PH7.7', 'Compare oestrogens, progestins and their modulators by kinetics, actions, indications and harms.')], ['Estrogens and progestins', 'Oestrogens and progestins'], ['obstetrics-gynaecology'])
c('Contraception', DR, RP, [S('PH7.7', 'Compare hormonal contraceptives and counsel on their correct use in a simulated consultation.')])
c('Uterotonics', DR, RP, [S('PH7.8', 'Compare uterotonics by kinetics, actions, indications, contraindications and adverse effects.')], ['Oxytocics'], ['obstetrics-gynaecology'])
c('Tocolytics', DR, RP, [S('PH7.8', 'Compare tocolytics by kinetics, actions, indications, contraindications and adverse effects.')], ['Uterine relaxants'], ['obstetrics-gynaecology'])
c('Drugs for infertility', DR, RP, [('PH7.9', None)], ['Fertility drugs'], ['obstetrics-gynaecology'])
# ---- Chemotherapy
c('Antimicrobial chemotherapy', DR, G, [('PH8.1', None)], ['Principles of antimicrobial therapy'], ['microbiology', 'medicine'])
c('Antimicrobial stewardship', DR, G, [('PH8.2', None)])
c('Antibacterial drugs', DR, G, [('PH8.3', None)], ['Antibiotics'], ['microbiology', 'medicine'])
c('Urinary tract infection', D, RN, [S('PH8.4', 'Build a simulated treatment plan for urinary tract infection using clinical and microbiological data and counsel on correct use.')])
c('Sexually transmitted infections', D, RP, [S('PH8.4', 'Build a simulated treatment plan for a sexually transmitted infection using clinical and microbiological data and counsel on correct use.')])
c('Antitubercular drugs', DR, R, [('PH8.5', None)], ['Anti-TB drugs', 'Antituberculosis drugs'], ['medicine', 'community-medicine'])
c('Antileprosy drugs', DR, G, [('PH8.6', None)], [], ['dermatology'])
c('Antiprotozoal drugs', DR, G, [S('PH8.7', 'Compare agents for amoebiasis, visceral leishmaniasis and malaria by kinetics, targets and adverse effects.')], ['Antiprotozoals'], ['medicine'])
c('Antifilarial drugs', DR, G, [S('PH8.7', 'Compare agents for filariasis by kinetics, targets and adverse effects.')], [], ['community-medicine'])
c('Antifungal drugs', DR, G, [('PH8.8', None)], ['Antifungals'], ['dermatology', 'microbiology'])
c('Anthelmintics', DR, GI, [('PH8.9', None)], ['Anthelmintic drugs'], ['pediatrics'])
c('Antiviral drugs', DR, G, [S('PH8.10', 'Compare representative antiviral agents by kinetics, actions, indications, contraindications and adverse effects.')], ['Antivirals'], ['medicine', 'microbiology'])
c('Antiretroviral drugs', DR, IM, [S('PH8.10', 'Compare antiretroviral drug classes by kinetics, actions, indications and adverse effects.')], ['ART drugs', 'Antiretrovirals'], ['medicine'])
c('Anticancer drugs', DR, G, [('PH8.11', None)], ['Antineoplastic drugs', 'Cancer chemotherapy'], ['medicine', 'surgery'])
# ---- Miscellaneous
c('Immunomodulators', DR, IM, [('PH9.1', None)], ['Immunomodulatory drugs'], ['medicine'])
c('Poisoning', D, G, [S('PH9.2', 'Use simulated cases to distinguish initial assessment, supportive care and specific antidotes in common poisonings.')], ['Acute poisoning'], ['forensic-medicine', 'medicine'])
c('Snakebite', D, G, [S('PH9.2', 'Outline assessment, supportive care and antivenom use in a simulated snakebite or sting.')], ['Snake envenomation'], ['forensic-medicine', 'medicine'])
c('Chelating agents', DR, G, [('PH9.3', None)], ['Chelators'], ['forensic-medicine'])
c('Vaccines', DR, IM, [('PH9.4', None)], [], ['community-medicine', 'pediatrics', 'microbiology'])
c('Disinfection', DR, G, [('PH9.5', None)])
c('Dermatological drugs', DR, 'general', [('PH9.6', None)], ['Topical skin medicines'], ['dermatology'], ['skin'])
c('Ocular drugs', DR, 'special-senses', [('PH9.7', None)], ['Ophthalmic drugs'], ['ophthalmology'], ['eye'])
# ---- Applied pharmacology
c('Drug information', X, G, [('PH10.1', None), ('PH10.13', None)], ['Drug information sources'])
c('Drug promotion', X, G, [('PH10.2', None)], ['Pharmaceutical promotion'])
c('Personal drug selection', K, G, [('PH10.3', None)], ['P-drug', 'Personal drugs'])
c('Prescription writing', K, G, [('PH10.4', None), ('PH10.6', None)], [], ['medicine'])
c('Legal and ethical aspects of prescribing', X, G, [('PH10.5', None)], [], ['forensic-medicine'])
c('Pharmacogenomics', F, G, [S('PH10.7', 'Use a simulated case to explain how genetic information can affect drug selection and dosing.')], ['Pharmacogenetics'], ['biochemistry'])
c('Pharmacoeconomics', X, G, [S('PH10.7', 'Use a simulated case to explain how treatment cost can affect drug selection.')], [], ['community-medicine'])
c('Essential medicines', X, G, [('PH10.8', None)], ['Essential medicines list'], ['community-medicine'])
c('Therapeutic drug monitoring', I, G, [('PH10.10', None)], ['TDM'], ['medicine'])
c('Drug regulation', X, G, [('PH10.11', None)], ['Drug regulatory framework'])
c('Drug development', X, G, [('PH10.12', None)], ['New drug development'])
c('Medication counselling', K, G, [('PH10.14', None), ('PH10.17', None)], ['Patient counselling on medicines'], ['medicine', 'community-medicine'])
c('Medication adherence', K, G, [('PH10.15', None)], ['Treatment adherence'], ['medicine'])
