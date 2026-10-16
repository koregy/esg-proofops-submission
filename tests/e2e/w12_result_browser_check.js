// Run via playwright-cli run-code --filename. API responses replay E4 server JSON;
// no model calls or authenticated backend writes. Fixtures are not public app assets.
async page => {
  const out = '/path/to/ESG_ProofOps/outputs/agent-results/R108-redesign/lab/fix/W12/screenshots';
  const origin = new URL(page.url()).origin;
  // A localhost fixture-only HTTP server supplies test data to the CLI sandbox.
  const samples = Object.fromEntries(await Promise.all(['lg', 'kakao'].map(async name => [name, await (await fetch(`http://127.0.0.1:4184/${name}.result.json`)).json()])));
  const runId = '4eae4ebe-707f-40a0-a65d-ede6cd4f9d3c', documentId = '22222222-2222-4222-8222-222222222222';
  let sample = 'lg', sourceReads = [], writes = 0;
  const checks = [];
  await page.context().addInitScript(() => {
    for (const method of ['getItem', 'setItem', 'removeItem', 'clear']) Storage.prototype[method] = () => { throw new Error('Browser storage forbidden'); };
  });
  await page.emulateMedia({ reducedMotion: 'reduce' });
  await page.route('**/hosted-api/**', async route => {
    const request = route.request(), p = new URL(request.url()).pathname;
    if (request.method() !== 'GET') { writes++; return route.abort(); }
    const document = { document_id: documentId, display_name: `${sample.toUpperCase()} · E4 저장 서버 결과 재생`, page_count: 150, size_bytes: 100, expires: 9999999999, sha256: 'a'.repeat(64) };
    const run = { run_id: runId, document_id: documentId, status: 'completed', selected_pages: samples[sample].page_map, status_url: `/v1/runs/${runId}`, result_url: `/v1/runs/${runId}/result`, error_code: null };
    let status = 200, body;
    if (p.endsWith('/runtime')) body = { live_analysis: true, accept_uploads: true, accept_new_runs: false, limits: { max_upload_bytes: 1048576, max_pdf_pages: 200 }, upload_notice: 'E4 실제 서버 결과 재생 · 새 모델 호출 없음' };
    else if (p.endsWith('/session')) body = { user_id: 'fixture-user', tenant_id: 'fixture-tenant', role: 'viewer', csrf_token: '', expires_at: '2099-01-01' };
    else if (p.endsWith('/documents')) body = { items: [document], next_cursor: null };
    else if (p.endsWith('/runs')) body = { items: [run], next_cursor: null };
    else if (p === `/hosted-api/v1/documents/${documentId}`) body = document;
    else if (p.endsWith('/result')) body = samples[sample];
    else if (p === `/hosted-api/v1/runs/${runId}`) body = run;
    else if (/source-pages\//.test(p)) { sourceReads.push(p); status = 404; body = { error: { code: 'SOURCE_UNAVAILABLE' } }; }
    else { status = 404; body = {}; }
    await route.fulfill({ status, contentType: 'application/json', body: JSON.stringify(body) });
  });
  const assert = (condition, message) => { if (!condition) throw new Error(message); };
  const overflow = async label => {
    const sizes = await page.evaluate(() => ({ width: innerWidth, scroll: document.documentElement.scrollWidth }));
    assert(sizes.scroll <= sizes.width, `${label}: horizontal overflow ${JSON.stringify(sizes)}`);
    checks.push({ view: label, ...sizes });
  };
  const result = page.getByTestId('hosted-result');
  const detail = result.getByRole('complementary', { name: '주장 상세' });
  const rows = result.locator('.claim-list > .claim-item');
  const screenshot = async (name, target) => { await target.evaluate(el => window.scrollTo({ top: Math.max(0, el.getBoundingClientRect().top + window.scrollY - 84), behavior: "instant" })); await page.screenshot({ path: `${out}/${name}.png` }); };
  for (const width of [1440, 390]) {
    await page.setViewportSize({ width, height: width === 1440 ? 1000 : 844 });
    await page.goto(origin + '/demo');
    const cases = page.locator('#claims');
    await cases.getByRole('tab', { name: /확정/ }).waitFor();
    await screenshot(`saved-naver-${width}`, cases.getByRole('heading', { name: '문장별 결과' }));
    await overflow(`saved-${width}`);
    if (width === 390) {
      await cases.locator('.claim-item').first().click();
      const savedDetail = page.getByRole('complementary', { name: '주장 상세' });
      await screenshot(`saved-naver-detail-${width}`, savedDetail);
      await savedDetail.getByRole('link', { name: '목록으로 돌아가기' }).click();
    }
    for (const name of ['lg', 'kakao']) {
      sample = name;
      await page.goto(origin + `/runs/${runId}/result`);
      await result.waitFor();
      await result.getByRole('heading', { name: '문장별 결과' }).waitFor();
      await overflow(`${name}-summary-${width}`);
      assert(await result.locator('.result-metrics').innerText().then(text => /확정 등급\s*0/.test(text)), 'Sample acquired confirmed counts');
      assert(await result.getByRole('tab', { name: /^확정/ }).count() === 0, 'Empty final tab misleading');
      await screenshot(`${name}-summary-${width}`, result.locator('.result-heading'));
      await screenshot(`${name}-list-${width}`, result.getByRole('heading', { name: '문장별 결과' }));
      assert(await rows.count() <= 25, 'Initial page exceeded pagination limit');
      const more = result.getByRole('button', { name: /^더 보기/ });
      if (await more.count()) { await more.click(); assert(await rows.count() > 25, 'More did not expose remaining claims'); }
      if (width === 390) assert(!(await detail.isVisible()), 'Mobile detail appeared before selection');
      const tab = result.getByRole('tab', { name: /^잠정/ });
      await tab.click();
      await tab.press('ArrowRight');
      assert(await result.getByRole('tab', { name: /^보류/ }).getAttribute('aria-selected') === 'true', 'ArrowRight tab navigation failed');
      await result.getByRole('tab', { name: /^보류/ }).press('ArrowLeft');
      const quote = await rows.first().locator('.claim-quote').innerText();
      const search = result.getByRole('textbox', { name: '검색' });
      await search.fill(quote);
      assert(await rows.count() > 0, 'Exact claim search lost row');
      await search.fill('no-such-claim-w12');
      assert(await rows.count() === 0, 'Search empty state kept stale rows');
      await search.fill('');
      await result.getByRole('combobox', { name: '트랙', exact: true }).selectOption('goal');
      for (const text of await rows.allTextContents()) assert(text.includes('목표'), 'Track filter mixed tracks');
      await result.getByRole('combobox', { name: '트랙', exact: true }).selectOption('all');
      await result.getByRole('combobox', { name: '등급', exact: true }).selectOption('E1');
      for (const text of await rows.allTextContents()) assert(text.includes('잠정 E1'), 'Grade filter interpreted range as grade');
      await result.getByRole('combobox', { name: '등급', exact: true }).selectOption('all');
      await result.getByRole('combobox', { name: '상태', exact: true }).selectOption('hold');
      assert(await rows.count() === 0, 'Status filter did not intersect active provisional tab');
      await result.getByRole('tab', { name: /^전체/ }).click();
      assert(await result.getByRole('combobox', { name: '상태', exact: true }).inputValue() === 'all', 'Tab left impossible filters');
      await result.getByRole('tab', { name: /^잠정/ }).click();
      await rows.first().click();
      await detail.waitFor({ state: 'visible' });
      assert(await detail.locator('.element-table').count() === 1, 'Duplicate element tables');
      assert(await detail.innerText().then(text => text.includes('확정 등급 아님')), 'Provisional label missing');
      assert(!/SUBSTANTIATED|INCOMPLETE|UNSUBSTANTIATED/.test(await detail.innerText()), 'Final label leaked');
      await overflow(`${name}-detail-${width}`);
      await screenshot(`${name}-detail-${width}`, detail);
      await detail.locator('.result-elements').scrollIntoViewIfNeeded();
      await screenshot(`${name}-evidence-${width}`, detail.locator('.result-elements'));
      await overflow(`${name}-evidence-${width}`);
      if (width === 390) {
        assert(!(await result.locator('.claim-list').isVisible()), 'Mobile list stayed visible in detail mode');
        await detail.getByRole('button', { name: '목록으로 돌아가기' }).click();
        assert(await result.locator('.claim-list').isVisible(), 'Mobile back did not restore list');
        assert(!(await detail.isVisible()), 'Mobile back left detail visible');
      }
      await result.getByRole('tab', { name: /^보류/ }).click();
      await rows.first().click();
      await detail.waitFor({ state: 'visible' });
      assert(await detail.getByTestId('grade-panel').innerText().then(text => text.includes('판정 보류')), 'Hold became numeric grade');
      const unknown = detail.locator('.element-state.unknown');
      for (const text of await unknown.allTextContents()) assert(!text.includes('근거 없음'), 'Unknown became absent');
      await screenshot(`${name}-hold-${width}`, detail);
      await overflow(`${name}-hold-${width}`);
      if (width === 390) await detail.getByRole('button', { name: '목록으로 돌아가기' }).click();
      if (name === 'lg' && width === 1440) {
        await result.getByRole('tab', { name: /^잠정/ }).click();
        await rows.first().click();
        const source = detail.getByRole('region', { name: '원문 쪽 보기' });
        const originalPage = await source.getByRole('combobox', { name: '원문 쪽' }).inputValue();
        await source.getByRole('button', { name: '원문 보기', exact: true }).click();
        await source.getByRole('alert').waitFor();
        assert(sourceReads.some(p => p.endsWith(`/source-pages/${originalPage}/manifest`)), 'Source viewer lost original page mapping');
        assert(!/근거 없음/.test(await source.getByRole('alert').innerText()), 'Source error became absence');
      }
    }
  }
  // Safe rendering of untrusted PDF quote; no source text becomes DOM markup.
  sample = 'lg';
  const originalQuote = samples.lg.claims[0].quote;
  samples.lg.claims[0].quote = '<img src=x onerror=alert(1)>W12 untrusted quote';
  await page.goto(origin + `/runs/${runId}/result`); await result.waitFor();
  assert(await rows.first().innerText().then(text => text.includes('<img')), 'Quote escaped content missing');
  assert(await result.locator('img[src="x"]').count() === 0, 'Untrusted quote executed as markup');
  samples.lg.claims[0].quote = originalQuote;
  assert(writes === 0, 'Browser check wrote to API');
  return { status: 'passed', fixtures: { lg: 98, kakao: 109 }, checks, search: 'passed', trackGradeStatusIntersection: 'passed', keyboardTabs: 'passed', mobileRoundTrip: 'passed', sourcePageMapping: 'passed', sourceFailure: 'preserved', escapedQuote: 'passed', browserStorage: 'forbidden', apiWrites: writes, newModelCalls: 0 };
}
