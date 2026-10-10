// Invoke on a fresh browser page after navigating to the desired origin.
// Reads only /v1/runtime and /v1/session through the real public hosted API.
async page => {
  const base = page.url().startsWith('http') ? new URL(page.url()).origin : 'http://127.0.0.1:5207';
  const requests = []; let runtime; let sessionStatus;
  await page.route('**/hosted-api/**', async route => {
    const request = route.request();
    if (request.method() !== 'GET') throw new Error(`Forbidden real API mutation: ${request.method()}`);
    const path = new URL(request.url()).pathname;
    if (!path.endsWith('/v1/runtime') && !path.endsWith('/v1/session')) throw new Error(`Unexpected real API path: ${path}`);
    const response = await route.fetch();
    requests.push({ method: request.method(), path, status: response.status() });
    if (path.endsWith('/v1/runtime')) runtime = await response.json();
    else sessionStatus = response.status();
    await route.fulfill({ response });
  });
  await page.goto(`${base}/analyze`);
  await page.getByLabel('초대 코드', { exact: true }).waitFor();
  if (!runtime || runtime.analysis_backend !== 'r108' || sessionStatus !== 401) throw new Error('Real hosted runtime/session not verified');
  if (!requests.every(request => request.method === 'GET')) throw new Error('Real API write occurred');
  const outcome = { status: 'passed', origin: base, login_visible: true, requests,
    runtime: { pipeline_profile: runtime.pipeline_profile, live_analysis: runtime.live_analysis, limits: runtime.limits },
    real_uploads: 0, real_analyses: 0, provider_calls: 0 };
  await page.evaluate(value => { window.pw1ReadonlyOutcome = value; }, outcome);
  await page.unroute('**/hosted-api/**');
  return outcome;
}
