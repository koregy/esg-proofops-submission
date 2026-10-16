async page => {
  const base = page.url().startsWith('https://esg-proofops-') ? new URL(page.url()).origin : 'http://127.0.0.1:5237';
  const url = page.url();
  const runId = new URL(url).hash.slice(5);
  if (!/^[0-9a-f-]{36}$/.test(runId)) throw new Error('Run the real fixture test first');
  await page.unroute('**/source-pages/*/image?**');
  const publicReads = [];
  await page.route('**/hosted-api/v1/documents?**', async route => {
    const response = await page.request.get(`https://esg-proofops.vercel.app/hosted-api/v1/documents${new URL(route.request().url()).search}`);
    publicReads.push({ resource:'documents', status:response.status() });
    if (![404,405].includes(response.status())) throw new Error('Expected actual old collection response');
    await route.fulfill({ status:response.status(), contentType:'application/json', body:await response.text() });
  });
  await page.route('**/hosted-api/v1/runs?**', async route => {
    const response = await page.request.get(`https://esg-proofops.vercel.app/hosted-api/v1/runs${new URL(route.request().url()).search}`);
    publicReads.push({ resource:'runs', status:response.status() });
    if (![404,405].includes(response.status())) throw new Error('Expected actual old collection response');
    await route.fulfill({ status:response.status(), contentType:'application/json', body:await response.text() });
  });
  await page.goto(`${base}/analyze#run-${runId}`);
  await page.reload();
  await page.getByText('현재 서버는 목록 조회를 지원하지 않습니다. 이 브라우저의 기록과 기존 결과 링크를 사용할 수 있습니다.', {exact:true}).waitFor();
  const result = page.getByTestId('hosted-result'); await result.waitFor();
  await page.getByText(/이 브라우저의 문서·분석 기록/).click();
  if (!await page.getByRole('link', {name:/분석 .* 열기/}).count()) throw new Error('Browser history fallback missing');
  const viewer = result.getByRole('region',{name:'원문 쪽 보기'});
  await page.route('**/source-pages/*/manifest?**', async route => {
    const response = await route.fetch(); const manifest = await response.json();
    manifest.unresolved_refs = manifest.highlights.map(ref => ({...ref,message:'원문 미검증'})); manifest.highlights=[]; manifest.message='원문 미검증';
    await route.fulfill({response,json:manifest});
  });
  await viewer.getByRole('button',{name:'원문 보기',exact:true}).click();
  await viewer.getByRole('img').waitFor();
  await viewer.getByText('원문 미검증 · 확인되지 않은 위치에는 박스를 표시하지 않습니다.',{exact:true}).waitFor();
  if (await viewer.getByTestId('source-highlight').count()) throw new Error('Unverified ref was highlighted');
  await viewer.getByRole('button',{name:'원문 닫기',exact:true}).click();
  await page.unroute('**/source-pages/*/manifest?**');
  await page.route('**/source-pages/*/manifest?**', route => route.fulfill({status:410,contentType:'application/json',body:JSON.stringify({error:{code:'SOURCE_EXPIRED'}})}));
  await viewer.getByRole('button',{name:'원문 보기',exact:true}).click();
  await viewer.getByText('원문 보관 기간이 만료되었습니다. 원문을 다시 업로드해야 볼 수 있습니다.',{exact:true}).waitFor();
  if (await viewer.getByRole('img').count()) throw new Error('Expired image remains visible');
  await page.unroute('**/source-pages/*/manifest?**');
  let actualMissingStatus;
  await page.route('**/source-pages/*/manifest?**', async route => {
    const response = await page.request.get('https://esg-proofops.vercel.app/hosted-api'+new URL(route.request().url()).pathname.replace('/hosted-api',''));
    actualMissingStatus=response.status(); if (actualMissingStatus!==404) throw new Error('Expected old source API404');
    await route.fulfill({status:404,contentType:'application/json',body:await response.text()});
  });
  await viewer.getByRole('button',{name:'원문 다시 불러오기'}).click();
  await viewer.getByText('원문을 볼 권한이 없거나 원문 쪽을 찾을 수 없습니다. 구버전 서버에서는 원문 보기를 지원하지 않을 수 있습니다.',{exact:true}).waitFor();
  return {status:'passed',public_old_collection_reads:publicReads,public_old_source_status:actualMissingStatus,browser_history_fallback:true,existing_hash_restored:true,unverified_ref_unhighlighted:true,simulated_expiry410:true,expiry_image_cleared:true,real_uploads:0,real_analyses:0};
}
