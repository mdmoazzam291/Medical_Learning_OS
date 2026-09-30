// Page-memory drafts only. No storage, network, autosave or learner evidence.
export function createVaultDrafts({ root, onChange = () => {} }) {
  const drafts = new Map();
  const forms = new WeakMap();
  let owner = null;
  const fields = form => [...form.elements].filter(el =>
    el.name && ['TEXTAREA', 'SELECT', 'INPUT'].includes(el.tagName));
  const values = form => Object.fromEntries(fields(form).map(el =>
    [el.name, el.type === 'checkbox' ? el.checked : el.value]));
  const equal = (a, b) => JSON.stringify(a) === JSON.stringify(b);

  function status(form) {
    const meta = forms.get(form);
    if (!meta) return;
    form.querySelector('[data-draft-status]')?.remove();
    const draft = drafts.get(meta.key);
    if (!draft) return;
    const box = document.createElement('div');
    box.dataset.draftStatus = '';
    box.className = 'vault-draft-status';
    const text = document.createElement('p');
    text.textContent = meta.conflict
      ? 'The saved version changed. Your draft is preserved below. Copy any text you need, then discard this draft to use the latest saved version.'
      : 'Unsaved draft · kept while this page stays open. Save before leaving or reloading.';
    const discard = document.createElement('button');
    discard.type = 'button';
    discard.className = 'text-button';
    discard.textContent = 'Discard this draft';
    discard.disabled = meta.busy;
    discard.addEventListener('click', () => {
      if (meta.busy) return;
      drafts.delete(meta.key);
      for (const el of fields(form)) {
        if (el.type === 'checkbox') el.checked = meta.baseline[el.name];
        else el.value = meta.baseline[el.name];
      }
      if (meta.revision) form.dataset.revision = meta.revision;
      meta.conflict = false;
      form.querySelectorAll('[type="submit"]').forEach(el => { el.disabled = false; });
      status(form);
      form.querySelector('textarea')?.focus();
      onChange(drafts.size);
    });
    box.append(text, discard);
    form.append(box);
  }

  function capture(event) {
    const form = event.target.closest('form');
    const meta = forms.get(form);
    if (!meta || meta.busy) return;
    const current = values(form);
    if (equal(current, meta.baseline) && !meta.conflict) drafts.delete(meta.key);
    else drafts.set(meta.key, { values: current, revision: form.dataset.revision || null });
    status(form);
    onChange(drafts.size);
  }
  root.addEventListener('input', capture);
  root.addEventListener('change', capture);

  return {
    hasDrafts: () => drafts.size > 0,
    clear(form) {
      const meta = forms.get(form);
      if (meta) drafts.delete(meta.key);
      onChange(drafts.size);
    },
    restore({ userId, conceptId, busy }) {
      if (owner !== userId) { drafts.clear(); owner = userId; }
      if (!userId || !conceptId) { onChange(drafts.size); return; }
      const visible = new Set();
      for (const form of root.querySelectorAll('.vault-detail form')) {
        const key = JSON.stringify([userId, conceptId, form.id || form.dataset.form,
          form.dataset.annotationId || '', form.dataset.targetType || '',
          form.dataset.targetId || '', form.dataset.correctionAnnotationId || '']);
        visible.add(key);
        const baseline = values(form);
        const revision = form.dataset.revision || null;
        const draft = drafts.get(key);
        const conflict = Boolean(draft?.revision && draft.revision !== revision) ||
          Boolean(draft && draft.values.anchorNoteVersionId !== baseline.anchorNoteVersionId);
        forms.set(form, { key, baseline, revision, busy, conflict });
        if (draft) {
          for (const el of fields(form)) {
            if (!Object.hasOwn(draft.values, el.name)) continue;
            if (el.type === 'checkbox') el.checked = draft.values[el.name];
            else el.value = draft.values[el.name];
          }
          // Never silently rebase an edit onto a newer server revision.
          if (draft.revision) form.dataset.revision = draft.revision;
          for (let parent = form.parentElement; parent && parent !== root; parent = parent.parentElement) {
            if (parent.tagName === 'DETAILS') parent.open = true;
          }
        }
        fields(form).forEach(el => { el.disabled = busy; });
        form.querySelectorAll('[type="submit"]').forEach(el => { el.disabled = busy || conflict; });
        status(form);
      }
      // A deleted annotation or replaced canonical version must not strand text
      // or silently attach it to a different target.
      const detail = root.querySelector('.vault-detail');
      if (detail && visible.size) for (const [key, draft] of drafts) {
        const [, draftConcept] = JSON.parse(key);
        if (draftConcept !== conceptId || visible.has(key)) continue;
        const box = document.createElement('section');
        box.className = 'panel vault-draft-status';
        const text = document.createElement('p');
        text.textContent = 'The original target is no longer available here. Copy your unsaved text before discarding. It has not been attached to another version.';
        const recovery = document.createElement('textarea');
        recovery.readOnly = true;
        recovery.setAttribute('aria-label', 'Recovered unsaved draft');
        recovery.value = draft.values.bodyMarkdown || draft.values.details || '';
        const discard = document.createElement('button');
        discard.type = 'button';
        discard.textContent = 'Discard recovered draft';
        discard.disabled = busy;
        discard.addEventListener('click', () => {
          if (busy) return;
          drafts.delete(key); box.remove(); onChange(drafts.size);
        });
        box.append(text, recovery, discard);
        detail.append(box);
      }
      onChange(drafts.size);
    }
  };
}
