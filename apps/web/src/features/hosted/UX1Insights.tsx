import type { HostedResult, ResultClaim } from "./hostedClient";
import { analyzedData, claimExplanation, gradeMeanings, reportInsights } from "./ux1Model";
import { resultScope, w18HoldBreakdown } from "./resultModel";

export function GradeGuide() {
  return <section className="ux1-card ux1-grade-guide" aria-label="등급 의미"><p className="eyebrow">결과 읽는 법</p><h3>등급은 주장을 뒷받침하는 근거의 수준입니다</h3>
    <div className="ux1-grade-grid">{gradeMeanings.map(g=><article key={g.grade} data-grade={g.grade}><b>{g.grade}</b><h4>{g.title}</h4><p>{g.text}</p></article>)}</div>
    <p className="caption">E0는 분석 범위에서 입증 근거가 제시·연결되지 않은 상태입니다. 보고서 전체의 근거 부재나 거짓·위법을 단정하지 않습니다. 보류는 등급이 아닙니다.</p>
    <details><summary>트랙별 조건과 판정 기준</summary><ul><li>목표: 연도·수치 → 기준연도·기준값·범위 → 진척·전환계획</li><li>성과: 수치·단위 → 비교기준·범위 → 산정방법·보증 연결</li><li>관리체계: 수단·시행 상태 → 적용범위 → 외부검증</li></ul><p>요소는 3회 독립 판독 중 2회 이상 합의와 검증 원문을 기준으로 연결합니다. 원문 충돌·주장 원문 미확인·유형 미합의·규칙 미정·미처리는 보류합니다. 보고 회사가 기본 주체이며 다른 주체가 명시되면 구분합니다. 지표와 기간이 일치하고 검증된 근거는 다른 쪽에서도 연결할 수 있습니다.</p><p className="caption">저장된 결과의 정책과 판정을 그대로 표시합니다. 과거 분석의 합의 기준은 다를 수 있습니다.</p></details>
  </section>;
}
export function WhyGrade({ result, claim }: { result: HostedResult; claim: ResultClaim }) {
  const explanation = claimExplanation(result, claim);
  return <section className="ux1-why" aria-label="왜 이 등급인지"><h4>왜 이 등급인가요?</h4><p>{explanation.text}</p>{explanation.rules.length>0 && <details><summary>적용 규칙 {explanation.rules.length}개</summary><p>{explanation.rules.join(" · ")}</p></details>}</section>;
}
export function ExecutiveSummary({ result, onSelect }: { result: HostedResult; onSelect: (id: string)=>void }) {
  const insight = reportInsights(result), holds = w18HoldBreakdown(result);
  return <section className="ux1-card" aria-label="보고서 종합 요약"><p className="eyebrow">다음 검토를 위한 요약</p><h3>어디부터 근거를 보강할까요?</h3>
    <div className="ux1-summary-grid"><div><h4>근거 보강 필요 영역</h4><p className="caption">E0–E2 확정 주장 중 근거 없음 요소가 있는 항목 · 한 주장을 한 영역에 집계. 조건부 요소를 포함하며 모두 등급 상승 조건인 것은 아닙니다.</p>
      {insight.needs.length ? <ul className="ux1-needs">{insight.needs.slice(0,5).map(row=><li key={row.track+row.metric}><b>{row.track}{row.metric && ` · ${row.metric}`}</b><strong>{row.count}건</strong><span>{[...row.elements].join(" · ")}</span></li>)}</ul> : <p>확정 주장에 기록된 보강 영역이 없습니다. 보류 상태는 따로 확인하세요.</p>}
      {insight.needs.length>5 && <details><summary>나머지 {insight.needs.length-5}개 영역</summary><ul>{insight.needs.slice(5).map(row=><li key={row.track+row.metric}>{row.track}{row.metric && ` · ${row.metric}`}: {row.count}건 · {[...row.elements].join(" · ")}</li>)}</ul></details>}
    </div><div><h4>주요 확정 주장 {insight.top.length}개</h4><p className="caption">근거 등급 높은 순 · 같은 등급은 원본 쪽 순</p>{insight.top.length ? <ol className="ux1-top">{insight.top.map(item=><li key={item.claim.claim_id}><button type="button" onClick={()=>onSelect(item.claim.claim_id)}><b>{item.grade} · {item.page}</b><span>{item.claim.quote}</span></button></li>)}</ol> : <p>확정 주장이 없습니다.</p>}
      <h4>주요 보류 사유</h4>{holds.length ? <ul>{holds.slice(0,3).map(h=><li key={h.reason}>{h.reason} · <b>{h.count}건</b></li>)}</ul> : <p>보류 주장이 없습니다.</p>}
    </div></div>
  </section>;
}
export function AnalyzedData({ result, pageCount, selectedPages }: { result: HostedResult; pageCount?: number; selectedPages?: number[] }) {
  const data = analyzedData(result), scope = resultScope(result, pageCount ?? result.w16_source_document?.page_count, selectedPages);
  return <section className="ux1-card" aria-label="분석한 데이터"><h3>분석한 데이터</h3><dl className="ux1-data-grid">
    <div><dt>{scope.total === null ? "선택 쪽" : "선택 / 전체 쪽"}</dt><dd>{scope.pages.length}{scope.total !== null && ` / ${scope.total}`}<small>쪽</small></dd></div>
    <div><dt>{data.tables === null ? "표에서 추출한 주장" : "표 수"}</dt><dd>{data.tables ?? data.tableClaims}<small>{data.tables === null ? "건" : "개"}</small></dd>{data.tables !== null && <p>표에서 추출한 주장 {data.tableClaims}건</p>}</div>
    <div><dt>주장 원문 검증</dt><dd>{data.verified} / {result.claims.length}<small>건</small></dd></div>
    {data.modelCalls !== null && <div><dt>모델 판정 호출</dt><dd>{data.modelCalls}<small>회</small></dd><p>유형·요소 판정 완료 호출 합계</p></div>}
  </dl><p className="caption">표 수는 선택 범위의 파싱된 표 블록 수이며 표 주장 수와 다릅니다. 원문 검증 수는 등급 확정 수가 아닙니다. 호출 수는 추출·관계 탐색 호출을 제외한 기록값입니다.</p></section>;
}
