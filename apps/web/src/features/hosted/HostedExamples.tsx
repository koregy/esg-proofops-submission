import { useEffect, useState } from "react";
import { Link } from "react-router";
import { loadExamples, type Example } from "./exampleCatalog";
export { exampleRuns } from "./exampleCatalog";
import { HostedApiError, type HostedClient } from "./hostedClient";

/** Uses the signed-in user's inventory; never publishes private results as public fixtures. */
export function HostedExamples({ client }: { client: HostedClient }) {
  const [examples, setExamples] = useState<Example[]>([]);
  const [refresh, setRefresh] = useState(0);
  const [busy, setBusy] = useState(true);
  const [login, setLogin] = useState(false);
  const [error, setError] = useState("");
  useEffect(() => {
    const controller = new AbortController();
    setBusy(true); setError(""); setLogin(false);
    void (async () => {
      try {
        await client.session(controller.signal);
        const next = await loadExamples(client, controller.signal);
        if (!controller.signal.aborted) setExamples(next);
      } catch (reason) {
        if (controller.signal.aborted) return;
        if (reason instanceof HostedApiError && [401, 403].includes(reason.status)) { setExamples([]); }
        if (reason instanceof HostedApiError && reason.status === 401) setLogin(true);
        else setError(reason instanceof HostedApiError ? reason.userMessage : "분석 사례를 불러오지 못했습니다. 다시 시도해 주세요.");
      } finally { if (!controller.signal.aborted) setBusy(false); }
    })();
    return () => controller.abort();
  }, [client, refresh]);
  return <main className="static-main examples-main">
    <div className="breadcrumb"><Link to="/">홈</Link><span>/</span>분석 사례</div>
    <section className="surface">
      <p className="eyebrow">저장된 실제 분석 결과</p><h1>분석 사례</h1>
      <p>현재 분석 기준으로 완료한 보고서별 대표 결과입니다. 같은 PDF는 한 번만 표시하며, 주장별 근거와 원문을 함께 살펴볼 수 있습니다.</p>
      <p className="hosted-note">전체 분석 이력은 ‘내 보고서’에서 확인할 수 있습니다. 사례 조회는 새 분석을 실행하지 않습니다. 분석 범위와 확정·보류 상태를 확인하고, 기업 전체의 환경 성과로 해석하지 마세요.</p>
      {busy && <p role="status">분석 사례 불러오는 중…</p>}
      {login ? <div className="hosted-empty"><h2>로그인 후 분석 사례를 확인하세요</h2><p>보고서 접근 권한을 확인하기 위해 로그인이 필요합니다.</p><Link className="primary-link" to="/analyze?return_to=examples">로그인하고 사례 보기 →</Link></div> : <>
        {error && <p role="alert">{error}</p>}
        {!busy && !error && !examples.length && <div className="hosted-empty"><h2>아직 소개할 분석 사례가 없습니다</h2><p>이름과 완료 결과를 확인할 수 있는 보고서가 준비되면 표시됩니다.</p><Link to="/analyze">내 보고서로 이동 →</Link></div>}
        <ul className="example-cards">{examples.map(({ run, name, identity, counts }) => <li className="example-card" key={identity}>
          <div className="example-card-heading"><h2>{name}</h2><span className="hosted-state">{counts.provisional ? "이전 버전 결과" : "분석 완료"}</span></div>
          <p className="hosted-note">접수 <time dateTime={run.created_at}>{new Date(run.created_at).toLocaleString("ko-KR", { timeZone: "Asia/Seoul" })} KST</time></p>
          <p className="example-counts">추출 <strong>{counts.total}</strong>건 · 확정 <strong>{counts.confirmed}</strong> · 보류 <strong>{counts.hold}</strong>{counts.provisional > 0 && <> · 추가 확인 필요 <strong>{counts.provisional}</strong></>}</p>
          <div className="example-grade-bar" role="img" aria-label={`확정 등급 분포: ${["E3", "E2", "E1", "E0"].map(grade => `${grade} ${counts.confirmedGrades[grade]}건`).join(", ")}`}>
            {["E3", "E2", "E1", "E0"].map(grade => <span key={grade} className={`example-${grade.toLowerCase()}`} style={{ width: `${counts.confirmed ? 100 * counts.confirmedGrades[grade] / counts.confirmed : 0}%` }} />)}
          </div>
          <ul className="example-grade-legend">{["E3", "E2", "E1", "E0"].map(grade => <li key={grade}><i className={`example-${grade.toLowerCase()}`} />{grade} <strong>{counts.confirmedGrades[grade]}</strong>건</li>)}</ul>
          <p className="hosted-note">확정 주장 기준 분포 · 보류{counts.provisional > 0 ? "·추가 확인 필요" : ""} 제외</p>
          <Link className="primary-link example-result-link" to={`/runs/${run.run_id}/result`}>결과 보기 →</Link>
        </li>)}</ul>
        <button type="button" className="hosted-secondary" disabled={busy} onClick={() => setRefresh(value => value + 1)}>목록 새로고침</button>
      </>}
    </section>
  </main>;
}
