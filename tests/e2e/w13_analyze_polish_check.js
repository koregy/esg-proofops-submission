// playwright-cli run-code --filename=tests/e2e/w13_analyze_polish_check.js
// Vite preview :4353; fixture JSON server :4354. ?polish=before captures baseline.
// All hosted API calls are intercepted; no real authentication, uploads or models.
async page => {
  const origin = new URL(page.url()).origin;
  const before = new URL(page.url()).searchParams.get('polish') === 'before';
  const prefix = before ? 'before' : 'after';
  const out = '/path/to/ESG_ProofOps/outputs/agent-results/R108-redesign/lab/fix/W13/screenshots';
  const result = await (await fetch('http://127.0.0.1:4354/lg.result.json')).json();
  const docId = '22222222-2222-4222-8222-222222222222';
  const runId = '4eae4ebe-707f-40a0-a65d-ede6cd4f9d3c';
  const doc = { document_id: docId, display_name: '2025 지속가능경영보고서 · 환경 데이터 및 검증 의견서를 포함한 긴 보고서명.pdf', page_count: 150, uploaded_at: '2026-10-12T01:30:00Z', size_bytes: 100, expires: 9999999999, sha256: 'a'.repeat(64) };
  const scope = { revision: 1, reporting_scope: { report_year: 2025, period_start: '2024-01-01', period_end: '2024-12-31', origin: 'detected' }, selection: { pages: [22,23,100], claim_pages: [22,23], selection_sha256: 'a'.repeat(64) }, plan: { status: 'ready', selected_claim_pages: [22,23], selected_evidence_pages: [22,23,100], failure_reasons: [], unreadable_pages: [24], unknown_pages: [25], conflict_pages: [26], pages: [
    { page: 22, category: 'e_narrative', reasons: ['readable_environmental_body'], snippet: '' },
    { page: 23, category: 'environmental_data', reasons: ['claim_extraction_candidate'], snippet: '' },
    { page: 24, category: 'unreadable', reasons: ['native_text_missing_or_unusable'], snippet: '' },
    { page: 25, category: 'unknown', reasons: ['source_role_unresolved'], snippet: '' },
    { page: 26, category: 'conflict', reasons: ['section_boundaries_disagree'], snippet: '' },
    { page: 100, category: 'assurance', reasons: ['evidence_search_only'], snippet: '' }
  ] } };
  let loggedIn = false, inventory = 'empty', status = 'running', writes = 0;
  const checks = [], contrasts = [], errors = [];
  const assert = (value, message) => { if (!value) throw Error(message); };
  page.on('pageerror', error => errors.push(error.message));
  await page.context().addInitScript(() => {
    for (const method of ['getItem', 'setItem', 'removeItem', 'clear']) Storage.prototype[method] = () => { throw Error('Browser storage forbidden'); };
  });
  await page.emulateMedia({ reducedMotion: 'reduce' });
  await page.unroute('**/hosted-api/v1/runs/**');
  await page.unroute('**/hosted-api/**');
  await page.route('**/hosted-api/**', async route => {
    const request = route.request(), p = new URL(request.url()).pathname;
    const run = { run_id: runId, document_id: docId, status, selected_pages: [22,23], stage: 'tag', progress: .65, claims_extracted: 12, claims_processed: 8, status_url: `/v1/runs/${runId}`, created_at: '2026-10-12T01:40:00Z', error_code: status === 'failed' ? 'PROCESSING_UNCERTAIN' : null, ...(status === 'completed' ? { result_url: `/v1/runs/${runId}/result` } : {}) };
    let code = 200, body;
    if (request.method() !== 'GET') writes++;
    if (p.endsWith('/runtime')) body = { live_analysis: true, accept_uploads: true, accept_new_runs: true, pipeline_profile: 'finals-unattended-v2', limits: { max_upload_bytes: 10485760, max_pdf_pages: 200 }, upload_notice: '화면 검증용 fixture · 업로드 파일은 실제 서버로 전송되지 않습니다.' };
    else if (p.endsWith('/auth/invitation')) { loggedIn = true; body = { user_id: 'fixture-user', tenant_id: 'fixture-tenant', role: 'viewer', csrf_token: '', expires_at: '2099-01-01' }; }
    else if (p.endsWith('/auth/logout')) { loggedIn = false; body = {}; }
    else if (p.endsWith('/session')) { code = loggedIn ? 200 : 401; body = loggedIn ? { user_id: 'fixture-user', tenant_id: 'fixture-tenant', role: 'viewer', csrf_token: '', expires_at: '2099-01-01' } : { error: { code: 'AUTH_REQUIRED' } }; }
    else if (p.endsWith('/documents')) body = request.method() === 'POST' ? doc : { items: inventory === 'empty' ? [] : [doc], next_cursor: null };
    else if (p.endsWith('/scope-plan/selection')) body = scope;
    else if (p.endsWith('/scope-plan')) body = scope;
    else if (p.endsWith('/runs')) body = request.method() === 'POST' ? run : { items: inventory === 'empty' ? [] : [run, {...run, run_id: '33333333-3333-4333-8333-333333333333', status: 'accounting_pending', progress: null}, {...run, run_id: '44444444-4444-4444-8444-444444444444', status: 'failed', progress: null}], next_cursor: null };
    else if (p.endsWith('/result')) body = result;
    else if (p.endsWith(`/documents/${docId}`)) body = doc;
    else if (/\/runs\/[^/]+$/.test(p)) body = run;
    else { code = 404; body = { error: { code: 'SOURCE_UNAVAILABLE' } }; }
    await route.fulfill({ status: code, contentType: 'application/json', body: JSON.stringify(body) });
  });
  const capture = async (view, width, target) => {
    const sizes = await page.evaluate(() => ({ width: innerWidth, scroll: document.documentElement.scrollWidth }));
    assert(sizes.scroll <= sizes.width, `${view}-${width}: horizontal overflow`);
    await page.evaluate(() => document.fonts.ready);
    if (target) await target.evaluate(el => window.scrollTo({top:Math.max(0,el.getBoundingClientRect().top+window.scrollY-88),behavior:'instant'}));
    else await page.evaluate(() => window.scrollTo({top:0, behavior:'instant'}));
    await page.evaluate(() => new Promise(resolve => requestAnimationFrame(() => requestAnimationFrame(resolve))));
    await page.screenshot({ path: `${out}/${prefix}-${view}-${width}.png`, fullPage: !target });
    checks.push({ view, ...sizes });
  };
  for (const width of [1440,390]) {
    await page.setViewportSize({ width, height: width === 1440 ? 1000 : 844 });
    loggedIn = false; inventory = 'empty'; status = 'running';
    await page.goto(origin + '/analyze');
    await page.getByLabel('초대 코드 또는 접근 비밀번호', { exact: true }).waitFor();
    await capture('login', width);
  await page.getByRole('combobox', {name:'로그인 방식', exact: true }).selectOption('invitation');
    await page.getByLabel('초대 코드 또는 접근 비밀번호', { exact: true }).fill('x'.repeat(32));
    await page.getByRole('button', { name: '입장', exact: true }).click();
    await page.getByText('보관 중인 보고서가 없습니다.', { exact: true }).waitFor();
    await capture('empty-upload', width);
    inventory = 'filled';
    await page.getByRole('button', { name: '목록 새로고침' }).click();
    await page.getByRole('button', { name: '범위 열기' }).waitFor();
    await capture('inventory', width);
    if (!before) {
      assert(await page.locator('.hosted-inventory time').count() === 4, 'Upload/execution timestamps missing');
      assert(await page.locator('.hosted-lookup button').evaluate(el => getComputedStyle(el).borderRadius === '8px'), 'Lookup button differs from shared button shape');
      const logout = page.getByRole('button', {name: '로그아웃'});
      assert((await logout.boundingBox()).height >= 44, 'Logout touch target below 44px');
      await page.keyboard.press('Tab');
      await logout.focus();
      assert(await logout.evaluate(el => getComputedStyle(el).outlineStyle !== 'none'), 'Keyboard focus invisible');
    }
    await page.getByLabel('PDF 보고서', { exact: true }).setInputFiles({ name: 'fixture-report.pdf', mimeType: 'application/pdf', buffer: Buffer.from('%PDF-1.4\nfixture only') });
    if (!before) {
      const contrast = await page.locator('.hosted-primary:not(:disabled), .hosted-secondary:not(:disabled), .hosted-state, .hosted-note').evaluateAll(elements => {
        const rgb = color => color.match(/[\d.]+/g).map(Number);
        const luminance = color => rgb(color).slice(0,3).map(value => { const channel=value/255; return channel<=.04045 ? channel/12.92 : ((channel+.055)/1.055)**2.4; }).reduce((sum,channel,index)=>sum+channel*[.2126,.7152,.0722][index],0);
        return elements.map(el => {
          let ancestor=el, background;
          while(ancestor) { background=getComputedStyle(ancestor).backgroundColor; const color=rgb(background); if(color.length===3 || color[3]===1) break; ancestor=ancestor.parentElement; }
          const text=luminance(getComputedStyle(el).color), bg=luminance(background || 'rgb(255,255,255)');
          return (Math.max(text,bg)+.05)/(Math.min(text,bg)+.05);
        });
      });
      assert(contrast.every(ratio => ratio >= 4.5), 'Enabled controls/status/note contrast below 4.5:1');
      contrasts.push({ width, minimum: Math.min(...contrast), elements: contrast.length });
    }
    await page.getByRole('button', { name: '업로드', exact: true }).click();
    const document = page.getByTestId('document-analysis');
    await document.getByLabel('주장 쪽 번호', { exact: true }).waitFor();
    await document.getByText('쪽별 분류와 선택 이유', { exact: true }).click();
    await capture('scope', width);
    assert(await document.innerText().then(text => text.includes('판독 불가') && text.includes('분류 미확인') && text.includes('분류 충돌')), 'Scope uncertainty lost');
    await document.getByRole('button', { name: '범위 수정 저장' }).click();
    await document.getByRole('button', { name: '분석 시작', exact: true }).click();
    await document.getByRole('progressbar').waitFor();
    await capture('progress', width);
    assert(await document.getByRole('button', { name: '분석 시작', exact: true }).isDisabled(), 'Duplicate analysis start enabled');
    status = 'completed';
    const resultView = page.getByTestId('hosted-result');
    await resultView.waitFor({ timeout: 15000 });
    await capture('result-flow', width);
    await capture('result-controls', width, resultView.locator('.result-browser-controls'));
    if (!before) assert(await resultView.getByRole('combobox', {name:'트랙', exact:true}).evaluate(el => getComputedStyle(el).backgroundImage !== 'none'), 'Filter select indicator lost');
    const tab = resultView.getByRole('tab', { name: /^잠정/ });
    await tab.click(); await tab.press('ArrowRight');
    assert(await resultView.getByRole('tab', {name: /^보류/}).getAttribute('aria-selected') === 'true', 'Keyboard tabs broken');
    await resultView.getByRole('textbox', {name: '검색'}).fill('no-match-w13');
    assert(await resultView.locator('.claim-list > .claim-item').count() === 0, 'Search filter stale');
    await resultView.getByRole('textbox', {name: '검색'}).fill('');
    await resultView.locator('.claim-list > .claim-item').first().click();
    const detail = resultView.getByRole('complementary', {name: '주장 상세'});
    await detail.waitFor({state: 'visible'});
    await capture('result-detail', width, detail);
    for (const text of await detail.locator('.element-state.unknown').allTextContents()) assert(!text.includes('근거 없음'), 'Unknown became absence');
    if (width === 390) await detail.getByRole('button', {name:'목록으로 돌아가기'}).click();
    status = 'failed';
    await page.goto(origin + `/analyze?case=failed#run-${runId}`);
    await page.getByTestId('document-status').filter({hasText:'실패'}).waitFor();
    await capture('failed', width);
    if (width === 390) {
      await page.getByRole('button', {name:'메뉴', exact:true}).click();
      await page.getByRole('navigation', {name:'주요 메뉴'}).waitFor({state:'visible'});
      await capture('mobile-menu', width);
    }
  }
  assert(errors.length === 0, 'Browser errors: ' + errors.join('; '));
  return { status: 'passed', phase: prefix, checks, apiWrites: 'synthetic intercepted requests only: '+writes, modelCalls: 0, contrasts, browserStorage: 'blocked', pageErrors: errors.length };
}
