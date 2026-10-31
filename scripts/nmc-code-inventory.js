// Offline-only scanner. NEVER commits or uploads original NMC PDF text.
// Output is metadata code ID/page hits; raw pages remain transient in memory.
// Text extraction can miss split/graphical codes; a matching count is NOT proof.
import {readFileSync,writeFileSync} from 'node:fs';
import {createHash} from 'node:crypto';
import {spawnSync} from 'node:child_process';
import {extractNmcCodeIndex,validateNmcCodeIndex} from '../src/domain/nmc-code-extraction.js';
const args=process.argv.slice(2);
if(args.length!==2)throw Error('Usage: node scripts/nmc-code-inventory.js <local-2024-source.pdf> <output-metadata.json>');
const [input,output]=args;
if(!/\.pdf$/i.test(input)||!output.endsWith('.json')||input===output)throw Error('Expected local PDF and JSON output');
const bytes=readFileSync(input);
if(bytes.subarray(0,5).toString('ascii')!=='%PDF-'||bytes.length>80*1024*1024)throw Error('Invalid or overly large PDF');
const digest=createHash('sha256').update(bytes).digest('hex');
const result=spawnSync('pdftotext',['-layout',input,'-'],{encoding:'utf8',maxBuffer:100*1024*1024});
if(result.status!==0||result.error||!result.stdout)throw Error('pdftotext unavailable or failed; verify the PDF locally');
const pages=result.stdout.split('\f');
if(pages.at(-1)==='')pages.pop();
const scan=extractNmcCodeIndex(pages,digest);
validateNmcCodeIndex(scan);
writeFileSync(output,JSON.stringify(scan,null,2)+'\n',{encoding:'utf8',flag:'wx'});
process.stdout.write(JSON.stringify({metadataFile:output,codeCount:scan.codes.length,pagesParsed:scan.pagesParsed,
 warning:'UNVERIFIED text-extraction candidates only; no NMC prose or PDF bytes copied'})+'\n');
