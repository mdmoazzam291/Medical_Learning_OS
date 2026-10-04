import {readFile} from 'node:fs/promises';
import {evaluateShortening} from '../src/domain/shortening-evaluation.js';
const path=process.argv[2];if(!path)throw new Error('Usage: node scripts/evaluate-shortening.js private-outcomes.json');
const input=JSON.parse(await readFile(path,'utf8'));
console.log(JSON.stringify(evaluateShortening(input.protocol,input.records),null,2));
