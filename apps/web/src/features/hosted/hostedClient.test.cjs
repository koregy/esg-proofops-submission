const assert = require('node:assert/strict');
const fs = require('node:fs');
const { test } = require('node:test');
const ts = require('typescript');
require.extensions['.ts'] = (module, filename) => module._compile(ts.transpileModule(
  fs.readFileSync(filename, 'utf8'), { compilerOptions: { target: ts.ScriptTarget.ES2022, module: ts.ModuleKind.CommonJS } }).outputText, filename);
const { HostedApiError, createHostedClient, describeError } = require('./hostedClient.ts');

test('intake refusal preserves documents and gives a useful next step', () => {
  const error = code => describeError(new HostedApiError(429, code, null, '/v1/runs'));
  assert.match(error('QUEUE_FULL'), /대기열.*업로드한 문서는 유지/);
  assert.match(error('DAILY_RUN_LIMIT'), /횟수 한도.*내일/);
  assert.doesNotMatch(error('DAILY_RUN_LIMIT'), /잠시 후/);
  assert.match(error('BUDGET_EXCEEDED'), /운영자.*이번 분석은 접수되지 않았습니다/);
  assert.doesNotMatch(error('BUDGET_EXCEEDED'), /잠시 후/);
});
test('provider authentication and availability errors ask for the correct operator action', () => {
  const error = code => describeError(new HostedApiError(503, code, null, '/v1/runs'));
  assert.match(error('PROVIDER_CREDIT_EXHAUSTED'), /크레딧.*충전/);
  assert.match(error('PROVIDER_AUTH_FAILED'), /인증.*키 확인/);
  assert.match(error('PROVIDER_ACCESS_DENIED'), /권한.*운영자/);
  assert.match(error('PROVIDER_RATE_LIMITED'), /요청 한도.*운영자/);
  assert.match(error('PROVIDER_UNAVAILABLE'), /서버 오류.*운영자/);
});
test('one accounting-pending run stops while another run continues polling', async () => {
  const counts = { held: 0, healthy: 0 };
  const run = (id, status) => ({ run_id: id, document_id: id, status, selected_pages: [1], status_url: `/v1/runs/${id}` });
  const client = createHostedClient({ sleep: async () => {}, fetchImpl: async url => {
    const id = String(url).split('/').at(-1); counts[id]++;
    return new Response(JSON.stringify(run(id, id === 'held' ? 'accounting_pending' : counts[id] === 1 ? 'running' : 'completed')));
  } });
  const updates = { held: [], healthy: [] };
  const done = await Promise.all(['held', 'healthy'].map(id => client.pollRun(run(id, 'queued'), next => updates[id].push(next.status))));
  assert.deepEqual(done.map(r => r.status), ['accounting_pending', 'completed']);
  assert.deepEqual(counts, { held: 1, healthy: 2 });
  assert.deepEqual(updates.healthy, ['queued', 'running', 'completed']);
});

test('read-only requests survive six transient failures without losing the session', async () => {
  let calls = 0; const sleeps = []; const messages = [];
  const client = createHostedClient({ sleep: async ms => sleeps.push(ms), fetchImpl: async () => {
    calls++; if (calls <= 6) return new Response('{}', { status: calls % 2 ? 500 : 503 });
    return new Response(JSON.stringify({ user_id: 'same-user', csrf_token: 'synthetic' }));
  } });
  client.subscribeConnection(message => messages.push(message));
  const session = await client.session();
  assert.equal(session.user_id, 'same-user');
  assert.deepEqual(sleeps, [1000, 2000, 4000, 8000, 16000, 30000]);
  assert.ok(messages.some(message => message.includes('자동 재시도')));
  assert.equal(messages.at(-1), '');
});
test('mutating requests are never automatically replayed after a transient error', async () => {
  let calls = 0;
  const client = createHostedClient({ sleep: async () => {}, fetchImpl: async () => {
    calls++; return new Response('{}', { status: 503 });
  } });
  await assert.rejects(client.login('synthetic'), error => error.status === 503);
  assert.equal(calls, 1);
});
test('401 is surfaced immediately and abort stops transient GET recovery', async () => {
  let calls = 0;
  const unauthorized = createHostedClient({ fetchImpl: async () => { calls++; return new Response('{}', { status: 401 }); } });
  await assert.rejects(unauthorized.session(), error => error.status === 401);
  assert.equal(calls, 1);
  const controller = new AbortController();
  const recovering = createHostedClient({ sleep: async () => controller.abort(), fetchImpl: async () => new Response('{}', { status: 502 }) });
  await assert.rejects(recovering.runtime(controller.signal), error => error.name === 'AbortError');
});

test('a disconnected response body recovers with GET and never fabricates an empty result', async () => {
  let reads = 0;
  const client = createHostedClient({ sleep: async () => {}, fetchImpl: async () => ++reads === 1
    ? new Response(new ReadableStream({ start(controller) { controller.error(new TypeError('connection reset')); } }))
    : new Response(JSON.stringify({ run_id: 'existing', status: 'completed' })) });
  assert.equal((await client.getRun('/v1/runs/existing')).status, 'completed');
  assert.equal(reads, 2);
});


test('PA6 collection reads encode opaque cursor and use GET without CSRF', async () => {
  const calls = [];
  const client = createHostedClient({ fetchImpl: async (url, init) => { calls.push({ url, ...init }); return new Response(JSON.stringify({ items: [], next_cursor: null })); } });
  await client.listDocuments('signed+/=cursor');
  await client.listRuns('signed+/=cursor');
  assert.equal(new URL(calls[0].url, 'https://app.example').searchParams.get('cursor'), 'signed+/=cursor');
  assert.equal(new URL(calls[1].url, 'https://app.example').pathname, '/hosted-api/v1/runs');
  assert.ok(calls.every(call => call.method === 'GET' && call.credentials === 'same-origin' && !call.headers['X-CSRF-Token']));
});

test('PA6 image loads with pinned version/hash and rejects corrupt PNG bytes', async () => {
  const bytes = new Uint8Array([137,80,78,71,13,10,26,10,1,2,3]);
  const digest = Buffer.from(await crypto.subtle.digest('SHA-256', bytes)).toString('hex');
  const manifest = { run_id: 'aaaaaaaa-aaaa-4aaa-8aaa-aaaaaaaaaaaa', physical_page: 2, document_version_id: 'bbbbbbbb-bbbb-4bbb-8bbb-bbbbbbbbbbbb', image_sha256: digest, image_url: 'https://foreign.example/leak' };
  let url;
  const client = createHostedClient({ fetchImpl: async path => { url = path; return new Response(bytes, { headers: { 'Content-Type': 'image/png' } }); } });
  const image = await client.getSourceImage(manifest);
  assert.equal(image.size, bytes.length);
  assert.ok(url.startsWith('/hosted-api/v1/runs/aaaaaaaa-aaaa-4aaa-8aaa-aaaaaaaaaaaa/source-pages/2/image?'));
  assert.equal(new URL(url, 'https://app.example').searchParams.get('document_version_id'), manifest.document_version_id);
  await assert.rejects(client.getSourceImage({ ...manifest, image_sha256: '0'.repeat(64) }), e => e.code === 'SOURCE_IMAGE_MISMATCH');
});
