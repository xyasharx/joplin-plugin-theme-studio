const fs = require('node:fs');
const semver = require('semver');

/**
 * Builds a GitHub API URL for the repository. The empty-path repository
 * access check (`get('')`) must NOT append a trailing slash: the
 * `GET /repos/{owner}/{repo}/` endpoint returns 404 with a trailing slash,
 * which would be misread as "no repository access".
 */
function buildApiUrl(api, repo, path) {
  return `${api}/repos/${repo}${path ? '/' + path : ''}`;
}

async function validateRelease({ packageVersion, manifestVersion, lockVersion, lockRootVersion, refType, refName, sha, get }) {
  if (typeof packageVersion !== 'string' || semver.valid(packageVersion) !== packageVersion) {
    throw new Error('package.json must contain a valid, canonical semantic version.');
  }
  if ([manifestVersion, lockVersion, lockRootVersion].some(version => version !== packageVersion)) {
    throw new Error('package.json, src/manifest.json and package-lock.json versions must match.');
  }
  if (!sha || !/^[a-f0-9]{40}$/i.test(sha)) throw new Error('Missing or invalid checkout commit SHA.');
  const tag = `v${packageVersion}`;
  if (refType === 'tag' && refName !== tag) throw new Error(`The workflow tag must match ${tag}.`);

  const existing = await get(`releases/tags/${encodeURIComponent(tag)}`);
  if (existing) throw new Error(`Release ${tag} already exists. Increase the version; existing releases cannot be overwritten.`);

  const latest = await get('releases/latest');
  if (latest) {
    const latestVersion = semver.valid(latest.tag_name);
    if (!latestVersion) throw new Error('The latest release has an invalid semantic version tag; refusing to publish.');
    if (!semver.gt(packageVersion, latestVersion)) {
      throw new Error(`${tag} must be newer than the latest published release ${latest.tag_name}.`);
    }
  }

  // Existing lightweight or annotated tags must resolve to the exact checkout.
  const ref = await get(`git/ref/tags/${encodeURIComponent(tag)}`);
  if (ref) {
    const commit = await get(`commits/${encodeURIComponent(tag)}`);
    if (!commit || commit.sha !== sha) throw new Error(`Tag ${tag} does not point to the checked-out commit.`);
  }
  return tag;
}

async function main() {
  const { GITHUB_REPOSITORY: repo, GITHUB_API_URL: api, GITHUB_TOKEN: token, GITHUB_SHA: sha, GITHUB_REF_TYPE: refType, GITHUB_REF_NAME: refName, GITHUB_OUTPUT: output } = process.env;
  if (!repo || !api || !token || !output) throw new Error('Missing GitHub Actions environment or token.');
  const read = path => JSON.parse(fs.readFileSync(path, 'utf8'));
  const pkg = read('package.json');
  const manifest = read('src/manifest.json');
  const lock = read('package-lock.json');
  const get = async path => {
    const response = await fetch(buildApiUrl(api, repo, path), {
      headers: { Authorization: `Bearer ${token}`, Accept: 'application/vnd.github+json', 'X-GitHub-Api-Version': '2022-11-28' },
      signal: AbortSignal.timeout(15000),
    });
    if (response.status === 404) return null;
    if (!response.ok) throw new Error(`GitHub API request failed (${response.status}); refusing to publish.`);
    return response.json();
  };
  // Verify repository access before treating endpoint 404s as absence.
  if (!await get('')) throw new Error('Cannot verify repository access; refusing to publish.');
  const tag = await validateRelease({ packageVersion: pkg.version, manifestVersion: manifest.version, lockVersion: lock.version, lockRootVersion: lock.packages?.['']?.version, refType, refName, sha, get });
  fs.appendFileSync(output, `tag=${tag}\n`);
  console.log(`Release preflight passed for ${tag}.`);
}

if (require.main === module) main().catch(error => { console.error(`Release preflight failed: ${error.message}`); process.exitCode = 1; });
module.exports = { validateRelease, buildApiUrl };
