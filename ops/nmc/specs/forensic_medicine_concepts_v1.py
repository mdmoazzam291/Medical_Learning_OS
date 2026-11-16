EXISTING = {
 'Brain death': 'C-2c3ce0a2-1f22-4494-842a-86781bc44f56',
 'Drowning': 'C-ebf836f2-9336-47b4-869f-40ea6b0bdbaa',
 'Asphyxia': 'C-8f559e73-cf2d-453c-bf28-1553c0c03a3c',
 'Cold injury': 'C-6e472b7d-2ced-4ec5-ad21-14a78c4ff95b',
 'Heat stroke': 'C-3d1fdbd5-c82c-4f15-bc6d-a20b3b3fe372',
 'Patient confidentiality': 'C-641d0da2-96e6-46a4-a64d-74698ca83bdf',
 'Poisoning': 'C-64d4948e-35f0-451f-bbd4-8d18bbac4383',
 'Snakebite': 'C-f42d7efc-54dd-4dee-b592-c0746d7af247',
 'Methanol poisoning': 'C-f939afc2-5d09-43ea-8b50-2489c159b284',
 'Substance use disorders': 'C-6345395e-86f2-4328-b1af-55cbc71c535d',
 'Food poisoning': 'C-3765282a-6aec-47a4-8c6e-13a26744fea6',
 'Blood groups': 'C-c9c35a54-59e2-43be-9f9d-edbdfa2c00cf',
 'Contraception': 'C-c9154160-3a41-4767-928b-eddc29a19061',
 'In vitro fertilization': 'C-f4609e70-6e01-4ec3-b88b-a0c6b67e484d',
 'Infertility': 'C-4ad0a6f8-98ab-4d55-b414-c09b76252dfa',
 'Pregnancy': 'C-a354e0e4-9638-44d8-876b-87ba9ecacf14',
 'HIV infection': 'C-67c5fb8a-ff54-4768-b21e-a27cbc81600b',
 'Stem cells': 'C-5b56177b-a601-4e90-ab6b-488b116956cd',
}
"""Forensic Medicine concept specification v1 (2026-11-16). ADR-134/135 rules; EXISTING reuses accepted
identities. FM2:12 (unresolved printed code) stays on the source-exception track. Law, ethics and
procedure rows are modelled as field or clinical-skill concepts named for the thing taught."""
SUBJECT = 'forensic-medicine'
SUBJECT_NAME = 'Forensic Medicine'
BATCH_KIND = 'concept batch'
VERSION = 'v1'
CONCEPT_TYPES = ('structure', 'function', 'disorder', 'clinical-finding', 'investigation',
                 'clinical-skill', 'intervention', 'field')
EVIDENCED_SUBJECTS_ONLY = True
EXTRA_TEST_LABELS = r'|screening|estimation|profiling|analytical'
C = []
def c(label, kind, system, links, aliases=(), expected=(), organs=(), task=None):
    d = {'label': label, 'aliases': list(aliases), 'system': system, 'links': links, 'extraSubjects': list(expected),
         'conceptType': kind, 'umbrella': False, 'organs': list(organs)}
    if task: d['task'] = task
    C.append(d)
