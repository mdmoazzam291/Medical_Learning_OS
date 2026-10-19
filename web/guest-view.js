import { accountEntryHref } from './auth-return.js';
const escape = value => String(value).replace(/[&<>"']/g, c => ({ '&':'&amp;', '<':'&lt;', '>':'&gt;', '"':'&quot;', "'":'&#39;' }[c]));
const sections = {
  study: { name:'Study', title:'A clear next step for your medical preparation.', description:'Resume unfinished work, practise available reviewed questions and return to due reviews.', items:['Choose a study session that fits your time.', 'Continue your saved work across devices.', 'Review questions and explanations as content becomes available.'] },
  library: { name:'Library', title:'Keep questions, notes and concepts connected.', description:'Explore published material by subject or concept, and find connected notes and questions in one workspace.', items:['Find reviewed questions and notes.', 'Use subject and concept views to connect your learning.', 'Your selected view and filters are kept when you sign in.'] },
  exams: { name:'Exams', title:'Practise the exam flow at your pace.', description:'Check available exam practice and full-mock readiness for the published question pool.', items:['Choose from the practice options currently available.', 'Keep your exam attempts connected to your learning record.', 'Full mocks depend on enough eligible reviewed questions.'] }
};
export function guestContent(section, destination = '/') {
  const data = sections[section] || sections.study;
  return '<div class="page-heading"><div><span class="eyebrow">MEDRETICA · '+data.name.toUpperCase()+'</span><h1>'+data.title+'</h1><p>'+data.description+'</p></div></div><section class="panel guest-card" aria-label="'+data.name+' access"><h2>Continue to '+data.name+'</h2><p>Sign in to keep your learning and progress connected.</p><div class="guest-actions"><a class="primary action-link" href="'+escape(accountEntryHref(destination))+'">Sign in →</a><a class="secondary action-link" href="'+escape(accountEntryHref(destination,true))+'">Create account</a></div><ul>'+data.items.map(item=>'<li>'+item+'</li>').join('')+'</ul><p class="guest-availability">Current access is free. Content depends on what has been reviewed and published; some collections may be empty during beta.</p><a href="/web/services">About Medretica &amp; services</a></section>';
}
export function guestPage(section, destination) {
  return '<main id="main" class="account-page guest-page" tabindex="-1">'+guestContent(section,destination)+'</main>';
}
