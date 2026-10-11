import { useEffect, useRef, useState } from "react";
import { HostedApiError, type HostedClient, type ListedDocument, type ListedRun } from "./hostedClient";

const statuses: Record<string, string> = { queued: "대기 중", running: "분석 중", accounting_pending: "비용 정산 확인 중", partial_blocked: "판정 보류", completed: "완료", failed: "실패", cancelled: "취소됨" };
const stages: Record<string, string> = { queued: "대기", parse: "문서 파싱", extract: "주장 추출", tag: "요소 태깅", result: "결과 정리" };
function missingCollection(error: unknown): null {
  if (error instanceof HostedApiError && [404,405].includes(error.status)) return null;
  throw error;
}
export function MyReports({ client, onOpenRun, onOpenDocument, onUnavailable, onFailure }: {
  client: HostedClient; onOpenRun: (id: string) => void; onOpenDocument: (doc: ListedDocument) => void;
  onUnavailable: (signal: AbortSignal) => void; onFailure: (err: unknown) => void;
}) {
  const [documents, setDocuments] = useState<ListedDocument[]>([]);
  const [runs, setRuns] = useState<ListedRun[]>([]);
  const [docCursor, setDocCursor] = useState<string | null>(null);
  const [runCursor, setRunCursor] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);
  const [unavailable, setUnavailable] = useState(false);
  const [error, setError] = useState("");
  const [refresh, setRefresh] = useState(0);
  const abort = useRef<AbortController | null>(null);
  useEffect(() => {
    const controller = new AbortController(); abort.current = controller;
    setBusy(true); setUnavailable(false); setError(""); setDocuments([]); setRuns([]); setDocCursor(null); setRunCursor(null);
    void (async () => {
      try {
        const [docs, executions] = await Promise.all([client.listDocuments(null, controller.signal).catch(missingCollection), client.listRuns(null, controller.signal).catch(missingCollection)]);
        if (controller.signal.aborted) return;
        if (!docs || !executions) { setUnavailable(true); onUnavailable(controller.signal); }
        else { setDocuments(docs.items); setRuns(executions.items); setDocCursor(docs.next_cursor); setRunCursor(executions.next_cursor); }
      } catch (err) {
        if (controller.signal.aborted) return;
        setError(err instanceof HostedApiError ? err.userMessage : "목록을 불러오지 못했습니다."); setBusy(false); onFailure(err); controller.abort();
      } finally { if (!controller.signal.aborted) setBusy(false); }
    })();
    return () => controller.abort();
  }, [client, refresh, onUnavailable, onFailure]);
  async function more(kind: "documents" | "runs") {
    setBusy(true); setError("");
    try {
      const signal = abort.current?.signal;
      if (kind === "documents") { const next = await client.listDocuments(docCursor, signal); if (!signal?.aborted) { setDocuments(old => [...old,...next.items.filter(item => !old.some(previous => previous.document_id === item.document_id))]); setDocCursor(next.next_cursor); } }
      else { const next = await client.listRuns(runCursor, signal); if (!signal?.aborted) { setRuns(old => [...old,...next.items.filter(item => !old.some(previous => previous.run_id === item.run_id))]); setRunCursor(next.next_cursor); } }
    } catch (err) { if (!abort.current?.signal.aborted) { setError(err instanceof HostedApiError ? err.userMessage : "목록을 불러오지 못했습니다."); onFailure(err); } }
    finally { if (!abort.current?.signal.aborted) setBusy(false); }
  }
  return <section className="hosted-inventory" aria-label="내 보고서·실행">
    <div className="detail-top"><h3>내 보고서·실행</h3><button type="button" disabled={busy} onClick={() => setRefresh(value => value + 1)}>목록 새로고침</button></div>
    {busy && <p role="status">보고서·실행 목록 불러오는 중…</p>}
    {error && <p role="alert">{error}</p>}
    {unavailable ? <p className="hosted-note" role="status">현재 서버는 목록 조회를 지원하지 않습니다. 이 브라우저의 기록과 기존 결과 링크를 사용할 수 있습니다.</p> : <>
      <p className="caption">현재 로그인한 작업 공간에서 접근할 수 있는 보고서와 실행입니다.</p>
      <h4>보고서</h4><ul>{documents.map(doc => <li key={doc.document_id}><b>{doc.display_name}</b> · {doc.page_count}쪽 <button type="button" onClick={() => onOpenDocument(doc)}>범위 열기</button></li>)}</ul>
      {!busy && !error && !documents.length && <p>보관 중인 보고서가 없습니다.</p>}
      {docCursor && <button type="button" disabled={busy} onClick={() => void more("documents")}>보고서 더 보기</button>}
      <h4>실행</h4><ul>{runs.map(run => <li key={run.run_id}>
        <b>{documents.find(doc => doc.document_id === run.document_id)?.display_name ?? `보고서 ${run.document_id.slice(0,8)}`}</b> · 분석 {run.run_id.slice(0,8)}
        <p>{statuses[run.status] ?? "상태 확인 필요"}{run.stage ? ` · ${stages[run.stage] ?? "처리 중"}` : ""}{typeof run.progress === "number" ? ` · 진행 ${Math.round(Math.max(0,Math.min(1,run.progress))*100)}%` : ""}{typeof run.queue_position === "number" ? ` · 대기 순번 ${run.queue_position}` : ""}</p>
        <button type="button" onClick={() => onOpenRun(run.run_id)}>{run.result_url ? "결과 열기" : "실행 상태 열기"}</button>
      </li>)}</ul>
      {!busy && !error && !runs.length && <p>표시할 실행이 없습니다.</p>}
      {runCursor && <button type="button" disabled={busy} onClick={() => void more("runs")}>실행 더 보기</button>}
    </>}
  </section>;
}
