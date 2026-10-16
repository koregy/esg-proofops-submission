# API

FastAPI로 인증, 문서 업로드, 분석 작업 접수, 결과·원문 조회를 제공합니다.

- 진입점: [main.py](src/proofops_api/main.py)의 `create_app()`. `APP_ENV=hosted`일 때 [hosted.py](src/proofops_api/hosted.py)의 서버 구성을 선택합니다.
- 상태·원본 저장: [hosted_store.py](src/proofops_api/hosted_store.py). 계정별 접근과 작업 상태를 SQLite 및 파일 저장소에 연결합니다.
- 분석 실행 연결: [hosted_analysis.py](src/proofops_api/hosted_analysis.py). 워커가 분석 자식 프로세스를 실행하고 게시 경계로 넘깁니다.
- 게시·재사용: [hosted_publication.py](src/proofops_api/hosted_publication.py), [hosted_reuse.py](src/proofops_api/hosted_reuse.py).
- 원문 조회: [hosted_source_view.py](src/proofops_api/hosted_source_view.py).

루트에서 `uv run uvicorn proofops_api.main:app --host 127.0.0.1 --port 8000`으로 로컬 API를 실행합니다. 서버 설정과 실제 분석 준비는 [루트 안내](../../README.md)를 참고합니다.
