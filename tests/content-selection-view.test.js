import test from 'node:test';import assert from 'node:assert/strict';
import {selectionMarkup} from '../web/content-selection.js';
test('selection UI makes frozen metadata distinct from publication and escapes identities',()=>{
 const html=selectionMarkup({items:[{kind:'question',versionId:'<img>'}],preview:{digest:'a'.repeat(64),catalogVersion:446}});
 assert.match(html,/Freeze evidence selection/);assert.match(html,/not publish/);assert.match(html,/&lt;img&gt;/);assert.doesNotMatch(html,/<img/);
});
test('uncertain save permits retry and disables replacing its request',()=>{
 const html=selectionMarkup({items:[],pending:{requestId:'x'},error:'save'});assert.match(html,/Retry same selection save/);assert.doesNotMatch(html,/data-selection-clear/);
});
