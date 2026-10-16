// Local API replay only: synthetic 124 confirmed / 0 provisional / 87 held.
async page => {
  const base='http://127.0.0.1:5221', out='/path/to/ESG_ProofOps/outputs/agent-results/R108-redesign/lab/web/W21';
  const fixture=await (await fetch(base+'/test/fixtures/w21/confirmed-majority.result.json')).json();
  const id='ca4f03c5-da7f-4ed9-bc3d-b549d6a42d85',docId='22fc9c59-55af-4dda-89e5-29518a401bc3';
  let metadata='missing';
  const checks=[],errors=[],writes=[];
  page.on('pageerror',error=>errors.push(error.message));
  const doc=()=>({document_id:docId,page_count:119,size_bytes:500,expires:1999999999,sha256:'a'.repeat(64),display_name:'보고서 57',...(metadata==='api'?{original_filename:'LG화학 2025 지속가능경영보고서.pdf',company_name:'LG화학'}:{})});
  const run=()=>({run_id:id,document_id:docId,status:'completed',stage:'result',progress:1,selected_pages:[24],status_url:'/v1/runs/'+id,result_url:'/v1/runs/'+id+'/result'});
  await page.route('**/hosted-api/**',async route=>{
    const req=route.request(),path=new URL(req.url()).pathname.replace('/hosted-api','');let body;
    if(req.method()!=='GET') {
      writes.push({path,mocked:true});
      if(path==='/v1/documents') body=doc();
      else if(path.endsWith('/scope-plan')) body={revision:1,reporting_scope:{report_year:2025,period_start:'2025-01-01',period_end:'2025-12-31'},selection:{pages:[24],claim_pages:[24],selection_sha256:'a'.repeat(64)},plan:{status:'ready',selected_claim_pages:[24],selected_evidence_pages:[24],failure_reasons:[],pages:[]}};
      else if(path==='/v1/runs') body=run();
      else throw Error('Unexpected write: '+path);
    } else if(path==='/v1/runtime') body={live_analysis:true,accept_uploads:true,accept_new_runs:true,limits:{max_upload_bytes:157286400,max_pdf_pages:300},upload_notice:'로컬 합성 검증 · 유료 분석 없음'};
    else if(path==='/v1/session') body={user_id:'w21-'+metadata,tenant_id:'fixture',role:'viewer',csrf_token:'',expires_at:'2099'};
    else if(path==='/v1/documents'||path==='/v1/runs') body={items:[],next_cursor:null};
    else if(path==='/v1/documents/'+docId) body=doc();
    else if(path==='/v1/runs/'+id) body=run();
    else if(path.endsWith('/result')) body=fixture;
    else return route.fulfill({status:404,body:'{}'});
    await route.fulfill({contentType:'application/json',body:JSON.stringify(body)});
  });
  const capture=async(name,target)=>{await target.evaluate(el=>window.scrollTo({top:el.getBoundingClientRect().top+scrollY-84,behavior:'instant'}));await page.screenshot({path:out+'/round2-after-'+name+'.png',animations:'disabled'});};
  for(const width of [1440,390]) {
    await page.setViewportSize({width,height:1000});
    for(const mode of ['missing','api']) {
      metadata=mode;await page.goto(base+'/runs/'+id+'/result');await page.getByTestId('hosted-result').waitFor();
      const headings=await page.locator('.result-heading,.report-facts,.result-run-notice > summary').innerText().catch(async()=> (await page.locator('.result-heading,.report-facts,.result-run-notice > summary').allTextContents()).join(' '));
      if(/미제공|없음|unknown|보고서 · 119쪽|보고서 57/.test(headings)) throw Error('Headline placeholder leak');
      if(mode==='missing' && (await page.locator('.report-facts dt').allTextContents()).includes('회사')) throw Error('Empty company cell');
      if(mode==='api' && await page.getByTestId('result-heading').innerText()!=='LG화학 2025 지속가능경영보고서') throw Error('API filename not used');
      const values=await page.locator('.result-metrics strong').allTextContents();if(values.join(',')!=='124건,0건,87건') throw Error('Counts differ: '+values);
      if(await page.locator('.provisional-key,.report-grade-track .provisional').count()) throw Error('Empty provisional bars/legend');
      if(await page.getByRole('tab',{name:/^잠정/}).count()) throw Error('Empty provisional tab');
      for(const grade of ['E3','E2','E1','E0']) if(await page.getByLabel(`${grade} 확정 31건, 잠정 0건`,{exact:true}).count()!==1) throw Error('Bad chart counts');
      await capture(`${mode}-summary-${width}`,page.locator('.result-heading'));
      const dims=await page.evaluate(()=>({width:innerWidth,scroll:document.documentElement.scrollWidth}));if(dims.scroll>width) throw Error('Overflow');checks.push({mode,...dims,counts:[124,0,87]});
      await page.getByRole('tab',{name:/^확정/}).click();await capture(`${mode}-cards-${width}`,page.locator('.result-claims'));
      await page.locator('.claim-list .claim-item').first().click();
      if(!(await page.getByTestId('grade-panel').innerText()).includes('확정 E3')) throw Error('Missing confirmed card/detail grade');
      if(width===390) await page.getByRole('button',{name:'목록으로 돌아가기'}).click();
      await page.getByRole('tab',{name:/^보류/}).click();await page.locator('.claim-list .claim-item').first().click();
      if(!(await page.getByTestId('grade-panel').innerText()).includes('판정 보류')) throw Error('Hold promoted');
    }
  }
  metadata='upload';await page.goto(base+'/analyze');await page.getByRole('heading',{name:'보고서 업로드',exact:true}).waitFor();
  await page.locator('input[type=file]').setInputFiles({name:'LG화학_2025_지속가능경영보고서.PDF',mimeType:'application/pdf',buffer:Buffer.from('%PDF-1.7\n%Local mock only')});
  await page.getByRole('button',{name:'업로드',exact:true}).click();await page.getByRole('button',{name:'분석 시작',exact:true}).click();await page.getByTestId('hosted-result').waitFor();
  const expected='LG화학_2025_지속가능경영보고서';if(await page.getByTestId('result-heading').innerText()!==expected) throw Error('Upload filename lost');
  await page.getByRole('textbox',{name:'기존 분석 번호 또는 결과 링크'}).fill(id);await page.getByRole('button',{name:'기존 결과 열기',exact:true}).click();
  if(await page.getByTestId('result-heading').innerText()!==expected) throw Error('Same-session name lost');
  await capture('upload-filename-390',page.locator('.result-heading'));
  const downloadPromise=page.waitForEvent('download');await page.getByRole('button',{name:'결과 보고서 내보내기'}).click();await (await downloadPromise).saveAs(out+'/round2-report.html');
  const report=await page.context().newPage();await report.goto('file://'+out+'/round2-report.html');
  if(await report.locator('article').count()!==211) throw Error('Export lost claims');
  if(await report.locator('h1').innerText()!==expected) throw Error('Export filename lost');
  if(/미제공|unknown|회사명 없음/.test(await report.locator('header').innerText())) throw Error('Export placeholders');
  await report.close();
  if(errors.length) throw Error(errors.join('; '));
  return {status:'passed',fixture:'synthetic 124 confirmed / 0 provisional / 87 held; all quotes marked synthetic',checks,uploadFilename:true,sameSessionName:true,exportClaims:211,productionWrites:0,paidAnalyses:0,mockedWrites:writes,errors};
}
