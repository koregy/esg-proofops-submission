// Run with playwright-cli against VITE_ANALYSIS_BACKEND=hosted local Vite. Synthetic GET-only API.
async page => {
  const base = new URL(page.url()).origin;
  const fixture = await page.request.get(`${base}/test/fixtures/w20/scope-confirmation.result.json`);
  if (!fixture.ok()) throw Error('W20 fixture unavailable: use the local Vite dev server');
  const result = await fixture.json();
  const id = '4eae4ebe-707f-40a0-a65d-ede6cd4f9d3c', docId = '22222222-2222-4222-8222-222222222222';
  const errors = [], checks = [];
  const check = (value, message) => { if (!value) throw Error(message); };
  page.on('pageerror', error => errors.push(error.message));
  const doc = { document_id: docId, display_name: 'W20 합성 보고서', company_name: '합성 검증', page_count: 40, size_bytes: 100, expires: 9999999999, sha256: 'a'.repeat(64) };
  const run = { run_id: id, document_id: docId, status: 'completed', selected_pages: [24,25,26], status_url: `/v1/runs/${id}`, result_url: `/v1/runs/${id}/result`, error_code: null };
  await page.unroute('**/hosted-api/**');
  await page.route('**/hosted-api/**', async route => {
    const req = route.request(), path = new URL(req.url()).pathname.replace('/hosted-api', '');
    if (req.method() !== 'GET') { errors.push('Unexpected API write'); return route.abort(); }
    let body;
    if (path === '/v1/runtime') body = { live_analysis: true, accept_uploads: true, accept_new_runs: false, limits: {}, upload_notice: '합성 검증' };
    else if (path === '/v1/session') body = { user_id: 'fixture', tenant_id: 'fixture', role: 'viewer', csrf_token: '', expires_at: '2099-01-01T00:00:00Z' };
    else if (path === '/v1/documents') body = { items: [doc], next_cursor: null };
    else if (path === '/v1/runs') body = { items: [run], next_cursor: null };
    else if (path === `/v1/documents/${docId}`) body = doc;
    else if (path === `/v1/runs/${id}`) body = run;
    else if (path === `/v1/runs/${id}/result`) body = result;
    else return route.fulfill({ status: 404, contentType: 'application/json', body: '{}' });
    return route.fulfill({ contentType: 'application/json', body: JSON.stringify(body) });
  });
  for (const width of [1440, 390]) {
    await page.setViewportSize({ width, height: 1000 });
    await page.goto(`${base}/analyze`);
    await page.getByRole('button', { name: '결과 열기', exact: true }).click();
    const surface = page.getByTestId('hosted-result');
    await surface.waitFor();
    check((await surface.locator('.result-metrics').innerText()).includes('확정\n3'), 'Confirmed union is not 3');
    check(!/범위 기준 확정|범위 확정|확정 0건 — 이유/.test(await surface.innerText()), 'Separate scope confirmation label remains');
    await surface.getByRole('tab', { name: /확정/ }).click();
    check(await surface.locator('.claim-item').count() === 3, 'Confirmed filter must contain three distinct claims');
    await surface.getByRole('button', { name: /범위 내 검색이 완료된 합성 주장/ }).click();
    const panel = surface.getByTestId('grade-panel');
    check((await panel.innerText()).includes('확정 E1 · INCOMPLETE'), 'Scope grade missing');
    check((await panel.innerText()).includes('검사한 원본 쪽: 24–26'), 'Inspected pages missing');
    check((await surface.locator('.result-elements').innerText()).includes('근거 없음(분석 범위 내)'), 'SC1 element state missing');
    if (width === 390) await surface.getByRole('button', { name: '← 목록으로 돌아가기', exact: true }).click();
    await surface.getByRole('tab', { name: /잠정/ }).click();
    check(await surface.locator('.claim-item').count() === 1, 'Provisional filter changed');
    await surface.getByRole('tab', { name: /보류/ }).click();
    check(await surface.locator('.claim-item').count() === 1, 'Hold filter changed');
    check(await page.evaluate(() => document.documentElement.scrollWidth <= innerWidth), 'Horizontal overflow');
    checks.push({ width, confirmed: 3, provisional: 1, hold: 1, scopeDetail: true });
  }
  check(errors.length === 0, errors.join('; '));
  return { checks, errors, fixture: 'synthetic, GET-only; no model calls' };
}
