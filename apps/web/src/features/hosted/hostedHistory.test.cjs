const assert = require('node:assert/strict');
const fs = require('node:fs');
const { test } = require('node:test');
const ts = require('typescript');
require.extensions['.ts'] = (module, filename) => module._compile(ts.transpileModule(fs.readFileSync(filename, 'utf8'),
  { compilerOptions: { target: ts.ScriptTarget.ES2022, module: ts.ModuleKind.CommonJS } }).outputText, filename);
const { runIdFromHash, historyKey, readHistory, rememberHistory } = require('./hostedHistory.ts');
const id = '11111111-1111-4111-8111-111111111111';
const run = '22222222-2222-4222-8222-222222222222';
test('result deep link is a bare UUID; paths, URL credentials and fragments cannot become requests', () => {
  assert.equal(runIdFromHash('#run-' + run), run);
  for (const token of ['#run-https://evil.test/x', '#run-../session', '#run-<script>', '#run-' + run + '?token=secret']) assert.equal(runIdFromHash(token), null);
});
test('browser history is scoped to identity/tenant and stores only bounded metadata', () => {
  const values = new Map(); const storage = { getItem: key => values.get(key) ?? null, setItem: (key, value) => values.set(key, value) };
  const key = historyKey({ user_id: 'one', tenant_id: 'tenant' });
  rememberHistory(storage, key, { documentId: id, name: 'report.pdf', runId: run, seenAt: Date.now(), result: { private: 'not stored' }, cookie: 'not stored' });
  assert.equal(readHistory(storage, historyKey({ user_id: 'two', tenant_id: 'tenant' })).length, 0);
  assert.equal(readHistory(storage, key)[0].runId, run);
  assert.doesNotMatch(values.get(key), /private|cookie|not stored/);
  values.set(key, '{invalid'); assert.deepEqual(readHistory(storage, key), []);
});
