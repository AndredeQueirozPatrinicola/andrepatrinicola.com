// Freezes the content of this deploy. Runs right after checkout, before
// `npm ci` (Node built-ins only), so the snapshot reflects what should be live
// when the run starts:
//   1. a GitHub OIDC token proves to the API which run is calling;
//   2. a push deploy creates its deployment; a CMS dispatch passes DEPLOYMENT_ID;
//   3. the snapshot is written to apps/site/content/blog-snapshot.json and every
//      image original is downloaded (checked against its SHA-256) to .studio-media/.
// Outputs `deployment_id` for the report step. Usage: node scripts/studio/fetch-content.mjs
import { mkdirSync, writeFileSync } from 'node:fs';
import { dirname, join, resolve } from 'node:path';

import {
  DEFAULT_MEDIA_DIR,
  DEFAULT_SNAPSHOT,
  apiBase,
  describeError,
  isSecureUrl,
  isUuid,
  oidcToken,
  request,
  setOutput,
  sha256,
  validateSnapshot,
  withoutMediaUrls,
} from './lib.mjs';

const MAX_MEDIA_BYTES = 10 * 1024 * 1024;

async function createDeployment(api, token) {
  const response = await request(`${api}/publishing/deployments`, {
    method: 'POST',
    headers: { authorization: `Bearer ${token}`, 'content-type': 'application/json' },
    body: '{}',
  });
  if (response.status !== 201) throw new Error(`Could not create a deployment: ${await describeError(response)}`);
  const { deploymentId } = await response.json();
  if (!isUuid(deploymentId)) throw new Error('The API returned an invalid deployment id');
  return deploymentId;
}

async function downloadMedia(media, directory) {
  if (typeof media.url !== 'string' || !isSecureUrl(media.url)) throw new Error(`Media ${media.id} has no download URL`);
  const response = await request(media.url, {}, { timeoutMs: 60_000 });
  if (!response.ok) throw new Error(`Could not download media ${media.id} (HTTP ${response.status})`);
  const bytes = new Uint8Array(await response.arrayBuffer());
  if (bytes.byteLength > MAX_MEDIA_BYTES) throw new Error(`Media ${media.id} is larger than expected`);
  if (sha256(bytes) !== media.sha256) throw new Error(`Media ${media.id} does not match its SHA-256`);
  writeFileSync(join(directory, media.id), bytes);
}

async function main() {
  const api = apiBase(process.env.STUDIO_API_URL);
  const requested = process.env.DEPLOYMENT_ID?.trim() ?? '';
  if (requested && !isUuid(requested)) throw new Error('DEPLOYMENT_ID is not a valid id');

  const token = await oidcToken();
  const deploymentId = requested || (await createDeployment(api, token));
  console.log(`Deployment ${deploymentId}${requested ? '' : ' (created for this push)'}`);

  const response = await request(`${api}/publishing/deployments/${deploymentId}/snapshot`, {
    headers: { authorization: `Bearer ${token}` },
  });
  if (response.status === 409) {
    // Already finished or superseded: deploying it would publish stale content.
    console.error(`::error::Deployment ${deploymentId} cannot run: ${await describeError(response)}`);
    process.exit(1);
  }
  if (!response.ok) throw new Error(`Could not read the snapshot: ${await describeError(response)}`);
  // Only from here on does the API expect a report.
  setOutput('deployment_id', deploymentId);

  const snapshot = validateSnapshot(await response.json());
  const directory = resolve(process.env.STUDIO_MEDIA_DIR || DEFAULT_MEDIA_DIR);
  mkdirSync(directory, { recursive: true });
  for (const media of snapshot.media) await downloadMedia(media, directory);

  const target = resolve(process.env.CONTENT_SNAPSHOT || DEFAULT_SNAPSHOT);
  mkdirSync(dirname(target), { recursive: true });
  writeFileSync(target, `${JSON.stringify(withoutMediaUrls(snapshot), null, 2)}\n`);
  console.log(`Snapshot #${snapshot.sequence}: ${snapshot.articles.length} article(s), ${snapshot.media.length} image(s).`);
}

main().catch((error) => {
  console.error(`::error::${error.message}`);
  process.exit(1);
});
