// playwright-cli fixture: GET-only synthetic data, no browser storage or model calls.
async page => {
  const base = new URL(page.url()).origin;
  const capture = new URL(page.url()).searchParams.get('w14Capture') || '';
  const output = '/path/to/ESG_ProofOps/outputs/agent-results/R108-redesign/lab/fix/W14/screenshots';
  const id = '4eae4ebe-707f-40a0-a65d-ede6cd4f9d3c', docId = '22222222-2222-4222-8222-222222222222';
  const errors = [], checks = [];
  const check = (value, message) => { if (!value) throw Error(message); };
  await page.context().addInitScript(() => {
    for (const method of ['getItem', 'setItem', 'removeItem', 'clear']) Storage.prototype[method] = () => { throw Error('Browser storage forbidden'); };
  });
  page.on('pageerror', e => errors.push(e.message));
  let status = 'completed';
  const doc = { document_id: docId, display_name: 'W14 환경 보고서 · 합성 검증', company_name: '검증 기업', page_count: 243, size_bytes: 100, expires: 9999999999, sha256: 'a'.repeat(64), uploaded_at: '2026-10-12T00:00:00Z' };
  const run = () => ({ run_id: id, document_id: docId, status, selected_pages: [84,88,218,219,220,221,224,225,226,229,230,231,233,234,235,236,237,238,239,240,241,242,243], status_url: `/v1/runs/${id}`, result_url: ['completed','partial_blocked'].includes(status) ? `/v1/runs/${id}/result` : null, error_code: status === 'partial_blocked' ? 'R108_NEEDS_REVIEW' : null, created_at: '2026-10-12T00:00:00Z' });
  const result = { schema: 'r108-hosted-result-v1', page_map: [84], reviews: [], hold_reasons: status === 'partial_blocked' ? ['R108_NEEDS_REVIEW'] : [], pipeline: { status, reporting_scope: { report_year: 2024, period_start:'2024-01-01', period_end:'2024-12-31' }, stage_seconds: { parse: 12, tag: 31 } }, claims: [{ claim_id: 'fixture-claim', page_num: 1, original_page_num: 84, quote: '당사는 사업장의 환경 관리 체계를 운영하고 있습니다. (합성 검증 문장)', track: 'management', source_quality: 'unverified', source_refs: [], elements: [{ element_id: 'M1', state: 'unknown', evidence_refs: [] }], decision: null, revision: 1, confirmed_grade: null, hold_reason: 'SOURCE_VALIDATION_REQUIRED', possible_grade_range: null, missing_evidence: [] }] };
  await page.unroute('**/hosted-api/**');
  await page.route('**/hosted-api/**', async route => {
    const request = route.request(), path = new URL(request.url()).pathname.replace('/hosted-api','');
    if (request.method() !== 'GET') { errors.push('Unexpected write'); return route.abort(); }
    let body;
    if (path === '/v1/runtime') body = { live_analysis: true, accept_uploads: true, accept_new_runs: false, limits: { max_upload_bytes: 1048576, max_pdf_pages: 300 }, upload_notice: '합성 검증 · 실제 모델 호출 없음' };
    else if (path === '/v1/session') body = { user_id:'fixture-user', tenant_id:'fixture-tenant', role:'viewer', csrf_token:'', expires_at:'2099-01-01T00:00:00Z' };
    else if (path === '/v1/documents') body = { items: [doc], next_cursor: null };
    else if (path === '/v1/runs') body = { items: [run()], next_cursor: null };
    else if (path === `/v1/documents/${docId}`) body = doc;
    else if (path === `/v1/runs/${id}`) body = run();
    else if (path.endsWith('/result')) body = { ...result, hold_reasons: status === 'partial_blocked' ? ['R108_NEEDS_REVIEW'] : [], pipeline: { ...result.pipeline, status } };
    else return route.fulfill({ status:404, contentType:'application/json', body:'{}' });
    await route.fulfill({ contentType:'application/json', body:JSON.stringify(body) });
  });
  for (const width of [1440,390]) {
    await page.setViewportSize({ width, height: width === 1440 ? 1000 : 844 });
    await page.goto(base + '/analyze');
    await page.getByRole('button',{ name:'결과 열기', exact:true }).click();
    await page.getByTestId('hosted-result').waitFor();
    await page.evaluate(() => document.fonts.ready);
    // Wait for smooth scrolling to put the focused title below the sticky header.
    if (capture !== 'before') await page.waitForFunction(() => {
      const title = document.querySelector('[data-testid="result-heading"]');
      const y = title?.getBoundingClientRect().top;
      return document.activeElement === title && y >= 60 && y < 200;
    });
    else await page.waitForTimeout(700);
    if (capture) {
      await page.screenshot({path:`${output}/${capture}-${width}-opened.png`});
      await page.screenshot({path:`${output}/${capture}-${width}-full.png`,fullPage:true});
    }
    const metrics = await page.getByTestId('document-analysis').evaluate(el => {
      const title = el.querySelector('[data-testid="result-heading"]');
      const style = getComputedStyle(el);
      return { width:innerWidth, overflow:document.documentElement.scrollWidth > innerWidth, surface:style.backgroundColor, focused:!!title && document.activeElement === title, resultTop:title?.getBoundingClientRect().top, summaryClosed:el.querySelector('.hosted-run-summary')?.open === false, cardPadding:[...el.querySelectorAll('.hosted-run-summary, .result-metrics, .result-claims')].map(card => getComputedStyle(card).padding) };
    });
    checks.push(metrics);
    if (capture === 'before') continue;
    check(!metrics.overflow, `${width}: horizontal overflow`);
    check(metrics.surface === 'rgba(0, 0, 0, 0)', `${width}: large white document surface`);
    check(metrics.focused && metrics.resultTop >= 60 && metrics.resultTop < 200, `${width}: result scroll/focus missing`);
    check(metrics.summaryClosed, `${width}: summary not collapsed`);
    check(new Set(metrics.cardPadding).size === 1, `${width}: inconsistent card padding`);
    check(await page.getByRole('button',{name:'분석 시작',exact:true}).count() === 0, 'Completed start button remains');
    check(await page.getByRole('link',{name:'이 분석의 결과 링크'}).count() === 0, 'Empty result line remains');
    await page.getByText('실행 요약',{exact:false}).first().click();
    check((await page.locator('.hosted-run-summary > summary').innerText()).includes('23쪽') && (await page.locator('.hosted-run-summary > summary').innerText()).includes('43초'), 'Summary scope/time missing');
    await page.getByRole('button',{name:'결과 링크 복사',exact:true}).click();
    await page.getByRole('button',{name:'결과 링크 복사됨',exact:true}).waitFor();
    await page.getByText('실행 요약',{exact:false}).first().click();
    await page.getByRole('button',{name:'결과 열기',exact:true}).click();
    await page.waitForFunction(() => document.activeElement?.matches('[data-testid="result-heading"]'));
  }
  if (capture !== 'before') {
    for (const next of ['partial_blocked','failed']) {
      status = next; await page.goto(base + '/analyze');
      await page.getByRole('button',{name:next === 'failed' ? '실행 상태 열기' : '결과 열기',exact:true}).click();
      if (next === 'partial_blocked') { await page.getByTestId('hosted-result').waitFor(); check(await page.getByText('분석 범위의 보류 사유 1건').count() === 1, 'Hold warning hidden'); }
      else { await page.getByTestId('document-status').filter({hasText:'실패'}).waitFor(); check(await page.getByRole('button',{name:'분석 시작',exact:true}).count() === 1, 'Failed retry removed'); }
    }
    check(errors.length === 0, errors.join('; '));
  }
  return { checks, errors, fixture:'synthetic GET-only, browser storage forbidden' };
}
