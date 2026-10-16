import { metadataText, reportTitle } from "./documentName";
import type { HostedResult } from "./hostedClient";
import { holdReasonText, resultExecution } from "./hostedClient";
import { claimEvidenceLine, claimHoldReasons, gradeSummary, pageLabel, pageRanges, resultBrowserItem, resultBrowserSummary, resultElementText, resultScope, resultSourceFailures, sourceQualityText, tableObservationText } from "./resultModel";
import { elementLabels } from "../labels";

export type ReportContext = { reportName?: string; companyName?: string; pageCount?: number; selectedPages?: number[]; runStatus?: string; runId?: string };

export function ResultReportSummary({ result, companyName, pageCount, selectedPages }: ReportContext & { result: HostedResult }) {
  companyName = metadataText(companyName);
  const year = result.pipeline?.reporting_scope?.report_year;
  const counts = resultBrowserSummary(result);
  const scope = resultScope(result, pageCount, selectedPages);
  const rows = ["E3", "E2", "E1", "E0"].map(grade => ({ grade, confirmed: counts.confirmedGrades[grade], provisional: counts.grades[grade] }));
  const max = Math.max(1, ...rows.map(row => row.confirmed + row.provisional));
  return <section className="result-report-summary" aria-label="보고서 요약">
    <dl className="report-facts">
      {companyName && <div><dt>회사</dt><dd>{companyName}</dd></div>}
      {typeof year === "number" && Number.isFinite(year) && <div><dt>보고연도</dt><dd>{year}</dd></div>}
      <div><dt>분석 범위</dt><dd>{scope.pages.length}쪽 {scope.total !== null && <small>/ 전체 {scope.total}쪽</small>}</dd></div>
      <div><dt>추출 주장</dt><dd>{counts.total}건</dd></div>
    </dl>
    <div className="metrics result-metrics" role="group" aria-label="판정 상태별 집계">
      <div><span>확정</span><strong>{counts.confirmed}<small>건</small></strong><p>분석 범위의 근거로 판정 완료</p></div>
      <div><span>잠정</span><strong>{counts.provisional}<small>건</small></strong><p>{counts.provisional ? "추가 확인 필요" : "확정·보류로 구분"}</p></div>
      <div><span>보류</span><strong>{counts.hold}<small>건</small></strong><p>판정에 필요한 확인 사항 있음</p></div>
    </div>
    <div className="report-grade-chart" role="group" aria-label="등급 분포">
      <div className="report-chart-heading"><h3>등급 분포</h3><p><span className="confirmed-key">● 확정</span> {counts.provisional > 0 && <span className="provisional-key">▧ 잠정</span>} · 보류 {counts.hold}건은 등급 미부여</p></div>
      {rows.map(row => <div className="report-grade-row" key={row.grade} aria-label={`${row.grade} 확정 ${row.confirmed}건, 잠정 ${row.provisional}건`}>
        <b>{row.grade}</b><div className="report-grade-track" aria-hidden="true"><span className="confirmed" style={{ width: `${row.confirmed / max * 100}%` }} />{row.provisional > 0 && <span className="provisional" style={{ width: `${row.provisional / max * 100}%` }} />}</div><span>{row.confirmed + row.provisional}건 {counts.provisional > 0 && <small>(확정 {row.confirmed} · 잠정 {row.provisional})</small>}</span>
      </div>)}
      <p className="caption">등급은 연결된 근거의 수준을 나타냅니다.{counts.provisional > 0 && " 잠정은 현재 확인된 최소 수준이며 추가 근거에 따라 달라질 수 있습니다."}</p>
    </div>
  </section>;
}

const escapeHtml = (value: unknown) => String(value ?? "").replace(/[&<>"']/g, char => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;" }[char]!));

