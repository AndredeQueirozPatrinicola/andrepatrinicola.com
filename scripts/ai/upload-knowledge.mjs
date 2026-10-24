// Sends the portfolio assistant's site documents (projects, games, résumé,
// profile), rendered by the build into .knowledge/site-knowledge.json, to the
// API for the content deployment of this run. The API indexes them only if
// the deployment reports success. Node built-ins only.
// Usage: node scripts/ai/upload-knowledge.mjs [file]   (needs STUDIO_API_URL, DEPLOYMENT_ID)
import { readFileSync } from 'node:fs';
import { pathToFileURL } from 'node:url';

import { apiBase, describeError, isUuid, oidcToken, request } from '../studio/lib.mjs';

export const DEFAULT_KNOWLEDGE = '.knowledge/site-knowledge.json';
/** Same limit as the API (src/ai/ingestion/site-knowledge.ts). */
export const MAX_KNOWLEDGE_BYTES = 512 * 1024;

const sourceIdPattern = /^(project|game|resume|profile):[a-z0-9][a-z0-9-]{0,80}$/;

/** The checks worth failing on before calling the API. */
export function validateKnowledge(raw) {
  if (Buffer.byteLength(raw, 'utf8') > MAX_KNOWLEDGE_BYTES) throw new Error('Site knowledge over 512 KB');
  const knowledge = JSON.parse(raw);
  if (knowledge?.schemaVersion !== 1 || !Array.isArray(knowledge.documents) || knowledge.documents.length === 0) {
    throw new Error('Unexpected site knowledge file');
  }
  for (const document of knowledge.documents) {
    if (!sourceIdPattern.test(document.sourceId ?? '')) throw new Error(`Invalid sourceId ${document.sourceId}`);
    if (typeof document.path !== 'string' || !document.path.startsWith(`/${document.locale}`)) {
      throw new Error(`Invalid path for ${document.sourceId}`);
    }
  }
  return knowledge;
}

async function main() {
  const file = process.argv[2] ?? DEFAULT_KNOWLEDGE;
  const knowledge = validateKnowledge(readFileSync(file, 'utf8'));
  const deploymentId = process.env.DEPLOYMENT_ID;
  if (!isUuid(deploymentId)) throw new Error('DEPLOYMENT_ID is not a valid id');

  const api = apiBase(process.env.STUDIO_API_URL);
  const token = await oidcToken();
  const response = await request(`${api}/publishing/deployments/${deploymentId}/knowledge`, {
    method: 'PUT',
    headers: { authorization: `Bearer ${token}`, 'content-type': 'application/json' },
    body: JSON.stringify(knowledge),
  });
  if (!response.ok) throw new Error(`Could not upload the assistant documents: ${await describeError(response)}`);
  const body = await response.json();
  console.log(`Assistant documents uploaded for deployment ${deploymentId}: ${body.documents}.`);
}

if (process.argv[1] && import.meta.url === pathToFileURL(process.argv[1]).href) {
  main().catch((error) => {
    // A warning, not a failure: the site is already live; the assistant keeps the previous documents.
    console.error(`::warning::${error.message}`);
    process.exit(1);
  });
}
