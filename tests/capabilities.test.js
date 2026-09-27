import test from 'node:test';
import assert from 'node:assert/strict';
import { CAPABILITY_IDS, getCapability, listCapabilities } from '../src/domain/capabilities.js';

test('capability vocabulary is vendor-neutral and immutable', () => {
  const serialized = JSON.stringify(listCapabilities());
  assert.doesNotMatch(serialized, /openai|gemini|claude|langchain|mcp|a2a|ethereum|supabase/i);
  assert.ok(Object.isFrozen(CAPABILITY_IDS));
  assert.ok(listCapabilities().every(item => Object.isFrozen(item)));
});

test('known capabilities resolve with stable semantic metadata', () => {
  assert.equal(getCapability('learning.study.recommend').version, 1);
  assert.equal(getCapability('content.review.propose').humanApproval, 'required_for_authoritative_decision');
});

test('unknown capabilities fail closed', () => {
  assert.throws(() => getCapability('vendor.openai.chat'), /Unknown capability/);
  assert.throws(() => getCapability(''), TypeError);
});
