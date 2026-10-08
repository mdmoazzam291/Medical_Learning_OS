export const DATASETS = Object.freeze(['concepts','sources','questions','notes','occurrences','relations']);
export const QUESTION_GATES = Object.freeze(['extraction','medical','key','provenance','options','image','rights','identity','learning-utility']);
export const fail = code => {throw new TypeError(code);};
export function exact(value,keys,code='release_fields_invalid') {
  if(!value||typeof value!=='object'||Array.isArray(value)||Object.keys(value).sort().join('|')!==[...keys].sort().join('|'))fail(code);
}
export function identifier(value){if(typeof value!=='string'||!/^[a-zA-Z0-9:_@.\-]{1,160}$/.test(value))fail('identifier_invalid');}
export function safeRelativePath(path){
  if(typeof path!=='string'||!path||path.startsWith('/')||path.includes('\\')||path.includes('\0')||path.split('/').some(p=>!p||p==='.'||p==='..')||/^[a-zA-Z]:/.test(path))fail('unsafe_release_path');
  return path;
}
export function canonicalJson(value){
  if(Array.isArray(value))return '['+value.map(canonicalJson).join(',')+']';
  if(value&&typeof value==='object')return '{'+Object.keys(value).sort().map(k=>JSON.stringify(k)+':'+canonicalJson(value[k])).join(',')+'}';
  return JSON.stringify(value);
}
export function renderQuestionMarkdown(record,occurrences=[]){
  const a=record.app;
  return `# Question ${record.recordId}\n\nVersion: ${record.recordVersion}\n\n${a.stem}\n\n${a.options.map(o=>`${o.optionId}. ${o.text}`).join('\n')}\n\nAnswer: ${a.answerOptionId}\n\n${a.explanation}\n\nMetadata:\n\n${JSON.stringify({conceptLinks:a.conceptLinks,sourceIds:a.sourceIds,classification:a.classification,origins:a.origins,intelligence:a.intelligence??null,occurrences:[...occurrences].sort((x,y)=>x.occurrenceId<y.occurrenceId?-1:x.occurrenceId>y.occurrenceId?1:0),archive:record.archive},null,2)}\n`;
}
export function renderConceptMarkdown(record){const a=record.app;return `# Concept ${record.recordId}\n\nVersion: ${record.recordVersion}\n\n${a.label}\n\n${JSON.stringify({aliases:a.aliases,subjectTags:a.subjectTags,classification:a.classification,archive:record.archive},null,2)}\n`;}
export function validateRelease(release){
  exact(release,['manifest','records','markdown','assetsManifest']);
  const m=release.manifest;
  if(m?.releaseSchemaVersion!==1)fail('release_schema_unsupported');
  if(Object.hasOwn(m,'baseReleaseId')||Object.hasOwn(m,'delta'))fail('release_base_reconstruction_required');
  exact(m,['releaseId','releaseSchemaVersion','createdAt','priorReleaseId','ruleVersion','files','counts','eligibility']);
  identifier(m.releaseId);if(m.priorReleaseId!==null)identifier(m.priorReleaseId);
  if(typeof m.createdAt!=='string'||!Number.isFinite(Date.parse(m.createdAt))||new Date(m.createdAt).toISOString()!==m.createdAt)fail('timestamp_invalid');
  if(!(['string','number'].includes(typeof m.ruleVersion))||String(m.ruleVersion).trim()==='')fail('rule_version_invalid');
  exact(release.records,DATASETS);exact(m.counts,DATASETS);
  exact(m.eligibility,['intendedUse','includedIds','excluded']);
  if(!['private_study','app_publication'].includes(m.eligibility.intendedUse)||!Array.isArray(m.eligibility.includedIds)||!Array.isArray(m.eligibility.excluded))fail('eligibility_invalid');
  const seen=new Set(),files=new Set();
  for(const kind of DATASETS){
    const rows=release.records[kind];if(!Array.isArray(rows))fail('dataset_invalid');
    for(const r of rows){
      const key=kind==='occurrences'?'occurrenceId':kind==='relations'?'relationId':'recordId';identifier(r[key]);
      if(seen.has(r[key]))fail('duplicate_record_id');seen.add(r[key]);
      if(!['occurrences','relations'].includes(kind)){
        exact(r,['recordId','recordVersion','contentFile','app','archive']);
        if(!Number.isSafeInteger(r.recordVersion)||r.recordVersion<1||!r.archive||typeof r.archive!=='object'||Array.isArray(r.archive))fail('record_invalid');
        const appKey={concepts:'conceptId',sources:'sourceId',questions:'questionId',notes:'noteId'}[kind];
        if(r.app?.[appKey]!==r.recordId)fail('record_identity_mismatch');
        if(r.contentFile!==null){safeRelativePath(r.contentFile);if(files.has(r.contentFile))fail('duplicate_content_file');files.add(r.contentFile);}
        if(kind==='questions'&&(!Array.isArray(r.app.options)||!r.app.options.length))fail('options_invalid');
      } else if(kind==='occurrences'){
        exact(r,['occurrenceId','questionId','sourceId','locator','verification','origin','historicalKey']);
        if(!['verified','recall','unverified'].includes(r.verification)||typeof r.locator!=='string'||!r.locator.trim())fail('occurrence_invalid');
      } else {
        exact(r,['relationId','kind','fromId','toId','section']);
        if(!['explains','contrasts','prerequisite','related','variant-of','redirect'].includes(r.kind)||typeof r.section!=='string')fail('relation_invalid');
      }
    }
  }
  for(const k of DATASETS)if(!Number.isSafeInteger(m.counts[k])||m.counts[k]!==release.records[k].length)fail('record_count_mismatch');
  if(!Array.isArray(m.files))fail('manifest_invalid');
  const declared=new Set();for(const f of m.files){exact(f,['path','sha256','bytes','kind']);safeRelativePath(f.path);if(declared.has(f.path)||f.path==='manifest.json')fail('manifest_file_invalid');declared.add(f.path);if(!/^[0-9a-f]{64}$/.test(f.sha256)||!Number.isSafeInteger(f.bytes)||f.bytes<0||!['dataset','markdown','metadata','asset'].includes(f.kind))fail('manifest_file_invalid');}
  const concepts=new Set(release.records.concepts.map(r=>r.recordId)),sources=new Set(release.records.sources.map(r=>r.recordId)),questions=new Set(release.records.questions.map(r=>r.recordId)),notes=new Set(release.records.notes.map(r=>r.recordId));
  for(const r of [...release.records.questions,...release.records.notes]){
    if(!Array.isArray(r.app.sourceIds)||r.app.sourceIds.some(s=>!sources.has(s)))fail('source_unknown');
    const cs=r.app.conceptLinks?.map(l=>l.conceptId)??[r.app.conceptId];if(cs.some(id=>!concepts.has(id)))fail('concept_unknown');
    if(r.archive.gates!==undefined){if(!Array.isArray(r.archive.gates))fail('gate_invalid');const gs=new Set();for(const g of r.archive.gates){exact(g,['gate','status','evidenceRefs']);if(gs.has(g.gate)||!QUESTION_GATES.includes(g.gate)||!['passed','failed','pending','not_applicable'].includes(g.status)||!Array.isArray(g.evidenceRefs))fail('gate_invalid');gs.add(g.gate);for(const ref of g.evidenceRefs){exact(ref,['sourceId','locator']);if(!sources.has(ref.sourceId)||typeof ref.locator!=='string'||!ref.locator.trim())fail('gate_evidence_invalid');}}}
  }
  for(const o of release.records.occurrences)if(!questions.has(o.questionId)||!sources.has(o.sourceId))fail('occurrence_reference_invalid');
  for(const rel of release.records.relations){if(!seen.has(rel.fromId)||!seen.has(rel.toId))fail('relation_reference_invalid');if(['explains','contrasts','prerequisite'].includes(rel.kind)&&(!notes.has(rel.fromId)||!questions.has(rel.toId)))fail('note_link_invalid');}
  for(const id of m.eligibility.includedIds){identifier(id);if(!questions.has(id)&&!notes.has(id))fail('eligibility_reference_invalid');}
  if(new Set(m.eligibility.includedIds).size!==m.eligibility.includedIds.length)fail('eligibility_invalid');
  for(const item of m.eligibility.excluded){exact(item,['recordId','reason']);if(!seen.has(item.recordId)||typeof item.reason!=='string'||!item.reason.trim())fail('eligibility_invalid');if(m.eligibility.includedIds.includes(item.recordId))fail('eligibility_invalid');}
  if(!release.markdown||typeof release.markdown!=='object'||Array.isArray(release.markdown))fail('markdown_invalid');
  for(const r of release.records.questions){if(r.contentFile===null||release.markdown[r.contentFile]!==renderQuestionMarkdown(r,release.records.occurrences.filter(o=>o.questionId===r.recordId)))fail('markdown_mismatch');}
  for(const r of release.records.concepts)if(r.contentFile===null||release.markdown[r.contentFile]!==renderConceptMarkdown(r))fail('markdown_mismatch');
  for(const r of release.records.notes)if(r.contentFile===null||release.markdown[r.contentFile]!==r.app.bodyMarkdown)fail('markdown_mismatch');
  return release;
}
