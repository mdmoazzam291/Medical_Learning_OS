const escape = value => String(value ?? '').replace(/[&<>"']/g, c => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c]));

export function referencesPanel(workspace, error = null) {
  if (error) return '<section class="panel"><h2>Claim evidence unavailable</h2><p>Continue individual References review against the cited sources. No prior packet is reused after a loading or validation failure.</p></section>';
  if (!workspace) return '';
  const cards = workspace.claims.map(group => `<article class="source-card">
    <div class="section-heading"><h3>${escape(group.claim.claimId)}</h3><span class="badge">${group.questions.length} question link(s)</span></div>
    <p>${escape(group.claim.statement)}</p>
    <p class="muted">${escape(group.claim.claimType)} · ${escape(group.claim.riskClass)} risk · candidate, not human-verified</p>
    <details><summary>Exact claim context and binding</summary><pre>${escape(JSON.stringify(group.claim.context, null, 2))}</pre><p class="reference-digest">SHA-256: ${escape(group.bindingDigest)}</p></details>
    ${group.claim.evidence.map(evidence => `<dl>
      <div><dt>Source / version</dt><dd>${escape(evidence.sourceId)} / ${escape(evidence.sourceVersion)}</dd></div>
      <div><dt>Locator</dt><dd>${escape(JSON.stringify(evidence.locator))}</dd></div>
      <div><dt>Proposed support</dt><dd>${escape(evidence.support)} · ${escape(evidence.authorityClass)}</dd></div>
      <div><dt>Proposed rights (not clearance)</dt><dd>${escape(evidence.rightsMode)}</dd></div>
      <div><dt>Passage SHA-256</dt><dd class="reference-digest">${escape(evidence.passageDigest)}</dd></div>
    </dl>`).join('')}
    <p>Inspect the passage in the source linked on each question card. The pilot stores locators and digests, not source excerpts. A digest does not prove that a claim is correct.</p>
    <ul>${group.questions.map(q => `<li>${escape(q.questionVersionId)} · ${escape(q.riskLane)} review</li>`).join('')}</ul>
  </article>`).join('');
  const mismatches = workspace.unavailable.map(q => `<li>${escape(q.questionVersionId)}: ${escape(q.reason)}</li>`).join('');
  return `<section class="panel references-workspace"><span class="eyebrow">CLAIM-FIRST REFERENCES</span><h2>Inspect shared evidence before individual decisions</h2>
    <p>${workspace.uniqueClaimCount} exact claim binding(s) · ${workspace.claimQuestionLinks} claim/question links · ${workspace.questionCount} questions in this queue.</p>
    <p>Evidence inspection is reusable; question approval is not. Check every question's wording, answer, explanation and qualifications separately. These pilot claims may not cover every material assertion.</p>
    ${mismatches ? `<h3>Evidence needs reassessment</h3><ul>${mismatches}</ul>` : ''}
    <div class="source-list">${cards || '<p>No matching pilot claims in this queue.</p>'}</div>
    <p class="muted">No shared approval is recorded here. Medical, References, Rights and publication remain separate.</p></section>`;
}
