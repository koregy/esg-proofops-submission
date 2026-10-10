async page => {
  const base = page.url().startsWith('http') ? new URL(page.url()).origin : 'http://127.0.0.1:5207';
  await page.goto(`${base}/`);
  await page.getByRole('region', { name: 'PDF 업로드 안내' }).waitFor();
  if (await page.getByLabel('분석 요청', { exact: true }).count()) throw new Error('Discarded prompt remains');
  if (/재무제표|그린워싱으로 판별/.test(await page.locator('.hero').textContent())) throw new Error('Out-of-scope examples remain');
  await page.goto(`${base}/demo`);
  const tabs = page.getByRole('tab');
  await tabs.first().waitFor();
  await tabs.first().focus(); await page.keyboard.press('ArrowRight');
  if (await tabs.nth(1).getAttribute('aria-selected') !== 'true' || !await tabs.nth(1).evaluate(el => el === document.activeElement)) throw new Error('Arrow tab activation failed');
  await page.keyboard.press('End');
  if (await tabs.last().getAttribute('aria-selected') !== 'true') throw new Error('End key failed');
  await page.keyboard.press('Home');
  if (await tabs.first().getAttribute('aria-selected') !== 'true') throw new Error('Home key failed');
  await tabs.filter({ hasText: '원문 대조 필요' }).click();
  await page.setViewportSize({ width: 390, height: 844 });
  await page.locator('.claim-list .claim-item').first().click();
  await page.waitForTimeout(650);
  const detail = page.getByRole('complementary', { name: '주장 상세' });
  if (!await detail.evaluate(el => el === document.activeElement) || (await detail.boundingBox()).y > 160) throw new Error('Saved mobile detail focus/scroll failed');
  if (/UNSUBSTANTIATED|SUBSTANTIATED|INCOMPLETE/.test(await detail.locator('.decision-panel').textContent())) throw new Error('Held final label remains');
  if (!(await detail.locator('.decision-panel').textContent()).includes('판정 보류')) throw new Error('Held state missing');
  const contrast = await page.evaluate(() => {
    const root = getComputedStyle(document.documentElement);
    const hex = x => x.match(/[0-9a-f]{2}/gi).map(v => parseInt(v, 16) / 255).map(v => v <= .04045 ? v / 12.92 : ((v + .055) / 1.055) ** 2.4);
    const l = x => { const [r,g,b] = hex(x); return .2126*r + .7152*g + .0722*b; };
    const muted = l(root.getPropertyValue('--muted'));
    return ['--paper','--bg','--bg-2'].map(name => ({ background: name, ratio: (l(root.getPropertyValue(name)) + .05)/(muted + .05) }));
  });
  if (contrast.some(row => row.ratio < 4.5)) throw new Error('Muted contrast under 4.5');
  await detail.getByRole('link', { name: '목록으로 돌아가기' }).click();
  await page.waitForTimeout(650);
  if (!await page.locator('.claim-list').evaluate(el => el === document.activeElement)) throw new Error('Saved list focus failed');
  return { status: 'passed', home_scope: true, arrow_home_end_tabs: true, held_label_suppressed: true, saved_mobile_focus: true, list_return: true, contrast };
}
