import { createSupabaseAuth } from '/src/adapters/supabase-auth.js';
import { createCloudReview } from '/src/adapters/cloud-review.js';
import { cloudConfig } from '/web/cloud-config.js';
import { runConceptHttpAcceptance, acceptanceOrigins } from '/src/adapters/concept-http-acceptance.js';

const output = document.querySelector('#results');
const buttons = [...document.querySelectorAll('button')];
if (!acceptanceOrigins.includes(location.origin)) {
  output.textContent = 'Disabled: available only on an exact authorized concept preview.';
} else {
  const auth = createSupabaseAuth(cloudConfig);
  const review = createCloudReview({...cloudConfig, auth});
  output.textContent = 'Sign in using Account, then choose the matching account role.';
  for (const button of buttons) {
    button.disabled = false;
    button.addEventListener('click', async () => {
      buttons.forEach(b => { b.disabled = true; });
      output.textContent = 'Running non-persisting checks…';
      try {
        const results = await runConceptHttpAcceptance({
          ...cloudConfig, origin: location.origin, role: button.id.endsWith('admin') ? 'admin' : 'learner', suite: button.id.startsWith('accept-') ? 'acceptance' : 'drafts',
          getSession: () => auth.getSession(), getMe: () => review.me()
        });
        output.textContent = results.map(r => `PASS ${r.name}: HTTP ${r.status}`).join('\n') + '\nAll selected hosted checks passed. No draft write submitted.';
      } catch (error) {
        output.textContent = 'FAIL: ' + (error?.acceptanceFailure || 'Session or transport unavailable; no pass established.');
      } finally {
        buttons.forEach(b => { b.disabled = false; });
      }
    });
  }
}
