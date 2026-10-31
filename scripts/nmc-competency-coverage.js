// Read-only local coverage audit: no approval, catalog mutation or publication.
import {readFileSync} from 'node:fs';
import {auditNmcCodedCompetencies} from '../src/domain/nmc-competency-coverage.js';
const args=process.argv.slice(2);
if(args.length>1)throw Error('Usage: node scripts/nmc-competency-coverage.js [local-metadata-scan.json]');
const scan=args.length?JSON.parse(readFileSync(args[0],'utf8')):null;
const report=auditNmcCodedCompetencies({scan});
console.log(JSON.stringify(report,null,2));
if(report.complete)throw Error('Unreviewed source cannot be marked complete');
