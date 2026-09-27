const modalities = ['radiology', 'pathology', 'dermatology', 'ophthalmology', 'anatomy', 'ecg'];
const mimeTypes = ['image/jpeg', 'image/png', 'image/webp'];
const reviewStates = ['unverified', 'ai_assisted', 'single_review', 'double_review', 'gold_standard'];
const annotationKinds = ['hotspot', 'bbox', 'polygon'];
const mediaRoles = ['prompt', 'explanation', 'comparison'];

function fail(message) { throw new TypeError(message); }
function text(value, label) {
  if (typeof value !== 'string' || !value.trim()) fail(`Invalid ${label}`);
}
function shape(value, keys) {
  if (!value || typeof value !== 'object' || Array.isArray(value) ||
      Object.keys(value).length !== keys.length || keys.some(key => !Object.hasOwn(value, key))) {
    fail(`Expected fields: ${keys.join(', ')}`);
  }
}
function list(value, label) {
  if (!Array.isArray(value)) fail(`Invalid ${label}`);
}
function unique(values, label) {
  if (new Set(values).size !== values.length) fail(`Duplicate ${label}`);
}
function timestamp(value) {
  text(value, 'timestamp');
  if (!Number.isFinite(Date.parse(value)) || new Date(value).toISOString() !== value) {
    fail('Expected canonical UTC ISO timestamp');
  }
}
function sha256(value) {
  if (typeof value !== 'string' || !/^[0-9a-f]{64}$/.test(value)) fail('Invalid contentSha256');
}
function httpsUrl(value, label) {
  text(value, label);
  let parsed;
  try { parsed = new URL(value); } catch { fail(`Invalid ${label}`); }
  if (parsed.protocol !== 'https:') fail(`Invalid ${label}`);
}
function normalized(value, label) {
  if (typeof value !== 'number' || !Number.isFinite(value) || value < 0 || value > 1) {
    fail(`Invalid normalized ${label}`);
  }
}
function frozenCopy(value) {
  const copy = structuredClone(value);
  const freeze = object => {
    if (object && typeof object === 'object') {
      Object.values(object).forEach(freeze);
      Object.freeze(object);
    }
    return object;
  };
  return freeze(copy);
}
function validateReview(review) {
  shape(review, ['status', 'reviewerId', 'reviewedAt']);
  if (!reviewStates.includes(review.status)) fail('Invalid media review status');
  if (review.status === 'unverified') {
    if (review.reviewerId !== null || review.reviewedAt !== null) fail('Unverified media cannot carry review identity');
    return;
  }
  text(review.reviewerId, 'reviewerId');
  timestamp(review.reviewedAt);
}
function validateSource(source) {
  shape(source, ['sourceId', 'provider', 'originalIdentifier', 'url', 'copyright', 'license', 'rightsEvidence']);
  for (const key of ['sourceId', 'provider', 'originalIdentifier', 'copyright', 'license', 'rightsEvidence']) {
    text(source[key], key);
  }
  httpsUrl(source.url, 'source URL');
}
function validateAsset(asset) {
  shape(asset, [
    'mediaAssetId', 'mediaAssetVersionId', 'version', 'supersedes',
    'modality', 'mimeType', 'contentSha256', 'width', 'height',
    'deliveryRef', 'source', 'diagnosisEvidence', 'review'
  ]);
  for (const key of ['mediaAssetId', 'deliveryRef', 'diagnosisEvidence']) text(asset[key], key);
  if (!Number.isSafeInteger(asset.version) || asset.version < 1 ||
      asset.mediaAssetVersionId !== `${asset.mediaAssetId}@${asset.version}`) {
    fail('Invalid media asset version');
  }
  const expectedSupersedes = asset.version === 1 ? null : `${asset.mediaAssetId}@${asset.version - 1}`;
  if (asset.supersedes !== expectedSupersedes) fail('Invalid media supersedes link');
  if (!modalities.includes(asset.modality)) fail('Invalid media modality');
  if (!mimeTypes.includes(asset.mimeType)) fail('Invalid media MIME type');
  sha256(asset.contentSha256);
  if (!Number.isSafeInteger(asset.width) || asset.width < 1 ||
      !Number.isSafeInteger(asset.height) || asset.height < 1) {
    fail('Invalid media dimensions');
  }
  validateSource(asset.source);
  validateReview(asset.review);
}
function validateGeometry(kind, geometry) {
  if (kind === 'hotspot') {
    shape(geometry, ['x', 'y']);
    normalized(geometry.x, 'x'); normalized(geometry.y, 'y');
    return;
  }
  if (kind === 'bbox') {
    shape(geometry, ['x', 'y', 'width', 'height']);
    normalized(geometry.x, 'x'); normalized(geometry.y, 'y');
    normalized(geometry.width, 'width'); normalized(geometry.height, 'height');
    if (geometry.width <= 0 || geometry.height <= 0 ||
        geometry.x + geometry.width > 1 || geometry.y + geometry.height > 1) {
      fail('Invalid normalized bounding box');
    }
    return;
  }
  shape(geometry, ['points']);
  list(geometry.points, 'polygon points');
  if (geometry.points.length < 3) fail('Polygon requires at least three points');
  geometry.points.forEach(point => {
    shape(point, ['x', 'y']);
    normalized(point.x, 'x'); normalized(point.y, 'y');
  });
}
function validateAnnotation(annotation, bundle) {
  shape(annotation, [
    'annotationId', 'annotationVersionId', 'version', 'supersedes',
    'mediaAssetVersionId', 'kind', 'geometry', 'label', 'conceptId', 'authorId', 'review'
  ]);
  for (const key of ['annotationId', 'mediaAssetVersionId', 'label', 'conceptId', 'authorId']) text(annotation[key], key);
  if (!Number.isSafeInteger(annotation.version) || annotation.version < 1 ||
      annotation.annotationVersionId !== `${annotation.annotationId}@${annotation.version}`) {
    fail('Invalid annotation version');
  }
  const expectedSupersedes = annotation.version === 1 ? null : `${annotation.annotationId}@${annotation.version - 1}`;
  if (annotation.supersedes !== expectedSupersedes) fail('Invalid annotation supersedes link');
  if (!bundle.assets.some(asset => asset.mediaAssetVersionId === annotation.mediaAssetVersionId)) {
    fail('Annotation must reference a known media asset version');
  }
  if (!annotationKinds.includes(annotation.kind)) fail('Invalid annotation kind');
  validateGeometry(annotation.kind, annotation.geometry);
  validateReview(annotation.review);
}
function validateLink(link, bundle) {
  shape(link, [
    'questionVersionId', 'mediaAssetVersionId', 'role',
    'displayOrder', 'blindFirstLook', 'annotationVersionIds'
  ]);
  text(link.questionVersionId, 'questionVersionId');
  text(link.mediaAssetVersionId, 'mediaAssetVersionId');
  if (!mediaRoles.includes(link.role)) fail('Invalid media role');
  if (!Number.isSafeInteger(link.displayOrder) || link.displayOrder < 0) fail('Invalid display order');
  if (typeof link.blindFirstLook !== 'boolean') fail('Invalid blindFirstLook');
  list(link.annotationVersionIds, 'annotationVersionIds');
  unique(link.annotationVersionIds, 'annotationVersionId');
  if (!bundle.assets.some(asset => asset.mediaAssetVersionId === link.mediaAssetVersionId)) {
    fail('Question media link must reference a known media asset version');
  }
  for (const id of link.annotationVersionIds) {
    const annotation = bundle.annotations.find(item => item.annotationVersionId === id);
    if (!annotation || annotation.mediaAssetVersionId !== link.mediaAssetVersionId) {
      fail('Question media link has an invalid annotation reference');
    }
  }
}

