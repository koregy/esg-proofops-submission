# ESG ProofOps

지속가능성 공시 PDF의 환경 주장을 원문 근거와 연결하고, 규칙엔진으로 입증 등급(E0–E3)과 보류 사유를 보여주는 검토 도구입니다. 주장 추출·독립 태깅 3회·원문 하이라이트·결과 재사용을 지원합니다.

데모: **https://esg-proofops.vercel.app** — **심사용 계정은 별도 전달**

기술: React · TypeScript · Vite · FastAPI · Python 3.12 · SQLite · Upstage · OpenAI · Vercel · Docker

## 실행

Node.js 22, pnpm 10, Python 3.12, uv가 필요합니다. 키 없이 웹 저장 사례를 보려면:

```bash
pnpm install --frozen-lockfile
VITE_DEMO_STATIC=true VITE_ANALYSIS_BACKEND=static pnpm --filter proofops-web dev
```

출력된 로컬 주소의 `/demo`를 엽니다. Python 실행 도구는 다음과 같이 준비합니다.

```bash
uv sync --locked
uv run python scripts/analyze_report.py --help
uv run python scripts/submission_demo.py --help
```

권한 있는 저장 상태로 읽기 전용 검토 화면을 열려면:

```bash
uv run python scripts/submission_demo.py --seed /path/to/saved-pilot-state --port 8790
```

실제 파싱에는 Java 21과 PDF/OCR 런타임이 필요합니다. 서버 이미지는 `deploy/public/Dockerfile`, 환경변수 예시는 `.env.example`과 `deploy/ec2/*.env.example`을 참고합니다. 비밀값은 별도 환경으로 공급합니다.

## 구조

- `apps/web`, `apps/api`, `apps/worker`, `apps/agent`: 웹·API·파이프라인 실행
- `packages/`: 도메인·규칙엔진·애플리케이션·어댑터
- `config/`, `contracts/`, `prompts/`: 실행 정책·스키마·프롬프트
- `evaluation/`: 기존 경로를 유지해야 하는 최소 런타임 모듈
- `scripts/`, `deploy/`, `infra/`: 실행·검사·빌드·배포 코드
- `tests/`, `fixtures/`: 테스트 코드와 필요한 fixture
- `vercel.json`: 웹 빌드·라우팅 설정