S = lambda code, text: (code, text)
D, F, X, I, K, FI, IV, ST = 'disorder', 'function', 'field', 'investigation', 'clinical-skill', 'clinical-finding', 'intervention', 'structure'
G, RP, NV, R = 'general', 'reproductive', 'nervous', 'respiratory'
# ---- Introduction and legal procedure
c('Forensic medicine', X, G, [('FM1.1', None), ('FM1.2', None)], ['Legal medicine'])
c('Indian medico-legal system', X, G, [('FM1.3', None), ('FM1.8', None)], ['Medico-legal framework in India'])
c('Courts of law', X, G, [('FM1.4', None)], ['Law courts'])
c('Medical testimony', K, G, [('FM1.5', None), ('FM1.6', None), ('FM14.20', None)], ['Medical evidence in court', 'Expert witness testimony'])
c('Dying declaration', K, G, [('FM1.7', None), ('FM14.18', None)], [], ['medicine', 'surgery'])
c('Medical records', K, G, [('FM1.9', None)], ['Medical documentation'], ['medicine'])
# ---- Death and autopsy
c('Medical certification of cause of death', K, G, [('FM2.1', None), ('FM2.2', None), ('FM14.5', None)], ['MCCD', 'Death certification'], ['medicine', 'community-medicine'])
c('Death', F, G, [S('FM2.3', 'Distinguish somatic from cellular death and explain how the moment of death is determined.')], [])
c('Brain death', D, NV, [S('FM2.3', 'Compare cortical and brainstem concepts of death and explain the legal criteria for certifying brainstem death.')])
c('Organ donation', IV, G, [('FM2.4', None)], [], ['surgery'])
c('Sudden natural death', D, G, [('FM2.5', None)], [], ['medicine', 'pathology'])
c('Manner of death', X, G, [('FM2.6', None)], [])
c('Modes of death', F, G, [('FM2.7', None)], [])
c('Apparent death', FI, G, [('FM2.8', None)], ['Suspended animation'])
c('Early post-mortem changes', FI, G, [('FM2.9', None)], [])
c('Late post-mortem changes', FI, G, [('FM2.10', None)], ['Decomposition'])
c('Time since death', I, G, [('FM2.11', None)], ['Post-mortem interval'])
c('Autopsy', I, G, [('FM2.13', None), ('FM2.14', None), ('FM2.15', None), ('FM2.16', None), ('FM2.25', None), ('FM2.26', None), ('FM14.6', None)], ['Post-mortem examination', 'Necropsy'], ['pathology'])
c('Cold injury', D, G, [S('FM2.17', 'Compare systemic and localised cold injuries by clinical features, post-mortem findings and medico-legal significance.')])
c('Heat stroke', D, G, [S('FM2.17', 'Compare heat-related injuries by clinical features, post-mortem findings and medico-legal significance.')])
c('Burns', D, G, [S('FM2.18', 'Distinguish burns and scalds by mechanism, findings and medico-legal significance, including estimation of extent.')], [], ['surgery'], ['skin'])
c('Electrical injuries', D, G, [S('FM2.18', 'Distinguish electrocution, lightning and radiation injury by mechanism, findings and medico-legal significance.')], ['Electrocution'], ['surgery'])
c('Starvation', D, G, [('FM2.19', None)], [], ['pediatrics'])
c('Custodial death', D, G, [('FM 2.20', None)], ['Death in custody'])
c('Exhumation', I, G, [('FM2.22', None)], [])
c('Crime scene investigation', I, G, [('FM2.23', None)], ['Scene of crime examination'])
c('Perioperative deaths', D, G, [('FM2.24', None)], ['Deaths related to anaesthesia and surgery'], ['anaesthesia', 'surgery'])
c('Medico-legal communication', K, G, [('FM2.27', None), ('FM10.10', None)], [])
c('Mass disaster management', IV, G, [('FM2.28', None)], ['Mass fatality management'], ['community-medicine'])
# ---- Asphyxia
c('Asphyxia', D, R, [('FM3.1', None)])
c('Hanging', D, R, [S('FM3.2', 'Compare the mechanism, clinical findings and post-mortem pattern of hanging and plan documentation.')])
c('Strangulation', D, R, [S('FM3.2', 'Compare the mechanism, clinical findings and post-mortem pattern of ligature and manual strangulation and plan documentation.')], [])
c('Suffocation', D, R, [S('FM3.3', 'Compare smothering, choking, gagging, traumatic and sexual asphyxia by mechanism and findings.')], [])
c('Drowning', D, R, [('FM3.4', None)])
# ---- Identification
c('Personal identification', I, G, [('FM4.1', None), ('FM 4.4', None), ('FM4.5', None), ('FM2.21', None), ('FM14.8', None)], ['Identification of persons', 'Forensic identification'])
c('Forensic odontology', I, G, [('FM4.2', None)], ['Forensic dentistry'])
c('Age estimation', I, G, [('FM4.3', None), ('FM14.4', None)], [], ['radiology', 'anatomy'])
# ---- Injuries
c('Mechanical injuries', D, G, [('FM5.1', None), ('FM5.3', None), ('FM14.9', None)], [], ['surgery'])
c('Hurt', X, G, [('FM5.2', None)], ['Legal definition of hurt'])
c('Age of injuries', I, G, [('FM5.4', None)], ['Dating of injuries'])
c('Injury report', K, G, [('FM5.5', None), ('FM14.1', None)], ['Wound certificate'], ['surgery'])
c('Weapons', I, G, [('FM5.6', None), ('FM14.10', None)], ['Weapon examination'])
c('Firearms', I, G, [('FM6.1', None), ('FM14.11', None)], ['Firearms and ammunition'])
c('Firearm injuries', D, G, [S('FM6.2', 'Interpret representative firearm wound patterns and plan collection and preservation of evidence.')], ['Gunshot wounds'], ['surgery'])
c('Blast injuries', D, G, [S('FM6.2', 'Interpret representative blast injury patterns and plan collection and preservation of evidence.')], ['Explosion injuries'], ['surgery'])
c('Regional injuries', D, G, [('FM7.1', None)], [], ['surgery', 'orthopaedics'])
c('Transport injuries', D, G, [('FM7.2', None)], ['Road traffic injuries'], ['surgery', 'orthopaedics'])
# ---- Sexual and reproductive medico-legal issues
c('Sexual offences', X, RP, [('FM8.1', None), ('FM8.3', None), ('FM14.13', None)], ['Sexual crimes'])
c('Sexual assault examination', K, RP, [('FM8.2', None), ('FM14.14', None)], ['Examination of sexual violence survivor'], ['obstetrics-gynaecology'])
c('Infanticide', D, G, [('FM 8.4', None)], [], ['pediatrics', 'obstetrics-gynaecology'])
c('Signs of live birth', I, G, [S('FM8.5', 'Compare evidence of intrauterine death and live birth in a newborn.')], [], ['pediatrics'])
c('Fetal age estimation', I, RP, [S('FM8.5', 'Estimate gestational age from fetal findings and state the uncertainty.'), ('FM14.12', None)], ['Estimation of gestational age'], ['obstetrics-gynaecology'])
c('Paraphilic disorders', D, NV, [('FM8.6', None)], ['Paraphilias'], ['psychiatry'])
c('Legitimacy', X, RP, [('FM8.7', None)], [])
c('Pregnancy', F, RP, [S('FM8.8', 'Compare evidence of pregnancy and of recent or remote delivery in living and deceased persons.')])
c('Disputed paternity', X, RP, [('FM8.9', None)], ['Disputed parentage'])
c('PCPNDT Act', X, RP, [S('FM8.10', 'Identify the purposes of the PCPNDT Act and clinician responsibilities under it.')], ['Pre-Conception and Pre-Natal Diagnostic Techniques Act'], ['obstetrics-gynaecology', 'community-medicine'])
c('Domestic violence', D, G, [S('FM8.10', 'Identify the purposes of domestic violence law and clinician responsibilities under it.'), ('FM10.9', None)], ['Family violence'], ['psychiatry'])
c('Sexual dysfunction', D, RP, [S('FM8.11', 'Distinguish sexual dysfunction from infertility and compare representative causes and their medico-legal significance.')], [], ['psychiatry'])
c('Infertility', D, RP, [S('FM8.11', 'Explain the medico-legal significance of infertility.')])
c('In vitro fertilization', IV, RP, [S('FM8.12', 'Compare IVF and related reproductive interventions in representative medico-legal scenarios.')])
c('Artificial insemination', IV, RP, [S('FM8.12', 'Explain the medico-legal aspects of artificial insemination.')], [], ['obstetrics-gynaecology'])
c('Surrogacy', IV, RP, [S('FM8.12', 'Explain the medico-legal aspects of surrogacy.'), S('FM 8.14', 'Use the applicable Indian acts and rules to explain the regulation of surrogacy.')], [], ['obstetrics-gynaecology'])
c('Assisted reproductive technology', IV, RP, [S('FM 8.14', 'Use the applicable Indian acts and rules to compare registration, supervision and regulation of assisted reproduction.')], [], ['obstetrics-gynaecology'])
c('Contraception', IV, RP, [('FM8.13', None)])
c('Abortion', D, RP, [('FM8.15', None), ('FM8.16', None)], ['Medical termination of pregnancy', 'Termination of pregnancy'], ['obstetrics-gynaecology'])
# ---- Child abuse, torture and human rights
c('Child abuse', D, G, [('FM9.1', None)], ['Child maltreatment'], ['pediatrics'])
c('Torture', D, G, [('FM9.2', None), ('FM9.3', None), ('FM14.17', None)], [], ['psychiatry'])
c('Trauma-informed care', K, G, [('FM9.4', None), ('FM10.13', None)], ['Survivor-centred care'], ['psychiatry'])
# ---- Medical jurisprudence and ethics
c('Medical ethics', X, G, [('FM10.1', None)], [])
c('Bioethics', X, G, [('FM10.16', None), ('FM10.17', None)], ['Principles of bioethics'])
c('Medical regulation', X, G, [('FM10.2', None), ('FM10.3', None), ('FM10.5', None)], ['Medical councils'])
c('Professional conduct', K, G, [('FM10.4', None), ('FM10.6', None), ('FM10.28', None), ('FM10.24', None)], [])
c('HIV infection', D, 'immune', [S('FM10.7', 'Use the HIV and AIDS Act to analyse confidentiality, consent and discrimination in a simulated case.')])
c('Consumer protection in healthcare', X, G, [('FM10.8', None)], ['Consumer Protection Act and medical practice'])
c('End-of-life decisions', X, G, [('FM10.11', None)], ['Euthanasia and withdrawal of treatment'], ['medicine'])
c('Stem cells', 'structure', G, [S('FM10.12', 'Use current research guidance to identify consent, oversight and safety concerns in stem cell research.')])
c('Conflict resolution', K, G, [('FM10.14', None), ('FM10.15', None)], [])
c('Medical negligence', X, G, [('FM10.18', None)], ['Professional negligence', 'Malpractice'], ['medicine', 'surgery'])
c('Informed consent', K, G, [('FM10.19', None)], [], ['surgery', 'medicine'])
c('Patient confidentiality', K, G, [S('FM10.20', 'Distinguish professional secrecy, therapeutic privilege and privileged communication.')])
c('Professional indemnity', X, G, [('FM10.21', None)], ['Medical indemnity'])
c('Medical oaths', X, G, [('FM10.22', None), ('FM10.23', None)], ['Physician oath'])
c('Research ethics', X, G, [('FM10.25', None), ('FM10.27', None), ('FM10.29', None)], ['Ethics in research'], ['community-medicine', 'pharmacology'])
c('Ethics committees', X, G, [('FM10.26', None)], ['Institutional ethics committee'], ['pharmacology'])
# ---- Forensic psychiatry
c('Mental disorders', D, NV, [('FM11.1', None)], ['Mental illness'], ['psychiatry'])
c('Psychiatric symptoms', FI, NV, [('FM11.2', None)], ['Psychopathology'], ['psychiatry'])
c('Criminal responsibility', X, NV, [('FM11.3', None)], ['Legal responsibility of the mentally ill'], ['psychiatry'])
c('Malingering', FI, G, [('FM11.4', None)], ['Feigned illness'], ['psychiatry'])
c('Delirium tremens', D, NV, [('FM11.5', None)], ['Alcohol withdrawal delirium'], ['psychiatry', 'medicine'])
c('Mental Healthcare Act', X, NV, [('FM11.6', None)], ['Mental health law'], ['psychiatry'])
# ---- Forensic laboratory and evidence
c('Medico-legal exhibits', K, G, [('FM12.1', None), ('FM12.2', None), ('FM12.4', None), ('FM13.5', None), ('FM13.9', None), ('FM14.3', None)], ['Forensic specimens'], ['pathology'])
c('Digital evidence', X, G, [('FM12.3', None)], [])
c('Medico-legal report', K, G, [('FM12.5', None)], ['Medico-legal reporting'])
c('DNA profiling', I, G, [S('FM12.6', 'Explain the principle, uses and limits of DNA profiling as forensic evidence.'), S('FM8.9', 'Explain how genetic testing informs disputed maternity or paternity.'), ('FM14.19', None)], ['DNA fingerprinting'], ['biochemistry'])
c('Forensic investigative technologies', I, G, [S('FM12.6', 'Compare facial reconstruction, polygraphy, narcoanalysis and brain mapping by principle, use and legal limits.')], [])
# ---- Toxicology
c('Toxicology', X, G, [('FM13.1', None), ('FM13.2', None), ('FM14.16', None)], ['Clinical and forensic toxicology'], ['pharmacology'])
c('Poisoning', D, G, [('FM13.3', None), ('FM13.6', None), ('FM13.8', None), ('FM14.2', None)])
c('NDPS Act', X, G, [('FM13.4', None)], ['Narcotic Drugs and Psychotropic Substances Act'], ['pharmacology', 'psychiatry'])
c('Toxicological screening', I, G, [('FM13.7', None)], ['Bedside toxicology tests'])
c('Analytical toxicology', I, G, [('FM13.10', None)], [])
c('Corrosive poisoning', D, G, [('FM13.11', None)], ['Caustic poisoning'], ['medicine'])
c('Non-metallic inorganic poisoning', D, G, [('FM13.12', None)], [], ['medicine'])
c('Heavy metal poisoning', D, G, [('FM13.13', None)], ['Metal poisoning'], ['medicine', 'pharmacology'])
c('Methanol poisoning', D, G, [S('FM13.14', 'Distinguish methanol and ethylene glycol toxicity from ethanol and outline simulated assessment of adulterated liquor poisoning.')])
c('Alcohol intoxication', D, G, [S('FM13.14', 'Explain ethanol intoxication and its medico-legal assessment.'), ('FM14.15', None)], ['Ethanol intoxication', 'Drunkenness'], ['medicine', 'psychiatry'])
c('Pesticide poisoning', D, G, [('FM13.15', None)], ['Agrochemical poisoning'], ['medicine'])
c('Carbon monoxide poisoning', D, R, [S('FM13.16', 'Explain the mechanism, presentation, medico-legal findings and management of carbon monoxide poisoning.')], ['CO poisoning'], ['medicine'])
c('Cyanide poisoning', D, G, [S('FM13.16', 'Explain the mechanism, presentation, medico-legal findings and management of cyanide poisoning.')], [], ['medicine'])
c('Toxic gas inhalation', D, R, [S('FM13.16', 'Compare ammonia, methyl isocyanate and riot-control agent exposures by mechanism and management.')], ['Irritant gas poisoning'], ['community-medicine'])
c('Drug poisoning', D, G, [('FM13.17', None), ('FM13.18', None)], ['Drug overdose'], ['pharmacology', 'medicine'])
c('Snakebite', D, G, [S('FM13.19', 'Compare snakebite presentations and explain initial assessment and treatment.')])
c('Scorpion sting', D, G, [S('FM13.19', 'Compare scorpion, bee, wasp and spider envenomation and explain initial assessment and treatment.')], ['Scorpion envenomation'], ['medicine', 'pediatrics'])
c('Substance use disorders', D, NV, [S('FM13.20', 'Compare the toxicology of tobacco, cannabis, stimulants, hallucinogens, designer drugs and solvents.')])
c('Food poisoning', D, 'gastrointestinal', [S('FM13.20', 'Compare mushroom and other food-borne toxic exposures and their medico-legal assessment.')])
c('Occupational toxicology', X, G, [('FM13.21', None)], [], ['community-medicine'])
c('Blood groups', ST, 'haematological', [('FM14.7', None)])
