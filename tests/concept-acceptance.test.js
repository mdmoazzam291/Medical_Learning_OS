import test from 'node:test';
import assert from 'node:assert/strict';
import {CONCEPT_ACCEPT_ATTESTATION,validateConceptAcceptance} from '../src/domain/concept-acceptance.js';
const example=()=>({schemaVersion:1,requestId:'11111111-1111-4111-8111-111111111111',proposalId:'22222222-2222-4222-8222-222222222222',revision:2,digest:'a'.repeat(64),reviewNotes:'Identity and classification reviewed against the named synthetic source.',attestation:CONCEPT_ACCEPT_ATTESTATION});
test('acceptance contract binds exact immutable revision and explicit classification review',()=>{
 assert.deepEqual(validateConceptAcceptance(example()),example());
});
test('acceptance cannot claim medical approval, learner publication, or spoof an actor',()=>{
 for(const change of [{status:'published'},{approvedBy:'forged'},{digest:'invalid'},{revision:1.25},{attestation:'medical-approved'},{reviewNotes:'auto approve'}, {proposalId:'unknown'}, {schemaVersion:2}])
 assert.throws(()=>validateConceptAcceptance({...example(),...change}),/concept_accept_invalid/);
});
