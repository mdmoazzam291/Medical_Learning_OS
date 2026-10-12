import { applyAdminWorkspace } from '/web/admin-workspace-view.js';
const app = document.querySelector('#admin-app');
function sync(event) {
  if (app) applyAdminWorkspace(app, location.hash, globalThis.mlosNavigationAdmin === true, { focus: event?.detail?.explicit === true });
}
for (const event of ['mlos:access', 'mlos:admin-ready', 'mlos:route', 'popstate', 'hashchange']) window.addEventListener(event, sync);
sync();
