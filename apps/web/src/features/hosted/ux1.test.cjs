const assert = require('node:assert/strict');
const fs = require('node:fs');
const { test } = require('node:test');
const ts = require('typescript');
for (const extension of ['.ts', '.tsx']) require.extensions[extension] = (module, filename) => module._compile(ts.transpileModule(fs.readFileSync(filename, 'utf8'), { compilerOptions: { target: ts.ScriptTarget.ES2022, module: ts.ModuleKind.CommonJS, jsx: ts.JsxEmit.ReactJSX, esModuleInterop: true } }).outputText, filename);
const React = require('react');
const { renderToStaticMarkup: render } = require('react-dom/server');
const { UX1_HASH, UX1_POLICY, cleanMetricName, claimExplanation, reportInsights, analyzedData, progressSteps, remainingEstimate } = require('./ux1Model.ts');
const { ResultView } = require('./HostedResult.tsx');
const { resultReportHtml } = require('./ResultReport.tsx');
const { ComparisonResults } = require('./UX1Comparison.tsx');
const { ux1CompanyName } = require('./ux1Metadata.ts');
const { documentName } = require('./documentName.ts');
const fixture = JSON.parse(fs.readFileSync(`${__dirname}/../../../test/fixtures/w21/confirmed-majority.result.json`));
const confirmed = fixture.claims[0];

test('UX1 renders by default with legacy and additive API fields without mutating results', () => {
  assert.equal(require('node:crypto').createHash('sha256').update(UX1_POLICY).digest('hex'), UX1_HASH);
  for (const result of [fixture, {...fixture,pipeline:{...fixture.pipeline,ux1_data:{table_count:12,model_judgment_calls:42}}}]) {
    const before=JSON.stringify(result);
    const screen=render(React.createElement(ResultView,{result}));
    for (const text of ['등급 의미','왜 이 등급인가요','분석한 데이터','PDF 리포트 저장','그린워싱 위험 신호','입증요소 부재']) assert.ok(screen.includes(text),text);
    assert.equal(JSON.stringify(result),before);
  }
});

test('deterministic explanation uses applied rules and never invents a grade for held claims', () => {
  const claim=structuredClone(confirmed);
  const decision=claim.sc1_confirmation ?? claim.decision;
  decision.rule_ids=['MGMT_E1','UNRECOGNIZED_RULE'];
  const text=claimExplanation(fixture,claim);
  assert.match(text.text,/명명된 수단 또는 구체적 시행 상태/);
  assert.match(text.text,/기록된 규칙 UNRECOGNIZED_RULE/);
  assert.deepEqual(text.rules,decision.rule_ids);
  const held=fixture.claims[124];
  const explanation=claimExplanation(fixture,held);
  assert.match(explanation.text,/판정 보류/);
  assert.doesNotMatch(explanation.text,/확정 E[0-3]|E0 규칙/);
  assert.deepEqual(explanation.rules,[]);
});

test('missing and unknown element states are distinct and excluded elements are not shortcomings', () => {
  const claim=structuredClone(confirmed);
  const d=claim.sc1_confirmation ?? claim.decision;
  d.confirmation_basis='cf6_element_agreement'; d.excluded_elements=['M5'];
  claim.cf6_elements=[{element_id:'M1',state:'absent_in_scope',evidence_refs:[]},{element_id:'M2',state:'unknown',evidence_refs:[]},{element_id:'M5',state:'absent',evidence_refs:[]}];
  // Fixture uses a direct confirmed decision for this branch.
  claim.decision=d;claim.sc1_confirmation=null;claim.confirmed_grade=d.evidence_grade;
  const text=claimExplanation(fixture,claim).text;
  assert.match(text,/근거가 연결되지 않은 요소: 이행방법/);
  assert.match(text,/확인이 남은 요소: 적용범위/);
  assert.doesNotMatch(text,/담당 조직/);
});

test('model counters are measured completed judgment calls; missing is never zero or claims times three', () => {
  const data=analyzedData({...fixture,pipeline:{provider_concurrency:{completed_by_role:{preliminary:615,elements:630,extract:91,relation:473}}}});
  assert.equal(data.modelCalls,1245);assert.equal(data.tables,null);
  assert.equal(analyzedData({...fixture,pipeline:{}}).modelCalls,null);
  assert.equal(analyzedData({...fixture,pipeline:{ux1_data:{table_count:0,model_judgment_calls:0}}}).tables,0);
  assert.equal(analyzedData({...fixture,pipeline:{ux1_data:{table_count:-1,model_judgment_calls:NaN}}}).tables,null);
});

test('summary and comparison partition grades by track, keep held claims outside grade totals', () => {
  const insights=reportInsights(fixture);
  assert.equal(insights.top.length,3);assert.ok(insights.top.every(i=>i.confirmed));
  assert.equal(insights.tracks.reduce((n,t)=>n+t.total,0),211);
  assert.equal(insights.tracks.reduce((n,t)=>n+Object.values(t.grades).reduce((a,b)=>a+b,0),0),124);
  const html=render(React.createElement(ComparisonResults,{reports:[{result:fixture,name:'보고서 A',runId:'a',pageCount:119,pages:[1]},{result:{...fixture,claims:[]},name:'보고서 B',runId:'b',pageCount:139,pages:[2]}]}));
  assert.match(html,/31건 · 15%/);assert.match(html,/0건 · 0%/);assert.doesNotMatch(html,/NaN|Infinity/);
});

