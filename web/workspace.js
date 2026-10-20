import { guestToolContent } from '/web/guest-view.js';
import { routeIdentity, navigationFor, preferenceStore } from '/src/domain/app-navigation.js';
import { workspaceContent, preferencesContent } from '/web/workspace-view.js';
import { escapeText as e } from '/web/navigation-view.js';
import { createSupabaseAuth } from '/src/adapters/supabase-auth.js';
import { createCloudStudy } from '/src/adapters/cloud-study.js';
import { cloudConfig } from '/web/cloud-config.js';
const identity = routeIdentity(location.pathname, location.search), root = document.querySelector('#workspace-app');
const auth = createSupabaseAuth(cloudConfig), cloud = createCloudStudy({ ...cloudConfig, auth }), prefs = preferenceStore();
let data = null, loading = false, user = null;
document.querySelector('#workspace-title').textContent = navigationFor(identity.master).find(s => s.id === identity.section)?.label || 'Your workspace';
function render() { root.innerHTML = identity.section === 'preferences' ? preferencesContent(prefs.read(), prefs.persistence) : workspaceContent(identity.section, data || {}); }
async function load(offset = 0) {
  if (loading) return;
  loading = true; data = null; root.textContent = 'Loading your saved workspace…';
  try {
    // Appearance preferences are local device settings, available without learner data.
    if (identity.master === 'account' && identity.section === 'preferences') { data = {}; render(); return; }
    const session = await auth.getSession(); user = session?.user;
    if (!user) { root.innerHTML = guestToolContent(identity.section, location.pathname + location.search + location.hash); return; }
    const section = identity.section;
    if (section === 'preferences') data = {};
    else if (section === 'progress' || section === 'data') data = await cloud.progress();
    else if (section === 'recent') data = await cloud.recentActivity(offset);
    else if (section === 'revision') data = await cloud.due(50);
    else if (section === 'mistakes') data = await cloud.mistakeDiagnostics();
    else if (section === 'dna') data = await cloud.examDna();
    else if (section === 'past' || section === 'autopsy') data = await cloud.examHistory(offset);
    else if (section === 'rules') { data = await cloud.examSimulatorReadiness('neet-pg:2026@1'); try { const target = localStorage.getItem('mlos-personal-target-v1'); if (/^\d{4}-\d{2}-\d{2}$/.test(target || '') && Number.isFinite(Date.parse(target))) data.targetDate = target; } catch { /* Optional date. */ } }
    else throw new Error('Open the selected main workspace to continue.');
    render();
  } catch (error) { root.innerHTML = '<section class="panel"><h2>Workspace unavailable</h2><p>' + e(error.message) + '</p><button data-retry>Retry workspace</button><a href="/web/account.html">Account</a></section>'; }
  finally { loading = false; }
}
root.addEventListener('click', async event => {
  const button = event.target.closest('button'); if (!button) return;
  if (button.hasAttribute('data-retry')) return load();
  if (button.hasAttribute('data-more')) return load(Number(button.dataset.more));
  if (button.hasAttribute('data-export') && user) {
    button.disabled = true;
    try {
      const result = await cloud.exportData(), blob = new Blob([JSON.stringify(result, null, 2)], { type: 'application/json' }), url = URL.createObjectURL(blob), anchor = document.createElement('a');
      anchor.href = url; anchor.download = 'medical-learning-os-my-data.json'; anchor.click(); setTimeout(() => URL.revokeObjectURL(url), 1000);
      root.querySelector('#export-status').textContent = 'Your learner export is ready.';
    } catch (error) { root.querySelector('#export-status').textContent = 'Export unavailable: ' + error.message; }
    finally { button.disabled = false; }
  }
});
root.addEventListener('change', event => {
  const key = event.target.dataset.preference; if (!key) return;
  const value = { ...prefs.read(), [key]: key === 'expanded' ? event.target.value === 'true' : event.target.value };
  const saved = prefs.write(value); window.dispatchEvent(new CustomEvent('mlos:preferences', { detail: { prefs: saved } })); render();
});
root.addEventListener('submit', event => {
  if (event.target.id !== 'plan-form') return;
  event.preventDefault(); const target = new FormData(event.target).get('targetDate');
  if (!/^\d{4}-\d{2}-\d{2}$/.test(target || '') || !Number.isFinite(Date.parse(target))) return;
  try { localStorage.setItem('mlos-personal-target-v1', target); root.querySelector('#plan-status').textContent = 'Personal target saved on this device.'; }
  catch { data.targetDate = target; root.querySelector('#plan-status').textContent = 'Target stays in page memory; device storage is unavailable.'; }
});
window.addEventListener('mlos:preferences', event => { if (event.detail?.prefs) prefs.write(event.detail.prefs); if (identity.master === 'account' && identity.section === 'preferences') render(); });
load();
