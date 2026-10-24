// Ephemeral comparison only: no content is cached across departures or accounts.
const controls = root => [...(root?.querySelectorAll?.('input,textarea,select') || [])];
export function hasDraftChanges(root) {
  return controls(root).some(control => {
    if (control.readOnly || ['hidden','button','submit','reset','search'].includes(control.type)) return false;
    if (control.type === 'file') return Boolean(control.files?.length);
    if (['checkbox','radio'].includes(control.type)) return control.checked !== control.defaultChecked;
    if (control.tagName === 'SELECT') {
      const options = [...control.options], explicit = options.some(option => option.defaultSelected);
      return options.some((option,index) => option.selected !== (option.defaultSelected || (!explicit && !control.multiple && index === 0)));
    }
    return control.value !== control.defaultValue;
  });
}
export function commitDraft(root) {
  for (const control of controls(root)) {
    if (control.type === 'file') control.value = '';
    else if (['checkbox','radio'].includes(control.type)) control.defaultChecked = control.checked;
    else if (control.tagName === 'SELECT') for (const option of control.options) option.defaultSelected = option.selected;
    else control.defaultValue = control.value;
  }
}
const locks = new WeakMap();
export function setMutationBusy(root, busy) {
  if (!root) return;
  root.setAttribute?.('aria-busy', String(busy));
  if (busy) {
    if (locks.has(root)) return;
    const previous = new Map();
    for (const control of root.querySelectorAll('input,textarea,select,button')) {
      previous.set(control,control.disabled); control.disabled = true;
    }
    locks.set(root,previous);
  } else {
    for (const [control,disabled] of locks.get(root) || []) if (control.isConnected) control.disabled = disabled;
    locks.delete(root);
  }
}
export function createDraftGuard(root, { forms = 'form', eventTarget = window, confirm = message => window.confirm(message) } = {}) {
  let busy = false;
  const dirty = except => [...(root?.querySelectorAll?.(forms) || [])].some(form => form !== except && !except?.contains?.(form) && hasDraftChanges(form));
  const guard = {
    setBusy(value) { busy = value; },
    confirmDiscard({except = null} = {}) {
      return !busy && (!dirty(except) || confirm('Discard unsaved changes in this view? They are not saved after leaving.'));
    }
  };
  eventTarget.addEventListener('beforeunload', event => {
    if (busy || dirty()) { event.preventDefault(); event.returnValue = ''; }
  });
  return guard;
}
