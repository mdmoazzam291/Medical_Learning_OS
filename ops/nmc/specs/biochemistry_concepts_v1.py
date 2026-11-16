EXISTING = {
 'Digestion and absorption': 'C-449f505c-2dc5-4801-ae07-72baebbb8077',
 'Plasma proteins': 'C-7d1938fd-1098-42fb-9df0-febc699c41e7',
 'Haemoglobin': 'C-45e8e6a5-1c59-4062-a2f9-c2bd293b273c',
 'Jaundice': 'C-20fd4723-19f0-480c-a675-6370bab9ecd2',
 'Obesity': 'C-a40ab47d-0b34-4094-b1c2-502f268421c5',
 'Metabolic syndrome': 'C-dc9c4da8-e738-49fa-8d84-f3da5bee75ea',
 'Liver function tests': 'C-dc3a65b9-2f5f-4092-8e31-d3027a9ef2d1',
 'Renal function tests': 'C-077e9a68-45db-4e70-a30c-7eae5136ebca',
}
"""Biochemistry concept specification v1 (2026-11-16).

Follows ADR-134 (entity names, true-synonym aliases, concept types) and ADR-135 (evidenced
subjects only; expected subjects are hints). EXISTING reuses accepted Physiology identities where
Biochemistry teaches the same entity; their objectives bind to those IDs and they are not
re-accepted. Row 14.1 (unrecognised printed code) stays on the source-exception track.
"""
SUBJECT = 'biochemistry'
SUBJECT_NAME = 'Biochemistry'
BATCH_KIND = 'concept batch'
VERSION = 'v1'
CONCEPT_TYPES = ('structure', 'function', 'disorder', 'clinical-finding', 'investigation',
                 'clinical-skill', 'intervention', 'field')
EVIDENCED_SUBJECTS_ONLY = True
EXTRA_TEST_LABELS = r'|profile|marker|glycated|urinalysis|serum |blood urea|analysis|errors$|quality control'
C = []
def c(label, kind, system, links, aliases=(), expected=(), organs=(), task=None):
    d = {'label': label, 'aliases': list(aliases), 'system': system, 'links': links, 'extraSubjects': list(expected),
         'conceptType': kind, 'umbrella': False, 'organs': list(organs)}
    if task: d['task'] = task
    C.append(d)
