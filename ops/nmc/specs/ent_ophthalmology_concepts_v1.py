EXISTING = {
 'Deafness': 'C-aec2f495-99a8-4ae0-bc5c-6840d441c59a',
 'Hearing tests': 'C-ee33f220-23a6-4972-89c7-698bf92cad30',
 'Informed consent': 'C-326aa73a-ebb4-4be2-877f-a78be8715daa',
 'HIV infection': 'C-67c5fb8a-ff54-4768-b21e-a27cbc81600b',
 'Refractive errors': 'C-7808faaf-0983-4818-8541-2aadeb68067e',
 'Optics of the eye': 'C-189dbaad-fa43-48bf-80f3-8f6738f4f49c',
 'Ocular drugs': 'C-0d593716-93c0-49b7-940e-8488b841d3cb',
 'Colour vision': 'C-e67f99f7-c4d7-483a-8d20-24acb07ef959',
 'Visual pathway': 'C-d1bdb2bd-5b7e-4ce1-b054-18b3993da4ba',
 'Upper respiratory tract infections': 'C-f7b33a40-242e-4222-9044-ef1ce4514014',
 'Oral cancer': 'C-69af2de3-db6d-4900-9bd5-74021cda66af',
 'Vestibular apparatus': 'C-76580695-f2ad-4551-aa49-f5cb5b5e9069',
}
"""ENT and Ophthalmology combined concept specification v1 (2026-11-17). One acceptance covers both
subjects; each concept lists only the subjects its own source rows evidence (ADR-135)."""
SUBJECT = 'ent-ophthalmology'
SUBJECTS = ('ent', 'ophthalmology')
SUBJECT_NAME = 'ENT and Ophthalmology'
BATCH_KIND = 'concept batch'
VERSION = 'v1'
CONCEPT_TYPES = ('structure', 'function', 'disorder', 'clinical-finding', 'investigation',
                 'clinical-skill', 'intervention', 'field')
EVIDENCED_SUBJECTS_ONLY = True
EXTRA_TEST_LABELS = r'|testing|audiometry|examination|scopy$|assessment'
C = []
def c(label, kind, system, links, aliases=(), expected=(), organs=(), task=None):
    d = {'label': label, 'aliases': list(aliases), 'system': system, 'links': links, 'extraSubjects': list(expected),
         'conceptType': kind, 'umbrella': False, 'organs': list(organs)}
    if task: d['task'] = task
    C.append(d)
