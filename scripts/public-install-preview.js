// Static public install profile: never ships account/data/config execution code.
import {copyFile,mkdir,readFile,writeFile} from 'node:fs/promises';
import {dirname,join} from 'node:path';
import {installGuideBody} from './public-install-guide.js';
const publicPages=new Set(['web/index.html','web/services.html','web/contact.html','web/privacy.html','web/terms.html','web/refunds.html','web/delivery.html']);
const assets=['web/styles.css','web/navigation.css','web/public-policies.css','web/favicon.svg','web/medretica-mark.svg','web/medretica-fold.svg','web/apple-touch-icon.png','web/app-icon-192.png','web/app-icon-512.png','web/manifest.webmanifest'];
const banner='<aside class="panel" aria-label="Public preview"><strong>Public preview</strong> · Accounts and study data are unavailable in this build. <a class="secondary action-link" href="/web/install.html">Installation guide →</a></aside>';
export const publicPreviewHeaders=`/*
  Cache-Control: no-store
  X-Content-Type-Options: nosniff
  X-Robots-Tag: noindex, nofollow
  Content-Security-Policy: default-src 'none'; script-src 'none'; connect-src 'none'; style-src 'self'; img-src 'self'; manifest-src 'self'; object-src 'none'; base-uri 'none'; frame-ancestors 'none'; form-action 'none'
/web/manifest.webmanifest
  Content-Type: application/manifest+json; charset=utf-8
`;
function previewIdentity(html){
 return html.replace('<meta name="apple-mobile-web-app-title" content="Medretica">','<meta name="apple-mobile-web-app-title" content="Medretica Preview">')
  .replace('<meta name="application-name" content="Medretica">','<meta name="application-name" content="Medretica Preview">')
  .replace(/<title>([\s\S]*?)<\/title>/i,'<title>$1 · Public preview</title>');
}
function staticOnly(html){
 const cleaned=html.replace(/<script\b[^>]*>[\s\S]*?<\/script\s*>/gi,'').replace(/<noscript\b[^>]*>[\s\S]*?<\/noscript\s*>/gi,'');
 if(/<script\b|<form\b|\son[a-z]+\s*=|javascript:/i.test(cleaned))throw Error('unsafe_public_preview_markup');
 return cleaned;
}
// These layout rules ship only in this static profile, after the shared styles.
const previewStyles = `.mlos-install-preview .account-page{padding-top:16px}
.mlos-install-preview .page-heading{margin-top:0}
.mlos-install-preview>[aria-label="Public preview"]{width:calc(100% - 36px);max-width:944px;margin:12px auto 0;padding:16px}
`;
function previewDocument(html){
 return previewIdentity(staticOnly(html))
  .replace('</head>','<link rel="stylesheet" href="/web/install-preview.css"></head>')
  .replace(/<body\b([^>]*)>/i,(_,attrs)=>'<body'+(/\bclass="/.test(attrs)?attrs.replace(/class="([^"]*)"/,(_,classes)=>'class="'+classes+' mlos-install-preview"'):attrs+' class="mlos-install-preview"')+'>')
  .replace(/<a\b[^>]*href="\/web\/account(?:\.html)?(?:[?#][^"]*)?"[^>]*>[\s\S]*?<\/a>/gi,'<a class="primary action-link" href="/web/install.html">Installation guide →</a>');
}
function previewHome(html){
 return html.replace(/<aside class="session-card" aria-label="How to get started">[\s\S]*?<\/aside>/,'<aside class="session-card" aria-label="Check your installation"><span class="eyebrow">CHECK YOUR INSTALLATION</span><ol><li><span>01</span> Add the preview to your Home Screen</li><li><span>02</span> Launch its icon in a separate app window</li><li><span>03</span> Open the guide and return home</li></ol><p>Accounts and study data are unavailable in this public preview.</p></aside>')
  .replace('<p class="public-home-access">Current access is free. Paid plans are unavailable.</p>','<p class="public-home-access">Public installation preview · Accounts unavailable.</p>');
}
export async function buildPublicInstallPreview({repoRoot,output,publicFiles}){
 const written=new Set();
 async function write(path,content){await mkdir(dirname(join(output,path)),{recursive:true});await writeFile(join(output,path),content);written.add(path);}
 const sourceHead=previewDocument(await readFile(join(repoRoot,'web/index.html'),'utf8')).split('</head>')[0]+'</head>';
 const notice=sourceHead+'<body class="mlos-install-preview"><main class="account-page public-home"><section class="panel"><h1>Public preview</h1><p>Accounts and study data are unavailable in this build.</p><p>You can inspect the public pages and install/launch appearance. No sign-in, account creation or study-data actions are available here.</p><p><a class="secondary action-link" href="/web/install.html">Installation guide →</a></p><a href="/">Return to the preview homepage</a></section></main></body></html>';
 for(const path of publicFiles.filter(x=>x.endsWith('.html'))){
  let html=publicPages.has(path)?previewDocument(await readFile(join(repoRoot,path),'utf8')).replace(/(<body\b[^>]*>)/i,'$1'+banner):notice;
  if(path==='web/index.html')html=previewHome(html);
  await write(path,html);
 }
 await write('web/install.html',sourceHead+'<body class="mlos-install-preview">'+banner+installGuideBody+'</body></html>');
 for(const path of assets){
  if(path==='web/manifest.webmanifest'){
   const manifest=JSON.parse(await readFile(join(repoRoot,path),'utf8'));manifest.name='Medretica Preview';manifest.short_name='M. Preview';await write(path,JSON.stringify(manifest,null,2)+'\n');
  }else{await mkdir(dirname(join(output,path)),{recursive:true});await copyFile(join(repoRoot,path),join(output,path));written.add(path);}
 }
 await write('web/install-preview.css',previewStyles);
 await write('index.html',await readFile(join(output,'web/index.html')));
 await write('_headers',publicPreviewHeaders);
 await write('_redirects','/oauth/consent /web/oauth-consent.html 200\n');
 await write('robots.txt','User-agent: *\nDisallow: /\n');
 return {outputDirectory:output,fileCount:written.size,publicPreview:true};
}
