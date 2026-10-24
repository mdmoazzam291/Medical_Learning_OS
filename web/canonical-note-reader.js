// Canonical Markdown is untrusted source text. Only inert, escaped HTML is emitted.
export const escapeNoteText = value => String(value ?? '').replace(/[&<>"']/g, char => ({
  '&':'&amp;', '<':'&lt;', '>':'&gt;', '"':'&quot;', "'":'&#39;'
}[char]));
const headingMatch = line => /^ {0,3}(#{1,6})[ \t]+(.+?)[ \t]*#*[ \t]*$/.exec(line);
const bulletMatch = line => /^ {0,3}[-*+][ \t]+(.+)$/.exec(line);
const numberMatch = line => /^ {0,3}\d+[.)][ \t]+(.+)$/.exec(line);
const fenceMatch = line => /^ {0,3}(`{3,}|~{3,})(.*)$/.exec(line);
const ruleMatch = line => /^ {0,3}(?:[-*_][ \t]*){3,}$/.test(line);
const inlinePattern = /`([^`\n]+)`|\[([^\]\n]+)\]\((https:\/\/[^\s)]+)\)|\*\*([^*\n]+)\*\*|__([^_\n]+)__|\*([^*\n]+)\*|_([^_\n]+)_/g;
function inline(source) {
  const input=String(source);let out='',position=0;
  for(const m of input.matchAll(inlinePattern)) {
    out+=escapeNoteText(input.slice(position,m.index));
    const [token,code,label,rawUrl,strongA,strongB,emA,emB]=m;
    if(code!==undefined)out+='<code>'+escapeNoteText(code)+'</code>';
    else if(label!==undefined){
      let url=null;
      try {const parsed=new URL(rawUrl);if(parsed.protocol==='https:')url=parsed.href;}catch{/* Show invalid links literally. */}
      out+=url?'<a href="'+escapeNoteText(url)+'" target="_blank" rel="noopener noreferrer">'+escapeNoteText(label)+'</a>':escapeNoteText(token);
    } else if(strongA!==undefined||strongB!==undefined)out+='<strong>'+escapeNoteText(strongA??strongB)+'</strong>';
    else out+='<em>'+escapeNoteText(emA??emB)+'</em>';
    position=m.index+token.length;
  }
  return out+escapeNoteText(input.slice(position));
}
const slug = s => String(s).toLowerCase().normalize('NFKD').replace(/[\u0300-\u036f]/g,'').replace(/[^a-z0-9]+/g,'-').replace(/^-+|-+$/g,'').slice(0,54);
const blank=s=>!s.trim();
const structural=s=>blank(s)||headingMatch(s)||bulletMatch(s)||numberMatch(s)||fenceMatch(s)||ruleMatch(s)||/^ {0,3}>[ \t]?/.test(s);
export function renderCanonicalNote(markdown,{idPrefix='canonical-note'}={}){
  const lines=String(markdown??'').replace(/\r\n?/g,'\n').split('\n');
  const prefix=String(idPrefix).replace(/[^a-zA-Z0-9-]/g,'-').slice(0,95)||'canonical-note';
  const sections=[],parts=[],names=new Map();let i=0;
  while(i<lines.length){
    const line=lines[i];
    if(blank(line)){i++;continue;}
    const fence=fenceMatch(line);
    if(fence){
      const marker=fence[1][0],count=fence[1].length,items=[];i++;
      while(i<lines.length&&!(lines[i].trim().length>=count&&[...lines[i].trim()].every(ch=>ch===marker)))items.push(lines[i++]);
      if(i<lines.length)i++;
      parts.push('<pre class="canonical-note-code"><code>'+escapeNoteText(items.join('\n'))+'</code></pre>');
      continue;
    }
    const h=headingMatch(line);
    if(h){
      const label=h[2].trim(),base=slug(label)||'section',number=(names.get(base)||0)+1;
      names.set(base,number);
      const id=prefix+'-'+base+(number>1?'-'+number:'');
      const level=Math.min(6,h[1].length+2);
      sections.push({id,label,level:h[1].length});
      parts.push('<h'+level+' id="'+id+'" class="canonical-note-heading" tabindex="-1">'+inline(label)+'</h'+level+'>');
      i++;continue;
    }
    if(ruleMatch(line)){parts.push('<hr class="canonical-note-divider">');i++;continue;}
    const bullet=bulletMatch(line),ordered=numberMatch(line);
    if(bullet||ordered){
      const type=ordered?'ol':'ul',items=[];
      while(i<lines.length){
        const m=(ordered?numberMatch:bulletMatch)(lines[i]);if(!m)break;
        items.push('<li>'+inline(m[1])+'</li>');i++;
      }
      parts.push('<'+type+'>'+items.join('')+'</'+type+'>');continue;
    }
    if(/^ {0,3}>[ \t]?/.test(line)){
      const items=[];while(i<lines.length&&/^ {0,3}>[ \t]?/.test(lines[i]))items.push(lines[i++].replace(/^ {0,3}>[ \t]?/,''));
      parts.push('<blockquote><p>'+inline(items.join(' '))+'</p></blockquote>');continue;
    }
    const para=[];while(i<lines.length&&!structural(lines[i]))para.push(lines[i++].trim());
    if(para.length)parts.push('<p>'+inline(para.join(' '))+'</p>');
    else parts.push('<p>'+inline(lines[i++])+'</p>');
  }
  return {html:'<div class="canonical-note-content">'+parts.join('')+'</div>',sections};
}
export function renderNoteOutline(sections){
  if(!sections?.length)return '';
  const visible=sections.filter(s=>s.level<=3).slice(0,50);if(!visible.length)return '';
  return '<nav class="canonical-note-outline" aria-label="Sections in this note"><strong>On this page</strong><ol>'+
    visible.map(({id,label,level})=>'<li'+(level>2?' class="canonical-outline-child"':'')+
    '><a href="#'+escapeNoteText(id)+'" data-section-title="'+escapeNoteText(id)+'">'+escapeNoteText(label)+'</a></li>').join('')+'</ol></nav>';
}