S = lambda code, text: (code, text)
D, F, X, I, K, IV, ST, FI = 'disorder', 'function', 'field', 'investigation', 'clinical-skill', 'intervention', 'structure', 'clinical-finding'
SS, R, G, GI = 'special-senses', 'respiratory', 'general', 'gastrointestinal'
# ================= ENT
c('Ear, nose and throat', ST, SS, [('EN1.1', None)], ['ENT', 'Otorhinolaryngology'])
c('Chronic otitis media', D, SS, [S('EN1.2', 'Explain the mechanism of chronic otitis media.'), ('EN 4.6', None), ('EN 4.8', None)], ['Chronic suppurative otitis media', 'CSOM'], [], ['ear'])
c('Otosclerosis', D, SS, [S('EN1.2', 'Explain the mechanism of otosclerosis.'), ('EN 4.13', None)], ['Otospongiosis'], [], ['ear'])
c('Adenotonsillar disease', D, R, [S('EN1.2', 'Explain the mechanisms of adenotonsillitis.')], [], ['pediatrics'], ['pharynx'])
c('ENT history taking', K, SS, [('EN2.1', None)], [])
c('ENT examination', K, SS, [('EN2.2', None)], ['Ear, nose and throat examination'])
c('Hearing tests', I, SS, [('EN2.3', None), ('EN 2.4', None)])
c('Otoscopy', K, SS, [('EN 2.5', None)], [], [], ['ear'])
c('ENT investigations', I, SS, [('EN 2.6', None)], [])
c('ENT surgical instruments', ST, SS, [('EN 2.7', None)], [], ['surgery'])
c('Head and neck cancer', D, R, [('EN 2.8', None)], [], ['surgery', 'pathology'])
c('Informed consent', K, G, [S('EN 2.9', 'Role-play informed consent for representative ear, nose and throat procedures.')])
c('ENT emergencies', D, R, [('EN 2.10', None)], [], ['anaesthesia'])
c('Topical ENT medicines', IV, SS, [('EN 2.11', None)], ['Ear drops and nasal sprays'], ['pharmacology'])
c('National Programme for Prevention and Control of Deafness', X, G, [('EN 2.12', None)], ['NPPCD'], ['community-medicine'])
c('Otomicroscopy', I, SS, [('EN3.1', None)], [], [], ['ear'])
c('Nasal endoscopy', I, R, [('EN3.2', None)], ['Diagnostic nasal endoscopy'], [], ['nose'])
c('Laryngoscopy', I, R, [('EN3.3', None)], [], ['anaesthesia'], ['larynx'])
c('Otalgia', FI, SS, [('EN 4.1', None)], ['Earache'], [], ['ear'])
c('External ear disorders', D, SS, [('EN 4.2', None)], [], ['dermatology'], ['ear'])
c('Acute suppurative otitis media', D, SS, [('EN 4.3', None)], ['ASOM', 'Acute otitis media'], ['pediatrics'], ['ear'])
c('Otitis media with effusion', D, SS, [('EN 4.4', None)], ['Glue ear', 'Secretory otitis media'], ['pediatrics'], ['ear'])
c('Otorrhoea', FI, SS, [('EN 4.5', None)], ['Ear discharge', 'Otorrhea'], [], ['ear'])
c('Cholesteatoma', D, SS, [('EN 4.7', None)], ['Squamosal chronic otitis media'], [], ['ear'])
c('Cerumen impaction', D, SS, [('EN 4.9', None)], ['Impacted wax'], [], ['ear'])
c('Myringotomy', IV, SS, [S('EN 4.10', 'Explain the indications and steps of myringotomy.')], [], ['surgery'], ['ear'])
c('Tympanoplasty', IV, SS, [S('EN 4.10', 'Explain the indications and steps of tympanoplasty.')], [], ['surgery'], ['ear'])
c('Mastoidectomy', IV, SS, [('EN 4.11', None)], [], ['surgery'], ['ear'])
c('Vestibular schwannoma', D, SS, [('EN 4.12', None)], ['Acoustic neuroma'], ['surgery'], ['ear'])
c('Deafness', D, SS, [('EN 4.14', None), ('EN 4.20', None)])
c('Eustachian tube dysfunction', D, SS, [('EN 4.15', None)], [], [], ['ear'])
c('Facial nerve palsy', D, 'nervous', [('EN 4.16', None)], ['Facial palsy'], ['medicine'])
c('Vertigo', FI, SS, [('EN 4.17', None)], [], ['medicine'], ['ear'])
c('Meniere disease', D, SS, [('EN 4.18', None)], ["Ménière's disease", "Meniere's disease"], [], ['ear'])
c('Tinnitus', FI, SS, [('EN 4.19', None)], [], [], ['ear'])
c('Nasal obstruction', FI, R, [('EN 4.21', None)], [], [], ['nose'])
c('Deviated nasal septum', D, R, [('EN 4.22', None)], ['Septal deviation'], ['surgery'], ['nose'])
c('Adenoid hypertrophy', D, R, [('EN 4.23', None)], ['Enlarged adenoids'], ['pediatrics'], ['pharynx'])
c('Allergic rhinitis', D, R, [('EN 4.24', None)], [], ['medicine'], ['nose'])
c('Vasomotor rhinitis', D, R, [('EN 4.25', None)], ['Nonallergic rhinitis'], [], ['nose'])
c('Rhinitis', D, R, [('EN 4.26', None)], [], [], ['nose'])
c('Nasal polyps', D, R, [('EN 4.27', None)], ['Nasal polyposis'], [], ['nose'])
c('Epistaxis', FI, R, [('EN 4.28', None)], ['Nosebleed'], ['medicine'], ['nose'])
c('Obstructive sleep apnoea', D, R, [('EN 4.29', None)], ['OSA', 'Obstructive sleep apnea'], ['medicine'])
c('Head and neck trauma', D, R, [('EN 4.30', None)], [], ['surgery'])
c('Juvenile nasopharyngeal angiofibroma', D, R, [('EN 4.31', None)], ['Nasopharyngeal angiofibroma', 'JNA'], ['surgery'], ['nasopharynx'])
c('Sinusitis', D, R, [('EN 4.32', None)], ['Rhinosinusitis'], ['medicine'], ['paranasal-sinuses'])
c('Sinonasal and nasopharyngeal tumours', D, R, [('EN 4.33', None)], [], ['surgery', 'pathology'])
c('Granulomatous diseases of the nose', D, R, [('EN 4.34', None)], ['Nasal granulomas'], ['pathology'], ['nose'])
c('Salivary gland disorders', D, GI, [('EN 4.35', None)], ['Salivary gland diseases'], ['surgery'], ['salivary-gland'])
c('Deep neck space infections', D, R, [('EN 4.36', None)], ['Deep neck infections'], ['surgery'])
c('Dysphagia', FI, GI, [('EN 4.37', None)], ['Difficulty swallowing'], ['medicine', 'surgery'])
c('Tonsillitis', D, R, [('EN 4.38', None)], [], ['pediatrics'], ['tonsil'])
c('Tonsillectomy', IV, R, [S('EN 4.39', 'Explain the indications, major steps and complications of tonsillectomy.')], [], ['surgery'], ['tonsil'])
c('Adenoidectomy', IV, R, [S('EN 4.39', 'Explain the indications, major steps and complications of adenoidectomy.')], [], ['surgery'])
c('Hoarseness', FI, R, [('EN 4.40', None)], ['Hoarseness of voice', 'Dysphonia'], [], ['larynx'])
c('Benign laryngeal disorders', D, R, [('EN 4.41', None)], ['Laryngeal lesions'], [], ['larynx'])
c('Laryngeal cancer', D, R, [S('EN 4.42', 'Recognise presentations of laryngeal cancer and explain diagnostic evaluation and management.')], ['Carcinoma larynx'], ['surgery', 'pathology'], ['larynx'])
c('Hypopharyngeal cancer', D, R, [S('EN 4.42', 'Recognise presentations of hypopharyngeal cancer and explain diagnostic evaluation and management.')], ['Carcinoma hypopharynx'], ['surgery'], ['pharynx'])
c('Stridor', FI, R, [('EN 4.43', None)], [], ['pediatrics', 'anaesthesia'])
c('Tracheostomy', IV, R, [('EN 4.44', None)], [], ['surgery', 'anaesthesia'], ['trachea'])
c('Oesophageal disorders', D, GI, [('EN 4.45', None)], ['Esophageal disorders'], ['surgery', 'medicine'], ['oesophagus'])
c('HIV infection', D, 'immune', [S('EN 4.46', 'Recognise representative ear, nose and throat manifestations of HIV infection and explain investigation and care.')])
# ================= Ophthalmology
c('Optics of the eye', F, SS, [('OP1.1', None)])
c('Refractive errors', D, SS, [('OP1.2', None)])
c('Visual acuity testing', I, SS, [('OP1.3', None)], ['Vision testing'], [], ['eye'])
c('Refractive surgery', IV, SS, [('OP1.4', None)], [], [], ['eye'])
c('Amblyopia', D, SS, [('OP1.5', None)], ['Lazy eye'], ['pediatrics'], ['eye'])
c('Eyelid disorders', D, SS, [('OP2.1', None)], [], [], ['eyelid'])
c('Ptosis', D, SS, [S('OP2.2', 'Under supervision demonstrate Bell phenomenon assessment and ptosis evaluation.')], ['Blepharoptosis'], [], ['eyelid'])
c('Lacrimal system disorders', D, SS, [S('OP2.2', 'Under supervision demonstrate lacrimal assessment, including regurgitation and syringing tests.')], [], [], ['lacrimal-apparatus'])
c('Thyroid eye disease', D, SS, [('OP2.3', None)], ['Graves ophthalmopathy', 'Thyroid-associated orbitopathy'], ['medicine'], ['orbit'])
c('Orbital cellulitis', D, SS, [('OP2.4', None)], [], [], ['orbit'])
c('Cavernous sinus thrombosis', D, 'nervous', [('OP2.5', None)], [], ['medicine', 'ent'])
c('Proptosis', FI, SS, [('OP2.6', None)], ['Exophthalmos'], [], ['orbit'])
c('Orbital tumours', D, SS, [('OP2.7', None), ('OP2.8', None)], ['Orbital tumors'], [], ['orbit'])
c('Red eye', FI, SS, [('OP3.1', None)], [], ['medicine'], ['eye'])
c('Conjunctivitis', D, SS, [('OP3.2', None)], ['Pink eye'], ['microbiology'], ['conjunctiva'])
c('Trachoma', D, SS, [('OP3.3', None)], [], ['microbiology', 'community-medicine'], ['conjunctiva'])
c('Allergic conjunctivitis', D, SS, [('OP3.4', None)], [], [], ['conjunctiva'])
c('Pterygium', D, SS, [('OP3.5', None)], [], [], ['conjunctiva'])
c('Ocular foreign body', D, SS, [('OP3.6', None), ('OP4.9', None)], ['Corneal foreign body'], [], ['eye'])
c('Ocular drugs', IV, SS, [('OP3.7', None)])
c('Cornea', ST, SS, [('OP4.1', None)], [], [], ['cornea'])
c('Corneal disorders', D, SS, [('OP4.2', None)], [], [], ['cornea'])
c('Infective keratitis', D, SS, [('OP4.3', None)], ['Corneal ulcer'], ['microbiology'], ['cornea'])
c('Corneal opacity', FI, SS, [('OP4.4', None)], [], [], ['cornea'])
c('Dry eye disease', D, SS, [('OP4.5', None)], ['Dry eye', 'Keratoconjunctivitis sicca'], [], ['eye'])
c('Blindness', D, SS, [S('OP4.6', 'Use an applicable definition of blindness and classify the major corneal causes.'), ('OP10.7', None)], [], ['community-medicine'], ['eye'])
c('Keratoplasty', IV, SS, [('OP4.7', None)], ['Corneal transplantation'], ['surgery'], ['cornea'])
c('Eye banking', IV, SS, [('OP4.8', None), ('OP4.10', None)], ['Eye donation'], ['forensic-medicine'], ['cornea'])
c('Episcleritis', D, SS, [('OP5.1', None)], [], [], ['sclera'])
c('Scleritis', D, SS, [('OP5.2', None)], [], ['medicine'], ['sclera'])
c('Uveitis', D, SS, [('OP6.1', None), ('OP6.2', None), ('OP6.4', None)], [], ['medicine'], ['uvea'])
c('Hyphema', FI, SS, [S('OP6.3', 'Recognise hyphema and compare its causes.')], ['Hyphaema'], [], ['anterior-chamber'])
c('Hypopyon', FI, SS, [S('OP6.3', 'Recognise hypopyon and compare its causes.')], [], [], ['anterior-chamber'])
c('Congenital glaucoma', D, SS, [('OP7.1', None)], ['Buphthalmos'], ['pediatrics'], ['eye'])
c('Primary open-angle glaucoma', D, SS, [('OP7.2', None), S('OP7.5', 'Explain treatment options, adverse effects, prognosis and follow-up of glaucoma in simulated counselling.')], ['POAG', 'Open-angle glaucoma'], [], ['eye'])
c('Angle-closure glaucoma', D, SS, [('OP7.3', None)], ['PACG'], [], ['eye'])
c('Secondary glaucoma', D, SS, [('OP7.4', None)], [], [], ['eye'])
c('Lens', ST, SS, [('OP8.1', None)], ['Crystalline lens'], [], ['lens'])
c('Cataract', D, SS, [('OP8.2', None), ('OP8.3', None), ('OP8.6', None)], [], ['community-medicine'], ['lens'])
c('Cataract surgery', IV, SS, [('OP8.4', None)], ['Extracapsular cataract extraction', 'ECCE'], ['surgery', 'anaesthesia'], ['lens'])
c('Aphakia', FI, SS, [('OP8.5', None)], [], [], ['lens'])
c('Ophthalmoscopy', K, SS, [('OP9.1', None)], ['Fundoscopy', 'Fundus examination'], ['medicine'], ['retina'])
c('Diabetic retinopathy', D, SS, [('OP9.2', None)], [], ['medicine'], ['retina'])
c('Retinal vascular occlusion', D, SS, [('OP9.3', None)], ['Retinal artery and vein occlusion'], ['medicine'], ['retina'])
c('Retinal disorders', D, SS, [('OP9.4', None)], [], [], ['retina'])
c('Optic nerve disorders', D, 'nervous', [('OP9.5', None)], ['Optic neuropathy'], ['medicine'], ['optic-nerve'])
c('Extraocular movements', K, SS, [('OP10.1', None)], ['Ocular motility examination'], [], ['eye'])
c('Strabismus', D, SS, [('OP10.2', None)], ['Squint'], ['pediatrics'], ['eye'])
c('Headache of ocular origin', FI, SS, [('OP10.3', None)], [], ['medicine'], ['eye'])
c('Vitamin A deficiency', D, SS, [('OP10.4', None)], ['Xerophthalmia'], ['community-medicine', 'pediatrics'], ['eye'])
c('Enucleation and evisceration', IV, SS, [('OP10.5', None)], [], ['surgery'], ['eye'])
c('Ocular trauma', D, SS, [('OP10.6', None)], ['Eye injuries'], ['forensic-medicine'], ['eye'])
