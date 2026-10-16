async page => {
  const base = page.url().startsWith('http') ? new URL(page.url()).origin : 'http://127.0.0.1:5207';
  const documentId = '11111111-1111-4111-8111-111111111111';
  const runId = '22222222-2222-4222-8222-222222222222';
  let runtimeReads = 0; let runReads = 0; let writes = 0;
  const scope = { revision: 1, reporting_scope: { report_year: 2025, period_start: '2024-01-01', period_end: '2024-12-31', origin: 'detected' },
    plan: { status: 'candidate_only', selected_claim_pages: [1], selected_evidence_pages: [1,2], failure_reasons: [],
      pages: Array.from({ length: 139 }, (_, i) => ({ page: i+1, category: ['unknown','conflict','unreadable','e_narrative'][i%4], reasons: [i ? 'excluded_by_declared_cap' : 'candidate_only'] })) },
    selection: { selection_sha256: 'a'.repeat(64), pages: [1,2], claim_pages: [1] } };
  const result = { schema: 'r108-hosted-result-v1', page_map: [1,2], reviews: [], hold_reasons: [], pipeline: { status: 'completed' },
    claims: [{ claim_id: 'held', page_num: 1, quote: '모의 판정 보류 문장', source_refs: [], source_quality: 'unverified', elements: [], missing_evidence: [], confirmed_grade: 'E0',
      decision: { decision_status: 'blocked_evidence', evidence_grade: 'E0', label: 'UNSUBSTANTIATED' }, possible_grade_range: { floor: 'E0', ceiling: 'E3', open_elements: ['P3'] } }] };
  await page.addInitScript(({ documentId }) => { if (!localStorage.getItem('proofops-intake-v1:mock-user:mock-tenant')) localStorage.setItem('proofops-intake-v1:mock-user:mock-tenant', JSON.stringify({ schema: 1, entries: [{ documentId, name: 'mock-report.pdf', seenAt: Date.now() }] })); }, { documentId });
  await page.route('**/hosted-api/**', async route => {
    const request = route.request(); const path = new URL(request.url()).pathname.replace('/hosted-api','');
    if (request.method() !== 'GET') { writes++; throw new Error('Recovery must issue GET only'); }
    let body; let status = 200;
    if (path === '/v1/runtime') { if (++runtimeReads <= 2) { status = 502; body = { error: { code: 'DEPENDENCY_UNAVAILABLE' } }; }
      else body = { accept_uploads: true, accept_new_runs: true, live_analysis: true, pipeline_profile: 'finals-unattended-v2', upload_notice: '모의 보고서', limits: { max_upload_bytes: 150*1048576, max_pdf_pages: 300 } }; }
    else if (path === '/v1/session') body = { user_id: 'mock-user', tenant_id: 'mock-tenant', role: 'viewer', csrf_token: 'synthetic' };
    else if (path === `/v1/documents/${documentId}`) body = { document_id: documentId, page_count: 139, sha256: 'a'.repeat(64) };
    else if (path.endsWith('/scope-plan')) body = scope;
    else if (path === `/v1/runs/${runId}`) {
      runReads++;
      if (runReads === 2) { status = 503; body = { error: { code: 'DEPENDENCY_UNAVAILABLE' } }; }
      else body = { run_id: runId, document_id: documentId, selected_pages: [1,2], status_url: `/v1/runs/${runId}`, status: runReads > 2 ? 'completed' : 'running', stage: 'parse', progress: .15, result: runReads > 2 ? result : null };
    } else throw new Error(`Unexpected GET ${path}`);
    await route.fulfill({ status, contentType: 'application/json', body: JSON.stringify(body) });
  });
  await page.goto(`${base}/analyze`);
  await page.getByText('서버 연결이 잠시 끊겼습니다 — 자동 재시도 중', { exact: true }).waitFor();
  if (await page.getByLabel('초대 코드 또는 접근 비밀번호', { exact: true }).count()) throw new Error('Transient error became login');
  await page.getByRole('heading', { name: 'mock-report.pdf', exact: true }).waitFor();
  const card = page.getByTestId('document-analysis');
  await card.getByRole('button', { name: '분석 시작', exact: true }).waitFor();
  if (await card.getByText('쪽별 분류와 선택 이유', { exact: true }).evaluate(el => el.parentElement.open)) throw new Error('Scope table defaults open');
  const startBox = await card.getByRole('button', { name: '분석 시작', exact: true }).boundingBox();
  const summaryBox = await card.getByText('분석 범위와 보고기간', { exact: true }).boundingBox();
  if (startBox.y >= summaryBox.y) throw new Error('Start remains below scope editor');
  await card.getByText('쪽별 분류와 선택 이유', { exact: true }).click();
  const text = await card.innerText();
  if (/candidate_only|excluded_by_declared_cap|QI2|v1 ·|v2 ·/.test(text)) throw new Error('Internal scope/profile terms remain');
  for (const state of ['분류 미확인','분류 충돌','판독 불가']) if (!text.includes(state)) throw new Error(`State lost: ${state}`);
  await page.getByLabel('기존 분석 번호', { exact: true }).fill(runId);
  await page.getByRole('button', { name: '기존 결과 열기', exact: true }).click();
  await page.getByTestId('hosted-result').waitFor({ timeout: 15000 });
  if (/UNSUBSTANTIATED/.test(await page.getByTestId('hosted-result').innerText())) throw new Error('Held label visible');
  if (!page.url().endsWith(`#run-${runId}`)) throw new Error('Missing bare result URL');
  await page.reload();
  await page.getByTestId('hosted-result').waitFor({ timeout: 15000 });
  if (writes) throw new Error('Resume submitted a write');
  return { status: 'passed', initial_502_retry_without_login: true, run_503_retry: runReads >= 3, scope_table_collapsed: true, start_above_editor: true, human_scope_terms: true,
    unknown_conflict_unreadable_distinct: true, held_final_label_suppressed: true, hash_history_reload: true, application_writes: writes };
}
