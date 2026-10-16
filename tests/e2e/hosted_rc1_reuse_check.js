// playwright-cli: synthetic GET-only result, no model calls or credentials.
async page => {
  const base = new URL(page.url()).origin;
  const runId = '11111111-1111-4111-8111-111111111111';
  const documentId = '22222222-2222-4222-8222-222222222222';
  const analyzedAt = '2026-10-15T03:04:05+00:00';
  let reused = true;
  const errors = [];
  page.on('pageerror', error => errors.push(error.message));
  const doc = { document_id: documentId, display_name: 'RC1 합성 보고서', page_count: 2,
    sha256: 'a'.repeat(64), uploaded_at: '2026-10-16T00:00:00Z', expires: 9999999999 };
  const run = { run_id: runId, document_id: documentId, status: 'completed',
    selected_pages: [1], result_url: `/v1/runs/${runId}/result`, stage: 'result', progress: 1 };
  await page.route('**/hosted-api/**', async route => {
    if (route.request().method() !== 'GET') throw Error('Unexpected write');
    const path = new URL(route.request().url()).pathname.replace('/hosted-api', '');
    let body;
    if (path === '/v1/runtime') body = { live_analysis: true, accept_uploads: true, accept_new_runs: false,
      limits: { max_upload_bytes: 1048576, max_pdf_pages: 300 } };
    else if (path === '/v1/session') body = { user_id: 'fixture', tenant_id: 'fixture', role: 'admin', csrf_token: '' };
    else if (path === '/v1/documents') body = { items: [doc], next_cursor: null };
    else if (path === '/v1/runs') body = { items: [run], next_cursor: null };
    else if (path === `/v1/documents/${documentId}`) body = doc;
    else if (path === `/v1/runs/${runId}`) body = run;
    else if (path.endsWith('/result')) body = { schema: 'r108-hosted-result-v1', claims: [], reviews: [],
      hold_reasons: [], page_map: [1], pipeline: { status: 'completed' },
      ...(reused ? { reuse: { reused: true, analyzed_at: analyzedAt, source_policy_sha256: 'b'.repeat(64), review_supported: false } } : {}) };
    else return route.fulfill({ status: 404, body: '{}' });
    await route.fulfill({ contentType: 'application/json', body: JSON.stringify(body) });
  });
  for (const width of [1440, 390]) {
    await page.setViewportSize({ width, height: 900 });
    await page.goto(`${base}/runs/${runId}/result`);
    const notice = page.getByTestId('result-reuse');
    await notice.waitFor();
    if (!(await notice.innerText()).includes('이전 분석 결과 · 분석 일시')) throw Error('Reuse notice missing');
    if (await notice.locator('time').getAttribute('datetime') !== analyzedAt) throw Error('Wrong analysis time');
    if (await page.evaluate(() => document.documentElement.scrollWidth > innerWidth)) throw Error('Horizontal overflow');
  }
  reused = false;
  await page.reload();
  await page.getByTestId('hosted-result').waitFor();
  if (await page.getByTestId('result-reuse').count()) throw Error('Notice on a fresh result');
  if (errors.length) throw Error(errors.join('; '));
  return { status: 'passed', widths: [1440, 390], fresh_result_unchanged: true, errors };
}
