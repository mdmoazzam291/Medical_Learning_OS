import test from 'node:test';
import assert from 'node:assert/strict';
import {renderCanonicalNote,renderNoteOutline,escapeNoteText} from '../web/canonical-note-reader.js';

test('canonical renderer preserves actual headings and stable duplicate-section anchors',()=>{
  const source='# Source heading\n\n## 01 Core\nParagraph with **key phrase** and *emphasis*.\n\n## 01 Core\n- First fact\n- Second fact';
  const note=renderCanonicalNote(source,{idPrefix:'note@1'});
  assert.deepEqual(note.sections.map(s=>s.id),['note-1-source-heading','note-1-01-core','note-1-01-core-2']);
  assert.match(note.html,/<h3 id="note-1-source-heading"/);
  assert.match(note.html,/<h4 id="note-1-01-core"/);
  assert.match(note.html,/<strong>key phrase<\/strong>/);
  assert.match(note.html,/<em>emphasis<\/em>/);
  assert.match(note.html,/<ul><li>First fact<\/li><li>Second fact<\/li><\/ul>/);
  const outline=renderNoteOutline(note.sections);
  assert.match(outline,/aria-label="Sections in this note"/);
  assert.match(outline,/href="#note-1-01-core-2"/);
  assert.match(outline,/data-section-title="note-1-01-core"/);
});
test('canonical formatter never treats source HTML, attribute injection or unsafe links as DOM',()=>{
 const payload='# <img src=x onerror="alert(1)">\n\n## <script>window.stolen=1</script>\n' +
 '<img src=x onerror="window.injected=true"> [unsafe](javascript:alert(1)) ' +
 '[legit](https://example.org/a?x=1&y=2) ' +
 '**<svg onload=alert(1)>**\n\n' + String.fromCharCode(96).repeat(3) + 'html\n<script>attack()</script>\n' + String.fromCharCode(96).repeat(3);
 const r=renderCanonicalNote(payload,{idPrefix:'x" onmouseover="oops'});
 assert.doesNotMatch(r.html,/<script|<img|<svg/i);
 assert.match(r.html,/&lt;script&gt;/);
 assert.match(r.html,/&lt;img src=x onerror=&quot;window.injected=true&quot;&gt;/);
 assert.match(r.html,/href="https:\/\/example.org\/a\?x=1&amp;y=2"/);
 assert.match(r.html,/rel="noopener noreferrer"/);
 assert.doesNotMatch(r.html,/href="javascript:/);
 assert.doesNotMatch(r.html,/<[^>]*id="[^"]*" onmouseover=/);
 assert.match(renderNoteOutline(r.sections),/&lt;script&gt;/);
});
test('content remains explicit and readable without invented facts or metadata',()=>{
 const src='## 11 Revision\nIdentify which deficits are on the same versus opposite side.\n\n1. Recall\n2. Compare\n\n> Attribution pending';
 const r=renderCanonicalNote(src);
 assert.equal(r.sections.length,1);
 assert.match(r.html,/Identify which deficits are on the same versus opposite side/);
 assert.match(r.html,/<ol><li>Recall<\/li><li>Compare<\/li><\/ol>/);
 assert.match(r.html,/<blockquote><p>Attribution pending<\/p><\/blockquote>/);
 assert.doesNotMatch(r.html,/NEET-PG|100%|mastery|high yield/i);
 assert.equal(escapeNoteText('<p>"'), '&lt;p&gt;&quot;');
 assert.equal(renderNoteOutline([]),'');
});