/** Standalone, printable report. Export all claims, independent of UI filters/pagination. */
export function resultReportHtml(result: HostedResult, context: ReportContext = {}): string {
  context = { ...context, companyName: metadataText(context.companyName), reportName: reportTitle(context.reportName) };
  const e = escapeHtml;
  const counts = resultBrowserSummary(result);
  const scope = resultScope(result, context.pageCount, context.selectedPages);
  const execution = resultExecution(result, context.runStatus);
  const reporting = result.pipeline?.reporting_scope;
  const failures = resultSourceFailures(result);
  const notices = [...new Set([...result.hold_reasons, ...(result.hold_reason_details ?? []).map(item => item.code), ...(result.pipeline?.reason ? [result.pipeline.reason] : []), ...(result.pipeline?.extraction_outcome?.code && result.pipeline.extraction_outcome.code !== "OK" ? [result.pipeline.extraction_outcome.code] : [])])];
  return `<!doctype html><html lang="ko"><head><meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1"><meta http-equiv="Content-Security-Policy" content="default-src 'none'; style-src 'unsafe-inline'; base-uri 'none'; form-action 'none'"><title>ProofOps · ${e(context.reportName || "분석 결과 보고서")}</title><style>
  body{font:15px/1.7 system-ui,sans-serif;color:#18362b;max-width:980px;margin:40px auto;padding:0 24px}h1{font-size:28px}h2{font-size:20px}h3{font-size:17px}header,article{border-bottom:1px solid #cbd8d0;padding-bottom:24px;margin-bottom:28px}table{border-collapse:collapse;width:100%;margin:16px 0}th,td{border:1px solid #cbd8d0;padding:10px;text-align:left;vertical-align:top}blockquote{margin:8px 0;padding-left:14px;border-left:3px solid #267b61;white-space:pre-wrap}p,td,blockquote{overflow-wrap:anywhere}.note{color:#52665c}pre{white-space:pre-wrap;overflow-wrap:anywhere}dt{font-weight:bold}dd{margin:0 0 8px}@media print{body{margin:0;padding:0;font-size:10pt}h2,h3{break-after:avoid}tr,blockquote{break-inside:avoid}thead{display:table-header-group}}@media(max-width:600px){body{margin:20px auto;padding:0 12px}table{font-size:12px}th,td{padding:6px}}
  </style></head><body><header><p>ProofOps · 보고서 근거 점검</p><h1>${e(context.reportName || "분석 결과 보고서")}</h1>
  <p>${e(execution.title)} · ${e(execution.meaning)}</p><dl>${context.companyName ? `<dt>회사</dt><dd>${e(context.companyName)}</dd>` : ""}${typeof reporting?.report_year === "number" && Number.isFinite(reporting.report_year) ? `<dt>보고연도</dt><dd>${e(reporting.report_year)}</dd>` : ""}${reporting?.period_start && reporting.period_end ? `<dt>보고기간</dt><dd>${e(reporting.period_start)} ~ ${e(reporting.period_end)}</dd>` : ""}<dt>분석 범위</dt><dd>선택 ${scope.pages.length}쪽${scope.total !== null ? ` / 전체 ${scope.total}쪽` : ""} · 원본 PDF ${e(pageRanges(scope.pages))}</dd>${scope.claims?.length ? `<dt>주장 추출 대상</dt><dd>${e(pageRanges(scope.claims))}</dd>` : ""}</dl>
  <p>전체 ${counts.total}건 · 확정 ${counts.confirmed}건 · 잠정 ${counts.provisional}건 · 보류 ${counts.hold}건</p><p>원문 확인 ${counts.verified} / ${counts.total}건${counts.stageSeconds !== null ? ` · 처리 시간 ${Math.round(counts.stageSeconds)}초 (단계 합계·대기 제외)` : ""}</p>
  <table aria-label="등급 분포"><thead><tr><th>등급</th><th>확정</th><th>잠정</th></tr></thead><tbody>${["E3","E2","E1","E0"].map(grade => `<tr><th>${grade}</th><td>${counts.confirmedGrades[grade]}건</td><td>${counts.grades[grade]}건</td></tr>`).join("")}</tbody></table>
  <p class="note">보류에는 등급을 부여하지 않습니다. 잠정은 현재 확인된 최소 수준으로 추가 확인이 필요합니다. 원문 위치 확인과 등급 확정은 별개입니다. 선택하지 않은 쪽은 분석·판정 대상에서 제외합니다. 이 결과는 기업 성과의 진위나 제3자 보증을 대신하지 않습니다.</p>
  ${reporting?.warning ? `<p>${e(reporting.warning)}</p>` : ""}${notices.map(code => `<p>${e(holdReasonText(code, result.hold_reason_details))}</p>`).join("")}${failures.map(failure => `<p>${e(failure.page)} · ${e(failure.reason)} · ${e(failure.sourceIds.join(", "))}</p>`).join("")}
  <p class="note">${context.runId ? `분석 번호 ${e(context.runId)} · ` : ""}${result.w16_source_document?.sha256 ? `원본 식별값 ${e(result.w16_source_document.sha256)} · ` : ""} 전체 주장 포함 · 브라우저 인쇄로 PDF 저장 가능</p></header>
  ${result.claims.map((claim, index) => {
    const item = resultBrowserItem(result, claim);
    const grade = gradeSummary(claim);
    return `<article data-claim-id="${e(claim.claim_id)}"><h2>${index + 1}. ${e(item.page)} · ${e(item.badge)}</h2><blockquote>${e(claim.quote)}</blockquote><p>${e(sourceQualityText(claim.source_quality))}${tableObservationText(claim.table_observation) ? ` · ${e(tableObservationText(claim.table_observation))}` : ""}</p><p>${e(claimEvidenceLine(result, claim))}</p><p>${e(grade.note)}</p>${(item.confirmed ? [] : claimHoldReasons(claim)).map(reason => `<p>${e(reason)}</p>`).join("")}<table><thead><tr><th>요소</th><th>상태</th><th>원문 근거</th></tr></thead><tbody>${item.elements.map(element => `<tr><th>${e(elementLabels[element.element_id] ?? element.element_id)}</th><td>${e(resultElementText(claim, element))}</td><td>${element.evidence_refs.map(ref => `<p>${e(claim.source_ref_page_space === "original" ? `p.${ref.page_num}` : pageLabel(result, ref.page_num))} · ${ref.verification_state === "verified" ? "원문 확인" : "원문 대조 필요"}</p><blockquote>${e(ref.quote)}</blockquote>`).join("") || "연결된 원문 인용 없음"}</td></tr>`).join("")}</tbody></table><details><summary>원본 판정 기록</summary><pre>${e(JSON.stringify({ claim_id: claim.claim_id, revision: claim.revision, source_quality: claim.source_quality, decision: claim.decision, sc1_confirmation: claim.sc1_confirmation, provisional_grade: claim.provisional_grade, hold_reason: claim.hold_reason }, null, 2))}</pre></details></article>`;
  }).join("") || "<p>선택한 범위에 표시할 추출 주장이 없습니다. 보고서 전체에 주장이 없다는 뜻은 아닙니다.</p>"}</body></html>`;
}

export function downloadResultReport(result: HostedResult, context: ReportContext) {
  const url = URL.createObjectURL(new Blob([resultReportHtml(result, context)], { type: "text/html;charset=utf-8" }));
  const link = document.createElement("a");
  link.href = url;
  link.download = `ProofOps-${(context.companyName || context.reportName || "분석결과").replace(/[^\p{L}\p{N}._-]/gu, "_").slice(0,80)}.html`;
  document.body.appendChild(link); link.click(); link.remove();
  window.setTimeout(() => URL.revokeObjectURL(url), 1000);
}
