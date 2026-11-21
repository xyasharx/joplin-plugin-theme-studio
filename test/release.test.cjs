const { test } = require('node:test');
const assert = require('node:assert/strict');
const { validateRelease } = require('../scripts/check-release.cjs');

const sha = 'a'.repeat(40);
const input = {
  packageVersion: '1.6.0', manifestVersion: '1.6.0', lockVersion: '1.6.0', lockRootVersion: '1.6.0',
  refType: 'branch', refName: 'main', sha,
};
const mock = entries => async path => {
  if (entries[path] instanceof Error) throw entries[path];
  return entries[path] ?? null;
};

test('new version passes and uses the version-derived tag', async () => {
  const get = mock({ 'releases/latest': { tag_name: 'v1.5.2' } });
  assert.equal(await validateRelease({ ...input, get }), 'v1.6.0');
});

test('existing published or draft release cannot be overwritten', async () => {
  for (const draft of [false, true]) {
    await assert.rejects(validateRelease({ ...input, get: mock({ 'releases/tags/v1.6.0': { draft } }) }), /already exists/);
  }
});

test('old or equal versions and inconsistent version files fail', async () => {
  await assert.rejects(validateRelease({ ...input, get: mock({ 'releases/latest': { tag_name: 'v1.6.0' } }) }), /must be newer/);
  await assert.rejects(validateRelease({ ...input, get: mock({ 'releases/latest': { tag_name: 'v2.0.0' } }) }), /must be newer/);
  for (const key of ['manifestVersion', 'lockVersion', 'lockRootVersion']) {
    await assert.rejects(validateRelease({ ...input, [key]: '1.5.2', get: mock({}) }), /versions must match/);
  }
});

test('tag runs and existing tag targets must match the checked-out version and commit', async () => {
  await assert.rejects(validateRelease({ ...input, refType: 'tag', refName: 'v1.5.2', get: mock({}) }), /workflow tag/);
  await assert.rejects(validateRelease({ ...input, get: mock({ 'git/ref/tags/v1.6.0': {}, 'commits/v1.6.0': { sha: 'b'.repeat(40) } }) }), /does not point/);
  assert.equal(await validateRelease({ ...input, refType: 'tag', refName: 'v1.6.0', get: mock({ 'git/ref/tags/v1.6.0': {}, 'commits/v1.6.0': { sha } }) }), 'v1.6.0');
});

test('API errors and unrecognizable latest release fail closed', async () => {
  await assert.rejects(validateRelease({ ...input, get: mock({ 'releases/tags/v1.6.0': new Error('API unavailable') }) }), /API unavailable/);
  await assert.rejects(validateRelease({ ...input, get: mock({ 'releases/latest': { tag_name: 'release-final' } }) }), /invalid semantic version/);
});
