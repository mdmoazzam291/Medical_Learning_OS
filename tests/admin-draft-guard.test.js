import test from 'node:test';
import assert from 'node:assert/strict';
const helper=await import('../web/admin-draft-guard.js').catch(e=>{if(e.code==='ERR_MODULE_NOT_FOUND')return {};throw e;});
const field=(value='',extra={})=>({tagName:'TEXTAREA',type:'textarea',value,defaultValue:'',disabled:false,isConnected:true,...extra});
const container=controls=>({querySelectorAll:()=>controls,setAttribute(){}});
test('draft comparison detects programmatic changes and respects reverted defaults',()=>{
 const c=field('correction JSON'),root=container([c]);assert.equal(helper.hasDraftChanges(root),true);c.value='';assert.equal(helper.hasDraftChanges(root),false);
 const check=field('',{tagName:'INPUT',type:'checkbox',checked:true,defaultChecked:false});assert.equal(helper.hasDraftChanges(container([check])),true);
 const select=field('',{tagName:'SELECT',type:'select-one',options:[{selected:true,defaultSelected:false},{selected:false,defaultSelected:false}]});assert.equal(helper.hasDraftChanges(container([select])),false);select.options[0].selected=false;select.options[1].selected=true;assert.equal(helper.hasDraftChanges(container([select])),true);
});
test('successful commit updates only the saved form and failed pending locks preserve values and prior disabled controls',()=>{
 const a=field('notes'),b=field('evidence',{disabled:true}),root=container([a,b]);helper.setMutationBusy(root,true);assert.equal(a.disabled,true);assert.equal(b.disabled,true);assert.equal(a.value,'notes');helper.setMutationBusy(root,false);assert.equal(a.disabled,false);assert.equal(b.disabled,true);
 helper.commitDraft(container([a]));assert.equal(helper.hasDraftChanges(container([a])),false);assert.equal(helper.hasDraftChanges(container([b])),true);
});
test('leave warnings cover busy operations and discard cancellation protects other dirty forms',()=>{
 let before,confirmations=0;const c=field('draft'),form=container([c]),root={querySelectorAll:()=>[form]},target={addEventListener(type,fn){if(type==='beforeunload')before=fn;}};
 const guard=helper.createDraftGuard(root,{forms:'form',eventTarget:target,confirm:()=>{confirmations++;return false;}});assert.equal(guard.confirmDiscard(),false);assert.equal(confirmations,1);assert.equal(guard.confirmDiscard({except:form}),true);
 let prevented=false;before({preventDefault(){prevented=true;}});assert.equal(prevented,true);helper.commitDraft(form);prevented=false;before({preventDefault(){prevented=true;}});assert.equal(prevented,false);guard.setBusy(true);before({preventDefault(){prevented=true;}});assert.equal(prevented,true);
});
