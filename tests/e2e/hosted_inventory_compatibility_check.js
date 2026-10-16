// Run via playwright-cli run-code --filename after opening a hosted web preview.
// All API responses are synthetic; application writes and browser storage fail.
async page => {
  const base = new URL(page.url()).origin;
  const runId = '11111111-1111-4111-8111-111111111111';
  const documentId = '22222222-2222-4222-8222-222222222222';
  const versionId = '33333333-3333-4333-8333-333333333333';
  const document = { document_id: documentId, page_count: 139, size_bytes: 100, expires: 9999999999, sha256: 'a'.repeat(64), display_name: '합성 회귀 보고서', uploaded_at: '2026-10-11' };
  const run = { run_id: runId, document_id: documentId, status: 'partial_blocked', selected_pages: [2], error_code: null, status_url: `/v1/runs/${runId}`, result_url: `/v1/runs/${runId}/result`, created_at: '2026-10-11' };
  const ref = { source_id: 'fixture-source', document_version_id: versionId, parse_manifest_id: 'fixture-parse', page_num: 1, bbox: [10,20,30,40], raw_text_sha256: 'a'.repeat(64), quote: '합성 환경 주장', char_start: 0, char_end: 8, location_quality: 'located', verification_state: 'verified' };
  const result = { schema: 'r108-hosted-result-v1', page_map: [2], reviews: [], hold_reasons: [], claims: [{ claim_id: 'fixture-claim', page_num: 1, original_page_num: 2, quote: ref.quote, track: 'management', source_quality: 'unverified', source_refs: [ref], elements: [{ element_id: 'M1', state: 'unknown', evidence_refs: [] }], decision: { decision_status: 'decided', evidence_grade: 'E0', label: 'UNSUBSTANTIATED', review_status: 'needs_review' }, revision: 1, hold_reason: 'SOURCE_VALIDATION_REQUIRED', possible_grade_range: null, confirmed_grade: 'E0', missing_evidence: [] }] };
  const failures = [];
  const storageGuard = () => {
    for (const name of ['getItem', 'setItem', 'removeItem', 'clear']) {
      Storage.prototype[name] = () => { throw new Error('Browser storage forbidden'); };
    }
  };
  await page.context().addInitScript(storageGuard);
  page.on('pageerror', error => failures.push(error.message));
  let documentsStatus = 405, runsStatus = 200, sessionStatus = 200, runtimeFailures = 0, attempts = 0;
  await page.unrouteAll();
  await page.route('**/hosted-api/**', async route => {
    const path = new URL(route.request().url()).pathname;
    if (route.request().method() !== 'GET') {
      failures.push('Unexpected application write');
      return route.abort();
    }
    let status = 200, body;
    if (path.endsWith('/runtime')) {
      attempts++;
      if (runtimeFailures-- > 0) status = 502;
      body = { live_analysis: true, accept_uploads: false, accept_new_runs: false, limits: { max_upload_bytes: 1048576, max_pdf_pages: 139 }, upload_notice: '합성 회귀 입력' };
    } else if (path.endsWith('/session')) {
      status = sessionStatus;
      body = { user_id: 'fixture-user', tenant_id: 'fixture-tenant', role: 'viewer', csrf_token: '', expires_at: '2099-01-01' };
    } else if (path.endsWith('/documents')) {
      status = documentsStatus; body = { items: [document], next_cursor: null };
    } else if (path.endsWith('/runs')) {
      status = runsStatus; body = { items: [run], next_cursor: null };
    } else if (path === `/hosted-api/v1/documents/${documentId}`) body = document;
    else if (path === `/hosted-api/v1/runs/${runId}`) body = run;
    else if (path.endsWith('/result')) body = result;
    else { status = 404; body = {}; }
    if (status >= 400) body = { error: { code: status === 401 ? 'AUTH_REQUIRED' : status === 403 ? 'FORBIDDEN' : 'RESOURCE_NOT_FOUND' } };
    await route.fulfill({ status, contentType: 'application/json', body: JSON.stringify(body) });
  });
  const absent = async locator => { if (await locator.count()) throw new Error('Unexpected element: ' + locator); };
  await page.goto(base + '/analyze');
  await page.getByRole('button', { name: '결과 열기', exact: true }).waitFor();
  await absent(page.getByText('보관 중인 보고서가 없습니다.', { exact: true }));
  await page.getByRole('button', { name: '결과 열기', exact: true }).click();
  await page.getByTestId('hosted-result').waitFor();
  await absent(page.locator('.hosted-result').getByText(/UNSUBSTANTIATED/));
  if (!page.url().endsWith('#run-' + runId)) throw new Error('Run deep link missing');
  await page.reload();
  await page.getByTestId('hosted-result').waitFor();
  await page.getByRole('button', { name: '원문 보기', exact: true }).click();
  await page.getByText(/원문을 볼 권한이 없거나 원문 쪽을 찾을 수 없습니다/).waitFor();
  await absent(page.getByTestId('source-highlight'));
  documentsStatus = 200; runsStatus = 404;
  await page.goto(base + '/analyze');
  await page.getByRole('button', { name: '범위 열기', exact: true }).waitFor();
  await absent(page.getByText('표시할 실행이 없습니다.', { exact: true }));
  documentsStatus = 405;
  await page.goto(base + '/analyze');
  await page.getByText(/현재 서버는 보고서·실행 목록 조회를 지원하지 않습니다/).waitFor();
  await absent(page.getByText('표시할 실행이 없습니다.', { exact: true }));
  runsStatus = 403;
  await page.goto(base + '/analyze');
  await page.getByRole('alert').first().waitFor();
  await absent(page.getByText(/현재 서버는 .* 목록 조회를 지원하지 않습니다/));
  await absent(page.getByRole('button', { name: '입장' }));
  runsStatus = 200; runtimeFailures = 1; attempts = 0;
  await page.goto(base + '/analyze');
  await page.getByText('서버 연결이 잠시 끊겼습니다 — 자동 재시도 중', { exact: true }).waitFor();
  await absent(page.getByRole('button', { name: '입장' }));
  await page.getByRole('button', { name: '결과 열기', exact: true }).waitFor();
  if (attempts !== 2) throw new Error('502 was not retried exactly once');
  sessionStatus = 401;
  await page.goto(base + '/analyze');
  await page.getByRole('button', { name: '입장' }).waitFor();
  if (failures.length) throw new Error(failures.join('; '));
  return { partialRuns: 'passed', partialDocuments: 'passed', legacyLists: 'passed', forbiddenNotFallback: 'passed', reloadResult: 'passed', unknownLabelGuard: 'passed', missingSourceNotHighlighted: 'passed', runtime502Recovery: 'passed', session401: 'passed', browserStorage: 'forbidden', data: 'synthetic GET-only' };
}
