const PREFLIGHTS = new Map([
  [
    [
      'emergency:anaphylaxis:first-line-drug@1',
      'emergency:anaphylaxis:no-rash-first-action@1'
    ].sort().join('||'),
    {
      contractId: 'm11c-pair-preflight-v1',
      title: 'Anaphylaxis first-line treatment pair',
      structuralFacts: [
        'Distinct published question versions with distinct question IDs.',
        'Both map to primary concept emergency:anaphylaxis:first-line-treatment.',
        'Both exact versions already passed Medical, References and Rights review.',
        'Both are AI-authored, so the content-admin reviewer is not the question author.',
        'Both use the same reviewed source and the same correct action: intramuscular epinephrine.'
      ],
      riskFacts: [
        'Both stems reuse the vaccination context plus wheeze/hypotension, so cue overlap is material rather than negligible.',
        'Question B adds the clinically important absence-of-urticaria condition, requiring recognition that skin findings are not required for anaphylaxis.',
        'Because the second item removes a classic cue, its reasoning burden may be slightly higher even though the treatment construct is unchanged.'
      ],
      suggested: {
        surfaceNovelty: 'moderate',
        constructAlignment: 'same_primary_construct',
        reasoningAlignment: 'bounded_difference',
        difficultyComparability: 'bounded_difference',
        cueOverlapRisk: 'moderate'
      },
      retentionNote: 'Retention comparability is plausible only if the human reviewer independently agrees that surface novelty is at least moderate and cue-overlap risk is not high. If either judgment fails, reject the pair for this protocol.'
    }
  ]
]);

function humanLabel(value) {
  return String(value).replaceAll('_', ' ');
}

function addLine(container, label, value) {
  const row = document.createElement('div');
  const strong = document.createElement('strong');
  const span = document.createElement('span');
  strong.textContent = label;
  span.textContent = value;
  row.append(strong, span);
  container.append(row);
}

function makeList(items) {
  const list = document.createElement('ul');
  for (const item of items) {
    const li = document.createElement('li');
    li.textContent = item;
    list.append(li);
  }
  return list;
}

function renderPreflight(form, preflight) {
  if (form.querySelector('[data-pair-preflight]')) return;

  const panel = document.createElement('div');
  panel.className = 'review-packet pair-preflight';
  panel.dataset.pairPreflight = preflight.contractId;

  const eyebrow = document.createElement('span');
  eyebrow.className = 'eyebrow';
  eyebrow.textContent = 'NON-AUTHORITATIVE PREFLIGHT';

  const heading = document.createElement('h3');
  heading.textContent = preflight.title;

  const warning = document.createElement('p');
  warning.className = 'muted';
  warning.textContent = 'Decision support only. Nothing below is prefilled, selected or submitted. The human reviewer must inspect both exact versions and choose every judgment independently.';

  const factsHeading = document.createElement('strong');
  factsHeading.textContent = 'Verified structural facts';

  const riskHeading = document.createElement('strong');
  riskHeading.textContent = 'Judgment-sensitive risks';

  const suggestionsHeading = document.createElement('strong');
  suggestionsHeading.textContent = 'Tentative starting judgments';

  const suggestions = document.createElement('div');
  suggestions.className = 'metrics pair-preflight-metrics';
  addLine(suggestions, 'Surface novelty', humanLabel(preflight.suggested.surfaceNovelty));
  addLine(suggestions, 'Construct', humanLabel(preflight.suggested.constructAlignment));
  addLine(suggestions, 'Reasoning', humanLabel(preflight.suggested.reasoningAlignment));
  addLine(suggestions, 'Difficulty', humanLabel(preflight.suggested.difficultyComparability));
  addLine(suggestions, 'Cue overlap', humanLabel(preflight.suggested.cueOverlapRisk));

  const retention = document.createElement('p');
  retention.className = 'muted';
  retention.textContent = preflight.retentionNote;

  panel.append(
    eyebrow,
    heading,
    warning,
    factsHeading,
    makeList(preflight.structuralFacts),
    riskHeading,
    makeList(preflight.riskFacts),
    suggestionsHeading,
    suggestions,
    retention
  );
  form.prepend(panel);
}

function attachPreflights() {
  for (const form of document.querySelectorAll('form.transfer-pair-form')) {
    const a = String(form.dataset.a || '');
    const b = String(form.dataset.b || '');
    const preflight = PREFLIGHTS.get([a, b].sort().join('||'));
    if (preflight) renderPreflight(form, preflight);
  }
}

const root = document.querySelector('#admin-app');
if (root) {
  const observer = new MutationObserver(attachPreflights);
  observer.observe(root, { childList: true, subtree: true });
  attachPreflights();
}
