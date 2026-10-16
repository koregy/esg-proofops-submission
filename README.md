# ESG ProofOps — 공시 근거 검토 웹

지속가능성 공시의 환경 문장을 원문 근거와 연결해 **E0–E3·잠정 등급·판정 보류/가능 범위**를 보여주는 React 웹입니다. 기업의 실제 성과·진위·그린워싱·위법 여부를 판정하거나 법적 면책을 보장하지 않습니다.

이 저장소는 **공개 웹 제출물**입니다. 분석 서버·Python 규칙엔진은 별도 서버 제출물에서 운영합니다. [웹 서비스](https://esg-proofops.vercel.app)의 `/demo`는 저장 사례, `/analyze`는 초대 로그인 기반 PDF 분석 화면입니다.

운영 웹 기준은 `4fcbaa8`, 대응 백엔드는 v29b `6bd7fc34`입니다.
최신 승인 정책과 배포·롤백은 아래 인수인계 절을 우선합니다.

## 심사위원의 빠른 탐색

| 화면 | 확인할 내용 |
| --- | --- |
| `/demo` · `/demo/kia` | 저장된 선택 사례의 주장·원문 인용·등급·보류 사유 |
| `/analyze` | 초대 로그인, PDF 업로드, 주장/근거 쪽과 보고기간 확인, 비용 상한 내 분석 접수 |
| `/analyze#run-<UUID>` | 접근 권한이 있는 기존 실행의 새로고침·재진입 |
| 결과 상세의 원문 보기 | 검증된 쪽 이미지/좌표, 미검증 표시, 확대·축소와 모바일 이동 |
| `/report/naver` · `/report/kia` | 저장 사례의 검토 보고서와 내보내기 |

서버 목록 API가 있으면 작업 공간의 보고서·실행을 먼저 조회하고 구버전 서버에서는 이 브라우저의 로그인별 기록으로 복원합니다. 원문 보기 역시 대응 서버 API가 필요합니다. 서버 미지원·권한 부재·원본 만료를 빈 성공 결과로 표시하지 않습니다. 실시간 단일 문장/legacy 체험은 별도 경로이며 hosted 전체 파이프라인과 구분합니다.

## 9단계 파이프라인과 웹의 역할

| 단계 | 역할 |
| --- | --- |
| 1. PDF 업로드 | 웹 입력 → 서버 인증·보안 검사·원본 해시/버전 고정 |
| 2. 쪽 자동 선택 | 서버 후보 → 웹에서 주장/근거 쪽·보고기간 확인 |
| 3. 파싱 | 서버의 문단·표 구조화, OCR 보조와 원문 위치 보존 |
| 4. 주장 추출 | LLM의 원자 주장·인용 후보 추출 |
| 5. 원문 좌표 대조 | 서버의 인용·문자 구간·표/좌표 검증 |
| 6. 요소 태깅 | 고정 근거 패킷에 대한 LLM 독립 replica 3회 |
| 7. 3회 합의 | 서버의 요소별 합의/불일치·미확인 처리 |
| 8. 등급 계산 | 순수 Python 규칙엔진; 웹은 반환값을 표시 |
| 9. 결과 화면 | 주장·근거·원문 위치·잠정/확정/보류·검토 이력 |

서버 제출물의 `docs/images/proofops-pipeline-paper-color.png`와 `proofops-architecture-paper-color.png`에서 전체 흐름·배포 구성을 볼 수 있습니다. 이 웹 제출물의 Python/인프라 파일은 이전 경로를 함께 보존한 것이며 현행 분석 서버 release를 대체하지 않습니다.

## 핵심 원칙

- LLM은 추출·태깅만 합니다. E0–E3/라벨은 Python 규칙엔진이 계산하며 사람이 등급을 직접 수정하지 않습니다.
- DEC-127 승인으로 완료된 3회 태깅에서 범위 내 검증·연결하지 못한 요소는 서버가 `absent_in_scope`로 처리합니다. 문서 전체 부재가 아니며 `conflict`·`unreadable`·TIME_BUDGET 미처리는 제외합니다. 원문·귀속이 검증되지 않은 인용은 `present`의 근거가 아닙니다.
- 숫자·목표연도는 직접 근거를 요구하며, DEC-93의 검증된 기준연도·기준값 연결만 동일 주체·지표·단위·경계 조건에서 허용합니다. 위치 검증은 주장 진위나 등급 확정을 뜻하지 않습니다.
- 3회의 replica와 근거 패킷 정체성을 보존합니다. 같은 캐시 답변을 3회 독립 판독으로 세지 않습니다.
- 미검증/보류 결과에 확정 라벨을 붙이지 않습니다. 사람 검토는 태깅 수정과 `If-Match` 경합 제어를 거쳐 새 revision을 만들고 과거 기록은 유지합니다.
- 원문 이미지는 manifest의 버전·PNG SHA256를 확인한 뒤 검증된 `bbox_normalized`만 겹쳐 표시합니다. 좌표를 다시 회전하지 않으며 미검증 ref에는 박스를 붙이지 않습니다.

도메인 기준: [Master](docs/00_MASTER_SPEC.md) · [원문 근거 계약](docs/27_PARSING_AND_PROVENANCE.md) · [규칙 계약](docs/28_RULE_ENGINE_CONTRACT.md) · [미정 규칙](docs/31_DOMAIN_IMPLEMENTATION_GAPS.md)

## 구성과 코드 위치

브라우저는 Vercel 웹의 같은 origin `/hosted-api`를 호출합니다. Vercel은 시드니 EC2(`ap-southeast-2`)의 Caddy/FastAPI에 연결하고 worker는 Upstage 파싱·OCR과 OpenAI 추출·태깅을 사용합니다. 서버의 SQLite·비공개 파일에는 원본·체크포인트·비용 기록이 남습니다. 공급자 키와 초대 코드는 브라우저 번들에 넣지 않습니다.

Hosted 모델 처리 비용은 **실행 USD1·일 USD7 코드 상한**이며 더 낮은 운영 설정이 우선합니다. 행사 상한과 승인 ceiling은 별도 서버 설정입니다. 전송 전 예약/응답 후 정산은 서버 책임입니다. 미정산 호출을 재전송하거나 예약을 초기화하지 않습니다. EC2/Vercel 전체 청구액의 상한과는 구분합니다.

| 경로 | 내용 |
| --- | --- |
| [apps/web/src/features/hosted](apps/web/src/features/hosted) | 접수·독립 실행 폴링·목록·원문 보기·검토; `hostedClient.ts`가 API 계약을 연결 |
| [apps/web/src/StaticDemo.tsx](apps/web/src/StaticDemo.tsx) | 저장 사례·홈·안내·결과 탐색 |
| [apps/web/src/design](apps/web/src/design) | 색상/대비·공통 토큰 |
| [apps/web/public/demo](apps/web/public/demo) | 공개 가능한 파생 사례 데이터 |
| [apps/web/test](apps/web/test) · [tests/e2e](tests/e2e) | SSR·계약/표시 검사와 브라우저 시나리오 |
| [vercel.json](vercel.json) · [apps/web/vite.config.ts](apps/web/vite.config.ts) | 배포 rewrite와 로컬 API 프록시 |

## 로컬 실행과 검사

Node.js와 `pnpm`이 필요합니다. package manager/의존성 버전은 [package.json](package.json)과 [잠금 파일](pnpm-lock.yaml)을 따릅니다. 키 없이 저장 사례를 보려면:

```bash
pnpm install --frozen-lockfile
VITE_DEMO_STATIC=true VITE_ANALYSIS_BACKEND=static pnpm --filter proofops-web dev
```

출력되는 로컬 주소의 `/demo`를 엽니다. 이 명령은 웹만 띄우며 새 hosted 분석 서버나 예산을 만들지 않습니다.

승인된 개발용 hosted 서버가 별도로 있으면 아래처럼 연결합니다. 예시 origin은 자리표시자입니다. 서버가 허용한 정확한 웹 origin·쿠키/CSRF 조건을 충족해야 로그인/쓰기가 가능합니다. 공개 서버의 허용 origin이나 설정은 조정자만 변경합니다.

```bash
API_PUBLIC_BASE_URL=https://backend.example.org VITE_DEMO_STATIC=true   VITE_ANALYSIS_BACKEND=hosted pnpm --filter proofops-web dev
```

```bash
pnpm --filter proofops-web typecheck
pnpm --filter proofops-web test:hosted
VITE_DEMO_STATIC=true VITE_ANALYSIS_BACKEND=hosted pnpm build
```

`test:hosted`는 기존 SSR와 클라이언트·결과 표시·브라우저 기록·원문 좌표 모델 검사를 실행합니다. 앱 테스트 통과는 모델 정확도 평가가 아닙니다. [브라우저 시나리오](tests/e2e)는 기존 결과 또는 합성 입력으로 실행하며 새 유료 분석은 별도 승인 범위입니다. 서버 로컬 저장 상태 재열람은 [로컬 실행 문서](docs/SUBMISSION_DEMO.md)의 별도 Python 경로입니다.

## 배포·운영 경계

Vercel은 [vercel.json](vercel.json)의 hosted 설정으로 웹을 빌드합니다. Preview에서 타입·build·계약/브라우저 동작을 확인하고 Production 승격/push는 조정자가 관리합니다. EC2 설정·컨테이너·compose override 변경도 **조정자 전용**입니다. 이 문서 작업은 배포나 운영 명령을 실행하지 않습니다.

서버 release 변경의 순서는 `hosted_control.py drain` → `wait-idle --timeout 600` → 새 release 적용·health/readiness 확인 → `resume`입니다. drain은 새 접수/대기열 claim을 닫고 이미 진행 중인 실행과 비용 예약은 보존합니다. 실패하면 drain을 유지하고 `resume`으로 꺼진 접수나 상한을 덮어쓰지 않습니다. 정확한 컨테이너 명령·rollback 조건은 서버 제출물의 `deploy/public/RUNBOOK.md`와 `CONTRACT.md`를 따릅니다.

## 한계와 다음 단계

선택 페이지의 결과를 보고서 전수 분석으로 표현하지 않습니다. 저장 사례·모의 검토와 새 hosted 실행을 구분하며 잠정 등급·원문 미검증·미정 규칙을 확정으로 바꾸지 않습니다.

**정답셋은 AI 초안과 도메인 판정 draft를 포함한 초안입니다.** 독립 전문가 정답 검토와 정확도 100%를 주장하지 않습니다. 서버 제출물의 오프라인 성능 측정은 웹 응답 시간·실제 전체 분석 시간·모델 품질 보장이 아닙니다.

다음 단계는 독립 정답 검토, 다양한 PDF와 모바일/보조기술 평가, 운영 서버 API/버전 호환 확인입니다. 원문 PDF·페이지 이미지는 재배포 권리를 확인하기 전 저장소에 포함하지 않습니다. 키·초대·계정 식별자·서버 주소·개인 이메일은 비공개 운영 입력으로만 관리합니다.

## v29b 인수인계

운영 백엔드의 [HANDOFF.md](https://github.com/tskwak111/esg-proofops/blob/release/finals-v29b/docs/HANDOFF.md)는
release 브랜치를 조정자가 게시한 후 접근할 수 있습니다. 게시 전에는 백엔드 로컬 release의
`docs/HANDOFF.md`를 읽습니다. 이 웹 저장소의 오래된 Python 코드를 현행 서버로 배포하지 않습니다.

| 결정 | 웹과 API에서 보존할 의미 |
| --- | --- |
| DEC-85 | `absent_in_scope`와 문서 전체 부재를 구분하고 선택 범위·정책 근거를 유지 |
| DEC-92/93 | 주변 문맥에 따른 주장/근거 설명 구분; 검증된 기준값·활동 연결만 제한적으로 허용; 추정 실적 승격 금지·전망은 전망으로·세이프하버 미승인 등급 null·충돌 보존 |
| DEC-123 | 서버 범위 확정을 “확정”으로 합산·표시; API의 범위·원시 근거는 유지 |
| DEC-125 | 완료된 3회 중 요소 2/3의 검증된 합의, 유형 3/3 유지·반대 근거/충돌 차단; 선택 쪽 밖 탐색 확대는 승인되었으나 CF7 미통합 |
| DEC-127 | 검증·연결하지 못한 요소의 범위 내 부재는 서버 정책. 웹이 임의로 unknown을 바꾸지 않음. 주장 원문 미검증·유형 미합의·GAP·미완료·TIME_BUDGET은 보류 |

`resultModel.ts`는 서버의 CF6 등급/요소와 SC1 범위 확정을 표시한다. 확정 E0도 확정 집계에
포함하며 E0를 좋은 평가로 표현하지 않는다. 잠정 0건이면 빈 잠정 영역을 강조하지 않는다.
`ResultReport.tsx`와 원문 PDF 화면이 같은 등급·상태·쪽/좌표를 보존하는지 확인한다.

RC1은 동일 PDF 바이트·배정 정책·유효 범위·보고기간의 봉인 결과를 서버에서 재사용한다.
별도 요청자 소유 run으로 복사하고 모델 비용·일일 횟수 차감은 0이다. “이전 분석 결과”와
원 분석 시각을 표시하며 사본은 읽기 전용이다. `force_fresh`는 관리자만 허용한다.
다른 정책/범위면 cache miss이며 과거 partial 결과의 보류는 사본에서도 유지된다.
사본의 `duplicate_occurrences`에 원 claim ID가 남는 알려진 한계가 있어 그룹/내보내기 확인이 필요하다.

서버는 EC2 SSM 접속 설정 아래 SSH/scp 기반 `deploy/ec2/deploy.sh`를 사용한다.
이미지·정책 핀·비공개 runtime 설정을 함께 인계하고 drain → wait-idle → 교체 → health → resume를 따른다.
배포/롤백 모두 `compose.ops2.yaml`의 API `mem_limit`/`memswap_limit` 1536MiB를 적용한다.
서버 `runtime.env` 주요 키 이름은 `HOSTED_ANALYSIS_TIMEOUT_SECONDS`, `RC1_RESULT_REUSE_ENABLED`,
`HOSTED_RUN_USD`, `HOSTED_DAY_USD`, `HOSTED_EVENT_USD`, `HOSTED_EVENT_USD_CEILING`,
`HOSTED_SESSION_SECRET`, `HOSTED_ACCESS_CONFIG`, `HOSTED_LIVE_CONFIG`, `APP_ORIGIN`이다.
값을 웹 환경변수나 번들에 복사하지 않는다.

웹 롤백은 Vercel의 직전 검증 deployment를 다시 승격하되 대응 백엔드 필드/정책 호환성을 확인한다.
서버 롤백은 새 요청 정책과 이미 저장된 결과 reader를 구분한다. RC1을 끈 뒤에도 기존 사본은
RC1 호환 reader에서 제공한다. 구형 서버로 돌아가면서 사본이나 불변 결과를 다시 쓰지 않는다.

시간 상한은 서버 v29b의 2,700초다. 신규 추출 1,500초·태깅/SC1 2,400초에서 투입을 중단하므로
TIME_BUDGET은 여전히 가능하다. 프런트는 terminal status까지 polling하고 중간 연결 종료를
분석 완료로 표시하지 않는다. CF3/S7은 서버 미통합이고 DEC-127은 실제 근거를 못 찾아
낮은 등급을 확정할 위험이 있다. 확정 표시와 모델 정확도를 혼동하지 않는다.

다음 개발자는 모바일/키보드 탐색·PDF 좌표·내보내기·재접속·CF6 집계·RC1 사본을 먼저 확인한다.
성능은 parse/extract/tag/publish 단계 실측과 대표 입력의 결과/누락/보류 변화로 평가한다.

공개 release에서 W12 실제 분석 결과 fixture와 내부 결정 로그는 제외했다. 합성 W20/W21 fixture와
모든 테스트/기대값은 보존한다. W12를 읽는 테스트는 권한 있는 비공개 fixture를 같은 경로에 공급해야
실행할 수 있으므로 공개 checkout만으로 전체 테스트 통과를 주장하지 않는다. HO1은 Ruff·build만
수행하고 전체 테스트·실제 서버·유료 분석은 `not_run`이며 I29/HF2의 기존 검증과 구분한다.
