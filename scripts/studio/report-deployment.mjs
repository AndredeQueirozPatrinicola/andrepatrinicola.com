// Tells the API how this deploy ended, so Portfolio Studio can mark articles
// as published (or restore their previous state).
// Usage: node scripts/studio/report-deployment.mjs <success|failure|cancelled|succeeded|failed> [message]
// (GitHub's job.status values are accepted as they are.)
import { pathToFileURL } from 'node:url';

import { apiBase, describeError, isUuid, oidcToken, request } from './lib.mjs';

const statuses = {
  success: 'succeeded',
  succeeded: 'succeeded',
  failure: 'failed',
  failed: 'failed',
  cancelled: 'cancelled',
};

export function reportBody(status, message) {
  const mapped = statuses[status];
  if (!mapped) throw new Error(`Unknown status "${status}"`);
  const trimmed = message?.trim().slice(0, 500);
  return { status: mapped, ...(trimmed ? { message: trimmed } : {}) };
}

async function main() {
  const [status, message] = process.argv.slice(2);
  const body = reportBody(status, message);
  const deploymentId = process.env.DEPLOYMENT_ID;
  if (!isUuid(deploymentId)) throw new Error('DEPLOYMENT_ID is not a valid id');

  const api = apiBase(process.env.STUDIO_API_URL);
  const token = await oidcToken();
  const response = await request(`${api}/publishing/deployments/${deploymentId}/status`, {
    method: 'POST',
    headers: { authorization: `Bearer ${token}`, 'content-type': 'application/json' },
    body: JSON.stringify(body),
  });

  if (response.ok) {
    console.log(`Deployment ${deploymentId} reported as ${body.status}.`);
    return;
  }
  const detail = await describeError(response);
  // A failed or cancelled run reports on a best-effort basis; a success the API refuses must be visible.
  if (response.status === 409 && body.status !== 'succeeded') {
    console.log(`Deployment ${deploymentId} not updated: ${detail}`);
    return;
  }
  throw new Error(`Could not report deployment ${deploymentId}: ${detail}`);
}

if (process.argv[1] && import.meta.url === pathToFileURL(process.argv[1]).href) {
  main().catch((error) => {
    console.error(`::error::${error.message}`);
    process.exit(1);
  });
}
