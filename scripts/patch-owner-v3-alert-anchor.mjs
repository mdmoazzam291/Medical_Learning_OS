import { readFile, writeFile } from 'node:fs/promises';

const path = 'scripts/patch-owner-v3.mjs';
let text = await readFile(path, 'utf8');
const before = "  const infraRowsAnchor = '      ${infrastructureRows(infra)}\\n      <p class=\\\"muted\\\">Catalog freshness checkpoint:';\n  text = once(text, infraRowsAnchor,\n    '      ${infrastructureRows(infra)}\\n      <div class=\\\"owner-status-block\\\"><strong>Open infrastructure alerts</strong>${alertRows(data?.infrastructureAlerts)}</div>\\n      <p class=\\\"muted\\\">Catalog freshness checkpoint:',\n    'owner-ui-alerts');";
const after = "  const infraRowsAnchor = '${infrastructureRows(infra)}\\n      <p class=\\\"muted\\\">Catalog freshness checkpoint:';\n  text = once(text, infraRowsAnchor,\n    '${infrastructureRows(infra)}\\n      <div class=\\\"owner-status-block\\\"><strong>Open infrastructure alerts</strong>${alertRows(data?.infrastructureAlerts)}</div>\\n      <p class=\\\"muted\\\">Catalog freshness checkpoint:',\n    'owner-ui-alerts');";
if (!text.includes(before)) throw new Error('original_owner_ui_alert_anchor_not_found');
text = text.replace(before, after);
await writeFile(path, text);
console.log('Owner V3 alert anchor repaired');
