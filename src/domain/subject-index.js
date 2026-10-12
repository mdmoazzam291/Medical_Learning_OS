// Navigation taxonomy from the owner-approved subject blueprint; not clinical content.
export const SUBJECT_INDEX = Object.freeze([
  {
    "id": "anatomy",
    "label": "Anatomy",
    "modules": [
      {
        "id": "gross-regional-anatomy",
        "label": "Gross & regional anatomy"
      },
      {
        "id": "neuroanatomy",
        "label": "Neuroanatomy"
      },
      {
        "id": "histology",
        "label": "Histology"
      },
      {
        "id": "embryology",
        "label": "Embryology"
      }
    ],
    "tools": [
      "Anatomy Atlas",
      "Images & tracings",
      "Skills & procedures"
    ],
    "formats": [
      "Identification",
      "Image occlusion",
      "MCQs",
      "Viva"
    ],
    "detail": "Relations, supply, innervation, sectional anatomy and development."
  },
  {
    "id": "physiology",
    "label": "Physiology",
    "modules": [
      {
        "id": "system-mechanisms",
        "label": "System mechanisms"
      },
      {
        "id": "graphs-curves",
        "label": "Graphs & curves"
      },
      {
        "id": "functional-tests",
        "label": "Functional tests"
      },
      {
        "id": "homeostasis",
        "label": "Homeostasis"
      }
    ],
    "tools": [
      "Pathways & mechanisms",
      "Labs & diagnostics",
      "Formulae & statistics"
    ],
    "formats": [
      "Graph interpretation",
      "Calculations",
      "MCQs",
      "Recall"
    ],
    "detail": "Trace inputs, mechanisms and outputs; link normal function to disease."
  },
  {
    "id": "biochemistry",
    "label": "Biochemistry",
    "modules": [
      {
        "id": "metabolic-pathways",
        "label": "Metabolic pathways"
      },
      {
        "id": "enzymes-regulation",
        "label": "Enzymes & regulation"
      },
      {
        "id": "molecular-biology-genetics",
        "label": "Molecular biology & genetics"
      },
      {
        "id": "nutrition-metabolic-disorders",
        "label": "Nutrition & metabolic disorders"
      }
    ],
    "tools": [
      "Pathways & mechanisms",
      "Labs & diagnostics",
      "Formulae & statistics"
    ],
    "formats": [
      "Pathway recall",
      "Calculations",
      "MCQs",
      "Recall"
    ],
    "detail": "Pathway links, rate control, molecular techniques and diagnostic patterns."
  },
  {
    "id": "pathology",
    "label": "Pathology",
    "modules": [
      {
        "id": "general-pathology",
        "label": "General pathology"
      },
      {
        "id": "system-pathology",
        "label": "System pathology"
      },
      {
        "id": "gross-microscopy",
        "label": "Gross & microscopy"
      },
      {
        "id": "haematology-laboratory-patterns",
        "label": "Haematology & laboratory patterns"
      }
    ],
    "tools": [
      "Images & tracings",
      "Labs & diagnostics",
      "Classifications & staging"
    ],
    "formats": [
      "Identification",
      "Image occlusion",
      "MCQs",
      "Comparison"
    ],
    "detail": "Morphology, mechanism, stains and markers linked to clinical findings."
  },
  {
    "id": "pharmacology",
    "label": "Pharmacology",
    "modules": [
      {
        "id": "drug-classes-mechanisms",
        "label": "Drug classes & mechanisms"
      },
      {
        "id": "indications-adverse-effects",
        "label": "Indications & adverse effects"
      },
      {
        "id": "interactions-contraindications",
        "label": "Interactions & contraindications"
      },
      {
        "id": "pharmacokinetics-therapeutics",
        "label": "Pharmacokinetics & therapeutics"
      }
    ],
    "tools": [
      "Drugs & therapeutics",
      "Formulae & statistics",
      "Pathways & mechanisms"
    ],
    "formats": [
      "Drug decisions",
      "Calculations",
      "MCQs",
      "Recall"
    ],
    "detail": "Drug/class relationships and source-dated therapeutic context."
  },
  {
    "id": "microbiology",
    "label": "Microbiology",
    "modules": [
      {
        "id": "organisms-classification",
        "label": "Organisms & classification"
      },
      {
        "id": "specimens-stains-culture",
        "label": "Specimens, stains & culture"
      },
      {
        "id": "diagnostic-techniques",
        "label": "Diagnostic techniques"
      },
      {
        "id": "immunity-vaccines-resistance",
        "label": "Immunity, vaccines & resistance"
      }
    ],
    "tools": [
      "Organisms & microbiology",
      "Images & tracings",
      "Labs & diagnostics"
    ],
    "formats": [
      "Identification",
      "Test interpretation",
      "MCQs",
      "Recall"
    ],
    "detail": "Organism, transmission, specimen and test interpretation."
  },
  {
    "id": "forensic-medicine",
    "label": "Forensic Medicine",
    "modules": [
      {
        "id": "injuries-identification",
        "label": "Injuries & identification"
      },
      {
        "id": "toxicology",
        "label": "Toxicology"
      },
      {
        "id": "death-autopsy",
        "label": "Death & autopsy"
      },
      {
        "id": "medical-law-ethics-documentation",
        "label": "Medical law, ethics & documentation"
      }
    ],
    "tools": [
      "Ethics & forensic references",
      "Drugs & therapeutics",
      "Images & tracings"
    ],
    "formats": [
      "Case decisions",
      "Identification",
      "MCQs",
      "Viva"
    ],
    "detail": "Jurisdiction- and date-labelled references; structured case documentation."
  },
  {
    "id": "community-medicine",
    "label": "Community Medicine",
    "modules": [
      {
        "id": "epidemiology-study-designs",
        "label": "Epidemiology & study designs"
      },
      {
        "id": "biostatistics-screening",
        "label": "Biostatistics & screening"
      },
      {
        "id": "prevention-programmes-vaccines",
        "label": "Prevention, programmes & vaccines"
      },
      {
        "id": "environment-nutrition-demography",
        "label": "Environment, nutrition & demography"
      }
    ],
    "tools": [
      "Formulae & statistics",
      "Population health",
      "Ethics & forensic references"
    ],
    "formats": [
      "Calculations",
      "Data interpretation",
      "MCQs",
      "Case decisions"
    ],
    "detail": "Population-level concepts, denominators, study design and policy versions."
  },
  {
    "id": "medicine",
    "label": "Medicine",
    "modules": [
      {
        "id": "symptoms-differential-diagnosis",
        "label": "Symptoms & differential diagnosis"
      },
      {
        "id": "investigation-interpretation",
        "label": "Investigation interpretation"
      },
      {
        "id": "management-emergencies",
        "label": "Management & emergencies"
      },
      {
        "id": "integrated-system-concepts",
        "label": "Integrated system concepts"
      }
    ],
    "tools": [
      "Labs & diagnostics",
      "Drugs & therapeutics",
      "Classifications & staging"
    ],
    "formats": [
      "Clinical cases",
      "Test interpretation",
      "MCQs",
      "Viva"
    ],
    "detail": "Connect mechanisms, competing diagnoses and reviewed decisions."
  },
  {
    "id": "surgery",
    "label": "Surgery",
    "modules": [
      {
        "id": "presentation-diagnosis",
        "label": "Presentation & diagnosis"
      },
      {
        "id": "perioperative-care",
        "label": "Perioperative care"
      },
      {
        "id": "procedures-instruments",
        "label": "Procedures & instruments"
      },
      {
        "id": "trauma-postoperative-complications",
        "label": "Trauma & postoperative complications"
      }
    ],
    "tools": [
      "Skills & procedures",
      "Images & tracings",
      "Classifications & staging"
    ],
    "formats": [
      "Clinical cases",
      "Identification",
      "MCQs",
      "Viva"
    ],
    "detail": "Indications, anatomy, decision points and procedure/complication relationships."
  },
  {
    "id": "obstetrics-gynaecology",
    "label": "Obstetrics & Gynaecology",
    "modules": [
      {
        "id": "pregnancy-antenatal-care",
        "label": "Pregnancy & antenatal care"
      },
      {
        "id": "labour-obstetric-emergencies",
        "label": "Labour & obstetric emergencies"
      },
      {
        "id": "gynaecology-reproductive-health",
        "label": "Gynaecology & reproductive health"
      },
      {
        "id": "fetal-assessment-tracings",
        "label": "Fetal assessment & tracings"
      }
    ],
    "tools": [
      "Images & tracings",
      "Skills & procedures",
      "Classifications & staging"
    ],
    "formats": [
      "Clinical cases",
      "Trace interpretation",
      "MCQs",
      "Viva"
    ],
    "detail": "Maternal/fetal context, gestational-stage tags and reproductive decisions."
  },
  {
    "id": "pediatrics",
    "label": "Paediatrics",
    "modules": [
      {
        "id": "growth-development-nutrition",
        "label": "Growth, development & nutrition"
      },
      {
        "id": "neonatology",
        "label": "Neonatology"
      },
      {
        "id": "paediatric-system-disorders",
        "label": "Paediatric system disorders"
      },
      {
        "id": "immunisation-emergencies",
        "label": "Immunisation & emergencies"
      }
    ],
    "tools": [
      "Population health",
      "Labs & diagnostics",
      "Drugs & therapeutics"
    ],
    "formats": [
      "Clinical cases",
      "Chart interpretation",
      "MCQs",
      "Viva"
    ],
    "detail": "Age-group context, growth charts and paediatric-specific concept facets."
  },
  {
    "id": "ent",
    "label": "ENT",
    "modules": [
      {
        "id": "ear-audiology",
        "label": "Ear & audiology"
      },
      {
        "id": "nose-sinuses",
        "label": "Nose & sinuses"
      },
      {
        "id": "throat-larynx-neck",
        "label": "Throat, larynx & neck"
      },
      {
        "id": "instruments-examination",
        "label": "Instruments & examination"
      }
    ],
    "tools": [
      "Images & tracings",
      "Labs & diagnostics",
      "Skills & procedures"
    ],
    "formats": [
      "Trace interpretation",
      "Identification",
      "MCQs",
      "Viva"
    ],
    "detail": "Audiograms, otoscopy/endoscopy images and examination landmarks."
  },
  {
    "id": "ophthalmology",
    "label": "Ophthalmology",
    "modules": [
      {
        "id": "eye-examination",
        "label": "Eye examination"
      },
      {
        "id": "anterior-segment",
        "label": "Anterior segment"
      },
      {
        "id": "retina-neuro-ophthalmology",
        "label": "Retina & neuro-ophthalmology"
      },
      {
        "id": "optics-instruments",
        "label": "Optics & instruments"
      }
    ],
    "tools": [
      "Images & tracings",
      "Skills & procedures",
      "Formulae & statistics"
    ],
    "formats": [
      "Identification",
      "Test interpretation",
      "MCQs",
      "Viva"
    ],
    "detail": "Fundus/slit-lamp references, optics and functional-test interpretation."
  },
  {
    "id": "orthopaedics",
    "label": "Orthopaedics",
    "modules": [
      {
        "id": "fractures-imaging",
        "label": "Fractures & imaging"
      },
      {
        "id": "examination-biomechanics",
        "label": "Examination & biomechanics"
      },
      {
        "id": "bone-joint-spine-disorders",
        "label": "Bone, joint & spine disorders"
      },
      {
        "id": "immobilisation-procedures",
        "label": "Immobilisation & procedures"
      }
    ],
    "tools": [
      "Images & tracings",
      "Classifications & staging",
      "Skills & procedures"
    ],
    "formats": [
      "Identification",
      "Clinical cases",
      "MCQs",
      "Viva"
    ],
    "detail": "Mechanism, image interpretation, classifications and examination findings."
  },
  {
    "id": "dermatology",
    "label": "Dermatology",
    "modules": [
      {
        "id": "lesion-morphology",
        "label": "Lesion morphology"
      },
      {
        "id": "distribution-differential-diagnosis",
        "label": "Distribution & differential diagnosis"
      },
      {
        "id": "histology-investigations",
        "label": "Histology & investigations"
      },
      {
        "id": "therapy-adverse-effects",
        "label": "Therapy & adverse effects"
      }
    ],
    "tools": [
      "Images & tracings",
      "Drugs & therapeutics",
      "Labs & diagnostics"
    ],
    "formats": [
      "Identification",
      "Comparison",
      "MCQs",
      "Clinical cases"
    ],
    "detail": "Morphology-first visual recognition with anonymised clinical references."
  },
  {
    "id": "psychiatry",
    "label": "Psychiatry",
    "modules": [
      {
        "id": "mental-state-examination",
        "label": "Mental-state examination"
      },
      {
        "id": "diagnostic-differentiation",
        "label": "Diagnostic differentiation"
      },
      {
        "id": "psychopharmacology",
        "label": "Psychopharmacology"
      },
      {
        "id": "communication-risk-assessment",
        "label": "Communication & risk assessment"
      }
    ],
    "tools": [
      "Classifications & staging",
      "Drugs & therapeutics",
      "Ethics & forensic references"
    ],
    "formats": [
      "Clinical cases",
      "Case decisions",
      "MCQs",
      "Viva"
    ],
    "detail": "Structured interviews, criterion comparisons and communication scenarios."
  },
  {
    "id": "anaesthesia",
    "label": "Anaesthesiology",
    "modules": [
      {
        "id": "airway-equipment",
        "label": "Airway & equipment"
      },
      {
        "id": "anaesthetic-drugs-techniques",
        "label": "Anaesthetic drugs & techniques"
      },
      {
        "id": "monitoring-perioperative-assessment",
        "label": "Monitoring & perioperative assessment"
      },
      {
        "id": "critical-care-resuscitation",
        "label": "Critical care & resuscitation"
      }
    ],
    "tools": [
      "Skills & procedures",
      "Drugs & therapeutics",
      "Images & tracings"
    ],
    "formats": [
      "Trace interpretation",
      "Identification",
      "MCQs",
      "Clinical cases"
    ],
    "detail": "Equipment, waveforms, techniques and reviewed perioperative scenarios."
  },
  {
    "id": "radiology",
    "label": "Radiology",
    "modules": [
      {
        "id": "modalities-sequences",
        "label": "Modalities & sequences"
      },
      {
        "id": "normal-sectional-anatomy",
        "label": "Normal sectional anatomy"
      },
      {
        "id": "system-imaging-patterns",
        "label": "System imaging patterns"
      },
      {
        "id": "image-interpretation-safety",
        "label": "Image interpretation & safety"
      }
    ],
    "tools": [
      "Images & tracings",
      "Anatomy Atlas",
      "Skills & procedures"
    ],
    "formats": [
      "Identification",
      "Image occlusion",
      "MCQs",
      "Test interpretation"
    ],
    "detail": "Modality, plane, sequence, orientation and reviewed annotations."
  }
]);