S = lambda code, text: (code, text)
# ---- Cell and enzymes
c('Cell membrane', 'structure', 'general', [('BC1.1', None)], ['Plasma membrane'])
c('Enzymes', 'structure', 'general', [('BC2.1', None)])
c('Enzyme kinetics', 'function', 'general', [('BC2.2', None)])
c('Enzyme inhibition', 'function', 'general', [('BC2.3', None)], ['Enzyme inhibitors'], ['pharmacology'])
c('Diagnostic enzymes', 'investigation', 'general', [('BC2.4', None), ('BC2.5', None)], ['Clinical enzymology', 'Serum enzymes'], ['pathology', 'medicine'], task='interpretation')
# ---- Carbohydrates
c('Carbohydrates', 'structure', 'general', [('BC3.1', None)])
c('Digestion and absorption', 'function', 'gastrointestinal', [('BC3.2', None), ('BC4.2', None), ('BC 5.3', None)])
c('Glycolysis', 'function', 'general', [S('BC3.3', 'Trace glycolysis, its energy yield and regulation, and explain consequences of representative enzyme defects such as pyruvate kinase deficiency.')])
c('Gluconeogenesis', 'function', 'general', [S('BC3.3', 'Trace gluconeogenesis from its main substrates, explain its regulation and relate it to fasting physiology.')])
c('Tricarboxylic acid cycle', 'function', 'general', [S('BC3.3', 'Trace the tricarboxylic acid cycle, its energy yield, regulation and amphibolic role.')], ['TCA cycle', 'Krebs cycle', 'Citric acid cycle'])
c('Glycogen metabolism', 'function', 'general', [S('BC3.3', 'Trace glycogen synthesis and breakdown, explain hormonal regulation and relate representative glycogen storage disorders to enzyme defects.')], [], ['pediatrics'])
c('Pentose phosphate pathway', 'function', 'general', [S('BC3.3', 'Explain the oxidative and non-oxidative phases of the pentose phosphate pathway and relate NADPH generation to G6PD deficiency.')], ['Hexose monophosphate shunt', 'HMP shunt'], ['pathology'])
c('Fructose metabolism', 'function', 'general', [S('BC3.4', 'Trace fructose metabolism and explain hereditary fructose intolerance and essential fructosuria.')])
c('Galactose metabolism', 'function', 'general', [S('BC3.4', 'Trace galactose metabolism and explain the biochemical basis and consequences of galactosaemia.')], [], ['pediatrics'])
c('Polyol pathway', 'function', 'general', [S('BC3.4', 'Explain the polyol pathway and relate sorbitol accumulation to diabetic complications.')], ['Sorbitol pathway'])
c('Uronic acid pathway', 'function', 'general', [S('BC3.4', 'Explain the uronic acid pathway, its products and the biochemical basis of essential pentosuria.')])
c('Fed-fast cycle', 'function', 'general', [S('BC3.5', 'Predict hormonal and metabolic responses that maintain blood glucose in the fed and fasting states.'), ('BC7.1', None)], ['Fed and fasting states'], ['physiology'])
c('Diabetes mellitus', 'disorder', 'endocrine', [S('BC3.5', 'Compare major types of diabetes mellitus and explain their biochemical changes, acute and chronic complications and laboratory assessment.')], [], ['medicine', 'pathology', 'pharmacology'], ['pancreas'])
c('Glycaemic tests', 'investigation', 'endocrine', [('BC3.6', None), ('BC14.7', None)], ['Blood glucose tests'], ['medicine'])
c('Oral glucose tolerance test', 'investigation', 'endocrine', [S('BC14.22', 'Explain how an oral glucose tolerance test and a glucose challenge test are performed and interpret representative results.')], ['OGTT', 'Glucose tolerance test'], ['medicine', 'obstetrics-gynaecology'])
c('Glycated haemoglobin', 'investigation', 'endocrine', [S('BC14.22', 'Explain the basis of HbA1c measurement, interpret representative values and recognise conditions that make it unreliable.')], ['HbA1c', 'Glycosylated haemoglobin', 'Glycated hemoglobin'], ['medicine'])
# ---- Lipids
c('Lipids', 'structure', 'general', [('BC4.1', None)])
c('Fatty acid oxidation', 'function', 'general', [S('BC4.3', 'Trace beta-oxidation of fatty acids, its regulation and energy yield, and explain representative defects such as carnitine deficiency.')], ['Beta-oxidation'])
c('Ketone bodies', 'function', 'general', [S('BC4.3', 'Trace ketone body synthesis and use and explain the biochemical basis of ketosis and ketoacidosis.')], ['Ketogenesis'], ['medicine'])
c('Triglyceride metabolism', 'function', 'general', [S('BC4.4', 'Trace fatty acid and triglyceride synthesis and breakdown and explain their hormonal regulation.')])
c('Cholesterol metabolism', 'function', 'general', [S('BC4.4', 'Trace cholesterol synthesis, its regulation at HMG-CoA reductase and its conversion to bile acids and steroids, and relate altered flux to clinical patterns.')], [], ['pharmacology'])
c('Lipoproteins', 'structure', 'cardiovascular', [('BC4.5', None)], [], ['pathology', 'medicine'])
c('Eicosanoids', 'structure', 'general', [('BC4.6', None)], [], ['pharmacology'])
c('Fatty liver', 'disorder', 'gastrointestinal', [S('BC4.7', 'Explain the biochemical mechanisms that lead to hepatic lipid accumulation and the role of lipotropic factors.')], ['Hepatic steatosis'], ['pathology', 'medicine'], ['liver'])
c('Gallstones', 'disorder', 'gastrointestinal', [S('BC4.7', 'Explain the biochemical basis of cholesterol gallstone formation.')], ['Cholelithiasis'], ['surgery', 'pathology'], ['gallbladder'])
c('Obesity', 'disorder', 'general', [S('BC4.7', 'Explain the biochemical mechanisms of excess adiposity.'), S('BC8.5', 'Connect dietary and other determinants to adiposity and its metabolic consequences.')])
c('Metabolic syndrome', 'disorder', 'general', [S('BC8.5', 'Explain the metabolic changes that define metabolic syndrome and the health risks they carry.')])
c('Lipid profile', 'investigation', 'cardiovascular', [('BC4.8', None), ('BC14.12', None), ('BC14.15', None)], ['Lipid panel'], ['medicine'])
# ---- Proteins, haem and immunology
c('Amino acids', 'structure', 'general', [('BC5.1', None)])
c('Proteins', 'structure', 'general', [('BC5.2', None)])
c('Plasma proteins', 'structure', 'haematological', [('BC 5.4', None), ('BC14.11', None)])
c('Immunoglobulins', 'structure', 'immune', [('BC 5.5', None)], ['Antibodies'], ['microbiology', 'pathology'])
c('Ammonia metabolism', 'function', 'general', [('BC 5.6', None)], [], ['medicine'])
c('Amino acid derivatives', 'function', 'general', [S('BC 5.7', 'Map the specialised products formed from glycine, phenylalanine, tyrosine, tryptophan, methionine and arginine to their functions.')])
c('Inborn errors of amino acid metabolism', 'disorder', 'general', [S('BC 5.7', 'Relate representative inborn errors of amino acid metabolism to the enzyme defect, accumulating metabolites and clinical features.'), S('BC14.5', 'Explain the rationale and limits of urine screening for inborn errors of metabolism.')], ['Aminoacidopathies'], ['pediatrics'])
c('Haem metabolism', 'function', 'haematological', [S('BC5.8', 'Trace haem synthesis and degradation to bilirubin and explain their regulation.')], ['Heme metabolism'])
c('Porphyrias', 'disorder', 'haematological', [S('BC5.8', 'Relate representative porphyrias to the defective enzyme, accumulating precursors and clinical presentation.')], ['Porphyria'], ['medicine'])
c('Jaundice', 'clinical-finding', 'gastrointestinal', [S('BC5.8', 'Distinguish the biochemical mechanisms of pre-hepatic, hepatic and post-hepatic jaundice and their laboratory patterns.')])
c('Haemoglobin', 'structure', 'haematological', [S('BC5.9', 'Distinguish physiological forms of haemoglobin and its chemical derivatives by structure and function.')])
c('Haemoglobinopathies', 'disorder', 'haematological', [S('BC5.9', 'Relate representative inherited haemoglobin variants such as sickle haemoglobin and thalassaemias to their structural defect and functional consequences.')], ['Hemoglobinopathies'], ['pathology', 'medicine', 'pediatrics'])
# ---- Extracellular matrix and protein targeting
c('Extracellular matrix', 'structure', 'general', [('BC6.1', None)], ['ECM'])
c('Connective tissue disorders', 'disorder', 'musculoskeletal', [('BC6.2', None)], [], ['pathology', 'orthopaedics'])
c('Protein targeting', 'function', 'general', [('BC6.3', None)], ['Protein sorting'])
# ---- Biological oxidation
c('Oxidative phosphorylation', 'function', 'general', [('BC7.2', None)])
# ---- Vitamins and nutrition
c('Vitamins', 'structure', 'general', [('BC8.1', None)], [], ['medicine', 'community-medicine'])
c('Nutrients', 'structure', 'general', [S('BC8.2', 'Compare the roles of macronutrients and micronutrients in metabolism and health.')], [], ['community-medicine'])
c('Dietary fibre', 'structure', 'gastrointestinal', [S('BC8.2', 'Explain how dietary fibre affects digestive and metabolic physiology.')], ['Dietary fiber'])
c('Protein-energy malnutrition', 'disorder', 'general', [('BC8.3', None)], ['PEM'], ['pediatrics', 'community-medicine'])
c('Dietary counselling', 'clinical-skill', 'general', [('BC8.4', None)], ['Nutritional counselling'], ['community-medicine'])
c('Food composition', 'structure', 'general', [('BC8.6', None), S('BC14.23', 'Calculate the energy content of food from its macronutrient composition.')], ['Nutritive value of foods'], ['community-medicine'])
c('Glycaemic index', 'function', 'general', [S('BC14.23', 'Compare the dietary implications of foods with high and low glycaemic index.')], ['Glycemic index'])
# ---- Minerals, water, electrolytes and acid-base
c('Iron metabolism', 'function', 'haematological', [S('BC9.1', 'Explain dietary sources, absorption, transport, storage and functions of iron and relate disordered iron balance to iron deficiency and overload.')], [], ['pathology', 'medicine'])
c('Calcium metabolism', 'function', 'musculoskeletal', [S('BC9.1', 'Explain dietary sources, absorption, transport, regulation and functions of calcium and representative disorders of calcium balance.'), S('BC14.14', 'Explain how serum calcium and phosphate are measured and interpret representative results.')], [], ['medicine'])
c('Copper metabolism', 'function', 'general', [S('BC9.1', 'Explain absorption, transport and functions of copper and the biochemical basis of Wilson disease and Menkes disease.')], [], ['medicine'])
c('Trace elements', 'structure', 'general', [('BC9.2', None)], ['Micronutrient minerals'])
c('Water and electrolyte balance', 'function', 'renal', [S('BC9.3', 'Use sample data to explain normal regulation of body water, sodium and potassium and distinguish representative disturbances.')], ['Fluid and electrolyte balance'], ['medicine'])
c('Acid-base disorders', 'disorder', 'renal', [S('BC9.3', 'Use sample data to distinguish metabolic and respiratory acid-base disorders and their compensation.'), S('BC14.2', 'Interpret acid-base findings in sample cases.')], ['Acid-base disturbances'], ['medicine'])
c('Blood gas analysis', 'investigation', 'respiratory', [S('BC14.2', 'Explain how a pH meter and a blood gas analyser measure pH and blood gases.')], ['Arterial blood gas analysis', 'ABG'], ['medicine', 'anaesthesia'])
# ---- Molecular biology
c('Nucleic acids', 'structure', 'general', [('BC10.1', None)])
c('Purine metabolism', 'function', 'general', [('BC10.2', None), S('BC10.3', 'Trace purine degradation to uric acid.')])
c('Hyperuricaemia', 'disorder', 'general', [S('BC10.3', 'Explain how purine overproduction or reduced excretion causes hyperuricaemia and relate it to gout and Lesch-Nyhan syndrome.')], ['Hyperuricemia'], ['medicine', 'orthopaedics'])
c('DNA replication', 'function', 'general', [S('BC10.4', 'Diagram the major steps of DNA replication.')])
c('Gene transcription', 'function', 'general', [S('BC10.4', 'Diagram the major steps of transcription and RNA processing.')], ['Transcription'])
c('Protein synthesis', 'function', 'general', [S('BC10.4', 'Diagram the major steps of translation and protein synthesis.')], ['mRNA translation'])
c('DNA repair', 'function', 'general', [S('BC 10.5', 'Compare DNA repair pathways and link repair defects to representative disorders.')], [], ['pathology'])
c('Gene mutations', 'function', 'general', [S('BC 10.5', 'Compare classes of mutation and predict their effects on gene products.')], ['Mutations'], ['pathology'])
c('Regulation of gene expression', 'function', 'general', [('BC10.6', None)], ['Gene regulation'])
c('Recombinant DNA technology', 'investigation', 'general', [S('BC10.7', 'Explain recombinant DNA technology, its applications and limitations.')], ['Genetic engineering'])
c('Polymerase chain reaction', 'investigation', 'general', [S('BC10.7', 'Explain the principle, applications and limitations of PCR.')], ['PCR'], ['microbiology', 'pathology'])
c('DNA microarray', 'investigation', 'general', [S('BC10.7', 'Explain the principle, applications and limitations of DNA microarrays.')], ['Microarray'])
c('Fluorescence in situ hybridisation', 'investigation', 'general', [S('BC10.7', 'Explain the principle, applications and limitations of FISH.')], ['FISH', 'Fluorescence in situ hybridization'], ['pathology'])
c('CRISPR gene editing', 'investigation', 'general', [S('BC10.7', 'Explain the principle, applications and limitations of CRISPR-based gene editing.')], ['CRISPR-Cas9'])
# ---- Organ function tests and hormones
c('Liver function tests', 'investigation', 'gastrointestinal', [S('BC 11.1', 'Explain the purpose of liver function tests and interpret representative reports in context.'), ('BC14.13', None), ('BC14.16', None)])
c('Renal function tests', 'investigation', 'renal', [S('BC 11.1', 'Explain the purpose of renal function tests and interpret representative reports in context.')])
c('Thyroid function tests', 'investigation', 'endocrine', [S('BC 11.1', 'Explain the purpose of thyroid function tests and interpret representative reports in context.')], ['TFT'], ['medicine'], ['thyroid'])
c('Adrenal function tests', 'investigation', 'endocrine', [S('BC 11.1', 'Explain the purpose of adrenal function tests and interpret representative reports in context.')], [], ['medicine'], ['adrenal'])
c('Reproductive hormone tests', 'investigation', 'reproductive', [S('BC11.2', 'Interpret LH, FSH, prolactin, beta-hCG, oestrogen, progesterone, testosterone and AMH in representative contexts.')], [], ['obstetrics-gynaecology'])
c('Prenatal screening', 'investigation', 'reproductive', [S('BC11.2', 'Explain biochemical prenatal screening and distinguish screening from diagnostic testing.')], ['Antenatal screening'], ['obstetrics-gynaecology'])
# ---- Xenobiotics and oxidative stress
c('Xenobiotic metabolism', 'function', 'general', [('BC12.1', None)], ['Biotransformation'], ['pharmacology'])
c('Antioxidants', 'structure', 'general', [('BC12.2', None)])
c('Oxidative stress', 'function', 'general', [('BC12.3', None)], ['Free radical injury'], ['pathology'])
# ---- Miscellaneous
c('Oncogenes and tumour suppressor genes', 'structure', 'general', [('BC 13.1', None)], [], ['pathology'])
c('Tumour markers', 'investigation', 'general', [('BC 13.2', None)], ['Tumor markers'], ['pathology'])
c('HIV infection', 'disorder', 'immune', [('BC13.3', None)], ['HIV disease'], ['microbiology', 'medicine'])
c('Alcohol metabolism', 'function', 'general', [('BC13.4', None)], ['Ethanol metabolism'], ['forensic-medicine', 'pharmacology'])
c('Artificial intelligence in laboratory medicine', 'field', 'general', [('BC13.5', None)])
# ---- Laboratory practice
c('Urinalysis', 'investigation', 'renal', [('BC14.3', None), ('BC14.4', None)], ['Urine examination'], ['pathology'])
c('Colorimetry and spectrophotometry', 'investigation', 'general', [('BC14.6', None)], ['Photometry'], task='mechanism')
c('Blood urea', 'investigation', 'renal', [('BC14.8', None)], ['Serum urea'])
c('Serum creatinine', 'investigation', 'renal', [('BC14.9', None)], [], ['medicine'])
c('Serum uric acid', 'investigation', 'general', [('BC14.10', None)], ['Serum urate'])
c('Cerebrospinal fluid', 'structure', 'nervous', [('BC14.17', None)], ['CSF'], ['medicine', 'microbiology'])
c('Laboratory analytical techniques', 'investigation', 'general', [S('BC14.5', 'Explain how paper chromatography separates analytes.'), ('BC14.18', None)], ['Biochemical laboratory techniques'], task='mechanism')
c('Laboratory test interpretation', 'clinical-skill', 'general', [('BC14.19', None), ('BC\n14.24', None)], ['Interpretation of laboratory reports'], ['medicine'], task='interpretation')
c('Laboratory errors', 'investigation', 'general', [('BC14.20', None)], [], ['pathology'])
c('Laboratory quality control', 'investigation', 'general', [('BC14.21', None)], ['Internal quality control'], ['pathology'])