test('progress reflects grouped server stages and never asserts invented substage completion', () => {
  const run={status:'running',stage:'tag',progress:0.5};
  assert.deepEqual(progressSteps(run).map(s=>s.state),['previous','previous','active','active','waiting','waiting']);
  assert.match(remainingEstimate(run),/10–23분/);
  assert.match(remainingEstimate({...run,status:'queued'}),/대기시간 미정/);
  assert.match(remainingEstimate({...run,progress:NaN}),/계산 중/);
  assert.ok(progressSteps({...run,stage:'unrecognized'}).every(s=>s.state==='waiting'));
});

test('metadata defaults to API fields, restored from API and company derivation requires a clear naming convention', () => {
  const d={display_name:'보고서 1',ux1_metadata:{original_filename:'검증회사 2025 지속가능경영보고서.pdf',title:'내부 제목'}};
  assert.equal(documentName(d),'검증회사 2025 지속가능경영보고서');
  assert.equal(ux1CompanyName(d),'검증회사');
  assert.equal(ux1CompanyName({title:'2025 ESG 보고서'}),undefined);
  assert.equal(ux1CompanyName({title:'report-final.pdf'}),undefined);
  assert.equal(ux1CompanyName({filename:'LGChem_Sustainability_Report_2025_KOR.pdf'}),'LGChem');
  assert.equal(ux1CompanyName({filename:'Kakao_SustainabilityReport2025_KR.pdf'}),'Kakao');
  assert.equal(ux1CompanyName({...d,company_name:'공식 회사'}),'공식 회사');
});

test('full printable report includes all claims and explanations, escapes metadata and user content', () => {
  const html=resultReportHtml(fixture,{reportName:'</h1><script>alert(1)</script>'});
  assert.equal((html.match(/<article data-claim-id=/g)||[]).length,211);
  assert.equal((html.match(/왜 이 등급인가요/g)||[]).length,211);
  assert.match(html,/등급 의미/);assert.match(html,/분석한 데이터/);assert.match(html,/근거 보강 필요 영역/);
  assert.doesNotMatch(html,/<script>/);assert.match(html,/&lt;script&gt;/);
});

const { AnalyzedData, ExecutiveSummary } = require('./UX1Insights.tsx');
const { UX1Progress } = require('./UX1Progress.tsx');
test('raw table rows and unclassified metrics merge into the track, clean names remain separate', () => {
  for (const name of [undefined, '', '지표 미분류', 'unknown', '에너지 총 소비량 2) / 글로벌 / 136,504 / 146,591', '소비량 | 글로벌 | 32', '소비량 136,504', '소비량\n32']) assert.equal(cleanMetricName(name),'');
  for (const name of ['온실가스 배출량','Scope 1','에너지 소비량']) assert.equal(cleanMetricName(name),name);
  const base=structuredClone(confirmed);
  const d=base.sc1_confirmation ?? base.decision;
  d.confirmation_basis='cf6_element_agreement';d.excluded_elements=[];d.evidence_grade='E1';
  base.cf6_elements=[{element_id:'M1',state:'absent_in_scope',evidence_refs:[]}];
  base.decision=d;base.sc1_confirmation=null;base.confirmed_grade=d.evidence_grade;
  const metrics=['지표 미분류',undefined,'에너지 총 소비량 2) / 글로벌 / 136,504 / 146,591','온실가스 배출량','에너지 소비량','물 사용량','폐기물 발생량','환경 투자','인증 범위'];
  const result={...fixture,claims:metrics.map((metric,i)=>({...base,claim_id:`metric-${i}`,table_observation:metric?{metric}:undefined}))};
  const rows=reportInsights(result).needs;
  assert.equal(rows.length,7);assert.equal(rows.find(r=>!r.metric).count,3);
  assert.equal(rows.reduce((n,r)=>n+r.count,0),metrics.length);
  const html=render(React.createElement(ExecutiveSummary,{result,onSelect(){}}));
  assert.doesNotMatch(html,/지표 미분류|136,504/);
  assert.equal((html.match(/<strong>/g)||[]).length,5);assert.match(html,/나머지 2개 영역/);
});
test('optional data is hidden individually and existing table claims remain useful', () => {
  const result={...fixture,pipeline:{},w16_source_document:undefined};
  const html=render(React.createElement(AnalyzedData,{result}));
  assert.match(html,/표에서 추출한 주장/);assert.match(html,/주장 원문 검증/);
  assert.doesNotMatch(html,/미제공|미집계|<dt>모델 판정 호출|<div><\/div>/);
  const zero=render(React.createElement(AnalyzedData,{result:{...result,pipeline:{ux1_data:{table_count:0,model_judgment_calls:0}}}}));
  assert.match(zero,/<dt>표 수<\/dt><dd>0/);assert.match(zero,/<dt>모델 판정 호출<\/dt><dd>0/);
});
test('progress uses concise completion labels and one estimate line', () => {
  const html=render(React.createElement(UX1Progress,{run:{status:'running',stage:'tag',progress:.55}}));
  for(const label of ['완료','진행 중','대기','예상 남은 시간']) assert.ok(html.includes(label));
  assert.doesNotMatch(html,/앞선 구간|처리 구간|서버가 보고한 단계/);
});
