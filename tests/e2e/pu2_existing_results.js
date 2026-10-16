async page => {
  const base = page.url().startsWith('http') ? new URL(page.url()).origin : 'http://127.0.0.1:5207';
  const id = 'a091ed1e-653c-4e29-9494-cd32cd912358';
  await page.goto(`${base}/analyze#run-${id}`);
  await page.getByTestId('hosted-result').waitFor({ timeout: 30000 });
  const claims = await page.getByRole('region', { name: '분석 결과' }).getByRole('button').filter({ has: page.locator('.claim-item-top') }).count();
  if (claims !== 46) throw new Error(`Expected existing 46 claims, got ${claims}`);
  await page.reload();
  await page.getByTestId('hosted-result').waitFor({ timeout: 30000 });
  await page.setViewportSize({ width: 390, height: 844 });
  const result = page.getByTestId('hosted-result');
  await result.locator('.claim-list .claim-item').nth(2).click();
  await page.waitForTimeout(650);
  const detail = result.locator('.claim-detail');
  if (!await detail.evaluate(element => document.activeElement === element)) throw new Error('Mobile detail not focused');
  if ((await detail.boundingBox()).y > 160) throw new Error('Mobile detail did not scroll into view');
  await detail.getByRole('button', { name: '목록으로 돌아가기' }).click();
  await page.waitForTimeout(650);
  if (!await result.locator('.claim-list').evaluate(element => document.activeElement === element)) throw new Error('List focus not restored');
  if (await page.evaluate(() => document.documentElement.scrollWidth > innerWidth)) throw new Error('Mobile overflow');
  return { status: 'passed', existing_run: id, claims, hash_reload: true, mobile_detail_focus_scroll: true, list_return: true, real_pdf_uploads: 0, real_analyses: 0 };
}
