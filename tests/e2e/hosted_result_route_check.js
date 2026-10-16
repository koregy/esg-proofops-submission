// Run with playwright-cli against a hosted web build; all API data is synthetic.
async page => {
  const base = new URL(page.url()).origin;
  const id = '4eae4ebe-707f-40a0-a65d-ede6cd4f9d3c';
  const other = 'ea4662d0-ac61-416c-84f0-b4d3aa30b5e9';
  const docId = '22222222-2222-4222-8222-222222222222';
  const failures = [], reads = [];
  let sessionStatus = 200, runStatus = 200, resultStatus = 200, logins = 0;
  await page.context().addInitScript(() => {
    for (const method of ['getItem', 'setItem', 'removeItem', 'clear']) {
      Storage.prototype[method] = () => { throw new Error('Browser storage forbidden'); };
    }
  });
  page.on('pageerror', error => failures.push(error.message));
  await page.unroute('**/hosted-api/**');
  const doc = { document_id: docId, display_name: 'W11 합성 회귀 보고서', page_count: 139, size_bytes: 100, expires: 9999999999, sha256: 'a'.repeat(64) };
  const run = runId => ({ run_id: runId, document_id: docId, status: 'partial_blocked', selected_pages: [2], status_url: `/v1/runs/${runId}`, result_url: `/v1/runs/${runId}/result`, error_code: 'R108_NEEDS_REVIEW' });
  const result = runId => ({ schema: 'r108-hosted-result-v1', page_map: [2], reviews: [], hold_reasons: ['R108_NEEDS_REVIEW'], claims: [{ claim_id: 'fixture-' + runId, page_num: 1, original_page_num: 2, quote: runId === id ? 'W11 합성 환경 주장 — 미확인 근거를 보류합니다.' : 'W11 두 번째 실행의 합성 주장', track: 'management', source_quality: 'unverified', source_refs: [], elements: [{ element_id: 'M1', state: 'unknown', evidence_refs: [] }], decision: { decision_status: 'decided', evidence_grade: 'E0', label: 'UNSUBSTANTIATED', review_status: 'needs_review' }, revision: 1, confirmed_grade: 'E0', hold_reason: 'SOURCE_VALIDATION_REQUIRED', possible_grade_range: null, missing_evidence: [] }] });
  await page.route('**/hosted-api/**', async route => {
    const req = route.request(), path = new URL(req.url()).pathname;
    let status = 200, body;
    if (req.method() === 'POST' && path.endsWith('/auth/invitation')) {
      logins++; sessionStatus = 200;
      body = { user_id: 'fixture-user', tenant_id: 'fixture-tenant', role: 'viewer', csrf_token: '', expires_at: 9999999999 };
    } else if (req.method() !== 'GET') {
      failures.push('Unexpected application write'); return route.abort();
    } else {
      reads.push(path);
      if (path.endsWith('/runtime')) body = { live_analysis: true, accept_uploads: true, accept_new_runs: false, limits: { max_upload_bytes: 1048576, max_pdf_pages: 139 }, upload_notice: '합성 회귀 화면 — 새 모델 호출 없음' };
      else if (path.endsWith('/session')) { status = sessionStatus; body = { user_id: 'fixture-user', tenant_id: 'fixture-tenant', role: 'viewer', csrf_token: '', expires_at: 9999999999 }; }
      else if (path.endsWith('/documents')) body = { items: [doc], next_cursor: null };
      else if (path.endsWith('/runs')) body = { items: [run(id)], next_cursor: null };
      else if (path === `/hosted-api/v1/documents/${docId}`) body = doc;
      else if (path.endsWith('/result')) { status = resultStatus; body = result(path.includes(other) ? other : id); }
      else if (path === `/hosted-api/v1/runs/${id}` || path === `/hosted-api/v1/runs/${other}`) { status = runStatus; body = run(path.includes(other) ? other : id); }
      else { status = 404; body = {}; }
    }
    if (status >= 400) body = { error: { code: status === 401 ? 'AUTH_REQUIRED' : status === 403 ? 'FORBIDDEN' : 'RESOURCE_NOT_FOUND' } };
    await route.fulfill({ status, contentType: 'application/json', body: JSON.stringify(body) });
  });
  const resultView = page.getByTestId('hosted-result');
  const checkResult = async () => {
    await resultView.waitFor({ timeout: 10000 });
    if (!page.url().endsWith(`/analyze#run-${id}`)) throw new Error('Run URL lost during redirect');
    if (/UNSUBSTANTIATED|SUBSTANTIATED|INCOMPLETE/.test(await resultView.innerText())) throw new Error('Unverified source acquired a final label');
  };
  for (const path of [`/v1/runs/${id}/result`, `/runs/${id}/result`, `/analyze#run-${id}`]) {
    await page.goto(base + path); await checkResult();
  }
  await page.reload(); await checkResult();
  await page.route('**/demo/naver-2025.json', route => route.fulfill({ status: 404, body: '{}' }));
  await page.goto(base + `/v1/runs/${id}/result`); await checkResult();
  await page.unroute('**/demo/naver-2025.json');
  await page.context().grantPermissions(['clipboard-read', 'clipboard-write']);
  await page.locator('.hosted-run-summary > summary').click();
  await page.getByRole('button', { name: '결과 링크 복사', exact: true }).click();
  await page.getByRole('button', { name: '결과 링크 복사됨', exact: true }).waitFor();
  if (await page.evaluate(() => navigator.clipboard.readText()) !== `${base}/runs/${id}/result`) throw new Error('Human permalink missing');
  await page.goto(base + '/analyze');
  await page.getByLabel('기존 분석 번호 또는 결과 링크').fill(base + `/hosted-api/v1/runs/${id}/result`);
  await page.getByRole('button', { name: '기존 결과 열기', exact: true }).click(); await checkResult();
  await page.goto(base + `/v1/runs/${other}/result`);
  await page.getByText('W11 두 번째 실행의 합성 주장', { exact: true }).waitFor();
  if (await page.getByText('W11 합성 환경 주장 — 미확인 근거를 보류합니다.', { exact: true }).count()) throw new Error('Stale result leaked across routes');
  sessionStatus = 401;
  const beforeLogin = reads.filter(path => path.endsWith('/result')).length;
  await page.goto(base + `/v1/runs/${id}/result`);
  await page.getByRole('button', { name: '입장' }).waitFor();
  if (reads.filter(path => path.endsWith('/result')).length !== beforeLogin || await resultView.count()) throw new Error('Unauthenticated result read');
  await page.getByRole('combobox', {name:'로그인 방식', exact: true }).selectOption('invitation');
  await page.getByLabel('초대 코드 또는 접근 비밀번호').fill('fixture'.repeat(6));
  await page.getByRole('button', { name: '입장' }).click(); await checkResult();
  if (await page.getByLabel('초대 코드 또는 접근 비밀번호').count()) throw new Error('Invitation input persisted');
  runStatus = 403;
  await page.goto(base + `/runs/${id}/result`);
  await page.getByRole('alert').filter({ hasText: /권한/ }).waitFor();
  if (await resultView.count() || await page.getByRole('button', { name: '입장' }).count()) throw new Error('Forbidden result or incorrect login');
  runStatus = 200; resultStatus = 401;
  await page.goto(base + `/runs/${id}/result`);
  await page.getByRole('button', { name: '입장' }).waitFor();
  if (await resultView.count()) throw new Error('Expired session retained result');
  resultStatus = 200; sessionStatus = 200;
  await page.goto(base + `/runs/${id}/result`); await checkResult();
  if (failures.length) throw new Error(failures.join('; '));
  return { resultPath: 'passed', independentOfDemoSnapshot: 'passed', humanPermalink: 'passed', legacyHash: 'passed', fullResultUrlLookup: 'passed', reload: 'passed', secondRunIsolation: 'passed', invitationResume: 'passed', loginCount: logins, unauthorizedRead: 'blocked', forbidden: 'passed', sessionExpiry: 'passed', browserStorage: 'forbidden', data: 'synthetic API only; no model calls' };
}