export function validateMediaBundle(input) {
  shape(input, ['schemaVersion', 'assets', 'annotations', 'questionLinks']);
  if (input.schemaVersion !== 1) fail('Unsupported media bundle version');
  for (const key of ['assets', 'annotations', 'questionLinks']) list(input[key], key);
  input.assets.forEach(validateAsset);
  unique(input.assets.map(asset => asset.mediaAssetVersionId), 'mediaAssetVersionId');
  for (const asset of input.assets) {
    if (asset.supersedes && !input.assets.some(previous => previous.mediaAssetVersionId === asset.supersedes)) {
      fail('Missing earlier media asset version');
    }
  }
  input.annotations.forEach(annotation => validateAnnotation(annotation, input));
  unique(input.annotations.map(annotation => annotation.annotationVersionId), 'annotationVersionId');
  for (const annotation of input.annotations) {
    if (annotation.supersedes &&
        !input.annotations.some(previous => previous.annotationVersionId === annotation.supersedes)) {
      fail('Missing earlier annotation version');
    }
  }
  input.questionLinks.forEach(link => validateLink(link, input));
  unique(input.questionLinks.map(link =>
    `${link.questionVersionId}\0${link.mediaAssetVersionId}\0${link.role}\0${link.displayOrder}`
  ), 'question media link');
  return frozenCopy(input);
}

export function toLearnerMediaPrompt(bundle, questionVersionId) {
  const current = validateMediaBundle(bundle);
  text(questionVersionId, 'questionVersionId');
  const links = current.questionLinks
    .filter(link => link.questionVersionId === questionVersionId && link.role === 'prompt')
    .sort((a, b) => a.displayOrder - b.displayOrder);
  return frozenCopy(links.map(link => {
    const asset = current.assets.find(item => item.mediaAssetVersionId === link.mediaAssetVersionId);
    return {
      mediaAssetVersionId: asset.mediaAssetVersionId,
      modality: asset.modality,
      mimeType: asset.mimeType,
      width: asset.width,
      height: asset.height,
      deliveryRef: asset.deliveryRef,
      blindFirstLook: link.blindFirstLook
    };
  }));
}

export function toLearnerMediaAnnotations(bundle, questionVersionId) {
  const current = validateMediaBundle(bundle);
  text(questionVersionId, 'questionVersionId');
  const links = current.questionLinks
    .filter(link => link.questionVersionId === questionVersionId)
    .sort((a, b) => a.displayOrder - b.displayOrder);
  return frozenCopy(links.flatMap(link => link.annotationVersionIds.map(id => {
    const annotation = current.annotations.find(item => item.annotationVersionId === id);
    return {
      annotationVersionId: annotation.annotationVersionId,
      mediaAssetVersionId: annotation.mediaAssetVersionId,
      kind: annotation.kind,
      geometry: annotation.geometry,
      label: annotation.label,
      conceptId: annotation.conceptId
    };
  })));
}
