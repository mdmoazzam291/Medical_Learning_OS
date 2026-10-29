// Manual, read-only preflight. No network, no DB writes, no medical approval.
// Usage: node scripts/competency-evidence-preflight.js [candidate.json]
// To propose canonical links, supply a verified catalog snapshot through a
// programmatic caller; this CLI deliberately refuses unverified identity IDs.
import {readFileSync} from 'node:fs';
import {competencyEvidencePreflight} from '../src/domain/competency-evidence.js';
const file=process.argv[2]||'data/competency-evidence-proposals.json';
if(process.argv.length>3)throw Error('single candidate file expected');
const result=competencyEvidencePreflight(JSON.parse(readFileSync(file,'utf8')));
console.log(JSON.stringify(result,null,2));
