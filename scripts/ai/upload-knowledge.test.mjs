import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { test } from 'node:test';

import { MAX_KNOWLEDGE_BYTES, validateKnowledge } from './upload-knowledge.mjs';

const document = { sourceId: 'project:andevengine', locale: 'pt', title: 'andevengine', path: '/pt/labs#lab-andevengine', body: 'Motor 2D.' };

test('accepts the documents the build renders', () => {
  const knowledge = validateKnowledge(JSON.stringify({ schemaVersion: 1, documents: [document] }));
  assert.equal(knowledge.documents.length, 1);
});

test('refuses anything the API would refuse', () => {
  assert.throws(() => validateKnowledge(JSON.stringify({ schemaVersion: 2, documents: [document] })));
  assert.throws(() => validateKnowledge(JSON.stringify({ schemaVersion: 1, documents: [] })));
  assert.throws(() => validateKnowledge(JSON.stringify({ schemaVersion: 1, documents: [{ ...document, sourceId: 'secret:x' }] })));
  assert.throws(() => validateKnowledge(JSON.stringify({ schemaVersion: 1, documents: [{ ...document, path: '/en/labs' }] })));
  assert.throws(() => validateKnowledge('x'.repeat(MAX_KNOWLEDGE_BYTES + 1)));
});

test('the deploy package never contains the documents', () => {
  const assemble = readFileSync(new URL('../assemble-deploy.mjs', import.meta.url), 'utf8');
  assert.ok(assemble.includes("rename(resolve(outputDirectory, 'ai-knowledge.json'), resolve(knowledgeDirectory, 'site-knowledge.json'))"));
  assert.ok(assemble.includes("'ai-knowledge.json.data'"));
});
