// Static public install profile: never ships account/data/config execution code.
import {copyFile,mkdir,readFile,writeFile} from 'node:fs/promises';
import {dirname,join} from 'node:path';
const publicPages=new Set(['web/index.html','web/services.html','web/contact.html','web/privacy.html','web/terms.html','web/refunds.html','web/delivery.html']);
const assets=['web/styles.css','web/navigation.css','web/public-policies.css','web/favicon.svg','web/medretica-mark.svg','web/medretica-fold.svg','web/apple-touch-icon.png','web/app-icon-192.png','web/app-icon-512.png','web/manifest.webmanifest'];
const banner='<aside class="panel" aria-label="Public preview"><strong>Public preview</strong> · Accounts and study data are unavailable in this build.</aside>';
export const publicPreviewHeaders=`/*
  Cache-Control: no-store
  X-Content-Type-Options: nosniff
  X-Robots-Tag: noindex, nofollow
  Content-Security-Policy: default-src 'none'; script-src 'none'; connect-src 'none'; style-src 'self'; img-src 'self'; manifest-src 'self'; object-src 'none'; base-uri 'none'; frame-ancestors 'none'; form-action 'none'
/web/manifest.webmanifest
  Content-Type: application/manifest+json; charset=utf-8
`;
function staticOnly(html){
 const cleaned=html.replace(/<script\b[^>]*>[\s\S]*?<\/script\s*>/gi,'').replace(/<noscript\b[^>]*>[\s\S]*?<\/noscript\s*>/gi,'');
 if(/<script\b|<form\b|\son[a-z]+\s*=|javascript:/i.test(cleaned))throw Error('unsafe_public_preview_markup');
 return cleaned;
}
export async function buildPublicInstallPreview({repoRoot,output,publicFiles}){
 const written=new Set();
 async function write(path,content){await mkdir(dirname(join(output,path)),{recursive:true});await writeFile(join(output,path),content);written.add(path);}
 const sourceHead=staticOnly(await readFile(join(repoRoot,'web/index.html'),'utf8')).split('</head>')[0]+'</head>';
 const notice=sourceHead+'<body><main class="account-page public-home"><section class="panel"><h1>Public preview</h1><p>Accounts and study data are unavailable in this build.</p><p>You can inspect the public pages and install/launch appearance. No sign-in, account creation or study-data actions are available here.</p><a href="/">Return to the preview homepage</a></section></main></body></html>';
 for(const path of publicFiles.filter(x=>x.endsWith('.html'))){
  let html=publicPages.has(path)?staticOnly(await readFile(join(repoRoot,path),'utf8')).replace(/(<body\b[^>]*>)/i,'$1'+banner):notice;
  await write(path,html);
 }
 for(const path of assets){await mkdir(dirname(join(output,path)),{recursive:true});await copyFile(join(repoRoot,path),join(output,path));written.add(path);}
 await write('index.html',await readFile(join(output,'web/index.html')));
 await write('_headers',publicPreviewHeaders);
 await write('_redirects','/oauth/consent /web/oauth-consent.html 200\n');
 await write('robots.txt','User-agent: *\nDisallow: /\n');
 return {outputDirectory:output,fileCount:written.size,publicPreview:true};
}
