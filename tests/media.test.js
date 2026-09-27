import test from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { validateMediaBundle, toLearnerMediaPrompt, toLearnerMediaAnnotations } from '../src/domain/media.js';

const fixture = () => JSON.parse(readFileSync(
  new URL('../data/media-contract-example.json', import.meta.url), 'utf8'
));

test('media bundle validates a versioned phase-1 image asset, annotation and question link', () => {
  const input = fixture();
  const result = validateMediaBundle(input);
  assert.equal(result.schemaVersion, 1);
  assert.equal(result.assets[0].modality, 'radiology');
  assert.equal(result.assets[0].mimeType, 'image/png');
  assert.equal(result.annotations[0].kind, 'bbox');
  assert.equal(result.questionLinks[0].blindFirstLook, true);
  input.assets[0].source.provider = 'changed';
  assert.notEqual(result.assets[0].source.provider, 'changed');
  assert.throws(() => { result.assets[0].source.provider = 'changed'; }, TypeError);
});

test('learner prompt projection hides diagnosis, provenance, rights and annotations before answer', () => {
  const prompt = toLearnerMediaPrompt(fixture(), 'demo:image-question@1');
  assert.deepEqual(Object.keys(prompt[0]).sort(), [
    'blindFirstLook','deliveryRef','height','mediaAssetVersionId','mimeType','modality','width'
  ]);
  assert.equal('source' in prompt[0], false);
  assert.equal('diagnosisEvidence' in prompt[0], false);
  assert.equal('review' in prompt[0], false);
  assert.equal('geometry' in prompt[0], false);
});

test('annotation projection is explicit and separate from blind-first-look prompt', () => {
  const annotations = toLearnerMediaAnnotations(fixture(), 'demo:image-question@1');
  assert.equal(annotations.length, 1);
  assert.deepEqual(annotations[0].geometry, { x: 0.2, y: 0.25, width: 0.3, height: 0.35 });
  assert.equal(annotations[0].conceptId, 'demo:visual-finding');
});

test('asset bytes and dimensions are version-bound', () => {
  const c = fixture();
  for (const change of [
    x => { x.assets[0].contentSha256 = 'bad'; },
    x => { x.assets[0].width = 0; },
    x => { x.assets[0].mimeType = 'image/gif'; },
    x => { x.assets[0].modality = 'video'; },
    x => { x.assets[0].mediaAssetVersionId = 'wrong@1'; }
  ]) {
    const value = fixture(); change(value);
    assert.throws(() => validateMediaBundle(value), TypeError);
  }
});

test('unverified media cannot pretend to have reviewer identity or a review timestamp', () => {
  const c = fixture();
  c.assets[0].review.reviewerId = 'reviewer';
  assert.throws(() => validateMediaBundle(c), /Unverified/);
  const d = fixture();
  d.annotations[0].review.reviewedAt = '2026-09-28T00:00:00.000Z';
  assert.throws(() => validateMediaBundle(d), /Unverified/);
});

test('annotation geometry is normalized and cannot escape image bounds', () => {
  const c = fixture();
  c.annotations[0].geometry = { x: 0.9, y: 0.9, width: 0.2, height: 0.2 };
  assert.throws(() => validateMediaBundle(c), /bounding box/);
  const d = fixture();
  d.annotations[0].kind = 'polygon';
  d.annotations[0].geometry = { points: [{x:0.1,y:0.1},{x:0.9,y:0.1}] };
  assert.throws(() => validateMediaBundle(d), /three points/);
});

test('question links cannot reference unknown assets or annotations from another asset', () => {
  const c = fixture();
  c.questionLinks[0].mediaAssetVersionId = 'missing@1';
  assert.throws(() => validateMediaBundle(c), /known media asset/);
  const d = fixture();
  d.questionLinks[0].annotationVersionIds = ['missing@1'];
  assert.throws(() => validateMediaBundle(d), /annotation reference/);
});

test('supported phase-1 modalities and formats are deliberately narrow', () => {
  const modalities = ['radiology','pathology','dermatology','ophthalmology','anatomy','ecg'];
  const mimeTypes = ['image/jpeg','image/png','image/webp'];
  for (const modality of modalities) {
    const c = fixture(); c.assets[0].modality = modality;
    assert.equal(validateMediaBundle(c).assets[0].modality, modality);
  }
  for (const mimeType of mimeTypes) {
    const c = fixture(); c.assets[0].mimeType = mimeType;
    assert.equal(validateMediaBundle(c).assets[0].mimeType, mimeType);
  }
});


test('media source carries a normalized rights state instead of relying on licence prose', () => {
  for (const rightsStatus of ['unknown','owned','licensed','public_domain']) {
    const c = fixture();
    c.assets[0].source.rightsStatus = rightsStatus;
    assert.equal(validateMediaBundle(c).assets[0].source.rightsStatus, rightsStatus);
  }
  const invalid = fixture();
  invalid.assets[0].source.rightsStatus = 'citation_only';
  assert.throws(() => validateMediaBundle(invalid), /rights status/);
});
