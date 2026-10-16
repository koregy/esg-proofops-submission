# 웹

React·TypeScript·Vite 기반의 업로드, 분석 진행, 결과 탐색, PDF 원문 검토 화면입니다.

- 진입점: [main.tsx](src/main.tsx) → [App.tsx](src/App.tsx). 공개 화면과 저장 사례는 [StaticDemo.tsx](src/StaticDemo.tsx)에서 연결합니다.
- 분석·결과: [HostedAnalysis.tsx](src/features/hosted/HostedAnalysis.tsx), [HostedResult.tsx](src/features/hosted/HostedResult.tsx), [hostedClient.ts](src/features/hosted/hostedClient.ts).
- 원문: [SourceSplitView.tsx](src/features/hosted/SourceSplitView.tsx)와 [OriginalPdfPage.tsx](src/features/hosted/OriginalPdfPage.tsx)가 서버의 쪽·좌표를 PDF에 표시합니다.
- 실행: 루트에서 `pnpm --filter proofops-web dev`, 빌드는 `pnpm build`. 키 없는 사례 실행은 [루트 안내](../../README.md)를 따릅니다.

등급은 API 결과를 표시합니다. 모델 키는 웹에 넣지 않으며, API 연결은 [vite.config.ts](vite.config.ts)와 `VITE_API_BASE_URL`·`VITE_ANALYSIS_BACKEND` 설정을 확인합니다.
